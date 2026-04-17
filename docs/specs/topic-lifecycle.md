# 토픽 라이프사이클

> dev-context.json 기반 상태 기계로 /dev:spec부터 /dev:done까지 토픽 전체 생명주기를 관리한다.

## 개요

토픽 라이프사이클은 Claude Code 개발 하네스에서 작업 단위(토픽)의 상태를 일관되게 추적하고, 각 단계의 게이트를 강제 적용하는 시스템이다. `/dev:spec` 시점부터 토픽을 `dev-context.json`에 등록하고, `phase:status` 쌍으로 상태를 표현하며, `dev-context.js` CLI를 통해 모든 읽기/쓰기를 단일화한다. Codex `plan-review` 스킬을 통해 구현 계획을 검증하고, `/dev:done`에서 모든 산출물을 보존한다.

## 구조 / 스키마

### 디렉토리

```
.harness/
├── scripts/
│   ├── dev-context.js          CLI 스크립트 (5개 서브커맨드)
│   └── dev-context.test.js     31개 테스트 (node:test)
└── contracts/
    ├── spec-review.md          spec-review 리포트 형식 계약
    ├── plan-review.md          plan-review 리포트 형식 계약
    └── implementation-plan.md  구현 계획 형식 계약

.claude/
├── commands/dev/
│   ├── spec.md (v6)    토픽 등록 + spec 작성
│   ├── plan.md (v7)    spec:confirmed 게이트 + plan-review 안내
│   ├── impl.md (v3)    plan:confirmed 게이트 + impl:in-progress 전환
│   ├── review.md (v4)  impl:in-progress 게이트 + 완료 검사
│   └── done.md (v3)    review:in-progress 게이트 + 이동 정책
└── skills/
    └── dev-context/SKILL.md    dev-context.js 사용 계약 스킬

.codex/skills/
├── spec-review/ (v5)   8점 스펙 품질 게이트
└── plan-review/ (v1)   8점 구현 계획 품질 게이트
```

### dev-context.json 스키마

```json
{
  "current_topic": "<topic-name>",
  "topics": {
    "<topic-name>": {
      "phase": "spec | plan | impl | review",
      "status": "drafting | reviewing | confirmed | ready | in-progress",
      "spec": "<path>",
      "specReview": "<path>",
      "plan": "<path>",
      "planReview": "<path>",
      "currentTask": "<task-id> | null",
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  }
}
```

### 상태 전환표

| From | Allowed Next |
|------|-------------|
| spec:drafting | spec:reviewing |
| spec:reviewing | spec:confirmed, spec:drafting |
| spec:confirmed | plan:ready |
| plan:ready | plan:reviewing |
| plan:reviewing | plan:confirmed, plan:ready |
| plan:confirmed | impl:in-progress |
| impl:in-progress | review:in-progress |
| review:in-progress | impl:in-progress |

## 동작

### dev-context.js CLI

5개 서브커맨드로 `dev-context.json`을 전담 관리한다:

- `register-topic --topic=<n> --spec=<path>` — `spec:drafting`으로 등록, `current_topic` 설정, 레거시 필드 정리
- `update-state --topic=<n> --phase=<p> --status=<s>` — 전환 테이블 기반 유효성 검사 후 전환
- `set-field --topic=<n> --field=<f> --value=<v>` — 단일 필드 업데이트 (`phase`/`status` 보호됨). `--field=current_topic`은 `--topic` 없이 사용
- `remove-topic --topic=<n>` — 토픽 제거, `current_topic` 자동 전환
- `read --topic=<n> --field=<f>` / `read --field=current_topic` — 필드 값 stdout 출력

쓰기는 원자적 (tmp → rename), 부모 디렉토리 자동 생성. `DEV_CONTEXT_PATH` 환경변수로 경로 오버라이드 가능 (테스트 격리용).

### 커맨드 게이트 체계

각 커맨드는 진입 전 상태를 검증하고, 조건 미충족 시 완전 중단한다:

| 커맨드 | 진입 게이트 | 전환 |
|--------|------------|------|
| `/dev:plan` | spec:confirmed | → plan:ready → plan:reviewing |
| `/dev:impl` | plan:confirmed \| impl:in-progress | plan:confirmed → impl:in-progress |
| `/dev:review` | impl:in-progress + 모든 Task 완료 | → review:in-progress |
| `/dev:done` | review:in-progress | (remove-topic으로 제거) |

### Codex 스킬 연동

**spec-review** (v5): spec 초안 8점 평가. 결과를 `specReview` 필드에 기록 (Codex 소유). 명시 경로와 `current_topic` 등록 경로 불일치 시 사용자에게 확인 요청 후 기록.

**plan-review** (v1): 구현 계획 8점 평가. plan + spec 두 경로를 별도로 해석. READY/READY WITH NOTE → `plan:confirmed` 전환, NOT READY → `plan:ready` 복귀. `planReview` 필드 업데이트는 Codex 소유.

### 계약 파일

`.harness/contracts/`는 Claude↔Codex 교환 문서의 형식 계약을 정의한다. 각 파일은 Producer/Consumer를 명시하고 출력 형식과 상태 전환 책임을 규정한다.

| 계약 파일 | Producer | Consumer |
|-----------|----------|----------|
| `spec-review.md` | Codex spec-review | Claude /dev:spec, /dev:plan |
| `plan-review.md` | Codex plan-review | Claude /dev:impl |
| `implementation-plan.md` | Claude planner | Codex plan-review, Claude /dev:impl |

## 제약사항

- 토픽은 `/dev:spec` 이전에 등록 불가 — `register-topic`은 spec 초안 저장 직후 호출
- `phase`/`status` 직접 수정 불가 — `update-state` 전용
- 허용되지 않은 상태 전환 시 non-zero exit, 허용 전환 목록 stderr 출력
- `review:in-progress` 이후 상태 없음 — `/dev:done`이 `remove-topic`으로 제거
- `docs/specs/` 참조 문서만 git-tracked; `docs/_local/`은 git-ignored
- 비-current 토픽 plan-review 실행 불가 — 먼저 `/dev:topic switch <topic>` 필요
- `/dev:review`는 모든 Task가 완료된 경우에만 실행 가능 (`currentTask=null` + `[ ]` 없음)
