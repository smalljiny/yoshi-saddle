---
version: 5
description: Execute a single Task from the implementation plan. Automatically invokes tdd-specialist and code-reviewer. Stops after completing one Task.
category: dev-workflow
---

# /dev:impl

Execute Tasks from the implementation plan one at a time.

## Usage

```
/dev:impl               Auto-select the next incomplete Task
/dev:impl "Task 1"      Run by specific Task name
/dev:impl T2            Run by Task ID
```

## Execution Flow

### 1. Read Context and Gate Check

1. Get the current topic from dev-context.json:
   ```bash
   node .harness/scripts/dev-context.js read --field=current_topic
   ```

2. Read `phase` and `status`:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
   node .harness/scripts/dev-context.js read --topic=<topic> --field=status
   ```

3. Gate: if `phase:status` is not `plan:confirmed` and not `impl:in-progress`, stop:
   ```
   구현을 시작할 수 없습니다.
   현재 상태: <phase>:<status>
   plan:confirmed 상태여야 합니다.
   codex "plan-review 스킬을 실행해줘"
   ```

4. Get the plan path and determine which Task to run:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=plan
   node .harness/scripts/dev-context.js read --topic=<topic> --field=currentTask
   ```
   - Explicit argument → that Task
   - `currentTask` value → that Task
   - Otherwise → first incomplete `[ ]` Task in `implementation-plan.md`

### 2. Understand Task Details

Extract from the plan document:
- **Type**: tdd, config, infra, refactor
- **Goal**: What to achieve
- **Work Items**: Checklist
- **Completion Criteria**: Validation criteria

### 3. **Pre-work briefing and approval**

Before starting implementation, present the work plan to the user:

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

After the briefing block is printed (closing `---`), read the auto_start config:

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

### 6. **Automatically invoke code-reviewer agent** (immediately after implementation)

Immediately review the Task code:
- Quality review
- Immediate feedback + fixes

### 7. Verify Completion Criteria

Check completion criteria in the plan document.

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
- `y`: skip commit for this Task
- `skip`: same as `y`
Proceed to Step 9.

**Stage files**: stage only files changed by this Task. Do **NOT** use `git add -A` or `git add .`.
- Use the list of files from Step 5/6 (tdd-specialist and code-reviewer output) as the staging target.
- Run `git status --short` first, confirm the staged file list with the user if `auto_commit=false`.
- Exclude sensitive files unconditionally: `.env*`, `*.pem`, `*.key`, `credentials.json`.

**If `auto_commit = "true"`**: execute commit automatically using a HEREDOC to avoid shell metacharacter injection:
```bash
git add <task-files>
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
- `n`: stop — do not proceed to the next step until the user manually commits or re-runs `/dev:impl`
- `skip`: skip commit and continue to Step 9 (commit omitted for this Task)

**amend is forbidden** — always create a new commit. Review-fix commits from `/dev:review` must also be separate commits (see `.harness/rules/git-workflow.md`).

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

### 11. **Output Task completion briefing and stop**

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

**Stop immediately after outputting the briefing. Do not automatically start the next Task.**

## Key Principles

- **One Task at a time** — only one Task per invocation
- **Prior approval required** (unless `config.dev_impl.auto_start=true`) — do not start implementation without approving the work plan
- **Gate: plan:confirmed | impl:in-progress** — requires `plan:confirmed` or `impl:in-progress`; if neither, show plan-review command and stop
- **TDD enforced** — `tdd` type must write tests first
- **Immediate review** — automatically invoke code-reviewer immediately after implementation
- **Commit from plan** — commit message comes from the Task's `**Commit**` field; never invent a message
- **auto_commit default is false** — user sees and approves each commit unless `config.dev_impl.auto_commit=true`
- **amend forbidden** — always create a new commit; review-fix commits are separate

## Next Steps

After all Tasks complete: final full review with `/dev:review`
