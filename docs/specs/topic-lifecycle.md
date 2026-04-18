# 토픽 라이프사이클

> dev-context.json 기반 상태 기계로 /dev:spec부터 /dev:done까지 토픽 전체 생명주기를 관리한다.

## 개요

토픽 라이프사이클은 Claude Code 개발 하네스에서 작업 단위(토픽)의 상태를 일관되게 추적하고, 각 단계의 게이트를 강제 적용하는 시스템이다. `/dev:spec` 시점부터 토픽을 `dev-context.json`에 등록하고, `phase:status` 쌍으로 상태를 표현하며, `dev-context.js` CLI를 통해 모든 읽기/쓰기를 단일화한다. Codex `plan-review` 스킬을 통해 구현 계획을 검증하고, `/dev:done`에서 모든 산출물을 보존한다.

## 구조 / 스키마

### 디렉토리

```
.harness/
├── scripts/
│   ├── dev-context.js          CLI 스크립트 (5개 서브커맨드, config 점 경로 지원)
│   └── dev-context.test.js     59개 테스트 (node:test)
└── contracts/
    ├── spec-review.md          spec-review 리포트 형식 계약
    ├── plan-review.md          plan-review 리포트 형식 계약
    └── implementation-plan.md  구현 계획 형식 계약

.claude/
├── commands/dev/
│   ├── spec.md (v6)    토픽 등록 + spec 작성
│   ├── plan.md (v7)    spec:confirmed 게이트 + plan-review 안내
│   ├── impl.md (v4)    plan:confirmed 게이트 + impl:in-progress 전환 + auto_start 소비
│   ├── review.md (v4)  impl:in-progress 게이트 + 완료 검사
│   └── done.md (v3)    review:in-progress 게이트 + 보존 정책 (삭제 없음)
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
      "phase": "spec | plan | impl | review | docs | pr",
      "status": "drafting | reviewing | confirmed | ready | in-progress | generated | created",
      "spec": "<path>",
      "specReview": "<path>",
      "plan": "<path>",
      "planReview": "<path>",
      "currentTask": "<task-id> | null",
      "refDoc": "docs/specs/<name>.md",
      "branchType": "feature | fix | chore",
      "baseBranch": "<branch-or-null>",
      "createdAt": "<ISO 8601>",
      "updatedAt": "<ISO 8601>"
    }
  },
  "config": { ... },
  "updatedAt": "<ISO 8601>"
}
```

- `refDoc`: `/dev:docs` 완료 시 저장. PR body의 참조 문서 링크로 사용.
- `branchType`: `/dev:pr`의 브랜치명 패턴 검증에 사용.
- `baseBranch`: 토픽별 override. `null`이면 `config.git.baseBranch` 사용.

최상위 필드:
- `current_topic` · `topics`: 본 문서가 다루는 토픽 라이프사이클 상태
- `config`: 하네스 운영 설정 (깊이 2의 `config.<namespace>.<key>` 구조). 상세는 `dev-context-config.md`
- `updatedAt`: 파일 전체의 마지막 쓰기 시각 (`writeContext()`가 원자적 쓰기 직전에 갱신)

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
| review:in-progress | impl:in-progress, docs:generated |
| docs:generated | pr:created, review:in-progress |
| pr:created | docs:generated |

## 동작

### dev-context.js CLI

5개 서브커맨드로 `dev-context.json`을 전담 관리한다:

- `register-topic --topic=<n> --spec=<path>` — `spec:drafting`으로 등록, `current_topic` 설정, 레거시 필드 정리
- `update-state --topic=<n> --phase=<p> --status=<s>` — 전환 테이블 기반 유효성 검사 후 전환
- `set-field --topic=<n> --field=<f> --value=<v>` — 단일 필드 업데이트 (`phase`/`status` 보호됨). `--field=current_topic`은 `--topic` 없이 사용. `--field=config.<ns>.<key>`(깊이 2 고정) 경로는 전역 config 필드로 처리되며 config 경로에서만 타입 추론(`true`/`false` → boolean, 정수 리터럴 → number, 그 외 → string) 적용
- `remove-topic --topic=<n>` — 토픽 제거, `current_topic` 자동 전환
- `read --topic=<n> --field=<f>` / `read --field=current_topic` / `read --field=config.<ns>.<key>` — 필드 값 stdout 출력. config 경로는 `Object.hasOwn` 가드로 상속 속성을 제외하고 own property만 조회

쓰기는 원자적 (tmp → rename), 부모 디렉토리 자동 생성. `DEV_CONTEXT_PATH` 환경변수로 경로 오버라이드 가능 (테스트 격리용).

전역 `config` 섹션 스키마와 첫 키 `config.dev_impl.auto_start`의 사용 계약은 `dev-context-config.md` 참조.

### 커맨드 게이트 체계

각 커맨드는 진입 전 상태를 검증하고, 조건 미충족 시 완전 중단한다:

| 커맨드 | 진입 게이트 | 전환 |
|--------|------------|------|
| `/dev:plan` | spec:confirmed | → plan:ready → plan:reviewing |
| `/dev:impl` | plan:confirmed \| impl:in-progress | plan:confirmed → impl:in-progress |
| `/dev:review` | impl:in-progress + 모든 Task 완료 | → review:in-progress |
| `/dev:docs` | review:in-progress \| docs:generated | → docs:generated |
| `/dev:pr` | docs:generated \| pr:created | docs:generated → pr:created |
| `/dev:done` | pr:created | (remove-topic으로 제거) |

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
