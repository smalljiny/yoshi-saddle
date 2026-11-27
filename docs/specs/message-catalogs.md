# 메시지 카탈로그

> 하네스 컴포넌트(스킬·에이전트·커맨드·Codex 스킬)의 사용자 대면 메시지는 ko·en 카탈로그에 있고, 본문은 닫힌 참조 토큰으로만 메시지를 가리킨다. 출력 언어는 `lang.js resolve`가 정한 conversation 언어를 따르며, `i18n-check.js`가 카탈로그·참조·잔존 한글을 정적으로 검사한다.

## Overview

사용자에게 보여 주는 블록·문장·상태 라벨·질문 문구는 컴포넌트 본문이 아니라 언어별 카탈로그 파일에 있다. 본문은 `{{msg:ID}}`·`{{ask:…}}` 토큰만 두고, 실행하는 모델이 conversation 언어 카탈로그에서 문구를 찾아 출력한다. 언어 설정만 바꾸면 같은 워크플로우가 다른 언어로 말한다.

이 문서가 다루는 범위:

- 카탈로그 파일 위치와 형식
- 참조 토큰 문법, 카탈로그 로드, 누락 시 처리(답을 받는 질문은 멈춤)
- 에이전트 위임 시 `Language:` 줄 전달
- 검사기 `i18n-check.js`와 허용 목록 `residual-allow.json`
- 배포 시 언어 블록 부재 안내

규칙의 정본은 `.claude/rules/common/component-boundaries.md`(Message Catalogs)와 `.claude/rules/common/agents.md`(Language Line on Delegation)다. 언어 결정 자체는 [language-resolution.md](language-resolution.md)를 따른다.

## Structure / Schema

### 카탈로그 위치

| 컴포넌트 | 카탈로그 (`<lang>` = `en`·`ko`) |
|---|---|
| 스킬 `.claude/skills/<skill>/` (`SKILL.md`와 하위 참조 파일이 공유) | `.claude/skills/<skill>/templates/messages.<lang>.md` |
| Codex 스킬 `.codex/skills/<skill>/` | `.codex/skills/<skill>/templates/messages.<lang>.md` |
| 에이전트 `.claude/agents/<agent>.md` | `.harness/i18n/<lang>/agents/<agent>.md` |
| 커맨드 `.claude/commands/<path>.md` | `.harness/i18n/<lang>/commands/<path>.md` |
| 공통 (두 개 이상 컴포넌트가 바이트 단위로 같은 문구를 씀) | `.harness/i18n/<lang>/common.md` |

`stack-*`·`learned/` 스킬, rules·contracts·templates, CLAUDE.md·AGENTS.md는 메시지 이전 대상이 아니다.

### 카탈로그 형식

````markdown
## INVALID_TOPIC_NAME

```text
Invalid topic name. Only letters, digits, hyphens, and underscores are allowed.
```
````

- 파일에는 `## <ID>` 제목과 그 아래 코드 블록 1개만 있다. ID는 `[A-Z][A-Z0-9_]*`이고 파일 안에서 유일하다.
- 기준 언어는 `en`이다. ko의 ID 집합은 en과 같다.
- 플레이스홀더는 `{snake_case}`이고, 같은 ID의 ko·en은 플레이스홀더 집합이 같다. 사용자가 입력할 자리를 보여 주는 사용법 표기(`/flow-spec <topic>`)는 `<…>` 그대로다.
- AskUserQuestion 필드 ID: `<BASE>_Q`(question), `<BASE>_HEADER`(header, 12자 이하), `<BASE>_<OPT>_LABEL`, `<BASE>_<OPT>_DESC`.
- `(Recommended)`는 카탈로그에 없다. 본문이 첫 옵션 label 뒤에 붙인다.
- 응답 구문(`y`·`n`·`skip`·`edit`·`-`·`+`)과 예시 입력은 ko·en에 같은 문자열이다.
- 카탈로그에는 메시지만 있고 모델에게 주는 지시는 없다.

### 참조 토큰

| 토큰 | 의미 |
|---|---|
| `{{msg:ID}}` | 메시지 하나를 보여 준다 |
| `{{ask:BASE\|OPT1\|OPT2…}}` | 고정 선택지 AskUserQuestion. 나열 순서가 기본 옵션 순서이고 첫 옵션이 권장이다 |
| `{{ask:BASE\|*}}` | 동적 선택지 AskUserQuestion. `_Q`·`_HEADER`만 카탈로그에 있고 선택지는 본문 규칙으로 만든다 |

- 공통 메시지는 `common:` 접두사를 붙인다(`{{msg:common:INVALID_TOPIC_NAME}}`).
- 코드 블록·인라인 코드 밖의 `{{`만 토큰이다. 같은 줄의 가장 가까운 `}}`까지가 토큰이며 문법에 맞지 않으면 `malformed-ref`다.
- 권장 옵션이 실행 중 정해지는 질문은 본문이 조건을 적고, 권장 옵션을 첫 위치로 옮긴 뒤 나머지는 기본 순서를 유지한다.

### 허용 목록

`.harness/i18n/residual-allow.json`은 메시지가 아닌데 한글이 남는 검사 단위를 등록한다.

```json
[{ "file": "<root-relative path>", "text": "<exact check unit>", "reason": "<reason>" }]
```

| 유형 | `reason` |
|---|---|
| 명령·코드 예시, 설명용 예시, Task 도구 필드 | `instructions-en: X1` · `X2` · `X4` |
| 소비자가 파싱하는 형식 토큰 (예: `Acceptance: N/M eval 통과`) | `consumer-parsed format token` |
| 스크립트 출력 인용 | `script-messages-en` |
| 매칭 데이터·레거시 레이블 (예: spec-review 구 한국어 제목 별칭) | `parsed data token` |

## Behavior

### 카탈로그 로드

토큰을 쓰는 스킬·커맨드·Codex 스킬은 첫 사용자 대면 메시지 전에 다음을 한다.

1. `node .harness/scripts/lang.js resolve --kind=conversation`을 한 번 실행한다. exit 0이 아니거나 stdout이 `ko`·`en`이 아니면 `en`이다.
2. 같은 단계에서 본문이 참조하는 카탈로그(결정된 언어와 `en`)를 Read로 읽는다. 자기 토큰만 있으면 자기 카탈로그, `common:` 토큰만 있으면 `common.md`만 읽는다. 지연 로드는 없다.

에이전트는 `lang.js`를 실행하지 않고 위임 프롬프트 첫 줄의 `Language:` 줄에서 conversation 값을 읽는다.

### 메시지 해석과 누락

표준 로드 블록 뒤의 해석 문단에 따라, 모델은 메시지를 내기 전에 읽은 카탈로그에서 ID를 찾는다.

| 상황 | 처리 |
|---|---|
| 결정된 언어 파일·ID 없음 | `en` 값을 쓴다 |
| `en` 파일도 없음 | `[missing catalog: <path>]` 출력 후 계속 |
| `en` 파일은 있으나 ID 없음 | `[missing message: <ID>]` 출력 후 계속 |

누락 자리에서 대체 문구를 짓거나 의도를 풀어 쓰거나 대신 질문하지 않는다.

### 답을 받는 질문

AskUserQuestion, 답을 받는 일반 텍스트 질문, 보고+질문 혼합 블록은 누락 시 계속하지 않는다.

- 본문은 질문마다 답 필수 ID와 멈춘 뒤 하지 않을 후속 동작을 적는다.
- 질문(혼합 블록은 첫 줄) 전에 `grep -hxE '## (<ID>|…)' <결정 언어 카탈로그> <en 카탈로그>`로 현재 분기에서 실제로 표시할 답 필수 ID를 확인한다.
- 하나라도 얻지 못하면 질문을 내지 않고 진단만 출력한 뒤 입력을 기다리지 않고 멈춘다. 질문 이후의 파일 쓰기·상태 전환·커밋·외부 호출·위임은 하지 않으며, 질문 전에 끝난 쓰기는 되돌리지 않는다.
- 혼합 블록은 세 부분으로 나뉜다. 질문 부분(질문 문장과 응답 형식 안내)과 응답 대상 부분(후보·값 줄)은 답 필수이고, 장식 부분(블록 제목)은 누락돼도 진단 후 계속한다.
- 일반 텍스트 질문은 AskUserQuestion으로 바꾸지 않는다. Codex 스킬은 카탈로그 문구를 플레이스홀더만 채워 줄·번호·순서 그대로 출력하고 `(Recommended)` 같은 표지를 붙이지 않는다.

### 문서·커밋 고정 문구

spec·plan·리뷰 보고서·PR 본문·`docs/specs/`·커밋 메시지에 넣는 고정 문구는 카탈로그에 없다. 본문에 영어 템플릿으로 두고, 그 문서·커밋을 쓰는 단계가 `lang.js resolve --kind=docs`(커밋은 `--kind=commit`)로 정한 언어로 쓴다. 섹션 제목·표 열·필드 키는 영어 고정이고, 다른 컴포넌트가 문자 그대로 찾는 형식 토큰(`Acceptance: N/M eval 통과`, `- Decision:`)은 현행 문자열 그대로다.

모델이 실행하는 코드 블록 안의 출력 문구는 영어이며, 모델이 결과를 대화 언어로 전달한다.

### 에이전트 언어 전달

`.claude/agents/`의 에이전트에 위임하는 모든 호출자(스킬·커맨드·Codex 스킬·메인 세션)는 위임 직전에 `lang.js resolve`를 `conversation`·`docs`·`commit` 세 종류 모두 실행하고, 위임 프롬프트 첫 줄에 다음을 넣는다.

```text
Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>
```

차원마다 따로 판정해 실패한 차원만 `en`으로 채운다. 같은 단계의 병렬 위임은 한 번의 resolve 결과를 공유한다. 에이전트는 `conversation`을 카탈로그 언어로, `docs`를 자기가 쓰는 문서 본문 언어로, `commit`을 제안하는 커밋 메시지 언어로 쓴다. 줄이 없으면 세 차원 모두 `en`이다.

### 검사기 `i18n-check.js`

```bash
node .harness/scripts/i18n-check.js [--root=<dir>]
```

루트 기본값은 스크립트 기준 `../..`다. 위반은 stderr에 `<file>:<line>: <kind>: <detail>` 한 줄씩 출력하고 exit 1, 위반이 없으면 stdout 요약과 exit 0, 실행 오류(알 수 없는 인자, 없는 루트)는 exit 2다.

| kind | 검사 |
|---|---|
| `orphan-file` | ko·en 중 한쪽 카탈로그 파일만 있음 |
| `missing-catalog` | 자기 메시지 토큰이 있는데 자기 카탈로그 쌍이 없음 |
| `id-mismatch` | 같은 쌍의 ID 집합이 다름 |
| `format` | ID 중복·형식 위반, 섹션 코드 블록이 1개가 아님, 섹션 밖 내용, `_HEADER` 12자 초과, 카탈로그·본문의 닫히지 않은 코드 블록 |
| `placeholder-mismatch` | 같은 ID의 ko·en 플레이스홀더 집합이 다름 |
| `malformed-ref` | 문법에 맞지 않는 토큰 |
| `unresolved-ref` | 토큰이 가리키는 ID가 en 카탈로그에 없음 |
| `unused-id` | 어떤 토큰도 가리키지 않는 ID, 또는 참조 컴포넌트가 2개 미만인 공통 ID |
| `residual` | 본문의 검사 단위에 한글이 있고 허용 목록과 일치하지 않음 |
| `stale-allow` | 허용 목록 항목이 본문에서 발견되지 않음 |

`residual` 검사 단위는 코드 블록의 한글이 든 줄(앞뒤 공백 제거), 코드 블록 밖의 인라인 코드 구간과 큰따옴표 구간이다. 검사기는 실제 경로가 검사 루트 안에 있는 파일·디렉토리만 읽고, 루트 밖을 가리키는 symlink는 없는 것으로 본다.

`src/.harness/scripts/i18n-check.test.js`는 kind별 fixture와 함께, 하네스 원본 트리(`src/`)에서 검사기가 exit 0인지, 허용 목록의 모든 `reason`이 위 사유 중 하나인지, 공통 ID마다 참조 컴포넌트가 2개 이상인지를 고정한다. 이 실제 트리 케이스는 배포 대상과 루트 동기화본에서는 건너뛴다. 검사기는 하네스 저장소의 `node --test` 묶음으로 실행하며 `/flow-verify` 게이트에는 들어가지 않는다.

### 배포 시 업그레이드 안내

`scripts/deploy-harness.sh <target>`(대상 배포 모드)은 복사가 끝난 뒤 `node "$TARGET_DIR/.harness/scripts/lang.js" explain --kind=docs`를 실행한다. exit 0이고 stdout에 `reason=no-source` 줄이 있으면 다음 안내를 출력한다.

```text
no harness language block in CLAUDE.md or AGENTS.md; run /flow-init to set docs/commit language (current: en)
```

그 밖의 결과는 출력하지 않고, 배포 종료 코드도 바꾸지 않는다. `--dry-run`과 self-sync 모드에서는 실행하지 않는다. `scripts/deploy-harness.test.sh`가 블록 없음·있음·`explain` 실패·`--dry-run`·다른 cwd·self-sync 여섯 경우를 검증한다.

## Constraints

- 지원 언어는 `ko`·`en` 둘이다. 세션 중 언어 전환은 감지하지 않는다.
- 모델이 카탈로그 문구를 그대로 내는지는 정적 검사로 확인할 수 없다. 대표 사례는 격리 사본에서 헤드리스로 실행해 확인했다.
- `residual`은 코드·따옴표 구간만 검사한다. 따옴표 없는 한글 산문 메시지와 영어 메시지는 정적으로 잡히지 않으므로 컴포넌트 수정 시 리뷰로 확인한다.
- 플레이스홀더 값 설명이 본문에 있는지는 검사하지 않는다(리뷰 대상).
- 본문에 남은 한국어 지시문은 메시지가 아니며 영어화는 후속 작업이다.
- 메시지 해석 문단과 답 필수 확인 문단은 컴포넌트마다 복사돼 있다. 문구를 바꿀 때는 모든 사본을 함께 고친다.
