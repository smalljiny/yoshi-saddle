---
version: 7
---
# Development Workflow

This rule extends the feature implementation workflow from git-workflow.md.

## Overall Flow

```
/dev:spec → /dev:plan → (plan-review) → /dev:impl (repeat) → /dev:review → /dev:verify → /dev:done → PR
```

## Step-by-Step Rules

### 1. Write Spec (`/dev:spec`)

- Start a new topic with `/dev:spec <topic>`
- Load the brainstorming skill to write a spec draft collaboratively
- Save draft to `docs/_local/backlog/<topic>/spec.md`
- **Register topic** in `dev-context.json` at `spec:drafting` immediately after saving
- Transition to `spec:reviewing` before invoking Codex review
- Run Codex review loop until READY: `codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"`
- NOT READY → rollback to `spec:drafting`, fix and re-review
- Spec is confirmed (`spec:confirmed`) when the latest `spec-review-*.md` has decision `READY` or `READY WITH NOTE`

### 2. Plan (`/dev:plan`)

- **Gate**: topic must be `spec:confirmed` — checked via `dev-context.js read --field=phase/status`
- Run with a topic argument or select from backlog list
- Moves `backlog/<topic>/` → `active/<topic>/`, updates paths in `dev-context.json`
- **planner** agent auto-activates with `docs/_local/active/<topic>/spec.md` as input
- Deliverable: `docs/_local/active/<topic>/implementation-plan.md`
- After planner completes: transition to `plan:ready`, then `plan:reviewing`
- Run Codex plan-review: `codex "plan-review 스킬을 실행해줘"`
- NOT READY → `plan:ready`, re-plan; READY → `plan:confirmed` (set by Codex plan-review)

### 3. Implement Tasks (`/dev:impl`)

- **Gate**: topic must be `plan:confirmed` — blocks if not met, shows plan-review command
- Progress one task at a time in order
- First Task: transitions to `impl:in-progress`
- 1. **tdd-specialist** auto-called → RED-GREEN-REFACTOR cycle
- 2. Immediately after implementation, **code-reviewer** auto-called → instant feedback + fixes
- 3. Commit

### 4. Final Review (`/dev:review`)

- **Gate**: topic must be `impl:in-progress` — blocks if not met
- Transitions to `review:in-progress` on start
- **code-reviewer** + **security-reviewer** run in parallel
- Quality review of full change scope

### 5. Verify (`/dev:verify`)

Must pass before completing:
- `build` — build succeeds
- `type-check` — no type errors
- `lint` — lint passes
- `test` — tests pass (80%+ coverage)
- `security` — security scan passes

### 6. Done (`/dev:done`)

- **Gate**: topic must be `review:in-progress` — blocks if not met
- Reads implemented harness files via `git diff` against `develop` (includes `.harness/`) and generates a reference document → `docs/specs/<confirmed-name>.md` (permanent)
- Moves **all** artifacts to `docs/_local/done/<topic>/` — no deletions: spec.md, spec-review-*.md, plan-review-*.md, implementation-plan.md
- Removes topic from `dev-context.json` via `remove-topic`
- Switches `current_topic` to next active topic (or null if none remain)

## Topic Management

```
/dev:topic                   현재 active 토픽과 backlog 목록 확인
/dev:topic switch <name>     다른 active 토픽으로 전환 (backlog 토픽은 /dev:plan 필요)
```

Topic registration happens at `/dev:spec` (not `/dev:plan`). Running `/dev:topic <name>` directly is deprecated.

## Document Lifecycle

```
스펙 초안  →  docs/_local/backlog/<topic>/spec.md        (git-ignored)
              dev-context.json: phase=spec, status=drafting
              /dev:spec 리뷰 루프 → status=reviewing → confirmed

플랜 수립  →  docs/_local/active/<topic>/                (backlog/에서 이동)
              implementation-plan.md 생성
              dev-context.json: phase=plan, status=ready → reviewing → confirmed (Codex plan-review)

구현 중    →  docs/_local/active/<topic>/                (git-ignored)
              dev-context.json: phase=impl, status=in-progress

리뷰       →  dev-context.json: phase=review, status=in-progress

완료       →  docs/specs/<confirmed-name>.md             (git-tracked, 참조 문서 자동 생성)
              docs/_local/done/<topic>/                  (git-ignored, 모든 산출물 보존)
              dev-context.json에서 토픽 제거
```

## Shell Portability

macOS의 기본 셸은 **zsh**이며, bash 전용 구문은 스킬·커맨드 파일에서 에러를 유발한다.
Claude Code Bash 도구도 zsh로 실행된다.

**금지 구문:**

| 구문 | 이유 |
|------|------|
| `declare -A` (associative array) | zsh 미지원 |
| `declare -a` (indexed array) | 사용 가능하나 `typeset -a`가 portable |
| `mapfile` / `readarray` | bash 전용 builtin |

**대안:**

- 연상 배열 → 명시적 변수 (`KEY1=val1; KEY2=val2`) 또는 Node.js 스크립트 위임
- 배열 반복 → POSIX `for` 루프 + 명시적 변수 나열
- 여러 파일 복사 → 명시적 `cp` 명령어 나열

**사전 점검:** 스킬·커맨드 파일 추가·수정 시 아래 명령으로 잔존 여부 확인 권장:
```bash
grep -rnE 'declare\s+-[aA]|mapfile|readarray' .claude .harness
```

현재 코드베이스 grep 결과: 0건 (2026-04-21 기준).

## State Transition Summary

| State | Trigger |
|-------|---------|
| `spec:drafting` | `/dev:spec` registers topic |
| `spec:reviewing` | `/dev:spec` before Codex review |
| `spec:confirmed` | `/dev:spec` after READY decision |
| `plan:ready` | `/dev:plan` after planner |
| `plan:reviewing` | `/dev:plan` before Codex plan-review |
| `plan:confirmed` | Codex plan-review READY |
| `impl:in-progress` | `/dev:impl` first Task |
| `review:in-progress` | `/dev:review` on start |
