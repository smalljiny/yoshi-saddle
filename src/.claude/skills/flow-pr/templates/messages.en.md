## NO_TOPIC

```text
There is no topic to create a PR for.
```

## REENTRY_CONFIRM

```text
A PR has already been created (pr:created).
Update the PR title and body? (y/n)
```

## GATE_FAILED

```text
Cannot run /flow-pr.
Current state: {phase}:{status}
The topic must be in docs:generated.
Run /flow-docs first.
```

## DIRTY_TREE

```text
⚠ There are uncommitted changes.
Check git status, commit every change, then run again.

If deleted files are unstaged:
  1. List the deleted files with git status
  2. Stage the deletion with git rm <path>  or  git add -u
  3. git commit -m "chore: remove {file_name}"
  4. Run /flow-pr again

(Deletions of uncommitted files that existed before the session are handled the same way.)
```

## BRANCH_PATTERN_CONFIRM

```text
⚠ The current branch '{branch}' does not match the allowed pattern '{pattern}'.
Continue? (y/n)
```

## TITLE_CONFIRM

```text
PR title draft:
  {draft_title}

Proceed with this title? (y/enter a new title)
```

## BODY_CONFIRM

```text
PR body draft (shown below):
---
{body}
---

Proceed with this body? (y/enter changes, or 'edit' to edit it directly)
```

## PR_CREATED

```text
The PR has been created: {pr_url}
```

## PR_DONE

```text
Done.
  PR:     {pr_url}
  Status: pr:created

Next: when the PR is merged, archive it with /flow-done.
If the PR needs changes, run /flow-pr again (return to docs:generated, then push again).
```
