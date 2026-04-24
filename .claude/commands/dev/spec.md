---
version: 11
description: Write a spec for a new topic. Registers the topic in dev-context.json, writes a spec draft using the brainstorming skill, runs the Codex review loop, and confirms the spec before planning.
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
- Read `current_topic` from `dev-context.json`:
  ```bash
  node .harness/scripts/dev-context.js read --field=current_topic
  ```
- If a topic is returned, read its phase:
  ```bash
  node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
  ```
- If `phase` is `spec`: use it automatically
- Otherwise scan `docs/_local/backlog/` for existing directories
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

| `phase:status` | Action |
|----------------|--------|
| `spec:confirmed` | Show "스펙이 이미 확정되었습니다." and jump to Step 7 |
| `spec:reviewing` + latest `spec-review-*.md` has NOT READY decision | Jump to Step 5 (reflect existing review) |
| `spec:reviewing` + no review file yet | Jump to Step 4 (waiting for Codex) |
| `spec:drafting` + spec file exists | Jump to Step 4 (request review) |
| topic not yet registered | Continue to Step 2 (normal flow) |

> **Step 2.5 re-entry (v1)**: Step 2.5 is not idempotent — on re-entry the research question is always asked again. If a `docs/research/research-<topic>-*.md` file exists from a previous run, Claude may offer to reuse it but must still ask before proceeding.

### 2. Prepare working directory

- Create `docs/_local/backlog/<topic>/` if it does not exist

### 2.5 (Optional) Research the topic

Before starting the brainstorming, optionally run a web research pass to gather background context.

**1. Adapter availability check**

Load `.claude/skills/skill-registry/SKILL.md` and run the Discovery Procedure with capability query `[search-adapter]`.

- If 0 adapters found: show `"search-adapter 스킬이 설치되지 않아 리서치를 건너뜁니다."` and proceed to Step 3 with `RESEARCH_CONTEXT` empty.

**2. Ask if research is needed**

Use `AskUserQuestion` with:
- Option 1 (Recommended): "예, 리서치 수행" — run web research before brainstorming
- Option 2: "아니오, 바로 브레인스토밍" — skip; proceed to Step 3 with `RESEARCH_CONTEXT` empty

**3. Propose and confirm the research query**

Claude auto-generates a query from the topic name. Example: `"<topic> 관련 배경 기술 조사, 디자인 패턴, 선례"`.

Use `AskUserQuestion` with:
- Option 1 (Recommended): "제안된 쿼리 사용" — proceed with the generated query
- Option 2: "쿼리 수정" — prompt the user to type a replacement query
- Option 3: "리서치 취소" — set `RESEARCH_CONTEXT` empty and proceed to Step 3

**4. Execute research**

Load `.claude/skills/wf-deep-research/SKILL.md`. Skip wf-deep-research Step 1 (goal clarification) since the query is already confirmed. Execute Steps 2–6 with the confirmed query.

Output path (from wf-deep-research File-Save Policy): `docs/research/research-<topic>-<YYYYMMDDHHMMSS>.md`

On success: store the file path in `RESEARCH_CONTEXT`.

**5. Failure fallback**

If wf-deep-research fails for any reason (execution error, no file produced, adapter errors), show:
```
리서치 실행 중 오류가 발생해 컨텍스트 없이 진행합니다.
```
Set `RESEARCH_CONTEXT` empty and proceed to Step 3. Do **not** abort the brainstorming flow.

### 3. Write spec draft

If `RESEARCH_CONTEXT` is set, read the research report file and extract context:
1. If `## Executive Summary` section exists: use its content
2. If `## Key Takeaways` section exists: append its content
3. If neither section exists: use the first 500 characters of the file

Load `.claude/skills/wf-brainstorming/SKILL.md` and `.harness/contracts/spec.md`. If `RESEARCH_CONTEXT` is set, include the extracted content as a **"Background research context"** block at the start of the brainstorming prompt. The research context is reference material only — do not copy-paste it into the spec draft.

If `RESEARCH_CONTEXT` is empty, proceed with the existing brainstorming flow unchanged.

Follow the brainstorming process using the contract as the spec document format.
When brainstorming announces completion, save the presented spec to `docs/_local/backlog/<topic>/spec.md`.

Then register the topic in `dev-context.json`:

```bash
node .harness/scripts/dev-context.js register-topic \
  --topic=<topic> \
  --spec=docs/_local/backlog/<topic>/spec.md
```

### 4. Request Codex review

Transition to `spec:reviewing`:

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> \
  --phase=spec \
  --status=reviewing
```

Then show the user this message:

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
  - Transition back to drafting:
    ```bash
    node .harness/scripts/dev-context.js update-state \
      --topic=<topic> \
      --phase=spec \
      --status=drafting
    ```
  - Go back to step 4 (request another Codex review)
- If decision is `READY` or `READY WITH NOTE`:
  - Apply Notes that correct factual inaccuracies, missing context, or add missing Open Questions identified by the review. Do NOT apply Notes that are stylistic preferences or scope expansions.
  - Proceed to step 6

### 6. Confirm spec

Transition to `spec:confirmed`:

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> \
  --phase=spec \
  --status=confirmed
```

Show confirmation:

```
스펙이 확정되었습니다.
  스펙: docs/_local/backlog/<topic>/spec.md
  리뷰: docs/_local/backlog/<topic>/spec-review-<timestamp>.md
```

### 7. Recommend splitting

Analyze the confirmed spec and recommend whether it should be split, using the **PR 병합 가능 단위** criteria from `.harness/contracts/spec.md`:

**Split when**: the spec has 3 or more goals that each satisfy all of — (1) independently deployable, (2) independently revertable, (3) not dependent on another concurrent PR.
**Keep single when**: goals are tightly coupled by a dependency chain (document as Coupling Rationale in §1.3), or there are fewer than 3 independently merge-able goals.

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

- **Topic initialization IS included** — `/dev:spec` registers the topic in `dev-context.json` at `spec:drafting` immediately after saving the spec draft (Step 3).
- **Spec lives in backlog/** — spec is created and stays in `docs/_local/backlog/<topic>/` until `/dev:plan` moves it to `active/`
- **Brainstorming owns content, /dev:spec owns persistence** — the brainstorming skill presents the spec inline and announces completion; `/dev:spec` is responsible for saving to file and registering the topic.
- **Review loop runs until READY** — do not confirm the spec on a NOT READY result
- **Codex handoff is manual** — Claude cannot invoke Codex directly; the user runs the `codex` command
- **`specReview` is owned by Codex** — `/dev:spec` does not write `specReview`; the Codex spec-review skill updates it via `set-field`
- **Format injection** — spec document format is defined in `.harness/contracts/spec.md` and injected by `/dev:spec` when loading brainstorming; the brainstorming skill itself is format-agnostic
- **Research is optional and additive** — Step 2.5 never blocks the brainstorming flow; failures fall back to context-free brainstorming
