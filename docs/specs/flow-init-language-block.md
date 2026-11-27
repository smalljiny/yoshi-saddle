# /flow-init 언어 블록 생성과 쓰기 안전장치

> `/flow-init`은 `lang.js recommend` 권장값으로 docs·commit·comments를 묻고, CLAUDE.md·AGENTS.md 프로젝트 섹션에 같은 `## Language` 마커 블록을 조립한 뒤, 시작 시 읽은 스냅숏·`lang.js check` 검사·재확인·백업을 통과한 조립본만 쓴다.

## 개요

`/flow-init`(`src/.claude/skills/flow-init/SKILL.md`)은 루트 `CLAUDE.md`·`AGENTS.md`의 프로젝트 섹션을 생성·갱신한다. 프로젝트 섹션의 언어 규칙은 자유 텍스트 `## 언어 규칙`이 아니라 `lang.js`가 읽는 `## Language` 마커 블록이다(블록 문법은 [language-resolution.md](language-resolution.md)).

판정은 `lang.js` 서브커맨드가 결정적으로 하고, 스킬은 질문·조립·안내만 한다.

| 판정 | 서브커맨드 | 사용 위치 |
|---|---|---|
| 언어 권장값과 사유 | `lang.js recommend` | Step 2 언어 질문 |
| 최종 조립본의 블록 인식·추가 마커·블록 값 | `lang.js check` | 쓰기 단계 A |
| 실제 적용값과 출처 | `lang.js explain` | Step 7 결과 안내 |

한 파일의 쓰기가 중단돼도 다른 파일은 계속 진행한다.

## 구조 / 스키마

### 생성하는 블록

두 파일의 프로젝트 섹션에 같은 값으로 쓴다.

```markdown
## Language

Replies to the user follow the Claude Code `language` setting.

<!-- harness-language:begin -->
- docs: <docs>
- commit: <commit>
- comments: <comments>
- code identifiers: en
- component files: en (executable instructions only; translation catalogs are data)
<!-- harness-language:end -->
```

`<docs>`·`<commit>`·`<comments>`는 Step 2에서 고른 `ko`·`en`이다. `code identifiers`·`component files`는 묻지 않고 `en`으로 고정한다. 블록 안에는 빈 줄이 없다.

### 스냅숏

Step 1 시작 직후, 모드 판정과 질문보다 먼저 파일마다 한 번 실행한다.

```bash
node -e '...readFileSync(process.argv[1])... → {status, hash, content} | {status:"absent"} | {status:"error", code}' "<파일>"
```

- `content`는 모드 판정, Step 2 기존 값 추출, Step 3·4 파싱의 유일한 입력이다. `hash`(SHA-256)는 쓰기 직전 재확인 기준이다.
- 같은 파일을 판정·해시 목적으로 다시 읽지 않는다. 쓰기 직전 Write 도구의 사전 Read 요건을 채우는 Read 한 번만 예외이며, 그 내용은 쓰지 않는다.
- 스킬이 지시하는 Bash 명령의 파일 경로 인자는 모두 큰따옴표로 감싸고, `rm`·`cp`에는 `--`를 둔다.

### 파일 상태

| 상태 | 뜻 |
|---|---|
| `[신규]` | 파일이 없어 새로 씀 |
| `[업데이트]` | 내용이 달라 다시 씀 |
| `[변경 없음]` | 내용이 같아 쓰기 호출을 하지 않음 |
| `[중단]` | Step 1 경계 탐지 불가 질문에서 사용자가 `중단`을 고름 |
| `[쓰기 중단: 블록 인식 실패]` | `check` `unrecognized` — 코드 펜스가 기대 마커를 덮음 |
| `[쓰기 중단: 마커 충돌]` | `check` `conflict` — 기대 위치 밖에 언어 마커가 있음 |
| `[쓰기 중단: 검사 실패]` | 생성 마커 미발견, 임시 파일 준비 실패, `check` `invalid-block`, `check` 실행 실패 |
| `[쓰기 중단: 실행 중 파일 변경]` | 재확인에서 해시가 다르거나, 파일이 사라지거나 새로 생김 |
| `[쓰기 중단: 재확인 실패]` | Step 1 스냅숏 또는 재확인에서 읽기 오류 (오류 코드 표시) |
| `[쓰기 중단: 백업 실패]` | 백업 명령 실패 |

## 동작

### Step 1 — 모드 판정

CLAUDE.md 모드 표는 위에서부터 첫 일치 행이 모드다.

| 우선순위 | 상태 | 모드 |
|---|---|---|
| 1 | 스냅숏 `absent` | 신규 생성 |
| 2 | `@.harness/harness-guide.md` 줄 없음 (rules 마커가 있어도) | 경계 탐지 불가 → 백업 후 재생성 / 중단 질문 |
| 3 | `<!-- harness-rules:begin -->` 마커 있음 | 업데이트 |
| 4 | 그 밖 | 일회 마이그레이션 |

AGENTS.md는 `<!-- harness-guide:begin -->` 마커 유무로 신규·업데이트·경계 탐지 불가를 판정한다.

- 스냅숏이 `error`인 파일은 모드 표에 넣지 않는다. 백업 질문 없이 조립·검사·쓰기를 모두 건너뛰고 `[쓰기 중단: 재확인 실패]`로 끝나며, 실행 중 권한이 복구돼도 쓰지 않는다. 읽기 실패는 사용자 "중단"이 아니므로 Step 5·6 실행 조건(두 파일 모두 사용자가 "중단"을 고른 경우에만 건너뜀)에 영향이 없다.
- 경계 탐지 불가 질문을 만들 때 timestamp(`date +%Y%m%d%H%M%S`, 로컬 시각)를 한 번 정해 권장 옵션에 실제 백업 경로(`CLAUDE.md.bak.20261127071530` 형식)로 표시한다. 이 시점에는 백업을 만들지 않는다.

### Step 2 — 언어 질문

`lang.js recommend`를 한 번 실행하고, docs → commit → comments 순서로 키마다 `AskUserQuestion`을 한다. 옵션은 `ko`·`en`이며 권장값을 첫 옵션 `(Recommended)`로 둔다. 대화 언어는 묻지 않는다.

| `notes` 항목 | 질문 설명 |
|---|---|
| `missing` | 기존 값 없음 |
| `unsupported:<v>` | 미지원 값 `<v>` |
| `duplicate` | 중복 값 |
| `legacy-conflict` | 기존 문구 충돌 |
| `differs:<v>` | AGENTS.md 값 `<v>`와 다름 |

- `files`에 `malformed`인 파일이 있으면 "<파일>의 malformed 언어 블록을 발견해 재생성"을 덧붙인다.
- `recommend`가 실패하거나(exit ≠ 0, JSON 해석 불가, `value`가 `ko`·`en`이 아님) 세 키 모두 `ko`를 권장하고 "권장값 계산 실패"를 표시한다.
- 저장 허용값은 `ko`·`en`뿐이며, Other 입력이 그 밖이면 다시 묻는다.
- 기술 스택 답변은 항목마다 bullet로 바꾸되, 이미 Markdown 헤더인 줄(`## graphify` 등)과 그 아래 본문은 그대로 둔다. 그래야 Step 3의 graphify 중복 섹션 제거가 적용된다.

### Step 3·4 — 조립

현행 조립 규칙(CLAUDE.md는 frontmatter·프로젝트 섹션·rules import 블록·사용자 정의 영역, AGENTS.md는 프로젝트 섹션·guide 블록·end 뒤 영역)을 스냅숏 `content`에 적용한다. 프로젝트 섹션의 언어 규칙 자리에 위 `## Language` 블록을 넣는다. "백업 후 재생성"을 고른 파일은 신규 생성 템플릿 방식으로 조립하고 쓰기는 기존 파일 경로를 따른다.

### 쓰기 단계 (파일마다 A → B → C → D → E)

`[중단]`·스냅숏 `error` 파일은 이 단계를 건너뛴다. 한 단계에서 중단되면 그 파일의 뒤 단계를 실행하지 않고 대상 파일에 쓰지 않는다.

1. **A. 검사**: 후처리(graphify 제거·줄바꿈 정규화 등)가 끝난 최종 조립본에서 프로젝트 섹션의 마지막 `## Language` 뒤 begin·end 마커 줄 번호(CLAUDE.md는 frontmatter 포함, 1부터)를 기대 줄로 정한다. 조립본을 `mktemp` 임시 파일에 써서 `lang.js check --file="<임시>" --expect-begin --expect-end --expect-docs --expect-commit --expect-comments`를 실행하고, 결과와 무관하게 `rm -f -- "<임시>"`로 지운다. `ok`가 아니면 상태 표의 쓰기 중단으로 끝낸다. 진단은 조립본 줄 번호와 영역(Step 2 입력 / 기존 <파일> 사용자 영역 / harness-guide.md 본문)으로 표시하고, 펜스를 닫거나 마커를 지우거나 답변에서 빼고 재실행하라고 안내한다.
2. **B. 재확인**: 같은 스냅숏 명령을 다시 실행해 `status`·`hash`만 Step 1과 비교한다. 해시 다름, 있던 파일 사라짐, 없던 파일 생김은 `[쓰기 중단: 실행 중 파일 변경]`, 읽기 오류는 `[쓰기 중단: 재확인 실패]`다. 기존 파일은 C 직전, 신규 파일은 E 직전에 한다.
3. **C. 변경 감지** (기존 파일): CLAUDE.md는 `version` 줄을 제외한 SHA-256, AGENTS.md는 전체 내용을 스냅숏과 비교한다. 같으면 쓰기 호출 없이 `[변경 없음]`.
4. **D. 백업** ("백업 후 재생성"을 고른 파일만): Step 1에 표시한 경로로 만든다.

   ```bash
   test ! -e "<파일>.bak.<timestamp>" && test ! -L "<파일>.bak.<timestamp>" && cp -n -- "<파일>" "<파일>.bak.<timestamp>"
   ```

   백업 경로에 파일·디렉토리·심볼릭 링크가 이미 있으면 덮어쓰지 않고 실패한다(`cp -n`이 플랫폼에 따라 exit 0으로 건너뛸 수 있어 `test`로 먼저 확인). 실패하면 다른 경로로 재시도하지 않고 `[쓰기 중단: 백업 실패]`.
5. **E. 쓰기**: A에서 검사한 조립본을 다시 조립하지 않고 쓴다. CLAUDE.md는 원자적 쓰기, AGENTS.md는 조립본 그대로 쓴다.

   | 파일 | 경로 | `version` | 상태 |
   |---|---|---|---|
   | CLAUDE.md | 신규 | `1` | `[신규]` |
   | CLAUDE.md | 기존, 내용 다름 | 스냅숏 `version` + 1 (스냅숏에 `version` 줄이 없으면 `1`) | `[업데이트]` |
   | AGENTS.md | 신규 / 기존, 내용 다름 | 없음 | `[신규]` / `[업데이트]` |

   `version` 줄은 frontmatter 안이라 바꿔도 줄 수와 블록 위치가 그대로이므로 A의 검사 결과가 유지된다. `check`와 변경 감지는 올리기 전 조립본으로 한다.

### Step 7 — 결과 안내

1. 파일별 상태 줄을 출력하고, 쓰기 중단이면 그 아래에 진단을 들여써서 출력한다.
2. 모든 쓰기와 Step 5·6 config 기록이 끝난 뒤 `lang.js explain --kind=docs`·`--kind=commit`을 실행해 `언어 적용값:` 아래에 `docs: <value> (source=<source>, reason=<reason>)` 형식으로 출력한다.
   - explain의 stderr는 줄마다 `lang.js 경고: <줄>`로 전달한다.
   - exit ≠ 0이거나 stdout이 `value=`·`source=`·`reason=` 세 줄(끝 줄바꿈 무시)이 아니면 그 키만 `적용값 확인 실패`로 표시한다.
3. 적용값이 Step 2 선택값과 다르면 그 키 아래에 원인을 경고한다. 원인 파일이 `[중단]`·쓰기 중단이면 "<source>가 갱신되지 않아 선택값 `<v>`가 적용되지 않았습니다", 그 밖이면 "<source>의 값(reason=<reason>)이 우선 적용되어 …"라고 쓴다.
4. 마지막에 대화 언어는 Claude Code `language` 설정을 따르며, 하네스가 managed settings와 `--settings`는 읽지 않는다는 안내를 출력한다.

두 파일이 `[신규]`·`[업데이트]`·`[변경 없음]`으로 끝난 뒤 같은 입력으로 재실행하면 두 파일 모두 `[변경 없음]`이 되도록 설계됐다.

## 제약사항

- **실행 검증 범위**: 스킬 동작(스냅숏·검사·재확인·백업·쓰기 분기, 질문 중 외부 수정·권한 변경)은 스킬 본문 대조로 판정했고, 임시 저장소 사본에서 `/flow-init`을 대화형으로 실제 실행하는 검증은 이 토픽에서 하지 않았다. `lang.js` 서브커맨드는 테스트로 검증된다.
- **신규 직후 재실행**: 신규 생성·재생성 템플릿은 `harness-guide.md`를 그대로 삽입하고 업데이트는 frontmatter를 빼고 삽입하므로, `[신규]` 직후 재실행은 AGENTS.md가 `[업데이트]`가 될 수 있다(멱등성 문장과 어긋나는 기존 동작).
- **경계 줄 오인식**: Step 2 답변에 `@.harness/harness-guide.md`나 `<!-- harness-guide:begin -->` 줄이 들어가면 프로젝트 섹션 경계를 앞에서 잡아 생성 마커를 찾지 못하고 `[쓰기 중단: 검사 실패]`로 끝난다(쓰지 않으므로 안전).
- **TOCTOU**: 재확인과 백업·쓰기 사이의 짧은 구간은 막지 않는다. 쓰기 방식(원자적 교체, 동시 실행, 권한)은 기존 동작 그대로다.
- **managed settings·`--settings`**: 결과 안내의 적용값은 `lang.js` 기준이며 Claude Code의 더 높은 우선순위 설정은 반영하지 않는다.
