# The Summoning — notes for Claude

An incremental/idle game: vanilla JS (ES modules) + Vite, no UI framework. Live at
https://tvck3r.github.io/eldritch-idle/. Plans, priorities and the **player feedback log** are in
`ROADMAP.md`. **Read it first.**

## Commands

- `pnpm dev`: Vite dev server at http://localhost:5173 (also on your LAN, so you can open it on a phone)
- `pnpm test`: Vitest (core logic). `pnpm test:watch` while working.
- `pnpm build` / `pnpm preview`: production build to `dist/`, served at :4173
- `pnpm check`: tests + build (what CI runs)
- Push to `main` → CI (test, build) → deploy `dist/` to GitHub Pages. PRs run test + build only.

## Architecture (`src/`)

```
core/        game rules. NO DOM: must run in Node (tests).
  constants.js   tuning numbers (veil goal, sanity rates…)
  content.js     followers, rites, pacts, madness events, omens: content is DATA
  cosmetics.js   vessel wardrobe data + unlock rules
  state.js       freshState(), PERSIST, `state` (live binding), setState(), fx, runtime
  economy.js     every rule: production, costs, buying, summoning, tick(), catchUp()
  save.js        versioned envelope, MIGRATIONS, load/save, export/import
  settings.js    player prefs (separate storage key from the save)
  events.js      tiny bus: 'log', 'summoned', 'state-replaced', 'settings'
  format.js      number formatting
ui/          DOM: render.js (every tick), tooltips, modal, grimoire, wardrobe, mobile (tabs/feed), settings-panel, intro
scene/       canvas: scene.js (320×100, pixelated), vessel.js (avatar), sprites.js (bake text-grid sprites)
admin.js     dev cheats (` key or ?admin)
main.js      boot: load settings + save, init UI, game loop
```

Rules of the road:
- **Add content by adding data** to `content.js` / `cosmetics.js`; avoid special-casing in logic.
- **core never touches the DOM.** Announce via `emit('log', msg)` and friends; ui subscribes with `on(...)`.
- `state` is an ES live binding. Mutate fields freely, but replace it wholesale only via `setState()`
  (which emits `state-replaced`, so the UI rebuilds its lists).
- Keys that survive a summoning are in `PERSIST` (state.js).
- **Changing the save shape?** Bump `SAVE_VERSION` in `save.js`, add `MIGRATIONS[old]`, and add a test in `save.test.js`.
  Nested objects that gain fields also need a merge line in `normalize()`.
- Tooltips: add `data-tip="key"` and a `TIPS` entry (ui/tooltips.js). Elements that need tooltips must not be
  `disabled` (some browsers drop pointer events); use a class like `.cant`.
- Anything visual must respect `settings.reducedMotion` (scene: no shake, glitch or full flash; CSS: `body.reduced-motion`).
- Tests live next to the code as `src/core/*.test.js`. Write tests for new rules.

## Testing visually (Windows, headless Edge)

- Serve a real build: `pnpm build && pnpm preview` (run it in the background), then
  `msedge --headless=new --screenshot=out.png --window-size=W,H --virtual-time-budget=2500 "http://localhost:4173/..."`
- **Set up game state with a URL:** generate a save in Node with the real core modules
  (`setState(...)`, then `encodeURIComponent(exportSave())`), and open `/?admin=0&save=<that>`.
  `?admin=0` keeps the cheat panel closed.
- **Phone widths:** headless Edge won't lay out narrower than ~477px. Put a page in `dist/` (gitignored, same origin)
  that loads the game in `<iframe width="390">`. Being same-origin, it can also *drive* the game
  (`iframe.contentWindow.document...click()`) and print results.
- **CSS animations freeze under `--virtual-time-budget`** and `animationend` never fires, so check animation-driven
  logic with `--dump-dom` or via the harness, not by eye.

## Conventions

- pnpm only. Conventional commits with scope, e.g. `feat(mobile):`, `fix(core):`, `chore(ci):`.
- Work on a branch and open a PR. `main` deploys straight to the live site.
- Mobile-first: anything new must work at 390px with touch. The breakpoint is `max-width: 700px`.
- Voice: UI copy is in-world and ominous, but mechanics text stays plain and exact.
