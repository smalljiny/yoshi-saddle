# wf-task-tracking 스킬

> 3개 implementation 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)가 Story 내부 Task 진행을 Claude Task 도구로 추적하기 위한 정형 패턴의 단일 진실 원천.

## 개요

`wf-task-tracking`은 implementation 에이전트가 Story 내부의 Task 단위 진행을 TaskUpdate로 추적할 때 따르는 패턴을 정의한다. 3개 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)의 frontmatter `tools`에 `TaskCreate, TaskUpdate`가 등록되어 있으며, 각 에이전트 본문의 표준 위임 라인(`Load .claude/skills/wf-task-tracking/SKILL.md and follow its process.`)으로 로드된다.

**책임 경계:**
- TaskCreate(Story 시작 시 일괄 생성)는 `/dev:impl`이 담당한다. 본 스킬의 호출자(에이전트)는 TaskCreate를 호출하지 않는다.
- dev-context.json 영속화는 `/dev:impl`이 담당한다.
- Story 단위 체크박스(`### [ ] Story N` → `### [x] Story N`) 갱신은 `/dev:impl`이 담당한다.
- Story 단위 Task 도구 entry는 생성하지 않는다. Task 도구는 Story 내부 Task(T<storyN>.<taskM>) 단위 추적에만 사용한다.

## 구조

```
.claude/skills/wf-task-tracking/
  SKILL.md                    # 스킬 정의 (단일 진실 원천)

.claude/agents/
  tdd-specialist.md           # tools: TaskCreate, TaskUpdate + 위임 라인
  refactor-cleaner.md         # 동일
  prompt-engineer.md          # 동일
```

### /dev:impl과의 책임 분리

| 주체 | Task 도구 책임 |
|------|---------------|
| `/dev:impl` (Step 4) | 현재 Story의 모든 Task에 대해 `TaskCreate(pending)` 일괄 호출 |
| `/dev:impl` (Step 9.5) | Story 완료 후 markdown `[x]` 상태를 Task 도구 `completed` 상태로 정렬 |
| 3개 implementation 에이전트 | 각 Task 시작 시 `TaskUpdate(in_progress)`, 완료 시 `TaskUpdate(completed)` + markdown 체크박스 갱신 |
| `wf-task-tracking` 스킬 | 에이전트가 따르는 패턴의 단일 진실 원천 (activeForm 파생 규칙, 실패 처리 포함) |
| `code-reviewer` 에이전트 | 변경 없음 — 리뷰는 Task 진행 추적과 무관 |

## 동작

### When to TaskUpdate

에이전트는 Story의 `**Tasks**:` 목록에 있는 각 Task에 대해 두 시점에 TaskUpdate를 호출한다:

| 트리거 | 호출 |
|--------|------|
| Task 작업 시작 직전 | `TaskUpdate(taskId=T<storyN>.<taskM>, status='in_progress', activeForm=<derived>)` |
| Task 작업 완료 직후 (verification 통과 시) | 1. `TaskUpdate(taskId=T<storyN>.<taskM>, status='completed')` → 2. plan markdown `- [ ]` → `- [x]` Edit |

두 완료 호출의 순서: TaskUpdate 먼저, markdown Edit 다음. Task ID는 plan의 `**Tasks**:` 목록에서 `- [ ] T<storyN>.<taskM> — <subject>` 형식으로 명시되어 있다.

### TaskCreate 책임

에이전트는 TaskCreate를 호출하지 않는다. `/dev:impl`이 Step 4에서 현재 Story의 `**Tasks**:` 목록을 파싱해 모든 Task에 대해 `TaskCreate(pending)`를 일괄 호출한다. 에이전트가 제어권을 넘겨받는 시점에는 이미 `T<storyN>.<taskM>` ID로 entries가 생성되어 있다.

에이전트가 시작하려는 Task의 Task 도구 entry가 없으면 호출자(`/dev:impl`)에게 불일치를 보고하고 plan markdown을 단일 진실 원천으로 계속 진행한다. 누락 entry를 스스로 생성하지 않는다.

### activeForm 자동 파생

TaskCreate와 TaskUpdate의 `activeForm` 필드는 Task subject에서 결정론적으로 파생한다:

| Subject 형태 | activeForm 형태 | 예시 |
|--------------|-----------------|------|
| 한국어 종결형 (`X한다`, `X 추가`, `X 변경`) | `X 중` | `버전 필드 업데이트한다` → `버전 필드 업데이트 중` |
| 한국어 명사형 (`X 추가`, `X 검증`) | `X 중` | `엣지 케이스 검증` → `엣지 케이스 검증 중` |
| 영문 명령형 (`Update X`, `Add Y`) | gerund형 (`Updating X`, `Adding Y`) | `Update version field` → `Updating version field` |
| 영문 명사구 (`Test for X`) | `Testing X` 또는 `<noun> in progress` | `Migration test for currentTask` → `Testing migration for currentTask` |

위 패턴에 해당하지 않는 subject는 한국어이면 ` 중`을 append하고, 영문이면 선두 동사를 `-ing` 형으로 변환한다.

### 실패 처리

| 실패 유형 | 처리 |
|----------|------|
| `TaskUpdate` 호출 실패 (도구 미사용·권한 오류 등) | 에러를 무음 무시하고 에이전트 본 작업을 계속 진행한다. plan markdown 체크박스가 단일 진실 원천이다. |
| 에이전트 작업 자체 실패 (테스트 실패·구현 오류) | 호출자(`/dev:impl`)에게 실패를 보고한다. 해당 Task의 도구 상태는 `in_progress`로 유지하며 `completed`로 전환하지 않는다. |
| Plan markdown에 매칭되는 `- [ ]` 라인 없음 | TaskUpdate는 호출하되 markdown Edit는 건너뛴다. 호출자에게 plan-markdown 불일치를 보고한다. |

### 완료 검증

Task 완료 시 두 산출물이 모두 갱신됐는지 확인한다:
1. plan markdown의 해당 `- [ ]` 라인이 `- [x]`로 변경됨
2. `T<storyN>.<taskM>` Task 도구 entry가 `completed` 상태

둘 중 하나만 완료 상태이면 Task가 완료되지 않은 것이다. 누락된 업데이트를 재호출한다.

## 제약사항

- TaskCreate는 호출자(`/dev:impl`)가 Story 시작 시 일괄 수행한다. 본 스킬의 호출자(에이전트)는 TaskCreate를 호출하지 않는다.
- dev-context.json 영속화는 `/dev:impl`이 담당한다. 본 스킬은 영속 상태를 직접 읽거나 쓰지 않는다.
- Story 단위 체크박스(`### [ ] Story N` → `### [x] Story N`) 갱신은 `/dev:impl`이 담당한다. 에이전트는 Task 단위(`- [ ]` → `- [x]`) 갱신만 수행한다.
- Story 단위 Task 도구 entry를 생성하지 않는다. Task 도구는 Story 내부 Task(T<storyN>.<taskM>) 단위에만 사용한다.
- Task 도구 상태는 세션 단위다. cross-session 복원은 지원하지 않는다. plan markdown 체크박스가 영속 단일 진실 원천이다.
- missing entry 발견 시 에이전트가 스스로 TaskCreate를 호출하지 않는다 — 호출자에게 보고하고 markdown 단일 진실 원천으로 계속 진행한다.
- `/dev:impl` Step 9.5는 `[x]` 라인의 entry 상태를 `completed`로 정렬한다. 누락 entry를 재생성하지 않는다.
