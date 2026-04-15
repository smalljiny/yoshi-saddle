---
version: 1
---
# 테스트 규칙

## 최소 커버리지: 80%

## 필수 테스트 유형

1. **단위 테스트** — 개별 함수, 유틸리티, 컴포넌트
2. **통합 테스트** — API 엔드포인트, 데이터베이스 연산
3. **E2E 테스트** — 핵심 사용자 흐름

## 테스트 주도 개발 (MANDATORY)

```
1. 테스트 먼저 작성 (RED)
2. 테스트 실행 → 반드시 실패해야 한다
3. 최소한의 구현 작성 (GREEN)
4. 테스트 실행 → 반드시 통과해야 한다
5. 리팩토링 (REFACTOR)
6. 커버리지 확인 (80%+)
```

테스트가 먼저 실패하는 것을 확인하지 않으면 테스트가 실제로 동작을 검증하는지 알 수 없다.

## 에이전트 지원

- **tdd-specialist** — 새 피처와 버그 수정 시 선제적으로 활용

## 테스트 파일 패턴 (TypeScript)

```
src/
├── foo.ts
└── foo.test.ts        # 단위 테스트 (같은 위치)

tests/
├── integration/       # 통합 테스트
└── e2e/              # E2E 테스트
```

## 테스트 실패 트러블슈팅

1. **tdd-specialist** 에이전트 활용
2. 테스트 격리 확인
3. mock이 올바른지 검증
4. 테스트가 잘못된 게 아니라면 구현을 수정 (테스트 수정 금지)

## Vitest 기본 패턴

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('MyService', () => {
  let service: MyService

  beforeEach(() => {
    service = new MyService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should do something specific', async () => {
    // Arrange
    const input = { ... }

    // Act
    const result = await service.doSomething(input)

    // Assert
    expect(result).toEqual({ ... })
  })
})
```

## Mock 작성 원칙

- 외부 서비스, I/O, 시간 의존성만 mock
- 비즈니스 로직은 mock하지 않는다
- 테스트 간 mock 상태 공유 금지 (`afterEach`에서 `vi.clearAllMocks()`)
