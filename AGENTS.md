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

For backlog topics, providing the path explicitly is preferred but not required. After `/dev:spec` saves a draft, the path is available in `dev-context.json` as `current_spec`:

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
```

Or without a path — Codex will read `current_spec` from `dev-context.json` automatically:

```
codex "spec-review 스킬을 실행해줘"
```

For active topics (already registered in `dev-context.json`), the path is resolved from `topics[current_topic].spec` automatically.

> **Note**: Explicit path always takes priority. If no path is provided and `current_spec` is not set (e.g., spec was confirmed or a new session started without running `/dev:spec`), Codex will ask for the path.
>
> **Warning**: If both `current_spec` (backlog draft) and `current_topic` (active topic) exist in `dev-context.json`, Codex will ask which spec to review rather than silently choosing the active topic. Use an explicit path to avoid the prompt.

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

### Backlog topics

Specs in `docs/_local/backlog/` are created by `/dev:spec`. They are not registered in `dev-context.json` topics, but `/dev:spec` writes a temporary `current_spec` field to `dev-context.json` after saving the draft.

Spec path resolution (mirrors SKILL.md):
1. **Explicit path** — always wins
2. **Exactly one of the following exists** — auto-resolve:
   - Only `current_spec` set → use it (backlog draft)
   - Only `current_topic` set → use `topics[current_topic].spec` (active topic)
3. **Both `current_spec` and `current_topic` exist** — ask the user which spec to review; do not silently choose
4. **Neither exists** — ask the user for the spec path

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
`specConfirmed` is set by the Claude Code `/dev:plan` command — Codex does not set it. `/dev:spec` does not register topics, but it writes a temporary `current_spec` field (removed by `/dev:spec` itself after spec confirmation in Step 6; `/dev:plan` also removes it as cleanup when registering the topic).

## File Access Scope (spec-review)

The spec-review skill accesses only the following paths:

| Access | Paths |
|--------|-------|
| Read | `docs/_local/dev-context.json` (active topics: `topics[current_topic].spec`; backlog topics: `current_spec` field), `docs/_local/backlog/<topic>/spec.md` or `docs/_local/active/<topic>/spec.md`, `.claude/rules/` |
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
