---
key: validation-probe
title: Disposable validation probe
description: Design the cheapest disposable test that surfaces a harsh truth about one risky assumption before any production code is written.
intent: De-risk decisions with throwaway probes built in hours or days, deliberately deleted afterwards, instead of polished prototypes that exist to impress.
skill_type: component
best_for: testing a risky assumption without building product, choosing the cheapest honest experiment, avoiding prototype theater before a build decision
triggers: probe, cheap test, before we build, riskiest assumption, experiment design, fake door, spike
role_keys: product_manager, qa
sort_order: 5
---

## Purpose
Design a probe: a tiny, disposable artifact whose only job is to answer ONE falsifiable question as cheaply and honestly as possible. A probe is reconnaissance, not an MVP: it is planned for deletion, not iteration.

## Rules of a real probe
- **One question**: a single hypothesis or risk. Broad probes produce ambiguous answers.
- **Falsifiable before you start**: write down what result means "we were wrong". If no outcome could kill the idea, redesign the probe.
- **Hours to days**: if it takes weeks, it is too expensive to kill and you will rationalize it.
- **Disposable by design**: no production-quality code, no reuse plan. The deliverable is the learning, not the artifact.
- **Harsh-truth metric**: measure behavior (clicks, completions, sign-ups, latency), not opinions ("they loved the demo" is not data).

## Probe types (match to the risk, not to your favorite tool)
1. **Feasibility spike**: "can we even build this?" Throwaway code against the real API/data; 1-2 days.
2. **Task probe**: "can users complete this job?" A clickable flow with one critical task and a completion measure; 2-5 days.
3. **Demand probe**: "does anyone want this?" A fake door, landing page, or concierge version measuring real sign-ups or requests.
4. **Narrative probe**: "does the story land?" A short walkthrough video or storyboard sent to target users, measuring follow-up interest.
5. **Data simulation**: "does the logic survive edge cases?" Synthetic data through the proposed rules before any UI exists.

## Output
Deliver: the single question, the probe type and why (plus the trade-off accepted), what you will build/show, the harsh-truth metric with a numeric threshold, the kill interpretation, and the time budget.

## When NOT to use
When the assumption is already cheap to test in production behind a flag, or the decision is reversible at near-zero cost: just ship the smallest real slice instead.
