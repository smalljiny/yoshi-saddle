---
version: 4
description: Perform a final full code review. Runs code-reviewer and security-reviewer in parallel.
category: dev-workflow
---

# /dev:review

After all Tasks are complete, perform a comprehensive review of the entire change scope.

## Execution Flow

### 1. Gate Check

Read `phase` and `status`:

```bash
node .harness/scripts/dev-context.js read --field=current_topic
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase
node .harness/scripts/dev-context.js read --topic=<topic> --field=status
```

If `phase:status` is not `impl:in-progress`, stop immediately:

```
/dev:review를 실행할 수 없습니다.
현재 상태: <phase>:<status>
impl:in-progress 상태여야 합니다.
```

Do not warn and continue — stop entirely.

### 2. Check all Tasks are complete

Read `currentTask` and the plan file:

```bash
node .harness/scripts/dev-context.js read --topic=<topic> --field=currentTask
node .harness/scripts/dev-context.js read --topic=<topic> --field=plan
```

Block if either condition is true:
- `currentTask` is not null (a task is still in progress)
- The plan file contains any unchecked `[ ]` task lines

```
/dev:review를 실행할 수 없습니다.
구현이 완료되지 않았습니다.
미완료 Task가 남아 있습니다: <task-id or list>
먼저 /dev:impl로 모든 Task를 완료하세요.
```

### 3. Transition to `review:in-progress`

```bash
node .harness/scripts/dev-context.js update-state \
  --topic=<topic> --phase=review --status=in-progress
```

### 3. Identify Change Scope

```bash
git diff develop...HEAD
git log develop...HEAD --oneline
```

### 4. **Run code-reviewer + security-reviewer in parallel**

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

### 5. Consolidate Review Results

Organize issues by severity:
- **CRITICAL**: Requires immediate fix. Cannot proceed before fixing.
- **HIGH**: Requires prompt fix.
- **MEDIUM**: Plan a fix.

### 6. Fix Issues

Fix CRITICAL and HIGH issues, then re-review.

### 7. Completion Report

```
Review complete

CRITICAL: 0
HIGH: 0
MEDIUM: [N]

Next: pass the verification gate with /dev:verify
```

## Next Steps

After passing review: `/dev:verify`
