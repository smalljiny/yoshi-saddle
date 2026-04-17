---
version: 5
name: brainstorming
description: Use when writing a spec draft — refines rough ideas into fully-formed specs through collaborative questioning, alternative exploration, and incremental validation. Loaded by /dev:spec during draft writing.
origin: sample-claude-env
---

# Brainstorming Ideas Into Specs

## Overview

Help turn ideas into fully formed spec documents through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the spec in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs when the direction is not already clear
- If the user has already indicated a direction, validate it rather than forcing alternatives
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the spec:**
- Once you understand what you're building, write the spec
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover all standard sections (see Output Format below)
- Be ready to go back and clarify if something doesn't make sense

## Output Format

Present the completed spec inline in the conversation using this structure.
After presenting, announce completion so `/dev:spec` can save the file:

> 스펙 초안이 완성되었습니다. /dev:spec이 파일로 저장합니다.

### Required sections (all topic types)

```markdown
# <기능명> 스펙

**상태**: Draft
**작성일**: YYYY-MM-DD
**작성자**: @<username>

> **문서 범위**: 이 문서가 다루는 범위

## 1. 개요
### 1.1 배경
### 1.2 목적

## 2. 목표

## 4. 의사결정

| 항목 | 결정 | 근거 |
|------|------|------|

## 5. 범위 밖 (Non-goals)

## 6. Open Questions

## 7. 관련 문서
```

### Optional sections (include based on topic type)

| Section | Code / Feature | Workflow / Policy | Role / Structure |
|---------|---------------|-------------------|-----------------|
| `## 3. 아키텍처` (전체 구조, 주요 컴포넌트) | ✅ Include | ⬜ Omit if not applicable | ⬜ Omit if not applicable |
| `## 3. 역할 정의` (역할 경계, 책임 분리) | ⬜ Omit if not applicable | ✅ Include | ✅ Include |

Use section number `## 3.` for whichever optional section applies. If the topic does not clearly fit any category, use the `역할 정의` structure to describe boundaries and responsibilities — section 3 is always required in some form.

## PR 병합 가능 단위 체크

스펙 작성 중 아래 질문으로 단위가 PR 병합에 적합한지 점검한다. Step 7(분할 추천)도 동일 기준을 사용한다.

| 기준 | 판단 질문 |
|------|----------|
| 독립 배포 가능 | 이 스펙만 merge해도 시스템이 정상 동작하는가? |
| 독립 롤백 가능 | 이 변경만 revert해도 다른 기능이 깨지지 않는가? |
| 다른 PR에 비의존 | 동시 진행 중인 다른 PR의 완료 없이도 merge 가능한가? |
| Coupling Rationale | 여러 목표가 의존 사슬로 묶여야 한다면 §1.3에 coupling rationale을 명시했는가? |

**단위가 너무 크다는 신호**: 목표가 3개 이상이고 각각 독립 배포 가능한 경우 → 분할 권장.
**단위를 유지하는 정당한 이유**: 부분 merge 시 워크플로우가 깨지거나 이중 검증 비용이 발생하는 의존 사슬.

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Propose 2-3 approaches when the direction is not already clear. If the user has indicated a direction, validate it rather than forcing alternatives.
- **Incremental validation** — Present spec in sections, validate each
- **Be flexible** — Go back and clarify when something doesn't make sense
- **Mark unknowns** — Put unresolved decisions in Open Questions, never invent answers
