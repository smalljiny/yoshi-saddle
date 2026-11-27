## INVALID_NAME

```text
Checkpoint names may contain only letters, digits, `_`, and `-`.
```

## CHECKPOINT_SAVE_Q

```text
Also save the current changes with this checkpoint?
```

## CHECKPOINT_SAVE_HEADER

```text
Checkpoint
```

## CHECKPOINT_SAVE_NONE_LABEL

```text
None
```

## CHECKPOINT_SAVE_NONE_DESC

```text
Record the checkpoint in the log only
```

## CHECKPOINT_SAVE_COMMIT_LABEL

```text
Commit
```

## CHECKPOINT_SAVE_COMMIT_DESC

```text
Commit the files you name with the message "checkpoint: <name>"
```

## CHECKPOINT_SAVE_STASH_LABEL

```text
Stash
```

## CHECKPOINT_SAVE_STASH_DESC

```text
Stash the changes with the message "checkpoint: <name>"
```

## CREATED

```text
✅ Checkpoint created: {name}
   SHA:  {sha}
   Time: {time}
   Log:  .claude/checkpoints.log
```

## COMPARISON_TITLE

```text
CHECKPOINT COMPARISON: {name}
════════════════════════════════
Recorded: {recorded_time}  (SHA: {recorded_sha})
Current:  {current_time}  (SHA: {current_sha})
```

## FILES_CHANGED

```text
Files changed: {count}
```

## FILE_LINE

```text
  {change}: {path}
```

## CHECK_RESULTS

```text
Build:    {build}
Tests:    {tests}
Coverage: {coverage}
```

## LIST_COLUMNS

```text
#  Name             Time                  SHA
─────────────────────────────────────────────────
```

## LATEST_MARK

```text
← latest
```
