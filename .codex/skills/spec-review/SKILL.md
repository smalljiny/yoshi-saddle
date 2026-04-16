---
version: 3
name: spec-review
description: >-
  Review a spec document against an 8-point quality gate. Resolves spec path from:
  (1) explicit argument, (2) active topic in dev-context.json, (3) current_spec
  field in dev-context.json (backlog fallback), or (4) user prompt. Returns READY
  only when all 8 checks pass; READY WITH NOTE when non-blocking observations
  exist; otherwise NOT READY with concrete fixes required.
---

# Spec Review

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

2. **Unambiguous auto-resolution** — exactly one of the following exists in `dev-context.json`:
   - `current_spec` field (backlog draft saved by `/dev:spec`) → use it
   - `current_topic` in topics (active topic) → use `topics[current_topic].spec`

3. **Ambiguous — both exist** — `current_spec` AND `current_topic` are both set:
   - Do not silently choose. Ask the user:
     ```
     dev-context.json에 backlog 스펙(current_spec)과 active 토픽이 모두 있습니다.
     어떤 스펙을 리뷰할까요?
       1. Backlog 스펙: <current_spec 경로>
       2. Active 토픽 스펙: <topics[current_topic].spec 경로>
     ```
   - Use the user's selection.

4. **User prompt** — none of the above apply; ask the user for the spec path before proceeding

If the user explicitly provides a spec path, always use it regardless of `dev-context.json` content.

### Derived values (both cases)

- Review report path → `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`
  where `<yymmddhhmmss>` is the current local datetime at review time (e.g. `spec-review-260415143022.md`)

## Review Workflow

### 1. Load context

- Determine spec path (see Required Inputs above)
- Read the spec document in full
- Read project rules from `.claude/rules/` where relevant

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

- Determine the report filename as `spec-review-<yymmddhhmmss>.md` using the current local datetime.
- Write the final review report to `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`.
- **Active topics only**: Update `docs/_local/dev-context.json`:
  - Keep the existing topic selection unchanged.
  - Set `topics[<current_topic>].specReview` to the review report path.
- **Backlog topics**: Do NOT write to `dev-context.json` — the topic is not registered there.
- If the report cannot be written, state that clearly.

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
- `docs/_local/dev-context.json`: Context source for active topics only.
