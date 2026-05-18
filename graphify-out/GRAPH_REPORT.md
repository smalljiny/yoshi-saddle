# Graph Report - /Users/mario/Workspace/harness  (2026-05-18)

## Corpus Check
- 177 files · ~124,181 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 564 nodes · 644 edges · 61 communities (45 shown, 16 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.82)
- Token cost: 838,952 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Codex Auto-Detection|Codex Auto-Detection]]
- [[_COMMUNITY_Agents and Planner Tracking|Agents and Planner Tracking]]
- [[_COMMUNITY_Eval Harness and 5-Tier Skills|Eval Harness and 5-Tier Skills]]
- [[_COMMUNITY_Deploy Manifest Tests|Deploy Manifest Tests]]
- [[_COMMUNITY_dev-context.js CLI|dev-context.js CLI]]
- [[_COMMUNITY_Adapter Skill Specs|Adapter Skill Specs]]
- [[_COMMUNITY_Spec Document Contract|Spec Document Contract]]
- [[_COMMUNITY_Coding Style Rules|Coding Style Rules]]
- [[_COMMUNITY_Deep Research Adapters|Deep Research Adapters]]
- [[_COMMUNITY_Development Workflow|Development Workflow]]
- [[_COMMUNITY_Skill System Boundaries|Skill System Boundaries]]
- [[_COMMUNITY_dev-context Config|dev-context Config]]
- [[_COMMUNITY_LangChain Reference|LangChain Reference]]
- [[_COMMUNITY_Flow Docs Pipeline|Flow Docs Pipeline]]
- [[_COMMUNITY_dev-context Tests|dev-context Tests]]
- [[_COMMUNITY_5-Tier Tier Rules|5-Tier Tier Rules]]
- [[_COMMUNITY_Harness Audit|Harness Audit]]
- [[_COMMUNITY_Codex Review Gate|Codex Review Gate]]
- [[_COMMUNITY_Agent Debug and Learning|Agent Debug and Learning]]
- [[_COMMUNITY_Exa Search API|Exa Search API]]
- [[_COMMUNITY_Codex Review Execution|Codex Review Execution]]
- [[_COMMUNITY_Deploy Manifest Lib|Deploy Manifest Lib]]
- [[_COMMUNITY_Flow-Impl Orchestration|Flow-Impl Orchestration]]
- [[_COMMUNITY_Flow-Review Gate|Flow-Review Gate]]
- [[_COMMUNITY_Codex Detect and Cache|Codex Detect and Cache]]
- [[_COMMUNITY_Prompt Authoring Rules|Prompt Authoring Rules]]
- [[_COMMUNITY_Python TDD Stack|Python TDD Stack]]
- [[_COMMUNITY_Compact Hook|Compact Hook]]
- [[_COMMUNITY_Project Entry Files|Project Entry Files]]
- [[_COMMUNITY_Prettier Hook|Prettier Hook]]
- [[_COMMUNITY_Harness Audit Command|Harness Audit Command]]
- [[_COMMUNITY_Agent Coordination Rules|Agent Coordination Rules]]
- [[_COMMUNITY_TypeCheck Hook|TypeCheck Hook]]
- [[_COMMUNITY_Session Logger Hook|Session Logger Hook]]
- [[_COMMUNITY_Session Start Hook|Session Start Hook]]
- [[_COMMUNITY_Console Log Audit|Console Log Audit]]
- [[_COMMUNITY_Path Validation Util|Path Validation Util]]
- [[_COMMUNITY_Performance Rules|Performance Rules]]
- [[_COMMUNITY_Dependency Analysis|Dependency Analysis]]
- [[_COMMUNITY_Fastify Stack|Fastify Stack]]
- [[_COMMUNITY_LangChain Integrations|LangChain Integrations]]
- [[_COMMUNITY_Prompt Skill Reference|Prompt Skill Reference]]
- [[_COMMUNITY_Git Push Review Hook|Git Push Review Hook]]
- [[_COMMUNITY_Memory Persist Hook|Memory Persist Hook]]
- [[_COMMUNITY_Harness Learn Command|Harness Learn Command]]
- [[_COMMUNITY_Shell Safety Lessons|Shell Safety Lessons]]
- [[_COMMUNITY_Other Stack Skills|Other Stack Skills]]
- [[_COMMUNITY_Coding Standards Workflow|Coding Standards Workflow]]
- [[_COMMUNITY_Database Reviewer|Database Reviewer]]
- [[_COMMUNITY_Add-Language-Rules Command|Add-Language-Rules Command]]
- [[_COMMUNITY_E2E and Frontend Stack|E2E and Frontend Stack]]
- [[_COMMUNITY_LangChain Memory|LangChain Memory]]
- [[_COMMUNITY_LangChain v1 Migration|LangChain v1 Migration]]
- [[_COMMUNITY_LangChain Workflow Patterns|LangChain Workflow Patterns]]
- [[_COMMUNITY_LangChain Human-in-Loop|LangChain Human-in-Loop]]
- [[_COMMUNITY_LangChain Tools API|LangChain Tools API]]
- [[_COMMUNITY_Architect Agent|Architect Agent]]
- [[_COMMUNITY_Build Error Resolver|Build Error Resolver]]
- [[_COMMUNITY_Gitignore Lesson|Gitignore Lesson]]
- [[_COMMUNITY_Stack-Knip Skill|Stack-Knip Skill]]
- [[_COMMUNITY_LangChain Middleware|LangChain Middleware]]

## God Nodes (most connected - your core abstractions)
1. `docs/specs 인덱스` - 19 edges
2. `/flow-impl skill` - 15 edges
3. `/flow-impl Workflow` - 14 edges
4. `LangChain References Index` - 14 edges
5. `dev-context Global Config Spec` - 13 edges
6. `flow-review SKILL` - 13 edges
7. `flow-spec SKILL` - 13 edges
8. `/flow-docs skill` - 12 edges
9. `/flow-pr skill` - 11 edges
10. `/flow-plan skill` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Prototype Pollution Defense CLI` --rationale_for--> `dev-context.js CLI`  [INFERRED]
  src/.claude/skills/learned/prototype-pollution-defense-cli/SKILL.md → src/.harness/scripts/dev-context.js
- `Test Guard Precedence Design` --rationale_for--> `dev-context.js CLI`  [INFERRED]
  src/.claude/skills/learned/test-guard-precedence/SKILL.md → src/.harness/scripts/dev-context.js
- `/flow-impl Workflow` --calls--> `refactor-cleaner Agent`  [EXTRACTED]
  docs/specs/workflows/impl.md → src/.claude/agents/refactor-cleaner.md
- `doc-updater Agent` --references--> `/flow-docs Workflow`  [EXTRACTED]
  src/.claude/agents/doc-updater.md → docs/specs/workflows/docs.md
- `/flow-review Workflow` --calls--> `security-reviewer Agent`  [EXTRACTED]
  docs/specs/workflows/review.md → src/.claude/agents/security-reviewer.md

## Hyperedges (group relationships)
- **Topic Lifecycle state machine consumers (dev-context CLI + commands + Codex skills)** — specs_topic_lifecycle_state_machine, specs_topic_lifecycle_dev_context_cli, specs_topic_lifecycle_command_gates, specs_codex_codex_review_auto_detect [EXTRACTED 0.95]
- **graphify Stage 1 → Stage 2 pipeline (integration + index + targets config)** — specs_graphify_integration_doc, specs_harness_knowledge_index_doc, specs_harness_knowledge_index_targets, specs_dev_context_config_doc [EXTRACTED 0.95]
- **search-adapter pattern (registry contract + adapters + deep-research consumer)** — specs_meta_skill_registry_adapter_contract, specs_search_adapters_firecrawl_skill, specs_wf_deep_research_skill [EXTRACTED 0.95]
- **Development Workflow Pipeline** —  [EXTRACTED 1.00]
- **/flow-impl Per-Story Auto-Invocation** —  [EXTRACTED 1.00]
- **Exa Standard Schema Operations** —  [EXTRACTED 1.00]
- **/flow-impl orchestrates tdd-specialist + code-reviewer + simplify per Story** —  [EXTRACTED 1.00]
- **adapter-deep-research orchestrates skill-registry → exa + firecrawl adapters** —  [EXTRACTED 1.00]
- **Workflow gate chain: spec:confirmed → plan → docs:generated → pr:created → done** —  [EXTRACTED 1.00]
- **Flow Review Pipeline: gate → parallel reviewers → adversarial → report** —  [EXTRACTED 1.00]
- **Spec Codex Review Loop: brainstorming → save → adapter-codex-review (≤3 attempts) → confirm** —  [EXTRACTED 1.00]
- **Topic Lifecycle State Machine driven by dev-context.js across flow-* skills** —  [EXTRACTED 1.00]
- **LangChain getting-started cluster** — stack_langchain_skill, stack_langchain_index, stack_langchain_quickstart, stack_langchain_install [INFERRED 0.85]
- **DeepAgents subcluster** — stack_langchain_deepagents_overview, stack_langchain_deepagents_customization, stack_langchain_deepagents_quickstart [INFERRED 0.85]
- **LangChain agents subcluster** — stack_langchain_react_agent, stack_langchain_graph_basics, stack_langchain_graph_advanced, stack_langchain_supervisor [INFERRED 0.85]
- **** — integrations_openai, integrations_bedrock, integrations_google, integrations_azure [INFERRED 0.95]
- **** — memory_long_term, memory_short_term [INFERRED 0.95]
- **** — patterns_workflows_agents, patterns_subgraphs, patterns_human_in_the_loop [INFERRED 0.95]
- **Codex Review Pipeline** —  [INFERRED]
- **TDD + Verification Pipeline** —  [INFERRED]
- **Implementation Plan Producers/Consumers** —  [INFERRED]
- **Shared .harness/rules/ index (coding-style, git-workflow, testing, security)** —  [EXTRACTED 1.00]
- **TypeScript-specific rule extensions** —  [INFERRED 0.95]
- **PR publish pipeline artifacts (flow-pr inputs)** —  [EXTRACTED 1.00]

## Communities (61 total, 16 thin omitted)

### Community 0 - "Codex Auto-Detection"
Cohesion: 0.05
Nodes (57): Auto-Detect Entry Point (phase:status routing), Codex Availability Gate, adapter-codex-review Skill Spec, Codex Session Detection Spec, detect-and-cache.js, session-start.js hook, 1-hour TTL codex cache, config.codex.* cache namespace (+49 more)

### Community 1 - "Agents and Planner Tracking"
Cohesion: 0.07
Nodes (35): code-reviewer Agent, planner Agent, Planner Progress Tracking (P1-P5), Task Tool Silent-Fail Fallback, prompt-engineer Agent, refactor-cleaner Agent, prompt-authoring.md Rule, security-reviewer Agent (+27 more)

### Community 2 - "Eval Harness and 5-Tier Skills"
Cohesion: 0.07
Nodes (28): 3-Trial Execution Loop, baseline.json, pass@3 / pass^3 Metrics, eval-harness, 5-Tier Skill System (flow/wf/adapter/stack/meta), Implementation Plan Contract, Plan Review Contract, Prompt Task Eval Schema (direct/rubric/judge) (+20 more)

### Community 3 - "Deploy Manifest Tests"
Cohesion: 0.09
Nodes (21): broken, __dirname, expected, filesList, ghost, lines, malicious, manifest (+13 more)

### Community 4 - "dev-context.js CLI"
Cohesion: 0.11
Nodes (14): args, coerceConfigValue(), ctx, die(), __dirname, FORBIDDEN_CONFIG_SEGMENTS, fromIdx, KNOWN_STATES (+6 more)

### Community 5 - "Adapter Skill Specs"
Cohesion: 0.12
Nodes (19): adapter-codex-review skill, validate-path.js (path sanitization), config.spec.auto_review / config.plan.auto_review, [CAPABILITY] + [REGRESSION] tagged cases, eval-harness Spec, code-based Bash grader (exit 0 = PASS), pass@3 / pass^3 metrics, eval-harness Codex skill (+11 more)

### Community 6 - "Spec Document Contract"
Cohesion: 0.11
Nodes (19): Spec Document Format Contract, Spec Optional Sections (Architecture vs Role), Spec Required Sections, Spec Split Criteria (PR Merge Unit), Branch Strategy (main/develop/feature), Conventional Commit Format, PR Pre-flow-pr Checklist, git config Remote (pushRemote/pullRemote/baseBranch) (+11 more)

### Community 7 - "Coding Style Rules"
Cohesion: 0.12
Nodes (19): Coding Style Rule, Code Quality Checklist, File Structure Limits (200-400 lines), Immutability Principle, Zod Input Validation, Testing Rule, Minimum 80% Coverage, Layered Guard Testing Principle (+11 more)

### Community 8 - "Deep Research Adapters"
Cohesion: 0.12
Nodes (18): Partial failure policy (adapter skip/continue), Cited research report template, adapter-deep-research skill, skill-registry search-adapter discovery, Exa /answer operation, $EXA_API_KEY environment variable, Exa /contents operation, Exa /findSimilar operation (+10 more)

### Community 9 - "Development Workflow"
Cohesion: 0.15
Nodes (17): Overall flow: spec→plan→impl→review→verify→docs→pr→done, development-workflow.md rule, zsh shell portability (no declare -A/mapfile), State transition summary table, doc-updater agent (large rewrites), Gate: review:in-progress (or docs:generated re-entry), refDoc field in dev-context.json, /flow-docs skill (+9 more)

### Community 10 - "Skill System Boundaries"
Cohesion: 0.12
Nodes (17): component-boundaries rule, 5-tier Skill System, Search-adapter Pattern Contract, Capabilities-based Skill Discovery, Skill Progressive Disclosure (3 levels), Skill Checklist Duplication Anti-pattern, meta-skill-creator SKILL, prompt-authoring rule (+9 more)

### Community 11 - "dev-context Config"
Cohesion: 0.13
Nodes (16): config.review.adversarial_enabled, config.dev_impl.auto_commit, config.dev_impl.auto_start, config.dev_impl.batch_mode, dev-context Global Config Spec, config.docs.sourceFilter, config.git.* remote settings, config.* namespaces (dev_impl, spec, plan, review, codex, docs, graphify, git) (+8 more)

### Community 12 - "LangChain Reference"
Cohesion: 0.18
Nodes (15): LangChain Anthropic Integration, LangChain Context Engineering, DeepAgents Customization, DeepAgents Overview, DeepAgents Quickstart, LangChain Durable Execution, LangChain Graph Advanced, LangChain Graph Basics (+7 more)

### Community 13 - "Flow Docs Pipeline"
Cohesion: 0.18
Nodes (14): doc-updater Agent, docs/specs/<name>.md Reference Document, config.docs.sourceFilter, docs:generated State, /flow-docs Workflow, docs/_local/done/<topic>/ Archive, remove-topic Command, /flow-done Workflow (+6 more)

### Community 14 - "dev-context Tests"
Cohesion: 0.17
Nodes (9): ctx, __dirname, execFileAsync, nestedPath, out, prefixes, runExpectFail(), SCRIPT (+1 more)

### Community 15 - "5-Tier Tier Rules"
Cohesion: 0.15
Nodes (13): 5-tier skill system (flow/wf/adapter/stack/meta), Load-and-follow delegation pattern, Flow gate pattern (exhaustive state table), component-boundaries.md rule, user-invocable: true frontmatter flag, .claude/checkpoints.log (git-ignored), /flow-checkpoint skill, config.docs.sourceFilter (+5 more)

### Community 16 - "Harness Audit"
Cohesion: 0.3
Nodes (11): CATEGORIES, countFiles(), exists(), getChecks(), main(), normalizeScope(), parseArgs(), printText() (+3 more)

### Community 17 - "Codex Review Gate"
Cohesion: 0.23
Nodes (12): Codex Auto-Review Loop (max 3 attempts), Trust Boundary for External LLM Content, dev-context.js CLI, Pre-plan dependency-analysis load (best-effort), Gate: spec:confirmed, /flow-plan skill, flow-spec SKILL, flow-topic SKILL (+4 more)

### Community 18 - "Agent Debug and Learning"
Cohesion: 0.17
Nodes (12): Failure Capture Template, Four-Phase Debug Loop, Introspection Report, wf-agent-debug, wf-continuous-learning, skills/learned/ Directory, Three Filters (Reusable/Non-obvious/Generalizable), Build Gate (+4 more)

### Community 19 - "Exa Search API"
Cohesion: 0.24
Nodes (11): Exa Answer Response Schema, $EXA_API_KEY, Exa Error Handling Policy, Exa /answer Operation, Exa /contents Operation, Exa /findSimilar Operation, Exa /search Operation, Exa Search Type Parameter (+3 more)

### Community 20 - "Codex Review Execution"
Cohesion: 0.2
Nodes (11): Auto-detect entry from phase:status, Codex availability gate, codex exec invocation pattern, Decision parsing via before/after file diff, adapter-codex-review skill, validate-path.js script, /codex:setup command, codex-companion.mjs glob lookup (+3 more)

### Community 21 - "Deploy Manifest Lib"
Cohesion: 0.33
Nodes (8): cmdListSrc(), cmdReadFiles(), cmdStripGitignoreBlock(), cmdWrite(), die(), { opts, positional }, SUBCOMMANDS, warn()

### Community 22 - "Flow-Impl Orchestration"
Cohesion: 0.2
Nodes (10): advisor() conditional call (infra or ≥5 tasks), Batch mode (--all / currentBatchRunning), code-reviewer agent invocation (per Story), **Commit** field extraction per Story, Completion criteria PASS/FAIL check, prompt-engineer agent invocation (Type: prompt), simplify skill followup (tdd only), /flow-impl skill (+2 more)

### Community 23 - "Flow-Review Gate"
Cohesion: 0.22
Nodes (10): adversarial-review companion, code-reviewer agent, phase:status Gate Check Pattern, Exhaustive State Table Pattern, flow-review SKILL, git-workflow rule, AskUserQuestion Final Review Skill, State Table Before Branch Pattern (+2 more)

### Community 24 - "Codex Detect and Cache"
Cohesion: 0.36
Nodes (8): args, detectAndCacheCodex(), devContextScript, findCompanionPath(), force, isCacheValid(), setCodexUnavailable(), writeCodexCache()

### Community 25 - "Prompt Authoring Rules"
Cohesion: 0.22
Nodes (9): prompt-authoring.md rule, Rule 3: remove anti-laziness scaffolding, Rule 5: remove explicit CoT, Rule 4: quantify or remove filters, Rule 6: front-load first-turn info, Rule 1: hedge removal, Opus 4.7 literal-interpretation behaviors, Rule 2: explicit scope (+1 more)

### Community 26 - "Python TDD Stack"
Cohesion: 0.25
Nodes (8): 80% Coverage Threshold, Mocking and Patching, pytest Fixtures, stack-python-test, TDD Cycle (RED-GREEN-REFACTOR), Edge Case Checklist, Iron Law of TDD, wf-tdd

### Community 27 - "Compact Hook"
Cohesion: 0.53
Nodes (5): getCounterFile(), getSessionId(), main(), readCount(), THRESHOLD

### Community 28 - "Project Entry Files"
Cohesion: 0.4
Nodes (6): harness-optimizer Agent, src/AGENTS.md (Codex Entry), src/CLAUDE.md (Claude Entry), 5-tier Skill System, src/.harness/harness-guide.md, user-invocable Frontmatter Flag

### Community 29 - "Prettier Hook"
Cohesion: 0.6
Nodes (4): hasPrettierConfig(), isSupportedFile(), main(), SUPPORTED_EXTENSIONS

### Community 30 - "Harness Audit Command"
Cohesion: 0.4
Nodes (5): 7 audit categories (0-10 each, 70 total), /harness:audit command, harness-optimizer agent invocation, harness-audit.js script, harness-optimizer agent

### Community 31 - "Agent Coordination Rules"
Cohesion: 0.4
Nodes (5): Immediate agent activation triggers, Parallel agent execution, Read-before-Edit rule, agents.md rule, Stated invocation form discipline

### Community 32 - "TypeCheck Hook"
Cohesion: 0.83
Nodes (3): hasTsConfig(), isTypeScriptFile(), main()

### Community 33 - "Session Logger Hook"
Cohesion: 0.83
Nodes (3): getCurrentTopic(), getToday(), main()

### Community 35 - "Console Log Audit"
Cohesion: 0.83
Nodes (3): checkConsoleLog(), getModifiedFiles(), main()

### Community 36 - "Path Validation Util"
Cohesion: 0.67
Nodes (3): __dirname, main(), parseArgs()

### Community 37 - "Performance Rules"
Cohesion: 0.5
Nodes (4): Context window management (~80% threshold), Extended Thinking (≤31,999 tokens), Model selection by task complexity, performance.md rule

### Community 38 - "Dependency Analysis"
Cohesion: 0.5
Nodes (4): package.json existence gate, adapter-dependency-analysis skill, stack-dependency-cruiser (architecture check), stack-knip (unused code detection)

### Community 39 - "Fastify Stack"
Cohesion: 0.5
Nodes (4): stack-docker SKILL, Fastify Common Patterns, Fastify Quick Reference, stack-fastify SKILL

### Community 40 - "LangChain Integrations"
Cohesion: 0.5
Nodes (4): LangChain Azure Integration, LangChain Bedrock Integration, LangChain Google Integration, LangChain OpenAI Integration

### Community 41 - "Prompt Skill Reference"
Cohesion: 0.5
Nodes (4): stack-prompt Authoring Patterns, stack-prompt Diagnostic Patterns, stack-prompt SKILL, stack-prompt Sources

### Community 44 - "Harness Learn Command"
Cohesion: 0.67
Nodes (3): /harness:learn command, Curation opt-in policy, wf-continuous-learning skill

### Community 45 - "Shell Safety Lessons"
Cohesion: 0.67
Nodes (3): Bash set-u Empty Array Pattern, Prototype Pollution Defense CLI, Shell HEREDOC Injection Defense

### Community 46 - "Other Stack Skills"
Cohesion: 0.67
Nodes (3): stack-nextjs SKILL, stack-postgres SKILL, stack-python SKILL

### Community 47 - "Coding Standards Workflow"
Cohesion: 0.67
Nodes (3): Immutability with Spread Operator, KISS / DRY / YAGNI, wf-coding-standards

## Knowledge Gaps
- **279 isolated node(s):** `CATEGORIES`, `devContextScript`, `args`, `force`, `contextPath` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `flow-spec SKILL` connect `Codex Review Gate` to `Deep Research Adapters`, `Skill System Boundaries`, `Codex Review Execution`, `Flow-Review Gate`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `wf-verification SKILL` connect `Agent Debug and Learning` to `Development Workflow`, `Eval Harness and 5-Tier Skills`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `flow-verify SKILL` connect `Development Workflow` to `Agent Debug and Learning`, `Flow-Review Gate`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `LangChain References Index` (e.g. with `stack-langchain SKILL` and `LangChain Durable Execution`) actually correct?**
  _`LangChain References Index` has 14 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CATEGORIES`, `devContextScript`, `args` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Codex Auto-Detection` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Agents and Planner Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._