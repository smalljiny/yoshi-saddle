# Review Adversarial Workflow

> `/flow-review`가 code-reviewer, security-reviewer, adversarial-review 세 리뷰어를 순서에 따라 실행하고 결과를 `review-report-<timestamp>.md`로 저장하는 워크플로우.

## 개요

`/flow-review`는 구현 완료 후 PR 전 단계에서 실행한다. code-reviewer와 security-reviewer는 병렬로 실행되고, adversarial-review는 CRITICAL·HIGH 수정이 완료된 후 순차적으로 실행된다. 세 리뷰어의 결과와 처리 내역은 `docs/_local/active/<topic>/review-report-<YYMMDDHHmmss>.md`에 저장되며, `/flow-done` 아카이브 시 `done/<topic>/`으로 이동된다.

## 구조

### 관련 파일

| 파일 | 역할 |
|---|---|
| `.claude/skills/flow-review/SKILL.md` | `/flow-review` 실행 흐름 정의 |
| `.harness/contracts/review-report.md` | review-report 파일 포맷 계약 |
| `.claude/skills/flow-done/SKILL.md` | 아카이브 대상 목록에 `review-report-*.md` 포함 |

### review-report 파일

```
docs/_local/active/<topic>/review-report-<YYMMDDHHmmss>.md
```

타임스탬프 포맷은 `YYMMDDHHmmss` (sibling 계약 `spec-review`, `plan-review`와 동일). 파일은 git-ignored `docs/_local/` 하위에 저장된다.

## 동작

### `/flow-review` 실행 흐름

| Step | 내용 |
|---|---|
| 1 | Gate Check: `impl:in-progress` 상태 확인 |
| 2 | 모든 Story 완료 확인 (`currentStory=null`, 미체크 Story 헤더·nested Task 0건). `grep -nE "^### \[ \]|^- \[ \] T"` 로 두 조건을 동시 검사한다. |
| 3 | `review:in-progress` 전환 + `SAVED_SHA = git rev-parse HEAD` 캡처 |
| 4 | 변경 범위 식별 (`config.git.baseBranch`, `config.git.pullRemote`) |
| 5 | code-reviewer + security-reviewer **병렬** 실행 |
| 6 | 이슈 분류(CRITICAL/HIGH/MEDIUM/LOW) → CRITICAL·HIGH 수정 → review-fix commit |
| 7 | adversarial-review **순차** 실행 (활성화 조건 충족 시) |
| 8 | 처리 내역 산출 (`git log SAVED_SHA..HEAD`) |
| 9 | review-report 파일 저장 |
| 10 | Completion Report 출력 |

### adversarial-review 활성화 조건

아래 순서로 평가하며 첫 매치만 적용한다. 미정의/빈값은 `false`로 취급한다.

`config.codex.available`·`config.codex.authenticated` 값은 `codex-session-detection` 시스템이 세션 시작 시 캐싱한다. 캐시 스키마·TTL·갱신 방법은 `codex-session-detection.md` 참조.

| 조건 | skipReason | 경고 |
|---|---|---|
| `config.review.adversarial_enabled=false` 또는 미정의 | `disabled` | 없음 (정상 opt-out) |
| `config.codex.available=false` | `codex unavailable` | 출력 |
| `config.codex.authenticated=false` | `codex not authenticated` | 출력 |
| 모두 true → companion 경로 해결 실패 | `companion not found` | 출력 |
| 모두 true → companion 비-0 exit | `companion exited non-zero` | 출력 |

활성화 방법 (기본값 false, 명시적 opt-in 필요):
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.review.adversarial_enabled --value=true
```

### 처리 내역 산출

`SAVED_SHA`(Step 3 캡처)부터 현재 HEAD까지 신규 commit 존재 여부로 분류한다.

- **신규 commit 있음**: CRITICAL·HIGH → `fixed`, MEDIUM·LOW → `deferred`
- **신규 commit 없음**: 모든 이슈 → `deferred`

severity가 명시되지 않은 adversarial-review 이슈(설계 challenge 등)는 처리 내역 표에서 제외하고 `## Adversarial Review` 원문 섹션에 보존한다.

### review-report 포맷

`.harness/contracts/review-report.md`가 필수 구조를 정의한다.

```markdown
# Review Report
- topic / timestamp / baseBranch

## Reviewers
| reviewer | status | skipReason |

## Code Review      ← code-reviewer 원문
## Security Review  ← security-reviewer 원문
## Adversarial Review  ← companion stdout 또는 "skipped: <skipReason>"

## 처리 내역
| issue (80자 이내) | severity | reviewer | status |
```

## 제약사항

- adversarial-review 결과를 CRITICAL/HIGH/MEDIUM으로 재분류하지 않는다 — 원문 그대로 보존
- review-report를 `docs/specs/`(git-tracked)에 저장하지 않는다 — 민감한 이슈 내용 노출 방지
- `/flow-review` 자동 재실행 루프 없음 — 사용자가 직접 재실행
- `/codex:adversarial-review` 신규 명령 없음 — 플러그인 기존 companion 재사용
- `config.review.adversarial_enabled=false` opt-out 시 경고 없음
