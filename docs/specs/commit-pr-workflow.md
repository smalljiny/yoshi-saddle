# PR 중심 커밋 워크플로우

> harness의 `/dev:*` 워크플로우에서 commit 시점을 명시하고, 참조 문서 생성·PR 공개·아카이브를 분리된 명령어로 처리하는 시스템.

## 개요

harness 개발 워크플로우는 `/dev:spec → /dev:plan → /dev:impl* → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done` 순서로 진행된다. 각 스펙은 PR 병합 가능 단위(독립 배포·롤백 가능)로 작성되며, 구현 계획의 각 Task는 실행 전에 commit 메시지를 사전 설계한다.

commit 시점은 `/dev:impl`의 Task 완료 직후로 고정된다. 참조 문서 생성(`/dev:docs`)과 PR 공개(`/dev:pr`)는 별도 단계로 분리되어 순서 보장과 실패 복구가 용이하다. 공유 규칙은 `.harness/rules/`에 위치하여 Claude Code와 Codex가 동일 기준을 참조한다.

## 구조 / 스키마

### 신규 파일

```
.harness/
├── commit-scopes.md          # 프로젝트별 commit scope 목록 (교체 가능)
├── templates/
│   └── pr-body.md            # PR body 템플릿 (플레이스홀더 기반)
├── rules/
│   ├── git-workflow.md       # commit/PR/브랜치/review-fix 정책 (공유)
│   ├── coding-style.md       # 코딩 스타일 (공유)
│   ├── testing.md            # 테스트 규칙 (공유)
│   ├── security.md           # 보안 규칙 (공유)
│   └── typescript/           # TypeScript 전용 규칙 (공유)
├── contracts/
│   └── implementation-plan.md  # Task Commit 섹션 포맷 추가
└── scripts/
    └── dev-context.js        # VALID_TRANSITIONS 확장

.claude/
├── commands/dev/
│   ├── docs.md               # /dev:docs (신설)
│   └── pr.md                 # /dev:pr (신설)
└── agents/
    └── planner.md            # Task별 Commit 설계 단계 추가
```

### VALID_TRANSITIONS (확장)

| 전이 | 허용 |
|---|---|
| `review:in-progress` → `docs:generated` | ✅ |
| `docs:generated` → `pr:created` | ✅ |
| `docs:generated` → `review:in-progress` | ✅ (재리뷰 복귀) |
| `pr:created` → `docs:generated` | ✅ (참조 문서 재작성 복귀) |

### dev-context.json 새 필드

```json
{
  "config": {
    "git": {
      "pushRemote": "origin",
      "pullRemote": "origin",
      "baseBranch": "main",
      "branchPattern": "^(feature|fix|chore)/"
    },
    "dev_impl": {
      "auto_start": true,
      "auto_commit": false
    }
  },
  "topics": {
    "<topic>": {
      "refDoc": "docs/specs/<name>.md",
      "branchType": "feature",
      "baseBranch": null
    }
  }
}
```

### implementation-plan.md Task 포맷 (Commit 섹션 추가)

```markdown
### [ ] Task N: <title>
- **Type**: tdd | config | infra | refactor
- **Goal**: ...
- **Work Items**: ...
- **Completion Criteria**: ...
- **Commit**: `<type>(<scope>): <subject>`
```

## 동작

### 전체 워크플로우

```
/dev:spec  → 스펙 작성, PR 병합 단위 검증, Codex spec-review
/dev:plan  → implementation-plan.md 생성 (Task별 Commit 섹션 포함)
/dev:impl* → Task 구현 + commit (auto_commit 또는 y/n/skip)
/dev:review → 최종 리뷰, review-fix는 별도 commit
/dev:verify → 테스트 + harness-audit
/dev:docs  → 참조 문서 생성 + commit + docs:generated
/dev:pr    → push + gh pr create (first-run) 또는 gh pr edit (re-entry)
/dev:done  → archive + topic 제거
```

### commit 실행 (`/dev:impl` Step 8)

1. plan의 `**Commit**` 필드에서 메시지 추출
2. `config.dev_impl.auto_commit` 읽기:
   - `true`: 자동 실행 (`git add <task-files> && git commit` HEREDOC)
   - `false`(기본): 사용자에게 y/n/skip 프롬프트
3. `git add -A` 금지 — Task에서 변경된 파일만 명시적으로 stage
4. amend 금지 — 항상 새 commit

### review-fix commit (`/dev:review` Step 6.1)

- `/dev:review`에서 CRITICAL/HIGH 이슈 수정 시 별도 commit 생성
- 권장 메시지: `fix: review feedback` (강제 아님)
- amend 금지, plan Commit 필드 불변 유지

### 참조 문서 흐름 (`/dev:docs`)

1. gate: `review:in-progress` (또는 re-entry: `docs:generated`)
2. `git diff <pullRemote>/<baseBranch>...HEAD` 등으로 변경된 harness 파일 수집
3. 파일을 읽어 present tense 참조 문서 초안 작성
4. 사용자 파일명 확정 후 `docs/specs/<name>.md` 저장
5. `dev-context.json`에 `refDoc` 필드 저장 (PR body에서 참조)
6. `git commit` (HEREDOC 패턴) → `docs:generated`

### PR 생성 (`/dev:pr`)

- gate: `docs:generated` (first-run), `pr:created` (re-entry)
- first-run: `git push` → `gh pr create` (HEREDOC body)
- re-entry: push **없음** → `gh pr edit`만 실행 (title/body 갱신)
  - 신규 commit push는 `docs:generated`로 수동 복귀 후 `/dev:docs → /dev:pr` 재실행
- PR 제목: plan Task의 최빈 type·scope에서 파생, 사용자 확인
- PR body: `.harness/templates/pr-body.md` 기반, `refDoc` 경로 삽입

### 공유 규칙 위치

- `.harness/rules/` — Claude Code + Codex 공유 (coding-style, git-workflow, testing, security, typescript)
- `.claude/rules/common/` — Claude Code 운영 규칙만 (agents, performance, development-workflow, component-boundaries)
- `.harness/commit-scopes.md` — 프로젝트별 scope 목록. 다른 프로젝트 복사 시 이 파일만 교체.

### PR 병합 단위 체크 (`/dev:spec` + `brainstorming`)

스펙 작성 중 다음 기준으로 단일 PR 적합성을 검증한다:
- 독립 배포 가능 (다른 PR 없이 merge 가능)
- 독립 롤백 가능 (revert 시 다른 기능이 깨지지 않음)
- 3개 이상의 독립 목표 → 분할 권장

### Commit 메시지 규칙

```
<type>(<scope>): <subject>   (subject 72자 이내)

[optional body]
```

- type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- scope: `.harness/commit-scopes.md`에 정의된 값 권장 (자유 허용, warning 수준 검증)
- plan-review: Commit 섹션의 type/scope/subject를 warning 수준으로 검증

## 제약사항

- **hotfix/release 브랜치 미지원**: `feature`·`fix`·`chore` 브랜치만. hotfix/release 분기 로직은 구현되지 않음.
- **git hooks 자동화 없음**: commit-msg·pre-push hook은 추가되지 않음. AI 주도 commit이 이미 plan 기반으로 컨벤션을 준수하므로 hooks는 YAGNI.
- **PR merge·브랜치 삭제 자동화 없음**: Squash-merge 여부, PR 병합 후 브랜치 삭제, 버전 태깅은 사용자 수동.
- **`/dev:pr` re-entry는 push 없음**: `pr:created` 상태에서 재실행 시 title·body 편집만 수행. 새 commit을 push하려면 `docs:generated`로 복귀 후 `/dev:docs → /dev:pr` 재실행.
- **`/dev:docs` 역할 확장 미구현**: 현재는 `docs/specs/<name>.md` 생성만. `docs/guide/`, `docs/adr/` 갱신은 별도 토픽으로 확장.
- **기존 plan의 backward-compatibility**: `pr-driven-commit-workflow` 이전에 작성된 plan은 Commit 섹션이 없어도 동작. plan-review는 warning만 출력. `/dev:impl`은 Commit 필드 없으면 skip/continue 프롬프트.
