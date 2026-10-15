// ============================================================
// ECONOMY — every rule of the game. No DOM; announces through events.
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, SUMMON_MS, COST_GROWTH, SANITY_REGEN, MADNESS_MAX_BONUS,
  MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT, AUTO_BUY_INTERVAL,
} from './constants.js';
import { GENERATORS, UPGRADES, PACTS, OMENS, SUMMON_LINES, MADNESS_EVENTS } from './content.js';
import { state, setState, freshState, PERSIST, pick, hasPact, fx } from './state.js';
import { checkCosmetics } from './cosmetics.js';
import { emit } from './events.js';
import { fmt } from './format.js';

const log = msg => emit('log', msg);
const gen = id => GENERATORS.find(g => g.id === id);

// ---------- production ----------

export function favorMult() { return 1 + state.favor * FAVOR_BONUS; }
export function madnessMult() { return 1 + (1 - state.sanity / 100) * MADNESS_MAX_BONUS; }

export function modifiers() {
  const all = favorMult() * madnessMult();
  const m = { click: all, clickWpsPct: 0, all, hold: false, gen: Object.fromEntries(GENERATORS.map(g => [g.id, 1])) };
  for (const u of UPGRADES) if (state.upgrades.includes(u.id)) u.apply(m);
  for (const p of PACTS) if (p.apply && hasPact(p.id)) p.apply(m);
  return m;
}

export function genRate(g, m = modifiers()) {
  return g.rate * state.owned[g.id] * m.gen[g.id] * m.all;
}

export function wps(m = modifiers()) {
  return GENERATORS.reduce((sum, g) => sum + genRate(g, m), 0);
}

export function clickValue(m = modifiers()) {
  return m.click + wps(m) * m.clickWpsPct;
}

export const canHoldChant = () => modifiers().hold;

// ---------- costs ----------

// Total cost of the next n of a generator (geometric series)
export function genCost(g, n = 1) {
  const first = g.baseCost * Math.pow(COST_GROWTH, state.owned[g.id]);
  return Math.ceil(first * (Math.pow(COST_GROWTH, n) - 1) / (COST_GROWTH - 1));
}

export function maxAffordable(g) {
  const first = g.baseCost * Math.pow(COST_GROWTH, state.owned[g.id]);
  let n = Math.floor(Math.log(1 + state.whispers * (COST_GROWTH - 1) / first) / Math.log(COST_GROWTH));
  while (n > 0 && genCost(g, n) > state.whispers) n--; // guard against float rounding
  return n;
}

export function buyAmount(g) {
  return state.buyMode === 'max' ? Math.max(1, maxAffordable(g)) : state.buyMode;
}

// Revealed once the previous tier is owned (keeps the early game uncluttered)
export function isRevealed(g) {
  const i = GENERATORS.indexOf(g);
  return i === 0 || state.owned[GENERATORS[i - 1].id] > 0 || state.owned[g.id] > 0;
}

export function topFollower() {
  return [...GENERATORS].reverse().find(g => state.owned[g.id] > 0);
}

// ---------- sanity, veil, favor ----------

export function sanityDrain() {
  const d = GENERATORS.reduce((sum, g) => sum + g.drain * state.owned[g.id], 0);
  return hasPact('steadfast') ? d / 2 : d;
}

// 0..1 progress toward the veil, log-scaled so it moves early on
export function veilPct() {
  return Math.min(1, Math.log10(state.totalEarned + 1) / Math.log10(VEIL_GOAL));
}

export function favorGain(totalEarned = state.totalEarned) {
  if (totalEarned < VEIL_GOAL) return 0;
  return Math.floor(10 * Math.sqrt(totalEarned / VEIL_GOAL));
}

// ---------- actions ----------

export function earn(n) {
  state.whispers += n;
  state.totalEarned += n;
  state.lifetimeEarned += n;
}

export function chant() {
  earn(clickValue());
  state.stats.chants++;
  fx.chant = 1;
}

export function setBuyMode(mode) {
  state.buyMode = mode === 'max' ? 'max' : Number(mode);
}

export function buyGenerator(id, n = buyAmount(gen(id))) {
  const g = gen(id);
  const cost = genCost(g, n);
  if (state.whispers < cost) return false;
  state.whispers -= cost;
  state.owned[id] += n;
  return true;
}

export function buyUpgrade(id) {
  const u = UPGRADES.find(u => u.id === id);
  if (state.upgrades.includes(id) || state.whispers < u.cost) return false;
  state.whispers -= u.cost;
  state.upgrades.push(id);
  log(`Rite performed: ${u.name}.`);
  return true;
}

export function buyPact(id) {
  const p = PACTS.find(p => p.id === id);
  if (hasPact(id) || state.favor < p.cost) return false;
  state.favor -= p.cost;
  state.pacts.push(id);
  log(`A pact is sealed: ${p.name}.`);
  return true;
}

export function steadyMind() {
  if (state.sanity >= 100) return false;
  state.whispers *= 1 - STEADY_COST;
  state.sanity = Math.min(100, state.sanity + STEADY_AMOUNT);
  log('You breathe. You count your fingers. There are still ten.');
  return true;
}

export function madnessEvent(index = Math.random() * MADNESS_EVENTS.length | 0) {
  log(MADNESS_EVENTS[index](state, { topFollower, wps, earn, fmt }));
  state.stats.madnessEvents++;
  fx.chant = 1; // jolt the scene
}

// ---------- summoning (prestige) ----------

export function canSummon() { return favorGain() > 0 && !fx.summonStart; }

// Plays the animation, then resets. preview = animation only (admin).
export function beginSummon({ preview = false } = {}) {
  if (fx.summonStart || (!preview && favorGain() <= 0)) return false;
  fx.summonStart = Math.max(1, performance.now()); // 0 means "no summon underway"
  setTimeout(preview ? () => { fx.summonStart = 0; fx.flash = 1; } : performSummon, SUMMON_MS);
  return true;
}

export function performSummon() {
  const gain = favorGain();
  const keep = state;
  const next = { ...freshState(), ...pick(keep, PERSIST), favor: keep.favor + gain, summonings: keep.summonings + 1 };
  if (keep.pacts.includes('firstborn')) next.owned.acolyte = 10;
  if (keep.pacts.includes('congregation')) next.owned.cultist = 10;
  if (keep.pacts.includes('remembered')) next.upgrades = keep.upgrades;
  fx.summonStart = 0;
  fx.flash = 1;
  setState(next);
  log(`+${gain} Eldritch Favor.`);
  log(SUMMON_LINES[Math.min(next.summonings, SUMMON_LINES.length) - 1]);
  emit('summoned', gain);
  return gain;
}

// ---------- time ----------

export function checkOmens() {
  while (state.omensSeen < OMENS.length && state.totalEarned >= OMENS[state.omensSeen][0]) {
    log(OMENS[state.omensSeen][1]);
    state.omensSeen++;
  }
  if (!state.summoned && state.totalEarned >= VEIL_GOAL) {
    state.summoned = true;
    log('THE VEIL TEARS. It waits for you to call it through.');
  }
}

let autoBuyAcc = 0;

// One live step of dt seconds
export function tick(dt) {
  earn(wps() * dt);

  state.sanity = Math.max(0, Math.min(100, state.sanity + (SANITY_REGEN - sanityDrain()) * dt));
  state.stats.minSanity = Math.min(state.stats.minSanity, state.sanity);
  if (state.sanity < MADNESS_THRESHOLD && Math.random() < Math.min(0.5, (MADNESS_THRESHOLD - state.sanity) / 400 * dt))
    madnessEvent();

  if (hasPact('faithful')) {
    autoBuyAcc += dt;
    while (autoBuyAcc >= AUTO_BUY_INTERVAL) {
      autoBuyAcc -= AUTO_BUY_INTERVAL;
      const cheapest = [...GENERATORS].sort((a, b) => genCost(a) - genCost(b))[0];
      buyGenerator(cheapest.id, 1);
    }
  }

  checkOmens();
  checkCosmetics();
}

// Time away (closed tab, throttled background): earn, but the mind rests —
// sanity doesn't move and no madness strikes while you're gone.
export function catchUp(seconds) {
  const gained = wps() * seconds;
  earn(gained);
  checkOmens();
  checkCosmetics();
  return gained;
}

export function resetAll() {
  setState(freshState());
}

// Admin "fresh run": new run, keep everything that survives a summoning
export function freshRun() {
  setState({ ...freshState(), ...pick(state, PERSIST) });
}
