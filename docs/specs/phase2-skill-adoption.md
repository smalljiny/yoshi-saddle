---
last_modified: 2026-04-22
author: @mario
status: Active
---

# Phase 2 스킬 도입

> ECC·SCE에서 검증된 스킬 6개를 추가하고, `/dev:plan` Step 2.5 의존성 분석과 `database-reviewer` `stack-postgres` 연동을 통해 harness의 분석·리뷰 역량을 강화한다.

## 개요

Phase 2 스킬 도입은 Phase 1(네이밍 컨벤션 + 단순 복사)에 이어, 연동 결정이 필요한 항목 5개를 하네스에 통합한다.

신규 스킬 6개를 `.claude/skills/`에 추가하고, 기존 에이전트·커맨드 2개를 수정한다:

1. **stack-claude-api** — Anthropic Claude API 패턴 스킬 추가
2. **stack-postgres** — PostgreSQL 패턴 스킬 추가 + `database-reviewer` 연동
3. **의존성 분석 계층** — `stack-knip` + `stack-dependency-cruiser` 어댑터 + `wf-dependency-analysis` 오케스트레이터 신규 작성, `/dev:plan` Step 2.5에 통합
4. **stack-nextjs** — Next.js 16+/Turbopack 패턴 스킬 추가
5. **ECC Contexts 흡수** — `contexts/review.md` 개선 사항을 `/dev:review`에 반영 (LOW 심각도 추가)

## 스킬 카탈로그

### wf- (워크플로우 오케스트레이터)

| 스킬 | 출처 | 설명 |
|------|------|------|
| `wf-dependency-analysis` | harness (신규 작성) | JS/TS 의존성 분석 워크플로우 오케스트레이터. `package.json` 존재 시 `stack-knip`과 `stack-dependency-cruiser`를 조건부 로드한다. `/dev:plan` Step 2.5에서 자동 실행 |

`wf-` 프리픽스 사용 근거: 이 스킬은 특정 기술 스택의 사용 가이드가 아니라 두 어댑터 스킬을 조건에 따라 로드하는 워크플로우 오케스트레이터다. `wf-tdd`, `wf-verification`과 동일한 분류.

### stack- (기술 스택)

| 스킬 | 출처 | 설명 |
|------|------|------|
| `stack-claude-api` | ECC | Anthropic Claude API 패턴 (Python + TypeScript). Messages API, 스트리밍, Tool Use, Vision, Extended Thinking, Batches, Prompt Caching, Agent SDK |
| `stack-postgres` | ECC | PostgreSQL 패턴 빠른 참조 — 인덱스 치트시트, 데이터 타입, RLS, 커서 페이지네이션, 큐 처리. `database-reviewer` 에이전트와 페어링 |
| `stack-knip` | SCE | JS/TS 미사용 코드 탐지 어댑터 (`pnpm knip`). 미사용 파일·export·npm 의존성 탐지 |
| `stack-dependency-cruiser` | SCE | JS/TS 아키텍처 분석 어댑터 (`pnpm deps:check`). 순환 의존성, 레이어 위반, 고아 모듈 탐지 |
| `stack-nextjs` | ECC | Next.js 16+/Turbopack 패턴 — 증분 번들링, FS 캐싱, 개발 속도 최적화, Turbopack vs webpack 비교 |

## 아키텍처 결정

### 의존성 분석 스킬 계층 (어댑터 + 오케스트레이터 패턴)

```
wf-dependency-analysis (오케스트레이터)
  ├── package.json 존재 시 → stack-knip 로드      (미사용 코드 탐지)
  └── package.json 존재 시 → stack-dependency-cruiser 로드  (아키텍처 검증)
```

`stack-knip`과 `stack-dependency-cruiser`는 도구별 어댑터 스킬이며, `wf-dependency-analysis`는 이 둘을 조율하는 오케스트레이터다. 신규 JS/TS 분석 도구 추가 시 `stack-<tool>` 어댑터 스킬만 작성하고 오케스트레이터에 항목을 추가하면 된다 — 오케스트레이터는 도구별 구현 세부 사항을 모르는 구조를 유지한다.

이 패턴은 ECC `deep-research` 스킬 계층과 동일한 분리 원칙을 따른다.

### stack-postgres + database-reviewer 연동 방식

`database-reviewer` 에이전트(version 3)는 `*.sql`, `migrations/**`, `schema.*` 파일 감지 시 `stack-postgres` 스킬을 자동 로드하도록 `Skill Loading` 섹션이 추가되었다. 스킬이 인덱스·스키마·RLS 패턴 빠른 참조를 제공하고, 에이전트가 심층 검토를 담당한다.

### ECC Contexts 흡수 방식

ECC `contexts/` 3개 파일을 독립 디렉토리로 생성하지 않고, 가장 밀접한 `dev:*` 커맨드에 개선 사항을 흡수한다. `contexts/review.md`에서 LOW 심각도 처리 기준을 추출해 `/dev:review`에 반영했다.

## 커맨드 연동

### /dev:plan — Step 2.5 (version 9)

`backlog → active` 디렉토리 이동 전에 `wf-dependency-analysis` 스킬을 best-effort로 실행한다:

```
프로젝트 루트에 package.json 존재 여부 확인
  → 존재: wf-dependency-analysis 로드 → 결과를 DEPENDENCY_ANALYSIS 변수 보관
  → 실패(도구 미설치 등): DEPENDENCY_ANALYSIS = "dependency analysis skipped: <reason>" 후 계속 진행
  → 미존재: 스킵 (DEPENDENCY_ANALYSIS = 빈 문자열)
```

분석 결과(`DEPENDENCY_ANALYSIS`)는 planner 에이전트에게 전달되어 미사용 코드 제거 및 아키텍처 위반 수정 Task 수립에 활용된다. **실패해도 플랜 수립을 중단하지 않는다 (best-effort).**

### database-reviewer — Skill Loading 섹션 (version 3)

```markdown
## Skill Loading

When reviewing files matching `*.sql`, `migrations/**`, or `schema.*`:
Load `.claude/skills/stack-postgres/SKILL.md` and apply its index/schema/RLS patterns during review.
```

### /dev:review — LOW 심각도 추가 (version 8)

이슈 분류에 LOW 심각도가 추가되었다:

| 심각도 | 처리 방식 |
|--------|----------|
| CRITICAL | 즉시 수정 필수, 수정 전 진행 불가 |
| HIGH | 신속 수정 필요 |
| MEDIUM | 수정 계획 수립 |
| LOW | 정보성 — 블로킹 없음, 수정 제안만 |

CRITICAL·HIGH만 `review-fix commit` 대상이며, MEDIUM·LOW는 `deferred`로 처리 내역에 기록된다.

## 최종 디렉토리 구조

```
.claude/
├── agents/
│   └── database-reviewer.md              (수정: stack-postgres 연동, version 3)
├── commands/dev/
│   ├── plan.md                           (수정: Step 2.5 의존성 분석, version 9)
│   └── review.md                         (수정: LOW 심각도 추가, version 8)
└── skills/
    ├── stack-claude-api/                  (신규)
    │   └── SKILL.md
    ├── stack-postgres/                    (신규)
    │   └── SKILL.md
    ├── stack-nextjs/                      (신규)
    │   └── SKILL.md
    ├── stack-knip/                        (신규)
    │   └── SKILL.md
    ├── stack-dependency-cruiser/          (신규)
    │   └── SKILL.md
    └── wf-dependency-analysis/            (신규)
        └── SKILL.md
```

## 제약사항

- **JS/TS 전용**: `stack-knip`, `stack-dependency-cruiser`, `wf-dependency-analysis` 모두 JS/TS 생태계 도구만 지원한다. Python, Go 등 비JS/TS 프로젝트는 Step 2.5를 건너뛴다.
- **도구 설치 자동화 제외**: knip·dependency-cruiser가 프로젝트에 설치되지 않은 경우 설치를 자동화하지 않는다. 도구 미설치 시 분석을 건너뛰고 이유를 DEPENDENCY_ANALYSIS 변수에 기록한다.
- **skill-registry 미포함**: Phase 4 `skill-registry` 설계는 포함하지 않는다. 의존성 분석 계층은 나중에 skill-registry로 마이그레이션 가능하도록 단순하게 유지한다.
- **커맨드 구조 리팩토링 제외**: ECC context 파일에서 추출한 개선 사항 외의 `dev:*` 커맨드 구조적 변경은 포함하지 않는다.
- **비JS/TS 의존성 분석 도구 제외**: `wf-dependency-analysis`는 JS/TS 외 언어의 의존성 분석 도구를 포함하지 않는다.
