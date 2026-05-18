# Graph Report - .  (2026-05-18)

## Corpus Check
- 183 files · ~126,483 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 650 nodes · 881 edges · 40 communities (30 shown, 10 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.83)
- Token cost: 475,662 input · 83,942 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Hook Scripts & Audit|Hook Scripts & Audit]]
- [[_COMMUNITY_State Management CLI|State Management CLI]]
- [[_COMMUNITY_Search Adapter Stack|Search Adapter Stack]]
- [[_COMMUNITY_Dependency & Language Rules|Dependency & Language Rules]]
- [[_COMMUNITY_Codex Setup & Cache|Codex Setup & Cache]]
- [[_COMMUNITY_Implementation Agents|Implementation Agents]]
- [[_COMMUNITY_Doc & Spec Format|Doc & Spec Format]]
- [[_COMMUNITY_Topic Lifecycle System|Topic Lifecycle System]]
- [[_COMMUNITY_Prompt Authoring Rules|Prompt Authoring Rules]]
- [[_COMMUNITY_Eval & Plan Review|Eval & Plan Review]]
- [[_COMMUNITY_Testing & Frontend|Testing & Frontend]]
- [[_COMMUNITY_Codex Review Adapter|Codex Review Adapter]]
- [[_COMMUNITY_Deployment Patterns|Deployment Patterns]]
- [[_COMMUNITY_Coding & Testing Standards|Coding & Testing Standards]]
- [[_COMMUNITY_LangChain DeepAgents|LangChain DeepAgents]]
- [[_COMMUNITY_Spec Reconciliation Flow|Spec Reconciliation Flow]]
- [[_COMMUNITY_Harness Audit & Flow|Harness Audit & Flow]]
- [[_COMMUNITY_Code Review Agents|Code Review Agents]]
- [[_COMMUNITY_Database & Frontend Stack|Database & Frontend Stack]]
- [[_COMMUNITY_Story Commit & Advisor|Story Commit & Advisor]]
- [[_COMMUNITY_Learning & Debug Skills|Learning & Debug Skills]]
- [[_COMMUNITY_Flow Setup & CLI|Flow Setup & CLI]]
- [[_COMMUNITY_Checkpoint & Learned|Checkpoint & Learned]]
- [[_COMMUNITY_Dev Workflow Rules|Dev Workflow Rules]]
- [[_COMMUNITY_Learned Skill Patterns|Learned Skill Patterns]]
- [[_COMMUNITY_Agent Coordination Rules|Agent Coordination Rules]]
- [[_COMMUNITY_Performance & Models|Performance & Models]]
- [[_COMMUNITY_LangChain Providers|LangChain Providers]]
- [[_COMMUNITY_Component Boundaries|Component Boundaries]]
- [[_COMMUNITY_LangChain Memory|LangChain Memory]]
- [[_COMMUNITY_LangChain v1 Migration|LangChain v1 Migration]]
- [[_COMMUNITY_Streaming & HITL|Streaming & HITL]]
- [[_COMMUNITY_Subgraphs & Workflows|Subgraphs & Workflows]]
- [[_COMMUNITY_Tools & Structured Output|Tools & Structured Output]]
- [[_COMMUNITY_Architect Agent|Architect Agent]]
- [[_COMMUNITY_LangChain Middleware|LangChain Middleware]]
- [[_COMMUNITY_Claude Scripts Package|Claude Scripts Package]]
- [[_COMMUNITY_Harness Scripts Package|Harness Scripts Package]]
- [[_COMMUNITY_Strip Gitignore Helper|Strip Gitignore Helper]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 26 edges
2. `dev-context.js CLI` - 25 edges
3. `/flow-impl skill` - 23 edges
4. `docs/specs 인덱스` - 20 edges
5. `adapter-codex-review skill` - 17 edges
6. `flow-review SKILL` - 17 edges
7. `flow-spec SKILL` - 17 edges
8. `dev-context Global Config Spec` - 15 edges
9. `adapter-firecrawl skill` - 15 edges
10. `/flow-docs skill` - 15 edges

## Surprising Connections (you probably didn't know these)
- `getChecks()` --references--> `5-tier Skill System (flow/wf/adapter/stack/meta)`  [INFERRED]
  .claude/scripts/harness-audit.js → src/AGENTS.md
- `with-skill vs baseline eval loop concept` --semantically_similar_to--> `PROPOSE-EVAL-REFINE cycle`  [INFERRED] [semantically similar]
  docs/specs/meta/skill-creator.md → src/.claude/skills/stack-prompt/SKILL.md
- `pass@3 / pass^3 Metrics` --semantically_similar_to--> `pass_count metric`  [INFERRED] [semantically similar]
  src/.codex/skills/eval-harness/SKILL.md → docs/specs/prompt/eval-workflow.md
- `Prototype Pollution Defense CLI` --rationale_for--> `dev-context.js CLI`  [INFERRED]
  src/.claude/skills/learned/prototype-pollution-defense-cli/SKILL.md → src/.harness/scripts/dev-context.js
- `force-state admin command` --rationale_for--> `Topic Lifecycle State Machine`  [INFERRED]
  docs/specs/topic-lifecycle.md → src/AGENTS.md

## Hyperedges (group relationships)
- **Development Workflow Pipeline** —  [EXTRACTED 1.00]
- **Workflow gate chain: spec:confirmed → plan → docs:generated → pr:created → done** —  [EXTRACTED 1.00]
- **Codex Review Pipeline** —  [INFERRED]
- **Implementation Plan Producers/Consumers** —  [INFERRED]
- **PR publish pipeline artifacts (flow-pr inputs)** —  [EXTRACTED 1.00]
- **Topic Lifecycle state machine consumers (dev-context CLI + commands + Codex skills)** — specs_topic_lifecycle_state_machine, specs_topic_lifecycle_dev_context_cli, specs_topic_lifecycle_command_gates, specs_codex_codex_review_auto_detect [EXTRACTED 0.95]
- **graphify Stage 1 → Stage 2 pipeline (integration + index + targets config)** — specs_graphify_integration_doc, specs_harness_knowledge_index_doc, specs_harness_knowledge_index_targets, specs_dev_context_config_doc [EXTRACTED 0.95]
- **/flow-impl Per-Story Auto-Invocation** —  [EXTRACTED 1.00]
- **search-adapter pattern (registry contract + adapters + deep-research consumer)** — specs_meta_skill_registry_adapter_contract, specs_search_adapters_firecrawl_skill, specs_wf_deep_research_skill [EXTRACTED 0.95]
- **Exa Standard Schema Operations** —  [EXTRACTED 1.00]
- **Claude Code Hook Pipeline (settings.json + hooks.json + scripts)** — claude_settings_json, hooks_hooks_json, hooks_session_start_js, hooks_session_logger_js, hooks_suggest_compact_js [EXTRACTED 1.00]
- **dev-context.json shared state consumers** — scripts_dev_context_js, hooks_session_start_js, hooks_session_logger_js, hooks_memory_persist_js, scripts_status_line_sh, codex_detect_and_cache_js [INFERRED 0.85]
- **Deploy manifest lifecycle (list-src → write → read-files)** — scripts_deploy_manifest_cmdlistsrc, scripts_deploy_manifest_cmdwrite, scripts_deploy_manifest_cmdreadfiles, concept_deploy_manifest_format [EXTRACTED 1.00]
- **Per-Story implementation orchestration** — flow_impl_skill, flow_impl_tdd_specialist, flow_impl_code_reviewer, flow_impl_simplify, flow_impl_commit_field [EXTRACTED 0.95]
- **dev-context state machine across flow skills** — meta_dev_context_skill, flow_plan_skill, flow_impl_skill, flow_review_skill, flow_init_skill, flow_setup_skill [EXTRACTED 0.95]
- **stack-prompt evaluation strategies (PROPOSE-EVAL-REFINE)** — stack_prompt_propose_eval_refine, stack_prompt_direct_strategy, stack_prompt_rubric_strategy, stack_prompt_judge_strategy [EXTRACTED 0.90]
- **search-adapter contract participants** — skill_registry_adapter_pattern, adapter_exa_skill, adapter_firecrawl_skill, adapter_deep_research_skill [EXTRACTED 1.00]
- **Flow workflow stages (spec→docs→pr→done)** — flow_spec_skill, flow_docs_skill, flow_pr_skill, flow_done_skill, flow_verify_skill [EXTRACTED 1.00]
- **Codex auto-review loop (spec/plan)** — flow_spec_auto_review_loop, adapter_codex_review_skill, adapter_codex_review_validate_path, adapter_codex_review_decision_parsing [EXTRACTED 1.00]
- **Codex Review Loop Skills (Spec/Plan/Eval)** — spec_review_skill, plan_review_skill, eval_harness_skill [INFERRED 0.85]
- **JS/TS Code Analysis Skill Cluster** — stack_knip_skill, stack_dependency_cruiser_skill, stack_frontend_skill [INFERRED 0.75]
- **Claude<->Codex Shared Contract Flow** — harness_readme, harness_contracts, spec_review_skill, plan_review_skill [EXTRACTED 1.00]

## Communities (40 total, 10 thin omitted)

### Community 0 - "Hook Scripts & Audit"
Cohesion: 0.05
Nodes (54): hooks, PostToolUse, PreToolUse, SessionStart, Stop, permissions, allow, command (+46 more)

### Community 1 - "State Management CLI"
Cohesion: 0.05
Nodes (47): Deploy manifest format (manifest_version, files[]), dev-context.js CLI, cmdListSrc(), cmdReadFiles(), cmdStripGitignoreBlock(), cmdWrite(), { opts, positional }, SUBCOMMANDS (+39 more)

### Community 2 - "Search Adapter Stack"
Cohesion: 0.06
Nodes (42): Adapter Selection Policy, File-Save Policy (3000 chars threshold), Partial Failure Policy, Partial failure policy (adapter skip/continue), Cited research report template, skill-registry search-adapter discovery, Exa /answer operation, Exa Answer schema (+34 more)

### Community 3 - "Dependency & Language Rules"
Cohesion: 0.05
Nodes (40): package.json existence gate, adapter-dependency-analysis skill, stack-dependency-cruiser (architecture check), stack-knip (unused code detection), /add-language-rules Command, coding-style.md (per language), security.md (per language), .harness/rules/<language>/ Target (+32 more)

### Community 4 - "Codex Setup & Cache"
Cohesion: 0.07
Nodes (35): Codex availability gate, devContextScript, force, isCacheValid(), setCodexUnavailable(), detectAndCacheCodex, findCompanionPath, /codex:setup command (+27 more)

### Community 5 - "Implementation Agents"
Cohesion: 0.07
Nodes (35): planner Agent, Planner Progress Tracking (P1-P5), Task Tool Silent-Fail Fallback, refactor-cleaner Agent, wf-tdd Skill, tdd-specialist Agent, Best-effort visualization policy, Planner P1-P5 Progress Protocol (+27 more)

### Community 6 - "Doc & Spec Format"
Cohesion: 0.07
Nodes (34): doc-updater Agent, Spec Document Format Contract, Spec Optional Sections (Architecture vs Role), Spec Required Sections, Spec Split Criteria (PR Merge Unit), refDoc field in dev-context.json, config.docs.sourceFilter auto-detect, git-workflow rule (+26 more)

### Community 7 - "Topic Lifecycle System"
Cohesion: 0.08
Nodes (33): 5-tier Skill System (flow/wf/adapter/stack/meta), Topic Lifecycle State Machine, dev-context.json State Manager, Flow Workflow (/flow-spec → /flow-done), Auto-Detect Entry Point (phase:status routing), ${CLAUDE_PROJECT_DIR} env var prefix, Hook Command Paths Spec, Deploy Manifest Spec (+25 more)

### Community 8 - "Prompt Authoring Rules"
Cohesion: 0.07
Nodes (34): prompt-engineer Agent, Rule 3: remove anti-laziness scaffolding, Rule 5: remove explicit CoT, Rule 4: quantify or remove filters, Rule 6: front-load first-turn info, Rule 1: hedge removal, Opus 4.7 literal-interpretation behaviors, Rule 2: explicit scope (+26 more)

### Community 9 - "Eval & Plan Review"
Cohesion: 0.08
Nodes (29): 3-Trial Execution Loop, .claude/evals/<skill-name>.md Eval Case, pass@3 / pass^3 Metrics, eval-harness, implementation-plan.md, .harness/contracts/ — Producer/Consumer Interface, Plan Review Contract, Prompt Task Eval Schema (direct/rubric/judge) (+21 more)

### Community 10 - "Testing & Frontend"
Cohesion: 0.08
Nodes (27): tdd-specialist agent invocation, Flaky test quarantine, Page Object Model (POM), Playwright, stack-e2e-testing SKILL, Composition over Inheritance Pattern, React, stack-frontend SKILL (+19 more)

### Community 11 - "Codex Review Adapter"
Cohesion: 0.11
Nodes (21): Auto-detect entry from phase:status, Decision parsing via before/after file diff, DEV_CONTEXT_PATH isolation, codex exec invocation pattern, adapter-codex-review skill, validate-path.js path normalization, validate-path.js script, Codex Auto-Review Loop (max 3 attempts) (+13 more)

### Community 12 - "Deployment Patterns"
Cohesion: 0.1
Nodes (20): Blue-Green Deployment, Canary Deployment, Health check endpoint, Rolling Deployment, stack-deploy SKILL, Twelve-Factor App pattern, Docker Compose for Local Dev, Multi-stage Dockerfile (+12 more)

### Community 13 - "Coding & Testing Standards"
Cohesion: 0.12
Nodes (19): Coding Style Rule, Code Quality Checklist, File Structure Limits (200-400 lines), Immutability Principle, Zod Input Validation, Testing Rule, Minimum 80% Coverage, Layered Guard Testing Principle (+11 more)

### Community 14 - "LangChain DeepAgents"
Cohesion: 0.16
Nodes (17): LangChain Anthropic Integration, LangChain Context Engineering, DeepAgents Customization, DeepAgents Overview, DeepAgents Quickstart, LangChain Durable Execution, LangChain Graph Advanced, LangChain Graph Basics (+9 more)

### Community 15 - "Spec Reconciliation Flow"
Cohesion: 0.14
Nodes (16): phase:status Gate Check Pattern, Exhaustive State Table Pattern, doc-updater agent (large rewrites), Gate: review:in-progress (or docs:generated re-entry), Partial update vs Full rewrite heuristic, refDoc representative document, /flow-docs skill, Spec-implementation reconciliation (+8 more)

### Community 16 - "Harness Audit & Flow"
Cohesion: 0.15
Nodes (14): harness-optimizer Agent, Codex spec-review and plan-review skills, Flow Workflow (spec→plan→impl→review→verify→docs→pr→done), config.graphify.targets, Harness as Project Template (src/ → deploy), Eval baseline cache, 7 audit categories (0-10 each, 70 total), /harness:audit command (+6 more)

### Community 17 - "Code Review Agents"
Cohesion: 0.22
Nodes (13): build-error-resolver Agent, code-reviewer agent, review-report-<timestamp>.md, Issue severity classification (CRITICAL/HIGH/MEDIUM/LOW), flow-review SKILL, flow-verify SKILL, AskUserQuestion Final Review Skill, security-reviewer agent (+5 more)

### Community 18 - "Database & Frontend Stack"
Cohesion: 0.18
Nodes (12): database-reviewer Agent, Turbopack file-system caching, stack-nextjs SKILL, Turbopack bundler, Cursor Pagination, PostgreSQL Index Cheat Sheet, FOR UPDATE SKIP LOCKED Queue, Row Level Security (RLS) (+4 more)

### Community 19 - "Story Commit & Advisor"
Cohesion: 0.17
Nodes (12): Conditional advisor() call for complex Stories, advisor() conditional call (infra or ≥5 tasks), Batch mode (--all / currentBatchRunning), **Commit** field extraction per Story, Completion criteria PASS/FAIL check, prompt-engineer agent invocation (Type: prompt), simplify skill (post-code-review for tdd), simplify skill followup (tdd only) (+4 more)

### Community 20 - "Learning & Debug Skills"
Cohesion: 0.22
Nodes (9): /harness:learn command, Curation opt-in policy, Failure Capture Template, Four-Phase Debug Loop, Introspection Report, wf-agent-debug, Reusable/Non-obvious/Generalizable filters, wf-continuous-learning (+1 more)

### Community 21 - "Flow Setup & CLI"
Cohesion: 0.22
Nodes (9): Fork-pattern detection via upstream remote, config.git.* fields, flow-setup SKILL, read CLI subcommand, register-topic CLI subcommand, remove-topic CLI subcommand, meta-dev-context SKILL, Allowed state transition table (+1 more)

### Community 22 - "Checkpoint & Learned"
Cohesion: 0.22
Nodes (9): checkpoint create subcommand, .claude/checkpoints.log, .claude/checkpoints.log (git-ignored), /flow-checkpoint skill, checkpoint verify subcommand, Plan **Commit** field for Story commit, Bash set-u Empty Array Pattern, Prototype Pollution Defense CLI (+1 more)

### Community 23 - "Dev Workflow Rules"
Cohesion: 0.25
Nodes (8): Overall flow: spec→plan→impl→review→verify→docs→pr→done, development-workflow.md rule, zsh shell portability (no declare -A/mapfile), State transition summary table, Archive planning artifacts to done/, Archive artifacts to docs/_local/done/, Gate: pr:created, /flow-done skill

### Community 24 - "Learned Skill Patterns"
Cohesion: 0.29
Nodes (8): AskUserQuestion enforced via /flow-review, bash set -u empty-array expansion pattern, gitignore Directory Negation Pattern, Prototype pollution 2-layer defense pattern, Spec Review Pending PR Dependency, Test Guard Precedence Design, set-field CLI subcommand, skills/learned/ Directory

### Community 25 - "Agent Coordination Rules"
Cohesion: 0.4
Nodes (5): Immediate agent activation triggers, Parallel agent execution, Read-before-Edit rule, agents.md rule, Stated invocation form discipline

### Community 26 - "Performance & Models"
Cohesion: 0.5
Nodes (4): Context window management (~80% threshold), Extended Thinking (≤31,999 tokens), Model selection by task complexity, performance.md rule

### Community 27 - "LangChain Providers"
Cohesion: 0.5
Nodes (4): LangChain Azure Integration, LangChain Bedrock Integration, LangChain Google Integration, LangChain OpenAI Integration

### Community 28 - "Component Boundaries"
Cohesion: 0.5
Nodes (4): Load-and-follow delegation pattern, Flow gate pattern (exhaustive state table), component-boundaries rule, user-invocable Frontmatter Flag

## Knowledge Gaps
- **324 isolated node(s):** `CATEGORIES`, `devContextScript`, `force`, `detectScript`, `SUPPORTED_EXTENSIONS` (+319 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `docs/specs 인덱스` connect `Topic Lifecycle System` to `Search Adapter Stack`, `Codex Setup & Cache`, `Implementation Agents`, `Doc & Spec Format`, `Prompt Authoring Rules`, `Eval & Plan Review`, `Codex Review Adapter`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `skill-registry SKILL` connect `Search Adapter Stack` to `Dependency & Language Rules`, `Topic Lifecycle System`, `Prompt Authoring Rules`, `Codex Review Adapter`, `Harness Audit & Flow`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `/flow-impl skill` connect `Story Commit & Advisor` to `Hook Scripts & Audit`, `Prompt Authoring Rules`, `Eval & Plan Review`, `Testing & Frontend`, `Codex Review Adapter`, `Spec Reconciliation Flow`, `Code Review Agents`, `Flow Setup & CLI`, `Checkpoint & Learned`, `Dev Workflow Rules`, `Component Boundaries`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `dev-context.js CLI` (e.g. with `Prototype Pollution Defense CLI` and `Test Guard Precedence Design`) actually correct?**
  _`dev-context.js CLI` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CATEGORIES`, `devContextScript`, `force` to the rest of the system?**
  _324 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Hook Scripts & Audit` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `State Management CLI` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._