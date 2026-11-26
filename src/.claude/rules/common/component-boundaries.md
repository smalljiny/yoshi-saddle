---
version: 7
---
# Component Boundaries: 5-tier Skill System

하네스 스킬은 prefix로 tier를 식별한다. 각 tier는 역할·호출 방식·판별 기준이 명확히 다르며, 새 스킬을 작성할 때 어느 디렉토리·이름 규칙을 따를지 결정하는 1차 기준이 된다.

## 5-tier 체계

| Tier | Prefix | 역할 | 호출 방식 | 판별 기준 |
|------|--------|------|-----------|----------|
| Orchestration | `flow-` | 워크플로우 단계 전체 소유 — 상태 머신, 시퀀싱, dev-context 전환 | 사용자 직접 (`/flow-impl`) | 사용자가 직접 시작하는 진입점인가? |
| Unit | `wf-` | 재사용 단위 작업 — 오케스트레이터·에이전트가 `Load ... and follow` | 스킬 Load 지시 | 항상 실행 가능하며 내부 전제 조건 없는가? |
| Adapter | `adapter-` | 외부 도구 래퍼 — 가용성 게이트·폴백 보유 | 오케스트레이터·다른 스킬이 Load | 외부 도구 없으면 자체적으로 skip/fallback하는가? |
| Stack | `stack-` | 기술 패턴 가이드 — capabilities 기반 발견 | skill-registry 탐색 | 기술 지식 제공인가? |
| Meta | `meta-` | 하네스 인프라 — 스킬 생성·상태 관리 | 직접 로드 (capabilities 미등록) | 하네스 자체를 관리하는가? |

`flow-*` 스킬은 frontmatter에 `user-invocable: true`를 명시한다. 플랫폼 버전별 기본값 차이를 회피하기 위한 명시적 선언이며, 슬래시 커맨드 노출의 단일 진실 원천이다.

## Tier 결정 흐름

새 스킬을 작성할 때 아래 의사결정 트리를 따른다. 첫 매칭에서 tier가 결정된다.

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

## Delegation Pattern (Standard)

스킬을 다른 스킬·에이전트·문서에서 호출할 때는 다음 한 줄 형태를 사용한다.

```
Load `.claude/skills/<name>/SKILL.md` and follow its process.
```

규칙 파일이나 contract 문서를 명시 로드할 때도 같은 형태를 사용한다.

```
Load <rule-path> and follow its process.
```

Reference cases:
- `flow-spec/SKILL.md` → `wf-brainstorming/SKILL.md`
- `flow-plan/SKILL.md` → `adapter-codex-review/SKILL.md`
- `meta-skill-creator/SKILL.md`, `agents/planner.md`, `agents/prompt-engineer.md` → `.claude/rules/common/prompt-authoring.md`

## Violation Criteria

`flow-*` 스킬이 단위 로직을 직접 정의하면 위반이다. 다음 중 하나라도 해당하면 별도 `wf-*` 또는 `adapter-*` 스킬로 추출해 위임한다.

- **이미 다른 스킬에 존재하는 로직** (duplication)
- **재사용 가능한 분리된 단위 로직**(reusable, separable unit logic)이지만 대응 스킬이 아직 없는 경우

스킬에 속해야 할 로직 예시:
- Gate 정의 (build 단계, check 시퀀스)
- 품질 기준·평가 rubric
- 산출물 형식 템플릿
- 패턴 감지·추출 로직

**체크리스트 중복 예시 (위반):**

```
# BAD: flow-* 스킬에 체크리스트 재정의
## 5. Verify quality
- [ ] Build succeeds
- [ ] Tests pass at 80%+ coverage
→ 이 체크리스트가 wf-verification/SKILL.md에 이미 정의됨

# GOOD: 스킬에 위임
Load `.claude/skills/wf-verification/SKILL.md` and run its checklist.
```

## Placement Decision Guide

새 로직을 어느 tier에 두어야 할지 결정할 때 다음 표를 참조한다.

| Need | Tier | 이유 |
|------|------|------|
| 사용자가 직접 시작하는 워크플로우 단계 | `flow-*` | 상태 머신·시퀀싱·진입점 책임 |
| 2개 이상 위치에서 재사용되는 단위 로직 | `wf-*` | 단위 작업, 내부 전제 조건 없음 |
| 외부 도구(API·CLI) 래핑 + skip/fallback | `adapter-*` | 가용성 게이트 자체 보유 |
| 특정 기술 스택의 패턴 가이드 | `stack-*` | capabilities 기반 발견 대상 |
| 하네스 인프라(스킬 생성·상태 관리) | `meta-*` | 직접 로드, capabilities 미등록 |
| 워크플로우 글루(시퀀싱·저장·트리거)이면서 사용자 진입점 아님 | flow-* 단계 내부 + 위임 | flow-* 스킬이 wf-*/adapter-*에 위임 |

## Flow Gate Pattern

복수의 유효 상태를 처리하는 `flow-*` 스킬을 작성할 때는 개별 early-stop guard를 쌓지 말고 **exhaustive 상태 테이블을 먼저 정의**한다. 이 패턴은 `wf-*`·`adapter-*` 스킬의 게이트 정의에도 동일하게 적용된다.

```
# BAD: early-stop guard 중첩
if phase != "impl": stop
if status != "in-progress": stop
if review != "done": stop

# GOOD: 상태 테이블 우선 정의
| phase:status       | Action                    |
|--------------------|---------------------------|
| impl:in-progress   | proceed                   |
| review:in-progress | show "already in review"  |
| (other)            | show gate-failure message |
```

상태 테이블은 모든 경우를 한눈에 파악하고, 신규 상태 추가 시 누락을 방지하며, 테스트 케이스 도출이 쉽다.

## Message Catalogs

사용자 대면 문자열은 컴포넌트 본문에 두지 않고 ko·en 메시지 카탈로그에 둔다. 본문은 닫힌 참조 토큰으로만 메시지를 가리킨다. 정적 검사는 `node .harness/scripts/i18n-check.js`가 한다.

### 원칙

1. **카탈로그에 둔다**: 사용자에게 보여 주는 블록·문장·상태 라벨·질문 문구(AskUserQuestion의 question·header·options, 답을 받는 일반 텍스트 질문)는 카탈로그에 두고 본문은 참조 토큰만 쓴다. 원문 언어와 무관하다 — 영어 메시지도 옮긴다. 메시지 이전은 질문 채널을 바꾸지 않는다 — 답을 받는 일반 텍스트 질문은 일반 텍스트 질문(`{{msg:ID}}`)으로 남기고 AskUserQuestion으로 바꾸지 않는다.
2. **참조 토큰**: 아래 문법만 쓴다. 문법을 설명하는 예시는 이 규칙 문서에만 둔다(컴포넌트 본문에 예시 토큰을 두지 않는다).
3. **카탈로그는 번역 데이터다**: 컴포넌트 파일 영어 규칙의 예외다. 카탈로그에는 메시지만 두고 모델에게 주는 지시를 두지 않는다.

메시지가 **아닌** 것은 카탈로그로 옮기지 않는다: 명령·코드 예시, 모델에게 설명하려고 든 예시, Task 도구 필드(`TaskCreate.subject` 등), 모델이 자유롭게 쓰는 내용(문구도 채널도 정하지 않은 안내 — 모델이 대화 언어로 말한다), 실행 코드 블록 안의 출력 문구(카탈로그로 옮기지 않고 영어로 바꾼다 — 모델이 결과를 대화 언어로 전달한다).

### 카탈로그 경로

| 컴포넌트 | 카탈로그 (`<lang>` = `en`·`ko`) |
|---|---|
| 스킬 `.claude/skills/<skill>/` (`SKILL.md`와 `references/*.md` 등 하위 파일이 공유) | `.claude/skills/<skill>/templates/messages.<lang>.md` |
| Codex 스킬 `.codex/skills/<skill>/` | `.codex/skills/<skill>/templates/messages.<lang>.md` |
| 에이전트 `.claude/agents/<agent>.md` | `.harness/i18n/<lang>/agents/<agent>.md` |
| 커맨드 `.claude/commands/<path>.md` | `.harness/i18n/<lang>/commands/<path>.md` |
| 공통 (두 개 이상 컴포넌트가 쓰는 메시지) | `.harness/i18n/<lang>/common.md` |

`stack-*`·`learned/` 스킬은 메시지 이전 대상이 아니다.

### 카탈로그 형식

````markdown
## INVALID_TOPIC_NAME

```text
Invalid topic name. Only letters, digits, hyphens, and underscores are allowed.
```
````

- 파일에는 `## <MESSAGE_ID>` 제목과 그 아래 코드 블록 1개만 둔다(빈 줄 허용). frontmatter·설명 문단을 두지 않는다. ID는 `[A-Z][A-Z0-9_]*`이고 파일 안에서 유일하다.
- **기준 언어는 `en`이다.** ID를 en에 먼저 추가하고 ko는 en의 ID 집합을 따른다. 한국어 원문은 ko에 그대로 두고 en을 번역으로 만든다. 영어 원문은 en에 그대로 두고 ko를 번역으로 만든다. 이전할 때 문구를 고치지 않는다. 예외: 본문이 AskUserQuestion 사용을 명시했으나 question·header(또는 선택지) 문구가 없는 질문은 단계의 목적을 그대로 묻는 최소 문구를 en·ko에 새로 쓴다. 질문 호출 여부·선택지 의미·분기는 바꾸지 않는다. 같은 질문을 다시 묻는 재입력 요청은 같은 질문 토큰을 다시 호출하고 새 메시지를 만들지 않는다.
- **플레이스홀더는 `{name}`**(`\{[a-z][a-z0-9_]*\}`)이다. 같은 ID의 ko·en은 플레이스홀더 집합이 같다. 기존 `<topic>`·`<baseBranch>` 같은 치환 자리는 `{topic}`·`{base_branch}`처럼 snake_case 영어 이름으로 바꾸고, 한 메시지 안에서 서로 다른 값에 같은 이름을 쓰지 않는다. 사용자가 입력할 자리를 보여 주는 사용법 표기(`/flow-spec <topic>`)는 `<…>` 그대로 둔다. 치환은 출력하는 모델이 한다.
- **AskUserQuestion 필드 ID**: `<BASE>_Q` → `question`, `<BASE>_HEADER` → `header`, `<BASE>_<OPT>_LABEL` → `options[].label`, `<BASE>_<OPT>_DESC` → `options[].description`. `_HEADER` 문구는 언어마다 12자(코드 포인트) 이하다.
- **`(Recommended)`는 카탈로그에 넣지 않는다.** 언어와 무관한 고정 토큰이며 본문이 첫 옵션 label 뒤에 ` (Recommended)`를 붙인다.
- **공통 카탈로그**에는 두 개 이상 컴포넌트가 쓰고 문구가 바이트 단위로 같은(코드 블록 들여쓰기 제거 후 비교) 메시지만 둔다. 문구가 조금이라도 다르면 각자 자기 카탈로그에 둔다.
- **응답 구문은 고정 토큰이다**: 답을 받는 질문이 보여 주는 명령 문자·단어(`y`, `n`, `skip`, `edit`, `-`, `+`)와 예시 입력은 ko·en에 같은 문자열로 둔다. 번역하는 것은 설명 문구와 사용법 꺾쇠 안 단어뿐이다.

### 참조 토큰 문법

| 토큰 | 의미 |
|---|---|
| `{{msg:ID}}` | 메시지 하나를 보여 준다 |
| `{{ask:BASE\|OPT1\|OPT2…}}` | 고정 선택지 AskUserQuestion. 옵션 2개 이상, 나열 순서가 기본 옵션 순서, 첫 옵션이 권장 |
| `{{ask:BASE\|*}}` | 동적 선택지 AskUserQuestion. `_Q`·`_HEADER`만 카탈로그에 두고, 선택지 label·description 생성 규칙은 본문이 서술 |

- 공통 메시지는 ID·BASE 앞에 `common:`을 붙인다: `{{msg:common:INVALID_TOPIC_NAME}}`, `{{ask:common:CONFIRM|YES|NO}}`.
- **인식 범위**: 코드 블록과 인라인 코드 **밖**의 `{{`만 토큰이다(코드 안 `{{topic}}` 같은 템플릿 표기는 해당 없음).
- **판정**: 인식 범위의 `{{`마다 같은 줄에서 가장 가까운 `}}`까지가 토큰이다. 내용이 `^(msg:(common:)?[A-Z][A-Z0-9_]*|ask:(common:)?[A-Z][A-Z0-9_]*(\|[A-Z][A-Z0-9_]*){2,}|ask:(common:)?[A-Z][A-Z0-9_]*\|\*)$`에 맞지 않거나 같은 줄에 `}}`가 없으면 `malformed-ref`다.
- **옵션 순서**: 권장 옵션이 실행 중 결정되는 질문은 본문이 토큰 밖 문장으로 "어느 조건에서 어느 옵션이 권장인지"를 적는다. 이 결정이 기본 순서보다 우선한다 — 권장 옵션을 첫 위치로 옮기고 나머지는 기본 순서의 상대 순서를 유지하며, 첫 label에만 ` (Recommended)`를 붙인다. 예: `{{ask:LANG_DOCS|KO|EN}}`에서 권장이 `en`이면 최종 순서는 `EN (Recommended)`, `KO`.
- **플레이스홀더 값**: 플레이스홀더가 있는 메시지를 쓰는 단계는 같은 단계 안에서 각 `{name}`의 값을 문장으로 적는다(예: "`{dirname}` is the current directory name."). 값이 고정 문구이면 그 값도 메시지로 두고 값을 정하는 문장이 토큰으로 가리킨다(예: "set `{reason}` to {{msg:BATCH_REASON_TEST_FAILURE}}").
- **반복·조건부 보고 틀**: 고정 부분마다 메시지를 두고 본문이 반복·조건·연결 방식(구분자 포함)을 서술한다. 한 메시지 안에 반복 구문이나 조건 문법을 넣지 않는다.
- **보고 + 질문 혼합 블록**: 세 부분을 서로 다른 메시지로 나눈다 — 질문 부분(질문 문장과 응답 형식 안내), 응답 대상 부분(응답이 가리키거나 승인하는 값 줄), 장식 부분(블록 제목 등). 질문 부분과 응답 대상 부분의 ID가 답 필수 ID다.

### 로드

사용자 대면 메시지를 처음 내기 전 단계에서 conversation 언어를 정하고, 같은 단계에서 참조 종류에 필요한 카탈로그만 즉시 Read한다. 지연 참조는 하지 않는다. 다른 스킬을 Load해 따르는 경우 그 스킬이 자기 카탈로그를 같은 규칙으로 읽는다.

| 본문의 토큰 | 필요한 카탈로그 (ko·en 쌍) | 로드 시 읽는 파일 |
|---|---|---|
| 자기 메시지 토큰만 | 자기 카탈로그 | 자기 카탈로그 |
| `common:` 토큰만 | `common.md`만 (자기 카탈로그를 만들지 않는다) | `common.md` |
| 둘 다 | 자기 카탈로그 + `common.md` | 둘 다 |
| 토큰 없음 | 없음 | 없음 (카탈로그 출력용 conversation 판정을 하지 않는다) |

이 표는 카탈로그 출력을 위한 conversation 판정과 카탈로그 읽기에만 적용한다. 문서·커밋 고정 문구를 쓰는 단계는 아래 "문서·커밋 고정 문구"대로 docs·commit 판정을, 에이전트에 위임하는 단계는 `agents.md`의 "Language Line on Delegation"대로 세 차원 판정을 한다. 실패 정책의 파일 누락 진단은 이 표에서 필요한 카탈로그에만 적용한다.

**표준 로드 단계** — 본문은 사용자 대면 메시지를 처음 내는 단계 앞에 해당 블록을 그대로 복사하고 `<…>`만 채운다.

스킬·커맨드·Codex 스킬:

```text
Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: <catalog paths for the chosen language and for en>.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.
```

에이전트:

```text
At the start of the task, take the `conversation` value from the `Language:` line in the task prompt. If the line is missing or the value is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: <catalog paths for the chosen language and for en>.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.
```

### Failure Policy

| 상황 | 처리 |
|---|---|
| `lang.js`가 exit 0이 아니거나 stdout이 `ko`·`en`이 아님 | `en`으로 진행 |
| 결정된 언어의 카탈로그 파일이나 ID가 없음 | `en` 값을 쓴다 |
| `en`에도 파일이 없음 | `[missing catalog: <path>]`를 출력하고 계속 |
| `en` 파일은 있으나 ID가 없음 | `[missing message: <ID>]`를 출력하고 계속 |

**답을 받는 질문의 예외** — AskUserQuestion, 답을 받는 일반 텍스트 질문, 혼합 블록의 질문 부분·응답 대상 부분:

- **답 필수 ID**: 고정 선택지 질문은 `_Q`·`_HEADER`와 나열한 모든 옵션의 `_LABEL`·`_DESC`, 동적 선택지 질문은 `_Q`·`_HEADER`, 일반 텍스트 질문은 그 메시지 ID, 혼합 블록은 질문 부분·응답 대상 부분의 ID다.
- **사전 확인**: 질문(혼합 블록은 블록의 첫 줄)을 출력하기 전에, 현재 실행에서 실제로 표시할 답 필수 ID와 그 줄에 플레이스홀더 값으로 넣으려고 읽는 메시지를 결정된 언어 또는 `en`에서 얻을 수 있는지 확인한다. 현재 분기에서 표시하지 않는 조건부 메시지는 확인하지 않는다. 표시할 항목(후보·값)을 계산한 뒤 확인한다.
- **얻지 못하면**: 질문을 호출하지 않는다(혼합 블록은 장식 부분도 내지 않는다). en 파일이 없으면 `[missing catalog: <path>]` 하나, 파일은 있으나 ID가 없으면 없는 ID마다 `[missing message: <ID>]`를 출력하고, 입력을 기다리지 않고 멈춘다.
- **멈춤의 범위**: 질문 시점 이후의 파일 쓰기·상태 전환·커밋·외부 호출·위임을 하지 않는다. 질문 전에 현행 순서대로 이미 끝난 쓰기는 되돌리지 않는다. 사용자는 카탈로그를 고친 뒤 다시 실행한다.
- 답을 받지 않는 메시지(안내·상태 라벨·보고 틀, 혼합 블록의 장식 부분)는 위 표대로 진단 후 계속한다.

### 문서·커밋 고정 문구

문서(spec·plan·리뷰 보고서·PR 본문·`docs/specs/`)나 커밋 메시지에 넣는 고정 문구는 카탈로그에 넣지 않는다. 본문에 **영어 템플릿**으로 두고, 그 문서·커밋을 쓰는 단계에서 `node .harness/scripts/lang.js resolve --kind=docs`(커밋은 `--kind=commit`)를 호출해 결정된 언어로 쓰라고 지시한다(실패하면 `en`). 에이전트는 위임 프롬프트 `Language:` 줄의 `docs`·`commit` 값을 쓴다. 섹션 제목·표 열·필드 키는 영어로 고정한다.

**형식 토큰 우선**: 다른 컴포넌트나 contract가 문자 그대로 쓰거나 찾는 토큰(예: `Acceptance: N/M eval 통과`, 리뷰 보고서의 `- Decision:`·판정값)은 영어 템플릿 규칙보다 우선해 현행 문자열 그대로 둔다.

### 잔존 한글 허용 목록

메시지가 아닌데 한글이 남는 문자열은 `.harness/i18n/residual-allow.json`에 등록한다: `[{ "file": "<root-relative path>", "text": "<exact check unit>", "reason": "<reason>" }]`. 검사 단위: 코드 블록은 한글이 든 줄(앞뒤 공백 제거한 줄 전체), 코드 블록 밖은 인라인 코드 구간과 큰따옴표(`"…"`·`“…”`) 구간의 내용(앞뒤 공백 포함 원문 그대로)이다. 한 줄의 따옴표 짝이 맞지 않으면 그 줄 전체(앞뒤 공백 제거)가 단위다. `text`는 `i18n-check.js`의 `residual` 진단 detail과 정확히 같아야 한다. 등록 기준은 최종 상태다 — 이전을 마친 트리에서 `residual`로 남은 단위가 메시지가 아닌 유형일 때만 등록하고, 메시지는 이전한다.

| 유형 | `reason` |
|---|---|
| 명령·코드 예시(X1), 설명용 예시(X2), Task 도구 필드(X4) | `instructions-en: <X1\|X2\|X4>` |
| 소비자가 파싱하는 형식 토큰(X3) | `consumer-parsed format token` |
| 스크립트 출력 인용(X5) | `script-messages-en` |
| 매칭 데이터·레거시 레이블(X6) | `parsed data token` |

문자열을 바꾸거나 지우는 변경은 해당 항목도 고치거나 지운다(`stale-allow`가 이를 강제한다).
