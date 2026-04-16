---
version: 5
description: Write a spec for a new topic. Writes a spec draft using the brainstorming skill, runs the Codex review loop, and confirms the spec before planning.
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

If no argument:
- Scan `docs/_local/backlog/` for existing topics
- If one topic found: use it automatically
- If multiple topics found: show list and stop:
  ```
  백로그에 여러 주제가 있습니다. 주제를 지정하세요: /dev:spec <topic>
  ```
- If no topics found: show guidance and stop:
  ```
  주제를 지정하세요: /dev:spec <topic>
  ```

**Detect current state and resume from the right step:**

| State | Action |
|-------|--------|
| `docs/_local/backlog/<topic>/` exists + `spec-review-*.md` exists with READY decision | Show "스펙이 이미 확정되었습니다." and jump to Step 6 |
| `docs/_local/backlog/<topic>/` exists + `spec-review-*.md` exists with NOT READY decision | Jump to Step 5 (reflect existing review) |
| `docs/_local/backlog/<topic>/spec.md` exists + no review file | Ensure `current_spec` is set in `dev-context.json`, then jump to Step 4 |
| `docs/_local/backlog/<topic>/` does not exist | Continue to Step 2 (normal flow) |

### 2. Prepare working directory

- Create `docs/_local/backlog/<topic>/` if it does not exist

### 3. Write spec draft

Load `.claude/skills/brainstorming/SKILL.md` and follow its process.
When brainstorming announces completion, save the presented spec to `docs/_local/backlog/<topic>/spec.md`.

Then record the spec path in `dev-context.json`:

```json
{ "current_spec": "docs/_local/backlog/<topic>/spec.md" }
```

### 4. Request Codex review

After the draft is saved, show the user this message:

```
스펙 초안이 작성되었습니다: docs/_local/backlog/<topic>/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"

active 토픽이 없다면 경로 없이도 실행 가능합니다:
  codex "spec-review 스킬을 실행해줘"
  (active 토픽과 backlog 초안이 동시에 존재하면 Codex가 어느 스펙을 리뷰할지 물어봅니다)

리뷰 완료 후 spec-review-*.md 파일이 생성되면 다시 /dev:spec을 실행하세요.
```

Stop and wait for the user to run Codex and return.

### 5. Reflect review

When the user returns after Codex review:

- Find the latest `docs/_local/backlog/<topic>/spec-review-*.md`
- Read the review report
- If decision is `NOT READY`:
  - Apply all Required Fixes to `spec.md`
  - Go back to step 4 (request another Codex review)
- If decision is `READY` or `READY WITH NOTE`:
  - Apply Notes that correct factual inaccuracies, missing context, or add missing Open Questions identified by the review. Do NOT apply Notes that are stylistic preferences or scope expansions.
  - Proceed to step 6

### 6. Confirm spec

Show confirmation:

```
스펙이 확정되었습니다.
  스펙: docs/_local/backlog/<topic>/spec.md
  리뷰: docs/_local/backlog/<topic>/spec-review-<timestamp>.md
```

Then remove the `current_spec` key from `dev-context.json`.

### 7. Recommend splitting

Analyze the confirmed spec and recommend whether it should be split:

**Split when**: the spec has 3 or more goals that are independently implementable units.
**Keep single when**: goals are tightly coupled, or there are fewer than 3 goals.

Present the recommendation with reasoning:

```
# 분할 분석
[단일 진행 또는 분할 추천] — [이유: 목표 수, 독립성, 결합도 등]

[분할 추천 시]
제안하는 서브 토픽:
  1. <sub-topic-a>: [범위]
  2. <sub-topic-b>: [범위]

승인하시겠습니까?
```

- If no split needed: show next step directly
  ```
  다음: /dev:plan 또는 /dev:plan <topic> 으로 구현 계획을 수립하세요.
  ```
- If split recommended and user approves: run `/dev:spec <sub-topic>` for each sub-topic.
  Move the parent directory to `docs/_local/backlog-split/<topic>/` — this preserves it as a summary reference while excluding it from `/dev:plan` topic discovery (which scans `backlog/` only).
  Sub-topic specs are created fresh via `/dev:spec <sub-topic>` in `docs/_local/backlog/<sub-topic>/`.
- If split recommended and user declines: show the same next step.
  ```
  다음: /dev:plan 또는 /dev:plan <topic> 으로 구현 계획을 수립하세요.
  ```

## Key Principles

- **Topic initialization is NOT included** — `/dev:spec` does not register topics in `dev-context.json`. Registration happens at `/dev:plan`.
- **`current_spec` is a temporary field** — `/dev:spec` writes `current_spec` to `dev-context.json` after saving the draft, and removes it after spec confirmation (Step 6). This is the only field `/dev:spec` writes; it does not register topics.
- **Spec lives in backlog/** — spec is created and stays in `docs/_local/backlog/<topic>/` until `/dev:plan` moves it to `active/`
- **Brainstorming owns content, /dev:spec owns persistence** — the brainstorming skill presents the spec inline and announces completion; `/dev:spec` is responsible for saving to file.
- **Review loop runs until READY** — do not confirm the spec on a NOT READY result
- **Codex handoff is manual** — Claude cannot invoke Codex directly; the user runs the `codex` command
