## SPEC_NOT_CONFIRMED

```text
Worktree work starts after the spec is confirmed.
Current state: {phase}:{status}
Confirm the spec with /flow-spec first.
```

## SAME_SURFACE

```text
The target surface is the current session. Choose another surface or omit --surface.
```

## READY

```text
Worktree ready: {wt}
  Branch: feature/{topic} (base {branch})
  Session started: {target}

Run this topic's /flow-impl, /flow-review, and the rest only in that worktree session.
Running them in the main hub breaks dev-context isolation.

When finished: /flow-worktree teardown {topic}
```

## READY_MANUAL

```text
Worktree ready: {wt}
cmux is not available, so open the session yourself. In the target terminal:
  cd {wt} && claude
```

## WT_MISSING

```text
No worktree: {wt} (already removed, or the topic name is wrong)
```

## NOT_DONE_YET

```text
/flow-done has not run yet (no done archive).
Removing the worktree would lose its active artifacts.
Finish /flow-pr → /flow-done in the worktree session first,
or add --force to discard them.
```

## NOT_MERGED_WARN

```text
Warning: feature/{topic} is not merged into develop yet.
The worktree is removed but the branch is kept (docs/specs and code exist only on the branch).
After the PR is merged, delete it separately with git branch -d feature/{topic}.
```

## TEARDOWN_DONE

```text
teardown complete: {topic}
  Docs sync-back: docs/_local/done/{topic}/ → main
  Originals: docs/_local/{backlog,active}/{topic} {originals}
  docs/specs and code: moved through the PR merge (branch merge state: {merge_state})
  Worktree removed: {wt}
  Branch feature/{topic}: {branch_state}
  main dev-context: topic removal {context_state}
```

## ORIGINALS_PURGED

```text
purged
```

## ORIGINALS_KEPT

```text
kept (--keep-original)
```

## MERGE_MERGED

```text
merged
```

## MERGE_NOT_MERGED

```text
not merged
```

## BRANCH_DELETED

```text
deleted
```

## BRANCH_KEPT

```text
kept
```

## CONTEXT_REMOVED

```text
done
```

## CONTEXT_NOT_APPLICABLE

```text
not applicable
```
