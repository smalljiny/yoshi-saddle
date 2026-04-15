---
version: 1
description: 새 주제의 스펙을 작성한다. 주제를 등록하고, brainstorming 스킬로 스펙 초안을 작성하고, Codex 리뷰 루프를 실행하고, 계획 수립 전 스펙을 확정한다.
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
- `docs/_local/dev-context.json`에 topic 초기화 (아래 스키마 참고)

인자가 없으면:
- `docs/_local/dev-context.json`에서 `current_topic` 읽기
- 없으면 안내 메시지 출력 후 중단:
  ```
  주제를 지정하세요: /dev:spec <topic>
  ```

**현재 상태를 감지하여 적절한 단계로 이동:**

| 상태 | 처리 |
|------|------|
| `specConfirmed: true` | "스펙이 이미 확정되었습니다." 안내 후 8단계로 이동 |
| `review-*.md` 존재 + `specConfirmed: false` | 6단계로 이동 (기존 리뷰 반영) |
| `spec.md` 존재 + 리뷰 없음 | 5단계로 이동 (Codex 리뷰 요청) |
| `spec.md` 없음 | 2단계부터 시작 (정상 흐름) |

### 2. 작업 디렉토리 준비

- `docs/_local/tmp/<topic>/`이 없으면 생성

### 3. dev-context.json 초기화

`docs/_local/dev-context.json` 생성 또는 갱신:

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "spec",
      "spec": "docs/_local/tmp/<topic>/spec.md",
      "specConfirmed": false,
      "specReview": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

topic이 이미 존재하면:
- `updatedAt` 갱신
- `phase`를 `"spec"`으로, `specConfirmed`를 `false`로 리셋
- 나머지 필드(`plan`, `currentTask` 등)는 보존
- `specConfirmed`가 이미 `true`인 경우 리셋 전 사용자에게 경고:
  ```
  이미 확정된 스펙이 있습니다. 다시 작성하면 specConfirmed가 초기화됩니다.
  계속하시겠습니까? (y/n)
  ```

### 4. 스펙 초안 작성

`.claude/skills/brainstorming/SKILL.md`를 로드하고 프로세스에 따라 스펙 초안을 작성한다.

- 한 번에 하나씩 질문하며 주제 파악
- 필요한 경우 2~3가지 접근방식 제안
- 200~300단어 섹션 단위로 스펙 제시, 각 섹션마다 검증
- 완성된 초안을 `docs/_local/tmp/<topic>/spec.md`에 저장

### 5. Codex 리뷰 요청

초안 저장 후 사용자에게 안내:

```
스펙 초안이 작성되었습니다: docs/_local/tmp/<topic>/spec.md

Codex 리뷰를 실행하세요:
  codex "spec-review 스킬로 docs/_local/tmp/<topic>/spec.md를 리뷰해줘"

리뷰 완료 후 review-*.md 파일이 생성되면 다시 /dev:spec을 실행하세요.
```

사용자가 Codex를 실행하고 돌아올 때까지 대기한다.

### 6. 리뷰 반영

사용자가 Codex 리뷰 후 돌아오면:

- `docs/_local/tmp/<topic>/review-*.md` 중 최신 파일을 찾아 읽기
- 리뷰 결과에 따라:
  - `NOT READY`인 경우:
    - Required Fixes를 `spec.md`에 전부 반영
    - `dev-context.json`의 `specReview`를 해당 보고서 경로로 갱신
    - 5단계로 돌아가 Codex 재리뷰 요청
  - `READY` 또는 `READY WITH NOTE`인 경우:
    - Notes가 있으면 적절히 반영
    - 7단계로 진행

### 7. 스펙 확정

`dev-context.json` 갱신:

```json
{
  "topics": {
    "<topic>": {
      "specConfirmed": true,
      "specReview": "docs/_local/tmp/<topic>/review-<yymmddhhmmss>.md",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

확정 안내:

```
스펙이 확정되었습니다.
  스펙: docs/_local/tmp/<topic>/spec.md
  리뷰: docs/_local/tmp/<topic>/review-<timestamp>.md
```

### 8. 분할 여부 질문

스펙 분할 여부를 사용자에게 질문한다:

```
이 스펙을 분할할까요?
  1. 단일 스펙으로 진행
  2. 분할 필요 (주제와 분할 기준을 알려주세요)
```

- 단일인 경우: 다음 단계 안내
  ```
  다음: /dev:plan 으로 구현 계획을 수립하세요.
  ```
- 분할인 경우: 서브 주제 정의를 도운 뒤 각각 `/dev:spec <sub-topic>` 실행

## 핵심 원칙

- **주제 등록 포함** — `/dev:topic <name>`을 별도로 실행할 필요 없음
- **리뷰 루프는 통과 시까지 반복** — NOT READY 결과로는 스펙 확정 불가
- **Codex 핸드오프는 수동** — Claude가 Codex를 직접 호출할 수 없으므로 사용자가 `codex` 명령 실행
- **specConfirmed가 /dev:plan을 게이팅** — `specConfirmed: true` 없이 `/dev:plan` 실행 불가 (게이트는 `/dev:plan`에서 시행, `.claude/commands/dev/plan.md` 참고)
- **스펙 경로는 tmp/에 유지** — `/dev:plan`이 `dev-context.json`에서 스펙 경로를 읽으므로 스펙은 `docs/_local/tmp/<topic>/spec.md`에 그대로 남음
