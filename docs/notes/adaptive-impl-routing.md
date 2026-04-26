# 적응형 /dev:impl 라우팅 설계 아이디어

> 작성일: 2026-04-26
> 계기: 모노 레포 환경에서 Task마다 기술 스택이 달라 같은 에이전트·스킬이 고정 호출되는 문제를 해결하기 위한 방향 탐색

---

## 문제 인식

현재 `/dev:impl`은 Task Type(tdd/config/infra/refactor)으로만 에이전트를 분기한다.  
모노 레포처럼 Task마다 기술 스택이 다른 환경에서는 항상 같은 reviewer·skill을 쓰게 되어,  
stack 특화 지식(Fastify 패턴, Postgres 쿼리 규칙, Claude API 프롬프트 패턴 등)이 구현·리뷰에 반영되지 않는다.

---

## 핵심 설계 원칙

```
Task Type  → 에이전트 선택  (WHO implements / reviews)
Stack Tags → 스킬 선택     (WHAT knowledge to apply)
```

두 축이 독립적으로 동작하고 조합된다.

---

## Task 블록 계약 변경

### 새 필드: `Stack` (optional)

```markdown
- **Type**: tdd
- **Stack**: typescript, fastify, postgres
- **Goal**: ...
- **Work Items**: ...
- **Completion Criteria**: ...
- **Commit**: `feat(api): ...`
```

- 값: skill-registry capabilities 태그와 동일한 kebab-case 식별자
- 콤마 구분, 언어·프레임워크·도메인을 단일 필드에 통합
- 선언 없으면 현재 동작 유지 (graceful fallback)
- 모노 레포에서 Task마다 다른 스택 선언 가능

---

## Task Type 확장

기존 4종에 `prompt` 타입 추가:

| Type | Agent | 워크플로우 | 비고 |
|------|-------|-----------|------|
| `tdd` | tdd-specialist | RED → GREEN → REFACTOR | 기존 |
| `prompt` | prompt-engineer *(신규)* | PROPOSE → EVAL → REFINE | LLM 구현 전용 |
| `config` | *(없음)* | 변경 + 검증 | 기존 |
| `infra` | *(없음 + advisor)* | 변경 + 문서화 | 기존 |
| `refactor` | refactor-cleaner | 커버리지 확보 → 리팩터 | 에이전트 매핑 신규 |

### `prompt` 타입 특이사항

- TDD 대신 eval 순환 (테스트 코드가 아니라 입출력 예시 + 판단 기준으로 검증)
- `stack-claude-api` 스킬 자동 로드 (Stack 태그와 무관하게)
- `prompt-engineer` 전용 에이전트 신규 필요

---

## Routing Step (신규 — Step 3.5)

브리핑 후, 구현 전에 삽입:

```
1. Task Stack 태그 파싱
2. skill-registry 조회:
   - [language-patterns, <lang-tag>]  → 구현 컨텍스트 스킬
   - [database, <db-tag>]             → DB 패턴 스킬
   - [testing, <test-tag>]            → 테스트 패턴 스킬 (tdd 타입)
3. 매칭된 stack-* 스킬을 구현 컨텍스트로 로드
4. 에이전트 선택 (Type 기반)
```

**예시:**
```
Stack: typescript, fastify, postgres
  → skill-registry([language-patterns, typescript, fastify]) → stack-fastify
  → skill-registry([database, postgres]) → stack-postgres
  → 두 스킬을 컨텍스트로 구현 + 리뷰에 활용
```

---

## 리뷰어 라우팅 (다층 구조)

```
Stack 태그 분석
  │
  ├── 1차 (도메인 전문성):
  │     postgres, mysql, sqlite, redis, mongodb → database-reviewer
  │     (기타) → code-reviewer
  │
  └── 2차 (보안 체크 — 조건부 추가 실행, 병렬):
        Stack 태그에 auth, security, payment, crypto, oauth, jwt 포함
        또는 Task Type = infra
        → security-reviewer 병렬 추가 실행
```

**예시 조합:**
| Stack | 1차 리뷰어 | 2차 (보안) |
|-------|-----------|-----------|
| typescript, fastify | code-reviewer | - |
| typescript, postgres | database-reviewer | - |
| typescript, fastify, jwt | code-reviewer | security-reviewer |
| typescript, postgres, jwt | database-reviewer | security-reviewer |
| (Type: infra) | code-reviewer | security-reviewer |

리뷰어에게도 매칭된 stack-* 스킬을 컨텍스트로 주입한다.

> security-reviewer의 전체 범위 리뷰는 여전히 `/dev:review` 단계에서 수행.
> `/dev:impl`의 security-reviewer는 Task 범위 한정 보안 체크.

---

## prompt-engineer 에이전트 (신규)

**PROPOSE → EVAL → REFINE 사이클:**

1. 플랜의 eval 기준(입출력 예시, 판단 기준) 읽기
2. 프롬프트 초안 제안
3. eval 기준 대비 검증 (Claude API 호출 또는 수동 체크)
4. 기준 통과까지 정제 반복

**planner가 `prompt` 타입 Task 작성 시 포함해야 할 항목:**
- Eval Cases: 입력 예시 + 기대 출력
- Acceptance Criteria: 합격 기준 (예: 3/3 eval 통과)

---

## 영향 범위 (변경 대상 구성요소)

| 구성요소 | 변경 내용 | 우선순위 |
|---------|---------|---------|
| `.harness/contracts/` implementation-plan | Task 블록에 `Stack` 필드 추가 | 1 |
| `.claude/agents/planner.md` | Stack 필드 작성 지침 + 보안 태그 감지 규칙 | 2 |
| `.claude/commands/dev/impl.md` | Routing Step 3.5 + 리뷰어 다층 선택 로직 | 3 |
| `.claude/agents/prompt-engineer.md` | 신규 에이전트 (PROPOSE→EVAL→REFINE) | 4 |
| `stack-*` 스킬 capabilities 보완 | backend, frontend 등 미선언 스킬에 추가 | 5 |

**변경 불필요:**
- `skill-registry` — 이미 준비됨
- `/dev:plan`, `/dev:review`, `/dev:verify`
- `tdd-specialist`, `code-reviewer`, `database-reviewer` 기존 동작

---

## 미결 사항 (Open Questions)

1. **Stack 필드 검증**: plan-review Codex 스킬이 Stack 태그의 유효성을 검사해야 하는가?
2. **prompt-engineer eval 자동화**: eval 기준 검증을 Claude API로 자동화할지, 수동 체크로 남길지.
3. **리뷰어 병렬 실행 조율**: database-reviewer + security-reviewer 동시 실행 시 충돌 없이 결과를 통합하는 방식.
4. **Stack 태그 표준화**: 어떤 태그가 유효한지 공식 목록이 필요한가 (현재 skill-registry capabilities 태그를 재사용).
