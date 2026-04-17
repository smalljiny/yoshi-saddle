---
version: 2
---
# Git Workflow

## Commit Message Format

```
<type>(<scope>): <description>

<optional body>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Scope**: 변경 범위를 나타낸다. 프로젝트별 허용 scope 목록은 `.harness/commit-scopes.md`에 정의된다.
`plan-review`는 이 목록을 warning 수준으로만 검증한다 (error 아님).

```
feat(command): add /dev:docs command
fix(rule): correct auto_commit default value
docs(harness): update workflow in CLAUDE.md
```

## Commit Timing: Task Completion

`/dev:impl`이 Task를 완료하면 plan에 명시된 `**Commit**` 섹션의 메시지로 commit을 실행한다.

- **기본값**: `config.dev_impl.auto_commit = false` — Task 완료 후 사용자에게 commit 메시지와 함께 y/n/skip 프롬프트 표시
- **자동화**: `config.dev_impl.auto_commit = true` — 승인 없이 즉시 commit 실행

```bash
# auto_commit 활성화
node .harness/scripts/dev-context.js set-field \
  --field=config.dev_impl.auto_commit --value=true
```

## Review-fix Commit

`/dev:review`에서 발생한 수정은 **별도 commit으로 분리**한다.

- **amend 금지**: plan의 `**Commit**` 필드 불변성을 유지하고 review feedback 추적성을 확보한다.
- **권장 메시지 패턴** (강제 아님):
  ```
  fix: review feedback
  refactor: address review comments
  ```

## Branch Strategy

- `main` — production branch
- `develop` — integration branch
- `feature/<scope>-<description>` — feature development (기본 branchType)
- `fix/<scope>-<description>` — bug fixes
- `chore/<scope>-<description>` — configuration, dependencies, etc.

**branchType**: 기본값은 `feature`. `hotfix`/`release` 브랜치는 현재 미구현이며 별도 토픽에서 확장한다.
브랜치 패턴은 `config.git.branchPattern`으로 override 가능하다.

## PR Workflow

PR 생성은 `/dev:docs → /dev:pr → /dev:done` 순서로 진행한다:

1. **`/dev:docs`** — 구현 완료 후 참조 문서(`docs/specs/<name>.md`) 생성 + commit
2. **`/dev:pr`** — push + PR 제목·body 작성(`.harness/templates/pr-body.md` 기반) + `gh pr create` 실행
3. **`/dev:done`** — PR 생성 완료 후 artifact archive + topic 제거

**`/dev:pr` 실행 전 체크리스트:**
- [ ] working tree clean (uncommitted 변경 없음)
- [ ] `/dev:verify` 통과
- [ ] `/dev:docs` 완료 (`docs:generated` 상태)
- [ ] `config.git.{pushRemote, pullRemote, baseBranch}` 설정 확인

## git config: Remote 설정

| Config 필드 | 기본값 | 설명 |
|---|---|---|
| `config.git.pushRemote` | `origin` | 브랜치를 push할 remote |
| `config.git.pullRemote` | `origin` | base branch를 pull할 remote (fork 사용 시 `upstream`) |
| `config.git.baseBranch` | `main` | PR base branch |
| `config.git.branchPattern` | `^(feature\|fix\|chore)/` | 유효 브랜치 패턴 |

**Private Fork 설정 예시:**
```bash
node .harness/scripts/dev-context.js set-field --field=config.git.pullRemote --value=upstream
```

## Feature Implementation Workflow

```
/dev:spec → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

1. **Plan first** — planner agent로 implementation-plan.md 작성. Task별 `**Commit**` 섹션 포함.
2. **TDD approach** — tdd-specialist agent, RED-GREEN-REFACTOR, 80%+ coverage.
3. **Code review** — code-reviewer agent를 구현 직후 자동 호출.
4. **Commit per Task** — 각 Task 완료 시 plan의 `**Commit**` 메시지로 commit.
5. **Docs + PR** — `/dev:docs`로 참조 문서 확정 후 `/dev:pr`로 publish.
