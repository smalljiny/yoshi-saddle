## BATCH_RESUME_Q

```text
A previous batch for `{topic}` did not finish. What should this invocation do?
```

## BATCH_RESUME_HEADER

```text
Batch state
```

## BATCH_RESUME_RESUME_LABEL

```text
Resume
```

## BATCH_RESUME_RESUME_DESC

```text
Continue the previous batch (`{topic}`)
```

## BATCH_RESUME_RESET_LABEL

```text
Reset
```

## BATCH_RESUME_RESET_DESC

```text
Clear the persisted batch state and run only a single Story in this invocation
```

## GATE_FAILED

```text
Cannot start implementation.
Current state: {phase}:{status}
The topic must be in plan:confirmed or impl:in-progress.
codex "run the plan-review skill"
```

## STATE_TRANSITION_FAILED

```text
Phase transition failed (update-state exited non-zero).
Check dev-context.json permissions or disk state, then try again.
```

## STORY_START

```text
--- Starting Story {story_id}: {story_name} ---
```

## BRIEFING_TITLE

```text
## Pre-work Briefing: {story_id} {story_name}
```

## BRIEFING_OVERVIEW

```text
### Story Overview
- Type: {type}
- Goal: {goal}
```

## BRIEFING_PLAN_TITLE

```text
### Work Plan
```

## BRIEFING_FILES_TITLE

```text
### Affected Files
```

## BRIEFING_NEW_MARK

```text
[NEW]
```

## BRIEFING_CAVEATS_TITLE

```text
### Caveats
```

## AUTO_START_NOTICE

```text
auto_start mode: starting implementation without approval. (config.dev_impl.auto_start=true)
```

## BATCH_REASON_TEST_FAILURE

```text
test failure
```

## BATCH_REASON_REVIEW_ISSUE

```text
blocking review issue
```

## BATCH_REASON_CRITERIA

```text
completion criteria not met
```

## BATCH_REASON_COMMIT_REFUSED

```text
commit refused by user
```

## BATCH_REASON_NO_COMMIT_FIELD

```text
user declined to skip commit (no **Commit** field)
```

## BATCH_REASON_UNCHECKED_TASKS

```text
user-declared unchecked tasks (real non-execution)
```

## CRITERIA_TITLE

```text
## Completion Criteria check results
```

## CRITERION_PASS

```text
[PASS] {criterion} — {evidence}
```

## CRITERION_FAIL

```text
[FAIL] {criterion} — {evidence}
```

## NO_COMMIT_FIELD

```text
This Story has no **Commit** field. Skip the commit? (y/skip)
```

## AUTO_COMMIT_DONE

```text
auto_commit: {commit_message}
```

## COMMIT_CONFIRM_TITLE

```text
Commit message for this Story:
```

## COMMIT_CONFIRM_SUBJECT

```text
  {commit_subject}
```

## COMMIT_CONFIRM_BODY

```text
  {commit_body}
```

## COMMIT_CONFIRM_FILES

```text
Files to stage: {files}
```

## COMMIT_CONFIRM_Q

```text
Commit now? (y/n/skip)
```

## UNCHECKED_TASKS_Q

```text
{count} unchecked Task(s) remain. What is the reason?
```

## UNCHECKED_TASKS_HEADER

```text
Task gate
```

## UNCHECKED_TASKS_REPORT_MISSING_LABEL

```text
Report missing
```

## UNCHECKED_TASKS_REPORT_MISSING_DESC

```text
The Task was done but the TaskUpdate(completed) call was missed
```

## UNCHECKED_TASKS_NOT_DONE_LABEL

```text
Not done
```

## UNCHECKED_TASKS_NOT_DONE_DESC

```text
The Task really was not done, or the Story definition is flawed
```

## UNCHECKED_STOP

```text
Unchecked Tasks remain. Re-run the Story or fix the plan, then try again.
  /flow-impl {story_id}
```

## STORY_COMPLETE_TITLE

```text
## Story Complete: {story_id} {story_name}
```

## WORK_SUMMARY_TITLE

```text
### Work Summary
```

## TEST_RESULTS

```text
### Test Results
- Tests: PASS ({passed} passed)
- Coverage: {coverage}%
```

## NEXT_STORY

```text
### Next Story
- {next_story}
- Continue with /flow-impl.
```

## BATCH_COMPLETE_TITLE

```text
## Batch Complete
```

## BATCH_COMPLETE_COUNT

```text
Completed {count} Stories:
```

## BATCH_STORY_LINE

```text
  [x] Story {story_number}: {story_name}
```

## BATCH_COMPLETE_NEXT

```text
Next: /flow-review
```

## BATCH_STOPPED_TITLE

```text
## Batch Stopped at Story {story_id}: {story_name}
```

## BATCH_STOPPED_REASON

```text
Reason: {reason}
```

## BATCH_STOPPED_DONE

```text
Completed before stopping:
```

## BATCH_STOPPED_RESUME

```text
Resume after fixing the issue:
  /flow-impl          Resume from the failed Story
  /flow-impl --all    Re-run batch from the failed Story
```
