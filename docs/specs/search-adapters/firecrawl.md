# stack-firecrawl 스킬

> Firecrawl REST API v1을 Bash curl로 직접 호출하는 search-adapter 스킬. `skill-registry`의 `[search-adapter, firecrawl]` 태그로 로드되며, MCP 없이 `$FIRECRAWL_API_KEY` 환경변수만으로 웹 검색·스크래핑·크롤링을 수행한다.

## 개요

`stack-firecrawl`은 `skill-registry` 어댑터 패턴 계약을 구현한 첫 번째 search-adapter 스킬이다. Claude가 직접 curl 명령을 실행해 Firecrawl API를 호출하므로 MCP 서버 의존성이 없다. `/v1/search`, `/v1/scrape`, `/v1/crawl` 세 연산을 지원하며, 모든 결과를 공통 스키마(`query / results / source / operation`)로 정규화한다.

## 구조

```
.claude/skills/stack-firecrawl/
└── SKILL.md    # 어댑터 절차 정의 (bundled resources 없음)
```

### frontmatter

| 필드 | 값 |
|------|----|
| `version` | `2` |
| `name` | `stack-firecrawl` |
| `origin` | `harness` |
| `capabilities` | `[search-adapter, firecrawl]` |

### 필수 섹션 (어댑터 계약)

| 섹션 | 내용 |
|------|------|
| `## When to Activate` | `$FIRECRAWL_API_KEY` 설정 여부, skill-registry 쿼리 조건, MCP 공존 시 비활성화 |
| `## Search Procedure` | `/v1/search`, `/v1/scrape`, `/v1/crawl` curl 템플릿 |
| `## Response Format` | 공통 스키마 + snippet 매핑 규칙 + title fallback |
| `## Rate Limits & Error Handling` | API 키 미설정, 429 재시도, 401/403, timeout, 폴링 실패 |

## 동작

### 연산별 절차

**`/v1/search`** — 키워드 기반 웹 검색

- 입력: `QUERY` (필수), `LIMIT` (선택, 기본값 10)
- jq `--arg`/`--argjson`으로 사용자 입력을 안전하게 JSON 직렬화 후 curl 전달
- 응답 필드: `data[].title`, `data[].url`, `data[].description`

**`/v1/scrape`** — 단일 URL 마크다운 추출

- 입력: `URL` (필수), `FORMATS_JSON` (선택, 기본값 `["markdown"]`)
- 응답 필드: `data.metadata.title`, `data.metadata.sourceURL`, `data.markdown`

**`/v1/crawl`** — 다중 페이지 크롤 (2단계)

- Step 1: POST로 잡 시작 → `JOB_ID` 추출 (HTTP 상태 코드 가드 포함)
- Step 2: 10초 간격, 최대 5회 폴링 (GET `/v1/crawl/<job-id>`)
- 폴링 루프에서 401/403 즉시 종료, 429 재시도, 5xx 일시 오류 처리, invalid JSON 가드 적용
- 5회 내 미완료: `data` 비어 있지 않으면 partial 반환, 비어 있으면 timeout 에러

### 반환 스키마

```json
{
  "query": "<원본 쿼리 또는 URL>",
  "results": [
    { "title": "<제목>", "url": "<URL>", "snippet": "<요약>" }
  ],
  "source": "firecrawl",
  "operation": "search | scrape | crawl"
}
```

crawl 폴링 결과에는 `"status": "completed" | "partial" | "timeout"` 필드가 추가된다.

### snippet 매핑 규칙

| 연산 | 원시 필드 | 추출 방식 |
|------|-----------|-----------|
| `/search` | `data[].description` | 그대로 사용 |
| `/scrape` | `data.markdown` | 앞 300자 |
| `/crawl` | `data[].metadata.description` 또는 `data[].markdown` | description 우선, 없으면 markdown 앞 300자 |

title이 없으면 URL의 도메인(호스트)을 fallback으로 사용한다.

### 오류 처리 정책

| 상황 | 처리 |
|------|------|
| `$FIRECRAWL_API_KEY` 미설정 | 즉시 중단 + 안내 메시지 |
| HTTP 429 | 지수 백오프(2s, 4s) 최대 3회 재시도 후 에러 전파 |
| HTTP 401/403 | 즉시 에러 전파 (재시도 없음) |
| 네트워크 timeout | `--max-time 30` 초과 시 에러 반환 (재시도 없음) |
| crawl 폴링 5회 실패 | partial(data 있음) 또는 timeout 에러(data 없음) |

## 로드 방법

```
skill-registry에 [search-adapter, firecrawl] 태그로 쿼리하면 이 스킬이 반환된다.
```

직접 로드:

```
Load `.claude/skills/stack-firecrawl/SKILL.md` and follow its process.
```

## 제약사항

- **v1 API 고정**: `https://api.firecrawl.dev/v1/` 대상. v2 전환은 별도 변경
- **MCP 도구 코드 없음**: curl 직접 호출만 사용. MCP 환경은 기존 deep-research 경로 사용
- **Batch API / Map API 미포함**: 단순 search·scrape·crawl에 집중
- **캐싱 없음**: 응답 캐싱은 호출측 커맨드 책임
- **crawl 예산**: 5회 폴링 × 10초 = 최대 50초. 대규모 사이트는 partial 결과가 반환될 수 있음
