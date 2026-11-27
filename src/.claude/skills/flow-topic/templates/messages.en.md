## STATUS_CURRENT

```text
Current topic: {topic}
Phase: {phase}
```

## ACTIVE_TITLE

```text
Active topics:
```

## ACTIVE_CURRENT_LINE

```text
  * {topic} (current) — {phase}
```

## ACTIVE_OTHER_LINE

```text
    {topic} — {phase}
```

## BACKLOG_TITLE

```text
Backlog topics:
```

## BACKLOG_LINE

```text
  - {topic}
```

## NO_ACTIVE

```text
No topic is in progress.
To start a new topic: /flow-spec <topic>
To start implementing from the backlog: /flow-plan <topic>
```

## BACKLOG_TOPIC_HINT

```text
'{name}' is a backlog topic.
To start planning: /flow-plan {name}
```

## TOPIC_NOT_FOUND

```text
Topic '{name}' was not found.
To write its spec: /flow-spec {name}
```

## SWITCHED

```text
The current topic has been switched to '{name}'.
Phase: {phase}
```

## DEPRECATED

```text
⚠ Registering a topic with /flow-topic {name} is no longer supported.
To start writing the spec and register the topic together:
  /flow-spec {name}
```
