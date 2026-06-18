---
key: premortem-redteam
title: Premortem and red-team review
description: Assume the product has failed and work backward to the most likely causes, then attack the idea from the viewpoint of a skeptical investor, competitor, user, and engineer.
intent: Surface the failure modes and weak assumptions before they are expensive, by deliberately trying to kill the idea rather than defend it.
skill_type: component
best_for: stress-testing a direction, before committing to build, reviewing a plan, finding weak assumptions
triggers: premortem, red team, why might this fail, risks, what could go wrong, stress test, devils advocate
role_keys: product_manager, qa
sort_order: 14
---

## Purpose
The team is biased toward its own idea. A premortem and red-team force the failure cases into the open while they are still cheap to fix.

## Structure
- **Premortem**: "It is one year later and this failed." List the most likely reasons, grouped: demand, execution, distribution, economics, technical, timing.
- **Top failure modes**: the 5 to 10 most probable, each with a rough likelihood (high/medium/low) and one mitigation.
- **Red-team panel**: attack the idea as each of:
  - Skeptical investor: why is this not big or defensible.
  - Competitor: how would they crush or copy it.
  - User: why would they not adopt or would churn.
  - Engineer: where is the hidden complexity or risk.
- **Weakest assumption**: the single belief that, if wrong, sinks everything, and how to test it cheaply.

## Method
1. Genuinely try to kill the idea; do not write a strawman you can easily defeat.
2. Rank failure modes by likelihood times damage, not by ease of fixing.
3. Convert the top risk into a validation step, not just a worry.

## Anti-patterns
- A risk list with no probabilities and no mitigations.
- Red-team voices that all secretly agree with the team.
- Treating mitigation as "we will be careful".

## When NOT to use
For small reversible changes, a full premortem is overkill; name the one risk and proceed.
