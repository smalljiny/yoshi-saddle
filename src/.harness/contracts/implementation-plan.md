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

Each item in a Story's `**Tasks**:` list follows these rules.

- **Line format**: `- [ ] T<storyN>.<taskM> — <subject>`
  - Example: `- [ ] T1.1 — Update version field in component files`
- **First-line subject rule**: Write the first line as a one-line imperative subject. The subject must be usable unchanged as the `subject` field of the TaskCreate call `/flow-impl` makes when a Story starts.
- **Recommended length**: Keep the subject to 80 characters or fewer.
- **Sub-bullets, code blocks, tables**: Allowed as implementer detail. The Claude Task tool entry receives only the first-line subject; sub-bullets are not carried over.

## Story Type Definitions

> **Story Type ≠ Commit Type.** Story Type allows only the 5 values below (`tdd|config|infra|refactor|prompt`).
> Conventional Commits types (`feat|fix|docs|refactor|test|chore|perf|ci`) are used only in the `**Commit**` field.
> `refactor` appears in both lists but means different things. This section defines the **Story Type** `refactor`.

| Type | When to Use | Triggers |
|------|-------------|----------|
| `tdd` | Add new behavior (RED-GREEN-REFACTOR) | New function, class, or API behavior |
| `config` | Change prompt, document, or configuration files (not executable code) | `.claude/`, `.codex/`, `.harness/`, `docs/`, README, spec relocation, adding/moving/merging skill/command/rule files. **Exception: improving LLM prompt content itself (agent, skill, command, or rule prompt text) is `prompt`; executable code under `scripts/` (`.js`/`.ts`/`.py`, etc.) is `infra`, `refactor`, or `tdd`** |
| `infra` | Scripts and tooling (not business logic) | `scripts/`, CI workflows, deploy scripts |
| `refactor` | Restructure **executable code files (`.ts`/`.js`/`.py`, etc.)** (test coverage exists) | Code file restructuring. **markdown, yaml, and json changes are `config`** |
| `prompt` | Write or improve an LLM prompt + evaluate Eval Cases | Prompt content improvement that needs a PROPOSE→EVAL→REFINE cycle |

## Prompt Task Eval Schema

Completion Criteria format for `prompt` type Stories. A contract shared by planner, plan-review, and prompt-engineer.

### Strategy Selection

| Strategy | When to Apply | Required Fields |
|---|---|---|
| `direct` | Exact text or structure match | Input, Expected |
| `rubric` | Subjective quality (tone, conciseness, adherence) | Input, Criteria, Rubric, Pass |
| `judge` | Complex reasoning or correctness (separate Claude-as-judge evaluation) | Input, Expected, Pass, Judge Criteria |

> When no strategy tag (`[direct]`, `[rubric]`, `[judge]`) is present, interpret the Eval Case as `direct`.
> Recommended: a 1-5 integer scale for Rubric. Indent continuation fields of a multi-line Eval Case with 4 spaces.

### Eval Case Format Examples

**`direct` strategy** (default — the strategy tag may be omitted):
```markdown
- [ ] Eval 1: Input: "<scenario>" → Expected: "<expected output text or pattern>"
```

**`rubric` strategy:**
```markdown
- [ ] Eval 2 [rubric]: Input: "<scenario>"
    Criteria: "<evaluation criteria>"
    Rubric: "1=<description of a poor result>, 5=<description of a good result>"
    Pass: score >= N
```

**`judge` strategy:**
```markdown
- [ ] Eval 3 [judge]: Input: "<scenario>"
    Expected: "<expected behavior description (comparison baseline)>"
    Judge Criteria: "<items the judge evaluates (e.g. instruction adherence, factual accuracy)>"
    Pass: judge verdict == ACCEPT
```

### Acceptance Calculation Rules

```markdown
- [ ] Acceptance: N/M eval 통과
```

- The Acceptance line is **required** in every `prompt` Story. Write it even when N=M.
- M = total number of Eval Cases; N = number required to pass (default N = M)
- When N ≠ M, state it explicitly (e.g. `Acceptance: 2/3 eval 통과`)
- An Eval counts as passed when its Pass condition is met

### Full `prompt` Type Example

```markdown
### [ ] Story N: <improve prompt file>
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
  - [ ] Acceptance: 2/2 eval 통과   ← required (write it even when N=M)
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
