# Prompt Eval 워크플로우

> `prompt` 타입 Task의 PROPOSE→EVAL→REFINE 사이클. `prompt-engineer` 에이전트와 `stack-prompt` 스킬이 협력해 프롬프트 파일을 작성·검증·개선한다.

## 개요

하네스 개선 작업의 많은 부분은 에이전트·커맨드·스킬·규칙 파일 — Claude에게 전달되는 프롬프트 — 을 작성하고 개선하는 작업이다. 코드와 달리 컴파일 오류로 정확성을 검증할 수 없으므로, Eval Cases를 기준으로 반복적으로 평가·개선하는 사이클이 필요하다.

## 구조

```
.claude/
├── agents/
│   └── prompt-engineer.md    # PROPOSE→EVAL→REFINE 루프 오케스트레이터
└── skills/
    └── stack-prompt/
        └── SKILL.md          # 평가 절차 정의 (전략, pass_count, 정체 신호)

.harness/
└── contracts/
    └── implementation-plan.md  # prompt 타입 + Eval Case 스키마 계약
```

## 컴포넌트 역할

| 컴포넌트 | 역할 |
|---|---|
| `prompt-engineer` 에이전트 | 루프 제어, 파일 저장, 종료 신호 처리 |
| `stack-prompt` 스킬 | 전략별 평가 절차, pass_count 메트릭, 정체 신호 정의 |
| `implementation-plan.md` 계약 | planner·plan-review·prompt-engineer 공유 Eval Case 스키마 |

## 동작

### PROPOSE→EVAL→REFINE 사이클

```
prompt-engineer 호출
  │
  ├── 1. Task 컨텍스트 읽기 (Goal, Eval Cases, Acceptance, 대상 파일)
  │     └── 경로 검증: 프로젝트 루트 내부·민감 패턴 제외
  │
  ├── 2. stack-prompt/SKILL.md 로드
  │
  ├── 3. PROPOSE — 프롬프트 초안 작성 → 파일 저장
  │
  ├── 4. EVAL — Eval Cases 전략별 실행 → pass_count 산출
  │     ├── direct: 예측 출력과 Expected 직접 비교
  │     ├── rubric: CoT → SCORE: N → Pass 임계값 확인
  │     └── judge: Claude-as-judge → VERDICT: ACCEPT|REJECT
  │
  ├── 5. 종료 신호 확인
  │     ├── SUCCESS: pass_count ≥ Acceptance N → 완료 보고
  │     ├── STAGNATION: 연속 2회 pass_count 증가 없음 → 사용자 보고
  │     └── MAX_ITER: iteration == 5 → 사용자 보고
  │
  └── 6. REFINE — 실패 패턴 분류·수정 → 파일 저장 → EVAL 반복
```

### 평가 전략

| 전략 | 적용 기준 | Pass 조건 |
|---|---|---|
| `direct` (기본) | 정확한 텍스트·구조 일치 | Expected 일치 |
| `rubric` | 주관적 품질 | score >= Pass 임계값 (1-5 척도) |
| `judge` | 복잡한 추론·정확성 | VERDICT == ACCEPT |

전략 태그(`[rubric]`, `[judge]`)가 없으면 `direct`로 해석한다.

### pass_count 메트릭

각 Eval Case에서 이진 결과(pass=1, fail=0)를 산출하고 합산. 정체 감지와 Acceptance 판정에 공통으로 사용한다.

### 종료 신호

| 신호 | 조건 | 동작 |
|---|---|---|
| SUCCESS | pass_count ≥ N (Acceptance) | 최선 초안 저장 → 완료 보고 |
| STAGNATION | 연속 2회 pass_count 무증가 | 최선 초안 저장 → 정체 보고 |
| MAX_ITER | iteration == 5 | 최선 초안 저장 → 미달성 보고 |

## Eval Case 스키마

`implementation-plan.md` 계약 기준. `prompt` 타입 Task의 Completion Criteria 형식.

**`direct` 전략**:
```markdown
- [ ] Eval 1: Input: "<시나리오>" → Expected: "<기대 출력>"
```

**`rubric` 전략**:
```markdown
- [ ] Eval 2 [rubric]: Input: "<시나리오>"
    Criteria: "<평가 기준>"
    Rubric: "1=<나쁜 예>, 5=<좋은 예>"
    Pass: score >= N
```

**`judge` 전략**:
```markdown
- [ ] Eval 3 [judge]: Input: "<시나리오>"
    Expected: "<기대 동작>"
    Judge Criteria: "<평가 항목>"
    Pass: judge verdict == ACCEPT
```

**Acceptance** (필수):
```markdown
- [ ] Acceptance: N/M eval 통과
```

N=M인 경우도 명시한다. N > M 또는 N < 1이면 plan-review NOT READY.

## 제약사항

- **예측 기반 평가**: 평가자가 실제 API 호출 없이 출력을 추론한다. Self-judgment bias가 있으므로 Acceptance 달성이 실제 품질을 보장하지 않는다. 실제 API 호출이 필요하면 호출자가 직접 구현해야 한다.
- **code-reviewer comment-only**: Acceptance 달성 후 code-reviewer가 실행되지만, 평가 대상 프롬프트 파일을 수정하지 않는다. 파일 수정이 필요하면 prompt-engineer를 재호출해야 한다.
- **최대 5회 반복**: 초과 시 최선 초안을 저장하고 사용자에게 판단을 위임한다.
- **simplify 미적용**: `prompt` 타입은 REFINE 사이클이 품질 개선을 담당한다.
- **경로 검증**: 쓰기 대상 파일은 프로젝트 루트 내부여야 하며 `.git/`, `*.pem`, `*.key`, `.env*` 패턴은 거부한다.
- **plan-review 검증**: `prompt` 타입 Task는 Eval Case 최소 2개·Input 필드·Acceptance 라인을 검증한다 (세부 규칙은 `impl-workflow.md` 참조).
