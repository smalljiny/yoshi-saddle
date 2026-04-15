---
version: 1
description: 현재 세션에서 반복적으로 사용된 패턴을 분석하고 재사용 가능한 스킬로 저장한다.
category: harness-management
---

# /harness:learn

세션 로그에서 재사용 가능한 패턴을 추출해 `.claude/skills/learned/`에 저장한다.

## 실행 흐름

### 1. 세션 로그 분석

`.claude/sessions/` 디렉토리의 최근 로그 파일 읽기.

패턴 탐지:
- 반복적으로 사용한 코드 구조
- 효과적이었던 디버깅 접근법
- 특정 라이브러리/프레임워크 사용 패턴
- 문제 해결 시 효과적인 순서

### 2. 패턴 평가

각 후보 패턴을 평가:
- **재사용 가능성**: 다른 프로젝트/상황에서도 유용한가?
- **일반화 가능성**: 특정 코드베이스에 종속되지 않는가?
- **가치**: 기록해두면 시간이 절약되는가?

가치 없는 패턴은 저장하지 않는다.

### 3. 스킬 파일 생성

각 패턴을 `.claude/skills/learned/<pattern-name>/SKILL.md`로 저장:

```yaml
---
name: <pattern-name>
description: <언제 이 스킬을 사용해야 하는지>
origin: learned
learned_at: <ISO 8601>
---

## 언제 활성화하나

[이 패턴이 유용한 상황]

## 패턴

[구체적인 코드 또는 접근법]

## 예시

[실제 사용 예시]
```

### 4. 학습 요약 출력

```
학습 완료

새로 저장된 스킬:
- [pattern-name]: [설명]
- [pattern-name]: [설명]

저장 위치: .claude/skills/learned/
```

## 주의사항

- 이미 `.claude/skills/`에 있는 내용과 중복되면 저장하지 않는다
- 프로젝트 특정 코드(도메인 로직)는 저장하지 않는다
- 일반화 가능한 접근법과 패턴만 저장한다
