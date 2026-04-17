# 참조 문서 생성 워크플로우

> `/dev:docs` 커맨드가 구현된 harness 파일을 읽어 `docs/specs/<name>.md` 참조 문서를 생성하고 `docs:generated` 상태로 전환하는 계약.

## 개요

`/dev:docs`는 `/dev:review`와 `/dev:pr` 사이에 위치한 독립 단계이다. `git diff`로 브랜치에서 변경된 harness 파일을 수집하고, 현재 시제(present tense) 참조 문서 초안을 작성한 후 사용자가 파일명을 확정하면 `docs/specs/<name>.md`에 저장한다. 이 파일은 git-tracked 영구 문서이다.

## 구조

```
docs/
└── specs/
    └── <name>.md             # /dev:docs가 생성하는 참조 문서 (git-tracked)

.harness/
└── scripts/
    └── dev-context.js        # refDoc 필드 저장 (set-field)
```

### 토픽 필드 (dev-context.json)

`/dev:docs` 완료 시 다음 필드가 토픽에 추가된다:

```json
{
  "topics": {
    "<topic>": {
      "refDoc": "docs/specs/<name>.md"
    }
  }
}
```

`refDoc` 값은 `/dev:pr`의 PR body 생성 시 참조 문서 링크로 삽입된다.

## 동작

### `/dev:docs` 실행 흐름

1. **게이트 확인**: `review:in-progress` (first-run) 또는 `docs:generated` (re-entry) 상태 필요
2. **변경 파일 수집**: `config.git.pullRemote`와 `config.git.baseBranch`를 사용:
   ```
   git diff <pullRemote>/<baseBranch>...HEAD
   ```
   harness 관련 파일(`.claude/`, `.harness/`, `docs/specs/` 등)만 대상
3. **참조 문서 초안 작성**: 수집된 파일을 읽어 현재 시제(present tense) 참조 문서 초안 생성
4. **파일명 확정**: 사용자에게 파일명 제안 후 확정 (`docs/specs/<name>.md`)
5. **저장**: 확정 파일명으로 문서 저장
6. **refDoc 기록**: `dev-context.js set-field --field=refDoc --value=docs/specs/<name>.md`
7. **커밋**: HEREDOC 패턴으로 `git commit`
8. **상태 전환**: `review:in-progress` → `docs:generated`

### re-entry 동작

`docs:generated` 상태에서 `/dev:docs` 재실행 시:
- 기존 `docs/specs/<name>.md`를 덮어쓰거나 새 파일명으로 생성
- `refDoc` 필드 갱신
- 새 커밋 생성 (amend 금지)

## 제약사항

- `docs/specs/<name>.md`만 생성. `docs/guides/`·`docs/adr/` 갱신은 별도 토픽으로 확장.
- git-tracked 파일이므로 `/dev:done`의 아카이브 대상이 아님 — `docs/_local/`과 구별.
- `config.git.pullRemote`·`config.git.baseBranch` 미설정 시 기본값 `origin`·`main` 사용 (스키마는 `dev-context-config.md` 참조).
