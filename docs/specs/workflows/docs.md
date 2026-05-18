# 참조 문서 생성 워크플로우

> `/flow-docs` 커맨드가 스펙-구현 정합성을 확인하고 기존 `docs/specs/` 파일을 업데이트(또는 신규 생성)한 뒤 단일 커밋으로 저장하는 계약.

## 개요

`/flow-docs`는 `/flow-review`와 `/flow-pr` 사이에 위치한 독립 단계이다. 이 커맨드가 `docs/specs/<name>.md` 참조 문서를 **최초 생성**하는 책임을 진다. `/flow-done`의 문서 생성 경로(Step 4.1–4.5)는 이 단계를 건너뛴 경우의 폴백이다. 다음 세 단계로 동작한다:

1. **스펙 정합성 확인**: `git diff <base>...HEAD`로 실제 변경 내용을 파악하고 스펙과 비교해 불일치를 도출. 사용자 승인 후 `spec.md`를 수정한다.
2. **업데이트 대상 식별**: 변경 파일과 수정된 스펙을 분석해 기존 `docs/specs/` 파일 중 수정이 필요한 후보를 추론하고 사용자가 최종 승인한다.
3. **문서 업데이트**: 승인된 파일을 부분 수정(섹션 단위) 또는 전체 재작성으로 갱신하고, 기존 파일이 없는 내용은 신규 생성한다. 완료 후 대표 문서를 선정해 `refDoc`에 기록하고 단일 커밋을 생성한다.

`docs/specs/` 파일은 git-tracked 영구 문서다. `spec.md`는 `docs/_local/`에 위치해 git-ignored이므로 이 커밋에 포함되지 않는다.

## 구조

```
docs/
└── specs/
    └── <name>.md             # /flow-docs가 업데이트하거나 생성하는 참조 문서 (git-tracked)

.harness/
└── scripts/
    └── dev-context.js        # refDoc 필드 저장 (set-field)
```

### 토픽 필드 (dev-context.json)

`/flow-docs` 완료 시 다음 필드가 토픽에 추가된다:

```json
{
  "topics": {
    "<topic>": {
      "refDoc": "docs/specs/<name>.md"
    }
  }
}
```

`refDoc`은 항상 대표 문서 1개의 경로를 가진다. 업데이트된 파일이 여러 개이면 사용자가 선정한 대표 문서 1개를 기록한다. `/flow-pr`이 PR body의 `{{reference_doc}}`에 이 경로를 삽입한다.

## 동작

### `/flow-docs` 실행 흐름

1. **게이트 확인**: `review:in-progress` (first-run) 또는 `docs:generated` (re-entry) 상태 필요. 그 외 상태는 중단.

2. **`/flow-verify` 통과 확인**: 세션 내 최근 통과 기록이 없으면 계속 여부(`y/n`)를 묻는다.

3. **변경 파일 수집**: `config.git.pullRemote`와 `config.git.baseBranch`로 diff 기준 결정:
   ```
   git diff <pullRemote>/<baseBranch>...HEAD --name-only
   git diff --name-only
   git diff --cached --name-only
   ```
   세 소스를 병합·중복 제거한 뒤 `config.docs.sourceFilter`(prefix 목록)로 필터링한다. `sourceFilter`가 비어 있거나 미설정이면 필터를 적용하지 않는다. 세 소스가 모두 비면 사용자로부터 base 브랜치를 입력받아 재수집한다. `config.docs.sourceFilter` 스키마는 `dev-context-config.md` 참조.

4. **스펙 정합성 확인**: `docs/_local/active/<topic>/spec.md`와 수집된 변경 내용을 비교해 불일치를 도출한다.
   - 불일치 있음: 목록을 표시하고 일괄 승인 시 `spec.md`에 반영. 수정이 구현 목표를 변경하는 경우 즉시 중단한다.
   - 불일치 없음: "불일치 없음" 메시지 출력 후 다음 단계로 자동 진행.

5. **`docs/specs/` 후보 추론**: 변경 파일과 (수정된) 스펙을 분석해 기존 `docs/specs/` 파일 중 업데이트 대상 후보를 추론하고 사용자가 최종 승인한다. 기존 파일에 매핑되지 않는 내용은 신규 파일 생성 후보로 표시한다.

6. **파일별 업데이트**: 승인된 각 파일에 다음 휴리스틱을 순서대로 적용한다.
   - **부분 수정**: 변경 heading이 1~2개 이하 + 섹션 구조 유지 + 변경 범위가 특정 섹션에 국한될 때
   - **전체 재작성**: heading을 찾지 못하거나 절반 이상 heading이 영향받거나 구조 자체가 달라질 때. 재작성 포맷: 현재 시제, 개요/구조·스키마/동작/제약사항 섹션, migration·change history·Open Questions·Before-After 금지.

7. **대표 문서 선정 + `refDoc` 기록**: 업데이트 파일이 1개이면 자동 선정. 2개 이상이면 사용자가 선택하며 신규 생성 파일이 있으면 우선 제안한다. 선정된 경로를 `dev-context.js set-field --field=refDoc`으로 기록한다.

8. **단일 커밋**: 업데이트된 모든 `docs/specs/*.md` 파일을 `git add`하고 HEREDOC 패턴으로 커밋한다. amend 금지. 커밋 메시지: first-run은 `docs: add <representative-name> reference`, re-entry는 `docs: update <representative-name> reference`.

9. **상태 전환**: `update-state --phase=docs --status=generated`. 완료 메시지에 업데이트 파일 목록과 대표 문서 경로를 함께 표시한다.

### re-entry 동작

`docs:generated` 상태에서 `/flow-docs` 재실행 시:
- 업데이트 대상 파일을 재선정하거나 신규 파일을 추가한다
- `refDoc` 필드 갱신
- 새 커밋 생성 (amend 금지)

## 제약사항

- `docs/specs/` 외 문서(`docs/guides/`, `docs/adr/` 등) 자동 업데이트는 지원하지 않음 — 별도 토픽으로 확장.
- git-tracked 파일이므로 `/flow-done`의 아카이브 대상이 아님 — `docs/_local/`과 구별.
- `spec.md`는 git-ignored(`docs/_local/`)이므로 이 커밋에 포함되지 않는다.
- heading 불일치 시 퍼지 매칭 없이 즉시 전체 재작성으로 전환한다.
- `refDoc`은 단일 대표 경로만 지원한다. `/flow-pr`의 PR body 계약이 단일 경로를 요구하므로 복수 경로 확장은 범위 밖이다.
- 스펙 수정이 구현 목표를 변경하면 `/flow-docs`를 즉시 중단하고 `/flow-plan` 또는 `/flow-review`부터 재검토해야 한다.
- `config.git.pullRemote`·`config.git.baseBranch` 미설정 시 기본값 `origin`·`main` 사용 (스키마는 `dev-context-config.md` 참조).
- `config.docs.sourceFilter` 미설정 또는 빈 배열은 "필터 없음"과 동일하다. 하네스 저장소는 `/flow-init`을 실행해 소스 필터를 초기화해야 한다.
