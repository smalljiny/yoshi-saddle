#!/usr/bin/env node
/**
 * PostToolUse 훅: JS/TS 파일 편집 후 Prettier로 자동 포맷한다.
 */

import { spawnSync } from 'child_process'
import { existsSync, realpathSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function isSupportedFile(path) {
  return SUPPORTED_EXTENSIONS.some(ext => path.endsWith(ext))
}

function hasPrettierConfig(cwd) {
  const configs = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    'prettier.config.js',
    'prettier.config.cjs',
  ]
  return configs.some(c => existsSync(join(cwd, c)))
}

/**
 * prettier 실행 방법을 만든다. 파일 경로는 항상 args 원소 하나로 전달되며 훅 자신의 spawn 은
 * 셸을 거치지 않는다.
 * - win32 외: 기존과 같은 `npx prettier --write <file>`
 * - win32: npx 는 npx.cmd 라 셸 없이 spawn 하면 EINVAL/ENOENT 이고, 셸을 켜면 파일명
 *   인젝션 위험이 있다. node 로 npx-cli.js 를 직접 실행한다. 없으면 null (조용히 건너뜀).
 *   이후 npm exec 가 prettier.cmd 를 cmd.exe 로 실행할 때의 인자 안전성은 npm 의 cmd
 *   이스케이프(@npmcli/promise-spawn)에 의존한다 (통합 테스트로 메타문자 파일명 확인).
 */
export function buildPrettierInvocation({ platform, execPath, filePath, exists }) {
  if (platform !== 'win32') {
    return { command: 'npx', args: ['prettier', '--write', filePath] }
  }
  const npxCli = join(dirname(execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
  if (!exists(npxCli)) {
    return null
  }
  return { command: execPath, args: [npxCli, 'prettier', '--write', filePath] }
}

/**
 * 훅 작업 디렉토리. Git Bash 의 PWD 는 POSIX 형식(/c/...)일 수 있어 win32 에서는 process.cwd() 를 쓴다.
 */
export function resolveCwd(platform, env, processCwd) {
  return platform === 'win32' ? processCwd : (env.PWD || processCwd)
}

function main() {
  const filePath = process.argv[2] || ''
  const cwd = resolveCwd(process.platform, process.env, process.cwd())

  if (!filePath || !isSupportedFile(filePath)) {
    process.exit(0)
  }

  if (!hasPrettierConfig(cwd)) {
    process.exit(0)
  }

  const invocation = buildPrettierInvocation({
    platform: process.platform,
    execPath: process.execPath,
    filePath,
    exists: existsSync,
  })
  if (!invocation) {
    process.exit(0)
  }

  spawnSync(invocation.command, invocation.args, {
    cwd,
    timeout: 10000,
    stdio: 'ignore',
  })

  process.exit(0)
}

// 직접 실행될 때만 main()을 호출한다 (테스트의 import 시 실행 방지). symlink 경유 실행도 고려해 realpath로 비교.
function isEntryPoint() {
  if (!process.argv[1]) return false
  try {
    return realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isEntryPoint()) {
  main()
}
