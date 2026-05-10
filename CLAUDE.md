---
version: 11
---

# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때의 안내 파일.

## 프로젝트 개요

이 저장소는 **Claude Code 기반 개발을 위한 하네스**다. **프로젝트 템플릿**으로 기능하며 — 새 프로젝트를 시작할 때 `src/` 디렉토리를 복사해 개발 환경으로 사용한다. `scripts/deploy-harness.sh`로 대상 프로젝트에 배포하거나, 인자 없이 실행하면 `src/` → 루트 자기 동기화를 수행한다.

## 기술 스택

- **Bash** — 배포 스크립트 (`scripts/deploy-harness.sh`)
- **Node.js** — 훅 스크립트, `dev-context.js` 상태 관리자 (`.harness/scripts/`, `.claude/scripts/`)
- **Markdown** — 에이전트, 스킬, 커맨드, 규칙 컴포넌트 파일

## 언어 규칙

- 문서, 주석, 커밋 메시지: **한국어**
- 코드 식별자 (변수, 함수, 파일명, 디렉토리명): **영어**
- 컴포넌트 파일 (에이전트, 스킬, 커맨드, 규칙): **영어**

@.harness/harness-guide.md

## graphify

graphify-out/이 존재하면 그 graph가 코드·문서의 1차 지도이다.

- ALWAYS read graphify-out/GRAPH_REPORT.md before grep/glob, source 파일 읽기, 코드베이스 질문 답변. graph는 1차 지도이다.
- cross-module 질문("X와 Y의 관계", "X 수정 시 영향 범위")은 `uv run graphify query "<질문>"`, `uv run graphify path "<A>" "<B>"`, `uv run graphify explain "<개념>"`을 grep보다 우선한다.
- 분석 대상 디렉토리는 `node .harness/scripts/dev-context.js read --field=config.graphify.targets` (배열) 에 정의돼 있다.
- 코드 변경 후 `uv run graphify update <path>` 로 graphify-out/을 갱신한다 (AST-only, no API cost).
- graphify-out/이 없거나 graphify CLI 호출이 실패하면 grep/glob로 회귀하고, 풀 빌드는 사용자에게 안내한다.
