---
version: 10
name: flow-init
description: Initialize or update project section of CLAUDE.md and AGENTS.md.
origin: harness
user-invocable: true
---

# /flow-init

루트 `CLAUDE.md`와 `AGENTS.md`의 프로젝트 섹션을 초기화하거나 업데이트한다.

`deploy-harness.sh`로 하네스 파일을 배포한 후, `.harness/harness-guide.md`의 내용을 기반으로 루트 `CLAUDE.md`와 `AGENTS.md`를 구성하는 환경 설정 단계다.

두 파일의 프로젝트 섹션에는 같은 `## Language` 블록(docs·commit·comments)을 쓴다. 각 파일은 Step 1에서 한 번 읽은 스냅숏을 판정·조립의 유일한 입력으로 쓰고, `쓰기 단계 (Step 3·4 공통)` 절의 순서(`lang.js check` 검사 → 스냅숏 재확인 → 변경 감지 → 백업 → 쓰기)를 통과한 조립본만 쓴다. 한 파일의 쓰기가 중단돼도 다른 파일은 계속 진행한다.

## Usage

```
/flow-init    CLAUDE.md와 AGENTS.md를 생성 또는 업데이트
```

## Execution Flow

### Step 1: 모드 분기

루트 `CLAUDE.md`와 `AGENTS.md` 각각 독립적으로 판정한다:

**스냅숏 읽기 (Step 1 시작 직후, 판정·질문보다 먼저)**: 모드 판정과 경계 탐지 불가 질문보다 먼저, `CLAUDE.md`와 `AGENTS.md` 각각에 다음 스냅숏 명령을 Bash로 한 번씩 실행한다 (`<파일>` 자리에 `CLAUDE.md` 또는 `AGENTS.md`).

```bash
node -e 'const fs=require("fs"),c=require("crypto");let r;try{const b=fs.readFileSync(process.argv[1]);r={status:"ok",hash:c.createHash("sha256").update(b).digest("hex"),content:b.toString("utf8")}}catch(e){r=e.code==="ENOENT"?{status:"absent"}:{status:"error",code:e.code||"read failed"}}process.stdout.write(JSON.stringify(r))' <파일>
```

- 스냅숏의 `content`는 그 파일의 모드 판정, Step 2 항목 1–3의 기존 값 추출, Step 3·4 파싱의 유일한 입력이다. `hash`는 쓰기 단계 재확인의 기준이다. Read 도구나 다른 명령으로 같은 파일을 판정용·해시용으로 다시 읽지 않는다. 예외는 쓰기 단계 E 직전에 Write 도구의 사전 Read 요건을 채우려고 대상 파일을 Read하는 호출 하나이며, 그 내용은 판정·조립·비교에 쓰지 않는다.
- `status`별 분기:

  | 스냅숏 결과 | 처리 |
  |---|---|
  | `absent` | 파일 없음 → 아래 모드 표의 신규 생성 행 (CLAUDE.md 우선순위 1, AGENTS.md 신규 생성) |
  | `ok` | `content`에 아래 모드 표를 적용 (CLAUDE.md는 우선순위 순) |
  | `error`, 또는 명령 exit ≠ 0·stdout JSON 해석 불가 (`code`는 `snapshot failed`) | 그 파일만 쓰기 중단. 모드 표 어느 행에도 넣지 않으므로 경계 탐지 불가 질문(백업 여부)을 하지 않는다. 그 파일의 Step 3·4 조립·검사·재확인·백업·쓰기를 모두 건너뛰고 Step 7에 `[쓰기 중단: 재확인 실패]`와 `code`를 출력한다. 이번 실행 중 읽기 권한이 복구돼도 그 파일은 쓰지 않는다 |

- 읽기 실패(`error`)는 사용자의 "중단" 선택이 아니다. Step 5·6 건너뛰기 조건은 사용자가 두 파일 모두 질문에서 "중단"을 고른 경우에만 해당하며, 한 파일이 `error`이면 Step 5·6은 실행된다. 다른 파일은 정상 진행한다.
- 경계 탐지 불가 질문은 스냅숏을 얻은 뒤에 한다. 답을 기다리는 동안 생긴 외부 수정은 쓰기 단계 재확인이 잡는다.
- **백업 경로 확정**: 경계 탐지 불가 질문을 만들 때 그 파일의 `<timestamp>`를 Bash `date +%Y%m%d%H%M%S`(로컬 시각, `YYYYMMDDHHMMSS`)로 한 번 정하고, 권장 옵션 문구의 `<timestamp>` 자리에 그 값을 넣어 실제 백업 경로로 표시한다 (예: `(Recommended) CLAUDE.md.bak.20261127071530 백업 후 재생성 모드로 진행`). CLAUDE.md·AGENTS.md 모두 같은 방식이다. "백업 후 재생성"을 고르면 그 의도와 표시한 경로만 기록하고 이 시점에는 백업을 만들지 않는다 — 백업은 쓰기 단계 D에서 이 경로로 만든다.

**CLAUDE.md 모드** (4 states with one-time migration):

아래 표를 위에서부터 순서대로 검사하고, 위에서부터 첫 일치 행이 모드다. 첫 일치 행을 찾으면 나머지 행은 검사하지 않는다.

| 우선순위 | 상태 | 모드 |
|---------|------|------|
| 1 | `CLAUDE.md` 파일 없음 | **신규 생성** (`<!-- harness-rules:begin/end -->` 마커 포함 작성) |
| 2 | `@.harness/harness-guide.md` 라인 없음 (`<!-- harness-rules:begin -->` 마커가 있어도 이 행이 우선) | **경계 탐지 불가** → 경고 출력 + `AskUserQuestion`: `(Recommended) CLAUDE.md.bak.<timestamp> 백업 후 재생성 모드로 진행` / `중단` |
| 3 | `<!-- harness-rules:begin -->` 마커 존재 | **업데이트** (begin/end 마커 사이만 재생성, 마커 외부는 일체 손대지 않음) |
| 4 | 그 밖 (`@.harness/harness-guide.md` 라인 있음 + `<!-- harness-rules:begin -->` 마커 없음) | **일회 마이그레이션** (harness-guide 직후 연속된 `@.harness/rules/<rel-path>` 라인만 marker 블록으로 감싸 in-place 변환. 비-인접 위치의 rules-prefix 라인은 사용자 콘텐츠로 간주해 손대지 않음) |

Step 1은 흐름 분기(신규 / 업데이트 / 마이그레이션 / 경계 탐지 불가)만 결정한다. 터미널 "변경 없음" 판정은 `쓰기 단계 (Step 3·4 공통)` C의 SHA-256 hash 비교가 단일 권위자다 — 업데이트·마이그레이션 모드는 항상 Step 2(프로젝트 정보 수집)·Step 3 작성 흐름(파싱→조립)·쓰기 단계(검사→재확인→hash 비교)를 그대로 진행한다.

판정 입력:
- `.harness/rules/` glob 결과: `find .harness/rules -name "*.md" -type f | sort`의 출력 (디렉토리 부재 시 빈 목록).
- `<!-- harness-rules:begin -->` / `<!-- harness-rules:end -->` 마커 사이 라인 집합 (업데이트 모드에서만 의미 있음). 마커 외부의 `@.harness/rules/<rel-path>` 접두사 라인은 사용자 콘텐츠로 간주되어 손대지 않는다 — 사용자가 의도적으로 메모·예시·체크리스트·커스텀 레이아웃에 rules import를 보존할 수 있도록 보장한다.
- `@.harness/harness-guide.md` 라인은 위치 기준 마커로, marker 블록 삽입 지점(harness-guide 직후)과 마이그레이션 모드 분기 기준을 표시한다.

**AGENTS.md 모드**:
- `AGENTS.md`가 없으면 → **신규 생성**
- 있고 `<!-- harness-guide:begin -->` 마커가 있으면 → **업데이트**
- 있지만 마커가 없으면 → **경계 탐지 불가** → 경고 출력 + `AskUserQuestion`:
  - `(Recommended) AGENTS.md.bak.<timestamp> 백업 후 재생성 모드로 진행`
  - `중단`

각 파일의 모드는 독립적으로 결정되며, 한 파일이 "중단"을 선택해도 다른 파일은 계속 진행할 수 있다.

### Step 2: 프로젝트 정보 수집

`AskUserQuestion` 도구로 아래 4개 항목을 순서대로 질문한다 (항목 4는 docs·commit·comments 세 질문). 각 질문의 첫 번째 옵션은 `(Recommended)` 레이블로 표시한다.

항목 1–3: 업데이트 모드에서는 Step 1 스냅숏의 `CLAUDE.md` `content`에서 읽은 값을 권장 옵션으로 제시한다. 항목 4의 권장값은 아래 `lang.js recommend` 결과(또는 실패 시 `ko`)만 쓰고, 기존 파일 내용에서 따로 읽지 않는다.

1. **프로젝트명** — 짧은 이름 (예: `my-app`)
   - `(Recommended)` 현재 디렉토리명: `$(basename "$PWD")`
   - 직접 입력

2. **한 줄 설명** — 프로젝트 또는 저장소의 목적
   - `(Recommended)` 기존 값 (업데이트 모드) 또는 예시
   - 직접 입력

3. **기술 스택** — 핵심 언어·프레임워크 목록 (쉼표 구분)
   - `(Recommended)` 기존 값 (업데이트 모드) 또는 예시
   - 직접 입력

4. **언어** — docs·commit·comments 세 키를 각각 질문한다. 대화 언어는 묻지 않는다 (Claude Code `language` 설정을 따름). `code identifiers`·`component files`는 묻지 않고 템플릿의 `en`으로 고정한다.
   - **권장값 계산**: 세 질문을 만들기 전에 Bash로 `node .harness/scripts/lang.js recommend`를 한 번 실행하고 stdout JSON을 파싱한다.
   - **실패 처리**: exit ≠ 0이거나, stdout이 JSON으로 해석되지 않거나, `docs`·`commit`·`comments` 중 하나라도 `value`가 `ko`·`en`이 아니면 세 키 모두 권장값을 `ko`로 하고 세 질문 설명에 "권장값 계산 실패"를 표시한 뒤 진행한다 (이때 notes·files 문구는 표시하지 않는다).
   - **질문 형식**: 키마다(docs → commit → comments) `AskUserQuestion` 질문 하나. 옵션은 `ko`·`en` 두 개이고, 그 키의 권장값(`<key>.value`)을 첫 옵션에 `(Recommended)`로 둔다.
   - **사유 표시**: 그 키의 `notes` 각 항목을 아래 문구로 바꿔 쉼표로 이어 질문 설명에 표시한다. `notes`가 빈 배열이면 사유 문구를 붙이지 않는다.

     | `notes` 항목 | 설명 문구 |
     |---|---|
     | `missing` | 기존 값 없음 |
     | `unsupported:<v>` | 미지원 값 `<v>` |
     | `duplicate` | 중복 값 |
     | `legacy-conflict` | 기존 문구 충돌 |
     | `differs:<v>` | AGENTS.md 값 `<v>`와 다름 |

   - **malformed 파일**: `files`에서 값이 `malformed`인 파일마다 세 질문 설명 모두에 "<파일>의 malformed 언어 블록을 발견해 재생성"을 덧붙인다.
   - **허용값**: 저장 허용값은 `ko`·`en` 두 문자열뿐이다. 사용자가 Other로 그 밖의 값을 입력하면 그 키의 질문을 다시 한다.
   - 확정한 세 값은 Step 3·4 두 파일의 `## Language` 블록과 쓰기 단계 A의 `--expect-*` 인자에 똑같이 쓴다.

### Step 3: CLAUDE.md 작성

수집한 프로젝트 정보로 프로젝트 섹션과 import 블록을 구성한다. 전체 CLAUDE.md 구조:

```markdown
---
version: N
---

# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때의 안내 파일.

## 프로젝트 개요

[한 줄 설명]

## 기술 스택

[기술 스택 — 각 항목을 bullet로]

## Language

Replies to the user follow the Claude Code `language` setting.

<!-- harness-language:begin -->
- docs: <docs>
- commit: <commit>
- comments: <comments>
- code identifiers: en
- component files: en (executable instructions only; translation catalogs are data)
<!-- harness-language:end -->

@.harness/harness-guide.md
<!-- harness-rules:begin -->
@.harness/rules/coding-style.md
@.harness/rules/git-workflow.md
@.harness/rules/security.md
@.harness/rules/testing.md
@.harness/rules/typescript/patterns.md
@.harness/rules/typescript/testing.md
<!-- harness-rules:end -->

[사용자 정의 영역 — 보존, 마커 외부는 손대지 않음]
```

**기술 스택 bullet 변환**: 기술 스택 답변의 각 항목을 `- <항목>` bullet로 바꾼다. 단, 여러 줄 답변에서 이미 Markdown 헤더(`#`로 시작하는 줄, 예: `## graphify`)인 줄과 그 헤더 아래 본문 줄·빈 줄은 bullet로 바꾸지 않고 그대로 둔다. 그래서 `## graphify` 줄은 헤더로 남아 아래 4단계 graphify 중복 섹션 제거 대상이 된다. AGENTS.md 템플릿의 `[기술 스택]`에도 같은 규칙을 적용한다.

**`## Language` 블록**: `<docs>`·`<commit>`·`<comments>` 자리에 Step 2 항목 4에서 확정한 값을 넣는다. CLAUDE.md와 AGENTS.md에 같은 세 값을 쓴다. `code identifiers`·`component files` 줄과 안내 줄은 템플릿 그대로 쓴다. 블록 안에 빈 줄을 넣지 않는다. 기존 프로젝트 섹션의 `## 언어 규칙` 같은 자유 텍스트 섹션은 프로젝트 섹션 재생성으로 사라진다.

**import 블록 경계 규칙** (marker-bounded):

- import 블록은 `@.harness/harness-guide.md` 라인부터 시작하고, 그 직후 라인에 `<!-- harness-rules:begin -->` 마커를 배치한다.
- begin/end 마커 사이에 `.harness/rules/**/*.md` glob 결과로 자동 생성된 `@.harness/rules/<rel-path>` 라인 N개가 정렬된 순서로 이어진다.
- `<!-- harness-rules:end -->` 마커가 import 블록의 끝을 표시한다. end 마커 뒤에 newline `\n` 1개로 블록을 종료한다 — trailing 빈 줄은 포함하지 않는다. 사용자 영역과의 구분 빈 줄 1개는 Step 3 조립 식의 `+ [빈 줄]`이 단독 소유한다 (이중 빈 줄 방지).
- begin/end 마커 사이는 매 실행마다 glob 결과로 완전 재생성된다 (기존 사이 콘텐츠는 폐기). 마커 외부의 `@.harness/rules/<rel-path>` 접두사 라인은 사용자 콘텐츠로 간주해 **검사·수정·삭제 모두 하지 않는다** — 사용자가 메모·예시·체크리스트·커스텀 레이아웃에 의도적으로 유지한 라인을 silently 이동·삭제하지 않는다.
- 마커 외부의 모든 라인(harness 외부 `@import`, 일반 마크다운, 사용자 추가 콘텐츠)은 **그대로 보존**된다.

**import 블록 정렬·생성 규칙** (§3.2):

- **수집**: `find .harness/rules -name "*.md" -type f | sort` 명령으로 룰 파일 목록을 수집한다. `.harness/rules/`로 시작하는 상대 경로로 변환한다.
- **정렬**: `sort`의 lexicographic 결과를 그대로 사용한다 — top-level 파일이 sub-dir 파일보다 alphabetically 앞서므로 자연스럽게 top-level 우선.
- **변환**: 각 경로 앞에 `@` 접두사를 부여한다. 결과 라인 형식은 `@.harness/rules/<rel-path>`.
- **삽입 위치**: `<!-- harness-rules:begin -->` 마커 직후부터 차례로 삽입하고, 마지막 라인 뒤에 `<!-- harness-rules:end -->` 마커를 둔다. import 블록 자체에는 trailing 빈 줄을 포함하지 않는다 (구분 빈 줄은 조립 식이 단독 소유).

**`.harness/rules/` 부재 시**:

- `.harness/rules/` 디렉토리가 없거나 glob 결과가 0건이면 begin/end 마커 사이를 **빈 상태**로 둔다 (마커 자체는 유지 — 차후 실행이 marker 기반 업데이트 모드로 진입하도록 idempotency 보장).
- Step 7 결과 안내에 `[정보] .harness/rules/ 부재로 룰 import 생략` 1줄을 추가한다.

**Step 3 작성 흐름** (§3.4):

1. **파싱** — Step 1 스냅숏의 `content`(기존 CLAUDE.md)를 세 부분으로 나눈다 (marker-bounded):
   - frontmatter + 프로젝트 섹션 (파일 시작 ~ `@.harness/harness-guide.md` 라인 직전)
   - 마커 블록 (`@.harness/harness-guide.md` 라인 + `<!-- harness-rules:begin -->` 마커 + 마커 사이 라인 + `<!-- harness-rules:end -->` 마커). **업데이트 모드**에서만 추출되며 매 실행마다 폐기·재생성된다. **마이그레이션 모드**에서는 `@.harness/harness-guide.md` 직후부터 시작해 연속된 `@.harness/rules/<rel-path>` 라인만 마커로 감싸 in-place 변환한다 (비-인접 위치의 rules-prefix 라인은 사용자 영역으로 남긴다).
   - 사용자 정의 영역 (마커 블록 종료 직후부터 파일 끝까지의 모든 라인. 마커 외부 라인은 `@.harness/rules/<rel-path>` 접두사를 포함해 **검사·수정·삭제 없이 그대로 보존**한다). 마커 블록과 사용자 영역 사이의 선두 빈 줄 1개만 구분자로 흡수한다.
2. **신규 프로젝트 섹션 작성** — Step 2 수집 정보로 frontmatter·프로젝트 섹션을 구성한다. 프로젝트 섹션 본문 끝에 trailing blank 1줄을 둔다.
3. **신규 import 블록 생성** — 위 정렬·생성 규칙으로 `@.harness/harness-guide.md` + `<!-- harness-rules:begin -->` + `@.harness/rules/<rel-path>` N개 라인 + `<!-- harness-rules:end -->`을 만든다. `.harness/rules/` 부재 시 마커 사이는 비워둔다 (마커 자체는 유지).
4. **graphify 중복 섹션 제거** — 신규 프로젝트 섹션 본문에 `## graphify`로 시작하는 헤더 라인이 있으면 해당 섹션 전체(헤더부터 다음 `## ` 헤더 직전까지 또는 섹션 끝까지)를 삭제한다. canonical 위치는 `@.harness/harness-guide.md` import이며 import 라인이 graphify 콘텐츠를 자동 제공하므로 본문 내 별도 `## graphify` 섹션은 중복이다.
5. **조립** — [frontmatter] + [프로젝트 섹션 (trailing blank 1줄 포함)] + [import 블록 (마커 포함)] + [빈 줄] + [사용자 정의 영역] 순서로 연결한다. 파일 끝은 trailing newline `\n` 1개로 정규화한다. frontmatter `version` 값은 올리기 전 값으로 둔다: 스냅숏 `content`의 frontmatter `version` 값, 스냅숏에 `version` 줄이 없거나 신규 생성이면 `1`. 조립하면서 각 부분이 조립본의 몇 번째 줄부터 몇 번째 줄까지인지 기록한다 (쓰기 단계 A의 영역 표기에 쓴다).
6. **쓰기 단계** — 5단계의 조립본(graphify 제거·조립·줄바꿈 정규화를 모두 마친 최종 조립본)을 `쓰기 단계 (Step 3·4 공통)` 절에 넘긴다: 검사 → 재확인 → 변경 감지(SHA-256 hash 비교, frontmatter `version: N` 라인 제외) → 백업 → 쓰기. 쓰기 단계에서 내용을 다시 조립하지 않는다.

**신규 생성** (스냅숏 `absent`): 위 흐름에서 1단계를 skip하고 2·3·4·5단계로 새 CLAUDE.md를 조립한 뒤 6단계로 넘긴다. 쓰기 단계는 신규 경로(변경 감지 없음)를 따른다 (사용자 정의 영역은 빈 상태이며, 빈 사용자 영역 슬롯 앞 구분자 빈 줄은 drop하고 파일은 `<!-- harness-rules:end -->` 마커 뒤 trailing newline `\n` 1개로 끝난다).

**백업 후 재생성** (Step 1 경계 탐지 불가 질문에서 선택): 신규 생성과 같은 방식으로 1단계를 skip하고 2·3·4·5단계로 조립한다 (사용자 정의 영역은 빈 상태, 기존 내용은 백업 파일로 보존). 파일이 이미 있으므로 6단계 쓰기 단계는 기존 파일 경로(검사 → 재확인 → 변경 감지 → 백업 → 쓰기)를 따르고, 조립본 frontmatter `version`은 5단계 규칙(스냅숏 `version` 값, 없으면 `1`)을 따른다.

### Step 4: AGENTS.md 작성

**신규 생성**:

```markdown
# AGENTS.md

Codex CLI가 이 저장소에서 작업할 때의 안내 파일. Claude Code는 `CLAUDE.md`를 사용한다.

## 프로젝트 개요

[한 줄 설명]

## 기술 스택

[기술 스택]

## Language

Replies to the user follow the Claude Code `language` setting.

<!-- harness-language:begin -->
- docs: <docs>
- commit: <commit>
- comments: <comments>
- code identifiers: en
- component files: en (executable instructions only; translation catalogs are data)
<!-- harness-language:end -->

<!-- harness-guide:begin -->
[.harness/harness-guide.md 전체 내용]
<!-- harness-guide:end -->
```

`.harness/harness-guide.md`가 존재하면 내용을 읽어 삽입한다. 없으면 빈 블록으로 생성하고 경고를 출력한다. `## Language` 블록 값은 Step 3과 같은 세 값이다.

**백업 후 재생성** (Step 1 경계 탐지 불가 질문에서 선택): 신규 생성 템플릿과 같은 방식으로 조립한다 (기존 내용은 백업 파일로 보존). 파일이 이미 있으므로 쓰기 단계는 기존 파일 경로를 따른다.

**업데이트** (입력은 Step 1 스냅숏의 `content`):
- `<!-- harness-guide:begin -->` 이전 모든 내용을 새 프로젝트 섹션으로 교체한다.
- begin/end 마커 사이 내용도 현재 `.harness/harness-guide.md` 내용으로 교체한다 (point-in-time 갱신). **삽입 시 harness-guide.md의 YAML frontmatter 블록(`---\nversion: N\n---`)은 제외하고 본문만 삽입**한다.
- 마커 라인 자체(`<!-- harness-guide:begin -->`, `<!-- harness-guide:end -->`)는 그대로 유지한다.
- `<!-- harness-guide:end -->` **이후의 내용도 그대로 보존**한다.
- **trailing 줄바꿈 정규화**: harness-guide 본문을 삽입할 때 본문 끝의 공백/줄바꿈을 rstrip한 뒤 정확히 `\n`(한 줄)을 붙여 end 마커 앞에 놓는다. end 마커 앞에 빈 줄이 생기지 않도록 한다.
- **변경 감지**: 조립된 전체 AGENTS.md 내용이 스냅숏 `content`와 동일하면 파일을 건드리지 않는다. (`[변경 없음]` 표기) 이 비교는 `쓰기 단계 (Step 3·4 공통)` C에서 검사·재확인 뒤에 한다.

**graphify 중복 섹션 제거**: 업데이트 모드에서, `<!-- harness-guide:end -->` 마커 **외부**(end 마커 이후 영역)에 `## graphify`로 시작하는 헤더 라인이 있으면 해당 섹션 전체(헤더부터 다음 `## ` 헤더 직전까지 또는 파일 끝까지)를 삭제한다. begin/end 마커 내부에 임베드된 harness-guide 본문이 canonical graphify 콘텐츠를 이미 제공하므로 외부 `## graphify` 섹션은 중복이다. begin/end 마커 내부는 건드리지 않는다. 신규 생성 모드는 외부 graphify 섹션이 없으므로 본 처리를 건너뛴다.

**조립 결과**: 조립과 외부 graphify 삭제를 마친 최종 AGENTS.md 조립본을 `쓰기 단계 (Step 3·4 공통)` 절에 넘긴다. 조립하면서 프로젝트 섹션, guide begin/end 마커 줄, 마커 사이 본문, end 마커 뒤 영역이 조립본의 몇 번째 줄부터 몇 번째 줄까지인지 기록한다.

### 쓰기 단계 (Step 3·4 공통)

Step 3·4의 최종 조립본을 `CLAUDE.md`, `AGENTS.md` 순서로 파일마다 아래 A → B → C → D → E 순서로 처리한다. 한 단계에서 그 파일의 쓰기가 중단되면 그 파일의 뒤 단계는 실행하지 않고, 대상 파일에 대한 Write·Edit·셸 쓰기를 하지 않으며, 다음 파일로 진행한다. Step 1에서 사용자가 `중단`을 고른 파일(`[중단]`)과 스냅숏이 `error`인 파일(`[쓰기 중단: 재확인 실패]`)은 이 절 전체를 건너뛴다. B 이후 E까지 사용자에게 질문하지 않는다.

**A. 쓰기 전 검사 (`lang.js check`)** — 변경 감지보다 먼저 한다.

1. **기대 줄**: 최종 조립본을 1부터 센 줄 번호를 쓴다 (CLAUDE.md는 frontmatter 줄 포함). 프로젝트 섹션(CLAUDE.md는 첫 `@.harness/harness-guide.md` 줄 직전까지, AGENTS.md는 첫 `<!-- harness-guide:begin -->` 줄 직전까지) 안에서 마지막 `## Language` 줄을 찾고, 그 뒤 첫 `<!-- harness-language:begin -->` 줄이 기대 begin, 그 뒤 첫 `<!-- harness-language:end -->` 줄이 기대 end다. graphify 제거 전 조립 위치나 템플릿 기준 위치를 쓰지 않는다. 셋 중 하나라도 찾지 못하면 `check`를 실행하지 않고 `[쓰기 중단: 검사 실패]` (원인: 생성한 언어 블록 마커를 조립본에서 찾지 못함)로 처리한다.
2. **기대 값**: Step 2 항목 4에서 확정한 docs·commit·comments 값. 조립본에서 읽지 않는다.
3. **실행** (Bash·Write 도구, 이 순서로):
   1. Bash `mktemp`로 시스템 임시 디렉토리에 임시 파일을 만들고 경로를 기록한다.
   2. Write 도구로 최종 조립본을 그 임시 파일에 쓴다. Write 도구가 기존 파일 읽기를 요구하면 Write 전에 Read 도구로 그 임시 파일을 읽는다.
   3. Bash로 실행한다: `node .harness/scripts/lang.js check --file=<임시 파일> --expect-begin=<begin> --expect-end=<end> --expect-docs=<docs> --expect-commit=<commit> --expect-comments=<comments>`. stdout·stderr·exit code를 기록한다.
   4. Bash `rm -f <임시 파일>`로 지운다. `check` 결과·exit code와 무관하게, 그리고 2·3이 실패한 경우에도 실행한다.
   - `mktemp` 또는 Write가 실패하면 `[쓰기 중단: 검사 실패]` (원인: 임시 파일 준비 실패)로 처리한다.
4. **결과 분기**:

   | `check` 결과 | 처리 |
   |---|---|
   | exit 0, `status` = `ok` | B로 진행 |
   | `status` = `unrecognized` | `[쓰기 중단: 블록 인식 실패]`. `expected.begin`·`expected.end` 각각의 `coveringFence`가 null이 아니면 그 펜스마다 "<`open` 줄의 영역>, 조립본 <open>번째 줄에서 열린 코드 펜스 (닫는 줄: <close 또는 없음>)"를 출력한다. 둘 다 null이면 기대 begin·end 줄 번호와 `recognized` 값을 출력한다. 이어서 "그 코드 펜스를 닫거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요"를 출력한다 |
   | `status` = `conflict` | `[쓰기 중단: 마커 충돌]`. `extraMarkers` 각 항목마다 "<`line` 줄의 영역>, 조립본 <line>번째 줄: <마커 문자열>"을 출력한다 (`kind`가 `begin`이면 `<!-- harness-language:begin -->`, `end`면 `<!-- harness-language:end -->`). 이어서 "그 언어 블록 마커를 지우거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요"를 출력한다 |
   | `status` = `invalid-block` | `[쓰기 중단: 검사 실패]`, 원인으로 `block.reason` 값을 그대로 출력 |
   | exit ≠ 0, stdout JSON 해석 불가, 또는 그 밖의 `status` | `[쓰기 중단: 검사 실패]`, 원인으로 stderr 내용(비어 있으면 exit code) 또는 "JSON 해석 불가"를 출력 |

5. **영역 표기**: 진단의 줄 번호는 조립본 줄 번호이며, 조립 중 기록한 줄 범위로 영역을 정한다. 원래 파일 줄 번호로 역추적하지 않는다.

   | 조립본 줄 | 영역 |
   |---|---|
   | CLAUDE.md frontmatter·프로젝트 섹션·import 블록·구분 빈 줄 / AGENTS.md 프로젝트 섹션·guide begin/end 마커 줄 (`/flow-init`이 Step 2 답변과 템플릿으로 생성한 줄) | Step 2 입력 |
   | CLAUDE.md 사용자 정의 영역 / AGENTS.md `<!-- harness-guide:end -->` 뒤 영역 | 기존 <파일> 사용자 영역 |
   | AGENTS.md guide begin/end 마커 사이 | harness-guide.md 본문 |

**B. 재확인** — A가 `ok`일 때, 기존 파일 경로는 C(변경 감지) 직전, 신규 경로는 E(쓰기) 직전에 Step 1과 같은 스냅숏 명령을 그 파일에 Bash로 다시 실행한다. `status`·`hash`만 Step 1 스냅숏과 비교하고, 재확인 `content`는 조립에 쓰지 않는다.

| Step 1 스냅숏 | 재확인 결과 | 처리 |
|---|---|---|
| `ok` | `ok`, `hash` 같음 | C로 진행 |
| `ok` | `ok`, `hash` 다름 | `[쓰기 중단: 실행 중 파일 변경]` |
| `ok` | `absent` | `[쓰기 중단: 실행 중 파일 변경]` |
| `absent` | `absent` | E로 진행 (신규 경로, C·D 없음) |
| `absent` | `ok` | `[쓰기 중단: 실행 중 파일 변경]` |
| any | `error`, 명령 exit ≠ 0, stdout JSON 해석 불가 | `[쓰기 중단: 재확인 실패]`와 `code` (`error`가 아니면 `snapshot failed`) |

**C. 변경 감지** (기존 파일 경로만):

- CLAUDE.md: 조립본(`version` 값 = 올리기 전 값)과 스냅숏 `content`의 SHA-256 hash를 frontmatter `version: N` 라인을 제외하고 비교한다. 같으면 쓰기 호출 없이 `[변경 없음]` (`version`·해시 그대로, D·E 건너뜀). 다르면 D로 진행.
- AGENTS.md: 조립본 전체와 스냅숏 `content`를 비교한다. 같으면 쓰기 호출 없이 `[변경 없음]` (D·E 건너뜀). 다르면 D로 진행.

**D. 백업** (Step 1에서 "백업 후 재생성"을 고른 파일만. 그 밖의 파일은 E로 진행):

- Bash `cp <파일> <파일>.bak.<timestamp>`로 Step 1 질문에 표시한 경로에 백업을 만든다 (`<timestamp>`는 Step 1에서 정한 값). 다른 경로나 새 timestamp로 다시 시도하지 않는다.
- exit = 0이면 E로 진행한다.
- exit ≠ 0이면 그 파일은 E로 넘어가지 않는다. 대상 파일에 대한 Write·Edit·셸 쓰기(리다이렉트·`mv`·`cp`·원자적 교체 포함)를 하지 않고 `[쓰기 중단: 백업 실패]`와 stderr 오류를 기록한 뒤 다음 파일로 진행한다.

**E. 쓰기** — A에서 검사한 조립본을 그대로 쓴다. 쓰기 방식은 기존 방식 그대로다:

- CLAUDE.md: 아래 표의 내용(`version` 줄만 바꾼 조립본)으로 원자적 쓰기를 수행한다.
- AGENTS.md: 아래 표의 내용(조립본 그대로)으로 파일을 쓴다.
- 기존 대상 파일을 Write 도구로 쓰고 Write 도구가 기존 파일 읽기를 요구하면, Write 직전에 Read 도구로 대상 파일을 읽는다. 이 Read는 Write 도구의 사전 요건을 채우는 용도로만 쓰고, 그 내용은 판정·조립·비교에 쓰지 않는다 (재확인은 B의 스냅숏 결과만 기준으로 한다).

| 파일 | 경로 | 쓰는 내용 | 상태 |
|---|---|---|---|
| CLAUDE.md | 신규 (스냅숏 `absent`) | 조립본 그대로 (`version: 1`) | `[신규]` |
| CLAUDE.md | 기존, C에서 다름 | 조립본에서 frontmatter `version` 줄만 "스냅숏 `version` 값 + 1"로 바꾼 내용. 스냅숏에 `version` 줄이 없으면(frontmatter 없음 포함) `version: 1` | `[업데이트]` |
| AGENTS.md | 신규 (스냅숏 `absent`) | 조립본 그대로 | `[신규]` |
| AGENTS.md | 기존, C에서 다름 | 조립본 그대로 | `[업데이트]` |

`version` 줄은 frontmatter 안에 있어 바꿔도 줄 수와 언어 블록 위치가 그대로이므로 A의 검사 결과가 유지된다.

### Step 5: docs.sourceFilter 자동 감지·설정

Step 1에서 두 파일(`CLAUDE.md`, `AGENTS.md`) 모두 "중단"을 선택한 경우 이 단계를 건너뛴다.

`scripts/deploy-harness.sh` 파일 존재 여부로 저장소 유형을 감지하고 `config.docs.sourceFilter`를 설정한다.

**보존 정책 (선결 조건)**: 기존 `config.docs.sourceFilter`가 **존재하면서 빈 배열·null·미설정이 아닌 경우** 감지 결과를 적용하지 않고 기존 값을 그대로 유지한다. `/flow-init`은 imports 재생성을 위해 재실행될 수 있으므로 (`/add-language-rules` 안내), 사용자가 명시적으로 설정한 sourceFilter를 재실행마다 덮어쓰지 않는다. 보존이 발동하면 Step 7에 `[보존] config.docs.sourceFilter 기존 값 유지`를 출력한다.

기존 값이 부재(미설정·빈 배열·null)일 때만 아래 감지 로직을 적용한다.

**감지 로직** (기존 값 부재 시):

`scripts/deploy-harness.sh`가 존재하면 (하네스 저장소):
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter \
  --value='[".claude/",".codex/",".harness/","CLAUDE.md","AGENTS.md"]'
```
출력: `하네스 저장소로 감지: config.docs.sourceFilter를 하네스 기본값으로 설정했습니다.`

`scripts/deploy-harness.sh`가 없으면 (일반 프로젝트):
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter \
  --value='[]'
```
출력: `일반 프로젝트로 감지: config.docs.sourceFilter를 빈 배열로 설정했습니다 (필터 없음).`

**수동 재설정**: 자동 감지값으로 강제 초기화하려면 사용자가 직접 빈 값으로 reset한 뒤 `/flow-init`을 재실행하거나, `dev-context.js set-field`로 임의 값을 지정한다:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter --value='["src/","lib/"]'
```

### Step 6: config.graphify.targets 추천·확정

Step 1에서 두 파일(`CLAUDE.md`, `AGENTS.md`) 모두 "중단"을 선택한 경우 이 단계를 건너뛴다.

`config.graphify.targets`는 `/graphify` 풀 빌드의 분석 대상 디렉토리 배열이다. 본 Step은 배포 직후 미설정·빈 배열·null 상태일 때 저장소 유형별 추천값을 제시하고 `AskUserQuestion`으로 확정한다. 이미 비어 있지 않은 배열이 설정돼 있으면 보존한다 (멱등).

**보존 정책 (선결 조건)**: 먼저 다음 명령으로 현재 값을 조회한다.

```bash
node .harness/scripts/dev-context.js read --field=config.graphify.targets
```

`dev-context.js read`는 배열 원소를 한 줄당 하나씩 newline-delimited로 출력하며, 빈 배열·null·미설정은 빈 stdout을 낸다. `config.graphify.targets`는 문자열 배열로만 의미가 있지만 `dev-context.js`는 동일 키에 boolean·number·문자열 같은 scalar 값도 저장 가능하다. 다음 케이스로 분기한다:

- 명령이 비-0 exit으로 종료: Step 7에 `[감지 실패] config.graphify.targets`를 출력한다.
- stdout이 비어 있음 (빈 배열·null·미설정): 아래 추천 분기로 진입한다.
- stdout에 한 줄 이상의 라인이 있고 모든 라인이 비어 있지 않은 문자열 원소처럼 보인다 (배열이 비어 있지 않은 문자열 배열): 추천을 건너뛰고 Step 7에 `[보존] config.graphify.targets 기존 값 유지`를 출력한다.
- stdout에 한 줄 이상의 라인이 있지만 저장된 값이 scalar(예: `true`, `42`, 단일 문자열 `"docs"` 등)로 의심된다: 잘못된 상태로 간주해 Step 7에 `[감지 실패] config.graphify.targets`를 출력하고 사용자에게 재설정 여부를 `AskUserQuestion`으로 묻는다. scalar 의심 신호는 — 라인 1개 + 값이 `true`/`false`/숫자/디렉토리로 해석되지 않는 단일 토큰 — 같은 휴리스틱으로 판정한다.

**저장소 유형별 추천값 분기** (기존 값 부재 시):

`scripts/deploy-harness.sh` 존재 여부로 저장소 유형을 감지해 추천 후보를 결정한다.

- 존재 (본 하네스 저장소): 추천 후보 `["./src", "./docs/specs", "scripts"]`
- 미존재 (배포된 하네스 또는 일반 프로젝트): 추천 후보 `["./.claude", "./.harness", "./docs"]`

**확정 (`AskUserQuestion`)**: 위 추천 후보를 다음 2개 옵션으로 사용자에게 제시한다. `AskUserQuestion` 도구는 자동으로 "Other" 옵션을 추가하므로, 사용자가 자유 텍스트로 JSON 배열을 직접 작성하는 흐름은 "Other" 입력으로 처리한다.

- 옵션 1 `(Recommended)` — 추천 후보를 그대로 사용
- 옵션 2 — 건너뛰기 (값 미설정 유지, 추후 `/graphify` 호출 시 hard error로 안내)

**입력 유효성**: 사용자가 "Other"로 입력한 디렉토리 경로에 single-quote(`'`) 또는 newline이 포함되면 JSON 배열로 직렬화한 뒤 single-quoted 셸 인자로 전달할 때 인용 부호 종결 문제가 발생한다. 이런 경우 `AskUserQuestion`으로 재입력을 요구한다.

**기록 동작**: 확정값을 JSON 배열로 직렬화한 뒤 다음 명령으로 기록한다.

```bash
node .harness/scripts/dev-context.js set-field --field=config.graphify.targets --value='<JSON 배열>'
```

옵션 2(건너뛰기)를 선택하면 `set-field`를 호출하지 않고 Step 7에 `[정보] config.graphify.targets 미설정 유지`를 출력한다. 추후 `/graphify` 호출 시 hard error로 안내된다.

### Step 7: 결과 안내

작성된 파일 경로와 결과를 출력한다:

```
완료:
  [신규/업데이트/변경 없음/중단/쓰기 중단: <종류>] CLAUDE.md
  [신규/업데이트/변경 없음/중단/쓰기 중단: <종류>] AGENTS.md
  [감지] config.docs.sourceFilter = [".claude/",".codex/",".harness/","CLAUDE.md","AGENTS.md"]
  [감지] config.graphify.targets = ["./src","./docs/specs","scripts"]
언어 적용값:
  docs: ko (source=CLAUDE.md, reason=set)
  commit: ko (source=CLAUDE.md, reason=set)
  대화 언어: Claude Code `language` 설정을 따릅니다. 하네스는 managed settings와 `--settings` 인자로 지정한 설정을 읽지 않습니다.
```
(일반 프로젝트의 경우: `[감지] config.docs.sourceFilter = [] (필터 없음)`)

- `[신규]`: 파일이 새로 생성됨
- `[업데이트]`: 내용이 달라져 파일을 다시 씀
- `[변경 없음]`: 내용이 동일하여 파일을 건드리지 않음
- `[중단]`: Step 1 경계 탐지 불가 질문에서 사용자가 `중단`을 선택해 해당 파일을 읽기만 하고 쓰지 않음 (파일 내용·해시가 실행 전과 같음)
- `[쓰기 중단: <종류>]`: 쓰기 단계 또는 Step 1 스냅숏에서 그 파일의 쓰기를 멈춤. 그 파일은 건드리지 않고(백업도 만들지 않음, 백업 실패 시 대상 파일 미변경) 다른 파일은 계속 진행한다. 상태 줄 바로 아래에 진단을 들여써서 출력한다. 종류 6가지:
  - `블록 인식 실패`: `check` `unrecognized` — 펜스 영역·조립본 줄과 "그 코드 펜스를 닫거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요"
  - `마커 충돌`: `check` `conflict` — 각 추가 마커의 영역·조립본 줄·마커 문자열과 "그 언어 블록 마커를 지우거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요"
  - `검사 실패`: 생성 마커 미발견, 임시 파일 준비 실패, `check` `invalid-block`(`block.reason`), `check` exit ≠ 0·JSON 해석 불가 — 원인과 "`/flow-init` 스킬 템플릿을 확인한 뒤 다시 실행하세요"
  - `실행 중 파일 변경`: 재확인 해시가 Step 1과 다르거나 파일이 사라지거나 새로 생김 — "외부 수정 내용을 확인한 뒤 다시 실행하세요"
  - `재확인 실패`: Step 1 스냅숏 또는 재확인이 ENOENT 외 읽기 오류 — 오류 코드(예: `EACCES`)와 "읽기 권한을 복구한 뒤 다시 실행하세요"
  - `백업 실패`: 백업 명령 exit ≠ 0 — 백업 경로·오류와 "백업 경로를 확인한 뒤 다시 실행하세요"
- 멱등성: 두 파일이 모두 `[신규]`·`[업데이트]`·`[변경 없음]` 중 하나로 끝난 뒤 같은 입력으로 재실행하면 두 파일 모두 `[변경 없음]`이다.
- `[감지]`: 기존 sourceFilter가 부재해 자동 감지값을 set한 경우
- `[보존] config.docs.sourceFilter 기존 값 유지`: 기존 sourceFilter가 존재(빈 배열·null·미설정 아님)해 감지값을 적용하지 않고 보존한 경우. `[감지]`와 상호 배타.
- `[정보] .harness/rules/ 부재로 마커 사이 비움`: `.harness/rules/` 디렉토리가 없거나 glob 결과가 0건이어서 begin/end 마커 사이에 import 라인을 생성하지 않은 경우 추가 출력한다 (마커 자체는 유지). 그 외 경우 본 라인을 출력하지 않는다 (위 예시는 `.harness/rules/` 존재 시나리오이므로 본 라인을 포함하지 않는다).
- `[감지] config.graphify.targets = <배열>`: 기존 `config.graphify.targets`가 부재(빈 배열·null·미설정)해 추천값을 사용자 확정 후 set한 경우. 출력 배열은 `AskUserQuestion`으로 확정된 최종 값.
- `[보존] config.graphify.targets 기존 값 유지`: 기존 `config.graphify.targets`가 비어 있지 않은 배열이어서 추천을 건너뛰고 보존한 경우. `[감지]`와 상호 배타.
- `[정보] config.graphify.targets 미설정 유지`: 사용자가 추천 단계에서 옵션 2 "건너뛰기"를 선택한 경우. 추후 `/graphify` 호출 시 hard error로 안내된다.
- `[감지 실패] config.graphify.targets`: `dev-context.js read` 호출 실패, scalar 값이 배열 키에 저장된 잘못된 상태, `set-field` 실패 중 하나가 발생한 경우. 기존 값은 변경되지 않고 사용자에게 재설정 여부를 묻는다.

**언어 적용값 안내** — 파일 처리 결과 줄과 config 줄을 출력한 뒤 이어서 출력한다.

1. **호출 시점**: Step 3·4의 파일 쓰기(또는 `[변경 없음]`·`[중단]` 판정)와 Step 5·6의 config 기록이 모두 끝난 뒤에 실행한다 (Step 5·6을 건너뛴 실행과 두 파일 모두 `[중단]`인 실행에서도 실행한다). 이번 실행이 쓴 파일 내용을 반영하도록 쓰기 전에는 실행하지 않는다.
2. **호출**: 다음 두 명령을 각각 1회씩, docs → commit 순서로 실행한다. 각 명령의 stdout·stderr·exit code를 따로 수집한다.

   ```bash
   node .harness/scripts/lang.js explain --kind=docs
   node .harness/scripts/lang.js explain --kind=commit
   ```

3. **stderr 전달**: 각 명령의 stderr가 비어 있지 않으면, 비어 있지 않은 줄마다 `lang.js 경고: <줄>` 형식으로 줄 내용을 바꾸지 않고 출력한다. exit code와 무관하게 전달한다.
4. **성공 판정**: 각 키마다 다음 두 조건을 모두 만족하면 성공이다.
   - exit code가 0이다.
   - stdout이 정확히 세 줄이며 순서대로 `value=<value>`, `source=<source>`, `reason=<reason>` 형식이다 (각 줄의 `=` 뒤 값이 비어 있지 않음).
   - 줄 수를 셀 때 stdout 끝의 줄바꿈 1개는 무시한다 (`value=ko\nsource=CLAUDE.md\nreason=set\n`은 세 줄).
5. **출력**: 성공한 키는 `docs: <value> (source=<source>, reason=<reason>)` / `commit: <value> (source=<source>, reason=<reason>)` 형식으로 출력한다. 성공 판정을 만족하지 않은 키는 그 키만 `docs: 적용값 확인 실패` / `commit: 적용값 확인 실패`로 출력한다. 한 키가 실패해도 다른 키의 출력, 파일 처리 결과 줄, 나머지 안내는 그대로 출력한다.
   - 출력 순서: `언어 적용값:` 헤더 줄을 먼저 출력하고, 그 아래에 docs 줄, commit 줄 순서로 출력한다.
   - **선택값 비교**: 성공한 키마다 `<value>`를 Step 2에서 그 키에 확정한 선택값과 비교한다. 같으면 경고를 출력하지 않는다. 다르면 그 키 줄 바로 아래에 ``경고: <key>: `<value>` (source=<source>) — <원인>``을 출력한다. 원인 문구:
     - `<source>`가 `CLAUDE.md` 또는 `AGENTS.md`이고 그 파일의 상태가 `[중단]` 또는 `[쓰기 중단: ...]`이면: ``<source>가 갱신되지 않아 선택값 `<선택값>`이 적용되지 않았습니다``
     - 그 밖의 경우: ``<source>의 값(reason=<reason>)이 우선 적용되어 선택값 `<선택값>`이 적용되지 않았습니다``
     - 예: ``경고: docs: `ko` (source=CLAUDE.md) — CLAUDE.md가 갱신되지 않아 선택값 `en`이 적용되지 않았습니다``
     - 적용값 확인에 실패한 키는 비교하지 않는다.
6. **대화 언어 안내**: 마지막 줄에 다음 안내를 출력한다 — "대화 언어: Claude Code `language` 설정을 따릅니다. 하네스는 managed settings와 `--settings` 인자로 지정한 설정을 읽지 않습니다."

## 오류 처리

| 상황 | 처리 |
|------|------|
| `@.harness/harness-guide.md` 라인 없는 기존 CLAUDE.md (`<!-- harness-rules:begin -->` 마커 유무와 무관 — Step 1 우선순위 2가 우선순위 3보다 먼저 일치) / `<!-- harness-guide:begin -->` 없는 기존 AGENTS.md | Step 1에서 경고 + AskUserQuestion → 백업 후 재생성 or 중단. 중단을 고르면 해당 파일을 건드리지 않고 Step 7에 `[중단]` 표기 |
| CLAUDE.md에 `@.harness/harness-guide.md` 라인 있음 + `<!-- harness-rules:begin -->` 없음 (Step 1 우선순위 4) | Step 1에서 마이그레이션 모드로 진입 (harness-guide 직후 연속된 rules-prefix 라인만 marker로 in-place 변환) |
| `.harness/harness-guide.md` 없음 | AGENTS.md begin/end 블록을 빈 상태로 생성, 경고 출력 |
| Step 1 스냅숏 `error` (ENOENT 외 읽기 오류) | 그 파일은 백업 여부 질문 없이 쓰기 중단, Step 7 `[쓰기 중단: 재확인 실패]` + 오류 코드. 이번 실행 중 권한이 복구돼도 쓰지 않음. 사용자 "중단"으로 세지 않음 (Step 5·6 실행 조건 불변) |
| `check` `unrecognized` | `[쓰기 중단: 블록 인식 실패]` + 펜스 영역·조립본 줄 + 펜스를 닫거나 답변에서 빼고 재실행 안내 |
| `check` `conflict` | `[쓰기 중단: 마커 충돌]` + 각 추가 마커의 영역·조립본 줄·마커 문자열 + 마커를 지우거나 답변에서 빼고 재실행 안내 |
| 생성 마커 미발견·임시 파일 준비 실패·`check` `invalid-block`·`check` exit ≠ 0·JSON 해석 불가 | `[쓰기 중단: 검사 실패]` + 원인 (`invalid-block`이면 `block.reason`) |
| 재확인 해시 다름·파일 사라짐·파일 새로 생김 | `[쓰기 중단: 실행 중 파일 변경]` |
| 재확인 읽기 오류 | `[쓰기 중단: 재확인 실패]` + 오류 코드 |
| 백업 명령 exit ≠ 0 | 대상 파일 쓰기 없이 `[쓰기 중단: 백업 실패]` + 오류 |
| 쓰기 중단된 파일 (위 6종) | 그 파일은 건드리지 않고 다른 파일은 계속 진행 |
| 쓰기 권한 없음 | 오류 메시지 출력 후 종료 |
| Step 5: `dev-context.js` 미존재 또는 `set-field` 실패 | 경고 출력 + Step 5 스킵, Step 7에서 `[감지 실패] config.docs.sourceFilter` 표기 |
| Step 6: `dev-context.js` 미존재 또는 `set-field` 실패 | 경고 출력 + Step 6 스킵, Step 7에서 `[감지 실패] config.graphify.targets` 표기 |

## Key Principles

- **항상 루트 대상** — `src/` 여부와 관계없이 항상 루트 `CLAUDE.md`, `AGENTS.md`를 수정한다.
- **AskUserQuestion 사용 필수** — 선택이 포함된 모든 질문에 적용. 첫 옵션에 `(Recommended)` 레이블.
- **경계 마커 기준 업데이트** — 프로젝트 섹션은 마커(`@.harness/harness-guide.md`, `<!-- harness-guide:begin -->`) 이전까지로 정의된다. CLAUDE.md의 rules import 블록은 `<!-- harness-rules:begin -->` / `<!-- harness-rules:end -->` 마커 쌍으로 bound 되며 마커 외부는 사용자 영역으로 보존된다 (AGENTS.md `<!-- harness-guide:begin/end -->`와 동일 패턴).
- **검사·재확인을 통과한 조립본만 쓴다** — Step 1 스냅숏이 판정·조립 입력과 기준 해시를 함께 제공하고, 쓰기 단계가 `lang.js check` → 재확인 → 변경 감지 → 백업 → 쓰기 순서를 지킨다.
- **harness-guide 블록 갱신** — 업데이트 시 AGENTS.md의 harness-guide 블록을 현재 `.harness/harness-guide.md` 내용으로 최신화.
- **graphify 중복 섹션 제거** — CLAUDE.md 본문과 AGENTS.md의 end 마커 외부에 별도 `## graphify` 섹션이 있으면 삭제한다. canonical 위치는 `@.harness/harness-guide.md` import 또는 begin/end 마커 내부 임베드 본문이다.
- **저장소 유형 자동 감지** — `scripts/deploy-harness.sh` 존재 여부로 `config.docs.sourceFilter` 기본값을 결정한다 (하네스: prefix 목록 / 일반: 빈 배열). **기존 non-empty 값은 보존**한다 — `/flow-init`은 imports 재생성을 위해 재실행 가능하므로, 사용자 명시 설정을 재실행마다 덮어쓰지 않는다 (빈 배열·null·미설정일 때만 감지값 적용).
- **graphify targets 추천** — 배포 직후 `config.graphify.targets`가 미설정·빈 배열일 때 추천값을 `AskUserQuestion`으로 확정한다. 비어 있지 않은 기존 값은 보존한다 (멱등).
