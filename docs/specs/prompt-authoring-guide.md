# Opus 4.7 프롬프트 작성 가이드

> Opus 4.7의 리터럴 해석 강화에 대응하는 7가지 작성 규칙을 단일 권위 가이드로 정의하고, 베이스라인 자동 로드 + 메타 컴포넌트 3종의 reinforcement 명시 로드 두 채널로 강제한다.

## 개요

Opus 4.7(2026-04 출시)은 4.6 대비 리터럴 해석이 강화되었다. 4.6에서 정중함 신호로 읽혔던 hedge(`try to`, `if possible`)가 4.7에서는 약한 지시로 처리되고, anti-laziness 스캐폴딩(`CRITICAL: You MUST`)이 과활성화 트리거가 되며, 명시 CoT 지시(`think step by step`)가 adaptive thinking과 충돌한다. 추가로 스코프 미명시 시 첫 매칭 항목에만 적용되고, 추상 필터어(`be conservative`)가 충실히 적용되어 recall이 떨어지며, 첫 turn front-load 부재 시 품질 저하, 도구 호출 기본 빈도 감소가 관찰된다.

이 가이드는 일곱 행동 변경 각각에 1:1 대응하는 작성 규칙을 단일 파일에 정의하고, 모든 하네스 컴포넌트(에이전트·스킬·커맨드·규칙)가 작성·수정 시 따르도록 강제한다.

## 구조 / 스키마

### 단일 권위 — `prompt-authoring.md`

```
.claude/rules/common/prompt-authoring.md   (version 1)
  ├── frontmatter (version)
  ├── preamble — 4.7 리터럴 해석 요약 + 가이드 사용 방법(자동 로드 + 명시 로드)
  ├── §1. 규칙 ↔ 4.7 행동 변경 매핑 표 (7행 1:1)
  ├── §2. 7가지 작성 규칙 — 각 규칙: (a) 진술 (b) 4.7 근거 (c) Before/After (d) 적용 대상
  └── §3. 적용 대상 요약 표 — 행=규칙, 열=컴포넌트 유형 (에이전트·스킬·커맨드·규칙)
```

### 7가지 규칙

| # | 규칙 | 4.7 근거 (연구 §1 항목) |
|---|------|------------------------|
| 1 | hedge 제거 — 명령형으로 진술 | 1. hedge가 약한 지시로 처리됨 |
| 2 | 스코프 명시 — 적용 범위 직접 진술 | 2. 미명시 시 첫 매칭 항목만 적용 |
| 3 | anti-laziness 스캐폴딩 제거 | 3. 강조형이 과활성화 트리거 |
| 4 | 필터 지시 제거 또는 정량화 | 4. 추상 필터어가 recall 저하 |
| 5 | CoT 명시 지시 제거 | 5. adaptive thinking과 충돌 |
| 6 | 첫 turn 정보 front-load | 6. 첫 turn attention 가중치 |
| 7 | 도구 호출 트리거 명시 | 7. 도구 호출 기본 빈도 감소 |

### 적용 대상 (요약)

| 규칙 | 에이전트 | 스킬 | 커맨드 | 규칙 |
|------|---------|------|--------|------|
| 1·3·6 | 필수 | 필수 | 필수 | 필수·권장 |
| 2 | 필수 | 필수 | 필수 (배치 지시) | 권장 |
| 4 | 필수 (reviewer·classifier) | 필수 (필터링 단계) | 권장 | 해당 없음 |
| 5 | 필수 | 필수 (판정 단계) | 권장 | 해당 없음 |
| 7 | 필수 (도구 보유) | 권장 (도구 호출 단계) | 해당 없음 | 해당 없음 |

자세한 매핑·Before/After 예시는 `.claude/rules/common/prompt-authoring.md` §2·§3 참조.

## 동작

### 베이스라인 채널 — 자동 로드

`CLAUDE.md`가 `@.harness/harness-guide.md`로 include되며, `.claude/rules/common/` 하위 파일은 모든 Claude 세션의 기본 컨텍스트에 부착된다. `prompt-authoring.md`도 동일 메커니즘으로 모든 세션의 baseline awareness가 된다 — 별도 호출 없이 컴포넌트 작성·실행 시점에 가이드를 인지한다.

### Reinforcement 채널 — 메타 컴포넌트 3종 명시 로드

베이스라인 위에서, 컴포넌트 작성을 주도하는 메타 컴포넌트는 작성 직전에 가이드를 명시 로드해 attention을 재환기한다. 두 채널은 baseline + reinforcement 결합이다.

| 메타 컴포넌트 | 로드 시점 | 위치 |
|--------------|----------|------|
| `meta-skill-creator/SKILL.md` | 새 스킬 작성·기존 스킬 수정 직전 | `### Step 4: Edit the SKILL.md` 도입부 |
| `agents/planner.md` | 컴포넌트 신규·수정 Task 본문(Plan) 작성 직전 | `### 4.6. Component Authoring — load prompt-authoring rule` |
| `agents/prompt-engineer.md` | PROPOSE 단계 진입 직전 | `## Behavior on Invocation` 안 stack-prompt 로드 위 |

세 사이트 모두 표준 문구 한 줄을 본문 평문으로 포함한다:

```
Load .claude/rules/common/prompt-authoring.md and follow its process.
```

### Delegation Pattern 표준 확장

`component-boundaries.md`의 Delegation Pattern (Standard) 섹션은 기존 Skill 위임 케이스(`Load \`.claude/skills/<name>/SKILL.md\` and follow its process.`)에 더해 Rule 명시 로드 케이스를 표준으로 추가했다:

```
Load <rule-path> and follow its process.
```

Skill 위임과 동일 form을 규칙 경로에 적용한다. 본 토픽의 메타 컴포넌트 3종이 첫 적용 사례다. 자세한 동작은 `command-skill-boundary.md`의 표준 위임 패턴 섹션 참조.

### 컴포넌트 추가 진입점 노출

`harness-guide.md`의 "## 컴포넌트 추가 방법" 섹션에 가이드 참조 한 줄이 추가되어, 컴포넌트 작성자가 작성 시점에 즉시 prompt-authoring.md의 위치를 인지한다.

## 제약사항

- **단일 권위 — 중복 정의 금지**: 7가지 규칙의 정의·예시·적용 대상은 `prompt-authoring.md`에만 존재한다. 다른 컴포넌트는 4.7 규칙을 중복 정의하지 않고 이 파일을 참조한다.
- **Reinforcement 비대상**: `code-reviewer`, `security-reviewer`, `database-reviewer` 및 모든 도메인 스킬·에이전트는 베이스라인 채널만 받는다. lint 검증·일제 점검은 별도 토픽(`harness-prompt-47-audit`).
- **기존 컴포넌트 일제 점검 미포함**: 30+ 기존 컴포넌트의 hedge·anti-laziness 스캐폴딩·CoT 스캐폴딩 검출·수정은 본 토픽 범위 밖. 별도 토픽으로 분리한다.
- **lint 검증 메커니즘 미도입**: `code-reviewer`/`security-reviewer`가 컴포넌트 파일 수정 시 7가지 규칙 위반을 명시 검출하는 자동화는 본 토픽 범위 밖.
- **Anthropic 공식 스킬 안티 패턴 미통합**: over-explaining / vague descriptions / deeply nested references / time-sensitive content / inconsistent terminology 5종은 별도 토픽(`meta-skill-creator-anti-patterns`).
- **Codex / AGENTS.md 영향 없음**: Codex(GPT-5 계열)는 행동이 다르며 본 가이드는 Opus 4.7 특화이므로 Codex 컨텍스트 파일은 수정하지 않는다.
- **효과 정량 측정 없음**: 4.7 응답 변화는 직접 관찰·회고로만 평가한다. 자동화된 효과 측정 파이프라인은 도입하지 않는다.
- **다른 모델로의 일반화 미정**: 7가지 규칙 중 일부(특히 #6 front-load, #2 스코프 명시)는 Sonnet 4.6 / Haiku 4.5 등에서도 유효할 가능성이 높다. 후속 모델 비교 토픽에서 일반화 여부를 결정한다.

## 관련 문서

- `command-skill-boundary.md` — Delegation Pattern 표준 (Skill 위임 + Rule 명시 로드 케이스)
- `meta-skill-creator.md` — Step 4 prompt-authoring 명시 로드
- `prompt-eval-workflow.md` — `prompt-engineer` Behavior on Invocation의 prompt-authoring 명시 로드
- `.claude/rules/common/prompt-authoring.md` — 7가지 규칙 본문 (단일 권위)
- `.harness/harness-guide.md` — 컴포넌트 추가 방법 진입점
