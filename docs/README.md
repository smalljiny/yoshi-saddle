# docs/

harness 관련 문서 루트. 각 서브디렉토리는 수명(lifecycle)과 접근 목적이 다르다.

---

## 디렉토리 구조

```
docs/
├── specs/      harness 구성 요소의 설계 계약과 동작 명세 (git-tracked, 영구)
├── notes/      구현 중 발견한 이슈·아이디어 임시 메모 (git-tracked, 소멸형)
├── research/   외부 레퍼런스 분석 및 도입 검토 자료 (git-tracked, 소멸형)
└── _local/     토픽별 로컬 작업 산출물 (git-ignored, 임시)
    ├── backlog/    스펙 작성 단계 토픽
    ├── active/     구현 진행 중 토픽
    └── done/       완료 후 아카이브된 토픽
```

---

## specs/

**용도**: harness 구성 요소(커맨드, 스킬, 에이전트, 설정)의 **설계 계약과 동작 명세**.

- `/dev:docs`가 구현 완료 후 자동 생성 또는 업데이트
- 현재 동작을 기준으로 작성 — 구현 이력, 회고, 탐색 내용은 포함하지 않음
- 파일 하나 = 단일 관심사 (커맨드 1개, 스킬 1개, 설계 원칙 1개 등)

**여기에 두면 안 되는 것**: 아직 구현되지 않은 아이디어, 구현 이력, 외부 레퍼런스 분석

---

## notes/

**용도**: 구현 중 발견한 이슈·개선 아이디어를 **나중에 처리하기 위해** 임시로 기록.

- 형식 자유 — 간단한 메모부터 구조화된 분석까지
- 처리 후에는 삭제하거나 `/dev:spec`의 스펙 초안으로 발전시킴
- 파일명 규칙: `<topic>-<summary>.md` (예: `batch-mode-reliability.md`)

**여기에 두면 안 되는 것**: 완료된 구현 명세, 공식 설계 계약

---

## research/

**용도**: 외부 레퍼런스(ECC, SCE 등) 분석 및 harness 도입 검토 자료.

- 특정 도입 결정 이전에 작성하는 탐색·비교 문서
- 도입이 완료되면 해당 `specs/` 파일로 결과가 흡수되므로 research 파일은 소멸형
- 유효 기간이 지난 파일은 삭제해도 무방

**여기에 두면 안 되는 것**: 구현 명세, 현재 동작 계약

---

## _local/

**용도**: `/dev:spec` ~ `/dev:done` 워크플로우의 **토픽별 작업 산출물** 임시 저장소.

git-ignored — 로컬에만 존재하며 커밋되지 않는다.

| 서브디렉토리 | 상태 | 포함 파일 |
|---|---|---|
| `backlog/<topic>/` | `spec:*` | `spec.md`, `spec-review-*.md` |
| `active/<topic>/` | `plan:*` ~ `review:*` | `implementation-plan.md`, `plan-review-*.md`, `review-report-*.md` |
| `done/<topic>/` | 아카이브 | 위 파일 전체 (보존용) |

**여기에 두면 안 되는 것**: git-tracked 문서, 영구 보존이 필요한 파일
