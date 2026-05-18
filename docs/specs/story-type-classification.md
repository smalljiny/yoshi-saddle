# Story Type Classification

> implementation plan에서 사용하는 Story Type 5종의 정의·분류 규칙·precedence carve-out. 단일 진실 원천은 contract `src/.harness/contracts/implementation-plan.md`이며, 본 문서는 시스템 reference다.

## 개요

planner 에이전트가 작성하는 implementation plan은 각 Story에 5종 중 하나의 `**Type**`을 지정한다. 이 Type 값은 `/flow-impl`이 어느 에이전트를 호출할지(Step 5), `/flow-review`가 어떤 게이트를 적용할지, plan-review가 어떤 검증 규칙을 적용할지(Gate 5)를 결정한다. 분류 모호성은 plan-review NOT READY 핑퐁의 주요 원인이었다 — contract `## Story Type Definitions` 표가 정의 + Triggers + precedence carve-out을 한 곳에 모아 분류 모호성을 차단한다.

Story Type ≠ Commit Type. Story Type은 아래 5종만 허용 (`tdd|config|infra|refactor|prompt`). Conventional Commits 타입(`feat|fix|docs|refactor|test|chore|perf|ci`)은 `**Commit**` 필드에서만 사용한다. `refactor`는 양쪽에 등장하지만 서로 다른 개념이다 — 본 문서는 Story Type의 `refactor`를 다룬다.

## 구조 / 스키마

### 5종 정의 (contract와 동일)

| Type | When to Use | Triggers |
|------|-------------|----------|
| `tdd` | 새 동작 추가 (RED-GREEN-REFACTOR) | 신규 함수·클래스·API 동작 |
| `config` | 프롬프트·문서·설정 파일 변경 (실행 코드 아님) | `.claude/`, `.codex/`, `.harness/`, `docs/`, README, spec 재배치, skill/command/rule 파일 추가·이동·병합. **단, LLM 프롬프트 본문 개선(에이전트·스킬·커맨드·규칙 프롬프트 내용 자체)은 `prompt`; `scripts/` 하위 실행 코드(`.js`/`.ts`/`.py` 등)는 `infra`·`refactor`·`tdd`** |
| `infra` | 스크립트·툴링 (비즈니스 로직 아님) | `scripts/`, CI 워크플로우, deploy 스크립트 |
| `refactor` | **실행 코드 파일 (`.ts`/`.js`/`.py` 등)** 재구조화 (테스트 커버리지 존재) | 코드 파일 재구조화. **markdown·yaml·json 변경은 `config`** |
| `prompt` | LLM 프롬프트 작성/개선 + Eval Case 평가 | 프롬프트 본문 개선 + PROPOSE→EVAL→REFINE 사이클 필요 |

### Precedence carve-out (`config` 행)

`config` 행 Triggers는 디렉토리 prefix(`.claude/`, `.codex/`, `.harness/`)를 포괄적으로 나열한다. 그러나 동일 디렉토리에 (a) LLM 프롬프트 본문(에이전트·스킬·커맨드·규칙)과 (b) 실행 코드(`scripts/` 하위 `.js`/`.ts`/`.py`)가 공존하므로 단순 디렉토리 매칭만으로는 분류가 모호하다. carve-out은 다음 우선순위로 모호성을 해소한다:

- **프롬프트 본문 개선** → `prompt` — `prompt-engineer` 에이전트의 PROPOSE→EVAL→REFINE 사이클과 Acceptance 게이트가 적용되어야 함
- **실행 코드 변경** → `infra`·`refactor`·`tdd` — 실제 동작 변화 유형에 따라 분기
- **그 외 (구조 재배치·문서·non-prompt skill/command/rule 메타데이터 등)** → `config`

`refactor` 행도 대칭 패턴: `markdown·yaml·json` 파일은 실행 코드가 아니므로 `refactor`가 아닌 `config`로 라우팅.

## 동작

### 소비자별 처리

| 소비자 | 역할 | Type 처리 |
|--------|------|----------|
| planner 에이전트 | implementation plan 작성 시 Type 결정 | contract 표 + carve-out을 따라 각 Story Type 결정 |
| plan-review 스킬 (Codex) | Gate 5 (Story 타입 정확성) 검증 | Type이 5종 중 하나인지, 작업 항목과 일치하는지, `prompt`이면 Eval Case 형식 충족하는지 검증 |
| `/flow-impl` | Story 시작 시 Type별 에이전트 라우팅 (Step 5) | `tdd`→tdd-specialist, `prompt`→prompt-engineer, `refactor`→refactor-cleaner, `config`·`infra`→직접 처리 |

### Type별 추가 게이트

- **`prompt`** — Completion Criteria에 Eval Cases와 Acceptance 임계값 필수. plan-review가 Eval Case 형식(direct/rubric/judge)을 검증하고, prompt-engineer가 최대 5회 REFINE 사이클로 Acceptance 통과를 시도.
- **`tdd`** — code-reviewer 직후 `simplify` 스킬 추가 실행 (코드 재사용·효율성·품질 재검토). `config`·`infra`·`refactor`·`prompt` 타입은 simplify 미적용.
- **`config`·`infra`** — `/flow-impl`이 직접 처리. 별도 에이전트 호출 없음.

## 제약사항

- **단일 진실 원천은 contract** — 본 문서는 reference이며, 의미 충돌 시 `src/.harness/contracts/implementation-plan.md`의 `## Story Type Definitions` 표가 우선한다.
- **5종 추가·삭제·이름변경 금지** — 새 분류가 필요하면 contract 변경 토픽을 별도 발의한다. 본 문서나 다른 docs/specs/ 파일에서 임의로 6번째 Type을 도입하지 않는다.
- **Story Type ≠ Commit Type** — `refactor`가 양쪽에 등장하지만 서로 다른 개념이다. Commit Type 8종(`feat|fix|docs|refactor|test|chore|perf|ci`)은 `**Commit**` 필드에서만 사용한다.
- **carve-out 해석 우선순위** — `config` 행 Triggers의 디렉토리 prefix와 carve-out 절이 동시 적용 가능한 경우 carve-out이 우선한다 (e.g., `src/.harness/scripts/dev-context.js`는 `.harness/` 매칭에도 불구하고 `infra`/`refactor`/`tdd`).
- **prompt 타입 판단 기준은 "프롬프트 본문 자체의 개선"** — 단순한 frontmatter 수정·구조 재배치·메타데이터 변경은 프롬프트 본문 개선이 아니므로 `config`로 분류한다. PROPOSE→EVAL→REFINE 사이클이 필요한 본문 품질 개선만 `prompt`다.
