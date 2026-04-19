---
version: 2
name: codex-skill-bridge
description: Prototype feasibility spike — do NOT load this skill for general use. This skill should be used only when explicitly testing whether Claude can invoke Codex spec-review or plan-review via the codex exec non-interactive CLI and read the resulting review files. Use it to run the bridge experiment or verify codex exec availability. Do not trigger for normal spec or plan authoring tasks.
origin: harness
---

# codex-skill-bridge

> **Prototype / Feasibility Spike** — This skill is not production-ready. Its purpose is to
> determine whether `codex exec` can invoke Codex review skills (spec-review, plan-review)
> from within Claude's Bash environment and whether the generated review files can be read
> and parsed. Integration into `/dev:spec` and `/dev:plan` is out of scope here.
>
> **Note**: `codex -p` is the `--profile` flag (selects a config.toml profile), NOT a
> print/non-interactive mode. The correct non-interactive command is `codex exec`.

## Non-Goals

The following are explicitly **out of scope** for this skill:

- Modifying `/dev:spec` or `/dev:plan` commands
- Using `codex-companion.mjs` or adversarial-review infrastructure
- Calling any Codex skill other than `spec-review` and `plan-review`
- Automatically editing spec or plan documents based on review output

---

## Prerequisites

- **GNU coreutils** required for `timeout` on macOS: `brew install coreutils`
  (provides `gtimeout`; set `alias timeout=gtimeout` or use `gtimeout` directly)
- Alternative: omit `timeout` and rely on Codex's own execution limits, or use a
  Node.js-based timeout wrapper

---

## Availability Gate

Before invoking `codex exec`, verify Codex is available and authenticated:

```bash
node .harness/scripts/dev-context.js read --field=config.codex.available
node .harness/scripts/dev-context.js read --field=config.codex.authenticated
```

If either returns a value other than `"true"`:
1. Print a warning: `Codex not available or not authenticated — bridge cannot proceed.`
2. Show the manual fallback command (see "Fallback" section below)
3. Exit the skill without invoking `codex exec`

---

## Invocation Pattern

### spec-review

```bash
timeout 120 codex exec "spec-review 스킬로 <full-repo-relative-spec-path>를 리뷰해줘"
```

Example:
```bash
timeout 120 codex exec "spec-review 스킬로 docs/_local/active/my-topic/spec.md를 리뷰해줘"
```

### plan-review

```bash
timeout 120 codex exec "plan-review 스킬을 실행해줘"
```

`plan-review` reads `current_topic` and `plan` from `dev-context.json` (or `DEV_CONTEXT_PATH`
if set) to locate the target plan file — no explicit path argument is needed.

### Isolation via DEV_CONTEXT_PATH

To run experiments without mutating the active development topic, point `DEV_CONTEXT_PATH`
to a fixture dev-context file:

```bash
DEV_CONTEXT_PATH=<path-to-fixture-dev-context.json> timeout 120 codex exec "..."
```

The fixture `dev-context.json` must contain:
- `current_topic` set to a fixture topic name (e.g. `"test-fixture"`)
- `topics["test-fixture"].spec` — full repo-relative path to a fixture spec file
- `topics["test-fixture"].plan` — full repo-relative path to a fixture plan file
- `topics["test-fixture"].phase: "plan"`, `status: "reviewing"` (for plan-review to safely
  transition to either `plan:confirmed` or `plan:ready`)

---

## Review File Location

After `codex exec` completes, the Codex review skill writes the review artifact:

| Skill | Path pattern |
|-------|-------------|
| spec-review | `<spec-file-dir>/spec-review-<YYMMDDHHmmss>.md` |
| plan-review | `<plan-file-dir>/plan-review-<YYMMDDHHmmss>.md` |

**Bridge is read-only**: The bridge skill never writes review files. Review artifact
persistence and `dev-context.json` field updates are owned exclusively by the Codex review
skills.

---

## Parsing the Decision

To extract the decision from the generated review file:

```bash
# Find the most recent review file (verified against spec-review output format)
REVIEW_FILE=$(find <review-dir> -maxdepth 1 -name 'spec-review-*.md' -print0 \
  2>/dev/null | sort -rz | head -zn1 | tr -d '\0')

# Guard against missing file
if [ -z "$REVIEW_FILE" ]; then
  echo "No review file found — codex exec may not have triggered the skill"
  exit 1
fi

# Parse the decision line (case-sensitive: READY / READY WITH NOTE / NOT READY)
grep -m1 "^- Decision:" "$REVIEW_FILE"
```

Decision line format (from existing review files): `- Decision: READY` / `- Decision: NOT READY` / `- Decision: READY WITH NOTE`

---

## Failure Handling

| Failure mode | Action |
|---|---|
| `config.codex.available != "true"` | Print warning, show manual fallback, exit |
| `config.codex.authenticated != "true"` | Print warning, show manual fallback, exit |
| `timeout` not found (macOS) | Install GNU coreutils or use `gtimeout` |
| `codex exec ...` exits non-zero | Record exit code, show manual fallback |
| `codex exec` exits 0 but no review file generated | Record observation (sandbox policy may block write), show manual fallback |
| Timeout (120s elapsed) | Record timeout, consider increasing threshold or checking sandbox settings |

**Manual fallback** (shown when bridge cannot proceed):

```
Manual fallback — run Codex directly:
  codex "spec-review 스킬로 <spec-path>를 리뷰해줘"
  # or
  codex "plan-review 스킬을 실행해줘"
```

---

## Open Questions (to answer during the spike experiment)

1. **Does `codex exec` correctly trigger the spec-review and plan-review Codex skills?**
   Observe: does the skill load and produce the expected review file?

2. **Is 120 seconds a sufficient timeout?**
   Observe: actual wall-clock duration of `codex exec` for both skills.

3. **What does `codex exec` write to stdout?**
   Observe: is stdout empty, contains progress messages, or contains the full review output?
   This determines whether stdout can serve as a fallback parsing source.

4. **Does `codex exec` sandbox policy allow the review skill to write files?**
   Observe: if no review file is generated despite exit 0, the default sandbox (`workspace-write`)
   restriction may need to be explicitly allowed via `codex exec -a always ...` or similar.
