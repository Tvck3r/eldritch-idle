// ============================================================
// VESSEL — draws the player's avatar from the equipped cosmetics.
// Wardrobe data and unlock rules live in core/cosmetics.js.
// ============================================================
import { cosmetic } from '../core/cosmetics.js';
import { state } from '../core/state.js';
import { bake, cached } from './sprites.js';

const GLOW = '#7dffb0';

// Layout of the 17x27 vessel canvas
const VESSEL_W = 17, VESSEL_H = 27;
const HEAD_X = 5, HEAD_Y = 3;   // 7x7 hood
const BODY_Y = 9;               // robe starts here
const MASK_X = 4, MASK_Y = 0;   // 9-wide mask overlay; row 3 lines up with the top of the hood

const HOOD = [
  '..ooo..',
  '.oooodd',
  'ooxxxdd',
  'oxexexd',
  'oxxxxxd',
  'ooxxxdd',
  '.ooood.',
];

// Robe half-widths per row, top to bottom (center column is 8)
const ROBE_PROFILE = [4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8];

// Build robe rows procedurally so both poses stay in sync
function robeRows(armsUp) {
  const rows = Array.from({ length: VESSEL_H }, () => Array(VESSEL_W).fill('.'));
  ROBE_PROFILE.forEach((hw, r) => {
    const y = BODY_Y + r;
    for (let x = 8 - hw; x <= 8 + hw; x++)
      rows[y][x] = x === 8 ? 't' : x >= 8 + hw - 1 ? 'd' : 'o';
  });
  if (armsUp) {
    // sleeves rising beside the hood, hands above the shoulders
    for (const [x, y, c] of [[3, 9, 'o'], [2, 8, 'o'], [2, 7, 's'], [13, 9, 'd'], [14, 8, 'd'], [14, 7, 's']]) rows[y][x] = c;
  } else {
    for (const [x, y, c] of [[3, 14, 'o'], [2, 15, 's'], [13, 14, 'd'], [14, 15, 's']]) rows[y][x] = c;
  }
  return rows.map(r => r.join(''));
}
// Where the right hand is in each pose — relics attach here
const HAND = { down: [14, 15], up: [14, 7] };

// Draw the vessel with its feet at (x, bottom). `look` overrides equipped items (wardrobe preview).
export function drawVessel(g, x, bottom, t, armsUp, look = state.cosmetics.equipped) {
  const robe = cosmetic('robe', look.robe), mask = cosmetic('mask', look.mask);
  const relic = cosmetic('relic', look.relic), fam = cosmetic('familiar', look.familiar);
  const ox = Math.round(x - VESSEL_W / 2), oy = Math.round(bottom - VESSEL_H);
  const robeColors = { ...robe.colors, x: '#050308', e: GLOW, s: '#c9b8a8' };

  g.drawImage(cached(`body:${robe.id}:${armsUp}`, () => bake(robeRows(armsUp), robeColors)), ox, oy);
  g.drawImage(cached(`hood:${robe.id}`, () => bake(HOOD, robeColors)), ox + HEAD_X, oy + HEAD_Y);
  if (mask.rows.length) g.drawImage(cached(`mask:${mask.id}`, () => bake(mask.rows, mask.colors)), ox + MASK_X, oy + MASK_Y);

  if (relic.rows) {
    const [hx, hy] = armsUp ? HAND.up : HAND.down;
    g.drawImage(cached(`relic:${relic.id}`, () => bake(relic.rows, relic.colors)), ox + hx - relic.anchor[0], oy + hy - relic.anchor[1]);
    if (relic.id === 'candle' && Math.sin(t * 13) > 0.3) { g.fillStyle = '#ffd76b'; g.fillRect(ox + hx, oy + hy - relic.anchor[1] - 1, 1, 1); }
  }

  if (fam.frames) {
    const f = Math.floor(t * 4) % 2;
    const img = cached(`fam:${fam.id}:${f}`, () => bake(fam.frames[f], fam.colors));
    const fx = fam.ground ? ox - 9 : ox - 6 + Math.round(Math.sin(t * 0.9) * 2);
    const fy = fam.ground ? bottom - img.height : oy + 4 + Math.round(Math.sin(t * 2.3) * 2);
    g.drawImage(img, fx, fy);
  }
}
