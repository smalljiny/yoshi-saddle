---
version: 1
description: Initialize or update project section of CLAUDE.md and AGENTS.md.
category: dev-workflow
---

# /dev:init

`CLAUDE.md`와 `AGENTS.md`의 프로젝트 섹션을 초기화하거나 업데이트한다.

## Usage

```
/dev:init    CLAUDE.md와 AGENTS.md를 생성 또는 업데이트
```

## Execution Flow

### Step 1: 쓰기 대상 결정

`src/` 디렉토리 존재 여부로 컨텍스트를 판별한다:

```bash
[ -d src ] && echo "harness-repo" || echo "target-project"
```

- **존재 (하네스 저장소)**: `src/CLAUDE.md`, `src/AGENTS.md`에 쓴다. 완료 후 `./scripts/deploy-harness.sh` 실행 안내를 출력한다.
- **부재 (타깃 프로젝트)**: 루트 `CLAUDE.md`, `AGENTS.md`에 직접 쓴다.

이후 단계에서 `TARGET_DIR`는 `src/`(하네스 저장소) 또는 `.`(타깃 프로젝트)를 가리킨다.

### Step 2: 모드 분기

대상 파일 존재 여부로 신규 생성 vs 업데이트 모드를 결정한다:

- `$TARGET_DIR/CLAUDE.md`가 없으면 → **신규 생성 모드**
- `$TARGET_DIR/CLAUDE.md`가 있으면 → **업데이트 모드**

**업데이트 모드 — 기존 마커 확인**:
- CLAUDE.md에 `@.harness/harness-guide.md` 라인이 없으면 경계 탐지 불가
- AGENTS.md에 `<!-- harness-guide:begin -->` 마커가 없으면 경계 탐지 불가
- 위 중 하나라도 없으면: 사용자에게 경고를 출력하고, `AskUserQuestion`으로 진행 여부를 묻는다.
  - `(Recommended) 백업(.bak) 생성 후 재생성 모드로 진행` — 기존 파일을 `<file>.bak`으로 복사 후 신규 생성 모드로 전환
  - `중단` — 업데이트를 취소하고 종료

### Step 3: 프로젝트 정보 수집

`AskUserQuestion` 도구로 아래 4개 항목을 순서대로 질문한다. 각 질문의 첫 번째 옵션은 `(Recommended)` 레이블로 표시한다.

1. **프로젝트명** — 짧은 이름 (예: `my-app`)
   - `(Recommended)` 현재 디렉토리명: `$(basename "$PWD")`
   - 직접 입력

2. **한 줄 설명** — 프로젝트 또는 저장소의 목적
   - `(Recommended)` 예시: `[프로젝트명] 백엔드 서비스`
   - 직접 입력

3. **기술 스택** — 핵심 언어·프레임워크 목록 (쉼표 구분)
   - `(Recommended)` 예시: `TypeScript, Node.js, PostgreSQL`
   - 직접 입력

4. **언어 규칙** — 문서/코드/컴포넌트 파일 언어
   - `(Recommended)` 기본값: 문서·주석·커밋 메시지 **한국어** / 코드 식별자 **영어** / 컴포넌트 파일 **영어**
   - 직접 입력

### Step 4: CLAUDE.md 작성

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

**신규 생성**: 위 템플릿으로 `$TARGET_DIR/CLAUDE.md`를 생성한다.

**업데이트**: `@.harness/harness-guide.md` 라인을 경계로, 그 이전의 모든 내용을 새 프로젝트 섹션으로 교체한다. import 라인(`@.harness/harness-guide.md`)은 그대로 유지한다.

- 업데이트 시 `version` 값을 기존 +1로 증가시킨다.

### Step 5: AGENTS.md 작성

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
- begin/end 마커 사이 내용도 현재 `.harness/harness-guide.md` 내용으로 교체한다 (point-in-time 갱신).
- 마커 라인 자체(`<!-- harness-guide:begin -->`, `<!-- harness-guide:end -->`)는 그대로 유지한다.

### Step 6: 결과 안내

작성된 파일 경로와 모드(신규/업데이트)를 출력한다:

```
완료:
  [신규/업데이트] $TARGET_DIR/CLAUDE.md
  [신규/업데이트] $TARGET_DIR/AGENTS.md
```

`src/` 모드(하네스 저장소)일 경우 추가로 아래 안내를 출력한다:

```
루트에 반영하려면 self-sync를 실행하세요:
  ./scripts/deploy-harness.sh
```

## 오류 처리

| 상황 | 처리 |
|------|------|
| 마커 없는 기존 파일 | Step 2에서 경고 + AskUserQuestion → 백업 후 재생성 or 중단 |
| `.harness/harness-guide.md` 없음 | AGENTS.md begin/end 블록을 빈 상태로 생성, 경고 출력 |
| 쓰기 권한 없음 | 오류 메시지 출력 후 종료 |

## Key Principles

- **AskUserQuestion 사용 필수** — 선택이 포함된 모든 질문에 적용. 첫 옵션에 `(Recommended)` 레이블.
- **경계 마커 기준 업데이트** — 프로젝트 섹션은 마커(`@.harness/harness-guide.md`, `<!-- harness-guide:begin -->`) 이전까지로 정의됨.
- **harness-guide 블록 갱신** — 업데이트 시 AGENTS.md의 harness-guide 블록을 현재 `.harness/harness-guide.md` 내용으로 최신화.
- **src/ 우선** — 하네스 저장소에서는 항상 `src/`에 쓰고 self-sync로 루트에 반영.
