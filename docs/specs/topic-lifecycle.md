# 토픽 생명주기 관리

> Claude Code 하네스에서 스펙 작성부터 구현 완료까지 토픽이 어떻게 관리되는지 기술한다.

## 개요

토픽의 생명주기 상태는 디렉토리 위치로 표현된다. `docs/_local/dev-context.json`에는 현재 `active/` 상태의 토픽만 등록된다.

## 디렉토리 구조

```
docs/_local/
├── backlog/          스펙이 작성되었으나 아직 계획이 없는 토픽
│   └── <topic>/
│       ├── spec.md
│       └── spec-review-*.md
├── backlog-split/    분할된 상위 스펙의 참조 보관 위치 (계획 탐색 제외)
│   └── <topic>/
├── active/           계획이 수립되어 구현 중인 토픽
│   └── <topic>/
│       ├── spec.md
│       ├── spec-review-*.md
│       └── implementation-plan.md
├── done/             완료된 토픽의 로컬 아카이브 (git-ignored)
│   └── <topic>/
│       └── implementation-plan.md
└── dev-context.json  active 토픽만 등록
```

## dev-context.json 스키마

`active/` 토픽만 등록한다. `backlog/`와 `done/` 토픽은 등록되지 않는다.

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
      "currentTask": "Task 3",
      "createdAt": "2026-04-15T12:00:00.000Z",
      "updatedAt": "2026-04-16T09:00:00.000Z"
    }
  }
}
```

`current_topic`은 `/dev:plan`, `/dev:topic switch`, `/dev:done`으로만 변경된다.

## 상태 전이

| 명령어 | 전이 | dev-context.json |
|--------|------|-----------------|
| `/dev:spec <topic>` | 없음 → `backlog/<topic>/` 생성 | 변경 없음 |
| `/dev:plan <topic>` | `backlog/` → `active/` | topics에 등록, current_topic 설정 |
| `/dev:topic switch <name>` | current_topic 변경 | current_topic 갱신 |
| `/dev:done` | `active/` → `done/` | topics에서 제거, current_topic 재설정 |

`/dev:plan`은 backlog를 스캔(`docs/_local/backlog/`만)하여 토픽을 선택한다. `backlog-split/`은 스캔 대상에서 제외된다.

## 제약사항

- `current_topic`은 항상 1개다. 여러 `active/` 토픽이 존재할 수 있지만 동시 구현은 지원하지 않는다.
- `done/` 디렉토리는 git-ignored이다. 영구 참조 문서는 `docs/specs/`에 저장된다.
- `backlog/` 토픽 우선순위 정렬 기능은 없다.
- 완료된 토픽의 복원(undo) 기능은 없다.
