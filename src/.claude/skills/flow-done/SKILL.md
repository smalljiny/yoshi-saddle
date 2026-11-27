---
version: 2
name: flow-done
description: Archive planning artifacts and remove the topic from dev-context.json. Run after /flow-pr (pr:created state). Reference document generation is handled by /flow-docs.
origin: harness
user-invocable: true
---

# /flow-done

Archive all planning artifacts to `done/` and remove the topic from `dev-context.json`. This skill runs **after** `/flow-pr` has created the PR (`pr:created` state). Reference document generation is the responsibility of `/flow-docs`.

## Usage

```
/flow-done    Complete the current topic
```

Always operates on `current_topic`. To complete a different topic, run `/flow-topic switch <name>` first.

## Execution Flow

### 1. Read current topic

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-done/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-done/templates/messages.en.md` and `.harness/i18n/<lang>/common.md` for the chosen language and `.harness/i18n/en/common.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

```bash
node .harness/scripts/dev-context.js read --field=current_topic
```

- If `current_topic` is empty or missing, output {{msg:NO_TOPIC}} and stop.
- Resolve `<topic>` from `current_topic`
- Validate topic name matches `^[a-zA-Z0-9_-]+$` — if not, output {{msg:common:INVALID_TOPIC_NAME}} and stop.

### 2. Gate: verify pr:created

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

If `phase:status` is not `pr:created`, output {{msg:GATE_FAILED}} (`{phase}`, `{status}`: the values read above) and stop immediately.

Do not warn and continue — stop entirely.

> **PR 수정이 필요한 경우**: `/flow-done` 이전에 `/flow-pr` 재실행 또는 상태를 `docs:generated`로 복귀시킨 후 `/flow-docs` → `/flow-pr` 순서로 재실행하세요.

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
   - `active/<topic>/review-report-*.md` → `done/<topic>/` (all matching files)
   - `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md`
6. Remove `active/<topic>/` directory if empty; if unexpected files remain, warn the user and ask for confirmation before removing
7. Output {{msg:ARCHIVED}} (`{topic}`: the archive directory name under `docs/_local/done/`).

### 4. Remove topic from dev-context.json

```bash
node .harness/scripts/dev-context.js remove-topic --topic=<topic>
```

`remove-topic` automatically sets `current_topic` to another remaining active topic, or `null` if none remain.

### 5. Output completion report

Output {{msg:DONE_TITLE}} (`{topic}`: the completed topic), a blank line, {{msg:DONE_ARCHIVE}} (`{topic}`: the archive directory name), a blank line, and {{msg:DONE_CURRENT}} (`{next_topic}`: the new `current_topic`, or {{msg:NONE_VALUE}} when none remains).

If there are remaining active topics, output {{msg:NEXT_TOPIC_SWITCHED}} (`{next_topic}`: the new `current_topic`).

If no active topics remain, output {{msg:ALL_DONE}}.

## Key Principles

- **current_topic only** — `/flow-done` always operates on `current_topic`. Use `/flow-topic switch` to change.
- **Gate: pr:created** — `/flow-done` only proceeds when `phase=pr && status=created`; stop entirely on mismatch.
- **Gate validation is /flow-done's responsibility** — `remove-topic` has no state validation; `/flow-done` pre-validates before calling it.
- **No deletions** — all planning artifacts (spec.md, spec-review-*.md, plan-review-*.md, review-report-*.md, implementation-plan.md) are moved to `done/`, never deleted.
- **Paths come from dev-context.json** — active directory is derived from `topics[<topic>]`, not hardcoded.
- **Reference document is NOT generated here** — that is `/flow-docs`'s responsibility. `/flow-done` only archives planning artifacts.
- **`done/` is git-ignored** — local archive only; `docs/specs/` (written by `/flow-docs`) is the tracked record.

## Next Steps

- Continue with another topic: `/flow-topic` to see active list
- Start new work: `/flow-spec <new-topic>`
