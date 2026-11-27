# 언어 결정 (lang.js)

> `node .harness/scripts/lang.js`는 대화·문서·커밋 언어를 `ko`/`en`으로 결정하는 단일 CLI다. `resolve`는 결정값 한 줄을, `explain`은 결정값과 출처·사유를, `recommend`는 `/flow-init`이 물을 언어 권장값을, `check`는 쓰기 전 조립본의 언어 블록 검사 결과를 출력한다.

## 개요

하네스 컴포넌트가 사용자에게 보여 줄 문구의 언어를 정할 때 쓰는 단일 CLI다. Claude와 Codex가 같은 CLI·같은 규칙을 쓰며, 호출 환경을 구분하는 인자는 없다. 결정 결과는 항상 `ko` 또는 `en`이고, 설정에 문제가 있어도 실패하지 않고 경고와 함께 `en`으로 진행한다.

| 차원 | 원본 |
|---|---|
| conversation | Claude Code `language` 설정 (local → project → user), 없으면 docs 결과 |
| docs | 언어 규칙 블록의 `docs` |
| commit | 언어 규칙 블록의 `commit` |

| 서브커맨드 | 용도 | 호출자 |
|---|---|---|
| `resolve --kind=<k>` | 결정값 한 줄 | 언어가 필요한 컴포넌트 |
| `explain --kind=<k>` | 결정값·출처·사유 세 줄 | `/flow-init` Step 7 |
| `recommend` | docs·commit·comments 권장값과 사유 JSON | `/flow-init` Step 2 |
| `check --file=... --expect-*` | 조립본의 언어 블록 검사 JSON | `/flow-init` 쓰기 단계 |

`/flow-init`이 블록을 생성·검사하는 흐름은 [flow-init-language-block.md](flow-init-language-block.md)에 있다. 메시지 카탈로그 연동은 후속 토픽(`message-catalogs`)이 맡는다.

## 구조 / 스키마

### 파일

| 경로 | 역할 |
|---|---|
| `src/.harness/scripts/lang.js` | CLI 진입점, `resolve`·`explain` 결정 로직, 서브커맨드 분기. `normalizeLanguage`·`parseLanguageBlock`을 re-export |
| `src/.harness/scripts/lang-core.js` | 펜스·마커·줄 문법 판정의 단일 구현 (출력 없음, 파일 I/O는 `readText`뿐) |
| `src/.harness/scripts/lang-recommend.js` | `recommend` 판정 (블록·레거시 문구 → 권장값) |
| `src/.harness/scripts/lang-check.js` | `check` 인자 해석과 판정 |
| `src/.harness/scripts/lang.test.js` | 정규화·블록 판정 단위 테스트와 `resolve` CLI 테스트 |
| `src/.harness/scripts/lang-explain.test.js` · `lang-recommend.test.js` · `lang-check.test.js` | 서브커맨드별 CLI 테스트 |
| `src/.harness/scripts/lang-test-fixture.js` | 서브커맨드 테스트 공용 임시 루트·홈 fixture (`*.test.js` glob 밖) |

모든 파일은 ESM이며 self-sync로 루트 `.harness/scripts/`에 반영된다. 프로젝트 루트는 스크립트 위치 기준 `../..`(`dev-context.js`와 같음), 사용자 홈은 `os.homedir()`다. 테스트 전용 환경 변수 `LANG_JS_ROOT`·`LANG_JS_HOME`이 설정돼 있으면(빈 값 제외) 그 경로를 루트·홈으로 쓴다. `check --file`만 현재 작업 디렉토리 기준으로 읽는다.

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

`resolve`·`explain`은 `docs`·`commit`만 해석한다. `recommend`·`check`는 `comments`까지 다룬다. 나머지 키는 사람·모델이 읽는 규칙이다.

### 블록 문법

- **줄 분리**: `\n`으로 나누고 각 줄 끝 `\r` 하나를 제거한다. CRLF 파일도 LF와 같은 결과를 낸다.
- **코드 펜스** (CommonMark): 여는 펜스는 들여쓰기 0~3칸 + 같은 문자 3개 이상의 백틱 또는 물결표 줄(백틱 펜스의 info 문자열에는 백틱 불가). 닫는 펜스는 들여쓰기 0~3칸, 같은 문자, 여는 펜스 이상 길이, 뒤에는 공백만. 닫히지 않은 펜스는 파일 끝까지 이어진다. 펜스 판정은 파일 전체에 한 번 적용되며 펜스 줄 자체도 펜스 안이다.
- **마커**: 줄 전체가 마커 문자열(뒤쪽 스페이스·탭 허용)이고 열 0에서 시작하며 펜스 밖일 때만 인식한다.
- **키 줄** (펜스 밖 줄에만 적용): `^-[ ]+(?<key>[a-z][a-z ]*?):[ \t]*(?<value>.*?)[ \t]*$`와 같은 결과. `- docs:ko`는 `ko`, `- docs:`·`- docs:   `는 키가 있고 값이 빈 줄(누락). 문법에 맞지 않는 줄(`- Docs: ko`, `- docs : ko` 등)은 무시한다. 구현은 값 앞뒤 공백 제거를 정규식 밖에서 해 긴 공백 줄에서도 선형 시간으로 판정한다.
- **유효성**: begin 하나·end 하나가 그 순서로 있고 블록 안에서 `docs`·`commit`이 각각 최대 한 번(빈 값 줄도 한 번으로 셈)이면 유효. begin만·end만·역순·블록 둘 이상·`docs`·`commit` 반복은 malformed. 그 밖의 키 반복은 유효성에 영향이 없다. 마커가 하나도 없으면 블록 없음.

### 값 정규화

앞뒤 공백 제거 → 소문자화 → 대응표 조회.

| 결과 | 입력 |
|---|---|
| `ko` | `korean`, `한국어`, `ko`, `kor`, `ko-`로 시작하는 태그 |
| `en` | `english`, `영어`, `en`, `eng`, `en-`로 시작하는 태그 |
| 미지원 | 그 밖의 비어 있지 않은 문자열 (`ko_kr`, `korea`, `kr` 포함) |
| 누락 | 빈 문자열·공백뿐·비문자열 |

### 공개 함수

`lang.js`는 기존 호출을 위해 아래 두 함수를 re-export한다. 둘 다 파일 I/O와 출력을 하지 않는다.

| 함수 | 반환 |
|---|---|
| `normalizeLanguage(raw)` | `'ko'` · `'en'` · 미지원 `null` · 누락 `undefined` |
| `parseLanguageBlock(content)` | `{status:'none'}` · `{status:'malformed'}` · `{status:'valid', values}` — `values`에는 블록에 나온 `docs`·`commit`만 담고, 값이 빈 줄이면 `''` |

`lang-core.js`는 서브커맨드 모듈이 쓰는 판정 함수(`splitLines`, `outsideFenceFlags`, `findMarkers`, `parseKeyLine`, `isMarker`, `analyzeMarkdown`, 마커 상수, `readText`)도 export한다. `analyzeMarkdown(content)`는 줄 배열, 줄별 펜스 밖 여부, 펜스 범위 `{open, close}`(1부터 센 줄, 닫히지 않으면 `close: null`), 펜스 밖 마커 위치 `{line, kind}`를 돌려준다. 다른 모듈은 펜스·마커·키 줄 판정을 새로 구현하지 않는다.

## 동작

### resolve — docs·commit

`<root>/CLAUDE.md`에 유효한 블록이 있으면 그 블록만 본다. CLAUDE.md가 없거나 블록이 없거나 malformed이면 `<root>/AGENTS.md`를 같은 규칙으로 본다. 둘 다 없으면 `en`.

선택된 블록 안에서 키가 없거나 값이 비면 경고 없이 `en`, 값이 미지원이면 `en` + 경고. 두 경우 모두 AGENTS.md로 넘어가지 않는다(키 단위 fallback 없음).

### resolve — conversation

`<root>/.claude/settings.local.json` → `<root>/.claude/settings.json` → `<home>/.claude/settings.json` 순으로, `language`가 trim 후 비어 있지 않은 문자열인 첫 파일에서 멈춘다. `language`는 `Object.hasOwn` 가드 후 읽는다. 공백뿐인 값·비문자열은 미설정으로 보고 다음 파일로 넘어간다. 멈춘 파일의 값이 미지원이면 `en`이고 다음 파일로 넘어가지 않는다. 세 파일 모두 값이 없으면 docs 결정 결과를 출력하며, 그 과정의 경고도 settings 경고 뒤에 그대로 출력한다.

### explain

`resolve`와 같은 결정 함수를 써서 같은 값과 같은 경고를 내고, stdout에 세 줄을 출력한다.

```
value=<ko|en>
source=<파일 | ~/.claude/settings.json | default>
reason=<사유>
```

| kind | 경우 | `source` | `reason` |
|---|---|---|---|
| docs·commit | 선택 블록의 지원 값 | 그 블록 파일 | `set` |
| docs·commit | 선택 블록의 키 누락·빈 값 | 그 블록 파일 | `missing-key` |
| docs·commit | 선택 블록의 미지원 값 | 그 블록 파일 | `unsupported` |
| docs·commit | 유효한 블록 없음 | `default` | `no-source` |
| conversation | settings 파일에서 값을 찾음 | 그 파일 표기 | `set` · `unsupported` |
| conversation | settings에 값 없음 | docs 결정의 `source` | `fallback-docs` (값도 docs 결정값) |

### recommend

CLAUDE.md·AGENTS.md를 읽어 docs·commit·comments 권장값을 JSON 한 줄로 출력한다. 기본 권장값은 `ko`다.

```json
{"docs":{"value":"ko","origin":"block","source":"CLAUDE.md","notes":[]},
 "commit":{...},"comments":{...},
 "files":{"CLAUDE.md":"valid|none|malformed|absent|unreadable","AGENTS.md":"..."}}
```

- **원본 블록**: CLAUDE.md에 유효한 블록이 있으면 그 블록, 없으면 AGENTS.md의 유효한 블록. 원본 블록 안 펜스 밖 키 줄에서 세 키의 출현을 모두 모은다.
- **키별 결정**:

  | 경우 | `value` | `origin` | `source` | `notes` |
  |---|---|---|---|---|
  | 원본 블록의 지원 값 | 그 값 | `block` | 원본 파일 | `[]` |
  | 원본 블록의 키 누락·빈 값 | `ko` | `default` | 원본 파일 | `["missing"]` |
  | 원본 블록의 미지원 값 | `ko` | `default` | 원본 파일 | `["unsupported:<v>"]` |
  | 원본 블록의 `comments` 반복 | `ko` | `default` | 원본 파일 | `["duplicate"]` |
  | 블록 없음, 레거시 줄이 일관된 지원 값 | 그 값 | `legacy` | `CLAUDE.md` | `[]` |
  | 블록 없음, 레거시 줄이 같은 미지원 원문 | `ko` | `default` | `CLAUDE.md` | `["unsupported:<v>"]` |
  | 블록 없음, 레거시 줄끼리 값이 다름 | `ko` | `default` | `CLAUDE.md` | `["legacy-conflict"]` |
  | 블록 없음, 레거시 섹션에 이 키를 주는 줄 없음 | `ko` | `default` | `CLAUDE.md` | `["missing"]` |
  | 블록도 레거시 섹션도 없음 | `ko` | `default` | `null` | `[]` |

- **`differs:<v>`**: 원본이 CLAUDE.md이고 AGENTS.md에도 유효한 블록이 있을 때, AGENTS.md의 같은 키가 한 번만 나오고 지원 값으로 정규화되며 권장값과 다르면 붙는다. `notes` 순서는 `missing`·`unsupported`·`duplicate`·`legacy-conflict`·`differs`다.
- **블록 없음**: 두 파일 모두 유효한 블록이 없으면(CLAUDE.md가 malformed인 경우 포함) CLAUDE.md 레거시 문구에서 값을 찾는다.
- **레거시 문구**: CLAUDE.md에서 펜스와 무관하게 줄 끝 공백·탭을 뗀 값이 정확히 `@.harness/harness-guide.md`인 첫 줄이 경계이고, 그 줄이 없으면 레거시 추출을 하지 않는다. 경계 앞에서 펜스 밖 첫 `## 언어 규칙` 헤더부터 다음 펜스 밖 `## ` 줄 또는 경계 직전까지가 섹션이다. 섹션 안 펜스 밖 `- <레이블 목록>: **<언어>**` 줄을 읽고, 레이블을 `,`·`·`로 나눠 `문서`→docs, `주석`→comments, `커밋`→commit에 값을 준다. 언어 값이 공백뿐인 줄은 값 줄이 아니다. 키별 판정은 정규화 후 값으로 하며, 미지원 원문 비교는 trim 후 대소문자를 구분한다.
- `<v>`는 trim 후 원래 대소문자를 유지한 값이다. 미지원·누락·malformed는 stderr가 아니라 `notes`·`files`로만 알린다.

### check

최종 조립본 파일 하나를 판정해 JSON 한 줄을 출력한다. `/flow-init`이 대상 파일을 쓰기 전에 임시 파일로 호출한다.

```
check --file=<path> --expect-begin=<n> --expect-end=<n> --expect-docs=<ko|en> --expect-commit=<ko|en> --expect-comments=<ko|en>
```

```json
{"status":"ok|unrecognized|conflict|invalid-block",
 "expected":{"begin":{"line":12,"recognized":true,"coveringFence":null},"end":{"line":18,"recognized":true,"coveringFence":null}},
 "extraMarkers":[{"line":40,"kind":"begin"}],
 "block":{"valid":true,"reason":null}}
```

- **인자**: 여섯 플래그가 각각 정확히 한 번 `--flag=value` 형식으로 나와야 하고(순서 무관) 다른 인자는 허용하지 않는다. 기대 줄은 `^[1-9][0-9]*$`, 기대 값은 정확히 `ko`·`en`. 판정 순서는 형식 오류 → 파일 읽기 실패 → `begin < end ≤ 파일 줄 수` 위반이다. 파일 줄 수는 내용이 줄바꿈으로 끝나 생긴 마지막 빈 요소를 세지 않는다.
- **인식**: 기대 begin 줄에 begin 마커, 기대 end 줄에 end 마커가 블록 문법대로 인식돼야 `recognized: true`다. 기대 줄을 펜스가 덮으면 `coveringFence: {open, close}`(닫히지 않은 펜스는 `close: null`). `extraMarkers`는 기대 두 줄을 뺀 위치에서 인식된 모든 마커(줄 순서)이며, 기대 줄 위의 마커는 종류와 무관하게 세지 않는다.
- **판정 순서**: (1) 기대 마커 하나라도 미인식 → `unrecognized` (2) `extraMarkers`가 있음 → `conflict` (3) 쓰기용 검증 실패 → `invalid-block` (4) 그 밖 → `ok`. (1)·(2)에서는 `block: null`.
- **쓰기용 검증**: 블록 안 펜스 밖 줄(펜스를 여닫는 줄 제외)을 위에서부터 검사한다. 키 줄 문법에 맞지 않는 줄(빈 줄 포함)은 `unparsable line: <n>`. `docs`·`commit`·`comments`는 각각 한 번만(`duplicate key: <k>`), 값은 문자 그대로 `ko`·`en`(`non-canonical value: <k>=<v>`), 기대 값과 같아야 한다(`value mismatch: <k> expected <e> got <v>`). 한 줄에 여럿이면 앞의 순서로 첫 사유, 줄 위반이 없으면 `missing key: <k>`를 `docs`·`commit`·`comments` 순으로 낸다. 그 밖의 키는 문법만 맞으면 통과한다.

### 출력과 오류

설정 관련 문제는 모두 exit 0으로 진행하고, 호출 형식 오류와 `check`의 파일 읽기 실패만 exit 1이다.

| 상황 | stdout | stderr | exit |
|---|---|---|---|
| 정상 결정·fallback·키 누락 | 결과 | — | 0 |
| 미지원 값 (`resolve`·`explain`) | 결과 (`en`) | `unsupported language '<v>' in <file>, using en` | 0 |
| 파일 없음 | (다음 단계로) | — | 0 |
| 읽기 오류 (`resolve`·`explain`·`recommend`) | (해당 파일 건너뜀) | `cannot read <file>: <code>` | 0 |
| JSON 파싱 실패 (settings) | (해당 파일 건너뜀) | `cannot read <file>: invalid JSON` | 0 |
| 최상위 값이 객체 아님 (settings) | (해당 파일 건너뜀) | `cannot read <file>: top-level value is not an object` | 0 |
| malformed 블록 (`resolve`·`explain`) | (블록 없음으로 처리) | `malformed language block in <file>` | 0 |
| `check` 파일 읽기 실패 | (비어 있음) | `cannot read <--file 값>: <code>` | 1 |
| 호출 형식 오류 | (비어 있음) | 서브커맨드별 사용법 한 줄 | 1 |

사용법 한 줄:

- 인자 없음·`resolve`·알 수 없는 서브커맨드: `usage: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit`
- `explain`: `usage: node .harness/scripts/lang.js explain --kind=conversation|docs|commit`
- `recommend`: `usage: node .harness/scripts/lang.js recommend`
- `check`: `usage: node .harness/scripts/lang.js check --file=<path> --expect-begin=<n> --expect-end=<n> --expect-docs=<ko|en> --expect-commit=<ko|en> --expect-comments=<ko|en>`

- `<file>`: 프로젝트 파일은 루트 기준 상대 경로(`CLAUDE.md`, `.claude/settings.local.json`), 사용자 설정은 리터럴 `~/.claude/settings.json`.
- `<code>`: Node 오류 코드(`EISDIR`, `EACCES`, `ENOENT` 등), 없으면 `read failed`. 오류 메시지·JSON 파싱 메시지는 절대 경로나 파일 본문을 담을 수 있어 출력하지 않는다.
- `<v>`: trim 후 원래 대소문자를 유지한 사용자 값 그대로.
- `resolve`·`explain` 호출 형식은 정확히 `<서브커맨드> --kind=<conversation|docs|commit>` 두 인자다. `--kind` 누락·빈 값·허용 외 값(대소문자 포함), 추가 인자, `--kind` 중복, 분리 형식(`--kind docs`)은 모두 호출 형식 오류다. `recommend`는 추가 인자를 받지 않는다.

## 제약사항

- **managed settings·`--settings` 미반영**: Claude Code는 managed settings와 명령줄 `--settings`를 더 높은 우선순위로 쓰지만 `lang.js`는 읽지 않는다. 이 경우 결정 언어와 모델 응답 언어가 다를 수 있다.
- **지원 언어**: `ko`·`en` 두 가지뿐이다.
- **미지원 값 표시**: 경고와 `notes`의 `<v>`는 사용자 값을 길이 제한·제어 문자 정제 없이 그대로 출력한다.
- **BOM**: UTF-8 BOM으로 시작하는 settings 파일은 `invalid JSON`으로 처리된다. 1행 begin 마커 앞의 BOM은 블록을 malformed로 만들고, `check`에서는 그 줄을 인식하지 못한다.
- **파일 형식**: 읽기 전에 크기·파일 형식을 확인하지 않는다(FIFO·대용량 파일 대비 없음).
- **`check --file` 경로**: 상위 경로(`..`)와 심볼릭 링크를 그대로 따라간다. 읽은 내용은 출력하지 않고 판정 결과만 낸다.
- **배포 대상의 확인**: `src/.harness/scripts/`는 대상 프로젝트로 배포되므로 저장소 고유의 블록 값 검사를 테스트에 넣지 않는다. 하네스 저장소에서는 self-sync 후 루트에서 `resolve --kind=docs`·`--kind=commit`이 `ko`인지 확인한다.
