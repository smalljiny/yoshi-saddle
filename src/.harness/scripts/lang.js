#!/usr/bin/env node
// lang.js — 대화·문서·커밋 언어를 ko/en 중 하나로 결정한다.
// 사용법: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit
//         node .harness/scripts/lang.js explain --kind=conversation|docs|commit
//         node .harness/scripts/lang.js recommend
// 판정 순수 함수는 lang-core.js에 있다. 기존 import 호환을 위해 normalizeLanguage·parseLanguageBlock을 re-export한다.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeLanguage, parseLanguageBlock, readText } from './lang-core.js'
import { recommend } from './lang-recommend.js'

export { normalizeLanguage, parseLanguageBlock } from './lang-core.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const USAGE = 'usage: node .harness/scripts/lang.js resolve --kind=conversation|docs|commit'
const EXPLAIN_USAGE = 'usage: node .harness/scripts/lang.js explain --kind=conversation|docs|commit'
const RECOMMEND_USAGE = 'usage: node .harness/scripts/lang.js recommend'
const DEFAULT_SOURCE = 'default'
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

// 선택된 값(문자열)을 언어로 바꾼다. 누락이면 경고 없이 en, 미지원이면 en + 경고.
// reason은 explain이 출력하는 사유다 (set·missing-key·unsupported).
function languageFromValue(raw, label) {
  const normalized = normalizeLanguage(raw)
  if (normalized === undefined) return { language: FALLBACK_LANGUAGE, warnings: [], reason: 'missing-key' }
  if (normalized === null) {
    return {
      language: FALLBACK_LANGUAGE,
      warnings: [`unsupported language '${raw.trim()}' in ${label}, using ${FALLBACK_LANGUAGE}`],
      reason: 'unsupported',
    }
  }
  return { language: normalized, warnings: [], reason: 'set' }
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
 * @returns {{language: 'ko' | 'en', warnings: string[], source: string, reason: string}}
 *   source는 결정에 쓴 파일(없으면 default), reason은 set·missing-key·unsupported·no-source
 */
function resolveDocsLike(kind, root) {
  let warnings = []
  for (const label of BLOCK_FILES) {
    const result = resolveFromBlockFile(kind, root, label)
    warnings = [...warnings, ...result.warnings]
    if (result.found) return { language: result.language, warnings, source: label, reason: result.reason }
  }
  return { language: FALLBACK_LANGUAGE, warnings, source: DEFAULT_SOURCE, reason: 'no-source' }
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
 * @returns {{language: 'ko' | 'en', warnings: string[], source: string, reason: string}}
 *   settings에서 찾으면 그 파일 표기와 set·unsupported, 못 찾으면 docs 결정의 값·source와 fallback-docs
 */
function resolveConversation(root, home) {
  const bases = { root, home }
  let warnings = []
  for (const file of SETTINGS_FILES) {
    const result = resolveFromSettingsFile(path.join(bases[file.base], file.rel), file.label)
    warnings = [...warnings, ...result.warnings]
    if (result.found) return { language: result.language, warnings, source: file.label, reason: result.reason }
  }
  const docs = resolveDocsLike('docs', root)
  return {
    language: docs.language,
    warnings: [...warnings, ...docs.warnings],
    source: docs.source,
    reason: 'fallback-docs',
  }
}

const RESOLVERS = Object.freeze({
  conversation: resolveConversation,
  docs: (root) => resolveDocsLike('docs', root),
  commit: (root) => resolveDocsLike('commit', root),
})

// 인자가 정확히 `<subcommand> --kind=<허용 kind>` 형태면 kind, 아니면 null (호출 형식 오류).
function parseKind(args, subcommand) {
  if (args.length !== 2 || args[0] !== subcommand) return null
  const match = /^--kind=(?<kind>.+)$/.exec(args[1])
  if (!match || !Object.hasOwn(RESOLVERS, match.groups.kind)) return null
  return match.groups.kind
}

// 사용법 한 줄을 stderr로 내고 exit 1로 끝낸다 (stdout은 비워 둔다).
function failUsage(usage) {
  process.stderr.write(`${usage}\n`)
  process.exitCode = 1
}

function writeWarnings(warnings) {
  for (const warning of warnings) process.stderr.write(`${warning}\n`)
}

function runResolve(args) {
  const kind = parseKind(args, 'resolve')
  if (kind === null) return failUsage(USAGE)
  const { language, warnings } = RESOLVERS[kind](projectRoot(), userHome())
  writeWarnings(warnings)
  process.stdout.write(`${language}\n`)
}

function runExplain(args) {
  const kind = parseKind(args, 'explain')
  if (kind === null) return failUsage(EXPLAIN_USAGE)
  const { language, warnings, source, reason } = RESOLVERS[kind](projectRoot(), userHome())
  writeWarnings(warnings)
  process.stdout.write(`value=${language}\nsource=${source}\nreason=${reason}\n`)
}

function runRecommend(args) {
  if (args.length !== 1) return failUsage(RECOMMEND_USAGE)
  const { result, warnings } = recommend(projectRoot())
  writeWarnings(warnings)
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

// 첫 인자가 새 서브커맨드 이름일 때만 그 경로로 분기한다. 그 밖(인자 없음·resolve·알 수 없음)은
// 현행 resolve 경로와 resolve 사용법을 그대로 쓴다.
const SUBCOMMANDS = Object.freeze({ explain: runExplain, recommend: runRecommend })

function main() {
  const args = process.argv.slice(2)
  const handler = Object.hasOwn(SUBCOMMANDS, args[0] ?? '') ? SUBCOMMANDS[args[0]] : runResolve
  handler(args)
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
