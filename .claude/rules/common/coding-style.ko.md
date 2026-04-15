---
version: 1
---
# 코딩 스타일

## 불변성 (CRITICAL)

항상 새 객체를 생성하고, 기존 객체를 절대 변경하지 않는다:

```typescript
// WRONG: 변경(Mutation)
function updateUser(user, name) {
  user.name = name  // MUTATION!
  return user
}

// CORRECT: 불변성(Immutability)
function updateUser(user, name) {
  return { ...user, name }
}
```

## 파일 구조

- 파일당 200-400줄 권장, 최대 800줄
- 큰 컴포넌트에서 유틸리티 분리
- 타입이 아닌 기능/도메인 기준으로 구조화
- 높은 응집도, 낮은 결합도

## 에러 처리

에러는 항상 명확하게 처리:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  logger.error({ err: error }, 'Operation failed')
  throw new AppError('사용자 친화적 메시지', 'ERROR_CODE')
}
```

## 입력 검증

모든 외부 입력은 반드시 검증 (Zod 권장):

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

const validated = schema.parse(input)
```

## 환경 변수

Zod로 시작 시 파싱하고 빠르게 실패:

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
})

export function getConfig(): Env {
  if (configInstance) return configInstance
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors)
    process.exit(1)
  }
  configInstance = result.data
  return configInstance
}
```

## 코드 품질 체크리스트

작업 완료 전 확인:
- [ ] 코드가 읽기 쉽고 이름이 명확하다
- [ ] 함수가 작다 (50줄 미만)
- [ ] 파일이 집중되어 있다 (800줄 미만)
- [ ] 깊은 중첩이 없다 (4단계 이하)
- [ ] 에러 처리가 적절하다
- [ ] `console.log`가 없다
- [ ] 하드코딩된 값이 없다
- [ ] 불변 패턴을 사용했다
