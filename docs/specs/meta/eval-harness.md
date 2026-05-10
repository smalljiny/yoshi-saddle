---
last_modified: 2026-04-24
author: @mario
status: Active
---

# eval-harness

> 하네스 스킬의 품질을 정량적으로 측정하고 회귀를 감지하는 Eval-Driven Development(EDD) 프레임워크 — Codex CLI 실행, code-based grader, pass@k 판정.

## 개요

`eval-harness`는 스킬 수정 시 회귀 여부를 `codex "eval-harness 스킬로 <name>을 eval해줘"` 한 줄로 확인하는 포게이트 스킬이다. eval 케이스를 `.claude/evals/`에 1급 아티팩트로 관리하고 code-based(Bash exit code) grader로 결정론적 판정을 수행한다. v1 범위는 스킬 컴포넌트만 대상으로 하며, 커맨드·에이전트 eval과 LLM-as-judge grader는 v2 과제다.

## 구조

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| eval-harness SKILL.md | `.codex/skills/eval-harness/` | Codex가 로드하는 EDD 프레임워크 정의 (eval 케이스 형식, grader 계약, pass@k 임계값, 보고서 형식) |
| Eval 케이스 파일 | `.claude/evals/<skill-name>.md` | 스킬별 eval 케이스 정의 (태스크·Bash grader 명령·성공 기준). Claude와 Codex 모두 읽음 |
| Eval 실행 이력 | `.claude/evals/<skill-name>.log` | 케이스별 trial 결과, pass@k 집계, skill-level 판정을 실행마다 append |
| Baseline 스냅샷 | `.claude/evals/baseline.json` | 스킬별 마지막 PASS 시점의 git SHA + 타임스탬프. Regression eval의 기준점 |
| Codex CLI | 외부 런타임 | eval 케이스 실행 엔진. spec-review·plan-review와 동일 호출 패턴 |

## 동작

### 호출 형식

```bash
codex "eval-harness 스킬로 <skill-name>을 eval해줘"
```

`<skill-name>`은 영문자·숫자·하이픈·언더스코어만 허용한다(경로 트라버설 차단). 인자 없이 호출하거나 대응하는 `.claude/evals/<skill-name>.md`가 없으면 오류 메시지와 함께 종료한다.

### 실행 흐름

1. **인자 파싱** — 호출 문자열에서 `<skill-name>` 추출 및 유효성 검증
2. **케이스 로드** — `.claude/evals/<skill-name>.md` 파싱, `[CAPABILITY]`·`[REGRESSION]` 태그로 케이스 분류
3. **3-trial 실행** — 케이스별 `Command` Bash 명령을 3회 독립 실행, exit code 0 = PASS
4. **pass@k 계산** — 케이스별 pass@3 / pass^3 산출
5. **판정** — 케이스별 임계값 적용 후 skill-level 집계
6. **기록** — `.claude/evals/<skill-name>.log`에 append, `Decision: PASS`이면 `baseline.json` 갱신

### pass@k 정의

| 메트릭 | 정의 | 산출 | 표기 |
|--------|------|------|------|
| `pass@3` | 3 trials 중 PASS 비율 | `PASS 횟수 / 3` | 소수점 2자리 (`0.67`, `1.00`) |
| `pass^3` | 3 trials 모두 PASS 여부 | `PASS 횟수 == 3` | `YES` / `NO` |

v1에서는 trial을 3회 실행하므로 pass@1 지표는 사용하지 않는다.

### 로그 출력 형식

실행마다 `.claude/evals/<skill-name>.log` 끝에 아래 구조로 append한다. 기존 이력은 삭제하지 않는다.

```
## Run: <ISO 8601 타임스탬프> | Skill: <name> | Version: <n> | git: <short SHA>

### Case: <eval case id> [CAPABILITY]
- Trial 1: PASS/FAIL
- Trial 2: PASS/FAIL
- Trial 3: PASS/FAIL
- pass@3: 1.00 | pass^3: YES | 판정: PASS (기준: pass@3 ≥ 0.9)

### Case: <eval case id> [REGRESSION]
- Trial 1: PASS/FAIL
- Trial 2: PASS/FAIL
- Trial 3: PASS/FAIL
- pass@3: 1.00 | pass^3: YES | 판정: PASS (기준: pass^3 = YES)

### Skill 집계
- Decision: PASS
```

파일 쓰기가 실패하면 로그 내용을 표준 출력으로 출력하고 수동 저장을 안내한다.

## Eval 케이스 형식

### 파일 위치

`.claude/evals/<skill-name>.md` — 스킬과 동일 저장소에서 버전 관리.

### 구조

```markdown
## EVAL: <skill-name>
버전: <SKILL.md version 필드>
마지막 실행: YYYY-MM-DD

### Capability Evals
1. [CAPABILITY] <설명>
   - Command: `<Bash 명령 — exit 0 = PASS>`

### Regression Evals
1. [REGRESSION] <설명>
   - Baseline: <git SHA>
   - Command: `<Bash 명령 — exit 0 = PASS>`
```

`Command` 필드는 단일 Bash 명령 또는 `bash -c "..."` 형태의 복합 명령(줄바꿈 없음)만 허용한다.

### 태그와 임계값

| 태그 | 목적 | 판정 메트릭 | 임계값 |
|------|------|------------|--------|
| `[CAPABILITY]` | 스킬이 명세된 기능을 수행함을 검증 | pass@3 | ≥ 0.9 (실질 3/3) |
| `[REGRESSION]` | baseline 이후 기존 동작이 유지됨을 검증 | pass^3 | = YES |

모든 케이스가 각자의 임계값을 충족해야 skill-level `Decision: PASS`. 하나라도 미달 시 `FAIL`.

### 버전 출처 우선순위

1. eval 케이스 파일의 `버전:` 필드
2. 없으면 해당 스킬의 `SKILL.md` frontmatter `version:` 필드

### 레퍼런스 예시

`stack-exa` eval 케이스(`.claude/evals/stack-exa.md`)는 파일 존재·capabilities 필드·operation 섹션 4개를 Capability eval로, response schema 표준 필드 유지를 Regression eval로 검증한다. `stack-firecrawl` eval 케이스(`.claude/evals/stack-firecrawl.md`)는 동일 구조로 `/v1/search`, `/v1/scrape`, `/v1/crawl` operation 섹션 3개를 검증한다.

## 제약사항

### v1 범위

- **스킬만 대상**: 커맨드·에이전트 eval은 v2. 상태 전환과 다중 도구 호출 추적이 필요해 별도 설계 필요
- **code-based grader 전용**: Bash exit code 0 = PASS 계약만 사용. LLM-as-judge grader는 v2
- **수동 트리거**: SKILL.md 수정 후 개발자가 명시적으로 실행. CI/CD 자동 강제는 v2 이후 검토

### 신뢰 모델

`.claude/evals/*.md`의 `Command:` 필드는 `bash -c`로 직접 실행된다. **eval 케이스 파일은 실행 코드**이므로 추가·수정은 셸 스크립트 커밋과 동등한 코드 리뷰 대상이다.

eval-harness는 프로덕션 API 키·인증 토큰 등 민감 환경변수가 있는 셸에서 실행하지 않는다. 환경 격리가 필요하면 별도 셸에서 `env -i` 패턴을 사용한다.

### Baseline 부트스트랩

`.claude/evals/baseline.json`이 없으면 Regression eval을 전부 스킵하고 Capability eval만 실행한다. 첫 `Decision: PASS` 후 baseline.json을 신규 생성한다.

### v2 이후 범위 밖 항목

- CI/CD 자동 실행 및 프로덕션 모니터링
- 성능·레이턴시 벤치마킹
- eval 케이스 자동 생성
- LLM-as-judge grader
- 커맨드·에이전트 eval
