## NO_TOPIC

```text
PR을 생성할 토픽이 없습니다.
```

## REENTRY_CONFIRM

```text
이미 PR이 생성되어 있습니다 (pr:created).
PR 제목과 body를 업데이트하시겠습니까? (y/n)
```

## GATE_FAILED

```text
/flow-pr를 실행할 수 없습니다.
현재 상태: {phase}:{status}
docs:generated 상태여야 합니다.
먼저 /flow-docs를 실행하세요.
```

## DIRTY_TREE

```text
⚠ 커밋되지 않은 변경사항이 있습니다.
git status를 확인하고 모든 변경사항을 commit한 후 다시 실행하세요.

삭제된 파일이 unstaged 상태인 경우:
  1. git status 로 삭제된 파일 목록 확인
  2. git rm <path>  또는  git add -u  로 삭제를 stage
  3. git commit -m "chore: remove {file_name}"
  4. /flow-pr 재실행

(세션 시작 전부터 존재하던 미커밋 파일 삭제도 동일한 방법으로 처리합니다.)
```

## BRANCH_PATTERN_CONFIRM

```text
⚠ 현재 브랜치 '{branch}'가 허용 패턴 '{pattern}'에 맞지 않습니다.
계속하시겠습니까? (y/n)
```

## TITLE_CONFIRM

```text
PR 제목 초안:
  {draft_title}

이 제목으로 진행하시겠습니까? (y/수정할 제목 입력)
```

## BODY_CONFIRM

```text
PR body 초안 (아래에 표시):
---
{body}
---

이 body로 진행하시겠습니까? (y/수정 사항 입력 또는 'edit'으로 직접 수정)
```

## PR_CREATED

```text
PR이 생성되었습니다: {pr_url}
```

## PR_DONE

```text
완료되었습니다.
  PR:    {pr_url}
  상태:  pr:created

다음: PR이 병합되면 /flow-done 으로 아카이브하세요.
PR 수정이 필요하면 /flow-pr 을 다시 실행하세요 (docs:generated로 복귀 후 재push).
```
