# `docs/specs` ↔ `src/` 정합성 검증 보고

> 작성일: 2026-05-10
> 검증 기준: graph 커밋 `e12f5660` (= 검증 시점 HEAD)
> 검증 도구: `graphify-out/graph.json` + 직접 grep/Read 대조
> 검증 범위: `docs/specs/` 30개 spec ↔ `src/.claude/`·`src/.harness/`·`src/.codex/`·`scripts/` 구현
> 분담: 4개 병렬 에이전트가 라이프사이클(6) / 후반 워크플로우(5) / 스킬·메타·Search(9) / 인프라·설계(10) 그룹으로 점검

---

## 요약

30개 spec, 약 90개 검증 항목 중 **PASS 19건, doc-stale 9건, code-mismatch 2건, 결정 필요 1건**.

PASS 비율은 ~80%로 전반적으로 정합성이 높지만, 워크플로우 핵심(`done-workflow`, `topic-lifecycle`, `dev-context-config`, `wf-task-tracking`, `skill-registry`)에서 누적 drift가 관찰된다. `wf-task-tracking`은 spec과 SKILL.md가 정반대 동작을 주장하는 결정적 mismatch이며 우선 수정이 필요하다.

graphify INFERRED edge 2건(`stack-exa ↔ stack-firecrawl` 의미 유사성)은 stale이 아니라 정당한 refactor 후보로 검증됐다.

---

## 분류 1 — 스펙을 구현에 맞게 수정 (doc-stale)

코드는 의도대로 진화했고 문서가 따라가지 못한 케이스. 텍스트 갱신만 필요하다.

| # | 대상 파일 | 결함 | 수정 방향 |
|---|---------|------|---------|
| A1 | `docs/specs/done-workflow.md` | spec §개요·§동작·§구조에 남아 있는 Step 3 (verify 확인)·Step 4.1 (파일 탐색)·Step 4.2-4.5 (참조 문서 생성·복사 폴백)가 코드에서 통째로 제거됨. 'develop' 브랜치 가정·하네스 파일 필터(`.claude/`·`.codex/`·`.harness/`·`CLAUDE.md`·`AGENTS.md`)도 코드에 부재 | done.md 현재 5단계 구조 + frontmatter "Reference document generation is handled by /dev:docs"에 맞춰 spec 본문 재작성. 아카이브 대상 목록에 `review-report-*.md` 추가 |
| A2 | `docs/specs/topic-lifecycle.md` | 모든 커맨드·스킬 버전 표기 outdated. `dev-context/SKILL.md` 경로가 `meta-dev-context/SKILL.md`로 rename됐는데 미반영. 테스트 카운트 표기 stale | spec v6→16, plan v7→11, impl v4→24, review v4→12, spec-review v5→6, plan-review v1→4. 테스트 수 74→89. dev-context skill 경로 `meta-dev-context/`로 수정 |
| A3 | `docs/specs/dev-context-config.md` | "현재 정의된 네임스페이스" 목록에 `config.spec.*`·`config.plan.*`·`config.graphify.*` 누락. `config.dev_impl` 스키마에 `batch_mode`·`currentBatchRunning`·`currentBatchTopic` 누락 | 5개 누락 항목 추가. 코드는 5개 키 모두 사용 중 |
| A4 | `docs/specs/skill-registry.md` | spec frontmatter version `1` vs 실제 SKILL.md `version: 3`. stack-* 매핑 표에 `stack-exa` 행 누락. "stack-firecrawl만 구현, exa-search는 별도 토픽" 진술 stale | version 표기 갱신, 매핑 표에 `stack-exa \| [search-adapter, exa]` 행 추가, 구현 상태 진술 정리 |
| A5 | `docs/specs/review-adversarial-workflow.md` L15 | `review.md (version 8)` 표기 — 실제 v12 | `(version 12)`로 갱신 |
| A6 | `.harness/contracts/review-report.md` L46 | 처리 내역 표 헤더 `CRITICAL\|HIGH\|MEDIUM` (LOW 누락) vs L64에서는 LOW 포함 — contract 내부 불일치 | L46 헤더에 `\| LOW` 추가 |
| A7 | `docs/specs/hook-command-paths.md` L7 | "hook 스크립트 9종" 표현 — 실제 디렉토리는 8개 (`src/.claude/scripts/hooks/`) | "8종"으로 수정 |
| A8 | `docs/specs/spec-workflow.md` L105-108 | 분할 기준 표가 spec.md Step 7의 PR 병합 단위 기준(독립 배포·revert·비의존)보다 단순 | spec.md 기준에 맞춰 강화 |
| A9 | `docs/specs/pr-workflow.md` L35 | `branchType`이 "브랜치명 패턴 검증에 사용된다"는 진술이 코드와 무관 — 실제 검증은 `config.git.branchPattern` 담당 | 해당 진술 제거. B2와 짝 |

부수 갱신 (스킬 측 stale 문서):
- `src/.claude/skills/skill-registry/SKILL.md:255`의 `firecrawl-search and exa-search skills are not yet implemented` 문구도 stale. A4와 같은 패스로 정리.

---

## 분류 2 — 구현을 스펙에 맞게 수정 (code-mismatch)

스펙이 의도된 동작이고 코드가 어긋난 케이스. 코드 변경이 필요하다.

| # | 대상 파일 | 결함 | 수정 방향 |
|---|---------|------|---------|
| B1 | `src/.claude/skills/wf-task-tracking/SKILL.md` | spec과 `/dev:impl` Step 9.5는 entries → markdown 일방향 sync로 명시 (커맨드 소유). 그러나 SKILL.md L15·29·55·64·69 5개 라인은 여전히 "에이전트가 plan markdown을 직접 Edit하라"고 지시 — spec과 정반대 동작 | 5개 라인 제거·재작성. "체크박스는 entries만 갱신, markdown sync는 /dev:impl Step 9.5가 담당"으로 정리 |
| B2 | `src/.claude/commands/dev/pr.md:107` | `branchType`을 `dev-context.js read`로 read만 하고 어디서도 사용하지 않는 데드 read | 데드 read 제거. A9와 짝 |

---

## 분류 3 — 방향 결정 필요

스펙·구현 어느 쪽이 정답인지 사용자 판단이 필요하다.

| # | 항목 | 현재 상태 | 옵션 |
|---|------|---------|------|
| C1 | `src/.claude/commands/dev/impl.md:217-219` + `docs/specs/impl-workflow.md:126`의 `Load .claude/skills/simplify/SKILL.md` 명시 로드 경로 | src·루트·user-level 어디에도 simplify SKILL.md 없음. 시스템에는 plugin 스킬로 등록된 `simplify`만 노출 | (a) **스펙 유지·코드 추가**: `src/.claude/skills/simplify/SKILL.md`를 새로 작성해 정합. (b) **스펙 수정**: impl.md/impl-workflow.md의 명시 로드 라인을 plugin 스킬 호출 형태(Skill 도구 invoke)로 변경 |

---

## PASS 영역 (참고)

19개 spec이 코드와 정확히 일치한다. 추후 검증 우선순위에서 제외 가능.

- 인프라: `harness-src-layout`, `deploy-harness-manifest`, `harness-scripts-esm-compat`, `graphify-integration`, `harness-knowledge-index`
- 설계 원칙: `command-skill-boundary`, `prompt-authoring-guide`, `codex-session-detection`, `planner-progress-tracking`
- 워크플로우: `spec-workflow` (분할 기준 표현 외), `plan-workflow`, `impl-workflow` (simplify 외), `reference-docs-workflow`, `review-adversarial-workflow` (버전 표기 외)
- 설정: `git-project-config`, `statusline`
- 스킬: `wf-codex-review`, `wf-deep-research`, `prompt-eval-workflow`, `meta-skill-creator`, `eval-harness`, `stack-exa`, `stack-firecrawl`

---

## graphify Surprising Connections 검증

GRAPH_REPORT의 INFERRED edge 5건 중 stack-exa ↔ stack-firecrawl 사이 2건을 직접 검증했다.

| Edge | confidence | 검증 결과 |
|------|----------|---------|
| `HTTP 429 exponential backoff retry loop` --semantically_similar_to--> `stack-firecrawl Skill` | 0.84 | **정확** — 두 어댑터가 동일 알고리즘 보유: `for attempt in 1 2 3; sleep $((2 ** attempt))` |
| `Title fallback rule (extract domain from URL)` --semantically_similar_to--> `stack-firecrawl Skill` | 0.84 | **정확** — 두 어댑터 모두 `jq` URL 도메인 추출 패턴 사용 |

stale이 아니라 **정당한 refactor 후보**다. 두 어댑터의 공통 backoff·title fallback 로직을 search-adapter 베이스라인으로 추출하면 코드 중복 약 30라인을 줄일 수 있다 (skill-registry contract와는 별개의 별도 토픽).

---

## 권고 수정 순서

1. **B1** `wf-task-tracking/SKILL.md` 5라인 정정 — 결정적 동작 mismatch이므로 최우선
2. **C1** simplify 스킬 방향 결정 후 적용
3. **B2 + A9** pr.md 데드 read 제거 + spec 진술 정정 (한 패스)
4. **A1** done-workflow.md §동작·§개요·§구조 재작성
5. **A2-A4** topic-lifecycle / dev-context-config / skill-registry 일괄 갱신 (+ skill-registry SKILL.md L255 정리)
6. **A5-A8** minor 4건 일괄 patch

---

## 검증 방법론 (재현용)

다음 검증 시 동일 절차로 재현 가능:

1. graph 신선도 확인: `git rev-parse HEAD` vs `jq -r '.built_at_commit' graphify-out/graph.json`. 차이가 있으면 `uv run graphify update .` 후 재검증
2. spec ↔ 구현 매핑 1차 추출:
   ```
   jq '.links[] | select(.source_file == "docs/specs/<name>.md")' graphify-out/graph.json
   ```
3. spec 본문 정독 → 핵심 주장(경로·심볼·동작) 추출
4. 3계층 검증 (싼 것부터):
   - 경로 주장 — 파일 존재 확인
   - 심볼 주장 — grep으로 함수명·CLI 서브커맨드·config 키·상태값 검증
   - 동작 주장 — 1·2 통과한 항목만 코드 정독
5. 통일 형식으로 finding 표 작성, doc-stale / code-mismatch 라벨 부여

graphify는 1차 매핑 도구로 활용하되, cluster-only 모드에서는 파일 단위 정밀도가 낮으므로 직접 grep/Read 대조가 1차 검증 수단이다.
