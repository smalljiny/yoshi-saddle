---
last_modified: 2026-05-10
author: @mario
status: Active
---

# harness-knowledge-index (graphify Stage 2)

> graphify를 본 하네스의 1차 코드·문서 지도로 정착시키는 메커니즘. `dev-context.json`의 `config.graphify.targets` 배열로 분석 대상을 프로젝트별로 설정하고, `CLAUDE.md`·`AGENTS.md`에 5-rule 섹션으로 graphify-out을 grep/glob 전에 먼저 읽도록 지시한다. `harness-guide.md`의 워크플로우 가이드는 targets-driven 빌드 + `merge-graphs` 패턴 + `update <path>` 갱신 + CLI 미설치 fallback을 담는다.

## 개요

graphify 시범 빌드(Stage 1, `docs/specs/graphify-integration.md` 참조)가 LLM 의미 추출의 가치를 입증한 뒤, Stage 2는 graphify를 **세션 단위로 사용되는 표준 도구**로 정착시킨다. Claude/Codex 새 세션은 매번 grep/glob로 프로젝트 구조를 재발견하지 않고 `graphify-out/GRAPH_REPORT.md`를 1차 지도로 사용하며, cross-module 질문은 `graphify query`/`path`/`explain`을 grep보다 우선해 응답한다.

분석 대상은 `dev-context.json`의 `config.graphify.targets` 배열로 프로젝트별 차이를 흡수한다. 본 하네스 권장값은 `["./src", "./docs"]`, 배포된 하네스는 `["./.claude", "./.harness", "./docs"]`. 미설정·빈 배열은 hard error로 처리해 사용자에게 명시 설정을 요구한다.

## 구조 / 스키마

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| `config.graphify.targets` | `docs/_local/dev-context.json` (gitignored, `node .harness/scripts/dev-context.js`로 접근) | 분석 디렉토리 배열. 미설정·빈 배열은 hard error |
| `## graphify` 섹션 (CLAUDE.md) | `src/CLAUDE.md` (deploy-harness.sh로 루트 동기화) | Claude 세션용 5-rule 동작 규칙 |
| `## graphify` 섹션 (AGENTS.md) | `src/AGENTS.md` `<!-- harness-guide:end -->` 마커 직후 | Codex 세션용 동일 5-rule. embedded harness-guide 블록과 분리 |
| `## graphify 사용 가이드` | `src/.harness/harness-guide.md` | 워크플로우 가이드: 분석 대상 설정 → 권장 호출 형태 → 출력 위치 → gitignore 정책 → user-level 사전 조건 → 갱신 → fallback → Stage 2 진행 조건 |
| graphify CLI | 사용자 환경 (uv venv 권장 — `.venv/bin/graphify`) | 풀 빌드·query·path·explain·merge-graphs·update 제공 |

`config.graphify.targets`은 `dev-context.json`에 JSON 배열 값으로 저장된다. `dev-context.js read --field=config.graphify.targets`는 배열 원소를 한 줄당 하나씩 출력한다. `set-field --value='["./src","./docs"]'` 형태로 설정한다.

## 동작

### 5-rule 본문 (CLAUDE.md / AGENTS.md 공통)

`src/CLAUDE.md`와 `src/AGENTS.md`의 `## graphify` 섹션은 byte-identical로 동기화돼 있다. 다음 5개 규칙을 정의한다.

1. graphify-out/이 존재하면 그 graph가 코드·문서의 1차 지도. `GRAPH_REPORT.md`를 grep/glob·source 파일 읽기·코드베이스 질문 답변 전에 먼저 읽는다.
2. cross-module 질문은 `uv run graphify query "<질문>"`, `path "<A>" "<B>"`, `explain "<개념>"`을 grep보다 우선한다.
3. 분석 대상 디렉토리는 `node .harness/scripts/dev-context.js read --field=config.graphify.targets` (배열) 에 정의돼 있다.
4. 코드 변경 후 `uv run graphify update <path>` 로 graphify-out/을 갱신한다 (AST-only, no API cost).
5. graphify-out/이 없거나 graphify CLI 호출이 실패하면 grep/glob로 회귀하고, 풀 빌드는 사용자에게 안내한다.

### 권장 호출 형태 (targets-driven)

`config.graphify.targets` 배열의 길이에 따라 호출 패턴이 달라진다.

- **targets 1개**: 단일 디렉토리를 직접 빌드. (graphify v0.7.11 CLI 사양: 직접 path 호출은 지원되지 않으며, `/graphify <path>` slash command 또는 `graphify extract <path> --backend <name>` 헤드리스 서브커맨드로만 동작. `harness-guide.md` `### 권장 호출 형태` 코드 블록은 후속 토픽에서 v0.7.11 사양에 맞춰 정정 예정.)
- **targets 2개 이상**: 디렉토리별로 풀 빌드한 뒤 `uv run graphify merge-graphs <g1> <g2> ... --out graphify-out/graph.json`으로 결합. 다중 인자 단일 호출(`graphify ./src ./docs`)은 v0.7.11에서 미지원 (Story 5 검증).

### 갱신 (graphify update)

코드·문서 변경 후 `graphify-out/`을 갱신할 때는 `uv run graphify update "<path>"`를 사용한다. AST-only 분석이므로 LLM 호출이 없고 비용이 발생하지 않는다. 새 파일 추가 시 `manifest.json` 갱신 동작은 v1에서 미확정이며, 신뢰할 수 있는 갱신이 필요하면 풀 빌드 재실행으로 폴백한다.

### CLI 미설치·호출 실패 fallback

`uv run graphify ...` 호출이 실패하거나 graphify CLI가 설치되지 않은 환경에서는 grep/glob/Read 도구로 회귀해 작업을 진행한다. CLI 설치는 `pip install graphifyy` 또는 `uv pip install graphifyy` (그리고 `graphify install`) 절차를 사용자가 1회 실행한다. 풀 빌드는 사용자에게 명시 안내 후 실행한다.

## 제약사항

- `config.graphify.targets`이 미설정·빈 배열이면 풀 빌드를 거부하고 사용자에게 명시 설정을 요구한다 (hard error). 본 하네스·배포 하네스·임의 프로젝트 분석 대상이 다르므로 전역 디폴트는 두지 않는다.
- graphify CLI는 user-level 설치 (`pip install graphifyy && graphify install`, 또는 uv 변형)가 사전 조건이다. 본 하네스 저장소는 의존성을 재배포하지 않는다.
- 풀 빌드는 LLM 의미 추출 비용을 동반한다. 본 하네스 `./src` 빌드는 약 758K input + 190K output 토큰. `./docs` 추가 시 코퍼스 규모(약 3.4배)에 비례한 추가 비용 발생.
- `harness-guide.md`의 `### 권장 호출 형태` 코드 블록은 graphify v0.7.11 CLI 사양과 어긋나는 직접 path 호출 형태를 사용한다. 본 토픽 §"### 권장 호출 형태" caveat가 명시 경고를 제공하며, 후속 토픽에서 코드 블록 자체를 v0.7.11 사양(slash command 또는 extract 서브커맨드)에 맞춰 정정한다.
- AGENTS.md의 `## graphify` 섹션은 `<!-- harness-guide:end -->` 마커 밖에 위치한다. 동일 파일에 embedded `## graphify 사용 가이드` 블록이 마커 안에 별도로 존재하며, 두 섹션은 의도적 분리다 (5-rule = 동작 규칙, harness-guide = 워크플로우 가이드).

## 관련 문서

- `docs/specs/graphify-integration.md` — Stage 1 시범 빌드 통합 문서 (본 Stage 2의 선행 문서)
- `docs/_local/active/harness-knowledge-index/spec.md` — 본 토픽 spec (gitignored)
- `docs/_local/active/harness-knowledge-index/validation-notes.md` — Story 5 다중 타겟 빌드 검증 결과 (gitignored)
- `src/.harness/harness-guide.md` — graphify 사용 가이드 본문
