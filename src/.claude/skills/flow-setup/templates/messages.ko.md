## USAGE_SUBCOMMAND

```text
지원되는 서브커맨드: git
사용법: /flow-setup git
```

## NO_ORIGIN

```text
origin remote이 없습니다. git remote add origin <url> 로 먼저 추가하세요.
```

## FORK_DETECTED

```text
원격 저장소 감지: Fork 패턴 (upstream 연결 확인됨)
  pushRemote  = origin   (feature 브랜치를 fork에 push)
  pullRemote  = upstream (PR diff 기준은 원본 레포 — 이 휴리스틱이 맞지 않으면 Step 8에서 수정 가능)
```

## UPSTREAM_UNREACHABLE

```text
⚠ upstream remote가 존재하지만 연결할 수 없습니다. Non-fork 패턴으로 fallback합니다.
  원인 확인 후 /flow-setup git 을 다시 실행하세요.
```

## SINGLE_REMOTE

```text
원격 저장소 감지: 단일 remote 패턴
  pushRemote  = origin
  pullRemote  = origin
```

## BASE_CHECK_FAILED

```text
  ⚠ {pull_remote}/{base_branch} 확인 실패. main을 기본값으로 제안합니다. Step 8에서 수정 가능합니다.
```

## UNSET_VALUE

```text
(미설정)
```

## CURRENT_TITLE

```text
현재 저장된 config.git 값:
```

## CURRENT_VALUES

```text
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}
```

## OVERWRITE_Q

```text
덮어쓰시겠습니까? (y/n)
```

## DETECTED_CONFIRM

```text
감지된 git 설정:
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}

이 값으로 저장하시겠습니까? (y/n 또는 수정할 필드명=값 입력)
```

## UNKNOWN_FIELD

```text
알 수 없는 필드입니다. 허용 필드: pushRemote, pullRemote, baseBranch, branchPattern
```

## SAVED

```text
저장 완료:
  pushRemote   : {push_remote}
  pullRemote   : {pull_remote}
  baseBranch   : {base_branch}
  branchPattern: {branch_pattern}

이제 /flow-pr, /flow-docs, /flow-review가 이 값을 사용합니다.
```
