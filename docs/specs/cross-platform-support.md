# 크로스 플랫폼 지원

> 하네스의 플랫폼별 지원 범위와, Windows 11 + Git Bash + Node 환경에서 핵심 동작(deploy·훅·상태줄)이 macOS·Linux와 같은 결과를 내도록 하는 실행 방식과 검증 방법.

## 개요

하네스는 macOS를 기준으로 작성되었고, Windows에서는 rsync 부재·경로 형식(`C:/` vs `C:\`)·`.cmd` 실행 파일·cmd.exe 셸 해석·Microsoft Store `python3` 가짜 실행 파일·CRLF 체크아웃 때문에 일부 동작이 오류 없이 꺼졌다. 이 문서는 그 차이를 흡수하는 현재 동작을 정리한다. macOS·Linux의 실행 경로와 출력은 바꾸지 않는다.

| 플랫폼 | 지원 수준 | 검증 |
|--------|-----------|------|
| macOS | 전체 지원 (기준 플랫폼) | 머지 게이트에서 사용자가 실행 |
| Windows 11 + Git Bash + Node | deploy·훅·상태줄·경로 검증 지원. worktree 기능 미지원 | 구현 중 실행 로그 |
| Linux | 동작 차이 없음으로 간주 | 미검증 |
| WSL | 범위 밖 | — |

## 구조 / 스키마

| 구성 요소 | Windows 대응 | macOS·Linux |
|-----------|--------------|-------------|
| `scripts/deploy-harness.sh` | rsync가 없으면 cp 대체 경로 (임시 stage에서 제외 → 대상에 `cp -af`). manifest helper를 `src/.harness/scripts/`에서 읽음 | rsync 경로 그대로 |
| `src/.harness/scripts/deploy-manifest.js` | 매니페스트 경로를 항상 `/`로 기록·정규화 | 동일 (원래 `/`) |
| `src/.harness/scripts/validate-path.js` | repo 루트를 realpath로 정규화한 뒤 포함 검사 | 동일 (symlink 루트도 정규화) |
| `src/.claude/scripts/hooks/prettier-format.js` | `node <npx-cli.js> prettier --write <file>` — 셸 없이 실행. cwd는 `process.cwd()` | `npx prettier --write <file>`, cwd는 `PWD` 우선 |
| `src/.claude/scripts/hooks/console-log-audit.js` | `execFileSync('git', …)` + stdio로 stderr 무시. cwd는 `process.cwd()` | 같은 호출, cwd는 `PWD` 우선 |
| `src/.claude/scripts/status-line.sh` | jq가 없으면 실제로 실행되는 Python(`python3` → `python`)을 고름 | 동일 |
| 루트 `.gitattributes` | `*.sh text eol=lf` — `core.autocrlf=true`에서도 LF 체크아웃 | 동일 |
| `flow-worktree`, `wf-worktree-context` 스킬 | 미지원 안내 (`> **Platform**: macOS only`) | 지원 |

## 동작

### deploy

- 복사 도구는 실행 시 결정되고 `[deploy-harness] copy tool: rsync|cp`로 출력된다. rsync가 있으면 기존 rsync 경로를 그대로 쓴다.
- cp 대체 경로는 대상에서 아무것도 지우지 않아 rsync 경로와 같은 보존 계약을 지킨다: 대상의 `.claude/sessions/`·`settings.local.json`·`checkpoints.log`·`.DS_Store`, external 대상의 기존 `CLAUDE.md`·`AGENTS.md`·`.harness/commit-scopes.md`, 사용자가 추가한 파일은 그대로 남는다.
- 백업 시 대상의 `.claude`가 symlink이면 링크를 거쳐 원본이 지워지지 않도록 제외 처리를 건너뛴다.
- 매니페스트는 OS와 무관하게 `/` 구분 경로를 쓰고, 이전에 `\`로 기록된 항목은 읽을 때 `/`로 정규화한다. 플랫폼을 오가도 obsolete 정리가 같은 결과를 낸다.
- 상세 흐름은 [`infrastructure/deploy-manifest.md`](infrastructure/deploy-manifest.md) 참조.

### 훅

- **prettier-format**: Windows의 `npx`는 `npx.cmd`라 셸 없이 spawn하면 실패하고, 셸을 켜면 파일명 인젝션 위험이 있다. 그래서 `process.execPath`로 `<node 설치 경로>/node_modules/npm/bin/npx-cli.js`를 직접 실행한다(없으면 조용히 건너뜀). 파일 경로는 args 원소 하나로 넘기고, `-`로 시작하는 경로는 prettier 옵션 주입이 되므로 포맷하지 않는다. npm이 `prettier.cmd`를 cmd.exe로 실행할 때의 인자 안전성은 npm의 cmd 이스케이프에 의존한다(`&`·`;`·`$`·`%PATH%`·`^`·`!`·괄호가 든 파일명을 통합 테스트로 확인).
- **console-log-audit (Stop)**: cmd.exe는 `2>/dev/null`을 해석하지 못하므로 git을 셸 없이 실행하고 stderr는 stdio로 버린다. git 오류(HEAD 없음 등)는 빈 목록 + exit 0.
- **cwd**: Git Bash의 `PWD`는 POSIX 형식(`/c/...`)일 수 있어 win32에서는 `process.cwd()`를 쓴다. Claude Code 훅 실행 환경에서는 `PWD=C:/workspace/...`(Windows 형식)으로 전달되는 것을 확인했다.
- **진입점 판정**: 테스트용으로 함수를 export하는 스크립트(`prettier-format.js`, `validate-path.js`)는 `argv[1]`과 모듈 경로를 realpath로 비교해 직접 실행 여부를 판정한다(실패 시 `path.resolve` 비교). symlink·junction 경유 실행에서도 `main()`이 돈다.
- exit 0 Stop 훅의 stderr는 Claude Code 화면(트랜스크립트 포함)에 표시되지 않는다. 실제 Stop 이벤트 동작을 확인하려면 stderr를 파일로 남기는 임시 훅을 `.claude/settings.local.json`에 추가해 캡처한다.

### 상태줄

- jq가 있으면 컨텍스트 바까지 전체 표시(출력 형식 불변). jq가 없으면 `python3` → `python` 순으로 `-c 'import sys'`가 성공하는 첫 인터프리터로 모델명을 추출하고, 없으면 grep/sed로 추출한다. 상세는 [`statusline.md`](statusline.md).
- Windows에서 컨텍스트 바를 보려면 `winget install jqlang.jq`로 jq를 설치한다.

### 검증

| 명령 | 대상 | Windows | macOS |
|------|------|---------|-------|
| `bash scripts/verify-deploy-parity.sh` | deploy S1~S5 + rsync·cp 결과 비교 | cp 모드만 실행, rsync·parity SKIP | rsync·cp 두 모드 + `S<n> parity` 비교 |
| `node --test "src/.harness/scripts/*.test.js" "src/.claude/scripts/hooks/*.test.js"` | 헬퍼·경로 검증·훅 | symlink 테스트는 EPERM이면 SKIP | 전체 실행 |
| `bash src/.claude/scripts/status-line.test.sh` | 상태줄 도구 조합 4종 | jq 케이스 SKIP(jq 미설치 시) | 전체 실행 |

- `node --test`는 Node 24에서 디렉토리 인자를 받지 않으므로 따옴표로 감싼 glob 형식을 쓴다.
- macOS 결과(위 세 명령의 출력)를 PR 본문에 붙이기 전에는 머지하지 않는다. Linux는 "미검증"으로 표기한다.

## 제약사항

- **worktree 기능 Windows 미지원**: cmux 의존, Git Bash의 `ln -s`가 링크 대신 복사본을 만드는 문제로 안내 문구만 둔다.
- **Windows symlink 테스트**: 개발자 모드가 꺼져 있으면 symlink 생성이 EPERM이라 해당 테스트는 SKIP된다. SKIP은 통과 증거가 아니며 macOS 실행으로 판정한다. 디렉토리 링크 케이스는 junction(권한 불필요)으로 Windows에서도 검증한다.
- **external deploy 대상 경로 형식**: Git Bash에서는 `/c/...` 형식으로 넘긴다. `C:/...`는 상대 경로로 취급되어 실패한다.
- **`undeploy-harness.sh`**: manifest helper를 아직 루트 `.harness/`에서 읽어 clone 직후에는 실패한다 (별도 작업).
- **cp 대체 경로와 rsync의 차이**: 대상에 파일↔디렉토리 타입 충돌이나 디렉토리 symlink가 있으면 동작이 다르다. dry-run 출력은 전체 복사 목록이다. 상세는 [`infrastructure/deploy-manifest.md`](infrastructure/deploy-manifest.md#제약사항).
- **줄바꿈 정책**: `*.sh`만 `eol=lf`로 고정한다. 다른 확장자는 `core.autocrlf` 설정을 따른다.
- **Python 전환·CI·WSL**: 범위 밖.
