// lang-check.test.js — lang.js check 서브커맨드 테스트
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLangFixture, expectRun, doc, BEGIN, END, FENCE3 } from './lang-test-fixture.js'

const CHECK_USAGE =
  'usage: node .harness/scripts/lang.js check --file=<path> --expect-begin=<n> --expect-end=<n> --expect-docs=<ko|en> --expect-commit=<ko|en> --expect-comments=<ko|en>\n'

const GOOD_INNER = Object.freeze(['- docs: ko', '- commit: en', '- comments: ko', '- code identifiers: en'])

// 조립본: prefix + `## Language` 섹션(블록) + suffix. begin·end는 1부터 센 마커 줄 번호.
function assembled(inner = GOOD_INNER, { prefix = ['# Project', ''], suffix = ['', 'tail'] } = {}) {
  const lines = [...prefix, '## Language', '', BEGIN, ...inner, END, ...suffix]
  const begin = prefix.length + 3
  return { content: doc(...lines), begin, end: begin + inner.length + 1 }
}

function checkArgs({ file = 'a.md', begin, end, docs = 'ko', commit = 'en', comments = 'ko' }) {
  return [
    'check',
    `--file=${file}`,
    `--expect-begin=${begin}`,
    `--expect-end=${end}`,
    `--expect-docs=${docs}`,
    `--expect-commit=${commit}`,
    `--expect-comments=${comments}`,
  ]
}

const pos = (line, recognized = true, coveringFence = null) => ({ line, recognized, coveringFence })

// check 성공 출력 (JSON 한 줄, exit 0). 객체 키 순서도 계약이므로 문자열 그대로 비교한다.
function ok(status, begin, end, extraMarkers, block) {
  return {
    stdout: `${JSON.stringify({ status, expected: { begin, end }, extraMarkers, block })}\n`,
    stderr: '',
    status: 0,
  }
}

const VALID = Object.freeze({ valid: true, reason: null })
const invalid = (reason) => ({ valid: false, reason })

describe('check CLI', () => {
  let fx

  beforeEach(() => {
    fx = createLangFixture()
  })

  afterEach(() => {
    fx.cleanup()
  })

  // 조립본을 쓰고 check를 실행해 단언한다. 기대 객체는 JSON 파싱으로도 전체 deepEqual한다.
  function expectCheck(file, expected, options = {}) {
    fx.write('a.md', file.content)
    const actual = expectRun(fx, checkArgs({ begin: file.begin, end: file.end, ...options }), expected)
    assert.deepEqual(JSON.parse(actual.stdout), JSON.parse(expected.stdout))
  }

  describe('마커 인식', () => {
    test('ok', () => {
      const file = assembled()
      expectCheck(file, ok('ok', pos(file.begin), pos(file.end), [], VALID))
    })

    test('기대 줄 앞 닫히지 않은 펜스 → unrecognized, close null', () => {
      const file = assembled(GOOD_INNER, { prefix: ['# Project', FENCE3] })
      const fence = { open: 2, close: null }
      expectCheck(file, ok('unrecognized', pos(file.begin, false, fence), pos(file.end, false, fence), [], null))
    })

    test('닫힌 펜스가 기대 begin 줄을 덮음 → coveringFence close 숫자', () => {
      const content = doc('# Project', FENCE3, BEGIN, FENCE3, '- docs: ko', '- commit: en', '- comments: ko', END)
      const file = { content, begin: 3, end: 8 }
      expectCheck(file, ok('unrecognized', pos(3, false, { open: 2, close: 4 }), pos(8), [], null))
    })

    test('기대 줄 밖 펜스 밖 마커 → conflict, extraMarkers 줄 순서', () => {
      const file = assembled(GOOD_INNER, { prefix: ['# Project', END], suffix: ['', BEGIN, 'tail', END] })
      const extra = [
        { line: 2, kind: 'end' },
        { line: file.end + 2, kind: 'begin' },
        { line: file.end + 4, kind: 'end' },
      ]
      expectCheck(file, ok('conflict', pos(file.begin), pos(file.end), extra, null))
    })

    test('begin·end 뒤바뀜 → unrecognized, extraMarkers 비어 있음', () => {
      const content = doc('# Project', END, '- docs: ko', '- commit: en', '- comments: ko', BEGIN)
      const file = { content, begin: 2, end: 6 }
      expectCheck(file, ok('unrecognized', pos(2, false), pos(6, false), [], null))
    })

    test('펜스 안 추가 마커는 무시 → ok', () => {
      const file = assembled(GOOD_INNER, { suffix: ['', FENCE3, BEGIN, END, FENCE3] })
      expectCheck(file, ok('ok', pos(file.begin), pos(file.end), [], VALID))
    })
  })

  describe('쓰기용 검증 사유', () => {
    const cases = [
      ['unparsable line', ['- docs: ko', 'free text', '- commit: en', '- comments: ko'], (b) => `unparsable line: ${b + 2}`],
      ['missing key', ['- docs: ko', '- comments: ko'], () => 'missing key: commit'],
      ['duplicate key', ['- docs: ko', '- commit: en', '- docs: ko', '- comments: ko'], () => 'duplicate key: docs'],
      ['non-canonical value', ['- docs: english', '- commit: en', '- comments: ko'], () => 'non-canonical value: docs=english'],
      ['value mismatch', ['- docs: en', '- commit: en', '- comments: ko'], () => 'value mismatch: docs expected ko got en'],
      ['빈 값', ['- docs:', '- commit: en', '- comments: ko'], () => 'non-canonical value: docs='],
    ]
    for (const [name, inner, reason] of cases) {
      test(name, () => {
        const file = assembled(inner)
        expectCheck(file, ok('invalid-block', pos(file.begin), pos(file.end), [], invalid(reason(file.begin))))
      })
    }
  })

  describe('복수 위반과 경계', () => {
    test('줄 위반 + 키 누락 → 첫 줄 위반', () => {
      const file = assembled(['- docs: ko', '* commit: en'])
      expectCheck(
        file,
        ok('invalid-block', pos(file.begin), pos(file.end), [], invalid(`unparsable line: ${file.begin + 2}`)),
      )
    })

    test('줄 위반이 여럿이면 위쪽 줄', () => {
      const file = assembled(['- docs: en', '- commit: english', '- comments: ko'])
      expectCheck(
        file,
        ok('invalid-block', pos(file.begin), pos(file.end), [], invalid('value mismatch: docs expected ko got en')),
      )
    })

    test('같은 줄 겹침: 미지원 값이면서 기대와 다름 → non-canonical value', () => {
      const file = assembled(['- docs: english', '- commit: en', '- comments: ko'])
      expectCheck(
        file,
        ok('invalid-block', pos(file.begin), pos(file.end), [], invalid('non-canonical value: docs=english')),
      )
    })

    test('같은 줄 겹침: 반복이면서 미지원 값 → duplicate key', () => {
      const file = assembled(['- docs: ko', '- commit: en', '- comments: ko', '- docs: KO'])
      expectCheck(file, ok('invalid-block', pos(file.begin), pos(file.end), [], invalid('duplicate key: docs')))
    })

    test('블록 안 빈 줄 → unparsable line', () => {
      const file = assembled(['- docs: ko', '   ', '- commit: en', '- comments: ko'])
      expectCheck(
        file,
        ok('invalid-block', pos(file.begin), pos(file.end), [], invalid(`unparsable line: ${file.begin + 2}`)),
      )
    })

    test('키 누락이 여럿이면 docs·commit·comments 순 첫 번째', () => {
      const file = assembled(['- code identifiers: en'])
      expectCheck(file, ok('invalid-block', pos(file.begin), pos(file.end), [], invalid('missing key: docs')))
    })

    test('펜스 속 예시 키 줄은 세지 않음 → ok', () => {
      const file = assembled(['- docs: ko', '- commit: en', '- comments: ko', FENCE3, '- docs: en', 'free', FENCE3])
      expectCheck(file, ok('ok', pos(file.begin), pos(file.end), [], VALID))
    })

    test('CRLF 조립본도 같은 판정', () => {
      const file = assembled()
      expectCheck(
        { ...file, content: file.content.replaceAll('\n', '\r\n') },
        ok('ok', pos(file.begin), pos(file.end), [], VALID),
      )
    })
  })

  describe('호출 형식 오류', () => {
    const file = assembled()
    const base = checkArgs({ begin: file.begin, end: file.end })
    const without = (prefix) => base.filter((arg) => !arg.startsWith(prefix))
    const replace = (prefix, arg) => base.map((item) => (item.startsWith(prefix) ? arg : item))
    const invalidArgs = {
      '인자 없음': ['check'],
      '플래그 누락': without('--expect-comments='),
      '플래그 중복': [...base, '--expect-docs=ko'],
      'begin 0': replace('--expect-begin=', '--expect-begin=0'),
      'begin 음수': replace('--expect-begin=', '--expect-begin=-1'),
      'begin 앞자리 0': replace('--expect-begin=', '--expect-begin=05'),
      'begin ≥ end': replace('--expect-end=', `--expect-end=${file.begin}`),
      'end > 줄 수': replace('--expect-end=', '--expect-end=13'),
      '대문자 값': replace('--expect-docs=', '--expect-docs=KO'),
      '알 수 없는 플래그': [...without('--expect-comments='), '--expect-language=ko'],
      '= 없는 플래그': replace('--expect-docs=', '--expect-docs'),
      '빈 file': replace('--file=', '--file='),
    }
    for (const [name, args] of Object.entries(invalidArgs)) {
      test(`${name} → check 사용법`, () => {
        fx.write('a.md', file.content)
        expectRun(fx, args, { stdout: '', stderr: CHECK_USAGE, status: 1 })
      })
    }

    test('줄 수 = end 는 허용 (파일 끝 LF는 줄로 세지 않음)', () => {
      const content = doc('# Project', BEGIN, '- docs: ko', '- commit: en', '- comments: ko', END)
      expectCheck({ content, begin: 2, end: 6 }, ok('ok', pos(2), pos(6), [], VALID))
    })

    test('--file이 디렉토리 → cannot read <path>: EISDIR', () => {
      fx.write('dir/x.md', 'x')
      expectRun(fx, checkArgs({ file: 'dir', begin: 1, end: 2 }), {
        stdout: '',
        stderr: 'cannot read dir: EISDIR\n',
        status: 1,
      })
    })

    test('--file 없음 → cannot read <path>: ENOENT', () => {
      expectRun(fx, checkArgs({ file: 'missing.md', begin: 1, end: 2 }), {
        stdout: '',
        stderr: 'cannot read missing.md: ENOENT\n',
        status: 1,
      })
    })
  })
})
