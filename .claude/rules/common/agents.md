---
version: 1
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
