# The Summoning

An incremental game about waking something that should stay asleep.

**Play:** https://tvck3r.github.io/eldritch-idle/

## Development

Vanilla JavaScript (ES modules) built with Vite. Game logic is tested with Vitest.

```sh
pnpm install
pnpm dev       # http://localhost:5173 (also reachable from a phone on your Wi-Fi)
pnpm test      # core logic tests
pnpm build     # production build → dist/
```

In-game, press <kbd>`</kbd> (or add `?admin` to the URL) for the admin/cheat panel.

See [`ROADMAP.md`](ROADMAP.md) for where the game is headed and [`CLAUDE.md`](CLAUDE.md) for architecture notes.

## Layout

| Path | Purpose |
|---|---|
| `src/core/` | Game rules, content data (three acts), state, saves. No DOM; covered by tests |
| `src/ui/` | App shell, rendering, inspection sheet/tooltips, acts panels, audio, endings, Grimoire, settings |
| `src/scene/` | Pixel-art ritual scene (every act and ending) and the player's Vessel |
| `src/public/` | PWA manifest, icons, service worker |
| `src/main.js` | Boot and game loop |
| `src/admin.js` | Dev cheats |
| `scripts/` | Icon generator; balance simulator (`node scripts/simulate.mjs active 20`) |

## Deploy

Every push to `main` runs the tests, builds, and publishes `dist/` to GitHub Pages via
`.github/workflows/deploy.yml`. Pull requests run tests and build only.
