# Spec Review Checklist Template

Item names come from `.harness/contracts/spec-review.md`. Write each report line with the item name from that contract; this file defines only the item number and its evaluation criteria.

Use all items. Final decision rules:
- All PASS → **READY**
- Any FAIL → **NOT READY**
- All PASS but some NOTE observations → **READY WITH NOTE**

---

## Legacy Heading Aliases

Specs written before the English headings use Korean headings. A row's old and new forms count as the same section.

| Section | Old form | New form |
|---|---|---|
| Header fields | `**상태**`·`**작성일**`·`**작성자**` | `**Status**`·`**Date**`·`**Author**` |
| 1 | `## 1. 개요` | `## 1. Overview` |
| 1.1 | `### 1.1 배경` | `### 1.1 Background` |
| 1.2 | `### 1.2 목적` | `### 1.2 Purpose` |
| 2 | `## 2. 목표` | `## 2. Goals` |
| 3 (code/feature) | `## 3. 아키텍처` | `## 3. Architecture` |
| 3 (workflow/role) | `## 3. 역할 정의` | `## 3. Role Definition` |
| 4 | `## 4. 의사결정` | `## 4. Decisions` |
| 5 | `## 5. 범위 밖 (Non-goals)` | `## 5. Non-goals` |
| 7 | `## 7. 관련 문서` | `## 7. Related Documents` |

Exclude `### 1.3 Coupling Rationale`, `## 6. Open Questions`, and the H1 document title from alias and mixing judgments; their headings did not change.

## Review-Required Sections

| Section | When missing | Check |
|---|---|---|
| `## 2.` Goals | FAIL | Check 1 |
| `## 5.` Non-goals | FAIL | Check 2 |
| `## 3.` Architecture / Role Definition / equivalent planning structure section | FAIL | Check 3 |
| `## 4.` Decisions | FAIL | Check 4 |
| `## 6.` Open Questions | FAIL | Check 5 |
| Header fields, `## 1.` Overview, `## 7.` Related Documents | Not a FAIL | — |

The alias table does not narrow the "or equivalent" allowance of Check 3.

## Structure Rules

Apply each rule per review-required section.

| Situation | Judgment |
|---|---|
| Each required section appears exactly once in its old or new form, all in the same form | PASS (judge the item by its own criteria) |
| Same as above, but old and new forms are mixed across sections | PASS. Do not record a NOTE for the mixing anywhere in the report |
| `## 3.` appears exactly once as an Architecture-family, Role Definition-family, or equivalent planning structure heading | Valid (old or new form) |
| The same review-required section appears two or more times — an old/new alias pair (`## 2. 목표` and `## 2. Goals`), the same form repeated (`## 2. Goals` twice), or two or more `## 3.` sections (`## 3. Architecture` and `## 3. Role Definition`, or `## 3. Architecture` and `## 3. 설계`) | Check 6 FAIL — duplicate section. Add a Required Fixes item that names the duplicated section and asks to merge it into one |
| A numbered `## 3.` heading and an unnumbered equivalent heading (`## 설계`) both appear | Not a duplicate. Check 3 reads both sections together and judges by content |
| A review-required section is missing in both old and new forms | FAIL on the check listed in Review-Required Sections |
| Header fields, `## 1.`, or `## 7.` are missing | Not a FAIL |

---

- [ ] Check 1
  Evidence: (verify Goals section is specific and verifiable — not vague aspirations.
  Each goal should answer "how will we know this is done?")

- [ ] Check 2
  Evidence: (verify Non-goals section explicitly states what this spec does NOT cover.
  Absence of Non-goals section → FAIL.
  Vague or empty Non-goals → FAIL.)

- [ ] Check 3
  Evidence: (verify the spec contains a planning structure section with enough detail to decompose into tasks.
  Accepted forms: `## 3. Architecture` or `## 3. 아키텍처` (code/feature topics), or `## 3. Role Definition` or `## 3. 역할 정의` or equivalent (workflow/policy/role topics).
  For code topics: must include overall structure, main components, and interfaces or data model where applicable.
  For non-code topics: must describe role boundaries, responsibility separation, or workflow structure in enough detail for planning.
  Missing any planning structure section → FAIL.
  Present but too vague to decompose into tasks → FAIL.)

- [ ] Check 4
  Evidence: (verify Design Decisions table exists and each row has a non-empty Rationale.
  Decisions without rationale → FAIL.
  Missing Design Decisions section entirely → FAIL.)

- [ ] Check 5
  Evidence: (verify Open Questions section exists.
  Unresolved decisions that affect implementation scope must be listed here, not assumed away.
  Missing section or section present but clearly incomplete given spec content → FAIL.)

- [ ] Check 6
  Evidence: (verify no contradictions between sections.
  Check: Goals vs Architecture, Goals vs Non-goals, Architecture vs Design Decisions.
  Any direct contradiction → FAIL.
  The same review-required section appearing two or more times (see Structure Rules) → FAIL; add a Required Fixes item that names the section and asks to merge it.)

- [ ] Check 7
  Evidence: (verify spec is concrete enough for implementation to begin.
  Must not rely on undefined external systems, unknown APIs, or decisions deferred without tracking.
  Blockers not listed in Open Questions → FAIL.)

- [ ] Check 8
  Evidence: (verify spec is neither too large nor too small.
  Too large: covers multiple independent deployable units that should be separate specs → NOTE or FAIL.
  Too small: trivially simple, does not warrant a spec → NOTE.
  Scope concerns that would block planning → FAIL.)
