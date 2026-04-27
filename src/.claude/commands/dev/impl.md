---
version: 11
description: Execute Tasks from the implementation plan. Supports `--all` for sequential batch execution of all remaining Tasks. Automatically invokes tdd-specialist and code-reviewer per Task. Stops after one Task by default; `--all` or `config.dev_impl.batch_mode=true` runs all remaining Tasks sequentially.
category: dev-workflow
---

# /dev:impl

Execute Tasks from the implementation plan one at a time, or all at once in batch mode.

## Usage

```
/dev:impl               Auto-select the next incomplete Task
/dev:impl "Task 1"      Run by specific Task name
/dev:impl T2            Run by Task ID
/dev:impl --all         Run all remaining incomplete Tasks sequentially (batch mode)
```

## Execution Flow

### 1. Read Context, Parse Flags, and Gate Check

1. Parse invocation flags — determine batch mode once before any Task runs:
   - Check if `--all` is present in `$ARGUMENTS`
   - Read batch mode config:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.batch_mode
     ```
   - Set `batch = true` if `--all` is present OR (`batch_mode == "true"` AND no explicit Task ID/name argument is given). An explicit Task argument (e.g. `T2`) always runs a single Task regardless of `batch_mode`. Carry this value through all subsequent steps.

   **`currentBatchRunning` lifecycle:**
   - (a) If `batch == true`, persist the state immediately:
     ```bash
     node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchRunning --value=true
     ```
   - (b) If `batch == false`, check for a stale batch state:
     - **명시적 Task 인자가 주어진 경우 stale 감지를 건너뛴다** (explicit-Task-wins). `currentBatchRunning`은 그대로 둔다.
     - 그 외에는 stale 감지를 수행한다:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchRunning
     ```
     - `"true"` (정확히 일치) → stale batch state detected; use `AskUserQuestion`:
       - **재개 (Recommended)**: override `batch = true`, then execute (a) above
       - **초기화**: run `node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchRunning --value=false`; continue as single-Task
     - 그 외 모든 값(empty string, `"false"`, 기타) → not stale; continue as single-Task

2. Get the current topic from dev-context.json:
   ```bash
   node .harness/scripts/dev-context.js read --field=current_topic
   ```

3. Read `phase` and `status`:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
   node .harness/scripts/dev-context.js read --topic=<topic> --field=status
   ```

4. Gate: if `phase:status` is not `plan:confirmed` and not `impl:in-progress`, stop:
   ```
   구현을 시작할 수 없습니다.
   현재 상태: <phase>:<status>
   plan:confirmed 상태여야 합니다.
   codex "plan-review 스킬을 실행해줘"
   ```

5. Get the plan path and determine which Task to run:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=plan
   node .harness/scripts/dev-context.js read --topic=<topic> --field=currentTask
   ```
   - Explicit Task argument (not `--all`) → that Task
   - `currentTask` value → that Task
   - Otherwise → first incomplete `[ ]` Task in `implementation-plan.md`

### 2. Understand Task Details

Extract from the plan document:
- **Type**: tdd, config, infra, refactor
- **Goal**: What to achieve
- **Work Items**: Checklist
- **Completion Criteria**: Validation criteria

### 3. **Pre-work briefing and approval**

**Batch mode (Task 2 onward)**: If `batch == true` AND this is not the first Task in the current invocation, skip the full briefing. Print a single line instead:
```
--- Starting Task <ID>: <Name> ---
```
Then proceed to Step 4 immediately without waiting for approval.

**All other cases (first Task, or non-batch)**: Present the full briefing:

```
---
## Pre-work Briefing: [Task ID] [Task Name]

### Task Overview
- Type: [tdd / config / infra / refactor]
- Goal: [What to achieve]

### Work Plan
1. [Step 1 in order]
2. [Step 2 in order]

### Affected Files
- `path/to/file.ts` — [Change description]
- `path/to/new-file.ts` — [NEW] [Purpose]

### Caveats
- [Potential issues]
---
```

After the briefing block is printed (closing `---`), **advisor 조건부 호출**을 먼저 수행한다:

**복잡한 Task 판정 조건** — 아래 중 하나라도 해당하면 `advisor`를 호출한다:
- Task Type이 `infra` (스크립트·코드 변경, 시스템 영향 큼)
- Work Items 수 ≥ 5

조건에 해당하면 `advisor()`를 호출해 설계 상 위험·엣지 케이스·대안을 사전 검토한다. advisor 응답을 반영한 뒤 다음 단계로 진행한다. 이 호출은 `auto_start`와 무관하게 항상 실행된다.

그 다음, auto_start config를 읽는다:

```bash
node .harness/scripts/dev-context.js read --field=config.dev_impl.auto_start
```

Branch on the result:
- If the output equals the string `"true"`: print the following line **verbatim** immediately after the briefing block (not merged into it), then proceed to Step 4 without waiting for approval.
  ```
  auto_start 모드: 승인 없이 바로 구현을 시작합니다. (config.dev_impl.auto_start=true)
  ```
- Otherwise (empty string, `"false"`, or any other value): preserve current behavior — do not start implementation without approval.

### 4. Transition to `impl:in-progress` (first Task only)

If current `phase:status` is `plan:confirmed` (not yet `impl:in-progress`):

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=impl --status=in-progress
```

### 5. **Automatically invoke tdd-specialist agent** (type: tdd)

- Write failing tests (RED)
- Confirm tests fail
- Minimal implementation (GREEN)
- Confirm tests pass
- Refactoring (REFACTOR)
- Check coverage

For types `config`, `infra`, `refactor`:
- `config`: Change and validate configuration files
- `infra`: Change infrastructure and document
- `refactor`: Improve structure after ensuring test coverage

**Batch failure condition**: If tdd-specialist reports that RED→GREEN test failure cannot be resolved:
- `batch == true`: set `batch_failed = true` with reason "test failure" and proceed to Step 11 (terminal)
- `batch == false`: surface the failure and stop

### 6. **Automatically invoke code-reviewer agent** (immediately after implementation)

Immediately review the Task code:
- Quality review
- Immediate feedback + fixes

**`tdd` 타입 전용 — simplify 스킬 후속 호출**: code-reviewer 완료 직후, Task Type이 `tdd`이면 `simplify` 스킬을 로드해 실행한다:

```
Load `.claude/skills/simplify/SKILL.md` and follow its process.
```

- simplify는 코드 재사용·효율성·품질을 재검토하고 개선이 있으면 즉시 수정한다.
- `config`·`infra`·`refactor` 타입은 실제 소스 코드가 아닌 설정/문서/구조 변경이므로 simplify를 적용하지 않는다.

**Batch failure condition**: If code-reviewer reports a blocking issue that cannot be resolved automatically:
- `batch == true`: set `batch_failed = true` with reason "blocking review issue" and proceed to Step 11 (terminal)
- `batch == false`: surface the issue and stop

### 7. Verify Completion Criteria

Check completion criteria in the plan document.

**Batch failure condition**: If any Completion Criterion fails verification:
- `batch == true`: set `batch_failed = true` with reason "completion criteria not met" and proceed to Step 11 (terminal)
- `batch == false`: surface the failure and stop

### 8. Execute Commit

Read the `auto_commit` config:

```bash
node .harness/scripts/dev-context.js read --field=config.dev_impl.auto_commit
```

**Find the Commit message** from the current Task's plan block:
- Look for `- **Commit**:` line in the Task section of the plan document
- Extract the subject line (first backtick-quoted value after `**Commit**:`)
- Optionally include the body lines (indented under the subject)

**If no `**Commit**` field exists** in this Task (pre-contract plan or omitted):
```
이 Task에 **Commit** 필드가 없습니다. commit을 건너뛰시겠습니까? (y/skip)
```
- `y` or `skip`: skip commit for this Task and continue to Step 9
- Any other response:
  - `batch == true`: set `batch_failed = true` with reason "user declined to skip commit (no **Commit** field)" and proceed to Step 11 (terminal)
  - `batch == false`: stop

**Stage files**: stage only files changed by this Task. Do **NOT** use `git add -A` or `git add .`.
- Use the list of files from Step 5/6 (tdd-specialist and code-reviewer output) as the staging target.
- **Quote every file path** when passing to `git add` — paths may contain spaces or glob characters: `git add "path/to/file" "other file.ts"`
- Run `git status --short` first, confirm the staged file list with the user if `auto_commit=false`.
- Exclude sensitive files unconditionally: `.env*`, `*.pem`, `*.key`, `credentials.json`.
- When `auto_commit=true`, verify the staged file list against the sensitive file patterns before committing — abort if any match is found regardless of `batch` value.

**If `auto_commit = "true"`**: execute commit automatically using a HEREDOC to avoid shell metacharacter injection:
```bash
git add "<task-file-1>" "<task-file-2>"
git commit -m "$(cat <<'COMMIT_MSG'
<subject>
<body>
COMMIT_MSG
)"
```
Print: `auto_commit: <commit-message>`

**If `auto_commit` is false/empty (default)**: show the planned message and prompt:
```
이 Task의 commit 메시지:
  <commit-subject>
  [<body>]

스테이징 대상 파일: <file list>

지금 commit하시겠습니까? (y/n/skip)
```
- `y`: stage and commit using HEREDOC pattern (never interpolate commit message directly into shell argument)
- `n`:
  - `batch == true`: set `batch_failed = true` with reason "commit refused by user" and proceed to Step 11 (terminal)
  - `batch == false`: stop
- `skip`: skip commit and continue to Step 9 (commit omitted for this Task; not a failure)

**amend is forbidden** — always create a new commit. Review-fix commits from `/dev:review` must also be separate commits (see `.harness/rules/git-workflow.md`).

**Batch failure conditions summary** — any of the following stops the batch loop:
1. tdd-specialist: RED→GREEN test failure unresolved (Step 5)
2. code-reviewer: blocking issue unresolved after auto-fix attempt (Step 6)
3. Completion Criteria: one or more criteria fail verification (Step 7)
4. Commit: user responds `n` (commit refused) (Step 8)
5. No `**Commit**` field: user declines to skip (Step 8)

### 9. Update Plan Document

Mark completed Tasks:
- `[ ]` → `[x]`

### 10. Update dev-context.json

```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=currentTask --value=<next-task-id>
```

Use `null` when all Tasks are complete:
```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=currentTask --value=null
```

### 10.5. Batch Loop Decision

Evaluate when `batch == true` OR (`currentBatchRunning == "true"` AND explicit Task argument was NOT given):

0. Recover persisted batch state (session memory loss guard):
   - If the invocation included an **explicit Task argument** (e.g. `/dev:impl T2`), skip this step entirely (explicit-Task-wins overrides persisted batch state — do not loop).
   - Otherwise, read the persisted field:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchRunning
     ```
   - If the returned value is `"true"`, recover `batch = true` (세션 메모리 소실 보완).
   - Then proceed only if `batch == true`.

1. Read `currentTask` written by Step 10 — this must equal the first remaining `[ ]` Task in `implementation-plan.md`. If they disagree (plan edited mid-batch), use the plan file as the authoritative source and log a warning.
2. If a next Task exists → jump back to Step 2 (start next Task)
3. If no more incomplete Tasks remain → proceed to Step 11 (terminal: batch complete)

### 11. **Output Task completion briefing and stop**

**Per-Task briefing (non-terminal: batch mid-run)**

Reached only when the Batch Loop Decision (Step 10.5) jumps back to Step 2. Not printed separately — the loop continues directly.

**Terminal briefing (single-Task mode, batch complete, or batch stopped)**

단일/배치 모드 무관하게 터미널 브리핑 직전 currentBatchRunning을 false로 초기화한다:

```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.dev_impl.currentBatchRunning --value=false
```

*Single-Task mode (non-batch)*:
```
---
## Task Complete: [Task ID] [Task Name]

### Work Summary
- [Implementation/change details]
- [List of created/modified files]

### Test Results
- Tests: PASS ([X] passed)
- Coverage: [X]%

### Next Task
- [Next incomplete Task ID and name]
- Continue with /dev:impl.
---
```

*Batch complete (all Tasks finished)*:
```
---
## Batch Complete

Completed [N] Tasks:
  [x] Task 1: <name>
  [x] Task 2: <name>
  ...

Next: /dev:review
---
```

*Batch stopped (failure)*:
```
---
## Batch Stopped at Task [ID]: [Name]

Reason: <batch_failed reason>

Completed before stopping:
  [x] Task <n>: <name>  (if any)

Resume after fixing the issue:
  /dev:impl          Resume from the failed Task
  /dev:impl --all    Re-run batch from the failed Task
---
```

**Stop immediately after outputting the terminal briefing. Do not automatically start the next Task.**

## Key Principles

- **One Task at a time (default)** — only one Task per invocation unless `--all` or `config.dev_impl.batch_mode=true` is set; in batch mode all remaining Tasks run sequentially
- **Batch stops on failure** — any of the 5 failure conditions (test, review, criteria, commit refused, no-commit-field refused) halts the batch immediately; `currentBatchRunning` is reset on every terminal exit (Step 11)
- **Batch persistence** — `currentBatchRunning` 필드로 비정상 종료된 배치를 감지·재개한다; Step 1 진입 시 세팅, Step 11 모든 terminal exit 시 false로 초기화 (single-Task·batch complete·batch stopped 무관)
- **Pre-work briefing for first Task only in batch mode** — Task 2 onward shows a single "Starting Task" line; full briefing and approval gate apply only to the first Task (subject to `auto_start`)
- **Prior approval required** (unless `config.dev_impl.auto_start=true`) — do not start the first Task without approving the work plan
- **Gate: plan:confirmed | impl:in-progress** — requires `plan:confirmed` or `impl:in-progress`; if neither, show plan-review command and stop
- **TDD enforced** — `tdd` type must write tests first
- **Immediate review** — automatically invoke code-reviewer immediately after implementation
- **simplify after code-review (tdd only)** — `tdd` 타입은 code-reviewer 직후 `simplify` 스킬을 추가 실행; `config`·`infra`·`refactor` 타입은 제외
- **Pre-work advisor (complex tasks)** — `infra` 타입 또는 Work Items ≥ 5인 Task는 브리핑 직후 `advisor()`를 호출해 설계 위험·엣지 케이스를 사전 점검
- **Commit from plan** — commit message comes from the Task's `**Commit**` field; never invent a message
- **auto_commit default is false** — user sees and approves each commit unless `config.dev_impl.auto_commit=true`
- **batch + auto_start + auto_commit = fully unattended** — enabling all three removes every human gate after Task 1 approval; use only in trusted environments
- **Explicit Task overrides batch_mode** — `/dev:impl T2` always runs a single Task regardless of `config.dev_impl.batch_mode`; `--all` always activates batch mode
- **amend forbidden** — always create a new commit; review-fix commits are separate

## Next Steps

After all Tasks complete (single-Task or batch): final full review with `/dev:review`
