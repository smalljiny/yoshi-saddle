// lang-core.js — 언어 규칙 블록의 펜스·마커·줄 문법 판정의 단일 구현.
// lang.js의 모든 서브커맨드가 이 모듈의 함수를 공유한다. 이 모듈은 출력을 하지 않으며,
// 파일 I/O는 결과 객체를 돌려주는 readText 하나뿐이다.

import fs from 'node:fs'

export const BEGIN_MARKER = '<!-- harness-language:begin -->'
export const END_MARKER = '<!-- harness-language:end -->'

// lang.js가 해석하는 블록 키. 나머지 키(comments 등)는 사람·모델용 규칙이라 해석·반복 판정하지 않는다.
export const RESOLVED_KEYS = Object.freeze(['docs', 'commit'])

// 스펙 §3.3 줄 문법 `^-[ ]+(?<key>[a-z][a-z ]*?):[ \t]*(?<value>.*?)[ \t]*$`과 같은 결과를 내되,
// 값 앞뒤 공백·탭 제거를 정규식 밖에서 해 긴 공백 런에서의 2차 백트래킹을 피한다.
// 키 문자에는 ':'가 없으므로 key는 첫 ':' 앞까지다. rest의 문자 집합은 정규식 `.`과 같다(줄 구분 문자 제외).
const KEY_LINE = /^-[ ]+(?<key>[a-z][a-z ]*):(?<rest>[^\n\r\u2028\u2029]*)$/
const OPENING_FENCE = /^ {0,3}(?<fence>`{3,}|~{3,})(?<info>.*)$/

const LANGUAGE_ALIASES = Object.freeze({
  korean: 'ko',
  '한국어': 'ko',
  ko: 'ko',
  kor: 'ko',
  english: 'en',
  '영어': 'en',
  en: 'en',
  eng: 'en',
})

/**
 * 언어 값을 정규화한다. 앞뒤 공백 제거 → 소문자화 → 대응표 조회.
 * @param {unknown} raw
 * @returns {'ko' | 'en' | null | undefined} ko·en, 미지원이면 null, 빈 값(공백뿐 포함)·비문자열이면 undefined(누락)
 */
export function normalizeLanguage(raw) {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim().toLowerCase()
  if (value === '') return undefined
  if (Object.hasOwn(LANGUAGE_ALIASES, value)) return LANGUAGE_ALIASES[value]
  if (value.startsWith('ko-')) return 'ko'
  if (value.startsWith('en-')) return 'en'
  return null
}

// 파일 내용을 줄로 나누고 각 줄 끝의 \r 하나를 제거한다 (CRLF 파일도 LF와 같은 결과).
export function splitLines(content) {
  return content.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line))
}

// 여는 펜스 줄이면 { char, length }, 아니면 null. 백틱 펜스의 info 문자열에는 백틱이 없어야 한다.
export function openingFence(line) {
  const match = OPENING_FENCE.exec(line)
  if (!match) return null
  const { fence, info } = match.groups
  const char = fence[0]
  if (char === '`' && info.includes('`')) return null
  return { char, length: fence.length }
}

// 열린 펜스를 닫는 줄인지 판정한다: 들여쓰기 0~3칸, 같은 문자, 여는 펜스 이상 길이, 뒤에는 공백만.
export function closesFence(line, open) {
  const match = /^ {0,3}(?<fence>`+|~+)[ \t]*$/.exec(line)
  if (!match) return false
  const { fence } = match.groups
  return fence[0] === open.char && fence.length >= open.length
}

// 각 줄이 코드 펜스 밖인지 나타내는 boolean 배열을 만든다. 펜스 줄 자체도 펜스 안으로 본다.
// 닫히지 않은 펜스는 파일 끝까지 이어진다.
export function outsideFenceFlags(lines) {
  const flags = []
  let open = null
  for (const line of lines) {
    if (open) {
      if (closesFence(line, open)) open = null
      flags.push(false)
      continue
    }
    open = openingFence(line)
    flags.push(open === null)
  }
  return flags
}

// 줄 전체가 마커 문자열(뒤쪽 공백·탭 허용)이고 열 0에서 시작하는지 판정한다.
export function isMarker(line, marker) {
  return line.startsWith(marker) && /^[ \t]*$/.test(line.slice(marker.length))
}

// 앞뒤의 공백·탭만 제거한다 (String.prototype.trim과 달리 다른 유니코드 공백은 남긴다).
export function trimSpacesAndTabs(text) {
  const isBlank = (char) => char === ' ' || char === '\t'
  let start = 0
  let end = text.length
  while (start < end && isBlank(text[start])) start += 1
  while (end > start && isBlank(text[end - 1])) end -= 1
  return text.slice(start, end)
}

// 키 줄이면 { key, value }, 아니면 null.
export function parseKeyLine(line) {
  const match = KEY_LINE.exec(line)
  if (!match) return null
  return { key: match.groups.key, value: trimSpacesAndTabs(match.groups.rest) }
}

// 펜스 밖 줄에서 begin·end 마커 위치(0부터 세는 인덱스)를 모은다.
export function findMarkers(lines, outside) {
  const begins = []
  const ends = []
  lines.forEach((line, index) => {
    if (!outside[index]) return
    if (isMarker(line, BEGIN_MARKER)) begins.push(index)
    else if (isMarker(line, END_MARKER)) ends.push(index)
  })
  return { begins, ends }
}

// 블록 안 펜스 밖 줄에서 해석 대상 키를 모은다. 해석 대상 키가 반복되면 null.
function collectValues(lines, outside, begin, end) {
  const entries = []
  for (let index = begin + 1; index < end; index += 1) {
    if (!outside[index]) continue
    const parsed = parseKeyLine(lines[index])
    if (parsed && RESOLVED_KEYS.includes(parsed.key)) {
      entries.push([parsed.key, parsed.value])
    }
  }
  const keys = entries.map(([key]) => key)
  if (new Set(keys).size !== keys.length) return null
  return Object.fromEntries(entries)
}

/**
 * 파일 내용에서 언어 규칙 블록을 판정한다. 파일 I/O·출력은 하지 않는다.
 * @param {string} content 파일 내용
 * @returns {{status: 'none'} | {status: 'malformed'} | {status: 'valid', values: {docs?: string, commit?: string}}}
 *   values에는 블록에 나온 해석 대상 키만 담는다. 키가 있고 값이 빈 줄이면 ''(누락 처리)다.
 */
export function parseLanguageBlock(content) {
  const lines = splitLines(content)
  const outside = outsideFenceFlags(lines)
  const { begins, ends } = findMarkers(lines, outside)
  if (begins.length === 0 && ends.length === 0) return { status: 'none' }
  if (begins.length !== 1 || ends.length !== 1 || begins[0] > ends[0]) return { status: 'malformed' }
  const values = collectValues(lines, outside, begins[0], ends[0])
  if (values === null) return { status: 'malformed' }
  return { status: 'valid', values }
}

/**
 * 파일을 읽는다. 없으면 missing(경고 없음), 읽기 실패면 error + 경고.
 * 경고 사유는 오류 코드만 쓴다 — error.message에는 절대 경로가 들어 있어 노출하지 않는다.
 * @param {string} absolutePath
 * @param {string} label 경고 표기용 이름
 * @returns {{status: 'ok', content: string, warnings: string[]} | {status: 'missing', warnings: string[]} | {status: 'error', code: string, warnings: string[]}}
 */
export function readText(absolutePath, label) {
  try {
    return { status: 'ok', content: fs.readFileSync(absolutePath, 'utf8'), warnings: [] }
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'missing', warnings: [] }
    const code = error.code ?? 'read failed'
    return { status: 'error', code, warnings: [`cannot read ${label}: ${code}`] }
  }
}
