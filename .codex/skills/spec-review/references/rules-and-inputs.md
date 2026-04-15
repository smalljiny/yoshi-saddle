# Rules and Inputs

## Rules to load

Load and apply where relevant:
- `.claude/rules/common/coding-style.md`
- `.claude/rules/common/security.md`
- `.claude/rules/common/development-workflow.md`

## Primary context source

Use `docs/_local/dev-context.json` first.

Expected shape:

```json
{
  "current_topic": "<topic-name>",
  "topics": {
    "<topic-name>": {
      "phase": "spec",
      "spec": "docs/_local/tmp/<topic-name>/spec.md",
      "specConfirmed": false,
      "specReview": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

Resolve:
- spec path → `topics[current_topic].spec`
- report path → `<dirname(spec)>/review-<yymmddhhmmss>.md`
  (yymmddhhmmss = current local datetime at review time, e.g. `review-260415143022.md`)

After review:
- Write the report to `<dirname(spec)>/review-<yymmddhhmmss>.md`
- Update `topics[current_topic].specReview` with that report path
- Do NOT set `specConfirmed` — that field is set by `/dev:spec` after the user accepts the review

## Fallback required inputs

If `dev-context.json` is missing or incomplete, collect:
- Spec path (e.g. `docs/_local/tmp/my-feature/spec.md`)

If the spec path cannot be resolved, ask before proceeding.

## Suggested evidence sources

- The spec document itself (read in full)
- `docs/_local/dev-context.json`
- Related spec or design documents referenced in the spec's "관련 문서" section, if present
