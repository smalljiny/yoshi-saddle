---
version: 2
description: Generate and run Playwright E2E tests for a target flow. Loads stack-e2e-testing skill. Independent of /dev:verify.
category: dev-workflow
---

# /dev:e2e

Generate and run Playwright E2E tests for a specific user flow or feature.

> **Non-goal**: This command is not part of the `/dev:verify` gate. It runs independently and is invoked selectively — not required for every PR.

## Usage

```
/dev:e2e <flow-name>
```

**Examples:**
```
/dev:e2e login
/dev:e2e checkout
/dev:e2e market-search
```

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask which flow or feature to test before proceeding.

## Execution Flow

### 1. Identify Target Flow

Read `$ARGUMENTS` to determine the target flow or feature name.

If no argument was provided, use `AskUserQuestion` to ask "어떤 플로우 또는 기능에 대한 E2E 테스트를 작성할까요?" with options such as:
- login (Recommended) — 로그인 플로우
- checkout — 결제/구매 플로우
- 직접 입력 — 다른 플로우 이름 입력

### 2. Load E2E Skill

Load `.claude/skills/stack-e2e-testing/SKILL.md` and follow its process.

Apply the skill's patterns to the target flow: POM creation, Test Structure, and file-naming convention (see skill sections for details).

### 3. Run Tests

```bash
npx playwright test tests/e2e/<feature>/<flow>.spec.ts
```

For full suite:
```bash
npx playwright test
```

### 4. Report Results and Artifacts

After test run, summarize:
- Pass / Fail count
- Flaky test detection (if `--repeat-each` was used)
- Artifact locations:
  - HTML Report: `playwright-report/index.html`
  - Screenshots: `artifacts/*.png` (on failure)
  - Videos: `artifacts/videos/*.webm` (on failure)
  - Traces: `artifacts/*.zip` (on first retry)

## Next Steps

- If tests **fail**: refer to the Flaky Test Patterns section in `.claude/skills/stack-e2e-testing/SKILL.md` for diagnosis and fixes (quarantine, wait strategies, race condition patterns).
- If tests **pass**: E2E runs independently — resume your current topic workflow as appropriate.
- To add CI/CD integration: see the CI/CD Integration section in the skill.
