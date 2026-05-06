# /dev:impl 워크플로우

> Story 단위 실행·커밋 계약과 `--all` 배치 모드. 각 Story 시작 시 그 Story의 Tasks를 Claude Task 도구 entries(pending)로 일괄 생성하고, 에이전트가 Task별 진행을 추적하며, Story 완료 후 markdown 체크박스 상태로 Task 도구 상태를 sync한다.

## 개요

기본적으로 `/dev:impl`은 Story 하나를 실행하고 멈춘다. 각 Story는 에이전트 호출 → code-reviewer → commit의 세 단계를 밟는다. Story 타입에 따라 호출되는 에이전트가 다르다.

Story 시작 시점에 `/dev:impl`이 그 Story의 모든 Task를 Claude Task 도구 entries(pending)로 일괄 생성한다. 이후 implementation 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)가 `wf-task-tracking` 스킬을 따라 각 Task의 시작·완료 시 TaskUpdate를 호출한다. Story 완료 후 markdown 체크박스 상태를 Task 도구 상태와 최종 sync한다.

배치 모드(`--all` 또는 `config.dev_impl.batch_mode=true`)를 활성화하면 미완료 Story 전체를 순차 자동 실행한다.

## 구조

### 커밋 규칙 관련 파일

```
.harness/
├── commit-scopes.md          # 프로젝트별 commit scope 목록 (교체 가능)
├── rules/
│   ├── git-workflow.md       # commit/PR/브랜치 정책 (공유)
│   ├── coding-style.md       # 코딩 스타일 (공유)
│   ├── testing.md            # 테스트 규칙 (공유)
│   ├── security.md           # 보안 규칙 (공유)
│   └── typescript/           # TypeScript 전용 규칙 (공유)
└── contracts/
    └── implementation-plan.md  # Story·Task 계층 및 Commit 섹션 포맷 정의
```

### implementation-plan.md 포맷

```markdown
## Story List

### [ ] Story N: <title>
- **Type**: tdd | config | infra | refactor | prompt
- **Goal**: ...
- **Tasks**:
  - [ ] T<N>.<M> — <imperative one-liner subject>
  - [ ] T<N>.<M+1> — <imperative one-liner subject>
- **Completion Criteria**: ...
- **Commit**: `<type>(<scope>): <subject>`
```

계층 구조: Story List → Story N → Tasks (T<storyN>.<taskM>) → Completion Criteria → Commit.

각 Task 불릿의 첫 줄은 한 줄 명령형 subject이며 TaskCreate `subject` 필드로 그대로 사용된다. sub-bullet·코드 블록·표는 구현자 detail로 허용되며 Task 도구 entries에는 미반영된다.

`prompt` 타입은 Completion Criteria에 Eval Cases와 Acceptance를 포함한다 (형식은 아래 Eval Case 스키마 참조).

### Task 도구 통합 파일

```
.claude/skills/wf-task-tracking/SKILL.md   # Task 도구 사용 패턴 단일 진실 원천
.claude/agents/tdd-specialist.md           # wf-task-tracking 위임 라인 포함
.claude/agents/refactor-cleaner.md         # 동일
.claude/agents/prompt-engineer.md          # 동일
```

## 동작

### 기본 실행 흐름 (단일 Story)

각 Story는 다음 순서로 실행된다:

**Step 1 — 컨텍스트 읽기·플래그 파싱·게이트 체크 + transition**

- `--all` 플래그 또는 `config.dev_impl.batch_mode=true`이면 batch 모드 활성화
- 명시적 Story 인자(`S2` 등)가 있으면 batch_mode 무관하게 단일 Story 실행
- `phase:status` 상태 테이블로 게이트와 transition을 한 단계에 처리:

  | `phase:status` | 동작 |
  |----------------|------|
  | `plan:confirmed` | `update-state --phase=impl --status=in-progress` 호출 후 다음 단계로 진행 |
  | `impl:in-progress` | 그대로 다음 단계로 진행 (no-op) |
  | (그 외) | 게이트 실패 메시지 출력 후 정지 |

- `update-state` 비-zero exit 시 즉시 정지하고 에러 메시지 출력. `currentBatchRunning`·`currentBatchTopic`은 정리하지 않는다 — Step 11 미도달로 stale 상태가 유지되어 다음 호출에서 재개 다이얼로그가 자연스럽게 발동한다.
- batch 상태 stale 감지: `currentBatchRunning == "true"` 시 토픽 일치 여부로 재개/초기화 분기

**Step 2 — Story 상세 파악**

plan 문서에서 추출:
- **Type**: tdd, config, infra, refactor, prompt
- **Goal**: 달성 목표
- **Tasks**: `- [ ] T<storyN>.<taskM> — <subject>` 불릿 목록
- **Completion Criteria**: 검증 기준

**Step 3 — Pre-work 브리핑 및 승인 대기**

배치 모드 두 번째 Story 이후: 한 줄 헤더만 출력하고 즉시 Step 4로 진행
```
--- Starting Story <ID>: <Name> ---
```

그 외(첫 번째 Story 또는 비배치): 전체 브리핑 블록 출력 후 승인 대기.
- 복잡한 Story 판정(infra 타입 또는 Tasks ≥ 5)이면 `advisor()`를 브리핑 직후 호출해 위험·엣지 케이스를 사전 점검한다.
- `config.dev_impl.auto_start == "true"`이면 승인 없이 즉시 Step 4로 진행한다.

**Step 4 — Story의 Task entries 일괄 생성**

Step 3 직후, 현재 Story의 `**Tasks**:` 목록을 파싱해 Task 도구 entries를 일괄 생성한다.

- 각 `- [ ] T<storyN>.<taskM> — <subject>` 라인의 ID와 subject를 추출한다 (sub-bullet 제외).
- `activeForm`은 wf-task-tracking 스킬의 파생 규칙으로 생성한다 (한국어 종결형 → `X 중`, English imperative → `-ing` 형).
- 모든 Task에 대해 `TaskCreate(taskId=T<storyN>.<taskM>, subject=<subject>, activeForm=<derived>, status='pending')`를 일괄 호출한다.
- TaskCreate 호출 실패 시 stderr 경고를 출력하고 계속 진행한다 — plan markdown이 단일 진실 원천이므로 에이전트 동작에 영향 없다.
- Story 재시도 시 동일 ID에 TaskCreate가 중복 호출되어 거부되어도 무해하다 (Step 9.5는 `[x]` 라인 entry를 `completed`로 정렬할 뿐 누락 entry를 재생성하지 않는다).

**Step 5 — Story 타입별 에이전트 자동 호출**

| Type | 에이전트 | 동작 |
|------|---------|------|
| `tdd` | tdd-specialist | RED → GREEN → REFACTOR 사이클 |
| `prompt` | prompt-engineer | PROPOSE → EVAL → REFINE 사이클 (`stack-prompt` 스킬 사용, 최대 5회) |
| `refactor` | refactor-cleaner | 기존 테스트 커버리지 확인 후 구조적 개선 |
| `config` | (직접 처리) | 설정 파일 변경 및 검증 |
| `infra` | (직접 처리) | 인프라 변경 및 문서화 |

tdd-specialist·refactor-cleaner·prompt-engineer는 `wf-task-tracking` 스킬을 로드해 각 Task 시작·완료 시 TaskUpdate를 호출한다. 해당 에이전트가 해결 불가능한 실패를 보고하면: batch 모드 시 `batch_failed = true`로 Step 11(terminal)로 이동, 비배치 시 중단.

**Step 6 — code-reviewer 자동 호출** (에이전트 완료 직후)

모든 타입에 적용. 이슈 분류 후 CRITICAL·HIGH는 자동 수정.

- `tdd` 타입 전용: code-reviewer 완료 직후 `simplify` 스킬을 로드해 코드 재사용·효율성·품질을 재검토한다. `config`·`infra`·`refactor`·`prompt` 타입은 적용하지 않는다.
- `prompt` 타입: code-reviewer는 comment-only. 평가 대상 프롬프트 파일을 수정하지 않는다. 수정이 필요하면 prompt-engineer를 재호출해 eval 게이트를 다시 통과해야 한다.

code-reviewer blocking 이슈 자동 수정 불가 시: batch 모드는 `batch_failed = true`, 비배치는 중단.

**Step 7 — Completion Criteria 검증**

plan 문서의 완료 기준 항목을 모두 검증한다. 미충족 시: batch 모드는 `batch_failed = true`, 비배치는 중단.

**Step 8 — 커밋 실행**

`config.dev_impl.auto_commit`을 읽어 자동/수동 커밋을 분기한다.

- `auto_commit == "true"`: 민감 파일 패턴(`.env*`, `*.pem`, `*.key`, `credentials.json`) 검사 후 HEREDOC 패턴으로 자동 commit.
- 그 외(기본): 사용자에게 y/n/skip 프롬프트. `n` 응답 시 batch 모드는 `batch_failed = true`, 비배치는 중단.
- `**Commit**` 필드 없는 Story: skip 여부 프롬프트. skip 거부 시 batch는 중단.

**Step 9 — Plan Document 갱신**

Story와 그 모든 Tasks의 체크박스를 완료로 표시한다:
- Story 헤더: `### [ ] Story N` → `### [x] Story N`
- 각 Task 불릿: `- [ ]` → `- [x]`

**Step 9.5 — markdown → Task 도구 상태 sync**

Step 9 완료 직후, 현재 Story의 Tasks 목록을 다시 파싱해 `- [x]` 라인의 `T<storyN>.<taskM>`에 대해 Task 도구 entry 상태가 `completed`가 아니면 `TaskUpdate(taskId=T<storyN>.<taskM>, status='completed')`를 호출한다.

에이전트가 wf-task-tracking 스킬을 따라 TaskUpdate를 호출했더라도 누락이 있을 수 있다. 본 단계는 markdown을 단일 진실 원천으로 두고 Task 도구 상태를 정렬한다. TaskUpdate 호출 실패 시 stderr 경고만 출력하고 다음 단계로 진행한다.

**Step 10 — dev-context.json 갱신**

```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=currentStory --value=<next-story-id>
```

모든 Story 완료 시 `--value=null`을 사용한다.

**Step 10.5 — Batch Loop Decision**

Step 10 완료 후 batch 상태를 평가한다:
- 명시적 Story 인자가 있었으면 이 단계를 건너뛴다 (explicit-Story-wins).
- `currentBatchRunning == "true"` 이고 토픽 일치 시 `batch = true` 복원 (세션 메모리 소실 보완).
- 다음 미완료 Story 있음 → Step 2로 복귀
- 미완료 Story 없음 → Step 11(terminal: batch complete)

**Step 11 — Story 완료 브리핑 및 종료**

모든 terminal exit 직전 batch 상태 필드를 초기화한다:
```bash
node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchRunning --value=false
node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchTopic --value=false
```

- 단일 Story 모드: Story Complete 브리핑 + 다음 Story 안내
- 배치 완료: Batch Complete 목록 + `/dev:review` 안내
- 배치 실패 중단: Batch Stopped 브리핑 + 재개 방법 안내

### prompt 타입 상세

`prompt-engineer` 에이전트는 다음 입력을 받아 PROPOSE→EVAL→REFINE 사이클을 실행한다:
- Goal, Eval Cases (Completion Criteria에서 파싱), Acceptance 임계값, 대상 파일 경로

에이전트는 최대 5회 반복하며, 연속 2회 pass_count(통과 Eval 개수) 증가 없음이 감지되면 정체로 판단해 즉시 보고한다. 5회 이내에 Acceptance 미달 시 실패 패턴 요약과 현재 최선 초안을 제시하고 사용자 판단에 위임한다.

### Eval Case 스키마

`prompt` 타입 Story의 Completion Criteria에 기재하는 평가 케이스 형식. planner·plan-review·prompt-engineer가 공유하는 계약이다.

| 전략 | 적용 기준 | 필수 필드 |
|------|----------|---------|
| `direct` (기본값, 생략 가능) | 정확한 텍스트·구조 일치 | Input, Expected |
| `rubric` | 주관적 품질 (어조, 간결성, 준수 여부) | Input, Criteria, Rubric, Pass |
| `judge` | 복잡한 추론·정확성 (Claude-as-judge) | Input, Expected, Pass |

**`direct` 전략** (전략 태그 생략 가능):
```markdown
- [ ] Eval 1: Input: "<시나리오>" → Expected: "<기대 출력 텍스트 또는 패턴>"
```

**`rubric` 전략:**
```markdown
- [ ] Eval 2 [rubric]: Input: "<시나리오>"
    Criteria: "<평가 기준>"
    Rubric: "1=<나쁜 예 설명>, 5=<좋은 예 설명>"
    Pass: score >= N
```

**`judge` 전략:**
```markdown
- [ ] Eval 3 [judge]: Input: "<시나리오>"
    Expected: "<기대 동작 설명 (비교 기준용)>"
    Pass: judge 통과
```

**Acceptance 계산 규칙:**
```markdown
- [ ] Acceptance: N/M eval 통과
```
- M = Eval Case 총 개수; N = 통과 요건 개수 (일반적으로 N = M)
- N ≠ M이면 명시적 표기 (예: `Acceptance: 2/3 eval 통과`)
- 각 Eval의 Pass 조건 충족 여부로 통과 계산

정체 감지 지표: 전략 무관하게 각 Eval의 이진 통과(1)/실패(0)를 합산한 pass_count를 기준으로 연속 2회 증가 없음을 정체로 판정한다.

### plan-review 검증 규칙 (`prompt` 타입)

plan-review 스킬이 `prompt` 타입 Story를 검증할 때 적용하는 규칙:

| 검증 항목 | 미충족 시 결정 |
|----------|-------------|
| Eval Case 최소 2개 이상 | NOTE |
| 각 Eval에 Input 필드 존재 | NOT READY |
| `direct` Eval에 Expected 필드 존재 | NOT READY |
| `rubric` Eval에 Criteria + Rubric + Pass 필드 존재 | NOT READY |
| `judge` Eval에 Expected + Pass 필드 존재 | NOT READY |
| `Acceptance: N/M` 형식 명시 | NOTE |
| N ≤ M 이고 N ≥ 1 | NOT READY |

### 커밋 계약

**Story 커밋 실행**

1. plan의 `**Commit**` 필드에서 메시지 추출
2. `config.dev_impl.auto_commit` 읽기:
   - `true`: 자동 실행 (HEREDOC 패턴, 민감 파일 검사 후)
   - `false`(기본): 사용자에게 y/n/skip 프롬프트
3. `git add -A` 금지 — Story에서 변경된 파일만 명시적으로 stage
4. amend 금지 — 항상 새 commit
5. `**Commit**` 필드 없으면 skip/continue 프롬프트

**review-fix 커밋** (`/dev:review` Step 6.1)

- `/dev:review`에서 CRITICAL/HIGH 이슈 수정 시 별도 commit 생성
- 권장 메시지: `fix: review feedback` (강제 아님)
- amend 금지, plan Commit 필드 불변 유지

**커밋 메시지 형식**

```
<type>(<scope>): <subject>   (subject 72자 이내)

[optional body]
```

- type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- scope: `.harness/commit-scopes.md`에 정의된 값 권장 (자유 허용, warning 수준 검증)
- plan-review: Commit 섹션의 type/scope/subject를 warning 수준으로 검증

### 배치 모드

**활성화 방법**

| 방법 | 설명 |
|------|------|
| `/dev:impl --all` | 해당 호출에 한해 배치 모드 진입 |
| `config.dev_impl.batch_mode=true` | 항상 배치 모드로 동작 |

명시적 Story 인수(예: `/dev:impl S2`)가 있으면 `batch_mode` 설정과 무관하게 단일 Story만 실행한다.

**배치 상태 영속화**

서브 에이전트 완료 후 세션 메모리의 `batch` 변수가 소실되어도 배치 루프가 지속되도록 `dev-context.json`에 배치 상태를 저장한다.

| 필드 | 위치 | 설명 |
|------|------|------|
| `currentBatchRunning` | `config.dev_impl` | 배치 진행 중 여부 (`true`/`false`) |
| `currentBatchTopic` | `config.dev_impl` | 배치가 시작된 토픽 (topic-scoped) |

- batch 진입 시: 두 필드 즉시 저장
- 토픽 불일치 stale 상태: silently reset 후 단일 Story 진행
- Step 11 모든 terminal exit 시: 두 필드를 `false`로 초기화

**배치 실패 조건** — 아래 중 하나라도 발생하면 배치를 즉시 중단한다:

| # | 조건 | 단계 |
|---|------|------|
| 1 | 에이전트가 해결 불가능한 실패 보고 | Step 5 |
| 2 | code-reviewer blocking 이슈 자동 수정 불가 | Step 6 |
| 3 | Completion Criteria 검증 실패 | Step 7 |
| 4 | 사용자가 commit 거부 (`n`) | Step 8 |
| 5 | `**Commit**` 필드 없는 Story에서 사용자가 skip 거부 | Step 8 |

**완전 자동화 조합**

`batch_mode`, `auto_start`, `auto_commit`을 모두 활성화하면 첫 번째 Story 승인 이후 모든 인간 게이트가 제거된다. 신뢰할 수 있는 환경에서만 사용한다.

```bash
# dev-context.json config.dev_impl 예시
{
  "batch_mode": true,
  "auto_start": true,
  "auto_commit": true
}
```

### 공유 규칙 위치

- `.harness/rules/` — Claude Code + Codex 공유 (coding-style, git-workflow, testing, security, typescript)
- `.claude/rules/common/` — Claude Code 운영 규칙만 (agents, performance, development-workflow, component-boundaries)
- `.harness/commit-scopes.md` — 프로젝트별 scope 목록. 다른 프로젝트 복사 시 이 파일만 교체.

### PR 병합 단위 체크 (`/dev:spec` + `.harness/contracts/spec.md`)

스펙 작성 중 다음 기준으로 단일 PR 적합성을 검증한다 (전체 기준은 `.harness/contracts/spec.md` 참조):

- 독립 배포 가능 (다른 PR 없이 merge 가능)
- 독립 롤백 가능 (revert 시 다른 기능이 깨지지 않음)
- 3개 이상의 독립 목표 → 분할 권장

## 제약사항

- `git add -A` 금지. Story 변경 파일만 명시적 stage.
- amend 금지. 항상 새 commit 생성.
- 명시적 Story 인수는 `batch_mode`를 무효화하며 stale 감지를 건너뛴다 (explicit-Story-wins).
- 배치 상태(`currentBatchRunning`·`currentBatchTopic`)는 topic-scoped. 토픽 불일치 stale 상태는 silently reset된다.
- 병렬 실행 없음 — Story는 반드시 순차 실행된다.
- 실패 Story 자동 재시도 없음 — 중단 후 사용자가 직접 수정하고 재실행해야 한다.
- 실패 시 건너뛰기 없음 — 실패한 Story를 무시하고 다음 Story로 넘어가지 않는다.
- `/dev:review` 자동 호출 없음 — 모든 Story 완료 후에도 수동 실행이다.
- 민감 파일 자동 제외 — `auto_commit=true`일 때도 `.env*`, `*.pem`, `*.key`, `credentials.json`이 스테이징 대상에 포함되면 commit을 중단한다.
- 플랜 파일 권위 — batch 실행 중 `implementation-plan.md`가 편집되면 plan 파일의 미완료 Story 목록을 `currentStory` 값보다 우선한다.
- git hooks 자동화 없음 (commit-msg·pre-push hook 미설치).
- hotfix/release 브랜치 미지원: `feature`·`fix`·`chore` 브랜치만.
- `prompt` 타입 반복 상한: 최대 5회 (PROPOSE→EVAL→REFINE). 초과 시 사용자 위임.
- `prompt` 타입 정체 감지: 연속 2회 pass_count 증가 없으면 즉시 중단 보고.
- `prompt` 타입 code-reviewer는 평가 대상 프롬프트 파일을 수정하지 않는다 (comment-only).
- simplify 스킬은 `tdd` 타입에만 적용. `config`·`infra`·`refactor`·`prompt` 타입은 제외.
- Task 도구 상태는 세션 단위. cross-session 복원은 지원하지 않는다. plan markdown 체크박스가 영속 단일 진실 원천이다.
- Step 9.5는 `[x]` 라인 entry의 상태를 `completed`로 정렬한다. 누락 entry를 재생성하지 않는다.
