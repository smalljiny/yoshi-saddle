# Leiden Community Detection Without Embeddings — Graphify

Source: https://graphify.net/leiden-community-detection.html

---

Leiden Community Detection Without Embeddings — Graphify




[Graphify](index.html)

* [Features](index.html#features)
* [Architecture](index.html#architecture)
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

[Home](index.html) › Leiden Community Detection

# Leiden Community Detection Without Embeddings

[Graphify](index.html) groups related code, docs and diagrams into *communities* using the Leiden algorithm over graph topology alone. No vector embeddings, no vector database, no separate similarity index.

## Why not embeddings?

Most code-RAG systems chunk a repo, embed each chunk, and cluster the resulting vectors. That pipeline has three failure modes Graphify is designed to avoid:

* **Lost structure.** Embedding similarity ignores call graphs and imports — the exact edges that tell you two files belong together.
* **Opaque clusters.** When two chunks land in the same bucket you can't point at *why*. The similarity is a dot-product, not a reason.
* **Extra infrastructure.** A vector store is another service, another auth boundary, another cost center.

Graphify sidesteps all three by running Leiden directly on the graph the [Tree-sitter AST pass](tree-sitter-ast-extraction.html) and the semantic pass produce. Edge density *is* the clustering signal.

## How semantic similarity still participates

The semantic pass emits `semantically_similar_to` edges between nodes that look conceptually related but have no structural connection — a function in code and a concept in a paper describing the same algorithm, for example. These edges are marked `INFERRED` with a confidence score, and they live in the same graph as the structural edges. Leiden sees them, edge density goes up where it should, and communities form around conceptual affinity as well as call structure. No vector index required.

## What a community looks like in the output

After clustering, each community becomes a section in `GRAPH_REPORT.md` and, optionally, a standalone article when you pass `--wiki`. The report lists:

* the community's top-ranked **god nodes** — highest-degree concepts inside it;
* the **surprising connections** — edges into or out of the community that score high on a composite ranker (code-to-paper beats code-to-code);
* a small set of **suggested questions** this community is uniquely positioned to answer.

For a worked example, the *httpx* corpus yields 6 communities with god nodes `Client`, `AsyncClient`, `Response` and `Request`, and surfaces the surprise edge `DigestAuth → Response`.

## Tech choice

Leiden is implemented via `graspologic`. The rest of the graph layer is NetworkX. The entire clustering stage is pure-Python and runs locally, consistent with Graphify's no-server, no-telemetry posture.

## Related topics

* [Knowledge graphs for AI coding assistants](knowledge-graph-for-ai-coding-assistants.html)
* [Tree-sitter AST extraction across 19 languages](tree-sitter-ast-extraction.html)
* [Graphify vs Sourcegraph, Code2Vec and Neo4j](graphify-vs-alternatives.html)
* [Graphify CLI command reference](graphify-cli-commands.html)

#### On this page

* [Why not embeddings?](#h-0)
* [How semantic similarity still participates](#h-1)
* [What a community looks like in the output](#h-2)
* [Tech choice](#h-3)
* [Related topics](#h-4)


© 2026 [Graphify](index.html) · MIT Licensed · [GitHub](https://github.com/safishamsi/graphify)
