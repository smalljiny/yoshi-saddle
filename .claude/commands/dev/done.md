---
version: 1
description: Mark the current topic as done. Moves active/<topic> to done/, preserves spec to docs/specs/, and cleans up dev-context.json.
category: dev-workflow
---

# /dev:done

Mark the current topic as complete. Moves the topic from `active/` to `done/`, preserves the confirmed spec to `docs/specs/`, and removes the topic from `dev-context.json`.

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

### 4. Preserve spec to docs/specs/

Copy the confirmed spec to permanent storage:
- Read spec path from `topics[<topic>].spec`
- Create `docs/specs/` if it does not exist
- Copy `<spec path>` → `docs/specs/<topic>.md`
- Show:
  ```
  스펙 보존: docs/specs/<topic>.md
  ```

### 5. Move to done/

Move the topic directory:
- Resolve active directory from spec path: `dirname(topics[<topic>].spec)`
- Create `docs/_local/done/` if it does not exist
- If `docs/_local/done/<topic>/` already exists, use `docs/_local/done/<topic>-<yyyyMMddHHmmss>/` instead
- Move active topic directory → `docs/_local/done/<topic>/` (or timestamped variant)
- Show:
  ```
  완료 처리: docs/_local/done/<topic>/
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

```
완료되었습니다: <topic>

  스펙 보존: docs/specs/<topic>.md
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
- **Spec is preserved permanently** — `docs/specs/<topic>.md` is the permanent reference; `done/` is local archive.
- **`done/` is git-ignored** — local reference only; `docs/specs/` is the tracked record.
- **Verification is recommended, not required** — warns if `/dev:verify` has not passed, but does not block.
- **Failure behavior** — each step is independent. If a step fails, execution stops at that point. Steps already completed (e.g., spec copy) are not rolled back. Re-run `/dev:done` after fixing the issue; completed steps are idempotent.

## Next Steps

- View preserved spec: `docs/specs/<topic>.md`
- Continue with another topic: `/dev:topic` to see active list
- Start new work: `/dev:spec <new-topic>`
- Create PR: your spec is preserved, changes are ready
