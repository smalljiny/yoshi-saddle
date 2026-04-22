---
version: 9
description: Create an implementation plan from a confirmed spec. Moves topic from backlog to active, updates paths in dev-context.json, and generates implementation-plan.md.
category: dev-workflow
---

# /dev:plan

Create an implementation plan from a confirmed spec document and save it to `docs/_local/active/<topic>/implementation-plan.md`.

## Usage

```
/dev:plan            List spec:confirmed topics and select one
/dev:plan <topic>    Plan a specific topic directly
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

### 2. Gate: verify spec is confirmed

Read `phase` and `status` from dev-context.json:

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

If `phase:status` is not `spec:confirmed`, stop:

```
플랜을 수립할 수 없습니다.
현재 상태: <phase>:<status>
spec:confirmed 상태여야 합니다.
먼저 /dev:spec <topic>을 실행하여 Codex 리뷰를 통과하세요.
```

### 3. Move to active

Move the topic directory from backlog to active:

- If `docs/_local/active/<topic>/` already exists, skip the move (re-entry — directory already moved)
- Otherwise move `docs/_local/backlog/<topic>/` → `docs/_local/active/<topic>/`

Update paths in dev-context.json to reflect the new location:

```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=spec \
  --value=docs/_local/active/<topic>/spec.md

node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=specReview \
  --value=docs/_local/active/<topic>/spec-review-<latest-timestamp>.md
```

### 3.5. Load dependency analysis (JS/TS projects only)

Before invoking the planner, check if the project is JS/TS and load dependency analysis:

```
프로젝트 루트에 package.json이 존재하면:
  → wf-dependency-analysis 스킬 로드 지침을 planner 프롬프트에 포함한다
  → planner는 의존성 분석 결과를 참고하여 더 정확한 계획을 수립한다
package.json이 없으면:
  → 이 단계를 스킵한다 (비JS/TS 프로젝트)
```

> **Note**: 의존성 분석은 JS/TS 프로젝트에서만 로드된다. Python, Go 등 비JS/TS 프로젝트는 이 단계를 건너뛴다.

### 4. Invoke the planner agent

If `current_topic` is already set to a different active topic, prompt:

```
현재 작업 중인 토픽: <current_topic>
<topic>으로 전환하시겠습니까? (y/n)
```

- `y`: proceed (current_topic will be updated in Step 6)
- `n`: stop with guidance:
  ```
  plan-review는 current_topic 기준으로 spec을 해석합니다.
  <topic>을 plan-review하려면 먼저 current_topic을 전환해야 합니다:
    /dev:topic switch <topic>
  전환 후 다시 /dev:plan을 실행하세요.
  ```

Pass the following to the planner agent:
- Current topic name
- Confirmed spec path: `docs/_local/active/<topic>/spec.md`
- Instruction: **use `.harness/contracts/implementation-plan.md` as the output format** and include a `**Commit**` field in every Task block (type/scope from `.harness/commit-scopes.md`, subject ≤ 72 chars)

The planner agent produces **only**:
- `docs/_local/active/<topic>/implementation-plan.md`

The spec document is already confirmed and must not be modified.

### 5. Review and approve plan

Present the planner results to the user and request approval.
If revisions are requested, re-invoke the planner agent.

### 6. Update dev-context.json

After approval, update state and register the plan path:

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=plan --status=ready

node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=plan \
  --value=docs/_local/active/<topic>/implementation-plan.md
```

If user confirmed `y` in Step 4, also update `current_topic`:

```bash
node .harness/scripts/dev-context.js set-field \
  --field=current_topic --value=<topic>
```

### 7. Request plan-review

Transition to `plan:reviewing`:

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=plan --status=reviewing
```

Show the user this message:

```
구현 계획이 작성되었습니다: docs/_local/active/<topic>/implementation-plan.md

Codex plan-review를 실행하세요:
  codex "plan-review 스킬로 docs/_local/active/<topic>/implementation-plan.md를 리뷰해줘"

리뷰 완료 후 plan-review-*.md 파일이 생성되면 다시 /dev:plan을 실행하세요.
```

Stop and wait for the user to run Codex and return.

### 8. Reflect plan-review result (re-entry)

When the user returns after Codex plan-review, check the latest `planReview` state:

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

Re-entry state table:

Read `planReview` field and check the Decision in the file (if it exists):

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=planReview
```

| `phase:status` | `planReview` Decision | Action |
|----------------|-----------------------|--------|
| `plan:confirmed` | READY / READY WITH NOTE | `/dev:impl`을 시작할 수 있습니다. |
| `plan:ready` | NOT READY (파일 존재, Decision 확인) | 재계획 안내: 플래너 재호출 (Step 4로 돌아가기) |
| `plan:ready` | 없음 (파일 미존재) | plan-review 실행 안내 (Step 7 메시지 반복) |
| `plan:reviewing` | 없음 | plan-review 실행 안내 (Step 7 메시지 반복) |

## Plan Document Format

See `.harness/contracts/implementation-plan.md` for the canonical format.

```markdown
# Implementation Plan: <topic name>

## Overview
[Summary]

## Spec Reference
> Based on: `docs/_local/active/<topic>/spec.md`

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

- **Gate: spec:confirmed** — `/dev:plan` only proceeds when `phase=spec && status=confirmed`
- **Planner reads spec, does not write it** — spec path is `docs/_local/active/<topic>/spec.md` after move
- **backlog → active is atomic** — directory move happens before planner invocation; if planner fails, the directory stays in `active/`
- **Plans are stored in `docs/_local/active/`** (git-ignored)
- **plan:confirmed is set by Codex plan-review** — `/dev:plan` does not set `plan:confirmed`; that is owned by the Codex plan-review skill
- After plan-review passes: run Tasks with `/dev:impl`

## Next Steps

After plan-review passes (`plan:confirmed`): run Tasks with `/dev:impl`
