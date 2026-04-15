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

```
codex "spec-review 스킬로 docs/_local/tmp/<topic>/spec.md를 리뷰해줘"
```

Or without a specific path (Codex will resolve from `dev-context.json`):

```
codex "spec-review 스킬을 실행해줘"
```

## spec-review Skill

Reviews a spec document against an 8-point quality gate and produces a review report.

**When to run**: After `/dev:spec` generates a spec draft (`docs/_local/tmp/<topic>/spec.md`), before `/dev:plan`.

**What it checks**:
1. 목표 명확성 — Goals are specific and verifiable
2. Non-goals 명시 — Scope boundaries are explicitly defined
3. 아키텍처 충분성 — Architecture is detailed enough for planning
4. 의사결정 근거 — Design decisions have rationale
5. Open Questions — Unresolved decisions are documented
6. 내부 일관성 — No contradictions between sections
7. 구현 가능성 — Spec is concrete enough to begin implementation
8. 범위 적정성 — Scope is neither too large nor too small

**Output**: `docs/_local/tmp/<topic>/review-<yymmddhhmmss>.md`

**Decision**: `READY` | `READY WITH NOTE` | `NOT READY`

## Context

Codex resolves spec path and topic from `docs/_local/dev-context.json`:

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "spec": "docs/_local/tmp/<topic>/spec.md",
      "specConfirmed": false,
      "specReview": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Full schema definition: `.codex/skills/spec-review/references/rules-and-inputs.md`

After review, Codex writes the report path to `topics[<topic>].specReview`.
`specConfirmed` is set by the Claude Code `/dev:spec` command after the user accepts the review — Codex does not set it.

## File Access Scope (spec-review)

The spec-review skill accesses only the following paths:

| Access | Paths |
|--------|-------|
| Read | `docs/_local/dev-context.json`, `docs/_local/tmp/<topic>/spec.md`, `.claude/rules/` |
| Write | `docs/_local/tmp/<topic>/review-*.md` (new file), `docs/_local/dev-context.json` (`specReview` field only) |
| Never modify | `specConfirmed` field, `.claude/settings.json`, any file outside `docs/_local/` |

Topic names are expected to contain only alphanumeric characters, hyphens, and underscores.

## Key Differences from Claude Code

| Feature | Claude Code | Codex CLI |
|---------|------------|-----------|
| Context file | `CLAUDE.md` | `AGENTS.md` |
| Skills | `.claude/skills/` (convention-based, auto-loaded) | `.codex/skills/` (explicit reference via AGENTS.md) |
| Hooks | Supported | Not supported |
| Commands | `/slash` commands | Instruction-based |
