---
version: 2
description: 새 작업 주제를 시작하거나 현재 주제를 관리한다. dev-context.json을 읽고 쓴다.
category: dev-workflow
---

# /dev:topic

작업 주제를 시작하고 `docs/_local/dev-context.json`에 기록한다.

## 사용법

```
/dev:topic <name>       새 주제 시작
/dev:topic              현재 주제 확인
/dev:topic switch <name>  다른 주제로 전환
```

## 실행 흐름

### 인자 없음 — 현재 주제 확인

1. `docs/_local/dev-context.json` 읽기
2. 현재 주제와 phase 출력
3. 주제가 없으면 "/dev:topic <name> 으로 시작하세요" 안내

### `/dev:topic <name>` — 새 주제 시작

1. `docs/_local/dev-context.json` 읽기 (없으면 빈 구조로 초기화)
2. `docs/_local/<name>/` 디렉토리 생성
3. `dev-context.json` 갱신:

```json
{
  "current_topic": "<name>",
  "topics": {
    "<name>": {
      "phase": "topic",
      "spec": null,
      "plan": null,
      "currentTask": null,
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

4. 다음 단계 안내:
```
주제 '<name>' 시작됨.
다음: /dev:plan 으로 구현 계획을 수립하세요.
```

### `/dev:topic switch <name>` — 주제 전환

1. `dev-context.json`에서 `<name>` 주제가 있는지 확인
2. `current_topic` 변경 및 저장

## 다음 단계

주제 시작 후: `/dev:plan`으로 계획 수립
