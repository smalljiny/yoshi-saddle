---
version: 3
description: 확정된 스펙에서 구현 계획을 수립한다. planner 에이전트를 자동 호출하고 implementation-plan.md를 생성한다.
category: dev-workflow
---

# /dev:plan

확정된 스펙 문서에서 구현 계획을 수립하고 `docs/_local/<topic>/implementation-plan.md`에 저장한다.

## 실행 흐름

### 1. 컨텍스트 읽기

`docs/_local/dev-context.json` 읽기:
- `current_topic` 확인
- 주제가 없으면 안내 후 중단:
  ```
  진행 중인 주제가 없습니다.
  새 주제를 시작하려면: /dev:spec <topic>
  ```

### 2. 스펙 확정 여부 확인

`topics[current_topic].specConfirmed` 읽기:
- `false` 또는 없으면 중단:
  ```
  확정된 스펙이 없습니다.
  먼저 /dev:spec을 실행하여 스펙을 작성하고 확정하세요.
  ```
- `true`이면 `topics[current_topic].spec`에서 스펙 경로 읽기

### 3. **planner 에이전트 자동 호출**

다음 내용을 planner 에이전트에 전달:
- 현재 주제 이름
- `dev-context.json`에서 resolve한 확정 스펙 경로
- `$ARGUMENTS`로 전달된 추가 요구사항 (있는 경우)

planner 에이전트가 작성하는 결과물 **에만**:
- `docs/_local/<topic>/implementation-plan.md` — Task 목록

스펙 문서는 이미 확정되었으며 수정하지 않는다.

### 4. 계획 검토

planner 결과를 사용자에게 제시하고 승인 요청.
수정 요청 시 planner 에이전트 재호출.

### 5. dev-context.json 갱신

승인 후:
```json
{
  "topics": {
    "<topic>": {
      "phase": "plan",
      "spec": "docs/_local/tmp/<topic>/spec.md",
      "plan": "docs/_local/<topic>/implementation-plan.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

참고: `spec` 필드는 기존 값을 그대로 유지 — `/dev:spec`이 설정한 경로를 덮어쓰지 않는다.

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

- **스펙 확정 필수** — `specConfirmed: true` 없이 `/dev:plan` 실행 불가
- **planner는 스펙을 읽고 수정하지 않는다** — 스펙 경로는 `dev-context.json`에서 읽음
- **계획은 `docs/_local/`에 저장** (git-ignored)
- 완료 후 `/dev:impl`로 Task 1개씩 실행

## 다음 단계

계획 승인 후: `/dev:impl`로 Task 실행
