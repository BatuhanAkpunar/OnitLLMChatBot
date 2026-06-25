# Onit AI - Product North Star

This is the single source of truth for what Onit is, who it serves, and how it
looks and sounds. It exists to STOP the redesign churn (R4-R18 was ~15 full
reskins with no stable direction). Any future change should be consistent with
this doc. If a change contradicts it, update this doc first, on purpose.

## One line
Onit turns a single brief into a real product plan, with an AI team that thinks
with you, not just for you.

## Who it is for (broad audience, one job)
The audience is intentionally broad, but the job is the same for everyone:
"take a raw idea and turn it into something you can act on."
- **Founders / indie hackers**: validate the idea, surface risks, get the first
  PRD and plan.
- **Working PMs**: produce PRDs, roadmaps, backlogs and test plans faster, with
  the reasoning shown.
- **Non-technical builders**: plan here in plain language, then go build (in
  lovable, cursor, etc.).
We do NOT narrow the copy to one persona, but we never say "for everyone" either.
We lead with the job, not the title.

## Core promise (what makes it different)
- A real team of specialists (Analyst, Product Manager, Designer, Project
  Manager, QA), coordinated by Onit, addressable in one chat.
- It challenges the idea instead of just complying: separates known / assumed /
  unknown, names the riskiest assumption and the cheapest way to test it.
- It never fabricates market data; it labels opinion vs evidence.
- Memory: decisions, tasks and rules persist with the project and shape every
  answer.

## Differentiation under pressure (from 2026-06 market research)
Reddit research (`docs/research/findings.md`) shows this category faces two
existential critiques. Onit's design must answer both, on purpose.
- "It's just an LLM wrapper." As base models improve, generation alone is not a
  moat. Onit's moat is what a fresh LLM chat structurally cannot do: persistent
  project memory (decisions/tasks/rules that compound and are cited in the
  output), an opinionated process that challenges the idea, and a concrete
  buildable artifact (PRD + tasks + test plan) you can push to build.
- "Agent teams are theater, not leverage." Multiple voices add coordination
  cost, redundancy, and a mushy aggregate with no accountability. So Onit's team
  must resolve into ONE decisive voice and ONE authoritative artifact. Rule:
  default to a single role; multi-role only when parts are genuinely distinct,
  and always reconciled into one synthesized answer. Each role's contribution is
  labeled, non-redundant, and short. Less chat, more decision. No workslop.

## Brand and design rule (the balance)
Decided: keep the arcade identity but balance it.
- **Main flow is calm and premium** (composer, thread, plan, profile, project
  panel, admin): readable typography, restrained spacing, low-noise motion.
  Benchmarks: Linear, Notion, Raycast.
- **Arcade is a secondary delight layer**, not the main interaction: the pixel
  team portraits on the "meet the team" surface, small celebratory moments. It
  adds personality without undercutting credibility for a serious buyer.
- Pixel display font (Pixelify Sans) is for accents and the team surface only,
  never for body or critical UI labels (those stay readable, Geist).
- Motion is purposeful and respects `prefers-reduced-motion` everywhere.

## Motion and interaction language (ONE vocabulary)
Coherence beats a pile of effects. The whole app uses a single tactile
"arcade" interaction language; do not add a second one. Mixing idioms (soft
radial spotlights, gradient text shimmer, sheen sweeps, per-effect colors) is
what made the site feel amateur, so those are banned.
- **Surfaces**: one card, `.pixel-panel` (1.5px border + hard offset shadow).
- **Click**: `.pressable` presses the surface down (translate 2px, shadow
  collapses). On every clickable thing.
- **Hover (interactive cards)**: `.lift-card` lifts 3px and the hard offset
  shadow grows; the border tightens toward foreground. No glows.
- **Entrance**: `.reveal-up`, one small fade-up as a section scrolls in.
- **Easing/timing**: `cubic-bezier(0.22, 1, 0.36, 1)`, ~0.26s. Reuse, do not
  invent per-component curves.
- **Type roles**: Pixelify = wordmark + section headings; Geist Mono = system
  texture (tagline, card body, chips, tags); Geist Sans = long-form reading.
- **Accent**: the brand gradient is reserved for the hero accent and active
  states, not sprinkled on hovers.
Before adding any new animation, map it to one of the above. If it does not
fit, it is the wrong effect for this product.

## Voice and tone
Direct, confident, plain. Short sentences. No hype, no filler, no em-dash. Name
the trade-off, not just the upside. Speak the user's language (TR/EN).

## What we will NOT do
- No new full redesign without updating this doc first.
- No new team roles without an explicit product reason (core team is 5).
- No fabricated numbers, fake social proof, or invented competitor facts.
- Characters never take over the main working surface.

## North Star metric
Activation = a user completes their first brief and gets a usable result.
Secondary: week-1 return. These are added as measurement in a later phase.
