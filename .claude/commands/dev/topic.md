---
version: 3
description: Check the current topic and phase, or switch to another topic. Topic registration is handled by /dev:spec.
category: dev-workflow
---

# /dev:topic

Check the current work topic and phase, or switch between topics.

Topic registration is no longer a separate step — use `/dev:spec <topic>` to start a new topic and write its spec.

## Usage

```
/dev:topic                   Check the current topic and phase
/dev:topic switch <name>     Switch to another topic
/dev:topic <name>            ⚠ Deprecated — use /dev:spec <name> instead
```

## Execution Flow

### No arguments — Check current topic

1. Read `docs/_local/dev-context.json`
2. Print the current topic and phase:
   ```
   현재 주제: <topic>
   단계: <phase>
   스펙 확정: <specConfirmed>
   ```
3. If no topic exists:
   ```
   진행 중인 주제가 없습니다.
   새 주제를 시작하려면: /dev:spec <topic>
   ```

### `/dev:topic switch <name>` — Switch topic

1. Verify `<name>` topic exists in `dev-context.json`
   - If not found: show available topics and stop
2. Update `current_topic` to `<name>` and save

### `/dev:topic <name>` — Deprecated

Show a redirect message and stop:

```
⚠ /dev:topic <name>으로 주제를 등록하는 방식은 더 이상 사용하지 않습니다.
스펙 작성과 주제 등록을 함께 시작하려면:
  /dev:spec <name>
```

## Next Steps

- Start a new topic: `/dev:spec <topic>`
- Continue planning: `/dev:plan` (requires confirmed spec)
