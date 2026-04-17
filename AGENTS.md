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
| `plan-review` | `.codex/skills/plan-review/` | Review an implementation plan before implementation begins |

### How to invoke a skill

Provide the path explicitly (preferred):

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
codex "plan-review 스킬로 docs/_local/active/<topic>/implementation-plan.md를 리뷰해줘"
```

Or without a path — Codex resolves the path from `dev-context.json` automatically:

```
codex "spec-review 스킬을 실행해줘"
codex "plan-review 스킬을 실행해줘"
```

Explicit path always takes priority. If no path is provided, Codex reads
`topics[current_topic].spec` or `topics[current_topic].plan` from `dev-context.json`.

## spec-review Skill

Reviews a spec document against an 8-point quality gate and produces a review report.

**When to run**: After `/dev:spec` generates a spec draft, before `/dev:plan`.

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

**After review**: Codex writes `specReview` field via `dev-context.js set-field`. State transition (`spec:confirmed` or `spec:drafting`) is handled by Claude `/dev:spec`.

## plan-review Skill

Reviews an implementation plan against an 8-point quality gate and produces a review report.

**When to run**: After `/dev:plan` generates `implementation-plan.md`, before `/dev:impl`.

**What it checks**:
1. 목표 커버리지 — All spec goals are covered by at least one Task
2. Non-goals 준수 — Plan does not implement spec Non-goals
3. Task 독립성 — Each Task is independently executable
4. 완료 기준 명확성 — Completion Criteria are objectively verifiable
5. Task 타입 정확성 — Task Type matches its Work Items
6. Task 규모 적정성 — Each Task fits within a single commit unit
7. 구현 순서 타당성 — Task order respects dependency relationships
8. 범위 초과 없음 — No Tasks implement functionality beyond spec scope

**Path resolution**:
- Plan: (1) explicit path, (2) `dev-context.js read --topic=<name> --field=plan`, (3) user prompt
- Spec: always `dev-context.js read --topic=<name> --field=spec` (separate from plan)
- If explicit plan path differs from `topics[current_topic].plan`, ask user to confirm

**Output**: `docs/_local/active/<topic>/plan-review-<yymmddhhmmss>.md`

**Decision**: `READY` | `READY WITH NOTE` | `NOT READY`

**After review**:
- READY / READY WITH NOTE → `update-state --phase=plan --status=confirmed` + `set-field planReview`
- NOT READY → `update-state --phase=plan --status=ready` + `set-field planReview`

## Context

### Topic lifecycle states

All topics are registered in `dev-context.json` from the moment `/dev:spec` saves the spec draft (`spec:drafting`). There is no distinction between backlog and active topics in terms of registration.

Expected shape:

```json
{
  "current_topic": "<topic-name>",
  "topics": {
    "<topic-name>": {
      "phase": "spec",
      "status": "drafting",
      "spec": "docs/_local/backlog/<topic-name>/spec.md",
      "specReview": null,
      "plan": null,
      "planReview": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  },
  "updatedAt": "<ISO 8601>"
}
```

Phase/status values by lifecycle stage:

| Phase | Status | Meaning |
|-------|--------|---------|
| spec | drafting | Spec draft in progress |
| spec | reviewing | Codex spec-review in progress |
| spec | confirmed | Spec approved, ready for planning |
| plan | ready | Plan generated, ready for plan-review |
| plan | reviewing | Codex plan-review in progress |
| plan | confirmed | Plan approved, ready for implementation |
| impl | in-progress | Implementation in progress |
| review | in-progress | Final review in progress |

Full schema definition: `.codex/skills/spec-review/references/rules-and-inputs.md`

Spec path resolution:
1. **Explicit path** — always wins
2. **Auto-resolution** — `dev-context.js read --topic=<current_topic> --field=spec`
3. **User prompt** — if neither applies

## File Access Scope

### spec-review

| Access | Paths |
|--------|-------|
| Read | `docs/_local/dev-context.json`, spec file (`topics[current_topic].spec`), `.claude/rules/` |
| Write | `<dirname(spec)>/spec-review-<yymmddhhmmss>.md` (new file) |
| Update | `docs/_local/dev-context.json` — `specReview` field only (via `dev-context.js set-field`) |
| Never modify | `phase`, `status` fields (owned by Claude `/dev:spec` via `update-state`) |

### plan-review

| Access | Paths |
|--------|-------|
| Read | `docs/_local/dev-context.json`, plan file (`topics[current_topic].plan`), spec file (`topics[current_topic].spec`), `.harness/contracts/plan-review.md` |
| Write | `docs/_local/active/<topic>/plan-review-<yymmddhhmmss>.md` (new file) |
| Update | `docs/_local/dev-context.json` — `planReview` field + `phase`/`status` via `update-state` |

### Contracts

`.harness/contracts/` defines the canonical format for Claude↔Codex exchange documents:

| Contract | Producer | Consumer |
|----------|----------|----------|
| `spec-review.md` | Codex spec-review | Claude /dev:spec, /dev:plan |
| `plan-review.md` | Codex plan-review | Claude /dev:impl |
| `implementation-plan.md` | Claude planner | Codex plan-review, Claude /dev:impl |

Topic names are expected to contain only alphanumeric characters, hyphens, and underscores.

## Key Differences from Claude Code

| Feature | Claude Code | Codex CLI |
|---------|------------|-----------|
| Context file | `CLAUDE.md` | `AGENTS.md` |
| Skills | `.claude/skills/` (convention-based, auto-loaded) | `.codex/skills/` (explicit reference via AGENTS.md) |
| Hooks | Supported | Not supported |
| Commands | `/slash` commands | Instruction-based |
