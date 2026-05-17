# Plan-review Story 타입 오분류 반복 패턴 분석

**작성일**: 2026-05-10
**작성 맥락**: `docs-specs-restructure` 토픽의 `/dev:plan` 세션에서 plan-review가 Gate 5(Story 타입 정확성)에서 `refactor → config` 정정을 반복 요구한 패턴 분석.
**관련 산출물**:
- `docs/_local/active/docs-specs-restructure/implementation-plan.md`
- `docs/_local/active/docs-specs-restructure/plan-review-260510210801.md` (1차 NOT READY)
- `docs/_local/active/docs-specs-restructure/plan-review-260510211420.md` (2차 NOT READY)
- `docs/_local/active/docs-specs-restructure/plan-review-260510211939.md` (3차 NOT READY)
- `docs/_local/active/docs-specs-restructure/plan-review-260510212527.md` (4차 NOT READY)
- `docs/_local/active/docs-specs-restructure/plan-review-260510213010.md` (5차 READY WITH NOTE)

## 요약

`docs-specs-restructure` 토픽의 plan-review 1차 결과에서 5개 Story 모두 `refactor` 타입으로 작성되어 Gate 5 FAIL이 발생했고, 수정 후에도 후속 차수에서 다른 게이트로 NOT READY가 이어져 총 5회의 review 루프가 발생했다. 본 노트는 1차 NOT READY의 직접 원인이었던 **Story 타입 오분류** 패턴에 한정해 다층 원인을 정리한다.

핵심 결론: **/dev:plan 워크플로우에서 planner에 전달한 호출 프롬프트의 한 문장**이 가장 직접적 원인이지만, 그 문장이 없었어도 contract·planner·plan-review 측 구조적 결함(아래 #2~#6) 때문에 다른 토픽에서 동일 패턴이 재발할 가능성이 높다.

## 원인 1 — 호출 프롬프트의 직접 편향 (1차 원인, 가장 결정적)

`/dev:plan` 실행 중 메인 세션이 planner agent에 전달한 호출 프롬프트에 다음 문장이 포함되었다:

```
- Use Story types from the contract: `tdd | config | infra | refactor`
  (this topic is mostly `refactor` and `infra`).
```

두 가지 오류가 동시에 발생했다.

1. **`prompt` 타입 누락** — contract는 5종(`tdd | config | infra | refactor | prompt`)이지만 4종으로만 listing
2. **`(this topic is mostly refactor and infra)` 사전 판단 강제 주입** — planner가 contract 정의를 자체 해석하기 전에 결론을 받음

planner는 신뢰성 있는 호출자의 힌트를 contract 정의보다 우선하는 경향이 있어, 이 한 문장이 5개 Story 모두 `refactor`로 가는 직접 원인이 되었다.

본 세션 한정으로 보면 이 한 문장의 제거만으로도 1차 NOT READY를 회피할 가능성이 매우 높다. 그러나 다른 토픽에서 같은 실수가 재발할 가능성은 #2 이하의 구조적 결함이 결정한다.

## 원인 2 — Story Type ↔ Commit Type 동음이의어 (구조적 모호성)

| 개념 | 정의 위치 | `refactor` 포함? |
|------|----------|-----------------|
| **Story Type** | `.harness/contracts/implementation-plan.md` (5종) | 예 |
| **Commit Type** (Conventional Commits) | `.claude/agents/planner.md` line 148, `.codex/skills/plan-review/SKILL.md` line 80 (8종) | 예 |

두 개념이 같은 `refactor` 키워드를 공유한다. 더 큰 문제는 본 토픽의 Commit subjects가 모두 `refactor(docs): ...`, `refactor(harness): ...` 형식이라는 점이다 — Commit field에서 `refactor`가 정당하므로 Story Type field도 `refactor`가 자연스럽다는 인지 결합이 발생한다. 이번 plan-review도 게이트 4(Commit format)는 PASS, 게이트 5(Story Type)만 FAIL이라는 분기 형태로 이 결합을 노출했다.

## 원인 3 — Contract type 정의가 doc-restructure를 분명히 식별하지 못함

contract의 type 정의 (`.harness/contracts/implementation-plan.md` Story Type Definitions 섹션):

```
| `config`   | Configuration file changes, documentation, skill/command files |
| `refactor` | Restructuring existing code with existing test coverage         |
```

문제점:

- `config` 정의에 `documentation`이 있지만 "configuration"·"skill/command files" 사이에 묻혀 있음 — 1차 단서로 떠오르지 않음
- `refactor` 정의의 `code`가 markdown을 배제하는지 불분명. 본 프로젝트의 사용자 메모리(`feedback_src_markdown_is_code.md`)와 CLAUDE.md에 "src 프롬프트 마크다운은 자연어 코드"라는 명시적 진술이 있어 **markdown = code** 등식이 강하게 뒷받침됨

즉 본 프로젝트 컨벤션상 "문서 재배치 = code refactoring"이라는 해석이 contract보다 더 우세한 사용자 의도와 부합한다. contract의 글자 그대로의 의미가 본 프로젝트 컨벤션과 충돌한다.

## 원인 4 — 자연어 직관과 contract 간 충돌

본 토픽 spec 본문에는 "재배치"·"재작성"·"재구조화"가 반복 등장하고 토픽명 자체가 `docs-specs-restructure`다. planner가 자연어를 매핑하면 `restructure → refactor`가 가장 가까운 영어 매핑이다. 의미적으로 `restructure`와 `refactor`는 거의 동의어이고, `config`와는 거리가 멀다.

이는 일반적인 영어 직관·Conventional Commits 관습과도 일치한다 — `refactor(docs):` 메시지는 git 커뮤니티에서 흔히 사용된다.

## 원인 5 — planner.md에 doc-restructure 분류 가이드 부재

`.claude/agents/planner.md`에는 Story Type 전체 표를 contract로 위임만 할 뿐, 자주 헷갈리는 케이스에 대한 disambiguation 예시가 없다. 특히 본 하네스가 다루는 빈번한 작업 유형의 분류 가이드가 누락돼 있다:

- spec 재배치 / 디렉토리 재구조화
- skill·command 파일 추가·이동·병합
- README·인덱스 갱신
- 외부 참조 일괄 동기화

이런 케이스에 대해 planner.md가 "이 패턴 = config" 같은 명시 매핑을 제공하지 않아 같은 실수가 반복될 수 있는 구조다.

## 원인 6 — plan-review가 사전 방지가 아닌 사후 검증만 수행

plan-review의 게이트 5("Story 타입 정확성")는 강제적이지만, plan-review SKILL.md 자체에 "documentation restructuring → config" 같은 disambiguation rule이 명시돼 있지 않다. 매번 review LLM이 contract 정의를 다시 해석하고 같은 결론에 도달하는 패턴이라, 결정의 일관성은 있지만 작성 시점 회피 수단이 없다.

결과적으로 NOT READY → 수정 → 재검토의 단순 루프 비용을 매번 지불한다. 본 세션은 1차에서 정정되었지만 후속 review에서 또 다른 게이트(Gate 3 mkdir, Gate 8 src/, Gate 1 디렉토리 노드 등)가 차례로 fail하면서 총 5회의 review 비용이 발생했다.

## 추가 — 1차 NOT READY 후 동일 결함을 그대로 둠

1차 review가 게이트 5에서 fail한 직후, 메인 세션은 plan 파일의 type만 고치고 통과시켰다. 동일 실수를 다음 토픽에서 반복하지 않으려면 **planner.md 또는 contract 측 보강**이 동시에 필요했지만 그 단계는 건너뛰었다 — 본 세션의 단발 fix에 그쳤다.

이는 self-debug 시점에서 component-level 개선 기회를 놓친 패턴이다. 차후 동일 패턴 발견 시 단발 fix와 함께 component 보강을 동시에 검토할 가치가 있다.

## 권고 보강 지점

본 노트는 분석 한정 산출물이며 구현은 별도 토픽 후보로 분리하는 것을 권한다.

| 보강 대상 | 변경 내용 | 기대 효과 |
|----------|----------|----------|
| `.claude/agents/planner.md` | Story Type disambiguation 표 추가 — "문서 재배치·README 갱신·spec 병합·skill/command 파일 추가/이동 = `config`" 예시 명시 | planner 작성 시점에 doc-restructure 케이스를 `config`로 분류하도록 유도 |
| `.harness/contracts/implementation-plan.md` | `refactor` 정의를 "production code with associated test files" 등 좁히고, `config`에 "documentation restructuring (file moves, README rewrites, reference updates)" 예시 1줄 추가 | 정의의 글자 그대로의 해석에서 본 프로젝트 컨벤션과 일치 |
| `/dev:plan` 또는 메인 세션 호출 코드 | planner 호출 프롬프트에서 type hint 문장 제거 (`this topic is mostly X and Y` 패턴 금지) | 직접 편향 주입 회피. 본 세션의 1차 원인 차단 |
| `.codex/skills/plan-review/SKILL.md` | 게이트 5 평가 기준에 자주 발생하는 매핑 예시 1~2건 추가 (선택) | review LLM의 일관성 향상 (이미 결과는 일관적이지만 명시화로 추적성 강화) |

## 후속 조치 후보

본 노트의 분석 결과를 입력으로 다음 토픽을 고려할 수 있다:

- `planner-story-type-disambiguation` (가칭) — `planner.md`와 contract의 type 정의 보강
- `dev-plan-prompt-cleanup` (가칭) — `/dev:plan` 호출 시 planner에 전달되는 프롬프트에서 type hint 제거 + planner 자율 해석 신뢰

이 두 토픽은 독립적으로 진행 가능하지만 한 PR로 묶어도 무리 없다.

---

# skill-system-refactor 세션 — Gate 5 핑퐁 오실레이션 + 복합 실패 패턴

**발생일**: 2026-05-15
**작성 맥락**: `skill-system-refactor` 토픽의 `/dev:plan` 자동 리뷰 루프에서 동일 게이트(Gate 5)가 다른 지시로 3차례 fail하는 핑퐁 패턴과, 추가 2개 게이트 실패가 겹쳐 총 3회 NOT READY가 발생한 사례.
**관련 산출물**:
- `docs/_local/active/skill-system-refactor/implementation-plan.md`
- `docs/_local/active/skill-system-refactor/plan-review-260515064650.md` (1차 NOT READY)
- `docs/_local/active/skill-system-refactor/plan-review-260515070927.md` (2차 NOT READY)
- `docs/_local/active/skill-system-refactor/plan-review-260515072129.md` (3차 NOT READY — max_attempts 소진)
- `docs/_local/active/skill-system-refactor/plan-review-260515074113.md` (4차 READY WITH NOTE — 수동 재실행)

## 요약

이번 세션의 실패 패턴은 `docs-specs-restructure` 세션과 달리 **planner의 오분류**가 아니라 **plan-review LLM의 게이트 5 판단 불일치**가 핵심 원인이다. planner가 contract 정의에 부합하는 `config`를 올바르게 선택했음에도 1차 리뷰가 이를 거부하면서 불필요한 타입 전환 루프가 시작되었다.

여기에 Gate 8 범위 초과(2차 미검출 후 3차 검출)와 Gate 4 Completion Criteria 불충분(3차)이 겹쳐 3회 NOT READY가 발생했다. max_attempts(3회) 소진 후 수동 재실행에서 최종 통과했다.

## 실패 연쇄

### 1차 NOT READY (Gate 5 + Gate 6)

**Planner 선택**: flow-* 스킬 12개 신설 Story(2~4)에 `config` 타입 사용 — contract 정의 "skill/command files = config"에 정확히 부합.

**Gate 5 FAIL (잘못된 거부)**: plan-review LLM이 "flow-* 스킬 작성은 행동 변경(behavioral change)이므로 `config`(비실행성 변경)에 맞지 않는다"고 판단. `prompt` 타입 또는 contract 재정합화를 요구함.

**Gate 6 FAIL (유효한 거부)**: Story 2(flow-spec/plan/impl/review 4개), Story 4(보조 5개), Story 9(15개 문서 일괄)가 단일 커밋 단위로 과대함.

**적용 수정**: Story 2를 3개 Story로, Story 4를 2개 Story로, Story 9를 2개 Story로 분리 (10 → 13 Story). 타입은 `config` → `refactor`로 변경 (1차 리뷰 요구에 따름).

### 2차 NOT READY (Gate 5 — 방향 역전)

**Gate 5 FAIL (올바른 거부, 방향 전환)**: plan-review LLM이 이번에는 반대로 "`refactor`는 existing test coverage 하의 구조 재편에 해당하지만 이 Stories는 skill/command 파일 변경이므로 `config`가 맞다"고 판단. 또한 Stories 11-12에서 `docs` 타입을 사용했는데 이는 contract에 없는 타입.

**핵심 모순**: 1차 리뷰는 `config`를 거부했고, 2차 리뷰는 `refactor`를 거부하고 `config`를 요구했다. **동일 plan-review SKILL.md가 Gate 5에서 서로 모순된 판단을 연속 출력한 것이다.**

**적용 수정**: 전체 13개 Story 타입을 `config`로 통일 (planner의 원래 선택으로 복귀).

### 3차 NOT READY (Gate 4 + Gate 8)

**Gate 8 FAIL (범위 초과)**: T2.1(`flow-spec`), T3.1(`flow-impl`), T8.1(`component-boundaries.md`)에 `prompt-authoring.md`의 7가지 규칙 적용 지시 포함 — spec §2~§7 어디에도 문체 정리나 anti-laziness 적용이 없음. 1·2차 리뷰에서는 미검출, 3차에서 처음 검출.

**Gate 4 FAIL (Completion Criteria 불충분)**: Story 1(eval/log rename, cross-reference 0건 미검증), Story 2(adapter 경로 갱신 미검증), Story 3(`simplify` 참조 보존 미검증), Story 6(`branchPattern`·`deploy-harness.sh` 보존 미검증). 해당 항목이 Tasks에는 명시됐지만 Criteria에 반영되지 않음.

**max_attempts 소진**: 이 시점에서 auto-review 3회 한도 초과. 수동 수정(prompt-authoring 제거, Criteria 보강) 후 수동 재실행.

### 4차 READY WITH NOTE (수동 재실행)

Overview의 "flow 스킬 13개" → "12개" 수치 오류 정정 후 `plan:confirmed`.

## 핵심 원인 분류

### 원인 A — plan-review LLM의 Gate 5 판단 불일치 (이번 세션 고유 패턴)

`docs-specs-restructure` 세션은 planner가 `refactor`를 잘못 선택한 것이 원인이었다. 이번 세션은 반대로 planner가 올바르게 `config`를 선택했는데도 plan-review 1차가 거부했다.

Gate 5의 판단 기준이 plan-review SKILL.md에 추상적("타입이 작업 항목과 일치하는지")으로만 정의되어 있어, 실행 LLM이 같은 파일 변경 패턴에 대해 회차별로 다른 해석을 내놓는다. 특히 "behavioral change" 여부에 대한 주관적 판단은 재현성이 낮다.

### 원인 B — `docs` 타입 비계약 사용

Stories 11-12에 `docs` 타입을 사용했는데 이는 Conventional Commits에서는 흔한 타입이지만 implementation-plan contract에는 없다. Contract 허용 타입(`tdd | config | infra | refactor | prompt`)과 git Commit type 목록(`feat | fix | docs | refactor | ...`)이 다르다는 혼동.

### 원인 C — Gate 8 범위 초과의 지연 검출

`prompt-authoring.md` 규칙 적용은 1·2차 리뷰에서 미검출되었다가 3차에서 처음 fail했다. plan-review LLM의 coverage가 회차별로 달라 같은 결함이 뒤늦게 검출되는 패턴은 max_attempts를 소진하는 구조적 비용이다.

### 원인 D — Tasks ↔ Completion Criteria 매핑 누락

Tasks에 명시한 보존 의무(simplify, branchPattern, deploy-harness.sh 등)가 Completion Criteria에 반영되지 않았다. planner agent가 Tasks와 Criteria를 병렬로 작성할 때 "목표 → Tasks → Criteria 1:1 대응" 검증을 자체 수행하지 않는 구조다.

## `docs-specs-restructure` 세션과의 비교

| 항목 | docs-specs-restructure | skill-system-refactor |
|------|------------------------|----------------------|
| Gate 5 실패 방향 | planner 오분류 (`refactor` 선택) | plan-review LLM 오판 (`config` 거부 후 번복) |
| 1차 fail 책임 | planner | plan-review SKILL.md 판단 불일치 |
| 추가 fail 원인 | Gate 3, 8, 1 등 다양 | Gate 8 (범위 초과), Gate 4 (Criteria 불충분) |
| 총 NOT READY 횟수 | 5회 (자동) | 3회 (자동) + 1회 (수동) |
| 최종 수렴 타입 | `config` | `config` |

두 세션 모두 최종적으로 `config`로 수렴했다. `docs-specs-restructure`는 planner가 틀렸고, `skill-system-refactor`는 plan-review가 1차에 틀렸다.

## 권고 보강 지점 (이번 세션 추가분)

| 보강 대상 | 변경 내용 | 기대 효과 |
|----------|----------|----------|
| `.codex/skills/plan-review/SKILL.md` Gate 5 | "skill/command/document 파일 생성·이동·수정은 behavioral change 여부와 무관하게 `config`" 판단 기준 추가 | 회차별 판단 불일치 방지 |
| `.harness/contracts/implementation-plan.md` Story Type | `docs` 타입이 Conventional Commits에 있지만 contract에 없음을 명시 ("git commit type과 Story Type은 별개") | `docs` 비계약 사용 혼동 차단 |
| planner agent 또는 `/dev:plan` 프롬프트 | Tasks 작성 후 "각 Task의 보존 의무·검증 의무가 Completion Criteria에 1:1 반영됐는지" 자체 점검 지시 추가 | Gate 4 Completion Criteria 불충분 예방 |
| plan-review SKILL.md Gate 8 | 실행 내용(prompt authoring, style cleanup 등)이 spec §2 Goals, §4 의사결정, §7 영향 범위 표 중 하나라도 근거가 없으면 범위 초과로 판정하는 체크리스트 추가 | 지연 검출 패턴 조기화 |
