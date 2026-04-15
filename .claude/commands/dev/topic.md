---
version: 2
description: Start a new work topic or manage the current topic. Reads and writes dev-context.json.
category: dev-workflow
---

# /dev:topic

Start a work topic and record it in `docs/_local/dev-context.json`.

## Usage

```
/dev:topic <name>         Start a new topic
/dev:topic                Check the current topic
/dev:topic switch <name>  Switch to another topic
```

## Execution Flow

### No arguments — Check current topic

1. Read `docs/_local/dev-context.json`
2. Print the current topic and phase
3. If no topic exists, show guidance: "Start one with /dev:topic <name>"

### `/dev:topic <name>` — Start a new topic

1. Read `docs/_local/dev-context.json` (initialize with empty structure if not found)
2. Create `docs/_local/<name>/` directory
3. Update `dev-context.json`:

```json
{
  "current_topic": "<name>",
  "topics": {
    "<name>": {
      "phase": "topic",
      "spec": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

4. Show next steps:
```
Topic '<name>' started.
Next: Run /dev:plan to create an implementation plan.
```

### `/dev:topic switch <name>` — Switch topic

1. Verify `<name>` topic exists in `dev-context.json`
2. Update `current_topic` and save

## Next Steps

After starting a topic: create a plan with `/dev:plan`
