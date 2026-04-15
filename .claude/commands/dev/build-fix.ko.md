---
version: 2
description: 빌드 오류를 단계적으로 해결한다. build-error-resolver 에이전트를 호출한다.
category: dev-workflow
---

# /dev:build-fix

빌드 실패, 타입 오류, 린트 오류를 해결한다.

## 실행 흐름

### 1. 오류 파악

```bash
# 타입 오류
pnpm tsc --noEmit 2>&1

# 빌드 오류
pnpm build 2>&1

# 린트 오류
pnpm lint 2>&1
```

### 2. **build-error-resolver 에이전트 자동 호출**

전체 오류 메시지를 에이전트에 전달.
에이전트가 오류 분류 및 수정 방법 제안.

### 3. 수정 적용

에이전트 제안 수용 후 수정 적용.
`any` 타입으로 우회 금지 — 근본 원인 해결.

### 4. 검증

```bash
pnpm tsc --noEmit && pnpm build && pnpm test
```

모두 통과할 때까지 반복.

## 다음 단계

빌드 성공 후: `/dev:verify` 로 전체 게이트 확인
