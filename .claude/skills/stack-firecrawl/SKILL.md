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
      # Caller normalizes PARTIAL_DATA into standard schema with status:"partial"
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

## Response Format

Normalize all operation results into the following standard schema:

```json
{
  "query": "<original query or URL>",
  "results": [
    {
      "title": "<page title>",
      "url": "<page URL>",
      "snippet": "<summary text>"
    }
  ],
  "source": "firecrawl",
  "operation": "search"
}
```

`operation` is one of `"search"`, `"scrape"`, or `"crawl"`.

For crawl polling outcomes, an additional `"status"` field is included: `"completed"`, `"partial"`, or `"timeout"`. Partial and timeout responses still conform to the above schema; `results` may be empty for `"timeout"`.

### Snippet mapping rules

| Operation | Raw field | Extraction |
|-----------|-----------|------------|
| `/search` | `data[].description` | Use `description` as-is |
| `/scrape` | `data.markdown` | First 300 characters of `markdown` |
| `/crawl` | `data[].metadata.description` or `data[].markdown` | Use `metadata.description` if present; otherwise first 300 characters of `markdown` |

### Title fallback rule

When `title` is missing or empty, extract the domain from the URL.  
Example: `https://docs.example.com/guide` → `docs.example.com`

## Rate Limits & Error Handling

### Missing $FIRECRAWL_API_KEY

Abort immediately and return an error message to the caller:

```
Error: $FIRECRAWL_API_KEY environment variable is not set.
Run: export FIRECRAWL_API_KEY="your-api-key"  or add it to your .env file.
```

### HTTP 429 (Rate limit exceeded)

Up to 3 attempts total (1 initial + 2 retries). Wait before each retry using exponential backoff: 2s before attempt 2, 4s before attempt 3.  
If attempt 3 still returns 429, propagate the error to the caller.

```bash
for attempt in 1 2 3; do
  RESP_FILE=$(mktemp)
  HTTP_CODE=$(curl -s --max-time 30 -o "$RESP_FILE" -w "%{http_code}" ...)
  RESPONSE=$(cat "$RESP_FILE"); rm -f "$RESP_FILE"
  if [ "$HTTP_CODE" != "429" ]; then break; fi
  if [ "$attempt" -lt 3 ]; then sleep $((2 ** attempt)); fi
done
```

### HTTP 401 / 403 (Authentication error)

The API key is invalid or lacks permission. Do not retry — propagate immediately:

```
Error: Firecrawl API authentication failed (HTTP <401|403>).
Check $FIRECRAWL_API_KEY and replace with a valid key.
```

### Network timeout

`--max-time 30` is set on all curl calls. On timeout, return an error without retrying.

### /crawl polling failure (5 attempts exhausted)

After 5 polls (50 seconds) without `status == "completed"`:
- If `data` array is non-empty → return partial results with `"status": "partial"`
- If `data` is empty → propagate a timeout error to the caller
