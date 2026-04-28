# /dev:impl 워크플로우

> Task 단위 실행·커밋 계약과 `--all` 배치 모드. 단일 Task 완료 후 커밋하는 기본 흐름과, 전체 Task를 자동 순차 실행하는 배치 흐름을 다룬다.

## 개요

기본적으로 `/dev:impl`은 Task 하나를 실행하고 멈춘다. 각 Task는 에이전트 호출 → code-reviewer → commit의 세 단계를 밟는다. Task 타입에 따라 호출되는 에이전트가 다르다.

배치 모드(`--all` 또는 `config.dev_impl.batch_mode=true`)를 활성화하면 미완료 Task 전체를 순차 자동 실행한다.

## 구조 (커밋 규칙 파일)

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
    └── implementation-plan.md  # Task Commit 섹션 포맷 정의
```

### implementation-plan.md Task 포맷 (Commit 섹션)

```markdown
### [ ] Task N: <title>
- **Type**: tdd | config | infra | refactor | prompt
- **Goal**: ...
- **Work Items**: ...
- **Completion Criteria**: ...
- **Commit**: `<type>(<scope>): <subject>`
```

`prompt` 타입은 Completion Criteria에 Eval Cases와 Acceptance를 포함한다 (형식은 아래 Eval Case 스키마 참조).

## 기본 실행 흐름 (단일 Task)

각 Task는 다음 순서로 실행된다:

1. Pre-work 브리핑 출력 및 승인 대기 (배치 모드 두 번째 Task 이후는 한 줄 헤더로 대체)
2. `impl:in-progress` 전환 (첫 번째 Task에서만)
3. **에이전트 호출** — Task 타입별 분기:

   | Type | 에이전트 | 동작 |
   |------|---------|------|
   | `tdd` | tdd-specialist | RED → GREEN → REFACTOR 사이클 |
   | `prompt` | prompt-engineer | PROPOSE → EVAL → REFINE 사이클 (`wf-prompt-eval` 스킬 사용, 최대 5회) |
   | `refactor` | refactor-cleaner | 기존 테스트 커버리지 확인 후 구조적 개선 |
   | `config` | (직접 처리) | 설정 파일 변경 및 검증 |
   | `infra` | (직접 처리) | 인프라 변경 및 문서화 |

4. **code-reviewer 호출** (에이전트 완료 직후)
   - 모든 타입에 적용
   - `prompt` 타입은 comment-only: 평가 대상 프롬프트 파일을 직접 수정하지 않는다. 수정이 필요하면 prompt-engineer를 재호출해 eval 게이트를 다시 통과해야 한다.
5. **simplify 스킬 후속 호출** (`tdd` 타입 전용)
   - code-reviewer 완료 직후 `simplify` 스킬을 로드해 코드 재사용·효율성·품질을 재검토한다.
   - `config`·`infra`·`refactor`·`prompt` 타입은 적용하지 않는다. `prompt`는 REFINE 사이클이 품질 개선을 담당한다.
6. Completion Criteria 검증
7. commit 실행 (`**Commit**` 필드 기준)
8. 플랜 체크박스 업데이트 (`[ ]` → `[x]`)
9. `dev-context.json` currentTask 갱신

### prompt 타입 상세

`prompt-engineer` 에이전트는 다음 입력을 받아 PROPOSE→EVAL→REFINE 사이클을 실행한다:
- Goal, Eval Cases (Completion Criteria에서 파싱), Acceptance 임계값, 대상 파일 경로

에이전트는 최대 5회 반복하며, 연속 2회 pass_count(통과 Eval 개수) 증가 없음이 감지되면 정체로 판단해 즉시 보고한다. 5회 이내에 Acceptance 미달 시 실패 패턴 요약과 현재 최선 초안을 제시하고 사용자 판단에 위임한다.

### Eval Case 스키마

`prompt` 타입 Task의 Completion Criteria에 기재하는 평가 케이스 형식. planner·plan-review·prompt-engineer가 공유하는 계약이다.

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

plan-review 스킬이 `prompt` 타입 Task를 검증할 때 적용하는 규칙:

| 검증 항목 | 미충족 시 결정 |
|----------|-------------|
| Eval Case 최소 2개 이상 | NOTE |
| 각 Eval에 Input 필드 존재 | NOT READY |
| `direct` Eval에 Expected 필드 존재 | NOT READY |
| `rubric` Eval에 Criteria + Rubric + Pass 필드 존재 | NOT READY |
| `judge` Eval에 Expected + Pass 필드 존재 | NOT READY |
| `Acceptance: N/M` 형식 명시 | NOTE |
| N ≤ M 이고 N ≥ 1 | NOT READY |

## 커밋 계약

### Task 커밋 실행

1. plan의 `**Commit**` 필드에서 메시지 추출
2. `config.dev_impl.auto_commit` 읽기:
   - `true`: 자동 실행 (`git add <task-files> && git commit` HEREDOC)
   - `false`(기본): 사용자에게 y/n/skip 프롬프트
3. `git add -A` 금지 — Task에서 변경된 파일만 명시적으로 stage
4. amend 금지 — 항상 새 commit
5. `**Commit**` 필드 없으면 skip/continue 프롬프트

### review-fix 커밋 (`/dev:review` Step 6.1)

- `/dev:review`에서 CRITICAL/HIGH 이슈 수정 시 별도 commit 생성
- 권장 메시지: `fix: review feedback` (강제 아님)
- amend 금지, plan Commit 필드 불변 유지

이슈 분류(CRITICAL/HIGH/MEDIUM), adversarial-review 후 처리는 `review-adversarial-workflow.md` 참조.

### 커밋 메시지 형식

```
<type>(<scope>): <subject>   (subject 72자 이내)

[optional body]
```

- type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- scope: `.harness/commit-scopes.md`에 정의된 값 권장 (자유 허용, warning 수준 검증)
- plan-review: Commit 섹션의 type/scope/subject를 warning 수준으로 검증

### 공유 규칙 위치

- `.harness/rules/` — Claude Code + Codex 공유 (coding-style, git-workflow, testing, security, typescript)
- `.claude/rules/common/` — Claude Code 운영 규칙만 (agents, performance, development-workflow, component-boundaries)
- `.harness/commit-scopes.md` — 프로젝트별 scope 목록. 다른 프로젝트 복사 시 이 파일만 교체.

### PR 병합 단위 체크 (`/dev:spec` + `.harness/contracts/spec.md`)

스펙 작성 중 다음 기준으로 단일 PR 적합성을 검증한다 (전체 기준은 `.harness/contracts/spec.md` 참조):

- 독립 배포 가능 (다른 PR 없이 merge 가능)
- 독립 롤백 가능 (revert 시 다른 기능이 깨지지 않음)
- 3개 이상의 독립 목표 → 분할 권장

## 배치 모드

### 활성화 방법

| 방법 | 설명 |
|------|------|
| `/dev:impl --all` | 해당 호출에 한해 배치 모드 진입 |
| `config.dev_impl.batch_mode=true` | 항상 배치 모드로 동작 |

명시적 Task 인수(예: `/dev:impl T2`)가 있으면 `batch_mode` 설정과 무관하게 단일 Task만 실행한다.

### 진입 판단

```bash
node .harness/scripts/dev-context.js read --field=config.dev_impl.batch_mode
```

### 배치 상태 영속화

서브 에이전트 완료 후 세션 메모리의 `batch` 변수가 소실되어도 배치 루프가 지속되도록 `dev-context.json`에 배치 상태를 저장한다.

**저장 필드 (`config.dev_impl`)**:

| 필드 | 값 | 설명 |
|------|-----|------|
| `currentBatchRunning` | `true`/`false` | 배치 진행 중 여부 |
| `currentBatchTopic` | `<topic>` / `false` | 배치가 시작된 토픽 (topic-scoped) |

**Step 1 lifecycle**:
- `batch=true` 진입 시: 두 필드를 즉시 저장 (현재 토픽 포함)
- `batch=false` + 명시적 Task 인자: stale 감지 건너뜀 (explicit-Task-wins)
- `batch=false` + 일반 호출: `currentBatchRunning` 읽기 → `"true"`이면
  - 토픽 불일치 → silently reset 두 필드 → 단일 Task 진행
  - 토픽 일치 → `AskUserQuestion` (재개 / 초기화) 표시

**Step 11 cleanup**: 모든 terminal exit(단일 Task 완료·배치 완료·배치 중단) 직전에 두 필드를 `false`로 초기화한다.

### 루프 구조

1. 첫 번째 Task: 전체 Pre-work Briefing 출력 → 승인 대기 (또는 `auto_start=true` 시 자동 진행)
2. 두 번째 Task 이후: 한 줄 헤더만 출력하고 즉시 실행
   ```
   --- Starting Task <ID>: <Name> ---
   ```
3. 각 Task 완료 후 Step 10.5(Batch Loop Decision)에서 다음 미완료 Task 유무를 확인:
   - `batch == true` OR (`currentBatchRunning == "true"` AND 토픽 일치 AND 명시적 Task 인자 없음) → 배치 계속
   - 남은 Task 있음 → Step 2로 돌아가 다음 Task 실행
   - 없음 → Batch Complete 보고 후 종료

### 실패 시 즉시 중단

| # | 조건 | 단계 |
|---|------|------|
| 1 | 에이전트가 해결 불가능한 실패 보고 (tdd-specialist / prompt-engineer / refactor-cleaner) | Step 5 |
| 2 | code-reviewer blocking 이슈 자동 수정 불가 | Step 6 |
| 3 | Completion Criteria 검증 실패 | Step 7 |
| 4 | 사용자가 commit 거부 (`n`) | Step 8 |
| 5 | `**Commit**` 필드 없는 Task에서 사용자가 skip 거부 | Step 8 |

### 종료 메시지

**정상 완료**:
```
---
## Batch Complete

Completed [N] Tasks:
  [x] Task 1: <name>
  [x] Task 2: <name>
  ...

Next: /dev:review
---
```

**실패로 중단**:
```
---
## Batch Stopped at Task [ID]: [Name]

Reason: <batch_failed reason>

Completed before stopping:
  [x] Task <n>: <name>  (if any)

Resume after fixing the issue:
  /dev:impl          Resume from the failed Task
  /dev:impl --all    Re-run batch from the failed Task
---
```

### 완전 자동화 조합

`batch_mode`, `auto_start`, `auto_commit`을 모두 활성화하면 첫 번째 Task 승인 이후 모든 인간 게이트가 제거된다. 신뢰할 수 있는 환경에서만 사용한다.

```bash
# dev-context.json config.dev_impl 예시
{
  "batch_mode": true,
  "auto_start": true,
  "auto_commit": true
}
```

## 제약사항

- `git add -A` 금지. Task 변경 파일만 명시적 stage.
- amend 금지. 항상 새 commit 생성.
- 명시적 Task 인수는 `batch_mode`를 무효화하며 stale 감지를 건너뛴다 (explicit-Task-wins).
- 배치 상태(`currentBatchRunning`·`currentBatchTopic`)는 topic-scoped. 토픽 불일치 stale 상태는 silently reset된다.
- 병렬 실행 없음 — Task는 반드시 순차 실행된다.
- 실패 Task 자동 재시도 없음 — 중단 후 사용자가 직접 수정하고 재실행해야 한다.
- 실패 시 건너뛰기 없음 — 실패한 Task를 무시하고 다음 Task로 넘어가지 않는다.
- `/dev:review` 자동 호출 없음 — 모든 Task 완료 후에도 수동 실행이다.
- 민감 파일 자동 제외 — `auto_commit=true`일 때도 `.env*`, `*.pem`, `*.key`, `credentials.json`이 스테이징 대상에 포함되면 commit을 중단한다.
- 플랜 파일 권위 — batch 실행 중 `implementation-plan.md`가 편집되면 plan 파일의 미완료 Task 목록을 `currentTask` 값보다 우선한다.
- git hooks 자동화 없음 (commit-msg·pre-push hook 미설치).
- hotfix/release 브랜치 미지원: `feature`·`fix`·`chore` 브랜치만.
- `prompt` 타입 반복 상한: 최대 5회 (PROPOSE→EVAL→REFINE). 초과 시 사용자 위임.
- `prompt` 타입 정체 감지: 연속 2회 pass_count 증가 없으면 즉시 중단 보고.
- `prompt` 타입 code-reviewer는 평가 대상 프롬프트 파일을 수정하지 않는다 (comment-only).
- simplify 스킬은 `tdd` 타입에만 적용. `config`·`infra`·`refactor`·`prompt` 타입은 제외.
