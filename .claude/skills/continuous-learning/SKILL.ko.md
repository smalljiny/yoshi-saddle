---
version: 3
name: continuous-learning
description: 긴 세션 후 또는 반복 패턴을 발견했을 때 사용. 세션에서 재사용 가능한 패턴을 효과적으로 추출해 skills/learned/에 저장하는 방법을 안내.
origin: harness
category: session-management
---

## 언제 활성화하나

- 생산적인 세션이 끝나고 `/harness:learn` 실행 시
- 같은 방식으로 여러 번 해결한 패턴을 발견했을 때
- 진짜 노력이 필요했던 비자명한 문제를 디버깅한 후
- 기억해둘 가치 있는 워크어라운드나 기법을 발견했을 때
- `skills/learned/`를 큐레이션하거나 오래된 항목을 제거할 때

## 저장할 가치 있는 것

다음 세 가지 필터를 모두 통과하면 저장할 가치가 있다:

1. **재사용 가능** — 다른 프로젝트에서 이 상황이 다시 생길까?
2. **비자명** — 유능한 개발자가 검색 없이 이미 알고 있을까?
3. **일반화 가능** — 특정 코드베이스에 종속되지 않는가?

### 저장 ✅

| 유형 | 예시 |
|------|------|
| `error_resolution` | "Zod `.transform()`을 `.optional()` 뒤에 체이닝하면 타입 추론이 깨짐 — `.optional().transform()`을 사용하고 undefined를 명시적으로 처리" |
| `user_correction` | "중첩 if-else 대신 guard clause를 early-return 스타일로 작성하는 것을 선호" |
| `workaround` | "Vitest의 `vi.useFakeTimers()`는 `setImmediate`와 함께 작동하지 않음 — `vi.runAllTimesAsync()` 사용" |
| `debugging_technique` | "Jest에서 TypeScript path alias 오류 시 `moduleNameMapper`를 tsconfig paths보다 먼저 확인" |

### 건너뜀 ❌

| 유형 | 예시 |
|------|------|
| 단순 오타 수정 | 세미콜론 누락 수정 |
| 일회성 이슈 | API 키 교체 |
| 프로젝트 특정 로직 | 이 앱에만 적용되는 도메인 규칙 |
| rules/에 이미 있음 | `rules/common/coding-style.md`가 이미 다룸 |

## 출력 형식

`.claude/skills/learned/<패턴명>/SKILL.md`에 저장:

```yaml
---
version: 3
name: <kebab-case-이름>
description: 한 문장 — 이 패턴을 언제 떠올릴지
origin: learned
learned_at: <ISO 8601 날짜>
---

## 언제 활성화하나

[트리거 조건 — 어떤 상황에서 이 패턴이 떠오르는지]

## 패턴

[구체적인 기법, 워크어라운드, 또는 접근법]

## 예시

[최소한의 코드 또는 명령어로 시연]

## 작동 이유

[선택적: 비자명한 경우 간단한 설명]
```

## 추출 프로세스

`/harness:learn` 실행 시:

### 1. 세션 로그 스캔

`.claude/sessions/<오늘>.jsonl`을 읽어 반복적인 노력을 시사하는 도구 호출 클러스터를 찾는다:
- 같은 파일에 여러 번 Edit 호출
- 변형을 가해가며 재시도된 Bash 명령어
- 짧은 시간에 높은 도구 호출 밀도

### 2. 후보 패턴 식별

다음을 찾는다:
- **수정**: 접근법을 포기하고 재시도한 지점
- **반복**: 같은 기법을 2번 이상 적용
- **놀라움**: 처음 예상했던 결과가 아닌 경우

### 3. 품질 필터 적용

각 후보에 대해:
- 미래 프로젝트에서 다시 찾아볼까? → 저장
- `rules/`나 기존 스킬에 이미 있는가? → 건너뜀
- 이 프로젝트의 도메인 로직에 특화된 것인가? → 건너뜀

### 4. 스킬 파일 작성

짧게 유지 — 좋은 learned 스킬은 30줄 이하. 더 필요하다면 `learned/`가 아닌 `skills/`의 정식 스킬로 작성.

### 5. `skills/learned/` 큐레이션

저장 후, 기존 항목을 스캔하고 다음을 제거:
- 이후 추가된 규칙으로 대체된 것
- 더 이상 정확하지 않은 것 (라이브러리 동작 변경)
- 실행 가능할 만큼 구체적이지 않은 것

## 신뢰도와 신선도

Learned 스킬은 시간이 지나면 쓸모없어진다. `skills/learned/` 재검토 시:

- 지난 한 달 내에 유용했다면 → 유지
- 3개월 이상 떠올리지 않았다면 → 제거 고려
- 현재 `rules/`와 충돌한다면 → 제거하고 규칙 업데이트

## /harness:learn과의 연결

이 스킬은 `/harness:learn`의 **품질 기준**을 정의한다. 명령어는 기계적인 작업(로그 읽기, 파일 쓰기)을 처리하고, 이 스킬은 무엇을 쓸 가치가 있는지 정의한다.
