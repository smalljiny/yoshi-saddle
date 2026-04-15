---
version: 1
---
# 에이전트 조율 규칙

## 사용 가능한 에이전트

`.claude/agents/` 에 위치:

| 에이전트 | 역할 | 즉시 사용 시점 |
|---------|------|-------------|
| planner | 구현 계획 수립 | 복잡한 피처 요청, 리팩토링 |
| tdd-specialist | 테스트 주도 개발 | 새 피처, 버그 수정 |
| code-reviewer | 코드 품질 리뷰 | 코드 작성 직후 |
| security-reviewer | 보안 취약점 분석 | 커밋 전, 민감한 코드 변경 시 |
| architect | 시스템 설계 | 아키텍처 결정, 설계 검토 |
| build-error-resolver | 빌드 오류 해결 | 빌드/타입 오류 발생 시 |
| doc-updater | 문서 동기화 | 구현 완료 후 |
| refactor-cleaner | 데드코드 정리 | 코드 유지보수 |

## 즉시 에이전트 활성화

사용자 요청 없이도 다음 상황에서 자동 활성화:

1. 복잡한 피처 요청 → **planner**
2. 코드 작성/수정 직후 → **code-reviewer**
3. 새 피처 또는 버그 수정 → **tdd-specialist**
4. 아키텍처 결정 → **architect**
5. 빌드/타입 오류 → **build-error-resolver**

## 병렬 실행

독립적인 작업은 항상 병렬로 실행:

```
# GOOD: 병렬 실행
Agent 1: auth.ts 보안 분석
Agent 2: cache 시스템 성능 리뷰
Agent 3: utils.ts 타입 검사

# BAD: 불필요한 순차 실행
agent 1 완료 후 agent 2, 완료 후 agent 3
```

## 다중 관점 분석

복잡한 문제에는 역할 분리 서브에이전트 활용:
- 사실 검토자 (Factual Reviewer)
- 시니어 엔지니어 (Senior Engineer)
- 보안 전문가 (Security Expert)
- 일관성 검토자 (Consistency Reviewer)
