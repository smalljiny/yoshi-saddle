---
version: 2
description: 구현 계획을 수립한다. planner 에이전트를 자동 호출하고 implementation-plan.md를 생성한다.
category: dev-workflow
---

# /dev:plan

스펙 문서에서 구현 계획을 수립하고 `docs/_local/<topic>/implementation-plan.md`에 저장한다.

## 실행 흐름

### 1. 컨텍스트 읽기

`docs/_local/dev-context.json` 읽기:
- `current_topic` 확인
- 주제가 없으면 `/dev:topic <name>` 실행 안내 후 중단

### 2. **planner 에이전트 자동 호출**

다음 내용을 planner 에이전트에 전달:
- 현재 주제 이름
- `$ARGUMENTS`로 전달된 요구사항 설명 (없으면 직접 분석)
- 관련 스펙 문서 경로 (있는 경우)

planner 에이전트가 작성하는 결과물:
- `docs/_local/<topic>/spec.md` — 요구사항 및 설계
- `docs/_local/<topic>/implementation-plan.md` — Task 목록

### 3. 계획 검토

planner 결과를 사용자에게 제시하고 승인 요청.
수정 요청 시 planner 에이전트 재호출.

### 4. dev-context.json 갱신

승인 후:
```json
{
  "topics": {
    "<topic>": {
      "phase": "plan",
      "spec": "docs/_local/<topic>/spec.md",
      "plan": "docs/_local/<topic>/implementation-plan.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

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

- **계획 승인 전 구현 금지**
- 계획은 `docs/_local/` (git-ignored)에 저장
- 완료 후 `/dev:impl`로 Task 1개씩 실행

## 다음 단계

계획 승인 후: `/dev:impl` 로 Task 실행
