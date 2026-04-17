---
version: 4
description: Archive planning artifacts and remove the topic from dev-context.json. Run after /dev:pr (pr:created state). Reference document generation is handled by /dev:docs.
category: dev-workflow
---

# /dev:done

Archive all planning artifacts to `done/` and remove the topic from `dev-context.json`. This command runs **after** `/dev:pr` has created the PR (`pr:created` state). Reference document generation is the responsibility of `/dev:docs`.

## Usage

```
/dev:done    Complete the current topic
```

Always operates on `current_topic`. To complete a different topic, run `/dev:topic switch <name>` first.

## Execution Flow

### 1. Read current topic

```bash
node .harness/scripts/dev-context.js read --field=current_topic
```

- If `current_topic` is empty or missing, stop:
  ```
  완료할 토픽이 없습니다.
  현재 작업 중인 토픽이 없습니다.
  ```
- Resolve `<topic>` from `current_topic`
- Validate topic name matches `^[a-zA-Z0-9_-]+$` — if not, stop:
  ```
  유효하지 않은 토픽 이름입니다. 영문자, 숫자, 하이픈, 언더스코어만 허용됩니다.
  ```

### 2. Gate: verify pr:created

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

If `phase:status` is not `pr:created`, stop immediately:

```
완료 처리를 실행할 수 없습니다.
현재 상태: <phase>:<status>
pr:created 상태여야 합니다.

워크플로우 순서:
  /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

Do not warn and continue — stop entirely.

> **PR 수정이 필요한 경우**: `/dev:done` 이전에 `/dev:pr` 재실행 또는 상태를 `docs:generated`로 복귀시킨 후 `/dev:docs` → `/dev:pr` 순서로 재실행하세요.

### 3. Archive to done/

Move all planning artifacts to `done/` — **no files are deleted**:

1. Resolve active directory: `docs/_local/active/<topic>/`
2. Create `docs/_local/done/` if it does not exist
3. If `docs/_local/done/<topic>/` already exists, use `docs/_local/done/<topic>-<yyyyMMddHHmmss>/` instead
4. Create `docs/_local/done/<topic>/`
5. Move these files if they exist (skip silently if absent — re-entrant safe):
   - `active/<topic>/spec.md` → `done/<topic>/spec.md`
   - `active/<topic>/spec-review-*.md` → `done/<topic>/` (all matching files)
   - `active/<topic>/plan-review-*.md` → `done/<topic>/` (all matching files)
   - `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md`
6. Remove `active/<topic>/` directory if empty; if unexpected files remain, warn the user and ask for confirmation before removing
7. Show:
   ```
   아카이브: docs/_local/done/<topic>/
   ```

### 4. Remove topic from dev-context.json

```bash
node .harness/scripts/dev-context.js remove-topic --topic=<topic>
```

`remove-topic` automatically sets `current_topic` to another remaining active topic, or `null` if none remain.

### 5. Output completion report

```
완료되었습니다: <topic>

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
- **Gate: pr:created** — `/dev:done` only proceeds when `phase=pr && status=created`; stop entirely on mismatch.
- **Gate validation is /dev:done's responsibility** — `remove-topic` has no state validation; `/dev:done` pre-validates before calling it.
- **No deletions** — all planning artifacts (spec.md, spec-review-*.md, plan-review-*.md, implementation-plan.md) are moved to `done/`, never deleted.
- **Paths come from dev-context.json** — active directory is derived from `topics[<topic>]`, not hardcoded.
- **Reference document is NOT generated here** — that is `/dev:docs`'s responsibility. `/dev:done` only archives planning artifacts.
- **`done/` is git-ignored** — local archive only; `docs/specs/` (written by `/dev:docs`) is the tracked record.

## Next Steps

- Continue with another topic: `/dev:topic` to see active list
- Start new work: `/dev:spec <new-topic>`
