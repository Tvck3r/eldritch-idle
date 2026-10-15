// ============================================================
// SCENE — pixel-art ritual drawn on a low-res canvas, scaled up crisp.
// Reads `state`, `fx`, and helpers from game.js; never mutates game state.
// ============================================================

const W = 320, H = 100;
const HORIZON = 55;
const CX = 160, CY = 78;          // summoning circle center

const canvas = document.getElementById('scene');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

const PAL = {
  skyTop: '#05040a', skyBot: '#1a1129', ground: '#0e0b16', groundLine: '#1e1830',
  accent: '#7dffb0', purple: '#3a1f5c', purpleHi: '#6b3fa0',
  sclera: '#d8d29a', vein: '#a8573f', pupil: '#050308',
  building: '#0b0812', water: '#0d2230', waterHi: '#1f4a5c', stone: '#2a2a33',
  book: '#4a2c1a', page: '#c9b88a',
};

// ---------- sprites ----------
// o = robe, d = robe shade, x = hood shadow, e = glowing eyes
const HOOD_DOWN = [
  '...ooo...',
  '..ooood..',
  '..oxxxd..',
  '..oexed..',
  '..ooood..',
  '.ooooodd.',
  '.ooooodd.',
  '.ooooodd.',
  'ooooooddd',
  'ooooooddd',
];
const HOOD_UP = [
  'o..ooo..d',
  'o.ooood.d',
  'o.oxxxd.d',
  'oooexeddd',
  '.ooooodd.',
  '..ooodd..',
  '..ooodd..',
  '.ooooodd.',
  'ooooooddd',
  'ooooooddd',
];

// Robed follower types shown standing around the circle
const FIGURES = [
  { gen: 'acolyte', robe: '#5a5270', shade: '#3d3750', max: 8 },
  { gen: 'cultist', robe: '#8a1f33', shade: '#5c1222', max: 8 },
];

// bake() lives in vessel.js
for (const f of FIGURES) {
  const colors = { o: f.robe, d: f.shade, x: '#050308', e: PAL.accent };
  f.frames = [bake(HOOD_DOWN, colors), bake(HOOD_UP, colors)];
}

// ---------- seeded scenery ----------
function rng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(666);
const STARS = Array.from({ length: 70 }, () => ({ x: rand() * W | 0, y: rand() * (HORIZON - 5) | 0, p: rand() * 6.28 }));
const BUILDINGS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 11.5 + rand() * 6) | 0, w: 5 + (rand() * 6 | 0), h: 6 + (rand() * 18 | 0), lit: rand(),
})).sort(() => rand() - 0.5); // shuffled so new buildings appear scattered
const TENTACLES = Array.from({ length: 9 }, (_, i) => ({ dx: (i - 4) * 7 + (rand() * 4 - 2), p: rand() * 6.28, s: 0.8 + rand() * 0.6 }));

// ---------- helpers ----------
const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
const ease = t => 1 - Math.pow(1 - t, 3);

let lookX = 0;
window.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  lookX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
});

function drawEye(ex, ey, w, h, open) {
  if (open <= 0.02) { ctx.fillStyle = PAL.purpleHi; ctx.fillRect(ex - w, ey, w * 2, 1); return; }
  const ix = lookX * w * 0.45, ir = h * 0.85;
  for (let x = -w; x <= w; x++) {
    const lens = h * open * (1 - (x / w) ** 2);
    for (let y = -Math.ceil(lens) - 1; y <= Math.ceil(lens) + 1; y++) {
      const ay = Math.abs(y);
      if (ay > lens + 1) continue;
      if (ay > lens) { px(ex + x, ey + y, PAL.purple); continue; }          // eyelid rim
      const dx = x - ix, d = Math.hypot(dx, y);
      let c = (x + y * 3) % 7 === 0 && Math.abs(x) > w * 0.6 ? PAL.vein : PAL.sclera;
      if (d < ir) c = Math.abs(dx) < Math.max(1, ir * 0.22) ? PAL.pupil : PAL.accent;
      px(ex + x, ey + y, c);
    }
  }
}

// ---------- particles (rising whispers) ----------
const motes = [];
let moteAcc = 0;
function spawnMote(from) {
  motes.push({ x0: from.x, y0: from.y, x: from.x, y: from.y, t: 0, life: 1 + Math.random() * 0.6, w: Math.random() * 6.28 });
}

// ---------- main draw ----------
let last = performance.now();
let prevChant = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  const pct = veilPct();
  const summonP = fx.summonStart ? Math.min(1, (now - fx.summonStart) / SUMMON_MS) : 0;

  ctx.save();
  if (summonP) ctx.translate((Math.random() - 0.5) * summonP * 6 | 0, (Math.random() - 0.5) * summonP * 4 | 0);

  // sky — reddens as the veil thins
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, PAL.skyTop);
  sky.addColorStop(1, pct > 0.7 ? `rgb(${40 + (pct - 0.7) * 150 | 0},17,41)` : PAL.skyBot);
  ctx.fillStyle = sky; ctx.fillRect(-4, -4, W + 8, HORIZON + 4);

  for (const s of STARS) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + s.p));
    ctx.globalAlpha = a * (1 - pct * 0.6); px(s.x, s.y, '#c9c2d9');
  }
  ctx.globalAlpha = 1;

  // the Watcher — appears after your first summoning, follows the cursor, blinks
  if (state.summonings > 0 && !summonP) {
    const w = 10 + Math.min(state.summonings, 6) * 2;
    const blink = (t % 6) < 0.15 ? 0 : 1;
    drawEye(CX, 16, w, w * 0.4, blink * (0.85 + 0.15 * Math.sin(t)));
  }

  // Dreaming City — skyline grows with count
  const nb = Math.min(BUILDINGS.length, state.owned.city * 2);
  for (let i = 0; i < nb; i++) {
    const b = BUILDINGS[i];
    ctx.fillStyle = PAL.building; ctx.fillRect(b.x, HORIZON - b.h, b.w, b.h);
    for (let wy = HORIZON - b.h + 2; wy < HORIZON - 1; wy += 3)
      for (let wx = b.x + 1; wx < b.x + b.w - 1; wx += 2)
        if (Math.sin(wx * 13.1 + wy * 7.7 + Math.floor(t * 0.5 + b.lit * 9)) > 0.55) px(wx, wy, PAL.accent);
  }

  // ground
  ctx.fillStyle = PAL.ground; ctx.fillRect(-4, HORIZON, W + 8, H - HORIZON + 4);
  ctx.fillStyle = PAL.groundLine; ctx.fillRect(-4, HORIZON, W + 8, 1);

  // Drowned Temple — water pools on the flanks with sunken pillars
  if (state.owned.temple > 0) {
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 0 : W - 70;
      ctx.fillStyle = PAL.water; ctx.fillRect(x0, HORIZON + 1, 70, 12);
      for (let i = 0; i < 18; i++) {
        const wx = x0 + ((i * 17 + t * 6 * side) % 70 + 70) % 70;
        px(wx, HORIZON + 2 + (i % 5) * 2, PAL.waterHi);
      }
      const n = Math.min(5, state.owned.temple);
      for (let i = 0; i < n; i++) {
        const x = side < 0 ? 8 + i * 13 : W - 12 - i * 13, h = 10 + ((i * 7) % 9);
        ctx.fillStyle = PAL.stone; ctx.fillRect(x, HORIZON + 6 - h, 3, h);
        ctx.fillRect(x - 1, HORIZON + 6 - h, 5, 1);
      }
    }
  }

  // summoning circle
  const glow = Math.min(1, 0.25 + pct * 0.5 + fx.chant * 0.4 + summonP);
  ctx.fillStyle = `rgba(125,255,176,${0.06 + glow * 0.18})`;
  ctx.beginPath(); ctx.ellipse(CX, CY, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.4 + glow * 0.6;
  for (let a = 0; a < 6.28; a += 0.04) px(CX + Math.cos(a) * 40, CY + Math.sin(a) * 10, PAL.accent);
  for (let a = 0; a < 6.28; a += 0.06) px(CX + Math.cos(a) * 28, CY + Math.sin(a) * 7, PAL.accent);
  // Ritual Circle — runes light up around the ring
  const runes = Math.min(24, state.owned.circle * 2);
  for (let i = 0; i < runes; i++) {
    const a = (i / 24) * 6.28 + t * 0.15;
    const rx = CX + Math.cos(a) * 34, ry = CY + Math.sin(a) * 8.5;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
    px(rx, ry, '#ffffff'); px(rx + 1, ry, PAL.accent);
  }
  ctx.globalAlpha = 1;

  // figure positions around the circle
  const figs = [];
  for (const f of FIGURES) for (let i = 0; i < Math.min(f.max, state.owned[f.gen]); i++) figs.push(f);
  const placed = figs.map((f, i) => {
    const a = (i / figs.length) * 6.28 + 0.3;
    return { f, i, x: CX + Math.cos(a) * 58, y: CY + Math.sin(a) * 15, back: Math.sin(a) < 0 };
  });
  const drawFig = p => {
    const up = fx.chant > 0.3 || summonP > 0 || Math.sin(t * 2.2 + p.i * 1.7) > 0.75;
    ctx.drawImage(p.f.frames[up ? 1 : 0], Math.round(p.x - 4), Math.round(p.y - 10 - (up ? 1 : 0)));
  };
  placed.filter(p => p.back).forEach(drawFig);

  // tentacles — more and taller as the veil thins
  const nt = summonP ? 9 : pct < 0.25 ? 0 : Math.min(7, Math.floor((pct - 0.2) * 9) + 1);
  const th = summonP ? 30 + summonP * 50 : 8 + pct * 30;
  for (let k = 0; k < nt; k++) {
    const tc = TENTACLES[k];
    const segs = 22;
    for (let j = 0; j < segs; j++) {
      const s = j / segs;
      const x = CX + tc.dx + Math.sin(t * 1.4 * tc.s + tc.p + s * 3.5) * s * 9;
      const y = CY - s * th * tc.s;
      const r = Math.max(0.5, (1 - s) * 2.5);
      ctx.fillStyle = s > 0.85 ? PAL.purpleHi : PAL.purple;
      ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.ceil(r * 2), Math.ceil(r * 2));
      if (j % 4 === 2 && s < 0.8) px(x + r - 1, y, PAL.purpleHi); // suckers
    }
  }

  // Forbidden Library — books orbiting above the circle
  const nbk = Math.min(8, state.owned.library);
  for (let i = 0; i < nbk; i++) {
    const a = (i / nbk) * 6.28 + t * 0.4;
    const bx = Math.round(CX + Math.cos(a) * 75), by = Math.round(42 + Math.sin(a) * 8 + Math.sin(t * 2 + i) * 1.5);
    ctx.fillStyle = PAL.book; ctx.fillRect(bx - 2, by - 1, 5, 3);
    ctx.fillStyle = PAL.page; ctx.fillRect(bx - 1, by - 2, 3, 1);
    if (Math.sin(t * 4 + i) > 0.8) px(bx, by - 3, PAL.accent);
  }

  placed.filter(p => !p.back).forEach(drawFig);

  // the player's Vessel, front and center
  drawVessel(ctx, CX, H - 1, t, fx.chant > 0.3 || summonP > 0);

  // whispers rising from followers into the circle
  const rate = Math.min(30, Math.log10(wps() + 1) * 5);
  moteAcc += rate * dt;
  if (fx.chant > prevChant) { for (let i = 0; i < 6; i++) spawnMote(placed.length ? placed[i % placed.length] : { x: CX + (Math.random() - 0.5) * 60, y: CY + 10 }); }
  prevChant = fx.chant;
  while (moteAcc >= 1 && placed.length) { moteAcc--; spawnMote(placed[Math.random() * placed.length | 0]); }
  if (!placed.length) moteAcc = 0;
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.t += dt / m.life;
    if (m.t >= 1) { motes.splice(i, 1); continue; }
    const e = ease(m.t);
    m.x = m.x0 + (CX - m.x0) * e + Math.sin(m.t * 10 + m.w) * 2;
    m.y = (m.y0 - 10) + (CY - 6 - (m.y0 - 10)) * e - Math.sin(m.t * 3.14) * 12;
    ctx.globalAlpha = 1 - m.t; px(m.x, m.y, PAL.accent);
  }
  ctx.globalAlpha = 1;

  // the summoning — a vast eye tears open over the circle
  if (summonP) {
    ctx.fillStyle = `rgba(80,0,20,${summonP * 0.35})`; ctx.fillRect(-4, -4, W + 8, H + 8);
    drawEye(CX, 34, 60, 24, ease(Math.min(1, summonP * 1.4)));
  }

  ctx.restore();

  // low sanity — the picture tears: slices shift sideways, red bleeds in
  const madness = Math.max(0, (50 - state.sanity) / 50);
  if (madness > 0) {
    for (let i = 0; i < 6; i++) {
      if (Math.random() > madness * 0.4) continue;
      const y = Math.random() * H | 0, h = 1 + (Math.random() * 6 | 0);
      const dx = ((Math.random() - 0.5) * madness * 24) | 0;
      ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
    }
    if (Math.random() < madness * 0.05) { ctx.fillStyle = 'rgba(179,38,62,0.35)'; ctx.fillRect(0, 0, W, H); }
  }

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fx.flash})`; ctx.fillRect(0, 0, W, H);
    fx.flash = Math.max(0, fx.flash - dt * 0.8);
  }
  fx.chant = Math.max(0, fx.chant - dt * 3);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
