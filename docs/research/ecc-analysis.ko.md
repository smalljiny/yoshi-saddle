---
version: 1
---

# ECC 컴포넌트 분석

**출처**: `references/everything-claude-code/` (v1.10.0)  
**목적**: Everything Claude Code에서 하네스 개발에 유용한 컴포넌트 식별  
**날짜**: 2026-04-15

---

## 개요

Everything Claude Code(ECC)는 47개 에이전트, 183개 스킬, 79개 명령어를 제공하는 프로덕션급 Claude Code 플러그인이다. 이 문서는 하네스에 도입할 가치가 있는 컴포넌트 분석 결과를 기록한다.

평가 기준:
- **관련성** — Claude Code 기반 개발 워크플로우에 직접 유용한가
- **비중복성** — 기존 하네스 컴포넌트와 겹치지 않는가
- **범용성** — 특정 도메인이나 코드베이스에 종속되지 않는가

---

## 에이전트

### harness-optimizer
**경로**: `agents/harness-optimizer.md`  
**모델**: sonnet

하네스 설정 건강도를 7개 카테고리로 평가한다: Tool Coverage, Context Efficiency, Quality Gates, Memory Persistence, Agent Delegation, Hook Reliability, Cost Optimization. 카테고리별 0–10 점수 보고서와 상위 3개 개선 액션을 제시한다.

**유용한 이유**: 하네스 자체도 지속적으로 모니터링하고 개선해야 한다. 이 에이전트는 `settings.json`, `hooks.json`, 에이전트, 스킬을 감사하고 생산성에 영향을 미치기 전에 문제를 발견하는 피드백 루프를 완성한다.

---

### code-explorer
**경로**: `agents/code-explorer.md`

낯선 코드베이스를 매핑한다: 엔트리 포인트 발견, 실행 경로 추적, 아키텍처 레이어 식별, 패턴 및 의존성 문서화.

**유용한 이유**: `/dev:plan` 전에 기존 코드를 파악하면 중복 구현을 방지할 수 있다. planner 에이전트의 사전 단계로 자연스럽게 통합된다.

---

### code-simplifier
**경로**: `agents/code-simplifier.md`

코드를 명확성 중심으로 리팩토링한다: 중첩 감소, 중복 통합, 이름 개선. 수정 전후 테스트로 동작 보존을 검증한다.

**유용한 이유**: 기존 `refactor-cleaner` 에이전트를 명확성 관점에서 보완한다. `refactor-cleaner`가 데드코드를 제거한다면, `code-simplifier`는 살아있는 코드를 개선한다.

---

### docs-lookup
**경로**: `agents/docs-lookup.md`

Context7 MCP를 통해 `resolve-library-id` + `query-docs`로 라이브러리 문서를 조회한다. 학습 데이터 대신 실제 버전별 문서를 기반으로 답변한다.

**유용한 이유**: 잘못된 API 사용을 방지한다. 빠르게 변화하는 라이브러리(Next.js, Zod, LangChain)에서 학습 데이터가 오래됐을 때 특히 유용하다.

---

### comment-analyzer
**경로**: `agents/comment-analyzer.md`

코드 주석을 정확성(주석이 코드와 일치하는가), 완성도(복잡한 로직이 설명됐는가), 오래됨(comment rot 위험)으로 감사한다. TODO/FIXME 부채도 추적한다.

**유용한 이유**: `code-reviewer`를 보완한다. 오래됐거나 잘못된 주석은 온보딩과 유지보수 중 혼란의 흔한 원인이다.

---

## 스킬

### continuous-learning
**경로**: `skills/continuous-learning*/SKILL.md`

Claude Code 세션에서 재사용 가능한 패턴을 추출하는 구조화된 프로세스를 정의한다: 반복 솔루션 식별 → 일반화 → 스킬로 작성 → `skills/learned/`에 저장. 노이즈 저장을 방지하는 품질 필터 포함.

**유용한 이유**: 하네스에 이미 `/learn` 명령어와 `skills/learned/` 디렉토리가 있지만, *어떻게* 잘 추출할지 안내하는 스킬이 없다. 구체적인 기준과 출력 형식으로 이 공백을 채운다.

---

### skill-creator
**경로**: `skills/skill-create*/SKILL.md` (또는 동등한 파일)

git 히스토리와 세션 관찰에서 새 스킬을 만드는 방법을 안내한다. 프론트매터 형식, 섹션 구조(When to Activate, How It Works, Examples), 배치 정책을 다룬다.

**유용한 이유**: 하네스가 성장함에 따라 기여자들이 일관된 방식으로 새 스킬을 작성할 수 있는 메타 가이드가 필요하다.

---

### strategic-compact
**경로**: `skills/strategic-compact*/SKILL.md`

임의의 컨텍스트 사용량에서 자동 compaction을 기다리는 대신, 전략적 워크플로우 분기점(계획 완료 후, 새 phase 시작 전)에서 수동 `/compact`를 권장한다.

**유용한 이유**: 긴 세션(예: 여러 Task에 걸친 `/dev:impl` 실행)은 task 중간에 예상치 못한 compaction이 발생할 수 있다. 이 스킬은 compaction이 안전한 지점과 흐름을 방해하는 지점을 정의한다.

---

## 규칙

### common/performance
**경로**: `rules/common/performance.md`

모델 선택 전략(Haiku: 경량 작업, Sonnet: 코딩, Opus: 아키텍처/추론), context window 관리(대형 변경에는 마지막 20% 회피), extended thinking 사용 시점을 다룬다.

**유용한 이유**: 현재 하네스는 에이전트별 모델을 지정하지만 *왜* 그 모델인지 근거가 없다. 이 규칙은 모델 선택 로직을 명시적이고 가르칠 수 있게 만든다.

---

## 명령어

### /harness-audit
**경로**: `commands/harness-audit.md`

현재 `.claude/` 설정에 harness-optimizer 에이전트를 실행한다. 액션 아이템이 포함된 점수 건강 보고서를 생성한다. CI 통합을 위한 `--format json` 지원.

**유용한 이유**: `harness-optimizer`와 쌍을 이룬다. 변경 후 하네스 품질을 빠르게 평가하는 방법을 제공한다.

---

### /quality-gate
**경로**: `commands/quality-gate.md`

포맷, 린트, 타입 체크를 하나의 명령어로 실행한다. 선택적 `--fix` 플래그 지원. `/dev:verify`보다 가벼워 task 중간 스팟 체크용으로 적합하다.

**유용한 이유**: `/dev:verify`는 전체 게이트(빌드 + 테스트 + 보안)다. `/quality-gate`는 전체 스위트를 실행하지 않고 구현 중 빠른 체크를 위한 공백을 채운다.

---

### /checkpoint
**경로**: `commands/checkpoint.md`

현재 상태의 이름 있는 스냅샷 저장: 테스트 결과, 커버리지, 빌드 상태, 열린 TODO 항목. 복잡한 구현 중 안전한 롤백 참조 지점 제공.

**유용한 이유**: 여러 task에 걸친 긴 `/dev:impl` 세션은 명시적 체크포인트가 있어야 한다. 현재 하네스에는 세션 중간 상태 보존 메커니즘이 없다.

---

### /test-coverage
**경로**: `commands/test-coverage.md`

커버리지 보고서를 분석하고 테스트되지 않은 영역을 식별하며 누락된 케이스에 대한 테스트 스텁을 생성한다. `rules/common/testing.md`에 정의된 80% 임계값을 강제한다.

**유용한 이유**: `/dev:verify`는 커버리지 통과 여부를 확인하지만 달성하는 데 도움을 주지 않는다. 이 명령어는 "커버리지 실패"와 "테스트 작성" 사이의 간격을 메운다.

---

### /update-docs
**경로**: `commands/update-docs.md`

마지막 커밋 이후 변경된 파일을 감지하고 관련 문서를 찾아 목표한 업데이트를 제안한다. `/dev:review` 이후 실행하도록 설계됐다.

**유용한 이유**: 문서 드리프트는 흔한 문제다. 각 리뷰 후 문서 업데이트 제안을 자동화하면 수동 작업 없이 `docs/specs/`가 동기화된 상태를 유지한다.

---

## 채택하지 않은 것

평가 후 제외된 항목:

| 컴포넌트 | 이유 |
|---------|------|
| `loop-operator` 에이전트 | 자율 루프 관리 — 장기 실행 파이프라인용, 일반 기능 개발에는 불필요 |
| `chief-of-staff` 에이전트 | 이메일/Slack 트리아주 — 개발 하네스 범위 벗어남 |
| `bun-runtime` 스킬 | Bun 도입이 필요할 때 추가 |
| 언어 규칙 (Go, Kotlin, Python) | 해당 스택이 필요할 때 온디맨드로 추가, 선제적으로 추가하지 않음 |
| `/eval` 명령어 | AI 출력 평가 파이프라인 — 일반 개발 워크플로우 도구가 아님 |
| `/loop-start` 명령어 | 자율 멀티스텝 루프에 특화 — 현재로서는 명확한 이점 없이 복잡도만 증가 |
