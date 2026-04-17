---
version: 1
---

# ECC Component Analysis

**Source**: `references/everything-claude-code/` (v1.10.0)  
**Purpose**: Identify components from Everything Claude Code useful for harness development  
**Date**: 2026-04-15

---

## Overview

Everything Claude Code (ECC) is a production-ready Claude Code plugin providing 47 agents, 183 skills, and 79 commands. This document records findings from analyzing ECC for components worth adopting into the harness.

Evaluation criteria:
- **Relevance** — directly useful for Claude Code-based development workflows
- **Non-overlap** — not already covered by existing harness components
- **Generality** — not tied to a specific domain or codebase

---

## Agents

### harness-optimizer
**Path**: `agents/harness-optimizer.md`  
**Model**: sonnet

Evaluates harness configuration health across 7 categories: Tool Coverage, Context Efficiency, Quality Gates, Memory Persistence, Agent Delegation, Hook Reliability, Cost Optimization. Produces a scored report (0–10 per category) and recommends the top 3 actionable improvements.

**Why useful**: The harness itself needs to be monitored and improved over time. This agent closes the feedback loop — it can audit `settings.json`, `hooks.json`, agents, and skills, and surface degradation before it affects productivity.

---

### code-explorer
**Path**: `agents/code-explorer.md`

Maps an unfamiliar codebase: discovers entry points, traces execution paths, identifies architecture layers, and documents patterns and dependencies.

**Why useful**: Before `/dev:plan`, understanding what already exists prevents duplicate work. Integrates naturally as a pre-step to the planner agent.

---

### code-simplifier
**Path**: `agents/code-simplifier.md`

Refactors code for clarity: reduces nesting, consolidates duplication, improves naming. Verifies behavior is preserved via tests before and after.

**Why useful**: Complements the existing `refactor-cleaner` agent with a clarity-first focus. Where `refactor-cleaner` removes dead code, `code-simplifier` improves live code.

---

### docs-lookup
**Path**: `agents/docs-lookup.md`

Queries library documentation via Context7 MCP using `resolve-library-id` + `query-docs`. Returns accurate, version-specific documentation rather than relying on training data.

**Why useful**: Prevents hallucinated API usage. Most valuable when working with fast-moving libraries (Next.js, Zod, LangChain) where training data may be stale.

---

### comment-analyzer
**Path**: `agents/comment-analyzer.md`

Audits code comments for accuracy (does the comment match the code?), completeness (is complex logic explained?), and staleness (comment rot risk). Tracks TODO/FIXME debt.

**Why useful**: Complements `code-reviewer`. Stale or wrong comments are a common source of confusion during onboarding and maintenance.

---

## Skills

### continuous-learning
**Path**: `skills/continuous-learning*/SKILL.md`

Defines a structured process for extracting reusable patterns from Claude Code sessions: identify recurring solutions, generalize them, write them as skills, and save to `skills/learned/`. Includes quality filters to avoid saving noise.

**Why useful**: The harness already has a `/learn` command and `skills/learned/` directory, but lacks a skill that guides *how* to do the extraction well. This fills that gap with concrete criteria and output format.

---

### skill-creator
**Path**: `skills/skill-create*/SKILL.md` (or equivalent)

Guides the creation of new skills from git history and session observations. Covers frontmatter format, section structure (When to Activate, How It Works, Examples), and placement policy.

**Why useful**: As the harness grows, contributors need a consistent way to write new skills. This skill acts as a meta-guide.

---

### strategic-compact
**Path**: Referenced in `skills/strategic-compact*/SKILL.md`

Recommends manual `/compact` at strategic workflow breakpoints (after planning, before a new phase) rather than waiting for automatic compaction at arbitrary context usage.

**Why useful**: Long sessions (e.g., multi-Task `/dev:impl` runs) suffer from unplanned compaction mid-task. This skill defines where compaction is safe and where it disrupts flow.

---

## Rules

### common/performance
**Path**: `rules/common/performance.md`

Covers: model selection strategy by task complexity (Haiku for lightweight, Sonnet for coding, Opus for architecture/reasoning), context window management (avoid final 20% for large changes), and when to use extended thinking.

**Why useful**: Currently the harness assigns models per agent but provides no guidance on *why*. This rule makes the model selection logic explicit and teachable.

---

## Commands

### /harness-audit
**Path**: `commands/harness-audit.md`

Runs the harness-optimizer agent on the current `.claude/` configuration. Produces a scored health report with actionable items. Supports `--format json` for CI integration.

**Why useful**: Pairs with `harness-optimizer`. Gives developers a quick way to assess harness quality after making changes.

---

### /quality-gate
**Path**: `commands/quality-gate.md`

Runs format, lint, and type checks in one command with an optional `--fix` flag. Lighter than `/dev:verify` — intended for mid-task spot-checks rather than pre-PR gates.

**Why useful**: `/dev:verify` is a full gate (build + test + security). `/quality-gate` fills the gap for quick checks during implementation without running the full suite.

---

### /checkpoint
**Path**: `commands/checkpoint.md`

Saves a named snapshot of current state: test results, coverage, build status, open TODO items. Provides a safe rollback reference point during complex implementations.

**Why useful**: Long `/dev:impl` sessions across multiple tasks benefit from explicit checkpoints. Currently the harness has no mid-session state preservation mechanism.

---

### /test-coverage
**Path**: `commands/test-coverage.md`

Analyzes coverage report, identifies untested areas, and generates test stubs for missing cases. Enforces the 80% threshold defined in `.harness/rules/testing.md`.

**Why useful**: `/dev:verify` checks whether coverage passes, but doesn't help reach it. This command bridges the gap between "coverage failed" and "tests written."

---

### /update-docs
**Path**: `commands/update-docs.md`

Detects changed files since the last commit, finds related documentation, and proposes targeted updates. Designed to run after `/dev:review`.

**Why useful**: Documentation drift is a common problem. Automating doc update proposals after each review keeps `docs/specs/` in sync without manual effort.

---

## Not Recommended

The following were evaluated and excluded:

| Component | Reason |
|-----------|--------|
| `loop-operator` agent | Autonomous loop management — useful for long-running pipelines, not for standard feature dev |
| `chief-of-staff` agent | Email/Slack triage — out of scope for a dev harness |
| `bun-runtime` skill | Node.js is sufficient for current TypeScript focus; add when Bun adoption is needed |
| Language rules (Go, Kotlin, Python) | Add on-demand when those stacks are needed, not preemptively |
| `/eval` command | Evaluation pipeline for AI outputs — not a general dev workflow tool |
| `/loop-start` command | Specific to autonomous multi-step loops — adds complexity without clear benefit now |
