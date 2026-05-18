# Command-Skill Boundary — 5-tier Skill System

> 하네스 스킬은 prefix로 tier를 식별한다. 각 tier는 역할·호출 방식·판별 기준이 다르며, 새 스킬을 작성하거나 기존 스킬을 호출할 때의 1차 기준이 된다.

## 개요

본 메타 문서는 `.claude/skills/`의 **5-tier 체계**(flow / wf / adapter / stack / meta)를 정의한다. 과거 본 문서가 표현했던 "커맨드 vs 스킬" 이분법은 폐기됐다. `commands/dev/` 전체가 `flow-*` 스킬로 흡수되면서, 워크플로우 진입점과 단위 로직·외부 도구 어댑터·기술 패턴·하네스 인프라가 동일한 스킬 시스템 안에서 prefix로 구분되기 때문이다.

규칙 본문은 `.claude/rules/common/component-boundaries.md` (canonical) 에 있고, 본 문서는 그 규칙을 5-tier 관점에서 설명·인용한다.

## 구조

```
.claude/rules/common/component-boundaries.md     5-tier 역할 정의 + Delegation Pattern + 위반 판별 (canonical)
.claude/skills/flow-*/SKILL.md                   사용자 진입점 워크플로우 스킬 (예: flow-impl, flow-verify)
.claude/skills/wf-*/SKILL.md                     재사용 단위 작업 스킬 (예: wf-verification, wf-brainstorming)
.claude/skills/adapter-*/SKILL.md                외부 도구 어댑터 스킬 (예: adapter-codex-review, adapter-exa)
.claude/skills/stack-*/SKILL.md                  기술 스택 패턴 가이드 (예: stack-postgres, stack-fastify)
.claude/skills/meta-*/SKILL.md                   하네스 인프라 스킬 (예: meta-skill-creator, meta-dev-context)
```

## 5-tier 체계

| Tier | Prefix | 역할 | 호출 방식 | 판별 기준 |
|------|--------|------|-----------|----------|
| Orchestration | `flow-` | 워크플로우 단계 전체 소유 — 상태 머신, 시퀀싱, dev-context 전환 | 사용자 직접 (`/flow-impl`) | 사용자가 직접 시작하는 진입점인가? |
| Unit | `wf-` | 재사용 단위 작업 — 오케스트레이터·에이전트가 `Load ... and follow` | 스킬 Load 지시 | 항상 실행 가능하며 내부 전제 조건 없는가? |
| Adapter | `adapter-` | 외부 도구 래퍼 — 가용성 게이트·폴백 보유 | 오케스트레이터·다른 스킬이 Load | 외부 도구 없으면 자체적으로 skip/fallback하는가? |
| Stack | `stack-` | 기술 패턴 가이드 — capabilities 기반 발견 | skill-registry 탐색 | 기술 지식 제공인가? |
| Meta | `meta-` | 하네스 인프라 — 스킬 생성·상태 관리 | 직접 로드 (capabilities 미등록) | 하네스 자체를 관리하는가? |

`flow-*` 스킬은 frontmatter에 `user-invocable: true`를 명시한다. 플랫폼 버전별 기본값 차이를 회피하기 위한 명시적 선언이며, 슬래시 커맨드 노출의 단일 진실 원천이다. 다른 tier는 `user-invocable`을 설정하지 않거나 명시적으로 `false`로 둔다.

## Tier 결정 흐름 (decision flow)

새 스킬을 작성할 때 아래 결정 트리를 따른다. 첫 매칭에서 tier가 결정되며, 이후 분기는 평가하지 않는다.

```
하네스 자체(스킬 생성·상태 관리·인프라)를 관리하는가?
  → 예  : meta-*  (직접 로드, capabilities 미등록)
  → 아니오
      사용자가 직접 타이핑해서 시작하는가?
        → 예  : flow-*  (user-invocable: true 명시)
        → 아니오
            외부 도구 없으면 skip/fallback을 자체 선택하는가?
              → 예  : adapter-*
              → 아니오
                  기술 스택 패턴 가이드인가?
                    → 예  : stack-*
                    → 아니오 : wf-* (단위 작업)
```

판별 흐름의 우선 순위는 의도적이다. `meta-*`를 먼저 가른 다음 `flow-*`를 거르고, 그 다음 가용성 게이트가 있는 어댑터를 분리하고, 마지막에 stack vs wf를 결정한다. 이렇게 하면 한 스킬이 두 tier 후보를 동시에 만족하는 모호 케이스(예: 외부 도구를 쓰지만 사용자 진입점이기도 한 경우)도 일관되게 `flow-*`로 결정된다 — 사용자 진입점 여부가 가용성 게이트보다 우선한다.

## 동작

### Delegation Pattern (표준 위임 형태)

스킬을 다른 스킬·에이전트·문서에서 호출할 때는 한 줄 위임 형태를 사용한다.

```
Load .claude/skills/<name>/SKILL.md and follow its process.
```

규칙 파일·contract 문서를 명시 로드할 때도 동일 형태를 사용한다.

```
Load <rule-path> and follow its process.
```

### Tier별 위임 패턴 예시

각 tier에 대해 실제 하네스에서 사용 중인 위임 사례를 1개 이상씩 제시한다 (총 5개).

**1. flow-* (Orchestration)** — 사용자가 슬래시 커맨드로 직접 호출하거나, 다른 flow-* 스킬이 후속 단계로 호출한다.

```
Load .claude/skills/flow-impl/SKILL.md and follow its process.
```

호출 시점: 사용자가 `/flow-impl`을 타이핑하거나, 다른 flow-* 스킬이 워크플로우 다음 단계로 위임할 때. flow-* 스킬은 dev-context phase 전환과 Story 라우팅을 직접 소유한다.

**2. wf-* (Unit)** — 오케스트레이터·에이전트가 단위 로직을 호출할 때 사용한다. 외부 도구·가용성 게이트가 없으므로 무조건 진행 가능하다.

```
Load .claude/skills/wf-verification/SKILL.md and run its checklist.
Load .claude/skills/wf-brainstorming/SKILL.md and follow its process.
```

호출 시점: `flow-verify`가 검증 게이트를 실행할 때, `flow-spec`이 스펙 초안 작성을 시작할 때. wf-* 스킬은 자기 완결적이며, 입력만 받으면 항상 실행 가능하다.

**3. adapter-* (Adapter)** — 외부 도구(API·CLI)를 래핑하고 가용성 게이트를 자체적으로 보유한다. 외부 도구가 없으면 skip 또는 fallback을 스킬 내부에서 결정한다.

```
Load .claude/skills/adapter-codex-review/SKILL.md and follow its process.
```

호출 시점: `flow-spec`이 Codex 리뷰 루프를 실행할 때, `flow-plan`이 plan-review를 호출할 때. Codex CLI가 없으면 adapter-* 스킬이 자체적으로 fallback 메시지를 출력하고 정지한다 — 오케스트레이터는 가용성을 체크하지 않는다.

**4. stack-* (Stack)** — 기술 스택 패턴 가이드. capabilities 태그 기반으로 skill-registry가 발견·로드한다.

```
Load .claude/skills/stack-postgres/SKILL.md and follow its process.
```

호출 시점: 사용자가 PostgreSQL 마이그레이션을 작성할 때 database-reviewer 에이전트가 `[stack-postgres]` capabilities로 발견. stack-* 스킬은 capabilities 태그가 단일 진실 원천이며, 파일명만으로 호출되지 않는다.

**5. meta-* (Meta)** — 하네스 인프라. capabilities에 등록되지 않으며, 이름으로 직접 로드한다.

```
Load .claude/skills/meta-skill-creator/SKILL.md and follow its process.
Load .claude/skills/meta-dev-context/SKILL.md and follow its process.
```

호출 시점: 새 스킬을 작성할 때 (`meta-skill-creator`), dev-context.json을 조회·갱신할 때 (`meta-dev-context`). meta-* 스킬은 capabilities 발견 대상이 아니므로 호출자가 이름을 알고 있어야 한다.

### `flow-*` 스킬 내부 구조

`flow-*` 스킬은 자신의 워크플로우 단계를 완결적으로 정의하지만, 단위 로직은 항상 `wf-*` 또는 `adapter-*` 스킬로 위임한다. 예를 들어 `flow-verify`는 검증 게이트 단계 정의·시퀀싱을 소유하되, 실제 게이트 체크리스트는 `wf-verification`에 위임한다. `flow-spec`은 토픽 등록·dev-context 전환을 직접 처리하되, 스펙 초안 작성은 `wf-brainstorming`, Codex 리뷰는 `adapter-codex-review`에 위임한다.

### `meta-skill-creator`와 `meta-dev-context`

`meta-skill-creator`는 새 스킬을 작성할 때 5-tier 체계에 맞게 prefix·frontmatter·디렉토리 구조를 결정하도록 안내한다. 본 문서를 참조 자료로 로드한다.

`meta-dev-context`는 토픽 라이프사이클 상태(`phase:status`, `currentStory`, batch 상태 등)를 조회·갱신하는 공유 인터페이스를 정의한다. `flow-*` 스킬이 상태 머신을 운영할 때 본 스킬을 직접 로드해서 사용한다.

## 위반 판별 기준

`flow-*` 스킬이 단위 로직을 직접 정의하면 위반이다. 다음 중 하나라도 해당하면 별도 `wf-*` 또는 `adapter-*` 스킬로 추출해 위임한다.

- **이미 다른 스킬에 존재하는 로직** (duplication)
- **재사용 가능한 분리된 단위 로직**(reusable, separable unit logic)이지만 대응 스킬이 아직 없는 경우 (preemptive duplication)

스킬에 속해야 할 로직 예시:
- Gate 정의 (build 단계, check 시퀀스)
- 품질 기준·평가 rubric
- 산출물 형식 템플릿
- 패턴 감지·추출 로직

체크리스트 중복 안티 패턴:

```
# BAD: flow-* 스킬에 검증 체크리스트 재정의
## 5. Verify quality
- [ ] Build succeeds
- [ ] Tests pass at 80%+ coverage
→ 이 체크리스트가 wf-verification/SKILL.md에 이미 정의됨

# GOOD: 스킬에 위임
Load .claude/skills/wf-verification/SKILL.md and run its checklist.
```

## 제약사항

- 에이전트(`.claude/agents/`)와 스킬 간 경계는 별도 문서(`docs/specs/agents/`)에서 다룬다 — 본 문서 범위 밖.
- 5-tier 체계의 canonical 규칙 본문은 `.claude/rules/common/component-boundaries.md`이며, 본 메타 문서는 참조 자료다. 규칙 자체를 변경할 때는 canonical 파일을 먼저 갱신하고 본 문서를 동기화한다.
- 본 문서 파일명(`command-skill-boundary.md`)은 5-tier 체계 도입 후에도 보존된다. `skill-boundary.md`로의 rename은 후속 cleanup 토픽에서 진행한다 — 본 토픽은 명칭 변경 없이 본문만 재작성한다.
