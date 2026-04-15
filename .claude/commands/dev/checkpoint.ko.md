---
version: 2
description: 구현 도중 이름 있는 체크포인트를 생성하거나 검증한다. 안전한 롤백 기준점을 위해 git 상태와 테스트 결과를 기록한다.
category: dev-workflow
---

# /dev:checkpoint

현재 상태의 이름 있는 스냅샷을 저장하거나, 현재 상태를 이전 체크포인트와 비교한다.

## 사용법

```
/dev:checkpoint create <name>    현재 상태를 체크포인트로 저장
/dev:checkpoint verify <name>    현재 상태를 체크포인트와 비교
/dev:checkpoint list             모든 체크포인트 표시
/dev:checkpoint clear            오래된 체크포인트 제거 (최근 5개 유지)
```

## create

1. 빠른 품질 체크 실행:

```bash
pnpm tsc --noEmit 2>&1 | head -5
pnpm test --run 2>&1 | tail -5
```

체크 실패 시 결과를 보고하고 그래도 체크포인트를 만들지 사용자에게 확인.

2. 체크포인트 기록:

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | <name> | $(git rev-parse --short HEAD)" \
  >> .claude/checkpoints.log
```

3. 선택적으로 stash 또는 커밋 (사용자에게 확인):
   - **Commit**: `git add -A && git commit -m "checkpoint: <name>"`
   - **Stash**: `git stash push -m "checkpoint: <name>"`
   - **None**: 로그만 기록 (기본값)

4. 확인:

```
✅ 체크포인트 생성됨: <name>
   SHA:  a1b2c3d
   시각: 2026-04-15T10:30:00Z
   로그: .claude/checkpoints.log
```

## verify

1. `.claude/checkpoints.log`에서 대상 체크포인트 읽기
2. 현재 상태를 체크포인트 SHA와 비교:

```bash
git diff <sha> --stat
```

3. 보고:

```
체크포인트 비교: <name>
════════════════════════════════════
기록:   2026-04-15T10:30:00Z  (SHA: a1b2c3d)
현재:   2026-04-15T11:45:00Z  (SHA: f4e5d6c)

변경된 파일: 4
  수정: src/auth/middleware.ts
  수정: src/auth/middleware.test.ts
  추가: src/auth/types.ts
  수정: CLAUDE.md

빌드:      PASS
테스트:    +8 통과, 0 실패
커버리지:  84%  (체크포인트 이후 +3%)
```

## list

`.claude/checkpoints.log`를 읽고 표시:

```
#  이름             시각                  SHA      
─────────────────────────────────────────────────
1  feature-start    2026-04-15T09:00:00Z  d3c2b1a  
2  T1-done          2026-04-15T10:00:00Z  a1b2c3d  ← 최신
```

## clear

`.claude/checkpoints.log`에서 가장 최근 5개만 유지하고 나머지 제거.

## 일반적인 워크플로우

```
/dev:impl Task 1  →  /dev:checkpoint create "T1-done"
/dev:impl Task 2  →  /dev:checkpoint create "T2-done"
/dev:impl Task 3  →  뭔가 망가짐...
                  →  /dev:checkpoint verify "T2-done"   ← 무엇이 바뀌었는지 파악
                  →  git stash / git reset               ← 필요 시 복구
```

## 참고

- `.claude/checkpoints.log`는 gitignore 처리 — 체크포인트는 로컬 전용
- 시간이 아닌 상태를 표현하는 이름 사용 (`"checkpoint-1"` 대신 `"auth-complete"`)
- `/compact`와 함께 사용 — 체크포인트 후 compact하면 다음 페이즈를 새 컨텍스트로 시작
