---
version: 1
description: Write a spec for a new topic. Registers the topic, writes a spec draft using the brainstorming skill, runs the Codex review loop, and confirms the spec before planning.
category: dev-workflow
---

# /dev:spec

Write a spec document for a work topic and confirm it through Codex review before planning begins.

## Usage

```
/dev:spec <topic>    Start a new topic and write its spec
/dev:spec            Continue spec work for the current topic
```

## Execution Flow

### 1. Resolve topic

If `$ARGUMENTS` is provided:
- Use it as `<topic>`
- Initialize topic in `docs/_local/dev-context.json` (see schema below)

If no argument:
- Read `current_topic` from `docs/_local/dev-context.json`
- If not found: show guidance and stop:
  ```
  주제를 지정하세요: /dev:spec <topic>
  ```

**Detect current state and resume from the right step:**

| State | Action |
|-------|--------|
| `specConfirmed: true` | Show "스펙이 이미 확정되었습니다." and jump to Step 8 |
| `review-*.md` exists + `specConfirmed: false` | Jump to Step 6 (reflect existing review) |
| `spec.md` exists + no review file | Jump to Step 5 (request Codex review) |
| `spec.md` does not exist | Continue to Step 2 (normal flow) |

### 2. Prepare working directory

- Create `docs/_local/tmp/<topic>/` if it does not exist

### 3. Initialize dev-context.json

Create or update `docs/_local/dev-context.json`:

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "spec",
      "spec": "docs/_local/tmp/<topic>/spec.md",
      "specConfirmed": false,
      "specReview": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

If the topic already exists in `dev-context.json`:
- Always update `updatedAt`
- Reset `phase` to `"spec"` and `specConfirmed` to `false`
- Preserve all other fields (`plan`, `currentTask`, etc.)
- If `specConfirmed` was already `true`, warn the user before resetting:
  ```
  이미 확정된 스펙이 있습니다. 다시 작성하면 specConfirmed가 초기화됩니다.
  계속하시겠습니까? (y/n)
  ```

### 4. Write spec draft

Load `.claude/skills/brainstorming/SKILL.md` and follow its process to write the spec draft.

- Ask questions one at a time to understand the topic
- Propose 2-3 approaches where relevant
- Present the spec in sections (200-300 words each), validating after each section
- Write the completed draft to `docs/_local/tmp/<topic>/spec.md`

### 5. Request Codex review

After the draft is saved, show the user this message:

```
스펙 초안이 작성되었습니다: docs/_local/tmp/<topic>/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/tmp/<topic>/spec.md를 리뷰해줘"

리뷰 완료 후 review-*.md 파일이 생성되면 다시 /dev:spec을 실행하세요.
```

Stop and wait for the user to run Codex and return.

### 6. Reflect review

When the user returns after Codex review:

- Find the latest `docs/_local/tmp/<topic>/review-*.md`
- Read the review report
- If decision is `NOT READY`:
  - Apply all Required Fixes to `spec.md`
  - Update `specReview` in `dev-context.json` to the report path
  - Go back to step 5 (request another Codex review)
- If decision is `READY` or `READY WITH NOTE`:
  - Apply any Notes if appropriate
  - Proceed to step 7

### 7. Confirm spec

Update `dev-context.json`:

```json
{
  "topics": {
    "<topic>": {
      "specConfirmed": true,
      "specReview": "docs/_local/tmp/<topic>/review-<yymmddhhmmss>.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Show confirmation:

```
스펙이 확정되었습니다.
  스펙: docs/_local/tmp/<topic>/spec.md
  리뷰: docs/_local/tmp/<topic>/review-<timestamp>.md
```

### 8. Ask about splitting

Ask the user whether the spec should be split:

```
이 스펙을 분할할까요?
  1. 단일 스펙으로 진행
  2. 분할 필요 (주제와 분할 기준을 알려주세요)
```

- If single: show next step
  ```
  다음: /dev:plan 으로 구현 계획을 수립하세요.
  ```
- If split: help the user define sub-topics, then run `/dev:spec <sub-topic>` for each

## Key Principles

- **Topic initialization is included** — no need to run `/dev:topic <name>` first
- **Review loop runs until READY** — do not confirm the spec on a NOT READY result
- **Codex handoff is manual** — Claude cannot invoke Codex directly; the user runs the `codex` command
- **specConfirmed gates /dev:plan** — `/dev:plan` will not run without `specConfirmed: true` (gate enforced in `/dev:plan`, see `.claude/commands/dev/plan.md`)
- **spec path stays in tmp/** — `/dev:plan` reads the spec path from `dev-context.json`, so the spec remains at `docs/_local/tmp/<topic>/spec.md` throughout planning
