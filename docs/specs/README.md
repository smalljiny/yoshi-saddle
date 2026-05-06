# docs/specs 인덱스

harness 구성 요소의 설계 계약과 동작 명세. 각 파일은 단일 관심사를 다룬다.

---

## 워크플로우 전체 흐름

```
/dev:spec → /dev:plan → /dev:impl* → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

---

## 파일 목록

### 라이프사이클·상태 관리

| 파일 | 내용 |
|------|------|
| [topic-lifecycle.md](topic-lifecycle.md) | 전체 토픽 상태 기계. `phase:status` 전환표, 커맨드 게이트, `dev-context.js` CLI 계약, Codex 스킬 연동 |
| [dev-context-config.md](dev-context-config.md) | `dev-context.json`의 전역 `config` 섹션 계약. `config.dev_impl.*`·`config.git.*`·`config.review.*`·`config.codex.*`·`config.docs.*` 스키마 및 소비 동작 |

### 단계별 워크플로우 (커맨드)

| 파일 | 담당 커맨드 | 내용 |
|------|------------|------|
| [spec-workflow.md](spec-workflow.md) | `/dev:spec` | 스펙 작성 흐름. brainstorming 스킬 연동, 토픽 등록, Codex spec-review 루프 |
| [plan-workflow.md](plan-workflow.md) | `/dev:plan` | 구현 계획 생성. planner 에이전트, `implementation-plan.md` 산출, Codex plan-review 루프 (`config.plan.auto_review`) |
| [impl-workflow.md](impl-workflow.md) | `/dev:impl` | Task 실행·커밋 계약 및 배치 모드. 커밋 메시지 형식, auto_commit, `--all` 순차 자동 실행, 실패 중단 정책 |
| [review-adversarial-workflow.md](review-adversarial-workflow.md) | `/dev:review` | 리뷰 워크플로우. code-reviewer·security-reviewer 병렬 실행, adversarial-review 활성화 조건, review-report 형식 |
| [reference-docs-workflow.md](reference-docs-workflow.md) | `/dev:docs` | 참조 문서 생성·갱신 흐름. git diff 기반 파일 수집, `docs/specs/<name>.md` 업데이트, `refDoc` 필드 기록 |
| [pr-workflow.md](pr-workflow.md) | `/dev:pr` | PR 발행 흐름. first-run(`gh pr create`)·re-entry(`gh pr edit`) 분기, PR body 템플릿, 브랜치 설정 |
| [done-workflow.md](done-workflow.md) | `/dev:done` | 완료 워크플로우. 산출물 아카이브, 토픽 제거. 게이트: `pr:created`. 참조 문서 생성은 `/dev:docs` 1차 책임 |

### 설정·설치

| 파일 | 담당 커맨드 | 내용 |
|------|------------|------|
| [git-project-config.md](git-project-config.md) | `/dev:setup git` | git remote 자동 감지 및 `config.git.*` 저장. 스키마 상세는 `dev-context-config.md` 참조 |

### 스킬·메타 워크플로우

| 파일 | 내용 |
|------|------|
| [wf-codex-review.md](wf-codex-review.md) | `codex exec` 기반 spec-review·plan-review 단일 실행 스킬. 루프 제어는 호출 커맨드 소유 |
| [wf-deep-research.md](wf-deep-research.md) | skill-registry search-adapter 기반 6단계 심층 연구 워크플로우 (firecrawl·exa 동적 선택) |
| [wf-task-tracking.md](wf-task-tracking.md) | implementation 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)의 Task 도구 추적 정형 패턴 |
| [skill-registry.md](skill-registry.md) | capability 기반 스킬 동적 탐색 인프라. SKILL.md `capabilities:` 규격, 어댑터 패턴 계약 |
| [prompt-eval-workflow.md](prompt-eval-workflow.md) | `prompt` 타입 Task PROPOSE→EVAL→REFINE 사이클. `prompt-engineer` 에이전트 + `stack-prompt` 스킬 |
| [meta-skill-creator.md](meta-skill-creator.md) | 스킬 작성 메타가이드. harness 스킬 구조·컨벤션(1차), 공식 플러그인 eval 루프 개념(참조) |
| [eval-harness.md](eval-harness.md) | 스킬 품질 측정 EDD 프레임워크. Codex CLI 실행, code-based grader, pass@k 판정 |

### Search 어댑터

| 파일 | 내용 |
|------|------|
| [stack-exa.md](stack-exa.md) | Exa REST API search-adapter 스킬 (`$EXA_API_KEY` 기반 curl) — search·contents·answer·findSimilar |
| [stack-firecrawl.md](stack-firecrawl.md) | Firecrawl REST API v1 search-adapter 스킬 (`$FIRECRAWL_API_KEY` 기반 curl) — search·scrape·crawl |

### 인프라·배포

| 파일 | 내용 |
|------|------|
| [harness-src-layout.md](harness-src-layout.md) | `src/`를 배포 단일 진실 원천으로 두고 self-sync(루트↔src)·외부 프로젝트 배포 두 모드를 운용 |
| [harness-scripts-esm-compat.md](harness-scripts-esm-compat.md) | `.harness/scripts/`·`.claude/scripts/` Node 스크립트 ESM 통일과 디렉토리별 `package.json` 격리 |
| [deploy-harness-manifest.md](deploy-harness-manifest.md) | `deploy-harness.sh` 매니페스트 기반 selective cleanup. 이전 deploy 파일만 정리, 사용자 추가 파일 보존 |

### 설계 원칙

| 파일 | 내용 |
|------|------|
| [command-skill-boundary.md](command-skill-boundary.md) | 커맨드(워크플로우 소유)와 스킬(재사용 단위 로직) 역할 경계 규칙 |
| [prompt-authoring-guide.md](prompt-authoring-guide.md) | Opus 4.7 리터럴 해석 강화에 대응하는 7가지 프롬프트 작성 규칙. 베이스라인 자동 로드 + 메타 컴포넌트 명시 로드 두 채널 |
| [codex-session-detection.md](codex-session-detection.md) | Codex CLI 감지·캐싱 시스템. `config.codex.*` 단일 진실 원천. 1시간 TTL, session-start 훅 연동 |

### 기능 확장

| 파일 | 내용 |
|------|------|
| [statusline.md](statusline.md) | Claude Code 상태줄 설정. 토픽·phase 표시 |

---

## 문서 간 관계

```
topic-lifecycle                    ← 상태 기계 중앙 참조
  └─ dev-context-config            ← config.* 스키마 단일 진실 원천
       ├─ config.dev_impl.*        ← /dev:impl 동작 제어
       ├─ config.git.*             ← git-project-config (설정 커맨드)
       ├─ config.review.*          ← review-adversarial-workflow (소비)
       ├─ config.codex.*           ← codex-session-detection (쓰기 전용)
       │                              ├─ review-adversarial-workflow (소비)
       │                              └─ wf-codex-review (소비)
       └─ config.docs.*            ← reference-docs-workflow (소비)
  └─ spec-workflow                 ← spec:* 상태
       └─ wf-codex-review          ← spec-review 단일 실행
  └─ plan-workflow                 ← plan:* 상태
       └─ wf-codex-review          ← plan-review 단일 실행
  └─ impl-workflow                 ← impl:* 상태 (커밋 계약 + 배치 모드)
       ├─ wf-task-tracking         ← Task 도구 추적 패턴
       └─ review-adversarial-workflow ← review-fix 상세
  └─ review-adversarial-workflow   ← review:* 상태
  └─ reference-docs-workflow       ← docs:* 상태 (참조 문서 생성·갱신 1차 책임)
  └─ pr-workflow                   ← pr:* 상태
  └─ done-workflow                 ← pr:created 게이트 → 토픽 제거

스킬 인프라:
  skill-registry                   ← 동적 탐색 계약
       ├─ stack-exa                ← search-adapter 구현
       ├─ stack-firecrawl          ← search-adapter 구현
       └─ wf-deep-research         ← search-adapter 소비

배포·인프라:
  harness-src-layout               ← src/ → 루트·외부 프로젝트 배포
       ├─ deploy-harness-manifest  ← selective cleanup 메커니즘
       └─ harness-scripts-esm-compat ← Node 스크립트 ESM 표준
```
