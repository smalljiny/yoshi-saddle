---
version: 5
---
# Development Workflow

This rule extends the feature implementation workflow from git-workflow.md.

## Overall Flow

```
/dev:spec → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → /dev:done → PR
```

## Step-by-Step Rules

### 1. Write Spec (`/dev:spec`)

- Start a new topic with `/dev:spec <topic>` — no need to run `/dev:topic` first
- Load the brainstorming skill to write a spec draft collaboratively
- Save draft to `docs/_local/backlog/<topic>/spec.md`
- Run Codex review loop until READY: `codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"`
- Spec is confirmed when the latest `spec-review-*.md` has decision `READY` or `READY WITH NOTE`
- `/dev:spec` does **not** register topics in `dev-context.json` — registration happens at `/dev:plan`. It does write a temporary `current_spec` field (the spec path) after saving the draft, and removes it after spec confirmation. Codex uses this field to auto-discover the spec path without requiring an explicit argument.

### 2. Plan (`/dev:plan`)

- Run with a topic argument or select from backlog list:
  - `/dev:plan <topic>` — plan a specific backlog topic
  - `/dev:plan` — show backlog list and select
- Moves `backlog/<topic>/` → `active/<topic>/`
- Registers topic in `dev-context.json` and sets `current_topic`
- If `current_topic` is already set to another topic, prompts for confirmation before switching
- **planner** agent auto-activates with `docs/_local/active/<topic>/spec.md` as input
- Deliverable: `docs/_local/active/<topic>/implementation-plan.md`
- No implementation before plan is approved

### 3. Implement Tasks (`/dev:impl`)

Progress one task at a time in order:

1. **tdd-specialist** auto-called → RED-GREEN-REFACTOR cycle
2. Immediately after implementation, **code-reviewer** auto-called → instant feedback + fixes
3. Commit

### 4. Final Review (`/dev:review`)

After all tasks are complete:
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

After verify passes:
- Reads implemented harness files via `git diff` against the base branch (default: `develop`) and generates a reference document → `docs/specs/<confirmed-name>.md` (permanent)
- Archives `implementation-plan.md` to `docs/_local/done/<topic>/`; deletes `spec.md` and `spec-review-*.md` (planning artifacts)
- Removes topic from `dev-context.json`
- Switches `current_topic` to next active topic (or null if none remain)

## Topic Management

```
/dev:topic                   현재 active 토픽과 backlog 목록 확인
/dev:topic switch <name>     다른 active 토픽으로 전환 (backlog 토픽은 /dev:plan 필요)
```

Topic registration is handled by `/dev:plan`. Running `/dev:topic <name>` directly is deprecated.

## Document Lifecycle

```
스펙 초안  →  docs/_local/backlog/<topic>/spec.md      (git-ignored)
              spec-review-*.md 리뷰 파일도 이 위치에 저장
              dev-context.json에 current_spec 임시 기록 (Codex 경로 자동 해석용)
              스펙 확정(/dev:spec 확정 단계) 후 current_spec 제거

플랜 수립  →  docs/_local/active/<topic>/              (backlog/에서 이동)
              implementation-plan.md 생성
              dev-context.json에 토픽 등록 (current_spec 잔존 시 함께 제거)

구현 중    →  docs/_local/active/<topic>/              (git-ignored)

완료       →  docs/specs/<confirmed-name>.md            (git-tracked, 참조 문서 자동 생성)
              docs/_local/done/<topic>/                (git-ignored, implementation-plan.md만 보존)
              dev-context.json에서 토픽 제거
```
