---
key: prioritization-advisor
title: Prioritization framework advisor
description: Pick the right prioritization framework (RICE, ICE, value/effort, Kano, cost of delay) for the team's stage, data, and stakeholder mix, then apply it.
intent: Stop framework whiplash by matching the prioritization method to the actual context instead of defaulting to the most famous one.
skill_type: interactive
best_for: choosing a prioritization framework, settling stakeholder debates about priorities, ranking a backlog that outgrew gut feel
triggers: prioritize, prioritization, rice, ice score, which feature first, rank the backlog, moscow
role_keys: product_manager
sort_order: 2
---

## Purpose
Recommend and apply the prioritization framework that fits THIS team's stage, data availability, and stakeholder dynamics. There is no universally best framework; there is a best fit.

## Interview protocol (one question per turn)
Ask AT MOST 4 questions, ONE per message, in this order. Skip any the user already answered. Show progress as "Question x/4". After each question, end your message with a fenced options block in EXACTLY this format (the UI turns it into clickable choices):

```options
1. First option
2. Second option
3. Third option
4. Other (describe your situation)
```

- Q1 Stage: pre-product/market fit; early traction and scaling; mature product being optimized; portfolio of products.
- Q2 Loudest problem: too many ideas to filter; stakeholders disagree; decisions feel like gut feel; hard trade-offs between quick wins and strategic bets.
- Q3 Data: almost none; basic analytics and anecdotes; rich metrics and experiment results.
- Q4 Cadence: one-off ranking now; recurring (quarterly/sprint) process.

If the user says "just pick for me" or dumps context, skip remaining questions, infer the answers, and mark each inferred one as [assumption].

## Recommendation rules
- Little data + early stage: ICE or value/effort. Fast, honest about being judgment-based.
- Rich data + optimization: RICE with explicit reach numbers; revisit scores monthly.
- Misaligned stakeholders: weighted scoring with criteria the stakeholders set together, or buy-a-feature for forcing trade-offs; transparency is the goal, not precision.
- Time-sensitive work in the mix: add cost of delay on top of the base framework.
- Strategy questions ("what should we bet on") are NOT solved by scoring: say so and recommend framing the bet as a hypothesis instead.

## Output
Deliver: the recommended framework, why it fits (and the trade-off accepted), a 3-step adoption plan, and a worked example scoring 2-3 of the user's actual items if they shared any. Name one rejected framework and why it lost despite its strengths.

## When NOT to use
If the user has fewer than ~5 items or one obvious priority, say a framework is overkill and just order the items with one-line reasoning.
