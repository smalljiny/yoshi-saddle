# Rules and Inputs

## Rules to load

Load and apply where relevant:
- `.claude/rules/common/coding-style.md`
- `.claude/rules/common/security.md`
- `.claude/rules/common/development-workflow.md`

## Topic states and input sources

### Backlog topics

Specs in `docs/_local/backlog/` are **not registered** in `dev-context.json`. They are created by `/dev:spec` and remain in backlog until `/dev:plan` moves them to `active/`.

For backlog reviews, the spec path **must be provided explicitly**:

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
```

Do NOT attempt to read spec path from `dev-context.json` for backlog topics.
Do NOT write to `dev-context.json` for backlog topics — there is no entry to update.

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
- Do NOT set `specConfirmed` — that field is set by `/dev:plan` when registering the topic (not by `/dev:spec`, which does not write to `dev-context.json`)

## Fallback required inputs

If the spec path cannot be determined:
- For backlog topics: always ask for the explicit spec path before proceeding
- For active topics: if `dev-context.json` is missing or `current_topic`/`spec` is absent, ask for the spec path

## Suggested evidence sources

- The spec document itself (read in full)
- `docs/_local/dev-context.json` (active topics only)
- Related spec or design documents referenced in the spec's "관련 문서" section, if present
