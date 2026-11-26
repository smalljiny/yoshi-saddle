#!/usr/bin/env node
// lang.js — 대화·문서·커밋 언어를 ko/en 중 하나로 결정한다.
// 사용법: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit
// 판정 순수 함수(값 정규화·언어 규칙 블록 판정)는 다른 서브커맨드가 재사용하도록 named export한다.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const USAGE = 'usage: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit'
const FALLBACK_LANGUAGE = 'en'

// docs·commit 블록을 찾는 파일 순서 (프로젝트 루트 기준 상대 경로, 경고 표기에도 그대로 쓴다)
const BLOCK_FILES = Object.freeze(['CLAUDE.md', 'AGENTS.md'])

// conversation 언어를 찾는 Claude Code settings 파일 순서 (local → project → user).
// label은 경고 표기다 — 사용자 설정은 홈 절대 경로 대신 리터럴 `~/.claude/settings.json`으로 쓴다.
const SETTINGS_FILES = Object.freeze([
  Object.freeze({ base: 'root', rel: '.claude/settings.local.json', label: '.claude/settings.local.json' }),
  Object.freeze({ base: 'root', rel: '.claude/settings.json', label: '.claude/settings.json' }),
  Object.freeze({ base: 'home', rel: '.claude/settings.json', label: '~/.claude/settings.json' }),
])

const BEGIN_MARKER = '<!-- harness-language:begin -->'
const END_MARKER = '<!-- harness-language:end -->'

// lang.js가 해석하는 블록 키. 나머지 키(comments 등)는 사람·모델용 규칙이라 해석·반복 판정하지 않는다.
const RESOLVED_KEYS = Object.freeze(['docs', 'commit'])

const KEY_LINE = /^-[ ]+(?<key>[a-z][a-z ]*?):[ \t]*(?<value>.*?)[ \t]*$/
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
 * 호출자는 문자열만 전달한다 (비문자열 값은 호출 전에 미설정으로 거른다).
 * @param {string} raw
 * @returns {'ko' | 'en' | null | undefined} ko·en, 미지원이면 null, 빈 값(공백뿐 포함)이면 undefined(누락)
 */
export function normalizeLanguage(raw) {
  const value = raw.trim().toLowerCase()
  if (value === '') return undefined
  if (Object.hasOwn(LANGUAGE_ALIASES, value)) return LANGUAGE_ALIASES[value]
  if (value.startsWith('ko-')) return 'ko'
  if (value.startsWith('en-')) return 'en'
  return null
}

// 파일 내용을 줄로 나누고 각 줄 끝의 \r 하나를 제거한다 (CRLF 파일도 LF와 같은 결과).
function splitLines(content) {
  return content.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line))
}

// 여는 펜스 줄이면 { char, length }, 아니면 null. 백틱 펜스의 info 문자열에는 백틱이 없어야 한다.
function openingFence(line) {
  const match = OPENING_FENCE.exec(line)
  if (!match) return null
  const { fence, info } = match.groups
  const char = fence[0]
  if (char === '`' && info.includes('`')) return null
  return { char, length: fence.length }
}

// 열린 펜스를 닫는 줄인지 판정한다: 들여쓰기 0~3칸, 같은 문자, 여는 펜스 이상 길이, 뒤에는 공백만.
function closesFence(line, open) {
  const match = /^ {0,3}(?<fence>`+|~+)[ \t]*$/.exec(line)
  if (!match) return false
  const { fence } = match.groups
  return fence[0] === open.char && fence.length >= open.length
}

// 각 줄이 코드 펜스 밖인지 나타내는 boolean 배열을 만든다. 펜스 줄 자체도 펜스 안으로 본다.
// 닫히지 않은 펜스는 파일 끝까지 이어진다.
function outsideFenceFlags(lines) {
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
function isMarker(line, marker) {
  return line.startsWith(marker) && /^[ \t]*$/.test(line.slice(marker.length))
}

// 펜스 밖 줄에서 begin·end 마커 위치를 모은다.
function findMarkers(lines, outside) {
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
    const match = KEY_LINE.exec(lines[index])
    if (match && RESOLVED_KEYS.includes(match.groups.key)) {
      entries.push([match.groups.key, match.groups.value])
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

// ── resolve CLI ─────────────────────────────────────────────────────────────

// 프로젝트 루트·사용자 홈. LANG_JS_ROOT·LANG_JS_HOME은 테스트 전용 환경 변수다
// (테스트가 임시 디렉토리를 루트·홈으로 주입할 때만 쓴다). 실제 호출에서는 설정하지 않는다.
// 빈 문자열도 미설정으로 본다 (현재 디렉토리 기준으로 읽는 일을 막는다).
function projectRoot() {
  return process.env.LANG_JS_ROOT || path.join(__dirname, '../..')
}

function userHome() {
  return process.env.LANG_JS_HOME || os.homedir()
}

// 파일을 읽는다. 없으면 missing(경고 없음), 읽기 실패면 error + 경고.
// 경고 사유는 오류 코드만 쓴다 — error.message에는 절대 경로가 들어 있어 노출하지 않는다.
function readText(absolutePath, label) {
  try {
    return { status: 'ok', content: fs.readFileSync(absolutePath, 'utf8'), warnings: [] }
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'missing', warnings: [] }
    return { status: 'error', warnings: [`cannot read ${label}: ${error.code ?? 'read failed'}`] }
  }
}

// 선택된 값(문자열)을 언어로 바꾼다. 누락이면 경고 없이 en, 미지원이면 en + 경고.
function languageFromValue(raw, label) {
  const normalized = normalizeLanguage(raw)
  if (normalized === undefined) return { language: FALLBACK_LANGUAGE, warnings: [] }
  if (normalized === null) {
    return {
      language: FALLBACK_LANGUAGE,
      warnings: [`unsupported language '${raw.trim()}' in ${label}, using ${FALLBACK_LANGUAGE}`],
    }
  }
  return { language: normalized, warnings: [] }
}

// 한 블록 파일에서 kind 값을 결정한다. 유효한 블록이 없으면 found: false.
function resolveFromBlockFile(kind, root, label) {
  const read = readText(path.join(root, label), label)
  if (read.status !== 'ok') return { found: false, warnings: read.warnings }
  const block = parseLanguageBlock(read.content)
  if (block.status === 'none') return { found: false, warnings: [] }
  if (block.status === 'malformed') return { found: false, warnings: [`malformed language block in ${label}`] }
  const raw = Object.hasOwn(block.values, kind) ? block.values[kind] : ''
  return { found: true, ...languageFromValue(raw, label) }
}

/**
 * docs·commit 언어를 결정한다. CLAUDE.md → AGENTS.md 순으로 유효한 블록이 있는 첫 파일만 본다
 * (키 단위 fallback 없음). 둘 다 없으면 en.
 * @param {'docs' | 'commit'} kind
 * @param {string} root 프로젝트 루트
 * @returns {{language: 'ko' | 'en', warnings: string[]}}
 */
function resolveDocsLike(kind, root) {
  let warnings = []
  for (const label of BLOCK_FILES) {
    const result = resolveFromBlockFile(kind, root, label)
    warnings = [...warnings, ...result.warnings]
    if (result.found) return { language: result.language, warnings }
  }
  return { language: FALLBACK_LANGUAGE, warnings }
}

// settings 파일 하나에서 language를 읽는다. 값이 비어 있지 않은 문자열이면 found: true.
// 파싱 오류 사유는 고정 문구다 — JSON.parse 메시지에는 입력 본문이 들어갈 수 있어 노출하지 않는다.
function resolveFromSettingsFile(absolutePath, label) {
  const read = readText(absolutePath, label)
  if (read.status !== 'ok') return { found: false, warnings: read.warnings }
  let settings
  try {
    settings = JSON.parse(read.content)
  } catch {
    return { found: false, warnings: [`cannot read ${label}: invalid JSON`] }
  }
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    return { found: false, warnings: [`cannot read ${label}: top-level value is not an object`] }
  }
  const value = Object.hasOwn(settings, 'language') ? settings.language : undefined
  if (typeof value !== 'string' || value.trim() === '') return { found: false, warnings: [] }
  return { found: true, ...languageFromValue(value, label) }
}

/**
 * conversation 언어를 결정한다. settings 파일을 local → project → user 순으로 보고
 * language 값이 있는 첫 파일에서 멈춘다. 셋 다 없으면 docs 결정 결과(경고 포함)를 쓴다.
 * @param {string} root 프로젝트 루트
 * @param {string} home 사용자 홈
 * @returns {{language: 'ko' | 'en', warnings: string[]}}
 */
function resolveConversation(root, home) {
  const bases = { root, home }
  let warnings = []
  for (const file of SETTINGS_FILES) {
    const result = resolveFromSettingsFile(path.join(bases[file.base], file.rel), file.label)
    warnings = [...warnings, ...result.warnings]
    if (result.found) return { language: result.language, warnings }
  }
  const docs = resolveDocsLike('docs', root)
  return { language: docs.language, warnings: [...warnings, ...docs.warnings] }
}

const RESOLVERS = Object.freeze({
  conversation: resolveConversation,
  docs: (root) => resolveDocsLike('docs', root),
  commit: (root) => resolveDocsLike('commit', root),
})

// 인자가 정확히 `resolve --kind=<허용 kind>` 형태면 kind, 아니면 null (호출 형식 오류).
function parseKind(args) {
  if (args.length !== 2 || args[0] !== 'resolve') return null
  const match = /^--kind=(?<kind>.+)$/.exec(args[1])
  if (!match || !Object.hasOwn(RESOLVERS, match.groups.kind)) return null
  return match.groups.kind
}

function main() {
  const kind = parseKind(process.argv.slice(2))
  if (kind === null) {
    process.stderr.write(`${USAGE}\n`)
    process.exitCode = 1
    return
  }
  const { language, warnings } = RESOLVERS[kind](projectRoot(), userHome())
  for (const warning of warnings) process.stderr.write(`${warning}\n`)
  process.stdout.write(`${language}\n`)
}

// 직접 실행될 때만 main()을 호출한다 (테스트의 import 시 실행 방지).
// argv[1]과 import.meta.url을 realpath로 맞춰 symlink를 거친 실행도 인식한다 (validate-path.js와 같은 가드).
function isEntryPoint() {
  if (!process.argv[1]) return false
  const self = fileURLToPath(import.meta.url)
  try {
    return fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(self)
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(self)
  }
}

if (isEntryPoint()) {
  main()
}
