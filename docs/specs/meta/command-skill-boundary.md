# Command-Skill Boundary

> 커맨드는 워크플로우를 정의하고, 스킬은 재사용 가능한 단위 기능을 소유한다.

## 개요

`.claude/commands/`와 `.claude/skills/` 컴포넌트의 역할 경계를 명문화한 규칙 체계다. 커맨드는 단계 순서, 조건 분기, 영속성, 오케스트레이션을 담당하고, 스킬은 분리 가능하고 재활용 가능한 단위 기능을 소유한다. 이 경계를 지킴으로써 로직 중복을 방지하고 스킬을 여러 커맨드에서 재사용할 수 있다.

## 구조

```
.claude/rules/common/component-boundaries.md   역할 경계 규칙 (version 5)
.claude/commands/harness/learn.md                  /harness:learn (version 4)
.claude/commands/dev/verify.md                     /dev:verify (version 4)
.claude/skills/wf-continuous-learning/SKILL.md     패턴 추출 스킬 (version 5)
.claude/skills/wf-verification/SKILL.md            검증 게이트 스킬 (version 3)
```

## 동작

### 역할 정의 (`component-boundaries.md`)

**커맨드**는 세 가지 책임만 갖는다:
- 워크플로우 소유 — 단계 순서, 조건 분기, 중단/재개 지점
- 영속성 — 파일 저장, 디렉토리 이동, 상태 기록
- 오케스트레이션 — 스킬 로드, 에이전트 호출, 사용자 입력 대기

재사용 가능한 단위 로직은 커맨드가 직접 구현하지 않는다.

**스킬**은 단위 기능을 소유하는 단일 진실 공급원이다. 워크플로우 순서나 영속성에 관여하지 않는다.

### 표준 위임 패턴

커맨드가 스킬 로직을 필요로 할 때:

```
Load `.claude/skills/<name>/SKILL.md` and follow its process.
```

기준 사례: `dev/spec.md` → `wf-brainstorming/SKILL.md`

컴포넌트(에이전트·스킬·커맨드)가 규칙 파일을 명시 로드할 때:

```
Load <rule-path> and follow its process.
```

Skill 위임과 동일 form을 규칙 경로에 적용한다. 기준 사례: `meta-skill-creator/SKILL.md`, `agents/planner.md`, `agents/prompt-engineer.md` → `.claude/rules/common/prompt-authoring.md`. 자세한 내용은 `prompt-authoring-guide.md` 참조.

### `/harness:learn` (`learn.md`)

세션 로그를 분석하여 재사용 가능한 패턴을 `.claude/skills/learned/`에 저장한다.

1. `.claude/sessions/`의 세션 로그 확인
2. `wf-continuous-learning/SKILL.md` **Steps 1–4만** 실행 (스캔, 식별, 필터, 저장)
3. 완료 후 저장된 스킬 목록 출력

Step 5(Curate — 기존 항목 삭제)는 기본 실행에서 제외된다. 기본 실행은 **비파괴적**이며 기존 스킬을 삭제하지 않는다. 커레이션은 사용자가 명시적으로 요청해야 하며, 삭제 전 사용자 확인이 필요하다.

### `/dev:verify` (`verify.md`)

PR 전 전체 검증 게이트를 실행한다.

`wf-verification/SKILL.md`에 위임하여 build → type-check → lint → test → security 순서로 게이트를 실행한다. 모든 게이트 통과 후 `/dev:done`을 실행한다.

### `wf-continuous-learning/SKILL.md`의 Step 5

Step 5(Curate)는 자기 완결적 안전 게이트를 갖는다: 명시적으로 요청된 경우에만 실행하며, 항목 제거 전 반드시 사용자 확인을 받는다. 이는 커맨드와 스킬 양 계층에서 동일하게 적용된다.

## 위반 판별 기준

커맨드가 다음 중 하나에 해당하면 위반이다:
- 이미 스킬에 존재하는 로직을 중복 정의 (duplication)
- 재사용 가능한 단위 로직을 스킬 없이 커맨드에 직접 구현 (preemptive duplication)

위반 시: 기존 스킬에 위임하거나, 먼저 스킬로 추출한다.

## 제약사항

- 에이전트(`.claude/agents/`)와 스킬/커맨드 간 경계 정의는 이 규칙의 범위 밖이다
- 기존 스킬 파일의 내용 수정은 경계 위반 수정에 한해 허용된다
- 감사 스크립트(`harness-audit.js`)의 경계 검사 항목 추가는 별도 토픽으로 관리한다
