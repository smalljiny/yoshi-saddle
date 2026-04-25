---
version: 2
description: Resolve build errors step by step. Invokes the build-error-resolver agent.
category: dev-workflow
---

# /dev:build-fix

Resolve build failures, type errors, and lint errors.

## Execution Flow

### 1. Identify Errors

```bash
# Type errors
pnpm tsc --noEmit 2>&1

# Build errors
pnpm build 2>&1

# Lint errors
pnpm lint 2>&1
```

### 2. **Automatically invoke build-error-resolver agent**

Pass the full error messages to the agent.
The agent classifies errors and suggests fixes.

### 3. Apply Fixes

Accept the agent's suggestions and apply fixes.
Do not work around with `any` types — resolve the root cause.

### 4. Verify

```bash
pnpm tsc --noEmit && pnpm build && pnpm test
```

Repeat until all pass.

## Next Steps

After a successful build: check all gates with `/dev:verify`
