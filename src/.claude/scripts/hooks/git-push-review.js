#!/usr/bin/env node
/**
 * PreToolUse 훅: git push 명령어 전 변경 사항 검토를 안내한다.
 * push를 막지 않고 정보만 제공.
 */

const command = process.argv[2] || ''

function isGitPush(cmd) {
  return cmd.trim().startsWith('git push')
}

function main() {
  if (!isGitPush(command)) {
    process.exit(0)
  }

  // push 전 체크리스트 출력
  console.log('[Pre-push checklist]')
  console.log('  □ Have you completed /flow-review?')
  console.log('  □ Have all /flow-verify gates passed?')
  console.log('  □ No console.log left behind?')
  console.log('  □ No secrets included in the commit?')
  console.log('')

  // exit 0: push를 막지 않음 (정보 제공만)
  process.exit(0)
}

main()
