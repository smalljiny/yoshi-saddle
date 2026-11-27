// lang-test-fixture.js — lang.js 서브커맨드 테스트가 공유하는 임시 루트·홈 fixture와 CLI 헬퍼.
// 이름이 `*.test.js`가 아니므로 `node --test src/.harness/scripts/*.test.js` glob에 걸리지 않는다.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const LANG_JS = join(dirname(fileURLToPath(import.meta.url)), 'lang.js')

export const BEGIN = '<!-- harness-language:begin -->'
export const END = '<!-- harness-language:end -->'
export const FENCE3 = '`'.repeat(3)

// 줄 배열을 LF로 이어 파일 내용 문자열을 만든다.
export function doc(...lines) {
  return `${lines.join('\n')}\n`
}

// 마커 사이에 주어진 줄을 넣은 블록 문서를 만든다.
export function block(...inner) {
  return doc('## Language', '', BEGIN, ...inner, END)
}

function writeUnder(baseDir, rel, content) {
  const file = join(baseDir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
  return file
}

/**
 * 임시 루트·홈 디렉토리를 만들고 lang.js를 그 루트·홈으로 실행하는 헬퍼를 돌려준다.
 * 테스트는 beforeEach에서 만들고 afterEach에서 cleanup()을 호출한다.
 */
export function createLangFixture() {
  const id = `lang-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const base = join(realpathSync(tmpdir()), id)
  const root = join(base, 'root')
  const home = join(base, 'home')
  mkdirSync(root, { recursive: true })
  mkdirSync(home, { recursive: true })

  return Object.freeze({
    base,
    root,
    home,
    write: (rel, content) => writeUnder(root, rel, content),
    writeHome: (rel, content) => writeUnder(home, rel, content),
    // cwd는 루트로 둔다 (check의 --file 상대 경로가 루트 기준이 되도록).
    run: (...args) => {
      const result = spawnSync(process.execPath, [LANG_JS, ...args], {
        encoding: 'utf8',
        cwd: root,
        env: { ...process.env, LANG_JS_ROOT: root, LANG_JS_HOME: home },
      })
      return { stdout: result.stdout, stderr: result.stderr, status: result.status }
    },
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  })
}

// stdout·stderr·exit code를 함께 단언하고, stderr에 임시 디렉토리 절대 경로가 없음을 확인한다.
export function expectRun(fixture, args, expected) {
  const actual = fixture.run(...args)
  assert.deepEqual(actual, expected)
  assert.ok(!actual.stderr.includes(fixture.base), `stderr에 임시 경로가 노출됨: ${actual.stderr}`)
  return actual
}
