# `docs/specs` ↔ `src/` 정합성 검증 보고

> 작성일: 2026-05-10
> 검증 기준: graph 커밋 `e12f5660` (= 검증 시점 HEAD)
> 검증 도구: `graphify-out/graph.json` + 직접 grep/Read 대조
> 검증 범위: `docs/specs/` 30개 spec ↔ `src/.claude/`·`src/.harness/`·`src/.codex/`·`scripts/` 구현
> 분담: 4개 병렬 에이전트가 라이프사이클(6) / 후반 워크플로우(5) / 스킬·메타·Search(9) / 인프라·설계(10) 그룹으로 점검

---

## 요약

30개 spec, 약 90개 검증 항목 중 **PASS 19건, doc-stale 9건, code-mismatch 2건, 결정 필요 1건**.

doc-stale 9건은 커밋 `8afe8a4`(src 명세 정정) + `8f68fbd`(docs/specs 정합화)로 처리 완료. 본 문서에는 잔존 항목인 분류 2(code-mismatch 2건)와 분류 3(결정 필요 1건)만 유지한다.

`wf-task-tracking`은 spec과 SKILL.md가 정반대 동작을 주장하는 결정적 mismatch이므로 잔존 항목 중 우선 수정 대상이다. graphify INFERRED edge 2건(`stack-exa ↔ stack-firecrawl` 의미 유사성)은 stale이 아니라 정당한 refactor 후보로 검증됐다.

---

## 분류 1 — 구현을 스펙에 맞게 수정 (code-mismatch)

스펙이 의도된 동작이고 코드가 어긋난 케이스. 코드 변경이 필요하다.

| # | 대상 파일 | 결함 | 수정 방향 |
|---|---------|------|---------|
| B1 | `src/.claude/skills/wf-task-tracking/SKILL.md` | spec과 `/dev:impl` Step 9.5는 entries → markdown 일방향 sync로 명시 (커맨드 소유). 그러나 SKILL.md L15·29·55·64·69 5개 라인은 여전히 "에이전트가 plan markdown을 직접 Edit하라"고 지시 — spec과 정반대 동작 | 5개 라인 제거·재작성. "체크박스는 entries만 갱신, markdown sync는 /dev:impl Step 9.5가 담당"으로 정리 |
| B2 | `src/.claude/commands/dev/pr.md:107` | `branchType`을 `dev-context.js read`로 read만 하고 어디서도 사용하지 않는 데드 read | 데드 read 제거 (대응 spec 진술은 `8f68fbd`에서 이미 정정됨) |

---

## 분류 2 — 방향 결정 필요

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

## 권고 수정 순서 (잔존 항목)

1. **B1** `wf-task-tracking/SKILL.md` 5라인 정정 — 결정적 동작 mismatch이므로 최우선
2. **B2** `pr.md:107` `branchType` 데드 read 제거
3. **C1** simplify 스킬 방향 결정 후 적용

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
