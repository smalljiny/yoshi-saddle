---
version: 3
name: flow-checkpoint
description: Create or verify a named checkpoint during implementation. Records git state and test results for safe rollback reference.
origin: harness
user-invocable: true
---

# /flow-checkpoint

Save a named snapshot of the current state, or compare the current state against a previous checkpoint.

## Usage

```
/flow-checkpoint create <name>    Save current state as a checkpoint
/flow-checkpoint verify <name>    Compare current state to a checkpoint
/flow-checkpoint list             Show all checkpoints
/flow-checkpoint clear            Remove old checkpoints (keeps last 5)
```

## create

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-checkpoint/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-checkpoint/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and ask the question only if it passes. Before asking (for a mixed block, before its first line), run this Bash command with the IDs listed for that question (and the IDs of messages you will read to fill its placeholders):

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .claude/skills/flow-checkpoint/templates/messages.<lang>.md .claude/skills/flow-checkpoint/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. Check only the IDs you will actually display in the current branch, after computing what to display. If any cannot be obtained, do not ask the question or print any part of its block: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no commit, stash, or later steps after that point). Work already finished before the question stays as it is.

1. Validate `<name>`. The name must match `^[a-zA-Z0-9_-]+$`. On mismatch, output {{msg:INVALID_NAME}} and stop.

2. Run a quick quality check:

```bash
pnpm tsc --noEmit 2>&1 | head -5
pnpm test --run 2>&1 | tail -5
```

If checks fail, report the failure and ask whether to checkpoint anyway (free wording in the conversation language).

3. Record the checkpoint. `<name>` was validated in Step 1, so substitution is safe:

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | <name> | $(git rev-parse --short HEAD)" \
  >> .claude/checkpoints.log
```

4. Optionally stash or commit: call `AskUserQuestion` with {{ask:CHECKPOINT_SAVE|NONE|COMMIT|STASH}}. Answer-required IDs: `CHECKPOINT_SAVE_Q`, `CHECKPOINT_SAVE_HEADER`, and the `_LABEL`·`_DESC` of `NONE`, `COMMIT`, `STASH`. Apply the answer-required check; if it stops, do not commit or stash and do not run Step 5. The commit and stash message is `checkpoint: <name>` in every language:
   - `COMMIT`: stage only the files the user names. Do not run `git add -A` — `.env*`, `*.pem`, `*.key`, `credentials.json` 등 민감 파일 오포함을 차단한다 (`flow-impl` Step 8과 동일 규약). Pass the message via HEREDOC:
     ```bash
     git add <file1> <file2>
     git commit -m "$(cat <<'COMMIT_MSG'
     checkpoint: <name>
     COMMIT_MSG
     )"
     ```
   - `STASH`: `git stash push -m "checkpoint: <name>"` (이름 검증으로 safe)
   - `NONE`: log only (default)

5. Confirm: output {{msg:CREATED}} (`{name}`: the checkpoint name; `{sha}`, `{time}`: the SHA and time recorded in Step 3).

## verify

1. Read the target checkpoint from `.claude/checkpoints.log`
2. Compare current state to checkpoint SHA:

```bash
git diff <sha> --stat
```

3. Report, in this order: {{msg:COMPARISON_TITLE}} (`{name}`; `{recorded_time}`/`{recorded_sha}` from the log entry; `{current_time}`/`{current_sha}` now), a blank line, {{msg:FILES_CHANGED}} (`{count}`), then {{msg:FILE_LINE}} once per changed file (`{change}`: `modified`, `added`, `deleted`, or `renamed`; `{path}`), a blank line, and {{msg:CHECK_RESULTS}} (`{build}`, `{tests}`, `{coverage}`: the current results, with the change since the checkpoint where known).

## list

Read `.claude/checkpoints.log` and display {{msg:LIST_COLUMNS}}, then one row per log entry, oldest first: the row number, name, time, and SHA aligned under the header columns. Append two spaces and {{msg:LATEST_MARK}} to the newest row.

## clear

Keep the 5 most recent entries, remove the rest from `.claude/checkpoints.log`.

## Typical Workflow

```
/flow-impl Story 1  →  /flow-checkpoint create "S1-done"
/flow-impl Story 2  →  /flow-checkpoint create "S2-done"
/flow-impl Story 3  →  something breaks...
                  →  /flow-checkpoint verify "S2-done"   ← find what changed
                  →  git stash / git reset               ← restore if needed
```

## Notes

- `.claude/checkpoints.log` is gitignored — checkpoints are local only
- Use checkpoint names that describe the state, not the time (`"auth-complete"` not `"checkpoint-1"`)
- Pair with `/compact` — compact after a checkpoint to start the next phase with fresh context
