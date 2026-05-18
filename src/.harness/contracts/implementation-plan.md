# Contract: Implementation Plan Document

- **Producer**: Claude planner agent (invoked by `/flow-plan`)
- **Consumer**: Codex `plan-review` skill (validates against spec), Claude `/flow-impl` (executes Stories)

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

## Story List

### [ ] Story 1: <title>
- **Type**: tdd | config | infra | refactor | prompt
- **Goal**: [What this Story achieves — one sentence]
- **Tasks**:
  - [ ] T1.1 — <imperative subject for first task>
    - <optional sub-bullet for implementer detail>
  - [ ] T1.2 — <imperative subject for second task>
- **Completion Criteria**:
  - [ ] Verifiable criterion 1
  - [ ] Verifiable criterion 2
- **Commit**: `<type>(<scope>): <subject>`
  ```
  [optional body line 1]
  [optional body line 2]
  ```

### [ ] Story 2: <title>
...
```

## Task Line Format

각 Story 내부의 `**Tasks**:` 목록 항목은 다음 규칙을 따른다.

- **라인 형식**: `- [ ] T<storyN>.<taskM> — <subject>`
  - 예: `- [ ] T1.1 — Update version field in component files`
- **first-line subject 규칙**: 첫 줄은 한 줄 명령형 subject로 작성한다. 이 subject는 `/flow-impl`이 Story 시작 시점에 호출하는 TaskCreate의 `subject` 필드로 그대로 입력 가능해야 한다.
- **권장 길이**: subject는 80자 이내.
- **sub-bullet·코드 블록·표**: 구현자 디테일로 허용된다. 단, Claude Task 도구의 entry에는 first-line subject만 반영되며 sub-bullet은 반영되지 않는다.

## Story Type Definitions

| Type | When to Use |
|------|-------------|
| `tdd` | New behavior that requires tests (RED-GREEN-REFACTOR cycle) |
| `config` | Configuration file changes, documentation, skill/command files |
| `infra` | Infrastructure, scripts, tooling — not business logic |
| `refactor` | Restructuring existing code with existing test coverage |
| `prompt` | LLM prompt authoring and validation via PROPOSE→EVAL→REFINE cycle |

## Prompt Task Eval Schema

`prompt` 타입 Story의 Completion Criteria 형식. planner·plan-review·prompt-engineer가 공유하는 계약.

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

- Acceptance 라인은 모든 `prompt` Story에 **필수**다. N=M인 경우에도 명시한다.
- M = Eval Case 총 개수; N = 통과 요건 개수 (기본값 N = M)
- N ≠ M이면 명시적 표기 (예: `Acceptance: 2/3 eval 통과`)
- 각 Eval의 Pass 조건이 충족되면 통과로 계산

### `prompt` 타입 전체 예시

```markdown
### [ ] Story N: <프롬프트 파일 개선>
- **Type**: prompt
- **Goal**: ...
- **Tasks**:
  - [ ] TN.1 — <imperative subject>
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

When a Story is complete, its checkbox is updated:
```
### [ ] Story N  →  ### [x] Story N
```

## Commit Section

Each Story includes a `**Commit**` field describing the commit to create when the Story is complete.

**Format:**
```
- **Commit**: `<type>(<scope>): <subject>`
```

Optional multi-line body (indented under the backtick line):
```
- **Commit**: `feat(command): add /flow-docs command`
  ```
  Separates reference doc generation from /flow-done.
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

- Each Story must be independently executable and committable
- Completion Criteria must be verifiable (runnable command, observable output, or checkable file)
- Story ordering must respect dependency relationships
- Stories must not implement anything outside the spec scope
- `**Commit**` field is expected (not enforced) for plans written after the `pr-driven-commit-workflow` topic's Task 4; `plan-review` validates it at warning level only
