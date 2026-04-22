---
version: 1
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

Ask the user to describe the migration goal and determine the change type:

- **Column add**: adding a new column (nullable, default, or NOT NULL)
- **Column rename / remove**: expand-contract pattern required
- **Index creation**: concurrent vs. inline
- **Data backfill**: separate migration from schema change
- **Table create / drop**
- **Other**: describe the change

### 3. Run Safety Checklist

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
