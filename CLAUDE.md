# The Summoning — notes for Claude

An incremental/idle game. Plain HTML/CSS/JS in `src/`, no build step yet. Live at
https://tvck3r.github.io/eldritch-idle/. Plans and priorities: **read `ROADMAP.md` first.**

## Commands

- `pnpm dev`: serve `src/` at http://localhost:5173
- `pnpm check`: syntax-check every script and verify `index.html` references (CI runs this)
- Push to `main` → CI check → deploy `src/` to GitHub Pages (`.github/workflows/deploy.yml`)

## Architecture

Classic `<script>` tags sharing globals. **Load order matters** (see the bottom of `index.html`):
`game.js` → `vessel.js` → `scene.js` → `ui.js` → `main.js` → `admin.js`.
`main.js` holds the boot code (event wiring + `setInterval(tick)`) and must load last.

- **Content is data.** Followers, rites, pacts, omens, madness events and cosmetics are arrays at the top of
  `game.js` / `vessel.js`. Add content by adding entries; avoid special-casing in the logic.
- `state` is the only saved object. Keys that survive a summoning are listed in `PERSIST` (game.js).
  New nested objects need an explicit merge in `load()`.
- `fx` holds transient visual signals (chant pulse, flash, summon start) that `scene.js` reads.
- `scene.js` draws on a 320×100 canvas scaled with `image-rendering: pixelated`, and never mutates state.
- Sprites are text grids (letter → color) baked by `bake()` in `vessel.js`.
- `log(msg)` dispatches an `omen` DOM event; `ui.js` listens for it to drive the mobile omen feed.
- Tooltips: add `data-tip="key"` and a matching entry in `TIPS` (ui.js). Prefixed keys like `gen:<id>` are supported.
  Don't use `disabled` on elements that need tooltips (some browsers drop mouse events); use a class instead.

## Testing visually (Windows, headless Edge)

- `msedge --headless=new --screenshot=out.png --window-size=W,H --virtual-time-budget=1500 file:///page.html`
- To set up a game state, copy `index.html` to a scratch file, rewrite script paths to absolute `file:///` URLs,
  and inject a `<script>` right after `game.js` that mutates `state`.
- **Headless Edge won't lay out narrower than ~477px.** For real phone widths, load the page inside a
  `<iframe width="390">` and screenshot the wrapper.
- **CSS animations freeze under `--virtual-time-budget`,** and `animationend` never fires. Check animation-driven
  logic with `--dump-dom` instead of screenshots.

## Conventions

- pnpm only. Conventional commits with scope, e.g. `feat(mobile):`, `fix(scene):`, `chore(ci):`.
- Mobile-first: anything new must work at 390px with touch. The breakpoint is `max-width: 700px`.
- Keep the voice: UI copy is in-world and ominous, but mechanics text stays plain and exact.
