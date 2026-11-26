// lang.test.js — 언어 값 정규화·언어 규칙 블록 판정 테스트
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLanguage, parseLanguageBlock } from './lang.js'

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
