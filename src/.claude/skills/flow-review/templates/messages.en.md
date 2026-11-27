## GATE_FAILED

```text
Cannot run /flow-review.
Current state: {phase}:{status}
The topic must be in impl:in-progress.
```

## IMPL_UNFINISHED

```text
Cannot run /flow-review.
Implementation is not finished.
Unfinished items remain: {unchecked_ids}
Finish every Story and nested Task with /flow-impl first.
```

## REVIEW_COMPLETE

```text
Review complete

CRITICAL: {critical}
HIGH: {high}
MEDIUM: {medium}
LOW: {low}

adversarial-review: {adversarial}
Report: docs/_local/active/{topic}/review-report-{timestamp}.md

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
