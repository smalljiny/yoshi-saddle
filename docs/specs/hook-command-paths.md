# Hook Command Paths

> Claude Code hook 설정의 command 경로는 `${CLAUDE_PROJECT_DIR}`을 prefix로 사용한다. 사용자가 어느 작업 디렉토리에서 Claude Code를 실행해도 hook 스크립트가 프로젝트 루트 기준으로 해석되어 정상 동작한다.

## 개요

`.claude/settings.json`과 `.claude/hooks/hooks.json`은 SessionStart, PreToolUse, PostToolUse, Stop 훅에서 실행할 Node.js 스크립트의 절대 경로를 명시한다. 하네스가 제공하는 hook 스크립트 9종(`session-start.js`, `type-check.js`, `prettier-format.js`, `session-logger.js`, `suggest-compact.js`, `git-push-review.js`, `console-log-audit.js`, `memory-persist.js` 등)은 모두 `<repo-root>/.claude/scripts/hooks/` 아래에 위치한다.

이 경로 prefix가 `${PWD}`이면 hook 명령은 *Claude Code 프로세스의 현재 작업 디렉토리*를 기준으로 해석된다 — 사용자가 저장소 하위 디렉토리(예: `cd src/`)에서 Claude Code를 실행하면 `${PWD}/.claude/scripts/hooks/...`가 잘못된 경로로 평가돼 hook이 실패한다. `${CLAUDE_PROJECT_DIR}`은 Claude Code가 세션 시작 시 자동 설정하는 환경 변수로, 항상 *프로젝트 루트*를 가리킨다. 따라서 두 파일 안의 hook command 경로 prefix는 `${CLAUDE_PROJECT_DIR}`로 작성한다.

## 구조 / 스키마

### 적용 대상 파일

| 파일 | 위치 | 매치 수 |
|------|------|--------|
| `settings.json` | `src/.claude/`, 루트 `.claude/` (self-sync) | 9 |
| `hooks.json` | `src/.claude/hooks/`, 루트 `.claude/hooks/` (self-sync) | 9 |

`src/`가 단일 진실 원천이고 루트 사본은 `scripts/deploy-harness.sh` self-sync로 일치한다 (`harness-src-layout.md` 참조).

### Hook command 형식

```jsonc
{
  "type": "command",
  "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/scripts/hooks/<script>.js\" \"${CLAUDE_TOOL_INPUT_FILE_PATH}\""
}
```

- prefix: `${CLAUDE_PROJECT_DIR}` (반드시 따옴표로 감싸 공백 포함 경로 안전 처리)
- 본문: `.claude/scripts/hooks/<script-name>.js`
- 추가 인자: hook context 환경 변수 (`${CLAUDE_TOOL_INPUT_FILE_PATH}`, `${CLAUDE_TOOL_NAME}`, `${CLAUDE_TOOL_INPUT_COMMAND}` 등)

## 동작

### `${CLAUDE_PROJECT_DIR}` 해석

`${CLAUDE_PROJECT_DIR}`은 Claude Code가 세션 시작 시 프로젝트 루트로 export하는 환경 변수다. shell이 hook command를 실행할 때 이 변수를 치환하므로 명령은 항상 다음과 동등하다:

```bash
node "/Users/<user>/Workspace/<repo>/.claude/scripts/hooks/<script>.js" ...
```

사용자가 `cd src/` 또는 `cd docs/_local/active/<topic>/` 같은 하위 디렉토리에서 Claude Code를 실행해도 hook 명령은 동일한 절대 경로를 평가하므로 스크립트 import·`require` 경로가 깨지지 않는다.

### deploy-harness.sh와의 관계

`scripts/deploy-harness.sh`가 `src/` → 루트 self-sync 또는 외부 프로젝트 배포를 수행할 때 두 JSON 파일을 그대로 복사한다. `${CLAUDE_PROJECT_DIR}`은 *Claude Code 런타임에 설정되는 환경 변수*이므로 self-sync 시점에는 치환되지 않고 리터럴 문자열로 보존된다 — 외부 프로젝트에 배포된 후 그 프로젝트의 Claude Code 세션이 자체 `CLAUDE_PROJECT_DIR`을 사용해 hook 경로를 해석한다.

## 제약사항

- `${PWD}` 같은 *shell 시점 작업 디렉토리* 변수는 사용하지 않는다. hook 실행 시점의 cwd가 프로젝트 루트라는 보장이 없다.
- 절대 경로 하드코딩(`/Users/<user>/...`)도 금지 — 외부 프로젝트 배포 시 깨진다.
- hook command 인자는 모두 따옴표로 감싸 공백·메타문자 안전하게 처리한다.
- `src/`와 루트 사본 두 곳의 JSON 파일을 *동일한 prefix*로 유지한다 (`diff -q src/.claude/settings.json .claude/settings.json` 빈 출력 + `${PWD}` grep 0건).
