# Spec Workflow

> `/dev:spec`은 brainstorming 스킬과 협력하여 스펙 초안을 작성하고, 토픽을 `dev-context.json`에 등록하며, Codex 리뷰 루프를 통해 스펙을 확정하고 분할 필요성을 추천한다.

## 개요

스펙 작성 흐름은 두 구성 요소가 협력한다. **brainstorming 스킬**은 대화를 통해 스펙 내용을 완성하고, **`/dev:spec` 커맨드**는 파일 영속성, 토픽 등록, 상태 전환, Codex 리뷰 루프, 분할 추천을 담당한다. 스펙이 확정되면 `/dev:plan`으로 넘어가 구현 계획을 수립한다.

## 구조 / 스키마

### 디렉토리

```
docs/_local/backlog/<topic>/
  spec.md                           # 스펙 초안 (git-ignored)
  spec-review-<yymmddhhmmss>.md     # Codex 리뷰 리포트 (git-ignored)
```

스펙은 `/dev:plan`이 실행되기 전까지 `backlog/`에 머물고, 이후 `docs/_local/active/<topic>/`로 이동한다.

### dev-context.json 관련 필드

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "spec",
      "status": "drafting | reviewing | confirmed",
      "spec": "docs/_local/backlog/<topic>/spec.md",
      "specReview": "<path-to-latest-review>"
    }
  }
}
```

- `topics[<topic>].spec`: `/dev:spec`이 Step 3에서 `register-topic`으로 초기 기록
- `topics[<topic>].specReview`: Codex `spec-review` 스킬이 `set-field`로 기록 (Claude는 쓰지 않음)

## 동작

### 역할 분리

| 역할 | 담당 |
|------|------|
| 대화로 스펙 내용 완성 | brainstorming 스킬 |
| 완성된 스펙 파일 저장 | `/dev:spec` |
| 토픽 등록 (`register-topic`) | `/dev:spec` |
| 상태 전환 (`spec:drafting` → `spec:reviewing` → `spec:confirmed`) | `/dev:spec` |
| Codex 리뷰 루프 관리 | `/dev:spec` |
| `specReview` 필드 업데이트 | Codex `spec-review` 스킬 |
| 분할 추천 | `/dev:spec` (Step 7) |

### brainstorming 스킬 동작

**대화 프로세스**:
- 한 번에 하나씩 질문하여 아이디어를 구체화한다
- 방향이 불명확할 때만 2-3가지 접근방식을 제안한다. 사용자가 이미 방향을 제시한 경우 대안을 강요하지 않고 검증한다
- 200-300단어 섹션 단위로 스펙을 작성하며 각 섹션마다 검증한다

**출력 계약**:
- 완성된 스펙을 대화 안에서 인라인으로 제시한다
- 스킬 자체는 파일로 저장하지 않는다 — 저장은 `/dev:spec`의 책임
- 완료 시 자연어로 선언한다: *"스펙 초안이 완성되었습니다. /dev:spec이 파일로 저장합니다."*

**출력 형식**:
- 필수 섹션: 개요 / 목표 / 의사결정 / Non-goals / Open Questions / 관련 문서
- 선택 섹션 (섹션 3은 반드시 포함):
  - `## 3. 아키텍처` — 코드/기능 토픽
  - `## 3. 역할 정의` — 워크플로우/정책/역할 조정 토픽
  - 두 유형에 해당하지 않으면 `역할 정의` 구조 사용

### `/dev:spec` 실행 흐름

1. **토픽 해석** — 인수 또는 `current_topic` · `backlog/` 스캔으로 토픽 결정. 기존 `phase:status`에 따라 재진입 지점을 자동 결정
2. **작업 디렉토리 준비** — `docs/_local/backlog/<topic>/` 생성
3. **초안 작성 및 등록** — `brainstorming/SKILL.md` 로드 → 완성 선언 후 `backlog/<topic>/spec.md` 저장 → `register-topic`으로 `topics[<topic>]`을 `spec:drafting` 상태로 등록
4. **Codex 리뷰 요청** — `spec:reviewing`으로 전환 후 사용자에게 `codex` 명령 안내, 대기
5. **리뷰 반영** —
   - `NOT READY` → Required Fixes 반영 후 `spec:drafting`으로 롤백 → Step 4 재요청
   - `READY` / `READY WITH NOTE` → 사실 오류·누락 컨텍스트·누락 Open Questions를 수정하는 Notes만 반영 → Step 6
6. **스펙 확정** — `spec:confirmed`로 전환
7. **분할 추천** — Claude가 스펙을 분석하여 분할 여부를 추천 (아래 기준 참조)

### 재진입 상태 매핑

| `phase:status` | 진입 지점 |
|----------------|----------|
| topic 미등록 | Step 2 (일반 흐름) |
| `spec:drafting` + spec 파일 존재 | Step 4 (리뷰 요청) |
| `spec:reviewing` + 리뷰 파일 없음 | Step 4 (Codex 대기) |
| `spec:reviewing` + 최신 리뷰가 NOT READY | Step 5 (리뷰 반영) |
| `spec:confirmed` | Step 7 (분할 추천) |

### Codex `spec-review` 경로 해석

Codex는 `current_topic`이 등록되어 있으면 `topics[current_topic].spec` 경로를 자동 해석한다. 명시 경로가 주어지면 그것을 우선 사용한다. 경로 모호성이 있으면 사용자에게 확인을 요청하며 자동 선택하지 않는다.

### 분할 추천 기준

| 조건 | 결정 |
|------|------|
| 목표 3개 이상 + 독립 구현 가능 | 분할 추천 |
| 목표 2개 이하 또는 강하게 결합 | 단일 진행 |

분할 추천 시 서브 토픽 제안 → 사용자 승인 → 부모 디렉토리를 `backlog-split/<topic>/`으로 이동(요약 참조로 보존하되 `/dev:plan` 탐색에서 제외), 서브 토픽은 `backlog/<sub-topic>/`에 신규 생성.

### spec-review 체크리스트의 섹션 3 수용 규칙

Codex `spec-review` 체크리스트 항목 3(아키텍처 충분성)은 코드 토픽의 `## 3. 아키텍처`와 비코드 토픽의 `## 3. 역할 정의`를 모두 수용한다. 어떤 형태로든 섹션 3이 부재하면 FAIL이다.

## 제약사항

- **Codex 핸드오프는 수동** — Claude Code는 `codex` 명령을 직접 호출할 수 없다. 사용자가 터미널에서 실행한다
- **`specReview` 필드는 Codex 소유** — `/dev:spec`은 이 필드를 쓰지 않는다
- **brainstorming 스킬은 `dev-context.json`을 읽거나 쓰지 않는다** — 스킬은 대화·초안 내용만 담당하고, 모든 상태 기록·토픽 등록·상태 전환은 `/dev:spec`이 수행한다
- **분할 알고리즘은 판단형** — 엄격한 의사결정 트리가 아닌 Claude의 스펙 분석 기반 추천. 사용자 승인이 최종 결정
- **NOT READY에서 확정 불가** — 리뷰 루프는 `READY` 또는 `READY WITH NOTE`가 나올 때까지 반복한다
- **스타일 Notes·범위 확장 Notes는 반영 금지** — 사실 오류·누락 컨텍스트·누락 Open Questions에 해당하는 Notes만 반영
