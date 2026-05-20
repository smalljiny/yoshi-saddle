---
last_modified: 2026-05-20
author: @mario
status: Active
---

# harness-knowledge-index

> graphify는 본 하네스의 사용자 호출형 도구이며 default-on lookup layer가 아니다. 워크플로우 가이드는 `src/.harness/harness-guide.md`가 단일 진실 원천이고, `src/CLAUDE.md`는 `@import`로 `src/AGENTS.md`는 marker block embed로 같은 본문을 두 세션에 노출한다. 분석 대상 디렉토리는 `dev-context.json`의 `config.graphify.targets`가 데이터 레이어로 소유한다.

## 1. 개요

graphify는 코드·문서 그래프를 추출해 cross-module 질문·dead code 탐색·surprising connection 검사 같은 의미 단위 탐색을 돕는 사용자 호출형 도구다. 모든 세션이 `graphify-out/`을 grep/glob 전에 1차 지도로 읽도록 강제하는 행동 규칙은 본 하네스에 존재하지 않으며 도입하지 않는다. 사용 시점은 grep으로 답하기 어려운 의미 단위 탐색에 한정한다.

권장 호출 형태·출력 위치·gitignore 정책·CLI 사전 조건·갱신·fallback은 `src/.harness/harness-guide.md`의 `## graphify 사용 가이드` 절이 단일 진실 원천이며, 본 문서는 컴포넌트 간 관계와 갱신 트리거만 기술한다. 분석 대상 디렉토리 권장값은 `docs/specs/dev-context-config.md`의 `### config.graphify.targets` 섹션이 권위 문서다.

### 1.1 배경

`docs/specs/harness-knowledge-index.md`(2026-05-10 작성)는 graphify 통합 메커니즘을 두 채널로 정의했다. (1) `src/CLAUDE.md`와 `src/AGENTS.md`에 byte-identical로 동기화된 `## graphify` 섹션을 두어 모든 세션이 graphify-out을 1차 지도로 읽도록 강제하는 본문 메커니즘. (2) `src/.harness/harness-guide.md`의 워크플로우 가이드.

2026-05-18까지의 리팩토링에서 (1) 채널이 의도적으로 제거됐다. 현재 코드 상태는 다음과 같다.

- `src/CLAUDE.md`는 프로젝트 개요·기술 스택·언어 규칙 + 마지막 줄 `@.harness/harness-guide.md` import directive로 구성된 minimal 파일이다.
- `src/AGENTS.md`는 `<!-- harness-guide:begin -->` / `<!-- harness-guide:end -->` 마커 블록 내부에 harness-guide.md 본문을 embed한다 (Codex는 `@import` 미지원).
- `src/.harness/harness-guide.md`가 graphify 워크플로우 가이드의 단일 진실 원천이다.
- "graphify-out을 grep 전에 먼저 읽어라" 류의 행동 강제 규칙은 본 저장소 어디에도 남아 있지 않다.

5-rule 본문 메커니즘은 commit `c7f3971 refactor(harness): trim CLAUDE.md graphify section and rebuild graph`와 `cfadaba refactor(harness): remove duplicated graphify section in CLAUDE/AGENTS` 두 단계에서 의도적으로 제거됐다. 본 reference는 그 제거를 부활시키지 않는다.

## 2. 4가지 사실

1. **graphify는 default-on lookup layer가 아니며 사용자 호출형 도구다.** 모든 세션이 graphify-out을 1차 지도로 읽도록 강제하는 행동 규칙은 본 하네스에 존재하지 않으며 도입하지 않는다. 사용 권장 시점은 cross-module 질문·dead code 탐색·surprising connection 검사처럼 grep으로 답하기 어려운 의미 단위 탐색에 한정한다.
2. **워크플로우 가이드 단일 채널** — `src/.harness/harness-guide.md`가 유일한 권위 문서. `src/CLAUDE.md`는 `@import`로, `src/AGENTS.md`는 marker block embed로 동일 본문을 두 세션 컨텍스트에 노출한다.
3. **`config.graphify.targets`는 데이터 레이어가 소유한다.** 권장값 표는 `docs/specs/dev-context-config.md` 단독 소유이며 본 문서는 cross-reference만 둔다. 배포된 하네스의 권장값은 `/flow-init`이 추천하고 사용자가 `AskUserQuestion`으로 확정한다.
4. **갱신 트리거는 §3 역할 정의 표의 "갱신 주기" 컬럼이 단일 진실 원천이다.** 각 컴포넌트가 언제 재검토되어야 하는지가 표 한 자리에 모인다.

## 3. 역할 정의

| 컴포넌트 | 책임 | 갱신 주기 |
|---------|------|----------|
| `src/.harness/harness-guide.md` `## graphify 사용 가이드` | 워크플로우 가이드 단일 진실 원천 — 호출 패턴·출력 위치·사전 조건·갱신·fallback. 분석 대상 설정 절은 `dev-context-config.md`로 위임 링크 | graphify CLI 호출 패턴이나 출력 구조가 바뀔 때 |
| `src/CLAUDE.md` (`@.harness/harness-guide.md`) | Claude Code 세션에 harness-guide 본문 자동 노출 (import directive 한 줄) | harness-guide 경로가 바뀔 때만 |
| `src/AGENTS.md` marker block (`<!-- harness-guide:begin -->` ↔ `<!-- harness-guide:end -->`) | Codex 세션에 harness-guide 본문 동기 노출 (Codex는 `@import` 미지원이라 embed) | harness-guide 변경 시 `/flow-init` 또는 `deploy-harness.sh` self-sync가 자동 갱신 |
| `dev-context.json` `config.graphify.targets` | 분석 대상 디렉토리 배열 (단일 진실 원천). 미설정·빈 배열은 hard error | 프로젝트 구조 변경 시 사용자 직접, 또는 신규 배포 직후 `/flow-init`이 추천·확정 |
| `docs/specs/dev-context-config.md` `### config.graphify.targets` | targets 권장값 표 + 설정 방법의 권위 문서 | 본 하네스 권장값이 바뀔 때 (예: 디렉토리 구조 변경), 또는 배포된 하네스의 기본 추천이 바뀔 때 |
| `/flow-init` 스킬 Step 6 | 배포 직후 `config.graphify.targets` 미설정 감지 → 추천값 제시 → `AskUserQuestion`으로 확정 → `set-field` 기록 | `/flow-init` 자체 동작 변경 시. 멱등이므로 기존 설정은 보존 |
| `~/.claude/CLAUDE.md` (user global, 본 저장소 밖) | `/graphify` 슬래시 커맨드 트리거 1줄 — 본 하네스 관여·검증 안 함 | 사용자 책임 |
| `docs/specs/harness-knowledge-index.md` (본 문서) | 위 컴포넌트 7종의 관계·동작·제약을 한 문서에서 reference로 기술 + 사용자 호출형 도구 모델을 명시 부정문으로 고정 | graphify 통합 구조 자체가 바뀔 때 (예: lookup-first 모델 재도입 검토, 새 채널 추가) |

## 4. 제약사항

- `config.graphify.targets`이 미설정·빈 배열이면 풀 빌드를 거부하고 사용자에게 명시 설정을 요구한다 (hard error). 본 하네스·배포 하네스·임의 프로젝트 분석 대상이 다르므로 전역 디폴트는 두지 않는다.
- graphify CLI는 user-level 설치 (`pip install graphifyy && graphify install`, 또는 uv 변형)가 사전 조건이다. 본 하네스 저장소는 의존성을 재배포하지 않는다.
- 풀 빌드는 LLM 의미 추출 비용을 동반한다. 비용 추정치는 본 문서에 두지 않고 `graphify-out/cost.json`을 권위 원천으로 한다 — 빌드마다 변동하므로 reference 안정성을 우선한다.
- graphify CLI 버전 라벨은 본문에 명시하지 않는다. 행동만 기술해 업스트림 마이너 업데이트가 본 reference를 outdated로 만들지 않게 한다. 실제 호출 패턴은 `harness-guide.md`의 `### 권장 호출 형태` 절이 단일 진실 원천이다.

## 5. 관련 문서

- `docs/specs/dev-context-config.md` `### config.graphify.targets` — 권장값 표 권위 문서
- `docs/specs/graphify-integration.md` — Stage 1 시범 빌드 통합 문서 (역사 기록 그대로 유지)
- `docs/_local/active/harness-knowledge-index-refresh/spec.md` — 본 reference 의 작성 스펙 (gitignored)
- `src/.claude/skills/flow-init/SKILL.md` — `/flow-init` 스킬 본문 (Step 6에서 `config.graphify.targets` 추천·확정)
- `src/.harness/harness-guide.md` — graphify 워크플로우 가이드 본문
- `src/CLAUDE.md` / `src/AGENTS.md` — harness-guide.md 를 import / embed 하는 진입 파일

## 6. 결정 내역

본 reference 작성 과정의 implementation refinement 기록. §1.2 4가지 사실의 보강이며 미래 contributor가 `dev-context-config.md`·`/flow-init` Step 6·`harness-guide.md` 세 채널을 변경할 때 참조한다.

- **`/flow-init` Step 6 삽입 위치**: 기존 Step 5(`docs.sourceFilter`)와 결과 안내 사이에 신규 Step 6으로 삽입하고 기존 "결과 안내"는 Step 7로 재번호한다. `dev-context.json` `set-field` 흐름이 이미 Step 5에서 시작하므로 응집도가 가장 높다.
- **`AskUserQuestion` 옵션 단순화**: 도구가 자동으로 "Other" 옵션을 추가하므로 추천값 + 건너뛰기 2 옵션만 명시하고 자유 입력은 "Other"로 흡수한다. 다단계 보조 질문·자유 텍스트 follow-up 분기는 불필요하다.
- **입력 유효성**: "Other"로 입력된 디렉토리 경로에 single-quote(`'`)·newline이 포함되면 `set-field --value='<JSON 배열>'`의 single-quoted 셸 인자가 조기 종료되므로 `AskUserQuestion`으로 재입력을 요구한다.
- **보존 분기 contract (4-way)**: `dev-context.js read --field=config.graphify.targets`는 newline-delimited 배열 원소를 출력하고 빈 배열·null·미설정은 빈 stdout을 낸다. 동일 키에 scalar 값(boolean·number·string)도 저장 가능하므로 보존 분기는 (1) 명령 비-0 exit → `[감지 실패]`, (2) stdout 비어 있음 → 추천 진행, (3) 비어 있지 않은 문자열 원소 라인 → `[보존]`, (4) scalar 의심 → `[감지 실패]` + 재설정 프롬프트의 4-way로 처리한다.
- **권장값 단일 진실 원천**: `config.graphify.targets`의 권장값 표는 `dev-context-config.md` `### config.graphify.targets` 섹션이 단일 권위다. `harness-guide.md`·`/flow-init` Step 6·본 reference §3 표는 모두 이 권위 문서를 따라 sync된다. 본 토픽에서 본 하네스 권장값은 `["./src", "./docs/specs", "scripts"]`로 정정됐다.
