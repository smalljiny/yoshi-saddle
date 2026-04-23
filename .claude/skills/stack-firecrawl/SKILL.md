---
version: 1
name: stack-firecrawl
description: Search-adapter skill that calls Firecrawl REST API v1 via Bash curl. Loaded by skill-registry with [search-adapter, firecrawl] tags. Requires $FIRECRAWL_API_KEY. Provides /v1/search, /v1/scrape, and /v1/crawl operations.
origin: harness
capabilities: [search-adapter, firecrawl]
---

# stack-firecrawl

Targets Firecrawl REST API v1 at `https://api.firecrawl.dev/v1/`. Migration to v2 is a separate change.

## When to Activate

**Activate when:**
- `$FIRECRAWL_API_KEY` environment variable is set
- skill-registry query `[search-adapter, firecrawl]` requests this adapter
- Web search, scraping, or crawling is needed and Firecrawl API access is available

**Do NOT activate when:**
- `$FIRECRAWL_API_KEY` is unset or empty — see Rate Limits & Error Handling
- MCP Firecrawl tool is already configured — use existing deep-research skill or MCP path instead
- Firecrawl Batch API or Map API is required — outside this skill's scope

## Search Procedure

All requests include `Authorization: Bearer $FIRECRAWL_API_KEY` and `--max-time 30`.

Use `jq -cn --arg val "$VALUE" '{field: $val}'` to safely escape user input before passing to curl.

### /v1/search — Web Search

**Input parameters:**
- `query` (string, required): search query
- `limit` (integer, optional, default 10): number of results to return

**curl template:**
```bash
curl -s --max-time 30 -X POST https://api.firecrawl.dev/v1/search \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -cn --arg q "$QUERY" '{"query": $q, "limit": 10}')"
```

**Raw response fields:**
- `data[].title` — page title
- `data[].url` — page URL
- `data[].description` — search result snippet

---

### /v1/scrape — Single URL Scraping

**Input parameters:**
- `url` (string, required): target URL to scrape
- `formats` (array, optional, default `["markdown"]`): response formats

**curl template:**
```bash
curl -s --max-time 30 -X POST https://api.firecrawl.dev/v1/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -cn --arg u "$URL" '{"url": $u, "formats": ["markdown"]}')"
```

**Raw response fields:**
- `data.metadata.title` — page title
- `data.metadata.sourceURL` — original URL
- `data.markdown` — full page content in Markdown

---

### /v1/crawl — Multi-page Crawl (2 steps)

**Input parameters:**
- `url` (string, required): crawl start URL
- `limit` (integer, optional, default 10): max pages to crawl
- `formats` (array, optional, default `["markdown"]`): response formats

#### Step 1: Start job (POST)

```bash
CRAWL_RESPONSE=$(curl -s --max-time 30 -X POST https://api.firecrawl.dev/v1/crawl \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -cn --arg u "$URL" '{"url": $u, "limit": 10, "scrapeOptions": {"formats": ["markdown"]}}')")

JOB_ID=$(echo "$CRAWL_RESPONSE" | jq -r '.id')
```

#### Step 2: Poll for completion (GET)

Poll interval: **10 seconds**, max attempts: **5**

```bash
for i in $(seq 1 5); do
  sleep 10
  STATUS_RESPONSE=$(curl -s --max-time 30 -X GET "https://api.firecrawl.dev/v1/crawl/$JOB_ID" \
    -H "Authorization: Bearer $FIRECRAWL_API_KEY")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    echo "$STATUS_RESPONSE"
    break
  fi
  if [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
    echo "$STATUS_RESPONSE" >&2
    exit 1
  fi
  if [ "$i" = "5" ]; then
    PARTIAL_DATA=$(echo "$STATUS_RESPONSE" | jq '.data // []')
    PARTIAL_COUNT=$(echo "$PARTIAL_DATA" | jq 'length')
    if [ "$PARTIAL_COUNT" -gt 0 ]; then
      echo '{"status":"partial","data":'"$PARTIAL_DATA"'}'
    else
      echo '{"status":"timeout","data":[]}' >&2
      exit 1
    fi
  fi
done
```

**Raw response fields:**
- `data[].metadata.title` — title of each page
- `data[].metadata.sourceURL` — URL of each page
- `data[].metadata.description` — meta description of each page
- `data[].markdown` — Markdown body of each page
