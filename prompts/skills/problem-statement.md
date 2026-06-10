---
key: problem-statement
title: Problem framing
description: Frame a fuzzy request as a crisp problem statement with the affected user, the struggle, the impact, and the evidence, before any solutioning.
intent: Prevent teams from building solutions to unexamined problems by forcing a falsifiable statement of who struggles with what and why it matters.
skill_type: component
best_for: framing a problem before discovery, rewriting a solution-shaped request into a problem, aligning a team on what is actually wrong
triggers: problem statement, frame the problem, what problem, root of the issue, pain point
role_keys: analyst, product_manager
sort_order: 3
---

## Purpose
Turn a request (often arriving solution-shaped: "we need a dashboard") into a problem statement the team can validate, scope, and measure. The problem statement is the contract for everything downstream.

## Structure
Write the statement in this shape:
- **Who**: the specific user or segment (not "users").
- **Struggle**: what they are trying to get done and where it breaks down, in their words if quotes exist.
- **Context**: when and where the struggle appears (trigger, frequency).
- **Impact**: what it costs them and the business (time, money, churn, risk), quantified when possible.
- **Evidence**: the 2-3 strongest signals this is real (interviews, tickets, analytics). Label strength: anecdote, pattern, or measured.
- **Non-goals**: adjacent problems this statement deliberately does not cover.

## Method
1. If the request names a solution, ask (or infer and mark as [assumption]) what failure the solution is meant to fix; restate that as the struggle.
2. Apply "five whys" sparingly: stop at the level the team can act on.
3. Write one falsifiable sentence at the end: "We believe [who] struggles with [struggle], costing [impact]; we would be wrong if [disconfirming signal]."

## Anti-patterns
- Problem statements that embed the solution ("users need an export button").
- Impact described only as adjectives ("very painful") with no number or proxy.
- Evidence sections that list opinions of internal stakeholders only.

## When NOT to use
For bugs and clearly specified small changes, framing ceremony wastes time: confirm the expected behavior and move on.
