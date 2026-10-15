# Roadmap — The Summoning

_Last updated: 2026-10-14 (Phases 2–5 complete; needs a phone playtest)_

## Vision

A mobile-first incremental game about a cult waking something that should stay asleep.
The numbers go up, and the world visibly goes wrong as they do. Every system should
show up in the scene, not just in a counter.

**"Finished" (1.0) means:**
- 8–15 hours to reach an ending, across three acts / prestige layers
- Feels like a native app on a phone (installable, no awkward scrolling, touch-first inspection)
- Saves are versioned, migrate safely, and can be exported/imported
- Has audio, an onboarding flow, an ending, and a post-game
- Balance tested by simulation, not just by feel

---

## Where we are (v0.1, built 2026-10-14)

- [x] Core loop: chant → whispers → 6 follower tiers → 9 rites
- [x] Prestige: tear the veil (1B) → Summon → Eldritch Favor (+10% each, unspent)
- [x] Pacts: 6 permanent perks bought with Favor (spending Favor gives up its bonus)
- [x] Sanity: drain from high tiers, madness multiplier up to ×2, random events below 40%, Steady Mind
- [x] Pixel-art ritual scene: followers, tentacles, skyline, temples, books, the Watcher eye, summon animation, glitch at low sanity
- [x] Vessel: player avatar with 4 cosmetic slots and 18 unlockables
- [x] Title screen, Grimoire guide (sections unlock as you discover mechanics), live tooltips
- [x] Mobile pass 1: pinned chant bar, tabs with count badges, omen feed, no double-tap zoom
- [x] Admin panel (`` ` `` or `?admin`), offline progress, autosave
- [x] Repo, CI check, GitHub Pages deploy

## Player feedback log

Raw notes from playtesting, kept verbatim-ish so later phases can check against them.

**2026-10-14, phone playtest #1**
- "Doesn't really feel that native": no at-a-glance sanity, too much scrolling → Phase 2
- Tooltips: a tap shows the tip, but a second tap just moved it → *fixed in Phase 1 (a second tap closes it); a full rethink is in Phase 2*
- Omens should be easy to read without switching tabs → *feed added; a later note asked them to come from the top*

**2026-10-14, phone playtest #2**
- Omens should come in from the **top**: the thumb covers them at the bottom while chanting → *fixed in Phase 1 (they drop in under the pinned whispers bar)*
- Want an **early-game upgrade to hold Chant** instead of tapping repeatedly → Phase 2
- Tooltip second-tap bug (as above) → *fixed in Phase 1*

## Known issues and debt

- ~~Mobile UX doesn't feel native~~ → app shell, tab bar, HUD, inspect sheet, PWA (Phase 2). Needs a phone playtest.
- Balance is simulated, not playtested: the curve is plausible (ending ≈ 10–12h active), but nobody has played past Act I by hand.
- Sound is synthesized and untested on iOS (the silent switch mutes Web Audio there).
- The service worker caches aggressively; after a deploy, a second reload may be needed to see it.
- ~~The Void robe is nearly invisible in the scene~~ → dark robes get a rim light (Phase 3)
- ~~The omen feed sits over the scene/header until you scroll~~ → it lives inside the app shell (Phase 2)
- ~~Photosensitivity: flash, shake and glitch~~ → reduced-motion setting, defaults to the OS preference (Phase 1)
- ~~Sanity drains while offline~~ → the mind rests while away (Phase 1)
- ~~No save versioning / export~~ → versioned saves, migrations, export/import (Phase 1)
- ~~Globals and load order, no tests~~ → ES modules + Vitest (Phase 1)
- ~~CRLF warnings~~ → `.gitattributes`

---

## Phase 1 — Foundation ✅ (2026-10-14)

- [x] Vite + ES modules (still no framework); CI runs tests, builds, and deploys `dist/`
- [x] Pure game logic split from the DOM: `core/` (no DOM, talks through an event bus) vs `ui/` vs `scene/`
- [x] Vitest: 53 tests covering costs, max-affordable, production, favor, summoning and pacts, tick/catch-up, omens, sanity, saves, formatting
- [x] Versioned save envelope + migration chain (v1 → v2); export/import string; corrupt saves are set aside instead of crashing
- [x] Settings (stored separately from the save): reduced motion (defaults to the OS preference), number notation, omen feed on/off
- [x] Offline fix: earning continues while away, but sanity holds and no madness fires; throttled background tabs use the same path
- [x] `.gitattributes`; saves on tab hide (mobile browsers often skip `beforeunload`)
- [x] Feedback quick fixes: omens from the top, second tap closes a tooltip
- [x] Dev tooling: `?admin&save=<export>` loads a save from the URL; `?admin=0` keeps the panel closed

## Phase 2 — Native-feel mobile UX ✅ (2026-10-14)

- [x] **Hold to chant:** the "Ceaseless Chant" rite (500 whispers, appears at 250 earned) lets you hold Chant for 8 chants/s. A one-time omen and a pulsing button teach it; floaters and haptics fire on every repeat.
- [x] **App shell, no page scroll:** fixed-viewport grid; only panels scroll; the scene folds into a strip of sky (the eye still watches) while you scroll a panel
- [x] **Bottom tab bar** (Ritual / Followers / Rites / Vessel) with a raised round Chant in the middle; the Grimoire and Settings are HUD icons. The Vessel is a tab now, not a modal.
- [x] **Always-visible HUD:** whispers (with count-up), rate, per-chant, a sanity ring, a Favor chip, a thin veil bar
- [x] **Tap-to-inspect bottom sheet** on touch (live, swipe down to close, with a buy button); hover tooltips stay on desktop. Rows split into an info side (inspect) and a price side (buy).
- [x] **PWA:** manifest, generated pixel-eye icons (`scripts/make-icons.mjs`), a service worker (network-first page, cache-first assets), standalone display
- [x] Haptics (`navigator.vibrate`, with a setting), count-up numbers, press states
- [x] Omen feed lives in the content area under the scene, never under the thumb; it clears when you open the Ritual tab
- Desktop (≥900px): the Ritual panel is a permanent left column under a wide Chant button; tabs sit on the right.

## Phase 3 — Act I depth: "The Cult" ✅ (2026-10-14)

- [x] 9 follower tiers (added Impossible Spire, Star Choir, Drowned Moon); milestones double a tier at 25 / 50 / 100 / 200 / 300 / 400 / 500 / 750 / 1000 owned
- [x] 33 rites: ×2 and ×3 per tier, six synergies (one tier feeds the next), chant rites, sanity rites, apparition rites
- [x] **Apparitions:** five kinds (wrong-colored star → Frenzy, shadow → whispers, mouth → Black Tongue, moth → sanity + Stillness, opening eye → Its Gaze). Drawn in the scene with a generous invisible tap target; buffs show as chips on the scene. Only while you watch.
- [x] **Revelations:** 42 achievements in the Vessel tab, +2% to everything each; new vestments unlock from them (Starlit Mantle, Pale Moth…)
- [x] **Madness questions:** 12 one-time questions (35% of episodes while any remain) answered in the Ritual tab; each answer leans you toward devotion, defiance or hunger
- [x] **Audio:** WebAudio only. A drone that rises with the veil and drops in key each act; breathy chant voices on a pentatonic scale; stings for summons, awakenings, apparitions, revelations, questions and endings. Sound/volume settings.
- [x] **Story:** 16 one-time story beats across all three acts; 18 lore fragments in the Grimoire's Lore section
- [x] Grimoire sections for every new system; Void robe gets a rim light (known issue fixed)
- Balance changes found by the simulator: sanity drain now eases toward a ceiling (4/s) instead of growing linearly; madness episodes are ~4× rarer; Favor uses a cube root (10 × ∛(earned ÷ 1B)); buff length from apparition power capped at ×2

## Phase 4 — Act II: "The Dreamer Stirs" ✅ (2026-10-14)

- [x] **Awakening** (after 3 summonings it appears; available at 150 Favor earned since the last waking): forgets Favor, Pacts, Ichor and Mutations; grants Elder Signs = 3 × √(Favor earned ÷ 150). Every sign ever earned adds +25% Favor gain.
- [x] **Sigils** (11, bought with Elder Signs, permanent): covenant/memory keep pacts, Ichor and apparition boosts, Favor ×2, everything ×3, and the automations
- [x] **Ichor**, the Act II mechanic: weeps from you below 50% sanity (faster deeper and louder), buys six levelled **Mutations**
- [x] **Trials** (5): Silence (no chant), Edge (sanity held at 10%), One Faith (one follower kind, all revealed), Faithless (no rites), Without Favor. Pass by earning the trial's goal in a run; the rule lifts and the run goes on. Permanent rewards.
- [x] Scene: the drowned city rises along the horizon, the sea comes in, the sky turns green, It grows more eyes; ichor drips from the Watcher at low sanity
- [x] **Automation:** auto-rites, auto-recruit, auto-Steady below a threshold, auto-summon at a Favor target (toggles in the Rites tab)

## Phase 5 — Act III: "It Wakes" ✅ (2026-10-14)

- [x] **The Seven Seals** (after the 3rd Awakening): each needs a feat within a run plus an offering (1e14 → 1e22). Flesh (1,000 followers), Voice (2,000 chants in a run), Stars (50 choirs), Mind (60s at 0% sanity), Blood (lose 50 followers to madness in a run), Sea (100 moons), and the Last Seal. Each broken seal doubles everything and cracks the sky.
- [x] **Finale and endings:** the Last Seal opens a full-screen choice. The road you leaned toward most is always open; others open at 3+ answers their way. Each ending plays as a 30-second sequence in the blown-up pixel scene (the eye opens and you rise / you draw the Elder Sign, the eye closes, dawn / you walk into the circle and It pours into you), with its lines underneath.
- [x] **Post-game:** New Game+ (start over with everything ×(1 + cycles), keep revelations, vestments and endings, and carry each ending's mark: Prophet = Favor ×3, Betrayer = half drain and free Steady Mind, Vessel = madness ×3) or **keep dreaming**: endless Depths, each ×3 to everything at ×1000 the cost
- Save format v3 (v2 saves fill in the new fields; tested)

### Balance (from `node scripts/simulate.mjs active|idle [hours]`)

An "active" bot (holds Chant a third of the time, catches most apparitions, answers at random) reaches, across runs:
first summon ≈ 1h · first Awakening ≈ 4h · Act III ≈ 6.5–7h · ending ≈ 10–12h. An idle bot (taps only to start each run)
is ~3× slower and stalls on the active seals (Voice), which is intended. Still to check by hand: the first 30 minutes feel slow for a
very active player, and late Act III Favor runs into the millions.

## Phase 6 — Polish and launch

- [ ] Onboarding: guided first five minutes with highlights, replacing the wall of text
- [ ] Art pass: sprite consistency, more idle animations, title art, favicon, Open Graph share image
- [ ] Performance on low-end phones: throttle the canvas when hidden or offscreen; profile the 50ms tick
- [x] Balance simulator script (`scripts/simulate.mjs`), done early in Phase 3; extend it with more play styles
- [ ] Distribution: custom domain, itch.io page; later, maybe a Capacitor wrapper for the app stores
- [ ] Optional: privacy-friendly analytics (or none) and a feedback link

---

## Open questions

Defaults were picked so work could continue; any of them can be changed.

- Target total playtime, and how idle versus active it should be? → *assumed 10–15h to the first ending, active-leaning (simulated ≈ 10–12h active)*
- Monetization: none, tip jar, or a premium store app later? → *assumed none for now*
- Art direction: stay with code-drawn pixel art, or bring in an artist for key pieces (title, ending)? → *still code-drawn*
- Final name: "The Summoning" vs something more searchable? → *unchanged*
- Is sound in scope for 1.0 or after? → *in: synthesized, on by default, with a setting*

## Session log

- **2026-10-14:** v0.1 built from zero in one session: core loop, prestige, sanity, scene, vessel, guide, mobile pass, deploy.
- **2026-10-14 (later):** Phase 1 foundation: Vite/ES modules, 53 tests, versioned saves with export/import, settings, offline fix, playtest fixes.
- **2026-10-14 (night):** Phases 2–5 in one push: native-feel shell + PWA, Act I depth, Act II (Awakening, Ichor, Trials, automation), Act III (seals, three endings, NG+, endless). 92 tests. Balance tuned with a new simulator. Not yet played on a phone.
