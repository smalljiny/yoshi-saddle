---
version: 3
name: flow-setup
description: Configure project-level settings in dev-context.json. Subcommand `git` auto-detects git remotes and saves config.git.* fields used by /flow-pr, /flow-docs, and /flow-review.
origin: harness
user-invocable: true
---

# /flow-setup

Configure project-level settings in `dev-context.json`.

## Usage

```
/flow-setup git    Detect git remotes and save config.git.* fields
```

Running `/flow-setup` without a subcommand, or with an unrecognized subcommand, shows {{msg:USAGE_SUBCOMMAND}}.

## Execution Flow

### 1. Subcommand dispatch

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-setup/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-setup/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and ask the question only if it passes. Before asking (for a mixed block, before its first line), run this Bash command with the IDs listed for that question (and the IDs of messages you will read to fill its placeholders):

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .claude/skills/flow-setup/templates/messages.<lang>.md .claude/skills/flow-setup/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. Check only the IDs you will actually display in the current branch, after computing what to display. If any cannot be obtained, do not ask the question or print any part of its block: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no `set-field` calls or later steps after that point). Work already finished before the question stays as it is.

Read `$ARGUMENTS`. If the value is not `git`, print the supported-subcommand message and stop. No side effects.

If `$ARGUMENTS == "git"`, continue to Step 2.

### 2. Detect remotes

```bash
git remote -v
```

Parse the unique remote names from the output. If `origin` is not present, output {{msg:NO_ORIGIN}} and stop.

### 3. Classify pattern and propose values

**Fork pattern** — `upstream` remote exists alongside `origin`:

First verify that `upstream` is reachable:
```bash
git ls-remote --heads upstream 2>/dev/null
```
If the command exits 0 (reachable), propose: output {{msg:FORK_DETECTED}}.
If `upstream` exists but is unreachable, warn and downgrade to Non-fork: output {{msg:UPSTREAM_UNREACHABLE}}.

**Non-fork pattern** — only `origin` (or `upstream` unreachable): output {{msg:SINGLE_REMOTE}}.

### 4. Detect baseBranch (best-effort)

```bash
# Try cached ref first (no network)
git symbolic-ref refs/remotes/<pullRemote>/HEAD 2>/dev/null | sed 's|.*/||'
```

If the cached ref is present, use it. Otherwise try the network (may be slow on poor connections):
```bash
LC_ALL=C git remote show <pullRemote> 2>/dev/null | grep "HEAD branch" | sed 's/.*HEAD branch: //'
```

If either command succeeds and returns a non-empty value, use it as the proposed `baseBranch`. Otherwise propose `main`.

### 5. Propose branchPattern

Use `^(feature|fix|chore)/` as the default — same value used by `/flow-pr` when `config.git.branchPattern` is not set.

### 6. Validate detected values

Before presenting to the user, validate each value:

**Remote names** (`pushRemote`, `pullRemote`):
- Must match `^[a-zA-Z0-9_.-]+$` and must not start with `-`
- Must be reachable: `git remote get-url <remote>` must exit 0

**Branch name** (`baseBranch`):
- Must match `^[a-zA-Z0-9][a-zA-Z0-9_/.-]*$` (leading `-` rejected)
- Must NOT contain `..` (path traversal) — reject before any git command
- Must exist on the remote: `git rev-parse --verify -- refs/remotes/<pullRemote>/<baseBranch>` must exit 0
- If the ref is not cached locally, fetch first:
  ```bash
  git fetch <pullRemote> <baseBranch> --no-tags 2>/dev/null
  ```
  If fetch fails (e.g. network unavailable), warn and fall back to `main` with a note: output {{msg:BASE_CHECK_FAILED}} (`{pull_remote}`, `{base_branch}`: the values checked).

**branchPattern** (regex string):
- Must not be empty
- Must NOT be exactly `true`, `false`, or a bare integer string — these would be coerced to boolean/number by `set-field` (via `dev-context.js coerceConfigValue`)
- Must be a valid regular expression. Claude validates this internally without shell interpolation: attempt `new RegExp(<branchPattern>)` as a JS expression. If it throws, show the error and stop without calling `set-field`. Do NOT use shell commands to validate regex — avoids shell metacharacter injection from user-provided pattern values.
- Note: ReDoS-vulnerable patterns (e.g. `^(a+)+$`) pass syntactic validation. Document scope is branch-name patterns — guide users toward simple anchored patterns like `^(feature|fix|chore)/`.

If any validation fails, show the invalid value and expected format, then stop without calling `set-field`.

### 7. Check existing config

Read the current values:
```bash
node .harness/scripts/dev-context.js read --field=config.git.pushRemote
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --field=config.git.branchPattern
```

When reading each field, an empty line from `dev-context.js read` (trimmed to `""`) means the field is unset — render it as {{msg:UNSET_VALUE}}. "All four are empty" means all four reads returned empty strings.

If any of the four values is non-empty, show the current block: {{msg:CURRENT_TITLE}} (decoration part), then {{msg:CURRENT_VALUES}} (target part; `{push_remote}`, `{pull_remote}`, `{base_branch}`, `{branch_pattern}` are the saved values, each unset one shown as the `UNSET_VALUE` message), a blank line, and {{msg:OVERWRITE_Q}} (question part). Answer-required IDs: `CURRENT_VALUES`, `OVERWRITE_Q`, and `UNSET_VALUE` when at least one field is unset. Apply the answer-required check before printing the block: if any is absent from both catalog files, print only the diagnostics — none of the block, not even the title or a question of your own — and do not change `config.git` or continue to Step 8. `CURRENT_TITLE` is decoration: if it alone is absent, print `[missing message: CURRENT_TITLE]` as the first line and print the rest normally.
- `n`: stop without changes
- `y`: continue to Step 8

If all four are empty, skip this step and go directly to Step 8.

### 8. Present and confirm

Show the proposed values and ask for confirmation with {{msg:DETECTED_CONFIRM}} as a plain-text question (`{push_remote}`, `{pull_remote}`, `{base_branch}`, `{branch_pattern}`: the proposed values). Answer-required ID: `DETECTED_CONFIRM`. Apply the answer-required check; if it stops, do not save any `config.git` value.

- `y`: save all four values (proceed to Step 9)
- `n`: stop without changes
- `<field>=<value>` input: update that field in the proposed set, re-validate, re-display. Repeat until `y` or `n`.

**Field edit parsing rules**:
- Allowed field names (whitelist): `pushRemote`, `pullRemote`, `baseBranch`, `branchPattern`
- Parse on the **first `=`** only — everything after the first `=` is the value. This handles `branchPattern=^(feature|fix)/` correctly (value contains `=` and `(`)
- Example: `branchPattern=^(feature|fix|chore)/` → field=`branchPattern`, value=`^(feature|fix|chore)/`
- Unknown field name (not in whitelist): output {{msg:UNKNOWN_FIELD}} and re-prompt with the same question
- Re-validate the updated value using the same rules from Step 6 before accepting. If validation fails, keep the previous proposed value unchanged and re-prompt

### 9. Save to dev-context.json

```bash
node .harness/scripts/dev-context.js set-field --field=config.git.pushRemote   --value='<pushRemote>'
node .harness/scripts/dev-context.js set-field --field=config.git.pullRemote   --value='<pullRemote>'
node .harness/scripts/dev-context.js set-field --field=config.git.baseBranch   --value='<baseBranch>'
node .harness/scripts/dev-context.js set-field --field=config.git.branchPattern --value='<branchPattern>'
```

No `--topic` flag — these are global project settings.

If any `set-field` call fails, show the error and stop. The fields saved before the failure remain in dev-context.json; run `/flow-setup git` again to complete or correct all four fields.

### 10. Confirm saved values

Read back and display the saved values so the user can verify:
```bash
node .harness/scripts/dev-context.js read --field=config.git.pushRemote
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --field=config.git.branchPattern
```

Output {{msg:SAVED}} (`{push_remote}`, `{pull_remote}`, `{base_branch}`, `{branch_pattern}`: the values read back).

## Key Principles

- **Validation before save** — remote names and branch name are validated before any `set-field` call; never write an invalid value
- **Explicit confirmation required** — the user must type `y` before values are saved
- **Overwrite protection** — if existing values are present, the user is shown them and must confirm before overwriting
- **No SessionStart automation** — `/flow-setup git` must be run explicitly; no hook auto-detection
- **Global config** — `set-field` calls use no `--topic` flag; these values are project-wide
- **Fork detection heuristic** — presence of `upstream` remote is the sole fork signal; other remote names are ignored
