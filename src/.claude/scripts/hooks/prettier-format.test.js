// prettier-format.test.js — prettier 훅 실행 방식(셸 미사용·win32 npx-cli 직접 실행) 검증
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { buildPrettierInvocation, resolveCwd } from './prettier-format.js'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'prettier-format.js')
const META_NAME = 'a b&c;d$e.ts'

describe('buildPrettierInvocation', () => {
  test('비-win32: 기존과 같은 npx prettier --write <file>', () => {
    const inv = buildPrettierInvocation({
      platform: 'darwin', execPath: '/usr/local/bin/node', filePath: 'src/x.ts', exists: () => true,
    })
    assert.deepEqual(inv, { command: 'npx', args: ['prettier', '--write', 'src/x.ts'] })
  })

  test('win32: node 로 npx-cli.js 를 직접 실행', () => {
    const execPath = 'C:\\Program Files\\nodejs\\node.exe'
    const npxCli = join(dirname(execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
    const inv = buildPrettierInvocation({
      platform: 'win32', execPath, filePath: 'src\\x.ts', exists: p => p === npxCli,
    })
    assert.deepEqual(inv, { command: execPath, args: [npxCli, 'prettier', '--write', 'src\\x.ts'] })
  })

  test('win32: npx-cli.js 가 없으면 null (조용히 건너뜀)', () => {
    const inv = buildPrettierInvocation({
      platform: 'win32', execPath: 'C:\\node\\node.exe', filePath: 'x.ts', exists: () => false,
    })
    assert.equal(inv, null)
  })

  test('셸 메타문자 파일명은 이어 붙지 않고 args 원소 하나로 전달', () => {
    for (const platform of ['win32', 'darwin', 'linux']) {
      const inv = buildPrettierInvocation({
        platform, execPath: process.execPath, filePath: META_NAME, exists: () => true,
      })
      assert.equal(inv.args.at(-1), META_NAME)
      assert.equal(inv.args.filter(a => a.includes(META_NAME)).length, 1)
    }
  })
})

describe('resolveCwd', () => {
  test('win32 는 PWD 를 무시하고 process.cwd()', () => {
    assert.equal(resolveCwd('win32', { PWD: '/c/repo' }, 'C:\\repo'), 'C:\\repo')
  })
  test('비-win32 는 PWD 우선 (기존 동작)', () => {
    assert.equal(resolveCwd('darwin', { PWD: '/repo' }, '/other'), '/repo')
    assert.equal(resolveCwd('linux', {}, '/other'), '/other')
  })
})

// 통합: 인자를 파일로 기록하는 가짜 prettier 를 로컬 설치하고 훅을 실제로 실행한다.
describe('hook integration (fake prettier)', () => {
  let base
  let project
  let skipReason = ''

  before(() => {
    base = join(realpathSync(tmpdir()), `prettier-hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const fake = join(base, 'fake-prettier')
    project = join(base, 'project')
    mkdirSync(fake, { recursive: true })
    mkdirSync(project, { recursive: true })
    writeFileSync(join(fake, 'package.json'), JSON.stringify({
      name: 'prettier', version: '0.0.0-fake', bin: { prettier: 'bin.js' },
    }))
    writeFileSync(join(fake, 'bin.js'), [
      '#!/usr/bin/env node',
      "const fs = require('fs')",
      "fs.writeFileSync(require('path').join(process.cwd(), 'prettier-args.json'), JSON.stringify(process.argv.slice(2)))",
    ].join('\n'))
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'proj', version: '1.0.0', private: true }))
    writeFileSync(join(project, '.prettierrc'), '{}\n')
    // npm 을 셸 없이 실행한다 (임시 경로에 공백이 있어도 인자가 깨지지 않도록 npm-cli.js 직접 실행).
    const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    const npmCmd = existsSync(npmCli) ? [process.execPath, [npmCli]] : ['npm', []]
    const npm = spawnSync(npmCmd[0], [...npmCmd[1], 'install', '--offline', '--no-save', '--no-audit', '--no-fund', '--install-links', fake], {
      cwd: project, encoding: 'utf8', timeout: 120000,
    })
    if (npm.error || npm.status !== 0) {
      skipReason = `npm install 불가: ${npm.error?.message || npm.stderr}`
    }
  })

  after(() => {
    if (base) rmSync(base, { recursive: true, force: true })
  })

  test('메타문자 파일명이 그대로 전달되고 부수 명령이 실행되지 않는다', (t) => {
    if (skipReason) {
      t.skip(skipReason)
      return
    }
    writeFileSync(join(project, META_NAME), 'const x=1\n')
    const before = new Set(readdirSync(project))
    const run = spawnSync(process.execPath, [HOOK, META_NAME], {
      cwd: project, env: { ...process.env, PWD: project }, encoding: 'utf8', timeout: 60000,
    })
    assert.equal(run.status, 0, 'hook 은 항상 exit 0')
    const argsFile = join(project, 'prettier-args.json')
    assert.ok(existsSync(argsFile), 'prettier 가 실행되지 않음')
    assert.deepEqual(JSON.parse(readFileSync(argsFile, 'utf8')), ['--write', META_NAME])
    const added = readdirSync(project).filter(n => !before.has(n))
    assert.deepEqual(added, ['prettier-args.json'], `예상 밖 파일 생성: ${added}`)
  })

  // win32 에서는 npm exec 가 prettier.cmd 를 cmd.exe 로 실행하므로 cmd 메타문자(%VAR% ^ ! 괄호)도 확인한다.
  test('cmd 메타문자 파일명(%PATH% ^ ! 괄호)도 그대로 전달', (t) => {
    if (skipReason) {
      t.skip(skipReason)
      return
    }
    const name = 'x%PATH%^!(y).ts'
    rmSync(join(project, 'prettier-args.json'), { force: true })
    writeFileSync(join(project, name), 'const x=1\n')
    const run = spawnSync(process.execPath, [HOOK, name], {
      cwd: project, env: { ...process.env, PWD: project }, encoding: 'utf8', timeout: 60000,
    })
    assert.equal(run.status, 0)
    assert.deepEqual(JSON.parse(readFileSync(join(project, 'prettier-args.json'), 'utf8')), ['--write', name])
  })

  test('지원하지 않는 확장자는 prettier 를 실행하지 않고 exit 0', (t) => {
    if (skipReason) {
      t.skip(skipReason)
      return
    }
    rmSync(join(project, 'prettier-args.json'), { force: true })
    writeFileSync(join(project, 'notes.md'), '# x\n')
    const run = spawnSync(process.execPath, [HOOK, 'notes.md'], { cwd: project, encoding: 'utf8' })
    assert.equal(run.status, 0)
    assert.equal(existsSync(join(project, 'prettier-args.json')), false)
  })
})
