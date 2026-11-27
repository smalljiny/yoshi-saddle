// lang-explain.test.js — lang.js explain 서브커맨드 테스트
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLangFixture, expectRun, block, doc } from './lang-test-fixture.js'

const EXPLAIN_USAGE = 'usage: node .harness/scripts/lang.js explain --kind=conversation|docs|commit\n'
const LOCAL = '.claude/settings.local.json'
const USER = '~/.claude/settings.json'

const explained = (value, source, reason, stderr = '') => ({
  stdout: `value=${value}\nsource=${source}\nreason=${reason}\n`,
  stderr,
  status: 0,
})

describe('explain CLI', () => {
  let fx

  beforeEach(() => {
    fx = createLangFixture()
  })

  afterEach(() => {
    fx.cleanup()
  })

  // explain 결과를 단언하고, 같은 입력의 resolve stdout이 value와 같은지 확인한다.
  function expectExplain(kind, expected) {
    expectRun(fx, ['explain', `--kind=${kind}`], expected)
    const value = /^value=(.*)$/m.exec(expected.stdout)[1]
    const resolved = fx.run('resolve', `--kind=${kind}`)
    assert.deepEqual(resolved, { stdout: `${value}\n`, stderr: expected.stderr, status: 0 })
  }

  for (const kind of ['docs', 'commit']) {
    describe(kind, () => {
      test('set — CLAUDE.md 블록 값', () => {
        fx.write('CLAUDE.md', block(`- ${kind}: en`))
        expectExplain(kind, explained('en', 'CLAUDE.md', 'set'))
      })

      test('missing-key — CLAUDE.md 블록에 키 없음 (AGENTS.md로 넘어가지 않음)', () => {
        fx.write('CLAUDE.md', block('- comments: ko'))
        fx.write('AGENTS.md', block(`- ${kind}: ko`))
        expectExplain(kind, explained('en', 'CLAUDE.md', 'missing-key'))
      })

      test('missing-key — 빈 값', () => {
        fx.write('CLAUDE.md', block(`- ${kind}:`))
        expectExplain(kind, explained('en', 'CLAUDE.md', 'missing-key'))
      })

      test('unsupported — 미지원 값과 경고', () => {
        fx.write('CLAUDE.md', block(`- ${kind}: french`))
        expectExplain(
          kind,
          explained('en', 'CLAUDE.md', 'unsupported', "unsupported language 'french' in CLAUDE.md, using en\n"),
        )
      })

      test('no-source — 두 파일 없음', () => {
        expectExplain(kind, explained('en', 'default', 'no-source'))
      })

      test('no-source — 두 파일에 블록 없음', () => {
        fx.write('CLAUDE.md', doc('# Title'))
        fx.write('AGENTS.md', doc('# Title'))
        expectExplain(kind, explained('en', 'default', 'no-source'))
      })

      test('CLAUDE.md 블록 없음 → AGENTS.md 선택', () => {
        fx.write('CLAUDE.md', doc('# Title'))
        fx.write('AGENTS.md', block(`- ${kind}: ko`))
        expectExplain(kind, explained('ko', 'AGENTS.md', 'set'))
      })

      test('CLAUDE.md malformed → AGENTS.md 선택 + 경고', () => {
        fx.write('CLAUDE.md', block(`- ${kind}: en`, `- ${kind}: ko`))
        fx.write('AGENTS.md', block(`- ${kind}: ko`))
        expectExplain(kind, explained('ko', 'AGENTS.md', 'set', 'malformed language block in CLAUDE.md\n'))
      })
    })
  }

  describe('conversation', () => {
    test('set — local settings', () => {
      fx.write(LOCAL, JSON.stringify({ language: 'ko' }))
      expectExplain('conversation', explained('ko', LOCAL, 'set'))
    })

    test('set — project settings', () => {
      fx.write('.claude/settings.json', JSON.stringify({ language: 'english' }))
      expectExplain('conversation', explained('en', '.claude/settings.json', 'set'))
    })

    test('local이 user보다 우선', () => {
      fx.write(LOCAL, JSON.stringify({ language: 'en' }))
      fx.writeHome('.claude/settings.json', JSON.stringify({ language: 'ko' }))
      expectExplain('conversation', explained('en', LOCAL, 'set'))
    })

    test('unsupported — user settings', () => {
      fx.writeHome('.claude/settings.json', JSON.stringify({ language: 'french' }))
      expectExplain(
        'conversation',
        explained('en', USER, 'unsupported', `unsupported language 'french' in ${USER}, using en\n`),
      )
    })

    test('fallback-docs — settings 없음, CLAUDE.md docs 값', () => {
      fx.write('CLAUDE.md', block('- docs: ko'))
      expectExplain('conversation', explained('ko', 'CLAUDE.md', 'fallback-docs'))
    })

    test('fallback-docs — 빈 language 값은 미설정, docs가 AGENTS.md 미지원 값', () => {
      fx.write(LOCAL, JSON.stringify({ language: '' }))
      fx.write('AGENTS.md', block('- docs: french'))
      expectExplain(
        'conversation',
        explained('en', 'AGENTS.md', 'fallback-docs', "unsupported language 'french' in AGENTS.md, using en\n"),
      )
    })

    test('fallback-docs — settings·블록 모두 없음', () => {
      expectExplain('conversation', explained('en', 'default', 'fallback-docs'))
    })
  })

  describe('호출 형식 오류', () => {
    const invalid = [
      ['explain'],
      ['explain', '--kind='],
      ['explain', '--kind=DOCS'],
      ['explain', '--kind=docs', 'extra'],
      ['explain', '--kind', 'docs'],
      ['explain', '--kind=constructor'],
    ]
    for (const args of invalid) {
      test(`${JSON.stringify(args)} → explain 사용법`, () => {
        expectRun(fx, args, { stdout: '', stderr: EXPLAIN_USAGE, status: 1 })
      })
    }
  })
})
