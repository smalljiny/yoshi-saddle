## BACKLOG_MULTIPLE

```text
백로그에 여러 주제가 있습니다. 주제를 지정하세요: /flow-spec <topic>
```

## TOPIC_REQUIRED

```text
주제를 지정하세요: /flow-spec <topic>
```

## SPEC_ALREADY_CONFIRMED

```text
스펙이 이미 확정되었습니다.
```

## RESEARCH_NO_ADAPTER

```text
search-adapter 스킬이 설치되지 않아 리서치를 건너뜁니다.
```

## RESEARCH_ASK_Q

```text
스펙을 쓰기 전에 이 주제로 웹 리서치를 할까요?
```

## RESEARCH_ASK_HEADER

```text
리서치
```

## RESEARCH_ASK_YES_LABEL

```text
예, 리서치 수행
```

## RESEARCH_ASK_YES_DESC

```text
브레인스토밍 전에 웹 리서치를 실행합니다
```

## RESEARCH_ASK_NO_LABEL

```text
아니오, 바로 브레인스토밍
```

## RESEARCH_ASK_NO_DESC

```text
리서치를 건너뛰고 바로 브레인스토밍합니다
```

## RESEARCH_QUERY_Q

```text
이 쿼리로 리서치할까요? {query}
```

## RESEARCH_QUERY_HEADER

```text
리서치 쿼리
```

## RESEARCH_QUERY_USE_LABEL

```text
제안된 쿼리 사용
```

## RESEARCH_QUERY_USE_DESC

```text
생성한 쿼리로 진행합니다
```

## RESEARCH_QUERY_CANCEL_LABEL

```text
리서치 취소
```

## RESEARCH_QUERY_CANCEL_DESC

```text
리서치 없이 브레인스토밍으로 진행합니다
```

## RESEARCH_NO_FILE

```text
리서치 결과 파일이 없어 컨텍스트 없이 진행합니다.
```

## DRAFT_WRITTEN

```text
스펙 초안이 작성되었습니다: docs/_local/backlog/{topic}/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/{topic}/spec.md를 리뷰해줘"

리뷰 완료 후 spec-review-*.md 파일이 생성되면 다시 /flow-spec을 실행하세요.
```

## AUTO_REVIEW_MAX

```text
Auto-review Stopped at attempt 3. Maximum attempts reached.
수동으로 진행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/{topic}/spec.md를 리뷰해줘"
```

## MANUAL_FALLBACK

```text
Codex를 사용할 수 없어 수동으로 진행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/{topic}/spec.md를 리뷰해줘"

리뷰 완료 후 spec-review-*.md 파일이 생성되면 다시 /flow-spec을 실행하세요.
```

## SPEC_CONFIRMED

```text
스펙이 확정되었습니다.
  스펙: docs/_local/backlog/{topic}/spec.md
  리뷰: docs/_local/backlog/{topic}/spec-review-{timestamp}.md
```

## SPLIT_TITLE

```text
# 분할 분석
```

## SPLIT_RECOMMENDATION_LINE

```text
{recommendation} — {reason}
```

## SPLIT_SINGLE

```text
단일 진행
```

## SPLIT_RECOMMENDED

```text
분할 추천
```

## SUBTOPICS_TITLE

```text
제안하는 서브 토픽:
```

## SUBTOPIC_ITEM

```text
  {number}. {sub_topic}: {scope}
```

## SPLIT_APPROVE_Q

```text
승인하시겠습니까?
```

## NEXT_PLAN

```text
다음: /flow-plan 또는 /flow-plan {topic} 으로 구현 계획을 수립하세요.
```
