---
version: 1
---
# TypeScript 패턴

## 타입 설계 원칙

- `any` 사용 금지 — `unknown`으로 대체하고 타입 가드 적용
- `as` 타입 단언 최소화 — 불가피할 때만 사용
- 유틸리티 타입 적극 활용 (`Partial`, `Required`, `Pick`, `Omit`, `Readonly`)
- 도메인 모델은 인터페이스, 값 객체는 타입 별칭

```typescript
// WRONG
function process(data: any) { ... }

// CORRECT
function process(data: unknown) {
  if (!isValidData(data)) throw new Error('Invalid data')
  // data is now narrowed
}
```

## Zod 스키마 패턴

런타임 검증과 타입 추론을 동시에:

```typescript
import { z } from 'zod'

// 스키마 정의
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  createdAt: z.coerce.date(),
})

// 타입 자동 추론
type User = z.infer<typeof UserSchema>

// 검증
function parseUser(input: unknown): User {
  return UserSchema.parse(input)
}
```

## 비동기 에러 처리

```typescript
// Result 타입 패턴 (Option A)
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await userRepo.findById(id)
    if (!user) return { success: false, error: new Error('Not found') }
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
```

## 의존성 주입

생성자 주입으로 테스트 가능성 확보:

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>
  create(data: CreateUserDto): Promise<User>
}

class UserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly logger: ILogger,
  ) {}

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) throw new NotFoundError(`User ${id} not found`)
    return user
  }
}
```

## 타입 가드

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  )
}
```

## 모듈 구조

```
src/
├── domain/          # 도메인 모델, 인터페이스
├── application/     # 유즈케이스, 서비스
├── infrastructure/  # 외부 의존성 구현 (DB, API)
└── presentation/    # 컨트롤러, 라우터
```
