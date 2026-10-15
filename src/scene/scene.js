// ============================================================
// SCENE — pixel-art ritual drawn on a low-res canvas, scaled up crisp.
// Reads game state; never mutates it (only decays the transient fx signals).
// Every system shows up here: followers, the veil, sanity, apparitions,
// the drowned city (Act II), the broken seals (Act III) and the endings.
// ============================================================
import { SUMMON_MS, ENDING_MS } from '../core/constants.js';
import { state, fx } from '../core/state.js';
import { settings } from '../core/settings.js';
import { veilPct, wps } from '../core/economy.js';
import { act } from '../core/prestige.js';
import { bake } from './sprites.js';
import { drawVessel } from './vessel.js';

const W = 320, H = 100;
const HORIZON = 55;
const CX = 160, CY = 78;          // summoning circle center

const canvas = document.getElementById('scene');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

const PAL = {
  skyTop: '#05040a', skyBot: '#1a1129', skyBot2: '#0b2620', ground: '#0e0b16', groundLine: '#1e1830',
  accent: '#7dffb0', purple: '#3a1f5c', purpleHi: '#6b3fa0',
  sclera: '#d8d29a', vein: '#a8573f', pupil: '#050308',
  building: '#0b0812', water: '#0d2230', waterHi: '#1f4a5c', stone: '#2a2a33',
  book: '#4a2c1a', page: '#c9b88a', ichor: '#c46bff', blood: '#ff5b6e',
  rlyeh: '#0a1f19', rlyehHi: '#1d5c46', moon: '#3f7a5c', moonDark: '#2a5541', spire: '#120c1c',
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
for (const f of FIGURES) {
  const colors = { o: f.robe, d: f.shade, x: '#050308', e: PAL.accent };
  f.frames = [bake(HOOD_DOWN, colors), bake(HOOD_UP, colors)];
}

// Apparition sprites (two frames each)
const APP_SPRITES = {
  shadow: [['.kkk.', 'kkkkk', 'krkrk', 'kkkkk', '.kkk.', 'kkkkk', 'kkkkk', 'kk.kk', 'k...k'],
           ['.kkk.', 'kkkkk', 'kkkkk', 'kkkkk', '.kkk.', 'kkkkk', 'kkkkk', 'kk.kk', '.k.k.']],
  mouth:  [['.rrrrr.', 'rwwwwwr', 'r.....r', 'rwwwwwr', '.rrrrr.'], ['.rrrrr.', 'rrrrrrr', 'rwwwwwr', 'rrrrrrr', '.rrrrr.']],
  moth:   [['w...w', 'ww.ww', '.wew.', '..w..'], ['.....', 'wwwww', '.wew.', '..w..']],
};
const APP_COLORS = { k: '#050308', r: '#b3263e', w: '#e8e4d0', e: PAL.accent };
const appFrames = Object.fromEntries(Object.entries(APP_SPRITES).map(([id, fr]) => [id, fr.map(rows => bake(rows, APP_COLORS))]));

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
const SPIRES = [62, 258, 96, 226, 44, 280].map((x, i) => ({ x, h: 30 + ((i * 7) % 15), w: 5 + (i % 2) }));
const MONOLITHS = Array.from({ length: 16 }, (_, i) => ({ x: i * 21 + (rand() * 8 | 0) - 4, w: 8 + (rand() * 10 | 0), h: 10 + (rand() * 20 | 0), lean: (rand() - 0.5) * 6 }));
const SMALL_EYES = Array.from({ length: 12 }, () => ({ x: 20 + rand() * 280 | 0, y: 6 + rand() * 30 | 0, p: rand() * 6 }));
const CRACKS = Array.from({ length: 7 }, () => {
  let x = 30 + rand() * 260, y = 0; const pts = [[x, y]];
  while (y < 30 + rand() * 15) { x += (rand() - 0.5) * 8; y += 2 + rand() * 4; pts.push([x, y]); }
  return pts;
});

// ---------- helpers ----------
const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
const ease = t => 1 - Math.pow(1 - t, 3);
const clamp01 = v => Math.max(0, Math.min(1, v));

let lookX = 0;
window.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  lookX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
});

function drawEye(ex, ey, w, h, open, look = lookX) {
  if (open <= 0.02) { ctx.fillStyle = PAL.purpleHi; ctx.fillRect(ex - w, ey, w * 2, 1); return; }
  const ix = look * w * 0.45, ir = h * 0.85;
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

// ---------- particles ----------
const motes = [], drips = [];
let moteAcc = 0, dripAcc = 0;
function spawnMote(from) {
  motes.push({ x0: from.x, y0: from.y, x: from.x, y: from.y, t: 0, life: 1 + Math.random() * 0.6, w: Math.random() * 6.28 });
}

// ---------- layers ----------

function drawSky(t, pct, a) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, PAL.skyTop);
  const bottom = a >= 2 ? PAL.skyBot2 : pct > 0.7 ? `rgb(${40 + (pct - 0.7) * 150 | 0},17,41)` : PAL.skyBot;
  sky.addColorStop(1, bottom);
  ctx.fillStyle = sky; ctx.fillRect(-4, -4, W + 8, HORIZON + 4);
  for (const s of STARS) {
    ctx.globalAlpha = (0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + s.p))) * (1 - pct * 0.6);
    px(s.x, s.y, '#c9c2d9');
  }
  ctx.globalAlpha = 1;
}

// Act III: each broken seal splits the sky a little further
function drawCracks(t) {
  const n = state.seals.length;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2 + i);
    const pts = CRACKS[i];
    for (let j = 1; j < pts.length; j++) {
      const [x0, y0] = pts[j - 1], [x1, y1] = pts[j], steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let k = 0; k <= steps; k++) px(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps, k % 3 ? PAL.blood : '#ffd0d8');
    }
  }
  ctx.globalAlpha = 1;
}

function drawWatcher(t, summonP) {
  if ((state.summonings === 0 && act() === 1) || summonP || fx.ending) return;
  // the Watcher grows with every summoning, and again with every seal
  const w = 10 + Math.min(state.summonings, 6) * 2 + state.seals.length * 3;
  const blink = (t % 6) < 0.15 ? 0 : 1;
  drawEye(CX, 16, w, w * 0.4, blink * (0.85 + 0.15 * Math.sin(t)));
  // Act II: It has more eyes now
  const extra = act() >= 2 ? Math.min(SMALL_EYES.length, state.awakenings * 3) : 0;
  for (let i = 0; i < extra; i++) {
    const e = SMALL_EYES[i];
    drawEye(e.x, e.y, 3, 1.4, (t + e.p) % 7 < 0.2 ? 0 : 1);
  }
}

function drawSkyline(t, a) {
  // Act II: the drowned city has risen along the whole horizon
  if (a >= 2) {
    for (const m of MONOLITHS) {
      ctx.fillStyle = PAL.rlyeh;
      for (let y = 0; y < m.h; y++) {
        const shift = Math.round(m.lean * y / m.h);
        ctx.fillRect(m.x + shift, HORIZON - y, m.w - Math.floor(y / m.h * 4), 1);
      }
      if (Math.sin(t * 0.7 + m.x) > 0.2) px(m.x + m.w / 2 + m.lean / 2, HORIZON - m.h / 2, PAL.rlyehHi);
    }
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
  // Impossible Spires — too tall, slightly wrong
  const ns = Math.min(SPIRES.length, state.owned.spire);
  for (let i = 0; i < ns; i++) {
    const s = SPIRES[i];
    for (let y = 0; y < s.h; y++) {
      const half = Math.max(0, Math.round(s.w * (1 - y / s.h)));
      ctx.fillStyle = PAL.spire;
      ctx.fillRect(s.x - half + Math.round(Math.sin(y * 0.3) * 0.6), HORIZON - y, half * 2 + 1, 1);
      if (y % 5 === 2 && half > 1 && Math.sin(t * 2 + y + i) > 0) px(s.x, HORIZON - y, PAL.ichor);
    }
  }
}

// Drowned Moons — a second moon, rising from the sea
function drawMoon(t) {
  const n = state.owned.moon;
  if (!n) return;
  const r = 5 + Math.min(n, 25) * 0.3, rise = Math.min(1, n / 5) * 22;
  const mx = 250, my = HORIZON + r - 2 - rise;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y > r * r || my + y > HORIZON) continue;
    const crater = Math.sin((x + 3) * 1.7) * Math.cos((y - 1) * 2.1) > 0.6;
    px(mx + x, my + y, crater ? PAL.moonDark : PAL.moon);
  }
  ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t);
  ctx.fillStyle = PAL.moon; ctx.fillRect(mx - r, HORIZON + 2, r * 2, 1);   // reflection
  ctx.globalAlpha = 1;
}

// Star Choir — stars gather into a ring above the circle and sing
function drawChoir(t) {
  const n = Math.min(16, state.owned.choir * 2);
  if (!n) return;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.28 + t * 0.05;
    pts.push([CX + Math.cos(a) * 34, 30 + Math.sin(a) * 9]);
  }
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    for (let k = 0; k <= 6; k++) px(x0 + (x1 - x0) * k / 6, y0 + (y1 - y0) * k / 6, PAL.sclera);
  }
  pts.forEach(([x, y], i) => {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i * 0.8);   // they sing in turn
    px(x, y, '#ffffff'); px(x + 1, y, PAL.sclera); px(x, y - 1, PAL.sclera);
  });
  ctx.globalAlpha = 1;
}

function drawGround(t, a) {
  ctx.fillStyle = PAL.ground; ctx.fillRect(-4, HORIZON, W + 8, H - HORIZON + 4);
  ctx.fillStyle = PAL.groundLine; ctx.fillRect(-4, HORIZON, W + 8, 1);
  // Act II: the sea has come in all along the horizon
  if (a >= 2) {
    ctx.fillStyle = PAL.water; ctx.fillRect(-4, HORIZON + 1, W + 8, 6);
    for (let i = 0; i < 40; i++) px(((i * 23 + t * 5) % W + W) % W, HORIZON + 2 + (i % 3) * 2, PAL.waterHi);
  }
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
}

function drawCircle(t, pct, summonP) {
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
}

function drawTentacles(t, pct, summonP, extra = 0) {
  const nt = summonP || extra ? 9 : pct < 0.25 ? 0 : Math.min(7, Math.floor((pct - 0.2) * 9) + 1);
  const th = summonP ? 30 + summonP * 50 : extra ? extra : 8 + pct * 30;
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
}

function drawBooks(t) {
  const nbk = Math.min(8, state.owned.library);
  for (let i = 0; i < nbk; i++) {
    const a = (i / nbk) * 6.28 + t * 0.4;
    const bx = Math.round(CX + Math.cos(a) * 75), by = Math.round(42 + Math.sin(a) * 8 + Math.sin(t * 2 + i) * 1.5);
    ctx.fillStyle = PAL.book; ctx.fillRect(bx - 2, by - 1, 5, 3);
    ctx.fillStyle = PAL.page; ctx.fillRect(bx - 1, by - 2, 3, 1);
    if (Math.sin(t * 4 + i) > 0.8) px(bx, by - 3, PAL.accent);
  }
}

function drawApparition(t) {
  const a = fx.apparition;
  if (!a) return;
  const fade = clamp01(a.age / 0.6) * clamp01((a.life - a.age) / 1.5);
  const bob = Math.round(Math.sin(t * 2.5) * 1.5), f = Math.floor(t * 4) % 2;
  // a soft halo so it reads as touchable
  ctx.globalAlpha = fade * (0.15 + 0.1 * Math.sin(t * 5));
  ctx.fillStyle = PAL.accent;
  ctx.beginPath(); ctx.arc(a.x, a.y + bob, 7, 0, 6.28); ctx.fill();
  ctx.globalAlpha = fade;
  if (a.id === 'star') {
    const c = `hsl(${(t * 120) % 360},90%,65%)`;
    px(a.x, a.y + bob, '#ffffff');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(a.x + dx, a.y + bob + dy, c);
    if (f) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) px(a.x + dx, a.y + bob + dy, c);
  } else if (a.id === 'eye') {
    drawEye(a.x, a.y + bob, 5, 2.2, 0.6 + 0.4 * Math.abs(Math.sin(t * 2)), 0);
  } else {
    const img = appFrames[a.id][f];
    ctx.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y + bob - img.height / 2));
  }
  ctx.globalAlpha = 1;
}

// Act II: below half sanity, ichor weeps from the Watcher
function drawIchor(dt) {
  if (act() >= 2 && state.sanity < 50 && !settings.reducedMotion) {
    dripAcc += dt * (50 - state.sanity) / 10;
    while (dripAcc >= 1) { dripAcc--; drips.push({ x: CX + (Math.random() - 0.5) * 20, y: 20, v: 5 + Math.random() * 10 }); }
  }
  for (let i = drips.length - 1; i >= 0; i--) {
    const d = drips[i];
    d.v += dt * 40; d.y += d.v * dt;
    if (d.y > CY) { drips.splice(i, 1); continue; }
    px(d.x, d.y, PAL.ichor); px(d.x, d.y - 1, PAL.purpleHi);
  }
}

// ---------- endings ----------

function drawEnding(t, now) {
  const e = fx.ending;
  const p = clamp01((now - e.start) / ENDING_MS);
  const open = ease(clamp01(p * 3));
  if (e.id === 'prophet') {
    // the eye opens fully; light pours down; you rise
    drawEye(CX, 30, 70, 26, open, 0);
    ctx.globalAlpha = clamp01((p - 0.2) * 2) * 0.35;
    for (let i = -6; i <= 6; i++) for (let y = 50; y < H; y += 2) px(CX + i * 9 + (y - 50) * i * 0.4, y, '#ffe9a8');
    ctx.globalAlpha = 1;
    const lift = ease(clamp01((p - 0.35) * 2)) * 34;
    ctx.fillStyle = `rgba(255,220,140,${0.2 + 0.2 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(CX, H - 14 - lift, 12, 0, 6.28); ctx.fill();
    drawVessel(ctx, CX, H - 1 - lift, t, true);
    if (p > 0.85) { ctx.fillStyle = `rgba(255,233,168,${(p - 0.85) * 3})`; ctx.fillRect(0, 0, W, H); }
  } else if (e.id === 'betrayer') {
    // you draw the sign; the eye closes; dawn
    const shut = 1 - ease(clamp01((p - 0.3) / 0.35));
    drawEye(CX, 30, 70, 26, open * shut, 0);
    const dawn = clamp01((p - 0.6) * 2.5);
    if (dawn) {
      const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
      g.addColorStop(0, `rgba(80,120,190,${dawn})`); g.addColorStop(1, `rgba(255,170,120,${dawn})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON);
    }
    const fadeOut = 1 - clamp01((p - 0.75) * 4);
    ctx.globalAlpha = fadeOut;
    drawVessel(ctx, CX, H - 1, t, true);
    const glow = clamp01(p * 3);
    for (const [dx, dy] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]])
      px(CX + 6 + dx, H - 25 + dy, glow > 0.5 ? '#ffffff' : PAL.ichor);
    ctx.globalAlpha = glow * 0.3 * fadeOut;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(CX + 6, H - 25, 4 + glow * 10, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // the vessel: you walk into the circle, and It pours into you
    const walk = ease(clamp01((p - 0.1) / 0.3));
    const descend = ease(clamp01((p - 0.35) / 0.4));
    drawTentacles(t, 1, 0, 20 + descend * 40);
    const ey = 30 + descend * (CY - 40), ew = 70 * (1 - descend * 0.9);
    drawEye(CX, ey, Math.max(3, ew), Math.max(1.5, ew * 0.37), open, 0);
    if (p < 0.8) drawVessel(ctx, CX, H - 1 - walk * (H - 1 - CY - 4), t, descend > 0.2);
    else {
      drawVessel(ctx, CX, CY + 4, t, true);
      drawEye(CX, CY - 18, 4, 1.8, 1, Math.sin(t));
      ctx.fillStyle = `rgba(58,31,92,${(p - 0.8) * 2})`; ctx.fillRect(0, 0, W, H);
      drawEye(CX, 40, 40, 16, 1, Math.sin(t * 0.5));
    }
  }
}

// ---------- main draw ----------
let last = performance.now();
let prevChant = 0;

function frame() {
  const now = performance.now(); // same clock as fx timestamps (and it advances under headless virtual time)
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  const pct = veilPct(), a = act();
  const summonP = fx.summonStart ? Math.min(1, (now - fx.summonStart) / SUMMON_MS) : 0;

  ctx.save();
  if (summonP && !settings.reducedMotion) ctx.translate((Math.random() - 0.5) * summonP * 6 | 0, (Math.random() - 0.5) * summonP * 4 | 0);

  drawSky(t, pct, a);
  drawCracks(t);
  drawWatcher(t, summonP);
  drawChoir(t);
  drawSkyline(t, a);
  drawMoon(t);
  drawGround(t, a);
  drawCircle(t, pct, summonP);

  if (fx.ending) {
    drawEnding(t, now);
    ctx.restore();
    requestAnimationFrame(frame);
    return;
  }

  // figure positions around the circle
  const figs = [];
  for (const f of FIGURES) for (let i = 0; i < Math.min(f.max, state.owned[f.gen]); i++) figs.push(f);
  const placed = figs.map((f, i) => {
    const ang = (i / figs.length) * 6.28 + 0.3;
    return { f, i, x: CX + Math.cos(ang) * 58, y: CY + Math.sin(ang) * 15, back: Math.sin(ang) < 0 };
  });
  const drawFig = p => {
    const up = fx.chant > 0.3 || summonP > 0 || Math.sin(t * 2.2 + p.i * 1.7) > 0.75;
    ctx.drawImage(p.f.frames[up ? 1 : 0], Math.round(p.x - 4), Math.round(p.y - 10 - (up ? 1 : 0)));
  };
  placed.filter(p => p.back).forEach(drawFig);

  drawTentacles(t, pct, summonP);
  drawBooks(t);
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

  drawIchor(dt);
  drawApparition(t);

  // the summoning — a vast eye tears open over the circle
  if (summonP) {
    ctx.fillStyle = `rgba(80,0,20,${summonP * 0.35})`; ctx.fillRect(-4, -4, W + 8, H + 8);
    drawEye(CX, 34, 60, 24, ease(Math.min(1, summonP * 1.4)));
  }

  ctx.restore();

  // low sanity — the picture tears: slices shift sideways, red bleeds in
  const madness = Math.max(0, (50 - state.sanity) / 50);
  if (madness > 0 && !settings.reducedMotion) {
    for (let i = 0; i < 6; i++) {
      if (Math.random() > madness * 0.4) continue;
      const y = Math.random() * H | 0, h = 1 + (Math.random() * 6 | 0);
      const dx = ((Math.random() - 0.5) * madness * 24) | 0;
      ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
    }
    if (Math.random() < madness * 0.05) { ctx.fillStyle = 'rgba(179,38,62,0.35)'; ctx.fillRect(0, 0, W, H); }
  }

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${settings.reducedMotion ? fx.flash * 0.3 : fx.flash})`; ctx.fillRect(0, 0, W, H);
    fx.flash = Math.max(0, fx.flash - dt * 0.8);
  }
  fx.chant = Math.max(0, fx.chant - dt * 3);

  requestAnimationFrame(frame);
}

export function startScene() {
  requestAnimationFrame(frame);
}
