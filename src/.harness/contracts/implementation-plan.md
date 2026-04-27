# Contract: Implementation Plan Document

- **Producer**: Claude planner agent (invoked by `/dev:plan`)
- **Consumer**: Codex `plan-review` skill (validates against spec), Claude `/dev:impl` (executes Tasks)

## File Location

```
docs/_local/active/<topic>/implementation-plan.md
```

## Required Format

```markdown
# Implementation Plan: <topic name>

## Overview
[One paragraph summary of what this plan implements and why]

## Spec Reference
> Based on: `docs/_local/active/<topic>/spec.md`

## Task List

### [ ] Task 1: <title>
- **Type**: tdd | config | infra | refactor | prompt
- **Goal**: [What this Task achieves — one sentence]
- **Work Items**:
  - [ ] Item 1
  - [ ] Item 2
- **Completion Criteria**:
  - [ ] Verifiable criterion 1
  - [ ] Verifiable criterion 2
- **Commit**: `<type>(<scope>): <subject>`
  ```
  [optional body line 1]
  [optional body line 2]
  ```

### [ ] Task 2: <title>
...
```

## Task Type Definitions

| Type | When to Use |
|------|-------------|
| `tdd` | New behavior that requires tests (RED-GREEN-REFACTOR cycle) |
| `config` | Configuration file changes, documentation, skill/command files |
| `infra` | Infrastructure, scripts, tooling — not business logic |
| `refactor` | Restructuring existing code with existing test coverage |
| `prompt` | LLM prompt authoring and validation via PROPOSE→EVAL→REFINE cycle |

## Prompt Task Eval Schema

`prompt` 타입 Task의 Completion Criteria 형식. planner·plan-review가 공유하는 계약 (`prompt-engineer` 에이전트는 후속 Task에서 추가될 예정).

### 전략 선택

| 전략 식별자 | 적용 기준 | 필수 필드 |
|---|---|---|
| `direct` | 정확한 텍스트·구조 일치 | Input, Expected |
| `rubric` | 주관적 품질 (어조, 간결성, 준수 여부) | Input, Criteria, Rubric, Pass |
| `judge` | 복잡한 추론·정확성 (Claude-as-judge 별도 평가) | Input, Expected, Pass, Judge Criteria |

> 전략 태그(`[direct]`, `[rubric]`, `[judge]`)가 없으면 `direct`로 해석한다.
> Rubric은 1-5 정수 척도를 권장한다. 후속 필드가 여러 줄인 Eval Case는 4-space 들여쓰기를 사용한다.

### Eval Case 형식 예시

**`direct` 전략** (기본값 — 전략 태그 생략 가능):
```markdown
- [ ] Eval 1: Input: "<시나리오>" → Expected: "<기대 출력 텍스트 또는 패턴>"
```

**`rubric` 전략:**
```markdown
- [ ] Eval 2 [rubric]: Input: "<시나리오>"
    Criteria: "<평가 기준>"
    Rubric: "1=<나쁜 예 설명>, 5=<좋은 예 설명>"
    Pass: score >= N
```

**`judge` 전략:**
```markdown
- [ ] Eval 3 [judge]: Input: "<시나리오>"
    Expected: "<기대 동작 설명 (비교 기준용)>"
    Judge Criteria: "<judge가 평가할 항목 (예: instruction adherence, factual accuracy)>"
    Pass: judge verdict == ACCEPT
```

### Acceptance 계산 규칙

```markdown
- [ ] Acceptance: N/M eval 통과
```

- Acceptance 라인은 모든 `prompt` Task에 **필수**다. N=M인 경우에도 명시한다.
- M = Eval Case 총 개수; N = 통과 요건 개수 (기본값 N = M)
- N ≠ M이면 명시적 표기 (예: `Acceptance: 2/3 eval 통과`)
- 각 Eval의 Pass 조건이 충족되면 통과로 계산

### `prompt` 타입 전체 예시

```markdown
### [ ] Task N: <프롬프트 파일 개선>
- **Type**: prompt
- **Goal**: ...
- **Work Items**:
  - [ ] ...
- **Completion Criteria**:
  - [ ] Eval 1: Input: "..." → Expected: "..."
  - [ ] Eval 2 [rubric]: Input: "..."
      Criteria: "..."
      Rubric: "1=..., 5=..."
      Pass: score >= 4
  - [ ] Acceptance: 2/2 eval 통과   ← 필수 (N=M인 경우도 명시)
- **Commit**: `feat(agent): ...`
```

## Completion Marker

When a Task is complete, its checkbox is updated:
```
### [ ] Task N  →  ### [x] Task N
```

## Commit Section

Each Task includes a `**Commit**` field describing the commit to create when the Task is complete.

**Format:**
```
- **Commit**: `<type>(<scope>): <subject>`
```

Optional multi-line body (indented under the backtick line):
```
- **Commit**: `feat(command): add /dev:docs command`
  ```
  Separates reference doc generation from /dev:done.
  Entry gate: review:in-progress. Completion: docs:generated.
  ```
```

**Validation** (performed by `plan-review`, warning level only — not blocking):
- `type` must be one of: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- `scope` should match an entry in `.harness/commit-scopes.md` (free-form also accepted)
- `subject` must be 72 characters or fewer
- Scope parser regex: `^\|\s*([a-z0-9_-]+)\s*\|` (first column of the Markdown table, excluding `scope` header and separator rows)

**Backward compatibility**: Plans written before the `pr-driven-commit-workflow` topic's Task 4 do not require a `**Commit**` field. `plan-review` skips Commit validation when the field is absent — it is treated as a warning, not a failure.

## Key Constraints

- Each Task must be independently executable and committable
- Completion Criteria must be verifiable (runnable command, observable output, or checkable file)
- Task ordering must respect dependency relationships
- Tasks must not implement anything outside the spec scope
- `**Commit**` field is expected (not enforced) for plans written after the `pr-driven-commit-workflow` topic's Task 4; `plan-review` validates it at warning level only
