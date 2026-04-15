---
version: 1
---
# Git 워크플로우

## 커밋 메시지 형식

```
<type>: <설명>

<선택적 본문>
```

타입: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

예시:
```
feat: 사용자 인증 미들웨어 추가
fix: 토큰 만료 시 갱신 실패 오류 수정
docs: API 엔드포인트 명세 업데이트
```

## 브랜치 전략

- `main` — 배포 브랜치
- `develop` — 통합 브랜치
- `feature/<name>` — 기능 개발
- `fix/<name>` — 버그 수정
- `chore/<name>` — 설정, 의존성 등

## Pull Request 워크플로우

PR 생성 시:
1. 전체 커밋 히스토리 분석 (최신 커밋만 보지 않는다)
2. `git diff [base-branch]...HEAD`로 전체 변경 범위 확인
3. 포괄적인 PR 요약 작성
4. 테스트 계획 체크리스트 포함
5. 새 브랜치라면 `-u` 플래그로 push

## 기능 구현 워크플로우

1. **계획 먼저**
   - **planner** 에이전트로 구현 계획 수립
   - 의존성과 리스크 식별
   - 단계별 분해

2. **TDD 접근**
   - **tdd-specialist** 에이전트 활용
   - 테스트 먼저 작성 (RED)
   - 테스트를 통과하도록 구현 (GREEN)
   - 리팩토링 (REFACTOR)
   - 80%+ 커버리지 확인

3. **코드 리뷰**
   - 코드 작성 직후 **code-reviewer** 에이전트 활용
   - CRITICAL, HIGH 이슈 반드시 수정
   - MEDIUM 이슈는 가능하면 수정

4. **커밋 & Push**
   - 상세한 커밋 메시지
   - Conventional Commits 형식 준수
