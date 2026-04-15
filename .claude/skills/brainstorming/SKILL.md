---
version: 1
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
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the spec:**
- Once you understand what you're building, write the spec
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover all standard sections (see Output Format below)
- Be ready to go back and clarify if something doesn't make sense

## Output Format

Write the completed spec to `docs/_local/tmp/<topic>/spec.md` using this structure:

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

## 3. 아키텍처
### 3.1 전체 구조
### 3.2 주요 컴포넌트

## 4. 의사결정

| 항목 | 결정 | 근거 |
|------|------|------|

## 5. 범위 밖 (Non-goals)

## 6. Open Questions

## 7. 관련 문서
```

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present spec in sections, validate each
- **Be flexible** — Go back and clarify when something doesn't make sense
- **Mark unknowns** — Put unresolved decisions in Open Questions, never invent answers
