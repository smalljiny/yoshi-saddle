// console-log-audit.test.js — Stop 훅의 console.log 감사 통합 테스트
// 임시 git 저장소를 만들어 훅을 실제로 spawn 하고 stderr 경고·exit code 를 검증한다.
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'console-log-audit.js')

// 바깥 저장소·전역 설정 격리: GIT_* 환경 변수(훅 안에서 실행될 때의 GIT_DIR 등)를 지우고
// 시스템 설정을 끈다. 전역 서명·훅 설정은 커밋 시 -c 로 무력화한다.
const ISOLATED_ENV = Object.fromEntries(
  Object.entries({ ...process.env, GIT_CONFIG_NOSYSTEM: '1' }).filter(([k]) => !k.startsWith('GIT_') || k === 'GIT_CONFIG_NOSYSTEM')
)

function git(cwd, ...args) {
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=', ...args], { cwd, stdio: 'ignore', env: ISOLATED_ENV })
}

function runHook(cwd) {
  const result = spawnSync(process.execPath, [HOOK], {
    cwd,
    env: { ...ISOLATED_ENV, PWD: cwd },
    encoding: 'utf8',
    timeout: 30000,
  })
  if (result.error) throw result.error
  return result
}

describe('console-log-audit hook', () => {
  let repo

  beforeEach(() => {
    repo = join(realpathSync(tmpdir()), `console-audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(repo, { recursive: true })
    git(repo, 'init', '-q')
    git(repo, 'config', 'user.email', 'test@example.invalid')
    git(repo, 'config', 'user.name', 'test')
    git(repo, 'config', 'core.autocrlf', 'false')
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  function commitInitial() {
    writeFileSync(join(repo, 'a.js'), 'const a = 1\n')
    git(repo, 'add', 'a.js')
    git(repo, 'commit', '-q', '-m', 'init')
  }

  test('수정된 .js 에 console.log 가 있으면 stderr 경고 + exit 0', () => {
    commitInitial()
    writeFileSync(join(repo, 'a.js'), "const a = 1\nconsole.log('x')\n")

    const result = runHook(repo)
    assert.equal(result.status, 0)
    assert.ok(result.stderr.includes('[console.log 감사]'), `경고 헤더 필요: ${result.stderr}`)
    assert.ok(result.stderr.includes('a.js'), `파일명 필요: ${result.stderr}`)
  })

  test('변경이 없으면 stderr 비어 있음 + exit 0', () => {
    commitInitial()

    const result = runHook(repo)
    assert.equal(result.status, 0)
    assert.equal(result.stderr, '')
  })

  test('HEAD 가 없는 저장소(git 오류)에서도 경고 없음 + exit 0', () => {
    writeFileSync(join(repo, 'a.js'), "console.log('x')\n")

    const result = runHook(repo)
    assert.equal(result.status, 0)
    assert.equal(result.stderr, '')
  })
})
