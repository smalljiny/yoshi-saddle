# Spec Workflow

> `/dev:spec` 커맨드가 스펙 초안 저장, Codex 리뷰 루프, 분할 추천을 통해 스펙을 확정하는 워크플로우

## 개요

`/dev:spec`은 새 토픽의 스펙을 작성하고 Codex 리뷰를 통해 확정한다. 브레인스토밍 스킬로 초안을 작성하고, `dev-context.json`에 `current_spec` 임시 필드를 기록하여 Codex가 경로를 자동 파악할 수 있게 한다. 스펙 확정 후 Claude가 분할 필요성을 분석하고 추천한다.

## 구조 / 스키마

```
docs/_local/backlog/<topic>/
  spec.md                         # 스펙 초안 (git-ignored)
  spec-review-<yymmddhhmmss>.md   # Codex 리뷰 결과 (git-ignored)

docs/_local/dev-context.json
  current_spec: "docs/_local/backlog/<topic>/spec.md"  # 임시 필드 (초안 저장~확정)
```

`current_spec`은 `/dev:spec`이 초안 저장 후 기록하고, 스펙 확정(Step 6) 또는 `/dev:plan` 실행 시 제거된다.

## 동작

### `/dev:spec` 실행 흐름

1. **토픽 해석** — 인수 또는 backlog 스캔으로 토픽 결정. 기존 상태 감지로 재진입 지점 결정
2. **초안 작성** — `brainstorming/SKILL.md` 로드 후 협업으로 스펙 작성, `backlog/<topic>/spec.md`에 저장
3. **`current_spec` 기록** — `dev-context.json`에 스펙 경로 기록 (Codex 자동 파악용)
4. **Codex 리뷰 요청** — 사용자에게 `codex` 명령어 안내 후 대기
5. **리뷰 반영** — NOT READY면 Required Fixes 적용 후 재요청; READY/READY WITH NOTE면 적용 후 확정
6. **스펙 확정** — 확정 메시지 표시, `current_spec` 제거
7. **분할 추천** — Claude가 스펙 분석: 목표 3개 이상 + 독립 구현 가능 시 분할 추천, 사용자 승인 후 처리

### Codex `spec-review` 경로 해석

경로 해석 우선순위:

1. **명시 경로** — 항상 우선
2. **단독 존재 시 자동 해석**:
   - `current_spec`만 있음 → 해당 경로 사용 (backlog 초안)
   - `current_topic`만 있음 → `topics[current_topic].spec` 사용 (active 토픽)
3. **양쪽 모두 존재** — 사용자에게 어느 스펙을 리뷰할지 물어봄 (자동 선택 없음)
4. **없음** — 사용자에게 경로 요청

### `/dev:plan`의 `current_spec` 처리

`/dev:plan`은 토픽을 active로 등록할 때 `current_spec` 필드가 존재하면 함께 제거한다 (보조 정리).

### 분할 추천 기준

| 조건 | 결정 |
|------|------|
| 목표 3개 이상 + 독립 구현 가능 | 분할 추천 |
| 목표 2개 이하 또는 강하게 결합 | 단일 진행 |

분할 추천 시 서브 토픽 제안 → 사용자 승인 → `backlog-split/<topic>/`으로 부모 이동, 서브 토픽은 `backlog/<sub-topic>/`에 신규 생성.

## 제약사항

- `/dev:spec`은 `topics` 객체에 토픽을 등록하지 않는다 (등록은 `/dev:plan`)
- `current_spec` 외에 `dev-context.json`에 다른 필드를 기록하지 않는다
- Codex 핸드오프는 수동 — Claude가 직접 `codex` 명령을 실행할 수 없다
- 분할 기준의 상세 알고리즘 없음 — Claude가 스펙 내용을 보고 판단
