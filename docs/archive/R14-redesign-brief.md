# R14 — "Pixel Atelier": ground-up experience redesign

A complete reimagining of Onit AI's surface: home, chat, response style, and
interaction model. Direction: **neo-retro** — a 16-bit arcade soul wearing
modern, premium clothes. Not nostalgia kitsch; a confident, characterful
product that feels alive. Light and dark are designed as two distinct worlds,
not one theme with inverted colors.

## North star
Onit is not a chatbot. It's a **party of specialists** you lead, like a JRPG
guild. The whole UI leans into that: characters that breathe and react, a
"quest log" instead of a backlog, a Dynamic-Island status core that narrates
what the team is doing, and a build that streams like a terminal.

---

## Personas

### 1. Deniz — the solo founder (primary)
28, non-technical, building a marketplace MVP on weekends. Lives in Notion,
Linear, ChatGPT. Smart, impatient, allergic to "AI slop" UIs that look like a
Tailwind demo. Wants to feel like she has a team, not a prompt box.
- **Frustration:** generic chat UIs give no sense of *who* is answering or
  *what's happening* while she waits.
- **Win:** opens Onit, sees her party, briefs them once, watches the Dynamic
  Island narrate "Analyst is framing the problem…", gets a plan she can edit
  and push.

### 2. Kerem — the PM at a scale-up (secondary)
34, technical-adjacent, runs discovery. Uses Onit to pressure-test specs and
generate test matrices. Cares about decisions being remembered and about
speed. Power-user: keyboard-first, opens the command palette, @mentions roles.
- **Win:** ⌘K everything, Discuss mode debates, decisions captured to the
  quest log, terminal-style run he can scan fast.

### 3. Aslı — the design-led builder (tertiary)
31, visual, screenshots everything for moodboards. She'll judge Onit in 3
seconds on aesthetics. If it looks special she evangelizes it.
- **Win:** the home screen is screenshot-worthy; dark mode is a CRT dream,
  light mode is a warm arcade. Characters are charming, crisp at every size.

---

## User stories (MoSCoW)

**Must**
- As a visitor, I land and *instantly* understand Onit is an AI product team,
  conveyed in few words + motion, not paragraphs.
- As a visitor, I can brief the team from the hero without signing in; the
  result gates sign-in.
- As a user, while the team works I see a live, legible status (who's active,
  what step) via a Dynamic-Island core — never a dead spinner.
- As a user, agent answers read as *that character speaking*: avatar, name
  plate, role color, voice.
- As a user, characters stay crisp at every size (16px → 200px).
- As a user, light and dark are both first-class and gorgeous.
- As an admin, removing a role (Developer) cleanly removes it everywhere.

**Should**
- As a power user, ⌘K opens a command palette (new chat, switch mode, mention
  role, jump to chat, toggle theme/lang).
- As a user, "Build" mode streams like a terminal build log (per-step,
  typewriter), so progress feels real.
- As a user, I can switch a single reply between "prose" and "terminal" view.

**Could**
- Sound-off by default retro blips on key actions (respect reduced-motion +
  a mute toggle). *(deferred unless cheap)*
- Confetti/level-up flourish when a plan is pushed to build.

**Won't (this round)**
- Multiplayer, voice, mobile-native app.

---

## Design system — "Pixel Atelier"

### Typeface roles
- **Display/accent:** `Pixelify Sans` (Google) — legible modern pixel, used
  for hero word-marks, role name plates, section kickers, Dynamic-Island label.
- **Body/UI:** keep `Geist Sans` — premium neutral, all running text.
- **Mono/terminal:** `Geist Mono` — terminal, code, meta labels.
  Rule: pixel font is a *spice*, never body copy.

### Two worlds
**Light — "Arcade Daylight"**
- Warm paper base `#FBFAF7`, ink `#1A1A22`, soft cream cards `#FFFFFF` with a
  1px ink-tint border + a 2px offset "pixel" shadow (hard, not blurry).
- Background: faint dot-grid + a low-contrast retro-grid horizon.
- Role colors are the only saturation. Calm, premium, sunlit.

**Dark — "CRT Midnight"**
- Deep blue-black `#0A0A12`, phosphor text `#EDEDF2`, panel `#12121C`.
- Subtle scanline overlay + vignette; role colors glow (outer + inner).
- Feels like a high-end arcade cabinet at night.

### Signature primitives (new components/ui/*)
- **DynamicIsland** — morphing top-center capsule. States: `idle` (hidden /
  thin), `routing`, `thinking`, `streaming`, `done`, `error`. Springy width/
  height morph (motion layout), live role avatar + label + mini waveform.
- **PixelPanel** — card with hard offset shadow + 2px corner notches (CSS),
  the structural unit everywhere.
- **Terminal** (MagicUI, adapted) — used for Build-mode run logs.
- **RetroGrid / DotPattern / Scanlines** — backgrounds, theme-aware.
- **BorderBeam** — animated beam around the composer when focused / working.
- **AnimatedShinyText / PixelType** — hero + name-plate reveals.
- **PressableTile** — buttons/cards with a tactile 1px "press down" on click.

### Character system (the fix for "blurry when small")
- Root cause: low-res sources + `image-rendering: pixelated` at non-integer
  scales = mush. Fix: regenerate at **1024px**, store as webp, render **smooth**
  (no forced pixelation), with a crisp role-tinted ring. High-res downscales
  cleanly at every size.
- Art direction: cohesive neo-retro illustration, transparent bg, role color +
  signature prop, friendly JRPG party-member energy.
- **Roster (Developer removed):** Analyst (blue), Product Manager (violet),
  Project Manager (green), Product Designer (pink), QA (teal).
- **Motion (no per-frame sprites):** idle breathe + bob, pointer-parallax tilt,
  hover lift, **speaking** = bounce + role-glow pulse + mini equalizer, blink
  via a quick non-uniform scale. All `prefers-reduced-motion` safe.

---

## New user flow

1. **Land (anon).** CRT/arcade hero. Pixel word-mark reveals. One-line vision.
   Composer with BorderBeam. The party stands below, idle-breathing; hover a
   member → they react. Dynamic Island shows "Party ready."
2. **Brief.** Type (or pick a quick-quest chip), Enter. Anon → sign-in gate
   with the brief saved; the Island morphs to "Saving your brief…".
3. **Team works.** Land in chat. Dynamic Island narrates routing → each role
   thinking → streaming. In Build mode the answer streams as a terminal log.
4. **Read as characters.** Each answer is the character speaking (avatar +
   name plate + color). Edit inline, push to build.
5. **Quest log.** Tasks/decisions/rules reframed as a "Quest Log" panel.
6. **Steer.** ⌘K palette; mode switch is a tactile segmented control.

---

## Phases
- **R14-A** Research + this brief. *(done)*
- **R14-B** Regenerate 5 characters (remove Developer); new crisp RoleSprite +
  rich CSS/motion idle/speaking system.
- **R14-C** Design-system overhaul: fonts, light/dark "two worlds", retro
  utilities, MagicUI primitives (Terminal, RetroGrid, DotPattern, Scanlines,
  BorderBeam, shiny text), PixelPanel/PressableTile.
- **R14-D** DynamicIsland status core + global wiring.
- **R14-E** Home redesign.
- **R14-F** Chat redesign + terminal response style + character speaking.
- **R14-G** ⌘K command palette + interaction polish.
- **R14-H** Verify (build/test/preview ×2 themes ×2 langs) + push.
