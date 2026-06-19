# Onit AI Roadmap

Ideas sourced from a competitive review (June 2026) of: WorkflowAI, Promptmodel,
ai-driven-ab-testing, builder-ai, claude-team-os. Each item lists where the idea
came from and why it fits Onit. Priorities: P1 = high impact / low effort,
P2 = high impact / medium effort, P3 = nice to have.

## Decisions (June 2026)

- **Core team = 5 product roles**: Analyst, Product Manager, Designer, Project
  Manager, QA. A short-lived Growth and Red Team experiment was reverted; the
  Developer role was retired. Premortem and red-team are kept as team behaviours
  (Product OS prompt layer + the premortem method), not as standing roles.
- **LLM = Gemini, single model** (`gemini-3.5-flash`) for chat, summaries and
  fallback. Runs free on the owner's Google AI Studio key; no other provider.

## PM audit rebuild (June 2026)

An independent PM audit drove a phased rebuild (see docs/PRODUCT.md for the
north star). What shipped:
- **Cleanup**: removed dead components (DynamicIsland, Terminal, BorderBeam),
  dead i18n (vision pillars, command palette, island, web-search), and the dead
  web-search path in the chat route.
- **Prompt engine**: the Product OS is now proportional (small tasks answered
  directly, challenge/lenses only for strategic asks); identity is leaner and
  never volunteers the maker or model; the gate welcomes product-thinking work.
- **Positioning**: sharper hero, plus "How it works" and "Why Onit" sections.
- **Design**: pixel display font reserved for accents and the team surface; body
  and labels use the readable Geist (premium main flow, arcade as accent).
- **Activation + measurement**: one-click example briefs; the admin dashboard
  derives activation/engagement from existing tables (no events pipeline).
- **Monetization**: Free/Pro plan with a daily message cap and an upgrade dialog
  (`profiles.plan`, `lib/billing.ts`); Stripe is the remaining wiring.
- **Architecture**: extracted MessageRow into its own module; `actions.ts` split
  is deferred (wide blast radius).

## P1: quick wins

- [ ] **Project Team Rules (constitution)** (claude-team-os `CLAUDE.md`)
      A per-project free-text rules field ("answer in English", "stack is
      Next.js + Supabase", "never suggest paid tools"). Injected into every
      role's system prompt for that project. One textarea in project settings,
      one join in `/api/chat`.
- [ ] **Acceptance criteria per subtask** (claude-team-os definition of done)
      The orchestrator's decompose step adds a one-line "done when ..." to each
      task. The synthesis step checks each criterion and reports pass / gap.
      Pure prompt change in `orchestrate()` and `synthesize()`.
- [ ] **Cost tracking in money, not just tokens** (WorkflowAI cost tracking)
      We already log tokens per run. Add a static price table for the models we
      use and show $ per chat / per role in the profile panel and admin usage.
- [ ] **Structured-output hardening** (WorkflowAI structured output)
      Validate the orchestrator JSON with zod; on malformed output retry once
      with the error message appended. Removes a whole failure class.

## P2: differentiators

- [ ] **Prompt versioning + rollback in admin** (Promptmodel, builder-ai
      `prompt-versioning`) Every save of a role prompt writes a version row
      (who, when, diff). Admin can view history, diff against current, and
      restore. Table `agent_config_versions`.
- [ ] **Prompt playground in admin** (WorkflowAI playground, Promptmodel web
      editor) "Test this prompt" panel next to the editor: run a sample message
      against the draft prompt and, optionally, against 2 different models side
      by side, with cost and latency shown, before saving.
- [ ] **Per-agent model override** (WorkflowAI model-agnostic)
      `agent_configs.model` column; admin picks a model per role (cheap model
      for routing, stronger model for @Developer). Falls back to the default.
- [ ] **Model failover** (WorkflowAI provider failover)
      If the primary model errors or times out in `/api/chat`, retry once on a
      fallback model before surfacing an error.
- [ ] **Message feedback (thumbs up / down)** (Promptmodel evaluation,
      ai-driven-ab-testing) Per assistant message; stored with role + prompt
      version. This is the data that powers evals and A/B later.
- [ ] **Project backlog panel** (claude-team-os `docs/backlog.md`)
      Plans the coordinator produces become persistent tasks on the project
      (todo / doing / done). The team can reference and update them in later
      messages, instead of plans vanishing into chat history.
- [ ] **Web search tool for agents** (WorkflowAI hosted tools)
      Already on our paused list; this review confirms it. Start with a single
      "search the web" tool exposed to all roles, results cited in answers.

## P3: later

- [ ] **Prompt A/B testing** (ai-driven-ab-testing, Promptmodel)
      Two versions of a role prompt split traffic 50/50; thumbs feedback decides
      the winner. Needs versioning + feedback first.
- [ ] **Role gallery** (builder-ai agents, claude-team-os roles)
      One-click role templates in admin: @SecurityReviewer (builder-ai
      `ai-safety-reviewer`), @PromptEngineer, @DevOps, @Architect. We already
      support custom roles; this is curated content, not new infra.
- [ ] **/status command** (claude-team-os `/status`)
      Typing /status in a chat asks the coordinator to summarize the project:
      what was decided, what is in the backlog, what is blocked.
- [ ] **Evidence-block output discipline** (builder-ai hard gates)
      Roles end structured deliverables with a filled evidence block (e.g. QA:
      criteria checked with pass/fail) instead of free prose claims. Partially
      shipped via role prompt additions; extend per role over time.
- [ ] **Eval suite for our own prompts** (builder-ai `eval-before-ship`)
      A tiny `evals/` folder: 10 to 20 canned requests with expected routing
      decisions; a script runs them against `orchestrate()` and reports drift
      before we change orchestrator prompts.

## Adopted now (this review)

- analyst.md: propose testable hypotheses with success metrics when data or
  experiments are involved (ai-driven-ab-testing hypothesis generator).
- developer.md: always cover error handling and fallback paths (builder-ai
  `fallback-required`).
- qa.md: end with a Definition of Done check against acceptance criteria
  (claude-team-os definition of done).
- project_manager.md: classify work as small / standard / systemic and size the
  process to the risk (claude-team-os tiered ceremony).

Note: role .md changes take effect in the product after `npm run seed:agents`,
which overwrites DB prompts; check the admin panel for manual edits first.
