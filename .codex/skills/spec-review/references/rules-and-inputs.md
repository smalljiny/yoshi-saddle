# Rules and Inputs

## Rules to load

Load and apply where relevant:
- `.claude/rules/common/coding-style.md`
- `.claude/rules/common/security.md`
- `.claude/rules/common/development-workflow.md`

## Topic states and input sources

### Backlog topics

Specs in `docs/_local/backlog/` are created by `/dev:spec` and remain in backlog until `/dev:plan` moves them to `active/`. They are not registered in `dev-context.json` topics, but `/dev:spec` writes a temporary `current_spec` field to `dev-context.json` after saving the draft.

Resolve spec path using priority order:

1. **Explicit argument** (preferred) — user provides the path directly
2. **`current_spec` only** — if no explicit path and `current_topic` is NOT set, read `current_spec` from `dev-context.json`
3. **Ambiguous (both `current_spec` and `current_topic` exist)** — ask the user which spec to review; do not silently resolve to the active topic
4. **User prompt** — if none of the above apply, ask for the spec path

Do NOT write to `dev-context.json` for backlog topics — there is no `topics` entry to update.

Report path: `docs/_local/backlog/<topic>/spec-review-<yymmddhhmmss>.md`

### Active topics

Topics in `docs/_local/active/` are registered in `dev-context.json` after `/dev:plan` runs.

Use `docs/_local/dev-context.json` as context source.

Expected shape:

```json
{
  "current_topic": "<topic-name>",
  "topics": {
    "<topic-name>": {
      "phase": "plan",
      "spec": "docs/_local/active/<topic-name>/spec.md",
      "specConfirmed": true,
      "specReview": "docs/_local/active/<topic-name>/spec-review-<yymmddhhmmss>.md",
      "plan": "docs/_local/active/<topic-name>/implementation-plan.md",
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Resolve:
- spec path → `topics[current_topic].spec`
- report path → `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`
  (yymmddhhmmss = current local datetime at review time, e.g. `spec-review-260415143022.md`)

After review of an active topic:
- Write the report to `<dirname(spec)>/spec-review-<yymmddhhmmss>.md`
- Update `topics[current_topic].specReview` with that report path
- Do NOT set `specConfirmed` — that field is set by `/dev:plan` when registering the topic (not by `/dev:spec` — `/dev:spec` writes only the temporary `current_spec` field, not topic registration)

## Fallback required inputs

If the spec path cannot be determined after exhausting all sources:
- For backlog topics: explicit path → `current_spec` field → ask the user
- For active topics: explicit path → `topics[current_topic].spec` → ask the user

## Suggested evidence sources

- The spec document itself (read in full)
- `docs/_local/dev-context.json` (active topics only)
- Related spec or design documents referenced in the spec's "관련 문서" section, if present
