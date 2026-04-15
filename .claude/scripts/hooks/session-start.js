#!/usr/bin/env node
/**
 * SessionStart 훅: dev-context.json을 로드하고 이전 작업 컨텍스트를 복원한다.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const cwd = process.env.PWD || process.cwd()
const contextPath = join(cwd, 'docs/_local/dev-context.json')

function main() {
  if (!existsSync(contextPath)) {
    // 컨텍스트 없음 — 새 세션
    process.exit(0)
  }

  try {
    const context = JSON.parse(readFileSync(contextPath, 'utf-8'))
    const topic = context.current_topic

    if (!topic) {
      process.exit(0)
    }

    const topicData = context.topics?.[topic]
    if (!topicData) {
      process.exit(0)
    }

    // 이전 컨텍스트 출력 (Claude Code가 시스템 메시지로 인식)
    console.log(`[컨텍스트 복원] 주제: ${topic} | phase: ${topicData.phase}`)

    if (topicData.currentTask) {
      console.log(`[컨텍스트 복원] 다음 Task: ${topicData.currentTask}`)
      console.log(`  → /dev:impl 로 계속하세요.`)
    }

    if (topicData.plan) {
      console.log(`[컨텍스트 복원] 계획 파일: ${topicData.plan}`)
    }
  } catch {
    // 파일 파싱 오류 무시
  }

  process.exit(0)
}

main()
