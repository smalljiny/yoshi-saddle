# Knowledge Graphs for AI Coding Assistants — Graphify

Source: https://graphify.net/knowledge-graph-for-ai-coding-assistants.html

---

Knowledge Graphs for AI Coding Assistants — Graphify




[Graphify](index.html)

* [Features](index.html#features)
* [Architecture](index.html#architecture)
* [Install](index.html#install)
* [CLI](graphify-cli-commands.html)

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

[Home](index.html) › Knowledge Graphs for AI Coding Assistants

# Knowledge Graphs for AI Coding Assistants

An AI coding assistant is only as good as the context it can fit in a prompt. A **knowledge graph** of your repository gives it a compact, navigable map — so it reasons about structure instead of grepping raw files. This page explains why that matters, and how [Graphify](index.html) builds that layer.

## The context-window problem

Every coding assistant — Claude Code, OpenAI Codex, OpenCode, OpenClaw, Factory Droid — hits the same ceiling: a codebase plus its docs, RFCs, papers and diagrams does not fit in a single prompt. Traditional RAG splits everything into chunks and retrieves by embedding similarity, but that loses structural information: who calls whom, which module depends on which, what rationale sat in the commit message that created a function.

A knowledge graph preserves that structure. Nodes are concepts (classes, functions, design decisions, paper sections, diagrams). Edges are relationships (`calls`, `imports`, `rationale_for`, `semantically_similar_to`). Instead of retrieving chunks, the assistant traverses edges.

## Why graphs beat vector search for code

* **Structure is signal.** `DigestAuth → Response` is a meaningful edge whether or not the two files share vocabulary.
* **Provenance is preserved.** Every edge in Graphify is tagged `EXTRACTED`, `INFERRED` or `AMBIGUOUS`, with a confidence score. You always know what was found vs guessed.
* **Multi-modal by construction.** A diagram node can connect to a code class node and a paper-section node on the same graph — try that with a flat vector store.
* **Compression compounds.** On a 52-file mixed corpus (code + papers + images), an average query costs ~1.7k tokens against the graph vs ~123k reading raw files — a **71.5× reduction**.

## How Graphify fits into your assistant

Graphify ships as a slash command. Type `/graphify .` in Claude Code, `$graphify .` in Codex, or the equivalent in OpenCode, OpenClaw or Factory Droid. It writes a `graphify-out/` folder containing an interactive `graph.html`, a one-page `GRAPH_REPORT.md` audit, and a persistent `graph.json`. From then on, queries read the graph instead of the raw tree.

For Claude Code there is a deeper integration: a **PreToolUse hook** fires before every `Glob` and `Grep` call and tells Claude to consult `GRAPH_REPORT.md` first. See [Graphify + Claude Code integration](graphify-claude-code-integration.html) for details.

## What the graph actually contains

* **God nodes** — highest-degree concepts that everything routes through.
* **Surprising connections** — ranked cross-file or cross-modal edges, each with a plain-English *why*.
* **Rationale nodes** — docstrings, `# NOTE:`/`# WHY:` comments, and design discussion from docs, attached as `rationale_for` edges.
* **Hyperedges** — group relationships connecting 3+ nodes when a pairwise edge would be lossy (e.g. all classes implementing a shared protocol).

## Related topics

* [Tree-sitter AST extraction across 19 languages](tree-sitter-ast-extraction.html)
* [Leiden community detection without embeddings](leiden-community-detection.html)
* [Graphify + Claude Code integration](graphify-claude-code-integration.html)
* [Graphify vs Sourcegraph, Code2Vec and Neo4j](graphify-vs-alternatives.html)
* [Graphify CLI command reference](graphify-cli-commands.html)

#### On this page

* [The context-window problem](#h-0)
* [Why graphs beat vector search for code](#h-1)
* [How Graphify fits into your assistant](#h-2)
* [What the graph actually contains](#h-3)
* [Related topics](#h-4)


© 2026 [Graphify](index.html) · MIT Licensed · [GitHub](https://github.com/safishamsi/graphify)
