# Contract: Spec Document Format

- **Producer**: Claude brainstorming skill (content) + `/flow-spec` (persistence)
- **Consumer**: `/flow-spec` Step 7 (split analysis), Codex `spec-review` skill (quality validation)

This contract defines the section structure a spec document must have and the criteria for judging a mergeable PR unit.
`/flow-spec` injects this file as the format reference when it invokes brainstorming.

Version policy: when the section structure or the split criteria change, state the change in the PR body.
Do not use YAML frontmatter or a version field.

---

## Spec Document Format

### Required Sections (all topics)

```markdown
# <Feature Name> Spec

**Status**: Draft
**Date**: YYYY-MM-DD
**Author**: @<username>

> **Scope**: what this document covers

## 1. Overview
### 1.1 Background
### 1.2 Purpose

## 2. Goals

<!-- For ## 3., use the one section from "Optional Sections" below that fits the topic type -->

## 4. Decisions

| Item | Decision | Rationale |
|------|----------|-----------|

## 5. Non-goals

## 6. Open Questions

## 7. Related Documents
```

### Optional Sections (by topic type)

| Section | Code / Feature | Workflow / Policy | Role / Structure |
|---------|---------------|-------------------|-----------------|
| `## 3. Architecture` (overall structure, main components) | ✅ Include | ⬜ Omit if not applicable | ⬜ Omit if not applicable |
| `## 3. Role Definition` (role boundaries, responsibility separation) | ⬜ Omit if not applicable | ✅ Include | ✅ Include |

Use exactly one `## 3.` heading: the optional section that fits the topic type. When the topic does not clearly fit any type, use the `Role Definition` structure to describe boundaries and responsibilities — every spec needs a `## 3.` section in one of these forms.

---

## Split Criteria (Mergeable Unit Check)

While writing a spec, check with the questions below whether the unit is suitable for a single PR merge. `/flow-spec` Step 7 (split recommendation) uses the same criteria.

| Criterion | Question |
|-----------|----------|
| Independently deployable | Does the system work correctly when only this spec is merged? |
| Independently revertible | Does reverting only this change leave other features intact? |
| Independent of other PRs | Can this be merged without waiting for other in-flight PRs? |
| Coupling Rationale | If several goals must stay together as a dependency chain, does §1.3 state the coupling rationale? |

**Signal that the unit is too large**: 3 or more goals, each independently deployable → recommend splitting.
**Valid reason to keep the unit**: a dependency chain where a partial merge breaks the workflow or doubles verification cost.
