---
version: 2
name: verification-loop
description: PR 전 또는 기능 완료 후 코드 품질 게이트를 순서대로 통과한다. /dev:verify 명령어와 함께 사용.
origin: harness
category: dev-process
---

## 언제 활성화하나

- `/dev:verify` 명령어 실행 시
- PR을 올리기 전
- 기능 구현이 완료됐다고 판단될 때
- CI/CD 파이프라인 로컬 사전 확인 시

## 검증 게이트 순서

게이트는 순서대로 실행한다. 하나라도 실패하면 다음으로 넘어가지 않는다.

```
[1] build → [2] type-check → [3] lint → [4] test → [5] security
```

### 게이트 1: 빌드

```bash
pnpm build
```

실패 시: `build-error-resolver` 에이전트 호출

### 게이트 2: 타입 체크

```bash
pnpm tsc --noEmit
```

실패 시: `build-error-resolver` 에이전트 호출

`any` 타입으로 우회하지 않는다. 근본 원인 해결.

### 게이트 3: 린트

```bash
pnpm lint
```

자동 수정 가능한 오류는 먼저 수정:
```bash
pnpm lint --fix
```

### 게이트 4: 테스트 및 커버리지

```bash
pnpm test
pnpm test:coverage
```

- 모든 테스트 통과
- 커버리지 80% 이상

커버리지 미달 시: 누락된 테스트 추가 후 재실행

### 게이트 5: 보안 스캔

```bash
pnpm audit
```

CRITICAL, HIGH 취약점 발견 시: `security-reviewer` 에이전트 호출

## 결과 출력 형식

```
검증 결과
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ build        통과
✅ type-check   통과
✅ lint         통과
✅ test         통과 (커버리지: 87%)
✅ security     통과 (취약점: 0개)
━━━━━━━━━━━━━━━━━━━━━━━━━
모든 게이트 통과 — PR을 올려도 됩니다.
```

또는:

```
검증 결과
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ build        통과
❌ type-check   실패
━━━━━━━━━━━━━━━━━━━━━━━━━
오류:
  src/user.ts:34 - Type 'string' is not assignable to type 'number'

build-error-resolver 에이전트를 호출합니다...
```

## 원칙

1. **순서 준수**: 빌드 → 타입 → 린트 → 테스트 → 보안 순서로 실행
2. **우회 금지**: 게이트 실패를 무시하거나 우회하지 않는다
3. **근본 원인 해결**: `any` 타입, `eslint-disable` 주석으로 억압하지 않는다
4. **전체 통과 후 PR**: 모든 게이트가 통과해야 PR을 올린다
