---
version: 6
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
/dev:spec → /dev:plan → /dev:impl (repeat) → /dev:review → /dev:verify → /dev:done → PR
```

| Command | Role |
|---------|------|
| `/dev:spec <name>` | Write spec draft (brainstorming skill) → save to `backlog/`, run Codex review loop |
| `/dev:plan [<name>]` | Select from backlog or specify topic → move to `active/`, register in dev-context.json, planner agent → generate implementation-plan.md |
| `/dev:impl` | Execute one Task (auto-invokes tdd-specialist + code-reviewer) |
| `/dev:review` | Final full review (code-reviewer + security-reviewer in parallel) |
| `/dev:verify` | Verification gates (build → type-check → lint → test → security) |
| `/dev:done` | Complete current topic → generate reference doc to `docs/specs/`, archive to `done/`, clean up dev-context.json |
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

### File Pairing

Every component exists as a pair:

| File | Language | Role |
|------|----------|------|
| `<name>.md` | English | **Authoritative.** Claude Code reads and executes this file. |
| `<name>.ko.md` | Korean | **Translation.** For human readers. Never executed by Claude Code. |

### Edit Order (MANDATORY)

**Always modify `.md` first. Never modify `.ko.md` before its paired `.md`.**

```
CORRECT:  edit .md  →  increment version  →  (later) sync .ko.md
WRONG:    edit .ko.md  →  then edit .md
```

If a change is needed, write it in English first. The Korean translation follows.

### Version Rules

1. **New file** — both `.md` and `.ko.md` start at `version: 1`.
2. **Editing `.md`** — increment `version` by 1. The `.ko.md` becomes stale.
3. **Syncing `.ko.md`** — translate the changes, then set `version` to match the `.md`.
4. **Never edit `.ko.md` version independently** — it only moves when syncing to the `.md`.

### Stale Detection

A `.ko.md` is **stale** when its `version` is less than the paired `.md`.

```
planner.md      version: 3   ← authoritative (modified twice since last sync)
planner.ko.md   version: 1   ← stale by 2 versions
```

To check all stale pairs:

```bash
python3 .claude/scripts/check-versions.py
```

### What Claude Code Must Do

When modifying any `.md` component file:
1. Increment `version` in the frontmatter before saving.
2. Do **not** touch the `.ko.md` — leave it stale.
3. Note the stale file in the commit message or work summary if relevant.

When asked to sync a `.ko.md`:
1. Read the current `.md` and its `version`.
2. Translate all changed content into Korean.
3. Set `version` in the `.ko.md` to match the `.md`.
4. Do **not** change anything else in the `.ko.md` frontmatter.

### Example Lifecycle

```
── Initial creation ──────────────────────────────────
planner.md      version: 1
planner.ko.md   version: 1   (in sync)

── English edited (added a new section) ──────────────
planner.md      version: 2   ← incremented
planner.ko.md   version: 1   ← stale

── Korean synced ─────────────────────────────────────
planner.md      version: 2
planner.ko.md   version: 2   (in sync again)
```

## Language Rules

- Documentation, comments, commit messages: **Korean**
- Code identifiers (variables, functions, file names, directory names): **English**
- Component files (agents, skills, commands, rules): **`.md` in English, `.ko.md` in Korean**

## Git Rules

- Branch strategy: `main` (production), `develop` (integration), `feature/` for features, `fix/` for fixes
- Commit style: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- PR target: `main`

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
- **Rule**: `.claude/rules/common/<name>.md` or `.claude/rules/typescript/<name>.md` — YAML frontmatter (version) + rules

Always create both `.md` (English) and `.ko.md` (Korean) versions with matching `version: 1`.
