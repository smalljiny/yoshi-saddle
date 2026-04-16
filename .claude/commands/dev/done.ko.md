---
version: 2
description: 현재 토픽을 완료 처리한다. 구현된 파일에서 참조 문서를 생성하여 docs/specs/에 저장하고, implementation-plan.md를 done/에 아카이브하고, dev-context.json을 정리한다.
category: dev-workflow
---

# /dev:done

현재 토픽을 완료 처리한다. 구현된 파일을 읽어 참조 문서를 생성하고, 구현 계획을 `done/`에 아카이브하고, `dev-context.json`에서 토픽을 제거한다.

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
- 토픽 이름이 `^[a-zA-Z0-9_-]+$` 패턴과 일치하지 않으면 중단:
  ```
  유효하지 않은 토픽 이름입니다. 영문자, 숫자, 하이픈, 언더스코어만 허용됩니다.
  ```
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

### 4. 참조 문서 생성

구현된 시스템의 현재 상태를 기술하는 참조 문서를 생성한다:

#### 4.1 구현 파일 식별

다음 세 소스에서 변경된 파일을 수집하고 중복을 제거한다:

1. `git diff develop...HEAD --name-only` — 피처 브랜치의 커밋된 변경
2. `git diff --name-only` — 미스테이지(워킹 트리) 변경
3. `git diff --cached --name-only` — 스테이지(인덱스) 변경

세 목록을 합산하고 중복을 제거한다. 이를 통해 커밋 전, 스테이지, 워킹 트리 어느 상태의 파일도 모두 포함된다.

**세 소스 모두 비어 있는 경우** (실제로 변경이 없음):
```
git diff 결과가 비어 있습니다.
베이스 브랜치를 입력하세요 (기본값: develop):
```
사용자가 입력한 브랜치명을 `^[a-zA-Z0-9_/.-]+$` 패턴으로 검증한다.
유효하지 않으면 재입력 요청:
```
유효하지 않은 브랜치명입니다. 영문자, 숫자, 슬래시, 하이픈, 점만 허용됩니다.
```
그 후 브랜치 존재 여부를 확인(`git rev-parse --verify <branch>`); 존재하지 않으면 오류를 출력하고 중단한다.
검증된 브랜치(또는 빈 입력 시 `develop`)로 소스 1만 재실행 후 다시 합산한다.

하네스 파일만 필터링 — 다음 조건에 해당하는 파일만 선별:
- 경로가 `.claude/`로 시작
- 경로가 `.codex/`로 시작
- 경로가 `CLAUDE.md`
- 경로가 `AGENTS.md`

**필터링 후 하네스 파일이 없는 경우**:
```
⚠ 변경된 하네스 파일이 없습니다.
참조 문서 생성을 건너뛰시겠습니까? (y/n)
```
- `y`: `active/<topic>/spec.md` → `docs/specs/<topic>-spec.md`에 복사(fallback 참조 문서)한 뒤 Step 5로 진행
- `n`: 중단

#### 4.2 식별된 파일 읽기

식별된 모든 하네스 파일을 읽어 현재 동작과 구조를 파악한다.

#### 4.3 참조 문서 초안 작성

**현재 시제**("X는 Y를 한다")로 다음 형식에 따라 초안을 작성한다:

```markdown
# <시스템 주제명>

> <한 줄 요약>

## 개요
[시스템이 무엇인지, 어떤 역할을 하는지]

## 구조 / 스키마
[현재 디렉토리 구조, 데이터 형식 등]

## 동작
[명령어, 스킬, 규칙이 어떻게 작동하는지]

## 제약사항
[Non-goals에 해당하는 현재 제약]
```

**포함 금지**: 마이그레이션 가이드, 변경 이력, Open Questions, Before/After 비교.

#### 4.4 파일명 제안

구현된 시스템의 주제를 반영한 명사형 파일명을 제안한다.

예시: `topic-lifecycle.md`, `spec-workflow.md`, `brainstorming-contract.md`

```
참조 문서 파일명을 제안합니다: <suggested-name>.md
이 이름으로 저장하시겠습니까? (y/다른 이름 입력)
```

- `y`: 제안된 이름 사용
- 다른 입력: 입력된 이름을 파일명으로 사용

파일명을 `^[a-zA-Z0-9_-]+\.md$` 패턴으로 검증 — 유효하지 않으면 재입력 요청.

#### 4.5 참조 문서 저장

- `docs/specs/`가 없으면 생성
- `docs/specs/<confirmed-name>.md`가 이미 존재하면:
  ```
  docs/specs/<confirmed-name>.md가 이미 존재합니다.
  덮어쓰시겠습니까? (y/다른 이름 입력)
  ```
  - `y`: 덮어쓰기
  - 다른 입력: 새 이름 사용 (재검증)
- `docs/specs/<confirmed-name>.md`에 초안 저장
- 출력:
  ```
  참조 문서 생성: docs/specs/<confirmed-name>.md
  ```

### 5. done/에 아카이브

구현 계획만 아카이브하고 계획 아티팩트는 삭제한다:

1. 스펙 경로에서 active 디렉토리 유도: `dirname(topics[<topic>].spec)`
2. `docs/_local/done/`이 없으면 생성
3. `docs/_local/done/<topic>/`이 이미 존재하면 `docs/_local/done/<topic>-<yyyyMMddHHmmss>/`로 대체
4. `docs/_local/done/<topic>/` (또는 타임스탬프 변형) 생성
5. `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md` 이동 (파일 없으면 skip — 재진입 안전)
6. `active/<topic>/spec.md`와 `active/<topic>/spec-review-*.md`가 존재하면 삭제 (계획 아티팩트 — 참조 문서로 대체됨)
7. `active/<topic>/` 디렉토리 제거; 예상치 못한 파일이 남아 있으면 사용자에게 확인 후 삭제
8. 출력:
  ```
  아카이브: docs/_local/done/<topic>/
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

참조 문서가 생성된 경우 (Step 4가 정상 완료):
```
완료되었습니다: <topic>

  참조 문서: docs/specs/<confirmed-name>.md
  아카이브:  docs/_local/done/<topic>/

  현재 주제: <다음 active 토픽 또는 "없음">
```

참조 문서 생성을 건너뛴 경우 (Step 4.1에서 하네스 파일 없음, 사용자가 skip 선택 — 스펙 원본 복사):
```
완료되었습니다: <topic>

  참조 문서: docs/specs/<topic>-spec.md (스펙 원본 복사)
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
- **참조 문서 자동 생성** — `docs/specs/<confirmed-name>.md`는 완료 시점에 구현된 파일에서 자동 생성된다; `done/`은 로컬 아카이브다.
- **`done/`은 git-ignored** — 로컬 참조용이며, `docs/specs/`가 추적 대상이다.
- **검증은 권장, 강제 아님** — `/dev:verify` 미통과 시 경고만 출력하고 차단하지 않는다.
- **실패 동작** — 각 단계는 독립적으로 실행된다. 단계 실패 시 해당 지점에서 중단한다. 이미 완료된 단계(예: 참조 문서 생성)는 롤백되지 않는다. 문제 해결 후 `/dev:done`을 재실행하면 Step 4는 기존 파일 덮어쓰기 프롬프트를 통해 재진입 가능하다.

## 다음 단계

- 참조 문서 확인: `docs/specs/<confirmed-name>.md`
- 다른 토픽 계속: `/dev:topic`으로 active 목록 확인
- 새 작업 시작: `/dev:spec <new-topic>`
- PR 생성: 참조 문서 생성됨, 변경사항 준비 완료
