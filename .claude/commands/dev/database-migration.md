---
version: 3
description: Guide DB schema/data migrations via stack-db-migrations skill. Interactive: identifies change type, runs safety checklist, applies ORM-specific patterns.
category: dev-workflow
---

# /dev:database-migration

Interactive workflow command for database schema and data migrations. Loads the `stack-db-migrations` skill and guides the migration process step by step.

## Usage

```
/dev:database-migration
```

No arguments required. This command runs interactively.

## Execution Flow

### 1. Load Migration Skill

Load `.claude/skills/stack-db-migrations/SKILL.md` and follow its process.

### 2. Identify Change Type

Use `AskUserQuestion` to ask "어떤 DB 변경을 적용할까요?" with the following options:

- **Column add** (Recommended) — 컬럼 추가 (nullable / default / NOT NULL)
- **Column rename or remove** — expand-contract 패턴 필요
- **Index creation** — concurrent vs. inline
- **Data backfill** — 스키마 변경과 분리
- **Table create / drop**
- **Other** — 사용자가 직접 설명

### 3. Capture Migration Plan

Before running the checklist, gather the following information from the user and the codebase:

- **Target**: exact table name, column name(s), or index to be changed
- **DB engine + version**: e.g. PostgreSQL 15, MySQL 8
- **Migration tool / ORM**: e.g. Prisma, Drizzle, Kysely, Django, golang-migrate
- **Data volume**: estimated row count in the target table (check with `SELECT COUNT(*) FROM <table>` if accessible)
- **Backfill strategy** (if adding a column or migrating data): batch size, frequency, rollback approach
- **Rollback plan**: how to revert if the migration fails in production

Present a summary of the collected plan and use `AskUserQuestion` to get explicit confirmation before proceeding:
- (Recommended) 계획 확인 — 위 내용으로 진행
- 수정 필요 — 계획 내용을 변경

If user selects 수정 필요, revisit the relevant items before continuing.

### 4. Run Safety Checklist

Walk through the **Migration Safety Checklist** from `.claude/skills/stack-db-migrations/SKILL.md` (section "Migration Safety Checklist").

For each item, verify the current migration plan and flag any risks. Recommend the appropriate safe pattern from the skill.

### 4. Apply ORM-specific Pattern

Based on the detected ORM or migration tool, apply the relevant pattern from the skill:

| ORM / Tool | Workflow |
|-----------|---------|
| Prisma | `prisma migrate dev`, custom SQL for concurrent index |
| Drizzle | `drizzle-kit generate`, `drizzle-kit migrate` |
| Kysely | `kysely-ctl`, programmatic `Migrator` |
| Django | `makemigrations`, `SeparateDatabaseAndState` |
| TypeORM | `migration:generate`, `migration:run` |
| golang-migrate | `migrate create`, `.up.sql` / `.down.sql` pair |

### 5. Zero-downtime Check

If the change modifies existing data or removes columns, determine whether the expand-contract pattern is required:

- If yes: outline the 3-phase plan (EXPAND → MIGRATE → CONTRACT) with estimated deployment timeline
- If no: proceed directly

## Next Steps

After the migration file is written and reviewed:
- Run tests to verify migration behavior
- Resume implementation with `/dev:impl` if this migration is part of an active topic
