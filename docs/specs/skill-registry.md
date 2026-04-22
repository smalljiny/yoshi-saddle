# skill-registry 스킬

> Claude 런타임에서 capabilities 기반으로 스킬을 동적으로 탐색·선택할 수 있는 레지스트리 인프라. SKILL.md frontmatter `capabilities:` 필드 규격, Glob/Read 탐색 절차, 어댑터 패턴 계약을 정의한다.

## 개요

`skill-registry`는 커맨드나 스킬이 "어떤 스킬이 이 역할을 할 수 있는가?"를 런타임에 질의할 수 있게 하는 절차 스킬이다. Claude가 Glob 도구로 `.claude/skills/*/SKILL.md` 전체를 탐색하고, 각 파일의 frontmatter에서 `capabilities:` 배열을 읽어, AND 조건으로 필터링한 결과를 반환한다.

하드코딩된 스킬 이름 대신 capability 태그로 의존을 표현하므로, 어떤 스킬이 설치되어 있는지 사전에 알 필요 없이 컨텍스트에 맞는 스킬을 선택할 수 있다.

## 구조

```
.claude/skills/skill-registry/
└── SKILL.md    # 탐색 절차·taxonomy·어댑터 패턴 정의 (bundled resources 없음)
```

### frontmatter 필드

| 필드 | 값 |
|------|----|
| `version` | `1` |
| `name` | `skill-registry` |
| `description` | capability 기반 스킬 탐색이 필요할 때 로드. 스킬 이름을 모를 때, 여러 후보 중 동적 선택이 필요할 때, search-adapter 계약 구현 시 |
| `origin` | `harness` |
| `capabilities` | 선언하지 않음 (meta-* 패밀리, 직접 로딩 패턴) |

### SKILL.md 내부 섹션

| 섹션 | 내용 |
|------|------|
| When to Activate | 로드 조건 및 제외 조건 |
| Discovery Procedure | Glob → Read → AND 필터 → 반환 4단계 |
| Capabilities Field Specification | 필드 규격 및 6개 그룹 taxonomy |
| Missing Capabilities Handling | `capabilities:` 없는 스킬은 조용히 건너뜀 |
| Query Patterns | 3가지 사용 예시 + 다중 매치 동작 설명 |
| Adapter Pattern | search-adapter 계약 (필수 capabilities, 필수 섹션, 최소 반환 포맷) |
| Out of Scope | 우선순위 정책, Node.js 스크립트, deep-research 재설계 등 |

## 동작

### 탐색 절차 (4단계)

1. **Glob**: `.claude/skills/*/SKILL.md` — 설치된 모든 스킬 파일 목록 수집
2. **Read + 파싱**: 각 파일의 YAML frontmatter에서 `name`, `description`, `capabilities` 추출. `capabilities:` 키가 없으면 조용히 건너뜀
3. **AND 필터링**: 쿼리에 포함된 모든 태그가 `capabilities` 배열에 있는 스킬만 선택
4. **반환**: 매칭 스킬의 `name`, `path`, `description`, `capabilities` 목록 출력

### capabilities taxonomy

| 그룹 태그 | 의미 | 설치된 스킬 |
|-----------|------|------------|
| `language-patterns` | 언어/프레임워크 구현 패턴 | stack-python, stack-fastify, stack-backend, stack-frontend, stack-langchain, stack-nextjs, stack-claude-api |
| `testing` | 테스트 전략·도구 | stack-python-test, stack-e2e-testing |
| `database` | DB 쿼리·스키마·마이그레이션 | stack-postgres, stack-db-migrations |
| `analysis` | 정적 분석·의존성 탐색 | stack-knip, stack-dependency-cruiser |
| `deployment` | CI/CD·컨테이너·배포 | stack-deploy, stack-docker |
| `search-adapter` | 외부 검색 API 어댑터 | (미구현 — 별도 토픽) |

### 쿼리 패턴

**단일 매치 쿼리** (프레임워크 특정 태그 포함):
```
[language-patterns, fastify]  → stack-fastify 단독 반환
[analysis, knip]              → stack-knip 단독 반환
[analysis, dependency-cruiser]→ stack-dependency-cruiser 단독 반환
```

**다중 매치 쿼리** (그룹 태그만 사용 시 의도적으로 여러 개 반환):
```
[language-patterns, python]   → stack-python + stack-claude-api (호출측이 선택)
[language-patterns, typescript]→ 6개 스킬 (호출측이 선택)
[search-adapter]              → 설치된 모든 어댑터 반환
```

### Missing Capabilities 처리

`wf-*`, `meta-*`, `learned/` 하위 스킬 등 `capabilities:` 키가 없는 SKILL.md는 **조용히 건너뜀**. 경고나 에러 없이 다음 파일로 진행한다. 이 스킬들은 직접 로딩 패턴을 사용하므로 레지스트리 대상이 아니다.

### 어댑터 패턴 계약

`search-adapter` capability를 선언하는 스킬은 다음 계약을 준수해야 한다:

**필수 capabilities 선언:**
```yaml
capabilities: [search-adapter, <provider-tag>]
```

**필수 SKILL.md 섹션:** `## When to Activate`, `## Search Procedure`, `## Response Format`, `## Rate Limits & Error Handling`

**최소 반환 포맷:**
```
{ query, results: [{ title, url, snippet }], source }
```

`firecrawl-search` 및 `exa-search` 스킬 본체는 **미구현** — 별도 토픽에서 구현 예정.

## stack-* 스킬 capabilities 매핑

| 스킬 | capabilities |
|------|-------------|
| stack-python | `[language-patterns, python]` |
| stack-fastify | `[language-patterns, typescript, fastify]` |
| stack-backend | `[language-patterns, typescript, backend]` |
| stack-frontend | `[language-patterns, typescript, react]` |
| stack-langchain | `[language-patterns, typescript, langchain]` |
| stack-nextjs | `[language-patterns, typescript, nextjs]` |
| stack-claude-api | `[language-patterns, python, typescript, claude-api]` |
| stack-python-test | `[testing, python]` |
| stack-e2e-testing | `[testing, playwright]` |
| stack-postgres | `[database, postgres]` |
| stack-db-migrations | `[database, migrations]` |
| stack-knip | `[analysis, typescript, knip]` |
| stack-dependency-cruiser | `[analysis, typescript, dependency-cruiser]` |
| stack-deploy | `[deployment]` |
| stack-docker | `[deployment, docker]` |

## 제약사항

- **Node.js 스크립트 없음**: 탐색 절차는 Claude가 Glob/Read 도구로 직접 실행한다. `.harness/scripts/registry.js` 같은 스크립트는 구현하지 않음
- **우선순위 정책 없음**: 다중 매치 시 선택 로직은 레지스트리 범위 밖 — 호출측 커맨드가 결정한다
- **firecrawl-search / exa-search 미포함**: 어댑터 패턴 계약만 정의. 실제 어댑터 스킬 본체는 별도 토픽
- **wf-*/meta-* 미적용**: 직접 로딩 패턴을 사용하는 스킬은 capabilities를 선언하지 않으므로 레지스트리 탐색 대상에서 제외됨
