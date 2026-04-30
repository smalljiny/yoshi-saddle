#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-harness.sh [options] [<target-dir>]

Options:
  --dry-run     Show what would be copied without writing files.
  --no-backup   Do not create a timestamped backup before copying.
  --skip-gitignore
                Do not add harness local-file ignores to target .gitignore.
  -h, --help    Show this help.

Modes:
  No target-dir (self-sync):
    Syncs src/ → repo root. Overwrites all items including CLAUDE.md,
    AGENTS.md, and .harness/commit-scopes.md. No backup is created.

  With target-dir (external):
    Deploys harness to an external project directory. CLAUDE.md, AGENTS.md,
    and .harness/commit-scopes.md are skipped when the target already has them.

Deploys the harness files needed by Claude Code and Codex:
  AGENTS.md
  CLAUDE.md
  .claude/
  .codex/
  .harness/

The script intentionally does not deploy local/session data such as:
  .claude/sessions/
  .claude/settings.local.json
  docs/_local/
  node_modules/
  references/
EOF
}

die() {
  printf 'deploy-harness: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '[deploy-harness] %s\n' "$*"
}

resolve_script_dir() {
  local script_path="$0"
  local link_dir

  while [ -L "$script_path" ]; do
    link_dir="$(cd "$(dirname "$script_path")" && pwd -P)"
    script_path="$(readlink "$script_path")"
    case "$script_path" in
      /*) ;;
      *) script_path="$link_dir/$script_path" ;;
    esac
  done

  cd "$(dirname "$script_path")" && pwd -P
}

require_rsync() {
  command -v rsync >/dev/null 2>&1 || die "rsync is required but was not found"
}

make_absolute_path() {
  local input="$1"
  local parent
  local base

  case "$input" in
    /*) ;;
    *) input="$PWD/$input" ;;
  esac

  if [ -d "$input" ]; then
    cd "$input" && pwd -P
    return
  fi

  parent="$(dirname "$input")"
  base="$(basename "$input")"
  if [ -d "$parent" ]; then
    printf '%s/%s\n' "$(cd "$parent" && pwd -P)" "$base"
  else
    die "target path cannot be resolved: parent directory does not exist: $parent"
  fi
}

backup_existing() {
  local rel="$1"
  local source="$TARGET_DIR/$rel"

  [ "$BACKUP_ENABLED" -eq 1 ] || return 0
  [ "$DRY_RUN" -eq 0 ] || return 0
  [ -e "$source" ] || return 0

  mkdir -p "$BACKUP_DIR"
  rsync "${COMMON_RSYNC_OPTS[@]}" "$source" "$BACKUP_DIR/"
}

copy_item() {
  local rel="$1"
  local source="$SOURCE_DIR/$rel"
  shift
  local extra_opts=("$@")

  [ -e "$source" ] || die "source item is missing: $rel"

  backup_existing "$rel"
  if [ "$DRY_RUN" -eq 1 ]; then
    rsync "${COMMON_RSYNC_OPTS[@]}" "${SYNC_RSYNC_OPTS[@]}" ${extra_opts[@]+"${extra_opts[@]}"} --dry-run --itemize-changes "$source" "$TARGET_DIR/"
  else
    rsync "${COMMON_RSYNC_OPTS[@]}" "${SYNC_RSYNC_OPTS[@]}" ${extra_opts[@]+"${extra_opts[@]}"} "$source" "$TARGET_DIR/"
  fi
}

update_gitignore() {
  local gitignore_path="$TARGET_DIR/.gitignore"
  local marker="# BEGIN harness local ignores"

  if [ -f "$gitignore_path" ] && grep -Fq "$marker" "$gitignore_path"; then
    info ".gitignore already has harness ignore block"
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    info "would append harness ignore block to .gitignore"
    return 0
  fi

  backup_existing ".gitignore"
  touch "$gitignore_path"
  cat >>"$gitignore_path" <<'EOF'

# BEGIN harness local ignores
.harness-backups/
.claude/sessions/
.claude/checkpoints.log
.claude/settings.local.json
docs/_local/
# END harness local ignores
EOF
  info "updated .gitignore"
}

DRY_RUN=0
BACKUP_ENABLED=1
UPDATE_GITIGNORE=1
TARGET_INPUT=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --no-backup)
      BACKUP_ENABLED=0
      ;;
    --skip-gitignore)
      UPDATE_GITIGNORE=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      [ -z "$TARGET_INPUT" ] || die "only one target directory can be provided"
      TARGET_INPUT="$1"
      ;;
  esac
  shift
done

require_rsync

SCRIPT_DIR="$(resolve_script_dir)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
SOURCE_DIR="$REPO_DIR/src"

[ -d "$SOURCE_DIR" ] || die "src/ layout not found at $SOURCE_DIR — run this from the harness root after Task 1"

if [ -z "$TARGET_INPUT" ]; then
  MODE=self-sync
  TARGET_DIR="$REPO_DIR"
  BACKUP_ENABLED=0
else
  MODE=external
  TARGET_DIR="$(make_absolute_path "$TARGET_INPUT")"

  # Block: target == src/ itself or a subdirectory of src/
  case "$TARGET_DIR/" in
    "$SOURCE_DIR/"*)
      die "external mode: target must not be src/ itself or a subdirectory: $TARGET_DIR"
      ;;
  esac
  # Block: src/ would be under target (i.e., target is repo root or an ancestor)
  case "$SOURCE_DIR/" in
    "$TARGET_DIR/"*)
      die "external mode: target must not contain the src/ directory: $TARGET_DIR"
      ;;
  esac
  # Block: target is inside the harness repository (sibling directories etc.)
  case "$TARGET_DIR/" in
    "$REPO_DIR/"*)
      die "external mode: target must not be inside the harness repository: $TARGET_DIR"
      ;;
  esac
fi

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_DIR="$TARGET_DIR/.harness-backups/harness-deploy-$TIMESTAMP"

COMMON_RSYNC_OPTS=(
  -a
  --exclude='.DS_Store'
  --exclude='.claude/sessions/'
  --exclude='.claude/settings.local.json'
  --exclude='.claude/checkpoints.log'
)

# rsync options for src→target sync (copy_item only — not used by backup_existing).
# --delete removes destination files that no longer exist in source,
# preventing stale artifacts (e.g., after a skill rename) from accumulating.
SYNC_RSYNC_OPTS=(--delete)

ITEMS=(
  AGENTS.md
  CLAUDE.md
  .claude
  .codex
  .harness
)

info "mode: $MODE"
info "source: $SOURCE_DIR"
info "target: $TARGET_DIR"

if [ "$DRY_RUN" -eq 1 ]; then
  info "dry run: no files will be written"
else
  mkdir -p "$TARGET_DIR"
  if [ "$BACKUP_ENABLED" -eq 1 ]; then
    info "backup: $BACKUP_DIR"
  else
    info "backup: disabled"
  fi
fi

for item in "${ITEMS[@]}"; do
  info "copying $item"
  if [ "$MODE" = "external" ]; then
    case "$item" in
      CLAUDE.md|AGENTS.md)
        if [ -f "$TARGET_DIR/$item" ]; then
          info "  skip: target has $item (external preserve)"
          continue
        fi
        ;;
      .harness)
        if [ -f "$TARGET_DIR/.harness/commit-scopes.md" ]; then
          info "  preserving target .harness/commit-scopes.md"
          copy_item "$item" --exclude='commit-scopes.md'
          continue
        fi
        ;;
    esac
  fi
  copy_item "$item"
done

if [ "$UPDATE_GITIGNORE" -eq 1 ] && [ "$MODE" = "external" ]; then
  update_gitignore
else
  if [ "$UPDATE_GITIGNORE" -eq 0 ]; then
    info ".gitignore update: skipped"
  fi
fi

info "done"
