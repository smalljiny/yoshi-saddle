# Contract: Plan Review Report

- **Producer**: Codex `plan-review` skill (`.codex/skills/plan-review/SKILL.md`)
- **Consumer**: Claude `/flow-impl` (gate check — requires `plan:confirmed` state)

## File Naming

```
docs/_local/active/<topic>/plan-review-<YYMMDDHHmmss>.md
```

The latest review file is determined by descending filename sort (most recent timestamp first).

## Path Resolution Contract

The plan-review skill must resolve two paths before reviewing:

### Plan path (required)
1. Explicit path provided by user
2. `node .harness/scripts/dev-context.js read --topic=<current_topic> --field=plan`
3. Ask user if neither is available

**Mismatch handling**: If the explicit path differs from `topics[current_topic].plan`, ask the user:
> "이 계획 파일을 리뷰할까요? 현재 등록된 토픽과 다릅니다. (명시 경로: `<path>`, 등록 경로: `<registered-path>`)"

### Spec path (required — read separately from plan)
Always read via:
```bash
node .harness/scripts/dev-context.js read --topic=<current_topic> --field=spec
```

## Required Format

```markdown
# Plan Review Result

- Plan: <plan-path>
- Spec: <spec-path>
- Decision: READY | READY WITH NOTE | NOT READY

## Checklist
- [PASS|FAIL|NOTE] 1. Goal Coverage - <evidence>
- [PASS|FAIL|NOTE] 2. Non-goals Respected - <evidence>
- [PASS|FAIL|NOTE] 3. Story Independence - <evidence>
- [PASS|FAIL|NOTE] 4. Completion Criteria Verifiable - <evidence>
- [PASS|FAIL|NOTE] 5. Story Type Accuracy - <evidence>
- [PASS|FAIL|NOTE] 6. Story Size Appropriate - <evidence>
- [PASS|FAIL|NOTE] 7. Implementation Order Valid - <evidence>
- [PASS|FAIL|NOTE] 8. No Scope Creep - <evidence>

## Notes
- <only include when Decision is READY WITH NOTE>

## Required Fixes
- <only include when Decision is NOT READY>
```

## Checklist Definitions

| # | Item | Evaluation Criteria |
|---|------|---------------------|
| 1 | Goal Coverage | Every goal in the spec is addressed by at least one Story |
| 2 | Non-goals Respected | The plan does not implement items the spec marks out of scope |
| 3 | Story Independence | Each Story can be executed independently |
| 4 | Completion Criteria Verifiable | Completion Criteria are verifiable conditions |
| 5 | Story Type Accuracy | Each Story's Type matches its Tasks |
| 6 | Story Size Appropriate | Each Story fits a single commit unit |
| 7 | Implementation Order Valid | Story execution order is consistent with dependencies |
| 8 | No Scope Creep | The plan adds no features beyond the spec's scope |

## Decision Rules

| Condition | Decision |
|-----------|----------|
| All 8 checks PASS | **READY** |
| All PASS or NOTE, no FAIL | **READY WITH NOTE** |
| Any check FAIL | **NOT READY** |

## State Transition Responsibility

After writing the report, the Codex plan-review skill must update dev-context.json:

| Decision | State Transition | Field Update |
|----------|-----------------|--------------|
| READY / READY WITH NOTE | `update-state --topic=<name> --phase=plan --status=confirmed` | `set-field --field=planReview --value=<path>` |
| NOT READY | `update-state --topic=<name> --phase=plan --status=ready` | `set-field --field=planReview --value=<path>` |
