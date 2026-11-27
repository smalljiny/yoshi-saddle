---
version: 3
description: Check whether the local Codex CLI is ready and update the codex status cache in dev-context.json. Wraps the plugin /codex:setup and adds harness cache refresh.
category: codex-workflow
---

# /codex:setup

Check codex CLI availability, authentication status, and optionally toggle the stop-time review gate. After completing the standard setup check, updates `config.codex.*` in `dev-context.json` so harness commands (e.g., `/dev:review` adversarial-review) can read codex availability without re-running setup.

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.harness/i18n/<lang>/commands/codex/setup.md` for the chosen language and `.harness/i18n/en/commands/codex/setup.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

## Notes: Command Precedence

This file (`.claude/commands/codex/setup.md`) is a harness-local command that **shadows** the plugin-provided `/codex:setup`. Claude Code loads `.claude/commands/` before plugin commands, so this wrapper is the single entry point for `/codex:setup` in this repo.

The wrapper preserves all original plugin behavior by re-executing the companion script directly in Step 1.

## Notes: Single Source of Truth

All codex detection logic (companion glob, semver sorting, containment validation, field mapping, TTL cache, silent failure) lives exclusively in `.claude/scripts/codex/detect-and-cache.js`. Both this command and `session-start.js` delegate to that script — do not duplicate the logic here.

## Execution Flow

### 1. Run codex companion setup (original behavior)

Find the companion using the detect-and-cache script's logic, then run:
```bash
node "$(node -e "
const {existsSync,readdirSync}=require('fs');
const {join,resolve,sep}=require('path');
const {homedir}=require('os');
const base=join(homedir(),'.claude/plugins/cache/openai-codex/codex');
if(!existsSync(base)){process.exit(1);}
const vs=readdirSync(base,{withFileTypes:true})
  .filter(d=>d.isDirectory()&&/^\d+\.\d+\.\d+$/.test(d.name))
  .map(d=>d.name)
  .sort((a,b)=>{const pa=a.split('.').map(Number),pb=b.split('.').map(Number);for(let i=0;i<3;i++){if((pb[i]??0)!==(pa[i]??0))return(pb[i]??0)-(pa[i]??0);}return 0;});
if(!vs.length){process.exit(1);}
const p=join(base,vs[0],'scripts/codex-companion.mjs');
if(!resolve(p).startsWith(resolve(base)+sep)||!existsSync(p)){process.exit(1);}
process.stdout.write(p);
")" setup --json "$ARGUMENTS"
```

If the companion is not found, print the warning {{msg:COMPANION_NOT_FOUND}}.

Display the companion output to the user (same as original plugin command behavior).

### 2. Refresh codex cache in dev-context.json

Run the shared detection script with `--force` to bypass TTL and write the latest state:

```bash
node .claude/scripts/codex/detect-and-cache.js --force
```

This script handles all field mapping, containment validation, and silent failure — no duplication needed here.

Show completion: {{msg:CACHE_UPDATED}}

Read and display the updated values:
```bash
node .harness/scripts/dev-context.js read --field=config.codex.available
node .harness/scripts/dev-context.js read --field=config.codex.authenticated
node .harness/scripts/dev-context.js read --field=config.codex.version
node .harness/scripts/dev-context.js read --field=config.codex.checked_at
```
