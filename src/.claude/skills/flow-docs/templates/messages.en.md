## NO_TOPIC

```text
There is no topic to generate a reference document for.
```

## REENTRY_CONFIRM

```text
The topic is already in docs:generated state. Run again? (y/n)
```

## VERIFY_NOT_PASSED

```text
⚠ /flow-verify has not passed. Continue? (y/n)
```

## BASE_BRANCH_PROMPT

```text
The git diff result is empty.
Enter the base branch (default: {base_branch}):
```

## NO_CHANGED_FILES

```text
⚠ No changed files.
Continue? (y/n)
```

## NO_CHANGED_FILES_FILTERED

```text
⚠ No changed files (sourceFilter applied).
Continue? (y/n)
```

## DISCREPANCY_TITLE

```text
Spec-implementation discrepancies:
```

## GOAL_CHANGE_MARK

```text
⚠ implementation goal change
```

## GOAL_CHANGE_STOP

```text
⚠ The spec change alters the implementation goals.
Stopping /flow-docs. Review again starting from /flow-plan or /flow-review.
```

## SPEC_APPLY_CONFIRM

```text
Apply these to spec.md? (y/n)
```

## NO_DISCREPANCY

```text
No spec-implementation discrepancies.
```

## CANDIDATES_TITLE

```text
Update candidates:
```

## CANDIDATE_ITEM

```text
  {number}. {path} — {reason}
```

## CANDIDATE_NEW_ITEM

```text
  {number}. (new file needed) {name} — {reason}
```

## CANDIDATES_APPROVE

```text
Approve?
  y          : proceed with the list above
  - <number> : remove that candidate (e.g. `- 2`)
  + <path>   : add a candidate (e.g. `+ docs/specs/qux.md`)
  edit       : re-enter the whole list
```

## NEW_FILE_NAME_PROPOSE

```text
Proposed new file name: {suggested_name}.md
Save with this name? (y/enter another name)
```

## FILE_EXISTS_OVERWRITE

```text
docs/specs/{name}.md already exists.
Overwrite it? (y/enter another name)
```

## REP_DOC_Q

```text
Which document should be recorded as the representative document (refDoc)?
```

## REP_DOC_HEADER

```text
Ref doc
```

## REP_DOC_SELECTED

```text
Representative document: docs/specs/{selected}.md
```

## DOCS_COMPLETE

```text
Done.
  Updated files:  {files}
  Representative: docs/specs/{representative_name}.md
  Status:         docs:generated

Next: create the PR with /flow-pr.
```
