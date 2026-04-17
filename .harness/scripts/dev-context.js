#!/usr/bin/env node
// dev-context.js — dev-context.json 전담 CLI 스크립트
// 사용법: node .harness/scripts/dev-context.js <subcommand> [options]

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEV_CONTEXT_PATH = process.env.DEV_CONTEXT_PATH
  ?? join(__dirname, '../../docs/_local/dev-context.json')

// 상태 전환 유효성 테이블 (phase:status → 허용 다음 상태 목록)
const VALID_TRANSITIONS = {
  'spec:drafting':    ['spec:reviewing'],
  'spec:reviewing':   ['spec:confirmed', 'spec:drafting'],
  'spec:confirmed':   ['plan:ready'],
  'plan:ready':       ['plan:reviewing'],
  'plan:reviewing':   ['plan:confirmed', 'plan:ready'],
  'plan:confirmed':   ['impl:in-progress'],
  'impl:in-progress': ['review:in-progress'],
  'review:in-progress': ['impl:in-progress'],  // 리뷰 실패 → 재구현
}

// phase/status 설정 금지 필드
const PROTECTED_FIELDS = new Set(['phase', 'status'])

function readContext() {
  if (!existsSync(DEV_CONTEXT_PATH)) {
    return { current_topic: null, topics: {}, updatedAt: new Date().toISOString() }
  }
  const ctx = JSON.parse(readFileSync(DEV_CONTEXT_PATH, 'utf8'))
  if (!ctx.topics || typeof ctx.topics !== 'object' || Array.isArray(ctx.topics)) {
    ctx.topics = {}
  }
  if (!Object.hasOwn(ctx, 'current_topic')) {
    ctx.current_topic = null
  }
  return ctx
}

function writeContext(ctx) {
  ctx.updatedAt = new Date().toISOString()
  const dir = dirname(DEV_CONTEXT_PATH)
  mkdirSync(dir, { recursive: true })
  // 원자적 쓰기: 임시 파일에 쓴 뒤 rename
  const tmp = DEV_CONTEXT_PATH + '.tmp'
  writeFileSync(tmp, JSON.stringify(ctx, null, 2) + '\n', 'utf8')
  renameSync(tmp, DEV_CONTEXT_PATH)
}

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/)
    if (m) args[m[1]] = m[2]
  }
  return args
}

function die(msg) {
  process.stderr.write(msg + '\n')
  process.exit(1)
}

const [,, subcommand, ...rest] = process.argv
const args = parseArgs(rest)

switch (subcommand) {
  case 'register-topic': {
    const { topic, spec } = args
    if (!topic) die('register-topic: --topic 필요')
    if (!spec) die('register-topic: --spec 필요')

    const ctx = readContext()

    if (ctx.topics[topic]) {
      die(`register-topic: 토픽 '${topic}'이 이미 존재합니다 (현재 ${ctx.topics[topic].phase}:${ctx.topics[topic].status})`)
    }

    // 기존 레거시 필드 정리
    delete ctx.current_spec
    delete ctx.specConfirmed
    delete ctx.planConfirmed

    ctx.topics[topic] = {
      phase: 'spec',
      status: 'drafting',
      spec,
      specReview: null,
      plan: null,
      planReview: null,
      currentTask: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    ctx.current_topic = topic
    writeContext(ctx)
    break
  }

  case 'update-state': {
    const { topic, phase, status } = args
    if (!topic) die('update-state: --topic 필요')
    if (!phase) die('update-state: --phase 필요')
    if (!status) die('update-state: --status 필요')

    const ctx = readContext()
    const t = ctx.topics[topic]
    if (!t) die(`update-state: 토픽 '${topic}' 미존재`)

    const from = `${t.phase}:${t.status}`
    const to = `${phase}:${status}`

    if (from === to) {
      // 동일 상태는 무시 (idempotent)
      break
    }

    const allowed = VALID_TRANSITIONS[from]
    if (!allowed || !allowed.includes(to)) {
      die(`update-state: 유효하지 않은 전환 '${from}' → '${to}'\n허용: ${allowed ? allowed.join(', ') : '없음'}`)
    }

    t.phase = phase
    t.status = status
    t.updatedAt = new Date().toISOString()
    writeContext(ctx)
    break
  }

  case 'set-field': {
    const { topic, field, value } = args
    if (!field) die('set-field: --field 필요')
    if (value === undefined) die('set-field: --value 필요')

    // 글로벌 필드: current_topic (--topic 없이 사용, read와 대칭)
    if (field === 'current_topic') {
      if (topic) die('set-field: current_topic은 글로벌 필드이므로 --topic과 함께 사용할 수 없습니다')
      const ctx = readContext()
      ctx.current_topic = value === 'null' ? null : value
      writeContext(ctx)
      break
    }

    if (!topic) die('set-field: --topic 필요 (current_topic 제외)')

    if (PROTECTED_FIELDS.has(field)) {
      die(`set-field: '${field}' 필드는 update-state 전용입니다`)
    }

    const ctx = readContext()
    const t = ctx.topics[topic]
    if (!t) die(`set-field: 토픽 '${topic}' 미존재`)

    // null 문자열 처리
    t[field] = value === 'null' ? null : value
    t.updatedAt = new Date().toISOString()
    writeContext(ctx)
    break
  }

  case 'remove-topic': {
    const { topic } = args
    if (!topic) die('remove-topic: --topic 필요')

    const ctx = readContext()
    if (!ctx.topics[topic]) die(`remove-topic: 토픽 '${topic}' 미존재`)

    delete ctx.topics[topic]

    // current_topic 전환 (남은 토픽 중 하나 또는 null)
    if (ctx.current_topic === topic) {
      const remaining = Object.keys(ctx.topics)
      ctx.current_topic = remaining.length > 0 ? remaining[0] : null
    }

    writeContext(ctx)
    break
  }

  case 'read': {
    const { topic, field } = args
    if (!field) die('read: --field 필요')

    const ctx = readContext()

    if (field === 'current_topic') {
      if (topic) die('read: current_topic은 글로벌 필드이므로 --topic과 함께 사용할 수 없습니다')
      const val = ctx.current_topic
      process.stdout.write((val === null || val === undefined ? '' : String(val)) + '\n')
      break
    }

    if (!topic) die('read: --topic 필요 (current_topic 제외)')

    const t = ctx.topics[topic]
    if (!t) die(`read: 토픽 '${topic}' 미존재`)

    const val = t[field]
    process.stdout.write((val === null || val === undefined ? '' : String(val)) + '\n')
    break
  }

  default:
    die(`알 수 없는 서브커맨드: ${subcommand}\n사용 가능: register-topic, update-state, set-field, remove-topic, read`)
}
