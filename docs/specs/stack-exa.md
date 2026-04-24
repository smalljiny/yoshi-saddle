# stack-exa 스킬

> Exa REST API를 Bash curl로 직접 호출하는 search-adapter 스킬. `skill-registry`의 `[search-adapter, exa]` 태그로 로드되며, MCP 없이 `$EXA_API_KEY` 환경변수만으로 웹 검색·콘텐츠 추출·grounded 답변·유사 페이지 탐색을 수행한다.

## 개요

`stack-exa`는 `skill-registry` 어댑터 패턴 계약을 구현한 두 번째 search-adapter 스킬이다. Claude가 직접 curl 명령을 실행해 Exa API를 호출하므로 MCP 서버 의존성이 없다. `/search`, `/contents`, `/answer`, `/findSimilar` 네 연산을 지원하며, `/search`·`/contents`·`/findSimilar`는 `stack-firecrawl`과 호환되는 공통 스키마(`query / results / source / operation`)로 정규화한다. `/answer`는 citations를 포함하는 별도 Answer 스키마를 사용한다.

Exa의 차별점은 search type 파라미터와 `/answer` endpoint다. `deep`·`deep-reasoning` type은 멀티 에이전트 쿼리 확장을 통해 더 깊은 검색을 수행하며, `/answer`는 검색 결과를 기반으로 LLM이 citations를 포함한 직접 답변을 생성한다.

## 구조

```
.claude/skills/stack-exa/
└── SKILL.md    # 어댑터 절차 정의 (bundled resources 없음)
```

### frontmatter

| 필드 | 값 |
|------|----|
| `version` | `6` |
| `name` | `stack-exa` |
| `origin` | `harness` |
| `capabilities` | `[search-adapter, exa]` |

### 필수 섹션 (어댑터 계약)

| 섹션 | 내용 |
|------|------|
| `## When to Activate` | `$EXA_API_KEY` 설정 여부, skill-registry 쿼리 조건, MCP·SSE 공존 시 비활성화, `/answer`의 search-adapter 계약 범위 명시 |
| `## Search Procedure` | `/search`, `/contents`, `/answer`, `/findSimilar` curl 템플릿 + Security note |
| `## Response Format` | 표준 스키마·Answer 스키마·snippet 우선순위 표·title fallback |
| `## Rate Limits & Error Handling` | API 키 미설정, 401/403, 429 재시도, 5xx, timeout |

## 동작

### 연산별 절차

**`/search`** — 쿼리 기반 웹 검색

- 입력: `QUERY` (필수), `TYPE` (필수, 기본값 없음), `NUM_RESULTS` (선택, 기본값 10)
- `TYPE`이 `deep`·`deep-reasoning`이면 `--max-time 90`, 그 외 `--max-time 30`
- `contents: {text: true, highlights: ..., summary: true}` 를 명시적으로 요청해야 해당 필드가 반환됨
- 응답 필드: `results[].title`, `results[].url`, `results[].highlights[]`, `results[].text`, `results[].summary`

**`/contents`** — URL 목록 → 텍스트 본문 추출

- 입력: `URLS_JSON` (JSON 배열 문자열, 필수). 단일 URL은 배열 1개로 래핑
- `contents: {text: true, highlights: ..., summary: true}` 명시 필요
- 응답 필드: `results[].title`, `results[].url`, `results[].text`, `results[].summary`
- 정규화 `query` 필드에는 `URLS_JSON[0]` (첫 번째 URL)을 사용

**`/answer`** — 검색 + LLM grounded 답변

- 입력: `QUERY` (필수)
- V1 미지원: `outputSchema`, `systemPrompt`
- 응답 필드: `answer`, `citations[].title`, `citations[].url`, `citations[].text`, `citations[].highlights[]`
- **search-adapter 계약 범위 외**: Answer 스키마는 표준 `results[]` 구조와 비호환. 호출자가 Answer 스키마를 명시적으로 처리할 때만 사용

**`/findSimilar`** — 시드 URL 기반 유사 페이지 탐색

- 입력: `SEED_URL` (필수), `NUM_RESULTS` (선택, 기본값 10)
- `contents: {text: true, highlights: ..., summary: true}` 명시 필요
- 응답 필드: `results[].title`, `results[].url`, `results[].highlights[]`, `results[].text`, `results[].summary`
- 정규화 `query` 필드에는 `SEED_URL`을 사용

### 반환 스키마

**표준 스키마** (search / contents / findSimilar):

```json
{
  "query": "<원본 쿼리 또는 시드 URL>",
  "results": [
    { "title": "<제목>", "url": "<URL>", "snippet": "<요약>" }
  ],
  "source": "exa",
  "operation": "search | contents | findSimilar"
}
```

**Answer 스키마** (/answer 전용):

```json
{
  "query": "<원본 쿼리>",
  "answer": "<LLM 생성 답변>",
  "citations": [
    { "title": "<제목>", "url": "<URL>", "snippet": "<인용 요약>" }
  ],
  "source": "exa",
  "operation": "answer"
}
```

### snippet 추출 우선순위

| 연산 | 원시 필드 | 추출 방식 |
|------|-----------|-----------|
| `/search` | `results[].highlights[0]` | 우선; 없으면 `text` 앞 300자 → `summary` |
| `/contents` | `results[].text` | 앞 300자; 없으면 `summary` |
| `/answer` citations | `citations[].text` | 앞 300자; 없으면 `highlights[0]` |
| `/findSimilar` | `results[].highlights[0]` | `/search`와 동일 |

title이 없으면 URL 도메인을 fallback으로 사용한다 (`jq -r '.url | capture("^[a-z]+://(?<host>[^/:]+)").host'`).

### search type 파라미터

호출자가 명시적으로 지정한다. `stack-exa`는 전달된 값을 그대로 API에 넘긴다.

| type | 특성 |
|------|------|
| `instant` | 실시간 최저 레이턴시 (~200ms) |
| `fast` | 속도 최적화 (~450ms) |
| `auto` | neural + keyword 자동 조합 (~1s) |
| `neural` | Exa 임베딩 기반 의미 검색 |
| `keyword` | 전통적 키워드 매칭 |
| `deep` | 쿼리 확장 + 멀티 에이전트 병렬 검색 (4–12s, `--max-time 90`) |
| `deep-reasoning` | LLM 추론 + 멀티 에이전트 병렬 검색 (12–50s, `--max-time 90`) |

### 오류 처리 정책

| 상황 | 처리 |
|------|------|
| `$EXA_API_KEY` 미설정 | 즉시 중단 + 설정 안내 메시지 |
| HTTP 401/403 | 즉시 중단, 인증 실패 메시지 (재시도 없음) |
| HTTP 429 | 지수 백오프(2s, 4s) 최대 3회 재시도 후 에러 전파 |
| HTTP 5xx | 재시도 없이 에러 전파 |
| 네트워크 timeout | `--max-time` 초과 시 에러 반환 (재시도 없음) |

루프 종료 후 `$HTTP_CODE`를 반드시 검사한다: 401/403 → 인증 오류, 5xx → 전파, 2xx → 정상 처리.

## 로드 방법

```
skill-registry에 [search-adapter, exa] 태그로 쿼리하면 이 스킬이 반환된다.
```

직접 로드:

```
Load `.claude/skills/stack-exa/SKILL.md` and follow its process.
```

## 제약사항

- **MCP 도구 코드 없음**: curl 직접 호출만 사용. MCP Exa 환경은 MCP 경로 사용
- **SSE 스트리밍 미지원**: `deep-reasoning` 호출도 동기 응답으로 처리
- **`/answer`는 표준 search-adapter 계약 외**: `results[]` 스키마를 기대하는 제네릭 호출자와 비호환
- **캐싱 없음**: 응답 캐싱은 호출측 커맨드 책임
- **`outputSchema`·`systemPrompt` V1 미지원**: 구조화 답변은 별도 토픽에서 확장
- **contents 필드 opt-in**: `text`, `highlights`, `summary`는 요청 바디에 명시해야 반환됨
