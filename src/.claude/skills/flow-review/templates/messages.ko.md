## GATE_FAILED

```text
/flow-review를 실행할 수 없습니다.
현재 상태: {phase}:{status}
impl:in-progress 상태여야 합니다.
```

## IMPL_UNFINISHED

```text
/flow-review를 실행할 수 없습니다.
구현이 완료되지 않았습니다.
미완료 항목이 남아 있습니다: {unchecked_ids}
먼저 /flow-impl로 모든 Story와 nested Task를 완료하세요.
```

## REVIEW_COMPLETE

```text
Review complete

CRITICAL: {critical}
HIGH: {high}
MEDIUM: {medium}
LOW: {low}

adversarial-review: {adversarial}
보고서: docs/_local/active/{topic}/review-report-{timestamp}.md

Next: pass the verification gate with /flow-verify
```

## ADVERSARIAL_RUN

```text
run
```

## ADVERSARIAL_SKIPPED

```text
skipped ({skip_reason})
```
