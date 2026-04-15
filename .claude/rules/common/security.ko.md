---
version: 1
---
# 보안 규칙

## 커밋 전 필수 체크리스트

- [ ] 하드코딩된 시크릿 없음 (API 키, 비밀번호, 토큰)
- [ ] 모든 사용자 입력 검증됨
- [ ] NoSQL/SQL 인젝션 방지 처리됨
- [ ] XSS 방지 (HTML 새니타이징)
- [ ] 인증/인가 검증됨
- [ ] 모든 엔드포인트에 레이트 리미팅 적용
- [ ] 에러 메시지에 민감한 정보 미포함

## 시크릿 관리

```typescript
// NEVER: 하드코딩
const apiKey = "sk-proj-xxxxx"

// ALWAYS: 환경 변수
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## PII 처리

개인 식별 정보(이메일, 전화번호 등)는 로그에 마스킹:

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

## 보안 대응 프로토콜

보안 이슈 발견 시:
1. **즉시 중단**
2. **security-reviewer** 에이전트 활용
3. CRITICAL 이슈 수정 후 계속 진행
4. 노출된 시크릿은 즉시 교체
5. 유사 이슈가 있는지 전체 코드베이스 검토
