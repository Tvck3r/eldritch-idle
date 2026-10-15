// ============================================================
// AUDIO — everything is synthesized with WebAudio (no files).
//   drone: a low chord that grows heavier as the veil thins and darker by act
//   chant: a breathy vowel on a minor pentatonic note
//   stings: summon, awakening, apparitions, revelations, questions, endings
// Browsers only allow sound after a user gesture, so the context starts on
// the first tap. Respects settings.sound / settings.volume.
// ============================================================
import { settings } from '../core/settings.js';
import { state, fx } from '../core/state.js';
import { on } from '../core/events.js';
import { veilPct } from '../core/economy.js';
import { act } from '../core/prestige.js';

let ctx = null, master = null, noise = null, drone = null;

function ensure() {
  if (ctx || !settings.sound) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = settings.volume;
  master.connect(ctx.destination);
  // one second of white noise, reused
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startDrone();
  return ctx;
}

const now = () => ctx.currentTime;

function env(gainNode, peak, attack, release, t = now()) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(freq, { type = 'sine', peak = 0.1, attack = 0.01, release = 0.5, at = 0, glideTo = null, dest = master } = {}) {
  const t = now() + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + release);
  env(g, peak, attack, release, t);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + attack + release + 0.05);
}

function hiss({ peak = 0.1, attack = 0.02, release = 0.4, freq = 800, q = 4, at = 0 } = {}) {
  const t = now() + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; src.loop = true;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  env(g, peak, attack, release, t);
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + attack + release + 0.05);
}

// ---------- the drone ----------

function startDrone() {
  const out = ctx.createGain(); out.gain.value = 0.0001;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 5; filter.frequency.value = 160;
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07; lfoGain.gain.value = 50;
  lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
  const oscs = [['sawtooth', 1], ['sawtooth', 1.006], ['sine', 0.5], ['sawtooth', 1.5]].map(([type, ratio]) => {
    const o = ctx.createOscillator(); o.type = type; o.start();
    o.connect(filter); return { o, ratio };
  });
  filter.connect(out).connect(master);
  drone = { out, filter, oscs };
  updateDrone();
}

const ROOTS = { 1: 55, 2: 49, 3: 41.2, end: 36.7 }; // A, G, E, D: lower each act

function updateDrone() {
  if (!drone) return;
  const t = now(), pct = veilPct(), mad = 1 - state.sanity / 100;
  const root = ROOTS[state.ending ? 'end' : act()];
  for (const { o, ratio } of drone.oscs) {
    o.frequency.setTargetAtTime(root * ratio, t, 2);
    o.detune.setTargetAtTime(ratio === 1.006 ? mad * 40 : 0, t, 1);
  }
  drone.filter.frequency.setTargetAtTime(120 + pct * 420 + (fx.summonStart ? 600 : 0), t, 1.5);
  const level = settings.sound ? 0.03 + pct * 0.05 + mad * 0.02 : 0.0001;
  drone.out.gain.setTargetAtTime(level, t, 1.5);
}

// ---------- sounds ----------

const SCALE = [0, 3, 5, 7, 10, 12]; // minor pentatonic, in semitones
let lastChant = 0;

export function chantSound() {
  if (!ensure() || !settings.sound) return;
  if (now() - lastChant < 0.06) return; // holding: don't stack too many voices
  lastChant = now();
  const root = ROOTS[state.ending ? 'end' : act()] * 4;
  const f = root * 2 ** (SCALE[Math.random() * SCALE.length | 0] / 12);
  tone(f, { type: 'triangle', peak: 0.05, attack: 0.03, release: 0.35 });
  hiss({ peak: 0.05, freq: 650 + Math.random() * 200, q: 8, release: 0.3 });
  hiss({ peak: 0.03, freq: 1100, q: 12, release: 0.25 });
}

export function buySound() {
  if (!ensure() || !settings.sound) return;
  tone(220, { peak: 0.05, release: 0.12 });
  tone(330, { peak: 0.03, release: 0.12, at: 0.03 });
}

function summonSting(long = false) {
  const len = long ? 8 : 3;
  for (const f of [55, 58.3, 82.4, 110]) tone(f, { type: 'sawtooth', peak: 0.06, attack: len * 0.8, release: len * 0.3, glideTo: f / 2 });
  hiss({ peak: 0.08, attack: len * 0.9, release: 0.5, freq: 300, q: 1 });
}

function initHooks() {
  on('summoned', () => { tone(41, { peak: 0.2, release: 2.5 }); });
  on('awakened', () => { if (!ctx) return; summonSting(); [196, 233, 294].forEach((f, i) => tone(f, { peak: 0.05, attack: 0.5, release: 3, at: 1 + i * 0.3 })); });
  on('apparition', () => { if (!ctx) return; tone(1760, { peak: 0.015, attack: 0.3, release: 1 }); tone(2637, { peak: 0.01, attack: 0.4, release: 1, at: 0.15 }); });
  on('caught', () => { if (!ctx) return; [880, 1109, 1319, 1760].forEach((f, i) => tone(f, { peak: 0.04, release: 0.4, at: i * 0.06 })); });
  on('revelation', () => { if (!ctx) return; tone(660, { peak: 0.05, release: 1.6 }); tone(990, { peak: 0.03, release: 1.4, at: 0.01 }); });
  on('choice', () => { if (!ctx) return; tone(50, { peak: 0.2, release: 0.25 }); tone(46, { peak: 0.18, release: 0.3, at: 0.3 }); });
  on('finale', () => { if (ctx) summonSting(true); });
  on('ending', () => { if (ctx) summonSting(true); });
  on('settings', () => {
    if (settings.sound) ensure();
    if (master) master.gain.setTargetAtTime(settings.volume, now(), 0.1);
    updateDrone();
  });
}

// Called by the summon button (the summon is a timer in core, so there's no event at its start)
export function summonSound() { if (ensure()) summonSting(); }

export function initAudio() {
  // start on the first gesture (autoplay rules); resume if the browser suspended us
  const kick = () => { if (ensure() && ctx.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('keydown', kick, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  initHooks();
  setInterval(updateDrone, 500);
}
