# The Summoning

An incremental game about waking something that should stay asleep.

**Play:** https://tvck3r.github.io/eldritch-idle/

## Development

No build step: the game is plain HTML/CSS/JS in `src/`.

```sh
pnpm install
pnpm dev      # serves src/ at http://localhost:5173
pnpm check    # syntax-checks scripts and verifies index.html references
```

Press <kbd>`</kbd> in-game (or add `?admin` to the URL) for the admin/cheat panel.

## Layout

| File | Purpose |
|---|---|
| `src/game.js` | Data (followers, rites, pacts, omens), state, core logic, render |
| `src/vessel.js` | Player avatar: cosmetics data, unlocks, sprite compositing |
| `src/scene.js` | Pixel-art ritual scene on a low-res canvas |
| `src/ui.js` | Tooltips, title screen, Grimoire, wardrobe |
| `src/main.js` | Boot: event wiring and game loop (loads last) |
| `src/admin.js` | Dev cheats — delete to remove |

## Deploy

Every push to `main` runs `pnpm check`, then publishes `src/` to GitHub Pages
via `.github/workflows/deploy.yml`. Pull requests run the check only.
