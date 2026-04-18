---
version: 1
name: schema-evolution-read-normalize
description: JSON 상태 파일에 새 top-level 필드를 추가할 때 readContext 정규화 + writeContext 영속화로 기존 파일을 소프트 마이그레이션하는 패턴
origin: learned
learned_at: 2026-04-17T10:30:00.000Z
---

## When to Activate

- 기존 JSON 상태 파일(예: dev-context.json)에 새 최상위 섹션을 추가할 때
- 별도 마이그레이션 스크립트를 쓰지 않고도 legacy 파일을 읽기 호환 상태로 유지하고 싶을 때
- 신규 필드의 "미설정" 동작을 "빈 기본값"과 동치로 해석하는 설계일 때

## Pattern

필드 부재를 **읽기 시점**에 정규화하고, **쓰기 시점**에 영속화한다. CLI 호출 한 번으로 기존 파일이 자연스럽게 새 스키마로 업그레이드된다.

```js
function readContext() {
  const ctx = JSON.parse(readFileSync(PATH, 'utf8'))
  // 누락·오염된 필드를 기본값으로 정규화
  if (!ctx.config || typeof ctx.config !== 'object' || Array.isArray(ctx.config)) {
    ctx.config = {}
  }
  return ctx
}

function writeContext(ctx) {
  writeFileSync(PATH, JSON.stringify(ctx, null, 2) + '\n')
  // ctx.config가 이제 영구 저장됨
}
```

## 원칙

- **내부 정규화만 노출하지 않음**: `read --field=config.X.Y` 가 미설정일 때 여전히 빈 줄을 반환해야 함. 정규화는 하부 파일 구조에만 관여하고 외부 계약(읽기 출력)은 바뀌지 않음
- **Union with schema guard**: 누락뿐 아니라 타입 불일치(배열/문자열 등)도 `{}`로 치환 → 손상된 필드의 silent data loss 가능성은 있지만, 유사 패턴인 `topics` 필드와 일관
- **명시적 migration 도구 불필요**: 첫 `set-field` 호출에서 자동 영속화되므로 수동 `migrate.js` 부담 없음

## 제한사항

- 필드가 "보존해야 할 사용자 데이터"면 silent normalize는 위험. 이 패턴은 "기본값이 `{}`인 구조 필드"에만 적용
