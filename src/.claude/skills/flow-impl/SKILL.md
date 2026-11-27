---
version: 3
name: flow-impl
description: Execute Stories from the implementation plan. Supports `--all` for sequential batch execution of all remaining Stories. Automatically invokes tdd-specialist and code-reviewer per Story. Stops after one Story by default; `--all` or `config.dev_impl.batch_mode=true` runs all remaining Stories sequentially.
origin: harness
user-invocable: true
---

# /flow-impl

Execute Stories from the implementation plan one at a time, or all at once in batch mode.

## Usage

```
/flow-impl               Auto-select the next incomplete Story
/flow-impl "Story 1"     Run by specific Story name
/flow-impl S2            Run by Story ID
/flow-impl --all         Run all remaining incomplete Stories sequentially (batch mode)
```

## Execution Flow

### 1. Read Context, Parse Flags, and Gate Check

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.claude/skills/flow-impl/templates/messages.<lang>.md` for the chosen language and `.claude/skills/flow-impl/templates/messages.en.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and print the question only if it passes. Before printing the question (for a mixed block, before its first line), run this Bash command with the IDs listed for that question (and the IDs of messages you will read to fill its placeholders):

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .claude/skills/flow-impl/templates/messages.<lang>.md .claude/skills/flow-impl/templates/messages.en.md
```

An ID that appears in neither file's output cannot be obtained. Check only the IDs you will actually display in the current branch, after computing the items to display. If any cannot be obtained, do not print the question or any part of its block: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no commits, plan or state updates, or later Stories after that point). Work already finished before the question stays as it is.

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
     - **명시적 Story 인자가 주어진 경우 stale 감지를 건너뛴다** (explicit-Story-wins). 이 호출이 Step 11에 도달하면 `currentBatchRunning`은 그때 초기화된다. 배치를 재개하려면 이후 `/flow-impl --all`을 사용한다.
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
       - If topic matches (or `currentBatchTopic` is empty) → call `AskUserQuestion` with {{ask:BATCH_RESUME|RESUME|RESET}} (`{topic}` is `currentBatchTopic`, or `current_topic` when it is empty). Answer-required IDs: `BATCH_RESUME_Q`, `BATCH_RESUME_HEADER`, `BATCH_RESUME_RESUME_LABEL`, `BATCH_RESUME_RESUME_DESC`, `BATCH_RESUME_RESET_LABEL`, `BATCH_RESUME_RESET_DESC`. Apply the answer-required check; if it stops, do not reset or persist batch state and do not run any Story.
         - `RESUME` (Recommended): override `batch = true`, then execute (a) above
         - `RESET`: run both reset commands above; continue as single-Story
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

   `(그 외)` 행의 게이트 실패 메시지: output {{msg:GATE_FAILED}}. `{phase}` and `{status}` are the values read above.

   **update-state 실패 처리**: `plan:confirmed` 행에서 `update-state` 호출이 비-zero exit이면 즉시 정지하고 {{msg:STATE_TRANSITION_FAILED}}를 출력한다. `currentBatchRunning`·`currentBatchTopic`은 정리하지 않는다 — Step 11 미도달로 stale 상태가 유지되어 다음 호출에서 재개 다이얼로그가 자연스럽게 발동한다.

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

**Batch mode (Story 2 onward)**: If `batch == true` AND this is not the first Story in the current invocation, skip the full briefing. Print a single line instead: {{msg:STORY_START}} (`{story_id}` is the Story ID, `{story_name}` is the Story name).
Then proceed to Step 4 immediately without waiting for approval.

**All other cases (first Story, or non-batch)**: Present the full briefing, in this order:

1. A `---` line.
2. {{msg:BRIEFING_TITLE}} (`{story_id}`, `{story_name}`: the Story ID and name), then a blank line.
3. {{msg:BRIEFING_OVERVIEW}} (`{type}`: the Story Type; `{goal}`: what the Story achieves), then a blank line.
4. {{msg:BRIEFING_PLAN_TITLE}}, then the work steps in order as a numbered list (`1. …`), then a blank line.
5. {{msg:BRIEFING_FILES_TITLE}}, then one line per affected file: ``- `<path>` — <change description>``; for a new file put {{msg:BRIEFING_NEW_MARK}} before its purpose. Then a blank line.
6. {{msg:BRIEFING_CAVEATS_TITLE}}, then one `- ` line per potential issue.
7. A closing `---` line.

Write the step, change, and caveat texts in the conversation language.

After the briefing block is printed (closing `---`), **advisor 조건부 호출**을 먼저 수행한다:

**복잡한 Story 판정 조건** — 아래 중 하나라도 해당하면 `advisor`를 호출한다:
- Story Type이 `infra` (스크립트·코드 변경, 시스템 영향 큼)
- Tasks 수 ≥ 5

조건에 해당하면 `advisor()`를 호출해 설계 상 위험·엣지 케이스·대안을 사전 검토한다.

`advisor()`는 Claude Code 런타임이 제공하는 built-in 도구이며 별도 스킬·에이전트 로드 없이 호출한다. 도구가 노출되지 않은 환경(headless Codex 등)에서는 호출이 실패하므로 경고 메시지를 출력한 뒤 advisor 단계를 건너뛰고 다음 단계로 진행한다 — `simplify`와 동일한 가용성 fallback 패턴이다.

advisor 응답을 반영한 뒤 다음 단계로 진행한다. 이 호출은 `auto_start`와 무관하게 항상 실행된다.

그 다음, auto_start config를 읽는다:

```bash
node .harness/scripts/dev-context.js read --field=config.dev_impl.auto_start
```

Branch on the result:
- If the output equals the string `"true"`: print {{msg:AUTO_START_NOTICE}} immediately after the briefing block (not merged into it), then proceed to Step 4 without waiting for approval.
- Otherwise (empty string, `"false"`, or any other value): preserve current behavior — do not start implementation without approval. Approval comes from the user's free reply in the conversation; do not ask it through `AskUserQuestion` or a catalog message.

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

**Language line for delegations** (applies to every agent delegation in Steps 5 and 6 — tdd-specialist, prompt-engineer, refactor-cleaner, code-reviewer): immediately before the delegation, run

```bash
node .harness/scripts/lang.js resolve --kind=conversation
node .harness/scripts/lang.js resolve --kind=docs
node .harness/scripts/lang.js resolve --kind=commit
```

Judge each dimension separately: if a resolve exits non-zero or its stdout is not exactly `ko` or `en`, use `en` for that dimension. Put `Language: conversation=<ko|en> docs=<ko|en> commit=<ko|en>` as the first line of the delegation prompt.

**Type: `tdd`** → Invoke **tdd-specialist** agent (Language line first, as above):
- Write failing tests (RED)
- Confirm tests fail
- Minimal implementation (GREEN)
- Confirm tests pass
- Refactoring (REFACTOR)
- Check coverage

**Type: `prompt`** → Invoke **prompt-engineer** agent (Language line first, as above):
- Pass: Goal, Eval Cases (from Completion Criteria), Acceptance threshold, target file path
- Agent runs PROPOSE→EVAL→REFINE cycle via `stack-prompt` skill (max 5 iterations)
- Agent reports outcome (success / stagnation / max iterations)

**Type: `refactor`** → Invoke **refactor-cleaner** agent (Language line first, as above):
- Ensure test coverage exists before refactoring
- Apply incremental structural improvements

**Type: `config`** → Direct handling:
- Change and validate configuration files

**Type: `infra`** → Direct handling:
- Change infrastructure and document

**Batch failure condition**: If the invoked agent (tdd-specialist, prompt-engineer, or refactor-cleaner) reports an unresolvable failure:
- `batch == true`: set `batch_failed = true` with reason {{msg:BATCH_REASON_TEST_FAILURE}} and proceed to Step 11 (terminal)
- `batch == false`: surface the failure and stop

### 6. **Automatically invoke code-reviewer agent** (immediately after implementation)

Immediately review the Story code (Language line first, as in Step 5):
- Quality review
- Immediate feedback + fixes

**`tdd` 타입 전용 — simplify 스킬 후속 호출**: code-reviewer 완료 직후, Story Type이 `tdd`이면 외부 plugin 스킬 `simplify`를 Skill 도구로 호출해 실행한다.

- simplify는 외부 plugin으로 설치된 스킬이며, 사용 가능 스킬 목록에 `simplify`가 노출돼 있을 때만 동작한다. 등록되지 않은 환경에서는 이 단계를 건너뛴다.
- simplify는 코드 재사용·효율성·품질을 재검토하고 개선이 있으면 즉시 수정한다.
- `config`·`infra`·`refactor`·`prompt` 타입은 simplify를 적용하지 않는다. `prompt` 타입은 REFINE 사이클이 품질 개선을 담당한다.

**`prompt` 타입 — code-reviewer는 comment-only**: `prompt-engineer`가 Eval Acceptance를 달성한 후 code-reviewer가 실행된다. code-reviewer는 **평가 대상 프롬프트 파일을 수정하지 않는다** — 관찰 사항만 보고한다. 프롬프트 파일 수정이 필요하면 `prompt-engineer`를 재호출해 eval 게이트를 다시 통과해야 한다.

**Batch failure condition**: If code-reviewer reports a blocking issue that cannot be resolved automatically:
- `batch == true`: set `batch_failed = true` with reason {{msg:BATCH_REASON_REVIEW_ISSUE}} and proceed to Step 11 (terminal)
- `batch == false`: surface the issue and stop

### 7. Verify Completion Criteria

각 Completion Criterion을 단위 점검하고, 통과한 Criterion의 markdown 체크박스를 `[x]`로 갱신한 뒤 PASS/FAIL 근거를 리스트로 출력한다.

**1단계 — Story Type 분기**:

- **`prompt` 타입**: `prompt-engineer` Acceptance 결과를 재사용한다.
  - Acceptance 통과 → 현재 Story의 모든 Eval Case 체크박스를 markdown `- [ ]` → `- [x]`로 Edit한다 (스코프: 현재 Story의 Completion Criteria 한정).
  - Acceptance 미통과 → 기존 batch_failed 정책 적용 (아래 batch failure condition 참조).
- **`tdd` / `config` / `infra` / `refactor` 타입**: 본 단계에서 LLM이 각 Criterion을 직접 점검한다 (2단계로 진행).

**2단계 — Criterion 단위 점검** (스코프: 현재 Story의 모든 Completion Criteria 라인):

현재 Story의 `**Completion Criteria**:` 목록에서 모든 `- [ ]` 라인을 순회하며 각 Criterion을 점검한다.

**3단계 — 점검 방법**: Criterion 텍스트가 명시한 방법을 적용한다.
- 파일 존재 확인 (`test -f`, `ls`)
- 파일 내용 검사 (`grep`, `rg`, Read 도구)
- 명령 실행 결과 검사 (Criterion이 명시한 명령에 한함)

**4단계 — Bash 도구 호출 트리거 정책** (read-only 명령에 한정):

- **허용 명령** (파일·환경·네트워크를 변경하지 않는 read-only 명령에 한해 Bash 호출 허용):
  - 파일 검사: `test -f`, `test -d`, `ls`
  - 텍스트 검색: `grep`, `rg`, `head`, `tail`, `cat`, `wc`
  - Git read-only: `git diff`, `git log`, `git show`, `git status`, `git branch`
  - Criterion이 백틱 리터럴로 명시한 read-only 명령 (예: `node --test`, `bash -n`, `tsc --noEmit`). 호출 전 다음 mutating 토큰이 인자에 없는지 확인하고, 하나라도 발견되면 Bash 호출을 거부한다: `-delete`, `-exec`, `-execdir`, `-ok`, `>`, `>>`, `rm`, `mv`, `cp`, `chmod`, `chown`, `|` (외부 명령 파이프).
- **빌드·테스트 결과 재사용**: Step 5에서 실행된 빌드·테스트 명령(예: `npm test`, `npm run build`, `jest`, `pytest`)의 결과는 재실행하지 않고 Step 5 보고 메시지의 마지막 결과 라인(GREEN 확인 라인 / 종료 코드 / stdout 마지막 줄)을 인용해 판정한다.
- **금지**: 파일·환경 변경, 패키지 설치, 네트워크 호출, 위 mutating 토큰을 포함하는 명령. 이들 명령이 필요한 Criterion은 Bash로 실행하지 않고 Read 도구 + Step 5 증거로 판정한다.
- **판정 증거 부재**: Read 도구·Step 5 증거·허용 명령으로도 판정할 수 없으면 FAIL 처리하고 사유에 `evidence-not-available`을 명시한다.

**5단계 — 결과 처리**:
- 통과한 Criterion → markdown `- [ ]` → `- [x]` Edit (현재 Story의 Completion Criteria 한정 스코프).
- 실패한 Criterion → `- [ ]` 유지.

**6단계 — PASS/FAIL 출력 형식** (마크다운 표 아닌 단순 리스트로 출력 — batch 모드 출력량 우려 해소):

Output {{msg:CRITERIA_TITLE}}, then one line per Criterion: {{msg:CRITERION_PASS}} for a passed Criterion or {{msg:CRITERION_FAIL}} for a failed one. `{criterion}` is a short summary of the Criterion text and `{evidence}` is the one-line evidence (for a failure, the failure reason), both in the conversation language.

**Batch failure condition**: 1개 이상 Criterion이 FAIL이면:
- `batch == true`: set `batch_failed = true` with reason {{msg:BATCH_REASON_CRITERIA}} and proceed to Step 11 (terminal)
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

**If no `**Commit**` field exists** in this Story (pre-contract plan or omitted): ask {{msg:NO_COMMIT_FIELD}} as a plain-text question. Answer-required ID: `NO_COMMIT_FIELD`. Apply the answer-required check; if it stops, do not commit, do not decide to skip, and do not run Step 9 or any later step.
- `y` or `skip`: skip commit for this Story and continue to Step 9
- Any other response:
  - `batch == true`: set `batch_failed = true` with reason {{msg:BATCH_REASON_NO_COMMIT_FIELD}} and proceed to Step 11 (terminal)
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
Print {{msg:AUTO_COMMIT_DONE}} (`{commit_message}` is the commit subject).

**If `auto_commit` is false/empty (default)**: show the planned message and prompt as one block, in this order:

1. {{msg:COMMIT_CONFIRM_TITLE}} (decoration part).
2. {{msg:COMMIT_CONFIRM_SUBJECT}} (`{commit_subject}`: the commit subject), then {{msg:COMMIT_CONFIRM_BODY}} once per body line when the **Commit** field has a body (`{commit_body}`: that body line). Then a blank line.
3. {{msg:COMMIT_CONFIRM_FILES}} (`{files}`: the staging target files separated by spaces), then a blank line.
4. {{msg:COMMIT_CONFIRM_Q}} (question part).

Answer-required IDs: `COMMIT_CONFIRM_SUBJECT`, `COMMIT_CONFIRM_BODY` (only when a body line is shown), `COMMIT_CONFIRM_FILES`, `COMMIT_CONFIRM_Q`. Apply the answer-required check before printing the block: if any answer-required ID is absent from both catalog files, print only the diagnostics — none of the block, not even the title line or a question of your own — and do not commit, do not mark the Story complete (Step 9), and do not start the next Story. `COMMIT_CONFIRM_TITLE` is decoration: if it alone is absent, print `[missing message: COMMIT_CONFIRM_TITLE]` as the first line and print the rest normally.

- `y`: stage and commit using HEREDOC pattern (never interpolate commit message directly into shell argument)
- `n`:
  - `batch == true`: set `batch_failed = true` with reason {{msg:BATCH_REASON_COMMIT_REFUSED}} and proceed to Step 11 (terminal)
  - `batch == false`: stop
- `skip`: skip commit and continue to Step 9 (commit omitted for this Story; not a failure)

**amend is forbidden** — always create a new commit. Review-fix commits from `/flow-review` must also be separate commits (see `.harness/rules/git-workflow.md`).

**Batch failure conditions summary** — any of the following stops the batch loop:
1. tdd-specialist: RED→GREEN test failure unresolved (Step 5)
2. code-reviewer: blocking issue unresolved after auto-fix attempt (Step 6)
3. Completion Criteria: one or more criteria fail verification (Step 7)
4. Commit: user responds `n` (commit refused) (Step 8)
5. No `**Commit**` field: user declines to skip (Step 8)
6. Unchecked tasks gate: user selects `NOT_DONE` (Step 9.5 게이트)

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
   - 1건 이상 → 아래 미체크 Task 게이트 실행

**미체크 Task 게이트**

**호출 트리거** (prompt-authoring 규칙 7): Step 9.5 분기 처리 후 미체크 `[ ]` Task가 1건 이상 남아 있으면 `AskUserQuestion`을 호출한다. 미체크 Task가 0건이면 본 게이트를 건너뛰고 Step 10으로 진행한다. 본 게이트는 단일 모드·batch 모드 모두 일시 중단한다 (Key Principles "fully unattended" 예외 — 데이터 정합성 결정이 자동화 불가).

호출 형태: `AskUserQuestion` with {{ask:UNCHECKED_TASKS|REPORT_MISSING|NOT_DONE}} (`multiSelect: false`). `{count}` is the number of unchecked Task lines. Answer-required IDs: `UNCHECKED_TASKS_Q`, `UNCHECKED_TASKS_HEADER`, `UNCHECKED_TASKS_REPORT_MISSING_LABEL`, `UNCHECKED_TASKS_REPORT_MISSING_DESC`, `UNCHECKED_TASKS_NOT_DONE_LABEL`, `UNCHECKED_TASKS_NOT_DONE_DESC`. Apply the answer-required check; if it stops, do not change checkboxes or Task entries, do not update dev-context, and do not start the next Story.

**옵션 1 (`REPORT_MISSING`) 처리 분기** (순서대로 실행):
- **스코프**: 현재 Story 헤더(`### [ ] Story N` 또는 `### [x] Story N`) 다음 라인부터 다음 Story 헤더 직전까지의 라인만 대상으로 한다. 다른 Story의 체크박스는 변경하지 않는다.
- **1단계 (markdown Edit)**: 위 스코프 내 모든 미체크 Task 라인을 markdown `- [ ]` → `- [x]`로 Edit한다.
- **2단계 (TaskUpdate)**: 미체크였던 모든 `T<storyN>.<taskM>`에 대해 `TaskUpdate(taskId=T<storyN>.<taskM>, status='completed')`를 호출한다.
- **entry 없는 Task** (TaskCreate 실패로 누락된 케이스): markdown `[x]`만 처리하고 entry 생성은 생략한다 — wf-task-tracking fallback 규약을 따른다.
- 처리 후 Step 10으로 진행.

**옵션 2 (`NOT_DONE`) 처리 분기**:
- markdown 체크박스와 Task 도구 entries 모두 변경하지 않는다.
- `batch == false` (단일 모드): 작업 중단. {{msg:UNCHECKED_STOP}}를 출력한다 (`{story_id}`는 현재 Story ID).
- `batch == true` (batch 모드): `batch_failed = true` 설정 (reason: {{msg:BATCH_REASON_UNCHECKED_TASKS}}) → Step 11 terminal로 진행.

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
   - If the invocation included an **explicit Story argument** (e.g. `/flow-impl S2`), skip this step entirely (explicit-Story-wins overrides persisted batch state — do not loop).
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

Each terminal briefing starts and ends with a `---` line. Write free-text items in the conversation language.

*Single-Story mode (non-batch)*:
1. {{msg:STORY_COMPLETE_TITLE}} (`{story_id}`, `{story_name}`: the completed Story), then a blank line.
2. {{msg:WORK_SUMMARY_TITLE}}, then one `- ` line per implementation/change detail and one listing the created/modified files, then a blank line.
3. {{msg:TEST_RESULTS}} (`{passed}`: the number of passed tests; `{coverage}`: the coverage percentage), then a blank line.
4. {{msg:NEXT_STORY}} (`{next_story}`: the next incomplete Story ID and name).

*Batch complete (all Stories finished)*:
1. {{msg:BATCH_COMPLETE_TITLE}}, then a blank line.
2. {{msg:BATCH_COMPLETE_COUNT}} (`{count}`: the number of Stories completed in this invocation).
3. {{msg:BATCH_STORY_LINE}} once per completed Story, in order (`{story_number}`, `{story_name}`), then a blank line.
4. {{msg:BATCH_COMPLETE_NEXT}}.

*Batch stopped (failure)*:
1. {{msg:BATCH_STOPPED_TITLE}} (`{story_id}`, `{story_name}`: the Story where the batch stopped), then a blank line.
2. {{msg:BATCH_STOPPED_REASON}} (`{reason}`: the `batch_failed` reason message set in the step that failed), then a blank line.
3. If Stories completed before stopping: {{msg:BATCH_STOPPED_DONE}}, then {{msg:BATCH_STORY_LINE}} once per completed Story, then a blank line.
4. {{msg:BATCH_STOPPED_RESUME}}.

**Stop immediately after outputting the terminal briefing. Do not automatically start the next Story.**

## Key Principles

- **One Story at a time (default)** — only one Story per invocation unless `--all` or `config.dev_impl.batch_mode=true` is set; in batch mode all remaining Stories run sequentially
- **Story-start TaskCreate batch** — at Step 4, parse the current Story's `**Tasks**:` list and emit one batched `TaskCreate(pending)` covering every Task before invoking the implementation agent
- **Reverse Step 9.5** — Task 도구 entries 상태가 markdown 체크박스의 단일 진실 원천이며, `/flow-impl`이 Story 종료 시점에 entries → markdown 방향으로 sync한다 (`status=completed` → `[x]`, `pending`·`in_progress` → 미체크 유지, entry 없음 → markdown 그대로)
- **Unchecked-Task gate** — Step 9.5 후 `[ ]` Task가 남으면 단일·batch 모드 모두 사용자에게 의도(보고 누락 / 실제 미수행)를 묻고 분기한다. '보고 누락' → markdown `[x]` + `TaskUpdate(completed)` 처리 후 Step 10 진행, '실제 미수행' → 단일 모드 stop / batch 모드 batch_failed (Step 11)
- **Per-Criterion verification** — Step 7은 각 Completion Criterion을 LLM이 직접 점검 (`prompt` 타입은 prompt-engineer Acceptance 결과 재사용); 통과 Criterion만 `[x]` 갱신 + PASS/FAIL 근거 출력
- **Bash re-run policy in Step 7** — Step 5에서 실행된 빌드·테스트 명령은 재실행하지 않는다; 파일 존재·grep·Criterion 명시 명령에 한해 Bash 호출 허용
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
- **batch + auto_start + auto_commit = fully unattended** — enabling all three removes every human gate after Story 1 approval; use only in trusted environments. **예외**: Step 9.5 미체크 Task 게이트는 batch 모드에서도 사용자 응답을 기다린다 — 데이터 정합성(`보고 누락` vs `실제 미수행` 구분)이 자동 결정 불가능한 의도된 동작이다.
- **Explicit Story overrides batch_mode** — `/flow-impl S2` always runs a single Story regardless of `config.dev_impl.batch_mode`; `--all` always activates batch mode
- **amend forbidden** — always create a new commit; review-fix commits are separate

## Next Steps

After all Stories complete (single-Story or batch): final full review with `/flow-review`
