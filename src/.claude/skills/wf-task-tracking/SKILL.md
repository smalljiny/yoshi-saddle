---
version: 1
name: wf-task-tracking
description: Single source of truth for Claude Task tool integration in implementation agents. Loaded by tdd-specialist, refactor-cleaner, and prompt-engineer to track Task progress within a Story via TaskUpdate. TaskCreate batching is handled by /dev:impl, not the calling agent.
origin: harness
category: dev-process
---

# wf-task-tracking

## Role and Scope

You are an implementation agent (tdd-specialist, refactor-cleaner, or prompt-engineer) running inside a single Story of an implementation plan. The plan's `**Tasks**:` list contains the Task entries you execute in order.

**Your responsibility:** call `TaskUpdate` to mark each Task `in_progress` when work starts and `completed` when work finishes, and flip the corresponding `- [ ]` checkbox in the plan markdown to `- [x]` immediately after completion.

**Out of scope:**
- Creating Task tool entries (`TaskCreate`) — `/dev:impl` performs this once at Story start.
- Persisting state to `dev-context.json` — owned by `/dev:impl`.
- Tracking the Story-level checkbox (`### [ ] Story N` → `### [x] Story N`) — owned by `/dev:impl`.

## When to TaskUpdate

Call `TaskUpdate` at two trigger points for each Task in the Story's `**Tasks**:` list:

| Trigger | Action |
|---------|--------|
| Before starting work on a Task | `TaskUpdate(taskId=T<storyN>.<taskM>, status='in_progress', activeForm=<derived activeForm>)` |
| Immediately after the Task's work is verified complete | 1. `TaskUpdate(taskId=T<storyN>.<taskM>, status='completed')`<br>2. Edit the plan markdown: change the matching `- [ ]` to `- [x]` |

The two completion calls run in this order: TaskUpdate first, then the markdown edit. Both are single-step operations — do not batch them across multiple Tasks.

## TaskCreate Responsibility

`TaskCreate` is **not** called by you. `/dev:impl` parses the Story's `**Tasks**:` list at Story start and issues one batched `TaskCreate` call covering every Task in pending status before invoking you. By the time you receive control, Task tool entries already exist with the IDs `T<storyN>.<taskM>` and the subjects copied from each Task line's first line.

If a Task tool entry is missing for a Task you are about to start, report the discrepancy to the caller (`/dev:impl`) and proceed using the plan markdown as the authoritative source. Do not create the missing entry yourself.

## activeForm Derivation Rules

`TaskCreate` and `TaskUpdate` require an `activeForm` field describing the in-progress action (used in the spinner). Derive `activeForm` from the Task subject deterministically:

| Subject form | activeForm form | Example |
|--------------|-----------------|---------|
| Korean 종결형 (`X한다`, `X 추가`, `X 변경`) | `X 중` | `버전 필드 업데이트한다` → `버전 필드 업데이트 중` |
| Korean 명사형 (`X 추가`, `X 검증`) | `X 중` | `엣지 케이스 검증` → `엣지 케이스 검증 중` |
| English imperative (`Update X`, `Add Y`) | gerund form (`Updating X`, `Adding Y`) | `Update version field` → `Updating version field` |
| English noun phrase (`Test for X`) | `Testing X` or `<noun> in progress` | `Migration test for currentTask` → `Testing migration for currentTask` |

For subjects that do not match any row, append ` 중` (Korean) or convert the leading verb to `-ing` form (English).

## 도구 호출 트리거

- 각 Task의 작업 시작 직전, `TaskUpdate(<task-id>, status='in_progress', activeForm=<derived>)`를 호출한다.
- 각 Task의 작업이 완료되어 verification을 통과한 직후, `TaskUpdate(<task-id>, status='completed')`를 호출하고 plan markdown의 해당 `- [ ]` 라인을 `- [x]`로 Edit 한다.
- Task ID는 plan의 `**Tasks**:` 목록에서 `- [ ] T<storyN>.<taskM> — <subject>` 형식으로 명시되어 있다. 이 ID를 그대로 TaskUpdate `taskId`로 사용한다.

## 실패 처리

| Failure | Handling |
|---------|----------|
| `TaskUpdate` 호출이 실패 (Task 도구 미사용·권한 오류 등) | 에러를 무음 무시하고 에이전트 본 작업을 계속 진행한다. plan markdown 체크박스가 단일 진실 원천이다. |
| 에이전트 작업 자체가 실패 (테스트 실패·구현 오류) | 호출자(`/dev:impl`)에게 실패를 보고한다. 해당 Task의 도구 상태는 `in_progress`로 남기고 `completed`로 전환하지 않는다. |
| Plan markdown에 매칭되는 `- [ ]` 라인이 없음 | TaskUpdate는 호출하되 markdown Edit는 건너뛴다. 호출자에게 plan-markdown 불일치를 보고한다. |

## Verification

After Task completion, verify two artifacts are updated:
1. The plan markdown's matching `- [ ]` line is now `- [x]`.
2. The Task tool entry for `T<storyN>.<taskM>` is in `completed` state.

If only one of the two reflects completion, the Task is not done — re-issue the missing update.

## Resources

- `.harness/contracts/implementation-plan.md` — defines `**Tasks**:` list format and `T<storyN>.<taskM>` ID convention.
- `.claude/commands/dev/impl.md` — owns Story-start `TaskCreate` batching and post-Story markdown sync.
