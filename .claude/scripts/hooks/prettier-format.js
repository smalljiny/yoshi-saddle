#!/usr/bin/env node
/**
 * PostToolUse 훅: JS/TS 파일 편집 후 Prettier로 자동 포맷한다.
 */

import { execSync, existsSync } from 'child_process'
import { join } from 'path'

const filePath = process.argv[2] || ''
const cwd = process.env.PWD || process.cwd()

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function isSupportedFile(path) {
  return SUPPORTED_EXTENSIONS.some(ext => path.endsWith(ext))
}

function hasPrettierConfig() {
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

function main() {
  if (!filePath || !isSupportedFile(filePath)) {
    process.exit(0)
  }

  if (!hasPrettierConfig()) {
    process.exit(0)
  }

  try {
    execSync(`npx prettier --write "${filePath}" 2>/dev/null`, {
      cwd,
      timeout: 10000,
    })
  } catch {
    // Prettier 실패는 무시 (포맷은 선택적)
  }

  process.exit(0)
}

main()
