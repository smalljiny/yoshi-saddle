# Commit/PR Message Content Policy

> 커밋·PR 메시지에서 하네스 워크플로우 도구(슬래시 커맨드·서브에이전트·스킬 이름)를 노출하지 않고 변경된 산출물과 그 이유만 기술하도록 강제하는 정책. 단일 진실 원천은 `.harness/rules/git-workflow.md`이며 본 문서는 시스템 reference다.

## 개요

planner가 작성하는 plan `**Commit**` 필드, `/flow-impl`이 실행하는 커밋, `/flow-pr`이 생성하는 PR 제목·본문은 모두 변경된 산출물과 그 이유만 기술해야 한다. 메시지를 만드는 데 사용된 하네스 워크플로우 도구(슬래시 커맨드·서브에이전트·스킬 이름)는 노출하지 않는다.

집행 모델은 soft enforcement다 — planner가 작성 시점에 정책을 따르도록 위임받고(사전 보장), code-reviewer가 이후 두 시점에서 위반 패턴을 탐지해 경고만 출력한다(사후 감지). lint/pre-commit hook을 통한 hard block은 도입하지 않는다.

## 구조

### 정책 분포

| 파일 | 역할 |
|---|---|
| `.harness/rules/git-workflow.md` | **단일 진실 원천**. 핵심 규칙·적용 대상·금지 카테고리·carve-out·grandfathering·Before/After 예시를 정의한다. |
| `.claude/agents/planner.md` | `**Commit**` 필드 작성 시 정책 위임 (`Load .harness/rules/git-workflow.md and follow its 메시지 콘텐츠 정책 절.`). |
| `.claude/agents/code-reviewer.md` | plan `**Commit**` 필드에서 위반 패턴을 감지해 WARNING 출력. 자동 수정·차단 없음. |
| `.harness/templates/pr-body.md` | `## 변경사항`·`## 목적` 섹션 HTML 주석에 정책 인지 힌트 1줄씩. |

### 금지 카테고리

`.harness/rules/git-workflow.md`의 정책 절에서 4개 카테고리를 정의한다.

| # | 카테고리 | 예시 패턴 |
|---|---|---|
| (a) | 슬래시 커맨드 명시 | `/flow-*`, `/dev:*`, `/harness:*`, `/graphify`, `/codex:*` |
| (b) | 워크플로우 narrative | `auto-invoked`, `RED-GREEN-REFACTOR`, `스킬 실행`, `에이전트 호출` |
| (c) | 도구 내부 상태 | `dev-context.json` 전이 narrative |
| (d) | 절차적 "via" 구문 | `via tdd-specialist`, `/flow-docs로 생성` |

### Carve-out 규칙

컴포넌트 이름(planner·tdd-specialist 등)·슬래시 커맨드 이름(`/flow-spec` 등)은 그 컴포넌트가 변경 대상(`scope` 또는 변경된 파일 경로)일 때만 허용한다.

- `feat(agent): add Write tool to planner` — planner가 변경 파일이므로 적법
- `feat(command): improve /flow-spec status display` — `/flow-spec` 컴포넌트가 변경 대상이므로 적법
- `feat: signup endpoint via planner` — planner가 변경 대상이 아니므로 위반

## 동작

### 작성 경로 (사전 보장)

planner는 §5 "Design per-Story Commit Message" 단계에서 `**Commit**` 필드를 작성할 때 git-workflow.md 정책 절을 명시적으로 로드해 따른다. 각 Story의 변경 대상을 인지하므로 carve-out 적용 여부도 작성 시점에 판단한다.

### 감지 경로 (사후 경고)

code-reviewer가 이미 호출되는 두 시점에서 plan `**Commit**` 필드를 검사한다. 별도 호출 지점은 도입하지 않는다.

| 검사 시점 | 검사 범위 |
|---|---|
| `/flow-impl` Step 6 (post-implementation review) | 현재 Story 1건의 `**Commit**` 필드 |
| `/flow-review` 시작 | plan 내 모든 Story `**Commit**` 필드 일괄 |

검사 입력은 항상 `docs/_local/active/<topic>/implementation-plan.md`의 Story `**Commit**` 필드다. 커밋 이력(`git log`)은 사용하지 않는다 — `/flow-impl` Step 6는 Step 8 커밋 전에 실행되므로 `git log -1`은 이전 Story의 커밋을 반환하는 시점 충돌이 발생한다. plan 필드는 contract(`.harness/contracts/implementation-plan.md`)에 의해 실제 커밋 메시지와 동일함이 보장되므로 동등한 검사 대상이며, 커밋 전에 위반이 감지되면 사용자가 plan을 수정해 잘못된 메시지가 git history에 남지 않는다.

### WARNING 출력 형식

위반 1건당 한 블록 출력. 자동 수정·차단 없음.

```
[WARNING] Workflow exposure in Commit field
Story: <Story 제목>
Message: <원본 **Commit** subject>
Pattern: <탐지된 금지 패턴>
Suggested rewrite: <노출 제거된 subject 제안>
```

### PR 경로

PR 제목은 plan `**Commit**` 필드에서 파생되므로 planner 사전 보장(G2)이 이미 정책 준수를 보장한다. PR 본문은 `.harness/templates/pr-body.md` 템플릿의 HTML 주석 힌트로 사용자에게 정책을 인지시킨다. PR 본문 자동 검사는 본 정책 범위 밖이다.

### Grandfathering

정책 병합 시점에 이미 작성된 plan `**Commit**` 필드는 위반이라도 재작성하지 않고 그대로 사용한다. code-reviewer 검사는 출처를 구분하지 않고 모든 `**Commit**` 필드에 동일하게 동작한다 — 경고는 정보 제공일 뿐이며 차단·자동 수정이 없으므로 grandfathered 필드의 경고는 무해하다.

## 제약사항

- **단일 진실 원천은 git-workflow.md** — 본 문서는 reference이며, 의미 충돌 시 `.harness/rules/git-workflow.md`의 "메시지 콘텐츠 정책: 워크플로우 노출 차단" 절이 우선한다.
- **soft enforcement 한정** — pre-commit hook, commit-msg lint, plan-review Gate 등을 통한 hard block은 본 정책 범위 밖이다. 도입 여부는 운영 1∼2개월 후 별도 토픽에서 평가한다.
- **검사 입력은 plan `**Commit**` 필드만** — `git log`·post-commit hook·브랜치 비교 검사는 도입하지 않는다. plan에 등재되지 않은 커밋(review-fix, 수동 커밋)은 본 정책의 자동 감지 범위 밖이며 사용자가 직접 확인한다.
- **자동 수정·차단 금지** — code-reviewer는 WARNING만 출력한다. 메시지 의도 재구성은 LLM이 자체 판단으로 변경하면 의미 손실 위험이 있으므로 plan 수정은 사용자가 수행한다.
- **PR 본문 자동 검사 제외** — `/flow-pr` 렌더링 후 사용자 편집 섹션은 자동 감지 대상에서 제외한다. 템플릿 HTML 주석 힌트로만 가이드한다.
- **carve-out은 LLM 판단** — 변경 대상과 메시지 컴포넌트 이름의 일치 여부 판정은 code-reviewer의 자연어 판단에 위임한다. deterministic 알고리즘으로 자동화하지 않는다 (false positive 비용이 측정되지 않음).
