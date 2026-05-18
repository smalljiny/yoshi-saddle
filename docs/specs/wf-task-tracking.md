# wf-task-tracking 스킬

> 3개 implementation 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)가 Story 내부 Task 진행을 Claude Task 도구로 추적하기 위한 정형 패턴의 단일 진실 원천.

## 개요

`wf-task-tracking`은 implementation 에이전트가 Story 내부의 Task 단위 진행을 TaskUpdate로 추적할 때 따르는 패턴을 정의한다. 3개 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)의 frontmatter `tools`에 `TaskCreate, TaskUpdate`가 등록되어 있으며, 각 에이전트 본문의 표준 위임 라인(`Load .claude/skills/wf-task-tracking/SKILL.md and follow its process.`)으로 로드된다.

**책임 경계:**
- TaskCreate(Story 시작 시 일괄 생성)는 `/flow-impl`이 담당한다. 본 스킬의 호출자(에이전트)는 TaskCreate를 호출하지 않는다.
- dev-context.json 영속화는 `/flow-impl`이 담당한다.
- Story 단위 체크박스(`### [ ] Story N` → `### [x] Story N`) 갱신은 `/flow-impl`이 담당한다.
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

### /flow-impl과의 책임 분리

| 주체 | Task 도구 책임 |
|------|---------------|
| `/flow-impl` (Step 4) | 현재 Story의 모든 Task에 대해 `TaskCreate(pending)` 일괄 호출 |
| `/flow-impl` (Step 9.5) | Task 도구 entries 상태(단일 진실 원천)를 plan markdown 체크박스로 sync (entries → markdown 방향). 미체크 Task 1건 이상이면 미체크 Task 게이트 (`AskUserQuestion`)를 실행해 사용자 의도를 묻는다. |
| 3개 implementation 에이전트 | 각 Task 시작 시 `TaskUpdate(in_progress)`, 완료 시 `TaskUpdate(completed)`. plan markdown 체크박스 Edit는 Step 9.5가 entries 상태로부터 일괄 갱신한다. |
| `wf-task-tracking` 스킬 | 에이전트가 따르는 패턴의 단일 진실 원천 (activeForm 파생 규칙, 실패 처리 포함) |
| `code-reviewer` 에이전트 | 변경 없음 — 리뷰는 Task 진행 추적과 무관 |

## 동작

### When to TaskUpdate

에이전트는 Story의 `**Tasks**:` 목록에 있는 각 Task에 대해 두 시점에 TaskUpdate를 호출한다:

| 트리거 | 호출 |
|--------|------|
| Task 작업 시작 직전 | `TaskUpdate(taskId=T<storyN>.<taskM>, status='in_progress', activeForm=<derived>)` |
| Task 작업 완료 직후 (verification 통과 시) | `TaskUpdate(taskId=T<storyN>.<taskM>, status='completed')` |

Task ID는 plan의 `**Tasks**:` 목록에서 `- [ ] T<storyN>.<taskM> — <subject>` 형식으로 명시되어 있다. plan markdown 체크박스(`- [ ]` → `- [x]`) Edit는 에이전트가 직접 수행하지 않는다 — `/flow-impl` Step 9.5가 entries 상태(`completed`)를 markdown 으로 sync 한다. 에이전트는 TaskUpdate 호출만 책임진다.

### TaskCreate 책임

에이전트는 TaskCreate를 호출하지 않는다. `/flow-impl`이 Step 4에서 현재 Story의 `**Tasks**:` 목록을 파싱해 모든 Task에 대해 `TaskCreate(pending)`를 일괄 호출한다. 에이전트가 제어권을 넘겨받는 시점에는 이미 `T<storyN>.<taskM>` ID로 entries가 생성되어 있다.

에이전트가 시작하려는 Task의 Task 도구 entry가 없으면 호출자(`/flow-impl`)에게 불일치를 보고하고 plan markdown을 단일 진실 원천으로 계속 진행한다. 누락 entry를 스스로 생성하지 않는다.

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
| `TaskUpdate` 호출 실패 (도구 미사용·권한 오류 등) | 에러를 무음 무시하고 에이전트 본 작업을 계속 진행한다. Step 9.5가 entries 누락 케이스를 미체크 Task 게이트로 처리한다. |
| 에이전트 작업 자체 실패 (테스트 실패·구현 오류) | 호출자(`/flow-impl`)에게 실패를 보고한다. 해당 Task의 도구 상태는 `in_progress`로 유지하며 `completed`로 전환하지 않는다. |
| Plan markdown에 매칭되는 `- [ ]` 라인 없음 | TaskUpdate는 정상 호출한다. markdown Edit는 에이전트가 수행하지 않으므로 본 케이스는 Step 9.5가 entries 상태로부터 자연스럽게 처리한다 (매칭 라인이 없으면 갱신할 대상도 없음). |

### 완료 검증

Task 완료의 단일 책임은 `T<storyN>.<taskM>` Task 도구 entry 상태가 `completed` 인지로 판정한다. plan markdown 체크박스(`- [x]`) 갱신은 `/flow-impl` Step 9.5 가 entries 상태로부터 sync 한다.

## 제약사항

- TaskCreate는 호출자(`/flow-impl`)가 Story 시작 시 일괄 수행한다. 본 스킬의 호출자(에이전트)는 TaskCreate를 호출하지 않는다.
- dev-context.json 영속화는 `/flow-impl`이 담당한다. 본 스킬은 영속 상태를 직접 읽거나 쓰지 않는다.
- Story 단위 체크박스(`### [ ] Story N` → `### [x] Story N`) 갱신은 `/flow-impl`이 담당한다. Task 단위(`- [ ]` → `- [x]`) 갱신은 `/flow-impl` Step 9.5가 entries 상태로부터 sync한다 — 에이전트는 직접 수행하지 않는다.
- Story 단위 Task 도구 entry를 생성하지 않는다. Task 도구는 Story 내부 Task(T<storyN>.<taskM>) 단위에만 사용한다.
- Task 도구 상태는 세션 단위다. cross-session 복원은 지원하지 않는다. plan markdown 체크박스가 영속 단일 진실 원천이다.
- missing entry 발견 시 에이전트가 스스로 TaskCreate를 호출하지 않는다 — 호출자에게 보고하고 작업을 계속 진행한다. Step 9.5 가 entries 상태로부터 markdown 을 sync 하며, entry 없는 Task 라인은 미체크 Task 게이트로 흐른다 (사용자가 '보고 누락' 선택 시 markdown `[x]` 처리, '실제 미수행' 선택 시 `[ ]` 유지).
- `/flow-impl` Step 9.5 는 entries 상태(`completed`)를 markdown(`- [x]`) 으로 sync 한다 (entries → markdown 방향). 누락 entry 를 재생성하지 않는다.
- 에이전트는 plan markdown 체크박스를 직접 Edit 하지 않는다. Step 9.5 가 entries 상태로부터 일괄 갱신한다.
