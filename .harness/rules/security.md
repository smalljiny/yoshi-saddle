---
version: 1
---
# Security Rules

## Pre-Commit Checklist

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs are validated
- [ ] NoSQL/SQL injection prevention in place
- [ ] XSS prevention (HTML sanitization)
- [ ] Authentication/authorization verified
- [ ] Rate limiting applied to all endpoints
- [ ] Error messages do not contain sensitive information

## Secret Management

```typescript
// NEVER: hardcoded
const apiKey = "sk-proj-xxxxx"

// ALWAYS: environment variables
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## PII Handling

Mask personally identifiable information (email, phone number, etc.) in logs:

```typescript
// WRONG
logger.info({ email: 'user@example.com' }, 'Processing user')

// CORRECT
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const d = domain.split('.')
  return `${local[0]}***@${d[0][0]}***.${d[d.length - 1]}`
  // user@example.com -> u***@e***.com
}

logger.info({ email: maskEmail(user.email) }, 'Processing user')
```

## Security Response Protocol

When a security issue is found:
1. **Stop immediately**
2. Use the **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Replace exposed secrets immediately
5. Review the entire codebase for similar issues
