// lang.test.js — 언어 값 정규화·언어 규칙 블록 판정·resolve CLI 테스트
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { normalizeLanguage, parseLanguageBlock } from './lang.js'

const LANG_JS = join(dirname(fileURLToPath(import.meta.url)), 'lang.js')
const USAGE = 'usage: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit\n'

const BEGIN = '<!-- harness-language:begin -->'
const END = '<!-- harness-language:end -->'
const FENCE3 = '`'.repeat(3)
const FENCE4 = '`'.repeat(4)

// 줄 배열을 LF로 이어 파일 내용 문자열을 만든다.
function doc(...lines) {
  return `${lines.join('\n')}\n`
}

// 마커 사이에 주어진 줄을 넣은 블록 문서를 만든다.
function block(...inner) {
  return doc('## Language', '', BEGIN, ...inner, END)
}

describe('normalizeLanguage', () => {
  const koInputs = ['korean', 'Korean', '  KOREAN  ', '한국어', 'ko', 'KO', 'kor', 'ko-kr', 'ko-KR', 'ko-anything', 'ko-']
  for (const input of koInputs) {
    test(`'${input}' → ko`, () => {
      assert.equal(normalizeLanguage(input), 'ko')
    })
  }

  const enInputs = ['english', 'English', '영어', 'en', 'eng', 'en-us', 'EN-GB', ' en ', 'en-']
  for (const input of enInputs) {
    test(`'${input}' → en`, () => {
      assert.equal(normalizeLanguage(input), 'en')
    })
  }

  const unsupported = ['french', 'ko_kr', 'korea', 'kr', 'k', 'kor-x', 'english us']
  for (const input of unsupported) {
    test(`'${input}' → 미지원(null)`, () => {
      assert.equal(normalizeLanguage(input), null)
    })
  }

  for (const input of ['', '   ', '\t']) {
    test(`빈 값 ${JSON.stringify(input)} → 누락(undefined)`, () => {
      assert.equal(normalizeLanguage(input), undefined)
    })
  }
})

describe('parseLanguageBlock — 기본 판정', () => {
  test('스펙 §3.3 예시 블록은 유효', () => {
    const content = doc(
      '## Language',
      '',
      'Replies to the user follow the Claude Code `language` setting.',
      '',
      BEGIN,
      '- docs: ko',
      '- commit: ko',
      '- comments: ko',
      '- code identifiers: en',
      '- component files: en (executable instructions only; translation catalogs are data)',
      END,
    )
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko', commit: 'ko' } })
  })

  test('마커가 없으면 none', () => {
    assert.deepEqual(parseLanguageBlock(doc('# Title', '- docs: ko')), { status: 'none' })
  })

  test('빈 문자열은 none', () => {
    assert.deepEqual(parseLanguageBlock(''), { status: 'none' })
  })

  test('해석 대상 키가 없으면 values는 빈 객체', () => {
    assert.deepEqual(parseLanguageBlock(block('- comments: ko')), { status: 'valid', values: {} })
  })

  test('결과 객체는 호출마다 새 객체', () => {
    const content = block('- docs: ko')
    assert.notEqual(parseLanguageBlock(content), parseLanguageBlock(content))
  })
})

describe('parseLanguageBlock — 줄 문법', () => {
  const cases = [
    ['- docs:ko', { docs: 'ko' }],
    ['- docs: ko', { docs: 'ko' }],
    ['- docs:', { docs: '' }],
    ['- docs:   ', { docs: '' }],
    ['-  docs: ko', { docs: 'ko' }],
    ['- docs: Korean  ', { docs: 'Korean' }],
    ['- docs:\tko\t', { docs: 'ko' }],
    ['* docs: ko', {}],
    ['docs: ko', {}],
    ['- Docs: ko', {}],
    ['-docs: ko', {}],
    ['  - docs: ko', {}],
  ]
  for (const [line, values] of cases) {
    test(`${JSON.stringify(line)} → ${JSON.stringify(values)}`, () => {
      assert.deepEqual(parseLanguageBlock(block(line)), { status: 'valid', values })
    })
  }

  test('docs와 commit을 각각 담는다', () => {
    assert.deepEqual(parseLanguageBlock(block('- docs: en', '- commit: ko')), {
      status: 'valid',
      values: { docs: 'en', commit: 'ko' },
    })
  })

  test('블록 밖 키 줄은 무시', () => {
    const content = doc('- docs: en', BEGIN, '- commit: ko', END, '- docs: en')
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { commit: 'ko' } })
  })
})

describe('parseLanguageBlock — 마커', () => {
  test('마커 뒤쪽 공백 허용', () => {
    const content = doc(`${BEGIN}   `, '- docs: ko', `${END}\t`)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('공백 1칸 들여쓴 마커는 무시 → none', () => {
    assert.deepEqual(parseLanguageBlock(doc(` ${BEGIN}`, '- docs: ko', ` ${END}`)), { status: 'none' })
  })

  test('4칸 들여쓴 마커는 무시 → none', () => {
    assert.deepEqual(parseLanguageBlock(doc(`    ${BEGIN}`, '- docs: ko', `    ${END}`)), { status: 'none' })
  })

  test('마커 뒤 공백·탭 외 공백 문자(NBSP)는 마커 아님', () => {
    assert.deepEqual(parseLanguageBlock(doc(`${BEGIN}\u00a0`, '- docs: ko', END)), { status: 'malformed' })
  })

  test('마커 뒤에 다른 문자가 있으면 마커 아님', () => {
    assert.deepEqual(parseLanguageBlock(doc(`${BEGIN} x`, '- docs: ko', `${END} x`)), { status: 'none' })
  })
})

describe('parseLanguageBlock — malformed', () => {
  const cases = {
    'begin만': doc(BEGIN, '- docs: ko'),
    'end만': doc('- docs: ko', END),
    'end → begin 역순': doc(END, '- docs: ko', BEGIN),
    '블록 둘': doc(BEGIN, '- docs: ko', END, BEGIN, '- commit: ko', END),
    'docs 반복 (ko/en)': block('- docs: ko', '- docs: en'),
    'docs 반복 (빈 값 + ko)': block('- docs:', '- docs: ko'),
    'commit 반복': block('- commit: ko', '- commit: ko'),
    'begin 둘 end 하나': doc(BEGIN, BEGIN, '- docs: ko', END),
  }
  for (const [name, content] of Object.entries(cases)) {
    test(name, () => {
      assert.deepEqual(parseLanguageBlock(content), { status: 'malformed' })
    })
  }

  test('comments 반복만 있으면 유효', () => {
    assert.deepEqual(parseLanguageBlock(block('- comments: ko', '- comments: en', '- docs: ko')), {
      status: 'valid',
      values: { docs: 'ko' },
    })
  })
})

describe('parseLanguageBlock — 코드 펜스', () => {
  test('펜스 안 마커는 무시', () => {
    const content = doc(FENCE3, BEGIN, '- docs: en', END, FENCE3)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('펜스 안 예시 블록과 실제 블록이 함께 있으면 실제 블록만', () => {
    const content = doc(`${FENCE3}markdown`, BEGIN, '- docs: en', END, FENCE3, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('블록 안 펜스 속 키 줄은 해석하지 않음', () => {
    const content = block('- docs: ko', FENCE3, '- docs: en', FENCE3)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('4백틱 펜스 안의 3백틱 줄은 펜스를 닫지 않음', () => {
    const content = doc(FENCE4, FENCE3, BEGIN, '- docs: en', END, FENCE3)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('4백틱 펜스는 4백틱 이상으로 닫힘', () => {
    const content = doc(FENCE4, FENCE3, `${FENCE4}\``, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('~~~ 펜스는 ``` 로 닫히지 않음', () => {
    const content = doc('~~~', FENCE3, BEGIN, '- docs: en', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('~~~ 펜스는 ~~~ 로 닫힘', () => {
    const content = doc('~~~', 'x', '~~~~', BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('들여쓰기 3칸 여는 펜스는 펜스로 인정', () => {
    const content = doc(`   ${FENCE3}`, BEGIN, '- docs: en', END, FENCE3)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('들여쓰기 4칸 펜스는 펜스 아님 → 뒤 마커 인식', () => {
    const content = doc(`    ${FENCE3}`, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('닫히지 않은 펜스 뒤 마커는 무시', () => {
    const content = doc(FENCE3, 'x', BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('info 문자열에 백틱이 든 백틱 줄은 펜스 아님', () => {
    const content = doc(`${FENCE3}a\`b`, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('물결표 펜스의 info 문자열에는 백틱 허용', () => {
    const content = doc('~~~a`b', BEGIN, '- docs: en', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('닫는 펜스 뒤에 공백 외 문자가 있으면 닫지 않음', () => {
    const content = doc(FENCE3, `${FENCE3} x`, BEGIN, '- docs: en', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('펜스 안 begin과 펜스 밖 end → malformed', () => {
    const content = doc(FENCE3, BEGIN, FENCE3, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'malformed' })
  })

  test('블록 안 닫히지 않은 펜스가 end 마커를 삼키면 malformed', () => {
    const content = doc(BEGIN, '- docs: ko', FENCE3, END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'malformed' })
  })

  test('들여쓰기 3칸 닫는 펜스는 펜스를 닫음', () => {
    const content = doc(FENCE3, 'x', `   ${FENCE3}`, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })

  test('들여쓰기 4칸 닫는 펜스는 펜스를 닫지 않음', () => {
    const content = doc(FENCE3, 'x', `    ${FENCE3}`, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'none' })
  })

  test('닫는 펜스 뒤 공백은 허용', () => {
    const content = doc(FENCE3, 'x', `${FENCE3}  `, BEGIN, '- docs: ko', END)
    assert.deepEqual(parseLanguageBlock(content), { status: 'valid', values: { docs: 'ko' } })
  })
})

describe('parseLanguageBlock — 줄바꿈', () => {
  const lfCases = {
    '유효 블록': block('- docs: ko', '- commit: en'),
    '빈 값': block('- docs:'),
    'malformed': block('- docs: ko', '- docs: en'),
    '펜스 포함': doc(FENCE3, BEGIN, FENCE3, BEGIN, '- docs: ko', END),
  }
  for (const [name, lf] of Object.entries(lfCases)) {
    test(`CRLF와 LF 결과 동일 — ${name}`, () => {
      const crlf = lf.replaceAll('\n', '\r\n')
      assert.deepEqual(parseLanguageBlock(crlf), parseLanguageBlock(lf))
    })
  }

  test('CRLF 값에 \\r이 남지 않음', () => {
    const crlf = block('- docs: ko').replaceAll('\n', '\r\n')
    assert.deepEqual(parseLanguageBlock(crlf), { status: 'valid', values: { docs: 'ko' } })
  })
})

// ── resolve CLI ─────────────────────────────────────────────────────────────
// 테스트마다 임시 디렉토리에 루트·홈을 만들고 LANG_JS_ROOT·LANG_JS_HOME으로 주입한다.
describe('resolve CLI', () => {
  let base
  let root
  let home

  beforeEach(() => {
    const id = `lang-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    base = join(realpathSync(tmpdir()), id)
    root = join(base, 'root')
    home = join(base, 'home')
    mkdirSync(root, { recursive: true })
    mkdirSync(home, { recursive: true })
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  function write(rel, content) {
    const file = join(root, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content, 'utf8')
  }

  function writeHome(rel, content) {
    const file = join(home, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content, 'utf8')
  }

  function run(...args) {
    return runWithNodeArgs([], ...args)
  }

  function runWithNodeArgs(nodeArgs, ...args) {
    const result = spawnSync(process.execPath, [...nodeArgs, LANG_JS, ...args], {
      encoding: 'utf8',
      env: { ...process.env, LANG_JS_ROOT: root, LANG_JS_HOME: home },
    })
    return { stdout: result.stdout, stderr: result.stderr, status: result.status }
  }

  // stdout·stderr·exit code를 함께 단언하고, stderr에 임시 디렉토리 절대 경로가 없음을 확인한다.
  function expectRun(args, expected) {
    const actual = run(...args)
    assert.deepEqual(actual, expected)
    assert.ok(!actual.stderr.includes(base), `stderr에 임시 경로가 노출됨: ${actual.stderr}`)
  }

  const docs = ['resolve', '--kind=docs']
  const commit = ['resolve', '--kind=commit']
  const ok = (lang, stderr = '') => ({ stdout: `${lang}\n`, stderr, status: 0 })
  const malformed = (file) => `malformed language block in ${file}\n`

  describe('블록 선택과 파일 단위 fallback', () => {
    test('CLAUDE.md 블록 docs: ko → ko', () => {
      write('CLAUDE.md', block('- docs: ko'))
      expectRun(docs, ok('ko'))
    })

    test('commit: en → --kind=commit이 en', () => {
      write('CLAUDE.md', block('- docs: ko', '- commit: en'))
      expectRun(commit, ok('en'))
    })

    test('docs: en + commit: ko → --kind=commit이 ko', () => {
      write('CLAUDE.md', block('- docs: en', '- commit: ko'))
      expectRun(commit, ok('ko'))
    })

    test('CLAUDE.md에 블록 없음 → AGENTS.md 블록', () => {
      write('CLAUDE.md', doc('# Title', '- docs: en'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('ko'))
    })

    test('CLAUDE.md 없음 → AGENTS.md 블록', () => {
      write('AGENTS.md', block('- commit: ko'))
      expectRun(commit, ok('ko'))
    })

    test('둘 다 없음 → en, stderr 없음', () => {
      expectRun(docs, ok('en'))
    })

    test('둘 다 블록 없음 → en', () => {
      write('CLAUDE.md', doc('# A'))
      write('AGENTS.md', doc('# B'))
      expectRun(docs, ok('en'))
    })
  })

  describe('블록 값', () => {
    test('CLAUDE.md - docs: (빈 값) → en, AGENTS.md로 안 넘어감', () => {
      write('CLAUDE.md', block('- docs:'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('en'))
    })

    test('CLAUDE.md에 docs 키 없음 → en (키 단위 fallback 없음)', () => {
      write('CLAUDE.md', block('- commit: ko'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('en'))
    })

    test('CLAUDE.md에 commit 키 없음 → --kind=commit이 en (키 단위 fallback 없음)', () => {
      write('CLAUDE.md', block('- docs: ko'))
      write('AGENTS.md', block('- commit: ko'))
      expectRun(commit, ok('en'))
    })

    test('CLAUDE.md docs: french + AGENTS.md docs: ko → en + 미지원 경고', () => {
      write('CLAUDE.md', block('- docs: french'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('en', "unsupported language 'french' in CLAUDE.md, using en\n"))
    })

    test('미지원 값은 원래 대소문자로 표시', () => {
      write('CLAUDE.md', block('- docs: French'))
      expectRun(docs, ok('en', "unsupported language 'French' in CLAUDE.md, using en\n"))
    })

    test('AGENTS.md 미지원 값 경고는 AGENTS.md 표기', () => {
      write('AGENTS.md', block('- commit: klingon'))
      expectRun(commit, ok('en', "unsupported language 'klingon' in AGENTS.md, using en\n"))
    })

    test('- docs:ko → ko', () => {
      write('CLAUDE.md', block('- docs:ko'))
      expectRun(docs, ok('ko'))
    })

    test('- docs:   → en (누락)', () => {
      write('CLAUDE.md', block('- docs:   '))
      expectRun(docs, ok('en'))
    })

    test('정규화 영어 → en', () => {
      write('CLAUDE.md', block('- docs: 영어'))
      expectRun(docs, ok('en'))
    })

    test('정규화 Korean → ko', () => {
      write('CLAUDE.md', block('- commit: Korean'))
      expectRun(commit, ok('ko'))
    })
  })

  describe('malformed와 키 반복', () => {
    test('- docs: + - docs: ko → malformed 경고 + AGENTS.md 결과', () => {
      write('CLAUDE.md', block('- docs:', '- docs: ko'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('ko', malformed('CLAUDE.md')))
    })

    test('docs: ko + docs: en → malformed 경고 + AGENTS.md 결과', () => {
      write('CLAUDE.md', block('- docs: ko', '- docs: en'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('ko', malformed('CLAUDE.md')))
    })

    test('키 반복 + AGENTS.md 없음 → en', () => {
      write('CLAUDE.md', block('- docs: ko', '- docs: en'))
      expectRun(docs, ok('en', malformed('CLAUDE.md')))
    })

    test('comments 반복만 → 유효, 경고 없음', () => {
      write('CLAUDE.md', block('- comments: ko', '- comments: en', '- docs: ko'))
      expectRun(docs, ok('ko'))
    })

    test('블록 안 펜스 속 docs: en은 무시', () => {
      write('CLAUDE.md', block('- docs: ko', FENCE3, '- docs: en', FENCE3))
      expectRun(docs, ok('ko'))
    })

    test('CLAUDE.md·AGENTS.md 둘 다 malformed → 경고 2줄 + en', () => {
      write('CLAUDE.md', doc(BEGIN, '- docs: ko'))
      write('AGENTS.md', doc('- docs: ko', END))
      expectRun(docs, ok('en', malformed('CLAUDE.md') + malformed('AGENTS.md')))
    })
  })

  describe('마커·펜스', () => {
    const malformedCases = {
      'begin만': doc(BEGIN, '- docs: en'),
      'end만': doc('- docs: en', END),
      '역순': doc(END, '- docs: en', BEGIN),
      '블록 둘': doc(BEGIN, '- docs: en', END, BEGIN, '- docs: en', END),
    }
    for (const [name, content] of Object.entries(malformedCases)) {
      test(`${name} → malformed 경고 + AGENTS.md`, () => {
        write('CLAUDE.md', content)
        write('AGENTS.md', block('- docs: ko'))
        expectRun(docs, ok('ko', malformed('CLAUDE.md')))
      })
    }

    // 무시 케이스: CLAUDE.md의 마커가 인식되지 않아 블록 없음 → AGENTS.md(ko), 경고 없음
    const ignoredCases = {
      '펜스 안 마커': doc(FENCE3, BEGIN, '- docs: en', END, FENCE3),
      '들여쓴 마커': doc(`    ${BEGIN}`, '- docs: en', `    ${END}`),
      '4백틱 안 3백틱': doc(FENCE4, FENCE3, BEGIN, '- docs: en', END, FENCE3),
      '~~~ 펜스는 ```로 닫히지 않음': doc('~~~', FENCE3, BEGIN, '- docs: en', END),
      '3칸 들여쓴 여는 펜스': doc(`   ${FENCE3}`, BEGIN, '- docs: en', END, FENCE3),
      '닫히지 않은 펜스': doc(FENCE3, BEGIN, '- docs: en', END),
    }
    for (const [name, content] of Object.entries(ignoredCases)) {
      test(`${name} → 무시, AGENTS.md 결과`, () => {
        write('CLAUDE.md', content)
        write('AGENTS.md', block('- docs: ko'))
        expectRun(docs, ok('ko'))
      })
    }

    test('4칸 들여쓴 펜스는 펜스 아님 → 뒤 블록 인식', () => {
      write('CLAUDE.md', doc(`    ${FENCE3}`, BEGIN, '- docs: ko', END))
      write('AGENTS.md', block('- docs: en'))
      expectRun(docs, ok('ko'))
    })
  })

  describe('줄바꿈', () => {
    const variants = {
      '유효 블록': [block('- docs: ko'), docs, ok('ko')],
      'malformed': [block('- docs: ko', '- docs: en'), docs, ok('en', malformed('CLAUDE.md'))],
      '미지원 값': [block('- commit: french'), commit, ok('en', "unsupported language 'french' in CLAUDE.md, using en\n")],
    }
    for (const [name, [lf, args, expected]] of Object.entries(variants)) {
      test(`CRLF와 LF가 같은 기대 결과 — ${name}`, () => {
        write('CLAUDE.md', lf)
        expectRun(args, expected)
        write('CLAUDE.md', lf.replaceAll('\n', '\r\n'))
        expectRun(args, expected)
      })
    }
  })

  describe('읽기 오류', () => {
    test('CLAUDE.md가 디렉토리 → 읽기 오류 경고 + AGENTS.md 결과', () => {
      mkdirSync(join(root, 'CLAUDE.md'))
      write('AGENTS.md', block('- docs: ko'))
      expectRun(docs, ok('ko', 'cannot read CLAUDE.md: EISDIR\n'))
    })

    test('AGENTS.md가 디렉토리 → 읽기 오류 경고 + en', () => {
      mkdirSync(join(root, 'AGENTS.md'))
      expectRun(docs, ok('en', 'cannot read AGENTS.md: EISDIR\n'))
    })
  })

  describe('호출 형식 오류', () => {
    const invalid = {
      '인자 없음': [],
      'resolve만': ['resolve'],
      '--kind= 빈 값': ['resolve', '--kind='],
      '--kind=foo': ['resolve', '--kind=foo'],
      '알 수 없는 서브커맨드': ['unknown', '--kind=docs'],
      '추가 옵션': ['resolve', '--kind=docs', '--extra'],
      '--kind 중복': ['resolve', '--kind=docs', '--kind=commit'],
      '위치 인자 추가': ['resolve', '--kind=docs', 'extra'],
      '--kind 값 분리': ['resolve', '--kind', 'docs'],
      '대문자 kind': ['resolve', '--kind=DOCS'],
      '--kind=Conversation': ['resolve', '--kind=Conversation'],
      '--kind=__proto__': ['resolve', '--kind=__proto__'],
      '--kind=toString': ['resolve', '--kind=toString'],
    }
    for (const [name, args] of Object.entries(invalid)) {
      test(`${name} → 사용법 + exit 1`, () => {
        expectRun(args, { stdout: '', stderr: USAGE, status: 1 })
      })
    }

    test('설정이 malformed여도 형식 오류가 우선', () => {
      write('CLAUDE.md', doc(BEGIN))
      expectRun(['resolve'], { stdout: '', stderr: USAGE, status: 1 })
    })
  })

  describe('conversation', () => {
    const conv = ['resolve', '--kind=conversation']
    const LOCAL = '.claude/settings.local.json'
    const PROJECT = '.claude/settings.json'
    const USER = '.claude/settings.json' // PROJECT와 같은 상대 경로지만 writeHome으로 홈 기준에 쓴다
    const json = (value) => JSON.stringify(value)
    const unsupported = (value, file) => `unsupported language '${value}' in ${file}, using en\n`
    const cannotRead = (file, reason) => `cannot read ${file}: ${reason}\n`

    describe('settings 우선순위', () => {
      test('local만 Korean → ko', () => {
        write(LOCAL, json({ language: 'Korean' }))
        expectRun(conv, ok('ko'))
      })

      test('project만 한국어 → ko', () => {
        write(PROJECT, json({ language: '한국어' }))
        expectRun(conv, ok('ko'))
      })

      test('user만 Korean, docs 블록 없음 → ko', () => {
        writeHome(USER, json({ language: 'Korean' }))
        expectRun(conv, ok('ko'))
      })

      test('local 없음 + project ko + user en → ko', () => {
        write(PROJECT, json({ language: 'ko' }))
        writeHome(USER, json({ language: 'en' }))
        expectRun(conv, ok('ko'))
      })

      test('local en + project ko → en (상위가 하위를 가림)', () => {
        write(LOCAL, json({ language: 'en' }))
        write(PROJECT, json({ language: 'ko' }))
        expectRun(conv, ok('en'))
      })

      test('settings 값이 docs 블록보다 우선', () => {
        write(LOCAL, json({ language: 'english' }))
        write('CLAUDE.md', block('- docs: ko'))
        expectRun(conv, ok('en'))
      })

      test('local french + project ko → en + 경고 (하위로 안 넘어감)', () => {
        write(LOCAL, json({ language: 'french' }))
        write(PROJECT, json({ language: 'ko' }))
        expectRun(conv, ok('en', unsupported('french', LOCAL)))
      })

      test('user french만 → en + ~/.claude/settings.json 표기 경고', () => {
        writeHome(USER, json({ language: 'french' }))
        expectRun(conv, ok('en', unsupported('french', '~/.claude/settings.json')))
      })

      test('user 값이 임시 홈 절대 경로 → 값은 그대로 표시, 파일 표기는 리터럴', () => {
        writeHome(USER, json({ language: home }))
        assert.deepEqual(run(...conv), ok('en', unsupported(home, '~/.claude/settings.json')))
      })
    })

    describe('docs fallback', () => {
      test('settings 셋 다 없음 + CLAUDE.md docs: ko → ko', () => {
        write('CLAUDE.md', block('- docs: ko'))
        expectRun(conv, ok('ko'))
      })

      test('settings 셋 다 없음 + 블록 없음 → en', () => {
        expectRun(conv, ok('en'))
      })

      test('settings 셋 다 없음 + CLAUDE.md docs: french → en + docs 미지원 경고', () => {
        write('CLAUDE.md', block('- docs: french'))
        expectRun(conv, ok('en', unsupported('french', 'CLAUDE.md')))
      })

      test('settings 경고 뒤에 docs 경고가 이어짐', () => {
        write(LOCAL, '{')
        write('CLAUDE.md', block('- docs: french'))
        expectRun(conv, ok('en', cannotRead(LOCAL, 'invalid JSON') + unsupported('french', 'CLAUDE.md')))
      })

      test('commit 블록 값은 conversation에 쓰지 않음', () => {
        write('CLAUDE.md', block('- commit: ko'))
        expectRun(conv, ok('en'))
      })
    })

    describe('미설정으로 보는 값', () => {
      const unsetValues = { 숫자: 1, 배열: ['ko'], null: null, 객체: { ko: true }, 불리언: true, '공백뿐': '   ', '빈 문자열': '' }
      for (const [name, value] of Object.entries(unsetValues)) {
        test(`local language가 ${name} → 경고 없이 project ko`, () => {
          write(LOCAL, json({ language: value }))
          write(PROJECT, json({ language: 'ko' }))
          expectRun(conv, ok('ko'))
        })
      }

      test('language 키 없는 settings({}) → 경고 없이 다음 파일', () => {
        write(LOCAL, '{}')
        writeHome(USER, json({ language: 'ko' }))
        expectRun(conv, ok('ko'))
      })

      test('Object.prototype.language 오염은 읽지 않음 (Object.hasOwn 가드)', () => {
        write(LOCAL, '{}')
        const pollute = ['--import', 'data:text/javascript,Object.prototype.language="Korean"']
        assert.deepEqual(runWithNodeArgs(pollute, ...conv), ok('en'))
      })
    })

    describe('읽기·파싱 오류', () => {
      test('local 잘못된 JSON + project ko → ko + invalid JSON 경고', () => {
        write(LOCAL, '{"language": ')
        write(PROJECT, json({ language: 'ko' }))
        expectRun(conv, ok('ko', cannotRead(LOCAL, 'invalid JSON')))
      })

      test('local 잘못된 JSON 본문에 임시 루트 경로 → stderr에 경로 없음', () => {
        write(LOCAL, `{"language": "${root}"`)
        write(PROJECT, json({ language: 'ko' }))
        expectRun(conv, ok('ko', cannotRead(LOCAL, 'invalid JSON')))
      })

      test('user 잘못된 JSON 본문에 임시 홈 경로 + docs ko → ko, 경로 없음', () => {
        writeHome(USER, `{"language": "${home}"`)
        write('CLAUDE.md', block('- docs: ko'))
        expectRun(conv, ok('ko', cannotRead('~/.claude/settings.json', 'invalid JSON')))
      })

      test('user settings가 디렉토리 + docs ko → ko + EISDIR 경고', () => {
        mkdirSync(join(home, USER), { recursive: true })
        write('CLAUDE.md', block('- docs: ko'))
        expectRun(conv, ok('ko', cannotRead('~/.claude/settings.json', 'EISDIR')))
      })

      test('local settings가 디렉토리 + project ko → ko + EISDIR 경고', () => {
        mkdirSync(join(root, LOCAL), { recursive: true })
        write(PROJECT, json({ language: 'ko' }))
        expectRun(conv, ok('ko', cannotRead(LOCAL, 'EISDIR')))
      })

      const nonObjects = { null: 'null', 배열: '["ko"]', 문자열: '"ko"', 숫자: '1', 불리언: 'true' }
      for (const [name, content] of Object.entries(nonObjects)) {
        test(`local 최상위가 ${name} → 비객체 경고 + project ko`, () => {
          write(LOCAL, content)
          write(PROJECT, json({ language: 'ko' }))
          expectRun(conv, ok('ko', cannotRead(LOCAL, 'top-level value is not an object')))
        })
      }

      test('project 잘못된 JSON + user ko → ko + project 경고', () => {
        write(PROJECT, 'not json')
        writeHome(USER, json({ language: 'ko' }))
        expectRun(conv, ok('ko', cannotRead(PROJECT, 'invalid JSON')))
      })
    })

    test('CRLF settings도 같은 결과', () => {
      write(LOCAL, '{\r\n  "language": "Korean"\r\n}\r\n')
      expectRun(conv, ok('ko'))
    })
  })
})
