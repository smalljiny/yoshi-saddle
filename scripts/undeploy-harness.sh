#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/undeploy-harness.sh [options] <target-dir>

Options:
  --apply       실제로 파일을 삭제한다. 없으면 dry-run으로 실행된다.
  --no-backup   --apply와 함께 사용. 삭제 전 백업을 생성하지 않는다.
  --skip-gitignore
                .gitignore의 harness ignore 블록을 제거하지 않는다.
  -h, --help    도움말 표시.

기본 동작은 dry-run이다. --apply 없이 실행하면 어떤 파일이 제거될지만 출력하고
실제로는 아무것도 삭제하지 않는다. --apply 플래그를 명시해야 실제 삭제가 수행된다.

설치 시 생성된 매니페스트(.harness/.deploy-manifest.json)를 읽어
하네스가 설치한 파일만 정확히 제거한다. 사용자가 추가한 파일은 건드리지 않는다.

제거 대상:
  매니페스트에 기록된 모든 파일
  .harness/.deploy-manifest.json (매니페스트 자체)
  하네스 파일 제거 후 비어 있는 하위 디렉토리

보호 대상 (제거하지 않음):
  사용자가 추가한 파일
  매니페스트에 없는 파일 (설치 시 skip된 CLAUDE.md/AGENTS.md 등)
  .harness-backups/ (사용자가 직접 삭제)
EOF
}

die() {
  printf 'undeploy-harness: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '[undeploy-harness] %s\n' "$*"
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

make_absolute_path() {
  local input="$1"

  case "$input" in
    /*) ;;
    *) input="$PWD/$input" ;;
  esac

  if [ -d "$input" ]; then
    cd "$input" && pwd -P
    return
  fi

  die "target 디렉토리가 존재하지 않습니다: $input"
}

backup_file() {
  local rel="$1"
  local source="$TARGET_DIR/$rel"

  [ "$BACKUP_ENABLED" -eq 1 ] || return 0
  [ -e "$source" ] || return 0

  local dest_parent
  dest_parent="$BACKUP_DIR/$(dirname "$rel")"
  mkdir -p "$dest_parent"
  cp -p "$source" "$dest_parent/"
}

DRY_RUN=1
BACKUP_ENABLED=1
UPDATE_GITIGNORE=1
TARGET_INPUT=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply)          DRY_RUN=0 ;;
    --no-backup)      BACKUP_ENABLED=0 ;;
    --skip-gitignore) UPDATE_GITIGNORE=0 ;;
    -h|--help)        usage; exit 0 ;;
    -*)               die "알 수 없는 옵션: $1" ;;
    *)
      [ -z "$TARGET_INPUT" ] || die "target directory는 하나만 지정할 수 있습니다"
      TARGET_INPUT="$1"
      ;;
  esac
  shift
done

[ -n "$TARGET_INPUT" ] || die "target directory가 필요합니다. 사용법: scripts/undeploy-harness.sh [options] <target-dir>"

SCRIPT_DIR="$(resolve_script_dir)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
SOURCE_DIR="$REPO_DIR/src"
HELPER="$REPO_DIR/.harness/scripts/deploy-manifest.js"

[ -f "$HELPER" ] || die "deploy-manifest.js 헬퍼를 찾을 수 없습니다: $HELPER"

TARGET_DIR="$(make_absolute_path "$TARGET_INPUT")"

# 안전 가드: deploy external-mode 가드와 대칭
case "$TARGET_DIR/" in
  "$SOURCE_DIR/"*)
    die "target이 src/ 또는 src/ 하위 디렉토리입니다: $TARGET_DIR" ;;
esac
case "$SOURCE_DIR/" in
  "$TARGET_DIR/"*)
    die "target이 src/ 디렉토리를 포함하는 경로입니다: $TARGET_DIR" ;;
esac
case "$TARGET_DIR/" in
  "$REPO_DIR/"*)
    die "target이 harness 저장소 내부입니다: $TARGET_DIR" ;;
esac

MANIFEST_PATH="$TARGET_DIR/.harness/.deploy-manifest.json"
[ -f "$MANIFEST_PATH" ] || die "매니페스트를 찾을 수 없습니다: $MANIFEST_PATH
하네스가 설치되지 않았거나 이미 제거되었을 수 있습니다."

FILES_LIST="$(mktemp)"
COMBINED_LIST="$(mktemp)"
trap 'rm -f "$FILES_LIST" "$COMBINED_LIST"' EXIT

node "$HELPER" read-files "$MANIFEST_PATH" > "$FILES_LIST"

# dry-run 빈 디렉토리 예측용: FILES_LIST + 매니페스트 경로 합집합
{ cat "$FILES_LIST"; printf '%s\n' ".harness/.deploy-manifest.json"; } | sort -u > "$COMBINED_LIST"

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_DIR="$TARGET_DIR/.harness-backups/harness-undeploy-$TIMESTAMP"

info "target: $TARGET_DIR"
if [ "$DRY_RUN" -eq 1 ]; then
  info "dry run: --apply 없이 실행됨. 실제로 아무것도 삭제되지 않습니다."
else
  if [ "$BACKUP_ENABLED" -eq 1 ]; then
    info "backup: $BACKUP_DIR"
  else
    info "backup: disabled"
  fi
fi

removed_count=0
absent_count=0

# 1. 매니페스트에 기록된 파일 제거
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  target_path="$TARGET_DIR/$rel"

  if [ ! -e "$target_path" ]; then
    info "skip (already absent): $rel"
    absent_count=$((absent_count + 1))
    continue
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    info "would remove: $rel"
  else
    backup_file "$rel"
    rm -f "$target_path"
    info "removed: $rel"
  fi
  removed_count=$((removed_count + 1))
done < "$FILES_LIST"

# 2. 매니페스트 자체 제거 (빈 디렉토리 정리 전에 처리해야 .harness/ 가 비워짐)
if [ "$DRY_RUN" -eq 1 ]; then
  info "would remove manifest: .harness/.deploy-manifest.json"
else
  backup_file ".harness/.deploy-manifest.json"
  rm -f "$MANIFEST_PATH"
  info "removed manifest: .harness/.deploy-manifest.json"
fi

# 3. 빈 부모 디렉토리 정리 (깊은 순; 최상위 .claude/.codex/.harness 는 4단계에서 처리)
if [ -s "$COMBINED_LIST" ]; then
  awk -F/ '{
    for (i = NF - 1; i >= 1; i--) {
      path = $1
      for (j = 2; j <= i; j++) path = path "/" $j
      print path
    }
  }' "$COMBINED_LIST" | sort -u | awk '{ print length, $0 }' | sort -rn | cut -d" " -f2- |
  while IFS= read -r dir; do
    case "$dir" in
      .claude|.codex|.harness) continue ;;
    esac
    full="$TARGET_DIR/$dir"
    [ -d "$full" ] || continue

    if [ "$DRY_RUN" -eq 1 ]; then
      would_empty=true
      for entry in "$full"/* "$full"/.[!.]* "$full"/..?*; do
        [ -e "$entry" ] || continue
        entry_rel="${entry#"$TARGET_DIR/"}"
        grep -Fxq "$entry_rel" "$COMBINED_LIST" || { would_empty=false; break; }
      done
      $would_empty || continue
      info "would remove empty dir: $dir"
    else
      [ -z "$(ls -A "$full" 2>/dev/null)" ] || continue
      rmdir "$full" 2>/dev/null && info "removed empty dir: $dir"
    fi
  done
fi

# 4. 최상위 디렉토리 정리 (.claude/.codex/.harness, 빈 경우만)
for top_dir in .claude .codex .harness; do
  full="$TARGET_DIR/$top_dir"
  [ -d "$full" ] || continue

  if [ "$DRY_RUN" -eq 1 ]; then
    would_empty=true
    for entry in "$full"/* "$full"/.[!.]* "$full"/..?*; do
      [ -e "$entry" ] || continue
      entry_rel="${entry#"$TARGET_DIR/"}"
      grep -Fxq "$entry_rel" "$COMBINED_LIST" || { would_empty=false; break; }
    done
    $would_empty || continue
    info "would remove empty top-level dir: $top_dir"
  else
    if [ -z "$(ls -A "$full" 2>/dev/null)" ]; then
      rmdir "$full" 2>/dev/null && info "removed empty top-level dir: $top_dir"
    fi
  fi
done

# 5. .gitignore harness 블록 제거
if [ "$UPDATE_GITIGNORE" -eq 1 ]; then
  gitignore_path="$TARGET_DIR/.gitignore"
  if [ -f "$gitignore_path" ]; then
    if grep -Fq "# BEGIN harness local ignores" "$gitignore_path"; then
      if [ "$DRY_RUN" -eq 1 ]; then
        info "would remove harness ignore block from .gitignore"
      else
        backup_file ".gitignore"
        node "$HELPER" strip-gitignore-block "$gitignore_path"
        info "removed harness ignore block from .gitignore"
      fi
    else
      info ".gitignore: harness block not found; skipping"
    fi
  fi
else
  info ".gitignore update: skipped"
fi

# 요약
if [ "$DRY_RUN" -eq 1 ]; then
  info "dry run 완료: 제거 예정 $removed_count 개, 이미 없음 $absent_count 개"
  info "실제 삭제: scripts/undeploy-harness.sh --apply $TARGET_INPUT"
else
  info "완료: 제거 $removed_count 개, 이미 없음 $absent_count 개"
fi
