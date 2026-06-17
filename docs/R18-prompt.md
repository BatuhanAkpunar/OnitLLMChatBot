# R18 build prompt (write first, then phase, then build)

Standing rule reaffirmed: NEVER use the em dash anywhere in the project (copy,
code, comments, docs). Use a colon, comma, parentheses, or a plain hyphen.

## Items (from feedback) + my additions

1. Em dash purge. Remove every em dash from user facing strings (i18n, hero,
   docs touched here) and replace with readable punctuation.

2. Hero in the retro font. The headline AND the subheadline use the pixel
   display font (Pixelify), readable at hero size. Keep it balanced.

3. RoutingControl ("Ajan: Otomatik"): clicking it currently breaks layout and
   opens a narrow dropdown. Fix: open at the composer width (wide), no layout
   break, anchored cleanly.

4. The pixel font on "Ajan: Otomatik" is unreadable at small size. Make all
   small pixel labels legible (bump size/tracking/weight, or a cleaner retro
   face) while keeping the retro feel.

5. Characters: regenerate. No objects in hands. Clearly Turkish faces. Ages:
   Analyst 25, Designer 28, Product Manager 35, Project Manager 35, QA 28.
   Frame from the chest up (portrait). Do NOT show Onit (the orb) as a team
   member anywhere (party row, etc.).

6. Quick starters ("PRD yaz", "Backlog önceliklendir", ...) in the retro font;
   buttons get more retro borders (chunky pixel border + hard offset).

7. Light mode: the waving background gradient is 10% more visible.

8. "Takımla tanış" heading: more prominent.

9. Google sign in shows "Sign in to continue to <project>.supabase.co". It
   should show the app/site name. (OAuth consent + Supabase auth config; document
   the exact steps since it is not purely code.)

10. Onit "thinking" shows both at the top (Dynamic Island) AND in the thread.
    Keep ONLY the thread one. Give that in-thread thinking area Dynamic-Island
    style micro effects, retro styled.

11. Dynamic-Island style effects elsewhere: find good spots across the site and
    apply, but EVERY island style effect must be retro designed (pixel border,
    scanlines, chunky).

12. Clarify/redirect quality: when Onit asks what the user wants (e.g. user
    typed "asd"), the reply must briefly surface what the team can do at that
    step (write a PRD, prioritize a backlog, design test cases, frame a problem,
    plan a sprint), and how (mention a role, or Plan mode). Add this "capability
    aware nudge" to the coordinator's clarify path.

13. Build/Plan/Discuss segmented labels are unreadable. Fix the font there.

14. Mobile: test and ensure the whole site is responsive (hero, composer, party,
    thread, top bar, popups).

### My additions (free to add)
- A readable retro type scale: define when Pixelify is used (display + chunky
  chips at >=13px) vs body (Geist). No pixel font below 12px.
- Retro Dynamic-Island component restyle: pixel border, scanline, hard shadow,
  so it matches the arcade language (used for the in-thread thinking + transient
  status like "saved", "routed to @X").
- Empty new-chat state: a short capability menu (same as the clarify nudge) so a
  blank chat already teaches what to do.

## Phases
- R18-A Characters: regen (no objects, Turkish, ages, chest up) + drop Onit from
  team displays.
- R18-B Type system + em dash purge: readable retro labels, hero retro, starters
  retro, mode segments fixed, no em dashes.
- R18-C RoutingControl fix (wide dropdown, no break) + retro button borders.
- R18-D Thinking: remove top island in chat, in-thread retro island-style
  thinking; restyle DynamicIsland retro; add island effects where they fit.
- R18-E Coordinator clarify nudge (capability aware) + empty-state capability menu.
- R18-F Light aurora +10%, "Takımla tanış" prominence, polish.
- R18-G Mobile responsive pass.
- R18-H Google sign in branding: document config steps.
- R18-I Verify (build/test/preview, light/dark, TR/EN, desktop+mobile) + push.
