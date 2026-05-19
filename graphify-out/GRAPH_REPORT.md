# Graph Report - /Users/mario/Workspace/harness  (2026-05-19)

## Corpus Check
- 5 files · ~127,589 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 637 nodes · 850 edges · 40 communities (29 shown, 11 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.83)
- Token cost: 95,000 input · 15,830 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Hook Scripts & Audits|Hook Scripts & Audits]]
- [[_COMMUNITY_Deploy Manifest & dev-context CLI|Deploy Manifest & dev-context CLI]]
- [[_COMMUNITY_Dependency Analysis & Stack Skills|Dependency Analysis & Stack Skills]]
- [[_COMMUNITY_Harness Workflow Core|Harness Workflow Core]]
- [[_COMMUNITY_Codex Adapter & Validation|Codex Adapter & Validation]]
- [[_COMMUNITY_Implementation Agents & TDD|Implementation Agents & TDD]]
- [[_COMMUNITY_Spec & Doc Contracts|Spec & Doc Contracts]]
- [[_COMMUNITY_Prompt Authoring Rules (Opus 4.7)|Prompt Authoring Rules (Opus 4.7)]]
- [[_COMMUNITY_Exa Search Adapter|Exa Search Adapter]]
- [[_COMMUNITY_E2E & Frontend Testing|E2E & Frontend Testing]]
- [[_COMMUNITY_Eval Harness & Contracts|Eval Harness & Contracts]]
- [[_COMMUNITY_Coding Style & Testing Rules|Coding Style & Testing Rules]]
- [[_COMMUNITY_Codex Setup & Cache|Codex Setup & Cache]]
- [[_COMMUNITY_Learn & Anti-patterns|Learn & Anti-patterns]]
- [[_COMMUNITY_LangChain Core & Agents|LangChain Core & Agents]]
- [[_COMMUNITY_Flow Docs Reconciliation|Flow Docs Reconciliation]]
- [[_COMMUNITY_Language Rules Scaffolding|Language Rules Scaffolding]]
- [[_COMMUNITY_Final Review Pipeline|Final Review Pipeline]]
- [[_COMMUNITY_Flow Checkpoint & Boundaries|Flow Checkpoint & Boundaries]]
- [[_COMMUNITY_Story Implementation Loop|Story Implementation Loop]]
- [[_COMMUNITY_Database & Next.js Stack|Database & Next.js Stack]]
- [[_COMMUNITY_Flow Setup & State Manager|Flow Setup & State Manager]]
- [[_COMMUNITY_Plan Workflow & Review|Plan Workflow & Review]]
- [[_COMMUNITY_Flow Done & Archive|Flow Done & Archive]]
- [[_COMMUNITY_Agent Coordination Rules|Agent Coordination Rules]]
- [[_COMMUNITY_Development Workflow Rule|Development Workflow Rule]]
- [[_COMMUNITY_Performance & Model Selection|Performance & Model Selection]]
- [[_COMMUNITY_LangChain Provider Integrations|LangChain Provider Integrations]]
- [[_COMMUNITY_LangChain Memory|LangChain Memory]]
- [[_COMMUNITY_LangChain v1 Migration|LangChain v1 Migration]]
- [[_COMMUNITY_LangChain HITL & Streaming|LangChain HITL & Streaming]]
- [[_COMMUNITY_LangChain Workflows & Subgraphs|LangChain Workflows & Subgraphs]]
- [[_COMMUNITY_LangChain Tools & Output|LangChain Tools & Output]]
- [[_COMMUNITY_Visualization Policy|Visualization Policy]]
- [[_COMMUNITY_Architect Agent|Architect Agent]]
- [[_COMMUNITY_LangChain Middleware|LangChain Middleware]]
- [[_COMMUNITY_Claude Scripts Package|Claude Scripts Package]]
- [[_COMMUNITY_Harness Scripts Package|Harness Scripts Package]]
- [[_COMMUNITY_Deploy Manifest Helper|Deploy Manifest Helper]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 26 edges
2. `dev-context.js CLI` - 25 edges
3. `/flow-impl skill` - 21 edges
4. `docs/specs 인덱스` - 19 edges
5. `flow-review SKILL` - 17 edges
6. `adapter-codex-review skill` - 16 edges
7. `flow-spec SKILL` - 16 edges
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
- **Story Type classification — three-source agreement (contract, planner, plan-review)** — contracts_implementation_plan_story_type_definitions, agents_planner_story_type_decision_guide, references_checklist_template_gate5_story_type_accuracy, specs_story_type_classification_main [EXTRACTED 0.95]
- **Prompt Eval Schema — shared by planner authoring, plan-review validation, and contract** — contracts_implementation_plan_prompt_eval_schema, agents_planner_prompt_type_story_guide, references_checklist_template_gate5_story_type_accuracy [EXTRACTED 0.95]
- **Tasks↔Criteria 1:1 mapping — planner self-check + plan-review Gate 4 + contract task line format** — agents_planner_tasks_criteria_mapping_self_check, references_checklist_template_gate4_completion_criteria, contracts_implementation_plan_task_line_format [EXTRACTED 0.95]

## Communities (40 total, 11 thin omitted)

### Community 0 - "Hook Scripts & Audits"
Cohesion: 0.06
Nodes (51): hooks, PostToolUse, PreToolUse, SessionStart, Stop, permissions, allow, command (+43 more)

### Community 1 - "Deploy Manifest & dev-context CLI"
Cohesion: 0.05
Nodes (47): Deploy manifest format (manifest_version, files[]), dev-context.js CLI, cmdListSrc(), cmdReadFiles(), cmdStripGitignoreBlock(), cmdWrite(), { opts, positional }, SUBCOMMANDS (+39 more)

### Community 2 - "Dependency Analysis & Stack Skills"
Cohesion: 0.05
Nodes (44): package.json existence gate, adapter-dependency-analysis skill, stack-dependency-cruiser (architecture check), stack-knip (unused code detection), Capabilities-based Skill Discovery, Skill Checklist Duplication Anti-pattern, Fastify RESTful Routes Pattern, Repository Pattern (+36 more)

### Community 3 - "Harness Workflow Core"
Cohesion: 0.06
Nodes (40): harness-optimizer Agent, Codex spec-review and plan-review skills, Flow Workflow (spec→plan→impl→review→verify→docs→pr→done), config.graphify.targets, Harness as Project Template (src/ → deploy), Topic Lifecycle State Machine, Eval baseline cache, 7 audit categories (0-10 each, 70 total) (+32 more)

### Community 4 - "Codex Adapter & Validation"
Cohesion: 0.06
Nodes (39): Auto-detect entry from phase:status, Decision parsing via before/after file diff, DEV_CONTEXT_PATH isolation, codex exec invocation pattern, adapter-codex-review skill, validate-path.js path normalization, validate-path.js script, Adapter Selection Policy (+31 more)

### Community 5 - "Implementation Agents & TDD"
Cohesion: 0.07
Nodes (38): prompt-engineer Agent, refactor-cleaner Agent, wf-tdd Skill, tdd-specialist Agent, prompt-engineer invocation for prompt-type Stories, with-skill vs baseline eval loop concept, Planner P1-P5 Progress Protocol, Prompt Eval Workflow Spec (+30 more)

### Community 6 - "Spec & Doc Contracts"
Cohesion: 0.07
Nodes (34): doc-updater Agent, Spec Document Format Contract, Spec Optional Sections (Architecture vs Role), Spec Required Sections, Spec Split Criteria (PR Merge Unit), refDoc field in dev-context.json, config.docs.sourceFilter auto-detect, git-workflow rule (+26 more)

### Community 7 - "Prompt Authoring Rules (Opus 4.7)"
Cohesion: 0.07
Nodes (33): Rule 3: remove anti-laziness scaffolding, Rule 5: remove explicit CoT, Rule 4: quantify or remove filters, Rule 6: front-load first-turn info, Rule 1: hedge removal, Opus 4.7 literal-interpretation behaviors, Rule 2: explicit scope, Rule 7: explicit tool-call triggers (+25 more)

### Community 8 - "Exa Search Adapter"
Cohesion: 0.09
Nodes (28): Exa /answer operation, Exa Answer schema, $EXA_API_KEY environment variable, Exa /contents operation, Exa /findSimilar operation, Exa 429 retry-with-exponential-backoff, Exa /search operation, adapter-exa skill (+20 more)

### Community 9 - "E2E & Frontend Testing"
Cohesion: 0.08
Nodes (27): tdd-specialist agent invocation, Flaky test quarantine, Page Object Model (POM), Playwright, stack-e2e-testing SKILL, Composition over Inheritance Pattern, React, stack-frontend SKILL (+19 more)

### Community 10 - "Eval Harness & Contracts"
Cohesion: 0.11
Nodes (23): 3-Trial Execution Loop, .claude/evals/<skill-name>.md Eval Case, pass@3 / pass^3 Metrics, eval-harness, .harness/contracts/ — Producer/Consumer Interface, Plan Review Contract, Spec Review Contract, .harness/README.md (+15 more)

### Community 11 - "Coding Style & Testing Rules"
Cohesion: 0.12
Nodes (19): Coding Style Rule, Code Quality Checklist, File Structure Limits (200-400 lines), Immutability Principle, Zod Input Validation, Testing Rule, Minimum 80% Coverage, Layered Guard Testing Principle (+11 more)

### Community 12 - "Codex Setup & Cache"
Cohesion: 0.15
Nodes (18): Codex availability gate, devContextScript, force, isCacheValid(), setCodexUnavailable(), detectAndCacheCodex, findCompanionPath, /codex:setup command (+10 more)

### Community 13 - "Learn & Anti-patterns"
Cohesion: 0.12
Nodes (17): /harness:learn command, Curation opt-in policy, AskUserQuestion enforced via /flow-review, bash set -u empty-array expansion pattern, gitignore Directory Negation Pattern, Prototype pollution 2-layer defense pattern, Spec Review Pending PR Dependency, Test Guard Precedence Design (+9 more)

### Community 14 - "LangChain Core & Agents"
Cohesion: 0.16
Nodes (17): LangChain Anthropic Integration, LangChain Context Engineering, DeepAgents Customization, DeepAgents Overview, DeepAgents Quickstart, LangChain Durable Execution, LangChain Graph Advanced, LangChain Graph Basics (+9 more)

### Community 15 - "Flow Docs Reconciliation"
Cohesion: 0.14
Nodes (16): phase:status Gate Check Pattern, Exhaustive State Table Pattern, doc-updater agent (large rewrites), Gate: review:in-progress (or docs:generated re-entry), Partial update vs Full rewrite heuristic, refDoc representative document, /flow-docs skill, Spec-implementation reconciliation (+8 more)

### Community 16 - "Language Rules Scaffolding"
Cohesion: 0.12
Nodes (16): /add-language-rules Command, coding-style.md (per language), security.md (per language), .harness/rules/<language>/ Target, testing.md (per language), AGENTS.md (project root), Root AGENTS.md target (harness-guide:begin/end markers), CLAUDE.md (project root) (+8 more)

### Community 17 - "Final Review Pipeline"
Cohesion: 0.21
Nodes (14): build-error-resolver Agent, code-reviewer agent, review-report-<timestamp>.md, Issue severity classification (CRITICAL/HIGH/MEDIUM/LOW), flow-review SKILL, flow-verify SKILL, AskUserQuestion Final Review Skill, review-report contract (+6 more)

### Community 18 - "Flow Checkpoint & Boundaries"
Cohesion: 0.15
Nodes (13): Load-and-follow delegation pattern, Flow gate pattern (exhaustive state table), component-boundaries rule, checkpoint create subcommand, .claude/checkpoints.log, .claude/checkpoints.log (git-ignored), /flow-checkpoint skill, checkpoint verify subcommand (+5 more)

### Community 19 - "Story Implementation Loop"
Cohesion: 0.17
Nodes (12): Conditional advisor() call for complex Stories, advisor() conditional call (infra or ≥5 tasks), Batch mode (--all / currentBatchRunning), **Commit** field extraction per Story, Completion criteria PASS/FAIL check, prompt-engineer agent invocation (Type: prompt), simplify skill (post-code-review for tdd), simplify skill followup (tdd only) (+4 more)

### Community 20 - "Database & Next.js Stack"
Cohesion: 0.18
Nodes (12): database-reviewer Agent, Turbopack file-system caching, stack-nextjs SKILL, Turbopack bundler, Cursor Pagination, PostgreSQL Index Cheat Sheet, FOR UPDATE SKIP LOCKED Queue, Row Level Security (RLS) (+4 more)

### Community 21 - "Flow Setup & State Manager"
Cohesion: 0.22
Nodes (9): Fork-pattern detection via upstream remote, config.git.* fields, flow-setup SKILL, read CLI subcommand, register-topic CLI subcommand, remove-topic CLI subcommand, meta-dev-context SKILL, Allowed state transition table (+1 more)

### Community 22 - "Plan Workflow & Review"
Cohesion: 0.25
Nodes (9): config.plan.auto_review, Codex plan-review, plan:confirmed State, /flow-plan Workflow, Codex spec-review, Optional Research Step (2.5), Split Recommendation, untrusted_external_content Wrapper (+1 more)

### Community 23 - "Flow Done & Archive"
Cohesion: 0.29
Nodes (7): detect-and-cache.js (codex status), Archive planning artifacts to done/, Archive artifacts to docs/_local/done/, Gate: pr:created, /flow-done skill, dev-context.test.js (state-manager tests), dev-context.js (state manager CLI)

### Community 24 - "Agent Coordination Rules"
Cohesion: 0.4
Nodes (5): Immediate agent activation triggers, Parallel agent execution, Read-before-Edit rule, agents.md rule, Stated invocation form discipline

### Community 25 - "Development Workflow Rule"
Cohesion: 0.5
Nodes (4): Overall flow: spec→plan→impl→review→verify→docs→pr→done, development-workflow.md rule, zsh shell portability (no declare -A/mapfile), State transition summary table

### Community 26 - "Performance & Model Selection"
Cohesion: 0.5
Nodes (4): Context window management (~80% threshold), Extended Thinking (≤31,999 tokens), Model selection by task complexity, performance.md rule

### Community 27 - "LangChain Provider Integrations"
Cohesion: 0.5
Nodes (4): LangChain Azure Integration, LangChain Bedrock Integration, LangChain Google Integration, LangChain OpenAI Integration

## Knowledge Gaps
- **315 isolated node(s):** `CATEGORIES`, `devContextScript`, `force`, `detectScript`, `SUPPORTED_EXTENSIONS` (+310 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `docs/specs 인덱스` connect `Prompt Authoring Rules (Opus 4.7)` to `Harness Workflow Core`, `Codex Adapter & Validation`, `Implementation Agents & TDD`, `Spec & Doc Contracts`, `Exa Search Adapter`, `Eval Harness & Contracts`, `Codex Setup & Cache`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `skill-registry SKILL` connect `Codex Adapter & Validation` to `Dependency Analysis & Stack Skills`, `Harness Workflow Core`, `Prompt Authoring Rules (Opus 4.7)`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `flow-spec SKILL` connect `Codex Adapter & Validation` to `Final Review Pipeline`, `Flow Setup & State Manager`, `Learn & Anti-patterns`, `Deploy Manifest & dev-context CLI`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `dev-context.js CLI` (e.g. with `Prototype Pollution Defense CLI` and `Test Guard Precedence Design`) actually correct?**
  _`dev-context.js CLI` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `flow-review SKILL` (e.g. with `phase:status Gate Check Pattern` and `flow-spec SKILL`) actually correct?**
  _`flow-review SKILL` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CATEGORIES`, `devContextScript`, `force` to the rest of the system?**
  _315 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Hook Scripts & Audits` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._