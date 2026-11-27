## STATE_NOT_SUPPORTED

```text
현재 상태 ({phase}:{status})에서 adapter-codex-review를 실행할 수 없습니다.
spec-review: /flow-spec에서 spec:reviewing 상태로 전환 후 실행하세요.
plan-review: /flow-plan에서 plan:reviewing 상태로 전환 후 실행하세요.
```

## CODEX_UNAVAILABLE

```text
Codex를 쓸 수 없거나 인증되지 않았습니다 — adapter-codex-review를 진행할 수 없습니다.
```

## MANUAL_FALLBACK

```text
# Interactive Codex session (manual review, not automated)
codex "spec-review 스킬로 {spec_path}를 리뷰해줘"
# or
codex "plan-review 스킬을 실행해줘"
```
