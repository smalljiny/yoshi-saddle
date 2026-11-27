---
version: 2
name: flow-pr
description: Push the current branch and create a GitHub Pull Request. Publish-only — run after /flow-docs so the reference document is included.
origin: harness
user-invocable: true
---

# /flow-pr

Push the current branch to the remote and create a GitHub Pull Request using the topic's spec and plan as context. This skill is **publish-only** — it performs no local file changes. All local work (including the reference document) must be committed before running this skill.

## Usage

```
/flow-pr    Push and open a PR for the current topic
```

Always operates on `current_topic`.

## Execution Flow

### 1. Read current topic and gate check

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-pr/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-pr/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and ask the question only if it passes. Before asking, run this Bash command with the IDs listed for that question (and the IDs of messages you will read to fill its placeholders):

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .claude/skills/flow-pr/templates/messages.<lang>.md .claude/skills/flow-pr/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. If any cannot be obtained, do not ask the question: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no push, `gh pr create`/`gh pr edit`, or state transition after that point). Work already finished before the question stays as it is.

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
| `docs:generated` | First-run (create PR) |
| `pr:created` | Re-entry (update PR via `gh pr edit`) |
| anything else | Stop |

**Re-entry** (pr:created): before proceeding, ask {{msg:REENTRY_CONFIRM}} as a plain-text question. Answer-required ID: `REENTRY_CONFIRM`. Apply the answer-required check; if it stops, do not continue to Step 2 or any later step.
- `n`: stop
- `y`: proceed to Step 3 in update mode

**Stop** (any other state): output {{msg:GATE_FAILED}} (`{phase}`, `{status}`: the values read above).

### 2. Gate: working tree clean and branch check

Check working tree:
```bash
git status --porcelain
```
If output is non-empty, output {{msg:DIRTY_TREE}} and stop. `{file_name}` is the name of a deleted file shown by `git status` when there is one; otherwise `<file>`.

Read branch name:
```bash
git rev-parse --abbrev-ref HEAD
```

Read `config.git.branchPattern` (default: `^(feature|fix|chore)/`):
```bash
node .harness/scripts/dev-context.js read --field=config.git.branchPattern
```

If the current branch does not match the pattern, ask {{msg:BRANCH_PATTERN_CONFIRM}} as a plain-text question (`{branch}`: the current branch; `{pattern}`: the pattern). Answer-required ID: `BRANCH_PATTERN_CONFIRM`. Apply the answer-required check; if it stops, do not continue to Step 3 or any later step.
- `n`: stop
- `y`: continue

### 3. Read config

```bash
node .harness/scripts/dev-context.js read --field=config.git.pushRemote
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --topic=<topic> --field=baseBranch
```

Defaults:
- `pushRemote`: `origin`
- `pullRemote`: `origin`
- `baseBranch`: `main` (topic-level override takes precedence if set)

**Validate config-derived values before use**:
- Remote names (`pushRemote`, `pullRemote`): must match `^[a-zA-Z0-9_.-]+$` and must not start with `-`. Verify existence with `git remote get-url <remote>`; stop with an error if not found.
- Branch names (`baseBranch`, topic-level `baseBranch`): must match `^[a-zA-Z0-9][a-zA-Z0-9_/.-]*$` (leading `-` rejected). Verify with `git rev-parse --verify -- <branch>` before use in diff or PR creation commands.
- If any validation fails, stop immediately and show the invalid value and expected format.

### 4. Draft PR title

Read the implementation plan to extract Story Commit fields:
```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=plan
```

From the plan's Story blocks, extract all `**Commit**:` values. Parse `type` and `scope` from each. Find the most frequent `type` and `scope`.

Draft the PR title from the English template below. Keep the `<type>(<scope>):` prefix and write the description in the commit language: run `node .harness/scripts/lang.js resolve --kind=commit` (if it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`).
```
<most-frequent-type>(<most-frequent-scope>): <topic-name-as-description>
```

If no Commit fields are found in the plan (pre-contract plans), use:
```
feat(<topic>): <topic-name-as-description>
```

Present the draft and ask for confirmation with {{msg:TITLE_CONFIRM}} as a plain-text question (`{draft_title}`: the drafted title). Answer-required ID: `TITLE_CONFIRM`. Apply the answer-required check; if it stops, do not draft the body, push the branch, run `gh pr create`/`gh pr edit`, or change state.
- `y`: use draft
- Other input: use the entered title

Validate the confirmed title against Conventional Commits format:
`^(feat|fix|docs|refactor|test|chore|perf|ci)(\([a-z0-9_,.-]+\))?: .{1,72}$`
If invalid, warn and ask the same question again.

### 5. Draft PR body

Load `.harness/templates/pr-body.md` and substitute placeholders. Section titles stay as the template defines them; write any free text you add to the body in the docs language (`node .harness/scripts/lang.js resolve --kind=docs`; if it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`):

| Placeholder | Value |
|---|---|
| `{{topic}}` | current topic name |
| `{{spec_link}}` | `topics[topic].spec` from dev-context.json |
| `{{reference_doc}}` | read from `topics[topic].refDoc` in dev-context.json (set by `/flow-docs` on save). If absent, fall back to `git log --diff-filter=AM -- docs/specs/ -1 --name-only` and validate the result matches `^docs/specs/[a-zA-Z0-9_-]+\.md$` before use. |
| `{{branch}}` | current branch |
| `{{base_branch}}` | resolved `baseBranch` |

Present the body and ask for confirmation with {{msg:BODY_CONFIRM}} as a plain-text question (`{body}`: the drafted body). Answer-required ID: `BODY_CONFIRM`. Apply the answer-required check; if it stops, do not push the branch, run `gh pr create`/`gh pr edit`, or change state.
- `y`: use draft
- `edit`: open the draft in the user's editor or present a structured edit prompt
- Other input: append the input as additional context to the body

### 6. Push branch (first-run only)

**Skip this step entirely in re-entry (`pr:created`) mode.** In re-entry mode, jump directly to Step 7 to update the PR title/body via `gh pr edit`. Any new local commits must be published by returning to `docs:generated` state first:
```bash
node .harness/scripts/dev-context.js update-state --topic=<topic> --phase=docs --status=generated
```
Then re-run `/flow-docs` and `/flow-pr` in sequence.

**First-run only** (`docs:generated` mode):
```bash
git push -u <pushRemote> <branch>
```

**Failure handling**:
- If push fails due to authentication: show `gh auth status` output and stop. Do not transition state.
- If push fails for other reasons: show the error, suggest `git pull --rebase` if behind, and stop. Do not transition state.

### 7. Create or update PR

To extract `<pullRemote-owner>/<repo>`: run `git remote get-url <pullRemote>` and parse the GitHub path from the URL (supports HTTPS and SSH formats). Validate the extracted path against `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`.

**First run** (`docs:generated` mode) — use HEREDOC to avoid shell metacharacter injection:
```bash
gh pr create \
  --repo <pullRemote-owner>/<repo> \
  --base <baseBranch> \
  --title "<confirmed-title>" \
  --body "$(cat <<'PR_BODY'
<confirmed-body>
PR_BODY
)"
```

**Re-entry** (`pr:created` mode):
```bash
gh pr edit \
  --title "<confirmed-title>" \
  --body "$(cat <<'PR_BODY'
<confirmed-body>
PR_BODY
)"
```

**Never interpolate the title or body directly into a shell argument string.** Always use HEREDOC for `--body`. For `--title`, ensure the value is stripped of shell metacharacters (`"`, `$`, backticks) before use.

**Failure handling**:
- If `gh pr create` or `gh pr edit` fails:
  - If the error suggests authentication: run `gh auth status` and display the output.
  - Show the full error message.
  - Do not transition state. Stop.
  - Suggest: `gh auth login` if not authenticated.
- If PR already exists (conflict on create): detect and switch to `gh pr edit` automatically.

**Success**: output {{msg:PR_CREATED}} (`{pr_url}`: the PR URL).

### 8. Update state

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=pr --status=created
```

Output {{msg:PR_DONE}} (`{pr_url}`: the PR URL).

## Key Principles

- **Gate: docs:generated** — requires reference document to be committed before PR is created
- **Publish-only** — no local file changes; all commits must be done before this skill
- **Working tree must be clean** — stops if uncommitted changes are detected
- **Branch pattern check** — warns if branch name does not match `config.git.branchPattern`
- **Re-entry safe** — `pr:created` state triggers `gh pr edit` mode
- **Failure does not change state** — push or PR failures leave the topic at `docs:generated`
- **auth failure guidance** — `gh auth status` / `gh auth login` suggested on authentication errors

## Next Steps

After `/flow-pr` completes (`pr:created`):

- **PR 제목·body만 수정**: `/flow-pr` 재실행 — `pr:created` 상태에서 자동으로 re-entry(update) 모드로 진입해 `gh pr edit`을 실행한다.
- **참조 문서도 수정 필요**: `pr:created → docs:generated`로 상태를 복귀시킨 뒤 `/flow-docs`와 `/flow-pr`을 순서대로 실행한다.
  ```bash
  node .harness/scripts/dev-context.js update-state \
    --topic=<topic> --phase=docs --status=generated
  ```
  그 다음 `/flow-docs` (참조 문서 재생성 + commit) → `/flow-pr` (재push + PR 업데이트).
- **병합 후**: `/flow-done` 으로 아카이브하고 토픽을 제거한다.
