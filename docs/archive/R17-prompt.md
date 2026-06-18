# R17 — Build prompt (write first, then build)

Direct response to feedback. Each item below is a build instruction.

## 1. Characters — regenerate (warmer, real Street Fighter II, IT-team clichés)
- Art: authentic **Street Fighter II character-select portrait** — warm dramatic
  lighting, rich saturated palette, bold outlines, chunky pixels. Warmer than the
  current cold flat look. Keep the post-process pixelation but on warmer source art.
- All **portrait busts**, identical framing, role-colored flat stage.
- Turkish faces **+ IT-team clichés** baked into each (the bond is recognition):
  - **Mert / Analyst** (blue): glasses, hoodie, holding a coffee mug — the
    data nerd who lives in dashboards.
  - **Elif / PM** (violet): smart-casual blazer, a wall of sticky notes / roadmap.
  - **Kerem / PjM** (green): trimmed mustache, plaid shirt, clipboard + sticky notes.
  - **Zeynep / Designer** (pink): big headphones, beanie, stylus + tablet.
  - **Can / QA** (teal): hoodie, magnifier over a tiny bug, laptop sticker vibe.
- **Motion change:** remove the bobbing / equalizer ("dancing to music"). The ONLY
  motion is the character doing **its own gesture** (the `_wave` frame) — on hover
  and on a slow idle interval. No bounce, no eq bars, no float.

## 2. Homepage hero — elegant & balanced (lovable.dev inspired)
- Remove the "YAPAY ZEKA ÜRÜN EKİBİN" badge and the "Takım hazır" Dynamic Island
  on the home page. No status pill on home.
- New headline: bigger, confident, balanced, generous whitespace, centered stack.
  - TR: **"Fikrini söyle. Ekibin üretsin."**  EN: **"Brief your team. Ship it."**
  - Make it the clear visual anchor (large, tight leading, accent on the 2nd line).
- New subheadline (replace the monotone "Çoğu yapay zeka…"):
  - TR: "Analist, ürün yöneticisi, tasarımcı ve QA — hepsi tek sohbette. Sen
    yönlendir, onlar planlasın, tartışsın, üretsin."
  - EN: "An analyst, a PM, a designer and QA — all in one chat. You steer; they
    plan, debate, and build."
- Composer centered, clean, plenty of breathing room. Subtle gradient backdrop;
  dial down the loud retro-grid on the hero (keep a soft version).

## 3. Developer photo — show the real, clear photo (not pixelated)
- Use the clean `developer-batuhan.png`, rendered smooth (no pixelation), so the
  face reads clearly in the credit popover and chip.

## 4. No login page (again)
- `/login` must never render a page in production — always redirect to `/`. No UI
  anywhere links to `/login`. (Dev-only form may stay behind NODE_ENV for e2e.)

## 5. No keyboard shortcuts
- Remove the ⌘K command palette and the ⌘K button from the top bar entirely.

## 6. Unify the composer (home == chat)
- The home composer and the post-login chat composer must be the **same** control:
  the `Ajan: Otomatik` routing pill + the `Üret / Planla / Tartış` segmented modes
  + send. Replace the home's `@ajanlar` / `/Üret` dropdown buttons with the chat
  composer's controls so they're identical.

## 7. No toasts in chat
- Remove sonner toast notifications from the chat screen (copy/rename/delete/edit
  feedback). Silent or inline only.

## 8. Thread redesign — no cards, no left color bar
- Agent/Onit replies: **flat**, no card box, no border, no role-colored left
  accent. Avatar + name + plain markdown text on the page (ChatGPT-style calm).
- User messages: a simple, quiet right-aligned bubble (no heavy retro card).
- Keep it clean and readable; the personality comes from the avatar + name, not a box.

## Phases
- R17-A characters (regen warm SF2 + IT clichés; portraits) + drop bob/eq motion
- R17-B hero redesign (copy + balance, remove badge/island, dev photo clear)
- R17-C remove /login page + remove ⌘K shortcuts
- R17-D unify composer (home uses chat controls)
- R17-E remove chat toasts
- R17-F thread redesign (flat messages, no card/accent)
- R17-G verify (build/test/preview ×2 themes ×2 langs) + push
