---
version: 2
name: tdd-workflow
description: 새 피처 구현, 버그 수정, 리팩토링 시 테스트를 먼저 작성하는 RED-GREEN-REFACTOR 사이클을 따른다.
origin: harness
category: dev-process
---

## 언제 활성화하나

- 새 함수 또는 클래스를 구현할 때
- 버그를 수정할 때
- 기존 코드를 리팩토링할 때
- `/dev:impl` 명령어의 `tdd` 유형 Task 실행 시

## Iron Law

**테스트가 실패하는 것을 확인하지 않은 테스트는 없는 것과 같다.**

테스트를 작성했다고 해서 구현 전 실패를 확인하지 않으면, 그 테스트가 실제로 동작을 검증하는지 알 수 없다.

## RED-GREEN-REFACTOR 사이클

```
       ┌──────────────┐
       │              │
  ┌────▼────┐    ┌────┴────┐
  │   RED   │    │ REFACTOR│
  │ 실패하는 │    │  정리    │
  │ 테스트  │    └────▲────┘
  └────┬────┘         │
       │         ┌────┴────┐
       ▼         │  GREEN  │
  [테스트 실행]  │통과하도록│
  [실패 확인]    │  구현   │
       │         └────┬────┘
       └──────────────┘
                  [테스트 실행]
                  [통과 확인]
```

## 단계별 실행

### RED: 실패하는 테스트 작성

```typescript
// 1. 테스트 파일 작성
describe('UserService.getUser', () => {
  it('유저가 존재하면 반환한다', async () => {
    // Arrange
    mockRepo.findById.mockResolvedValue({ id: '1', name: 'Alice' })

    // Act
    const result = await service.getUser('1')

    // Assert
    expect(result).toEqual({ id: '1', name: 'Alice' })
  })

  it('유저가 없으면 NotFoundError를 던진다', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(service.getUser('999')).rejects.toThrow(NotFoundError)
  })
})
```

```bash
# 2. 실행 → 반드시 실패해야 함
pnpm test src/user.test.ts
# Expected: ✗ (실패)
```

### GREEN: 통과하도록 최소한의 구현

```typescript
// 테스트를 통과하기 위한 최소한의 코드만 작성
class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) throw new NotFoundError(`User ${id} not found`)
    return user
  }
}
```

```bash
# 실행 → 반드시 통과해야 함
pnpm test src/user.test.ts
# Expected: ✓ (통과)
```

### REFACTOR: 코드 정리

- 테스트가 그린 상태 유지
- 이름 개선, 중복 제거, 복잡도 감소
- 리팩토링 후 테스트 재실행

```bash
pnpm test src/user.test.ts
```

## 엣지 케이스 체크리스트

각 함수에 대해 다음을 테스트:
- [ ] 정상 케이스 (happy path)
- [ ] null / undefined 입력
- [ ] 빈 문자열 / 빈 배열
- [ ] 경계값 (0, -1, 최댓값)
- [ ] 잘못된 타입 입력
- [ ] 에러 경로 (throw 케이스)
- [ ] 비동기 실패 케이스

## 커버리지 확인

```bash
pnpm test:coverage
```

최소 80% 달성. 핵심 비즈니스 로직은 100% 목표.

## 흔한 합리화와 반박

| 합리화 | 반박 |
|--------|------|
| "이 코드는 너무 간단해서 테스트 필요 없어" | 간단한 코드가 바뀌면 테스트 없이 실수를 잡을 수 없다 |
| "나중에 테스트 추가할게" | 나중이 되면 구현 세부 사항이 테스트에 영향을 미쳐 테스트가 어려워진다 |
| "시간이 없어" | 테스트가 없으면 디버깅에 더 많은 시간이 든다 |
| "이미 수동으로 테스트했어" | 수동 테스트는 회귀를 잡지 못한다 |

## 완료 전 체크리스트

- [ ] 모든 함수에 테스트가 있다
- [ ] 각 테스트가 구현 전 실패하는 것을 확인했다
- [ ] 엣지 케이스가 커버된다
- [ ] 에러 경로가 테스트됐다
- [ ] 커버리지 80%+
- [ ] 모든 테스트 통과
