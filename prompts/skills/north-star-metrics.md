---
key: north-star-metrics
title: North Star and metric tree
description: Define one North Star metric that captures delivered value, then the activation, retention, and input metrics that move it, avoiding vanity numbers.
intent: Give the team one number that means real value and a small tree of metrics it can actually influence, so progress is measured honestly.
skill_type: component
best_for: choosing what to measure, replacing vanity metrics, aligning a team on success, instrumenting a launch
triggers: north star, metrics, kpi, what to measure, activation metric, retention metric, success metric
role_keys: product_manager
sort_order: 13
---

## Purpose
Pick the one metric that, if it goes up, means users are getting more real value, then connect the few input metrics the team controls. Without this, teams optimize whatever is easy to count.

## Structure
- **North Star**: one sentence, value-based (e.g. "weekly active teams that shipped a build"), not a vanity count.
- **Why it reflects value**: the link between the metric and a user outcome.
- **Input metrics**: 2-4 levers that move the North Star (acquisition, activation, retention, breadth).
- **Activation metric**: the first-value action and its target timing.
- **Retention metric**: the return behavior and window.
- **Guardrail metric**: one number that must NOT get worse (quality, cost, churn).

## Method
1. Reject metrics that can rise while users get nothing (raw signups, page views).
2. Tie each input metric to a team that can move it.
3. Name the guardrail so growth does not hide harm.

## Anti-patterns
- A North Star that is really a revenue or vanity proxy.
- Ten KPIs with no hierarchy.
- Fabricated targets; if no baseline exists, say the first job is to measure it.

## When NOT to use
For a tiny throwaway experiment, one success signal is enough; skip the full tree.
