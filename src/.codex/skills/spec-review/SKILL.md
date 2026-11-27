---
version: 9
name: spec-review
description: >-
  Review a spec document against an 8-point quality gate. Resolves spec path from:
  (1) explicit argument, (2) dev-context.js read --topic=<name> --field=spec, or
  (3) user prompt. Returns READY only when all 8 checks pass; READY WITH NOTE when
  non-blocking observations exist; otherwise NOT READY with concrete fixes required.
---

# Spec Review

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.codex/skills/spec-review/templates/messages.<lang>.md` for the chosen language and `.codex/skills/spec-review/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. Print every catalog message exactly as the catalog writes it, with only placeholders filled in: keep its lines, numbering, and order, and do not add `(Recommended)` or other labels. A general question-format rule (for example "lead with a recommended option") does not apply to these plain-text questions. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and ask the question only if it passes. Before asking, run this shell command with the IDs listed for that question:

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .codex/skills/spec-review/templates/messages.<lang>.md .codex/skills/spec-review/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. If any cannot be obtained, do not ask the question: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no `specReview` write; the report already written stays as it is). Work already finished before the question stays as it is.

## Overview

Run a strict pre-planning verification pass for one spec document.
Evaluate all 8 mandatory checks and produce a review report.

## Required Inputs

### Spec path resolution (priority order)

Resolve the spec path using the first matching source:

1. **Explicit argument** — user provides the path directly:
   ```
   codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
   ```

2. **Auto-resolution** — read from dev-context.json via CLI:
   ```bash
   node .harness/scripts/dev-context.js read --field=current_topic
   # then:
   node .harness/scripts/dev-context.js read --topic=<current_topic> --field=spec
   ```

3. **User prompt** — neither applies; ask the user for the spec path before proceeding.

If the user explicitly provides a spec path, always use it regardless of `dev-context.json` content.

### Derived values

- Review report path → `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`
  where `<yymmddhhmmss>` is the current local datetime at review time (e.g. `spec-review-260415143022.md`)

## Review Workflow

### 1. Load context

- Determine spec path (see Required Inputs above)
- Read the spec document in full
- Read project rules from `.harness/rules/` (shared) and `.claude/rules/` (Claude operational) where relevant

### 2. Evaluate the 8 mandatory checks

Read `.harness/contracts/spec.md` and follow its format exactly. Interpret legacy headings with the alias table in `references/checklist-template.md`. Judge review-required sections and equivalent planning structures with the rules in that file, not with the contract's generation format. Use the contract as the expected structure of the spec under review. Do not rewrite the spec.

Apply the checklist in `references/checklist-template.md`.
See `references/rules-and-inputs.md` for context loading rules and field definitions.

### 3. Produce decision

| Condition | Decision |
|-----------|----------|
| All 8 checks PASS | **READY** |
| All PASS or NOTE, no FAIL | **READY WITH NOTE** |
| Any check FAIL | **NOT READY** |

### 4. Persist review artifacts

- Read `.harness/contracts/spec-review.md` and follow its format exactly.
- Write the final review report to `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`.
- Determine the owning topic before writing `specReview`:
  1. Read `current_topic`:
     ```bash
     node .harness/scripts/dev-context.js read --field=current_topic
     ```
  2. Read that topic's registered spec path:
     ```bash
     node .harness/scripts/dev-context.js read --topic=<current_topic> --field=spec
     ```
  3. **If the resolved spec path does not match the spec actually reviewed**, ask the user {{msg:SPEC_REVIEW_TARGET}} as a plain-text question (`{reviewed_path}`: the reviewed spec path; `{current_topic}`: `current_topic`; `{registered_path}`: its registered spec path). Answer-required ID: `SPEC_REVIEW_TARGET`. Apply the answer-required check; if it stops, skip the `specReview` write — the report written above stays as it is. Print the message text exactly as the catalog has it — the two numbered choice lines `1.` and `2.` in that order, unchanged — and accept `1` or `2` as the answer. Do not turn the choices into bullets, reorder them, or mark one as recommended (the AGENTS.md question rule targets `AskUserQuestion` and does not apply here).
     Do not silently write to the wrong topic.
- Update `docs/_local/dev-context.json` via CLI (Codex owns this update):
  ```bash
  node .harness/scripts/dev-context.js set-field \
    --topic=<confirmed_topic> \
    --field=specReview \
    --value=<report-path>
  ```
- If the report cannot be written, state that clearly.

## Output Format

See `.harness/contracts/spec-review.md` for the canonical format contract.

Use `[NOTE]` for non-blocking observations.

## Resources

- `references/checklist-template.md`: 8-check template with per-check evaluation instructions.
- `references/rules-and-inputs.md`: Context loading rules, field definitions, fallback inputs.
- `.harness/contracts/spec-review.md`: Canonical format contract for this report.
- `.harness/rules/` (Read): Shared coding-style, git-workflow, testing, security, typescript rules — referenced during load context.
- `docs/_local/dev-context.json`: Context source.
