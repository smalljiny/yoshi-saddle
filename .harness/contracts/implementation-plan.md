# Contract: Implementation Plan Document

- **Producer**: Claude planner agent (invoked by `/dev:plan`)
- **Consumer**: Codex `plan-review` skill (validates against spec), Claude `/dev:impl` (executes Tasks)

## File Location

```
docs/_local/active/<topic>/implementation-plan.md
```

## Required Format

```markdown
# Implementation Plan: <topic name>

## Overview
[One paragraph summary of what this plan implements and why]

## Spec Reference
> Based on: `docs/_local/active/<topic>/spec.md`

## Task List

### [ ] Task 1: <title>
- **Type**: tdd | config | infra | refactor
- **Goal**: [What this Task achieves — one sentence]
- **Work Items**:
  - [ ] Item 1
  - [ ] Item 2
- **Completion Criteria**:
  - [ ] Verifiable criterion 1
  - [ ] Verifiable criterion 2
- **Commit**: `<type>(<scope>): <subject>`
  ```
  [optional body line 1]
  [optional body line 2]
  ```

### [ ] Task 2: <title>
...
```

## Task Type Definitions

| Type | When to Use |
|------|-------------|
| `tdd` | New behavior that requires tests (RED-GREEN-REFACTOR cycle) |
| `config` | Configuration file changes, documentation, skill/command files |
| `infra` | Infrastructure, scripts, tooling — not business logic |
| `refactor` | Restructuring existing code with existing test coverage |

## Completion Marker

When a Task is complete, its checkbox is updated:
```
### [ ] Task N  →  ### [x] Task N
```

## Commit Section

Each Task includes a `**Commit**` field describing the commit to create when the Task is complete.

**Format:**
```
- **Commit**: `<type>(<scope>): <subject>`
```

Optional multi-line body (indented under the backtick line):
```
- **Commit**: `feat(command): add /dev:docs command`
  ```
  Separates reference doc generation from /dev:done.
  Entry gate: review:in-progress. Completion: docs:generated.
  ```
```

**Validation** (performed by `plan-review`, warning level only — not blocking):
- `type` must be one of: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- `scope` should match an entry in `.harness/commit-scopes.md` (free-form also accepted)
- `subject` must be 72 characters or fewer
- Scope parser regex: `^\|\s*([a-z0-9_-]+)\s*\|` (first column of the Markdown table, excluding `scope` header and separator rows)

**Backward compatibility**: Plans written before the `pr-driven-commit-workflow` topic's Task 4 do not require a `**Commit**` field. `plan-review` skips Commit validation when the field is absent — it is treated as a warning, not a failure.

## Key Constraints

- Each Task must be independently executable and committable
- Completion Criteria must be verifiable (runnable command, observable output, or checkable file)
- Task ordering must respect dependency relationships
- Tasks must not implement anything outside the spec scope
- `**Commit**` field is expected (not enforced) for plans written after the `pr-driven-commit-workflow` topic's Task 4; `plan-review` validates it at warning level only
