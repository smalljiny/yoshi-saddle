---
version: 2
---

# Component Catalog

Index of all `.claude/` components — agents, commands, and skills — grouped by category.

## Agents

Located in `.claude/agents/`. Invoked via the `Agent` tool with `subagent_type`.

### dev-workflow

| Agent | Model | Description |
|-------|-------|-------------|
| `planner` | opus | Implementation planning for complex features and refactoring. Auto-invoked by `/dev:plan`. |
| `tdd-specialist` | opus | TDD methodology expert. Writes tests first. Auto-invoked by `/dev:impl`. |
| `code-reviewer` | opus | Code quality, security, and maintainability review. Auto-invoked after code edits and in `/dev:review`. |
| `security-reviewer` | sonnet | Security vulnerability detection. Auto-invoked in `/dev:review` and before commits. |
| `architect` | opus | System design and architecture decisions. |
| `build-error-resolver` | sonnet | Resolves build errors, type errors, lint errors. Auto-invoked by `/dev:build-fix`. |
| `doc-updater` | sonnet | Synchronizes documentation with code changes. |
| `refactor-cleaner` | sonnet | Removes dead code and improves code quality. |

### harness-management

| Agent | Model | Description |
|-------|-------|-------------|
| `harness-optimizer` | sonnet | Analyzes and improves harness configuration. Auto-invoked by `/harness:audit`. |

---

## Commands

Located in `.claude/commands/`. Invoked as `/command-name`.

### dev-workflow (`category: dev-workflow`)

Development lifecycle commands. Run in order:

| Command | Invocation | Description |
|---------|------------|-------------|
| `dev/topic` | `/dev:topic <name>` | Start a work topic. Records in `dev-context.json`. |
| `dev/plan` | `/dev:plan` | Create implementation plan via planner agent. |
| `dev/impl` | `/dev:impl` | Execute one Task (tdd-specialist + code-reviewer). |
| `dev/checkpoint` | `/dev:checkpoint` | Create a named checkpoint with git state snapshot. |
| `dev/review` | `/dev:review` | Final code review (code-reviewer + security-reviewer in parallel). |
| `dev/verify` | `/dev:verify` | Full verification gate before PR. |
| `dev/build-fix` | `/dev:build-fix` | Step-by-step build error resolution. |

Typical flow:
```
/dev:topic → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → PR
```

### harness-management (`category: harness-management`)

Commands for maintaining the harness itself.

| Command | Invocation | Description |
|---------|------------|-------------|
| `harness/audit` | `/harness:audit` | Deterministic harness health audit with prioritized scorecard. |
| `harness/learn` | `/harness:learn` | Extract session patterns and save as reusable skills. |

---

## Skills

Located in `.claude/skills/`. Invoked by Claude when the trigger condition matches.

### dev-process (`category: dev-process`)

Skills that guide implementation quality gates.

| Skill | Directory | Description |
|-------|-----------|-------------|
| `tdd-workflow` | `skills/tdd-workflow/` | RED-GREEN-REFACTOR cycle. Activated during feature/bug work. |
| `verification-loop` | `skills/verification-loop/` | Sequential quality gates before PR. Used with `/dev:verify`. |

### session-management (`category: session-management`)

Skills that manage context and session continuity.

| Skill | Directory | Description |
|-------|-----------|-------------|
| `continuous-learning` | `skills/continuous-learning/` | Pattern extraction guide for `/harness:learn`. Filters `skills/learned/` quality. |
| `strategic-compact` | `skills/strategic-compact/` | Safe `/compact` timing — runs at logical boundaries, not mid-task. |

### learned (auto-generated)

| Directory | Description |
|-----------|-------------|
| `skills/learned/` | Patterns auto-saved by `/harness:learn`. Git-ignored. |

---

## File Pairing Convention

Every component exists as a paired `.md` / `.ko.md`:

| File | Role |
|------|------|
| `<name>.md` | Authoritative (English). Claude Code reads and executes. |
| `<name>.ko.md` | Translation (Korean). For human readers. Never executed. |

A `.ko.md` is **stale** when its `version` is lower than the paired `.md`.
Run `python3 .claude/scripts/check-versions.py` to detect stale pairs.
