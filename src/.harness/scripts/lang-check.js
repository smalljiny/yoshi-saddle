// lang-check.js — `lang.js check`의 인자 해석과 판정 로직.
// 최종 조립본의 기대 begin·end 마커 인식, 기대 줄 밖 마커, 쓰기용 블록 검증을 판정한다.
// 출력은 하지 않고 결과 객체를 돌려준다. 펜스·마커·줄 문법 판정은 lang-core.js의 함수만 쓴다.

import { analyzeMarkdown, parseKeyLine, isMarker, BEGIN_MARKER, END_MARKER } from './lang-core.js'

const WRITE_KEYS = Object.freeze(['docs', 'commit', 'comments'])
const CANONICAL_VALUES = Object.freeze(['ko', 'en'])
const LINE_NUMBER = /^[1-9][0-9]*$/
const FLAG = /^--(?<name>[a-z-]+)=(?<value>.*)$/s
const FLAG_NAMES = Object.freeze([
  'file',
  'expect-begin',
  'expect-end',
  'expect-docs',
  'expect-commit',
  'expect-comments',
])

/**
 * check 인자(서브커맨드 이름 제외)를 해석한다. 형식 오류면 null.
 * 여섯 플래그가 각각 정확히 한 번 `--flag=value`로 나와야 하고 그 밖의 인자는 허용하지 않는다.
 * @param {string[]} args
 * @returns {{file: string, begin: number, end: number, expect: {docs: string, commit: string, comments: string}} | null}
 */
export function parseCheckArgs(args) {
  if (args.length !== FLAG_NAMES.length) return null
  const values = {}
  for (const arg of args) {
    const match = FLAG.exec(arg)
    if (!match || !FLAG_NAMES.includes(match.groups.name) || Object.hasOwn(values, match.groups.name)) return null
    values[match.groups.name] = match.groups.value
  }
  const lineValues = [values['expect-begin'], values['expect-end']]
  const expectValues = WRITE_KEYS.map((key) => values[`expect-${key}`])
  if (values.file === '' || !lineValues.every((value) => LINE_NUMBER.test(value))) return null
  if (!expectValues.every((value) => CANONICAL_VALUES.includes(value))) return null
  return {
    file: values.file,
    begin: Number(values['expect-begin']),
    end: Number(values['expect-end']),
    expect: { docs: expectValues[0], commit: expectValues[1], comments: expectValues[2] },
  }
}

/**
 * 파일 줄 수를 센다. 내용이 줄바꿈으로 끝나 생긴 마지막 빈 요소는 세지 않는다 ("" = 0줄).
 * @param {string[]} lines splitLines 결과
 */
export function countLines(lines) {
  return lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

// 기대 줄 하나의 인식 결과 {line, recognized, coveringFence}.
function expectedPosition(analysis, line, marker) {
  const index = line - 1
  const recognized = Boolean(analysis.outside[index]) && index < analysis.lines.length && isMarker(analysis.lines[index], marker)
  const fence = analysis.fences.find((range) => range.open <= line && (range.close === null || line <= range.close))
  return { line, recognized, coveringFence: fence ? { open: fence.open, close: fence.close } : null }
}

// 블록 한 줄을 검사한다. {reason, key}: reason은 위반 사유(없으면 null), key는 이 줄이 준 쓰기 대상 키(없으면 null).
// seen은 앞 줄까지 나온 쓰기 대상 키 목록이다.
function inspectLine(line, lineNumber, seen, expect) {
  const parsed = parseKeyLine(line)
  if (parsed === null) return { reason: `unparsable line: ${lineNumber}`, key: null }
  const { key, value } = parsed
  if (!WRITE_KEYS.includes(key)) return { reason: null, key: null }
  if (seen.includes(key)) return { reason: `duplicate key: ${key}`, key }
  if (!CANONICAL_VALUES.includes(value)) return { reason: `non-canonical value: ${key}=${value}`, key }
  if (value !== expect[key]) return { reason: `value mismatch: ${key} expected ${expect[key]} got ${value}`, key }
  return { reason: null, key }
}

// 쓰기용 검증: 블록 안 펜스 밖 줄을 위에서부터 검사해 첫 위반을, 없으면 첫 누락 키를 사유로 낸다.
function validateBlock(analysis, begin, end, expect) {
  const seen = []
  for (let index = begin; index < end - 1; index += 1) {
    if (!analysis.outside[index]) continue
    const { reason, key } = inspectLine(analysis.lines[index], index + 1, seen, expect)
    if (reason !== null) return { valid: false, reason }
    if (key !== null) seen.push(key)
  }
  const missing = WRITE_KEYS.find((key) => !seen.includes(key))
  return missing ? { valid: false, reason: `missing key: ${missing}` } : { valid: true, reason: null }
}

/**
 * 조립본 내용을 판정한다. 판정 순서: unrecognized → conflict → invalid-block → ok.
 * begin·end는 linesInRange를 통과한 값이어야 한다 (범위 밖 줄은 인식되지 않은 것으로 본다).
 * @param {string} content 조립본 내용
 * @param {{begin: number, end: number, expect: {docs: string, commit: string, comments: string}}} options
 * @returns {{status: string, expected: object, extraMarkers: {line: number, kind: string}[], block: object | null}}
 */
export function checkAssembly(content, { begin, end, expect }) {
  const analysis = analyzeMarkdown(content)
  const expected = {
    begin: expectedPosition(analysis, begin, BEGIN_MARKER),
    end: expectedPosition(analysis, end, END_MARKER),
  }
  // 기대 줄 위의 마커는 종류와 무관하게 extra로 세지 않는다.
  const extraMarkers = analysis.markers
    .filter((marker) => marker.line !== begin && marker.line !== end)
    .map(({ line, kind }) => ({ line, kind }))
  const result = (status, block) => ({ status, expected, extraMarkers, block })
  if (!expected.begin.recognized || !expected.end.recognized) return result('unrecognized', null)
  if (extraMarkers.length > 0) return result('conflict', null)
  const block = validateBlock(analysis, begin, end, expect)
  return result(block.valid ? 'ok' : 'invalid-block', block)
}

/**
 * 인자 범위(begin < end ≤ 파일 줄 수)를 검사한다.
 * @param {string} content
 * @param {number} begin
 * @param {number} end
 */
export function linesInRange(content, begin, end) {
  return begin < end && end <= countLines(analyzeMarkdown(content).lines)
}
