---
version: 3
description: 현재 주제와 단계를 확인하거나 다른 주제로 전환한다. 주제 등록은 /dev:spec이 처리한다.
category: dev-workflow
---

# /dev:topic

현재 작업 주제와 단계를 확인하거나 주제를 전환한다.

주제 등록은 더 이상 별도 단계가 아니다 — 새 주제를 시작하고 스펙을 작성하려면 `/dev:spec <topic>`을 사용한다.

## 사용법

```
/dev:topic                   현재 주제와 단계 확인
/dev:topic switch <name>     다른 주제로 전환
/dev:topic <name>            ⚠ 더 이상 사용하지 않음 — /dev:spec <name> 사용
```

## 실행 흐름

### 인자 없음 — 현재 주제 확인

1. `docs/_local/dev-context.json` 읽기
2. 현재 주제와 단계 출력:
   ```
   현재 주제: <topic>
   단계: <phase>
   스펙 확정: <specConfirmed>
   ```
3. 주제가 없으면:
   ```
   진행 중인 주제가 없습니다.
   새 주제를 시작하려면: /dev:spec <topic>
   ```

### `/dev:topic switch <name>` — 주제 전환

1. `dev-context.json`에서 `<name>` 주제가 존재하는지 확인
   - 없으면: 사용 가능한 주제 목록을 표시하고 중단
2. `current_topic`을 `<name>`으로 변경하고 저장

### `/dev:topic <name>` — 더 이상 사용하지 않음

안내 메시지를 표시하고 중단:

```
⚠ /dev:topic <name>으로 주제를 등록하는 방식은 더 이상 사용하지 않습니다.
스펙 작성과 주제 등록을 함께 시작하려면:
  /dev:spec <name>
```

## 다음 단계

- 새 주제 시작: `/dev:spec <topic>`
- 계획 수립으로 계속: `/dev:plan` (확정된 스펙 필요)
