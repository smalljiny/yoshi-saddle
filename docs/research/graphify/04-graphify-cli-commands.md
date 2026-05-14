# Graphify CLI Command Reference — Build, Query, Export

Source: https://graphify.net/graphify-cli-commands.html

---

Graphify CLI Command Reference — Build, Query, Export




[Graphify](index.html)

* [Install](index.html#install)
* [Concepts](knowledge-graph-for-ai-coding-assistants.html)
* [Integration](graphify-claude-code-integration.html)

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

[Home](index.html) › CLI Command Reference

# Graphify CLI Command Reference

Every [Graphify](index.html) command, grouped by intent. All commands are callable from your AI coding assistant as a slash command (`/graphify …`) *and* directly from the terminal (`graphify …`), so you can query the graph without an assistant in the loop at all.

## Build the graph

```
/graphify                          # run on current directory
/graphify ./raw                    # run on a specific folder
/graphify ./raw --mode deep        # more aggressive INFERRED edges
/graphify ./raw --update           # re-extract changed files, merge into existing graph
/graphify ./raw --cluster-only     # rerun clustering on existing graph, no re-extraction
/graphify ./raw --no-viz           # skip HTML, produce report + JSON only
/graphify ./raw --watch            # auto-sync as files change
```

The AST pass always runs locally; the semantic pass uses your AI assistant's model API. See [Tree-sitter AST extraction](tree-sitter-ast-extraction.html) for what each pass produces.

## Add external sources

```
/graphify add https://arxiv.org/abs/1706.03762        # fetch a paper
/graphify add https://x.com/karpathy/status/...       # fetch a tweet
/graphify add https://... --author "Name"             # tag the original author
/graphify add https://... --contributor "Name"        # tag who added it
```

URL fetching is restricted to http/https, size- and time-bounded, and runs through `ingest.py`'s containment checks.

## Query the graph

```
/graphify query "what connects attention to the optimizer?"
/graphify query "..." --dfs                # trace a specific path
/graphify query "..." --budget 1500        # cap tokens returned
/graphify path "DigestAuth" "Response"     # exact path between two nodes
/graphify explain "SwinTransformer"        # everything Graphify knows about a node

# Same commands work from the terminal, no assistant needed:
graphify query "what connects attention to the optimizer?"
graphify query "show the auth flow" --dfs
graphify query "..." --graph path/to/graph.json
```

## Export

```
/graphify ./raw --wiki             # Wikipedia-style markdown per community
/graphify ./raw --obsidian         # generate an Obsidian vault
/graphify ./raw --svg              # export graph.svg
/graphify ./raw --graphml          # export graph.graphml (Gephi, yEd)
/graphify ./raw --neo4j            # generate cypher.txt
/graphify ./raw --neo4j-push bolt://localhost:7687   # push to a live Neo4j instance
/graphify ./raw --mcp              # start MCP stdio server
```

## Keep the graph fresh

```
graphify hook install              # post-commit + post-checkout rebuild
graphify hook uninstall
graphify hook status
```

Git hooks are platform-agnostic. For assistant-specific always-on mode (`CLAUDE.md`, `AGENTS.md`, `PreToolUse` hook), see [Claude Code integration](graphify-claude-code-integration.html).

## Always-on assistant installers

```
graphify claude install            # CLAUDE.md + PreToolUse hook (Claude Code)
graphify codex install             # AGENTS.md (Codex)
graphify opencode install          # AGENTS.md (OpenCode)
graphify claw install              # AGENTS.md (OpenClaw)
graphify droid install             # AGENTS.md (Factory Droid)
```

Each has a matching `uninstall` command.

## Related topics

* [Knowledge graphs for AI coding assistants](knowledge-graph-for-ai-coding-assistants.html)
* [Graphify + Claude Code integration](graphify-claude-code-integration.html)
* [Tree-sitter AST extraction](tree-sitter-ast-extraction.html)
* [Leiden community detection](leiden-community-detection.html)
* [Graphify vs alternatives](graphify-vs-alternatives.html)

#### On this page

* [Build the graph](#h-0)
* [Add external sources](#h-1)
* [Query the graph](#h-2)
* [Export](#h-3)
* [Keep the graph fresh](#h-4)
* [Always-on assistant installers](#h-5)
* [Related topics](#h-6)


© 2026 [Graphify](index.html) · MIT Licensed · [GitHub](https://github.com/safishamsi/graphify)
