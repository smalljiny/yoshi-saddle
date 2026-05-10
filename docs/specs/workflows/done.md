# Done Workflow

> `/dev:done`은 PR 발행이 완료된 토픽의 모든 계획 아티팩트를 삭제 없이 `done/`으로 아카이브하고 `dev-context.json`에서 토픽을 제거한다. 참조 문서 생성은 `/dev:docs`의 책임이다.

## 개요

`/dev:done`은 개발 워크플로우의 완료 단계를 처리하는 커맨드다. 토픽이 `pr:created` 상태일 때만 실행되며(`/dev:pr` 이후), 스펙·리뷰·구현 계획·리뷰 리포트 등 모든 계획 아티팩트를 `docs/_local/active/<topic>/`에서 `docs/_local/done/<topic>/`으로 이동한 뒤 `dev-context.json`에서 해당 토픽을 제거한다.

참조 문서(`docs/specs/<name>.md`) 생성·갱신은 `/dev:docs`가 1차 책임을 진다. `/dev:done`은 참조 문서를 생성하지 않으며 이미 생성된 참조 문서의 경로(`refDoc`)를 유지한다.

## 구조 / 스키마

### 관련 파일

```
.claude/commands/dev/done.md        — 커맨드 정의
```

### dev-context.json 관련 필드

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "pr",
      "status": "created",
      "spec": "docs/_local/active/<topic>/spec.md",
      "plan": "docs/_local/active/<topic>/implementation-plan.md",
      "refDoc": "docs/specs/<name>.md"
    }
  }
}
```

### 완료 후 파일 배치

```
docs/specs/<confirmed-name>.md               — 참조 문서 (git-tracked, /dev:docs가 생성·갱신)
docs/_local/done/<topic>/                    — 계획 아티팩트 아카이브 (git-ignored)
  ├── spec.md                                  스펙 원본
  ├── spec-review-<yymmddhhmmss>.md            Codex 스펙 리뷰 (있는 만큼 전부)
  ├── plan-review-<yymmddhhmmss>.md            Codex 플랜 리뷰 (있는 만큼 전부)
  ├── review-report-<yymmddhhmmss>.md          /dev:review 리포트 (있는 만큼 전부)
  └── implementation-plan.md                   구현 계획
```

## 동작

### 1. 현재 토픽 확인

`current_topic`을 읽어 대상을 결정한다. 비어 있거나 누락이면 즉시 중단한다. 토픽 이름은 `^[a-zA-Z0-9_-]+$`로 검증한다.

`/dev:done`은 항상 `current_topic`만 처리한다. 다른 토픽을 완료하려면 `/dev:topic switch <name>`으로 먼저 전환한다.

### 2. 게이트 (`pr:created` 검증)

`phase:status`가 `pr:created`가 아니면 즉시 중단한다. 우회·경고 후 진행은 하지 않는다. `/dev:pr`을 먼저 실행해야 이 상태에 도달할 수 있다.

PR 수정이 필요한 경우 `/dev:pr` 재실행 또는 상태를 `docs:generated`로 복귀시킨 후 `/dev:docs` → `/dev:pr` 순서로 재실행한다.

### 3. 아카이브 — 삭제 없음

모든 계획 아티팩트를 `docs/_local/active/<topic>/`에서 `docs/_local/done/<topic>/`으로 **이동**한다. 삭제되는 파일은 없다.

이동 대상 (존재하는 만큼만, 누락 시 조용히 skip — 재진입 안전):
- `active/<topic>/spec.md` → `done/<topic>/spec.md`
- `active/<topic>/spec-review-*.md` → `done/<topic>/` (패턴 매칭 전체)
- `active/<topic>/plan-review-*.md` → `done/<topic>/` (패턴 매칭 전체)
- `active/<topic>/review-report-*.md` → `done/<topic>/` (패턴 매칭 전체)
- `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md`

이동 후 `active/<topic>/`가 비어 있으면 디렉토리를 제거한다. 예상치 못한 파일이 남아 있으면 사용자 확인 후 처리한다.

`done/<topic>/`이 이미 존재하면 `done/<topic>-<yyyyMMddHHmmss>/` 접미사로 새 디렉토리를 생성하여 기존 아카이브와 충돌하지 않게 한다.

### 4. 토픽 제거

`remove-topic --topic=<topic>`으로 `topics[<topic>]`을 제거한다. `current_topic`은 남은 토픽 중 하나로 자동 전환되며, 남은 토픽이 없으면 `null`로 설정된다.

### 5. 완료 리포트

```
완료되었습니다: <topic>

  아카이브:  docs/_local/done/<topic>/

  현재 주제: <next-active-topic or "없음">
```

남은 활성 토픽이 있으면 다음 토픽으로 전환됨을 안내하고, 없으면 모든 토픽이 완료됐음을 안내한다.

## 제약사항

- **게이트: `pr:created`** — `/dev:pr` 완료 후에만 실행 가능. 다른 상태에서 실행 시 즉시 중단, 우회 없음
- **참조 문서를 생성하지 않음** — `docs/specs/<name>.md` 생성·갱신은 `/dev:docs`의 책임. `/dev:done`은 아카이브와 토픽 제거만 수행
- **삭제 없음** — 스펙·리뷰·구현 계획·리뷰 리포트 등 모든 계획 아티팩트는 `done/`으로 이동되며 어떤 것도 삭제되지 않는다
- **`done/`은 git-ignored** — 로컬 참조 전용. 영구 기록은 `docs/specs/`의 참조 문서(`/dev:docs`가 작성)
- **`current_topic` 전용** — `/dev:done`은 항상 `current_topic`을 처리한다. 다른 토픽은 `/dev:topic switch`로 전환 후 실행
- **게이트 검증은 `/dev:done` 책임** — `remove-topic`은 상태 검증을 하지 않으므로 `/dev:done`이 호출 전에 사전 검증한다
- **재진입 안전** — 아카이브·토픽 제거는 부분 완료 상태에서 재실행해도 일관된 결과를 생성한다
