---
version: 6
---

# Harness Roadmap

Tracks planned additions and improvements to the harness. Items are sourced from `docs/research/ecc-analysis.md` unless noted otherwise.

**Status legend**: `[ ]` pending · `[~]` in progress · `[x]` done · `[-]` skipped

---

## Phase 1 — Core Improvements

High ROI items that directly improve daily development workflows.

### Agents

| Status | File | Description |
|--------|------|-------------|
| `[x]` | `agents/harness-optimizer.md` | Scores harness health across 7 categories; surfaces top 3 improvements |
| `[ ]` | `agents/code-explorer.md` | Maps codebase before planning; prevents duplicate implementations |

### Rules

| Status | File | Description |
|--------|------|-------------|
| `[x]` | `rules/common/performance.md` | Model selection strategy (Haiku/Sonnet/Opus) and context window management |

### Commands

| Status | File | Description |
|--------|------|-------------|
| `[x]` | `commands/harness/audit.md` | Runs harness-audit.js; outputs scored health report |
| `[ ]` | `commands/dev/quality-gate.md` | Quick mid-task format/lint/type check; lighter than `/dev:verify` |

---

## Phase 2 — Quality & Observability

Improves code quality feedback loops and long-session stability.

### Agents

| Status | File | Description |
|--------|------|-------------|
| `[ ]` | `agents/code-simplifier.md` | Clarity-first refactoring; complements refactor-cleaner |
| `[ ]` | `agents/docs-lookup.md` | Context7 MCP doc queries; prevents stale API usage |

### Skills

| Status | File | Description |
|--------|------|-------------|
| `[x]` | `skills/continuous-learning/SKILL.md` | Guides pattern extraction for `/learn`; quality filters for skills/learned/ |
| `[ ]` | `skills/skill-creator/SKILL.md` | Meta-guide for writing new skills consistently |
| `[x]` | `skills/strategic-compact/SKILL.md` | Defines safe compaction points in long sessions |

### Commands

| Status | File | Description |
|--------|------|-------------|
| `[x]` | `commands/dev/checkpoint.md` | Mid-session state snapshot; safe rollback reference |
| `[ ]` | `commands/dev/test-coverage.md` | Analyzes coverage gaps; generates test stubs to reach 80% |
| `[ ]` | `commands/dev/update-docs.md` | Detects doc drift after review; proposes targeted updates |

---

## Phase 3 — Extended Capabilities

Lower urgency; add when the need arises.

### Agents

| Status | File | Description |
|--------|------|-------------|
| `[ ]` | `agents/comment-analyzer.md` | Audits comment accuracy and staleness; tracks TODO/FIXME debt |

### Language Rules (on-demand)

| Status | File | Trigger |
|--------|------|---------|
| `[ ]` | `rules/python/` | When a Python project uses the harness |
| `[ ]` | `rules/golang/` | When a Go project uses the harness |
| `[ ]` | `rules/kotlin/` | When a Kotlin/Android project uses the harness |

---

## Completed

| File | Date | Notes |
|------|------|-------|
| `agents/harness-optimizer.md` + `commands/harness/audit.md` + `scripts/harness-audit.js` | 2026-04-15 | Adapted from ECC; checks 28 items across 7 categories |
| `rules/common/performance.md` | 2026-04-15 | Model selection rationale + context window guidance |
| `skills/strategic-compact/` + `scripts/hooks/suggest-compact.js` | 2026-04-15 | Compaction decision table + 50-call threshold hook |
| `commands/dev/checkpoint.md` | 2026-04-15 | Named state snapshots with git SHA + test results |
| `skills/continuous-learning/` | 2026-04-15 | Pattern extraction quality criteria for /learn |

---

## Skipped

| Component | Reason |
|-----------|--------|
| `agents/loop-operator.md` | Autonomous loop management — out of scope for standard feature dev |
| `agents/chief-of-staff.md` | Email/Slack triage — outside harness scope |
| `skills/bun-runtime/` | Add when Bun adoption is needed |
| `/eval` command | AI output evaluation pipeline — not a general workflow tool |
