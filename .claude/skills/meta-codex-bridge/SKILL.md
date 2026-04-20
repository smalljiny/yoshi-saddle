---
version: 7
name: meta-codex-bridge
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

- **`greadlink`** (GNU `realpath` 대안): `brew install coreutils` 로 설치 가능.
  미설치 시 `python3` 폴백이 자동 사용되므로 macOS 기본 설치에서도 동작한다.
- **`gtimeout`** (GNU `timeout` 대안): `brew install coreutils` 로 설치 가능.
  미설치 시 `timeout`(Linux 기본) 또는 no-op 폴백으로 자동 선택된다.
  timeout 없이 실행하면 Codex 자체 실행 제한에 의존한다.

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

## Path Validation (Required Before Invocation)

Before using any path in `codex exec` arguments or `find` calls, enforce repo-relative
containment using canonicalization:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
SPEC_PATH="<value-from-dev-context>"

# Reject empty, absolute (/…), traversal (../ or /..), control chars, leading dash
if [ -z "$SPEC_PATH" ] || \
   echo "$SPEC_PATH" | grep -qE '(^/|^\-|\.\.|[[:cntrl:]])'; then
  echo "UNSAFE path rejected: $SPEC_PATH" >&2
  exit 1
fi

# Canonicalize and confirm it stays inside the repo root
# macOS: greadlink -f (brew coreutils) preferred; python3 fallback for default installs
# Note: both greadlink and python3 resolve symlinks (stricter than --no-symlinks)
if command -v greadlink >/dev/null 2>&1; then
  CANON_PATH="$(greadlink -f "$REPO_ROOT/$SPEC_PATH" 2>/dev/null)"
elif command -v python3 >/dev/null 2>&1; then
  CANON_PATH="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$REPO_ROOT/$SPEC_PATH")"
else
  echo "Neither greadlink nor python3 available for path canonicalization" >&2; exit 1
fi
case "$CANON_PATH" in
  "$REPO_ROOT"/*) ;;   # OK: inside repo
  *) echo "Path escapes repo root: $SPEC_PATH" >&2; exit 1 ;;
esac
```

This prevents:
- Absolute paths (e.g. `/tmp/spec.md`)
- Directory traversal (e.g. `../../outside`)
- Control characters and leading dash

Note: shell metacharacter injection (`"`, `$`, `` ` ``, `;`) is mitigated by double-quoting
at all call sites, not by this regex.

Use `$CANON_PATH` in subsequent `codex exec` and `find` calls.

---

## Invocation Pattern

### spec-review

```bash
# Validate path first (see "Path Validation" above)
SPEC_PATH="docs/_local/active/my-topic/spec.md"

# macOS: gtimeout (brew coreutils) preferred; falls back to timeout (Linux); no-op if absent
# Use explicit if/else — ${VAR:+...} word-splitting is unreliable in zsh
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 120 codex exec "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘"
else
  codex exec "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘"
fi
```

### plan-review

```bash
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 120 codex exec "plan-review 스킬을 실행해줘"
else
  codex exec "plan-review 스킬을 실행해줘"
fi
```

`plan-review` reads `current_topic` and `plan` from `dev-context.json` (or `DEV_CONTEXT_PATH`
if set) to locate the target plan file — no explicit path argument is needed.

### Isolation via DEV_CONTEXT_PATH

To run experiments without mutating the active development topic, point `DEV_CONTEXT_PATH`
to a fixture dev-context file inside the repo (e.g. `docs/_local/.../fixture/`):

```bash
# Validate fixture path before use
DEV_CONTEXT_PATH="docs/_local/active/codex-skill-bridge/fixture/fixture-dev-context.json"
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
if [ -n "$TIMEOUT_BIN" ]; then
  DEV_CONTEXT_PATH="$DEV_CONTEXT_PATH" "$TIMEOUT_BIN" 120 codex exec "..."
else
  DEV_CONTEXT_PATH="$DEV_CONTEXT_PATH" codex exec "..."
fi
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

To avoid accepting a stale review artifact, record the invocation start time and require
a new file created after that point:

```bash
# Set pattern: spec-review → 'spec-review-*.md' / plan-review → 'plan-review-*.md'
PATTERN='spec-review-*.md'
REVIEW_DIR="$CANON_PATH_DIR"   # use canonicalized path from Path Validation above

# Record start time before invoking codex exec
INVOKE_START=$(date +%s)

# --- run codex exec here ---
codex exec "spec-review 스킬로 ${SPEC_PATH}를 리뷰해줘"
EXEC_EXIT=$?

# Find review files created AFTER the invocation start (freshness check)
REVIEW_FILE=$(find "$REVIEW_DIR" -maxdepth 1 -name "$PATTERN" -newer /proc/1/exe \
  -print0 2>/dev/null | sort -rz | head -zn1 | tr -d '\0')
# macOS alternative (no /proc): use a temp reference file
# TMP_REF=$(mktemp); touch -t "$(date -r $INVOKE_START '+%Y%m%d%H%M.%S')" "$TMP_REF" 2>/dev/null
# REVIEW_FILE=$(find "$REVIEW_DIR" -maxdepth 1 -name "$PATTERN" -newer "$TMP_REF" ...)

# Guard: require exactly one new artifact from this invocation
if [ -z "$REVIEW_FILE" ]; then
  echo "No new review file found after codex exec (exit=$EXEC_EXIT) — stale or missing" >&2
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
| `timeout` not found (macOS) | `TIMEOUT_BIN` 선택 로직이 자동 폴백 처리. `gtimeout`(brew coreutils) 또는 `timeout`(Linux) 순으로 탐색; 둘 다 없으면 timeout 없이 실행 |
| `codex exec ...` exits non-zero | Record exit code, show manual fallback |
| `codex exec` exits 0 but no review file generated | Record observation (sandbox policy may block write), show manual fallback |
| Timeout (120s elapsed) | Record timeout, consider increasing threshold or checking sandbox settings |

**Manual fallback** (interactive session — shown when bridge cannot proceed):

```bash
# Interactive Codex session (manual review, not automated)
codex "spec-review 스킬로 <spec-path>를 리뷰해줘"
# or
codex "plan-review 스킬을 실행해줘"
```

**⚠ `-a always` 사용 주의**: `codex exec -a always ...`는 모든 작업 승인을 자동화하며
sandbox 보호를 사실상 무력화합니다. 실험 목적 외 프로덕션 코드에 사용 금지.
문제 발생 시 먼저 stdout/stderr를 확인하고, 필요 최소 권한만 허용하세요.

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
   Observe: if no review file is generated despite exit 0, check whether `workspace-write`
   covers the target review directory. Do NOT use `-a always` (disables all safeguards).
   Instead, investigate which specific file path Codex is trying to write and adjust the
   sandbox profile to allow only that path.
