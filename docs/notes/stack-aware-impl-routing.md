# Stack 기반 /dev:impl 라우팅 — 잔여 갭

> 작성일: 2026-05-04
> 선행 문서: `docs/notes/adaptive-impl-routing.md`, `docs/notes/adaptive-impl-routing-analysis.md` (2026-04-26)
> 목적: 두 선행 문서에서 이미 구현된 항목을 제외하고, 여전히 살아 있는 미구현 제안만 단일 문서로 통합한다.

---

## 배경

선행 두 문서는 모노 레포 환경에서 `/dev:impl`이 Task Type만으로 분기해 stack 특화 지식이 구현·리뷰에 반영되지 않는 문제를 제기했다. 이후 일부 제안은 실제로 구현됐다:

**구현 완료 (이 문서에서 다루지 않음):**
- `prompt` Task Type 추가 (`implementation-plan.md` 계약)
- Prompt Task Eval Schema (direct / rubric / judge 3전략)
- `prompt-engineer` 에이전트
- `stack-prompt` 스킬 (선행 문서의 `wf-prompt-eval` 구상이 다른 이름·카테고리로 실현됨)
- `refactor` → `refactor-cleaner` 에이전트 매핑
- plan-review의 `prompt` 타입 인식 + Eval Case 검증
- `simplify` 스킬을 `tdd` 타입에만 적용하는 정책

**여전히 미구현 (이 문서의 범위):**
- `Stack` 필드 (Task 블록)
- `Stack` 기반 skill-registry 동적 호출 (Routing Step)
- 리뷰어 다층 라우팅 (database / security 조건부)
- planner의 Stack 작성 지침 + 보안 태그 감지 규칙
- plan-review의 Stack 필드 검증

---

## 핵심 설계 원칙 (재확인)

```
Task Type  → 에이전트 선택  (WHO implements / reviews)
Stack Tags → 스킬 선택      (WHAT knowledge to apply)
```

두 축이 독립적으로 동작하고 조합된다. 현재 코드베이스는 Type 축만 작동한다.

---

## 잔여 갭 1 — `Stack` 필드 (Task 블록 계약)

### 현황

`.harness/contracts/implementation-plan.md` Task 블록에 `Stack` 필드 없음. planner는 Stack을 출력하지 않고 impl.md는 파싱하지 않는다.

### 변경안

`.harness/contracts/implementation-plan.md` Task 블록 형식에 optional 필드 추가:

```markdown
### [ ] Task N: <title>
- **Type**: tdd | config | infra | refactor | prompt
- **Stack**: <tag1>, <tag2>            ← NEW (optional)
- **Goal**: ...
- **Work Items**: ...
- **Completion Criteria**: ...
- **Commit**: `<type>(<scope>): <subject>`
```

규칙:
- 값: `.claude/skills/skill-registry/SKILL.md` Taxonomy 표의 specific tag (kebab-case)
- 콤마 구분, 언어·프레임워크·DB·도메인을 단일 필드에 통합
- 선언 없으면 Routing 전체 스킵 (graceful fallback, 현재 동작 유지)

규모: 소 (20~30줄 추가)

---

## 잔여 갭 2 — planner.md Stack 작성 지침 + 보안 태그 감지

### 현황

`.claude/agents/planner.md`에 `prompt` 타입 작성 지침(Step 4.5)은 있으나 Stack 필드 작성 지침과 보안 태그 감지 규칙이 없다.

### 변경안

Step 4.5 옆에 Step 4.6 신규 (또는 Step 4.5 내부에 통합):

```markdown
### 4.6. Stack 필드 결정 (선택)

Task가 특정 언어·프레임워크·DB를 사용한다면 Stack 필드를 추가한다.

- 사용 가능한 태그: `.claude/skills/skill-registry/SKILL.md` Taxonomy 표의 specific tag
- 예: typescript, fastify, postgres, claude-api, python, react, langchain
- 태그가 없거나 범용 Task면 Stack 생략

**보안 태그 감지 규칙** — 아래 패턴을 다루는 Task에는 Stack에 보안 관련 태그를 포함시킨다:
- 인증/인가 로직 → auth, oauth, jwt, session
- 결제 → payment, stripe
- 암호화 → crypto, encryption

**`prompt` 타입 추가 규칙**: Stack에 반드시 `claude-api` 포함.
```

규모: 소 (30~40줄 추가)

---

## 잔여 갭 3 — impl.md Routing Step (skill-registry 동적 호출)

### 현황

`.claude/commands/dev/impl.md`는 Stack 파싱 / skill-registry 호출 / 리뷰어 동적 선택 로직 없음. 현재 흐름:

```
Step 2 (Task 파싱) → Step 3 (브리핑) → Step 4 (상태 전환) → Step 5 (에이전트) → Step 6 (code-reviewer 고정)
```

### 변경안

Step 3 (브리핑) 이후, Step 4 (상태 전환) 이전에 Step 3.7 신규 삽입 (Step 3.5는 advisor 분기로 이미 사용 중이므로 번호 충돌 회피):

```markdown
### 3.7. Routing Step (Stack 기반 스킬·리뷰어 결정)

**Stack 태그 파싱:**
Task의 `Stack` 필드 값을 읽는다. 필드가 없거나 비어 있으면 이 단계 전체 스킵 (기존 동작 유지).

**skill-registry를 통한 스킬 로드:**
Load `.claude/skills/skill-registry/SKILL.md` and follow its Discovery Procedure.

- `[language-patterns, <lang/framework-tag>]` 쿼리 → 구현 컨텍스트 스킬
- `[database, <db-tag>]` 쿼리 → DB 패턴 스킬
- `[testing, <test-tag>]` 쿼리 → 테스트 패턴 스킬 (tdd 타입)
- 매칭된 SKILL.md를 구현 및 리뷰 컨텍스트로 로드

**리뷰어 사전 결정:**

1차 (도메인, 항상 1개):
- Stack에 `postgres`, `mysql`, `sqlite`, `redis`, `mongodb` 포함 → `database-reviewer`
- 그 외 → `code-reviewer`

2차 (보안, 조건부 병렬 추가):
- Stack에 `auth`, `oauth`, `jwt`, `session`, `payment`, `crypto`, `encryption` 포함 → `security-reviewer` 추가
- 또는 Task Type = `infra` → `security-reviewer` 추가
```

Step 6 (code-reviewer 호출)은 Step 3.7에서 결정한 1차/2차 리뷰어로 분기 호출하도록 수정:

```markdown
### 6. 자동 리뷰

Step 3.7에서 결정한 리뷰어를 실행한다.

- 1차 리뷰어 (항상): code-reviewer 또는 database-reviewer
  → 로드된 stack-* 스킬을 컨텍스트로 주입
- 2차 리뷰어 (조건부, 병렬): security-reviewer

`tdd` 타입은 1차 리뷰 직후 simplify 스킬 추가 실행 (기존 정책 유지).
`prompt` 타입에서 1차 리뷰어는 comment-only (기존 정책 유지).
```

> 참고: `/dev:review` 단계의 전체 범위 보안 리뷰는 그대로 유지. 이번 변경은 Task 범위 한정 보안 체크.

규모: 중 (80~120줄 변경)

---

## 잔여 갭 4 — plan-review Stack 필드 검증

### 현황

`.codex/skills/plan-review/references/checklist-template.md` 체크리스트 #5 "Task 타입 정확성"에 `prompt` 타입 검증은 추가됐으나 Stack 필드 검증은 없다.

### 변경안

체크리스트 #5에 Stack 필드 검증 블록 추가 (warning level, NOT READY 아님):

```markdown
- [ ] 5. Task 타입 정확성 / Stack 필드 일관성

  ... (기존 prompt 검증 유지) ...

  Stack 필드 검증 (모든 타입 공통, NOT READY 아님):
  - 선언된 태그가 skill-registry Taxonomy에 없으면 → NOTE
  - `prompt` 타입인데 Stack에 `claude-api` 미포함 → NOTE
  - Stack 필드가 부재한 Task는 검증 스킵 (backward-compatible)
```

규모: 소 (15~20줄 추가)

---

## 결정 사항 (선행 분석 문서에서 계승)

### 결정 1 — Stack 태그 어휘(taxonomy) 권위 출처

`.claude/skills/skill-registry/SKILL.md`의 Taxonomy 표를 단일 권위로 삼는다. 별도 `stack-tags.md` 파일은 만들지 않는다.

### 결정 2 — Stack 필드 없는 기존 Task 호환성

Stack 필드 없으면 Routing Step 전체 스킵, 현재 동작 유지. plan-review는 Stack 부재를 검증 스킵 처리 (NOTE도 발생시키지 않음).

### 결정 3 — `/dev:verify` 범위

`/dev:verify`는 코드베이스 전체 검증 단계. 이번 변경 범위 밖.

---

## 변경 불필요 (확인됨)

| 구성요소 | 이유 |
|---------|------|
| `skill-registry/SKILL.md` | Discovery 절차 완비, 변경 없이 호출 가능 |
| 모든 `stack-*` 스킬 | capabilities 이미 전부 선언됨 (분석 시점 17개 → 현재도 동일) |
| `prompt-engineer`, `refactor-cleaner` | 이미 존재 + impl.md에서 호출 중 |
| `code-reviewer`, `database-reviewer`, `security-reviewer` | Stack 컨텍스트 주입 받으면 자동 활용 |
| `tdd-specialist` | 단기 변경 불요. Python 등 비-TS Stack tdd Task에서 컨텍스트 충돌이 실제로 관찰되면 그때 언어 중립화 |
| `/dev:plan`, `/dev:review`, `/dev:verify`, `/dev:done`, `/dev:docs` | 영향 없음 |
| `wf-tdd`, `stack-prompt` | 변경 없음 |

---

## 구현 순서 (의존 관계 기준)

```
Phase 1 — 계약 먼저
  1. .harness/contracts/implementation-plan.md
     → Task 블록에 Stack 필드 추가 (optional)

Phase 2 — 병렬 가능 (Phase 1 완료 후)
  2a. .claude/agents/planner.md
      → Step 4.6: Stack 작성 지침 + 보안 태그 감지 + claude-api 강제
  2b. .codex/skills/plan-review/references/checklist-template.md
      → 체크리스트 #5에 Stack 필드 검증 (warning level)

Phase 3 — Phase 1·2 완료 후
  3. .claude/commands/dev/impl.md
     → Step 3.7 Routing Step 신규
     → Step 6 리뷰어 분기 호출
```

---

## 규모 추정

| 항목 | 파일 수 | 예상 변경량 |
|------|--------|------------|
| 계약 (필수 1) | 1 | ~25줄 |
| planner (필수 2) | 1 | ~35줄 |
| impl (필수 3) | 1 | ~100줄 |
| plan-review (필수 4) | 1 | ~18줄 |
| **합계** | **4** | **~180줄** |

선행 분석 문서가 추정한 ~490줄에서 prompt 관련 구현분(~310줄)이 빠져 약 180줄 규모로 축소됐다. 단일 스펙 토픽으로 무리 없는 범위. Task 4~5개 예상.

---

## 미결 사항 (Open Questions)

1. **Routing Step 번호** — Step 3.5는 이미 advisor 분기에 사용 중. Step 3.7로 둘지, 4.5로 옮길지, 4 (상태 전환) 이후로 둘지 결정 필요. 본 문서는 잠정 3.7로 표기.
2. **리뷰어 동시 실행 결과 통합** — database-reviewer + security-reviewer 병렬 실행 시 결과 보고 형식. impl.md Step 6 출력 포맷 정의 필요.
3. **Stack 태그 alias** — 동일 개념을 가리키는 표기 흔들림(예: `nextjs` vs `next-js`)을 plan-review가 어떻게 normalize 할지. 단순 일치만 검증할지 alias 표를 둘지.
4. **시범 검증 시나리오** — 구현 후 다음 5개 케이스로 동작 확인:
   - Stack: typescript, fastify → stack-fastify 로드
   - Stack: typescript, postgres, jwt → database-reviewer + security-reviewer 병렬
   - Stack: claude-api (prompt 타입) → stack-prompt 로드 (직접 로드 패턴 유지)
   - Type: infra (Stack 없음) → security-reviewer 추가만 적용
   - Stack 필드 없음 (기존 Task) → Routing 전체 스킵
