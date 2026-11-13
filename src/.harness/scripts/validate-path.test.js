// validate-path.test.js — resolveSafePath 경로 검증·정규화 단위 테스트
// 임시 디렉토리를 저장소 루트로 삼아 통과·거부·루트 형식·symlink 케이스를 검증한다.
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolveSafePath } from './validate-path.js'

// git rev-parse --show-toplevel 은 Windows 에서 'C:/...' 형식을 돌려준다.
// 실제 CLI 입력과 같도록 루트를 '/' 구분 형식으로 넘긴다 (POSIX 에서는 변화 없음).
function gitStyle(p) {
  return p.replaceAll('\\', '/')
}

describe('resolveSafePath', () => {
  let base
  let root
  let outside

  beforeEach(() => {
    base = realpathSync(tmpdir())
    const id = `validate-path-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    root = join(base, id, 'repo')
    outside = join(base, id, 'outside')
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(outside, { recursive: true })
    writeFileSync(join(root, 'docs', 'existing.md'), 'x\n', 'utf8')
    writeFileSync(join(outside, 'secret.md'), 's\n', 'utf8')
  })

  afterEach(() => {
    rmSync(join(root, '..'), { recursive: true, force: true })
  })

  describe('저장소 안 경로는 통과', () => {
    test('존재하는 파일', () => {
      const result = resolveSafePath(gitStyle(root), 'docs/existing.md')
      assert.equal(result.ok, true, result.reason)
      assert.equal(result.path, join(root, 'docs', 'existing.md'))
    })

    test('아직 없는 파일 (pre-creation)', () => {
      const result = resolveSafePath(gitStyle(root), 'docs/not-yet/new.md')
      assert.equal(result.ok, true, result.reason)
      assert.equal(result.path, join(root, 'docs', 'not-yet', 'new.md'))
    })
  })

  describe('저장소 밖·위험 경로는 거부', () => {
    const rejected = [
      ['POSIX 절대경로', '/etc/passwd'],
      ['드라이브 절대경로 (\\)', 'C:\\Windows\\x'],
      ['드라이브 절대경로 (/)', 'C:/Windows/x'],
      ['UNC 경로', '\\\\server\\share\\x'],
      ['상위 디렉토리', '../x'],
      ['중간 상위 디렉토리', 'a/../../x'],
    ]
    for (const [label, rawPath] of rejected) {
      test(label, () => {
        const result = resolveSafePath(gitStyle(root), rawPath)
        assert.equal(result.ok, false, `거부되어야 함: ${rawPath} → ${result.path}`)
        assert.ok(result.reason.includes(rawPath), 'reason 에 원래 경로 포함')
      })
    }

    // junction 은 Windows 개발자 모드 없이도 만들 수 있어 Windows 에서도 포함 검사(containment)까지
    // 도달한다. POSIX 에서는 type 인자가 무시되어 일반 디렉토리 symlink 가 된다.
    test('저장소 밖을 가리키는 디렉토리 링크 (junction)', () => {
      symlinkSync(outside, join(root, 'junction-out'), 'junction')
      const result = resolveSafePath(gitStyle(root), 'junction-out/secret.md')
      assert.equal(result.ok, false, `거부되어야 함 → ${result.path}`)
      assert.ok(result.reason.startsWith('Path escapes repo root:'))
    })

    test('저장소 밖을 가리키는 symlink', (t) => {
      try {
        symlinkSync(outside, join(root, 'link-out'), 'dir')
      } catch (e) {
        if (e.code === 'EPERM') {
          // Windows 개발자 모드가 꺼져 있으면 symlink 생성 권한이 없다. SKIP은 통과 증거가 아니다.
          t.skip('symlink EPERM (Windows 개발자 모드 꺼짐) — POSIX 실행에서 판정')
          return
        }
        throw e
      }
      const result = resolveSafePath(gitStyle(root), 'link-out/secret.md')
      assert.equal(result.ok, false, `거부되어야 함 → ${result.path}`)
      assert.ok(result.reason.startsWith('Path escapes repo root:'))
    })
  })

  test('존재하지 않는 루트 → throw 대신 ok: false', () => {
    const result = resolveSafePath(join(root, 'no-such-root'), 'docs/existing.md')
    assert.equal(result.ok, false)
  })

  test('win32: 루트 C:/... 와 C:\\... 형식의 결과가 같다', { skip: process.platform !== 'win32' }, () => {
    for (const rawPath of ['docs/existing.md', 'docs/not-yet/new.md', '../x']) {
      const slash = resolveSafePath(root.replaceAll('\\', '/'), rawPath)
      const backslash = resolveSafePath(root.replaceAll('/', '\\'), rawPath)
      assert.deepEqual(slash, backslash, `루트 형식에 따라 결과가 달라짐: ${rawPath}`)
    }
  })
})

// 진입점 가드: 직접 실행 시 main()이 돌아야 한다. 가드가 깨지면 출력 없이 exit 0이 되어
// CANON_PATH=$(...) 호출자가 빈 경로를 받는다.
describe('CLI entry point', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'validate-path.js')
  let linkBase

  afterEach(() => {
    if (linkBase) rmSync(linkBase, { recursive: true, force: true })
    linkBase = undefined
  })

  function assertUsage(scriptPath) {
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' })
    if (result.error) throw result.error
    assert.equal(result.status, 1, `exit 1 이어야 함 (stdout=${result.stdout})`)
    assert.ok(result.stderr.includes('Usage: node validate-path.js'), `Usage 출력 필요: ${result.stderr}`)
  }

  test('직접 실행하면 main()이 돈다 (인자 없음 → Usage + exit 1)', () => {
    assertUsage(script)
  })

  // CLI 인자 검증·오류 메시지 형식이 그대로인지 확인한다 (exit 1 + 기존 stderr 접두어).
  function runCli(...args) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
    if (result.error) throw result.error
    return result
  }

  test('잘못된 topic → Invalid topic: + exit 1', () => {
    const result = runCli('--topic=bad topic!', '--field=plan')
    assert.equal(result.status, 1)
    assert.equal(result.stderr, 'Invalid topic: bad topic!\n')
    assert.equal(result.stdout, '')
  })

  test('잘못된 field → Invalid field: + exit 1', () => {
    const result = runCli('--topic=ok-topic', '--field=plan;rm')
    assert.equal(result.status, 1)
    assert.equal(result.stderr, 'Invalid field: plan;rm\n')
  })

  test('읽을 수 없는 topic → Failed to read path + exit 1 (빈 출력으로 성공하지 않음)', () => {
    const result = runCli('--topic=no-such-topic-for-test', '--field=plan')
    assert.equal(result.status, 1)
    // dev-context.js 의 stderr 가 먼저 상속 출력되므로 포함 여부로 확인한다.
    assert.ok(result.stderr.includes('Failed to read path (topic=no-such-topic-for-test field=plan)'), result.stderr)
    assert.equal(result.stdout, '')
  })

  test('디렉토리 링크(junction/symlink)를 거쳐 실행해도 main()이 돈다', () => {
    linkBase = join(realpathSync(tmpdir()), `validate-path-link-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(linkBase, { recursive: true })
    const linkDir = join(linkBase, 'scripts-link')
    symlinkSync(dirname(script), linkDir, 'junction')
    assertUsage(join(linkDir, 'validate-path.js'))
  })
})
