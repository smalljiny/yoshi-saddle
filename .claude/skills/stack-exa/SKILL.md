---
version: 1
name: stack-exa
description: Search-adapter skill that calls Exa REST API via Bash curl. Loaded by skill-registry with [search-adapter, exa] tags. Requires $EXA_API_KEY. Provides /search, /contents, /answer, and /findSimilar operations.
origin: harness
capabilities: [search-adapter, exa]
---

# stack-exa

Targets Exa REST API at `https://api.exa.ai`.

## When to Activate

**Activate when:**
- `$EXA_API_KEY` environment variable is set
- skill-registry query `[search-adapter, exa]` requests this adapter
- Web search or grounded LLM answers are needed and Exa API access is available

**Do NOT activate when:**
- `$EXA_API_KEY` is unset or empty — see Rate Limits & Error Handling
- MCP Exa tool is already configured — use existing MCP path instead
- SSE streaming is required — outside this skill's scope

## Search Procedure

All requests use base URL `https://api.exa.ai`, authentication header `x-api-key: $EXA_API_KEY`, and default timeout `--max-time 30`. Timeout overrides are noted per-operation below.

Use `jq -cn --arg val "$VALUE" '{field: $val}'` to safely escape user input before passing to curl.

## Response Format

Normalize results into one of the following two standard schemas.

### Standard schema (search / contents / findSimilar)

```json
{
  "query": "<original query or seed URL>",
  "results": [
    {
      "title": "<page title>",
      "url": "<page URL>",
      "snippet": "<summary text>"
    }
  ],
  "source": "exa",
  "operation": "search"
}
```

`operation` is one of `"search"`, `"contents"`, or `"findSimilar"`.

### Answer schema (/answer)

```json
{
  "query": "<original query>",
  "answer": "<LLM-generated answer>",
  "citations": [
    {
      "title": "<source title>",
      "url": "<source URL>",
      "snippet": "<source excerpt>"
    }
  ],
  "source": "exa",
  "operation": "answer"
}
```

### Title fallback rule

When `title` is missing or empty, extract the domain from the URL:

```bash
# Preserves subdomains, strips scheme / port / path
jq -r '.url | capture("^[a-z]+://(?<host>[^/:]+)").host'
```

Example: `https://docs.example.com/guide` → `docs.example.com`

## Rate Limits & Error Handling

### Missing $EXA_API_KEY

Abort immediately and return an error message to the caller:

```
Error: $EXA_API_KEY environment variable is not set.
Run: export EXA_API_KEY="your-api-key"  or add it to your .env file.
```

### HTTP 401 / 403 (Authentication error)

The API key is invalid or lacks permission. Do not retry — abort immediately:

```
Error: Exa API authentication failed (HTTP <401|403>).
Check $EXA_API_KEY and replace with a valid key.
```

### HTTP 429 (Rate limit exceeded)

Up to 3 attempts total (1 initial + 2 retries). Wait before each retry using exponential backoff: 2s before attempt 2, 4s before attempt 3.  
If attempt 3 still returns 429, propagate the error to the caller.

Apply this reusable pattern to any operation (example shown for `/search`):

```bash
RESP_FILE=$(mktemp)
trap 'rm -f "$RESP_FILE"' EXIT
RESPONSE=""
for attempt in 1 2 3; do
  HTTP_CODE=$(curl -s --max-time 30 -X POST https://api.exa.ai/search \
    -H "x-api-key: $EXA_API_KEY" \
    -H "Content-Type: application/json" \
    -o "$RESP_FILE" -w "%{http_code}" \
    -d "$(jq -cn --arg q "$QUERY" --arg t "$TYPE" --argjson n "${NUM_RESULTS:-10}" \
          '{query: $q, type: $t, numResults: $n}')")
  RESPONSE=$(cat "$RESP_FILE")
  if [ "$HTTP_CODE" != "429" ]; then break; fi
  if [ "$attempt" -lt 3 ]; then sleep $((2 ** attempt)); fi
done
# $RESPONSE and $HTTP_CODE are available after the loop
```

### HTTP 5xx (Server error)

Do not retry — propagate the error immediately to the caller.

### Network timeout

`--max-time 30` is set on all curl calls (except `deep`/`deep-reasoning` searches which use `--max-time 90`). On timeout, return an error without retrying.
