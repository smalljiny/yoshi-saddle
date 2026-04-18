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
| [dev-context-config.md](dev-context-config.md) | `dev-context.json`의 전역 `config` 섹션 계약. `config.dev_impl.*`(auto_start, auto_commit)·`config.git.*` 스키마 및 소비 동작 |

### 단계별 워크플로우

| 파일 | 담당 커맨드 | 내용 |
|------|------------|------|
| [spec-workflow.md](spec-workflow.md) | `/dev:spec` | 스펙 작성 흐름. brainstorming 스킬 연동, 토픽 등록, Codex spec-review 루프 |
| [commit-workflow.md](commit-workflow.md) | `/dev:impl` | Task 완료 시 커밋 실행 계약. 커밋 메시지 형식, auto_commit, review-fix 커밋 패턴, 공유 규칙 위치 |
| [review-adversarial-workflow.md](review-adversarial-workflow.md) | `/dev:review` | 리뷰 워크플로우. code-reviewer·security-reviewer 병렬 실행, adversarial-review 활성화 조건, review-report 형식 |
| [reference-docs-workflow.md](reference-docs-workflow.md) | `/dev:docs` | 참조 문서 생성 흐름. git diff 기반 파일 수집, `docs/specs/<name>.md` 저장, `refDoc` 필드 기록 |
| [pr-workflow.md](pr-workflow.md) | `/dev:pr` | PR 발행 흐름. first-run(`gh pr create`)·re-entry(`gh pr edit`) 분기, PR body 템플릿, 브랜치 설정 |
| [done-workflow.md](done-workflow.md) | `/dev:done` | 완료 워크플로우. 참조 문서 자동 생성, 산출물 아카이브, 토픽 제거 |

### 설계 원칙

| 파일 | 내용 |
|------|------|
| [command-skill-boundary.md](command-skill-boundary.md) | 커맨드(워크플로우 소유)와 스킬(재사용 단위 로직) 역할 경계 규칙 |
| [codex-session-detection.md](codex-session-detection.md) | Codex CLI 감지·캐싱 시스템. `config.codex.*` 네임스페이스, 1시간 TTL, session-start 훅 연동 |

---

## 문서 간 관계

```
topic-lifecycle          ← 상태 기계 중앙 참조
  └─ dev-context-config  ← config.* 스키마 상세
  └─ spec-workflow        ← spec:* 상태
  └─ commit-workflow      ← impl:* 상태 (커밋 계약)
  └─ review-adversarial-workflow ← review:* 상태
  └─ reference-docs-workflow     ← docs:* 상태
  └─ pr-workflow          ← pr:* 상태
  └─ done-workflow        ← 토픽 제거
```
