// lang-recommend.js — `lang.js recommend`의 판정 로직.
// CLAUDE.md·AGENTS.md 언어 블록 또는 CLAUDE.md 프로젝트 섹션의 레거시 `## 언어 규칙` 문구에서
// docs·commit·comments 권장값과 사유를 계산한다. 출력은 하지 않고 결과 객체와 경고 목록을 돌려준다.
// 펜스·마커·줄 문법 판정은 lang-core.js의 함수만 쓴다.

import path from 'node:path'
import {
  normalizeLanguage,
  parseLanguageBlock,
  readText,
  splitLines,
  outsideFenceFlags,
  findMarkers,
  parseKeyLine,
} from './lang-core.js'

const DEFAULT_RECOMMENDATION = 'ko'
const RECOMMEND_KEYS = Object.freeze(['docs', 'commit', 'comments'])
const CLAUDE = 'CLAUDE.md'
const AGENTS = 'AGENTS.md'

const GUIDE_IMPORT = '@.harness/harness-guide.md'
const LEGACY_HEADER = '## 언어 규칙'
const LEGACY_VALUE_LINE = /^-[ ]+(?<labels>[^:]+?):[ \t]*\*\*(?<lang>[^*]+)\*\*[ \t]*$/
// 레거시 레이블에 이 문자열이 포함되면 해당 키에 값을 준다.
const LEGACY_LABEL_KEYS = Object.freeze([
  Object.freeze({ needle: '문서', key: 'docs' }),
  Object.freeze({ needle: '주석', key: 'comments' }),
  Object.freeze({ needle: '커밋', key: 'commit' }),
])

// 파일 하나를 읽어 상태(valid|none|malformed|absent|unreadable)와 내용을 돌려준다.
function inspectFile(root, label) {
  const read = readText(path.join(root, label), label)
  if (read.status === 'missing') return { status: 'absent', content: null, warnings: [] }
  if (read.status === 'error') return { status: 'unreadable', content: null, warnings: read.warnings }
  return { status: parseLanguageBlock(read.content).status, content: read.content, warnings: [] }
}

// 유효한 블록 안 펜스 밖 키 줄에서 키별 값 목록을 모은다 ({docs: [...], commit: [...], comments: [...]}).
function blockOccurrences(content) {
  const lines = splitLines(content)
  const outside = outsideFenceFlags(lines)
  const { begins, ends } = findMarkers(lines, outside)
  const found = Object.fromEntries(RECOMMEND_KEYS.map((key) => [key, []]))
  for (let index = begins[0] + 1; index < ends[0]; index += 1) {
    const parsed = outside[index] ? parseKeyLine(lines[index]) : null
    if (parsed && Object.hasOwn(found, parsed.key)) {
      found[parsed.key] = [...found[parsed.key], parsed.value]
    }
  }
  return found
}

// 원본 블록의 한 키 출현 목록으로 권장값을 정한다.
function decideFromBlock(values, source) {
  if (values.length > 1) return { value: DEFAULT_RECOMMENDATION, origin: 'default', source, notes: ['duplicate'] }
  const raw = values[0]
  const normalized = normalizeLanguage(raw)
  if (normalized === undefined) return { value: DEFAULT_RECOMMENDATION, origin: 'default', source, notes: ['missing'] }
  if (normalized === null) {
    return { value: DEFAULT_RECOMMENDATION, origin: 'default', source, notes: [`unsupported:${raw.trim()}`] }
  }
  return { value: normalized, origin: 'block', source, notes: [] }
}

// AGENTS.md의 같은 키가 한 번만 나오고 지원 값이면 그 값, 아니면 null.
function comparableValue(values) {
  if (values.length !== 1) return null
  return normalizeLanguage(values[0]) ?? null
}

// 줄 끝의 공백·탭만 제거한다 (앞쪽 들여쓰기는 남겨 정확히 일치할 때만 인정한다).
const trimTrailing = (line) => line.replace(/[ \t]+$/, '')

// 레거시 섹션의 줄 범위 [start, end)를 찾는다. 경계 줄 또는 섹션이 없으면 null.
// 경계 줄은 펜스와 무관하게 첫 가이드 import 줄, 헤더는 펜스 밖 첫 `## 언어 규칙`이다.
function legacySectionRange(lines, outside) {
  const boundary = lines.findIndex((line) => trimTrailing(line) === GUIDE_IMPORT)
  if (boundary === -1) return null
  const isHeader = (line, index) => outside[index] && trimTrailing(line) === LEGACY_HEADER
  const header = lines.slice(0, boundary).findIndex(isHeader)
  if (header === -1) return null
  let end = boundary
  for (let index = header + 1; index < boundary; index += 1) {
    if (outside[index] && lines[index].startsWith('## ')) {
      end = index
      break
    }
  }
  return { start: header + 1, end }
}

// 레거시 값 줄이면 { keys, raw, normalized }, 아니면 null.
function parseLegacyLine(line) {
  const match = LEGACY_VALUE_LINE.exec(line)
  if (!match) return null
  const normalized = normalizeLanguage(match.groups.lang)
  if (normalized === undefined) return null
  const labels = match.groups.labels.split(/[,·]/).map((label) => label.trim())
  const keys = LEGACY_LABEL_KEYS.filter(({ needle }) => labels.some((label) => label.includes(needle))).map(
    ({ key }) => key,
  )
  return { keys, raw: match.groups.lang.trim(), normalized }
}

// CLAUDE.md 내용에서 레거시 섹션 값을 키별로 모은다. 섹션이 없으면 null.
function legacyOccurrences(content) {
  const lines = splitLines(content)
  const outside = outsideFenceFlags(lines)
  const range = legacySectionRange(lines, outside)
  if (range === null) return null
  const found = Object.fromEntries(RECOMMEND_KEYS.map((key) => [key, []]))
  for (let index = range.start; index < range.end; index += 1) {
    const parsed = outside[index] ? parseLegacyLine(lines[index]) : null
    if (!parsed) continue
    for (const key of parsed.keys) {
      found[key] = [...found[key], { raw: parsed.raw, normalized: parsed.normalized }]
    }
  }
  return found
}

// 레거시 값 목록으로 권장값을 정한다 (정규화 후 값으로 판정).
function decideFromLegacy(entries) {
  const base = { source: CLAUDE }
  if (entries.length === 0) return { value: DEFAULT_RECOMMENDATION, origin: 'default', ...base, notes: ['missing'] }
  const normalizedSet = new Set(entries.map((entry) => entry.normalized))
  if (normalizedSet.size === 1 && !normalizedSet.has(null)) {
    return { value: entries[0].normalized, origin: 'legacy', ...base, notes: [] }
  }
  const rawSet = new Set(entries.map((entry) => entry.raw))
  if (normalizedSet.size === 1 && rawSet.size === 1) {
    return { value: DEFAULT_RECOMMENDATION, origin: 'default', ...base, notes: [`unsupported:${entries[0].raw}`] }
  }
  return { value: DEFAULT_RECOMMENDATION, origin: 'default', ...base, notes: ['legacy-conflict'] }
}

// 결과 키 객체를 출력 키 순서(value·origin·source·notes)로 만든다.
const ordered = ({ value, origin, source, notes }) => ({ value, origin, source, notes })

function recommendFromBlocks(claude, agents) {
  const sourceFile = claude.status === 'valid' ? claude : agents
  const sourceLabel = claude.status === 'valid' ? CLAUDE : AGENTS
  const occurrences = blockOccurrences(sourceFile.content)
  const agentsOccurrences = sourceLabel === CLAUDE && agents.status === 'valid' ? blockOccurrences(agents.content) : null
  return Object.fromEntries(
    RECOMMEND_KEYS.map((key) => {
      const decision = decideFromBlock(occurrences[key], sourceLabel)
      const other = agentsOccurrences ? comparableValue(agentsOccurrences[key]) : null
      const notes = other !== null && other !== decision.value ? [...decision.notes, `differs:${other}`] : decision.notes
      return [key, ordered({ ...decision, notes })]
    }),
  )
}

function recommendFromLegacy(claude) {
  const occurrences = claude.content === null ? null : legacyOccurrences(claude.content)
  return Object.fromEntries(
    RECOMMEND_KEYS.map((key) => {
      if (occurrences === null) {
        return [key, ordered({ value: DEFAULT_RECOMMENDATION, origin: 'default', source: null, notes: [] })]
      }
      return [key, ordered(decideFromLegacy(occurrences[key]))]
    }),
  )
}

/**
 * docs·commit·comments 권장값을 계산한다.
 * @param {string} root 프로젝트 루트
 * @returns {{result: object, warnings: string[]}} result는 docs·commit·comments·files 순서의 객체,
 *   warnings는 파일 읽기 실패 경고만 담는다.
 */
export function recommend(root) {
  const claude = inspectFile(root, CLAUDE)
  const agents = inspectFile(root, AGENTS)
  const hasBlock = claude.status === 'valid' || agents.status === 'valid'
  const keys = hasBlock ? recommendFromBlocks(claude, agents) : recommendFromLegacy(claude)
  return {
    result: {
      docs: keys.docs,
      commit: keys.commit,
      comments: keys.comments,
      files: { [CLAUDE]: claude.status, [AGENTS]: agents.status },
    },
    warnings: [...claude.warnings, ...agents.warnings],
  }
}
