## INVALID_NAME

```text
체크포인트 이름은 영문자·숫자·`_`·`-`만 허용합니다.
```

## CHECKPOINT_SAVE_Q

```text
이 체크포인트와 함께 현재 변경사항도 저장할까요?
```

## CHECKPOINT_SAVE_HEADER

```text
체크포인트
```

## CHECKPOINT_SAVE_NONE_LABEL

```text
없음
```

## CHECKPOINT_SAVE_NONE_DESC

```text
로그에만 기록합니다
```

## CHECKPOINT_SAVE_COMMIT_LABEL

```text
커밋
```

## CHECKPOINT_SAVE_COMMIT_DESC

```text
지정한 파일을 "checkpoint: <name>" 메시지로 커밋합니다
```

## CHECKPOINT_SAVE_STASH_LABEL

```text
stash
```

## CHECKPOINT_SAVE_STASH_DESC

```text
변경사항을 "checkpoint: <name>" 메시지로 stash합니다
```

## CREATED

```text
✅ 체크포인트 생성: {name}
   SHA:  {sha}
   시각: {time}
   로그: .claude/checkpoints.log
```

## COMPARISON_TITLE

```text
체크포인트 비교: {name}
════════════════════════════════
기록:     {recorded_time}  (SHA: {recorded_sha})
현재:     {current_time}  (SHA: {current_sha})
```

## FILES_CHANGED

```text
변경된 파일: {count}
```

## FILE_LINE

```text
  {change}: {path}
```

## CHECK_RESULTS

```text
빌드:     {build}
테스트:   {tests}
커버리지: {coverage}
```

## LIST_COLUMNS

```text
#  이름             시각                  SHA
─────────────────────────────────────────────────
```

## LATEST_MARK

```text
← 최신
```
