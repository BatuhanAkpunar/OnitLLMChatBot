---
key: rice-prioritization
title: RICE prioritization worksheet
description: Score and rank items by Reach, Impact, Confidence, and Effort, making the estimates and their evidence explicit so the ranking can be challenged.
intent: Turn prioritization from opinion into a transparent, debatable calculation that exposes low-confidence guesses.
skill_type: interactive
best_for: ranking a backlog, choosing what to build next, comparing several ideas, defending a sequence
triggers: rice, prioritize, prioritization, what to build first, rank the backlog, score features
role_keys: product_manager
sort_order: 15
---

## Purpose
Compare items on a common, transparent scale. RICE is useful not because the number is precise, but because it forces each estimate and its confidence into the open.

## Structure
For each item compute **(Reach x Impact x Confidence) / Effort**:
- **Reach**: how many users or events per period are affected. State the period.
- **Impact**: per-user effect on the goal (use a simple scale: 3 massive, 2 high, 1 medium, 0.5 low, 0.25 minimal).
- **Confidence**: how sure the estimates are (100% high, 80% medium, 50% low). Low confidence is a signal to validate, not to pad.
- **Effort**: person-time. Keep units consistent across items.
Present a ranked table with the score and the biggest uncertainty per item.

## Method
1. Estimate from real signals where possible; mark guesses as [assumption].
2. Treat low-confidence high-rank items as "validate first", not "build first".
3. Sanity-check the ranking against judgment; if it feels wrong, an input is wrong.

## Anti-patterns
- Precise-looking scores built on invented reach or impact numbers.
- Confidence always set to 100%.
- Using RICE to launder a predetermined decision.

## When NOT to use
For 1-2 obvious items, skip the worksheet and decide directly.
