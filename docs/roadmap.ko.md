---
version: 6
---

# 하네스 로드맵

하네스에 예정된 추가 및 개선 사항을 추적한다. 별도 표기가 없으면 `docs/research/ecc-analysis.md`에서 도출된 항목이다.

**상태 표기**: `[ ]` 대기 · `[~]` 진행 중 · `[x]` 완료 · `[-]` 건너뜀

---

## Phase 1 — 핵심 개선

일상적인 개발 워크플로우를 직접 향상시키는 ROI 높은 항목.

### 에이전트

| 상태 | 파일 | 설명 |
|------|------|------|
| `[x]` | `agents/harness-optimizer.md` | 하네스 건강도 7개 카테고리 점수 측정; 상위 3개 개선 항목 제시 |
| `[ ]` | `agents/code-explorer.md` | 계획 전 코드베이스 매핑; 중복 구현 방지 |

### 규칙

| 상태 | 파일 | 설명 |
|------|------|------|
| `[x]` | `rules/common/performance.md` | 모델 선택 전략 (Haiku/Sonnet/Opus) 및 context window 관리 |

### 명령어

| 상태 | 파일 | 설명 |
|------|------|------|
| `[x]` | `commands/harness/audit.md` | harness-audit.js 실행; 점수 건강 보고서 출력 |
| `[ ]` | `commands/dev/quality-gate.md` | task 중간 포맷/린트/타입 빠른 체크; `/dev:verify`보다 가벼움 |

---

## Phase 2 — 품질 및 관찰 가능성

코드 품질 피드백 루프와 긴 세션 안정성 개선.

### 에이전트

| 상태 | 파일 | 설명 |
|------|------|------|
| `[ ]` | `agents/code-simplifier.md` | 명확성 중심 리팩토링; refactor-cleaner 보완 |
| `[ ]` | `agents/docs-lookup.md` | Context7 MCP 문서 조회; 오래된 API 사용 방지 |

### 스킬

| 상태 | 파일 | 설명 |
|------|------|------|
| `[x]` | `skills/continuous-learning/SKILL.md` | `/harness:learn`용 패턴 추출 안내; skills/learned/ 품질 필터 |
| `[ ]` | `skills/skill-creator/SKILL.md` | 새 스킬을 일관되게 작성하기 위한 메타 가이드 |
| `[x]` | `skills/strategic-compact/SKILL.md` | 긴 세션에서 안전한 compaction 지점 정의 |

### 명령어

| 상태 | 파일 | 설명 |
|------|------|------|
| `[x]` | `commands/dev/checkpoint.md` | 세션 중간 상태 스냅샷; 안전한 롤백 참조 지점 |
| `[ ]` | `commands/dev/test-coverage.md` | 커버리지 공백 분석; 80% 달성을 위한 테스트 스텁 생성 |
| `[ ]` | `commands/dev/update-docs.md` | 리뷰 후 문서 드리프트 감지; 목표한 업데이트 제안 |

---

## Phase 3 — 확장 기능

우선순위 낮음; 필요할 때 추가.

### 에이전트

| 상태 | 파일 | 설명 |
|------|------|------|
| `[ ]` | `agents/comment-analyzer.md` | 주석 정확성 및 오래됨 감사; TODO/FIXME 부채 추적 |

### 언어 규칙 (온디맨드)

| 상태 | 파일 | 추가 조건 |
|------|------|---------|
| `[ ]` | `rules/python/` | Python 프로젝트가 하네스를 사용할 때 |
| `[ ]` | `rules/golang/` | Go 프로젝트가 하네스를 사용할 때 |
| `[ ]` | `rules/kotlin/` | Kotlin/Android 프로젝트가 하네스를 사용할 때 |

---

## 완료

| 파일 | 날짜 | 비고 |
|------|------|------|
| `agents/harness-optimizer.md` + `commands/harness/audit.md` + `scripts/harness-audit.js` | 2026-04-15 | ECC에서 이식; 7개 카테고리 28개 항목 검사 |
| `rules/common/performance.md` | 2026-04-15 | 모델 선택 근거 + context window 관리 지침 |
| `skills/strategic-compact/` + `scripts/hooks/suggest-compact.js` | 2026-04-15 | compaction 결정 테이블 + 50회 호출 임계값 훅 |
| `commands/dev/checkpoint.md` | 2026-04-15 | git SHA + 테스트 결과를 포함한 이름 있는 상태 스냅샷 |
| `skills/continuous-learning/` | 2026-04-15 | /harness:learn용 패턴 추출 품질 기준 |

---

## 건너뜀

| 컴포넌트 | 이유 |
|---------|------|
| `agents/loop-operator.md` | 자율 루프 관리 — 일반 기능 개발 범위 벗어남 |
| `agents/chief-of-staff.md` | 이메일/Slack 트리아주 — 하네스 범위 벗어남 |
| `skills/bun-runtime/` | Bun 도입이 필요할 때 추가 |
| `/eval` 명령어 | AI 출력 평가 파이프라인 — 일반 워크플로우 도구 아님 |
