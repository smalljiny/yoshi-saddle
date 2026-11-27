---
version: 3
name: flow-docs
description: Reconcile spec with implementation, update existing docs/specs/ files (or create new ones), and commit. Run before /flow-pr.
origin: harness
user-invocable: true
---

# /flow-docs

Reconcile the topic spec with actual implementation, update existing `docs/specs/` files that were affected, and commit all changes in a single commit. Run before `/flow-pr`.

## Usage

```
/flow-docs    Run for the current topic
```

Always operates on `current_topic`.

## Execution Flow

### 1. Read current topic and gate check

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-docs/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-docs/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and print the question only if it passes. Before printing the question (for a mixed block, before its first line), run this Bash command with the IDs listed for that question (and the IDs of messages you will read to fill its placeholders):

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .claude/skills/flow-docs/templates/messages.<lang>.md .claude/skills/flow-docs/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. Check only the IDs you will actually display in the current branch, after computing the items to display. If any cannot be obtained, do not print the question or any part of its block: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no file writes, state transitions, commits, or delegations after that point). Writes already finished before the question stay as they are.

```bash
node .harness/scripts/dev-context.js read --field=current_topic
```

If `current_topic` is empty, output {{msg:NO_TOPIC}} and stop.

Read `phase` and `status`:

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

Determine the entry mode based on `phase:status`:

| `phase:status` | Mode |
|---|---|
| `review:in-progress` | First-run |
| `docs:generated` | Re-entry (re-run entire flow) |
| anything else | Stop |

**Re-entry** (`docs:generated`): ask {{msg:REENTRY_CONFIRM}} as a plain-text question. Answer-required ID: `REENTRY_CONFIRM`. Apply the answer-required check; if it stops, do not continue to Step 2 or any later step.
- `n`: stop
- `y`: proceed (will create a new commit — amend is forbidden)

### 2. Check /flow-verify status

Look for evidence that `/flow-verify` has recently passed (e.g., a recent passing run in the session context).
If no passing verification is found, ask {{msg:VERIFY_NOT_PASSED}} as a plain-text question. Answer-required ID: `VERIFY_NOT_PASSED`. Apply the answer-required check; if it stops, do not continue to Step 3 or any later step.
- `n`: stop
- `y`: continue

### 3. Collect changed files (git diff)

Read git config:
```bash
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
```

Use defaults if not set: `baseBranch=main`, `pullRemote=origin`.

Read the source filter configuration:
```bash
node .harness/scripts/dev-context.js read --field=config.docs.sourceFilter
```
Parse the output as a line-by-line list of path prefixes: split by `\n`, filter out empty strings. Store as `sourceFilter`. If no non-empty lines remain, `sourceFilter` is an empty list (no filter).

> **Migration note**: If `config.docs.sourceFilter` has never been set (e.g., upgrading from a version without this feature), the result is an empty `sourceFilter` and all changed files are included. For harness repositories, run `/flow-init` once to auto-configure the correct filter.

**sourceFilter application rule** (used at both filter points below):
- If `sourceFilter` is empty: include all files (no filtering).
- If `sourceFilter` is non-empty: keep only files whose path starts with at least one of the listed prefixes.

Collect changed files from all three sources and deduplicate:

1. `git diff <pullRemote>/<baseBranch>...HEAD --name-only` — committed changes
2. `git diff --name-only` — unstaged working tree changes
3. `git diff --cached --name-only` — staged changes

Merge the three lists and remove duplicates. Apply the **sourceFilter application rule**.

**If all three sources are empty**: ask {{msg:BASE_BRANCH_PROMPT}} as a plain-text question. `{base_branch}` is the `baseBranch` value used above. Answer-required ID: `BASE_BRANCH_PROMPT`. Apply the answer-required check; if it stops, do not re-run the diff sources.
Validate the user-provided branch name against `^[a-zA-Z0-9][a-zA-Z0-9_/.-]*$` before using it (leading `-` is rejected to prevent option injection). If invalid, re-prompt with the same question. Then verify the branch exists (`git rev-parse --verify -- <branch>`); if not found, show an error and stop. Then re-run the three diff sources with this branch as base and re-apply the **sourceFilter application rule**.

**If no files found after filtering**:

- If `sourceFilter` was empty (no filter applied): ask {{msg:NO_CHANGED_FILES}} as a plain-text question. Answer-required ID: `NO_CHANGED_FILES`.
- If `sourceFilter` was non-empty (filter applied): ask {{msg:NO_CHANGED_FILES_FILTERED}} as a plain-text question. Answer-required ID: `NO_CHANGED_FILES_FILTERED`.
- Apply the answer-required check to the question you ask; if it stops, do not continue to Step 4.
- `n`: stop
- `y`: proceed to Step 4 with an empty change set

### 4. Spec reconciliation

Read `docs/_local/active/<topic>/spec.md`. Compare its contents against the collected changed files to identify discrepancies — things implemented but not described in the spec, or spec items that were not implemented.

**If discrepancies found**: first classify each discrepancy — decide which items would alter implementation goals (goal-change items). Then present the list: output {{msg:DISCREPANCY_TITLE}}, then one line per discrepancy — two spaces, `- `, and a short description of the item in the conversation language; append two spaces and {{msg:GOAL_CHANGE_MARK}} to each goal-change item.

If any item is a goal-change item, output {{msg:GOAL_CHANGE_STOP}} and stop immediately without showing the approval prompt.

If no goal-level changes exist, ask {{msg:SPEC_APPLY_CONFIRM}} as a plain-text question. Answer-required ID: `SPEC_APPLY_CONFIRM`. Apply the answer-required check; if it stops, do not write `spec.md` and do not continue to Step 5.
- `y`: apply all listed discrepancies to `spec.md` and save. Note: corrections only (typos, missing details, wording) do not require re-running `specReview`, `planReview`, or `implementation-plan.md`.
- `n`: skip spec update and proceed to Step 5

**If no discrepancies**: output {{msg:NO_DISCREPANCY}} and proceed to Step 5 automatically.

### 5. Identify docs/specs/ files to update

Analyze the collected changed files and the (updated) spec to infer which existing `docs/specs/` files need updating. Present candidates with brief reasoning as one block, in this order:

1. {{msg:CANDIDATES_TITLE}} (decoration part).
2. One line per candidate (target part), numbered from 1: {{msg:CANDIDATE_ITEM}} for an existing file, or {{msg:CANDIDATE_NEW_ITEM}} for a file that must be newly created. `{number}` is the candidate number, `{path}` is the existing `docs/specs/` path, `{name}` is the proposed new file name, and `{reason}` is a brief reason in the conversation language.
3. {{msg:CANDIDATES_APPROVE}} (question part).

Answer-required IDs: `CANDIDATE_ITEM` (when an existing-file candidate is shown), `CANDIDATE_NEW_ITEM` (when a new-file candidate is shown), and `CANDIDATES_APPROVE`. Apply the answer-required check before printing the block, and include `CANDIDATES_TITLE` in the same `grep`: if any answer-required ID is absent from both catalog files, print only the diagnostics — none of the block, not even the decoration line or a question of your own — and do not run Step 6. `CANDIDATES_TITLE` is decoration: if it alone is absent, print `[missing message: CANDIDATES_TITLE]` as the first line of the block and print the rest normally.

Interpret the reply by its first token:

- `y`: proceed with the proposed list
- `- <번호>`: remove that candidate and re-confirm
- `+ <경로>`: add a file and re-confirm
- `edit`: user provides a new list from scratch, then re-confirm

Re-confirm by showing the block again.

**If zero existing-file candidates** (all content is new): use the same new-file flow as below.

**If new file creation is needed** (no existing file covers the content): for each new file, sequentially propose a filename with {{msg:NEW_FILE_NAME_PROPOSE}} as a plain-text question. `{suggested_name}` is the proposed file name without `.md`. Answer-required ID: `NEW_FILE_NAME_PROPOSE`. Apply the answer-required check; if it stops, do not create the file and do not run Step 6.
Validate against `^[a-zA-Z0-9_-]+\.md$` — if invalid, re-prompt.
If `docs/specs/<name>.md` already exists, ask {{msg:FILE_EXISTS_OVERWRITE}} as a plain-text question. `{name}` is the chosen file name without `.md`. Answer-required ID: `FILE_EXISTS_OVERWRITE`. Apply the answer-required check; if it stops, do not overwrite or write any `docs/specs/` file and do not run Step 6.
- `y`: overwrite
- Other input: use new name (re-validate)

### 6. Update each file

Write document bodies in the docs language: run `node .harness/scripts/lang.js resolve --kind=docs` once before the first file; if it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`. Section titles stay in English as written in the template below.

For each file in the approved list, apply the following heuristic in order:

**Partial update** (apply when ALL of the following hold):
- Affected headings are 1–2 or fewer
- The existing document's section structure (heading hierarchy) is preserved
- Changes are confined to specific sections

**Full rewrite** (apply when ANY of the following holds):
- The target heading cannot be found in the existing document — switch to full rewrite immediately, **no fuzzy matching**
- Half or more of the document's headings are affected
- The section structure itself must change

Full rewrite format (present tense, no migration guides, change history, Open Questions, or Before/After comparisons):

```markdown
# <System Subject Name>

> <One-line summary>

## Overview
[What the system is and what role it plays]

## Structure / Schema
[Current directory structure, data formats, etc.]

## Behavior
[How commands, skills, and rules work]

## Constraints
[Current constraints]
```

For full rewrites where the scope is large, invoke the `doc-updater` agent (reads spec, plan, and `git diff`) to produce the initial draft instead of drafting directly. Immediately before the delegation, run:

```bash
node .harness/scripts/lang.js resolve --kind=conversation
node .harness/scripts/lang.js resolve --kind=docs
node .harness/scripts/lang.js resolve --kind=commit
```

Judge each dimension separately: if a resolve exits non-zero or its stdout is not exactly `ko` or `en`, use `en` for that dimension. Put `Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>` as the first line of the delegation prompt.

### 7. Select representative document and record refDoc

After all files are updated or created, select the representative document for `refDoc`:

- **1 file updated/created**: select it automatically without prompting.
- **2 or more files**: count every file written or created in Step 6; when the count is 2 or more, always ask — do not pick the document yourself, even when one file looks like the obvious choice. Call `AskUserQuestion` with {{ask:REP_DOC|*}}, one option per updated/created file. Each option's label is the file path and its description is the same file path. The first option carries the ` (Recommended)` marker — assign it to a newly created file if one exists, otherwise to the file with the largest diff size; the other options follow. Answer-required IDs: `REP_DOC_Q`, `REP_DOC_HEADER`. Apply the answer-required check; if it stops, do not record `refDoc`, do not commit, and do not change state. Files already written in Step 6 stay as they are.

Record the selected path:
```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=refDoc \
  --value=docs/specs/<selected>.md
```

Output {{msg:REP_DOC_SELECTED}}. `{selected}` is the selected file name without `.md`.

### 8. Commit

Stage all updated and newly created `docs/specs/` files. Do **not** stage `spec.md` (it lives in `docs/_local/` which is git-ignored).

```bash
git add docs/specs/<file1>.md docs/specs/<file2>.md ...
```

Determine commit message from these English templates:
- **First-run** (`review:in-progress`): `docs: add <representative-name> reference`
- **Re-entry** (`docs:generated`): `docs: update <representative-name> reference`

Run `node .harness/scripts/lang.js resolve --kind=commit`; if it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`. Keep the `docs:` prefix, and write the description after it in that language with the template's meaning.

**amend is forbidden** — always create a new commit. Use HEREDOC to avoid shell metacharacter injection:

```bash
git commit -m "$(cat <<'COMMIT_MSG'
docs: add <representative-name> reference
COMMIT_MSG
)"
```

**Failure behavior**: If `git add` or `git commit` fails, do not transition state. Show the error and stop. The skill is re-entrant safe — run `/flow-docs` again after resolving the issue.

### 9. Update state

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=docs --status=generated
```

Output {{msg:DOCS_COMPLETE}}. `{files}` is the updated and created `docs/specs/` paths joined with `, `, and `{representative_name}` is the representative file name without `.md`.

## Key Principles

- **Gate: review:in-progress** — `/flow-docs` only proceeds when `phase=review && status=in-progress` (or re-entry from `docs:generated`)
- **Spec reconciliation first** — update `spec.md` before touching `docs/specs/`, so the corrected spec drives the document update
- **Existing files first** — update existing `docs/specs/` files before creating new ones; create new files only when no existing file covers the content
- **Partial update preferred** — use section-level edits when 1–2 headings are affected and structure is preserved; full rewrite otherwise
- **No fuzzy matching** — if a target heading is not found exactly, switch to full rewrite immediately
- **Single commit** — all `docs/specs/` changes in one atomic commit; `spec.md` is git-ignored and never committed here
- **Goal-change aborts** — if spec reconciliation would alter implementation goals, stop immediately and redirect to `/flow-plan` or `/flow-review`
- **refDoc is a single path** — always one representative document; `/flow-pr` contract requires a single path
- **amend forbidden** — re-entry creates a new commit, never amends
- **Failure is safe** — state does not transition on error; re-run after fixing
- **diff base from config** — uses `config.git.pullRemote`/`config.git.baseBranch` (defaults: `origin`/`main`)
- **sourceFilter from config** — file filter is externalized to `config.docs.sourceFilter`; unset or empty array means no filter (full diff used); both are treated identically

## Next Steps

After `/flow-docs` completes (`docs:generated`): run `/flow-pr` to push and open the PR.
