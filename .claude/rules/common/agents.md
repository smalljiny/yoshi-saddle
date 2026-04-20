---
version: 2
---
# Agent Coordination Rules

## Available Agents

Located in `.claude/agents/`:

| Agent | Role | When to Activate |
|-------|------|-----------------|
| planner | Implementation planning | Complex feature requests, refactoring |
| tdd-specialist | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality review | Immediately after writing code |
| security-reviewer | Security vulnerability analysis | Before commits, sensitive code changes |
| architect | System design | Architecture decisions, design reviews |
| build-error-resolver | Build error resolution | Build/type errors |
| doc-updater | Documentation sync | After implementation is complete |
| refactor-cleaner | Dead code cleanup | Code maintenance |

## Immediate Agent Activation

Auto-activate in the following situations without user request:

1. Complex feature requests → **planner**
2. Immediately after writing/modifying code → **code-reviewer**
3. New features or bug fixes → **tdd-specialist**
4. Architecture decisions → **architect**
5. Build/type errors → **build-error-resolver**

## Parallel Execution

Always run independent tasks in parallel:

```
# GOOD: Parallel execution
Agent 1: Security analysis of auth.ts
Agent 2: Performance review of cache system
Agent 3: Type checking of utils.ts

# BAD: Unnecessary sequential execution
Wait for agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

Use role-separated sub-agents for complex problems:
- Factual Reviewer
- Senior Engineer
- Security Expert
- Consistency Reviewer

## Tool Usage Discipline

### Read-before-Edit

The Edit tool requires the target file to have been Read in the same conversation turn.
**Always call Read before Edit** — even for files you've seen in previous turns.

### Parallel Edit Pattern

When editing multiple files in the same step:

```
# GOOD: Read all files first, then Edit in a separate block
Step 1 — Read block:  Read(file-a), Read(file-b), Read(file-c)  [parallel]
Step 2 — Edit block:  Edit(file-a), Edit(file-b), Edit(file-c)  [parallel]

# BAD: Read and Edit mixed in one block
Read(file-a) + Edit(file-a) in the same tool-call block
→ Edit may execute before its Read result is available
```

### Bash Edits

When delegating file edits to Bash (e.g., `sed`, `awk`), the Read-before-Edit rule does not
apply technically, but read the file first anyway to verify the content before modifying it.
