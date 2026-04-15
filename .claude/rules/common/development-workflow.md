---
version: 1
---
# Development Workflow

This rule extends the feature implementation workflow from git-workflow.md.

## Overall Flow

```
/dev:topic → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → PR
```

## Step-by-Step Rules

### 1. Start Topic (`/dev:topic`)

- Clearly define the work topic and record it in `docs/_local/dev-context.json`
- Create a `docs/_local/<topic>/` directory (store spec.md, implementation-plan.md)

### 2. Plan (`/dev:plan`)

- **planner** agent auto-activates
- Deliverables: `spec.md` (requirements + design), `implementation-plan.md` (task list)
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

## Document Lifecycle

```
In progress  →  docs/_local/<topic>/     (git-ignored)
After done   →  docs/specs/<topic>.md    (permanent reference doc)
             →  docs/_local/<topic>/ deleted
```
