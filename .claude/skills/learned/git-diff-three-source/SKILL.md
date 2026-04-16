---
version: 1
name: git-diff-three-source
description: 커밋 전/스테이지/워킹트리 변경을 모두 포착하기 위해 git diff 3소스를 합산·dedup하는 파일 탐색 패턴
origin: learned
learned_at: 2026-04-16T08:00:00.000Z
---

## When to Activate

- 명령어나 스킬이 "변경된 파일 목록"을 수집해야 할 때
- 작업이 커밋 전, 스테이지, 또는 feature 브랜치 모두에서 실행될 수 있을 때
- `git diff <base>...HEAD`만 사용하면 develop 브랜치에서 직접 작업 시 빈 결과가 나는 상황

## Pattern

```bash
# 3소스 합산 + 중복 제거
{ git diff develop...HEAD --name-only 2>/dev/null
  git diff --name-only 2>/dev/null
  git diff --cached --name-only 2>/dev/null
} | sort -u
```

### 소스별 역할

| 소스 | 커버 범위 |
|------|---------|
| `git diff develop...HEAD --name-only` | feature 브랜치에서 커밋된 변경 |
| `git diff --name-only` | 미스테이지(워킹 트리) 변경 |
| `git diff --cached --name-only` | 스테이지(인덱스) 변경 |

### fallback: 세 소스 모두 비어 있을 때

```
# 사용자에게 베이스 브랜치 입력 요청
베이스 브랜치를 입력하세요 (기본값: develop):

# 브랜치명 검증
^[a-zA-Z0-9_/.-]+$

# 브랜치 존재 확인
git rev-parse --verify <branch>

# 재실행 (소스 1만)
git diff <branch>...HEAD --name-only
```

### 하네스 파일 필터링 (이 패턴의 일반적 사용처)

```bash
{ git diff develop...HEAD --name-only 2>/dev/null
  git diff --name-only 2>/dev/null
  git diff --cached --name-only 2>/dev/null
} | sort -u | grep -E '^\.claude/|^\.codex/|^CLAUDE\.md$|^AGENTS\.md$'
```

## Examples

### /dev:done Step 4.1 구현

```markdown
Collect changed files from all three sources and deduplicate:

1. `git diff develop...HEAD --name-only` — committed changes on the feature branch
2. `git diff --name-only` — unstaged working tree changes
3. `git diff --cached --name-only` — staged (index) changes

Merge the three lists and remove duplicates.
```

### 왜 단일 소스로 부족한가

```bash
# develop 브랜치에서 직접 작업 중이면:
git diff develop...HEAD --name-only  # → 빈 결과 (HEAD == develop)

# 미커밋 상태면:
git diff develop...HEAD --name-only  # → 빈 결과 (커밋 없음)

# 3소스 합산이면:
git diff --name-only          # → 워킹트리 변경 포착
git diff --cached --name-only # → 스테이지 변경 포착
```
