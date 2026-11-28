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
  'review:in-progress': ['impl:in-progress', 'docs:generated'],  // 리뷰 실패 → 재구현, 통과 → 문서 생성
  'docs:generated':   ['pr:created', 'review:in-progress'],      // PR 생성 또는 리뷰 재진입
  'pr:created':       ['docs:generated'],                         // PR 수정 시 참조 문서 재작성 후 재push 경로
}

// phase/status 설정 금지 필드
const PROTECTED_FIELDS = new Set(['phase', 'status'])

// 프로토타입 오염 방지: config 경로 세그먼트에 예약 키 금지
const FORBIDDEN_CONFIG_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

// config 점 경로 파싱: 'config.<ns>.<key>' (깊이 2 고정)
// 반환: { ok: true, ns, key } | { ok: false, reason }
function parseConfigPath(field) {
  const segments = field.split('.')
  if (segments.length !== 3 || segments[0] !== 'config' || !segments[1] || !segments[2]) {
    return { ok: false, reason: `config path must be exactly in the form 'config.<namespace>.<key>' (input: ${field})` }
  }
  if (FORBIDDEN_CONFIG_SEGMENTS.has(segments[1]) || FORBIDDEN_CONFIG_SEGMENTS.has(segments[2])) {
    return { ok: false, reason: `config path cannot use a reserved key (input: ${field})` }
  }
  return { ok: true, ns: segments[1], key: segments[2] }
}

// config 경로 전용 값 타입 추론: 'true'/'false' → boolean, 정수 리터럴 → number, JSON 배열 → array, 그 외 → string
// 배열 추론: '[' 시작 + ']' 끝 패턴만. '[A-Z].*' 같은 정규식 스칼라는 ']*' 뒤에 문자가 있으므로 매치되지 않음.
function coerceConfigValue(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^\s*\[.*\]\s*$/s.test(value)) {
    let parsed
    try {
      parsed = JSON.parse(value)
    } catch (e) {
      die(`config value parse error: failed to parse JSON array — ${e.message} (input: ${value})`)
    }
    if (!Array.isArray(parsed) || !parsed.every(el => typeof el === 'string' && !/[\r\n]/.test(el))) {
      die('config array values allow only string elements — no newlines or non-string elements (e.g. [".claude/", ".harness/"])')
    }
    return parsed
  }
  return value
}

function readContext() {
  if (!existsSync(DEV_CONTEXT_PATH)) {
    return { current_topic: null, topics: {}, config: {}, updatedAt: new Date().toISOString() }
  }
  const ctx = JSON.parse(readFileSync(DEV_CONTEXT_PATH, 'utf8'))
  if (!ctx.topics || typeof ctx.topics !== 'object' || Array.isArray(ctx.topics)) {
    ctx.topics = {}
  }
  if (!Object.hasOwn(ctx, 'current_topic')) {
    ctx.current_topic = null
  }
  if (!ctx.config || typeof ctx.config !== 'object' || Array.isArray(ctx.config)) {
    ctx.config = {}
  }
  // 자동 마이그레이션: 기존 currentTask 필드 → currentStory.
  // 두 필드 동시 존재 시 no-op으로 currentTask를 보존 (수동 정리 대상으로 남긴다).
  for (const topicName of Object.keys(ctx.topics)) {
    const t = ctx.topics[topicName]
    if (!t || typeof t !== 'object') continue
    const hasOld = Object.hasOwn(t, 'currentTask')
    const hasNew = Object.hasOwn(t, 'currentStory')
    if (hasOld && !hasNew) {
      t.currentStory = t.currentTask
      delete t.currentTask
    }
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
    if (m) {
      args[m[1]] = m[2]
    } else if (/^--[a-zA-Z]/.test(arg)) {
      // boolean flag (no value): --flag → args['flag'] = true
      args[arg.slice(2)] = true
    }
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
    if (!topic) die('register-topic: --topic required')
    if (!spec) die('register-topic: --spec required')

    const ctx = readContext()

    if (ctx.topics[topic]) {
      die(`register-topic: topic '${topic}' already exists (current ${ctx.topics[topic].phase}:${ctx.topics[topic].status})`)
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
      currentStory: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    ctx.current_topic = topic
    writeContext(ctx)
    break
  }

  case 'update-state': {
    const { topic, phase, status } = args
    if (!topic) die('update-state: --topic required')
    if (!phase) die('update-state: --phase required')
    if (!status) die('update-state: --status required')

    const ctx = readContext()
    const t = ctx.topics[topic]
    if (!t) die(`update-state: topic '${topic}' not found`)

    const from = `${t.phase}:${t.status}`
    const to = `${phase}:${status}`

    if (from === to) {
      // 동일 상태는 무시 (idempotent)
      break
    }

    const allowed = VALID_TRANSITIONS[from]
    if (!allowed || !allowed.includes(to)) {
      die(`update-state: invalid transition '${from}' → '${to}'\nAllowed: ${allowed ? allowed.join(', ') : 'none'}`)
    }

    t.phase = phase
    t.status = status
    t.updatedAt = new Date().toISOString()
    writeContext(ctx)
    break
  }

  case 'set-field': {
    const { topic, field, value } = args
    if (!field) die('set-field: --field required')
    if (value === undefined) die('set-field: --value required')

    // 글로벌 필드: current_topic (--topic 없이 사용, read와 대칭)
    if (field === 'current_topic') {
      if (topic) die('set-field: current_topic is a global field and cannot be used with --topic')
      const ctx = readContext()
      ctx.current_topic = value === 'null' ? null : value
      writeContext(ctx)
      break
    }

    // 글로벌 config 점 경로 (config.<ns>.<key>)
    if (field === 'config' || field.startsWith('config.')) {
      if (topic) die('set-field: config.* is a global field and cannot be used with --topic')
      const parsed = parseConfigPath(field)
      if (!parsed.ok) die(`set-field: ${parsed.reason}`)
      const ctx = readContext()
      if (!ctx.config[parsed.ns] || typeof ctx.config[parsed.ns] !== 'object' || Array.isArray(ctx.config[parsed.ns])) {
        ctx.config[parsed.ns] = {}
      }
      ctx.config[parsed.ns][parsed.key] = coerceConfigValue(value)
      writeContext(ctx)
      break
    }

    if (!topic) die('set-field: --topic required (except current_topic)')

    if (PROTECTED_FIELDS.has(field)) {
      die(`set-field: field '${field}' is reserved for update-state`)
    }

    // 프로토타입 오염 방지: topic 필드 예약 키 금지
    if (field === '__proto__' || field === 'constructor' || field === 'prototype') {
      die(`set-field: field '${field}' is not allowed`)
    }

    const ctx = readContext()
    const t = ctx.topics[topic]
    if (!t) die(`set-field: topic '${topic}' not found`)

    // null 문자열 처리
    t[field] = value === 'null' ? null : value
    t.updatedAt = new Date().toISOString()
    writeContext(ctx)
    break
  }

  case 'remove-topic': {
    const { topic } = args
    if (!topic) die('remove-topic: --topic required')

    const ctx = readContext()
    if (!ctx.topics[topic]) die(`remove-topic: topic '${topic}' not found`)

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
    if (!field) die([
      'read: --field required',
      '',
      'Available invocation forms:',
      '  read --field=current_topic',
      '  read --field=config.<namespace>.<key>',
      '  read --topic=<topic> --field=<phase|status|spec|specReview|plan|planReview|currentStory>',
    ].join('\n'))

    const ctx = readContext()

    if (field === 'current_topic') {
      if (topic) die('read: current_topic is a global field and cannot be used with --topic')
      const val = ctx.current_topic
      process.stdout.write((val === null || val === undefined ? '' : String(val)) + '\n')
      break
    }

    // 글로벌 config 점 경로 (config.<ns>.<key>)
    if (field === 'config' || field.startsWith('config.')) {
      if (topic) die('read: config.* is a global field and cannot be used with --topic')
      const parsed = parseConfigPath(field)
      if (!parsed.ok) die(`read: ${parsed.reason}`)
      // Object.prototype 상속 속성이 own property로 읽히지 않도록 hasOwn 가드
      const hasNs = ctx.config && Object.hasOwn(ctx.config, parsed.ns)
      const nsObj = hasNs ? ctx.config[parsed.ns] : undefined
      const hasKey = nsObj !== null && typeof nsObj === 'object' && Object.hasOwn(nsObj, parsed.key)
      const val = hasKey ? nsObj[parsed.key] : undefined
      if (Array.isArray(val)) {
        // 빈 배열과 미설정은 모두 빈 출력을 낸다.
        // 호출자(예: /dev:docs)는 "빈 출력 = 필터 없음"으로 동일하게 처리해야 한다.
        process.stdout.write(val.length > 0 ? val.join('\n') + '\n' : '\n')
      } else {
        process.stdout.write((val === null || val === undefined ? '' : String(val)) + '\n')
      }
      break
    }

    if (!topic) die('read: --topic required (except current_topic)')

    const t = ctx.topics[topic]
    if (!t) die(`read: topic '${topic}' not found`)

    const val = t[field]
    process.stdout.write((val === null || val === undefined ? '' : String(val)) + '\n')
    break
  }

  case 'force-state': {
    const { topic, phase, status } = args
    if (!topic) die('force-state: --topic required')
    if (!phase) die('force-state: --phase required')
    if (!status) die('force-state: --status required')

    // 예약어 토픽 이름 거부 (prototype pollution 방지)
    if (topic === '__proto__' || topic === 'constructor' || topic === 'prototype') {
      die(`force-state: topic name '${topic}' is not allowed`)
    }

    const KNOWN_STATES = new Set(Object.keys(VALID_TRANSITIONS))
    const to = `${phase}:${status}`
    if (!KNOWN_STATES.has(to)) {
      die(`force-state: unknown state '${to}'\nAllowed: ${[...KNOWN_STATES].join(', ')}`)
    }

    const ctx = readContext()
    const t = ctx.topics[topic]
    if (!t) die(`force-state: topic '${topic}' not found`)

    const from = `${t.phase}:${t.status}`
    if (from === to) break  // idempotent: 동일 상태는 무시

    // 순방향(forward) 점프는 아티팩트 검증 없이 후기 상태로 진입할 수 있어 워크플로우 게이트를 우회함.
    // 역방향(backward) 복구가 force-state의 의도된 용도이므로, 순방향에는 명시적 플래그 요구.
    const STATE_ORDER = [
      'spec:drafting', 'spec:reviewing', 'spec:confirmed',
      'plan:ready', 'plan:reviewing', 'plan:confirmed',
      'impl:in-progress', 'review:in-progress', 'docs:generated', 'pr:created',
    ]
    const fromIdx = STATE_ORDER.indexOf(from)
    const toIdx = STATE_ORDER.indexOf(to)
    const isForward = fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx
    if (isForward && !args['allow-unsafe-force']) {
      die(
        `force-state: '${from}' → '${to}' is a forward jump.\n` +
        `Moving to a later state without artifact verification bypasses workflow gates.\n` +
        `If intended, add the --allow-unsafe-force flag (not needed for backward recovery).`
      )
    }

    const forwardNote = isForward ? ' [--allow-unsafe-force]' : ''
    process.stderr.write(`force-state: bypassed VALID_TRANSITIONS and forced transition ${from} → ${to} (admin use)${forwardNote}.\n`)

    t.phase = phase
    t.status = status
    t.updatedAt = new Date().toISOString()
    writeContext(ctx)
    break
  }

  default:
    die(`unknown subcommand: ${subcommand}\nAvailable: register-topic, update-state, set-field, remove-topic, read, force-state`)
}
