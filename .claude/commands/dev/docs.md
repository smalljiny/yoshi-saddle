---
version: 1
description: Generate a reference document from implemented harness files and commit it. Run before /dev:pr to ensure the document is included in the PR.
category: dev-workflow
---

# /dev:docs

Generate a reference document (`docs/specs/<name>.md`) describing the current state of the implemented harness system, then commit it. This command must run before `/dev:pr` so the reference document is included in the PR.

## Usage

```
/dev:docs    Generate and commit reference document for the current topic
```

Always operates on `current_topic`.

## Execution Flow

### 1. Read current topic and gate check

```bash
node .harness/scripts/dev-context.js read --field=current_topic
```

If `current_topic` is empty, stop:
```
참조 문서를 생성할 토픽이 없습니다.
```

Read `phase` and `status`:

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

Determine the entry mode based on `phase:status`:

| `phase:status` | Mode |
|---|---|
| `review:in-progress` | First-run (generate new reference doc) |
| `docs:generated` | Re-entry (regenerate existing reference doc) |
| anything else | Stop |

**Re-entry** (docs:generated):
```
참조 문서가 이미 생성되었습니다 (docs:generated).
재생성하시겠습니까? (y/n)
```
- `n`: stop
- `y`: proceed (will create a new `docs: update <name> reference` commit — amend is forbidden)

### 2. Check /dev:verify status

Look for evidence that `/dev:verify` has recently passed (e.g., a recent passing run in the session context).
If no passing verification is found:
```
⚠ /dev:verify가 통과되지 않았습니다. 계속하시겠습니까? (y/n)
```
- `n`: stop
- `y`: continue

### 3. Read git config

Read from `docs/_local/dev-context.json`:
```bash
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
```

Use defaults if not set:
- `baseBranch`: `main`
- `pullRemote`: `origin`

The diff base is `<pullRemote>/<baseBranch>`.

### 4. Generate reference document

#### 4.1 Identify implemented files

Collect changed files from all three sources and deduplicate:

1. `git diff <pullRemote>/<baseBranch>...HEAD --name-only` — committed changes on the feature branch
2. `git diff --name-only` — unstaged working tree changes
3. `git diff --cached --name-only` — staged (index) changes

Merge the three lists and remove duplicates.

**If all three sources are empty**:
```
git diff 결과가 비어 있습니다.
베이스 브랜치를 입력하세요 (기본값: <baseBranch>):
```
Validate the user-provided branch name against `^[a-zA-Z0-9_/.-]+$` before using it.
If invalid, re-prompt. Then verify the branch exists (`git rev-parse --verify <branch>`); if not found, show an error and stop.

Filter to harness files only — keep files matching any of:
- path starts with `.claude/`
- path starts with `.codex/`
- path starts with `.harness/`
- path is `CLAUDE.md`
- path is `AGENTS.md`

**If no harness files found after filtering**:
```
⚠ 변경된 하네스 파일이 없습니다.
참조 문서 생성을 건너뛰시겠습니까? (y/n)
```
- `y`: copy `docs/_local/active/<topic>/spec.md` → `docs/specs/<topic>-spec.md` as a fallback reference, then proceed to Step 5
- `n`: stop

#### 4.2 Read identified files

Read all identified harness files to understand their current behavior and structure.

#### 4.3 Draft reference document

Write the draft in **present tense** ("X does Y", "X는 Y를 한다") using the following format:

```markdown
# <System Subject Name>

> <One-line summary>

## 개요
[What the system is and what role it plays]

## 구조 / 스키마
[Current directory structure, data formats, etc.]

## 동작
[How commands, skills, and rules work]

## 제약사항
[Current constraints corresponding to Non-goals]
```

**Must not include**: migration guides, change history, Open Questions, Before/After comparisons.

#### 4.4 Propose filename

Propose a noun-form filename reflecting the subject of the implemented system.

Examples: `topic-lifecycle.md`, `spec-workflow.md`, `commit-pr-workflow.md`

```
참조 문서 파일명을 제안합니다: <suggested-name>.md
이 이름으로 저장하시겠습니까? (y/다른 이름 입력)
```

- `y`: use suggested name
- Other input: use the entered name as filename

Validate filename against `^[a-zA-Z0-9_-]+\.md$` — if invalid, re-prompt.

#### 4.5 Save reference document

- Create `docs/specs/` if it does not exist
- If `docs/specs/<confirmed-name>.md` already exists:
  ```
  docs/specs/<confirmed-name>.md가 이미 존재합니다.
  덮어쓰시겠습니까? (y/다른 이름 입력)
  ```
  - `y`: overwrite
  - Other input: use new name (re-validate)
- Write the draft to `docs/specs/<confirmed-name>.md`
- Persist the confirmed path to dev-context.json so `/dev:pr` can retrieve it without a fragile `git log` lookup:
  ```bash
  node .harness/scripts/dev-context.js set-field \
    --topic=<topic> --field=refDoc \
    --value=docs/specs/<confirmed-name>.md
  ```
- Show:
  ```
  참조 문서 생성: docs/specs/<confirmed-name>.md
  ```

### 5. Commit the reference document

```bash
git add docs/specs/<confirmed-name>.md
```

Determine commit message:
- **First run** (`review:in-progress`): `docs: add <confirmed-name> reference`
- **Re-entry** (`docs:generated`): `docs: update <confirmed-name> reference`

**amend is forbidden** — always create a new commit. Use HEREDOC to avoid shell metacharacter injection:

```bash
git commit -m "$(cat <<'COMMIT_MSG'
docs: add <confirmed-name> reference
COMMIT_MSG
)"
```

**Failure behavior**: If `git add` or `git commit` fails, do not transition state. Show the error and stop. The command is re-entrant safe — run `/dev:docs` again after resolving the issue.

### 6. Update state

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=docs --status=generated
```

Show completion:
```
참조 문서가 생성되고 commit되었습니다.
  파일:  docs/specs/<confirmed-name>.md
  상태:  docs:generated

다음: /dev:pr 로 PR을 생성하세요.
```

## Key Principles

- **Gate: review:in-progress** — `/dev:docs` only proceeds when `phase=review && status=in-progress` (or re-entry from `docs:generated`)
- **amend forbidden** — re-entry creates a new `docs: update ...` commit, never amends
- **Failure is safe** — state does not transition on error; re-run after fixing
- **diff base from config** — uses `config.git.pullRemote`/`config.git.baseBranch` (defaults: origin/main)
- **doc-updater optional** — invoke the `doc-updater` agent at Step 4 when the change scope is large or complex; it reads spec, plan, and `git diff` to produce the initial draft. For smaller changes, draft directly without the agent.

## Next Steps

After `/dev:docs` completes (`docs:generated`): run `/dev:pr` to push and open the PR.
