# Roadmap — The Summoning

_Last updated: 2026-10-14 (Phase 1 complete)_

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

- **Mobile UX still doesn't feel native** (see the feedback log) → Phase 2
- Balance is untested past the first summon. The Favor formula and the cost curve are placeholders.
- The Void robe is nearly invisible in the scene (needs an outline or rim light).
- The omen feed sits over the scene/header until you scroll (it's anchored under the pinned whispers bar). The Phase 2 app shell resolves this.
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

## Phase 2 — Native-feel mobile UX (next)

Check the feedback log above before starting.

- [ ] **Hold to chant** — an early, cheap Rite ("Ceaseless Chant", ~500 whispers) that lets you hold the Chant button to chant ~8×/s. Teach it with a one-time hint. Make sure it plays well with haptics and the floaters.
- [ ] **App shell, no page scroll:** fixed-viewport layout; the scene collapses to a strip when the player scrolls inside a panel
- [ ] **Bottom tab bar** (Ritual / Followers / Rites / Vessel / Grimoire) with chant as a central action
- [ ] **Always-visible HUD:** whispers, rate, sanity (ring or bar), Favor; everything you need at a glance
- [ ] **Tap-to-inspect bottom sheet** instead of hover tooltips on touch; hover tooltips stay on desktop. A tap on a row's info area inspects it; a tap on its buy area buys. No more long-press guessing.
- [ ] **PWA:** manifest, icons, service worker, `display: standalone`, so it can be added to the home screen and open fullscreen
- [ ] Haptics (Android `navigator.vibrate`), animated number count-ups, press states
- [ ] Omen feed placement inside the app shell (top, under the HUD; never under the thumb)

## Phase 3 — Act I depth: "The Cult" (runs 1–5)

- [ ] 8–10 follower tiers; milestone bonuses at 25 / 50 / 100 / 200 owned
- [ ] ~30 rites, including synergies between tiers ("Cultists boost Circles +1% each")
- [ ] **Apparitions:** tappable things that appear in the scene (a wrong-colored star, a shadow at the circle's edge) and grant short buffs; this is the active-play hook for mobile
- [ ] **Revelations (achievements):** these feed the cosmetic unlocks and the Grimoire lore
- [ ] **Madness choices:** some events become two-option prompts ("A voice offers you a name. Speak it?")
- [ ] **Audio:** an ambient drone that grows heavier as the veil thins, chant voices, a summon sting (WebAudio, synthesized first)
- [ ] **Story arc through omens;** lore fragments collected in the Grimoire

## Phase 4 — Act II: "The Dreamer Stirs" (layer 2)

- [ ] Second prestige: **Awakening**. It resets Favor and Pacts for a new currency (working name: Elder Signs)
- [ ] A new mechanic that only exists in Act II (candidates: star alignments on a timer, an Ichor resource, territory/domains)
- [ ] **Challenges:** runs under constraints (no chanting, sanity locked at 10%, a single follower type) that reward permanent bonuses
- [ ] The scene changes biome (the drowned city rises); the Watcher becomes more of It
- [ ] Automation unlocks (auto-rites, auto-summon at threshold) so earlier layers don't become a chore

## Phase 5 — Act III: "It Wakes" (layer 3 and ending)

- [ ] Final layer and ending sequence played out in the pixel scene
- [ ] **Multiple endings** driven by earlier choices: become Its prophet, betray It, become It
- [ ] Post-game: an endless mode or NG+ with ending-specific modifiers

## Phase 6 — Polish and launch

- [ ] Onboarding: guided first five minutes with highlights, replacing the wall of text
- [ ] Art pass: sprite consistency, more idle animations, title art, favicon, Open Graph share image
- [ ] Performance on low-end phones: throttle the canvas when hidden or offscreen; profile the 50ms tick
- [ ] Balance simulator script: time-to-veil and time-to-ending curves across play styles
- [ ] Distribution: custom domain, itch.io page; later, maybe a Capacitor wrapper for the app stores
- [ ] Optional: privacy-friendly analytics (or none) and a feedback link

---

## Open questions

- Target total playtime, and how idle versus active it should be?
- Monetization: none, tip jar, or a premium store app later?
- Art direction: stay with code-drawn pixel art, or bring in an artist for key pieces (title, ending)?
- Final name: "The Summoning" vs something more searchable?
- Is sound in scope for 1.0 or after?

## Session log

- **2026-10-14:** v0.1 built from zero in one session: core loop, prestige, sanity, scene, vessel, guide, mobile pass, deploy.
- **2026-10-14 (later):** Phase 1 foundation: Vite/ES modules, 53 tests, versioned saves with export/import, settings, offline fix, playtest fixes.
