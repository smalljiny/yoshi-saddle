# PR 발행 워크플로우

> `/dev:pr` 커맨드가 브랜치를 push하고 GitHub PR을 생성하거나 갱신하는 계약.

## 개요

`/dev:pr`은 `/dev:docs` 이후 실행되는 발행 전용 단계이다. first-run에서는 `git push` 후 `gh pr create`로 PR을 생성하고, re-entry(`pr:created`)에서는 push 없이 `gh pr edit`으로 title·body만 갱신한다.

## 구조

```
.harness/
└── templates/
    └── pr-body.md            # PR body 템플릿 (플레이스홀더 기반)

.harness/
└── scripts/
    └── dev-context.js        # branchType, baseBranch 필드 읽기
```

### 토픽 필드 (dev-context.json)

```json
{
  "topics": {
    "<topic>": {
      "refDoc": "docs/specs/<name>.md",
      "branchType": "feature",
      "baseBranch": null
    }
  }
}
```

- `branchType`: `feature`·`fix`·`chore` 중 하나. 브랜치명 패턴 검증에 사용.
- `baseBranch`: 토픽별 override. `null`이면 `config.git.baseBranch` 사용.
- `refDoc`: PR body의 참조 문서 링크 삽입에 사용 (`reference-docs-workflow.md` 참조).

### VALID_TRANSITIONS (관련 전이)

| 전이 | 허용 |
|------|------|
| `docs:generated` → `pr:created` | ✅ (first-run) |
| `pr:created` → `docs:generated` | ✅ (참조 문서 재작성 복귀) |

## 동작

### first-run (`docs:generated` 상태)

1. **게이트 확인**: `docs:generated` 상태 필요
2. **브랜치 확인**: `config.git.branchPattern`으로 현재 브랜치명 검증
3. **PR 제목 파생**: plan Task의 최빈 type·scope에서 제안, 사용자 확인
4. **PR body 생성**: `.harness/templates/pr-body.md` 템플릿 기반, `refDoc` 경로 삽입
5. **push**: `git push -u <pushRemote> <branch>`
6. **PR 생성**: `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"` (HEREDOC)
7. **상태 전환**: `docs:generated` → `pr:created`

### re-entry (`pr:created` 상태)

- push **없음** — `gh pr edit`으로 title·body만 갱신
- 새 commit을 push하려면 수동으로 `docs:generated` 복귀 후 `/dev:docs → /dev:pr` 재실행

### git 원격 설정 참조

`config.git.pushRemote`·`config.git.baseBranch`·`config.git.branchPattern`을 사용 (스키마 및 기본값은 `dev-context-config.md` 참조).

## 제약사항

- PR merge·브랜치 삭제 자동화 없음. Squash-merge 여부, PR 병합 후 브랜치 삭제, 버전 태깅은 사용자 수동.
- hotfix/release 브랜치 미지원: `feature`·`fix`·`chore` 브랜치만.
- `/dev:pr` re-entry는 push 없음. 새 commit push가 필요한 경우 `docs:generated` 복귀 필요.
- `/dev:done`의 게이트는 `pr:created` 상태이므로 `/dev:pr` first-run 완료 전에는 `/dev:done` 실행 불가.
