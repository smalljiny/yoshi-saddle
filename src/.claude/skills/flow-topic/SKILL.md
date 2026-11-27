---
version: 2
name: flow-topic
description: Check the current topic and phase, or switch to another topic. Topic registration is handled by /flow-spec.
origin: harness
user-invocable: true
---

# /flow-topic

Check the current work topic and phase, or switch between topics.

Topic registration is no longer a separate step — use `/flow-spec <topic>` to start a new topic and write its spec.

## Usage

```
/flow-topic                   Check the current topic and phase
/flow-topic switch <name>     Switch to another active topic
/flow-topic <name>            ⚠ Deprecated — use /flow-spec <name> instead
```

## Execution Flow

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-topic/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-topic/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

### No arguments — Check current topic

1. Read `docs/_local/dev-context.json` — source of truth for active topics and their phase
2. Scan `docs/_local/backlog/` for backlog topics
3. Print status (active topics from `dev-context.json`, backlog topics from directory scan), in this order: {{msg:STATUS_CURRENT}} (`{topic}`: `current_topic`, `{phase}`: its phase); a blank line; {{msg:ACTIVE_TITLE}}; one line per active topic — {{msg:ACTIVE_CURRENT_LINE}} for `current_topic`, {{msg:ACTIVE_OTHER_LINE}} for every other active topic (`{topic}`, `{phase}`); a blank line; {{msg:BACKLOG_TITLE}}; then {{msg:BACKLOG_LINE}} once per backlog topic (`{topic}`: the directory name).

4. If no active topic exists, output {{msg:NO_ACTIVE}}.

5. If no backlog topics exist, omit the backlog section (the `BACKLOG_TITLE` line and its lines).

### `/flow-topic switch <name>` — Switch topic

1. Check if `<name>` exists in `dev-context.json` topics (active topics only)
   - If found: update `current_topic` to `<name>` and save
   - If not found in active topics: check if `<name>` exists in `docs/_local/backlog/`
     - If in backlog: output {{msg:BACKLOG_TOPIC_HINT}} (`{name}`: the given name) and stop.
     - If not found anywhere: output {{msg:TOPIC_NOT_FOUND}} (`{name}`: the given name) and stop.

2. Confirm switch: output {{msg:SWITCHED}} (`{name}`: the new topic, `{phase}`: its phase).

### `/flow-topic <name>` — Deprecated

Output {{msg:DEPRECATED}} (`{name}`: the given name) and stop.

## Next Steps

- Start a new topic: `/flow-spec <topic>`
- Plan a backlog topic: `/flow-plan <topic>`
- Continue implementation: `/flow-impl`
