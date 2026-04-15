---
version: 1
---
# TypeScript 테스트 패턴

## 테스트 프레임워크: Vitest

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
```

## 타입 안전한 Mock

```typescript
// 인터페이스 mock
const mockUserRepo: IUserRepository = {
  findById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}

// 반환값 타입 지정
vi.mocked(mockUserRepo.findById).mockResolvedValue({
  id: 'user-1',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date(),
})
```

## 외부 모듈 Mock

```typescript
vi.mock('../infrastructure/sendgrid', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))
```

## 타입 테스트 (타입 오류 검증)

```typescript
import { expectTypeOf } from 'vitest'

it('should return correct type', () => {
  expectTypeOf(parseUser).returns.toMatchTypeOf<User>()
})
```

## 테스트 격리

```typescript
describe('UserService', () => {
  let service: UserService
  let mockRepo: typeof mockUserRepo

  beforeEach(() => {
    mockRepo = { findById: vi.fn(), create: vi.fn() }
    service = new UserService(mockRepo, mockLogger)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
})
```

## 비동기 테스트

```typescript
it('should throw NotFoundError when user not found', async () => {
  vi.mocked(mockRepo.findById).mockResolvedValue(null)

  await expect(service.getUser('non-existent')).rejects.toThrow(NotFoundError)
})
```

## 커버리지 설정 (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```
