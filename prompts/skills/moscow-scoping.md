---
key: moscow-scoping
title: MoSCoW scope and MVP cut
description: Split scope into Must, Should, Could, and Won't for now, defending the smallest set that delivers and validates the core value.
intent: Protect a lean MVP by making "out of scope" an explicit, defended decision rather than silent feature creep.
skill_type: component
best_for: cutting an MVP, deciding what is in and out, fighting scope creep, defining a first release
triggers: moscow, mvp scope, what is in scope, minimum viable, cut features, must have, out of scope
role_keys: product_manager, analyst
sort_order: 16
---

## Purpose
Decide the smallest build that delivers real value and tests the core assumption. The hard, valuable part is what goes into Won't.

## Structure
- **Must**: without these the release has no value or cannot ship. Keep this list short and justify each.
- **Should**: important but the release survives a short time without them.
- **Could**: nice if cheap; first to drop under pressure.
- **Won't (for now)**: explicitly deferred, with a one-line reason. This is the most important list.
Tie the Must set back to the one assumption the MVP is meant to validate.

## Method
1. For every Must, ask: does the core value or the validation fail without it? If not, demote it.
2. Make Won't explicit so deferral is a decision, not an omission.
3. Prefer cutting scope over cutting quality on what remains.

## Anti-patterns
- Everything labeled Must.
- An empty Won't list (the sign of unmanaged scope).
- Cutting the validation goal to fit a feature.

## When NOT to use
For a tightly specified small change, scoping ceremony is wasted; confirm the change and proceed.
