---
version: 4
---
# 개발 워크플로우

이 규칙은 git-workflow.md의 기능 구현 워크플로우를 확장한다.

## 전체 흐름

```
/dev:spec → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → /dev:done → PR
```

## 단계별 규칙

### 1. 스펙 작성 (`/dev:spec`)

- `/dev:spec <topic>`으로 새 주제 시작 — 별도로 `/dev:topic`을 실행할 필요 없음
- brainstorming 스킬을 로드하여 대화형으로 스펙 초안 작성
- 초안을 `docs/_local/backlog/<topic>/spec.md`에 저장
- READY가 될 때까지 Codex 리뷰 루프 실행: `codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"`
- 최신 `spec-review-*.md`의 결정이 `READY` 또는 `READY WITH NOTE`이면 스펙 확정
- `/dev:spec`은 `dev-context.json`에 **쓰지 않는다** — 등록은 `/dev:plan`에서 처리

### 2. 계획 수립 (`/dev:plan`)

- 토픽 인자로 실행하거나 backlog 목록에서 선택:
  - `/dev:plan <topic>` — 특정 backlog 토픽을 직접 지정
  - `/dev:plan` — backlog 목록을 표시하고 선택
- `backlog/<topic>/` → `active/<topic>/` 이동
- `dev-context.json`에 토픽 등록 및 `current_topic` 설정
- `current_topic`이 이미 다른 토픽이면 전환 전 확인 요청
- **planner** 에이전트가 `docs/_local/active/<topic>/spec.md`를 입력으로 자동 활성화
- 결과물: `docs/_local/active/<topic>/implementation-plan.md`
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

완료 전 반드시 통과:
- `build` — 빌드 성공
- `type-check` — 타입 오류 없음
- `lint` — 린트 통과
- `test` — 테스트 통과 (80%+ 커버리지)
- `security` — 보안 스캔 통과

### 6. 완료 (`/dev:done`)

검증 통과 후:
- `git diff` 베이스 브랜치 기준 (기본값: `develop`)으로 구현된 하네스 파일을 읽고 참조 문서를 생성 → `docs/specs/<confirmed-name>.md` (영구 보존)
- `implementation-plan.md`를 `docs/_local/done/<topic>/`에 아카이브; `spec.md`와 `spec-review-*.md`는 삭제 (계획 아티팩트)
- `dev-context.json`에서 토픽 제거
- `current_topic`을 다음 active 토픽으로 전환 (없으면 null)

## 주제 관리

```
/dev:topic                   현재 active 토픽과 backlog 목록 확인
/dev:topic switch <name>     다른 active 토픽으로 전환 (backlog 토픽은 /dev:plan 필요)
```

주제 등록은 `/dev:plan`이 처리한다. `/dev:topic <name>`을 직접 실행하는 방식은 더 이상 사용하지 않는다.

## 문서 생명주기

```
스펙 초안  →  docs/_local/backlog/<topic>/spec.md      (git-ignored)
              spec-review-*.md 리뷰 파일도 이 위치에 저장

플랜 수립  →  docs/_local/active/<topic>/              (backlog/에서 이동)
              implementation-plan.md 생성
              dev-context.json에 토픽 등록

구현 중    →  docs/_local/active/<topic>/              (git-ignored)

완료       →  docs/specs/<confirmed-name>.md            (git-tracked, 참조 문서 자동 생성)
              docs/_local/done/<topic>/                (git-ignored, implementation-plan.md만 보존)
              dev-context.json에서 토픽 제거
```
