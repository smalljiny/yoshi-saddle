---
version: 2
description: Perform a final full code review. Runs code-reviewer and security-reviewer in parallel.
category: dev-workflow
---

# /dev:review

After all Tasks are complete, perform a comprehensive review of the entire change scope.

## Execution Flow

### 1. Identify Change Scope

```bash
git diff main...HEAD
git log main...HEAD --oneline
```

### 2. **Run code-reviewer + security-reviewer in parallel**

Invoke both agents simultaneously:

**code-reviewer** examines:
- Code quality across the entire change scope
- Architecture consistency
- Test coverage
- Performance considerations

**security-reviewer** examines:
- Security vulnerabilities
- Secret exposure
- Missing input validation
- Authentication/authorization issues

### 3. Consolidate Review Results

Organize issues by severity:
- **CRITICAL**: Requires immediate fix. Cannot proceed before fixing.
- **HIGH**: Requires prompt fix.
- **MEDIUM**: Plan a fix.

### 4. Fix Issues

Fix CRITICAL and HIGH issues, then re-review.

### 5. Completion Report

```
Review complete

CRITICAL: 0
HIGH: 0
MEDIUM: [N]

Next: pass the verification gate with /dev:verify
```

## Next Steps

After passing review: `/dev:verify`
