---
version: 2
description: 최종 전체 코드 리뷰를 수행한다. code-reviewer와 security-reviewer를 병렬로 실행한다.
category: dev-workflow
---

# /dev:review

모든 Task 완료 후, 전체 변경 범위를 종합 리뷰한다.

## 실행 흐름

### 1. 변경 범위 파악

```bash
git diff main...HEAD
git log main...HEAD --oneline
```

### 2. **code-reviewer + security-reviewer 병렬 실행**

두 에이전트를 동시에 호출:

**code-reviewer**가 검토하는 것:
- 전체 변경 범위 코드 품질
- 아키텍처 일관성
- 테스트 커버리지
- 성능 고려 사항

**security-reviewer**가 검토하는 것:
- 보안 취약점
- 시크릿 노출
- 입력 검증 누락
- 인증/인가 이슈

### 3. 리뷰 결과 종합

심각도 기준으로 이슈 정리:
- **CRITICAL**: 즉시 수정 필요. 수정 전 진행 불가.
- **HIGH**: 빠른 수정 필요.
- **MEDIUM**: 계획 수정.

### 4. 이슈 수정

CRITICAL, HIGH 이슈 수정 후 재검토.

### 5. 완료 보고

```
리뷰 완료

CRITICAL: 0개
HIGH: 0개
MEDIUM: [N]개

다음: /dev:verify 로 검증 게이트 통과
```

## 다음 단계

리뷰 통과 후: `/dev:verify`
