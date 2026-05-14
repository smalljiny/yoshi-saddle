# Graphify + Claude Code Integration — Always-On Knowledge Graph

Source: https://graphify.net/graphify-claude-code-integration.html

---

Graphify + Claude Code Integration — Always-On Knowledge Graph




[Graphify](index.html)

* [Install](index.html#install)
* [CLI](graphify-cli-commands.html)
* [Concepts](knowledge-graph-for-ai-coding-assistants.html)

EN
ZH-CN
ZH-HK
ZH-TW
KO
VI




#### Docs

* [Knowledge Graphs](knowledge-graph-for-ai-coding-assistants.html)
* [Tree-sitter AST](tree-sitter-ast-extraction.html)
* [Leiden Clustering](leiden-community-detection.html)
* [Claude Code Integration](graphify-claude-code-integration.html)
* [CLI Reference](graphify-cli-commands.html)
* [vs Alternatives](graphify-vs-alternatives.html)

[Home](index.html) › Graphify + Claude Code Integration

# Graphify + Claude Code Integration

The deepest integration [Graphify](index.html) ships with is for Claude Code. One command installs both a `CLAUDE.md` directive and a `PreToolUse` hook, so Claude consults the knowledge graph *before* every file-search tool call — not after.

## One-command install

```
pip install graphifyy
graphify install
graphify claude install   # from inside your project
```

That second command does two things:

* Writes a **`CLAUDE.md`** section telling Claude to read `graphify-out/GRAPH_REPORT.md` before answering architecture questions.
* Installs a **`PreToolUse` hook** in `settings.json` that fires before every `Glob` and `Grep` call. If a knowledge graph exists, Claude sees: *"graphify: Knowledge graph exists. Read GRAPH\_REPORT.md for god nodes and community structure before searching raw files."*

The effect: Claude navigates by structure — god nodes, communities, surprising connections — instead of grepping every file. See [why a graph beats flat search](knowledge-graph-for-ai-coding-assistants.html).

## Other assistants

Codex, OpenCode, OpenClaw and Factory Droid don't support PreToolUse hooks, so Graphify writes the same rules to `AGENTS.md` in your project root. That's the always-on mechanism on those platforms.

| Platform | Command | Mechanism |
| --- | --- | --- |
| Claude Code | `graphify claude install` | `CLAUDE.md` + `PreToolUse` hook |
| Codex | `graphify codex install` | `AGENTS.md` |
| OpenCode | `graphify opencode install` | `AGENTS.md` |
| OpenClaw | `graphify claw install` | `AGENTS.md` |
| Factory Droid | `graphify droid install` | `AGENTS.md` |

Codex users also need `multi_agent = true` under `[features]` in `~/.codex/config.toml` for parallel extraction. Factory Droid uses its `Task` tool for parallel subagent dispatch. OpenClaw currently runs sequential extraction.

## Always-on vs explicit trigger

The always-on hook surfaces `GRAPH_REPORT.md` — a one-page summary of god nodes, communities and surprising connections. That covers most everyday orientation.

For precise, hop-by-hop traversals, use the explicit [CLI commands](graphify-cli-commands.html): `/graphify query`, `/graphify path` and `/graphify explain`. They read `graph.json` directly and return edge-level detail with relation type, confidence score and source location.

## Keeping the graph fresh

Two options:

* **Git hooks** — `graphify hook install` writes post-commit and post-checkout hooks that rebuild the graph after every commit and every branch switch.
* **Watch mode** — `/graphify ./raw --watch` runs in a background terminal; code saves trigger an instant AST-only rebuild, doc/image changes notify you to run `--update`.

## Related topics

* [Knowledge graphs for AI coding assistants](knowledge-graph-for-ai-coding-assistants.html)
* [Graphify CLI command reference](graphify-cli-commands.html)
* [Tree-sitter AST extraction](tree-sitter-ast-extraction.html)
* [Graphify vs Sourcegraph, Code2Vec and Neo4j](graphify-vs-alternatives.html)

#### On this page

* [One-command install](#h-0)
* [Other assistants](#h-1)
* [Always-on vs explicit trigger](#h-2)
* [Keeping the graph fresh](#h-3)
* [Related topics](#h-4)


© 2026 [Graphify](index.html) · MIT Licensed · [GitHub](https://github.com/safishamsi/graphify)
