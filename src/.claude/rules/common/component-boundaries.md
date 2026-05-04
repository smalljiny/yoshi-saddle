---
version: 4
---
# Component Boundaries: Commands vs Skills

## Roles

### Commands (`.claude/commands/`)

- **Workflow owner** — define step order, conditional branches, pause/resume points
- **Persistence** — save files, move directories, write state
- **Orchestration** — load skills, invoke agents, await user input
- Do **not** implement reusable unit logic directly

### Skills (`.claude/skills/`)

- **Unit function owner** — a separable, reusable unit of capability
- **Single source of truth** — loaded by multiple commands or contexts
- Do **not** own workflow sequencing or persistence

## Delegation Pattern (Standard)

When a command needs skill logic:

```
Load `.claude/skills/<name>/SKILL.md` and follow its process.
```

Reference case: `dev/spec.md` → `wf-brainstorming/SKILL.md`

When a component (agent/skill/command) needs to load a rule explicitly:

```
Load <rule-path> and follow its process.
```

Same form as the Skill delegation, applied to rule paths. Reference case: `meta-skill-creator/SKILL.md`, `agents/planner.md`, `agents/prompt-engineer.md` → `.claude/rules/common/prompt-authoring.md` (적용 예정 — `opus-47-prompt-authoring-guide` 토픽의 Task 3·4).

## Violation Criteria

A command violates this rule if it directly defines logic that:

- **already exists in a skill** (duplication), OR
- **meets the skill criteria** (reusable, separable unit logic) but has no corresponding skill yet

Examples of logic that belongs in a skill, not a command:
- Gate definitions (build steps, check sequences)
- Quality criteria or evaluation rubrics
- Output format templates
- Pattern detection or extraction logic

When a violation is found, either delegate to an existing skill or extract the logic into a new skill first.

**체크리스트 중복 예시 (위반):**

```
# BAD: 커맨드에 체크리스트 재정의
## 5. Verify quality
- [ ] Build succeeds
- [ ] Tests pass at 80%+ coverage
→ 이 체크리스트가 wf-verification/SKILL.md에 이미 정의됨

# GOOD: 스킬에 위임
Load `.claude/skills/wf-verification/SKILL.md` and run its checklist.
```

## Placement Decision Guide

| Need | Where to put it |
|------|----------------|
| Reusable unit logic (used in 2+ places, or likely to be) | Skill |
| Workflow glue (sequencing, saving, triggering) | Command |
| Both | Skill for logic + Command delegates to skill |

## Command Gate Pattern

복수의 유효 상태를 처리하는 커맨드를 작성할 때는 개별 early-stop guard를 쌓지 말고 **exhaustive 상태 테이블을 먼저 정의**한다.

```
# BAD: early-stop guard 중첩
if phase != "impl": stop
if status != "in-progress": stop
if review != "done": stop

# GOOD: 상태 테이블 우선 정의
| phase:status       | Action                    |
|--------------------|---------------------------|
| impl:in-progress   | proceed                   |
| review:in-progress | show "already in review"  |
| (other)            | show gate-failure message |
```

상태 테이블은 모든 경우를 한눈에 파악하고, 신규 상태 추가 시 누락을 방지하며, 테스트 케이스 도출이 쉽다.
