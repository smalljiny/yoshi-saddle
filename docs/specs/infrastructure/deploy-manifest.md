# Deploy Harness Manifest

> `scripts/deploy-harness.sh` 가 매 deploy 마다 작성하는 매니페스트(`<target>/.harness/.deploy-manifest.json`) 와 그것을 활용한 selective cleanup 메커니즘. `rsync --delete` 의 무차별 삭제 대신 이전 deploy 가 설치한 파일만 정리해 사용자 추가 파일을 보존한다.

## 개요

deploy-harness.sh 는 `src/` 디렉토리를 단일 원천으로 `.claude/`/`.codex/`/`.harness/` + `CLAUDE.md`/`AGENTS.md` 다섯 항목을 대상에 동기화한다. 동기화 자체는 `rsync -a` 로 수행되지만 stale 정리(이전 컴포넌트가 rename·삭제됐을 때 대상에서 함께 빼는 작업)는 매니페스트 기반으로 별도 단계에서 처리한다.

매 deploy 끝에 대상의 `.harness/.deploy-manifest.json` 에 "이번에 하네스가 설치한 파일 목록 + 메타데이터" 가 기록되고, 다음 deploy 가 그 매니페스트를 읽어 `PREV_FILES − CURRENT_FILES` (= OBSOLETE) 만 삭제한다. 사용자가 같은 디렉토리 트리에 직접 추가한 파일은 PREV 에 없으므로 자연 보존된다.

매니페스트가 없는 첫 deploy 는 삭제 없이 복사만 수행한다. 안전한 기본값으로, 이전 상태를 알 수 없는 시점에서 추측 삭제를 하지 않는다.

JSON I/O 와 `src/` 파일 열거는 `src/.harness/scripts/deploy-manifest.js` (Node.js, ESM, 외부 의존성 0) 가 담당하고, deploy-harness.sh 는 헬퍼를 서브커맨드 형태로 호출한다.

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
| `files` | src/ 기준 상대 경로의 정렬·중복제거된 배열. 이번 deploy 가 실제로 복사한 파일만. external 모드 skip-if-exists 케이스(CLAUDE.md/AGENTS.md/.harness/commit-scopes.md)는 제외. |

### 헬퍼 서브커맨드 (`deploy-manifest.js`)

| 서브커맨드 | 인자 | 동작 |
|------------|------|------|
| `list-src <src-dir>` | positional 1 | src-dir 하위 모든 파일을 src-dir 기준 상대 경로로 정렬(`localeCompare`)해 줄 단위 stdout. **심볼릭 링크는 따라가지 않음** (`Dirent.isSymbolicLink()` skip). 디렉토리 순회는 직접 재귀로 구현해 `readdirSync({recursive:true})` 의 심링크 descent 가 외부 파일을 결과에 포함시키는 회귀를 차단. |
| `read-files <manifest-path>` | positional 1 | 매니페스트의 `files` 배열을 줄 단위 stdout. 비존재/손상 JSON/`files` 키 부재/배열 아님 → 빈 출력 + stderr 경고 + exit 0 (silent failure 의도, 첫 deploy 시나리오 안전). emit 단계에서 path traversal 항목(`..` 세그먼트, 절대경로, `\0`/`\n`/`\r` 포함)은 무시 + stderr 경고 (defense-in-depth). |
| `write <target-manifest> <files-list-path> --commit=<sha> --branch=<name>` | positional 2 + 옵션 2 | files-list 의 줄을 정렬·중복제거해 매니페스트 JSON 작성. `--commit=`/`--branch=` 빈 값 → `null` 기록. 부모 디렉토리 자동 생성. 원자적 쓰기(`tmp + rename`). JSON 들여쓰기 2칸 + 끝 개행. |

알 수 없는 서브커맨드 또는 인자 누락 → non-zero exit + 사용 가능한 서브커맨드 목록 stderr.

## 동작

### Deploy 흐름 (한 번의 실행)

```
1. 인자 파싱, 모드 결정 (self-sync vs external), src/ 존재 확인
2. 임시 파일 5종 + 임시 helper 디렉토리 mktemp + trap EXIT 정리
3. 헬퍼 list-src 호출 → CURRENT_FILES_LIST
4. helper 의 임시 사본을 mktemp -d 안에 .js 확장자로 복사 (TEMP_WRITE_HELPER)
5. git rev-parse 로 SOURCE_COMMIT, SOURCE_BRANCH 수집 (실패 시 빈 값 → 헬퍼가 null 기록)
6. mode 분기 + TARGET_DIR 결정 + path traversal 안전 검사
7. 매니페스트 backup 디렉토리 준비, info 출력
8. OBSOLETE 계산:
   - 매니페스트 파일 존재 → 헬퍼 read-files (stderr 보존) → PREV_FILES_LIST
   - PREV 가 비어 있으면 "previous manifest unreadable or empty; skipping cleanup" info
   - 매니페스트 부재 → "no previous manifest; skipping cleanup" info
   - OBSOLETE_LIST = comm -23 PREV CURRENT
9. OBSOLETE 파일 삭제 루프 (dry-run 은 "would delete obsolete" preview):
   - backup_existing → BACKUP_DIR/$(dirname "$rel")/ 안에 nested path 보존하여 복사
   - rm -f
10. OBSOLETE 의 부모 디렉토리 깊이 우선 정리 (dry-run 은 preview):
    - awk 파이프라인으로 모든 조상 추출 → length DESC 정렬
    - .claude/.codex/.harness 보호 케이스
    - 정상 모드: 빈 디렉토리만 rmdir (race 안전: 2>/dev/null && info)
    - dry-run: 모든 entry 가 OBSOLETE_LIST 에 있을 때만 "would remove empty dir"
11. 메인 복사 루프 (`for item in ITEMS`):
    - external skip 케이스(CLAUDE.md/AGENTS.md/commit-scopes.md) 는 THIS_DEPLOY_SKIPPED_LIST 에 append
    - rsync -a (SYNC_RSYNC_OPTS=() 빈 배열, --delete 없음)
12. external 모드: update_gitignore (이미 마커 있으면 skip)
13. 매니페스트 작성:
    - MANIFEST_FILES_LIST = comm -23 CURRENT THIS_DEPLOY_SKIPPED
    - dry-run: "dry run: would write manifest with N files" info
    - 정상: TEMP_WRITE_HELPER 로 helper 호출 (cleanup 이 helper 자체를 삭제했을 가능성 차단)
```

### 회귀 방지 메커니즘

| 시나리오 | 메커니즘 |
|---------|---------|
| 사용자 추가 파일 보존 | 첫 deploy 는 삭제 없이 복사만. 이후도 PREV − CURRENT 만 삭제 — 사용자 파일은 PREV 에 없으므로 영향 없음. |
| 같은 basename OBSOLETE 두 개 | `backup_existing` 이 `BACKUP_DIR/$(dirname "$rel")/` 로 nested path 보존. 두 백업이 서로 덮어쓰지 않음. |
| 매니페스트 손상 (사용자 편집·외부 도구) | 헬퍼 silent failure (exit 0 + stderr) + deploy 의 info ("previous manifest unreadable or empty"). Cleanup 은 비활성화되지만 사용자가 신호를 인지. |
| 매니페스트 path traversal (`..` / 절대경로) | `cmdReadFiles` 가 emit 단계에서 차단 — `rm -f`/`rsync backup`/`rmdir` 의 인자가 TARGET_DIR 밖을 가리키지 못함. |
| self-sync 시 helper 자체 OBSOLETE | cleanup 진입 전에 helper 를 mktemp -d/deploy-manifest.js 로 복사. 마지막 write 호출은 임시 사본으로 → cleanup 이 helper 를 삭제해도 mid-sync 실패 없음. |
| dry-run 안전 | 매니페스트 미작성 + OBSOLETE preview + empty-dir preview. backup_existing 자체에도 DRY_RUN 가드. |
| 빈 부모 디렉토리 누적 | OBSOLETE 삭제 직후 awk 파이프라인으로 조상 디렉토리를 깊이 우선 수집 → 빈 경우만 rmdir. .claude/.codex/.harness 보호. |

## 제약사항

- **manifest_version=1 만 지원**. v2 마이그레이션은 별도 작업으로 분리.
- **첫 deploy 정책**: 매니페스트가 없거나 손상돼 read 실패하면 cleanup 가 영구 비활성화되는 게 아니라 *이번 deploy 한 번* skip. 단, legacy 대상에 이전 `--delete` 시절 stale 파일이 남아 있으면 새 매니페스트가 CURRENT 만 기록하므로 다음 deploy 의 PREV 에도 없어 영원히 cleanup 되지 않는다 — 이는 spec 의 "사용자 파일 보존" 정책 결과. 향후 bootstrap migration 도입은 별도 spec 작업.
- **manifest_version 갱신 외 정합성 검증 부재**. 해시·서명 등으로 매니페스트 변조를 감지하는 로직은 도입 안 함 (path traversal 만 차단).
- **process substitution 사용**. `comm -23 <(sort -u ...) <(sort -u ...)` 패턴은 bash 전용. shebang `#!/usr/bin/env bash` 로 명시. `sh scripts/deploy-harness.sh` 호출은 syntax error 로 fail-fast.
- **외부 의존성 0**. 헬퍼는 Node 표준 라이브러리(`node:fs`/`node:path`/`node:url`)만 사용. deploy-harness.sh 는 `bash`/`rsync`/`git`/`comm`/`awk`/`sort`/`mktemp`/`grep -F` 만 요구.
- **테스트 커버리지**: 헬퍼는 `node:test` 26 단위 테스트(list-src/read-files/write 정상·엣지 + 심볼릭 링크 회귀 + path traversal 가드 + non-string entry skip). deploy-harness.sh 는 통합 시나리오 검증 — 첫 deploy / stale 정리 / 사용자 파일 보존 / dry-run preview / collision basename / git 메타데이터 실패 / 빈 디렉토리 cascade / self-sync idempotent.

## 관련 파일

- `scripts/deploy-harness.sh` — deploy 진입점, OBSOLETE 계산·삭제·매니페스트 작성 흐름.
- `src/.harness/scripts/deploy-manifest.js` — JSON I/O + 파일 열거 헬퍼.
- `src/.harness/scripts/deploy-manifest.test.js` — 헬퍼 단위 테스트.
- [`harness-src-layout.md`](harness-src-layout.md) — `src/` 레이아웃과 deploy-harness.sh 모드 요약.
