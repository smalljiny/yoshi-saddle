---
version: 1
description: Analyze patterns used repeatedly in the current session and save them as reusable skills.
category: harness-management
---

# /harness:learn

Extract reusable patterns from session logs and save them to `.claude/skills/learned/`.

## Execution Flow

### 1. Analyze Session Logs

Read recent log files from the `.claude/sessions/` directory.

Pattern detection:
- Code structures used repeatedly
- Debugging approaches that were effective
- Usage patterns for specific libraries/frameworks
- Effective sequences for solving problems

### 2. Evaluate Patterns

Evaluate each candidate pattern:
- **Reusability**: Is it useful in other projects or situations?
- **Generalizability**: Is it not tied to a specific codebase?
- **Value**: Would recording it save time in the future?

Do not save patterns with no value.

### 3. Create Skill Files

Save each pattern as `.claude/skills/learned/<pattern-name>/SKILL.md`:

```yaml
---
name: <pattern-name>
description: <When this skill should be used>
origin: learned
learned_at: <ISO 8601>
---

## When to Activate

[Situations where this pattern is useful]

## Pattern

[Specific code or approach]

## Examples

[Real usage examples]
```

### 4. Output Learning Summary

```
Learning complete

Newly saved skills:
- [pattern-name]: [description]
- [pattern-name]: [description]

Saved to: .claude/skills/learned/
```

## Notes

- Do not save if the content duplicates something already in `.claude/skills/`
- Do not save project-specific code (domain logic)
- Only save generalizable approaches and patterns
