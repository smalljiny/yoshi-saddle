---
version: 1
description: 결정론적 하네스 건강 감사를 실행하고 우선순위가 지정된 점수표를 반환한다.
category: harness-management
---

# /harness:audit

7개 카테고리에서 하네스를 채점하고 개선을 위한 상위 액션을 나열한다.

## 사용법

```
/harness:audit [scope] [--format text|json]
```

- `scope`: `repo` (기본값) · `hooks` · `skills` · `commands` · `agents`
- `--format`: `text` (기본값) · 자동화를 위한 `json`

## 실행

점수를 직접 계산하지 말고 항상 스크립트를 실행한다:

```bash
node .claude/scripts/harness-audit.js [scope] [--format text|json]
```

## 카테고리 (각 0–10점, 총 70점)

| # | 카테고리 | 검사 내용 |
|---|---------|---------|
| 1 | Tool Coverage | 에이전트, 스킬, 훅 스크립트, settings.json |
| 2 | Context Efficiency | CLAUDE.md, 성능 규칙, strategic-compact |
| 3 | Quality Gates | verify/review/checkpoint 명령어, 테스트 규칙 |
| 4 | Memory Persistence | session-start 훅, session-logger, sessions/ 디렉토리 |
| 5 | Eval Coverage | tdd-workflow 스킬, verification-loop 스킬, /learn |
| 6 | Security Guardrails | security-reviewer 에이전트, 보안 규칙, 훅 가드 |
| 7 | Cost Efficiency | 성능 규칙, 비동기 훅, strategic-compact |

## 출력

반환 항목:
1. 전체 점수와 퍼센트
2. 카테고리별 점수
3. 파일 경로가 포함된 실패 체크
4. 상위 3개 액션 (점수 높은 순)

## 감사 후

점수가 80% 미만이면:
- **harness-optimizer** 에이전트를 호출해서 상위 수정 사항을 제안하고 적용
- 각 변경 후 재실행해서 진행 상황 측정

## 예시

```
Harness Audit (repo): 54/70  [77%]

  ✅ Tool Coverage          10/10
  ⚠️  Context Efficiency     5/10
  ✅ Quality Gates          8/10
  ...

Top Actions:
  1. [Cost Efficiency] .claude/rules/common/performance.md 추가
  2. [Context Efficiency] .claude/skills/strategic-compact/SKILL.md 추가
  3. [Cost Efficiency] session-logger 훅을 비동기로 표시
```
