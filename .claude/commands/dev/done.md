---
version: 2
description: Mark the current topic as done. Generates a reference document to docs/specs/, archives implementation-plan.md to done/, and cleans up dev-context.json.
category: dev-workflow
---

# /dev:done

Mark the current topic as complete. Generates a reference document from the implemented files, archives the implementation plan to `done/`, and removes the topic from `dev-context.json`.

## Usage

```
/dev:done    Complete the current topic
```

Always operates on `current_topic`. To complete a different topic, run `/dev:topic switch <name>` first.

## Execution Flow

### 1. Read current topic

Read `docs/_local/dev-context.json`:
- If `current_topic` is null or missing, stop:
  ```
  완료할 토픽이 없습니다.
  현재 작업 중인 토픽이 없습니다.
  ```
- Resolve `<topic>` from `current_topic`
- Validate topic name matches `^[a-zA-Z0-9_-]+$` — if not, stop:
  ```
  유효하지 않은 토픽 이름입니다. 영문자, 숫자, 하이픈, 언더스코어만 허용됩니다.
  ```
- Read `topics[<topic>]` entry — this is the source of truth for all paths

### 2. Check phase

Read `topics[<topic>].phase`:
- If phase is `spec` or `plan` (implementation not started), stop:
  ```
  '<topic>'은 아직 구현이 시작되지 않았습니다. (현재 단계: <phase>)
  구현을 먼저 진행하세요: /dev:impl
  ```

### 3. Check verification status (optional)

Check if `/dev:verify` has been run by looking for recent passing results.
- If verification has not been run or last result was not passing, show warning (do not stop):
  ```
  ⚠ /dev:verify가 통과되지 않았습니다. 완료 처리를 계속하시겠습니까? (y/n)
  ```
  - `n`: stop
  - `y`: continue

### 4. Generate reference document

Generate a reference document describing the current state of the implemented system:

#### 4.1 Identify implemented files

Collect changed files from all three sources and deduplicate:

1. `git diff develop...HEAD --name-only` — committed changes on the feature branch
2. `git diff --name-only` — unstaged working tree changes
3. `git diff --cached --name-only` — staged (index) changes

Merge the three lists and remove duplicates. This ensures files are captured whether the work is committed, staged, or still in the working tree.

**If all three sources are empty** (e.g., truly no changes):
```
git diff 결과가 비어 있습니다.
베이스 브랜치를 입력하세요 (기본값: develop):
```
Validate the user-provided branch name against `^[a-zA-Z0-9_/.-]+$` before using it.
If invalid, re-prompt:
```
유효하지 않은 브랜치명입니다. 영문자, 숫자, 슬래시, 하이픈, 점만 허용됩니다.
```
Then verify the branch exists (`git rev-parse --verify <branch>`); if not found, show an error and stop.
Use the validated branch (or `develop` if blank) and re-run source 1 only, then merge again.

Filter to harness files only — keep files matching any of:
- path starts with `.claude/`
- path starts with `.codex/`
- path is `CLAUDE.md`
- path is `AGENTS.md`

**If no harness files found after filtering**:
```
⚠ 변경된 하네스 파일이 없습니다.
참조 문서 생성을 건너뛰시겠습니까? (y/n)
```
- `y`: copy `active/<topic>/spec.md` → `docs/specs/<topic>-spec.md` as a fallback reference, then proceed to Step 5
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

Examples: `topic-lifecycle.md`, `spec-workflow.md`, `brainstorming-contract.md`

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
- Show:
  ```
  참조 문서 생성: docs/specs/<confirmed-name>.md
  ```

### 5. Archive to done/

Archive only the implementation plan; discard planning artifacts:

1. Resolve active directory from spec path: `dirname(topics[<topic>].spec)`
2. Create `docs/_local/done/` if it does not exist
3. If `docs/_local/done/<topic>/` already exists, use `docs/_local/done/<topic>-<yyyyMMddHHmmss>/` instead
4. Create `docs/_local/done/<topic>/` (or timestamped variant)
5. Move `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md` (skip if file does not exist — re-entrant safe)
6. Delete `active/<topic>/spec.md` and `active/<topic>/spec-review-*.md` if they exist (planning artifacts — superseded by reference document)
7. Remove `active/<topic>/` directory; if unexpected files remain, warn the user and ask for confirmation before deleting
8. Show:
  ```
  아카이브: docs/_local/done/<topic>/
  ```

### 6. Update dev-context.json

Remove the topic from `dev-context.json` and update `current_topic`:
- Remove `topics[<topic>]` from the topics object
- Set `current_topic` to another active topic if one exists, otherwise `null`
- Update `updatedAt`

```json
{
  "current_topic": "<next-active-topic or null>",
  "topics": {
    // <topic> removed
  }
}
```

### 7. Output completion report

If reference document was generated (Step 4 completed normally):
```
완료되었습니다: <topic>

  참조 문서: docs/specs/<confirmed-name>.md
  아카이브:  docs/_local/done/<topic>/

  현재 주제: <next-active-topic or "없음">
```

If reference document was skipped (Step 4.1 returned no harness files and user chose to skip — spec copied as fallback):
```
완료되었습니다: <topic>

  참조 문서: docs/specs/<topic>-spec.md (스펙 원본 복사)
  아카이브:  docs/_local/done/<topic>/

  현재 주제: <next-active-topic or "없음">
```

If there are remaining active topics:
```
  다음 토픽으로 전환되었습니다: <next-active-topic>
  계속하려면: /dev:impl
```

If no active topics remain:
```
  모든 토픽이 완료되었습니다.
  새 작업을 시작하려면: /dev:spec <topic>
```

## Key Principles

- **current_topic only** — `/dev:done` always operates on `current_topic`. Use `/dev:topic switch` to change.
- **Paths come from dev-context.json** — spec path and active directory are read from `topics[<topic>].spec`, not hardcoded.
- **Reference document is generated automatically** — `docs/specs/<confirmed-name>.md` is generated from implemented files at completion time; `done/` is local archive.
- **`done/` is git-ignored** — local reference only; `docs/specs/` is the tracked record.
- **Verification is recommended, not required** — warns if `/dev:verify` has not passed, but does not block.
- **Failure behavior** — each step is independent. If a step fails, execution stops at that point. Steps already completed (e.g., reference document generation) are not rolled back. Re-run `/dev:done` after fixing the issue; Step 4 is re-entrant via the existing-file overwrite prompt.

## Next Steps

- View reference document: `docs/specs/<confirmed-name>.md`
- Continue with another topic: `/dev:topic` to see active list
- Start new work: `/dev:spec <new-topic>`
- Create PR: reference document is generated, changes are ready
