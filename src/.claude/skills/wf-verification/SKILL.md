---
version: 5
name: wf-verification
description: Pass code quality gates in sequence before a PR or after feature completion. Used with the /flow-verify command.
origin: harness
category: dev-process
---

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/wf-verification/templates/messages.<lang>.md` for the chosen language and `.claude/skills/wf-verification/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, print exactly `[missing message: <ID>]` in its place (or `[missing catalog: <path>]` when the `en` file is missing) instead of composing replacement wording, and continue.

## When to Activate

- When running the `/flow-verify` command
- Before opening a PR
- When a feature implementation is deemed complete
- For local pre-check of CI/CD pipeline

## Verification Gate Sequence

Gates run in order. If any gate fails, do not proceed to the next.

```
[1] build → [2] type-check → [3] lint → [4] test → [5] security
```

### Gate 1: Build

```bash
pnpm build
```

On failure: call the `build-error-resolver` agent. Immediately before the delegation, run `node .harness/scripts/lang.js resolve --kind=conversation`, `--kind=docs`, and `--kind=commit`; for each dimension, if the resolve exits non-zero or its stdout is not exactly `ko` or `en`, use `en`. Put `Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>` as the first line of the delegation prompt.

### Gate 2: Type Check

```bash
pnpm tsc --noEmit
```

On failure: call the `build-error-resolver` agent. Immediately before the delegation, run `node .harness/scripts/lang.js resolve --kind=conversation`, `--kind=docs`, and `--kind=commit`; for each dimension, if the resolve exits non-zero or its stdout is not exactly `ko` or `en`, use `en`. Put `Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>` as the first line of the delegation prompt.

Do not bypass with `any` types. Resolve the root cause.

### Gate 3: Lint

```bash
pnpm lint
```

Fix auto-fixable errors first:
```bash
pnpm lint --fix
```

### Gate 4: Tests and Coverage

```bash
pnpm test
pnpm test:coverage
```

- All tests must pass
- Coverage must be 80% or higher

If coverage is below threshold: add missing tests and re-run

### Gate 5: Security Scan

```bash
pnpm audit
```

If CRITICAL or HIGH vulnerabilities are found: call the `security-reviewer` agent. Immediately before the delegation, run `node .harness/scripts/lang.js resolve --kind=conversation`, `--kind=docs`, and `--kind=commit`; for each dimension, if the resolve exits non-zero or its stdout is not exactly `ko` or `en`, use `en`. Put `Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>` as the first line of the delegation prompt.

## Output Format

Report in this order: {{msg:RESULTS_TITLE}}; one line per gate that ran, in gate order — {{msg:GATE_PASSED}} or {{msg:GATE_FAILED}} (`{gate}` is the gate name padded with spaces to 12 characters: `build`, `type-check`, `lint`, `test`, `security`; `{detail}` is {{msg:COVERAGE_DETAIL}} for `test`, {{msg:VULN_DETAIL}} for `security`, and empty for the others); then {{msg:RESULTS_RULE}}.

- All gates passed: end with {{msg:ALL_PASSED}}.
- A gate failed (stop at that gate): output {{msg:ERRORS_TITLE}}, then each error as an indented line (`  <file>:<line> - <message>`, copied from the tool output), a blank line, and — when the gate delegates to `build-error-resolver` — {{msg:CALLING_RESOLVER}}.

## Principles

1. **Respect the order**: run build → type → lint → test → security in sequence
2. **No bypassing**: do not ignore or skip gate failures
3. **Resolve root causes**: do not suppress with `any` types or `eslint-disable` comments
4. **PR only after full pass**: open a PR only when all gates have passed
