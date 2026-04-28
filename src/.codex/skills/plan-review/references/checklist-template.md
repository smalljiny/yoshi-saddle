# Plan Review Checklist Template

Use all 8 items. Evaluate the implementation plan against the corresponding spec.

Final decision rules:
- All PASS → **READY**
- Any FAIL → **NOT READY**
- All PASS but some NOTE observations → **READY WITH NOTE**

---

- [ ] 1. 목표 커버리지 (Goal Coverage)
  Evidence: (verify every goal stated in the spec's Goals section is addressed by at least one Task.
  Check: for each spec goal, identify the Task(s) that implement it.
  Any spec goal with no corresponding Task → FAIL.
  Partial coverage with clear gaps → FAIL.)

- [ ] 2. Non-goals 준수 (Non-goals Respected)
  Evidence: (verify the implementation plan does not include Tasks that implement items
  listed in the spec's Non-goals section.
  Any Task implementing a spec Non-goal → FAIL.
  Tasks that appear to approach a Non-goal boundary → NOTE.)

- [ ] 3. Task 독립성 (Task Independence)
  Evidence: (verify each Task can be executed and committed independently.
  Check: does completing Task N require partially-complete state from Task M where M > N?
  Hidden shared state, build-breaking intermediate steps → FAIL.
  Documented sequential dependencies with clear rationale → acceptable.)

- [ ] 4. 완료 기준 명확성 (Completion Criteria Verifiable)
  Evidence: (verify every Task's Completion Criteria are objectively verifiable.
  Accepted forms: runnable command, observable file output, test pass/fail, explicit assertion.
  Vague criteria like "works correctly" or "looks good" → FAIL.
  Missing Completion Criteria section in any Task → FAIL.)

- [ ] 5. Task 타입 정확성 (Task Type Accuracy)
  Evidence: (verify each Task's Type (tdd/config/infra/refactor/prompt) matches its Work Items.
  tdd: must include test writing. config: no executable behavior changes. infra: tooling/scripts.
  refactor: restructuring with existing coverage.
  prompt: LLM prompt authoring/improvement with Eval Cases and Acceptance.
  Mismatch between stated type and actual work → FAIL.

  For `prompt` type Tasks — additional validation (spec §3.5):
  - Eval Case count < 2 → NOTE
  - Any Eval Case missing Input field → FAIL
  - `direct` Eval Case missing Expected field → FAIL
  - `rubric` Eval Case missing Criteria, Rubric, or Pass field → FAIL
  - `judge` Eval Case missing Expected, Judge Criteria, or Pass field → FAIL
  - Missing `Acceptance: N/M eval 통과` line → NOTE
  - N > M or N < 1 in Acceptance → FAIL)

- [ ] 6. Task 규모 적정성 (Task Size Appropriate)
  Evidence: (verify each Task fits within a single commit unit.
  Too large: Task spans multiple independent concerns that could be separate Tasks → NOTE or FAIL.
  Too small: trivially simple steps bundled as a Task → NOTE.
  Size concerns that would make review or rollback impractical → FAIL.)

- [ ] 7. 구현 순서 타당성 (Implementation Order Valid)
  Evidence: (verify the stated task execution order respects all dependency relationships.
  Check: does any Task depend on an artifact produced by a later Task?
  Does the plan's dependency annotation match the actual order?
  Out-of-order dependency → FAIL.
  Implicit dependency not documented in the plan → NOTE.)

- [ ] 8. 범위 초과 없음 (No Scope Creep)
  Evidence: (verify no Task implements functionality beyond the spec's stated scope.
  Check: for each Task, confirm it maps to a spec requirement.
  Tasks without a corresponding spec requirement → FAIL.
  Convenience additions or "while we're at it" work → FAIL.)
