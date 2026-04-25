---
version: 3
description: Initialize or update project section of CLAUDE.md and AGENTS.md.
category: dev-workflow
---

# /dev:init

루트 `CLAUDE.md`와 `AGENTS.md`의 프로젝트 섹션을 초기화하거나 업데이트한다.

`deploy-harness.sh`로 하네스 파일을 배포한 후, `.harness/harness-guide.md`의 내용을 기반으로 루트 `CLAUDE.md`와 `AGENTS.md`를 구성하는 환경 설정 단계다.

## Usage

```
/dev:init    CLAUDE.md와 AGENTS.md를 생성 또는 업데이트
```

## Execution Flow

### Step 1: 모드 분기

루트 `CLAUDE.md`와 `AGENTS.md` 각각 독립적으로 판정한다:

**CLAUDE.md 모드**:
- `CLAUDE.md`가 없으면 → **신규 생성**
- 있고 `@.harness/harness-guide.md` 라인이 있으면 → **업데이트**
- 있지만 해당 라인이 없으면 → **경계 탐지 불가** → 경고 출력 + `AskUserQuestion`:
  - `(Recommended) CLAUDE.md.bak.<timestamp> 백업 후 재생성 모드로 진행`
  - `중단`

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

수집한 프로젝트 정보로 프로젝트 섹션을 구성한다:

```markdown
---
version: 1
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
```

**신규 생성**: 위 템플릿으로 루트 `CLAUDE.md`를 생성한다.

**업데이트**: `@.harness/harness-guide.md` 라인을 경계로, 그 이전의 모든 내용을 새 프로젝트 섹션으로 교체한다. import 라인(`@.harness/harness-guide.md`)은 그대로 유지하며, **import 라인 이후의 내용도 그대로 보존**한다.

- 업데이트 시 `version` 값을 기존 +1로 증가시킨다.

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

### Step 5: 결과 안내

작성된 파일 경로와 모드(신규/업데이트)를 출력한다:

```
완료:
  [신규/업데이트] CLAUDE.md
  [신규/업데이트] AGENTS.md
```

## 오류 처리

| 상황 | 처리 |
|------|------|
| 마커 없는 기존 파일 | Step 1에서 경고 + AskUserQuestion → 백업 후 재생성 or 중단 |
| `.harness/harness-guide.md` 없음 | AGENTS.md begin/end 블록을 빈 상태로 생성, 경고 출력 |
| 쓰기 권한 없음 | 오류 메시지 출력 후 종료 |

## Key Principles

- **항상 루트 대상** — `src/` 여부와 관계없이 항상 루트 `CLAUDE.md`, `AGENTS.md`를 수정한다.
- **AskUserQuestion 사용 필수** — 선택이 포함된 모든 질문에 적용. 첫 옵션에 `(Recommended)` 레이블.
- **경계 마커 기준 업데이트** — 프로젝트 섹션은 마커(`@.harness/harness-guide.md`, `<!-- harness-guide:begin -->`) 이전까지로 정의됨.
- **harness-guide 블록 갱신** — 업데이트 시 AGENTS.md의 harness-guide 블록을 현재 `.harness/harness-guide.md` 내용으로 최신화.
