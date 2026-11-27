---
version: 5
description: Analyze patterns used repeatedly in the current session and save them as reusable skills.
category: harness-management
---

# /harness:learn

Extract reusable patterns from the current session and save them to `.claude/skills/learned/`.

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.harness/i18n/<lang>/commands/harness/learn.md` for the chosen language and `.harness/i18n/en/commands/harness/learn.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

## Execution Flow

1. Verify `.claude/sessions/` exists and contains log files for the current session.
2. Load `.claude/skills/wf-continuous-learning/SKILL.md` and follow **Steps 1–4 only** (scan, identify, filter, write). Do **not** execute Step 5 (Curate — deleting existing entries).
3. On completion, show a summary: {{msg:LEARN_TITLE}}, a blank line, {{msg:NEW_SKILLS_TITLE}}, then {{msg:SKILL_LINE}} once per saved skill (`{pattern_name}`, `{description}` in the conversation language), a blank line, and {{msg:SAVE_LOCATION}}.

   If no patterns met the quality bar, say so explicitly (free wording in the conversation language).

## Curation (Opt-in)

Step 5 of the skill (removing stale or superseded entries) is **not run by default**.
To curate existing learned skills, ask explicitly:

```
.claude/skills/learned/ 의 기존 스킬을 정리해줘
```

Before removing any entry, confirm with the user.

## Notes

- Default run is **non-destructive**: only adds new skill files, never deletes existing ones.
- Curation requires explicit intent because deletion of learned skills is hard to reverse without git.
