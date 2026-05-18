# Harness src/ 레이아웃

> `src/`는 배포 가능한 하네스 컴포넌트의 단일 진실 원천이며, `scripts/deploy-harness.sh`가 self-sync(루트 반영)와 외부 프로젝트 배포의 두 모드로 실행된다.

## 개요

하네스 저장소는 `src/` 디렉토리를 배포 단위의 기준으로 삼는다. `.claude/`, `.codex/`, `.harness/`, `CLAUDE.md`, `AGENTS.md` 다섯 항목이 `src/`에 원본으로 존재하고, 루트에 있는 동일한 항목은 self-sync를 통해 `src/`와 일치 상태를 유지한다. `scripts/deploy-harness.sh`는 이 두 역할(자기 동기화, 외부 배포)을 단일 스크립트로 처리한다.

`src/.claude/`는 5-tier 스킬 체계(`flow-*`, `wf-*`, `adapter-*`, `stack-*`, `meta-*`)를 사용한다. `flow-*` 스킬은 `user-invocable: true` frontmatter로 슬래시 커맨드처럼 노출된다. 이전의 `src/.claude/commands/dev/` 트리는 삭제됐고, 모든 개발 워크플로우는 `src/.claude/skills/flow-*/SKILL.md`로 이관됐다. `commands/`는 `codex/`·`harness/`·`add-language-rules.md`만 잔존한다.

`CLAUDE.md`는 Claude Code의 컨텍스트 파일로, 프로젝트 섹션과 `@.harness/harness-guide.md` import 라인으로 구성된다. `AGENTS.md`는 Codex CLI의 컨텍스트 파일로, Codex CLI가 `@import`를 지원하지 않기 때문에 harness-guide 내용을 begin/end 마커 블록에 직접 포함한다. `/flow-init` 커맨드가 두 파일의 프로젝트 섹션을 초기화하거나 업데이트한다.

## 구조 / 스키마

### 저장소 디렉토리 구조

```
harness/
├── src/                        배포 가능 컴포넌트 소스 (단일 진실 원천)
│   ├── .claude/
│   ├── .codex/
│   ├── .harness/
│   │   └── harness-guide.md    하네스 참조 문서
│   ├── CLAUDE.md               최소화된 템플릿
│   └── AGENTS.md               최소화된 템플릿
├── .claude/                    활성 (src/에서 self-sync로 유지)
├── .codex/                     활성
├── .harness/                   활성
│   └── harness-guide.md        src/.harness/harness-guide.md와 항상 동일
├── CLAUDE.md                   활성
├── AGENTS.md                   활성
└── scripts/
    └── deploy-harness.sh       self-sync + 외부 배포 실행 진입점
```

`src/`에서 제외하는 런타임 로컬 파일: `.claude/sessions/`, `.claude/settings.local.json`, `.claude/checkpoints.log`, `docs/_local/`, `node_modules/`, `references/`.

### CLAUDE.md 구조

```markdown
---
version: N
---

# CLAUDE.md

## 프로젝트 개요
[설명]

## 기술 스택
[기술 목록]

## 언어 규칙
[언어 정책]

@.harness/harness-guide.md
```

경계: `@.harness/harness-guide.md` 라인 이전이 프로젝트 섹션이다. import 라인과 그 이후 내용은 업데이트 시 보존된다.

### AGENTS.md 구조

```markdown
# AGENTS.md

## 프로젝트 개요
[설명]

## 기술 스택
[기술 목록]

## 언어 규칙
[언어 정책]

<!-- harness-guide:begin -->
[harness-guide.md 본문 내용 (frontmatter 제외)]
<!-- harness-guide:end -->
```

경계: `<!-- harness-guide:begin -->` 라인 이전이 프로젝트 섹션이다. begin/end 마커 사이는 현재 `.harness/harness-guide.md` 본문을 직접 포함하며, end 마커 이후 내용은 업데이트 시 보존된다. AGENTS.md에는 YAML frontmatter를 포함하지 않는다.

### harness-guide.md 섹션 구성

`src/.harness/harness-guide.md`가 단일 진실 원천이다. YAML frontmatter `version: N` 포함. 섹션 구성:

| 섹션 | 내용 |
|------|------|
| `.claude/ 구조` | 에이전트, 커맨드, 훅, 규칙, 스크립트, 세션, 스킬, settings.json |
| `.harness/ 디렉토리` | 공유 규칙, commit-scopes.md, contracts/, templates/, scripts/ |
| `개발 워크플로우` | 스킬 목록과 역할 (`/flow-*` 12개 스킬 및 `/flow-init` 포함) |
| `에이전트` | 에이전트별 모델과 자동 활성화 시점 |
| `자동화 훅` | SessionStart, PostToolUse, PreToolUse, Stop |
| `컴포넌트 추가 방법` | 에이전트/스킬/공유 규칙/Claude 규칙 생성 위치 (커맨드는 `commands/dev/` 삭제 후 `skills/flow-*/`로 이관됨) |
| `문서 버전 관리` | version 필드 규칙 |
| `질문 처리 규칙` | AskUserQuestion 사용 의무 |
| `Codex 스킬` | spec-review, plan-review 스킬 사용법 |
| `Codex CLI와의 차이점` | 컨텍스트 파일, 스킬, 훅, 커맨드 비교 |
| `references/ 디렉토리` | 읽기 전용 외부 참고 문서 |

## 동작

### deploy-harness.sh 모드

| 실행 방법 | 모드 | 동작 |
|-----------|------|------|
| `./scripts/deploy-harness.sh` | self-sync | `src/` → 루트. 모든 항목을 동기화. 매니페스트 기반 selective cleanup 으로 이전 deploy 가 설치한 파일 중 현재 src/ 에 없는 것만 백업 후 삭제(stale 잔존 방지). 백업 생성 없음. |
| `./scripts/deploy-harness.sh /path/to/project` | external | `src/` → 외부 프로젝트. 파일별 보존 정책 적용. 사용자가 추가한 `.claude/`/`.codex/`/`.harness/` 파일은 매니페스트에 없으므로 보존됨. 백업(`TARGET_DIR/.harness-backups/`) 생성. |

selective cleanup 메커니즘과 매니페스트 스키마 상세는 [`deploy-harness-manifest.md`](deploy-harness-manifest.md).

### 파일별 보존 정책

| 항목 | self-sync | external |
|------|-----------|----------|
| `.claude/`, `.codex/`, `.harness/` (commit-scopes.md 제외) | 항상 덮어쓰기 | 항상 덮어쓰기 |
| `.harness/commit-scopes.md` | 항상 덮어쓰기 | 타깃에 있으면 skip |
| `CLAUDE.md`, `AGENTS.md` | 항상 덮어쓰기 | 타깃에 있으면 skip |

external 모드에서 `.harness/commit-scopes.md`를 skip할 때는 `--exclude='commit-scopes.md'` 옵션으로 나머지 `.harness/`를 그대로 복사한다.

external 모드에서는 `--skip-gitignore`를 지정하지 않는 한 타깃 `.gitignore`에 harness 로컬 파일 ignore 블록(`# BEGIN harness local ignores`)을 추가한다. 이미 마커가 있으면 건너뛴다. 블록은 세션 로그·체크포인트·로컬 설정·백업 디렉토리 외에 deploy 매니페스트(`.harness/.deploy-manifest.json`)도 포함한다 — 매니페스트는 per-machine deploy 상태이므로 commit 대상이 아니다.

### /flow-init 실행 흐름

**Step 1 — 쓰기 대상 결정**

```bash
[ -d "$(git rev-parse --show-toplevel)/src" ] && echo "harness-repo" || echo "target-project"
```

- `src/` 존재: `src/CLAUDE.md`, `src/AGENTS.md`에 쓴다. 완료 후 `./scripts/deploy-harness.sh` 실행 안내를 출력한다.
- `src/` 부재: 루트 `CLAUDE.md`, `AGENTS.md`에 직접 쓴다.

**Step 2 — 모드 분기 (CLAUDE.md, AGENTS.md 각각 독립 판정)**

CLAUDE.md (4-state):

| 상태 | 모드 |
|------|------|
| 대상 파일 없음 | 신규 생성 (`<!-- harness-rules:begin/end -->` 마커 포함) |
| `<!-- harness-rules:begin -->` 마커 존재 | 업데이트 (마커 사이만 재생성, 마커 외부 손대지 않음) |
| `<!-- harness-rules:begin -->` 마커 없음 + `@.harness/harness-guide.md` 라인 있음 | 일회 마이그레이션 (harness-guide 직후 연속된 `@.harness/rules/<rel-path>` 라인만 marker로 감싸 in-place 변환; 비-인접 위치 라인은 사용자 콘텐츠로 간주, 손대지 않음) |
| `@.harness/harness-guide.md` 라인 없음 | 경고 출력 + `AskUserQuestion` (백업 후 재생성 or 중단) |

AGENTS.md:
- 파일 없음 → 신규 생성
- `<!-- harness-guide:begin -->` 마커 존재 → 업데이트
- 마커 없음 → 경고 출력 + `AskUserQuestion` (백업 후 재생성 or 중단)

각 파일의 모드는 독립적으로 결정되며, 한 파일이 "중단"을 선택해도 다른 파일은 계속 진행할 수 있다.

**Step 3 — 프로젝트 정보 수집**

`AskUserQuestion`으로 4개 항목을 순서대로 수집한다. 각 질문의 첫 번째 옵션은 `(Recommended)` 레이블:

1. 프로젝트명 — 권장: 현재 디렉토리명
2. 한 줄 설명 — 권장: `[프로젝트명] 백엔드 서비스` 형태 예시
3. 기술 스택 — 권장: `TypeScript, Node.js, PostgreSQL` 형태 예시
4. 언어 규칙 — 권장: 문서·주석·커밋 메시지 한국어 / 코드 식별자 영어 / 컴포넌트 파일 영어

**Step 4 — CLAUDE.md 작성 (marker-bounded)**

- 신규 생성: 프로젝트 섹션 + `@.harness/harness-guide.md` + `<!-- harness-rules:begin -->` + glob 정렬한 `@.harness/rules/<rel-path>` 라인 N개 + `<!-- harness-rules:end -->`을 작성한다. `version: 1`.
- 업데이트: begin/end 마커 사이를 glob 결과로 완전 재생성한다 (기존 사이 내용 폐기). 마커 외부의 `@.harness/rules/<rel-path>` 접두사 라인은 사용자 콘텐츠로 간주해 검사·수정·삭제 없이 그대로 보존한다. 프로젝트 섹션은 Step 3 수집 정보로 갱신, 사용자 정의 영역(end 마커 직후 ~ 파일 끝)은 그대로 둔다. 최종 조립 후 SHA-256 hash 비교(frontmatter `version` 라인 제외)로 변경 감지: 동일하면 `[변경 없음]`, 다르면 `version +1` 후 원자적 쓰기.
- 일회 마이그레이션: `<!-- harness-rules:begin -->` 마커 없는 기존 파일에서 `@.harness/harness-guide.md` 직후 연속된 `@.harness/rules/<rel-path>` 라인만 marker로 감싼 뒤 업데이트 모드와 동일한 작성·hash 비교 흐름을 적용한다. 비-인접 위치의 rules-prefix 라인은 사용자 콘텐츠로 간주해 손대지 않는다.
- `.harness/rules/` 부재 시: 마커 사이를 빈 상태로 둔다 (마커 자체는 유지 — 차후 실행이 marker 기반 업데이트 모드로 진입하도록 idempotency 보장). Step 6 결과에 `[정보] .harness/rules/ 부재로 마커 사이 비움` 1줄을 추가한다.
- 신규 import 블록 구조 (예시):

  ```
  @.harness/harness-guide.md
  <!-- harness-rules:begin -->
  @.harness/rules/coding-style.md
  @.harness/rules/git-workflow.md
  ...
  <!-- harness-rules:end -->

  [사용자 정의 영역 — 보존, 마커 외부는 손대지 않음]
  ```

- glob 수집 규칙: `find .harness/rules -name "*.md" -type f | sort` (top-level 우선 + sub-dir 알파벳 순), 각 경로 앞에 `@` 접두사 부여하여 `@.harness/rules/<rel-path>` 형식으로 변환.

**Step 5 — AGENTS.md 작성**

- 신규: 프로젝트 섹션 + begin/end 마커 블록 생성. `.harness/harness-guide.md` 본문(frontmatter 제외)을 마커 사이에 삽입. 파일이 없으면 빈 블록으로 생성하고 경고 출력.
- 업데이트: begin 마커 이전 내용을 새 프로젝트 섹션으로 교체. begin/end 사이 내용을 현재 harness-guide.md 본문으로 교체. end 마커 이후 내용 보존.
- AGENTS.md는 `.harness/rules/` 본문을 임베드하지 않는다 (Codex AGENTS.md 32KB silent truncation 회피, `.codex/skills/`가 룰 본문을 명시 Read).

**Step 6 — sourceFilter 자동 감지·보존**

`scripts/deploy-harness.sh` 존재 여부로 `config.docs.sourceFilter` 기본값을 결정한다 (하네스 저장소: prefix 목록 / 일반 프로젝트: 빈 배열). **기존 non-empty 값은 보존**한다 — `/flow-init`은 imports 재생성 용도로도 재실행되므로 (`/add-language-rules` 안내), 사용자 명시 설정을 재실행마다 덮어쓰지 않는다 (빈 배열·null·미설정일 때만 감지값 적용). 보존이 발동하면 결과 안내에 `[보존] config.docs.sourceFilter 기존 값 유지`를 출력한다.

**Step 7 — 결과 안내**

작성된 파일 경로와 모드(신규/업데이트/변경 없음)를 출력한다. `[감지]`와 `[보존]`은 상호 배타로 출력된다. `src/` 모드일 경우 `./scripts/deploy-harness.sh` 실행 안내를 추가로 출력한다.

## 제약사항

### deploy-harness.sh 안전 검사

external 모드에서 `TARGET_DIR`이 아래 경우에 해당하면 즉시 오류로 종료한다:

- `TARGET_DIR`이 `src/` 자체이거나 `src/` 하위 디렉토리인 경우
- `TARGET_DIR`이 `src/`를 포함하는 조상 디렉토리인 경우 (즉, `src/`가 `TARGET_DIR` 아래에 들어오는 경우)
- `TARGET_DIR`이 하네스 저장소 내부를 가리키는 경우

`make_absolute_path` 함수는 입력 경로의 parent 디렉토리가 존재하지 않으면 즉시 오류 처리한다 (path traversal 방어).

### self-sync 백업 비활성화

self-sync 모드에서는 `--no-backup` 옵션 지정 여부와 무관하게 `BACKUP_ENABLED=0`이 강제된다. `.harness-backups/` 디렉토리는 external 모드에서만 생성된다.

### src/ 제외 파일

`src/`는 배포 대상 컴포넌트만 포함한다. rsync 복사 시 아래 항목은 항상 제외된다:

- `.claude/sessions/` — 세션 로그 (git-ignored)
- `.claude/settings.local.json` — 로컬 설정 (git-ignored)
- `.claude/checkpoints.log` — 체크포인트 로그 (git-ignored)

### AGENTS.md @import 미지원

Codex CLI는 `@import` 구문을 지원하지 않는다. 따라서 AGENTS.md는 `@.harness/harness-guide.md` import 대신 begin/end 마커 블록 안에 harness-guide 내용을 직접 포함한다. AGENTS.md의 harness-guide 블록은 `/flow-init` 업데이트 실행 시에만 최신화되며, 자동 동기화되지 않는다.

### harness-guide.md 동기화 의무

루트 `.harness/harness-guide.md`와 `src/.harness/harness-guide.md`는 항상 동일해야 한다. self-sync(`./scripts/deploy-harness.sh`) 실행이 이 일치를 보장한다. 어느 한쪽을 직접 편집한 경우에는 반드시 self-sync를 실행해 일치 상태를 복원한다.

### /flow-init 마커 의존성

`/flow-init`의 업데이트 모드는 경계 마커 존재에 의존한다. AGENTS.md는 `<!-- harness-guide:begin/end -->` 마커가, CLAUDE.md는 `<!-- harness-rules:begin/end -->` 마커가 자동 관리 영역을 bound한다 (마커 외부는 사용자 영역으로 보존).

- AGENTS.md 마커 없음 → 업데이트 불가 상태로 간주, `AskUserQuestion`으로 백업 후 재생성 or 중단.
- CLAUDE.md `<!-- harness-rules:begin -->` 마커 없음 + `@.harness/harness-guide.md` 라인 있음 → 일회 마이그레이션 모드로 진입 (harness-guide 직후 연속된 `@.harness/rules/<rel-path>` 라인만 marker로 in-place 변환; 비-인접 위치 라인은 사용자 콘텐츠로 간주, 손대지 않음).
- CLAUDE.md `@.harness/harness-guide.md` 라인 자체가 없음 → 업데이트 불가 상태로 간주, `AskUserQuestion`으로 백업 후 재생성 or 중단.
