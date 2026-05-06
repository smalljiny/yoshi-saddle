# `/dev:done` 폴백 경로와 `/dev:docs` 정식 경로 정합성 갭

> 작성일: 2026-05-06
> 발견 경로: `docs/specs/` 인덱스 검토 (README.md 갱신 작업 중)
> 관련 파일: `docs/specs/done-workflow.md`, `docs/specs/reference-docs-workflow.md`

---

## 배경

`/dev:docs` 도입 이후 참조 문서(`docs/specs/<name>.md`) 생성·갱신은 `/dev:docs`가 1차 책임을 지고, `/dev:done`은 사용자가 `/dev:docs`를 건너뛴 경우에만 폴백 경로로 문서를 생성한다.

`done-workflow.md` 라인 9:
> 참조 문서(`docs/specs/<name>.md`)는 `/dev:docs` 단계에서 이미 생성된다. `/dev:done`의 문서 생성 경로(Step 4.1–4.5)는 `/dev:docs`를 건너뛴 경우의 폴백이다.

문제는 폴백 경로가 정식 경로의 단순화 버전이 아니라 **별개로 진화한 구식 경로**라는 점이다. 두 경로가 같은 입력(변경 파일)에서 다른 결과(참조 문서 형태·메타데이터)를 만든다.

---

## 두 경로의 어긋난 지점

| 항목 | `/dev:docs` 정식 경로 (`reference-docs-workflow.md`) | `/dev:done` 폴백 경로 (`done-workflow.md` Step 4.1–4.5) |
|------|------------------------------------------------------|---------------------------------------------------------|
| **base 브랜치** | `config.git.pullRemote`/`config.git.baseBranch` 조합 | `develop` 하드코딩 |
| **소스 필터** | `config.docs.sourceFilter` (prefix 목록, 동적) | `.claude/`, `.codex/`, `.harness/`, `CLAUDE.md`, `AGENTS.md` 하드코딩 |
| **업데이트 전략** | 기존 `docs/specs/` 파일 후보 추론 → 부분 수정 또는 전체 재작성 | 항상 신규 파일 생성 |
| **`refDoc` 기록** | `dev-context.js set-field --field=refDoc`로 대표 문서 저장 | 없음 |
| **커밋** | `docs: add/update <name> reference` 단일 커밋 | 커밋 단계 부재 (아카이브 단계로 직행) |
| **상태 전환** | `update-state --phase=docs --status=generated` | 없음 (바로 토픽 제거로 진행) |

폴백이라는 명목과 달리, 폴백 경로를 거친 토픽은 다음 항목이 누락되거나 다른 형태로 남는다:
- `refDoc` 필드 미기록 → `/dev:pr` PR body의 `{{reference_doc}}` 치환이 빈 값
- `config.git`·`config.docs.sourceFilter` 미반영 → fork 저장소·하네스 외 프로젝트에서 wrong base·잘못된 파일 수집
- 기존 `docs/specs/` 파일 업데이트가 아니라 신규 파일 생성 → 같은 주제의 문서가 중복 누적

---

## 재설계 방향 (옵션)

### 옵션 A. 폴백 제거 + 게이트 강화

`/dev:done`의 게이트를 `pr:created`만으로 두는 대신 `docs:generated` 도달 여부도 검증한다. `/dev:docs`를 건너뛴 토픽은 `/dev:done`이 거부하고 `/dev:docs` 실행을 안내한다.

- **장점**: 단일 문서 생성 경로 유지, done 단순화
- **단점**: 사용자가 명시적으로 `/dev:docs`를 호출해야 함 (UX 추가 단계)
- **마이그레이션**: `done-workflow.md` Step 4.1–4.5 섹션 삭제, 게이트 절 보강

### 옵션 B. 폴백을 정식 파이프라인으로 위임

`/dev:done`이 `pr:created` 상태에서 `refDoc` 필드 부재 시 내부적으로 `/dev:docs` 동등 절차를 수행한다. 또는 `/dev:docs`를 직접 호출한다.

- **장점**: 사용자에게 추가 단계 없음, 두 경로의 결과 일치
- **단점**: 커맨드가 다른 커맨드를 호출하는 결합 발생, 에러 처리 복잡
- **마이그레이션**: `done-workflow.md`에서 `Load reference-docs-workflow.md`로 위임 명시, Step 4.1–4.5 → reference-docs Step 3~9 호출

### 옵션 C. 폴백 경로를 정식과 동일한 입력 계약으로 정렬

폴백 경로를 그대로 두되 다음 4개를 정식과 같이 맞춘다:
1. base 브랜치 → `config.git.pullRemote`/`config.git.baseBranch`
2. 소스 필터 → `config.docs.sourceFilter` (없으면 현재 하드코딩 fallback)
3. 기존 파일 업데이트 우선 (정식 Step 5~6과 동일한 부분 수정/재작성 분기)
4. `refDoc` 기록 + 커밋 + 상태 전환 추가

- **장점**: 두 경로가 같은 결과 산출, 폴백의 독립성 유지
- **단점**: 두 곳에 같은 로직이 중복, 정식 변경 시 양쪽 수정 필요
- **마이그레이션**: `done-workflow.md` Step 4 섹션 전체 재작성

---

## 추천

**옵션 A를 1차 권장**. 다음 근거로 가장 단순하고 위험이 작다:

- 현재 docs 단계는 워크플로우 정식 경로의 일부이며, 이를 건너뛰는 것이 권장 동작이 아니다.
- 옵션 B는 커맨드 간 호출이 생기고 에러 경로가 복잡해진다.
- 옵션 C는 같은 로직 중복이 영구화되어, 향후 reference-docs 변경 시 done 폴백도 동시 수정해야 하는 운영 부담이 발생한다.

옵션 A 선택 시 추가 검토 항목:
- 게이트 거부 메시지가 정확한 다음 액션을 안내해야 한다 (`/dev:docs를 먼저 실행하세요` + 실행 명령 표시)
- 이미 폴백으로 생성된 문서가 있는 기존 토픽은 마이그레이션 가이드 별도 작성 필요

---

## 영향도

- 변경 파일: `docs/specs/done-workflow.md`, `.claude/commands/dev/done.md` (게이트 로직)
- 영향 받는 토픽: `pr:created` 상태에서 `/dev:done`을 호출하는 모든 워크플로우
- 회귀 위험: 낮음 (게이트 강화는 추가 차단이지 동작 변경이 아님)

---

## Open Questions

1. 옵션 A 채택 시, 기존에 폴백 경로로 생성된 `docs/specs/<topic>-spec.md` 파일(스펙 원본 복사 형태) 마이그레이션 정책이 필요한가? 단순히 그대로 두고 다음 변경에서 정식 경로로 통합하면 충분한가?
2. `/dev:verify` 미통과 토픽이 `pr:created`에 도달할 수 있는 경로가 있는가? 있다면 game이 어디서 발생하는지 별도 검증 필요.
3. 옵션 C가 의외로 적합한 경우(예: `/dev:docs`를 의도적으로 건너뛰는 빠른 패치 토픽)가 실제로 존재하는가?
