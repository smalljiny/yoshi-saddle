---
version: 1
name: multi-layer-review-gate
description: 구현 완료 전 plan-review → adversarial-review → code-review 레이어를 순서대로 통과하는 다층 리뷰 게이트 패턴
origin: learned
learned_at: 2026-04-16T08:00:00.000Z
---

## When to Activate

- `/dev:impl` Task 완료 후 code-reviewer가 BLOCK/WARNING을 반환할 때
- 명령어 문서나 워크플로우 설계 변경 시 설계 결정의 타당성을 검증할 때
- 구현 전 `plan-review`로 계획의 완전성을 확인할 때
- 모든 Task 완료 후 `/dev:review` + `/codex:adversarial-review`를 함께 실행할 때

## Pattern

### 레이어 순서

```
1. plan-review (구현 전)
   - Codex로 implementation-plan.md 검토
   - NOT READY → 수정 → 재검토

2. impl → code-review (Task별)
   - Task 구현 직후 code-reviewer 자동 호출
   - BLOCK: 같은 응답 안에서 수정, 재검토 없이 계속 진행
   - HIGH 이슈는 반드시 수정, MEDIUM은 판단 후 처리

3. /dev:review (전체 완료 후)
   - code-reviewer + security-reviewer 병렬 실행
   - CRITICAL/HIGH 수정 후 다음 단계

4. /codex:adversarial-review (설계 도전 검증)
   - 구현 결정의 전제와 edge case를 집중 공격
   - 일반 리뷰에서 놓친 설계 결함 탐지
   - HIGH 이슈 발견 시 /dev:impl로 재진입하여 수정
```

### 인라인 수정 원칙

code-reviewer가 BLOCK을 반환하면:
1. HIGH 이슈를 그 자리에서 수정
2. 수정 완료 후 같은 흐름에서 계속 (별도 재검토 없음)
3. MEDIUM은 다음 Task와 무관하면 즉시 처리, 관련 있으면 해당 Task에서 처리

## Examples

### plan-review 통과 후 구현 시작

```
[plan-review 결과: NOT READY]
- .codex/ 필터 누락 → 플랜에 추가
- active/ 정리 알고리즘 불명확 → 구체화
- CLAUDE.md version 증가 누락 → 추가

[수정 후 재검토: READY]
→ /dev:impl 시작
```

### adversarial-review HIGH 이슈 처리

```
[adversarial-review 결과]
[high] git diff develop...HEAD가 on-develop 시 빈 결과
→ /dev:impl 재진입: 3소스 합산 패턴으로 교체

[high] skip 경로가 spec.md 삭제 후 영구 참조 없음
→ /dev:impl 재진입: skip 시 spec.md 복사 fallback 추가
```
