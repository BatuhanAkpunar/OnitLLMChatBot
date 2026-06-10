---
key: epic-hypothesis
title: Epic as a testable hypothesis
description: Frame a major initiative as an if/then hypothesis with the smallest experiments that could disprove it and explicit validation measures.
intent: Treat epics as bets to validate rather than commitments to ship, so bad ideas die cheaply and good ones earn their build-out.
skill_type: component
best_for: defining a major initiative before roadmapping, making the assumptions behind an epic explicit, deciding what to validate before building
triggers: epic, big initiative, new capability, hypothesis, validate before building, should we build
role_keys: product_manager, analyst
sort_order: 4
---

## Purpose
Express a major piece of work as a falsifiable bet: what we believe, for whom, what outcome we expect, and how we would know we are wrong. The epic earns full build-out only after its riskiest assumptions survive cheap tests.

## Structure
- **Hypothesis**: "If we [intervention] for [specific user/segment], then [measurable outcome] because [mechanism we believe in]."
- **Riskiest assumptions**: 2-4 things that must be true, ranked by (damage if false x uncertainty). Categorize each: value (do they want it), usability (can they use it), feasibility (can we build it), viability (does it work for the business).
- **Smallest experiments**: for each top assumption, the cheapest test that could disprove it within days: an interview script, a fake-door, a concierge run, a technical spike. Building the full feature is never the first test.
- **Validation measures**: "We consider the hypothesis supported if within [timeframe] we observe [quantitative signal] and [qualitative signal]." Define the kill criterion too: the result that means stop.

## Quality bar
- The outcome is a user/business change, not a shipping event ("activation +15%", never "feature live by Q3").
- At least one experiment must be capable of FAILING. If every test would pass no matter what, it is theater.
- The mechanism ("because ...") is stated: it is what you actually learn about when the result surprises you.

## Anti-patterns
- Hypotheses written after the build decision was already made, as decoration.
- Vanity validation: demos to friendly stakeholders counted as evidence.
- Skipping the kill criterion so no result can ever stop the project.

## When NOT to use
For work that is already validated or contractually required, frame it as delivery with acceptance criteria instead; hypothesis ceremony there is overhead.
