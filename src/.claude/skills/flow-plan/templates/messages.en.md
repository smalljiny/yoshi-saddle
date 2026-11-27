## TOPIC_NOT_IN_BACKLOG

```text
'{topic}' is not in the backlog.
Write its spec first with /flow-spec {topic}.
```

## NO_BACKLOG_TOPIC

```text
There is no topic to plan. Run /flow-spec <topic> first.
```

## BACKLOG_LIST_TITLE

```text
Backlog topics:
```

## BACKLOG_LIST_ITEM

```text
  {number}. {topic}
```

## TOPIC_SELECT_Q

```text
Choose the number of the topic to plan:
```

## GATE_FAILED

```text
Cannot create the plan.
Current state: {phase}:{status}
The topic must be in spec:confirmed.
Run /flow-spec {topic} first and pass the Codex review.
```

## SWITCH_CONFIRM

```text
Current topic: {current_topic}
Switch to {topic}? (y/n)
```

## SWITCH_DECLINED

```text
plan-review resolves the spec from current_topic.
To run plan-review for {topic}, switch current_topic first:
  /flow-topic switch {topic}
Then run /flow-plan again.
```

## PLAN_WRITTEN

```text
The implementation plan has been written: docs/_local/active/{topic}/implementation-plan.md

Run the Codex plan-review:
  codex "run the plan-review skill"

When the review is done and a plan-review-*.md file exists, run /flow-plan again.
```

## AUTO_REVIEW_MAX

```text
Auto-review Stopped at attempt 3. Maximum attempts reached.
Continue manually:
  codex "run the plan-review skill"
```

## MANUAL_FALLBACK

```text
Codex is not available, so continue manually:
  codex "run the plan-review skill"

When the review is done and a plan-review-*.md file exists, run /flow-plan again.
```

## PLAN_CONFIRMED_READY

```text
You can start `/flow-impl`.
```
