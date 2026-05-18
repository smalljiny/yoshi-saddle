---
version: 12
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
