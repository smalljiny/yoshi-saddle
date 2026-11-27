## BACKLOG_MULTIPLE

```text
There are several topics in the backlog. Specify a topic: /flow-spec <topic>
```

## TOPIC_REQUIRED

```text
Specify a topic: /flow-spec <topic>
```

## SPEC_ALREADY_CONFIRMED

```text
The spec is already confirmed.
```

## RESEARCH_NO_ADAPTER

```text
No search-adapter skill is installed, so research is skipped.
```

## RESEARCH_ASK_Q

```text
Run web research on this topic before writing the spec?
```

## RESEARCH_ASK_HEADER

```text
Research
```

## RESEARCH_ASK_YES_LABEL

```text
Yes, run research
```

## RESEARCH_ASK_YES_DESC

```text
Run web research before brainstorming
```

## RESEARCH_ASK_NO_LABEL

```text
No, start brainstorming
```

## RESEARCH_ASK_NO_DESC

```text
Skip research and go straight to brainstorming
```

## RESEARCH_QUERY_Q

```text
Run research with this query? {query}
```

## RESEARCH_QUERY_HEADER

```text
Query
```

## RESEARCH_QUERY_USE_LABEL

```text
Use the proposed query
```

## RESEARCH_QUERY_USE_DESC

```text
Proceed with the generated query
```

## RESEARCH_QUERY_CANCEL_LABEL

```text
Cancel research
```

## RESEARCH_QUERY_CANCEL_DESC

```text
Continue to brainstorming without research
```

## RESEARCH_NO_FILE

```text
There is no research result file, so the work continues without research context.
```

## DRAFT_WRITTEN

```text
The spec draft has been written: docs/_local/backlog/{topic}/spec.md

Run the Codex review:
  codex "run the spec-review skill on docs/_local/backlog/{topic}/spec.md"

When the review is done and a spec-review-*.md file exists, run /flow-spec again.
```

## AUTO_REVIEW_MAX

```text
Auto-review Stopped at attempt 3. Maximum attempts reached.
Continue manually:
  codex "run the spec-review skill on docs/_local/backlog/{topic}/spec.md"
```

## MANUAL_FALLBACK

```text
Codex is not available, so continue manually:
  codex "run the spec-review skill on docs/_local/backlog/{topic}/spec.md"

When the review is done and a spec-review-*.md file exists, run /flow-spec again.
```

## SPEC_CONFIRMED

```text
The spec is confirmed.
  Spec: docs/_local/backlog/{topic}/spec.md
  Review: docs/_local/backlog/{topic}/spec-review-{timestamp}.md
```

## SPLIT_TITLE

```text
# Split Analysis
```

## SPLIT_RECOMMENDATION_LINE

```text
{recommendation} — {reason}
```

## SPLIT_SINGLE

```text
Proceed as a single topic
```

## SPLIT_RECOMMENDED

```text
Split recommended
```

## SUBTOPICS_TITLE

```text
Proposed sub-topics:
```

## SUBTOPIC_ITEM

```text
  {number}. {sub_topic}: {scope}
```

## SPLIT_APPROVE_Q

```text
Approve?
```

## NEXT_PLAN

```text
Next: create the implementation plan with /flow-plan or /flow-plan {topic}.
```
