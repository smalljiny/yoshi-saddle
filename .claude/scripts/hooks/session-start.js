#!/usr/bin/env node
/**
 * SessionStart 훅: dev-context.json을 로드하고 이전 작업 컨텍스트를 복원한다.
 * 세션 시작 시 codex 상태를 감지하여 config.codex.*에 캐시한다.
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { spawnSync } from 'child_process'
import { homedir } from 'os'

const cwd = process.env.PWD || process.cwd()
const contextPath = join(cwd, 'docs/_local/dev-context.json')
const devContextScript = join(cwd, '.harness/scripts/dev-context.js')

/**
 * config.codex.available=false를 저장한다. 오류는 조용히 무시한다.
 */
function setCodexUnavailable() {
  try {
    spawnSync('node', [devContextScript, 'set-field', '--field=config.codex.available', '--value=false'], { stdio: 'ignore' })
  } catch {
    // 무음 실패
  }
}

/**
 * ~/.claude/plugins/cache/openai-codex/codex/<version>/scripts/codex-companion.mjs
 * 패턴으로 companion 경로를 탐지하고 semver 내림차순으로 최신 버전을 반환한다.
 * 없으면 null을 반환한다.
 */
function findCompanionPath() {
  try {
    const baseDir = join(homedir(), '.claude/plugins/cache/openai-codex/codex')
    if (!existsSync(baseDir)) return null

    const versions = readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(v => /^\d+\.\d+\.\d+/.test(v))

    if (versions.length === 0) return null

    // semver 내림차순 정렬 (major.minor.patch 숫자 비교)
    versions.sort((a, b) => {
      const pa = a.split('.').map(Number)
      const pb = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) {
        if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0)
      }
      return 0
    })

    const companionPath = join(baseDir, versions[0], 'scripts/codex-companion.mjs')
    return existsSync(companionPath) ? companionPath : null
  } catch {
    return null
  }
}

/**
 * codex companion을 실행하여 상태를 감지하고 config.codex.*를 dev-context에 저장한다.
 * 모든 오류는 무음 실패로 처리한다.
 */
function detectAndCacheCodex() {
  if (!existsSync(devContextScript)) return

  try {
    const companionPath = findCompanionPath()
    if (!companionPath) {
      setCodexUnavailable()
      return
    }

    const result = spawnSync('node', [companionPath, 'setup', '--json'], {
      encoding: 'utf-8',
      timeout: 8000,
    })

    if (result.status !== 0 || !result.stdout) {
      setCodexUnavailable()
      return
    }

    let parsed
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      setCodexUnavailable()
      return
    }

    const available  = Boolean(parsed.ready && parsed.codex?.available)
    const authenticated = Boolean(parsed.auth?.loggedIn && parsed.auth?.verified)
    const version    = parsed.codex?.detail ?? ''
    const checked_at = new Date().toISOString()

    const fields = [
      ['config.codex.available',      String(available)],
      ['config.codex.authenticated',  String(authenticated)],
      ['config.codex.version',        version],
      ['config.codex.checked_at',     checked_at],
    ]

    for (const [field, value] of fields) {
      spawnSync('node', [devContextScript, 'set-field', `--field=${field}`, `--value=${value}`], { stdio: 'ignore' })
    }
  } catch {
    setCodexUnavailable()
  }
}

function main() {
  if (!existsSync(contextPath)) {
    detectAndCacheCodex()
    process.exit(0)
  }

  try {
    const context = JSON.parse(readFileSync(contextPath, 'utf-8'))
    const topic = context.current_topic

    if (topic) {
      const topicData = context.topics?.[topic]
      if (topicData) {
        // 이전 컨텍스트 출력 (Claude Code가 시스템 메시지로 인식)
        console.log(`[컨텍스트 복원] 주제: ${topic} | phase: ${topicData.phase}`)

        if (topicData.currentTask) {
          console.log(`[컨텍스트 복원] 다음 Task: ${topicData.currentTask}`)
          console.log(`  → /dev:impl 로 계속하세요.`)
        }

        if (topicData.plan) {
          console.log(`[컨텍스트 복원] 계획 파일: ${topicData.plan}`)
        }
      }
    }
  } catch {
    // 파일 파싱 오류 무시
  }

  detectAndCacheCodex()
  process.exit(0)
}

main()
