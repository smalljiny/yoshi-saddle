## USAGE_SUBCOMMAND

```text
Supported subcommand: git
Usage: /flow-setup git
```

## NO_ORIGIN

```text
There is no origin remote. Add it first with git remote add origin <url>.
```

## FORK_DETECTED

```text
Remote detection: fork pattern (upstream reachable)
  pushRemote  = origin   (push feature branches to the fork)
  pullRemote  = upstream (PR diffs are based on the original repo — if this heuristic is wrong, change it in Step 8)
```

## UPSTREAM_UNREACHABLE

```text
⚠ The upstream remote exists but cannot be reached. Falling back to the non-fork pattern.
  Check the cause, then run /flow-setup git again.
```

## SINGLE_REMOTE

```text
Remote detection: single remote pattern
  pushRemote  = origin
  pullRemote  = origin
```

## BASE_CHECK_FAILED

```text
  ⚠ Could not verify {pull_remote}/{base_branch}. Proposing main as the default. You can change it in Step 8.
```

## UNSET_VALUE

```text
(unset)
```

## CURRENT_TITLE

```text
Saved config.git values:
```

## CURRENT_VALUES

```text
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}
```

## OVERWRITE_Q

```text
Overwrite them? (y/n)
```

## DETECTED_CONFIRM

```text
Detected git settings:
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}

Save these values? (y/n, or enter field=value to edit)
```

## UNKNOWN_FIELD

```text
Unknown field. Allowed fields: pushRemote, pullRemote, baseBranch, branchPattern
```

## SAVED

```text
Saved:
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}

/flow-pr, /flow-docs, and /flow-review now use these values.
```
