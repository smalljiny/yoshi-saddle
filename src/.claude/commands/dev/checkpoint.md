---
version: 2
description: Create or verify a named checkpoint during implementation. Records git state and test results for safe rollback reference.
category: dev-workflow
---

# /dev:checkpoint

Save a named snapshot of the current state, or compare the current state against a previous checkpoint.

## Usage

```
/dev:checkpoint create <name>    Save current state as a checkpoint
/dev:checkpoint verify <name>    Compare current state to a checkpoint
/dev:checkpoint list             Show all checkpoints
/dev:checkpoint clear            Remove old checkpoints (keeps last 5)
```

## create

1. Run a quick quality check:

```bash
pnpm tsc --noEmit 2>&1 | head -5
pnpm test --run 2>&1 | tail -5
```

If checks fail, report the failure and ask whether to checkpoint anyway.

2. Record the checkpoint:

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | <name> | $(git rev-parse --short HEAD)" \
  >> .claude/checkpoints.log
```

3. Optionally stash or commit (ask the user):
   - **Commit**: `git add -A && git commit -m "checkpoint: <name>"`
   - **Stash**: `git stash push -m "checkpoint: <name>"`
   - **None**: log only (default)

4. Confirm:

```
✅ Checkpoint created: <name>
   SHA:  a1b2c3d
   Time: 2026-04-15T10:30:00Z
   Log:  .claude/checkpoints.log
```

## verify

1. Read the target checkpoint from `.claude/checkpoints.log`
2. Compare current state to checkpoint SHA:

```bash
git diff <sha> --stat
```

3. Report:

```
CHECKPOINT COMPARISON: <name>
════════════════════════════════
Recorded: 2026-04-15T10:30:00Z  (SHA: a1b2c3d)
Current:  2026-04-15T11:45:00Z  (SHA: f4e5d6c)

Files changed: 4
  modified: src/auth/middleware.ts
  modified: src/auth/middleware.test.ts
  added:    src/auth/types.ts
  modified: CLAUDE.md

Build:    PASS
Tests:    +8 passed, 0 failed
Coverage: 84%  (+3% since checkpoint)
```

## list

Read `.claude/checkpoints.log` and display:

```
#  Name             Time                  SHA      
─────────────────────────────────────────────────
1  feature-start    2026-04-15T09:00:00Z  d3c2b1a  
2  T1-done          2026-04-15T10:00:00Z  a1b2c3d  ← latest
```

## clear

Keep the 5 most recent entries, remove the rest from `.claude/checkpoints.log`.

## Typical Workflow

```
/dev:impl Task 1  →  /dev:checkpoint create "T1-done"
/dev:impl Task 2  →  /dev:checkpoint create "T2-done"
/dev:impl Task 3  →  something breaks...
                  →  /dev:checkpoint verify "T2-done"   ← find what changed
                  →  git stash / git reset               ← restore if needed
```

## Notes

- `.claude/checkpoints.log` is gitignored — checkpoints are local only
- Use checkpoint names that describe the state, not the time (`"auth-complete"` not `"checkpoint-1"`)
- Pair with `/compact` — compact after a checkpoint to start the next phase with fresh context
