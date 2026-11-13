#!/usr/bin/env node
/**
 * Stop 훅: 세션 중 수정된 파일에서 console.log를 감사한다.
 */

import { execFileSync, spawnSync } from 'child_process'

// Git Bash 의 PWD 는 POSIX 형식(/c/...)일 수 있어 win32 에서는 process.cwd() 를 쓴다.
const cwd = process.platform === 'win32' ? process.cwd() : (process.env.PWD || process.cwd())

function getModifiedFiles() {
  try {
    // stderr 셸 리디렉션은 Windows cmd.exe 가 해석하지 못하므로 git 을 셸 없이
    // 실행하고 stderr 는 stdio 로 버린다.
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output.trim().split(/\r?\n/).filter(f =>
      f && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'))
    )
  } catch {
    return []
  }
}

function checkConsoleLog(files) {
  if (files.length === 0) return []

  const violations = []

  for (const file of files) {
    const result = spawnSync('grep', ['-n', 'console\\.log', file], {
      cwd,
      encoding: 'utf-8',
      timeout: 3000,
    })
    if (result.status === 0 && result.stdout.trim()) {
      violations.push({ file, lines: result.stdout.trim() })
    }
  }

  return violations
}

function main() {
  const modifiedFiles = getModifiedFiles()
  const violations = checkConsoleLog(modifiedFiles)

  if (violations.length > 0) {
    console.warn('[console.log 감사] 다음 파일에 console.log가 남아있습니다:')
    for (const { file, lines } of violations) {
      console.warn(`\n  📁 ${file}`)
      for (const line of lines.split('\n')) {
        console.warn(`    ${line}`)
      }
    }
    console.warn('\n  커밋 전에 제거하거나 적절한 logger로 교체하세요.')
  }

  process.exit(0)  // 경고만 출력, 세션 종료를 막지 않음
}

main()
