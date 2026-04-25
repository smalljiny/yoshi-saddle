#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-harness.sh [options] <target-dir>

Options:
  --dry-run     Show what would be copied without writing files.
  --no-backup   Do not create a timestamped backup before copying.
  --skip-gitignore
                Do not add harness local-file ignores to target .gitignore.
  -h, --help    Show this help.

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
    printf '%s\n' "$input"
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
    rsync "${COMMON_RSYNC_OPTS[@]}" ${extra_opts[@]+"${extra_opts[@]}"} --dry-run --itemize-changes "$source" "$TARGET_DIR/"
  else
    rsync "${COMMON_RSYNC_OPTS[@]}" ${extra_opts[@]+"${extra_opts[@]}"} "$source" "$TARGET_DIR/"
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

[ -n "$TARGET_INPUT" ] || {
  usage >&2
  exit 1
}

require_rsync

SCRIPT_DIR="$(resolve_script_dir)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
TARGET_DIR="$(make_absolute_path "$TARGET_INPUT")"

case "$TARGET_DIR/" in
  "$SOURCE_DIR/"|"$SOURCE_DIR"/*)
    die "target directory must not be the harness repository or a child of it: $TARGET_DIR"
    ;;
esac

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_DIR="$TARGET_DIR/.harness-backups/harness-deploy-$TIMESTAMP"

COMMON_RSYNC_OPTS=(
  -a
  --exclude='.DS_Store'
  --exclude='.claude/sessions/'
  --exclude='.claude/settings.local.json'
  --exclude='.claude/checkpoints.log'
)

ITEMS=(
  AGENTS.md
  CLAUDE.md
  .claude
  .codex
  .harness
)

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
  if [ "$item" = ".harness" ] && [ -f "$TARGET_DIR/.harness/commit-scopes.md" ]; then
    info "preserving existing .harness/commit-scopes.md (target-specific)"
    copy_item "$item" --exclude='commit-scopes.md'
  else
    copy_item "$item"
  fi
done

if [ "$UPDATE_GITIGNORE" -eq 1 ]; then
  update_gitignore
else
  info ".gitignore update: skipped"
fi

info "done"
