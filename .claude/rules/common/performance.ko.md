---
version: 1
---

# 성능 최적화

## 모델 선택 전략

습관이 아닌 작업 복잡도를 기준으로 모델을 선택한다. 작업을 처리할 수 있는 가장 저렴한 모델을 기본값으로 사용한다.

| 모델 | 특성 | 사용 시점 |
|------|------|---------|
| **Haiku 4.5** | Sonnet 대비 3배 저렴 | 자주 실행되는 경량 작업, 단순 코드 생성, 병렬 실행의 워커 에이전트 |
| **Sonnet 4.6** | 최고의 코딩 모델 | 메인 개발, 멀티 에이전트 오케스트레이션, 복잡한 코딩 작업 |
| **Opus 4.6** | 가장 깊은 추론 | 아키텍처 결정, 모호한 요구사항, 연구 및 분석 |

### 하네스 에이전트 모델 배치 근거

| 에이전트 | 모델 | 이유 |
|---------|------|------|
| planner | opus | 모호한 요구사항에는 잘못된 계획을 피하기 위한 깊은 추론 필요 |
| tdd-specialist | opus | 테스트 설계 결정은 연쇄 영향이 크고 잘못된 테스트는 시간 낭비 |
| code-reviewer | opus | 리뷰는 문법이 아닌 의도 파악이 필요 |
| architect | opus | 아키텍처 결정은 되돌리기 어려움 |
| security-reviewer | sonnet | 알려진 취약점 패턴 매칭; Sonnet으로 충분 |
| build-error-resolver | sonnet | 오류 진단은 구조화된 작업; Sonnet으로 충분 |
| doc-updater | sonnet | 문서 작성은 깊은 추론 불필요 |
| refactor-cleaner | sonnet | 기계적인 정리 작업; Sonnet으로 충분 |
| harness-optimizer | sonnet | 파일 존재 확인 및 설정 제안 |

## Context Window 관리

컨텍스트가 ~80% 이상(마지막 20%)일 때 다음 작업을 피한다:

- 여러 파일에 걸친 대규모 리팩토링
- 여러 파일을 아우르는 피처 구현
- 복잡한 멀티 컴포넌트 상호작용 디버깅

컨텍스트가 많이 쌓였을 때 적합한 작업:
- 단일 파일 편집
- 독립적인 유틸리티 생성
- 문서 업데이트
- 단순 버그 수정

작업 중간에 한계에 근접하면 깔끔한 경계(예: Task 완료 후, 다음 Task 시작 전)에서 `/compact`를 실행한다.
안전한 compaction 지점은 `.claude/skills/strategic-compact/SKILL.md`를 참고한다.

## Extended Thinking

Extended thinking은 기본적으로 활성화되어 있다(내부 추론에 최대 31,999 토큰 사용).

유용한 상황:
- 모호한 요구사항이 있는 복잡한 `/dev:plan` 세션
- `architect` 에이전트의 아키텍처 결정
- `security-reviewer`의 보안 분석

제어:
- **토글**: `Option+T` (macOS) / `Alt+T` (Windows/Linux)
- **예산 상한**: `export MAX_THINKING_TOKENS=10000`

## 빌드 오류

빌드가 실패하면 직접 디버깅하지 말고 즉시 위임한다:

1. **build-error-resolver** 에이전트 호출
2. `/dev:build-fix` 실행
3. 점진적으로 수정; 각 변경 후 검증
