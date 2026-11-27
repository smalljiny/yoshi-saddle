## NO_TOPIC

```text
참조 문서를 생성할 토픽이 없습니다.
```

## REENTRY_CONFIRM

```text
docs:generated 상태입니다. 다시 실행하시겠습니까? (y/n)
```

## VERIFY_NOT_PASSED

```text
⚠ /flow-verify가 통과되지 않았습니다. 계속하시겠습니까? (y/n)
```

## BASE_BRANCH_PROMPT

```text
git diff 결과가 비어 있습니다.
베이스 브랜치를 입력하세요 (기본값: {base_branch}):
```

## NO_CHANGED_FILES

```text
⚠ 변경된 파일이 없습니다.
계속하시겠습니까? (y/n)
```

## NO_CHANGED_FILES_FILTERED

```text
⚠ 변경된 파일이 없습니다 (sourceFilter 적용됨).
계속하시겠습니까? (y/n)
```

## DISCREPANCY_TITLE

```text
스펙-구현 불일치 항목:
```

## GOAL_CHANGE_MARK

```text
⚠ 구현 목표 변경
```

## GOAL_CHANGE_STOP

```text
⚠ 스펙 수정이 구현 목표를 변경합니다.
/flow-docs를 중단합니다. /flow-plan 또는 /flow-review부터 재검토하세요.
```

## SPEC_APPLY_CONFIRM

```text
spec.md에 반영하시겠습니까? (y/n)
```

## NO_DISCREPANCY

```text
스펙-구현 불일치 없음.
```

## CANDIDATES_TITLE

```text
업데이트 대상 후보:
```

## CANDIDATE_ITEM

```text
  {number}. {path} — {reason}
```

## CANDIDATE_NEW_ITEM

```text
  {number}. (신규 생성 필요) {name} — {reason}
```

## CANDIDATES_APPROVE

```text
승인하시겠습니까?
  y          : 위 목록대로 진행
  - <번호>   : 해당 후보 제거 (예: `- 2`)
  + <경로>   : 후보 추가 (예: `+ docs/specs/qux.md`)
  edit       : 목록 전체 재입력
```

## NEW_FILE_NAME_PROPOSE

```text
신규 파일명을 제안합니다: {suggested_name}.md
이 이름으로 저장하시겠습니까? (y/다른 이름 입력)
```

## FILE_EXISTS_OVERWRITE

```text
docs/specs/{name}.md가 이미 존재합니다.
덮어쓰시겠습니까? (y/다른 이름 입력)
```

## REP_DOC_Q

```text
어느 문서를 대표 문서(refDoc)로 기록할까요?
```

## REP_DOC_HEADER

```text
대표 문서
```

## REP_DOC_SELECTED

```text
대표 문서: docs/specs/{selected}.md
```

## DOCS_COMPLETE

```text
완료되었습니다.
  업데이트된 파일: {files}
  대표 문서:      docs/specs/{representative_name}.md
  상태:           docs:generated

다음: /flow-pr 로 PR을 생성하세요.
```
