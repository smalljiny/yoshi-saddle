---
version: 4
description: Scaffold language-specific rule files (coding-style/security/testing) under .harness/rules/<language>/. Generative, not template copy.
category: harness-management
---

# /add-language-rules

Add new language or framework rules to the harness by generating three rule files under `.harness/rules/<language>/`. Claude writes the files based on the language's idioms, security conventions, and testing practices — not from a fixed template.

> **Note**: Generated files go to `.harness/rules/<language>/` (shared Claude + Codex), not `.claude/rules/`.

## Language and messages

Before the first user-facing message, run `node .harness/scripts/lang.js resolve --kind=conversation` once.
If it exits non-zero or its stdout is not exactly `ko` or `en`, use `en`.
In the same step, Read the catalogs this file references: `.harness/i18n/<lang>/commands/add-language-rules.md` for the chosen language and `.harness/i18n/en/commands/add-language-rules.md`.
Resolve each reference token with the chosen language. If any catalog file or ID is missing, Read `.claude/rules/common/component-boundaries.md` (Message Catalogs > Failure Policy) and follow it.

Before printing each message, look its ID up in the catalog text you read. When the ID is absent from both the chosen-language file and the `en` file, the output for that token is exactly `[missing message: <ID>]` (or `[missing catalog: <path>]` when the `en` file is missing): do not compose replacement wording, do not paraphrase the step's intent, and do not ask a question of your own in its place. For a message that does not take an answer, print that diagnostic in the message's position and continue. For an answer-required ID, follow the answer-required check below.

**Answer-required check** (used by every question below that names it): run this check first and call the question only if it passes. Before calling it, run this Bash command with the IDs listed for that question:

```bash
grep -hxE '## (<ID1>|<ID2>|...)' .harness/i18n/<lang>/commands/add-language-rules.md .harness/i18n/en/commands/add-language-rules.md
```

An ID that appears in neither file's output cannot be obtained. If any cannot be obtained, do not call the question: output `[missing catalog: <path>]` once when the `en` file is missing, otherwise `[missing message: <ID>]` for each missing ID, then stop without waiting for input. After that stop, do not perform the follow-up actions named for that question (no rule directory or file creation).

## Usage

```
/add-language-rules <language>
```

**Examples:**
```
/add-language-rules rust
/add-language-rules react
/add-language-rules go
/add-language-rules python
```

If `$ARGUMENTS` is empty, call `AskUserQuestion` with {{ask:LANGUAGE|RUST|GO|PYTHON|CUSTOM}} (rust is the recommended first option). Answer-required IDs: `LANGUAGE_Q`, `LANGUAGE_HEADER`, and the `_LABEL`·`_DESC` of `RUST`, `GO`, `PYTHON`, `CUSTOM`. Apply the answer-required check (see "Language and messages"); if it stops, do not create or write any rule file. A language outside these options comes from `CUSTOM` or the tool's "Other" answer, used as `$ARGUMENTS`.

## Execution Flow

### 1. Parse and Normalize Language Name

Read `$ARGUMENTS` and normalize to lowercase with hyphens:
- `React Native` → `react-native`
- `Go` → `go`
- `C++` → `cpp`

After normalization, verify the result contains only `[a-z0-9-]` characters.
If the result contains `.`, `/`, `\`, `..`, or any character outside `[a-z0-9-]`, stop immediately and output {{msg:INVALID_LANGUAGE}}.

### 2. Check for Existing Rules

Check if `.harness/rules/<language>/` already exists (substitute actual language name — e.g. `ls .harness/rules/rust/ 2>/dev/null`).

If the directory exists, call `AskUserQuestion` with {{ask:EXISTING_RULES|SKIP|OVERWRITE}} (`{language}`: the normalized language name). Answer-required IDs: `EXISTING_RULES_Q`, `EXISTING_RULES_HEADER`, and the `_LABEL`·`_DESC` of `SKIP` and `OVERWRITE`. Apply the answer-required check; if it stops, do not create or overwrite any rule file.

If user selects `SKIP`, stop. Otherwise proceed.

### 3. Load Reference Structure

Read the following common rule files as section-structure references:
- `.harness/rules/coding-style.md`
- `.harness/rules/security.md`
- `.harness/rules/testing.md`

Use these to understand the section headings and level of detail expected in each file type. Do not copy content — generate language-specific content.

### 4. Generate Rule Files

Create `.harness/rules/<language>/` and write three files. Each file must include `version: 1` frontmatter.

Claude writes each file based on the target language's characteristics:

**`coding-style.md`** — Naming conventions, idioms, formatting rules, and readability guidelines specific to this language's community standards (e.g., Rust's ownership conventions, Go's `gofmt` style, React's component naming).

**`security.md`** — Common vulnerability patterns and their mitigations specific to this language or framework (e.g., memory safety in Rust, SQL injection in ORM usage, XSS in React, dependency supply-chain risks).

**`testing.md`** — Testing conventions, framework choices, and patterns for this language (e.g., `cargo test` + property testing in Rust, `testing` package in Go, React Testing Library patterns, pytest fixtures in Python).

Each file must begin with:
```markdown
---
version: 1
---
```

### 5. Link to Related Skills

After generating the files, check if a relevant stack skill exists and suggest it:

| Language / Framework | Related skill |
|---------------------|---------------|
| Python | `stack-python`, `stack-python-test` |
| React / Next.js | `stack-frontend`, `stack-nextjs` |
| Node.js / Fastify | `stack-backend`, `stack-fastify` |
| TypeScript | `.harness/rules/typescript/` already exists |
| PostgreSQL | `stack-postgres`, `stack-db-migrations` |
| Docker | `stack-docker` |
| LangChain | `stack-langchain` |

If a matching skill exists, output {{msg:RELATED_SKILL}} (`{skill_name}`: the matching skill names).

### 6. Output Reload Guidance

After Step 5 (regardless of whether a related skill was found), print {{msg:RELOAD_HINT}} as the last output of this command.

This line is informational. Do not invoke `/flow-init` automatically, do not call the Bash or Task tools to run it, and do not load the flow-init skill — the user controls when to rerun `/flow-init` to refresh the CLAUDE.md `@import` block.

## Non-goals

- `hooks.md` and `patterns.md` are **not** generated — scope is intentionally limited to the three files above
- Codex-side synchronization is not triggered — `.harness/rules/<language>/` is already shared (Claude + Codex read from the same path)
- `.claude/rules/` is not modified — generated files go to `.harness/rules/` only
