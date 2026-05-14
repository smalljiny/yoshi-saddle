# Tree-sitter AST Extraction Across 19 Languages — Graphify

Source: https://graphify.net/tree-sitter-ast-extraction.html

---

Tree-sitter AST Extraction Across 19 Languages — Graphify




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

[Home](index.html) › Tree-sitter AST Extraction

# Tree-sitter AST Extraction Across 19 Languages

The first pass of the [Graphify](index.html) pipeline is a deterministic Tree-sitter walk over every code file it finds. No LLM, no embeddings, no network — just AST nodes converted directly into graph nodes and edges.

## Why Tree-sitter

Tree-sitter is an incremental parser generator with battle-tested grammars for every mainstream language. Graphify uses it because:

* **It never calls the network.** Source code never leaves the machine during the AST pass. The only outbound calls happen later, for docs/papers/images, and they send semantic descriptions — not raw source. See [privacy & security](index.html#security).
* **It's fast.** Parsing is O(file size). On a modest repo the entire AST pass finishes in seconds.
* **It's uniform.** Every language exposes the same node/edge shape to the downstream graph builder, which means the Leiden clustering step doesn't need per-language special cases. See [Leiden community detection](leiden-community-detection.html).

## Languages supported

Graphify ships grammars for 19 languages out of the box:

| Family | Languages |
| --- | --- |
| Scripting | Python, JavaScript, TypeScript, Ruby, PHP, Lua, PowerShell |
| Systems | Go, Rust, C, C++, Zig, Swift, Objective-C |
| JVM / .NET | Java, Kotlin, Scala, C# |
| BEAM | Elixir |

Adding a language is a matter of dropping its Tree-sitter grammar into the extractor and writing a small node-to-concept mapper — see `ARCHITECTURE.md` in the repo for the exact steps.

## What Graphify pulls out of the AST

* **Structural nodes** — classes, functions, methods, modules, traits/interfaces, top-level variables.
* **Call-graph edges** — every resolved call site becomes a `calls` edge tagged `EXTRACTED` with confidence `1.0`.
* **Import edges** — module-level `imports` so communities don't fragment across files that clearly belong together.
* **Rationale nodes** — docstrings and rationale comments (`# NOTE:`, `# IMPORTANT:`, `# HACK:`, `# WHY:`) are lifted out as separate nodes attached via `rationale_for` edges. This is how Graphify captures *why* the code was written the way it was, not just what it does.

## Deterministic vs semantic

Everything the AST pass emits is marked `EXTRACTED` (confidence 1.0). It's not a guess — the token is in the file. The second pass, run by Claude subagents against docs/papers/images, emits `INFERRED` edges with confidence scores, and anything the model is unsure about is tagged `AMBIGUOUS`. Those tags survive all the way into `graph.json` so a reviewer can always separate ground truth from model judgment.

## Related topics

* [Knowledge graphs for AI coding assistants](knowledge-graph-for-ai-coding-assistants.html)
* [Leiden community detection without embeddings](leiden-community-detection.html)
* [Graphify + Claude Code integration](graphify-claude-code-integration.html)
* [Graphify CLI command reference](graphify-cli-commands.html)

#### On this page

* [Why Tree-sitter](#h-0)
* [Languages supported](#h-1)
* [What Graphify pulls out of the AST](#h-2)
* [Deterministic vs semantic](#h-3)
* [Related topics](#h-4)


© 2026 [Graphify](index.html) · MIT Licensed · [GitHub](https://github.com/safishamsi/graphify)
