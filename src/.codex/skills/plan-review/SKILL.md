---
version: 6
name: plan-review
description: >-
  Review an implementation plan against an 8-point quality gate. Resolves plan
  path from: (1) explicit argument, (2) dev-context.js read --field=plan, or
  (3) user prompt. Always reads spec separately via dev-context.js read
  --field=spec. Returns READY only when all 8 checks pass; READY WITH NOTE when
  non-blocking observations exist; otherwise NOT READY with concrete fixes
  required. On READY/READY WITH NOTE transitions topic to plan:confirmed; on
  NOT READY reverts to plan:ready.
---

# Plan Review

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.codex/skills/plan-review/templates/messages.<lang>.md` for the chosen language and `.codex/skills/plan-review/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. Print every catalog message exactly as the catalog writes it, with only placeholders filled in: keep its lines, numbering, and order, and do not add `(Recommended)` or other labels. A general question-format rule (for example "lead with a recommended option") does not apply to these plain-text questions. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and ask the question only if it passes. Before asking, run this shell command with the IDs listed for that question:

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .codex/skills/plan-review/templates/messages.<lang>.md .codex/skills/plan-review/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. If any cannot be obtained, do not ask the question: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no review, no report writing, and no `dev-context.json` update). Work already finished before the question stays as it is.

## Overview

Run a strict pre-implementation verification pass for one implementation plan.
Evaluate all 8 mandatory checks against the corresponding spec and produce a review report.

## Required Inputs

### Plan path resolution (priority order)

Resolve the plan path using the first matching source:

1. **Explicit argument** — user provides the path directly:
   ```
   codex "plan-review 스킬로 docs/_local/active/<topic>/implementation-plan.md를 리뷰해줘"
   ```

2. **Auto-resolution** — read from dev-context.json:
   ```bash
   node .harness/scripts/dev-context.js read --field=current_topic
   # then:
   node .harness/scripts/dev-context.js read --topic=<current_topic> --field=plan
   ```

3. **User prompt** — neither applies; ask the user for the plan path before proceeding.

**Mismatch handling**: If an explicit plan path was provided and it differs from
`topics[current_topic].plan`, ask the user before proceeding with {{msg:REVIEW_TARGET_CONFIRM}} as a plain-text question (`{explicit_path}`: the explicit plan path; `{registered_path}`: `topics[current_topic].plan`). Answer-required ID: `REVIEW_TARGET_CONFIRM`. Apply the answer-required check; if it stops, do not review the plan, write a report, or update `dev-context.json`.
Use the user's selection.

### Spec path resolution (always separate from plan)

Always read the spec path independently:
```bash
node .harness/scripts/dev-context.js read --topic=<current_topic> --field=spec
```

Do not infer the spec path from the plan path or directory.

### Derived values

- Review report path → `<dirname(plan)>/plan-review-<yymmddhhmmss>.md`
  where `<yymmddhhmmss>` is the current local datetime at review time
  (e.g. `plan-review-260415143022.md`)

## Review Workflow

### 1. Load context

- Determine plan path (see Required Inputs above)
- Determine spec path (always via `dev-context.js read --field=spec`)
- Read both documents in full
- Read `.harness/rules/git-workflow.md` for commit convention rules (type allowlist, scope warning level)
- Read `.harness/commit-scopes.md` for project-specific scope list. Parse scope values using regex `^\|\s*([a-z0-9_-]+)\s*\|` on each line, excluding rows where the captured value is `scope` (header) or matches `^-+$` (separator)

### 2. Evaluate the 8 mandatory checks

Read `.harness/contracts/implementation-plan.md` and follow its format exactly.
Use that contract as the expected structure of the plan under review (Story fields, Type, Tasks, Commit). Do not rewrite the plan.

Apply the checklist in `references/checklist-template.md`.

**Commit 섹션 검증** (warning level, not a separate check — apply within check 4 "Completion Criteria Verifiable"):

For each Story block that contains a `**Commit**:` field (plans written after `pr-driven-commit-workflow` Task 4):
- `type` must be one of: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci` → warn if not
- `scope` should match an entry in `.harness/commit-scopes.md` (free-form is acceptable) → warn if not in list
- `subject` must be 72 characters or fewer → warn if exceeded
- Each Story's commit should reflect only that Story's output → flag if the message appears to cover multiple Stories

**If a Story has no `**Commit**` field**: skip Commit validation for that Story (backward-compatible). Do not fail the plan for missing Commit fields.

**Task 라인 first-line subject 검증** (warning level, fold-in within check 4 "Completion Criteria Verifiable"):

For each Story's `**Tasks**:` list, validate every `- [ ] T<storyN>.<taskM> — <subject>` line:
- Subject must be non-empty → warn if missing
- Subject must be 80 characters or fewer → warn if exceeded
- Subject must be a single-line imperative phrase (TaskCreate-compatible) → warn if line wraps or contains markup

This check produces warnings; it does not add a 9th checklist item — Checklist remains 8 fixed lines.

### 3. Produce decision

| Condition | Decision |
|-----------|----------|
| All 8 checks PASS | **READY** |
| All PASS or NOTE, no FAIL | **READY WITH NOTE** |
| Any check FAIL | **NOT READY** |

### 4. Persist review artifacts

- Read `.harness/contracts/plan-review.md` and follow its format exactly.
- Write the review report to `<dirname(plan)>/plan-review-<yymmddhhmmss>.md`.
- Update dev-context.json state:

| Decision | State Transition | Field Update |
|----------|-----------------|--------------|
| READY / READY WITH NOTE | `node .harness/scripts/dev-context.js update-state --topic=<name> --phase=plan --status=confirmed` | `set-field --field=planReview --value=<path>` |
| NOT READY | `node .harness/scripts/dev-context.js update-state --topic=<name> --phase=plan --status=ready` | `set-field --field=planReview --value=<path>` |

Always write `planReview` regardless of decision.

## Output Format

See `.harness/contracts/plan-review.md` for the canonical report format.

## Resources

- `references/checklist-template.md`: 8-check template with per-check evaluation instructions.
- `.harness/contracts/plan-review.md`: Canonical format contract for this report.
- `.harness/contracts/implementation-plan.md`: Expected structure of the plan under review.
- `.harness/rules/git-workflow.md` (Read): Commit convention rules (type allowlist, review-fix policy).
- `.harness/rules/` (Read): Shared project rules for context.
- `.harness/commit-scopes.md` (Read): Project-specific scope list for Commit field validation.
- `docs/_local/dev-context.json`: Context source.
