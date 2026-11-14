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

# rsync 가 있으면 기존 rsync 경로를, 없으면(예: Windows Git Bash) cp 대체 경로를 쓴다.
detect_copy_tool() {
  if command -v rsync >/dev/null 2>&1; then
    COPY_TOOL=rsync
  else
    COPY_TOOL=cp
  fi
}

# cp 경로 전용: rsync 의 COMMON_RSYNC_OPTS 제외 규칙을 <transfer-root> 아래에서 재현한다.
# <transfer-root> 는 rsync 전송 루트(복사 대상 항목의 부모 디렉토리)에 해당한다.
# extra basename 은 rsync 의 앵커 없는 --exclude 처럼 깊이와 무관하게 지운다.
# 이 함수는 임시 stage 디렉토리와 새로 만든 백업 디렉토리 안에서만 호출한다 —
# 대상 디렉토리에 호출하면 사용자 데이터(sessions 등)가 지워진다.
apply_excludes() {
  local root="$1"
  shift
  local name

  # 대상의 .claude 가 symlink 이면 BSD cp -a 는 백업에 링크 그대로 복사한다. 그 링크를 거쳐
  # 지우면 원본 sessions 등이 삭제되므로, 링크인 경우 고정 제외 처리를 건너뛴다 (링크만 백업됨).
  if [ ! -L "$root/.claude" ]; then
    rm -rf "$root/.claude/sessions" "$root/.claude/settings.local.json" "$root/.claude/checkpoints.log"
  fi
  find "$root" -name '.DS_Store' -prune -exec rm -rf {} +
  for name in "$@"; do
    find "$root" -name "$name" -prune -exec rm -rf {} +
  done
}

# cp 경로 copy_item: 원본을 임시 stage 에 복사해 그 안에서만 제외 대상을 지운 뒤
# 대상에 cp -a 로 덮어쓴다. 대상 쪽에서는 아무것도 지우지 않아 rsync 경로와 같은
# 보존 계약(sessions·settings.local.json·checkpoints.log·사용자 파일 유지)을 지킨다.
copy_item_cp() {
  local rel="$1"
  shift
  local source="$SOURCE_DIR/$rel"
  local name
  local opt
  local excludes=()
  local file

  name="$(basename "$rel")"
  for opt in "$@"; do
    case "$opt" in
      --exclude=*) excludes+=("${opt#--exclude=}") ;;
      *) die "cp fallback: unsupported copy option: $opt" ;;
    esac
  done

  STAGE_DIR="$(mktemp -d)"
  # source 끝에 '/' 를 붙이지 않는다 (BSD cp 는 끝 '/' 가 있으면 내용만 복사한다).
  cp -a "$source" "$STAGE_DIR/"
  apply_excludes "$STAGE_DIR" ${excludes[@]+"${excludes[@]}"}

  if [ "$DRY_RUN" -eq 1 ]; then
    while IFS= read -r file; do
      info "would copy: ${file#"$STAGE_DIR/"}"
    done < <(find "$STAGE_DIR/$name" -type f | LC_ALL=C sort)
  else
    cp -af "$STAGE_DIR/$name" "$TARGET_DIR/"
  fi

  rm -rf "$STAGE_DIR"
  STAGE_DIR=""
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

  # nested rel (예: .claude/agents/foo.md) 의 디렉토리 구조를 백업 안에서도 보존한다.
  # 그렇지 않으면 같은 basename 의 OBSOLETE 두 개가 백업에서 서로 덮어쓴다.
  # 디렉토리 rel (예: .claude) 의 경우에도 dest_parent 가 BACKUP_DIR 자체가 되어 동일한 결과.
  local dest_parent="$BACKUP_DIR/$(dirname "$rel")"
  mkdir -p "$dest_parent"
  if [ "$COPY_TOOL" = "cp" ]; then
    # 백업은 이번 실행이 새로 만든 디렉토리라 임시 stage 없이 백업 안에서 제외 대상을 지운다.
    cp -af "$source" "$dest_parent/"
    apply_excludes "$dest_parent"
    return 0
  fi
  rsync "${COMMON_RSYNC_OPTS[@]}" "$source" "$dest_parent/"
}

copy_item() {
  local rel="$1"
  local source="$SOURCE_DIR/$rel"
  shift
  local extra_opts=("$@")

  [ -e "$source" ] || die "source item is missing: $rel"

  backup_existing "$rel"
  if [ "$COPY_TOOL" = "cp" ]; then
    copy_item_cp "$rel" ${extra_opts[@]+"${extra_opts[@]}"}
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    rsync "${COMMON_RSYNC_OPTS[@]}" ${SYNC_RSYNC_OPTS[@]+"${SYNC_RSYNC_OPTS[@]}"} ${extra_opts[@]+"${extra_opts[@]}"} --dry-run --itemize-changes "$source" "$TARGET_DIR/"
  else
    rsync "${COMMON_RSYNC_OPTS[@]}" ${SYNC_RSYNC_OPTS[@]+"${SYNC_RSYNC_OPTS[@]}"} ${extra_opts[@]+"${extra_opts[@]}"} "$source" "$TARGET_DIR/"
  fi
}

update_gitignore() {
  local gitignore_path="$TARGET_DIR/.gitignore"
  local marker_begin="# BEGIN harness local ignores"

  # 기대하는 블록 내용 (BEGIN/END 마커 제외)
  local expected_inner
  expected_inner="$(cat <<'INNER'
.harness-backups/
.claude/sessions/
.claude/checkpoints.log
.claude/settings.local.json
.harness/.deploy-manifest.json
docs/_local/
INNER
)"

  # 현재 블록 상태 판별: 0=없음, 1=있지만 내용 다름, 2=최신
  local block_state=0
  if [ -f "$gitignore_path" ] && grep -Fq "$marker_begin" "$gitignore_path"; then
    local current_inner
    current_inner="$(awk '
      /^# BEGIN harness local ignores$/ { f=1; next }
      /^# END harness local ignores$/   { f=0; next }
      f { print }
    ' "$gitignore_path")"
    if [ "$current_inner" = "$expected_inner" ]; then
      block_state=2
    else
      block_state=1
    fi
  fi

  if [ "$block_state" -eq 2 ]; then
    info ".gitignore already has up-to-date harness block"
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    if [ "$block_state" -eq 1 ]; then
      info "would update harness ignore block in .gitignore (content changed)"
    else
      info "would append harness ignore block to .gitignore"
    fi
    return 0
  fi

  if [ "$block_state" -eq 1 ]; then
    backup_existing ".gitignore"
    node "$HELPER" strip-gitignore-block "$gitignore_path"
    info "stripped outdated harness block from .gitignore"
  else
    backup_existing ".gitignore"
  fi

  touch "$gitignore_path"
  cat >>"$gitignore_path" <<'EOF'

# BEGIN harness local ignores
.harness-backups/
.claude/sessions/
.claude/checkpoints.log
.claude/settings.local.json
.harness/.deploy-manifest.json
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

detect_copy_tool

SCRIPT_DIR="$(resolve_script_dir)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
SOURCE_DIR="$REPO_DIR/src"
# manifest helper 는 원본(src/)에서 읽는다. 루트 .harness/ 는 self-sync 결과물이라
# clone 직후에는 없으므로, 루트 사본을 쓰면 첫 실행이 스스로 시작될 수 없다.
HELPER="$SOURCE_DIR/.harness/scripts/deploy-manifest.js"

[ -d "$SOURCE_DIR" ] || die "src/ layout not found at $SOURCE_DIR — run this from the harness root after Task 1"

# 매니페스트 작성용 임시 파일 3종.
# CURRENT_FILES_LIST       : src/ 의 현재 모든 파일 (deploy-manifest.js list-src 결과)
# THIS_DEPLOY_SKIPPED_LIST : 이번 deploy 에서 손대지 않은 특수 파일 (CLAUDE.md/AGENTS.md/commit-scopes.md skip 케이스)
# MANIFEST_FILES_LIST      : 매니페스트의 files 필드에 기록할 파일 (= CURRENT − THIS_DEPLOY_SKIPPED)
#
# THIS_DEPLOY_SKIPPED ≠ OBSOLETE: SKIPPED 는 manifest.files 에서만 제외한다.
# OBSOLETE(Task 3 도입 예정) = PREV_MANIFEST.files − CURRENT 이며, skip 된 특수 파일은
# src/ 에 여전히 존재해 CURRENT 에 포함되므로 자동으로 OBSOLETE 에서 제외된다.
CURRENT_FILES_LIST="$(mktemp)"
THIS_DEPLOY_SKIPPED_LIST="$(mktemp)"
MANIFEST_FILES_LIST="$(mktemp)"
# OBSOLETE 계산용 임시 파일 (Task 3):
# PREV_FILES_LIST = 이전 매니페스트의 files 배열 (없으면 빈 파일)
# OBSOLETE_LIST   = PREV − CURRENT (이번 deploy 가 더 이상 설치하지 않는 파일)
PREV_FILES_LIST="$(mktemp)"
OBSOLETE_LIST="$(mktemp)"
# self-sync 모드에서 helper 자체 (.harness/scripts/deploy-manifest.js) 가 src/ 에서
# 제거된 경우 cleanup 이 그것을 OBSOLETE 로 분류해 삭제할 수 있다. 그러면 cleanup 후의
# manifest write 호출이 missing helper 로 실패한다. 마지막 write 호출에 사용할
# helper 의 임시 복사본을 미리 확보해 mid-sync 실패를 차단한다 (A3).
# Node 가 ESM 으로 인식하도록 .js 확장자가 필요하므로 임시 디렉토리에 그 이름으로 복사한다.
TEMP_HELPER_DIR="$(mktemp -d)"
TEMP_WRITE_HELPER="$TEMP_HELPER_DIR/deploy-manifest.js"
# cp 경로의 stage 디렉토리 (copy_item_cp 가 사용 직후 지우며, 중간 실패 시 EXIT trap 이 정리).
STAGE_DIR=""
trap 'rm -f "$CURRENT_FILES_LIST" "$THIS_DEPLOY_SKIPPED_LIST" "$MANIFEST_FILES_LIST" "$PREV_FILES_LIST" "$OBSOLETE_LIST"; rm -rf "$TEMP_HELPER_DIR"; [ -z "$STAGE_DIR" ] || rm -rf "$STAGE_DIR"' EXIT

[ -f "$HELPER" ] \
  || die "deploy-manifest.js helper missing at $HELPER"
cp "$HELPER" "$TEMP_WRITE_HELPER"

node "$HELPER" list-src "$SOURCE_DIR" > "$CURRENT_FILES_LIST"

# git 메타데이터: 실패 시 빈 값 → 헬퍼가 null 로 기록.
SOURCE_COMMIT="$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"
SOURCE_BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

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
# selective cleanup is performed by the manifest-based pre-step below — rsync no longer
# needs --delete and must not delete user-added files outside the harness contract.
SYNC_RSYNC_OPTS=()

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
info "copy tool: $COPY_TOOL"

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

# OBSOLETE 계산: 이전 매니페스트가 있으면 PREV − CURRENT.
# read-files 는 비존재/손상 매니페스트에서도 exit 0 + stderr 경고이므로,
# 첫 deploy 신호는 매니페스트 파일 자체의 존재 여부로 판정한다.
PREV_MANIFEST_PATH="$TARGET_DIR/.harness/.deploy-manifest.json"
if [ -f "$PREV_MANIFEST_PATH" ]; then
  # 헬퍼는 손상된 매니페스트에서도 stderr 경고 + exit 0 정책이라 stderr 를 살려둬야
  # cleanup 가 silent 비활성화되는 사고를 사용자가 인지할 수 있다.
  node "$HELPER" read-files "$PREV_MANIFEST_PATH" \
    > "$PREV_FILES_LIST" || true
  if [ ! -s "$PREV_FILES_LIST" ]; then
    info "previous manifest unreadable or empty; skipping cleanup"
  fi
  # OBSOLETE = PREV − CURRENT. THIS_DEPLOY_SKIPPED 는 src/ 에 여전히 존재해 CURRENT 에 포함되므로
  # 여기에서 자동으로 OBSOLETE 에서 제외된다 (별도 처리 불필요).
  comm -23 <(sort -u "$PREV_FILES_LIST") <(sort -u "$CURRENT_FILES_LIST") > "$OBSOLETE_LIST"
else
  info "no previous manifest; skipping cleanup"
fi

if [ -s "$OBSOLETE_LIST" ]; then
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    target_path="$TARGET_DIR/$rel"
    [ -e "$target_path" ] || continue
    if [ "$DRY_RUN" -eq 1 ]; then
      info "would delete obsolete: $rel"
    else
      backup_existing "$rel"
      rm -f "$target_path"
      info "deleted obsolete: $rel"
    fi
  done < "$OBSOLETE_LIST"
fi

# OBSOLETE 삭제로 비워진 부모 디렉토리도 깊은 순으로 정리한다 (stale 디렉토리 누적 방지).
# 하네스 최상위(.claude/.codex/.harness) 는 비어 있어도 보호 — 다음 deploy 안정성을 위함.
if [ -s "$OBSOLETE_LIST" ]; then
  awk -F/ '{
    for (i = NF - 1; i >= 1; i--) {
      path = $1
      for (j = 2; j <= i; j++) path = path "/" $j
      print path
    }
  }' "$OBSOLETE_LIST" | sort -u | awk '{ print length, $0 }' | sort -rn | cut -d" " -f2- |
  while IFS= read -r dir; do
    case "$dir" in
      .claude|.codex|.harness) continue ;;
    esac
    full="$TARGET_DIR/$dir"
    [ -d "$full" ] || continue

    if [ "$DRY_RUN" -eq 1 ]; then
      # dry-run: OBSOLETE 가 아직 삭제되지 않았으므로, 디렉토리의 모든 entry 가
      # OBSOLETE_LIST 에 있을 때만 "would empty" 로 예측한다.
      would_empty=true
      for entry in "$full"/* "$full"/.[!.]* "$full"/..?*; do
        [ -e "$entry" ] || continue
        entry_rel="${entry#"$TARGET_DIR/"}"
        grep -Fxq "$entry_rel" "$OBSOLETE_LIST" || { would_empty=false; break; }
      done
      $would_empty || continue
      info "would remove empty dir: $dir"
    else
      [ -z "$(ls -A "$full" 2>/dev/null)" ] || continue
      rmdir "$full" 2>/dev/null && info "removed empty dir: $dir"
    fi
  done
fi

for item in "${ITEMS[@]}"; do
  info "copying $item"
  if [ "$MODE" = "external" ]; then
    case "$item" in
      CLAUDE.md|AGENTS.md)
        if [ -f "$TARGET_DIR/$item" ]; then
          info "  skip: target has $item (external preserve)"
          # 이번 deploy 가 손대지 않은 특수 파일 → manifest.files 에서 제외 (OBSOLETE 와 무관).
          printf '%s\n' "$item" >> "$THIS_DEPLOY_SKIPPED_LIST"
          continue
        fi
        ;;
      .harness)
        if [ -f "$TARGET_DIR/.harness/commit-scopes.md" ]; then
          info "  preserving target .harness/commit-scopes.md"
          copy_item "$item" --exclude='commit-scopes.md'
          # commit-scopes.md 만 복사에서 제외했으므로 manifest.files 에서도 제외.
          printf '%s\n' '.harness/commit-scopes.md' >> "$THIS_DEPLOY_SKIPPED_LIST"
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

# 매니페스트 작성: manifest.files = CURRENT − THIS_DEPLOY_SKIPPED.
# (process substitution 으로 sort -u 결과를 직접 comm 에 전달 — bash 전용; shebang 이 bash 인지 확인됨.)
comm -23 <(sort -u "$CURRENT_FILES_LIST") <(sort -u "$THIS_DEPLOY_SKIPPED_LIST") > "$MANIFEST_FILES_LIST"

if [ "$DRY_RUN" -eq 1 ]; then
  manifest_count="$(wc -l < "$MANIFEST_FILES_LIST" | tr -d ' ')"
  info "dry run: would write manifest with $manifest_count files"
else
  # cleanup 이 helper 자체를 삭제했을 가능성이 있으므로 임시 복사본을 사용한다 (A3 fix).
  node "$TEMP_WRITE_HELPER" write \
    "$TARGET_DIR/.harness/.deploy-manifest.json" \
    "$MANIFEST_FILES_LIST" \
    --commit="$SOURCE_COMMIT" --branch="$SOURCE_BRANCH"
  info "wrote manifest: $TARGET_DIR/.harness/.deploy-manifest.json"
fi

info "done"
