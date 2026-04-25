---
version: 1
---
# Testing Rules

## Minimum Coverage: 80%

## Required Test Types

1. **Unit tests** — individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — core user flows

## Test-Driven Development (MANDATORY)

```
1. Write the test first (RED)
2. Run the test → it must fail
3. Write minimal implementation (GREEN)
4. Run the test → it must pass
5. Refactor (REFACTOR)
6. Check coverage (80%+)
```

Without confirming that a test fails first, you cannot know whether the test actually verifies behavior.

## Agent Support

- **tdd-specialist** — proactively use for new features and bug fixes

## Test File Patterns (TypeScript)

```
src/
├── foo.ts
└── foo.test.ts        # unit tests (co-located)

tests/
├── integration/       # integration tests
└── e2e/              # E2E tests
```

## Test Failure Troubleshooting

1. Use the **tdd-specialist** agent
2. Verify test isolation
3. Validate that mocks are correct
4. Fix the implementation, not the test (unless the test itself is wrong)

## Vitest Basic Pattern

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

## Mock Principles

- Only mock external services, I/O, and time dependencies
- Do not mock business logic
- Do not share mock state between tests (call `vi.clearAllMocks()` in `afterEach`)
