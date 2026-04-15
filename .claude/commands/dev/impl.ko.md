---
version: 2
description: 구현 계획에서 단일 Task를 실행한다. tdd-specialist와 code-reviewer를 자동 호출한다. Task 1개 완료 후 중단한다.
category: dev-workflow
---

# /dev:impl

구현 계획의 Task를 하나씩 실행한다.

## 사용법

```
/dev:impl               다음 미완료 Task 자동 선택
/dev:impl "Task 1"      특정 Task 이름으로 실행
/dev:impl T2            Task ID로 실행
```

## 실행 흐름

### 1. 컨텍스트 및 계획 읽기

1. `docs/_local/dev-context.json`에서 현재 주제와 계획 경로 확인
2. `implementation-plan.md`에서 실행할 Task 결정:
   - 명시적 인자 → 해당 Task
   - `currentTask` → 컨텍스트의 Task
   - 없으면 → 첫 번째 미완료 `[ ]` Task

### 2. Task 상세 파악

계획 문서에서 추출:
- **유형**: tdd, config, infra, refactor
- **목표**: 달성할 것
- **작업 항목**: 체크리스트
- **완료 기준**: 검증 기준

### 3. **사전 작업 브리핑 및 승인**

구현 시작 전, 사용자에게 작업 계획 제시:

```
---
## 사전 브리핑: [Task ID] [Task명]

### Task 개요
- 유형: [tdd / config / infra / refactor]
- 목표: [달성할 것]

### 작업 계획
1. [순서대로 할 것 1]
2. [순서대로 할 것 2]

### 영향받는 파일
- `path/to/file.ts` — [변경 내용]
- `path/to/new-file.ts` — [NEW] [목적]

### 주의사항
- [잠재적 이슈]
---
```

승인 없이 구현 시작 금지.

### 4. **tdd-specialist 에이전트 자동 호출** (유형: tdd)

- 실패하는 테스트 작성 (RED)
- 테스트 실패 확인
- 최소한의 구현 (GREEN)
- 테스트 통과 확인
- 리팩토링 (REFACTOR)
- 커버리지 확인

유형이 `config`, `infra`, `refactor`인 경우:
- `config`: 설정 파일 변경 및 검증
- `infra`: 인프라 변경 및 문서화
- `refactor`: 테스트 보장 후 구조 개선

### 5. **code-reviewer 에이전트 자동 호출** (구현 직후)

해당 Task 코드를 즉시 리뷰:
- 품질 검토
- 즉시 피드백 + 수정

### 6. 완료 기준 검증

계획 문서의 완료 기준 확인.

### 7. 계획 문서 갱신

완료된 Task 마킹:
- `[ ]` → `[x]`

### 8. dev-context.json 갱신

```json
{
  "topics": {
    "<topic>": {
      "phase": "impl",
      "currentTask": "<next-task-id>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

### 9. **Task 완료 브리핑 후 중단**

```
---
## Task 완료: [Task ID] [Task명]

### 작업 요약
- [구현/변경 내용]
- [생성/수정된 파일 목록]

### 테스트 결과
- 테스트: PASS ([X]개 통과)
- 커버리지: [X]%

### 다음 Task
- [다음 미완료 Task ID 및 이름]
- /dev:impl 로 계속하세요.
---
```

**브리핑 출력 후 즉시 중단. 다음 Task를 자동으로 시작하지 않는다.**

## 중요 원칙

- **Task 1개씩** — 1회 호출로 1개 Task만 실행
- **사전 승인 필수** — 작업 계획 승인 없이 구현 시작 금지
- **TDD 강제** — `tdd` 유형은 반드시 테스트 먼저
- **즉시 리뷰** — 구현 직후 code-reviewer 자동 호출

## 다음 단계

모든 Task 완료 후: `/dev:review` 로 최종 전체 리뷰
