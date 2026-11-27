## TOPIC_NOT_IN_BACKLOG

```text
'{topic}'이 backlog에 없습니다.
먼저 /flow-spec {topic}으로 스펙을 작성하세요.
```

## NO_BACKLOG_TOPIC

```text
플랜할 토픽이 없습니다. 먼저 /flow-spec <topic>을 실행하세요.
```

## BACKLOG_LIST_TITLE

```text
백로그 토픽 목록:
```

## BACKLOG_LIST_ITEM

```text
  {number}. {topic}
```

## TOPIC_SELECT_Q

```text
플랜할 토픽 번호를 선택하세요:
```

## GATE_FAILED

```text
플랜을 수립할 수 없습니다.
현재 상태: {phase}:{status}
spec:confirmed 상태여야 합니다.
먼저 /flow-spec {topic}을 실행하여 Codex 리뷰를 통과하세요.
```

## SWITCH_CONFIRM

```text
현재 작업 중인 토픽: {current_topic}
{topic}으로 전환하시겠습니까? (y/n)
```

## SWITCH_DECLINED

```text
plan-review는 current_topic 기준으로 spec을 해석합니다.
{topic}을 plan-review하려면 먼저 current_topic을 전환해야 합니다:
  /flow-topic switch {topic}
전환 후 다시 /flow-plan을 실행하세요.
```

## PLAN_WRITTEN

```text
구현 계획이 작성되었습니다: docs/_local/active/{topic}/implementation-plan.md

Codex plan-review를 실행하세요:
  codex "plan-review 스킬을 실행해줘"

리뷰 완료 후 plan-review-*.md 파일이 생성되면 다시 /flow-plan을 실행하세요.
```

## AUTO_REVIEW_MAX

```text
Auto-review Stopped at attempt 3. Maximum attempts reached.
수동으로 진행하세요:
  codex "plan-review 스킬을 실행해줘"
```

## MANUAL_FALLBACK

```text
Codex를 사용할 수 없어 수동으로 진행하세요:
  codex "plan-review 스킬을 실행해줘"

리뷰 완료 후 plan-review-*.md 파일이 생성되면 다시 /flow-plan을 실행하세요.
```

## PLAN_CONFIRMED_READY

```text
`/flow-impl`을 시작할 수 있습니다.
```
