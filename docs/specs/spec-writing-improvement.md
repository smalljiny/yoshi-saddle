# 스펙 작성 백로그 관리 시스템 스펙

**상태**: Draft
**작성일**: 2026-04-16
**작성자**: @mario

> **문서 범위**: `/dev:spec` 워크플로우의 토픽 생명주기 관리 구조 개선. `dev-context.json` 비대화 문제 해소 및 상태 기반 디렉토리 구조 도입.

## 1. 개요

### 1.1 배경

`/dev:spec` 워크플로우를 운영하다 보면 `dev-context.json`에 모든 토픽이 누적된다. 완료된 토픽과 대기 중인 토픽이 한 파일에 섞이고, 파일이 커질수록 현재 작업 상태를 파악하기 어렵다.

### 1.2 목적

토픽의 생명주기 단계를 **디렉토리 위치**로 표현한다. `dev-context.json`에는 `active/` 상태의 토픽만 등록하고, `current_topic`으로 지금 구현 중인 토픽 하나를 가리킨다. `backlog/`와 `done/` 토픽은 디렉토리 존재만으로 관리한다.

## 2. 목표

- 토픽 상태가 디렉토리 위치(`backlog/`, `active/`, `done/`)로 즉시 파악된다
- `dev-context.json`에는 `active/` 토픽만 등록되어 파일 크기가 제한된다
- `current_topic`은 "구현 중인 토픽"을 의미하며 `/dev:plan`, `/dev:topic switch`, `/dev:done`으로만 변경된다
- 완료(`/dev:done`) 시 스펙이 `docs/specs/`에 자동 보존된다
- 기존 `/dev:spec → /dev:plan → /dev:impl → /dev:review → /dev:verify → /dev:done → PR` 흐름이 성립한다

## 3. 아키텍처

### 3.1 디렉토리 구조

```
docs/_local/
├── backlog/
│   └── <topic>/
│       ├── spec.md
│       └── spec-review-*.md
├── active/
│   └── <topic>/
│       ├── spec.md
│       ├── spec-review-*.md
│       └── implementation-plan.md
├── done/
│   └── <topic>/          (로컬 보관용, git-ignored)
│       ├── spec.md
│       └── implementation-plan.md
└── dev-context.json
```

`tmp/` 디렉토리는 제거된다.

### 3.2 dev-context.json 스키마

```json
{
  "current_topic": "foo",
  "topics": {
    "foo": {
      "phase": "impl",
      "spec": "docs/_local/active/foo/spec.md",
      "specConfirmed": true,
      "specReview": "docs/_local/active/foo/spec-review-260415120000.md",
      "plan": "docs/_local/active/foo/implementation-plan.md",
      "currentTask": 3,
      "createdAt": "2026-04-15T12:00:00.000Z",
      "updatedAt": "2026-04-16T09:00:00.000Z"
    },
    "bar": {
      "phase": "plan",
      "spec": "docs/_local/active/bar/spec.md",
      "specConfirmed": true,
      "specReview": "docs/_local/active/bar/spec-review-260416080000.md",
      "plan": null,
      "currentTask": null,
      "createdAt": "2026-04-16T08:00:00.000Z",
      "updatedAt": "2026-04-16T08:00:00.000Z"
    }
  }
}
```

`backlog/`와 `done/` 토픽은 등록되지 않는다.

### 3.3 토픽 생명주기

```
/dev:spec <topic>
  → docs/_local/backlog/<topic>/ 생성
  → spec.md 작성 (brainstorming 스킬)
  → Codex 리뷰 루프
  → dev-context.json 미등록

/dev:plan <topic>
  → backlog/<topic>/ → active/<topic>/ 이동
  → implementation-plan.md 생성
  → dev-context.json topics에 등록
  → current_topic이 이미 다른 토픽이면 전환 여부 확인 프롬프트
  → 확인 시 current_topic을 해당 토픽으로 설정, 거부 시 기존 유지

/dev:topic switch <name>
  → current_topic 변경 (active에 등록된 토픽만 가능)

/dev:done
  → current_topic 대상으로만 작동
  → active/<topic>/ → done/<topic>/ 이동
  → docs/specs/<topic>.md 복사/업데이트
  → dev-context.json에서 해당 토픽 제거
  → current_topic을 다른 active 토픽으로 변경 (없으면 null)
```

### 3.4 변경이 필요한 명령어

| 명령어 | 변경 내용 |
|--------|---------|
| `/dev:spec` | 저장 경로 `tmp/` → `backlog/`, dev-context.json 등록 제거 |
| `/dev:plan` | 인자로 토픽 지정, `backlog/` → `active/` 이동, dev-context.json 등록 + current_topic 설정 |
| `/dev:topic` | switch 대상을 active 토픽(dev-context.json 등록된 것)으로 제한 |
| `/dev:done` | **신규** — current_topic 완료 처리 + docs/specs/ 보존 + dev-context.json 정리 |

## 4. 의사결정

| 항목 | 결정 | 근거 |
|------|------|------|
| 신규 스펙 시작 위치 | `backlog/` | 스펙 작성 = 아이디어 구체화 단계, 즉시 구현 착수가 아님 |
| `backlog/` → `active/` 트리거 | `/dev:plan <topic>` | 계획 수립이 "구현하겠다"는 명시적 의사결정 시점 |
| `current_topic` 설정 시점 | `/dev:plan` 실행 시 | 플랜을 세우는 것이 곧 "이걸 바로 시작한다"는 의도 |
| `active/` → `done/` 트리거 | `/dev:done` (신규) | `/dev:verify`는 품질 게이트 전용 유지, 상태 전환은 분리 |
| `/dev:done` 대상 | `current_topic` 고정 | "완료하려면 먼저 switch" 규칙으로 일관성 유지 |
| `done/` 디렉토리 | 로컬 보관용으로 유지 (git-ignored) | 구현 산출물 전체를 로컬에서 참조할 수 있도록 |
| dev-context.json 등록 범위 | `active/` 토픽만 | 백로그/완료 토픽 누적 문제 해소 |
| `tmp/` 디렉토리 | 제거 | 상태 기반 디렉토리 구조로 대체 |

## 5. 범위 밖 (Non-goals)

- `backlog/` 토픽의 우선순위 정렬 기능
- `done/` 토픽 복원(undo) 기능
- 여러 `active/` 토픽의 병렬 구현 지원 (`current_topic`은 항상 1개)
- 기존 `tmp/` 기반 토픽의 자동 마이그레이션

## 6. Open Questions

- `done/` 디렉토리를 git-ignored로 유지할지 확인 필요 (`docs/specs/`에 이미 보존되므로 ignored가 적합해 보임)

## 7. 관련 문서

- `.claude/commands/dev/spec.md` — 현재 `/dev:spec` 구현
- `.claude/commands/dev/plan.md` — 현재 `/dev:plan` 구현
- `.claude/commands/dev/topic.md` — 현재 `/dev:topic` 구현
- `.claude/rules/common/development-workflow.md` — 문서 생명주기 정의
- `docs/_local/dev-context.json` — 현재 스키마 참고

## 8. 마이그레이션 가이드

이 스펙 구현 후 기존 `tmp/` 구조 토픽은 수동으로 이전한다.

```bash
# backlog로 이전 (스펙만 있고 플랜이 없는 경우)
mv docs/_local/tmp/<topic>/ docs/_local/backlog/<topic>/

# active로 이전 (플랜이 있고 구현 중인 경우)
mv docs/_local/tmp/<topic>/ docs/_local/active/<topic>/
# dev-context.json의 spec/plan 경로도 수동 업데이트 필요
```
