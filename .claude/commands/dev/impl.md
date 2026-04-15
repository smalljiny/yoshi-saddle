---
version: 2
description: Execute a single Task from the implementation plan. Automatically invokes tdd-specialist and code-reviewer. Stops after completing one Task.
category: dev-workflow
---

# /dev:impl

Execute Tasks from the implementation plan one at a time.

## Usage

```
/dev:impl               Auto-select the next incomplete Task
/dev:impl "Task 1"      Run by specific Task name
/dev:impl T2            Run by Task ID
```

## Execution Flow

### 1. Read Context and Plan

1. Get the current topic and plan path from `docs/_local/dev-context.json`
2. Determine which Task to run from `implementation-plan.md`:
   - Explicit argument → that Task
   - `currentTask` → Task from context
   - Otherwise → first incomplete `[ ]` Task

### 2. Understand Task Details

Extract from the plan document:
- **Type**: tdd, config, infra, refactor
- **Goal**: What to achieve
- **Work Items**: Checklist
- **Completion Criteria**: Validation criteria

### 3. **Pre-work briefing and approval**

Before starting implementation, present the work plan to the user:

```
---
## Pre-work Briefing: [Task ID] [Task Name]

### Task Overview
- Type: [tdd / config / infra / refactor]
- Goal: [What to achieve]

### Work Plan
1. [Step 1 in order]
2. [Step 2 in order]

### Affected Files
- `path/to/file.ts` — [Change description]
- `path/to/new-file.ts` — [NEW] [Purpose]

### Caveats
- [Potential issues]
---
```

Do not start implementation without approval.

### 4. **Automatically invoke tdd-specialist agent** (type: tdd)

- Write failing tests (RED)
- Confirm tests fail
- Minimal implementation (GREEN)
- Confirm tests pass
- Refactoring (REFACTOR)
- Check coverage

For types `config`, `infra`, `refactor`:
- `config`: Change and validate configuration files
- `infra`: Change infrastructure and document
- `refactor`: Improve structure after ensuring test coverage

### 5. **Automatically invoke code-reviewer agent** (immediately after implementation)

Immediately review the Task code:
- Quality review
- Immediate feedback + fixes

### 6. Verify Completion Criteria

Check completion criteria in the plan document.

### 7. Update Plan Document

Mark completed Tasks:
- `[ ]` → `[x]`

### 8. Update dev-context.json

```json
{
  "topics": {
    "<topic>": {
      "phase": "impl",
      "currentTask": "<next-task-id>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

### 9. **Output Task completion briefing and stop**

```
---
## Task Complete: [Task ID] [Task Name]

### Work Summary
- [Implementation/change details]
- [List of created/modified files]

### Test Results
- Tests: PASS ([X] passed)
- Coverage: [X]%

### Next Task
- [Next incomplete Task ID and name]
- Continue with /dev:impl.
---
```

**Stop immediately after outputting the briefing. Do not automatically start the next Task.**

## Key Principles

- **One Task at a time** — only one Task per invocation
- **Prior approval required** — do not start implementation without approving the work plan
- **TDD enforced** — `tdd` type must write tests first
- **Immediate review** — automatically invoke code-reviewer immediately after implementation

## Next Steps

After all Tasks complete: final full review with `/dev:review`
