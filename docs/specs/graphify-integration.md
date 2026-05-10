---
last_modified: 2026-05-10
author: @mario
status: Active
---

# graphify Stage 1 통합

> graphify (PyPI `graphifyy`) 도구를 본 하네스에 Stage 1 평가 형태로 통합한다. 사용 가이드, gitignore 정책, 시범 빌드, self-sync, 가상 환경 ignore 5개 영역을 다룬다.

## 개요

graphify는 코드베이스·문서를 지식 그래프로 변환해 god nodes·surprising connections·community 구조를 시각화하는 외부 도구다 (PyPI 패키지명: `graphifyy`). Stage 1은 1회 시범 빌드로 채택 가치를 경험적으로 검증하는 단계다. 자동 빌드·incremental update·CodexCLI 통합은 Stage 2 범위이며 본 문서에서 다루지 않는다.

Stage 1 시범 빌드 결과는 `docs/_local/active/graphify-integration/graphify-trial-evaluation.md`에 기록되어 있다. 5/5 기준 충족으로 Stage 2 spec 작성이 권고된다.

## 구조 / 정책

Stage 1이 변경한 파일과 정책은 다음과 같다.

| 파일 | 변경 내용 |
|------|----------|
| `src/.harness/harness-guide.md` | "graphify 사용 가이드" 절 추가 (G1). frontmatter `version` 4 → 5 |
| `.harness/harness-guide.md` | `deploy-harness.sh` self-sync로 src/와 동기화 (G5) |
| `.gitignore` (루트) | `graphify-out/*` ignore + `!GRAPH_REPORT.md` + `!cost.json` 예외 추가 (G2). `.venv/` ignore 추가 (G6) |
| `graphify-out/GRAPH_REPORT.md` | 시범 빌드 산출물 — 사람이 읽는 그래프 요약. tracked |
| `graphify-out/cost.json` | 시범 빌드 사용량 (input token). tracked |

**gitignore 정책 (`graphify-out/`)**: 디렉토리 내부 전체를 ignore하되 `GRAPH_REPORT.md`와 `cost.json` 두 파일만 PR diff에 노출된다. `graph.json`, `graph.html`, `cache/`, `manifest.json`, `.graphify_*` 메타파일은 모두 ignore된다. `.gitignore`는 `deploy-harness.sh` self-sync 대상이 아니므로 루트에 직접 적용된다.

**가상 환경 ignore (`.venv/`)**: graphify를 uv 환경으로 설치할 때 생성되는 `.venv/`를 루트 `.gitignore`에 추가했다. 프로젝트 한정 가상 환경을 git에서 제외한다.

## 동작

### graphify 호출 흐름

graphify는 세 계층이 협력한다.

1. **graphify CLI** (`graphifyy` PyPI 패키지) — Tree-sitter AST 추출, NetworkX 그래프 빌드, Leiden 클러스터링, 출력 파일 생성. 결정론적이고 LLM 호출 없음.
2. **`~/.claude/skills/graphify/SKILL.md`** — `graphify install`이 user home에 등록하는 Claude Code `/graphify` 진입점. Claude Code subagent들에게 의미 추출을 위임한다.
3. **Claude Code subagent** — LLM 의미 추출. 사용자 Claude Code Subscription 인증으로 모델 호출. 별도 API 키 없음.

### 권장 호출 형태

본 하네스 저장소 (`src/`가 진실 원천):

```
graphify ./src
```

배포된 하네스를 사용하는 다른 프로젝트 (`src/` 없음):

```
graphify ./.claude ./.harness
```

### self-sync 메커니즘

`src/.harness/harness-guide.md`를 수정한 후 `bash scripts/deploy-harness.sh`를 인자 없이 실행하면 `src/` → 루트 self-sync가 수행된다. `.gitignore`는 self-sync 대상에서 제외되며 루트에 직접 변경한다.

### 시범 빌드 절차

Stage 1 시범 빌드는 사용자 Claude Code 세션에서 graphify SKILL을 발동시켜 실행한다.

1. `~/.claude/skills/graphify/SKILL.md` 존재와 graphify CLI 가용성 확인
2. Claude Code Skill 도구로 `/graphify` 호출 (입력: `./src`)
3. `graphify-out/GRAPH_REPORT.md`, `graphify-out/cost.json`만 `git add` 후 커밋

Stage 1 빌드는 1회 수동 실행이다. 이후 재빌드는 동일 절차를 반복한다.

## 제약사항

- graphify CLI는 user-level 설치가 필요하다 (`pip install graphifyy && graphify install`, 또는 uv: `uv venv .venv && uv pip install graphifyy && uv run graphify install`). 본 하네스는 의존성을 재배포하지 않는다.
- LLM 호출은 Claude Code Subscription 한도에 합산된다. 별도 API 키는 불필요하다. 본 시범 빌드에서 측정된 input token은 758,017 (추정)이다.
- 루트 `.gitignore` 정책(`graphify-out/*` + negation + `.venv/`)은 본 저장소에만 적용된다. `deploy-harness.sh`가 `.gitignore`를 동기화하지 않으므로, 배포된 하네스를 사용하는 프로젝트는 graphify 실행 전에 자신의 `.gitignore`에 다음 4줄을 직접 추가한다:
  ```
  .venv/
  graphify-out/*
  !graphify-out/GRAPH_REPORT.md
  !graphify-out/cost.json
  ```
  추가하지 않으면 `graph.json`, `graph.html`, `cache/`, `.venv/` 등이 커밋 대상으로 노출된다.
- `graphify codex install` (Codex 환경 통합), `graphify --update` 증분 빌드, `graphify hook install`, `graphify . --watch`, `--backend gemini` 등 직접 API 백엔드는 Stage 1 범위 밖이다.
- Stage 1은 1회 시범 빌드만 포함한다. 자동 빌드·incremental update·CodexCLI 통합은 Stage 2에서 별도 spec으로 다룬다. Stage 1 평가 결과 5/5 기준 충족으로 Stage 2 spec 작성이 권고된다.
