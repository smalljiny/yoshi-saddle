---
version: 2
description: Run the full verification gate before PR. Checks build, type-check, lint, test, and security in order.
category: dev-workflow
---

# /dev:verify

All verification gates must pass before a PR.

## Execution Flow

Run each gate in order and stop immediately on failure:

### Gate 1: Build

```bash
pnpm build
# or
npm run build
```

On failure → automatically invoke `build-error-resolver` agent

### Gate 2: Type Check

```bash
pnpm tsc --noEmit
# or
npx tsc --noEmit
```

On failure → automatically invoke `build-error-resolver` agent

### Gate 3: Lint

```bash
pnpm lint
# or
npx eslint .
```

Attempt auto-fix:
```bash
pnpm lint --fix
```

### Gate 4: Tests

```bash
pnpm test
pnpm test:coverage
```

Treat as failure if coverage is below 80%.

### Gate 5: Security Scan

```bash
# Dependency vulnerability scan
pnpm audit
# or
npm audit
```

If CRITICAL or HIGH vulnerabilities found → automatically invoke `security-reviewer` agent

## Result Report

```
Verification complete

✅ build        passed
✅ type-check   passed
✅ lint         passed
✅ test         passed (coverage: X%)
✅ security     passed

Ready to open a PR.
```

Or:

```
Verification failed

✅ build        passed
❌ type-check   failed — [error message]

Running build-error-resolver agent...
```

## Next Steps

After all gates pass: `git push` → create PR
