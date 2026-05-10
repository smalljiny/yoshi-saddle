# docs/specs 인덱스

harness 구성 요소의 설계 계약과 동작 명세. 각 파일은 단일 관심사를 다룬다.

---

## 워크플로우 전체 흐름

```
/dev:spec → /dev:plan → /dev:impl* → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

---

## 파일 목록

### 루트 잔류 (라이프사이클·상태 관리·기타)

| 파일 | 내용 |
|------|------|
| [topic-lifecycle.md](topic-lifecycle.md) | 전체 토픽 상태 기계. `phase:status` 전환표, 커맨드 게이트, `dev-context.js` CLI 계약, Codex 스킬 연동 |
| [dev-context-config.md](dev-context-config.md) | `dev-context.json`의 전역 `config` 섹션 계약. `config.dev_impl.*`·`config.git.*`·`config.review.*`·`config.codex.*`·`config.docs.*`·`config.graphify.*` 스키마 및 `/dev:setup git` 동작 |
| [hook-command-paths.md](hook-command-paths.md) | Claude Code hook 설정의 command 경로 prefix는 `${CLAUDE_PROJECT_DIR}` 사용. 작업 디렉토리 무관 정상 동작 |
| [planner-progress-tracking.md](planner-progress-tracking.md) | `planner` 에이전트 5개 마일스톤(P1~P5)을 Claude Code Task 도구로 표면화하는 진행 추적 프로토콜 |
| [statusline.md](statusline.md) | Claude Code 상태줄 설정. 토픽·phase 표시 |
| [wf-deep-research.md](wf-deep-research.md) | skill-registry search-adapter 기반 6단계 심층 연구 워크플로우 (firecrawl·exa 동적 선택) |
| [wf-task-tracking.md](wf-task-tracking.md) | implementation 에이전트(tdd-specialist·refactor-cleaner·prompt-engineer)의 Task 도구 추적 정형 패턴 |

### workflows/ — 단계별 워크플로우 (커맨드)

| 파일 | 담당 커맨드 | 내용 |
|------|------------|------|
| [workflows/spec.md](workflows/spec.md) | `/dev:spec` | 스펙 작성 흐름. brainstorming 스킬 연동, 토픽 등록, Codex spec-review 루프 |
| [workflows/plan.md](workflows/plan.md) | `/dev:plan` | 구현 계획 생성. planner 에이전트, `implementation-plan.md` 산출, Codex plan-review 루프 (`config.plan.auto_review`) |
| [workflows/impl.md](workflows/impl.md) | `/dev:impl` | Task 실행·커밋 계약 및 배치 모드. 커밋 메시지 형식, auto_commit, `--all` 순차 자동 실행, 실패 중단 정책 |
| [workflows/review.md](workflows/review.md) | `/dev:review` | 리뷰 워크플로우. code-reviewer·security-reviewer 병렬 실행, adversarial-review 활성화 조건, review-report 형식 |
| [workflows/docs.md](workflows/docs.md) | `/dev:docs` | 참조 문서 생성·갱신 흐름. git diff 기반 파일 수집, `docs/specs/<name>.md` 업데이트, `refDoc` 필드 기록 |
| [workflows/pr.md](workflows/pr.md) | `/dev:pr` | PR 발행 흐름. first-run(`gh pr create`)·re-entry(`gh pr edit`) 분기, PR body 템플릿, 브랜치 설정 |
| [workflows/done.md](workflows/done.md) | `/dev:done` | 완료 워크플로우. 산출물 아카이브, 토픽 제거. 게이트: `pr:created`. 참조 문서 생성은 `/dev:docs` 1차 책임 |

### infrastructure/ — 배포 인프라

| 파일 | 내용 |
|------|------|
| [infrastructure/src-layout.md](infrastructure/src-layout.md) | `src/`를 배포 단일 진실 원천으로 두고 self-sync(루트↔src)·외부 프로젝트 배포 두 모드를 운용 |
| [infrastructure/scripts-esm-compat.md](infrastructure/scripts-esm-compat.md) | `.harness/scripts/`·`.claude/scripts/` Node 스크립트 ESM 통일과 디렉토리별 `package.json` 격리 |
| [infrastructure/deploy-manifest.md](infrastructure/deploy-manifest.md) | `deploy-harness.sh` 매니페스트 기반 selective cleanup. 이전 deploy 파일만 정리, 사용자 추가 파일 보존 |

### search-adapters/ — 검색 API 어댑터

| 파일 | 내용 |
|------|------|
| [search-adapters/exa.md](search-adapters/exa.md) | Exa REST API search-adapter 스킬 (`$EXA_API_KEY` 기반 curl) — search·contents·answer·findSimilar |
| [search-adapters/firecrawl.md](search-adapters/firecrawl.md) | Firecrawl REST API v1 search-adapter 스킬 (`$FIRECRAWL_API_KEY` 기반 curl) — search·scrape·crawl |

### prompt/ — 프롬프트 작성·평가

| 파일 | 내용 |
|------|------|
| [prompt/authoring-guide.md](prompt/authoring-guide.md) | Opus 4.7 리터럴 해석 강화에 대응하는 7가지 프롬프트 작성 규칙. 베이스라인 자동 로드 + 메타 컴포넌트 명시 로드 두 채널 |
| [prompt/eval-workflow.md](prompt/eval-workflow.md) | `prompt` 타입 Task PROPOSE→EVAL→REFINE 사이클. `prompt-engineer` 에이전트 + `stack-prompt` 스킬 |

### codex/ — Codex CLI 통합

| 파일 | 내용 |
|------|------|
| [codex/session-detection.md](codex/session-detection.md) | Codex CLI 감지·캐싱 시스템. `config.codex.*` 단일 진실 원천. 1시간 TTL, session-start 훅 연동 |
| [codex/codex-review.md](codex/codex-review.md) | `codex exec` 기반 spec-review·plan-review 단일 실행 스킬. 루프 제어는 호출 커맨드 소유 |

### meta/ — 메타 스킬·계약

| 파일 | 내용 |
|------|------|
| [meta/skill-creator.md](meta/skill-creator.md) | 스킬 작성 메타가이드. harness 스킬 구조·컨벤션(1차), 공식 플러그인 eval 루프 개념(참조) |
| [meta/skill-registry.md](meta/skill-registry.md) | capability 기반 스킬 동적 탐색 인프라. SKILL.md `capabilities:` 규격, 어댑터 패턴 계약 |
| [meta/eval-harness.md](meta/eval-harness.md) | 스킬 품질 측정 EDD 프레임워크. Codex CLI 실행, code-based grader, pass@k 판정 |
| [meta/command-skill-boundary.md](meta/command-skill-boundary.md) | 커맨드(워크플로우 소유)와 스킬(재사용 단위 로직) 역할 경계 규칙 |

---

## 문서 간 관계

```
topic-lifecycle                          ← 상태 기계 중앙 참조
  └─ dev-context-config                  ← config.* 스키마 단일 진실 원천
       ├─ config.dev_impl.*              ← /dev:impl 동작 제어
       ├─ config.git.*                   ← /dev:setup git 동작 (dev-context-config 흡수)
       ├─ config.review.*                ← workflows/review (소비)
       ├─ config.codex.*                 ← codex/session-detection (쓰기 전용)
       │                                    ├─ workflows/review (소비)
       │                                    └─ codex/codex-review (소비)
       └─ config.docs.*                  ← workflows/docs (소비)
  └─ workflows/spec                      ← spec:* 상태
       └─ codex/codex-review             ← spec-review 단일 실행
  └─ workflows/plan                      ← plan:* 상태
       └─ codex/codex-review             ← plan-review 단일 실행
  └─ workflows/impl                      ← impl:* 상태 (커밋 계약 + 배치 모드)
       ├─ wf-task-tracking               ← Task 도구 추적 패턴
       └─ workflows/review               ← review-fix 상세
  └─ workflows/review                    ← review:* 상태
  └─ workflows/docs                      ← docs:* 상태 (참조 문서 생성·갱신 1차 책임)
  └─ workflows/pr                        ← pr:* 상태
  └─ workflows/done                      ← pr:created 게이트 → 토픽 제거

스킬 인프라:
  meta/skill-registry                    ← 동적 탐색 계약
       ├─ search-adapters/exa            ← search-adapter 구현
       ├─ search-adapters/firecrawl      ← search-adapter 구현
       └─ wf-deep-research               ← search-adapter 소비

배포·인프라:
  infrastructure/src-layout              ← src/ → 루트·외부 프로젝트 배포
       ├─ infrastructure/deploy-manifest ← selective cleanup 메커니즘
       └─ infrastructure/scripts-esm-compat ← Node 스크립트 ESM 표준

디렉토리 그룹:
  workflows/                             ← spec·plan·impl·review·docs·pr·done
  infrastructure/                        ← src-layout·deploy-manifest·scripts-esm-compat
  search-adapters/                       ← exa·firecrawl
  prompt/                                ← authoring-guide·eval-workflow
  codex/                                 ← session-detection·codex-review
  meta/                                  ← skill-creator·skill-registry·eval-harness·command-skill-boundary
```
