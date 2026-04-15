---
version: 1
---
# Git Workflow

## Commit Message Format

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
```
feat: add user authentication middleware
fix: resolve token refresh failure on expiration
docs: update API endpoint specification
```

## Branch Strategy

- `main` — production branch
- `develop` — integration branch
- `feature/<name>` — feature development
- `fix/<name>` — bug fixes
- `chore/<name>` — configuration, dependencies, etc.

## Pull Request Workflow

When creating a PR:
1. Analyze the full commit history (do not look at only the latest commit)
2. Check the full scope of changes with `git diff [base-branch]...HEAD`
3. Write a comprehensive PR summary
4. Include a test plan checklist
5. Push with the `-u` flag for new branches

## Feature Implementation Workflow

1. **Plan first**
   - Use the **planner** agent to establish an implementation plan
   - Identify dependencies and risks
   - Break down into steps

2. **TDD approach**
   - Use the **tdd-specialist** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (REFACTOR)
   - Verify 80%+ coverage

3. **Code review**
   - Use the **code-reviewer** agent immediately after writing code
   - Must fix CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow Conventional Commits format
