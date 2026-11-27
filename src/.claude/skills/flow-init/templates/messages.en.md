## CLAUDE_BOUNDARY_Q

```text
The harness boundary line `@.harness/harness-guide.md` was not found in CLAUDE.md. How should this file be handled?
```

## CLAUDE_BOUNDARY_HEADER

```text
CLAUDE.md
```

## CLAUDE_BOUNDARY_BACKUP_LABEL

```text
Back up to {backup_path} and regenerate
```

## CLAUDE_BOUNDARY_BACKUP_DESC

```text
Back up the current file to {backup_path}, then write a new project section
```

## CLAUDE_BOUNDARY_ABORT_LABEL

```text
Abort
```

## CLAUDE_BOUNDARY_ABORT_DESC

```text
Read the file only and leave it unchanged
```

## AGENTS_BOUNDARY_Q

```text
The `<!-- harness-guide:begin -->` marker was not found in AGENTS.md. How should this file be handled?
```

## AGENTS_BOUNDARY_HEADER

```text
AGENTS.md
```

## AGENTS_BOUNDARY_BACKUP_LABEL

```text
Back up to {backup_path} and regenerate
```

## AGENTS_BOUNDARY_BACKUP_DESC

```text
Back up the current file to {backup_path}, then write a new project section
```

## AGENTS_BOUNDARY_ABORT_LABEL

```text
Abort
```

## AGENTS_BOUNDARY_ABORT_DESC

```text
Read the file only and leave it unchanged
```

## PROJECT_NAME_Q

```text
Choose the project name (a short name, e.g. `my-app`).
```

## PROJECT_NAME_HEADER

```text
Project name
```

## PROJECT_NAME_DIRNAME_LABEL

```text
Current directory name: {dirname}
```

## PROJECT_NAME_DIRNAME_DESC

```text
Use the current directory name
```

## PROJECT_NAME_CUSTOM_LABEL

```text
Enter manually
```

## PROJECT_NAME_CUSTOM_DESC

```text
Type a different name
```

## PROJECT_DESC_Q

```text
Choose the one-line description (the purpose of the project or repository).
```

## PROJECT_DESC_HEADER

```text
Description
```

## PROJECT_DESC_SUGGESTED_LABEL

```text
{value}
```

## PROJECT_DESC_SUGGESTED_DESC

```text
Existing value (update mode) or example
```

## PROJECT_DESC_CUSTOM_LABEL

```text
Enter manually
```

## PROJECT_DESC_CUSTOM_DESC

```text
Type a different description
```

## TECH_STACK_Q

```text
Choose the tech stack (core languages and frameworks, comma-separated).
```

## TECH_STACK_HEADER

```text
Tech stack
```

## TECH_STACK_SUGGESTED_LABEL

```text
{value}
```

## TECH_STACK_SUGGESTED_DESC

```text
Existing value (update mode) or example
```

## TECH_STACK_CUSTOM_LABEL

```text
Enter manually
```

## TECH_STACK_CUSTOM_DESC

```text
Type a different tech stack
```

## LANG_DOCS_Q

```text
Which language should documents (docs) use?
```

## LANG_DOCS_HEADER

```text
docs
```

## LANG_DOCS_KO_LABEL

```text
ko
```

## LANG_DOCS_KO_DESC

```text
Korean
```

## LANG_DOCS_EN_LABEL

```text
en
```

## LANG_DOCS_EN_DESC

```text
English
```

## LANG_COMMIT_Q

```text
Which language should commit messages (commit) use?
```

## LANG_COMMIT_HEADER

```text
commit
```

## LANG_COMMIT_KO_LABEL

```text
ko
```

## LANG_COMMIT_KO_DESC

```text
Korean
```

## LANG_COMMIT_EN_LABEL

```text
en
```

## LANG_COMMIT_EN_DESC

```text
English
```

## LANG_COMMENTS_Q

```text
Which language should code comments (comments) use?
```

## LANG_COMMENTS_HEADER

```text
comments
```

## LANG_COMMENTS_KO_LABEL

```text
ko
```

## LANG_COMMENTS_KO_DESC

```text
Korean
```

## LANG_COMMENTS_EN_LABEL

```text
en
```

## LANG_COMMENTS_EN_DESC

```text
English
```

## LANG_RECOMMEND_FAILED

```text
Could not compute the recommended value
```

## LANG_NOTE_MISSING

```text
No existing value
```

## LANG_NOTE_UNSUPPORTED

```text
Unsupported value `{value}`
```

## LANG_NOTE_DUPLICATE

```text
Duplicate value
```

## LANG_NOTE_LEGACY_CONFLICT

```text
Conflicts with legacy wording
```

## LANG_NOTE_DIFFERS

```text
Differs from the AGENTS.md value `{value}`
```

## LANG_MALFORMED_FILE

```text
Found a malformed language block in {file}; it will be regenerated
```

## GRAPHIFY_RESET_Q

```text
config.graphify.targets holds a non-array value. Reset it?
```

## GRAPHIFY_RESET_HEADER

```text
graphify
```

## GRAPHIFY_RESET_RESET_LABEL

```text
Reset
```

## GRAPHIFY_RESET_RESET_DESC

```text
Go to the recommendation step and set the value again
```

## GRAPHIFY_RESET_KEEP_LABEL

```text
Keep
```

## GRAPHIFY_RESET_KEEP_DESC

```text
Leave the value unchanged and finish with the detection-failed status
```

## GRAPHIFY_TARGETS_Q

```text
Set config.graphify.targets (the /graphify analysis directories)?
```

## GRAPHIFY_TARGETS_HEADER

```text
graphify
```

## GRAPHIFY_TARGETS_USE_LABEL

```text
Use the recommendation
```

## GRAPHIFY_TARGETS_USE_DESC

```text
Use the recommended candidates as they are: {targets}
```

## GRAPHIFY_TARGETS_SKIP_LABEL

```text
Skip
```

## GRAPHIFY_TARGETS_SKIP_DESC

```text
Keep the value unset; a later /graphify call reports a hard error
```

## HARNESS_REPO_DETECTED

```text
Detected a harness repository: set config.docs.sourceFilter to the harness default.
```

## GENERAL_REPO_DETECTED

```text
Detected a general project: set config.docs.sourceFilter to an empty array (no filter).
```

## RESULT_TITLE

```text
Done:
```

## STATUS_NEW

```text
[new]
```

## STATUS_UPDATED

```text
[updated]
```

## STATUS_UNCHANGED

```text
[unchanged]
```

## STATUS_ABORTED

```text
[aborted]
```

## WRITE_STOP_UNRECOGNIZED

```text
[write stopped: block not recognized]
```

## WRITE_STOP_CONFLICT

```text
[write stopped: marker conflict]
```

## WRITE_STOP_CHECK_FAILED

```text
[write stopped: check failed]
```

## WRITE_STOP_CHANGED

```text
[write stopped: file changed during the run]
```

## WRITE_STOP_RECHECK_FAILED

```text
[write stopped: recheck failed]
```

## WRITE_STOP_BACKUP_FAILED

```text
[write stopped: backup failed]
```

## DETECTED

```text
[detected]
```

## SOURCEFILTER_DETECTED

```text
[detected] config.docs.sourceFilter = {value}
```

## SOURCEFILTER_DETECTED_EMPTY

```text
[detected] config.docs.sourceFilter = [] (no filter)
```

## SOURCEFILTER_KEPT

```text
[kept] config.docs.sourceFilter existing value kept
```

## SOURCEFILTER_DETECT_FAILED

```text
[detection failed] config.docs.sourceFilter
```

## GRAPHIFY_DETECTED

```text
[detected] config.graphify.targets = {targets}
```

## GRAPHIFY_KEPT

```text
[kept] config.graphify.targets existing value kept
```

## GRAPHIFY_UNSET_KEPT

```text
[info] config.graphify.targets left unset
```

## GRAPHIFY_DETECT_FAILED

```text
[detection failed] config.graphify.targets
```

## RULES_ABSENT_SKIPPED

```text
[info] .harness/rules/ is absent, so rule imports were skipped
```

## RULES_ABSENT_EMPTY

```text
[info] .harness/rules/ is absent, so nothing was placed between the markers
```

## CAUSE_LINE

```text
Cause: {cause}
```

## CAUSE_MARKER_NOT_FOUND

```text
the generated language block markers were not found in the assembled file
```

## CAUSE_TEMP_FAILED

```text
temporary file preparation failed
```

## CAUSE_JSON_UNPARSABLE

```text
JSON could not be parsed
```

## FENCE_LINE

```text
{region}, code fence opened at line {open} of the assembled file (closing line: {close})
```

## FENCE_NO_CLOSE

```text
none
```

## FENCE_FIX

```text
Close that code fence (existing file or `harness-guide.md`) or remove it from your answer (Step 2 input), then run again
```

## MARKER_LINE

```text
{region}, line {line} of the assembled file: {marker}
```

## MARKER_FIX

```text
Delete that language block marker (existing file or `harness-guide.md`) or remove it from your answer (Step 2 input), then run again
```

## REGION_STEP2

```text
Step 2 input
```

## REGION_USER

```text
existing {file} user area
```

## REGION_GUIDE

```text
harness-guide.md body
```

## FIX_TEMPLATE

```text
Check the `/flow-init` skill template, then run again
```

## FIX_EXTERNAL

```text
Check the external changes, then run again
```

## FIX_PERMISSION

```text
Restore read permission, then run again
```

## FIX_BACKUP

```text
Check the backup path, then run again
```

## LANG_APPLIED_TITLE

```text
Applied languages:
```

## LANG_APPLIED_LINE

```text
  {key}: {value} (source={source}, reason={reason})
```

## LANG_APPLIED_FAILED

```text
  {key}: could not confirm the applied value
```

## LANG_JS_WARNING

```text
lang.js warning: {line}
```

## LANG_MISMATCH_WARNING

```text
Warning: {key}: `{value}` (source={source}) — {cause}
```

## LANG_CAUSE_NOT_UPDATED

```text
{source} was not updated, so the selected value `{selected}` was not applied
```

## LANG_CAUSE_OVERRIDDEN

```text
the value in {source} (reason={reason}) took precedence, so the selected value `{selected}` was not applied
```

## CONVERSATION_LANG_NOTE

```text
  Conversation language: follows the Claude Code `language` setting. The harness does not read managed settings or settings passed with the `--settings` argument.
```
