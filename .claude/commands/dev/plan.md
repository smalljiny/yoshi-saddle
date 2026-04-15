---
version: 3
description: Create an implementation plan from a confirmed spec. Automatically invokes the planner agent and generates implementation-plan.md.
category: dev-workflow
---

# /dev:plan

Create an implementation plan from a confirmed spec document and save it to `docs/_local/<topic>/implementation-plan.md`.

## Execution Flow

### 1. Read Context

Read `docs/_local/dev-context.json`:
- Check `current_topic`
- If no topic exists, show guidance and stop:
  ```
  진행 중인 주제가 없습니다.
  새 주제를 시작하려면: /dev:spec <topic>
  ```

### 2. Check spec is confirmed

Read `topics[current_topic].specConfirmed`:
- If `false` or missing, stop:
  ```
  확정된 스펙이 없습니다.
  먼저 /dev:spec을 실행하여 스펙을 작성하고 확정하세요.
  ```
- If `true`, read `topics[current_topic].spec` for the spec path

### 3. **Automatically invoke the planner agent**

Pass the following to the planner agent:
- Current topic name
- Confirmed spec path (from `dev-context.json`)
- Additional requirements passed via `$ARGUMENTS` (if any)

The planner agent produces **only**:
- `docs/_local/<topic>/implementation-plan.md` — Task list

The spec document is already confirmed and must not be modified.

### 4. Review the plan

Present the planner results to the user and request approval.
If revisions are requested, re-invoke the planner agent.

### 5. Update dev-context.json

After approval:
```json
{
  "topics": {
    "<topic>": {
      "phase": "plan",
      "spec": "docs/_local/tmp/<topic>/spec.md",
      "plan": "docs/_local/<topic>/implementation-plan.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Note: `spec` field is copied from the existing value — do not overwrite the path set by `/dev:spec`.

## Plan Document Format

```markdown
# Implementation Plan: <topic name>

## Overview
[Summary]

## Task List

### [ ] Task 1: <title>
- **Type**: tdd | config | infra | refactor
- **Goal**: [What this Task achieves]
- **Work Items**:
  - [ ] Item 1
- **Completion Criteria**:
  - [ ] Criterion 1

### [ ] Task 2: ...
```

## Key Principles

- **Spec must be confirmed** — `/dev:plan` will not run without `specConfirmed: true`
- **Planner reads spec, does not write it** — spec path comes from `dev-context.json`
- **Plans are stored in `docs/_local/`** (git-ignored)
- After completion, run `/dev:impl` to execute one Task at a time

## Next Steps

After plan approval: run Tasks with `/dev:impl`
