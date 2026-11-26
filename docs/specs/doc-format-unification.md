# 문서 형식 단일 원본

> 하네스 산출물의 형식은 `.harness/contracts/*.md`와 `.harness/templates/pr-body.md`에만 정의되고, 산출물을 생성·검사하는 컴포넌트는 형식을 복제하지 않고 원본을 직접 읽는다. 섹션 제목과 체크 항목 이름은 영어로 고정한다.

## 개요

spec·implementation-plan·spec-review·plan-review·review-report·PR 본문은 각각 형식 원본이 하나뿐이다. 원본의 섹션 제목·체크 항목 이름·설명 문장은 영어다. 스킬과 Codex 리뷰 스킬은 문서를 생성하거나 검사하기 직전에 원본을 필수로 읽는다. Codex spec-review는 영어 제목 도입 전에 쓴 한국어 제목 spec도 같은 판정을 받도록 구 제목을 별칭으로 인정한다.

## 구조 / 스키마

### 형식 원본

| 산출물 | 원본 | 생산자 | 소비자 |
|---|---|---|---|
| spec | `.harness/contracts/spec.md` | brainstorming + `/flow-spec` | `/flow-spec` Step 7, Codex `spec-review` |
| implementation-plan | `.harness/contracts/implementation-plan.md` | planner (`/flow-plan`) | Codex `plan-review`, `/flow-impl` |
| spec-review 보고서 | `.harness/contracts/spec-review.md` | Codex `spec-review` | `/flow-spec`, `/flow-plan` |
| plan-review 보고서 | `.harness/contracts/plan-review.md` | Codex `plan-review` | `/flow-impl` |
| review-report | `.harness/contracts/review-report.md` | `/flow-review` | `/flow-done`, 사용자 |
| PR 본문 | `.harness/templates/pr-body.md` | `/flow-pr` | GitHub PR |

contract는 다른 형식 파일을 다시 참조하지 않는다(한 단계 깊이). contract와 `pr-body.md`에는 YAML frontmatter와 `version` 필드가 없다.

### 영어 고정 제목

| 원본 | 제목·항목 이름 |
|---|---|
| spec | `**Status**`·`**Date**`·`**Author**`, `> **Scope**:`, `## 1. Overview`(`### 1.1 Background`·`### 1.2 Purpose`), `## 2. Goals`, `## 3. Architecture` 또는 `## 3. Role Definition`, `## 4. Decisions`(`| Item | Decision | Rationale |`), `## 5. Non-goals`, `## 6. Open Questions`, `## 7. Related Documents`, `## Split Criteria (Mergeable Unit Check)` |
| implementation-plan | `### Strategy Selection`, `### Eval Case Format Examples`, `### Acceptance Calculation Rules`, ``### Full `prompt` Type Example`` |
| spec-review | `1. Clarity of Intent`, `2. Non-goals Defined`, `3. Architecture Sufficient for Planning`, `4. Decision Rationale Documented`, `5. Open Questions Documented`, `6. Internal Consistency`, `7. Implementation Readiness`, `8. Scope Appropriate` |
| plan-review | `1. Goal Coverage`, `2. Non-goals Respected`, `3. Story Independence`, `4. Completion Criteria Verifiable`, `5. Story Type Accuracy`, `6. Story Size Appropriate`, `7. Implementation Order Valid`, `8. No Scope Creep` |
| review-report | `## Resolution`, `### Reviewers Table`, `### Resolution Table`, `## Resolution Algorithm`, `## Skip Reasons` |
| PR 본문 | `## Changes`, `## Purpose`, `## Impact`, `## Testing`, `## Checklist`, `## Reference Docs`, `## Related Issues` |

### 보존 토큰

판정값(`READY`·`READY WITH NOTE`·`NOT READY`), `- Decision:` 줄 형식, 필드 키(`- Spec:`·`- Plan:`·`topic`·`timestamp`·`baseBranch`·`reviewer`·`status`·`skipReason`), `Acceptance: N/M eval 통과`, `Eval N:`·`Input:`·`Expected:` 줄 형식은 바꾸지 않는다. `adapter-codex-review`는 `grep -m1 "^- Decision:"`로 Decision 줄만 파싱하므로 제목·항목 이름 변경의 영향을 받지 않는다.

## 동작

### 필수 읽기

형식 복제본 대신 생성·검사 직전 단계에 다음 문장을 둔다.

```
Read `<contract-path>` and follow its format exactly.
```

| 컴포넌트 | 위치 | 읽는 원본 |
|---|---|---|
| `flow-plan` | `## Plan Document Format` | contract 참조 한 줄만 남김 |
| `flow-review` | Step 9 (보고서 작성) | `review-report.md`. 블록 대신 각 섹션을 채울 값만 산문으로 기술 |
| Codex `spec-review` | `### 2.` 첫 줄 / `### 4.` 보고서 작성 직전 | 입력 `spec.md` / 출력 `spec-review.md` |
| Codex `plan-review` | `### 2.` 첫 줄 / `### 4.` 보고서 작성 직전 | 입력 `implementation-plan.md` / 출력 `plan-review.md` |

Codex 리뷰의 입력 contract 필수 읽기 뒤에는 "Use that contract as the expected structure of the … under review. Do not rewrite the …" 보충 문장이 붙는다. 리뷰어는 입력 문서를 contract 형식으로 고쳐 쓰지 않는다. spec-review는 구 제목·동등 섹션을 `references/checklist-template.md`의 규칙으로 판정하고, contract의 생성 형식으로 판정하지 않는다.

Codex 리뷰의 `references/checklist-template.md`는 항목 이름을 정의하지 않는다. 각 항목은 `- [ ] Check N`과 판정 기준(Evidence)만 가지며, 보고서의 항목 이름은 contract에서 가져온다.

### 구 제목 별칭 (Codex spec-review)

같은 행의 구·신 표기는 같은 섹션으로 인정한다.

| 섹션 | 구 표기 | 새 표기 |
|---|---|---|
| 헤더 필드 | `**상태**`·`**작성일**`·`**작성자**` | `**Status**`·`**Date**`·`**Author**` |
| 1 | `## 1. 개요` | `## 1. Overview` |
| 1.1 | `### 1.1 배경` | `### 1.1 Background` |
| 1.2 | `### 1.2 목적` | `### 1.2 Purpose` |
| 2 | `## 2. 목표` | `## 2. Goals` |
| 3 (code/feature) | `## 3. 아키텍처` | `## 3. Architecture` |
| 3 (workflow/role) | `## 3. 역할 정의` | `## 3. Role Definition` |
| 4 | `## 4. 의사결정` | `## 4. Decisions` |
| 5 | `## 5. 범위 밖 (Non-goals)` | `## 5. Non-goals` |
| 7 | `## 7. 관련 문서` | `## 7. Related Documents` |

`### 1.3 Coupling Rationale`, `## 6. Open Questions`, H1 문서 제목은 별칭·혼용 판단에서 제외한다. `references/rules-and-inputs.md`는 "관련 문서"와 "Related Documents" 섹션을 모두 관련 문서 출처로 인식한다.

### 리뷰 필수 섹션

| 섹션 | 누락 시 | 담당 체크 |
|---|---|---|
| `## 2.` Goals | FAIL | 1. Clarity of Intent |
| `## 5.` Non-goals | FAIL | 2. Non-goals Defined |
| `## 3.` Architecture / Role Definition / 동등한 계획 구조 섹션 | FAIL | 3. Architecture Sufficient for Planning |
| `## 4.` Decisions | FAIL | 4. Decision Rationale Documented |
| `## 6.` Open Questions | FAIL | 5. Open Questions Documented |
| 헤더 필드, `## 1.`, `## 7.` | FAIL 아님 | — |

### 구조 판정 규칙

| 상황 | 판정 |
|---|---|
| 필수 섹션마다 구 또는 신 표기가 정확히 한 번, 모두 같은 표기 | PASS (항목 기준대로) |
| 위와 같으나 섹션마다 구·신 표기가 섞임 | PASS. 혼용을 이유로 NOTE를 남기지 않는다 |
| `## 3.`이 Architecture 계열·Role Definition 계열·동등한 계획 구조 제목 중 하나로 정확히 한 번 | 유효 |
| 같은 리뷰 필수 섹션이 두 번 이상(구·신 별칭 중복, 같은 표기 반복, `## 3.` 섹션 둘 이상) | check 6 FAIL. Required Fixes에 해당 섹션 병합 요구 |
| `## 3.` 번호 제목과 번호 없는 동등 제목(`## 설계`)이 함께 있음 | 중복 아님. check 3이 두 섹션 내용을 함께 판정 |
| 리뷰 필수 섹션이 구·신 어느 표기로도 없음 | 담당 체크 FAIL |
| 헤더 필드·`## 1.`·`## 7.` 누락 | FAIL 아님 |

## 제약사항

- 형식 원본을 고치는 위치는 `src/.harness/`다. 루트 `.harness/`·`.claude/`·`.codex/`는 `bash scripts/deploy-harness.sh`(인자 없음) self-sync로만 갱신한다.
- 스킬 본문의 한국어 사용자 메시지(예: plan-review 경로 불일치 질문)와 그 밖의 한국어 지시문은 영어 고정 대상이 아니다. `plan-review.md` contract의 경로 불일치 인용 메시지도 Codex SKILL.md와 일치시키기 위해 한국어로 남는다.
- `.harness/harness-guide.md`와 `AGENTS.md`의 체크 항목 설명 목록은 사람용 설명이며 항목 이름의 원본이 아니다. 원본은 contract다.
- `planner.md`의 일반 계획 모드(Phase 형식)는 하네스 산출물이 아니므로 contract 복제본으로 보지 않는다.
- 구 제목 별칭은 spec에만 있다. plan은 제목이 이미 영어이고, 리뷰 보고서·PR 본문은 제목을 파싱하는 소비자가 없다.
