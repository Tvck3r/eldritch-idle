# Roadmap — The Summoning

_Last updated: 2026-10-14_

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

## Known issues and debt

- **Mobile UX still doesn't feel native** (player feedback): you can't see sanity at a glance, tooltips are awkward on touch, there's too much scrolling.
- **Photosensitivity:** the summon flash, the red madness flashes and the screen shake need a reduced-motion setting, and they should respect `prefers-reduced-motion`.
- Sanity drains while offline, so returning players land at 0% with constant events. Pause the drain or set a floor while offline.
- No save versioning or migrations yet (`load()` only does a shallow merge). Export/import is missing.
- Scripts share globals in load order; there are no modules and no tests.
- Balance is untested past the first summon. The Favor formula and the cost curve are placeholders.
- The Void robe is nearly invisible in the scene (needs an outline or rim light).
- CRLF warnings on every commit (add `.gitattributes`).

---

## Phase 1 — Foundation (1 session, recommended next)

Do this before the UX overhaul so the UI only gets rewritten once.

- [ ] Vite + ES modules (keep the no-framework approach); CI runs `pnpm build` and deploys `dist/`
- [ ] Split pure game logic from the DOM: `core/` (state, math, data) vs `ui/` (render, input) vs `scene/`
- [ ] Vitest for the core math: costs, max-affordable, favor gain, offline progress, save migrations
- [ ] Versioned save schema + migration chain; export/import save string; corrupt-save recovery
- [ ] Settings model: reduced motion, number notation (suffix/scientific), feed on/off
- [ ] `.gitattributes`, and fix offline sanity

## Phase 2 — Native-feel mobile UX

Fold in the player's UX notes when they arrive.

- [ ] **App shell, no page scroll:** fixed-viewport layout; the scene collapses to a strip when the player scrolls inside a panel
- [ ] **Bottom tab bar** (Ritual / Followers / Rites / Vessel / Grimoire) with chant as a central action
- [ ] **Always-visible HUD:** whispers, rate, sanity (ring or bar), Favor; everything you need at a glance
- [ ] **Tap-to-inspect bottom sheet** instead of hover tooltips on touch; hover tooltips stay on desktop
- [ ] **PWA:** manifest, icons, service worker, `display: standalone`, so it can be added to the home screen and open fullscreen
- [ ] Haptics (Android `navigator.vibrate`), animated number count-ups, press states
- [ ] Reduced-motion mode wired into the scene (no flash, no shake, gentler glitch)

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
