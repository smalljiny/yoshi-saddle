## STATE_NOT_SUPPORTED

```text
adapter-codex-review cannot run in the current state ({phase}:{status}).
spec-review: switch to spec:reviewing in /flow-spec, then run it.
plan-review: switch to plan:reviewing in /flow-plan, then run it.
```

## CODEX_UNAVAILABLE

```text
Codex not available or not authenticated — adapter-codex-review cannot proceed.
```

## MANUAL_FALLBACK

```text
# Interactive Codex session (manual review, not automated)
codex "run the spec-review skill on {spec_path}"
# or
codex "run the plan-review skill"
```
