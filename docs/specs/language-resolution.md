# 언어 결정 (lang.js)

> `node .harness/scripts/lang.js resolve --kind=conversation|docs|commit`이 대화·문서·커밋 언어를 `ko`/`en` 한 줄로 결정한다. docs·commit은 CLAUDE.md·AGENTS.md의 `## Language` 마커 블록을, conversation은 Claude Code `language` 설정을 읽는다.

## 개요

하네스 컴포넌트가 사용자에게 보여 줄 문구의 언어를 정할 때 쓰는 단일 CLI다. Claude와 Codex가 같은 CLI·같은 규칙을 쓰며, 호출 환경을 구분하는 인자는 없다. 결정 결과는 항상 `ko` 또는 `en`이고, 설정에 문제가 있어도 실패하지 않고 경고와 함께 `en`으로 진행한다.

| 차원 | 원본 |
|---|---|
| conversation | Claude Code `language` 설정 (local → project → user), 없으면 docs 결과 |
| docs | 언어 규칙 블록의 `docs` |
| commit | 언어 규칙 블록의 `commit` |

이 토픽 시점에는 `lang.js`를 호출하는 컴포넌트가 없다. `/flow-init`의 블록 생성·검사와 메시지 카탈로그 연동은 후속 토픽(`flow-init-language-block` → `message-catalogs`)이 맡는다. 그 전까지 `/flow-init`은 여전히 자유 텍스트 `## 언어 규칙` 섹션을 생성한다.

## 구조 / 스키마

### 파일

| 경로 | 역할 |
|---|---|
| `src/.harness/scripts/lang.js` | CLI와 판정 순수 함수 (ESM). self-sync로 루트 `.harness/scripts/`에 반영 |
| `src/.harness/scripts/lang.test.js` | `node:test` 테스트 — 순수 함수 단위 테스트와 CLI 테스트 |

프로젝트 루트는 스크립트 위치 기준 `../..`(`dev-context.js`와 같음), 사용자 홈은 `os.homedir()`다. 테스트 전용 환경 변수 `LANG_JS_ROOT`·`LANG_JS_HOME`이 설정돼 있으면(빈 값 제외) 그 경로를 루트·홈으로 쓴다.

### 언어 규칙 블록

`src/CLAUDE.md`·`src/AGENTS.md`의 `## Language` 섹션:

```markdown
## Language

Replies to the user follow the Claude Code `language` setting.

<!-- harness-language:begin -->
- docs: ko
- commit: ko
- comments: ko
- code identifiers: en
- component files: en (executable instructions only; translation catalogs are data)
<!-- harness-language:end -->
```

`lang.js`는 `docs`·`commit`만 해석한다. 나머지 키는 사람·모델이 읽는 규칙이다.

### 블록 문법

- **줄 분리**: `\n`으로 나누고 각 줄 끝 `\r` 하나를 제거한다. CRLF 파일도 LF와 같은 결과를 낸다.
- **코드 펜스** (CommonMark): 여는 펜스는 들여쓰기 0~3칸 + 같은 문자 3개 이상의 백틱 또는 물결표 줄(백틱 펜스의 info 문자열에는 백틱 불가). 닫는 펜스는 들여쓰기 0~3칸, 같은 문자, 여는 펜스 이상 길이, 뒤에는 공백만. 닫히지 않은 펜스는 파일 끝까지 이어진다. 펜스 판정은 파일 전체에 한 번 적용되며 펜스 줄 자체도 펜스 안이다.
- **마커**: 줄 전체가 마커 문자열(뒤쪽 스페이스·탭 허용)이고 열 0에서 시작하며 펜스 밖일 때만 인식한다.
- **키 줄** (펜스 밖 줄에만 적용): `^-[ ]+(?<key>[a-z][a-z ]*?):[ \t]*(?<value>.*?)[ \t]*$`와 같은 결과. `- docs:ko`는 `ko`, `- docs:`·`- docs:   `는 키가 있고 값이 빈 줄(누락). 문법에 맞지 않는 줄(`- Docs: ko`, `- docs : ko` 등)은 무시한다. 구현은 값 앞뒤 공백 제거를 정규식 밖에서 해 긴 공백 줄에서도 선형 시간으로 판정한다.
- **유효성**: begin 하나·end 하나가 그 순서로 있고 블록 안에서 `docs`·`commit`이 각각 최대 한 번(빈 값 줄도 한 번으로 셈)이면 유효. begin만·end만·역순·블록 둘 이상·해석 대상 키 반복은 malformed. 해석 대상이 아닌 키의 반복은 무시한다. 마커가 하나도 없으면 블록 없음.

### 값 정규화

앞뒤 공백 제거 → 소문자화 → 대응표 조회.

| 결과 | 입력 |
|---|---|
| `ko` | `korean`, `한국어`, `ko`, `kor`, `ko-`로 시작하는 태그 |
| `en` | `english`, `영어`, `en`, `eng`, `en-`로 시작하는 태그 |
| 미지원 | 그 밖의 비어 있지 않은 문자열 (`ko_kr`, `korea`, `kr` 포함) |
| 누락 | 빈 문자열·공백뿐·비문자열 |

### 공개 함수

다른 서브커맨드가 재사용할 수 있도록 named export한다. 두 함수 모두 파일 I/O와 출력을 하지 않는다.

| 함수 | 반환 |
|---|---|
| `normalizeLanguage(raw)` | `'ko'` · `'en'` · 미지원 `null` · 누락 `undefined` |
| `parseLanguageBlock(content)` | `{status:'none'}` · `{status:'malformed'}` · `{status:'valid', values}` — `values`에는 블록에 나온 `docs`·`commit`만 담고, 값이 빈 줄이면 `''` |

## 동작

### docs·commit

`<root>/CLAUDE.md`에 유효한 블록이 있으면 그 블록만 본다. CLAUDE.md가 없거나 블록이 없거나 malformed이면 `<root>/AGENTS.md`를 같은 규칙으로 본다. 둘 다 없으면 `en`.

선택된 블록 안에서 키가 없거나 값이 비면 경고 없이 `en`, 값이 미지원이면 `en` + 경고. 두 경우 모두 AGENTS.md로 넘어가지 않는다(키 단위 fallback 없음).

### conversation

`<root>/.claude/settings.local.json` → `<root>/.claude/settings.json` → `<home>/.claude/settings.json` 순으로, `language`가 trim 후 비어 있지 않은 문자열인 첫 파일에서 멈춘다. `language`는 `Object.hasOwn` 가드 후 읽는다. 공백뿐인 값·비문자열은 미설정으로 보고 다음 파일로 넘어간다. 멈춘 파일의 값이 미지원이면 `en`이고 다음 파일로 넘어가지 않는다. 세 파일 모두 값이 없으면 docs 결정 결과를 출력하며, 그 과정의 경고도 settings 경고 뒤에 그대로 출력한다.

### 출력과 오류

설정 관련 문제는 모두 exit 0으로 진행하고, 호출 형식 오류만 exit 1이다. exit 0일 때 stdout은 항상 `ko` 또는 `en` 한 줄이다.

| 상황 | stdout | stderr | exit |
|---|---|---|---|
| 정상 결정·fallback·키 누락 | `ko` / `en` | — | 0 |
| 미지원 값 | `en` | `unsupported language '<v>' in <file>, using en` | 0 |
| 파일 없음 | (다음 단계로) | — | 0 |
| 읽기 오류 | (해당 파일 건너뜀) | `cannot read <file>: <code>` | 0 |
| JSON 파싱 실패 | (해당 파일 건너뜀) | `cannot read <file>: invalid JSON` | 0 |
| 최상위 값이 객체 아님 | (해당 파일 건너뜀) | `cannot read <file>: top-level value is not an object` | 0 |
| malformed 블록 | (블록 없음으로 처리) | `malformed language block in <file>` | 0 |
| 호출 형식 오류 | (비어 있음) | `usage: node .harness/scripts/lang.js resolve --kind=conversation\|docs\|commit` | 1 |

- `<file>`: 프로젝트 파일은 루트 기준 상대 경로(`CLAUDE.md`, `.claude/settings.local.json`), 사용자 설정은 리터럴 `~/.claude/settings.json`.
- `<code>`: Node 오류 코드(`EISDIR`, `EACCES` 등), 없으면 `read failed`. 오류 메시지·JSON 파싱 메시지는 절대 경로나 파일 본문을 담을 수 있어 출력하지 않는다.
- `<v>`: trim 후 원래 대소문자를 유지한 사용자 값 그대로.
- 호출 형식은 정확히 `resolve --kind=<conversation|docs|commit>` 두 인자다. 서브커맨드 누락·다른 서브커맨드, `--kind` 누락·빈 값·허용 외 값(대소문자 포함), 추가 인자, `--kind` 중복, 분리 형식(`--kind docs`)은 모두 호출 형식 오류다.

## 제약사항

- **managed settings·`--settings` 미반영**: Claude Code는 managed settings와 명령줄 `--settings`를 더 높은 우선순위로 쓰지만 `lang.js`는 읽지 않는다. 이 경우 결정 언어와 모델 응답 언어가 다를 수 있다.
- **지원 언어**: `ko`·`en` 두 가지뿐이다.
- **미지원 값 표시**: 경고의 `<v>`는 사용자 값을 길이 제한·제어 문자 정제 없이 그대로 출력한다.
- **BOM**: UTF-8 BOM으로 시작하는 settings 파일은 `invalid JSON`으로 처리된다. 1행 begin 마커 앞의 BOM은 블록을 malformed로 만든다.
- **파일 형식**: 읽기 전에 크기·파일 형식을 확인하지 않는다(FIFO·대용량 파일 대비 없음).
- **배포 대상의 G2 확인**: `src/.harness/scripts/`는 대상 프로젝트로 배포되므로 저장소 고유의 블록 값 검사를 테스트에 넣지 않는다. 하네스 저장소에서는 self-sync 후 루트에서 `resolve --kind=docs`·`--kind=commit`이 `ko`인지 확인한다.
