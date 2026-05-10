# Harness 스크립트 ESM 호환성

> 하네스의 Node.js 스크립트는 ESM(`import`/`export`)으로 통일되며, `.harness/scripts/`와 `.claude/scripts/` 두 디렉토리에는 자체 `package.json {"type": "module"}`을 두어 외부 프로젝트의 root `package.json` `type` 설정과 무관하게 일관된 ESM 모드로 작동한다.

## 개요

Node.js는 `.js` 파일의 module system을 결정할 때 nearest-package.json 룰을 적용한다 — 파일 디렉토리에서 root까지 위로 탐색하며 가장 가까운 `package.json`의 `type` 필드를 적용한다. 외부 프로젝트의 root `package.json`이 `"type": "module"`로 설정된 경우, 하네스의 CommonJS(`require`) 스크립트는 ESM 모드로 강제 해석되어 `ReferenceError: require is not defined in ES module scope`로 실패한다.

이를 차단하기 위해 하네스의 스크립트 디렉토리(`.harness/scripts/`, `.claude/scripts/`)에 자체 `package.json {"type": "module"}`을 두어 nearest-package.json 룰의 외부 의존성을 끊는다. 이 두 디렉토리 하위의 모든 `.js` 파일은 ESM으로 작성되며, 외부 프로젝트의 type 설정(`module` / `commonjs` / unset)과 무관하게 동일하게 작동한다.

호출자(스킬·커맨드·`.claude/settings.json` hooks·다른 Node 스크립트)의 경로 문자열은 `.js` 확장자를 유지한다 — `.mjs`로 바꾸지 않는다.

## 구조 / 스키마

### 디렉토리·module-system 매핑

| 디렉토리 | `package.json` | 효과 |
|---------|---------------|------|
| `.harness/scripts/` | `{"type": "module"}` | 하위 모든 `.js` 파일이 ESM으로 해석됨 |
| `.claude/scripts/` | `{"type": "module"}` | 하위(`hooks/`, `codex/` 포함) 모든 `.js` 파일이 ESM으로 해석됨 |

각 `package.json`은 정확히 한 줄(`{"type": "module"}` + 끝 개행 1개)로 유지한다 — `name`/`version`/`private`/`exports` 등 publish 의도가 있는 필드는 두지 않는다. 하네스 하위 디렉토리는 publishable이 아니다.

### 스크립트 작성 컨벤션

| 항목 | 규칙 |
|------|------|
| import 구문 | `import x from 'node:fs'` 형태로 default 임포트, `import { execSync } from 'node:child_process'`로 named 임포트 |
| `__dirname` | ESM에 없음 — `import { fileURLToPath } from 'node:url'` 후 `const __dirname = path.dirname(fileURLToPath(import.meta.url))` 헬퍼로 대체 |
| `'use strict'` | 제거 (ESM은 묵시적 strict) |
| `require.main === module` 가드 | 제거 — CLI 단일 진입점이면 `main()` 직접 호출 |
| `module.exports` | 제거 — 외부 사용처가 없는 CLI 스크립트는 export 불필요 |
| shebang | `#!/usr/bin/env node` 유지 |

## 동작

### nearest-package.json 룰 적용

Node가 `.js` 파일의 module system을 결정하는 순서:

1. 파일 디렉토리에서 root까지 위로 탐색하며 가장 가까운 `package.json` 찾기
2. 발견된 `package.json`의 `"type"` 필드 적용 (`module` → ESM, `commonjs` 또는 미지정 → CJS)
3. 어떤 `package.json`도 없으면 Node 22.6+ 자동 감지 fallback (import 키워드 발견 시 ESM)

`.harness/scripts/package.json`과 `.claude/scripts/package.json`은 외부 프로젝트의 root `package.json`보다 항상 가까우므로 우선 적용된다 — 외부 type 설정에 영향받지 않는다.

### 외부 환경별 동작

| 환경 | 효과 |
|------|------|
| 외부 `type: "module"` | 자체 `package.json` 우선 → ESM. 정상 동작 |
| 외부 `type: "commonjs"` | 자체 `package.json` 우선 → ESM. 정상 동작 |
| 외부 type 미지정 | 자체 `package.json` 우선 → ESM. 정상 동작 |
| 본 저장소(root `package.json` 없음) | 자체 `package.json`으로 ESM 명시 |

### 호출자 경로 안정성

| 호출자 | 경로 형식 |
|--------|-----------|
| `.claude/settings.json` hooks | `.claude/scripts/hooks/<name>.js` |
| `.claude/skills/*/SKILL.md` | `.harness/scripts/<name>.js`, `.claude/scripts/<name>.js` |
| `.claude/commands/**/*.md` | 동일 |
| Node 스크립트 간 `import` | 상대경로 + `.js` 확장자 |

확장자 변경(`.mjs`/`.cjs`)은 발생하지 않는다 — 모든 호출 지점에서 `.js`를 유지한다.

### deploy-harness self-sync manifest 포함

`scripts/deploy-harness.sh`의 self-sync 모드는 `src/`의 모든 파일을 manifest에 포함시킨다. 두 신규 `package.json`도 `node .harness/scripts/deploy-manifest.js list-src src` 출력에 자동으로 포함되어 외부 프로젝트 배포 시 함께 전달된다.

## 제약사항

### 적용 범위

이 컨벤션은 `.harness/scripts/`와 `.claude/scripts/` 두 디렉토리 **하위 전체 `.js` 파일**에 적용된다. 신규 스크립트를 두 디렉토리 아래에 추가할 때는 ESM으로 작성한다 — CommonJS는 사용하지 않는다.

### export 제거된 스크립트

`harness-audit.js`는 CLI 단일 진입점이므로 `module.exports`와 `require.main === module` 가드가 모두 제거됐다. 향후 다른 Node 모듈에서 `score`·`getChecks`·`parseArgs`를 사용해야 하는 경우, `export` 구문을 추가하는 별도 변경이 필요하다.

### 외부 adopter 프로젝트의 custom CJS 스크립트

`.harness/scripts/` 또는 `.claude/scripts/` 디렉토리에 adopter가 직접 추가한 CommonJS 스크립트가 있다면, 하네스 업그레이드 후 새 `package.json {"type": "module"}` 때문에 해당 스크립트가 실행 시점에 `ReferenceError`로 실패한다. 실패는 hook 또는 스크립트 호출 시점까지 지연되므로, adopter는 자신이 추가한 `.js` 파일을 ESM으로 변환하거나 다른 디렉토리로 옮겨야 한다.

### Node 버전 요구사항

ESM 안정 지원은 Node 22.6+의 `--experimental-detect-module` stable화 이후 권장된다. 본 저장소의 검증 환경은 Node v24.13.0이다.
