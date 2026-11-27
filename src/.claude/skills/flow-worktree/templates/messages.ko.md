## SPEC_NOT_CONFIRMED

```text
worktree 작업은 스펙 확정 이후에 시작합니다.
현재 상태: {phase}:{status}
먼저 /flow-spec 으로 스펙을 확정하세요.
```

## SAME_SURFACE

```text
대상 surface 가 현재 세션과 같습니다. 다른 surface 를 지정하거나 --surface 를 생략하세요.
```

## READY

```text
worktree 준비 완료: {wt}
  브랜치: feature/{topic} (base {branch})
  세션 기동: {target}

이 토픽의 /flow-impl·/flow-review 등은 그 worktree 세션에서만 실행하세요.
main hub 에서 실행하면 dev-context 격리가 깨집니다.

완료 후: /flow-worktree teardown {topic}
```

## READY_MANUAL

```text
worktree 준비 완료: {wt}
cmux 를 쓸 수 없어 세션은 수동으로 여세요. 대상 터미널에서:
  cd {wt} && claude
```

## WT_MISSING

```text
worktree 가 없습니다: {wt} (이미 제거됐거나 토픽 이름이 틀림)
```

## NOT_DONE_YET

```text
아직 /flow-done 전입니다 (done 아카이브 없음).
worktree 의 active 산출물이 제거로 유실됩니다.
worktree 세션에서 /flow-pr → /flow-done 을 먼저 완료하거나,
버리려면 --force 를 붙이세요.
```

## NOT_MERGED_WARN

```text
경고: feature/{topic} 가 develop 에 아직 머지되지 않았습니다.
worktree 는 제거하지만 브랜치는 보존합니다(docs/specs·코드가 브랜치에만 있음).
PR 머지 후 git branch -d feature/{topic} 로 별도 삭제하세요.
```

## TEARDOWN_DONE

```text
teardown 완료: {topic}
  문서 sync-back: docs/_local/done/{topic}/ → main
  원본 폐기: docs/_local/{backlog,active}/{topic} {originals}
  docs/specs·코드: PR 머지 경로로 이관 (브랜치 머지 상태: {merge_state})
  worktree 제거: {wt}
  브랜치 feature/{topic}: {branch_state}
  main dev-context: 토픽 제거 {context_state}
```

## ORIGINALS_PURGED

```text
폐기됨
```

## ORIGINALS_KEPT

```text
보존됨(--keep-original)
```

## MERGE_MERGED

```text
머지됨
```

## MERGE_NOT_MERGED

```text
미머지
```

## BRANCH_DELETED

```text
삭제됨
```

## BRANCH_KEPT

```text
보존됨
```

## CONTEXT_REMOVED

```text
됨
```

## CONTEXT_NOT_APPLICABLE

```text
해당 없음
```
