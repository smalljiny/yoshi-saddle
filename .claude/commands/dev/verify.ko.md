---
version: 2
description: PR 전 전체 검증 게이트를 실행한다. build, type-check, lint, test, security를 순서대로 확인한다.
category: dev-workflow
---

# /dev:verify

PR 전 모든 검증 게이트를 통과해야 한다.

## 실행 흐름

각 게이트를 순서대로 실행하고, 실패하면 즉시 중단:

### 게이트 1: 빌드

```bash
pnpm build
# 또는
npm run build
```

실패 시 → `build-error-resolver` 에이전트 자동 호출

### 게이트 2: 타입 체크

```bash
pnpm tsc --noEmit
# 또는
npx tsc --noEmit
```

실패 시 → `build-error-resolver` 에이전트 자동 호출

### 게이트 3: 린트

```bash
pnpm lint
# 또는
npx eslint .
```

자동 수정 시도:
```bash
pnpm lint --fix
```

### 게이트 4: 테스트

```bash
pnpm test
pnpm test:coverage
```

커버리지 80% 미만이면 실패로 처리.

### 게이트 5: 보안 스캔

```bash
# 의존성 취약점 검사
pnpm audit
# 또는
npm audit
```

CRITICAL, HIGH 취약점 발견 시 → `security-reviewer` 에이전트 자동 호출

## 결과 보고

```
검증 완료

✅ build        통과
✅ type-check   통과
✅ lint         통과
✅ test         통과 (커버리지: X%)
✅ security     통과

PR을 올려도 됩니다.
```

또는:

```
검증 실패

✅ build        통과
❌ type-check   실패 — [오류 메시지]

build-error-resolver 에이전트를 실행합니다...
```

## 다음 단계

모든 게이트 통과 후: `git push` → PR 생성
