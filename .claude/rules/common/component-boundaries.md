---
version: 1
---
# Component Boundaries: Commands vs Skills

## Roles

### Commands (`.claude/commands/`)

- **Workflow owner** — define step order, conditional branches, pause/resume points
- **Persistence** — save files, move directories, write state
- **Orchestration** — load skills, invoke agents, await user input
- Do **not** implement reusable unit logic directly

### Skills (`.claude/skills/`)

- **Unit function owner** — a separable, reusable unit of capability
- **Single source of truth** — loaded by multiple commands or contexts
- Do **not** own workflow sequencing or persistence

## Delegation Pattern (Standard)

When a command needs skill logic:

```
Load `.claude/skills/<name>/SKILL.md` and follow its process.
```

Reference case: `dev/spec.md` → `brainstorming/SKILL.md`

## Violation Criteria

A command violates this rule if it directly defines logic that:

- **already exists in a skill** (duplication), OR
- **meets the skill criteria** (reusable, separable unit logic) but has no corresponding skill yet

Examples of logic that belongs in a skill, not a command:
- Gate definitions (build steps, check sequences)
- Quality criteria or evaluation rubrics
- Output format templates
- Pattern detection or extraction logic

When a violation is found, either delegate to an existing skill or extract the logic into a new skill first.

## Placement Decision Guide

| Need | Where to put it |
|------|----------------|
| Reusable unit logic (used in 2+ places, or likely to be) | Skill |
| Workflow glue (sequencing, saving, triggering) | Command |
| Both | Skill for logic + Command delegates to skill |
