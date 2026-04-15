---
version: 2
---
# 개발 워크플로우

이 규칙은 git-workflow.md의 기능 구현 워크플로우를 확장한다.

## 전체 흐름

```
/dev:spec → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → PR
```

## 단계별 규칙

### 1. 스펙 작성 (`/dev:spec`)

- `/dev:spec <topic>`으로 새 주제 시작 — 별도로 `/dev:topic`을 실행할 필요 없음
- brainstorming 스킬을 로드하여 대화형으로 스펙 초안 작성
- 초안을 `docs/_local/tmp/<topic>/spec.md`에 저장
- READY가 될 때까지 Codex 리뷰 루프 실행: `codex "spec-review 스킬로 spec.md를 리뷰해줘"`
- 진행 전 스펙 확정 (`dev-context.json`에 `specConfirmed: true` 설정)

### 2. 계획 수립 (`/dev:plan`)

- `specConfirmed: true` 필수 — 확정된 스펙 없이 실행 불가
- **planner** 에이전트가 확정된 스펙을 입력으로 자동 활성화
- 결과물: `implementation-plan.md` (Task 목록만 — 스펙은 이미 확정됨)
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

## 주제 관리

```
/dev:topic                   현재 주제와 단계 확인
/dev:topic switch <name>     다른 주제로 전환
```

주제 등록은 `/dev:spec <topic>`이 처리한다. `/dev:topic <name>`을 직접 실행하는 방식은 더 이상 사용하지 않는다.

## 문서 생명주기

```
스펙 초안  →  docs/_local/tmp/<topic>/spec.md    (git-ignored, 이 위치에 유지)
스펙 확정  →  dev-context.json에 specConfirmed: true
           →  spec.md는 tmp/에 그대로 유지 — /dev:plan이 dev-context.json에서 경로를 읽음
계획       →  docs/_local/<topic>/implementation-plan.md  (git-ignored)
완료 후    →  docs/specs/<topic>.md    (영구 참조 문서)
           →  docs/_local/<topic>/ 삭제
```
