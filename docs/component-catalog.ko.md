---
version: 2
---

# 컴포넌트 카탈로그

`.claude/` 전체 컴포넌트(에이전트, 명령어, 스킬)를 카테고리별로 정리한 인덱스.

## 에이전트

위치: `.claude/agents/`. `Agent` 도구에 `subagent_type`으로 호출.

### dev-workflow

| 에이전트 | 모델 | 설명 |
|---------|------|------|
| `planner` | opus | 복잡한 피처 및 리팩토링 구현 계획. `/dev:plan` 자동 호출. |
| `tdd-specialist` | opus | TDD 방법론 전문가. 테스트 먼저 작성. `/dev:impl` 자동 호출. |
| `code-reviewer` | opus | 코드 품질·보안·유지보수성 리뷰. 코드 편집 후 및 `/dev:review`에서 자동 호출. |
| `security-reviewer` | sonnet | 보안 취약점 탐지. `/dev:review` 및 커밋 전 자동 호출. |
| `architect` | opus | 시스템 설계 및 아키텍처 결정. |
| `build-error-resolver` | sonnet | 빌드·타입·린트 오류 해결. `/dev:build-fix` 자동 호출. |
| `doc-updater` | sonnet | 코드 변경에 맞게 문서 동기화. |
| `refactor-cleaner` | sonnet | 데드코드 제거 및 코드 품질 개선. |

### harness-management

| 에이전트 | 모델 | 설명 |
|---------|------|------|
| `harness-optimizer` | sonnet | 하네스 설정 분석 및 개선. `/harness:audit` 자동 호출. |

---

## 명령어

위치: `.claude/commands/`. `/command-name` 형태로 호출.

### dev-workflow (`category: dev-workflow`)

개발 라이프사이클 명령어. 순서대로 실행:

| 명령어 | 호출 방법 | 설명 |
|--------|---------|------|
| `dev/topic` | `/dev:topic <name>` | 작업 주제 시작. `dev-context.json`에 기록. |
| `dev/plan` | `/dev:plan` | planner 에이전트로 구현 계획 생성. |
| `dev/impl` | `/dev:impl` | Task 1개 실행 (tdd-specialist + code-reviewer). |
| `dev/checkpoint` | `/dev:checkpoint` | git 상태 스냅샷과 함께 이름 있는 체크포인트 생성. |
| `dev/review` | `/dev:review` | 최종 코드 리뷰 (code-reviewer + security-reviewer 병렬). |
| `dev/verify` | `/dev:verify` | PR 전 전체 검증 게이트. |
| `dev/build-fix` | `/dev:build-fix` | 빌드 오류 단계별 해결. |

전형적인 흐름:
```
/dev:topic → /dev:plan → /dev:impl (반복) → /dev:review → /dev:verify → PR
```

### harness-management (`category: harness-management`)

하네스 자체 유지보수 명령어.

| 명령어 | 호출 방법 | 설명 |
|--------|---------|------|
| `harness/audit` | `/harness:audit` | 결정론적 하네스 건강도 감사 및 우선순위 점수 보고서. |
| `harness/learn` | `/harness:learn` | 세션 패턴 추출 후 재사용 가능한 스킬로 저장. |

---

## 스킬

위치: `.claude/skills/`. 트리거 조건이 맞을 때 Claude가 자동 호출.

### dev-process (`category: dev-process`)

구현 품질 게이트를 안내하는 스킬.

| 스킬 | 디렉토리 | 설명 |
|-----|---------|------|
| `tdd-workflow` | `skills/tdd-workflow/` | RED-GREEN-REFACTOR 사이클. 피처/버그 작업 중 활성화. |
| `verification-loop` | `skills/verification-loop/` | PR 전 순차 품질 게이트. `/dev:verify`와 함께 사용. |

### session-management (`category: session-management`)

컨텍스트와 세션 연속성을 관리하는 스킬.

| 스킬 | 디렉토리 | 설명 |
|-----|---------|------|
| `continuous-learning` | `skills/continuous-learning/` | `/harness:learn`용 패턴 추출 안내. `skills/learned/` 품질 필터. |
| `strategic-compact` | `skills/strategic-compact/` | 안전한 `/compact` 타이밍 정의. 작업 중간이 아닌 논리적 경계에서 실행. |

### learned (자동 생성)

| 디렉토리 | 설명 |
|---------|------|
| `skills/learned/` | `/harness:learn`으로 자동 저장된 패턴. git-ignored. |

---

## 파일 쌍 규칙

모든 컴포넌트는 `.md` / `.ko.md` 쌍으로 존재:

| 파일 | 역할 |
|------|------|
| `<name>.md` | 권위 있는 원본 (영어). Claude Code가 읽고 실행. |
| `<name>.ko.md` | 번역본 (한국어). 사람이 읽기 위한 문서. 실행되지 않음. |

`.ko.md`의 `version`이 짝인 `.md`보다 낮으면 **stale(오래됨)** 상태.
`python3 .claude/scripts/check-versions.py` 로 stale 쌍을 감지할 수 있다.
