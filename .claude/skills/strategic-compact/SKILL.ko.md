---
version: 2
name: strategic-compact
description: 컨텍스트 한계에 근접하거나 워크플로우 페이즈 전환 시 사용. /compact가 임의의 작업 중단이 아닌 논리적 경계에서 실행되도록 안전한 compaction 지점을 정의.
origin: harness
category: session-management
---

## 언제 활성화하나

- 세션이 길어져 컨텍스트 한계에 근접할 때
- 주요 워크플로우 페이즈 전환 시 (`/dev:plan` → `/dev:impl`)
- Task 완료 후, 다음 Task 시작 전
- 응답이 느려지거나 덜 일관성 있다고 느껴질 때 (컨텍스트 압박)
- 실패한 접근 후 — 막힌 추론을 지우고 재시도 전
- `suggest-compact` 훅이 발동됐을 때 (도구 호출 50회 이상)

## 전략적 Compaction의 이유

자동 compaction은 임의의 지점, 종종 작업 중간에 트리거됩니다:

```
나쁨:  /dev:impl Task 1 → [자동 compact 발생] → 변수명, 파일 경로 손실
좋음:  /dev:impl Task 1 → 커밋 → [/compact] → /dev:impl Task 2
```

논리적 경계에서의 전략적 compaction은 페이즈 전반에 걸쳐 컨텍스트를 보존합니다.

## Compaction 결정 테이블

| 페이즈 전환 | Compact? | 이유 |
|------------|---------|------|
| `/dev:topic` → `/dev:plan` | Yes | 탐색 컨텍스트는 크고; 계획이 핵심 결과물 |
| `/dev:plan` → `/dev:impl` | Yes | 계획은 파일로 저장됨; 코드를 위한 공간 확보 |
| Task N → Task N+1 | Yes | 각 Task는 깔끔한 경계 |
| `/dev:impl` → `/dev:review` | 상황에 따라 | 리뷰에 최근 코드 컨텍스트가 필요하면 유지 |
| `/dev:review` → `/dev:verify` | Yes | 리뷰 결과가 저장됨; 게이트 실행 전 비우기 |
| **구현 도중** | **No** | 변수명, 파일 경로, 부분 상태를 잃으면 비용이 큼 |
| 실패한 접근 후 | Yes | 재시도 전 막힌 추론 지우기 |

## Compaction 후 남는 것

| 남는 것 ✅ | 사라지는 것 ❌ |
|-----------|-------------|
| CLAUDE.md 지침 | 중간 추론 과정 |
| TodoWrite 작업 목록 | 이전에 읽은 파일 내용 |
| 메모리 파일 (`~/.claude/memory/`) | 도구 호출 이력 |
| Git 상태 (커밋, 브랜치) | 구두로 설명한 선호도 |
| 디스크의 파일 (spec.md, plan.md) | 멀티스텝 대화 컨텍스트 |

**compact 전**: 중요한 컨텍스트를 `docs/_local/<topic>/` 또는 메모리에 저장.

## 의도를 담은 Compaction

다음 페이즈를 안내하는 포커스 메시지를 추가:

```
/compact Task 2 구현에 집중: JWT 검증 미들웨어 추가
/compact 계획 승인됨. 다음: T1 구현 - 데이터베이스 스키마 마이그레이션
```

## 베스트 프랙티스

1. **계획 후 compact** — `implementation-plan.md` 작성 완료 후 compact로 새 출발
2. **디버깅 후 compact** — 계속하기 전 오류 해결 컨텍스트 비우기
3. **구현 도중 compact 금지** — 관련 변경 사항을 위한 컨텍스트 보존
4. **compact 전 저장** — 중요한 컨텍스트를 먼저 파일에 저장
5. **훅을 신뢰** — `suggest-compact.js`가 *언제*를 알려줌; *여부*는 본인이 결정

## 토큰 최적화 팁

- CLAUDE.md를 간결하게 유지 — 매 세션 로드됨
- 스킬은 필요할 때 로드; 모두 미리 로드하지 않음
- 큰 파일 반복 읽기 금지 — 한 번 읽고 이름으로 참조
- `~/.claude/rules/`와 `.claude/rules/` 간 중복 규칙은 토큰 낭비

## 훅

`suggest-compact.js`는 도구 호출 횟수를 세고 50회에서 경고(이후 25회마다):

```
[StrategicCompact] 도구 호출 50회 — 다음 Task 시작 전 /compact 고려
[StrategicCompact] 도구 호출 75회 — 컨텍스트가 오래됐다면 /compact 좋은 시점
```

훅은 비차단(non-blocking) — 제안만 하고 절대 작업을 중단시키지 않음.
