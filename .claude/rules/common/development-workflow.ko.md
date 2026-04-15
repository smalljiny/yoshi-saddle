---
version: 1
---
# 개발 워크플로우

이 규칙은 git-workflow.md의 기능 구현 워크플로우를 확장한다.

## 전체 흐름

```
/dev:topic → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → PR
```

## 단계별 규칙

### 1. 주제 시작 (`/dev:topic`)

- 작업 주제를 명확히 정의하고 `docs/_local/dev-context.json`에 기록
- `docs/_local/<topic>/` 디렉토리 생성 (spec.md, implementation-plan.md 저장)

### 2. 계획 수립 (`/dev:plan`)

- **planner** 에이전트 자동 활성화
- 결과물: `spec.md` (요구사항 + 설계), `implementation-plan.md` (Task 목록)
- 계획 승인 전 구현 금지

### 3. Task 구현 (`/dev:impl`)

Task 1개씩 순서대로 진행:

1. **tdd-specialist** 자동 호출 → RED-GREEN-REFACTOR 사이클
2. 구현 직후 **code-reviewer** 자동 호출 → 즉시 피드백 + 수정
3. 커밋

### 4. 최종 리뷰 (`/dev:review`)

모든 Task 완료 후:
- **code-reviewer** + **security-reviewer** 병렬 실행
- 전체 변경 범위 품질 검토

### 5. 검증 (`/dev:verify`)

PR 전 반드시 통과:
- `build` — 빌드 성공
- `type-check` — 타입 오류 없음
- `lint` — 린트 통과
- `test` — 테스트 통과 (80%+ 커버리지)
- `security` — 보안 스캔 통과

## 문서 생명주기

```
작업 중  →  docs/_local/<topic>/     (git-ignored)
완료 후  →  docs/specs/<topic>.md    (영구 참조 문서)
         →  docs/_local/<topic>/ 삭제
```
