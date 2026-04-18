---
version: 9
---

# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

This repository is a **harness for Claude Code-based development**. It functions as a **project template** — when starting a new project, copy the `.claude/` directory and use it as the development environment.

## .claude/ Structure

```
.claude/
├── agents/          Specialized subagents (planner, tdd-specialist, code-reviewer, etc.)
├── commands/        Slash commands (/dev:spec, /dev:topic, /dev:plan, /dev:impl, /dev:review, /dev:verify, /dev:done, /harness:audit, /harness:learn)
│   ├── dev/         Development workflow commands
│   └── harness/     Harness management commands
├── hooks/           Hook configuration (hooks.json)
├── rules/           Development rules
│   ├── common/      Language-agnostic shared rules
│   └── typescript/  TypeScript-specific rules
├── scripts/         Hook implementation Node.js scripts
│   └── hooks/
├── sessions/        Session logs (git-ignored, .jsonl format)
├── skills/          Workflow skills
│   ├── brainstorming/   Loaded by /dev:spec during spec draft writing
│   ├── tdd-workflow/
│   ├── verification-loop/
│   └── learned/     Patterns auto-saved by /harness:learn command
└── settings.json    Permissions + hook configuration
```

## Development Workflow

```
/dev:spec → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → /dev:docs → /dev:pr → /dev:done
```

| Command | Role |
|---------|------|
| `/dev:spec <name>` | Write spec draft (brainstorming skill) → save to `backlog/`, run Codex review loop |
| `/dev:plan [<name>]` | Select from backlog or specify topic → move to `active/`, register in dev-context.json, planner agent → generate implementation-plan.md (with `**Commit**` fields) |
| `/dev:impl` | Execute one Task (auto-invokes tdd-specialist + code-reviewer). Commits via plan's `**Commit**` field after each Task. |
| `/dev:review` | Final full review (code-reviewer + security-reviewer in parallel). Review fixes go in separate commits. |
| `/dev:verify` | Verification gates (build → type-check → lint → test → security) |
| `/dev:docs` | Generate reference doc (`docs/specs/<name>.md`) from implemented harness files + commit. Run before `/dev:pr`. |
| `/dev:pr` | Push branch + create GitHub PR (publish-only). PR title/body from plan Commit fields + `.harness/templates/pr-body.md`. |
| `/dev:done` | Archive planning artifacts to `done/`, remove topic from dev-context.json. Requires `pr:created` state. |
| `/dev:topic` | Check active topics + backlog list, or switch active topics (`/dev:topic switch <name>`) |
| `/harness:learn` | Extract session patterns → save to skills/learned/ |

## Agents

| Agent | Model | Auto-activate |
|-------|-------|---------------|
| planner | opus | On complex feature requests |
| tdd-specialist | opus | During /dev:impl |
| code-reviewer | opus | Immediately after writing code, after each /dev:impl Task |
| security-reviewer | sonnet | During /dev:review, before commits |
| architect | opus | On architectural decisions |
| build-error-resolver | sonnet | On build failures |
| doc-updater | sonnet | After implementation completes |
| refactor-cleaner | sonnet | During maintenance |

## Automation Hooks

| Timing | Hook | Action |
|--------|------|--------|
| Session start | SessionStart | Load dev-context.json, restore previous context |
| After `.ts` edit | PostToolUse | Type check + Prettier format |
| After any tool | PostToolUse (async) | Record session log (sessions/<date>.jsonl) |
| Before `git push` | PreToolUse | Display checklist reminder |
| Session end | Stop | Audit console.log + persist memory |

## Document Versioning

All component files (agents, skills, commands, rules) carry an integer `version` field in their YAML frontmatter.

```yaml
---
version: 1          # integer, starts at 1, increments by 1 on each edit
---
```

When modifying any component file, increment `version` by 1 before saving.

## Asking Questions

When asking the user a question — whether for clarification, approval, or exploration — always use the `AskUserQuestion` tool. Always include a recommendation as the first option, labeled with `(Recommended)`.

- Apply to all question types: confirmations, approach selection, clarifications
- Never ask a question as plain text when a choice is involved
- If only one natural answer exists, still offer it as the recommended option with a brief alternative

## Language Rules

- Documentation, comments, commit messages: **Korean**
- Code identifiers (variables, functions, file names, directory names): **English**
- Component files (agents, skills, commands, rules): **English**

## Git Rules

- Branch strategy: `main` (production), `develop` (integration), `feature/` for features, `fix/` for fixes
- Commit style: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- PR target: `main`

## .harness/ Directory

`.harness/` contains shared infrastructure used by both Claude Code and Codex.

| Path | Role |
|------|------|
| `.harness/rules/` | **Shared rules** (Claude + Codex). `coding-style.md`, `git-workflow.md`, `testing.md`, `security.md`, `typescript/`. Claude-only rules remain in `.claude/rules/common/`. |
| `.harness/commit-scopes.md` | **Project-specific commit scope list**. `plan-review` uses this for Commit field validation (warning level). When copying this harness to another project, replace this file with the target project's scope table. |
| `.harness/contracts/` | Exchange document format specs (spec-review, plan-review, implementation-plan). |
| `.harness/templates/` | Reusable templates (e.g., `pr-body.md` for `/dev:pr`). |
| `.harness/scripts/` | CLI scripts (`dev-context.js` — topic lifecycle state manager). |

## references/ Directory

`references/` contains external documents and projects for reference when building the harness. Treat as **read-only** — do not modify or directly import.

| Directory | Description |
|-----------|-------------|
| `references/everything-claude-code/` | Claude Code plugin reference. Provides agents, skills, commands, hooks, rules, mcp-configs structure and battle-tested workflows. |
| `references/sample-claude-env/` | Sample from a previous project. Contains documentation structure (docs, guides, specs, onboarding) and Codex review prompts. |

## Adding New Components

- **Agent**: `.claude/agents/<name>.md` — YAML frontmatter (version, name, description, tools, model) + instructions
- **Skill**: `.claude/skills/<name>/SKILL.md` — YAML frontmatter (version, name, description, origin) + content
- **Command**: `.claude/commands/<name>.md` — YAML frontmatter (version, description) + execution flow
- **Shared Rule**: `.harness/rules/<name>.md` or `.harness/rules/typescript/<name>.md` — YAML frontmatter (version) + rules (Claude + Codex 공유; coding-style, git-workflow, testing, security, typescript)
- **Claude Rule**: `.claude/rules/common/<name>.md` — YAML frontmatter (version) + rules (Claude Code 운영 규칙: agents, performance, development-workflow, component-boundaries. Codex가 맥락 파악 목적으로 일부 참조 가능)

Always start with `version: 1` in the frontmatter.
