# Contract: Spec Review Report

- **Producer**: Codex `spec-review` skill (`.codex/skills/spec-review/SKILL.md`)
- **Consumers**: Claude `/flow-spec` (reads Decision to confirm spec), Claude `/flow-plan` (gate check)

## File Naming

```
docs/_local/backlog/<topic>/spec-review-<YYMMDDHHmmss>.md
docs/_local/active/<topic>/spec-review-<YYMMDDHHmmss>.md
```

The latest review file is determined by descending filename sort (most recent timestamp first).

## Required Format

The review report written to disk must use this exact structure:

```markdown
# Spec Review Result

- Spec: <spec-path>
- Decision: READY | READY WITH NOTE | NOT READY

## Checklist
- [PASS|FAIL|NOTE] 1. Clarity of Intent - <evidence>
- [PASS|FAIL|NOTE] 2. Non-goals Defined - <evidence>
- [PASS|FAIL|NOTE] 3. Architecture Sufficient for Planning - <evidence>
- [PASS|FAIL|NOTE] 4. Decision Rationale Documented - <evidence>
- [PASS|FAIL|NOTE] 5. Open Questions Documented - <evidence>
- [PASS|FAIL|NOTE] 6. Internal Consistency - <evidence>
- [PASS|FAIL|NOTE] 7. Implementation Readiness - <evidence>
- [PASS|FAIL|NOTE] 8. Scope Appropriate - <evidence>

## Notes
- <only include when Decision is READY WITH NOTE>

## Required Fixes
- <only include when Decision is NOT READY>
```

## Decision Rules

| Condition | Decision |
|-----------|----------|
| All 8 checks PASS | **READY** |
| All PASS or NOTE, no FAIL | **READY WITH NOTE** |
| Any check FAIL | **NOT READY** |

Use `[NOTE]` for non-blocking observations.

## State Transition Responsibility

After writing the report, the Codex spec-review skill must update dev-context.json:

- `READY` / `READY WITH NOTE` → no state transition (Claude `/flow-spec` handles `spec:confirmed`)
- `NOT READY` → no state transition (Claude `/flow-spec` handles `spec:drafting` rollback)
- Always: `dev-context.js set-field --topic=<name> --field=specReview --value=<report-path>`
