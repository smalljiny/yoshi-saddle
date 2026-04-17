---
version: 1
description: Check whether the local Codex CLI is ready and update the codex status cache in dev-context.json. Wraps the plugin /codex:setup and adds harness cache refresh.
category: codex-workflow
---

# /codex:setup

Check codex CLI availability, authentication status, and optionally toggle the stop-time review gate. After completing the standard setup check, updates `config.codex.*` in `dev-context.json` so harness commands (e.g., `/dev:review` adversarial-review) can read codex availability without re-running setup.

## Notes: Command Precedence

This file (`.claude/commands/codex/setup.md`) is a harness-local command that **shadows** the plugin-provided `/codex:setup`. Claude Code loads `.claude/commands/` before plugin commands, so this wrapper is the single entry point for `/codex:setup` in this repo.

The wrapper preserves all original plugin behavior by re-executing the companion script directly in Step 1.

## Execution Flow

### 1. Run codex companion setup (original behavior)

Find the latest companion script using the same glob + semver logic as `session-start.js`:
- Glob: `~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs`
- Sort version directories by semver descending, pick the first match

Run:
```bash
node <companion-path> setup --json $ARGUMENTS
```

Parse and display the result to the user (same output as the original plugin command):
- Show codex version, auth status, session runtime, review gate status
- If `--enable-review-gate` or `--disable-review-gate` is passed, the companion handles it

If the companion is not found:
```
⚠ codex companion을 찾을 수 없습니다.
codex가 설치되어 있는지 확인하세요: npm install -g @openai/codex
```
Then write `config.codex.available=false` to dev-context and stop.

### 2. Update codex cache in dev-context.json

After Step 1 completes (regardless of result), update `config.codex.*` using the parsed JSON output from the companion. Apply the same field mapping as `detectAndCacheCodex()` in `session-start.js`:

| Field | Source |
|---|---|
| `config.codex.available` | `result.ready && result.codex?.available` |
| `config.codex.authenticated` | `result.auth?.loggedIn && result.auth?.verified` |
| `config.codex.version` | `result.codex?.detail ?? ""` |
| `config.codex.checked_at` | `new Date().toISOString()` |

Write each field via:
```bash
node .harness/scripts/dev-context.js set-field --field=config.codex.<key> --value=<value>
```

If dev-context.json does not exist or `dev-context.js` is unavailable, skip cache update silently (do not block the user).

Show completion:
```
codex 상태가 dev-context.json에 갱신되었습니다.
  available:      <true|false>
  authenticated:  <true|false>
  version:        <version>
  checked_at:     <ISO 8601>
```
