---
version: 2
---
# Development Workflow

This rule extends the feature implementation workflow from git-workflow.md.

## Overall Flow

```
/dev:spec → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → PR
```

## Step-by-Step Rules

### 1. Write Spec (`/dev:spec`)

- Start a new topic with `/dev:spec <topic>` — no need to run `/dev:topic` first
- Load the brainstorming skill to write a spec draft collaboratively
- Save draft to `docs/_local/tmp/<topic>/spec.md`
- Run Codex review loop until READY: `codex "spec-review 스킬로 spec.md를 리뷰해줘"`
- Confirm spec (`specConfirmed: true` in `dev-context.json`) before proceeding

### 2. Plan (`/dev:plan`)

- Requires `specConfirmed: true` — will not run without a confirmed spec
- **planner** agent auto-activates with the confirmed spec as input
- Deliverable: `implementation-plan.md` (task list only — spec is already confirmed)
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

Must pass before PR:
- `build` — build succeeds
- `type-check` — no type errors
- `lint` — lint passes
- `test` — tests pass (80%+ coverage)
- `security` — security scan passes

## Topic Management

```
/dev:topic                   현재 주제와 phase 확인
/dev:topic switch <name>     다른 주제로 전환
```

Topic registration is handled by `/dev:spec <topic>`. Running `/dev:topic <name>` directly is deprecated.

## Document Lifecycle

```
Spec draft   →  docs/_local/tmp/<topic>/spec.md    (git-ignored, stays here throughout)
After spec   →  specConfirmed: true in dev-context.json
             →  spec.md stays in tmp/ — /dev:plan reads its path from dev-context.json
Plan         →  docs/_local/<topic>/implementation-plan.md  (git-ignored)
After done   →  docs/specs/<topic>.md    (permanent reference doc)
             →  docs/_local/<topic>/ deleted
```
