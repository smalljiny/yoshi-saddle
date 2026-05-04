---
version: 4
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
| `/dev:impl` | Task 하나 실행 (tdd-specialist + code-reviewer 자동 호출). 각 Task 완료 후 플랜의 `**Commit**` 필드로 커밋. |
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
| code-reviewer | opus | 코드 작성 직후, /dev:impl Task 완료마다 |
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
1. 목표 커버리지 — 모든 스펙 목표가 최소 하나의 Task로 커버되는지
2. Non-goals 준수 — 플랜이 스펙 Non-goals를 구현하지 않는지
3. Task 독립성 — 각 Task가 독립적으로 실행 가능한지
4. 완료 기준 명확성 — 완료 기준이 객관적으로 검증 가능한지
5. Task 타입 정확성 — Task 타입이 작업 항목과 일치하는지
6. Task 규모 적정성 — 각 Task가 단일 커밋 단위에 맞는지
7. 구현 순서 타당성 — Task 순서가 의존 관계를 따르는지
8. 범위 초과 없음 — 스펙 범위를 벗어난 Task가 없는지

**출력**: `docs/_local/active/<topic>/plan-review-<yymmddhhmmss>.md`

**결정**: `READY` | `READY WITH NOTE` | `NOT READY`

## dev-context.json 설정 키

| 키 | 기본값 | 동작 |
|----|--------|------|
| `config.spec.auto_review` | `false` | `/dev:spec` Step 4에서 `wf-codex-review` 스킬을 자동 실행 (최대 3회 루프, READY/READY WITH NOTE 시 종료). `false` 또는 빈 출력이면 기존 수동 안내를 출력하고 정지. |
| `config.plan.auto_review` | `false` | `/dev:plan` Step 7에서 `wf-codex-review` 스킬을 자동 실행 (최대 3회 루프, READY/READY WITH NOTE 시 종료). `false` 또는 빈 출력이면 기존 수동 안내를 출력하고 정지. |

**관례**: 빈 출력(`""`)은 `false`로 처리한다. `true` 문자열과 정확히 일치할 때만 자동 루프가 실행된다.

```bash
# 조회
node .harness/scripts/dev-context.js read --field=config.spec.auto_review
node .harness/scripts/dev-context.js read --field=config.plan.auto_review

# 활성화 (로컬 dev-context.json)
node .harness/scripts/dev-context.js set-field --field=config.spec.auto_review --value=true
node .harness/scripts/dev-context.js set-field --field=config.plan.auto_review --value=true
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
