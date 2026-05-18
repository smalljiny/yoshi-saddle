---
version: 1
name: flow-verify
description: Run the full verification gate before PR. Checks build, type-check, lint, test, and security in order.
origin: harness
user-invocable: true
---

# /flow-verify

All verification gates must pass before a PR.

## Execution Flow

Load `.claude/skills/wf-verification/SKILL.md` and follow its process.

## Next Steps

After all gates pass: run `/flow-done` to complete the topic.
