// ============================================================
// VESSEL — the player's avatar. Purely cosmetic.
// Each slot's options unlock via achievements; add more freely.
// Sprites are text grids: each letter maps to a color in `colors`,
// '.' is transparent.
// ============================================================

// Turn a text-grid sprite into a tiny canvas
function bake(rows, colors) {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); }
  }));
  return c;
}

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

const COSMETICS = {
  robe: [
    { id: 'plain', name: 'Novice Robe', free: true,
      colors: { o: '#4a4258', d: '#2f2a3a', t: '#7a6f8f' } },
    { id: 'crimson', name: 'Crimson Vestments', hint: 'Command 25 Cultists at once.',
      unlock: s => s.owned.cultist >= 25, colors: { o: '#8a1f33', d: '#5c1222', t: '#d8b04a' } },
    { id: 'abyssal', name: 'Abyssal Silk', hint: 'Raise a Drowned Temple.',
      unlock: s => s.owned.temple >= 1, colors: { o: '#14505c', d: '#0b2f37', t: GLOW } },
    { id: 'void', name: 'Robe of the Void', hint: 'Summon It.',
      unlock: s => s.summonings >= 1, colors: { o: '#16101f', d: '#08060d', t: '#8f4fd6' } },
    { id: 'yellow', name: 'Tattered Yellow', hint: 'Summon It three times.',
      unlock: s => s.summonings >= 3, colors: { o: '#b89b2e', d: '#7a6418', t: '#3a2a08' } },
  ],
  mask: [
    { id: 'none', name: 'Bare Hood', free: true, rows: [] },
    { id: 'bone', name: 'Bone Mask', hint: 'Chant 500 times.',
      unlock: s => s.stats.chants >= 500,
      colors: { w: '#d8d0b8', e: GLOW },
      rows: ['.........', '.........', '.........', '.........', '.........',
             '...www...', '..wewew..', '..wwwww..', '...www...'] },
    { id: 'goat', name: 'Goat Skull', hint: 'Draw 10 Ritual Circles.',
      unlock: s => s.owned.circle >= 10,
      colors: { h: '#6b5a44', w: '#d8d0b8', e: '#ff5b6e', k: '#050308' },
      rows: ['h.......h', 'hh.....hh', '.hh...hh.', '..hwwwh..', '...www...',
             '..wewew..', '..wwwww..', '...wkw...', '...www...'] },
    { id: 'squid', name: 'Tentacled Visage', hint: 'Tear the veil.',
      unlock: s => s.lifetimeEarned >= VEIL_GOAL,
      colors: { g: '#3f7a5c', e: '#d8d29a' },
      rows: ['.........', '.........', '.........', '.........', '.........',
             '..ggggg..', '..gegeg..', '..ggggg..', '..g.g.g..', '..g.g.g..', '.g..g..g.'] },
    { id: 'eyes', name: 'Crown of Eyes', hint: 'Let your sanity reach zero.',
      unlock: s => s.stats.minSanity <= 0,
      colors: { r: '#ff5b6e' },
      rows: ['..r.r.r..', '.r.....r.', '.........', '...rrr...', '..r...r..'] },
  ],
  relic: [
    { id: 'none', name: 'Empty Hands', free: true },
    { id: 'candle', name: 'Black Candle', hint: 'Earn 1,000 whispers in total.',
      unlock: s => s.lifetimeEarned >= 1000, anchor: [1, 5],
      colors: { f: '#ff9b3b', y: '#ffd76b', k: '#1a1420' },
      rows: ['.f.', '.y.', '.k.', '.k.', '.k.', '.k.'] },
    { id: 'book', name: 'The Unnamed Text', hint: 'Build 5 Forbidden Libraries.',
      unlock: s => s.owned.library >= 5, anchor: [1, 3],
      colors: { b: '#4a2c1a', p: '#c9b88a', e: GLOW },
      rows: ['bbbbb', 'bpppb', 'bpepb', 'bbbbb'] },
    { id: 'dagger', name: 'Ritual Dagger', hint: 'Endure 5 episodes of madness.',
      unlock: s => s.stats.madnessEvents >= 5, anchor: [1, 5],
      colors: { m: '#c0c8d0', h: '#3a2a20', r: '#b3263e' },
      rows: ['.m.', '.m.', '.r.', '.m.', 'hhh', '.h.', '.h.'] },
    { id: 'staff', name: 'Staff of the Deep', hint: 'Perform every Rite in a single run.',
      unlock: s => s.upgrades.length >= UPGRADES.length, anchor: [1, 8],
      colors: { g: '#3a1f5c', e: GLOW, s: '#5a4030' },
      rows: ['.g.', 'geg', '.g.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.'] },
  ],
  familiar: [
    { id: 'none', name: 'Alone', free: true },
    { id: 'rat', name: 'Whispering Rat', hint: 'Gather 50 Acolytes.', ground: true,
      unlock: s => s.owned.acolyte >= 50,
      colors: { r: '#5a5060', e: GLOW },
      frames: [['r....rr.', '.rrrrrer', '..r..r..'], ['r....rr.', '.rrrrrer', '.r....r.']] },
    { id: 'crow', name: 'Crow of Ill Omen', hint: 'Witness every omen.',
      unlock: s => s.omensSeen >= OMENS.length,
      colors: { k: '#1c1824', e: '#ff5b6e' },
      frames: [['k...k', 'kk.kk', '.kek.', '..k..'], ['.....', 'kkekk', 'k.k.k', '..k..']] },
    { id: 'eye', name: 'Floating Eye', hint: 'Seal a Pact.',
      unlock: s => s.pacts.length >= 1,
      colors: { p: '#3a1f5c', w: '#d8d29a', e: GLOW },
      frames: [['.ppp.', 'pwewp', '.ppp.'], ['.ppp.', 'pewwp', '.ppp.']] },
    { id: 'spawn', name: 'Star Spawnling', hint: 'Seal every Pact.',
      unlock: s => s.pacts.length >= PACTS.length,
      colors: { g: '#3f7a5c', e: '#d8d29a' },
      frames: [['.ggg.', 'gegeg', 'ggggg', 'g.g.g'], ['.ggg.', 'gegeg', 'ggggg', '.g.g.']] },
  ],
};
const SLOT_NAMES = { robe: 'Robe', mask: 'Mask', relic: 'Relic', familiar: 'Familiar' };

// ---------- unlocks ----------

function cosmetic(slot, id) { return COSMETICS[slot].find(o => o.id === id) || COSMETICS[slot][0]; }

function isUnlocked(slot, id) {
  const o = cosmetic(slot, id);
  return o.free || state.cosmetics.unlocked.includes(`${slot}:${id}`);
}

function checkCosmetics() {
  for (const slot in COSMETICS) for (const o of COSMETICS[slot]) {
    if (o.free || isUnlocked(slot, o.id) || !o.unlock(state)) continue;
    state.cosmetics.unlocked.push(`${slot}:${o.id}`);
    state.cosmetics.unseen = true;
    log(`Your vessel may now bear: ${o.name}.`);
  }
}

function equip(slot, id) {
  if (isUnlocked(slot, id)) state.cosmetics.equipped[slot] = id;
}

// ---------- drawing ----------

const spriteCache = new Map();
function cached(key, make) {
  if (!spriteCache.has(key)) spriteCache.set(key, make());
  return spriteCache.get(key);
}

// Draw the vessel with its feet at (x, bottom). `look` overrides equipped items (wardrobe preview).
function drawVessel(g, x, bottom, t, armsUp, look = state.cosmetics.equipped) {
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
    const fx_ = fam.ground ? ox - 9 : ox - 6 + Math.round(Math.sin(t * 0.9) * 2);
    const fy = fam.ground ? bottom - img.height : oy + 4 + Math.round(Math.sin(t * 2.3) * 2);
    g.drawImage(img, fx_, fy);
  }
}
