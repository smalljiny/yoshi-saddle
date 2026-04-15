---
version: 3
---
# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참조하는 프로젝트 지침입니다.

## 프로젝트 개요

이 저장소는 **Claude Code 기반 개발을 위한 하네스**입니다. 새 프로젝트를 시작할 때 `.claude/` 디렉토리를 복사해서 쓰는 **프로젝트 템플릿** 방식으로 사용합니다.

## .claude/ 구조

```
.claude/
├── agents/          전문화된 서브에이전트 (planner, tdd-specialist, code-reviewer 등)
├── commands/        슬래시 명령어 (/dev:topic, /dev:plan, /dev:impl, /dev:review, /dev:verify, /learn)
│   └── dev/         개발 워크플로우 명령어
├── hooks/           훅 설정 (hooks.json)
├── rules/           개발 규칙
│   ├── common/      언어 무관 공통 규칙 (agents, coding-style, git-workflow, testing, security, development-workflow)
│   └── typescript/  TypeScript 특화 규칙 (patterns, testing)
├── scripts/         훅 구현 Node.js 스크립트
│   └── hooks/
├── sessions/        세션 로그 (git-ignored, .jsonl)
├── skills/          워크플로우 스킬
│   ├── tdd-workflow/
│   ├── verification-loop/
│   └── learned/     /learn 명령으로 자동 저장되는 패턴
└── settings.json    권한 + 훅 연결
```

## 개발 워크플로우

```
/dev:topic → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → PR
```

| 명령어 | 역할 |
|--------|------|
| `/dev:topic <name>` | 작업 주제 시작, dev-context.json 기록 |
| `/dev:plan` | planner 에이전트 → spec.md + implementation-plan.md 생성 |
| `/dev:impl` | Task 1개 실행 (tdd-specialist + code-reviewer 자동 호출) |
| `/dev:review` | 최종 전체 리뷰 (code-reviewer + security-reviewer 병렬) |
| `/dev:verify` | 검증 게이트 (build → type-check → lint → test → security) |
| `/learn` | 세션 패턴 추출 → skills/learned/ 저장 |

## 에이전트

| 에이전트 | 모델 | 즉시 활성화 시점 |
|---------|------|----------------|
| planner | opus | 복잡한 피처 요청 시 |
| tdd-specialist | opus | /dev:impl 실행 시 |
| code-reviewer | opus | 코드 작성 직후, /dev:impl Task 완료 후 |
| security-reviewer | sonnet | /dev:review 시, 커밋 전 |
| architect | opus | 아키텍처 결정 시 |
| build-error-resolver | sonnet | 빌드 실패 시 |
| doc-updater | sonnet | 구현 완료 후 |
| refactor-cleaner | sonnet | 유지보수 시 |

## 자동화 훅

| 시점 | 훅 | 동작 |
|------|---|------|
| 세션 시작 | SessionStart | dev-context.json 로드, 이전 컨텍스트 복원 |
| `.ts` 편집 후 | PostToolUse | 타입 체크 + Prettier 포맷 |
| 모든 도구 후 | PostToolUse (async) | 세션 로그 기록 (sessions/<date>.jsonl) |
| `git push` 전 | PreToolUse | 체크리스트 안내 |
| 세션 종료 | Stop | console.log 감사 + 메모리 영속화 |

## 문서 버전 관리

모든 컴포넌트 파일(agents, skills, commands, rules)은 YAML 프론트매터에 정수형 `version` 필드를 가진다.

```yaml
---
version: 1          # 정수, 1에서 시작, 편집할 때마다 1씩 증가
---
```

### 파일 쌍

모든 컴포넌트는 쌍으로 존재한다:

| 파일 | 언어 | 역할 |
|------|------|------|
| `<name>.md` | 영어 | **권위 버전.** Claude Code가 읽고 실행하는 파일. |
| `<name>.ko.md` | 한국어 | **번역 버전.** 사람이 읽는 파일. Claude Code가 실행하지 않음. |

### 편집 순서 (필수)

**항상 `.md`를 먼저 수정한다. `.md`보다 `.ko.md`를 먼저 수정하지 않는다.**

```
올바름:  .md 편집  →  버전 증가  →  (나중에) .ko.md 동기화
잘못됨:  .ko.md 편집  →  그 다음 .md 편집
```

변경이 필요하면 영어로 먼저 작성한다. 한국어 번역은 그 다음이다.

### 버전 규칙

1. **새 파일 생성** — `.md`와 `.ko.md` 모두 `version: 1`에서 시작.
2. **`.md` 편집 시** — `version`을 1 증가. `.ko.md`는 stale 상태가 됨.
3. **`.ko.md` 동기화 시** — 변경 내용을 번역한 후 `.md`와 같은 버전으로 설정.
4. **`.ko.md` 버전을 독립적으로 변경하지 않는다** — 오직 `.md`에 동기화할 때만 변경.

### Stale 감지

`.ko.md`의 `version`이 쌍인 `.md`보다 낮으면 **stale** 상태다.

```
planner.md      version: 3   ← 권위 버전 (마지막 동기화 이후 2번 수정됨)
planner.ko.md   version: 1   ← 2버전 stale
```

stale 쌍 전체 확인:

```bash
python3 .claude/scripts/check-versions.py
```

### Claude Code가 해야 할 것

컴포넌트 `.md` 파일을 수정할 때:
1. 저장 전에 프론트매터의 `version`을 1 증가.
2. `.ko.md`는 건드리지 않는다 — stale 상태로 둔다.
3. 관련 있다면 커밋 메시지나 작업 요약에 stale 파일을 언급한다.

`.ko.md` 동기화를 요청받았을 때:
1. 현재 `.md`와 그 `version`을 읽는다.
2. 변경된 내용을 한국어로 번역한다.
3. `.ko.md`의 `version`을 `.md`와 일치시킨다.
4. `.ko.md` 프론트매터의 다른 필드는 변경하지 않는다.

### 라이프사이클 예시

```
── 최초 생성 ──────────────────────────────────────────
planner.md      version: 1
planner.ko.md   version: 1   (동기화됨)

── 영어 편집 (새 섹션 추가) ───────────────────────────
planner.md      version: 2   ← 증가됨
planner.ko.md   version: 1   ← stale

── 한국어 동기화 ──────────────────────────────────────
planner.md      version: 2
planner.ko.md   version: 2   (다시 동기화됨)
```

## 새 컴포넌트 추가 방법

- **에이전트**: `.claude/agents/<name>.md` — YAML 프론트매터 (version, name, description, tools, model) + 지침
- **스킬**: `.claude/skills/<name>/SKILL.md` — YAML 프론트매터 (version, name, description, origin) + 내용
- **명령어**: `.claude/commands/<name>.md` — YAML 프론트매터 (version, description) + 실행 흐름
- **규칙**: `.claude/rules/common/<name>.md` 또는 `.claude/rules/typescript/<name>.md`

`.md` (영어)와 `.ko.md` (한국어) 모두 `version: 1`로 생성한다.

## references/ 디렉토리

`references/`는 하네스 구축에 참고할 외부 문서와 프로젝트를 수집하는 디렉토리입니다. **읽기 전용**으로 취급합니다. 수정하거나 직접 임포트하지 않습니다.

| 디렉토리 | 설명 |
|---|---|
| `references/everything-claude-code/` | Claude Code 플러그인 레퍼런스. agents, skills, commands, hooks, rules, mcp-configs 구조와 실전 검증된 워크플로우 제공 |
| `references/sample-claude-env/` | 이전 프로젝트의 환경 구성 샘플. 문서 구조(docs, guides, specs, onboarding)와 Codex 리뷰 프롬프트 포함 |

## 언어 규칙

- 문서, 주석, 커밋 메시지는 **한국어**로 작성합니다.
- 코드 식별자(변수명, 함수명, 파일명, 디렉토리명)는 **영어**를 유지합니다.

## Git 규칙

- 브랜치 전략: `main` (배포), `develop` (통합), 기능 브랜치는 `feature/`, 수정은 `fix/`
- 커밋 스타일: conventional commits 사용 (`feat:`, `fix:`, `docs:`, `chore:` 등)
- PR 대상 브랜치: `main`
