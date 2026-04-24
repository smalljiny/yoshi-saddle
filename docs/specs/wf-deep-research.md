# wf-deep-research 스킬

> MCP 설정 없이 skill-registry search-adapter를 오케스트레이션하는 심층 연구 워크플로우 스킬. 6단계 ECC 연구 프로세스를 유지하면서 firecrawl/exa MCP 의존성을 skill-registry 기반 어댑터 탐색으로 대체한다.

## 개요

`wf-deep-research`는 ECC 원본 `deep-research` 스킬을 하네스 인프라 위에서 재구현한 워크플로우 스킬이다. 원본이 MCP 도구(`firecrawl_search`, `web_search_exa`)를 직접 호출하는 것과 달리, 이 스킬은 skill-registry에서 `[search-adapter]` 태그를 가진 어댑터 스킬을 동적으로 탐색하고, 각 어댑터의 Search Procedure 섹션에 위임하여 HTTP 로직 중복을 제거한다.

결과물은 6단계 인용 포함 리서치 리포트이며, 어댑터가 하나도 없으면 즉시 에러로 중단하고 설치 지침을 제시한다.

## 구조

```
.claude/skills/wf-deep-research/
└── SKILL.md    # 워크플로우 절차 전체 (capabilities: 없음 — direct-load wf- 패턴)
```

### frontmatter 필드

| 필드 | 값 |
|------|----|
| `version` | `1` |
| `name` | `wf-deep-research` |
| `description` | skill-registry search-adapter 기반 심층 연구 워크플로우 |
| `origin` | `harness` |
| `capabilities` | 선언하지 않음 (`wf-*` 패밀리, direct-load 패턴) |

### SKILL.md 섹션 구조

| 섹션 | 내용 |
|------|------|
| `## When to Activate` | 활성화 조건, Prerequisites (API key 환경변수) |
| `## Workflow` | Step 0-6 전체 절차 |
| `## Output Contract` | 리포트 템플릿, 인용 형식, 파일 저장 정책 |
| `## Quality Rules` | 6개 품질 규칙 (ECC 원본 유지) |
| `## Examples` | 활성화 예시 프롬프트 5개 |

## 동작

### Step 0: Adapter Discovery

`.claude/skills/skill-registry/SKILL.md`를 로드하고 `[search-adapter]` 쿼리를 실행한다. 반환된 스킬 목록(name, path, capabilities)을 순회하며 각 SKILL.md를 Read한다.

**어댑터 선택 정책:**

| 발견 어댑터 수 | 동작 |
|--------------|------|
| 0개 | 에러 중단 — 설치 지침 제시 |
| 1개 | 해당 어댑터만 사용 |
| 2개 이상 | 서브-질문마다 모든 어댑터 순차 호출, 결과 합산·중복 제거 |

### Step 3: 병렬성 단위

병렬성 단위는 **서브에이전트**다. 어댑터 호출은 각 서브에이전트 내부에서 순차 실행한다.

| 서브-질문 수 | 실행 방식 |
|-------------|----------|
| ≤ 3 | 메인 세션에서 어댑터별 순차 실행 |
| ≥ 4 또는 넓은 토픽 | 서브에이전트를 그룹별로 병렬 실행 |

서브에이전트 사용 시, 메인 세션이 어댑터 이름 + SKILL.md 경로를 프롬프트에 포함해 전달한다 — 서브에이전트는 skill-registry를 재조회하지 않는다.

### Step 4: Deep-Read

Step 3에서 성공한 어댑터 중 우선순위 1위(`stack-exa` > `stack-firecrawl` > 기타)를 대표 어댑터로 선택한다. 대표 어댑터 실패 시 다음 건강한 어댑터로 폴백한다.

| 어댑터 | Content 오퍼레이션 | 호출 방식 |
|--------|-----------------|----------|
| stack-firecrawl | `/v1/scrape` | 단일 URL — URL마다 반복 |
| stack-exa | `/contents` | JSON 배열 — 전체 URL 일괄 호출 |

### 부분 실패 정책

API 키 누락, HTTP 401/403, HTTP 429(재시도 소진), 네트워크 타임아웃, HTTP 5xx, 응답 파싱 불가 → 해당 어댑터 건너뜀, 나머지로 계속. 모든 어댑터 실패 시 즉시 중단.

실패 경고는 리포트 메타 라인과 Methodology 섹션 양쪽에 표기된다.

### 출력 계약

- **리포트 길이 ≤ 3,000자**: 채팅에 전문 출력
- **리포트 길이 > 3,000자**: `research-<topic>-<YYYYMMDDHHMMSS>.md`로 저장, 채팅에 요약만 출력
- 기본 저장 디렉토리: `./` (`$DEEP_RESEARCH_OUTPUT_DIR`으로 재정의 가능)
- 토픽 새니타이징: `/`, `..`, 특수문자 → `_` 치환

## 제약사항

- MCP 도구와의 폴백/공존 없음 (MCP 사용자는 ECC 원본 `deep-research` 스킬 사용)
- 커스텀 리포트 포맷 옵션 없음 (YAGNI)
- 검색 결과 캐싱 없음
- Claude 내장 WebSearch 도구 지원 없음 (skill-registry 외부)
- `capabilities:` 키 없음 (direct-load 전용, skill-registry 쿼리 대상 아님)

## 관련 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `.claude/skills/skill-registry/SKILL.md` | 어댑터 탐색 인프라 |
| `.claude/skills/stack-exa/SKILL.md` | Exa REST API 어댑터 (`[search-adapter, exa]`) |
| `.claude/skills/stack-firecrawl/SKILL.md` | Firecrawl REST API 어댑터 (`[search-adapter, firecrawl]`) |
| `docs/specs/skill-registry.md` | skill-registry 참조 문서 |
| `docs/specs/stack-exa.md` | stack-exa 참조 문서 |
| `docs/specs/stack-firecrawl.md` | stack-firecrawl 참조 문서 |
