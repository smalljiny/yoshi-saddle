# adaptive-impl-routing 구현 갭 분석

> 작성일: 2026-04-26
> 기반 문서: `docs/notes/adaptive-impl-routing.md`
> 분석 범위: 현재 하네스 구성요소 전체 대비 구현 갭 심층 분석

---

## 분석 요약

`adaptive-impl-routing.md`의 설계를 실제로 동작하게 만들려면 **4개 필수 변경 + 2개 신규 생성 + 2개 조건부 변경**이 필요하다. `skill-registry`와 모든 `stack-*` 스킬의 `capabilities`는 이미 준비된 상태다.

---

## 현재 상태 스냅샷

### `/dev:impl` Task Type 분기 (현재)

| Type | 에이전트 | 후처리 | 리뷰어 |
|------|---------|--------|--------|
| `tdd` | tdd-specialist | simplify 스킬 | code-reviewer (고정) |
| `config` | 없음 | 없음 | code-reviewer (고정) |
| `infra` | 없음 | 없음 | code-reviewer (고정) |
| `refactor` | 없음 | 없음 | code-reviewer (고정) |

**`Stack` 필드**: 계약 문서에 없음, 파싱 로직 없음.  
**skill-registry 연동**: 없음 (skill-registry는 존재하지만 impl.md가 호출하지 않음).  
**리뷰어 라우팅**: 모든 타입이 code-reviewer로 고정.

### `capabilities` 현황

전체 스킬 30개 중 stack-* 17개 **전부 capabilities 선언 완료**.  
`wf-*`, `meta-*` 스킬은 직접 로드 패턴이라 선언 없음 (정상).

| 스킬 | capabilities |
|------|-------------|
| stack-fastify | language-patterns, typescript, fastify |
| stack-backend | language-patterns, typescript, backend |
| stack-frontend | language-patterns, typescript, react |
| stack-nextjs | language-patterns, typescript, nextjs |
| stack-langchain | language-patterns, typescript, langchain |
| stack-claude-api | language-patterns, python, typescript, claude-api |
| stack-python | language-patterns, python |
| stack-python-test | testing, python |
| stack-postgres | database, postgres |
| stack-db-migrations | database, migrations |
| stack-e2e-testing | testing, playwright |
| stack-docker | deployment, docker |
| stack-deploy | deployment |
| stack-knip | analysis, typescript, knip |
| stack-dependency-cruiser | analysis, typescript, dependency-cruiser |
| stack-exa | search-adapter, exa |
| stack-firecrawl | search-adapter, firecrawl |

→ **skill-registry 조회 인프라 완비. 호출 로직만 없음.**

---

## 차단 조건 해소 (구현 전 결정 필요)

### 결정 1: Stack 태그 어휘(taxonomy) 권위 출처

**문제**: planner가 Task에 Stack 태그를 쓸 때 어떤 태그가 유효한지 정의되지 않으면 임의 태그를 만들어 skill-registry 매칭 실패.

**결정**: `skill-registry/SKILL.md`의 Taxonomy 표를 **단일 권위**로 삼는다.
- planner.md에서 "Stack 태그는 `.claude/skills/skill-registry/SKILL.md` Taxonomy 표의 specific tag를 사용한다"고 명시
- plan-review가 검증 시 같은 표를 참조
- 별도 `stack-tags.md` 파일 불필요

### 결정 2: Stack 필드 없는 기존 Task 호환성

**결정**: Stack 필드 없으면 Routing Step을 전체 스킵, 현재 동작 유지.  
plan-review는 Stack 부재를 NOTE로 처리 (NOT READY 아님).

### 결정 3: `/dev:verify`의 prompt 타입 적응

**결정**: `/dev:verify`는 이번 범위 밖. prompt 타입 Task의 완료 기준은 `/dev:impl` Completion Criteria 검증(Step 7)에서 eval 통과율로 이미 처리됨.  
`/dev:verify`는 코드베이스 전체 검증 단계라 prompt eval과 직접 연관 없음.

---

## 필수 구현 항목

### [필수 1] `.harness/contracts/implementation-plan.md` 수정

**갭**: Task Type에 `prompt` 없음, `Stack` 필드 없음.

**변경 내용:**

1. Task Type 정의 표에 `prompt` 추가:
   ```
   | `prompt` | LLM 프롬프트 작성 및 검증 (PROPOSE-EVAL-REFINE 사이클) |
   ```

2. Task 블록에 `Stack` 필드 추가 (optional):
   ```markdown
   ### [ ] Task N: <title>
   - **Type**: tdd | config | infra | refactor | prompt
   - **Stack**: <tag1>, <tag2>            ← NEW (optional)
   - **Goal**: ...
   ```
   Stack 태그는 `skill-registry/SKILL.md` Taxonomy 표의 specific tag 사용.

3. `prompt` 타입 Completion Criteria 형식 추가:
   ```markdown
   ## prompt 타입 Completion Criteria 형식
   - [ ] Eval 1: Input: "..." → Expected behavior: "..."
   - [ ] Eval 2: Input: "..." → Expected behavior: "..."
   - [ ] Acceptance: N/N eval 통과
   ```

**규모**: 소 (20~30줄 추가)

---

### [필수 2] `.claude/agents/planner.md` 수정

**갭**: Stack 필드 작성 지침 없음, `prompt` 타입 Task 작성법 없음, 보안 태그 감지 규칙 없음.

**변경 내용:**

1. **Stack 필드 작성 지침** (Step 5 Commit 설계 앞에 삽입):
   ```markdown
   ### 4.5. Stack 필드 결정 (선택)
   Task가 특정 언어·프레임워크·DB를 사용한다면 Stack 필드를 추가한다.
   - 사용 가능한 태그: `.claude/skills/skill-registry/SKILL.md` Taxonomy 표의 specific tag
   - 예: typescript, fastify, postgres, claude-api, python, react, langchain
   - 태그가 없거나 범용 Task면 Stack 생략
   ```

2. **보안 태그 감지 규칙**:
   ```markdown
   아래 패턴을 다루는 Task에는 Stack에 보안 관련 태그를 포함시킨다:
   - 인증/인가 로직: + auth, oauth, jwt, session
   - 결제: + payment, stripe
   - 암호화: + crypto, encryption
   ```

3. **`prompt` 타입 작성 지침**:
   ```markdown
   ### prompt 타입 Task
   - Completion Criteria는 반드시 Eval Cases + Acceptance 기준 포함
   - Work Items에 eval 입력/기대 동작 명시
   - Stack에는 반드시 `claude-api` 포함
   ```

**규모**: 소~중 (40~60줄 추가)

---

### [필수 3] `.claude/commands/dev/impl.md` 수정

**갭**: Routing Step 없음, `prompt` 타입 미지원, `refactor` → refactor-cleaner 연결 없음, 리뷰어 고정.

#### 3-a. Step 3.5 신규 삽입 (Routing Step)

브리핑 승인 후, `impl:in-progress` 전환 전에 삽입:

```markdown
### 3.5. Routing Step (Stack 기반 스킬·에이전트·리뷰어 결정)

**Stack 태그 파싱:**
Task의 `Stack` 필드 값을 읽는다.
- 필드 없거나 비어 있으면 이 단계 전체 스킵 (기존 동작 유지).

**skill-registry를 통한 스킬 로드:**
Load `.claude/skills/skill-registry/SKILL.md` and follow its Discovery Procedure.

- language-patterns 조회: Stack에서 language/framework 태그 추출 → `[language-patterns, <tag>]` 쿼리
- database 조회: Stack에서 DB 태그 추출 → `[database, <tag>]` 쿼리
- 매칭된 SKILL.md를 구현 및 리뷰 컨텍스트로 로드

**리뷰어 사전 결정:**
1차(도메인):
  - Stack에 `postgres`, `mysql`, `sqlite`, `redis`, `mongodb` 포함 → `database-reviewer`
  - (기타) → `code-reviewer`

2차(보안, 병렬 추가):
  - Stack에 `auth`, `oauth`, `jwt`, `session`, `payment`, `crypto`, `encryption` 포함 → `security-reviewer` 추가
  - Task Type = `infra` → `security-reviewer` 추가

**에이전트 사전 결정:**
| Type | Agent |
|------|-------|
| `tdd` | tdd-specialist |
| `prompt` | prompt-engineer |
| `refactor` | refactor-cleaner |
| `config`, `infra` | 없음 (직접 처리) |
```

#### 3-b. Step 5 수정 (에이전트 분기 확장)

```markdown
### 5. 에이전트 실행

Step 3.5에서 결정한 에이전트를 실행한다:

**Type: `tdd`** → tdd-specialist (기존)
  - 로드된 stack-* 스킬을 컨텍스트로 주입
  - wf-tdd 사이클 준수

**Type: `prompt`** → prompt-engineer
  - Load `.claude/agents/prompt-engineer.md`
  - Completion Criteria의 Eval Cases 전달
  - PROPOSE→EVAL→REFINE 사이클 실행

**Type: `refactor`** → refactor-cleaner
  - 커버리지 확인 후 리팩터 (기존 로직을 에이전트 위임으로 변경)

**Type: `config`, `infra`** → 직접 처리 (기존)
```

#### 3-c. Step 6 수정 (리뷰어 다층 라우팅)

```markdown
### 6. 코드 리뷰

Step 3.5에서 결정한 리뷰어를 실행한다.

1차 리뷰어 (항상 실행):
  database-reviewer 또는 code-reviewer (Step 3.5 결정)
  → 로드된 stack-* 스킬을 리뷰 컨텍스트로 주입

2차 리뷰어 (조건부 병렬 추가):
  security-reviewer (Step 3.5에서 trigger 조건 충족 시)

tdd 타입: code-review 완료 직후 simplify 스킬 추가 실행 (기존)
prompt/refactor 타입: simplify 미적용
```

#### 3-d. Key Principles 업데이트

- `refactor` 타입 refactor-cleaner 자동 호출 추가
- `prompt` 타입 prompt-engineer 추가
- 리뷰어 다층 라우팅 원칙 추가
- Stack 필드 optional + graceful fallback 명시

**규모**: 중~대 (100~150줄 변경)

---

### [필수 4] `.codex/skills/plan-review/SKILL.md` 수정

**갭 (차단 조건)**: 체크리스트 #5 "Task 타입 정확성"이 `tdd|config|infra|refactor`만 인식. `prompt` 타입 Task는 자동으로 FAIL 판정 → plan:confirmed 도달 불가.

**변경 내용:**

1. Task Type 유효 목록에 `prompt` 추가
2. `prompt` 타입 전용 추가 검증 규칙:
   - Completion Criteria에 Eval Cases + Acceptance 기준 포함 여부 (미포함 시 NOTE)
   - Stack에 `claude-api` 태그 포함 여부 (미포함 시 NOTE)
3. Stack 필드 검증 (warning level, NOT READY 아님):
   - 선언된 태그가 skill-registry Taxonomy에 있는지 확인
   - 없으면 NOTE

**규모**: 소 (30~40줄 추가)

---

## 신규 생성 항목

### [신규 1] `.claude/agents/prompt-engineer.md`

**역할**: `prompt` 타입 Task 전담 에이전트. PROPOSE→EVAL→REFINE 사이클.

**설계:**

```yaml
---
version: 1
name: prompt-engineer
description: LLM prompt engineering specialist. Invoked by /dev:impl for prompt type Tasks.
             Implements the PROPOSE→EVAL→REFINE cycle using eval cases from Task Completion Criteria.
tools: Read, Write, Edit, Bash, Grep
model: opus
color: purple
---
```

**핵심 워크플로우:**

```
1. Task 읽기
   - Goal, Work Items, Completion Criteria (Eval Cases + Acceptance 기준)
   - 사용 컨텍스트: 로드된 stack-claude-api 스킬

2. PROPOSE: 프롬프트 초안 작성
   - system prompt, user prompt template 초안
   - 판단 기준: Goal, Eval Case 입력 패턴 분석

3. EVAL: Eval Cases 검증
   - 각 Eval Case에 대해 프롬프트 적용 결과 예측 또는 실제 API 호출
   - 통과/실패 판정 (기대 동작 대비)
   - Acceptance 기준(N/N) 대비 현황 집계

4. REFINE (실패 시):
   - 실패 케이스 패턴 분석
   - 프롬프트 수정 (지시사항 명확화, 예시 추가, 제약 조건 추가 등)
   - 최대 5회 반복
   - 5회 내 미통과 → 실패 이유 + 현재 최선 초안을 사용자에게 보고

5. 완료:
   - 최종 프롬프트를 Task Work Items에 명시된 파일에 저장
   - Eval 결과 요약 출력
```

**eval 자동화 수준**: 기본은 Claude 판단 기반 예측 평가. Bash 도구로 실제 API 호출 가능하지만 기본 전략은 아님 (비용/속도 고려).

**규모**: 중 (80~120줄)

---

### [신규 2] `.claude/skills/wf-prompt-eval/SKILL.md`

**근거**: component-boundaries 규칙에 따르면 PROPOSE→EVAL→REFINE은 **재사용 가능한 unit logic** — LLM 응답 평가, Claude-as-judge 패턴은 다른 컨텍스트(예: `/harness:audit`, 미래 eval 자동화)에서도 쓰일 수 있다. 따라서 prompt-engineer 에이전트가 이 스킬을 로드해서 따르는 구조가 옳다.

**역할**: 프롬프트 평가 절차 정의 (단순 비교 / 루브릭 평가 / Claude-as-judge)

**설계 내용:**

```markdown
## Eval 전략 선택

| 기대 동작 유형 | 평가 전략 |
|--------------|---------|
| 정확한 텍스트/구조 | 직접 비교 |
| 주관적 품질 (어조, 간결성) | 루브릭 점수 (Claude 판단) |
| 복잡한 추론/정확성 | Claude-as-judge (별도 평가 프롬프트) |

## PROPOSE 단계 지침
## EVAL 단계 지침  
## REFINE 단계 지침 (실패 패턴 분류 + 수정 전략)
## 완료 조건 및 실패 보고 형식
```

**규모**: 중 (60~90줄)

---

## 조건부 변경 항목

### [조건부 1] `tdd-specialist` 에이전트 언어 중립화

**현황**: `Test Patterns` 섹션이 TypeScript/Vitest 하드코딩. Stack = python 시 stack-python-test가 컨텍스트로 주입되어도 에이전트 내 TS 예시와 충돌.

**위험도**: 낮음 (Python 스택 Task는 현재 없거나 드묾). Stack 주입 시 Claude가 컨텍스트 우선순위로 Python 패턴을 따를 가능성이 높음.

**권장**: 지금은 변경 없이 두고, Python TDD Task가 실제로 사용되어 문제가 확인되면 아래 변경:
- `Test Patterns (TypeScript/Vitest)` 섹션을 `Test Patterns (Stack-specific)` 로 교체
- "Stack 컨텍스트가 주입된 경우 해당 스택의 패턴을 우선 따른다" 규칙 추가

**트리거 조건**: Stack = python인 tdd Task가 tdd-specialist 실행 중 TS 패턴을 잘못 따르는 케이스 발생 시.

### [조건부 2] `simplify` 스킬의 `refactor` 타입 적용 여부

**현황**: simplify는 tdd 타입에서만 code-reviewer 직후 실행.

**분석**: refactor 타입은 구조 개선이 주목적 → simplify의 "재사용·효율성·품질 재검토"가 중복될 수 있음. refactor-cleaner가 이미 이 역할을 함.

**권장**: refactor 타입에는 simplify 미적용 유지. impl.md Key Principles에 명시 추가.

---

## 변경 불필요 항목

| 구성요소 | 이유 |
|---------|------|
| `skill-registry/SKILL.md` | Discovery 절차 완비, 변경 없이 호출 가능 |
| 모든 `stack-*` 스킬 | capabilities 이미 전부 선언됨 |
| `tdd-specialist` (단기) | 조건부 변경 #1 참고 |
| `code-reviewer` | Stack 컨텍스트 주입 받으면 자동 활용, 에이전트 자체 변경 없음 |
| `database-reviewer` | 이미 stack-postgres 스킬 내부 참조 언급됨, 그대로 호출 가능 |
| `security-reviewer` | 그대로 호출 가능 |
| `refactor-cleaner` | 그대로 호출 가능, impl.md에서 연결만 추가 |
| `/dev:plan` | planner 호출 방식 변경 없음 |
| `/dev:review` | 전체 범위 리뷰는 기존 유지 |
| `/dev:verify` | prompt 타입 eval은 impl 레벨에서 처리, verify 범위 외 |
| `/dev:done`, `/dev:docs` | 영향 없음 |
| `wf-tdd` | tdd-specialist가 로드, 변경 없음 |

---

## 구현 순서 (의존 관계 기준)

```
Phase 1 — 계약 먼저 (다른 모든 항목의 전제)
  1. .harness/contracts/implementation-plan.md
     → Stack 필드, prompt 타입, eval criteria 형식

Phase 2 — 병렬 가능
  2a. .claude/agents/planner.md
      → Stack 작성 지침, 보안 태그 감지, prompt 타입 지침
  2b. .claude/skills/wf-prompt-eval/SKILL.md  [신규]
      → PROPOSE→EVAL→REFINE 절차 정의
  2c. .codex/skills/plan-review/SKILL.md
      → prompt 타입 인식, Stack 필드 검증

Phase 3 — Phase 2 완료 후
  3a. .claude/agents/prompt-engineer.md  [신규]
      → wf-prompt-eval 로드해서 따르는 구조
  3b. .claude/commands/dev/impl.md
      → Routing Step 3.5, 에이전트 분기 확장, 리뷰어 다층 라우팅

Phase 4 — 검증 (구현 후)
  4. 테스트 시나리오:
     - Stack: typescript, fastify → stack-fastify 로드 확인
     - Stack: typescript, postgres, jwt → database-reviewer + security-reviewer 병렬 확인
     - Type: prompt → prompt-engineer 호출 확인
     - Type: refactor → refactor-cleaner 호출 확인
     - Stack 없음 → 기존 동작 변경 없음 확인
```

---

## 규모 추정 (총합)

| 항목 | 파일 수 | 예상 변경량 |
|------|--------|------------|
| 필수 수정 | 3개 | ~250줄 |
| 필수 (codex) | 1개 | ~40줄 |
| 신규 생성 | 2개 | ~200줄 |
| 조건부 | 0~2개 | 0~60줄 |
| **합계** | **6개** | **~490줄** |

적절한 범위의 단일 스펙 토픽. 구현 계획 Task는 6~8개 예상.
