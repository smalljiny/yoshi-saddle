---
version: 1
name: spec-review
description: Review a spec document against an 8-point quality gate. Resolves spec path from docs/_local/dev-context.json. Returns READY only when all 8 checks pass; READY WITH NOTE when non-blocking observations exist; otherwise NOT READY with concrete fixes required.
---

# Spec Review

## Overview

Run a strict pre-planning verification pass for one spec document.
Resolve review context from `docs/_local/dev-context.json`, then evaluate all 8 mandatory checks.

## Required Inputs

Default input source:
- `docs/_local/dev-context.json`

Resolve these values from the current topic in `dev-context.json`:
- `spec` → spec document path to review

Derived values:
- Review report path → `<dirname(spec)>/review-<yymmddhhmmss>.md`
  where `<yymmddhhmmss>` is the current local datetime at review time (e.g. `review-260415143022.md`)
- `topics[<current_topic>].specReview` → written report path

Fallback:
- If the user explicitly provides a spec path for this turn, prefer the user-provided value.
- If `dev-context.json` is missing, malformed, or does not contain `current_topic` or `spec`,
  request the missing input(s) before review.

## Review Workflow

### 1. Load context

- Read `docs/_local/dev-context.json` unless the user explicitly overrides the spec path.
- Resolve `current_topic`, then load `spec` path.
- Read the spec document in full.
- Read project rules from `.claude/rules/` where relevant.

### 2. Evaluate the 8 mandatory checks

Apply the checklist in `references/checklist-template.md`.
See `references/rules-and-inputs.md` for context loading rules and field definitions.

### 3. Produce decision

| Condition | Decision |
|-----------|----------|
| All 8 checks PASS | **READY** |
| All PASS or NOTE, no FAIL | **READY WITH NOTE** |
| Any check FAIL | **NOT READY** |

### 4. Persist review artifacts

- Determine the report filename as `review-<yymmddhhmmss>.md` using the current local datetime.
- Write the final review report to `<dirname(spec)>/review-<yymmddhhmmss>.md`.
- Update `docs/_local/dev-context.json`:
  - Keep the existing topic selection unchanged.
  - Set `topics[<current_topic>].specReview` to the review report path.
- If the report cannot be written or the context file cannot be updated, state that clearly.

## Output Format

The review report written to disk must use this exact structure:

```markdown
# Spec Review Result

- Spec: <spec-path>
- Decision: READY | READY WITH NOTE | NOT READY

## Checklist
- [PASS|FAIL|NOTE] 1. 목표 명확성 - <evidence>
- [PASS|FAIL|NOTE] 2. Non-goals 명시 - <evidence>
- [PASS|FAIL|NOTE] 3. 아키텍처 충분성 - <evidence>
- [PASS|FAIL|NOTE] 4. 의사결정 근거 - <evidence>
- [PASS|FAIL|NOTE] 5. Open Questions - <evidence>
- [PASS|FAIL|NOTE] 6. 내부 일관성 - <evidence>
- [PASS|FAIL|NOTE] 7. 구현 가능성 - <evidence>
- [PASS|FAIL|NOTE] 8. 범위 적정성 - <evidence>

## Notes
- <only include when Decision is READY WITH NOTE>

## Required Fixes
- <only include when Decision is NOT READY>
```

Use `[NOTE]` for non-blocking observations.

## Resources

- `references/checklist-template.md`: 8-check template with per-check evaluation instructions.
- `references/rules-and-inputs.md`: Context loading rules, field definitions, fallback inputs.
- `docs/_local/dev-context.json`: Default review context source.
