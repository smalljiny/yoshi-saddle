---
version: 20
description: Execute Stories from the implementation plan. Supports `--all` for sequential batch execution of all remaining Stories. Automatically invokes tdd-specialist and code-reviewer per Story. Stops after one Story by default; `--all` or `config.dev_impl.batch_mode=true` runs all remaining Stories sequentially.
category: dev-workflow
---

# /dev:impl

Execute Stories from the implementation plan one at a time, or all at once in batch mode.

## Usage

```
/dev:impl               Auto-select the next incomplete Story
/dev:impl "Story 1"     Run by specific Story name
/dev:impl S2            Run by Story ID
/dev:impl --all         Run all remaining incomplete Stories sequentially (batch mode)
```

## Execution Flow

### 1. Read Context, Parse Flags, and Gate Check

1. Parse invocation flags — determine batch mode once before any Story runs:
   - Check if `--all` is present in `$ARGUMENTS`
   - Read batch mode config:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.batch_mode
     ```
   - Set `batch = true` if `--all` is present OR (`batch_mode == "true"` AND no explicit Story ID/name argument is given). An explicit Story argument (e.g. `S2`) always runs a single Story regardless of `batch_mode`. Carry this value through all subsequent steps.

   **`currentBatchRunning` lifecycle:**
   - (a) If `batch == true`, read `current_topic` and persist batch state (anticipates item 2):
     ```bash
     node .harness/scripts/dev-context.js read --field=current_topic
     node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchRunning --value=true
     node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchTopic --value=<current_topic>
     ```
   - (b) If `batch == false`, check for a stale batch state:
     - **명시적 Story 인자가 주어진 경우 stale 감지를 건너뛴다** (explicit-Story-wins). 이 호출이 Step 11에 도달하면 `currentBatchRunning`은 그때 초기화된다. 배치를 재개하려면 이후 `/dev:impl --all`을 사용한다.
     - 그 외에는 stale 감지를 수행한다:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchRunning
     ```
     - `"true"` (정확히 일치) → stale batch state detected. Also read `currentBatchTopic` and current active topic:
       ```bash
       node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchTopic
       node .harness/scripts/dev-context.js read --field=current_topic
       ```
       - If `currentBatchTopic` ≠ `current_topic` → **topic mismatch**: silently reset both fields and continue as single-Story:
         ```bash
         node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchRunning --value=false
         node .harness/scripts/dev-context.js set-field --field=config.dev_impl.currentBatchTopic --value=false
         ```
       - If topic matches (or `currentBatchTopic` is empty) → use `AskUserQuestion` (include topic name in message):
         - **재개 (Recommended)**: 이전 배치(`<topic>`)를 이어 실행 — override `batch = true`, then execute (a) above
         - **초기화**: persisted batch 상태를 지우고 이 호출은 단일 Story만 실행 — run both reset commands above; continue as single-Story
     - 그 외 모든 값(empty string, `"false"`, 기타) → not stale; continue as single-Story

2. Get the current topic from dev-context.json:
   ```bash
   node .harness/scripts/dev-context.js read --field=current_topic
   ```

3. Read `phase` and `status`:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
   node .harness/scripts/dev-context.js read --topic=<topic> --field=status
   ```

4. Gate + transition: check `phase:status` against the table below. The table is exhaustive — any state not listed stops with the gate failure message.

   | `phase:status` | 동작 |
   |----------------|------|
   | `plan:confirmed` | `node .harness/scripts/dev-context.js update-state --topic=<topic> --phase=impl --status=in-progress` 호출 → 이어서 다음 단계로 진행 |
   | `impl:in-progress` | 그대로 다음 단계로 진행 (no-op) |
   | (그 외) | 아래 메시지를 출력하고 정지 |

   `(그 외)` 행의 게이트 실패 메시지:

   ```
   구현을 시작할 수 없습니다.
   현재 상태: <phase>:<status>
   plan:confirmed 또는 impl:in-progress 상태여야 합니다.
   codex "plan-review 스킬을 실행해줘"
   ```

   **update-state 실패 처리**: `plan:confirmed` 행에서 `update-state` 호출이 비-zero exit이면 즉시 정지하고 다음 메시지를 출력한다. `currentBatchRunning`·`currentBatchTopic`은 정리하지 않는다 — Step 11 미도달로 stale 상태가 유지되어 다음 호출에서 재개 다이얼로그가 자연스럽게 발동한다.

   ```
   phase 전환에 실패했습니다 (update-state 비-zero exit).
   dev-context.json 권한 또는 디스크 상태를 확인하고 다시 시도하세요.
   ```

5. Get the plan path and determine which Story to run:
   ```bash
   node .harness/scripts/dev-context.js read --topic=<topic> --field=plan
   node .harness/scripts/dev-context.js read --topic=<topic> --field=currentStory
   ```
   - Explicit Story argument (not `--all`) → that Story
   - `currentStory` value → that Story
   - Otherwise → first incomplete `[ ]` Story in `implementation-plan.md`

### 2. Understand Story Details

Extract from the plan document:
- **Type**: tdd, config, infra, refactor, prompt
- **Goal**: What to achieve
- **Tasks**: Checklist of `- [ ] T<storyN>.<taskM> — <subject>` lines
- **Completion Criteria**: Validation criteria

### 3. **Pre-work briefing and approval**

**Batch mode (Story 2 onward)**: If `batch == true` AND this is not the first Story in the current invocation, skip the full briefing. Print a single line instead:
```
--- Starting Story <ID>: <Name> ---
```
Then proceed to Step 4 immediately without waiting for approval.

**All other cases (first Story, or non-batch)**: Present the full briefing:

```
---
## Pre-work Briefing: [Story ID] [Story Name]

### Story Overview
- Type: [tdd / config / infra / refactor / prompt]
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

**복잡한 Story 판정 조건** — 아래 중 하나라도 해당하면 `advisor`를 호출한다:
- Story Type이 `infra` (스크립트·코드 변경, 시스템 영향 큼)
- Tasks 수 ≥ 5

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

### 4. Create Task entries for the Story

Step 3 직후, 현재 Story의 `**Tasks**:` 목록을 파싱해 Task 도구 entries를 일괄 생성한다.

**파싱 규칙:**
- 각 `- [ ] T<storyN>.<taskM> — <subject>` 라인을 추출한다 (sub-bullet, 코드 블록, 표는 제외).
- `T<storyN>.<taskM>`을 Task 도구 entry id로 매핑한다.
- subject(라인 첫 줄)를 Task 도구 entry `subject` 필드로 그대로 사용한다.
- `activeForm` 필드는 wf-task-tracking 스킬의 파생 규칙(한국어 종결형 → `X 중`, English imperative → `-ing` 형)으로 생성한다.

**호출 트리거** (prompt-authoring 규칙 7): Step 3 직후, 현재 Story의 Tasks 목록을 파싱해 모든 Task에 대해 `TaskCreate(taskId=T<storyN>.<taskM>, subject=<subject>, activeForm=<derived>, status='pending')`를 일괄 호출한다.

**실패 처리**: TaskCreate 호출 실패 시 stderr에 경고를 출력하고 진행한다 — plan markdown 체크박스가 단일 진실 원천이므로 에이전트 동작은 영향 없다. 에이전트는 wf-task-tracking 스킬의 "실패 처리" fallback에 따라 entry 누락을 호출자에게 보고한 뒤 markdown을 단일 진실 원천으로 계속 작동한다 (Step 9.5는 누락된 entry를 재생성하지 않는다 — `[x]` 라인의 entry 상태만 `completed`로 정렬한다).

**Story 재시도 시 멱등성**: batch_failed 후 같은 Story가 재호출될 수 있다. 동일 `T<storyN>.<taskM>` ID에 TaskCreate가 중복 호출되어 Task 도구가 거부하더라도 본 단계는 stderr 경고 후 계속하며 무해하다 (markdown 단일 진실 원천 + 에이전트 fallback 경로 발동).

### 5. **Automatically invoke agent by Story Type**

**Type: `tdd`** → Invoke **tdd-specialist** agent:
- Write failing tests (RED)
- Confirm tests fail
- Minimal implementation (GREEN)
- Confirm tests pass
- Refactoring (REFACTOR)
- Check coverage

**Type: `prompt`** → Invoke **prompt-engineer** agent:
- Pass: Goal, Eval Cases (from Completion Criteria), Acceptance threshold, target file path
- Agent runs PROPOSE→EVAL→REFINE cycle via `stack-prompt` skill (max 5 iterations)
- Agent reports outcome (success / stagnation / max iterations)

**Type: `refactor`** → Invoke **refactor-cleaner** agent:
- Ensure test coverage exists before refactoring
- Apply incremental structural improvements

**Type: `config`** → Direct handling:
- Change and validate configuration files

**Type: `infra`** → Direct handling:
- Change infrastructure and document

**Batch failure condition**: If the invoked agent (tdd-specialist, prompt-engineer, or refactor-cleaner) reports an unresolvable failure:
- `batch == true`: set `batch_failed = true` with reason "test failure" and proceed to Step 11 (terminal)
- `batch == false`: surface the failure and stop

### 6. **Automatically invoke code-reviewer agent** (immediately after implementation)

Immediately review the Story code:
- Quality review
- Immediate feedback + fixes

**`tdd` 타입 전용 — simplify 스킬 후속 호출**: code-reviewer 완료 직후, Story Type이 `tdd`이면 `simplify` 스킬을 로드해 실행한다:

```
Load `.claude/skills/simplify/SKILL.md` and follow its process.
```

- simplify는 코드 재사용·효율성·품질을 재검토하고 개선이 있으면 즉시 수정한다.
- `config`·`infra`·`refactor`·`prompt` 타입은 simplify를 적용하지 않는다. `prompt` 타입은 REFINE 사이클이 품질 개선을 담당한다.

**`prompt` 타입 — code-reviewer는 comment-only**: `prompt-engineer`가 Eval Acceptance를 달성한 후 code-reviewer가 실행된다. code-reviewer는 **평가 대상 프롬프트 파일을 수정하지 않는다** — 관찰 사항만 보고한다. 프롬프트 파일 수정이 필요하면 `prompt-engineer`를 재호출해 eval 게이트를 다시 통과해야 한다.

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

**Find the Commit message** from the current Story's plan block:
- Look for `- **Commit**:` line in the Story section of the plan document
- Extract the subject line (first backtick-quoted value after `**Commit**:`)
- Optionally include the body lines (indented under the subject)

**If no `**Commit**` field exists** in this Story (pre-contract plan or omitted):
```
이 Story에 **Commit** 필드가 없습니다. commit을 건너뛰시겠습니까? (y/skip)
```
- `y` or `skip`: skip commit for this Story and continue to Step 9
- Any other response:
  - `batch == true`: set `batch_failed = true` with reason "user declined to skip commit (no **Commit** field)" and proceed to Step 11 (terminal)
  - `batch == false`: stop

**Stage files**: stage only files changed by this Story. Do **NOT** use `git add -A` or `git add .`.
- Use the list of files from Step 5/6 (tdd-specialist and code-reviewer output) as the staging target.
- **Quote every file path** when passing to `git add` — paths may contain spaces or glob characters: `git add "path/to/file" "other file.ts"`
- Run `git status --short` first, confirm the staged file list with the user if `auto_commit=false`.
- Exclude sensitive files unconditionally: `.env*`, `*.pem`, `*.key`, `credentials.json`.
- When `auto_commit=true`, verify the staged file list against the sensitive file patterns before committing — abort if any match is found regardless of `batch` value.

**If `auto_commit = "true"`**: execute commit automatically using a HEREDOC to avoid shell metacharacter injection:
```bash
git add "<story-file-1>" "<story-file-2>"
git commit -m "$(cat <<'COMMIT_MSG'
<subject>
<body>
COMMIT_MSG
)"
```
Print: `auto_commit: <commit-message>`

**If `auto_commit` is false/empty (default)**: show the planned message and prompt:
```
이 Story의 commit 메시지:
  <commit-subject>
  [<body>]

스테이징 대상 파일: <file list>

지금 commit하시겠습니까? (y/n/skip)
```
- `y`: stage and commit using HEREDOC pattern (never interpolate commit message directly into shell argument)
- `n`:
  - `batch == true`: set `batch_failed = true` with reason "commit refused by user" and proceed to Step 11 (terminal)
  - `batch == false`: stop
- `skip`: skip commit and continue to Step 9 (commit omitted for this Story; not a failure)

**amend is forbidden** — always create a new commit. Review-fix commits from `/dev:review` must also be separate commits (see `.harness/rules/git-workflow.md`).

**Batch failure conditions summary** — any of the following stops the batch loop:
1. tdd-specialist: RED→GREEN test failure unresolved (Step 5)
2. code-reviewer: blocking issue unresolved after auto-fix attempt (Step 6)
3. Completion Criteria: one or more criteria fail verification (Step 7)
4. Commit: user responds `n` (commit refused) (Step 8)
5. No `**Commit**` field: user declines to skip (Step 8)

### 9. Update Plan Document (Story checkbox)

Mark the completed Story:
- Story checkbox: `### [ ] Story N` → `### [x] Story N`

### 9.5. Sync markdown checkboxes from Task tool entries

Step 9 완료 직후, Task 도구 entries 상태를 단일 진실 원천으로 두고 plan markdown의 Task 체크박스를 갱신한다 (entries → markdown 방향).

**호출 트리거** (prompt-authoring 규칙 7): Step 9 완료 직후, 본 단계를 실행한다. 각 entry 상태를 조회하고 아래 분기 표에 따라 markdown을 Edit한다.

**4단계 흐름:**

1. **Tasks 목록 파싱**: 현재 Story의 `**Tasks**:` 목록에서 모든 `- [ ] T<storyN>.<taskM> — <subject>` 라인을 추출한다 (sub-bullet, 코드 블록, 표 라인은 제외).
2. **entry 상태 조회**: 추출된 모든 `T<storyN>.<taskM>` ID에 대해 Task 도구 entry 상태를 조회한다.
3. **분기 처리** (각 Task별):
   - `status=completed` → markdown `- [ ]` → `- [x]` Edit
   - `status=pending` 또는 `status=in_progress` → 미체크 유지 (markdown 변경 없음)
   - entry 없음 (TaskCreate 실패로 누락) → markdown 상태 그대로 유지 (Edit 안 함)
4. **미체크 Task 수집**: 분기 처리 후 markdown에 남아 있는 `- [ ]` Task 라인을 수집한다.
   - 0건 → Step 10으로 진행
   - 1건 이상 → Story 2의 미체크 Task 게이트로 흐름 (Story 2에서 도입). Story 2 미적용 상태에서는 본 분기를 무시하고 Step 10으로 진행한다.

### 10. Update dev-context.json

```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=currentStory --value=<next-story-id>
```

Use `null` when all Stories are complete:
```bash
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=currentStory --value=null
```

### 10.5. Batch Loop Decision

Evaluate after Step 10 (sub-step 0 owns the full skip/recover/proceed logic):

0. Recover persisted batch state (session memory loss guard):
   - If the invocation included an **explicit Story argument** (e.g. `/dev:impl S2`), skip this step entirely (explicit-Story-wins overrides persisted batch state — do not loop).
   - Otherwise, read the persisted fields:
     ```bash
     node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchRunning
     node .harness/scripts/dev-context.js read --field=config.dev_impl.currentBatchTopic
     ```
   - If `currentBatchRunning == "true"` AND `currentBatchTopic` matches the active topic (or `currentBatchTopic` is empty), recover `batch = true` (세션 메모리 소실 보완).
   - If `currentBatchRunning == "true"` AND `currentBatchTopic` ≠ active topic, do not recover — topic mismatch; `batch` remains unchanged.
   - Then proceed only if `batch == true`.

1. Read `currentStory` written by Step 10 — this must equal the first remaining `[ ]` Story in `implementation-plan.md`. If they disagree (plan edited mid-batch), use the plan file as the authoritative source and log a warning.
2. If a next Story exists → jump back to Step 2 (start next Story)
3. If no more incomplete Stories remain → proceed to Step 11 (terminal: batch complete)

### 11. **Output Story completion briefing and stop**

**Per-Story briefing (non-terminal: batch mid-run)**

Reached only when the Batch Loop Decision (Step 10.5) jumps back to Step 2. Not printed separately — the loop continues directly.

**Terminal briefing (single-Story mode, batch complete, or batch stopped)**

단일/배치 모드 무관하게 터미널 브리핑 직전 batch 상태 필드를 초기화한다. reset 명령 실패 시에는 오류를 표시하고 터미널 브리핑을 중단한다:

```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.dev_impl.currentBatchRunning --value=false
node .harness/scripts/dev-context.js set-field \
  --field=config.dev_impl.currentBatchTopic --value=false
```

*Single-Story mode (non-batch)*:
```
---
## Story Complete: [Story ID] [Story Name]

### Work Summary
- [Implementation/change details]
- [List of created/modified files]

### Test Results
- Tests: PASS ([X] passed)
- Coverage: [X]%

### Next Story
- [Next incomplete Story ID and name]
- Continue with /dev:impl.
---
```

*Batch complete (all Stories finished)*:
```
---
## Batch Complete

Completed [N] Stories:
  [x] Story 1: <name>
  [x] Story 2: <name>
  ...

Next: /dev:review
---
```

*Batch stopped (failure)*:
```
---
## Batch Stopped at Story [ID]: [Name]

Reason: <batch_failed reason>

Completed before stopping:
  [x] Story <n>: <name>  (if any)

Resume after fixing the issue:
  /dev:impl          Resume from the failed Story
  /dev:impl --all    Re-run batch from the failed Story
---
```

**Stop immediately after outputting the terminal briefing. Do not automatically start the next Story.**

## Key Principles

- **One Story at a time (default)** — only one Story per invocation unless `--all` or `config.dev_impl.batch_mode=true` is set; in batch mode all remaining Stories run sequentially
- **Story-start TaskCreate batch** — at Step 4, parse the current Story's `**Tasks**:` list and emit one batched `TaskCreate(pending)` covering every Task before invoking the implementation agent
- **Reverse Step 9.5** — Task 도구 entries 상태가 markdown 체크박스의 단일 진실 원천이며, `/dev:impl`이 Story 종료 시점에 entries → markdown 방향으로 sync한다 (`status=completed` → `[x]`, `pending`·`in_progress` → 미체크 유지, entry 없음 → markdown 그대로)
- **Batch stops on failure** — any of the 5 failure conditions (test, review, criteria, commit refused, no-commit-field refused) halts the batch immediately; `currentBatchRunning` is reset on every terminal exit (Step 11)
- **Batch persistence** — `currentBatchRunning`·`currentBatchTopic` 필드로 비정상 종료된 배치를 topic-scoped로 감지·재개한다; 토픽 불일치 시 silently reset, Step 11 모든 terminal exit 시 초기화. Step 1 게이트 실패 등 Step 11 미도달 시에는 stale 상태가 유지되어 다음 호출에서 재개 다이얼로그를 트리거한다.
- **Pre-work briefing for first Story only in batch mode** — Story 2 onward shows a single "Starting Story" line; full briefing and approval gate apply only to the first Story (subject to `auto_start`)
- **Prior approval required** (unless `config.dev_impl.auto_start=true`) — do not start the first Story without approving the work plan
- **Gate + transition** — Step 1에서 `phase:status` 상태 테이블로 게이트 검사와 `plan:confirmed → impl:in-progress` 전환을 한 단계에 처리; `update-state` 비-zero exit 시 즉시 정지하고 `currentBatchRunning`·`currentBatchTopic`은 정리하지 않는다
- **Approval rejection no rollback** — 사용자가 briefing 승인을 거절(`n`)해도 phase는 `impl:in-progress`로 유지된다. 게이트가 두 상태 모두 통과시키므로 다음 호출이 자연스럽게 재개된다.
- **TDD enforced** — `tdd` type must write tests first
- **Immediate review** — automatically invoke code-reviewer immediately after implementation
- **simplify after code-review (tdd only)** — `tdd` 타입은 code-reviewer 직후 `simplify` 스킬을 추가 실행; `config`·`infra`·`refactor`·`prompt` 타입은 제외 (`prompt`는 REFINE 사이클이 담당)
- **Pre-work advisor (complex Stories)** — `infra` 타입 또는 Tasks 수 ≥ 5인 Story는 브리핑 직후 `advisor()`를 호출해 설계 위험·엣지 케이스를 사전 점검
- **Commit from plan** — commit message comes from the Story's `**Commit**` field; never invent a message
- **auto_commit default is false** — user sees and approves each commit unless `config.dev_impl.auto_commit=true`
- **batch + auto_start + auto_commit = fully unattended** — enabling all three removes every human gate after Story 1 approval; use only in trusted environments
- **Explicit Story overrides batch_mode** — `/dev:impl S2` always runs a single Story regardless of `config.dev_impl.batch_mode`; `--all` always activates batch mode
- **amend forbidden** — always create a new commit; review-fix commits are separate

## Next Steps

After all Stories complete (single-Story or batch): final full review with `/dev:review`
