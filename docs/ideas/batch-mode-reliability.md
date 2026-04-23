# /dev:impl batch_mode 신뢰성 개선 아이디어

> 작성일: 2026-04-23  
> 계기: f004-integrated-api T5 실행 중 batch_mode=true임에도 T5 완료 후 T6으로 자동 진행되지 않는 문제 발견

---

## 현상

`config.dev_impl.batch_mode: true` 설정 시 `/dev:impl` 호출 한 번으로 남은 모든 Task를 순차 실행해야 한다.  
실제로는 Task 하나를 완료한 뒤 Step 11 단일-태스크 터미널 브리핑을 출력하고 멈췄다.

---

## 근본 원인

### 1. 배치 상태가 복잡한 흐름에서 소실됨 (주요)

`batch = true`는 세션 메모리에만 존재한다. T5 실행 흐름은 다음과 같았다.

```
/dev:impl 호출
  → batch=true 확인
  → tdd-specialist Agent 호출 (완료)
  → code-reviewer Agent 호출 → CRITICAL 이슈 발견
  → 수동 수정 (예외 흐름)
  → 커밋
  → Step 10.5: "다음 Task 존재 → Step 2로 점프" ← 이 판단을 놓침
  → Step 11 단일-태스크 브리핑 출력 후 종료
```

서브 에이전트 완료 + 수동 개입이 겹치면 배치 루프 상태가 사라진다.

### 2. 배치 상태가 어디에도 저장되지 않음

`currentTask`는 dev-context에 저장되지만 **"현재 배치 실행 중"이라는 사실은 저장되지 않는다.**  
에이전트 완료 후 Claude가 이 상태를 "기억"해야 하는데, 흐름이 복잡해지면 신뢰할 수 없다.

### 3. 서브 에이전트 완료 후 제어 흐름 복귀 문제

tdd-specialist, code-reviewer가 각각 Agent 도구로 실행된다.  
각 에이전트가 많은 컨텍스트를 소비한 뒤 복귀하면, Step 10.5의 루프 판단을 놓치기 쉽다.

---

## 구조적 한계

```
명세의 배치 루프 (개념):
  Step 10.5: "다음 Task 존재 → Step 2로 점프"

실제 실행 구조:
  Claude 메인 컨텍스트
    ├── Agent(tdd-specialist) → 완료 후 복귀
    ├── Agent(code-reviewer) → 완료 후 복귀  ← 예외 발생 시 수동 개입
    └── Step 10.5 판단 ← 여기서 "배치 중"을 기억해야 함
```

에이전트 호출이 많을수록, CRITICAL 이슈로 수동 개입이 발생할수록 루프가 끊길 가능성 증가.

---

## 개선 아이디어

### 아이디어 A: dev-context에 배치 상태 저장

`config.dev_impl`에 `currentBatchRunning: true` 필드를 추가한다.

```json
"dev_impl": {
  "batch_mode": true,
  "currentBatchRunning": true   ← 배치 시작 시 기록, 완료/실패 시 제거
}
```

Step 10.5에서 이 필드를 읽어 루프 여부를 판단하면, 서브 에이전트 완료 후에도 복귀 가능하다.  
단, 이미 dev-context가 복잡해지고 있어 관리 비용이 늘어날 수 있다.

### 아이디어 B: 배치 루프를 셸 스크립트로 위임

Step 10.5를 Claude 메모리가 아닌 외부 Node.js 스크립트로 실행한다.

```bash
node .harness/scripts/batch-runner.js --topic=f004-integrated-api
```

스크립트가 plan 파일을 읽어 미완료 Task를 순서대로 `/dev:impl <task-id>`로 실행하면  
Claude는 각 Task 구현에만 집중하고, 루프는 스크립트가 관리한다.

장점: 상태 소실 없음, 에이전트 복잡도와 독립적  
단점: 스크립트 추가 구현 필요, 현재 harness 구조 변경 필요

### 아이디어 C: --all 플래그를 단기 대안으로 활용 (현재 best practice)

`batch_mode=true`에 의존하지 않고 `/dev:impl --all`을 명시적으로 사용한다.  
매 실행마다 `--all`을 붙이면 Claude가 배치 의도를 명확히 재인식한다.

단점: 사용자가 매번 `--all`을 타이핑해야 함

### 아이디어 D: 배치 루프를 tdd-specialist에 위임

현재 배치 루프는 메인 Claude 컨텍스트가 담당한다.  
대신 "batch orchestrator" 전용 에이전트를 만들어 Task 순서 관리를 위임한다.

```
/dev:impl --all
  → BatchOrchestrator Agent 실행
    └── 미완료 Task 목록 파싱
        ├── Task N 실행 (tdd-specialist + code-reviewer 호출)
        ├── 커밋
        └── 다음 Task로 반복
```

장점: 배치 상태를 에이전트 내부에서 일관되게 유지  
단점: 에이전트 중첩 구조가 복잡해짐, 현재 harness에 없는 새 에이전트 필요

---

## 결론

현재 가장 신뢰할 수 있는 방법은 **아이디어 C** (명시적 `--all` 플래그).  
중기적으로는 **아이디어 A** (dev-context 배치 상태 저장)가 비용 대비 효과가 크다.  
장기적으로는 **아이디어 B** (외부 배치 러너 스크립트)가 가장 안정적이다.

`batch_mode=true`는 단순한 흐름(코드 리뷰 이슈 없음, 수동 개입 없음)일 때만 신뢰할 수 있다.
