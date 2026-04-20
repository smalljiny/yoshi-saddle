# /dev:setup git 커맨드

> git remote를 자동 감지하고 `config.git.*` 4개 필드를 `dev-context.json`에 저장한다.

## 개요

`/dev:pr`, `/dev:docs`, `/dev:review`는 `config.git.pushRemote`, `config.git.pullRemote`, `config.git.baseBranch`, `config.git.branchPattern`을 `dev-context.json`에서 읽는다. 이 값들이 저장되지 않은 경우 커맨드들은 항상 기본값(`origin`/`main`)으로 동작한다. `/dev:setup git`은 이 공백을 채운다.

저장 필드:

| 필드 | 역할 |
|------|------|
| `config.git.pushRemote` | feature 브랜치를 push하는 remote |
| `config.git.pullRemote` | PR diff 기준 remote (git diff 비교 대상) |
| `config.git.baseBranch` | merge 대상 브랜치 (`main`, `develop` 등) |
| `config.git.branchPattern` | 유효한 브랜치명 정규식 |

저장 위치는 `dev-context.json`의 최상위 `config.git` 객체이며, `--topic` 플래그 없이 `set-field`를 호출하는 프로젝트 전역 설정이다.

## 동작

### Remote 감지 및 Fork/Non-fork 분류

`git remote -v`를 파싱하여 remote 목록을 확인한다. `origin`이 없으면 중단한다.

`upstream` remote가 존재하면 `git ls-remote --heads upstream`으로 도달 가능 여부를 검증한다.

- **Fork 패턴** (`upstream` 존재 + 도달 가능): `pushRemote=origin`, `pullRemote=upstream`
- **Non-fork 패턴** (`origin`만 있거나 `upstream` 도달 불가): `pushRemote=origin`, `pullRemote=origin`

`upstream`이 존재하지만 도달 불가인 경우 경고를 표시하고 Non-fork로 fallback한다.

Fork 판정은 `upstream` remote 존재 여부만으로 결정한다. 다른 remote 이름은 판정에 영향을 주지 않는다.

### baseBranch 추정

다음 순서로 `baseBranch`를 추정한다.

1. 캐시된 ref 확인: `git symbolic-ref refs/remotes/<pullRemote>/HEAD`
2. 네트워크 조회: `git remote show <pullRemote> | grep "HEAD branch"`
3. 위 두 방법이 모두 실패하면 `main`을 제안한다.

### 기존 값 덮어쓰기 확인

4개 필드 중 하나라도 기존 값이 있으면 현재 저장값을 표시하고 덮어쓸지 확인한다. 사용자가 `n`을 입력하면 변경 없이 중단한다.

### 확인 및 저장

감지된 값 4개를 표시하고 `y/n` 또는 `<필드>=<값>` 형식의 수정 입력을 받는다. `y`를 입력해야만 `set-field`를 4회 호출하여 저장한다. `<필드>=<값>` 입력 시 첫 번째 `=` 기준으로 파싱하며, 수정된 값은 동일한 검증 규칙을 통과해야 한다.

저장 완료 후 4개 필드를 다시 읽어 화면에 표시한다.

## 제약사항

### 검증 규칙

**Remote 이름** (`pushRemote`, `pullRemote`): 정규식 `^[a-zA-Z0-9_.-]+$`를 만족해야 하며 `-`로 시작할 수 없다. `git remote get-url <remote>`로 도달 가능 여부를 확인한다.

**브랜치 이름** (`baseBranch`): 정규식 `^[a-zA-Z0-9][a-zA-Z0-9_/.-]*$`를 만족해야 한다. `..`를 포함하면 경로 순회 공격 방지를 위해 git 명령 실행 전에 거부한다. `refs/remotes/<pullRemote>/<baseBranch>`가 존재하는지 검증하며, 로컬에 캐시되지 않은 경우 fetch를 시도한다.

**브랜치 패턴** (`branchPattern`): 비어 있을 수 없다. `true`, `false`, 숫자 문자열은 `dev-context.js`의 타입 변환으로 boolean/number가 되므로 금지한다. `new RegExp(<branchPattern>)`으로 JS 내부에서 유효성을 검증한다. shell 명령으로 검증하지 않는다 (shell 메타문자 주입 방지). ReDoS 취약 패턴은 구문 검증을 통과하므로 단순한 앵커 패턴 사용을 권장한다.

검증에 실패하면 오류 내용을 표시하고 `set-field` 호출 없이 중단한다.

### 동작 범위

- `set-field` 호출 중 실패가 발생하면 그 이전에 저장된 필드는 유지된다. `/dev:setup git`을 다시 실행하여 완성하거나 수정한다.
- SessionStart hook에서 자동으로 실행되지 않는다. 명시적으로 실행해야 한다.
- `.git/config` 파일을 직접 수정하지 않는다.
- `/dev:setup` 네임스페이스의 다른 서브커맨드(`git` 외)는 이 커맨드의 범위 밖이다.
