---
version: 3
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
- `/dev:spec` does **not** write to `dev-context.json` — registration happens at `/dev:plan`

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
- Copies `docs/_local/active/<topic>/spec.md` → `docs/specs/<topic>.md` (permanent)
- Moves `docs/_local/active/<topic>/` → `docs/_local/done/<topic>/`
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

플랜 수립  →  docs/_local/active/<topic>/              (backlog/에서 이동)
              implementation-plan.md 생성
              dev-context.json에 토픽 등록

구현 중    →  docs/_local/active/<topic>/              (git-ignored)

완료       →  docs/specs/<topic>.md                    (git-tracked, 영구 참조)
              docs/_local/done/<topic>/                (git-ignored, 로컬 아카이브)
              dev-context.json에서 토픽 제거
```
