---
version: 3
name: flow-init
description: Initialize or update project section of CLAUDE.md and AGENTS.md.
origin: harness
user-invocable: true
---

# /flow-init

루트 `CLAUDE.md`와 `AGENTS.md`의 프로젝트 섹션을 초기화하거나 업데이트한다.

`deploy-harness.sh`로 하네스 파일을 배포한 후, `.harness/harness-guide.md`의 내용을 기반으로 루트 `CLAUDE.md`와 `AGENTS.md`를 구성하는 환경 설정 단계다.

## Usage

```
/flow-init    CLAUDE.md와 AGENTS.md를 생성 또는 업데이트
```

## Execution Flow

### Step 1: 모드 분기

루트 `CLAUDE.md`와 `AGENTS.md` 각각 독립적으로 판정한다:

**CLAUDE.md 모드** (3 actionable states):

| 상태 | 모드 |
|------|------|
| `CLAUDE.md` 파일 없음 | **신규 생성** |
| `@.harness/harness-guide.md` 라인 있음 | **업데이트** |
| `@.harness/harness-guide.md` 라인 없음 (마커 없음) | **경계 탐지 불가** → 경고 출력 + `AskUserQuestion`: `(Recommended) CLAUDE.md.bak.<timestamp> 백업 후 재생성 모드로 진행` / `중단` |

Step 1은 흐름 분기(신규 생성 / 업데이트 / 경계 탐지 불가)만 결정한다. 터미널 "변경 없음" 판정은 Step 3 step 6의 SHA-256 hash 비교가 단일 권위자다 — 업데이트 모드는 항상 Step 2(프로젝트 정보 수집)·Step 3 작성 흐름(파싱→조립)·Step 3 step 6 hash 비교를 그대로 진행한다.

판정 입력:
- `.harness/rules/` glob 결과: `find .harness/rules -name "*.md" -type f | sort`의 출력 (디렉토리 부재 시 빈 목록).
- 기존 rules import 라인 집합: 기존 CLAUDE.md 파일 전체에서 `@.harness/rules/<rel-path>` 접두사를 가진 라인을 **위치 무관**으로 모두 수집한다. 이 라인들은 import 블록의 단일 진실 원천이며 사용자 영역으로 분류하지 않는다 — `@.harness/harness-guide.md` 라인과 자동 관리 import 블록 사이에 사용자 콘텐츠가 끼어들어도, 또는 사용자 영역에 흩어져 있어도 dedupe·재배치 대상으로 흡수된다.
- `@.harness/harness-guide.md` 라인은 위치 기준 마커로, import 블록 시작 위치(신규 import 블록을 삽입할 지점)와 모드 분기 기준을 표시한다.

**AGENTS.md 모드**:
- `AGENTS.md`가 없으면 → **신규 생성**
- 있고 `<!-- harness-guide:begin -->` 마커가 있으면 → **업데이트**
- 있지만 마커가 없으면 → **경계 탐지 불가** → 경고 출력 + `AskUserQuestion`:
  - `(Recommended) AGENTS.md.bak.<timestamp> 백업 후 재생성 모드로 진행`
  - `중단`

각 파일의 모드는 독립적으로 결정되며, 한 파일이 "중단"을 선택해도 다른 파일은 계속 진행할 수 있다.

### Step 2: 프로젝트 정보 수집

`AskUserQuestion` 도구로 아래 4개 항목을 순서대로 질문한다. 각 질문의 첫 번째 옵션은 `(Recommended)` 레이블로 표시한다.

업데이트 모드에서는 기존 `CLAUDE.md`에서 읽은 값을 권장 옵션으로 제시한다.

1. **프로젝트명** — 짧은 이름 (예: `my-app`)
   - `(Recommended)` 현재 디렉토리명: `$(basename "$PWD")`
   - 직접 입력

2. **한 줄 설명** — 프로젝트 또는 저장소의 목적
   - `(Recommended)` 기존 값 (업데이트 모드) 또는 예시
   - 직접 입력

3. **기술 스택** — 핵심 언어·프레임워크 목록 (쉼표 구분)
   - `(Recommended)` 기존 값 (업데이트 모드) 또는 예시
   - 직접 입력

4. **언어 규칙** — 문서/코드/컴포넌트 파일 언어
   - `(Recommended)` 기본값: 문서·주석·커밋 메시지 **한국어** / 코드 식별자 **영어** / 컴포넌트 파일 **영어**
   - 직접 입력

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

## 언어 규칙

[언어 규칙]

@.harness/harness-guide.md
@.harness/rules/coding-style.md
@.harness/rules/git-workflow.md
@.harness/rules/security.md
@.harness/rules/testing.md
@.harness/rules/typescript/patterns.md
@.harness/rules/typescript/testing.md

[사용자 정의 영역 — 보존]
```

**import 블록 경계 규칙**:

- import 블록은 `@.harness/harness-guide.md` 라인부터 시작한다.
- `@.harness/harness-guide.md` 직후에 `.harness/rules/**/*.md` glob 결과로 자동 생성된 `@.harness/rules/<rel-path>` 라인 N개가 정렬된 순서로 이어진다.
- import 블록 자체는 마지막 import 라인 뒤 newline `\n` 1개로 끝난다 — trailing 빈 줄은 포함하지 않는다. 사용자 영역과의 구분 빈 줄 1개는 Step 3 조립 식의 `+ [빈 줄]`이 단독 소유한다 (이중 빈 줄 방지).
- 기존 파일에서 `@.harness/rules/<rel-path>` 접두사 라인은 위치 무관으로 모두 수집해 dedupe·재배치 대상으로 본다 — 사용자 영역에 흩어진 라인도 import 블록으로 흡수된다.
- 그 외 라인(harness 외부 `@import`, 일반 마크다운, 사용자 추가 콘텐츠)은 **그대로 보존**된다.

**import 블록 정렬·생성 규칙** (§3.2):

- **수집**: `find .harness/rules -name "*.md" -type f | sort` 명령으로 룰 파일 목록을 수집한다. `.harness/rules/`로 시작하는 상대 경로로 변환한다.
- **정렬**: `sort`의 lexicographic 결과를 그대로 사용한다 — top-level 파일이 sub-dir 파일보다 alphabetically 앞서므로 자연스럽게 top-level 우선.
- **변환**: 각 경로 앞에 `@` 접두사를 부여한다. 결과 라인 형식은 `@.harness/rules/<rel-path>`.
- **삽입 위치**: `@.harness/harness-guide.md` 직후 줄부터 차례로 삽입한다. import 블록 자체에는 trailing 빈 줄을 포함하지 않는다 (구분 빈 줄은 조립 식이 단독 소유).

**`.harness/rules/` 부재 시**:

- `.harness/rules/` 디렉토리가 없거나 glob 결과가 0건이면 import 블록 생성을 skip한다.
- `@.harness/harness-guide.md` 한 줄만 import 블록으로 유지하고 그 뒤에 빈 줄 1개를 둔다.
- Step 6 결과 안내에 `[정보] .harness/rules/ 부재로 룰 import 생략` 1줄을 추가한다.

**Step 3 작성 흐름** (§3.4):

1. **파싱** — 기존 CLAUDE.md를 세 부분으로 나눈다 (prefix-based 수집):
   - frontmatter + 프로젝트 섹션 (파일 시작 ~ `@.harness/harness-guide.md` 라인 직전)
   - 기존 rules import 라인 집합 (`@.harness/harness-guide.md` 라인 + 파일 전체에서 `@.harness/rules/<rel-path>` 접두사 라인을 위치 무관으로 모두 수집한 집합). 신규 import 블록 생성 시 dedupe·재정렬 입력으로만 사용하며, 사용자 영역에는 포함하지 않는다.
   - 사용자 정의 영역 (`@.harness/harness-guide.md` 라인 직후부터 파일 끝까지의 모든 라인에서 위에서 수집한 `@.harness/rules/<rel-path>` 접두사 라인을 제거하고, import 블록과 사용자 영역을 구분하는 선두 빈 줄 1개를 구분자로 흡수한 나머지). 사용자 영역에 흩어진 rules import는 자동으로 import 블록으로 재배치되며 중복 누적되지 않는다.
2. **신규 프로젝트 섹션 작성** — Step 2 수집 정보로 frontmatter·프로젝트 섹션을 구성한다. 프로젝트 섹션 본문 끝에 trailing blank 1줄을 둔다.
3. **신규 import 블록 생성** — 위 정렬·생성 규칙으로 `@.harness/harness-guide.md` + `@.harness/rules/<rel-path>` N개 라인을 만든다. `.harness/rules/` 부재 시 `@.harness/harness-guide.md` 한 줄만 생성한다.
4. **graphify 중복 섹션 제거** — 신규 프로젝트 섹션 본문에 `## graphify`로 시작하는 헤더 라인이 있으면 해당 섹션 전체(헤더부터 다음 `## ` 헤더 직전까지 또는 섹션 끝까지)를 삭제한다. canonical 위치는 `@.harness/harness-guide.md` import이며 import 라인이 graphify 콘텐츠를 자동 제공하므로 본문 내 별도 `## graphify` 섹션은 중복이다.
5. **조립** — [frontmatter] + [프로젝트 섹션 (trailing blank 1줄 포함)] + [import 블록] + [빈 줄] + [사용자 정의 영역] 순서로 연결한다. 파일 끝은 trailing newline `\n` 1개로 정규화한다.
6. **변경 감지 (SHA-256 hash 비교)** — 조립된 신규 CLAUDE.md와 기존 CLAUDE.md의 SHA-256 hash를 1회 비교한다 (graphify 제거가 완료된 최종 콘텐츠에 대해 1회). hash 비교 범위에서 frontmatter `version: N` 라인은 제외한다. hash가 동일하면 파일을 건드리지 않고 `[변경 없음]`으로 표기한다. 다르면 `version` 값을 기존 +1로 증가시키고 원자적 쓰기를 수행한다.

**신규 생성**: 위 흐름에서 1·6단계를 skip하고 2·3·4·5단계로 새 CLAUDE.md를 생성한다 (사용자 정의 영역은 빈 상태이며, 빈 사용자 영역 슬롯 앞 구분자 빈 줄은 drop하고 파일은 import 블록 마지막 라인 뒤 trailing newline `\n` 1개로 끝난다).

### Step 4: AGENTS.md 작성

**신규 생성**:

```markdown
# AGENTS.md

Codex CLI가 이 저장소에서 작업할 때의 안내 파일. Claude Code는 `CLAUDE.md`를 사용한다.

## 프로젝트 개요

[한 줄 설명]

## 기술 스택

[기술 스택]

## 언어 규칙

[언어 규칙]

<!-- harness-guide:begin -->
[.harness/harness-guide.md 전체 내용]
<!-- harness-guide:end -->
```

`.harness/harness-guide.md`가 존재하면 내용을 읽어 삽입한다. 없으면 빈 블록으로 생성하고 경고를 출력한다.

**업데이트**:
- `<!-- harness-guide:begin -->` 이전 모든 내용을 새 프로젝트 섹션으로 교체한다.
- begin/end 마커 사이 내용도 현재 `.harness/harness-guide.md` 내용으로 교체한다 (point-in-time 갱신). **삽입 시 harness-guide.md의 YAML frontmatter 블록(`---\nversion: N\n---`)은 제외하고 본문만 삽입**한다.
- 마커 라인 자체(`<!-- harness-guide:begin -->`, `<!-- harness-guide:end -->`)는 그대로 유지한다.
- `<!-- harness-guide:end -->` **이후의 내용도 그대로 보존**한다.
- **trailing 줄바꿈 정규화**: harness-guide 본문을 삽입할 때 본문 끝의 공백/줄바꿈을 rstrip한 뒤 정확히 `\n`(한 줄)을 붙여 end 마커 앞에 놓는다. end 마커 앞에 빈 줄이 생기지 않도록 한다.
- **변경 감지**: 조립된 전체 AGENTS.md 내용이 기존과 동일하면 파일을 건드리지 않는다. (`[변경 없음]` 표기)

**graphify 중복 섹션 제거**: 업데이트 모드에서, `<!-- harness-guide:end -->` 마커 **외부**(end 마커 이후 영역)에 `## graphify`로 시작하는 헤더 라인이 있으면 해당 섹션 전체(헤더부터 다음 `## ` 헤더 직전까지 또는 파일 끝까지)를 삭제한다. begin/end 마커 내부에 임베드된 harness-guide 본문이 canonical graphify 콘텐츠를 이미 제공하므로 외부 `## graphify` 섹션은 중복이다. begin/end 마커 내부는 건드리지 않는다. 신규 생성 모드는 외부 graphify 섹션이 없으므로 본 처리를 건너뛴다.

### Step 5: docs.sourceFilter 자동 감지·설정

Step 1에서 두 파일(`CLAUDE.md`, `AGENTS.md`) 모두 "중단"을 선택한 경우 이 단계를 건너뛴다.

`scripts/deploy-harness.sh` 파일 존재 여부로 저장소 유형을 감지하고 `config.docs.sourceFilter`를 설정한다.

**감지 로직**:

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

**덮어쓰기 정책**: 기존 값이 있어도 감지 결과로 덮어쓴다. 사용자 정의가 필요하면 `/flow-init` 재실행 후 `dev-context.js set-field`로 수동 조정:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter --value='["src/","lib/"]'
```

### Step 6: 결과 안내

작성된 파일 경로와 결과를 출력한다:

```
완료:
  [신규/업데이트/변경 없음] CLAUDE.md
  [신규/업데이트/변경 없음] AGENTS.md
  [감지] config.docs.sourceFilter = [".claude/",".codex/",".harness/","CLAUDE.md","AGENTS.md"]
```
(일반 프로젝트의 경우: `[감지] config.docs.sourceFilter = [] (필터 없음)`)

- `[신규]`: 파일이 새로 생성됨
- `[업데이트]`: 내용이 달라져 파일을 다시 씀
- `[변경 없음]`: 내용이 동일하여 파일을 건드리지 않음
- `[정보] .harness/rules/ 부재로 룰 import 생략`: `.harness/rules/` 디렉토리가 없거나 glob 결과가 0건이어서 룰 import 블록을 생성하지 않은 경우에 한해 4번째 라인으로 추가 출력한다. 그 외 경우 본 라인을 출력하지 않는다 (위 예시는 `.harness/rules/` 존재 시나리오이므로 본 라인을 포함하지 않는다).

## 오류 처리

| 상황 | 처리 |
|------|------|
| 마커 없는 기존 파일 | Step 1에서 경고 + AskUserQuestion → 백업 후 재생성 or 중단 |
| `.harness/harness-guide.md` 없음 | AGENTS.md begin/end 블록을 빈 상태로 생성, 경고 출력 |
| 쓰기 권한 없음 | 오류 메시지 출력 후 종료 |
| Step 5: `dev-context.js` 미존재 또는 `set-field` 실패 | 경고 출력 + Step 5 스킵, Step 6에서 `[감지 실패] config.docs.sourceFilter` 표기 |

## Key Principles

- **항상 루트 대상** — `src/` 여부와 관계없이 항상 루트 `CLAUDE.md`, `AGENTS.md`를 수정한다.
- **AskUserQuestion 사용 필수** — 선택이 포함된 모든 질문에 적용. 첫 옵션에 `(Recommended)` 레이블.
- **경계 마커 기준 업데이트** — 프로젝트 섹션은 마커(`@.harness/harness-guide.md`, `<!-- harness-guide:begin -->`) 이전까지로 정의됨.
- **harness-guide 블록 갱신** — 업데이트 시 AGENTS.md의 harness-guide 블록을 현재 `.harness/harness-guide.md` 내용으로 최신화.
- **graphify 중복 섹션 제거** — CLAUDE.md 본문과 AGENTS.md의 end 마커 외부에 별도 `## graphify` 섹션이 있으면 삭제한다. canonical 위치는 `@.harness/harness-guide.md` import 또는 begin/end 마커 내부 임베드 본문이다.
- **저장소 유형 자동 감지** — `scripts/deploy-harness.sh` 존재 여부로 `config.docs.sourceFilter` 기본값 결정 (하네스 저장소: 하네스 파일 prefix 목록, 일반 프로젝트: 빈 배열); 기존 값이 있어도 덮어씀 (`/flow-init`은 멱등한 설정 커맨드이므로 재실행마다 전체 초기화가 의도된 동작).
