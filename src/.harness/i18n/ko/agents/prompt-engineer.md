## PE_SUCCESS

```text
PROPOSE→EVAL→REFINE 완료
  반복 횟수: {iterations}회
  최종 pass_count: {pass_count}/{eval_total}
  Acceptance: 통과
  저장 파일: {path}
```

## PE_STAGNATION

```text
정체 감지: {stalled_iterations}회 반복 동안 pass_count가 {pass_count}에서 개선되지 않았습니다.
실패 패턴: {summary}
현재 최선 초안이 파일에 저장되어 있습니다.
수동 검토 후 /dev:impl을 재실행하거나, 스펙의 Eval Cases를 수정하세요.
```

## PE_MAX_ITER

```text
최대 반복(5회) 도달. pass_count: {pass_count}/{eval_total}, Acceptance 미달.
실패 패턴: {summary}
현재 최선 초안이 파일에 저장되어 있습니다.
```
