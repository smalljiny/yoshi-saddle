#!/usr/bin/env node

// i18n-check.js — 메시지 카탈로그와 참조 토큰 정적 검사기
// 사용법: node .harness/scripts/i18n-check.js [--root=<dir>]
// 위반 없음: stdout 요약 + exit 0
// 위반 있음: stderr에 `<file>:<line>: <kind>: <detail>` 한 줄씩 + exit 1
// 검사: 카탈로그 형식·쌍, 참조 토큰 해석·미사용 ID, 잔존 한글(residual)과 허용 목록(.harness/i18n/residual-allow.json)
// 실행 오류(잘못된 인자·루트 없음·예기치 않은 예외): stderr 원인 + exit 2
//
// 코드 구간 인식은 Markdown의 부분 집합이다: 줄 단위 인라인 코드(여러 줄에 걸친 코드 구간 미지원),
// 줄 시작 펜스(``` · ~~~, 들여쓰기 허용, 인용 블록 안 펜스 미지원), 백슬래시 이스케이프 미지원.
// residual 단위는 줄 단위다: 여러 줄 큰따옴표는 짝이 맞지 않는 줄로 보고 줄 전체를 단위로 삼으며,
// 펜스 여는 줄의 info 문자열은 검사하지 않는다. 단위 문자열은 원문 그대로다(앞뒤 공백 포함).
// 파서 상태(state·section)와 위반 누적 배열은 함수 안에서만 쓰는 지역 가변 상태다.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LANGS = ['en', 'ko']
const ID_RE = /^[A-Z][A-Z0-9_]*$/
const TOKEN_RE =
  /^(msg:(common:)?[A-Z][A-Z0-9_]*|ask:(common:)?[A-Z][A-Z0-9_]*(\|[A-Z][A-Z0-9_]*){2,}|ask:(common:)?[A-Z][A-Z0-9_]*\|\*)$/
const PLACEHOLDER_RE = /\{[a-z][a-z0-9_]*\}/g
const HEADING_RE = /^##[ \t]+(.*?)[ \t]*$/
const FENCE_RE = /^[ \t]*(`{3,}|~{3,})/
const HEADER_SUFFIX = '_HEADER'
const HEADER_MAX = 12
const LANG_MARK = '<lang>'
const COMMON_KEY = 'common'
const COMMON_TEMPLATE = `.harness/i18n/${LANG_MARK}/common.md`
const I18N_DIR = '.harness/i18n'
const SKILL_ROOTS = ['.claude/skills', '.codex/skills']
const EXCLUDED_SKILL = (name) => name.startsWith('stack-') || name === 'learned'
const FILE_COMPONENT_ROOTS = [
  { dir: '.claude/agents', kind: 'agents' },
  { dir: '.claude/commands', kind: 'commands' },
]
const KIND_ORDER = [
  'orphan-file',
  'missing-catalog',
  'id-mismatch',
  'format',
  'placeholder-mismatch',
  'malformed-ref',
  'unresolved-ref',
  'unused-id',
  'residual',
  'stale-allow',
]
const HANGUL_RE = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/
const ALLOW_LIST = `${I18N_DIR}/residual-allow.json`
const ALLOW_FIELDS = ['file', 'text', 'reason']

// ---------------------------------------------------------------------------
// 파일 시스템 유틸

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function isDir(abs) {
  try {
    return fs.statSync(abs).isDirectory()
  } catch {
    return false
  }
}

function isFile(abs) {
  try {
    return fs.statSync(abs).isFile()
  } catch {
    return false
  }
}

// abs의 실제 경로(symlink 해석 후)가 root의 실제 경로 안에 있는지 확인한다.
// 검사 대상 트리 밖 파일을 읽어 진단에 내용이 섞이는 것을 막는다.
function isInsideRoot(root, abs) {
  try {
    const realRoot = fs.realpathSync(root)
    const real = fs.realpathSync(abs)
    return real === realRoot || real.startsWith(realRoot + path.sep)
  } catch {
    return false
  }
}

function isDirIn(root, abs) {
  return isDir(abs) && isInsideRoot(root, abs)
}

function isFileIn(root, abs) {
  return isFile(abs) && isInsideRoot(root, abs)
}

// relDir 아래 모든 *.md 파일을 루트 기준 '/' 상대 경로로 정렬해 돌려준다.
function walkMd(root, relDir) {
  const abs = path.join(root, relDir)
  if (!isDirIn(root, abs)) return []
  const out = []
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`
    if (entry.isDirectory()) out.push(...walkMd(root, rel))
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(rel)
  }
  return out.sort()
}

function listDirs(root, relDir) {
  const abs = path.join(root, relDir)
  if (!isDirIn(root, abs)) return []
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

function catalogPath(template, lang) {
  return template.replace(LANG_MARK, lang)
}

// ---------------------------------------------------------------------------
// 컴포넌트·카탈로그 열거

function skillCatalogTemplate(skillDir) {
  return `${skillDir}/templates/messages.${LANG_MARK}.md`
}

function discoverSkillComponents(root) {
  const components = []
  for (const base of SKILL_ROOTS) {
    for (const name of listDirs(root, base)) {
      if (base === '.claude/skills' && EXCLUDED_SKILL(name)) continue
      const dir = `${base}/${name}`
      const template = skillCatalogTemplate(dir)
      const catalogs = new Set(LANGS.map((l) => catalogPath(template, l)))
      const bodyFiles = walkMd(root, dir).filter((f) => !catalogs.has(f))
      components.push({ key: dir, bodyFiles, template })
    }
  }
  return components
}

function discoverFileComponents(root) {
  const components = []
  for (const { dir, kind } of FILE_COMPONENT_ROOTS) {
    for (const file of walkMd(root, dir)) {
      const rel = file.slice(dir.length + 1)
      const template = `${I18N_DIR}/${LANG_MARK}/${kind}/${rel}`
      components.push({ key: file, bodyFiles: [file], template })
    }
  }
  return components
}

function discoverComponents(root) {
  return [...discoverSkillComponents(root), ...discoverFileComponents(root)]
}

// 존재하는 모든 카탈로그 파일을 언어 표지 템플릿으로 묶는다.
function discoverCatalogTemplates(root) {
  const templates = new Set()
  for (const base of SKILL_ROOTS) {
    for (const name of listDirs(root, base)) {
      const template = skillCatalogTemplate(`${base}/${name}`)
      if (LANGS.some((l) => isFileIn(root, path.join(root, catalogPath(template, l))))) templates.add(template)
    }
  }
  for (const lang of LANGS) {
    const langDir = `${I18N_DIR}/${lang}`
    for (const file of walkMd(root, langDir)) {
      templates.add(`${I18N_DIR}/${LANG_MARK}/${file.slice(langDir.length + 1)}`)
    }
  }
  return [...templates].sort()
}

// ---------------------------------------------------------------------------
// 카탈로그 파서

// 백틱 펜스의 info 문자열에는 백틱이 올 수 없다(CommonMark) — "```x```" 한 줄은 인라인 코드다.
function fenceOpen(line) {
  const m = line.match(FENCE_RE)
  if (!m) return null
  if (m[1][0] === '`' && line.slice(m[0].length).includes('`')) return null
  return { char: m[1][0], len: m[1].length }
}

function splitLines(text) {
  return text.replace(/^﻿/, '').split(/\r?\n/)
}

function isFenceClose(line, fence) {
  const t = line.trim()
  return t.length >= fence.len && t === fence.char.repeat(t.length)
}

function startSection(rawId, line, state, report) {
  if (!ID_RE.test(rawId)) {
    report(line, 'format', `invalid message ID "${rawId}" (expected [A-Z][A-Z0-9_]*)`)
    return { id: null, line, blocks: 0, value: [] }
  }
  if (state.entries.has(rawId)) {
    report(line, 'format', `duplicate message ID ${rawId}`)
    return { id: null, line, blocks: 0, value: [] }
  }
  return { id: rawId, line, blocks: 0, value: [] }
}

function closeSection(section, state, report) {
  if (!section || section.id === null) return
  if (section.blocks !== 1) {
    report(section.line, 'format', `section ${section.id} must contain exactly one code block (found ${section.blocks})`)
  }
  const value = section.value.join('\n')
  state.entries.set(section.id, { line: section.line, value })
  if (section.id.endsWith(HEADER_SUFFIX) && [...value].length > HEADER_MAX) {
    report(section.line, 'format', `${section.id} is ${[...value].length} characters (max ${HEADER_MAX})`)
  }
}

function parseCatalogLine(raw, n, state, report) {
  if (state.fence) {
    if (isFenceClose(raw, state.fence)) state.fence = null
    else if (state.section?.blocks === 1) state.section.value.push(raw)
    return
  }
  const fence = fenceOpen(raw)
  if (fence) {
    state.fence = { ...fence, line: n }
    if (state.section) state.section.blocks += 1
    else report(n, 'format', 'content outside a ## <ID> section')
    return
  }
  const heading = raw.match(HEADING_RE)
  if (heading) {
    closeSection(state.section, state, report)
    state.section = startSection(heading[1], n, state, report)
    return
  }
  if (raw.trim() === '') return
  const where = state.section ? 'outside the code block of a section' : 'outside a ## <ID> section'
  report(n, 'format', `content ${where}`)
}

// 카탈로그 텍스트를 { entries: Map<ID, {line, value}> }로 읽고 형식 위반을 report로 알린다.
function parseCatalog(text, report) {
  const state = { entries: new Map(), section: null, fence: null }
  splitLines(text).forEach((raw, i) => parseCatalogLine(raw, i + 1, state, report))
  if (state.fence) report(state.fence.line, 'format', 'unclosed code block')
  closeSection(state.section, state, report)
  return { entries: state.entries }
}

function loadCatalogs(root, templates, violations) {
  const catalogs = new Map()
  for (const template of templates) {
    const pair = {}
    for (const lang of LANGS) {
      const file = catalogPath(template, lang)
      const abs = path.join(root, file)
      if (!isFileIn(root, abs)) {
        pair[lang] = null
        continue
      }
      const report = (line, kind, detail) => violations.push({ file, line, kind, detail })
      pair[lang] = { file, ...parseCatalog(fs.readFileSync(abs, 'utf8'), report) }
    }
    catalogs.set(template, pair)
  }
  return catalogs
}

// ---------------------------------------------------------------------------
// 카탈로그 쌍 검사: orphan-file, id-mismatch, placeholder-mismatch

function placeholders(value) {
  return [...new Set(value.match(PLACEHOLDER_RE) ?? [])].sort()
}

function checkIdSets(from, to, violations) {
  for (const [id, { line }] of from.entries) {
    if (!to.entries.has(id)) {
      violations.push({ file: from.file, line, kind: 'id-mismatch', detail: `ID ${id} is not in ${to.file}` })
    }
  }
}

function checkPlaceholders(en, ko, violations) {
  for (const [id, koEntry] of ko.entries) {
    const enEntry = en.entries.get(id)
    if (!enEntry) continue
    const a = placeholders(koEntry.value).join(',')
    const b = placeholders(enEntry.value).join(',')
    if (a !== b) {
      const detail = `ID ${id} placeholders [${a}] differ from ${en.file} [${b}]`
      violations.push({ file: ko.file, line: koEntry.line, kind: 'placeholder-mismatch', detail })
    }
  }
}

function checkCatalogPairs(catalogs, violations) {
  for (const [template, { en, ko }] of catalogs) {
    if (!en || !ko) {
      const present = en ?? ko
      const missing = catalogPath(template, en ? 'ko' : 'en')
      violations.push({ file: present.file, line: 0, kind: 'orphan-file', detail: `missing counterpart ${missing}` })
      continue
    }
    checkIdSets(ko, en, violations)
    checkIdSets(en, ko, violations)
    checkPlaceholders(en, ko, violations)
  }
}

// ---------------------------------------------------------------------------
// 본문 참조 토큰 인식

function findBacktickRun(line, from, len) {
  let i = from
  while (i < line.length) {
    if (line[i] !== '`') {
      i += 1
      continue
    }
    let j = i
    while (j < line.length && line[j] === '`') j += 1
    if (j - i === len) return i
    i = j
  }
  return -1
}

// 인라인 코드 구간을 같은 길이의 공백으로 가린 줄(토큰 인식 범위)과 각 구간의 내용을 돌려준다.
function splitInlineCode(line) {
  let masked = ''
  const spans = []
  let i = 0
  while (i < line.length) {
    if (line[i] !== '`') {
      masked += line[i]
      i += 1
      continue
    }
    let j = i
    while (j < line.length && line[j] === '`') j += 1
    const close = findBacktickRun(line, j, j - i)
    if (close < 0) {
      masked += line.slice(i, j)
      i = j
      continue
    }
    spans.push(line.slice(j, close))
    const end = close + (j - i)
    masked += ' '.repeat(end - i)
    i = end
  }
  return { masked, spans }
}

// 큰따옴표("…", “…”) 구간 내용. 위치는 인라인 코드를 가린 줄에서 찾고, 내용은 원문 줄에서 잘라 낸다
// (가린 줄과 원문 줄은 길이가 같다 — 따옴표 안 인라인 코드도 원문 그대로 단위에 들어간다).
function quotedSpans(raw, masked) {
  return [...masked.matchAll(/"[^"]*"|“[^”]*”/g)].map((m) => raw.slice(m.index + 1, m.index + m[0].length - 1))
}

// residual 검사 단위: 한글이 든 인라인 코드·큰따옴표 구간 내용.
// 짝이 맞지 않는 따옴표가 있으면(인치 표기·여러 줄 인용 등) 구간을 믿을 수 없으므로,
// 가린 줄에 한글이 있을 때 줄 전체(앞뒤 공백 제거)를 단위로 삼아 누락을 막는다.
function lineUnits(raw, masked, spans) {
  const unbalanced = (masked.match(/"/g) ?? []).length % 2 === 1 || (masked.match(/“/g) ?? []).length !== (masked.match(/”/g) ?? []).length
  const textUnits = unbalanced ? (HANGUL_RE.test(masked) ? [raw.trim()] : []) : quotedSpans(raw, masked)
  return [...spans, ...textUnits].filter((s) => HANGUL_RE.test(s))
}

function parseToken(content) {
  if (!TOKEN_RE.test(content)) return null
  const [kind, ...rest] = content.split(':')
  const common = rest[0] === COMMON_KEY
  const body = common ? rest.slice(1).join(':') : rest.join(':')
  const [base, ...opts] = body.split('|')
  return { kind, common, base, opts }
}

function requiredIds(token) {
  if (token.kind === 'msg') return [token.base]
  const ids = [`${token.base}_Q`, `${token.base}${HEADER_SUFFIX}`]
  if (token.opts[0] === '*') return ids
  for (const opt of token.opts) ids.push(`${token.base}_${opt}_LABEL`, `${token.base}_${opt}_DESC`)
  return ids
}

function scanLineTokens(masked, n, file, out) {
  let i = masked.indexOf('{{')
  while (i >= 0) {
    const close = masked.indexOf('}}', i + 2)
    if (close < 0) {
      out.malformed.push({ file, line: n, kind: 'malformed-ref', detail: `unclosed reference "${masked.slice(i).trim()}"` })
      i = masked.indexOf('{{', i + 2)
      continue
    }
    const content = masked.slice(i + 2, close)
    const token = parseToken(content)
    if (token) out.tokens.push({ file, line: n, token })
    else out.malformed.push({ file, line: n, kind: 'malformed-ref', detail: `invalid reference "{{${content}}}"` })
    i = masked.indexOf('{{', close + 2)
  }
}

// 본문 텍스트에서 코드 블록·인라인 코드 밖 참조 토큰과 residual 검사 단위를 모은다.
// 코드 블록은 한글이 든 줄 하나(앞뒤 공백 제거)가 검사 단위다.
function scanBody(text, file) {
  const out = { tokens: [], malformed: [], units: [] }
  let fence = null
  splitLines(text).forEach((raw, i) => {
    const n = i + 1
    if (fence) {
      if (isFenceClose(raw, fence)) fence = null
      else if (HANGUL_RE.test(raw)) out.units.push({ file, line: n, text: raw.trim() })
      return
    }
    const opened = fenceOpen(raw)
    if (opened) {
      fence = { ...opened, line: n }
      return
    }
    const { masked, spans } = splitInlineCode(raw)
    scanLineTokens(masked, n, file, out)
    for (const unit of lineUnits(raw, masked, spans)) out.units.push({ file, line: n, text: unit })
  })
  // 닫히지 않은 코드 블록은 그 뒤 내용 전체를 검사에서 빼므로 위반으로 보고한다.
  if (fence) out.malformed.push({ file, line: fence.line, kind: 'format', detail: 'unclosed code block' })
  return out
}

function scanComponents(root, components, violations) {
  const refs = new Map()
  const units = []
  for (const component of components) {
    const tokens = []
    for (const file of component.bodyFiles) {
      const scanned = scanBody(fs.readFileSync(path.join(root, file), 'utf8'), file)
      tokens.push(...scanned.tokens)
      units.push(...scanned.units)
      violations.push(...scanned.malformed)
    }
    refs.set(component.key, tokens)
  }
  return { refs, units }
}

// ---------------------------------------------------------------------------
// 참조 해석: missing-catalog, unresolved-ref

// enCatalog 가 null 이면(공통 카탈로그 없음) missingPath 를 진단에 적는다.
function checkResolved(refList, enCatalog, violations, missingPath = '') {
  for (const { file, line, token } of refList) {
    for (const id of requiredIds(token)) {
      if (enCatalog?.entries.has(id)) continue
      const detail = enCatalog ? `${id} not found in ${enCatalog.file}` : `${id} not found: ${missingPath} missing`
      violations.push({ file, line, kind: 'unresolved-ref', detail })
    }
  }
}

function checkOwnRefs(component, ownRefs, catalogs, violations) {
  if (ownRefs.length === 0) return
  const pair = catalogs.get(component.template)
  if (!pair) {
    const expected = LANGS.map((l) => catalogPath(component.template, l)).join(' and ')
    violations.push({ file: ownRefs[0].file, line: 0, kind: 'missing-catalog', detail: `${expected} not found` })
    return
  }
  // en이 없으면 orphan-file로 이미 보고됐으므로 해석을 건너뛴다.
  if (pair.en) checkResolved(ownRefs, pair.en, violations)
}

function checkRefs(components, refs, catalogs, violations) {
  const commonEn = catalogs.get(COMMON_TEMPLATE)?.en ?? null
  const commonPath = catalogPath(COMMON_TEMPLATE, 'en')
  for (const component of components) {
    const tokens = refs.get(component.key)
    checkOwnRefs(component, tokens.filter((t) => !t.token.common), catalogs, violations)
    checkResolved(tokens.filter((t) => t.token.common), commonEn, violations, commonPath)
  }
}

// ---------------------------------------------------------------------------
// 미사용 ID: unused-id

function referencedIds(tokens) {
  return new Set(tokens.flatMap((t) => requiredIds(t.token)))
}

function checkOwnUnused(components, refs, catalogs, violations) {
  const byTemplate = new Map(components.map((c) => [c.template, c]))
  for (const [template, pair] of catalogs) {
    if (template === COMMON_TEMPLATE) continue
    const base = pair.en ?? pair.ko
    const owner = byTemplate.get(template)
    if (!owner) {
      // 검사 범위의 컴포넌트가 없는 카탈로그(stack-*·삭제된 에이전트 등)는 파일 단위로 한 번만 보고한다.
      const detail = 'catalog has no owning component in scope; all IDs are unreferenced'
      violations.push({ file: base.file, line: 0, kind: 'unused-id', detail })
      continue
    }
    const used = referencedIds(refs.get(owner.key).filter((t) => !t.token.common))
    for (const [id, { line }] of base.entries) {
      if (!used.has(id)) violations.push({ file: base.file, line, kind: 'unused-id', detail: `ID ${id} is not referenced` })
    }
  }
}

function checkCommonUnused(components, refs, catalogs, violations) {
  const pair = catalogs.get(COMMON_TEMPLATE)
  if (!pair) return
  const base = pair.en ?? pair.ko
  const users = new Map()
  for (const component of components) {
    for (const id of referencedIds(refs.get(component.key).filter((t) => t.token.common))) {
      users.set(id, (users.get(id) ?? 0) + 1)
    }
  }
  for (const [id, { line }] of base.entries) {
    const count = users.get(id) ?? 0
    if (count < 2) {
      const detail = `common ID ${id} is referenced by ${count} component(s); common IDs need 2 or more`
      violations.push({ file: base.file, line, kind: 'unused-id', detail })
    }
  }
}

// ---------------------------------------------------------------------------
// 잔존 한글: residual, stale-allow, 허용 목록 스키마

// 최상위 JSON 배열 원소마다 시작 줄 번호를 구한다(문자열 안 괄호는 무시).
function arrayElementLines(text) {
  const lines = []
  let depth = 0
  let line = 1
  let inString = false
  let expectValue = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '\n') line += 1
    if (inString) {
      if (ch === '\\') i += 1
      else if (ch === '"') inString = false
      continue
    }
    if (depth === 1 && expectValue && !/[\s,\]]/.test(ch)) {
      lines.push(line)
      expectValue = false
    }
    if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth += 1
    else if (ch === ']' || ch === '}') depth -= 1
    if (depth === 1 && (ch === '[' || ch === ',')) expectValue = true
  }
  return lines
}

function validateAllowEntry(entry) {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return 'entry must be an object'
  const bad = ALLOW_FIELDS.filter((k) => typeof entry[k] !== 'string' || entry[k] === '')
  return bad.length > 0 ? `entry needs non-empty string fields: ${bad.join(', ')}` : null
}

// 허용 목록을 읽어 유효한 항목만 { file, text, line }으로 돌려준다. 파일이 없으면 빈 목록이다.
function loadAllowList(root, violations) {
  const abs = path.join(root, ALLOW_LIST)
  if (!isFileIn(root, abs)) return []
  const report = (line, detail) => violations.push({ file: ALLOW_LIST, line, kind: 'format', detail })
  const text = fs.readFileSync(abs, 'utf8').replace(/^﻿/, '')
  let data
  try {
    data = JSON.parse(text)
  } catch (error) {
    const at = /line (\d+)/.exec(error.message)
    report(at ? Number(at[1]) : 0, `invalid JSON: ${error.message}`)
    return []
  }
  if (!Array.isArray(data)) {
    report(0, 'allow list must be a JSON array')
    return []
  }
  const lines = arrayElementLines(text)
  const entries = []
  const seen = new Set()
  data.forEach((entry, i) => {
    const line = lines[i] ?? 0
    const problem = validateAllowEntry(entry)
    if (problem) return report(line, problem)
    const key = `${entry.file}\u0000${entry.text}`
    if (seen.has(key)) return report(line, `duplicate entry for ${entry.file} ${entry.text}`)
    seen.add(key)
    entries.push({ file: entry.file, text: entry.text, line })
  })
  return entries
}

function checkResidual(units, allowList, violations) {
  const key = (file, text) => `${file}\u0000${text}`
  const allowed = new Set(allowList.map((e) => key(e.file, e.text)))
  const found = new Set(units.map((u) => key(u.file, u.text)))
  for (const unit of units) {
    if (!allowed.has(key(unit.file, unit.text))) {
      violations.push({ file: unit.file, line: unit.line, kind: 'residual', detail: unit.text })
    }
  }
  for (const entry of allowList) {
    if (!found.has(key(entry.file, entry.text))) {
      violations.push({ file: ALLOW_LIST, line: entry.line, kind: 'stale-allow', detail: `${entry.file} ${entry.text}` })
    }
  }
}

// ---------------------------------------------------------------------------
// 실행

export function check(root) {
  const violations = []
  const components = discoverComponents(root)
  const templates = discoverCatalogTemplates(root)
  const catalogs = loadCatalogs(root, templates, violations)
  checkCatalogPairs(catalogs, violations)
  const { refs, units } = scanComponents(root, components, violations)
  checkRefs(components, refs, catalogs, violations)
  checkOwnUnused(components, refs, catalogs, violations)
  checkCommonUnused(components, refs, catalogs, violations)
  checkResidual(units, loadAllowList(root, violations), violations)
  const bodyFiles = components.reduce((n, c) => n + c.bodyFiles.length, 0)
  const catalogFiles = [...catalogs.values()].reduce((n, p) => n + LANGS.filter((l) => p[l]).length, 0)
  return { violations: sortViolations(violations), stats: { bodyFiles, catalogFiles } }
}

function sortViolations(violations) {
  return [...violations].sort(
    (a, b) =>
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
      a.line - b.line ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  )
}

function formatViolation({ file, line, kind, detail }) {
  // 진단은 한 줄 계약이다 — detail 안의 줄바꿈(예: JSON 파서 메시지)을 공백으로 바꾼다.
  return `${toPosix(file)}:${line}: ${kind}: ${detail.replace(/\s*[\r\n]+\s*/g, ' ')}`
}

function resolveRoot(argv) {
  let root = fileURLToPath(new URL('../..', import.meta.url))
  for (const arg of argv) {
    const m = arg.match(/^--root=(.+)$/)
    if (!m) throw new Error(`Usage: node i18n-check.js [--root=<dir>] (unknown argument: ${arg})`)
    root = path.resolve(m[1])
  }
  if (!isDir(root)) throw new Error(`root directory not found: ${root}`)
  return root
}

function main() {
  try {
    const root = resolveRoot(process.argv.slice(2))
    const { violations, stats } = check(root)
    // process.exit() 대신 exitCode 를 써서 파이프로 연결된 stderr 가 끝까지 흘러가게 한다.
    if (violations.length > 0) {
      process.stderr.write(violations.map(formatViolation).join('\n') + '\n')
      process.exitCode = 1
      return
    }
    process.stdout.write(`i18n-check: OK (${stats.bodyFiles} body files, ${stats.catalogFiles} catalog files)\n`)
    process.exitCode = 0
  } catch (error) {
    process.stderr.write(`i18n-check: ${error.message}\n`)
    process.exitCode = 2
  }
}

// 직접 실행될 때만 main()을 호출한다 (테스트의 import 시 실행 방지).
// symlink 를 거쳐 실행해도 main()이 조용히 건너뛰어지지 않도록 양쪽을 realpath로 맞추고,
// realpath 가 실패하면 path.resolve 비교로 폴백한다.
// 같은 가드가 validate-path.js, .claude/scripts/hooks/prettier-format.js 에도 있다 — 함께 수정한다.
function isEntryPoint() {
  if (!process.argv[1]) return false
  const self = fileURLToPath(import.meta.url)
  try {
    return fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(self)
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(self)
  }
}

if (isEntryPoint()) main()
