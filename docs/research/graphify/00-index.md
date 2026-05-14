# Graphify — Open-Source Knowledge Graph Skill for AI Coding Assistants

Source: https://graphify.net/

---

Graphify — Open-Source Knowledge Graph Skill for AI Coding Assistants



[𝕏](https://twitter.com/intent/tweet?url=https%3A%2F%2Fgraphify.net%2F&text=Graphify%20%E2%80%94%20Open-Source%20Knowledge%20Graph%20Skill%20for%20AI%20Coding%20Assistants "Share on X")
[in](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgraphify.net%2F "Share on LinkedIn")
[f](https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fgraphify.net%2F "Share on Facebook")
[R](https://www.reddit.com/submit?url=https%3A%2F%2Fgraphify.net%2F&title=Graphify%20%E2%80%94%20Open-Source%20Knowledge%20Graph%20Skill%20for%20AI%20Coding%20Assistants "Share on Reddit")
[Y](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgraphify.net%2F&t=Graphify%20%E2%80%94%20Open-Source%20Knowledge%20Graph%20Skill%20for%20AI%20Coding%20Assistants "Submit to Hacker News")
[⧉](# "Copy link")


Graphify

* [Features](#features)
* [Architecture](#architecture)
* [Install](#install)
* [Examples](#examples)
* [Learn](#learn)
* [FAQ](#faq)

EN
ZH-CN
ZH-HK
ZH-TW
KO
VI

[**Deploy Your OpenClaw Online**
Click to Deploy Now ->](https://cloud.clawbot.ai/?utm_source=graphify)


Open-Source Knowledge Graph Skill

# Graphify — Knowledge Graphs for AI Coding Assistants

Graphify is an open-source skill that helps AI coding assistants understand multi-modal codebases by building a queryable knowledge graph from code, docs, papers and diagrams.

$
`pip install graphifyy`
Copy

## What is Graphify?

Graphify is a multi-modal knowledge graph builder created for AI coding assistants such as Claude Code, OpenAI Codex and OpenCode. By combining Tree-sitter static analysis with LLM-driven semantic extraction, Graphify turns an entire repository — including source code, documentation, research papers and diagrams — into an interactive graph that explains both *what* the code does and *why* it was designed that way. The project is maintained by Safi Shamsi, released under the permissive MIT license, and built on widely-trusted libraries including NetworkX and Tree-sitter.

**3.7k+**GitHub Stars

**MIT**License

**71.5×**Token Reduction

**Python 3.10+**Runtime

## Core Capabilities

Graphify unifies static analysis, semantic extraction and graph clustering into a single skill that any AI coding assistant can invoke.

### Multi-Modal Extraction

Parses code (.py, .js, .go, .java, …), Markdown, PDFs and images. Tree-sitter extracts ASTs, call graphs and docstrings; LLMs extract concepts from prose; vision models read diagrams.

### Knowledge Graph Build

Merges all extracted nodes and edges into a NetworkX graph and applies the Leiden algorithm for semantic community detection — no vector embeddings required.

### God Nodes & Surprises

Identifies the highest-degree "god nodes" at the heart of the system and flags unexpected cross-file or cross-domain connections worth investigating.

### Interactive Outputs

Exports an interactive `graph.html`, a queryable `graph.json`, and a human-readable `GRAPH_REPORT.md` audit report.

### Assistant Integration

Ships with `/graphify`, `/graphify query`, `/graphify path` and `/graphify explain` commands for Claude Code, Codex, OpenCode and more.

### Secure by Design

Strict input validation: only http/https URLs, size and timeout limits, path containment, HTML-escaped node labels — defending against SSRF, injection and XSS.

## Architecture & Pipeline

Graphify is a multi-stage pipeline. Each stage is an isolated module so contributors can extend any step independently.

**detect** — collect files
**extract** — AST + LLM nodes/edges
**build** — NetworkX graph
**cluster** — Leiden communities
**analyze** — god nodes & surprises
**report** — GRAPH\_REPORT.md
**export** — HTML / JSON / Obsidian

Supporting modules include `ingest.py` for URL fetching, `cache.py` for semantic caching, `security.py` for input validation, `watch.py` for live updates and `serve.py` for MCP-protocol service.

## Install & Run

Graphify is distributed on PyPI. The package name is `graphifyy`; the CLI command remains `graphify`.

```
# Requires Python 3.10+
pip install graphifyy && graphify install

# Build a knowledge graph for any project folder
/graphify ./raw

# Outputs land in graphify-out/
graphify-out/
├── graph.html        # interactive visualization
├── GRAPH_REPORT.md   # core nodes, surprises, suggested questions
├── graph.json        # persistent, queryable graph
└── cache/            # incremental cache
```

Graphify does not bundle an LLM. It uses the model API key already configured by your AI coding assistant (Claude, Codex, etc.) and only sends semantic content — never raw source code — to the upstream model.

## Worked Examples

The repository ships with reproducible corpora demonstrating Graphify on both small libraries and large mixed code-and-paper collections.

### httpx (small)

6 Python files modeling an HTTP transport layer. Result: **144 nodes, 330 edges, 6 communities**. God nodes: `Client`, `AsyncClient`, `Response`, `Request`. Surprise edge: `DigestAuth → Response`.

### Karpathy mixed corpus

3 GPT framework repos + 5 attention papers + 4 diagrams (~52 files, ~92k words). Result: **285 nodes, 340 edges, 53 communities**. Average query cost ~1.7k tokens vs ~123k naive — a **71.5×** reduction.

## Comparison

How Graphify relates to adjacent open-source projects in the code-intelligence space.

| Project | Focus | Strength | Limitation vs Graphify |
| --- | --- | --- | --- |
| Sourcegraph | Cross-repo code search | Enterprise-grade navigation | Not a knowledge graph; limited design semantics |
| Code2Vec | Function-level embeddings | Vector retrieval & classification | No graph structure, no multi-modal input |
| Neo4j | General graph database | Powerful Cypher queries | Does not generate graphs from code itself |

## Security, Licensing & Trust

Graphify is released under the **MIT License**. Its core dependencies — NetworkX (BSD) and Tree-sitter (MIT) — are all permissive open-source licenses with no conflicts. The project performs no telemetry. The only outbound network call is the semantic-extraction step, which uses your own configured AI model API key; only semantic descriptions of documents are transmitted, never raw source code. URLs are restricted to http/https, downloads are size- and time-bounded, output paths are containment-checked, and node labels are HTML-escaped to prevent SSRF, Cypher injection and XSS.

## Learn more about Graphify

Deeper guides on how Graphify builds, clusters and serves knowledge graphs to AI coding assistants.

[### Knowledge Graphs for AI Coding Assistants

Why structural graphs beat vector RAG for code understanding.](knowledge-graph-for-ai-coding-assistants.html)
[### Tree-sitter AST Extraction

How Graphify parses 19 languages locally, with no LLM calls on source.](tree-sitter-ast-extraction.html)
[### Leiden Community Detection

Clustering on graph topology alone — no embeddings, no vector store.](leiden-community-detection.html)
[### Claude Code Integration

CLAUDE.md directives and the PreToolUse hook, step by step.](graphify-claude-code-integration.html)
[### CLI Command Reference

Every `/graphify` and `graphify` command in one place.](graphify-cli-commands.html)
[### Graphify vs Alternatives

Honest comparison against Sourcegraph, Code2Vec and Neo4j.](graphify-vs-alternatives.html)

## Frequently Asked Questions

Does Graphify send my code to a third-party model?

No. Graphify only sends semantic descriptions of documents and diagrams to the AI model you have already configured in your assistant — never raw source files.

Which AI coding assistants are supported?

Claude Code, OpenAI Codex and OpenCode are supported out of the box via dedicated `skill-*.md` manifests. Any assistant that can call shell commands can invoke `graphify`.

How large a codebase can Graphify handle?

Tree-sitter parsing and NetworkX construction scale linearly with code size. On a ~500k-word corpus, BFS subgraph queries stay around ~2k tokens versus ~670k naive — preserving compression at scale.

Is Graphify free for commercial use?

Yes. Graphify is MIT-licensed and free for both personal and commercial use.



© 2026 Graphify · Maintained by Safi Shamsi · Released under the [MIT License](https://opensource.org/licenses/MIT)

[GitHub](https://github.com/safishamsi/graphify) ·
[PyPI](https://pypi.org/project/graphifyy/) ·
[Security](https://github.com/safishamsi/graphify/blob/v3/SECURITY.md)

×

Deploy Your OpenClaw Online

[Click to Deploy Now](https://cloud.clawbot.ai/?utm_source=graphify)
