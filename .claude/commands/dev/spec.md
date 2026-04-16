---
version: 4
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
| `docs/_local/backlog/<topic>/spec.md` exists + no review file | Jump to Step 4 (request Codex review) |
| `docs/_local/backlog/<topic>/` does not exist | Continue to Step 2 (normal flow) |

### 2. Prepare working directory

- Create `docs/_local/backlog/<topic>/` if it does not exist

### 3. Write spec draft

Load `.claude/skills/brainstorming/SKILL.md` and follow its process.
When brainstorming announces completion, save the presented spec to `docs/_local/backlog/<topic>/spec.md`.

### 4. Request Codex review

After the draft is saved, show the user this message:

```
스펙 초안이 작성되었습니다: docs/_local/backlog/<topic>/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"

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

### 7. Ask about splitting

Ask the user whether the spec should be split:

```
이 스펙을 분할할까요?
  1. 단일 스펙으로 진행
  2. 분할 필요 (주제와 분할 기준을 알려주세요)
```

- If single: show next step
  ```
  다음: /dev:plan 또는 /dev:plan <topic> 으로 구현 계획을 수립하세요.
  ```
- If split: help the user define sub-topics, then run `/dev:spec <sub-topic>` for each.
  Move the parent directory to `docs/_local/backlog-split/<topic>/` — this preserves it as a summary reference while excluding it from `/dev:plan` topic discovery (which scans `backlog/` only).
  Sub-topic specs are created fresh via `/dev:spec <sub-topic>` in `docs/_local/backlog/<sub-topic>/`.

## Key Principles

- **Topic initialization is NOT included** — `/dev:spec` does not register the topic in `dev-context.json`. Registration happens at `/dev:plan`.
- **Spec lives in backlog/** — spec is created and stays in `docs/_local/backlog/<topic>/` until `/dev:plan` moves it to `active/`
- **Brainstorming owns content, /dev:spec owns persistence** — the brainstorming skill presents the spec inline and announces completion; `/dev:spec` is responsible for saving to file.
- **Review loop runs until READY** — do not confirm the spec on a NOT READY result
- **Codex handoff is manual** — Claude cannot invoke Codex directly; the user runs the `codex` command
- **No dev-context.json access** — `/dev:spec` never reads from or writes to `dev-context.json`
