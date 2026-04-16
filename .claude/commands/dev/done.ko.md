---
version: 1
description: 현재 토픽을 완료 처리한다. active/<topic>을 done/으로 이동하고, 스펙을 docs/specs/에 보존하고, dev-context.json을 정리한다.
category: dev-workflow
---

# /dev:done

현재 토픽을 완료 처리한다. `active/`에서 `done/`으로 이동하고, 확정된 스펙을 `docs/specs/`에 보존하고, `dev-context.json`에서 토픽을 제거한다.

## 사용법

```
/dev:done    현재 토픽 완료 처리
```

항상 `current_topic`에 작동한다. 다른 토픽을 완료하려면 먼저 `/dev:topic switch <name>`을 실행한다.

## 실행 흐름

### 1. 현재 토픽 읽기

`docs/_local/dev-context.json` 읽기:
- `current_topic`이 null이거나 없으면 중단:
  ```
  완료할 토픽이 없습니다.
  현재 작업 중인 토픽이 없습니다.
  ```
- `current_topic`에서 `<topic>` 확인
- `topics[<topic>]` 항목 읽기 — 모든 경로의 source of truth

### 2. 단계 확인

`topics[<topic>].phase` 읽기:
- phase가 `spec` 또는 `plan`이면 (구현 미시작) 중단:
  ```
  '<topic>'은 아직 구현이 시작되지 않았습니다. (현재 단계: <phase>)
  구현을 먼저 진행하세요: /dev:impl
  ```

### 3. 검증 상태 확인 (선택사항)

`/dev:verify` 통과 여부 확인:
- 통과되지 않았으면 경고 출력 (중단하지 않음):
  ```
  ⚠ /dev:verify가 통과되지 않았습니다. 완료 처리를 계속하시겠습니까? (y/n)
  ```
  - `n`: 중단
  - `y`: 계속

### 4. docs/specs/에 스펙 보존

확정된 스펙을 영구 저장소로 복사:
- `topics[<topic>].spec`에서 스펙 경로 읽기
- `docs/specs/`가 없으면 생성
- `<스펙 경로>` → `docs/specs/<topic>.md` 복사
- 출력:
  ```
  스펙 보존: docs/specs/<topic>.md
  ```

### 5. done/으로 이동

토픽 디렉토리 이동:
- 스펙 경로에서 active 디렉토리 유도: `dirname(topics[<topic>].spec)`
- `docs/_local/done/`이 없으면 생성
- `docs/_local/done/<topic>/`이 이미 존재하면 `docs/_local/done/<topic>-<yyyyMMddHHmmss>/`로 이동
- active 토픽 디렉토리 → `docs/_local/done/<topic>/` (또는 타임스탬프 변형) 이동
- 출력:
  ```
  완료 처리: docs/_local/done/<topic>/
  ```

### 6. dev-context.json 갱신

토픽 제거 및 `current_topic` 갱신:
- `topics[<topic>]` 제거
- 남은 active 토픽이 있으면 `current_topic`을 그 중 하나로 설정, 없으면 `null`
- `updatedAt` 갱신

```json
{
  "current_topic": "<다음 active 토픽 또는 null>",
  "topics": {
    // <topic> 제거됨
  }
}
```

### 7. 완료 리포트 출력

```
완료되었습니다: <topic>

  스펙 보존: docs/specs/<topic>.md
  아카이브:  docs/_local/done/<topic>/

  현재 주제: <다음 active 토픽 또는 "없음">
```

남은 active 토픽이 있으면:
```
  다음 토픽으로 전환되었습니다: <다음 active 토픽>
  계속하려면: /dev:impl
```

남은 active 토픽이 없으면:
```
  모든 토픽이 완료되었습니다.
  새 작업을 시작하려면: /dev:spec <topic>
```

## 핵심 원칙

- **current_topic 전용** — `/dev:done`은 항상 `current_topic`에 작동한다. 변경하려면 `/dev:topic switch`를 사용한다.
- **경로는 dev-context.json에서 읽음** — 스펙 경로와 active 디렉토리는 `topics[<topic>].spec`에서 유도하며 하드코딩하지 않는다.
- **스펙 영구 보존** — `docs/specs/<topic>.md`가 영구 참조 문서이며, `done/`은 로컬 아카이브다.
- **`done/`은 git-ignored** — 로컬 참조용이며, `docs/specs/`가 추적 대상이다.
- **검증은 권장, 강제 아님** — `/dev:verify` 미통과 시 경고만 출력하고 차단하지 않는다.
- **실패 동작** — 각 단계는 독립적으로 실행된다. 단계 실패 시 해당 지점에서 중단한다. 이미 완료된 단계(예: 스펙 복사)는 롤백되지 않는다. 문제 해결 후 `/dev:done`을 재실행하면 완료된 단계는 멱등적으로 처리된다.

## 다음 단계

- 보존된 스펙 확인: `docs/specs/<topic>.md`
- 다른 토픽 계속: `/dev:topic`으로 active 목록 확인
- 새 작업 시작: `/dev:spec <new-topic>`
- PR 생성: 스펙 보존됨, 변경사항 준비 완료
