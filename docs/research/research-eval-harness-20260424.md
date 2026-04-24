# AI 에이전트 Eval-Driven Development 프레임워크: Research Report
*Generated: 2026-04-24 | Sources: 40+ | Adapters: [stack-exa, stack-firecrawl]*

## Executive Summary

Eval-Driven Development(EDD)은 LLM/AI 에이전트의 품질을 "직감 체크"가 아닌 정량적 평가로 대체하는 개발 방법론이다. 평가를 개발 사이클의 시작점에 두고, 모든 변경사항이 eval 스코어를 오라클로 삼아 검증된다. Anthropic의 2026년 1월 공개 글에서 강조한 핵심은 "에이전트를 평가할 때 우리는 하네스와 모델을 함께 평가하는 것"이라는 점이다 — Claude Code 하네스에서 스킬·커맨드·에이전트를 eval하는 것이 바로 이 맥락이다. pass@k(역량 상한)와 pass^k(신뢰성)를 분리해 사용하고, 코드 기반 → LLM-as-judge → 휴먼 리뷰의 3단계 grader 위계를 따르는 것이 현재 모범 사례다.

---

## 1. Eval-Driven Development (EDD) 방법론

### 1.1 핵심 개념

EDD는 LLM 기반 애플리케이션의 **작동 명세(working specification)로 evaluation을 사용**하는 방법론이다. 프롬프트를 수정하거나 모델을 교체하기 전에 품질 기준을 정의하고, 모든 변경사항을 그 기준으로 검증한다 ([Braintrust](https://www.braintrust.dev/articles/eval-driven-development)).

- **Eval = 오라클**: 스코어가 올라가면 제품 품질이 올라간 것. 스코어가 내려가면 품질이 떨어진 것.
- **회귀 방지는 부수 효과**: EDD의 진짜 가치는 상류에 있다 — 주관적 판단이 아닌 구체적 최적화 타깃 제공
- **평가는 마지막이 아닌 첫 번째**: 구현 전에 성공 기준을 정의

### 1.2 학술적 기반: EDDOps (arXiv:2411.13768)

Xia et al. (2024)는 LLM 에이전트를 위한 **평가 주도 개발·운영(EDDOps)** 프로세스 모델을 제안한다:

- **오프라인 평가** (개발 시): 고정 benchmark + 정적 test suite
- **온라인 평가** (런타임): 실제 배포 중 지속적 모니터링
- **폐쇄 피드백 루프**: 평가 증거가 런타임 적응과 재개발을 모두 구동

전통적 방법(고정 benchmark, 단발성 checkpoint)은 에이전트의 창발적 행동과 지속적 적응을 포착하지 못한다고 비판.

### 1.3 스킬 전용 Eval 패턴 (OpenAI)

OpenAI의 Codex 스킬 평가 가이드는 하네스 스킬 eval에 직접 적용 가능하다 ([developers.openai.com](https://developers.openai.com/blog/eval-skills)):

```
eval = prompt → captured run (trace + artifacts) → set of checks → score
```

성공 기준 분류:
- **Outcome goals**: 태스크가 완료됐는가?
- **Process goals**: 스킬이 올바르게 호출되고 예상 단계를 따랐는가?
- **Style goals**: 출력이 컨벤션을 따르는가?
- **Efficiency goals**: 불필요한 반복 없이 완료됐는가?

핵심 인사이트: "스킬의 name과 description이 가장 중요하다 — 에이전트가 스킬을 호출할지 말지 결정하는 1차 신호다."

---

## 2. pass@k 메트릭 활용법

### 2.1 두 메트릭의 분리

단일 pass rate는 두 가지 본질적으로 다른 속성을 혼동한다 ([Agent Patterns](https://agentpatterns.ai/verification/pass-at-k-metrics/)):

| 메트릭 | 의미 | 질문 |
|--------|------|------|
| **pass@k** | k번 시도 중 최소 1번 성공 확률 | "이 에이전트가 이 문제를 원칙적으로 풀 수 있나?" |
| **pass^k** | k번 시도 모두 성공 확률 | "프로덕션에서 이 에이전트를 믿을 수 있나?" |

### 2.2 해석 매트릭스

| pass@k | pass^k | 해석 |
|--------|--------|------|
| High | High | 역량 있고 일관됨 → 자동화 가능 |
| High | Low | 역량은 있지만 불안정 → 휴먼 리뷰 필요 |
| Low | — | 해당 태스크 클래스를 해결 불가 |

### 2.3 권장 임계값

ECC eval-harness 스킬 및 관련 실무에서 수렴된 기준:
- **Capability evals**: pass@3 ≥ 90%
- **Regression evals (릴리즈 크리티컬)**: pass^3 = 100%
- **Capability evals**: pass@1 ≥ 67% (1회 시도 직접 신뢰성)

### 2.4 pass@k의 한계

ICLR 2026 "Don't Pass@k" 논문은 pass@k가 대형 k에서 성공률을 지수적으로 과장한다고 비판한다. Bayesian 대안이 제안되고 있으나 아직 업계 표준은 pass@k + pass^k 조합이다.

---

## 3. Grader 접근법

### 3.1 3단계 Grader 위계

모든 eval 태스크는 grader가 필요하다 — "올바름"의 의미를 결정하는 메커니즘 ([Agent Patterns Grading Strategies](https://agentpatterns.ai/training/eval-driven-development/grading-strategies/)):

| 방법 | 속도 | 신뢰성 | 커버리지 |
|------|------|--------|--------|
| **Code-based** | 밀리초 | 결정론적 | 검증 가능한 출력에 한정 |
| **LLM-as-judge** | 초 단위 | 캘리브레이션 필요 | 주관적 품질 커버 |
| **Human** | 분~시간 | 골든 스탠다드 | 모든 것 커버 |

**전략**: 각 케이스를 커버하는 가장 가벼운 grader를 사용.

### 3.2 Code-based Grader

- 결정론적: 동일 입력 → 동일 판정
- 적합: test suite pass/fail, schema 검증, regex 매칭, state 비교, 수치 임계값
- 장점: 빠름, 외부 의존성 없음, 디버그 용이
- 단점: 자유형 텍스트의 스타일·일관성·사실 정확성 평가 불가

코딩 에이전트에서는 test suite가 가장 신뢰할 수 있는 outcome grader ([Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

### 3.3 LLM-as-Judge

- **품질 차원을 독립적으로 점수화**: 단일 집계 점수에 의존하지 말 것 (정확하지만 불완전하거나, 완전하지만 부정확할 수 있음)
- **복수 독립 judge 사용** 권장 (앙상블)
- **rubric 설계가 핵심**: 1-10 척도보다 명시적 기준이 있는 discrete 점수 권장
- 한계: judge 모델 품질에 의존, 자기 편향(self-bias) 주의

### 3.4 Anthropic의 에이전트 평가 구조

Anthropic 내부 사례 ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)):

- **Task**: 정의된 입력과 성공 기준이 있는 단일 테스트
- **Trial**: 태스크의 각 시도 (모델 출력 변동 때문에 여러 trial 실행)
- **Grader**: 에이전트 성능의 어떤 측면을 점수화하는 로직

핵심 인사이트: **"에이전트를 평가할 때 우리는 하네스와 모델을 함께 평가하는 것이다."**

---

## 4. AI 에이전트 회귀 테스트

### 4.1 회귀의 특성

- WE-CI 연구(18개 모델, 100개 저장소): **75%의 AI 코딩 에이전트가 장기 유지보수 중 회귀를 도입**
- 프롬프트 변경·모델 버전 업그레이드·스킬 수정이 모두 회귀 발생 지점
- 회귀는 크게 실패하지 않고 조용히 드리프트한다 ("Regrada: Your AI doesn't break loudly — it drifts quietly")

### 4.2 회귀 테스트 구축 패턴

1. **Golden Dataset**: 주요 프롬프트에 대한 expected output을 저장하고, 새 버전과 비교
2. **Baseline 스냅샷**: git SHA 또는 checkpoint 이름으로 기준점 설정
3. **Behavioral Diff**: `modeldiff`, `modeldiffx`, `llm-behavior-diff` 같은 도구로 버전 간 행동 변화 포착
4. **CI/CD 통합**: GitHub Actions 등에서 eval suite를 자동 실행

### 4.3 LLM 회귀 테스트의 핵심 원칙

- 출력 매칭이 아닌 **행동 검증**: 특정 단어보다 결정 패턴과 워크플로우 시퀀스를 검증
- 비결정론적 특성 수용: pass@k로 성공 분포를 측정
- 메트릭 드리프트 모니터링: 코스트·레이턴시 드리프트도 함께 추적

---

## 5. Claude Code 하네스 컴포넌트 Eval 설계

### 5.1 핵심 제약: 자동 실행 루프의 한계

Claude Code 하네스 컴포넌트(스킬, 커맨드, 에이전트)를 평가하는 데 있어 전통적 소프트웨어 테스트와 다른 핵심 제약이 있다:

- "테스트 대상 코드"가 바로 **Claude Code가 스킬/커맨드를 실행하는 행위**
- Claude Code가 자기 자신을 자동으로 실행할 수 없음
- 해결책 옵션:
  - **(a) Claude API 직접 호출**: 스킬/커맨드 프롬프트를 Claude API로 전달, 출력 검증
  - **(b) Codex CLI**: 별도 런타임으로 eval 케이스 실행
  - **(c) 세션 재현**: 기록된 세션을 재실행하고 결과 비교
  - **(d) 수동 eval**: 체크리스트 기반 인간 실행 + 결과 로깅

### 5.2 평가 대상별 eval 전략

**스킬 eval:**
- 스킬 호출 여부 (process goal)
- 출력 형식 준수 (style goal, code-based grader)
- 기능 완성도 (outcome goal, LLM-as-judge 또는 code-based)

**커맨드 eval:**
- 워크플로우 단계 순서 준수 (process goal)
- 상태 전환 정확성 (code-based: dev-context.json 상태 확인)
- 산출물 파일 생성 여부 (code-based)

**에이전트 eval:**
- 태스크 완성률 (outcome goal)
- 도구 호출 정확성 (process goal, code-based)
- 출력 품질 (LLM-as-judge)

### 5.3 Eval 저장 구조

```
.claude/evals/
  <component-name>.md      # Eval 정의 (태스크, 성공 기준, grader 지정)
  <component-name>.log     # Eval 실행 이력 (pass/fail, pass@k 집계)
  baseline.json            # 회귀 baseline 스냅샷
docs/releases/<version>/
  eval-summary.md          # 릴리즈 eval 스냅샷
```

---

## Key Takeaways

1. **EDD의 핵심**: 평가를 개발 마지막이 아닌 첫 번째 단계로 — 구현 전에 성공 기준 정의
2. **pass@k ≠ pass^k**: 역량 측정(pass@k)과 신뢰성 측정(pass^k)을 반드시 분리
3. **Grader 위계 준수**: Code-based → LLM-as-judge → Human 순으로 가장 가벼운 grader 사용
4. **하네스 컴포넌트 평가 = 하네스 + 모델 함께**: 스킬/커맨드/에이전트는 Claude와 분리해 평가 불가
5. **자동 실행 루프의 현실적 한계**: Claude Code가 자기를 실행할 수 없으므로 Claude API / Codex / 수동 실행 중 하나를 선택해야 함
6. **회귀는 조용히 드리프트**: 출력 매칭보다 행동 패턴 검증이 중요; golden dataset 구축 필수
7. **eval 아티팩트는 1급 시민**: 코드와 함께 버전 관리, `.claude/evals/`에 영구 보관

---

## Sources

1. [Demystifying evals for AI agents — Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — Anthropic 공식 에이전트 eval 가이드. 하네스+모델 함께 평가 원칙. (2026-01-09)
2. [Evaluation-Driven Development and Operations of LLM Agents — arXiv:2411.13768](https://arxiv.org/abs/2411.13768) — EDDOps 프로세스 모델. 오프라인+온라인 평가 통합.
3. [pass@k and pass^k: Capability and Consistency Metrics — Agent Patterns](https://agentpatterns.ai/verification/pass-at-k-metrics/) — pass@k vs pass^k 구분. 해석 매트릭스.
4. [What is eval-driven development — Braintrust](https://www.braintrust.dev/articles/eval-driven-development) — EDD 실무 가이드. Eval-as-oracle 모델.
5. [Testing Agent Skills Systematically with Evals — OpenAI Developers](https://developers.openai.com/blog/eval-skills) — 스킬 전용 eval 패턴. Outcome/Process/Style/Efficiency goals.
6. [Grading Strategies for Agent Evaluation Suite Design — Agent Patterns](https://agentpatterns.ai/training/eval-driven-development/grading-strategies/) — 3단계 grader 위계. Code-based/LLM-as-judge/Human.
7. [Agent Evaluation — Claude Code Guide](https://cc.bruniaux.com/guide/agent-evaluation/) — `.claude/agents/` 에이전트 평가. 메트릭 추적 및 훅 구현.
8. [LLM-as-a-judge: a complete guide — Evidently AI](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) — LLM-as-judge 실무. 편향 완화 전략.
9. [Eval-driven development: Build and evaluate AI agents — Red Hat Developer](https://developers.redhat.com/articles/2026/03/23/eval-driven-development-build-evaluate-ai-agents) — 8단계 EDD 프레임워크. DeepEval, CI/CD 통합.
10. [DON'T PASS@K: A Bayesian Framework — ICLR 2026](https://openreview.net/pdf?id=PTXi3Ef4sT) — pass@k의 한계와 Bayesian 대안.
11. [LLM behavioral regression testing — modeldiff/modeldiffx](https://github.com/stef41/modeldiff) — 모델 버전 간 행동 차이 포착 도구.
12. [Building and evaluating alignment auditing agents — Anthropic Alignment](https://alignment.anthropic.com/2025/automated-auditing/) — Swiss Cheese 모델. 다층 평가 필요성.
13. [Statistical approach to model evaluations — Anthropic Research](https://www.anthropic.com/research/statistical-approach-to-model-evals) — 벤치마크 비교의 통계적 엄밀성.
14. [From Pass@k to Pass^k: Measuring reliability for healthcare AI — Infinitus](https://www.infinitus.ai/blog/from-passk-to-passk-measuring-reliability-for-healthcare-ai/) — 프로덕션 임계값 가이드.
15. [CI/CD for Evals: Prompt & Agent Regression Tests in GitHub Actions — Kinde](https://kinde.com/learn/ai-for-software-engineering/ai-devops/ci-cd-for-evals-running-prompt-and-agent-regression-tests-in-github-actions/) — CI/CD eval 통합 가이드.

## Methodology

Searched 20 queries. Adapters used: [stack-exa, stack-firecrawl]. Sub-questions investigated: (1) EDD 방법론 및 프레임워크, (2) pass@k 메트릭 활용법, (3) grader 접근법, (4) AI 에이전트 회귀 테스트, (5) Claude/LLM 워크플로우 eval 파이프라인. Sources analyzed: 40+.
