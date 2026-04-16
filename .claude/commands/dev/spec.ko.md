---
version: 2
description: 새 주제의 스펙을 작성한다. brainstorming 스킬로 스펙 초안을 작성하고, Codex 리뷰 루프를 실행하고, 계획 수립 전 스펙을 확정한다.
category: dev-workflow
---

# /dev:spec

작업 주제의 스펙 문서를 작성하고 Codex 리뷰를 통해 확정한 뒤, 계획 수립 단계로 넘어간다.

## 사용법

```
/dev:spec <topic>    새 주제 시작 및 스펙 작성
/dev:spec            현재 주제의 스펙 작업 이어서 진행
```

## 실행 흐름

### 1. 주제 확인

`$ARGUMENTS`가 있으면:
- `<topic>`으로 사용

인자가 없으면:
- `docs/_local/backlog/` 디렉토리에서 기존 주제 스캔
- 주제가 하나이면 자동으로 사용
- 주제가 여러 개이면 목록을 표시하고 중단:
  ```
  백로그에 여러 주제가 있습니다. 주제를 지정하세요: /dev:spec <topic>
  ```
- 주제가 없으면 안내 메시지 출력 후 중단:
  ```
  주제를 지정하세요: /dev:spec <topic>
  ```

**현재 상태를 감지하여 적절한 단계로 이동:**

| 상태 | 처리 |
|------|------|
| `docs/_local/backlog/<topic>/`이 존재 + READY 결정의 `spec-review-*.md` 존재 | "스펙이 이미 확정되었습니다." 안내 후 6단계로 이동 |
| `docs/_local/backlog/<topic>/`이 존재 + NOT READY 결정의 `spec-review-*.md` 존재 | 5단계로 이동 (기존 리뷰 반영) |
| `docs/_local/backlog/<topic>/spec.md` 존재 + 리뷰 없음 | 4단계로 이동 (Codex 리뷰 요청) |
| `docs/_local/backlog/<topic>/`이 없음 | 2단계부터 시작 (정상 흐름) |

### 2. 작업 디렉토리 준비

- `docs/_local/backlog/<topic>/`이 없으면 생성

### 3. 스펙 초안 작성

`.claude/skills/brainstorming/SKILL.md`를 로드하고 프로세스에 따라 스펙 초안을 작성한다.

- 한 번에 하나씩 질문하며 주제 파악
- 필요한 경우 2~3가지 접근방식 제안
- 200~300단어 섹션 단위로 스펙 제시, 각 섹션마다 검증
- 완성된 초안을 `docs/_local/backlog/<topic>/spec.md`에 저장

### 4. Codex 리뷰 요청

초안 저장 후 사용자에게 안내:

```
스펙 초안이 작성되었습니다: docs/_local/backlog/<topic>/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/backlog/<topic>/spec.md를 리뷰해줘"

리뷰 완료 후 spec-review-*.md 파일이 생성되면 다시 /dev:spec을 실행하세요.
```

사용자가 Codex를 실행하고 돌아올 때까지 대기한다.

### 5. 리뷰 반영

사용자가 Codex 리뷰 후 돌아오면:

- `docs/_local/backlog/<topic>/spec-review-*.md` 중 최신 파일을 찾아 읽기
- 리뷰 결과에 따라:
  - `NOT READY`인 경우:
    - Required Fixes를 `spec.md`에 전부 반영
    - 4단계로 돌아가 Codex 재리뷰 요청
  - `READY` 또는 `READY WITH NOTE`인 경우:
    - Notes가 있으면 적절히 반영
    - 6단계로 진행

### 6. 스펙 확정

확정 안내:

```
스펙이 확정되었습니다.
  스펙: docs/_local/backlog/<topic>/spec.md
  리뷰: docs/_local/backlog/<topic>/spec-review-<timestamp>.md
```

### 7. 분할 여부 질문

스펙 분할 여부를 사용자에게 질문한다:

```
이 스펙을 분할할까요?
  1. 단일 스펙으로 진행
  2. 분할 필요 (주제와 분할 기준을 알려주세요)
```

- 단일인 경우: 다음 단계 안내
  ```
  다음: /dev:plan 또는 /dev:plan <topic> 으로 구현 계획을 수립하세요.
  ```
- 분할인 경우: 서브 주제 정의를 도운 뒤 각각 `/dev:spec <sub-topic>` 실행

## 핵심 원칙

- **주제 등록 미포함** — `/dev:spec`은 `dev-context.json`에 주제를 등록하지 않는다. 등록은 `/dev:plan`에서 처리한다.
- **스펙은 backlog/에 저장** — 스펙은 `docs/_local/backlog/<topic>/`에 생성되고, `/dev:plan`이 `active/`로 이동하기 전까지 이 위치를 유지한다.
- **리뷰 루프는 통과 시까지 반복** — NOT READY 결과로는 스펙 확정 불가
- **Codex 핸드오프는 수동** — Claude가 Codex를 직접 호출할 수 없으므로 사용자가 `codex` 명령 실행
- **dev-context.json 접근 없음** — `/dev:spec`은 `dev-context.json`을 읽거나 쓰지 않는다
