# Deploy Harness Manifest

> `scripts/deploy-harness.sh` 가 매 deploy 마다 작성하는 매니페스트(`<target>/.harness/.deploy-manifest.json`) 와 그것을 활용한 selective cleanup 메커니즘. `rsync --delete` 의 무차별 삭제 대신 이전 deploy 가 설치한 파일만 정리해 사용자 추가 파일을 보존한다. 복사는 rsync 가 있으면 rsync, 없으면 cp 대체 경로로 수행하며 두 경로는 같은 보존 계약을 지킨다.

## 개요

deploy-harness.sh 는 `src/` 디렉토리를 단일 원천으로 `.claude/`/`.codex/`/`.harness/` + `CLAUDE.md`/`AGENTS.md` 다섯 항목을 대상에 동기화한다. 동기화 자체는 복사 도구(rsync 또는 cp)로 수행되고, stale 정리(이전 컴포넌트가 rename·삭제됐을 때 대상에서 함께 빼는 작업)는 매니페스트 기반으로 별도 단계에서 처리한다.

매 deploy 끝에 대상의 `.harness/.deploy-manifest.json` 에 "이번에 하네스가 설치한 파일 목록 + 메타데이터" 가 기록되고, 다음 deploy 가 그 매니페스트를 읽어 `PREV_FILES − CURRENT_FILES` (= OBSOLETE) 만 삭제한다. 사용자가 같은 디렉토리 트리에 직접 추가한 파일은 PREV 에 없으므로 자연 보존된다.

매니페스트가 없는 첫 deploy 는 삭제 없이 복사만 수행한다. 안전한 기본값으로, 이전 상태를 알 수 없는 시점에서 추측 삭제를 하지 않는다.

JSON I/O 와 `src/` 파일 열거는 `src/.harness/scripts/deploy-manifest.js` (Node.js, ESM, 외부 의존성 0) 가 담당하고, deploy-harness.sh 는 헬퍼를 **원본 위치(`src/.harness/scripts/`)에서** 서브커맨드 형태로 호출한다. 루트 `.harness/` 는 self-sync 결과물이라 clone 직후에는 없으므로, 원본에서 읽어야 첫 실행이 스스로 시작된다.

## 구조 / 스키마

### 매니페스트 파일

**경로**: `<target>/.harness/.deploy-manifest.json` — `<target>` 은 self-sync 모드에서는 저장소 루트, external 모드에서는 사용자가 지정한 디렉토리. `update_gitignore` 의 ignore 블록(`# BEGIN harness local ignores`)에 자동 포함되어 commit 대상이 되지 않는다.

**스키마 (manifest_version=1)**:

```json
{
  "manifest_version": 1,
  "deployed_at": "2026-05-04T01:41:58.862Z",
  "source": {
    "commit": "c25a619c68cc...",
    "branch": "develop"
  },
  "files": [
    ".claude/agents/architect.md",
    ".claude/skills/wf-tdd/SKILL.md",
    ".harness/contracts/spec-review.md",
    "AGENTS.md",
    "CLAUDE.md"
  ]
}
```

| 필드 | 의미 |
|------|------|
| `manifest_version` | 정수. 현재 1. 향후 v2 도입 시 마이그레이션 정책은 별도 작업. |
| `deployed_at` | ISO8601 UTC 타임스탬프 (`new Date().toISOString()`). |
| `source.commit` | 하네스 저장소의 `git -C <REPO_DIR> rev-parse HEAD` 결과. 실패 시 `null`. |
| `source.branch` | `git -C <REPO_DIR> rev-parse --abbrev-ref HEAD` 결과. 실패 시 `null`. |
| `files` | src/ 기준 상대 경로의 정렬·중복제거된 배열. 경로 구분자는 OS 와 무관하게 항상 `/`. 이번 deploy 가 실제로 복사한 파일만. external 모드 skip-if-exists 케이스(CLAUDE.md/AGENTS.md/.harness/commit-scopes.md)는 제외. |

### 헬퍼 서브커맨드 (`deploy-manifest.js`)

| 서브커맨드 | 인자 | 동작 |
|------------|------|------|
| `list-src <src-dir>` | positional 1 | src-dir 하위 모든 파일을 src-dir 기준 상대 경로로 정렬(`localeCompare`)해 줄 단위 stdout. **경로 구분자는 항상 `/`** — Windows 의 `path.relative` 가 돌려주는 `\` 를 `/` 로 바꿔, 매니페스트를 플랫폼 간에 공유하고 OBSOLETE 정리의 `/` 기준 경로 분해가 동작하게 한다. **심볼릭 링크는 따라가지 않음** (`Dirent.isSymbolicLink()` skip). 디렉토리 순회는 직접 재귀로 구현해 `readdirSync({recursive:true})` 의 심링크 descent 가 외부 파일을 결과에 포함시키는 회귀를 차단. |
| `read-files <manifest-path>` | positional 1 | 매니페스트의 `files` 배열을 줄 단위 stdout. 각 항목의 `\` 를 `/` 로 정규화한 뒤 출력한다 (이전에 Windows 에서 `\` 구분자로 기록된 매니페스트 호환 — 정규화하지 않으면 PREV − CURRENT 에서 모든 항목이 OBSOLETE 가 된다). 비존재/손상 JSON/`files` 키 부재/배열 아님 → 빈 출력 + stderr 경고 + exit 0 (silent failure 의도, 첫 deploy 시나리오 안전). 정규화 **후** emit 단계에서 path traversal 항목(`..` 세그먼트, 절대경로, `\0`/`\n`/`\r` 포함)은 무시 + stderr 경고 (defense-in-depth — `..\` 형태도 차단). |
| `write <target-manifest> <files-list-path> --commit=<sha> --branch=<name>` | positional 2 + 옵션 2 | files-list 의 줄을 정렬·중복제거해 매니페스트 JSON 작성. `--commit=`/`--branch=` 빈 값 → `null` 기록. 부모 디렉토리 자동 생성. 원자적 쓰기(`tmp + rename`). JSON 들여쓰기 2칸 + 끝 개행. |
| `strip-gitignore-block <gitignore-path>` | positional 1 | 대상 `.gitignore` 에서 내용이 달라진 기존 harness ignore 블록을 제거한다 (`update_gitignore` 가 최신 블록을 다시 추가하기 전에 호출). |

알 수 없는 서브커맨드 또는 인자 누락 → non-zero exit + 사용 가능한 서브커맨드 목록 stderr.

### 복사 도구

| 도구 | 선택 조건 | 복사 방식 |
|------|-----------|-----------|
| rsync | `command -v rsync` 성공 | `rsync -a` + `COMMON_RSYNC_OPTS` 의 `--exclude` (`.DS_Store`, `.claude/sessions/`, `.claude/settings.local.json`, `.claude/checkpoints.log`). `SYNC_RSYNC_OPTS=()` 빈 배열, `--delete` 없음. dry-run 은 `--dry-run --itemize-changes`. |
| cp | rsync 없음 (예: Windows Git Bash) | 항목마다 원본을 `mktemp -d` stage 에 `cp -a` 로 복사 → stage **안에서만** `apply_excludes` 로 제외 대상을 지움 → stage 결과를 대상에 `cp -af` 로 덮어씀. 대상 쪽에서는 어떤 파일도 지우지 않는다. dry-run 은 stage 의 파일을 `would copy: <rel>` 로 나열하고 대상·백업에 아무것도 쓰지 않는다. stage 는 사용 직후 지우며, 중간 실패 시 EXIT trap 이 정리한다. |

실행 시 `[deploy-harness] copy tool: rsync|cp` 를 출력한다.

`apply_excludes <root> [basename...]` 는 rsync 제외 규칙을 재현한다: `<root>/.claude/{sessions,settings.local.json,checkpoints.log}` 삭제, 깊이와 무관하게 `.DS_Store` 삭제, extra basename(예: external 의 `commit-scopes.md` 보존용 `--exclude='commit-scopes.md'`)은 `find -name … -prune -exec rm -rf` 로 깊이와 무관하게 삭제. stage 와 새로 만든 백업 디렉토리에만 호출하고 대상에는 호출하지 않는다.

## 동작

### Deploy 흐름 (한 번의 실행)

```
1. 인자 파싱, 복사 도구 결정 (rsync 우선, 없으면 cp)
2. 모드 결정 (self-sync vs external), src/ 존재 확인, HELPER = src/.harness/scripts/deploy-manifest.js
3. 임시 파일 5종 + 임시 helper 디렉토리 mktemp + trap EXIT 정리 (cp stage 포함)
4. HELPER 존재 확인 후 임시 사본을 mktemp -d 안에 .js 확장자로 복사 (TEMP_WRITE_HELPER)
5. HELPER list-src 호출 → CURRENT_FILES_LIST
6. git rev-parse 로 SOURCE_COMMIT, SOURCE_BRANCH 수집 (실패 시 빈 값 → 헬퍼가 null 기록)
7. mode 분기 + TARGET_DIR 결정 + path traversal 안전 검사
8. 백업 디렉토리 준비, info 출력 (mode/source/target/copy tool/backup)
9. OBSOLETE 계산:
   - 매니페스트 파일 존재 → HELPER read-files (stderr 보존, '\' → '/' 정규화) → PREV_FILES_LIST
   - PREV 가 비어 있으면 "previous manifest unreadable or empty; skipping cleanup" info
   - 매니페스트 부재 → "no previous manifest; skipping cleanup" info
   - OBSOLETE_LIST = comm -23 PREV CURRENT
10. OBSOLETE 파일 삭제 루프 (dry-run 은 "would delete obsolete" preview):
    - backup_existing → BACKUP_DIR/$(dirname "$rel")/ 안에 nested path 보존하여 복사
    - rm -f
11. OBSOLETE 의 부모 디렉토리 깊이 우선 정리 (dry-run 은 preview):
    - awk 파이프라인으로 모든 조상 추출 → length DESC 정렬
    - .claude/.codex/.harness 보호 케이스
    - 정상 모드: 빈 디렉토리만 rmdir (race 안전: 2>/dev/null && info)
    - dry-run: 모든 entry 가 OBSOLETE_LIST 에 있을 때만 "would remove empty dir"
12. 메인 복사 루프 (`for item in ITEMS`):
    - external skip 케이스(CLAUDE.md/AGENTS.md/commit-scopes.md) 는 THIS_DEPLOY_SKIPPED_LIST 에 append
    - backup_existing 후 복사 도구별 copy_item (rsync 경로 또는 cp stage 경로)
13. external 모드: update_gitignore (이미 마커 있으면 skip)
14. 매니페스트 작성:
    - MANIFEST_FILES_LIST = comm -23 CURRENT THIS_DEPLOY_SKIPPED
    - dry-run: "dry run: would write manifest with N files" info
    - 정상: TEMP_WRITE_HELPER 로 write 호출
```

### 백업 (`backup_existing`)

external 모드에서 덮어쓰거나 지우기 전의 대상 항목을 `.harness-backups/harness-deploy-<시각>/` 아래에 nested path 를 보존해 복사한다. 제외 정책은 복사와 같다.

- rsync 경로: `rsync -a "${COMMON_RSYNC_OPTS[@]}"` 로 백업.
- cp 경로: 백업은 이번 실행이 새로 만드는 디렉토리이므로 stage 없이 `cp -af` 후 백업 안에서 `apply_excludes` 를 적용한다. 단, 대상의 `.claude` 가 symlink 이면 BSD `cp -a` 는 링크를 그대로 복사하므로, 링크를 거쳐 원본 `sessions` 등이 지워지지 않도록 고정 제외 처리를 건너뛴다 (백업에는 링크만 남는다).
- self-sync 모드와 `--dry-run` 에서는 백업하지 않는다.

### 회귀 방지 메커니즘

| 시나리오 | 메커니즘 |
|---------|---------|
| 사용자 추가 파일 보존 | 첫 deploy 는 삭제 없이 복사만. 이후도 PREV − CURRENT 만 삭제 — 사용자 파일은 PREV 에 없으므로 영향 없음. cp 경로도 대상에서 지우지 않는다. |
| 대상 로컬 데이터 보존 | `sessions/`·`settings.local.json`·`checkpoints.log`·`.DS_Store` 는 rsync 는 `--exclude`, cp 는 stage 안 삭제로 복사에서 빠진다 — 대상의 기존 파일은 그대로. |
| 같은 basename OBSOLETE 두 개 | `backup_existing` 이 `BACKUP_DIR/$(dirname "$rel")/` 로 nested path 보존. 두 백업이 서로 덮어쓰지 않음. |
| 매니페스트 손상 (사용자 편집·외부 도구) | 헬퍼 silent failure (exit 0 + stderr) + deploy 의 info ("previous manifest unreadable or empty"). Cleanup 은 비활성화되지만 사용자가 신호를 인지. |
| 매니페스트 path traversal (`..` / 절대경로) | `cmdReadFiles` 가 `\`→`/` 정규화 후 emit 단계에서 차단 — `rm -f`/백업/`rmdir` 의 인자가 TARGET_DIR 밖을 가리키지 못함. |
| 플랫폼 간 매니페스트 (`\` vs `/`) | `list-src` 는 항상 `/` 출력, `read-files` 는 `\` 를 `/` 로 정규화 — Windows 에서 기록된 매니페스트로도 OBSOLETE 가 잘못 계산되지 않음. |
| clone 직후 첫 실행 | HELPER 를 원본 `src/.harness/scripts/` 에서 읽음 — 루트 `.harness/` 가 없어도 시작. |
| write 시점 helper 고정 | 시작 시점에 복사한 TEMP_WRITE_HELPER 로 `write` 를 호출한다 (A3 방어 유지). |
| dry-run 안전 | 매니페스트 미작성 + OBSOLETE preview + empty-dir preview. backup_existing 자체에도 DRY_RUN 가드. cp 경로는 stage 에서만 목록을 만든다. |
| 빈 부모 디렉토리 누적 | OBSOLETE 삭제 직후 awk 파이프라인으로 조상 디렉토리를 깊이 우선 수집 → 빈 경우만 rmdir. .claude/.codex/.harness 보호. |

### 검증 (`scripts/verify-deploy-parity.sh`)

S1 self-sync / S2 첫 외부 배포 / S3 보존 대상이 있는 재배포 / S4 dry-run / S5 obsolete 정리를 복사 경로별로 실행해 기대 결과를 검사한다. cp 모드는 항상 실행하고(rsync 가 설치된 환경에서는 rsync 를 뺀 PATH shim 으로 가림), rsync 모드는 rsync 가 있을 때만 실행한다. 두 모드가 모두 실행되면 시나리오별 정규화 스냅샷(백업 디렉토리 시각 제거, 매니페스트는 `files` 만)을 비교해 `S<n> parity: PASS|FAIL|SKIP` 를 출력한다. FAIL 이 하나라도 있으면 exit 1. 모든 실행은 `mktemp -d` 아래 복사본에서 이뤄져 저장소 작업 트리를 바꾸지 않는다.

## 제약사항

- **manifest_version=1 만 지원**. v2 마이그레이션은 별도 작업으로 분리.
- **첫 deploy 정책**: 매니페스트가 없거나 손상돼 read 실패하면 cleanup 가 영구 비활성화되는 게 아니라 *이번 deploy 한 번* skip. 단, legacy 대상에 이전 `--delete` 시절 stale 파일이 남아 있으면 새 매니페스트가 CURRENT 만 기록하므로 다음 deploy 의 PREV 에도 없어 영원히 cleanup 되지 않는다 — 이는 "사용자 파일 보존" 정책 결과. 향후 bootstrap migration 도입은 별도 spec 작업.
- **manifest_version 갱신 외 정합성 검증 부재**. 해시·서명 등으로 매니페스트 변조를 감지하는 로직은 도입 안 함 (path traversal 만 차단).
- **process substitution 사용**. `comm -23 <(sort -u ...) <(sort -u ...)` 패턴은 bash 전용. shebang `#!/usr/bin/env bash` 로 명시. `sh scripts/deploy-harness.sh` 호출은 syntax error 로 fail-fast.
- **외부 의존성 0**. 헬퍼는 Node 표준 라이브러리(`node:fs`/`node:path`/`node:url`)만 사용. deploy-harness.sh 는 `bash`/`git`/`comm`/`awk`/`sort`/`mktemp`/`find`/`cp`/`grep -F` 를 요구하고, `rsync` 는 있으면 사용한다.
- **cp 경로와 rsync 경로의 알려진 차이** (보존 계약 밖의 경우):
  - cp 는 제외 대상을 stage·백업에 일단 복사한 뒤 지운다 — 대상의 `sessions/` 가 크거나 잠겨 있으면 백업이 느리거나 실패할 수 있다.
  - `.claude/sessions/` 제외는 전송 루트에서만 적용된다 (중첩 `.claude` 디렉토리는 해당 없음).
  - 대상에 원본과 파일↔디렉토리 타입이 다른 항목이 있거나 디렉토리 symlink 가 있으면 cp 는 실패하거나 링크 대상에 병합한다 (rsync 는 교체).
  - dry-run 출력은 변경분이 아니라 복사될 전체 파일 목록이다.
- **external 대상 경로 형식**: Windows Git Bash 에서 대상 경로는 `/c/...` 형식으로 넘긴다 (`make_absolute_path` 는 `C:/...` 를 상대 경로로 취급한다).
- **테스트 커버리지**: 헬퍼는 `node:test` 29 단위 테스트(list-src/read-files/write 정상·엣지 + `/` 구분자 + 레거시 `\` 정규화·`..\` 차단 + 심볼릭 링크 회귀 + path traversal 가드 + non-string entry skip). 심볼릭 링크 회귀 테스트는 Windows 에서 symlink 생성이 EPERM(개발자 모드 꺼짐)이면 skip 한다. deploy-harness.sh 는 `scripts/verify-deploy-parity.sh` 의 S1~S5 시나리오로 검증한다.

## 관련 파일

- `scripts/deploy-harness.sh` — deploy 진입점, 복사 도구 선택, OBSOLETE 계산·삭제·매니페스트 작성 흐름.
- `scripts/verify-deploy-parity.sh` — 복사 경로별 S1~S5 검증과 rsync·cp 결과 비교.
- `src/.harness/scripts/deploy-manifest.js` — JSON I/O + 파일 열거 헬퍼.
- `src/.harness/scripts/deploy-manifest.test.js` — 헬퍼 단위 테스트.
- [`src-layout.md`](src-layout.md) — `src/` 레이아웃과 deploy-harness.sh 모드 요약.
- [`../cross-platform-support.md`](../cross-platform-support.md) — 플랫폼별 지원 범위와 검증 방법.
