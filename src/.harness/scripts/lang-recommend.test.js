// lang-recommend.test.js — lang.js recommend 서브커맨드 테스트
import { test, describe, beforeEach, afterEach } from 'node:test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createLangFixture, expectRun, block, doc, FENCE3 } from './lang-test-fixture.js'

const RECOMMEND_USAGE = 'usage: node .harness/scripts/lang.js recommend\n'
const GUIDE = '@.harness/harness-guide.md'

// 키 하나의 권장 결과
const key = (value, origin, source, notes = []) => ({ value, origin, source, notes })
const KO_DEFAULT_NULL = key('ko', 'default', null)

// recommend 성공 출력 (JSON 한 줄, exit 0)
const ok = ({ docs, commit, comments, files }, stderr = '') => ({
  stdout: `${JSON.stringify({ docs, commit, comments, files })}\n`,
  stderr,
  status: 0,
})

const files = (claude, agents) => ({ 'CLAUDE.md': claude, 'AGENTS.md': agents })

// CLAUDE.md 프로젝트 섹션에 `## 언어 규칙`을 두고 가이드 import 줄로 끝나는 문서
function legacy(...lines) {
  return doc('# Project', '', '## 언어 규칙', '', ...lines, '', GUIDE, '@.harness/rules/coding-style.md')
}

describe('recommend CLI', () => {
  let fx

  beforeEach(() => {
    fx = createLangFixture()
  })

  afterEach(() => {
    fx.cleanup()
  })

  const run = (expected) => expectRun(fx, ['recommend'], expected)

  describe('키별 결정표', () => {
    test('원본 블록의 지원 값 → block', () => {
      fx.write('CLAUDE.md', block('- docs: en', '- commit: Korean', '- comments: en'))
      run(
        ok({
          docs: key('en', 'block', 'CLAUDE.md'),
          commit: key('ko', 'block', 'CLAUDE.md'),
          comments: key('en', 'block', 'CLAUDE.md'),
          files: files('valid', 'absent'),
        }),
      )
    })

    test('원본 블록의 키 누락·빈 값 → missing', () => {
      fx.write('CLAUDE.md', block('- docs:', '- comments: en'))
      run(
        ok({
          docs: key('ko', 'default', 'CLAUDE.md', ['missing']),
          commit: key('ko', 'default', 'CLAUDE.md', ['missing']),
          comments: key('en', 'block', 'CLAUDE.md'),
          files: files('valid', 'absent'),
        }),
      )
    })

    test('원본 블록의 미지원 값 → unsupported:<원문>', () => {
      fx.write('CLAUDE.md', block('- docs: French ', '- commit: en', '- comments: en'))
      run(
        ok({
          docs: key('ko', 'default', 'CLAUDE.md', ['unsupported:French']),
          commit: key('en', 'block', 'CLAUDE.md'),
          comments: key('en', 'block', 'CLAUDE.md'),
          files: files('valid', 'absent'),
        }),
      )
    })

    test('원본 블록의 comments 반복 → duplicate', () => {
      fx.write('CLAUDE.md', block('- docs: en', '- commit: en', '- comments: en', '- comments: en'))
      run(
        ok({
          docs: key('en', 'block', 'CLAUDE.md'),
          commit: key('en', 'block', 'CLAUDE.md'),
          comments: key('ko', 'default', 'CLAUDE.md', ['duplicate']),
          files: files('valid', 'absent'),
        }),
      )
    })

    test('레거시 줄이 일관된 지원 값 → legacy', () => {
      fx.write('CLAUDE.md', legacy('- 문서, 주석, 커밋 메시지: **영어**'))
      const en = key('en', 'legacy', 'CLAUDE.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('none', 'absent') }))
    })

    test('레거시 줄이 같은 미지원 원문 → unsupported:<원문>', () => {
      fx.write('CLAUDE.md', legacy('- 문서: **French**', '- 문서·주석·커밋: **French**'))
      const fr = key('ko', 'default', 'CLAUDE.md', ['unsupported:French'])
      run(ok({ docs: fr, commit: fr, comments: fr, files: files('none', 'absent') }))
    })

    test('레거시 줄끼리 값이 다름 → legacy-conflict', () => {
      fx.write('CLAUDE.md', legacy('- 문서: **영어**', '- 문서, 커밋: **한국어**', '- 주석: **영어**'))
      run(
        ok({
          docs: key('ko', 'default', 'CLAUDE.md', ['legacy-conflict']),
          commit: key('ko', 'legacy', 'CLAUDE.md'),
          comments: key('en', 'legacy', 'CLAUDE.md'),
          files: files('none', 'absent'),
        }),
      )
    })

    test('레거시 섹션에 이 키를 주는 줄 없음 → missing', () => {
      fx.write('CLAUDE.md', legacy('- 문서: **영어**'))
      run(
        ok({
          docs: key('en', 'legacy', 'CLAUDE.md'),
          commit: key('ko', 'default', 'CLAUDE.md', ['missing']),
          comments: key('ko', 'default', 'CLAUDE.md', ['missing']),
          files: files('none', 'absent'),
        }),
      )
    })

    test('블록도 레거시 섹션도 없음 → default·null', () => {
      fx.write('CLAUDE.md', doc('# Project', GUIDE))
      fx.write('AGENTS.md', doc('# Project'))
      run(ok({ docs: KO_DEFAULT_NULL, commit: KO_DEFAULT_NULL, comments: KO_DEFAULT_NULL, files: files('none', 'none') }))
    })

    test('두 파일 없음 → default·null, files absent', () => {
      run(
        ok({ docs: KO_DEFAULT_NULL, commit: KO_DEFAULT_NULL, comments: KO_DEFAULT_NULL, files: files('absent', 'absent') }),
      )
    })
  })

  describe('원본 블록 선택과 differs', () => {
    test('CLAUDE.md 블록 없음 → AGENTS.md가 원본', () => {
      fx.write('CLAUDE.md', doc('# Project', GUIDE))
      fx.write('AGENTS.md', block('- docs: en', '- commit: en', '- comments: ko'))
      run(
        ok({
          docs: key('en', 'block', 'AGENTS.md'),
          commit: key('en', 'block', 'AGENTS.md'),
          comments: key('ko', 'block', 'AGENTS.md'),
          files: files('none', 'valid'),
        }),
      )
    })

    test('AGENTS.md 값이 권장값과 다르면 differs:<값>', () => {
      fx.write('CLAUDE.md', block('- docs: en', '- commit: ko', '- comments: ko'))
      fx.write('AGENTS.md', block('- docs: ko', '- commit: ko', '- comments: ko'))
      run(
        ok({
          docs: key('en', 'block', 'CLAUDE.md', ['differs:ko']),
          commit: key('ko', 'block', 'CLAUDE.md'),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'valid'),
        }),
      )
    })

    test('AGENTS.md 값이 같은 값으로 정규화되면 differs 없음', () => {
      fx.write('CLAUDE.md', block('- docs: en', '- commit: ko', '- comments: ko'))
      fx.write('AGENTS.md', block('- docs: English', '- commit: 한국어', '- comments: ko'))
      run(
        ok({
          docs: key('en', 'block', 'CLAUDE.md'),
          commit: key('ko', 'block', 'CLAUDE.md'),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'valid'),
        }),
      )
    })

    test('AGENTS.md comments 반복·미지원 값이면 differs 없음', () => {
      fx.write('CLAUDE.md', block('- docs: ko', '- commit: ko', '- comments: ko'))
      fx.write('AGENTS.md', block('- docs: french', '- commit: ko', '- comments: en', '- comments: en'))
      run(
        ok({
          docs: key('ko', 'block', 'CLAUDE.md'),
          commit: key('ko', 'block', 'CLAUDE.md'),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'valid'),
        }),
      )
    })

    test('AGENTS.md malformed이면 differs 없음', () => {
      fx.write('CLAUDE.md', block('- docs: ko', '- commit: ko', '- comments: ko'))
      fx.write('AGENTS.md', block('- docs: en', '- docs: en'))
      run(
        ok({
          docs: key('ko', 'block', 'CLAUDE.md'),
          commit: key('ko', 'block', 'CLAUDE.md'),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'malformed'),
        }),
      )
    })

    test('원본이 AGENTS.md이면 differs 없음', () => {
      fx.write('AGENTS.md', block('- docs: en', '- commit: en', '- comments: en'))
      const en = key('en', 'block', 'AGENTS.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('absent', 'valid') }))
    })

    test('키 누락과 differs가 함께 → ["missing","differs:en"]', () => {
      fx.write('CLAUDE.md', block('- docs: ko', '- comments: ko'))
      fx.write('AGENTS.md', block('- docs: ko', '- commit: en', '- comments: ko'))
      run(
        ok({
          docs: key('ko', 'block', 'CLAUDE.md'),
          commit: key('ko', 'default', 'CLAUDE.md', ['missing', 'differs:en']),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'valid'),
        }),
      )
    })

    test('CLAUDE.md malformed + 유효 AGENTS.md → 원본 AGENTS.md, stderr 없음', () => {
      fx.write('CLAUDE.md', block('- docs: en', '- docs: ko'))
      fx.write('AGENTS.md', block('- docs: en', '- commit: ko', '- comments: en'))
      run(
        ok({
          docs: key('en', 'block', 'AGENTS.md'),
          commit: key('ko', 'block', 'AGENTS.md'),
          comments: key('en', 'block', 'AGENTS.md'),
          files: files('malformed', 'valid'),
        }),
      )
    })

    test('CLAUDE.md malformed + AGENTS.md 없음 → 블록 없음으로 보고 CLAUDE.md 레거시 추출', () => {
      fx.write(
        'CLAUDE.md',
        doc('# Project', '## 언어 규칙', '- 문서, 주석, 커밋: **영어**', '', GUIDE, '', '<!-- harness-language:begin -->'),
      )
      const en = key('en', 'legacy', 'CLAUDE.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('malformed', 'absent') }))
    })

    test('원본 블록 안 펜스 속 키 줄은 세지 않음', () => {
      fx.write('CLAUDE.md', block('- docs: en', FENCE3, '- comments: en', FENCE3, '- commit: en', '- comments: ko'))
      run(
        ok({
          docs: key('en', 'block', 'CLAUDE.md'),
          commit: key('en', 'block', 'CLAUDE.md'),
          comments: key('ko', 'block', 'CLAUDE.md'),
          files: files('valid', 'absent'),
        }),
      )
    })
  })

  describe('읽기 실패', () => {
    test('CLAUDE.md가 디렉토리 → unreadable + stderr, exit 0', () => {
      mkdirSync(join(fx.root, 'CLAUDE.md'))
      fx.write('AGENTS.md', block('- docs: en', '- commit: en', '- comments: en'))
      const en = key('en', 'block', 'AGENTS.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('unreadable', 'valid') }, 'cannot read CLAUDE.md: EISDIR\n'))
    })
  })

  describe('레거시 정규화', () => {
    test('레이블 목록 쉼표 구분 → 셋 다 en', () => {
      fx.write('CLAUDE.md', legacy('- 문서, 주석, 커밋 메시지: **영어**'))
      const en = key('en', 'legacy', 'CLAUDE.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('none', 'absent') }))
    })

    test('가운뎃점 구분 + 키별 다른 값', () => {
      fx.write('CLAUDE.md', legacy('- 문서·주석: **영어**', '- 커밋 메시지: **한국어**'))
      run(
        ok({
          docs: key('en', 'legacy', 'CLAUDE.md'),
          commit: key('ko', 'legacy', 'CLAUDE.md'),
          comments: key('en', 'legacy', 'CLAUDE.md'),
          files: files('none', 'absent'),
        }),
      )
    })

    test('`영어`와 `en` 혼용은 일관된 값', () => {
      fx.write('CLAUDE.md', legacy('- 문서: **영어**', '- 문서, 주석, 커밋: **en**'))
      const en = key('en', 'legacy', 'CLAUDE.md')
      run(ok({ docs: en, commit: en, comments: en, files: files('none', 'absent') }))
    })

    test('지원·미지원 혼합 → legacy-conflict', () => {
      fx.write('CLAUDE.md', legacy('- 문서, 주석, 커밋: **영어**', '- 문서, 주석, 커밋: **French**'))
      const conflict = key('ko', 'default', 'CLAUDE.md', ['legacy-conflict'])
      run(ok({ docs: conflict, commit: conflict, comments: conflict, files: files('none', 'absent') }))
    })

    test('서로 다른 미지원 원문 → legacy-conflict', () => {
      fx.write('CLAUDE.md', legacy('- 문서, 주석, 커밋: **French**', '- 문서, 주석, 커밋: **french**'))
      const conflict = key('ko', 'default', 'CLAUDE.md', ['legacy-conflict'])
      run(ok({ docs: conflict, commit: conflict, comments: conflict, files: files('none', 'absent') }))
    })

    test('같은 미지원 원문 → unsupported:<원문>', () => {
      fx.write('CLAUDE.md', legacy('- 문서, 주석, 커밋: **Klingon**', '- 문서: **Klingon** '))
      const kl = key('ko', 'default', 'CLAUDE.md', ['unsupported:Klingon'])
      run(ok({ docs: kl, commit: kl, comments: kl, files: files('none', 'absent') }))
    })
  })

  describe('레거시 경계', () => {
    const allNull = ok({
      docs: KO_DEFAULT_NULL,
      commit: KO_DEFAULT_NULL,
      comments: KO_DEFAULT_NULL,
      files: files('none', 'absent'),
    })

    test('사용자 영역(가이드 import 뒤)의 언어 규칙은 무시', () => {
      fx.write('CLAUDE.md', doc('# Project', GUIDE, '', '## 언어 규칙', '', '- 문서: **영어**'))
      run(allNull)
    })

    test('가이드 import 줄이 없으면 레거시 추출을 건너뜀', () => {
      fx.write('CLAUDE.md', doc('# Project', '', '## 언어 규칙', '', '- 문서: **영어**'))
      run(allNull)
    })

    test('펜스 안 import 예시가 실제 import 앞에 있으면 그 줄이 경계', () => {
      fx.write(
        'CLAUDE.md',
        doc('# Project', FENCE3, GUIDE, FENCE3, '', '## 언어 규칙', '', '- 문서: **영어**', '', GUIDE),
      )
      run(allNull)
    })

    test('펜스 안 `## 언어 규칙` 헤더는 섹션으로 보지 않음', () => {
      fx.write('CLAUDE.md', doc('# Project', FENCE3, '## 언어 규칙', '- 문서: **영어**', FENCE3, '', GUIDE))
      run(allNull)
    })

    test('섹션은 다음 펜스 밖 `## ` 헤더에서 끝남', () => {
      fx.write('CLAUDE.md', doc('# Project', '## 언어 규칙', '- 문서: **영어**', '## 기타', '- 주석: **영어**', GUIDE))
      run(
        ok({
          docs: key('en', 'legacy', 'CLAUDE.md'),
          commit: key('ko', 'default', 'CLAUDE.md', ['missing']),
          comments: key('ko', 'default', 'CLAUDE.md', ['missing']),
          files: files('none', 'absent'),
        }),
      )
    })

    test('언어 값이 공백뿐인 줄은 값 줄이 아님', () => {
      fx.write('CLAUDE.md', legacy('- 문서: **   **', '- 주석: **영어**'))
      run(
        ok({
          docs: key('ko', 'default', 'CLAUDE.md', ['missing']),
          commit: key('ko', 'default', 'CLAUDE.md', ['missing']),
          comments: key('en', 'legacy', 'CLAUDE.md'),
          files: files('none', 'absent'),
        }),
      )
    })
  })

  describe('호출 형식 오류', () => {
    for (const args of [['recommend', '--x'], ['recommend', 'extra']]) {
      test(`${JSON.stringify(args)} → recommend 사용법`, () => {
        expectRun(fx, args, { stdout: '', stderr: RECOMMEND_USAGE, status: 1 })
      })
    }
  })
})
