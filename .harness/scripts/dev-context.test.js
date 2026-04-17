// dev-context.test.js — node:test + node:assert 기반 통합 테스트
// 실제 dev-context.json을 건드리지 않도록 임시 파일을 사용한다.
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, execFile } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(__dirname, 'dev-context.js')

// 각 테스트가 독립된 임시 파일을 사용한다.
let CTX_PATH = null

function run(...args) {
  return execFileSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEV_CONTEXT_PATH: CTX_PATH },
  }).trim()
}

async function runExpectFail(...args) {
  try {
    await execFileAsync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, DEV_CONTEXT_PATH: CTX_PATH },
    })
    throw new Error('프로세스가 성공했으나 실패 예상')
  } catch (err) {
    if (err.message === '프로세스가 성공했으나 실패 예상') throw err
    return err
  }
}

function readCtx() {
  return JSON.parse(readFileSync(CTX_PATH, 'utf8'))
}

function removeCtx() {
  if (existsSync(CTX_PATH)) unlinkSync(CTX_PATH)
}

// --- 테스트 ---

describe('dev-context.js', () => {
  beforeEach(() => {
    // 각 테스트 전 독립된 임시 파일 경로 생성 (파일은 생성 안 함)
    CTX_PATH = join(tmpdir(), `dev-context-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  })
  afterEach(() => {
    // 임시 파일 정리
    if (CTX_PATH && existsSync(CTX_PATH)) unlinkSync(CTX_PATH)
    CTX_PATH = null
  })

  describe('register-topic', () => {
    test('정상 등록: spec:drafting 상태로 생성됨', () => {
      run('register-topic', '--topic=test-topic', '--spec=docs/_local/backlog/test-topic/spec.md')
      const ctx = readCtx()
      assert.equal(ctx.current_topic, 'test-topic')
      assert.equal(ctx.topics['test-topic'].phase, 'spec')
      assert.equal(ctx.topics['test-topic'].status, 'drafting')
      assert.equal(ctx.topics['test-topic'].spec, 'docs/_local/backlog/test-topic/spec.md')
    })

    test('레거시 필드(current_spec, specConfirmed, planConfirmed) 자동 제거', () => {
      // 레거시 필드가 있는 구조 세팅
      writeFileSync(CTX_PATH, JSON.stringify({
        current_topic: null,
        current_spec: 'old/path',
        specConfirmed: true,
        planConfirmed: false,
        topics: {},
        updatedAt: new Date().toISOString(),
      }), 'utf8')
      run('register-topic', '--topic=legacy-test', '--spec=some/spec.md')
      const ctx = readCtx()
      assert.equal(ctx.current_spec, undefined)
      assert.equal(ctx.specConfirmed, undefined)
      assert.equal(ctx.planConfirmed, undefined)
    })

    test('topics 없는 legacy current_spec 파일에서도 등록 성공', () => {
      writeFileSync(CTX_PATH, JSON.stringify({
        current_spec: 'docs/_local/backlog/legacy/spec.md',
        updatedAt: new Date().toISOString(),
      }), 'utf8')
      run('register-topic', '--topic=legacy-only', '--spec=docs/_local/backlog/legacy-only/spec.md')
      const ctx = readCtx()
      assert.equal(ctx.current_spec, undefined)
      assert.equal(ctx.current_topic, 'legacy-only')
      assert.equal(ctx.topics['legacy-only'].phase, 'spec')
      assert.equal(ctx.topics['legacy-only'].status, 'drafting')
    })

    test('파일 없을 때 자동 생성', () => {
      removeCtx()
      assert.equal(existsSync(CTX_PATH), false)
      run('register-topic', '--topic=new-topic', '--spec=some/spec.md')
      assert.equal(existsSync(CTX_PATH), true)
      const ctx = readCtx()
      assert.equal(ctx.topics['new-topic'].phase, 'spec')
    })

    test('이미 존재하는 토픽에 재등록 시도 → non-zero exit', async () => {
      run('register-topic', '--topic=dup-topic', '--spec=some/spec.md')
      const err = await runExpectFail('register-topic', '--topic=dup-topic', '--spec=other/spec.md')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('이미 존재합니다'))
    })

    test('부모 디렉토리 없는 중첩 경로에서도 파일 생성', () => {
      const topDir = join(tmpdir(), `nested-dc-${Date.now()}`)
      const nestedPath = join(topDir, 'deep', 'path', 'dev-context.json')
      try {
        execFileSync('node', [SCRIPT, 'register-topic', '--topic=nested-test', '--spec=spec.md'], {
          encoding: 'utf8',
          env: { ...process.env, DEV_CONTEXT_PATH: nestedPath },
        })
        assert.ok(existsSync(nestedPath), '중첩 경로에 파일이 생성되어야 함')
        const ctx = JSON.parse(readFileSync(nestedPath, 'utf8'))
        assert.equal(ctx.topics['nested-test'].phase, 'spec')
      } finally {
        rmSync(topDir, { recursive: true, force: true })
      }
    })
  })

  describe('update-state', () => {
    beforeEach(() => {
      run('register-topic', '--topic=t1', '--spec=some/spec.md')
    })

    test('유효 전환: spec:drafting → spec:reviewing 성공', () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=reviewing')
      const ctx = readCtx()
      assert.equal(ctx.topics['t1'].phase, 'spec')
      assert.equal(ctx.topics['t1'].status, 'reviewing')
    })

    test('유효 전환 체인: 전체 라이프사이클 순서 통과', () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=spec', '--status=confirmed')
      run('update-state', '--topic=t1', '--phase=plan', '--status=ready')
      run('update-state', '--topic=t1', '--phase=plan', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=plan', '--status=confirmed')
      run('update-state', '--topic=t1', '--phase=impl', '--status=in-progress')
      run('update-state', '--topic=t1', '--phase=review', '--status=in-progress')
      const ctx = readCtx()
      assert.equal(ctx.topics['t1'].phase, 'review')
      assert.equal(ctx.topics['t1'].status, 'in-progress')
    })

    test('무효 전환: spec:drafting → plan:ready는 non-zero exit', async () => {
      const err = await runExpectFail('update-state', '--topic=t1', '--phase=plan', '--status=ready')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('유효하지 않은 전환'))
    })

    test('무효 전환: spec:drafting → review:in-progress는 non-zero exit', async () => {
      const err = await runExpectFail('update-state', '--topic=t1', '--phase=review', '--status=in-progress')
      assert.notEqual(err.code, 0)
    })

    test('역방향 전환: spec:confirmed → spec:drafting은 허용 안 됨', async () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=spec', '--status=confirmed')
      const err = await runExpectFail('update-state', '--topic=t1', '--phase=spec', '--status=drafting')
      assert.notEqual(err.code, 0)
    })

    test('plan:reviewing → plan:ready 롤백 허용', () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=spec', '--status=confirmed')
      run('update-state', '--topic=t1', '--phase=plan', '--status=ready')
      run('update-state', '--topic=t1', '--phase=plan', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=plan', '--status=ready') // 롤백
      const ctx = readCtx()
      assert.equal(ctx.topics['t1'].phase, 'plan')
      assert.equal(ctx.topics['t1'].status, 'ready')
    })

    test('review:in-progress → impl:in-progress 롤백 허용 (리뷰 실패)', () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=spec', '--status=confirmed')
      run('update-state', '--topic=t1', '--phase=plan', '--status=ready')
      run('update-state', '--topic=t1', '--phase=plan', '--status=reviewing')
      run('update-state', '--topic=t1', '--phase=plan', '--status=confirmed')
      run('update-state', '--topic=t1', '--phase=impl', '--status=in-progress')
      run('update-state', '--topic=t1', '--phase=review', '--status=in-progress')
      run('update-state', '--topic=t1', '--phase=impl', '--status=in-progress') // 롤백
      const ctx = readCtx()
      assert.equal(ctx.topics['t1'].phase, 'impl')
      assert.equal(ctx.topics['t1'].status, 'in-progress')
    })

    test('동일 상태 전환은 no-op (idempotent)', () => {
      run('update-state', '--topic=t1', '--phase=spec', '--status=drafting') // 동일 상태
      const ctx = readCtx()
      assert.equal(ctx.topics['t1'].phase, 'spec')
      assert.equal(ctx.topics['t1'].status, 'drafting')
    })
  })

  describe('set-field', () => {
    beforeEach(() => {
      run('register-topic', '--topic=sf-test', '--spec=some/spec.md')
    })

    test('일반 필드 업데이트 성공', () => {
      run('set-field', '--topic=sf-test', '--field=specReview', '--value=docs/_local/backlog/sf-test/spec-review-001.md')
      const ctx = readCtx()
      assert.equal(ctx.topics['sf-test'].specReview, 'docs/_local/backlog/sf-test/spec-review-001.md')
    })

    test('currentTask null 설정', () => {
      run('set-field', '--topic=sf-test', '--field=currentTask', '--value=T3')
      run('set-field', '--topic=sf-test', '--field=currentTask', '--value=null')
      const ctx = readCtx()
      assert.equal(ctx.topics['sf-test'].currentTask, null)
    })

    test('phase 변경 시도 → 에러 (PROTECTED)', async () => {
      const err = await runExpectFail('set-field', '--topic=sf-test', '--field=phase', '--value=plan')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('update-state 전용'))
    })

    test('status 변경 시도 → 에러 (PROTECTED)', async () => {
      const err = await runExpectFail('set-field', '--topic=sf-test', '--field=status', '--value=confirmed')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('update-state 전용'))
    })

    test('current_topic 글로벌 필드 업데이트 (--topic 없이)', () => {
      run('register-topic', '--topic=other-topic', '--spec=other/spec.md')
      run('set-field', '--field=current_topic', '--value=sf-test')
      const ctx = readCtx()
      assert.equal(ctx.current_topic, 'sf-test')
    })

    test('current_topic null 설정', () => {
      run('set-field', '--field=current_topic', '--value=null')
      const ctx = readCtx()
      assert.equal(ctx.current_topic, null)
    })

    test('set-field --topic=X --field=current_topic → 에러', async () => {
      const err = await runExpectFail('set-field', '--topic=sf-test', '--field=current_topic', '--value=sf-test')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('--topic과 함께 사용할 수 없습니다'))
    })
  })

  describe('read', () => {
    beforeEach(() => {
      run('register-topic', '--topic=read-test', '--spec=docs/_local/backlog/read-test/spec.md')
    })

    test('read --topic=read-test --field=phase → "spec" 출력', () => {
      const out = run('read', '--topic=read-test', '--field=phase')
      assert.equal(out, 'spec')
    })

    test('read --topic=read-test --field=status → "drafting" 출력', () => {
      const out = run('read', '--topic=read-test', '--field=status')
      assert.equal(out, 'drafting')
    })

    test('read --field=current_topic → topic 이름 출력', () => {
      const out = run('read', '--field=current_topic')
      assert.equal(out, 'read-test')
    })

    test('read --topic=read-test --field=spec → spec 경로 출력', () => {
      const out = run('read', '--topic=read-test', '--field=spec')
      assert.equal(out, 'docs/_local/backlog/read-test/spec.md')
    })

    test('존재하지 않는 토픽 읽기 → non-zero exit', async () => {
      const err = await runExpectFail('read', '--topic=nonexistent', '--field=phase')
      assert.notEqual(err.code, 0)
    })

    test('read --topic=X --field=current_topic → --topic과 함께 사용 불가 에러', async () => {
      const err = await runExpectFail('read', '--topic=read-test', '--field=current_topic')
      assert.notEqual(err.code, 0)
      assert.ok(err.stderr.includes('--topic과 함께 사용할 수 없습니다'))
    })
  })

  describe('remove-topic', () => {
    test('토픽 제거 후 topics에서 삭제됨', () => {
      run('register-topic', '--topic=rm-test', '--spec=some/spec.md')
      run('remove-topic', '--topic=rm-test')
      const ctx = readCtx()
      assert.equal(ctx.topics['rm-test'], undefined)
    })

    test('current_topic이 제거된 토픽이면 다른 토픽으로 전환', () => {
      run('register-topic', '--topic=a', '--spec=spec-a.md')
      run('register-topic', '--topic=b', '--spec=spec-b.md')
      // b가 current_topic
      assert.equal(run('read', '--field=current_topic'), 'b')
      run('remove-topic', '--topic=b')
      const ctx = readCtx()
      // a로 전환
      assert.equal(ctx.current_topic, 'a')
    })

    test('마지막 토픽 제거 시 current_topic = null', () => {
      run('register-topic', '--topic=only', '--spec=spec.md')
      run('remove-topic', '--topic=only')
      const ctx = readCtx()
      assert.equal(ctx.current_topic, null)
    })

    test('존재하지 않는 토픽 제거 → non-zero exit', async () => {
      const err = await runExpectFail('remove-topic', '--topic=ghost')
      assert.notEqual(err.code, 0)
    })
  })
})
