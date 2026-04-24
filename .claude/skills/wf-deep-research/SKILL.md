---
version: 1
name: wf-deep-research
description: >
  Multi-source deep research workflow using skill-registry search adapters.
  Searches the web via installed search-adapter skills (stack-firecrawl, stack-exa, etc.),
  synthesizes findings, and delivers cited reports with source attribution.
  Use when the user wants thorough research on any topic with evidence and citations.
  Does NOT require MCP configuration — uses skill-registry [search-adapter] discovery.
origin: harness
---

# wf-deep-research

Produce thorough, cited research reports from multiple web sources using skill-registry
search-adapter skills. No MCP configuration required.

## When to Activate

- User asks to research any topic in depth
- Competitive analysis, technology evaluation, or market sizing
- Due diligence on companies, investors, or technologies
- Any question requiring synthesis from multiple sources
- User says "research", "deep dive", "investigate", or "what's the current state of"

**Prerequisites:**
- At least one search-adapter skill installed (stack-firecrawl or stack-exa)
- Corresponding API key set (`$FIRECRAWL_API_KEY` or `$EXA_API_KEY`)

## Workflow

### Step 0: Adapter Discovery

Load `.claude/skills/skill-registry/SKILL.md` and run its Discovery Procedure with
capability query `[search-adapter]`.

The registry returns a list of matching skills. Each entry contains:
- `name` — skill identifier (e.g. `stack-exa`, `stack-firecrawl`)
- `path` — path to the skill's `SKILL.md` (e.g. `.claude/skills/stack-exa/SKILL.md`)
- `capabilities` — capability tags array

Read each matched skill's `SKILL.md` to load its Search Procedure before Step 3.

**Adapter Selection Policy**

| Adapters Found | Action |
|----------------|--------|
| 0 | Stop immediately: `search-adapter 스킬이 없습니다. stack-firecrawl 또는 stack-exa를 설치하세요.` |
| 1 | Use that adapter only |
| 2 or more | Use all adapters sequentially per sub-question; merge results and deduplicate |

**Deep-Read Adapter Priority** (used in Step 4)

When selecting a single representative adapter for content fetching:
`stack-exa` > `stack-firecrawl` > other adapters in discovery order.

**Sub-agent Delegation**

When sub-agents are used (Step 3 parallelism), the main session passes the adapter list
(name + SKILL.md path) explicitly in each sub-agent prompt. Sub-agents do **not**
re-query skill-registry.

**Partial Failure Policy**

| Failure Type | Action |
|--------------|--------|
| API key missing (`$KEY` unset) | Skip adapter, continue with others. Mark in report: `⚠️ <adapter>: API key not set` |
| HTTP 401 / 403 | Skip adapter, continue with others. Mark in report: `⚠️ <adapter>: authentication failed (HTTP 4xx)` |
| HTTP 429 (after adapter-level 3 retries) | Skip adapter, continue with others. Mark in report: `⚠️ <adapter>: rate limit exceeded` |
| All adapters failed | Stop: `모든 search-adapter 호출이 실패했습니다. API 키와 네트워크를 확인하세요.` |

Failed adapter warnings appear in both the Methodology section and the report meta line.

### Step 1: Understand the Goal

TBD

### Step 2: Plan Research

TBD

### Step 3: Execute Multi-Source Search

TBD

### Step 4: Deep-Read Key Sources

TBD

### Step 5: Synthesize

TBD

### Step 6: Deliver

TBD

## Output Contract

TBD

## Quality Rules

TBD

## Examples

TBD
