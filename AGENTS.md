# AGENTS.md

Codex CLI guidance for this repository. Claude Code uses `CLAUDE.md` instead.

## Overview

This repository is a **harness for Claude Code-based development**. It provides agents, skills, commands, hooks, and rules for structured software development workflows.

## Skills

Skills are located in `.codex/skills/`. Each skill contains:
- `SKILL.md` — Detailed instructions and workflow
- `references/` — Supporting templates and input definitions

Unlike ECC-style harnesses, skills here are **explicitly referenced** (not auto-loaded from `.agents/skills/`). Tell Codex which skill to use by name.

### Available Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `spec-review` | `.codex/skills/spec-review/` | Review a spec document before planning begins |

### How to invoke a skill

Always provide the spec path explicitly — backlog topics are not registered in `dev-context.json`:

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
```

For active topics (already registered in `dev-context.json`), the path can be resolved automatically:

```
codex "spec-review 스킬을 실행해줘"
```

> **Note**: `/dev:spec` creates specs in `docs/_local/backlog/<topic>/`. Backlog topics are **not** registered in `dev-context.json` — always pass the spec path explicitly when reviewing a backlog spec.

## spec-review Skill

Reviews a spec document against an 8-point quality gate and produces a review report.

**When to run**: After `/dev:spec` generates a spec draft (`docs/_local/backlog/<topic>/spec.md`), before `/dev:plan`.

**What it checks**:
1. 목표 명확성 — Goals are specific and verifiable
2. Non-goals 명시 — Scope boundaries are explicitly defined
3. 아키텍처 충분성 — Architecture is detailed enough for planning
4. 의사결정 근거 — Design decisions have rationale
5. Open Questions — Unresolved decisions are documented
6. 내부 일관성 — No contradictions between sections
7. 구현 가능성 — Spec is concrete enough to begin implementation
8. 범위 적정성 — Scope is neither too large nor too small

**Output**: `docs/_local/backlog/<topic>/spec-review-<yymmddhhmmss>.md`

**Decision**: `READY` | `READY WITH NOTE` | `NOT READY`

## Context

### Backlog topics (not in dev-context.json)

Specs in `docs/_local/backlog/` are created by `/dev:spec` but are **not registered** in `dev-context.json` until `/dev:plan` moves them to `active/`. Always pass the spec path explicitly:

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
```

### Active topics (registered in dev-context.json)

Once `/dev:plan` moves a topic to `active/` and registers it, Codex can resolve the spec path from `dev-context.json`:

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "spec": "docs/_local/active/<topic>/spec.md",
      "specConfirmed": true,
      "specReview": "docs/_local/active/<topic>/spec-review-<yymmddhhmmss>.md",
      "plan": "docs/_local/active/<topic>/implementation-plan.md",
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Full schema definition: `.codex/skills/spec-review/references/rules-and-inputs.md`

After review of an active topic, Codex writes the report path to `topics[<topic>].specReview`.
`specConfirmed` is set by the Claude Code `/dev:plan` command (not `/dev:spec` — `/dev:spec` does not write to `dev-context.json`) — Codex does not set it.

## File Access Scope (spec-review)

The spec-review skill accesses only the following paths:

| Access | Paths |
|--------|-------|
| Read | `docs/_local/dev-context.json` (active topics only), `docs/_local/backlog/<topic>/spec.md` or `docs/_local/active/<topic>/spec.md`, `.claude/rules/` |
| Write | `<dirname(spec)>/spec-review-<yymmddhhmmss>.md` (new file), `docs/_local/dev-context.json` (`specReview` field only, active topics only) |
| Never modify | `specConfirmed` field, `.claude/settings.json`, any file outside `docs/_local/` |

Topic names are expected to contain only alphanumeric characters, hyphens, and underscores.

## Key Differences from Claude Code

| Feature | Claude Code | Codex CLI |
|---------|------------|-----------|
| Context file | `CLAUDE.md` | `AGENTS.md` |
| Skills | `.claude/skills/` (convention-based, auto-loaded) | `.codex/skills/` (explicit reference via AGENTS.md) |
| Hooks | Supported | Not supported |
| Commands | `/slash` commands | Instruction-based |
