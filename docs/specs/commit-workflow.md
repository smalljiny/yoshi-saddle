# 커밋 워크플로우

> `/dev:impl` Task 완료 시점의 커밋 실행 계약, 커밋 메시지 형식, review-fix 커밋 패턴, 공유 규칙 위치.

## 개요

커밋 시점은 `/dev:impl`의 Task 완료 직후로 고정된다. 각 Task는 구현 계획(`implementation-plan.md`)의 `**Commit**` 필드에 사전 설계된 메시지를 갖는다. 공유 규칙은 `.harness/rules/`에 위치하여 Claude Code와 Codex가 동일 기준을 참조한다.

## 구조

```
.harness/
├── commit-scopes.md          # 프로젝트별 commit scope 목록 (교체 가능)
├── rules/
│   ├── git-workflow.md       # commit/PR/브랜치 정책 (공유)
│   ├── coding-style.md       # 코딩 스타일 (공유)
│   ├── testing.md            # 테스트 규칙 (공유)
│   ├── security.md           # 보안 규칙 (공유)
│   └── typescript/           # TypeScript 전용 규칙 (공유)
└── contracts/
    └── implementation-plan.md  # Task Commit 섹션 포맷 정의
```

### implementation-plan.md Task 포맷 (Commit 섹션)

```markdown
### [ ] Task N: <title>
- **Type**: tdd | config | infra | refactor
- **Goal**: ...
- **Work Items**: ...
- **Completion Criteria**: ...
- **Commit**: `<type>(<scope>): <subject>`
```

## 동작

### Task 커밋 실행 (`/dev:impl` Step 8)

1. plan의 `**Commit**` 필드에서 메시지 추출
2. `config.dev_impl.auto_commit` 읽기 (스키마는 `dev-context-config.md` 참조):
   - `true`: 자동 실행 (`git add <task-files> && git commit` HEREDOC)
   - `false`(기본): 사용자에게 y/n/skip 프롬프트
3. `git add -A` 금지 — Task에서 변경된 파일만 명시적으로 stage
4. amend 금지 — 항상 새 commit
5. `**Commit**` 필드 없으면 skip/continue 프롬프트

### review-fix 커밋 (`/dev:review` Step 6.1)

- `/dev:review`에서 CRITICAL/HIGH 이슈 수정 시 별도 commit 생성
- 권장 메시지: `fix: review feedback` (강제 아님)
- amend 금지, plan Commit 필드 불변 유지

이슈 분류(CRITICAL/HIGH/MEDIUM), adversarial-review 후 처리, 처리 내역 산출 방식은 `review-adversarial-workflow.md` 참조.

### 커밋 메시지 형식

```
<type>(<scope>): <subject>   (subject 72자 이내)

[optional body]
```

- type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- scope: `.harness/commit-scopes.md`에 정의된 값 권장 (자유 허용, warning 수준 검증)
- plan-review: Commit 섹션의 type/scope/subject를 warning 수준으로 검증

### 공유 규칙 위치

- `.harness/rules/` — Claude Code + Codex 공유 (coding-style, git-workflow, testing, security, typescript)
- `.claude/rules/common/` — Claude Code 운영 규칙만 (agents, performance, development-workflow, component-boundaries)
- `.harness/commit-scopes.md` — 프로젝트별 scope 목록. 다른 프로젝트 복사 시 이 파일만 교체.

### PR 병합 단위 체크 (`/dev:spec` + `.harness/contracts/spec.md`)

스펙 작성 중 다음 기준으로 단일 PR 적합성을 검증한다 (전체 기준은 `.harness/contracts/spec.md` 참조):

- 독립 배포 가능 (다른 PR 없이 merge 가능)
- 독립 롤백 가능 (revert 시 다른 기능이 깨지지 않음)
- 3개 이상의 독립 목표 → 분할 권장

## 제약사항

- `git add -A` 금지. Task 변경 파일만 명시적 stage.
- amend 금지. 항상 새 commit 생성.
- git hooks 자동화 없음 (commit-msg·pre-push hook 미설치). AI 주도 commit이 plan 기반으로 컨벤션을 준수하므로 hooks는 YAGNI.
- 기존 plan의 backward-compatibility: `**Commit**` 섹션 없는 plan은 skip/continue 프롬프트. plan-review는 warning만 출력.
- hotfix/release 브랜치 미지원: `feature`·`fix`·`chore` 브랜치만.
