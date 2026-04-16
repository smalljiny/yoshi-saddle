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

## Key Constraints

- Each Task must be independently executable and committable
- Completion Criteria must be verifiable (runnable command, observable output, or checkable file)
- Task ordering must respect dependency relationships
- Tasks must not implement anything outside the spec scope
