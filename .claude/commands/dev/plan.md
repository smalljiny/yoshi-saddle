---
version: 5
description: Create an implementation plan from a confirmed spec. Moves topic from backlog to active, registers in dev-context.json, and generates implementation-plan.md.
category: dev-workflow
---

# /dev:plan

Create an implementation plan from a confirmed spec document and save it to `docs/_local/active/<topic>/implementation-plan.md`.

## Usage

```
/dev:plan            List backlog topics and select one
/dev:plan <topic>    Plan a specific backlog topic directly
```

## Execution Flow

### 1. Resolve topic

If `$ARGUMENTS` is provided:
- Use it as `<topic>`
- Validate topic name matches `^[a-zA-Z0-9_-]+$` — if not, stop:
  ```
  유효하지 않은 토픽 이름입니다. 영문자, 숫자, 하이픈, 언더스코어만 허용됩니다.
  ```
- Verify `docs/_local/backlog/<topic>/` exists — if not, stop:
  ```
  '<topic>'이 backlog에 없습니다.
  먼저 /dev:spec <topic>으로 스펙을 작성하세요.
  ```

If no argument:
- Scan `docs/_local/backlog/` for topics
- If empty, stop:
  ```
  플랜할 토픽이 없습니다. 먼저 /dev:spec <topic>을 실행하세요.
  ```
- If one topic found: use it automatically
- If multiple topics found: show list and ask user to select:
  ```
  백로그 토픽 목록:
    1. <topic-a>
    2. <topic-b>
  플랜할 토픽 번호를 선택하세요:
  ```

### 2. Check spec is confirmed

Verify the spec is ready for planning:
- Check `docs/_local/backlog/<topic>/spec.md` exists — if not, stop:
  ```
  스펙 파일이 없습니다. 먼저 /dev:spec <topic>을 실행하세요.
  ```
- Find the latest `docs/_local/backlog/<topic>/spec-review-*.md` (sort by filename descending)
- Read the review file and check its `Decision:` field
- If no review file exists, or decision is not one of `READY` / `READY WITH NOTE`, stop:
  ```
  확정된 스펙이 없습니다.
  먼저 /dev:spec <topic>을 실행하여 Codex 리뷰를 통과하세요.
  ```

### 3. Move to active

Move the topic directory from backlog to active:
- If `docs/_local/active/<topic>/` already exists, stop:
  ```
  '<topic>'이 이미 active 상태입니다.
  /dev:topic switch <topic>으로 전환하거나 /dev:impl로 구현을 계속하세요.
  ```
- Move `docs/_local/backlog/<topic>/` → `docs/_local/active/<topic>/`

### 4. Invoke the planner agent

Pass the following to the planner agent:
- Current topic name
- Confirmed spec path: `docs/_local/active/<topic>/spec.md`

The planner agent produces **only**:
- `docs/_local/active/<topic>/implementation-plan.md` — Task list

The spec document is already confirmed and must not be modified.

### 5. Review the plan

Present the planner results to the user and request approval.
If revisions are requested, re-invoke the planner agent.

### 6. Update dev-context.json

After approval:

- If `current_topic` is already set to a different topic, prompt:
  ```
  현재 작업 중인 토픽: <current_topic>
  <topic>으로 전환하시겠습니까? (y/n)
  ```
  - `y`: set `current_topic` to `<topic>`
  - `n`: keep existing `current_topic`, still register `<topic>` in topics

Register the topic in `dev-context.json` (set `current_topic` only if user confirmed `y` above, or if no previous topic existed):

```json
{
  "current_topic": "<topic or existing value>",
  "topics": {
    "<topic>": {
      "phase": "plan",
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

Also remove the `current_spec` key from `dev-context.json` if it exists (it was written by `/dev:spec` during the backlog phase and is no longer needed once the topic is registered here).

Note: `specConfirmed` is stored as a convenience field reflecting the review result. It is set here by `/dev:plan`. `/dev:spec` does not register topics, but it does write a temporary `current_spec` field (removed here during plan registration). `specConfirmed` is not used as a gate — the gate is the `spec-review-*.md` Decision check in Step 2.

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

- **Spec must be READY** — requires a `spec-review-*.md` with `READY` or `READY WITH NOTE` decision in `backlog/<topic>/`
- **Planner reads spec, does not write it** — spec path is `docs/_local/active/<topic>/spec.md` after move
- **backlog → active is atomic** — directory move happens before planner invocation; if planner fails, the directory stays in `active/`
- **Plans are stored in `docs/_local/active/`** (git-ignored)
- After completion, run `/dev:impl` to execute one Task at a time

## Next Steps

After plan approval: run Tasks with `/dev:impl`
