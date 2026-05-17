---
version: 11
---

# 하네스 가이드

Claude Code 기반 개발 하네스의 구조·워크플로우·에이전트·훅·Codex 스킬을 한 곳에서 참조하는 문서다.

## .claude/ 구조

```
.claude/
├── agents/          전문 서브에이전트 (planner, tdd-specialist, code-reviewer 등)
├── commands/        슬래시 커맨드 (/dev:init, /dev:spec, /dev:topic, /dev:plan, /dev:impl, /dev:review, /dev:verify, /dev:docs, /dev:pr, /dev:done, /harness:audit, /harness:learn)
│   ├── dev/         개발 워크플로우 커맨드
│   └── harness/     하네스 관리 커맨드
├── hooks/           훅 설정 (hooks.json)
├── rules/           개발 규칙
│   ├── common/      언어 독립 공유 규칙
│   └── typescript/  TypeScript 전용 규칙
├── scripts/         훅 구현 Node.js 스크립트
│   └── hooks/
├── sessions/        세션 로그 (git-ignored, .jsonl 형식)
├── skills/          워크플로우 스킬
│   ├── wf-brainstorming/   /dev:spec 스펙 초안 작성 시 로드
│   ├── wf-tdd/
│   ├── wf-verification/
│   └── learned/     /harness:learn 커맨드가 자동 저장하는 패턴
└── settings.json    권한 + 훅 설정
```

## .harness/ 디렉토리

`.harness/`는 Claude Code와 Codex가 공유하는 인프라를 담는다.

| 경로 | 역할 |
|------|------|
| `.harness/rules/` | **공유 규칙** (Claude + Codex). `coding-style.md`, `git-workflow.md`, `testing.md`, `security.md`, `typescript/`. Claude 전용 규칙은 `.claude/rules/common/`에 유지. |
| `.harness/commit-scopes.md` | **프로젝트별 커밋 스코프 목록**. `plan-review`가 Commit 필드 검증에 사용 (경고 수준). 다른 프로젝트에 하네스를 복사할 때 이 파일을 대상 프로젝트 스코프 표로 교체. |
| `.harness/contracts/` | Claude↔Codex 교환 문서 형식 명세 (spec-review, plan-review, implementation-plan). |
| `.harness/templates/` | 재사용 가능한 템플릿 (예: `/dev:pr`용 `pr-body.md`). |
| `.harness/scripts/` | CLI 스크립트 (`dev-context.js` — 토픽 라이프사이클 상태 관리자). |

## 개발 워크플로우

```
/dev:spec → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

| 커맨드 | 역할 |
|--------|------|
| `/dev:spec <name>` | 스펙 초안 작성 (brainstorming 스킬) → `backlog/`에 저장, Codex 리뷰 루프 실행 |
| `/dev:plan [<name>]` | backlog에서 선택 또는 토픽 지정 → `active/`로 이동, dev-context.json 등록, planner 에이전트 → implementation-plan.md 생성 (`**Commit**` 필드 포함) |
| `/dev:impl` | Story 하나 실행 (tdd-specialist + code-reviewer 자동 호출). 각 Story 완료 후 플랜의 `**Commit**` 필드로 커밋. |
| `/dev:review` | 최종 전체 리뷰 (code-reviewer + security-reviewer 병렬). 리뷰 수정은 별도 커밋. |
| `/dev:verify` | 검증 게이트 (build → type-check → lint → test → security) |
| `/dev:docs` | 구현된 하네스 파일로 참조 문서(`docs/specs/<name>.md`) 생성 + 커밋. `/dev:pr` 전에 실행. |
| `/dev:pr` | 브랜치 Push + GitHub PR 생성 (퍼블리시 전용). PR 제목/본문은 플랜 Commit 필드 + `.harness/templates/pr-body.md`. |
| `/dev:done` | 플래닝 산출물을 `done/`에 아카이브, dev-context.json에서 토픽 제거. `pr:created` 상태 필요. |
| `/dev:init` | CLAUDE.md·AGENTS.md 프로젝트 섹션 초기화·업데이트 |
| `/dev:topic` | 활성 토픽 + backlog 목록 확인, 또는 활성 토픽 전환 (`/dev:topic switch <name>`) |
| `/harness:learn` | 세션 패턴 추출 → skills/learned/에 저장 |

## 에이전트

| 에이전트 | 모델 | 자동 활성화 |
|---------|------|------------|
| planner | opus | 복잡한 기능 요청 시 |
| tdd-specialist | opus | /dev:impl 중 |
| code-reviewer | opus | 코드 작성 직후, /dev:impl Story 완료마다 |
| security-reviewer | sonnet | /dev:review 중, 커밋 전 |
| architect | opus | 아키텍처 결정 시 |
| build-error-resolver | sonnet | 빌드 실패 시 |
| doc-updater | sonnet | 구현 완료 후 |
| refactor-cleaner | sonnet | 코드 유지보수 중 |

## 자동화 훅

| 타이밍 | 훅 | 동작 |
|--------|-----|------|
| 세션 시작 | SessionStart | dev-context.json 로드, 이전 컨텍스트 복원 |
| `.ts` 파일 편집 후 | PostToolUse | 타입 체크 + Prettier 포맷 |
| 모든 도구 사용 후 | PostToolUse (async) | 세션 로그 기록 (sessions/<date>.jsonl) |
| `git push` 전 | PreToolUse | 체크리스트 알림 표시 |
| 세션 종료 | Stop | console.log 감사 + 메모리 지속 |

## 컴포넌트 추가 방법

- **에이전트**: `.claude/agents/<name>.md` — YAML frontmatter (version, name, description, tools, model) + 지침
- **스킬**: `.claude/skills/<name>/SKILL.md` — YAML frontmatter (version, name, description, origin) + 내용
- **커맨드**: `.claude/commands/<name>.md` — YAML frontmatter (version, description) + 실행 흐름
- **공유 규칙**: `.harness/rules/<name>.md` 또는 `.harness/rules/typescript/<name>.md` — YAML frontmatter (version) + 규칙 (Claude + Codex 공유; coding-style, git-workflow, testing, security, typescript)
- **Claude 규칙**: `.claude/rules/common/<name>.md` — YAML frontmatter (version) + 규칙 (Claude Code 운영 규칙: agents, performance, development-workflow, component-boundaries. Codex가 맥락 파악 목적으로 일부 참조 가능)
- **프롬프트 작성 규칙**: 모든 컴포넌트 작성·수정 시 `.claude/rules/common/prompt-authoring.md`의 7가지 규칙을 따른다 (Opus 4.7 리터럴 해석 대응).

항상 frontmatter에서 `version: 1`로 시작한다.

## 문서 버전 관리

모든 컴포넌트 파일(에이전트, 스킬, 커맨드, 규칙)은 YAML frontmatter에 정수형 `version` 필드를 포함한다.

```yaml
---
version: 1          # 정수, 1에서 시작, 각 편집마다 1씩 증가
---
```

컴포넌트 파일을 수정할 때마다 저장 전에 `version`을 1 증가시킨다.

## 질문 처리 규칙

사용자에게 질문할 때 — 명확화, 승인, 탐색 목적에 관계없이 — 항상 `AskUserQuestion` 도구를 사용한다. 첫 번째 옵션에 반드시 권장 항목을 `(Recommended)` 레이블로 포함한다.

- 확인, 접근 방식 선택, 명확화 등 모든 질문 유형에 적용
- 선택이 포함된 경우 일반 텍스트로 질문하지 않음
- 자연스러운 답변이 하나뿐인 경우에도 권장 옵션으로 제시하고 간략한 대안을 함께 제공

## Codex 스킬

Codex 스킬은 `.codex/skills/`에 위치한다. 각 스킬은 다음을 포함한다:
- `SKILL.md` — 상세 지침 및 워크플로우
- `references/` — 지원 템플릿 및 입력 정의

ECC 스타일 하네스와 달리, 스킬은 **명시적으로 참조**해야 한다(`.agents/skills/`에서 자동 로드되지 않음). Codex에 사용할 스킬 이름을 지정하여 호출한다.

### 사용 가능한 스킬

| 스킬 | 경로 | 사용 시점 |
|------|------|----------|
| `spec-review` | `.codex/skills/spec-review/` | 플래닝 시작 전 스펙 문서 리뷰 |
| `plan-review` | `.codex/skills/plan-review/` | 구현 시작 전 구현 계획 리뷰 |

### 스킬 호출 방법

경로를 명시해서 호출 (권장):

```
codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"
codex "plan-review 스킬로 docs/_local/active/<topic>/implementation-plan.md를 리뷰해줘"
```

경로 없이 호출 — Codex가 `dev-context.json`에서 경로를 자동 해결:

```
codex "spec-review 스킬을 실행해줘"
codex "plan-review 스킬을 실행해줘"
```

명시적 경로가 항상 우선된다.

### spec-review 스킬

8개 품질 게이트 기준으로 스펙 문서를 리뷰하고 리뷰 보고서를 생성한다.

**실행 시점**: `/dev:spec`이 스펙 초안을 생성한 후, `/dev:plan` 전.

**검토 항목**:
1. 목표 명확성 — 목표가 구체적이고 검증 가능한지
2. Non-goals 명시 — 범위 경계가 명확히 정의됐는지
3. 아키텍처 충분성 — 플래닝에 충분한 아키텍처가 포함됐는지
4. 의사결정 근거 — 설계 결정에 근거가 있는지
5. Open Questions — 미결 결정이 문서화됐는지
6. 내부 일관성 — 섹션 간 모순이 없는지
7. 구현 가능성 — 구현 시작에 충분히 구체적인지
8. 범위 적정성 — 너무 크거나 작지 않은지

**출력**: `docs/_local/backlog/<topic>/spec-review-<yymmddhhmmss>.md`

**결정**: `READY` | `READY WITH NOTE` | `NOT READY`

### plan-review 스킬

8개 품질 게이트 기준으로 구현 계획을 리뷰하고 리뷰 보고서를 생성한다.

**실행 시점**: `/dev:plan`이 `implementation-plan.md`를 생성한 후, `/dev:impl` 전.

**검토 항목**:
1. 목표 커버리지 — 모든 스펙 목표가 최소 하나의 Story로 커버되는지
2. Non-goals 준수 — 플랜이 스펙 Non-goals를 구현하지 않는지
3. Story 독립성 — 각 Story가 독립적으로 실행 가능한지
4. 완료 기준 명확성 — 완료 기준이 객관적으로 검증 가능한지
5. Story 타입 정확성 — Story 타입이 작업 항목과 일치하는지
6. Story 규모 적정성 — 각 Story가 단일 커밋 단위에 맞는지
7. 구현 순서 타당성 — Story 순서가 의존 관계를 따르는지
8. 범위 초과 없음 — 스펙 범위를 벗어난 Story가 없는지

**출력**: `docs/_local/active/<topic>/plan-review-<yymmddhhmmss>.md`

**결정**: `READY` | `READY WITH NOTE` | `NOT READY`

## dev-context.json 설정 키

| 키 | 기본값 | 동작 |
|----|--------|------|
| `config.spec.auto_review` | `false` | `/dev:spec` Step 4에서 `adapter-codex-review` 스킬을 자동 실행 (최대 3회 루프, READY/READY WITH NOTE 시 종료). `false` 또는 빈 출력이면 기존 수동 안내를 출력하고 정지. |
| `config.plan.auto_review` | `false` | `/dev:plan` Step 7에서 `adapter-codex-review` 스킬을 자동 실행 (최대 3회 루프, READY/READY WITH NOTE 시 종료). `false` 또는 빈 출력이면 기존 수동 안내를 출력하고 정지. |
| `config.graphify.targets` | `[]` (빈 배열) | graphify 분석 대상 디렉토리 배열. 미설정·빈 배열이면 풀 빌드를 거부하고 사용자에게 명시 설정을 요구(hard error). 본 하네스 권장값 `["./src", "./docs"]`. |

**관례**: 빈 출력(`""`)은 `false`로 처리한다. `true` 문자열과 정확히 일치할 때만 자동 루프가 실행된다.

```bash
# 조회
node .harness/scripts/dev-context.js read --field=config.spec.auto_review
node .harness/scripts/dev-context.js read --field=config.plan.auto_review
node .harness/scripts/dev-context.js read --field=config.graphify.targets

# 활성화 (로컬 dev-context.json)
node .harness/scripts/dev-context.js set-field --field=config.spec.auto_review --value=true
node .harness/scripts/dev-context.js set-field --field=config.plan.auto_review --value=true
node .harness/scripts/dev-context.js set-field --field=config.graphify.targets --value='["./src","./docs"]'
```

## Codex CLI와의 차이점

| 기능 | Claude Code | Codex CLI |
|------|------------|-----------|
| 컨텍스트 파일 | `CLAUDE.md` | `AGENTS.md` |
| 스킬 | `.claude/skills/` (관례 기반, 자동 로드) | `.codex/skills/` (AGENTS.md를 통해 명시적 참조) |
| 훅 | 지원됨 | 미지원 |
| 커맨드 | `/slash` 커맨드 | 지침 기반 |

## references/ 디렉토리

`references/`는 하네스 구축 시 참고할 외부 문서와 프로젝트를 담는다. **읽기 전용**으로 취급 — 수정하거나 직접 임포트하지 않는다.

| 디렉토리 | 설명 |
|---------|------|
| `references/everything-claude-code/` | Claude Code 플러그인 레퍼런스. 에이전트, 스킬, 커맨드, 훅, 규칙, mcp-configs 구조와 검증된 워크플로우 제공. |
| `references/sample-claude-env/` | 이전 프로젝트 샘플. 문서 구조(docs, guides, specs, onboarding)와 Codex 리뷰 프롬프트 포함. |

## graphify 사용 가이드

graphify는 코드베이스·문서·연구 자료를 지식 그래프로 변환해 god nodes·surprising connections·community 구조를 시각화하는 Stage 1 평가 도구다. 본 하네스에서는 시범 빌드(Stage 1)로 채택 여부를 판단하며, 통과 시 Stage 2 spec을 별도로 작성한다.

### 분석 대상 설정 (config.graphify.targets)

graphify 빌드의 분석 대상은 `dev-context.json`의 `config.graphify.targets` 배열에 정의한다. 미설정·빈 배열이면 풀 빌드를 거부하고 사용자에게 명시 설정을 요구한다 (hard error). 본 하네스 권장값은 `["./src", "./docs"]`, 배포된 하네스 권장값은 `["./.claude", "./.harness", "./docs"]`.

```bash
# 조회
node .harness/scripts/dev-context.js read --field=config.graphify.targets

# 설정 (본 하네스 예시)
node .harness/scripts/dev-context.js set-field --field=config.graphify.targets --value='["./src","./docs"]'
```

### 권장 호출 형태

> **graphify v0.7.11 CLI 변경 주의**: 본 절의 `uv run graphify <path>` 직접 호출 형태는 v0.7.11에서 `error: unknown command '<path>'`로 실패한다 (`docs/_local/active/harness-knowledge-index/validation-notes.md` T5.2 참조). 풀 빌드는 `/graphify <path>` slash command (Claude Code/Codex 등 AI agent 환경) 또는 `graphify extract <path> --backend <claude|gemini|kimi|openai>` 헤드리스 서브커맨드로만 동작한다. 본 가이드 코드 블록은 후속 토픽에서 v1 CLI 사양에 맞춰 정정한다.

`config.graphify.targets` 배열의 길이에 따라 호출 형태가 달라진다.

**targets 1개**: 단일 디렉토리를 직접 빌드한다.

```
uv run graphify ./src
```

**targets 2개 이상 (본 하네스 — `["./src", "./docs"]`)**: 디렉토리별로 풀 빌드한 뒤 `merge-graphs`로 결합한다. 다중 인자 단일 호출(`graphify ./src ./docs`)은 graphify v1에서 안정 동작이 보장되지 않으므로 분리 빌드 후 머지 패턴을 권장한다.

```
uv run graphify ./src --out graphify-out/g-src.json
uv run graphify ./docs --out graphify-out/g-docs.json
uv run graphify merge-graphs graphify-out/g-src.json graphify-out/g-docs.json --out graphify-out/graph.json
```

**배포된 하네스 (`["./.claude", "./.harness", "./docs"]`)**: 동일하게 디렉토리별 빌드 + merge-graphs 패턴을 적용한다.

```
uv run graphify ./.claude --out graphify-out/g-claude.json
uv run graphify ./.harness --out graphify-out/g-harness.json
uv run graphify ./docs --out graphify-out/g-docs.json
uv run graphify merge-graphs graphify-out/g-claude.json graphify-out/g-harness.json graphify-out/g-docs.json --out graphify-out/graph.json
```

배포 프로젝트는 `src/` 구조가 없으므로 분석 대상 디렉토리를 `targets`에 직접 명시한다. 단일 호출 동작이 graphify v2에서 안정화되면 본 가이드를 단순화할 수 있다.

### 출력 위치

실행 디렉토리 기준 `graphify-out/`에 산출물이 생성된다:

- `GRAPH_REPORT.md` — 사람이 읽는 요약 (god nodes, surprising connections, community 구조)
- `cost.json` — 빌드 사용량 (input/output token, 비용 추이)
- `graph.json`, `graph.html` — 시각화·기계 처리용 그래프 데이터
- `manifest.json` — incremental update(`graphify update <path>`) 기준이 되는 파일 매니페스트
- `cache/`, `.graphify_*` — 내부 캐시·메타데이터

### gitignore 정책 요약

루트 `.gitignore`에 다음 정책이 적용돼 있다:

```
graphify-out/*
!graphify-out/GRAPH_REPORT.md
!graphify-out/cost.json
```

`graphify-out/` 디렉토리 내부는 모두 ignore되며, `GRAPH_REPORT.md`(사람용 요약)와 `cost.json`(사용량 추이)만 tracked로 노출된다. graph.json·graph.html·cache·메타파일은 PR diff에 포함되지 않는다.

### user-level 사전 조건

graphify CLI는 사용자 환경에 1회 설치한다:

```
pip install graphifyy
graphify install
```

uv 환경(권장 — 시스템 Python 오염 방지)에서는 동등한 명령으로 프로젝트 한정 가상 환경에 설치한다:

```
uv venv .venv
uv pip install graphifyy
uv run graphify install
```

이후 호출은 `uv run graphify ...` 형태를 사용한다 (또는 `.venv` 활성화). Claude Code subagent 경유로 동작하므로 별도 API 키는 불필요하다. 설치는 사용자 책임이며 본 하네스 저장소에는 의존성을 추가하지 않는다.

**배포된 하네스 프로젝트의 추가 사전 조건**: 위 gitignore 정책(`graphify-out/*` + `!GRAPH_REPORT.md` + `!cost.json`)과 `.venv/` ignore는 **본 하네스 저장소의 루트 `.gitignore`에만 적용**된다. `deploy-harness.sh`는 `.gitignore`를 동기화 대상에서 제외하므로, 배포된 하네스를 사용하는 프로젝트는 graphify를 실행하기 전에 자신의 `.gitignore`에 다음 5줄을 직접 추가한다:

```
.venv/
graphify-out/*
!graphify-out/GRAPH_REPORT.md
!graphify-out/cost.json
```

추가하지 않으면 `graph.json`, `graph.html`, `cache/`, `manifest.json`, `.venv/` 같은 산출물이 커밋 대상으로 노출된다.

### 갱신 (uv run graphify update)

코드·문서 변경 후 `graphify-out/`을 갱신할 때는 다음 명령을 사용한다. AST-only 분석이므로 LLM 호출이 없고 비용이 발생하지 않는다.

```
uv run graphify update "<path>"
```

`<path>`는 변경된 파일 또는 디렉토리. 공백이나 특수 문자가 포함된 경로는 따옴표로 감싼다. v1에서 새 파일 추가 시 manifest 갱신 동작은 미확정(Open Question 2)이므로, 신뢰할 수 있는 갱신이 필요하면 풀 빌드(`### 권장 호출 형태` 절차 재실행)로 폴백한다.

### graphify CLI 미설치·호출 실패 시 fallback

`uv run graphify ...` 호출이 실패하거나 graphify CLI가 설치되지 않은 환경에서는 grep/glob/Read 도구로 회귀해 작업을 진행한다. CLAUDE.md / AGENTS.md `## graphify` 5번째 규칙과 일관된 동작이다. CLI 설치는 위 `### user-level 사전 조건` 섹션의 `pip install graphifyy` (또는 `uv pip install graphifyy`) 절차를 참고한다. 풀 빌드는 사용자에게 명시 안내한 뒤 실행한다.

### Stage 2 진행 조건

spec §4의 5개 검증 기준(시범 빌드 성공·god nodes 4개 이상 + 기대-외 1개 이상·surprising connections 1개 이상 + 미인지-관계 1개 이상·빌드 시간 < 10분·input token < 1M) 중 4개 이상을 충족하면 Stage 2 spec 작성을 권고한다. 기준 미달 시 평가 보고서에 보류 사유를 기록한다.
