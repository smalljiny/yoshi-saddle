---
version: 4
description: 확정된 스펙에서 구현 계획을 수립한다. backlog에서 active로 이동하고, dev-context.json에 등록하고, planner 에이전트를 자동 호출하고 implementation-plan.md를 생성한다.
category: dev-workflow
---

# /dev:plan

확정된 스펙 문서에서 구현 계획을 수립하고 `docs/_local/active/<topic>/implementation-plan.md`에 저장한다.

## 사용법

```
/dev:plan            backlog 토픽 목록을 표시하고 선택
/dev:plan <topic>    특정 backlog 토픽을 직접 지정하여 계획 수립
```

## 실행 흐름

### 1. 주제 확인

`$ARGUMENTS`가 있으면:
- `<topic>`으로 사용
- `docs/_local/backlog/<topic>/`이 존재하는지 확인 — 없으면 중단:
  ```
  '<topic>'이 backlog에 없습니다.
  먼저 /dev:spec <topic>으로 스펙을 작성하세요.
  ```

인자가 없으면:
- `docs/_local/backlog/` 디렉토리에서 주제 스캔
- 비어 있으면 중단:
  ```
  플랜할 토픽이 없습니다. 먼저 /dev:spec <topic>을 실행하세요.
  ```
- 주제가 하나이면 자동으로 사용
- 여러 개이면 목록을 표시하고 선택 요청:
  ```
  백로그 토픽 목록:
    1. <topic-a>
    2. <topic-b>
  플랜할 토픽 번호를 선택하세요:
  ```

### 2. 스펙 확정 여부 확인

스펙이 계획 수립 준비가 되었는지 확인:
- `docs/_local/backlog/<topic>/spec.md` 존재 확인 — 없으면 중단:
  ```
  스펙 파일이 없습니다. 먼저 /dev:spec <topic>을 실행하세요.
  ```
- `docs/_local/backlog/<topic>/spec-review-*.md` 중 최신 파일 찾기 (파일명 내림차순 정렬)
- 리뷰 파일이 없거나 결정이 `READY` 또는 `READY WITH NOTE`가 아니면 중단:
  ```
  확정된 스펙이 없습니다.
  먼저 /dev:spec <topic>을 실행하여 Codex 리뷰를 통과하세요.
  ```

### 3. active로 이동

backlog에서 active로 디렉토리 이동:
- `docs/_local/active/<topic>/`이 이미 존재하면 중단:
  ```
  '<topic>'이 이미 active 상태입니다.
  /dev:topic switch <topic>으로 전환하거나 /dev:impl로 구현을 계속하세요.
  ```
- `docs/_local/backlog/<topic>/` → `docs/_local/active/<topic>/` 이동

### 4. planner 에이전트 자동 호출

다음 내용을 planner 에이전트에 전달:
- 현재 주제 이름
- 확정된 스펙 경로: `docs/_local/active/<topic>/spec.md`

planner 에이전트가 작성하는 결과물 **에만**:
- `docs/_local/active/<topic>/implementation-plan.md` — Task 목록

스펙 문서는 이미 확정되었으며 수정하지 않는다.

### 5. 계획 검토

planner 결과를 사용자에게 제시하고 승인 요청.
수정 요청 시 planner 에이전트 재호출.

### 6. dev-context.json 갱신

승인 후:

- `current_topic`이 이미 다른 주제로 설정되어 있으면 전환 여부 확인:
  ```
  현재 작업 중인 토픽: <current_topic>
  <topic>으로 전환하시겠습니까? (y/n)
  ```
  - `y`: `current_topic`을 `<topic>`으로 설정
  - `n`: 기존 `current_topic` 유지, `<topic>`은 topics에만 등록

`dev-context.json`에 토픽 등록 (`current_topic`은 확인 결과에 따라 설정):

```json
{
  "current_topic": "<topic 또는 기존 값>",
  "topics": {
    "<topic>": {
      "phase": "plan",
      "spec": "docs/_local/active/<topic>/spec.md",
      "specConfirmed": true,
      "specReview": "docs/_local/active/<topic>/spec-review-<yymmddhhmmss>.md",
      "plan": "docs/_local/active/<topic>/implementation-plan.md",
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

참고: `specConfirmed`는 리뷰 결과를 반영하는 편의 필드이다. `/dev:plan`의 게이트는 `spec-review-*.md` Decision 확인 방식을 사용하며 이 필드를 게이트로 사용하지 않는다.

## 계획 문서 형식

```markdown
# 구현 계획: <주제명>

## 개요
[요약]

## Task 목록

### [ ] Task 1: <제목>
- **유형**: tdd | config | infra | refactor
- **목표**: [이 Task가 달성하는 것]
- **작업 항목**:
  - [ ] 항목 1
- **완료 기준**:
  - [ ] 기준 1

### [ ] Task 2: ...
```

## 중요 원칙

- **스펙 READY 필수** — `backlog/<topic>/`의 `spec-review-*.md`가 `READY` 또는 `READY WITH NOTE` 결정이어야 함
- **planner는 스펙을 읽고 수정하지 않는다** — 이동 후 스펙 경로는 `docs/_local/active/<topic>/spec.md`
- **backlog → active는 불가역** — 디렉토리 이동은 planner 호출 전 발생. planner 실패 시 디렉토리는 `active/`에 남음
- **계획은 `docs/_local/active/`에 저장** (git-ignored)
- 완료 후 `/dev:impl`로 Task 1개씩 실행

## 다음 단계

계획 승인 후: `/dev:impl`로 Task 실행
