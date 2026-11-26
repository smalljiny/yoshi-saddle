# Contract: Review Report

- **Producer**: Claude `/flow-review` command
- **Consumers**: `/flow-done` (archive), user (review history)

## File Naming

```
docs/_local/active/<topic>/review-report-<YYMMDDHHmmss>.md
```

Timestamp format matches sibling contracts (`spec-review`, `plan-review`): 2-digit year, `YYMMDDHHmmss`.

The latest review report is determined by descending filename sort.

## Required Format

```markdown
# Review Report

- topic: <topic>
- timestamp: <YYMMDDHHmmss>
- baseBranch: <baseBranch>

## Reviewers

| reviewer | status | skipReason |
|---|---|---|
| code-reviewer | run \| skipped | — |
| security-reviewer | run \| skipped | — |
| adversarial-review | run \| skipped | <reason or —> |

## Code Review
<raw code-reviewer output>

## Security Review
<raw security-reviewer output>

## Adversarial Review
<raw companion stdout or "skipped: <skipReason>">

## Resolution

| issue | severity | reviewer | status |
|---|---|---|---|
| <one-line issue summary (80 characters or fewer)> | CRITICAL \| HIGH \| MEDIUM \| LOW | <reviewer> | fixed \| deferred |
```

## Field Definitions

### Reviewers Table

| Field | Value | Description |
|---|---|---|
| `reviewer` | `code-reviewer` \| `security-reviewer` \| `adversarial-review` | Reviewer identifier |
| `status` | `run` \| `skipped` | Execution state |
| `skipReason` | string or `—` | Required when skipped; `—` when run |

### Resolution Table

| Field | Value | Description |
|---|---|---|
| `issue` | string | One-line summary of the original issue, 80 characters or fewer |
| `severity` | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` | Severity assigned in the review |
| `reviewer` | Reviewer identifier | Source of the issue |
| `status` | `fixed` \| `deferred` | Resolution outcome |

Exclude issues without an explicit severity (such as adversarial-review design challenges) from the Resolution table.
Those items remain in the raw `## Adversarial Review` section.

## Resolution Algorithm

1. In `/flow-review` Step 3 (Transition), capture `SAVED_SHA = git rev-parse HEAD`
2. After the review-fix commits are done, execute `git log <SAVED_SHA>..HEAD --oneline`
3. New commits **exist** → CRITICAL, HIGH: `fixed`; MEDIUM, LOW: `deferred`
4. **No** new commits → every issue: `deferred`

## Skip Reasons

| skipReason | Condition | Warning |
|---|---|---|
| `disabled` | `config.review.adversarial_enabled` unset or `false` | None (normal opt-out) |
| `codex unavailable` | `config.codex.available=false` | Printed |
| `codex not authenticated` | `config.codex.authenticated=false` | Printed |
| `companion not found` | Failed to resolve the companion script path (cache directory missing or containment check failed) | Printed |
| `companion exited non-zero` | Companion exited with a non-zero exit code | Printed |

## State Transition Responsibility

`/flow-review` Step 3 (Transition) already moves the workflow state to `review:in-progress`, so writing the report (Step 9) makes no further state transition.

## Example

```markdown
# Review Report

- topic: my-feature
- timestamp: 260417143022
- baseBranch: main

## Reviewers

| reviewer | status | skipReason |
|---|---|---|
| code-reviewer | run | — |
| security-reviewer | run | — |
| adversarial-review | skipped | disabled |

## Code Review
**CRITICAL**: `auth.ts:42` — The JWT secret is hardcoded. Move it to an environment variable.
**MEDIUM**: `utils.ts:15` — The function name does not describe its behavior.

## Security Review
**HIGH**: `api.ts:88` — Input is inserted into a SQL query without validation.

## Adversarial Review
skipped: disabled

## Resolution

| issue | severity | reviewer | status |
|---|---|---|---|
| Hardcoded JWT secret (auth.ts:42) | CRITICAL | code-reviewer | fixed |
| Missing SQL input validation (api.ts:88) | HIGH | security-reviewer | fixed |
| Unclear function name (utils.ts:15) | MEDIUM | code-reviewer | deferred |
```
