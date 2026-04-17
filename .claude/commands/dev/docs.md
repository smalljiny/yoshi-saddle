---
version: 2
description: Reconcile spec with implementation, update existing docs/specs/ files (or create new ones), and commit. Run before /dev:pr.
category: dev-workflow
---

# /dev:docs

Reconcile the topic spec with actual implementation, update existing `docs/specs/` files that were affected, and commit all changes in a single commit. This command must run before `/dev:pr`.

## Usage

```
/dev:docs    Run for the current topic
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
| `review:in-progress` | First-run |
| `docs:generated` | Re-entry (re-run entire flow) |
| anything else | Stop |

**Re-entry** (`docs:generated`):
```
docs:generated 상태입니다. 다시 실행하시겠습니까? (y/n)
```
- `n`: stop
- `y`: proceed (will create a new commit — amend is forbidden)

### 2. Check /dev:verify status

Look for evidence that `/dev:verify` has recently passed (e.g., a recent passing run in the session context).
If no passing verification is found:
```
⚠ /dev:verify가 통과되지 않았습니다. 계속하시겠습니까? (y/n)
```
- `n`: stop
- `y`: continue

### 3. Collect changed files (git diff)

Read git config:
```bash
node .harness/scripts/dev-context.js read --field=config.git.baseBranch
node .harness/scripts/dev-context.js read --field=config.git.pullRemote
```

Use defaults if not set: `baseBranch=main`, `pullRemote=origin`.

Collect changed files from all three sources and deduplicate:

1. `git diff <pullRemote>/<baseBranch>...HEAD --name-only` — committed changes
2. `git diff --name-only` — unstaged working tree changes
3. `git diff --cached --name-only` — staged changes

Merge the three lists and remove duplicates.

**If all three sources are empty**:
```
git diff 결과가 비어 있습니다.
베이스 브랜치를 입력하세요 (기본값: <baseBranch>):
```
Validate the user-provided branch name against `^[a-zA-Z0-9_/.-]+$` before using it. If invalid, re-prompt. Then verify the branch exists (`git rev-parse --verify <branch>`); if not found, show an error and stop. Then re-run the three diff sources with this branch as base and re-apply the harness filter.

Filter to harness files only — keep files matching any of:
- path starts with `.claude/`
- path starts with `.codex/`
- path starts with `.harness/`
- path is `CLAUDE.md`
- path is `AGENTS.md`

**If no harness files found after filtering**:
```
⚠ 변경된 하네스 파일이 없습니다.
계속하시겠습니까? (y/n)
```
- `n`: stop
- `y`: proceed to Step 4 with an empty change set

### 4. Spec reconciliation

Read `docs/_local/active/<topic>/spec.md`. Compare its contents against the collected changed files to identify discrepancies — things implemented but not described in the spec, or spec items that were not implemented.

**If discrepancies found**: present the list and ask for approval:
```
스펙-구현 불일치 항목:
  - [불일치 항목 1]
  - [불일치 항목 2]

spec.md에 반영하시겠습니까? (y/n)
```
- `y`: apply all listed discrepancies to `spec.md` and save

  Before saving, check whether the proposed changes alter the implementation goals (not just wording, details, or typos). If goal-level changes are detected, stop immediately:
  ```
  ⚠ 스펙 수정이 구현 목표를 변경합니다.
  /dev:docs를 중단합니다. /dev:plan 또는 /dev:review부터 재검토하세요.
  ```
  If the changes are corrections only (typos, missing details, wording), proceed. Note: these corrections do not require re-running `specReview`, `planReview`, or `implementation-plan.md`.

- `n`: skip spec update and proceed to Step 5

**If no discrepancies**: print `스펙-구현 불일치 없음.` and proceed to Step 5 automatically.

### 5. Identify docs/specs/ files to update

Analyze the collected changed files and the (updated) spec to infer which existing `docs/specs/` files need updating. Present candidates with brief reasoning:

```
업데이트 대상 후보:
  1. docs/specs/foo.md — [이유]
  2. docs/specs/bar.md — [이유]
  3. (신규 생성 필요) baz.md — [이유: 기존 파일 없음]

승인하시겠습니까? (y/목록 수정)
```

- `y`: proceed with the proposed list
- Other input: user adjusts the list, then re-confirm

**If zero existing-file candidates** (all content is new): use the same new-file flow as below.

**If new file creation is needed** (no existing file covers the content): for each new file, sequentially propose a filename:
```
신규 파일명을 제안합니다: <suggested-name>.md
이 이름으로 저장하시겠습니까? (y/다른 이름 입력)
```
Validate against `^[a-zA-Z0-9_-]+\.md$` — if invalid, re-prompt.
If `docs/specs/<name>.md` already exists:
```
docs/specs/<name>.md가 이미 존재합니다.
덮어쓰시겠습니까? (y/다른 이름 입력)
```
- `y`: overwrite
- Other input: use new name (re-validate)

### 6. Update each file

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

## 개요
[What the system is and what role it plays]

## 구조 / 스키마
[Current directory structure, data formats, etc.]

## 동작
[How commands, skills, and rules work]

## 제약사항
[Current constraints]
```

For full rewrites where the scope is large, invoke the `doc-updater` agent (reads spec, plan, and `git diff`) to produce the initial draft instead of drafting directly.

### 7. Select representative document and record refDoc

After all files are updated or created, select the representative document for `refDoc`:

- **1 file updated/created**: select it automatically
- **2 or more files**: prompt the user:
  ```
  여러 문서가 업데이트되었습니다. PR body에 사용할 대표 문서를 선택하세요:
    1. docs/specs/foo.md
    2. docs/specs/bar.md
  ```
- **If a newly created file exists**: propose it as the first candidate

Record the selected path:
```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=refDoc \
  --value=docs/specs/<selected>.md
```

Show:
```
대표 문서: docs/specs/<selected>.md
```

### 8. Commit

Stage all updated and newly created `docs/specs/` files. Do **not** stage `spec.md` (it lives in `docs/_local/` which is git-ignored).

```bash
git add docs/specs/<file1>.md docs/specs/<file2>.md ...
```

Determine commit message:
- **First-run** (`review:in-progress`): `docs: add <representative-name> reference`
- **Re-entry** (`docs:generated`): `docs: update <representative-name> reference`

**amend is forbidden** — always create a new commit. Use HEREDOC to avoid shell metacharacter injection:

```bash
git commit -m "$(cat <<'COMMIT_MSG'
docs: add <representative-name> reference
COMMIT_MSG
)"
```

**Failure behavior**: If `git add` or `git commit` fails, do not transition state. Show the error and stop. The command is re-entrant safe — run `/dev:docs` again after resolving the issue.

### 9. Update state

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=docs --status=generated
```

Show completion:
```
완료되었습니다.
  업데이트된 파일: docs/specs/foo.md, docs/specs/bar.md
  대표 문서:      docs/specs/<representative-name>.md
  상태:           docs:generated

다음: /dev:pr 로 PR을 생성하세요.
```

## Key Principles

- **Gate: review:in-progress** — `/dev:docs` only proceeds when `phase=review && status=in-progress` (or re-entry from `docs:generated`)
- **Spec reconciliation first** — update `spec.md` before touching `docs/specs/`, so the corrected spec drives the document update
- **Existing files first** — update existing `docs/specs/` files before creating new ones; create new files only when no existing file covers the content
- **Partial update preferred** — use section-level edits when 1–2 headings are affected and structure is preserved; full rewrite otherwise
- **No fuzzy matching** — if a target heading is not found exactly, switch to full rewrite immediately
- **Single commit** — all `docs/specs/` changes in one atomic commit; `spec.md` is git-ignored and never committed here
- **Goal-change aborts** — if spec reconciliation would alter implementation goals, stop immediately and redirect to `/dev:plan` or `/dev:review`
- **refDoc is a single path** — always one representative document; `/dev:pr` contract requires a single path
- **amend forbidden** — re-entry creates a new commit, never amends
- **Failure is safe** — state does not transition on error; re-run after fixing
- **diff base from config** — uses `config.git.pullRemote`/`config.git.baseBranch` (defaults: `origin`/`main`)

## Next Steps

After `/dev:docs` completes (`docs:generated`): run `/dev:pr` to push and open the PR.
