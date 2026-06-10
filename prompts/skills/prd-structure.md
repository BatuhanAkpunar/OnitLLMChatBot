---
key: prd-structure
title: Lean PRD structure
description: Turn a feature idea or discovery notes into an engineering-ready PRD with problem, users, scope, metrics, and risks.
intent: Produce a decision-ready PRD that aligns the team on why, for whom, and what done means, without freezing into a waterfall spec.
skill_type: component
best_for: writing a PRD from scratch, structuring requirements for an engineering handoff, documenting a major feature before development
triggers: prd, requirements document, product requirements, spec for, write the requirements
role_keys: product_manager, analyst
sort_order: 1
---

## Purpose
Produce a PRD that answers, in order: what problem, for whom, why now, what we build, how we measure success, and what is explicitly out. A PRD is a living alignment document, not a contract; it should evolve as the team learns.

## Structure (use these sections)
1. **Summary**: one paragraph: problem + solution + expected impact.
2. **Problem**: who has it, what the struggle is, why it hurts, and the evidence (quotes, data, support tickets). No solution language here.
3. **Target users**: primary persona and their job-to-be-done; secondary personas only if they change the design.
4. **Why now**: the business goal this serves and what makes it timely.
5. **Solution overview**: high-level description and the key user flow. No pixel-level detail.
6. **Success metrics**: one primary metric with current value and target; 2-3 secondary metrics; the guardrail metric that must not get worse.
7. **Requirements**: user stories with acceptance criteria; constraints and edge cases.
8. **Out of scope**: what we are NOT building, each with a one-line reason.
9. **Risks and dependencies**: technical, external, and adoption risks, each with a mitigation.
10. **Open questions**: unresolved decisions and who owns them.

## Quality bar
- Every requirement traces back to the problem section. If it does not, cut it or question it.
- Success metrics are measurable today (the instrumentation exists or is part of the scope).
- "Out of scope" is never empty: an empty one means scope was not actually decided.

## Anti-patterns
- A PRD that starts from the solution and backfills a problem.
- Listing every stakeholder wish: a PRD is a prioritization artifact, not an inventory.
- Pixel-level UI specification: link to design work instead.

## When NOT to use
For small fixes or well-understood changes, write user stories with acceptance criteria directly and say a PRD would be overkill. For unvalidated ideas, run discovery first: a PRD synthesizes evidence, it does not replace it.
