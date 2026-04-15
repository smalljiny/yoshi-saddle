---
version: 2
description: Create an implementation plan. Automatically invokes the planner agent and generates implementation-plan.md.
category: dev-workflow
---

# /dev:plan

Create an implementation plan from spec documents and save it to `docs/_local/<topic>/implementation-plan.md`.

## Execution Flow

### 1. Read Context

Read `docs/_local/dev-context.json`:
- Check `current_topic`
- If no topic exists, show guidance to run `/dev:topic <name>` and stop

### 2. **Automatically invoke the planner agent**

Pass the following to the planner agent:
- Current topic name
- Requirements description passed via `$ARGUMENTS` (or analyze directly if not provided)
- Related spec document paths (if available)

Artifacts produced by the planner agent:
- `docs/_local/<topic>/spec.md` — Requirements and design
- `docs/_local/<topic>/implementation-plan.md` — Task list

### 3. Review the plan

Present the planner results to the user and request approval.
If revisions are requested, re-invoke the planner agent.

### 4. Update dev-context.json

After approval:
```json
{
  "topics": {
    "<topic>": {
      "phase": "plan",
      "spec": "docs/_local/<topic>/spec.md",
      "plan": "docs/_local/<topic>/implementation-plan.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

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

- **No implementation before plan approval**
- Plans are stored in `docs/_local/` (git-ignored)
- After completion, run `/dev:impl` to execute one Task at a time

## Next Steps

After plan approval: run Tasks with `/dev:impl`
