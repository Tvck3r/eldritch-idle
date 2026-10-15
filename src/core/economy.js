// ============================================================
// ECONOMY — the rules of a run: production, costs, buying, sanity,
// madness, apparitions, buffs, progress checks, tick() and catchUp().
// Prestige layers (summon, awaken, trials, seals, endings) are in prestige.js.
// No DOM; announces through events.
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, COST_GROWTH, SANITY_REGEN, MADNESS_MAX_BONUS, MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT,
  AUTO_BUY_INTERVAL, DRAIN_SOFTCAP, MADNESS_PACE, REVELATION_BONUS, SIGN_FAVOR_BONUS, ICHOR_RATE, ICHOR_SANITY, SEAL_BONUS, DEPTH_BONUS, NG_BONUS,
} from './constants.js';
import {
  GENERATORS, UPGRADES, PACTS, MILESTONES, OMENS, STORY, MADNESS_EVENTS, CHOICES, CHOICE_CHANCE,
  APPARITIONS, APPARITION_LIFE, APPARITION_INTERVAL, BUFFS,
} from './content.js';
import { SIGILS, MUTATIONS, TRIALS, ENDINGS, REVELATIONS } from './content-acts.js';
import { state, hasPact, hasSigil, fx } from './state.js';
import { checkCosmetics } from './cosmetics.js';
import { autoSummon } from './prestige.js';
import { emit } from './events.js';
import { fmt } from './format.js';

const log = msg => emit('log', msg);
const gen = id => GENERATORS.find(g => g.id === id);

// ---------- modifiers ----------
// Every bonus in the game folds into one object. Content supplies apply(m, s) functions.

export const milestonesReached = n => MILESTONES.filter(t => n >= t).length;
export const nextMilestone = n => MILESTONES.find(t => n < t);

export function modifiers(s = state) {
  const m = {
    click: 1, clickWpsPct: 0, all: 1, hold: false,
    gen: Object.fromEntries(GENERATORS.map(g => [g.id, 1])),
    drain: 1, madMax: MADNESS_MAX_BONUS,
    milestoneBase: 2, riteBonus: 0, favorBonus: FAVOR_BONUS, favorGain: 1,
    apparitionRate: 1, apparitionPower: 1, apparitionLife: 1,
    ichor: 1, mutationCost: 1,
    // trial rules
    noChant: false, noRites: false, noFavor: false, oneFaith: false, revealAll: false, sanityLock: null,
    steadyFree: false,
  };
  const trial = s.challenge && TRIALS.find(t => t.id === s.challenge);
  if (trial) trial.ruleApply(m);
  for (const t of TRIALS) if (s.challengesDone.includes(t.id)) t.rewardApply(m);
  if (!m.noRites) for (const u of UPGRADES) if (s.upgrades.includes(u.id)) u.apply(m, s);
  if (!m.noFavor) for (const p of PACTS) if (p.apply && s.pacts.includes(p.id)) p.apply(m, s);
  for (const g of SIGILS) if (g.apply && s.sigils.includes(g.id)) g.apply(m, s);
  for (const mu of MUTATIONS) if (s.mutations[mu.id]) mu.apply(m, s.mutations[mu.id]);
  for (const e of ENDINGS) if (s.ngMods.includes(e.id)) e.ng(m);
  for (const b of s.buffs) BUFFS[b.id]?.apply(m, s);

  for (const g of GENERATORS) m.gen[g.id] *= m.milestoneBase ** milestonesReached(s.owned[g.id]);
  if (m.riteBonus) m.all *= 1 + m.riteBonus * s.upgrades.length;

  m.madMult = 1 + (1 - s.sanity / 100) * m.madMax;
  m.favorMult = m.noFavor ? 1 : 1 + s.favor * m.favorBonus;
  m.revMult = 1 + REVELATION_BONUS * s.revelations.length;
  m.deepMult = SEAL_BONUS ** s.seals.length * DEPTH_BONUS ** s.depth * (1 + NG_BONUS * s.ngPlus);
  const global = m.favorMult * m.madMult * m.revMult * m.deepMult;
  m.all *= global;
  m.click *= global;
  if (m.noChant) { m.click = 0; m.clickWpsPct = 0; m.hold = false; }
  return m;
}

// ---------- production ----------

export const favorMult = (m = modifiers()) => m.favorMult;
export const madnessMult = (m = modifiers()) => m.madMult;

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
  return Math.max(0, n);
}

export function buyAmount(g) {
  return state.buyMode === 'max' ? Math.max(1, maxAffordable(g)) : state.buyMode;
}

// Revealed once the previous tier is owned (keeps the early game uncluttered)
export function isRevealed(g, m = modifiers()) {
  const i = GENERATORS.indexOf(g);
  return i === 0 || m.revealAll || state.owned[GENERATORS[i - 1].id] > 0 || state.owned[g.id] > 0;
}

export function topFollower() {
  return [...GENERATORS].reverse().find(g => state.owned[g.id] > 0);
}

// Trial of One Faith: everything but the chosen follower is barred
export function isBarred(id, m = modifiers()) {
  return m.oneFaith && state.oneFaith !== null && state.oneFaith !== id;
}

// ---------- sanity, veil, favor, ichor ----------

// Followers' raw drain, softened so it approaches DRAIN_SOFTCAP instead of growing forever
export function rawDrain() {
  return GENERATORS.reduce((sum, g) => sum + g.drain * state.owned[g.id], 0);
}
export function sanityDrain(m = modifiers()) {
  const raw = rawDrain();
  return DRAIN_SOFTCAP * raw / (DRAIN_SOFTCAP + raw) * m.drain;
}

// 0..1 progress toward the veil, log-scaled so it moves early on
export function veilPct() {
  return Math.min(1, Math.log10(state.totalEarned + 1) / Math.log10(VEIL_GOAL));
}

export function favorGain(totalEarned = state.totalEarned, m = modifiers()) {
  if (totalEarned < VEIL_GOAL) return 0;
  const signs = 1 + SIGN_FAVOR_BONUS * state.elderSignsTotal;
  return Math.floor(10 * Math.cbrt(totalEarned / VEIL_GOAL) * m.favorGain * signs);
}

// Act II: madness weeps ichor (only once you have Awakened)
export function ichorRate(m = modifiers()) {
  if (state.awakenings < 1 || state.sanity >= ICHOR_SANITY) return 0;
  const depth = (ICHOR_SANITY - state.sanity) / ICHOR_SANITY;
  return ICHOR_RATE * depth * Math.log10(wps(m) + 10) * m.ichor;
}

// ---------- actions ----------

export function earn(n) {
  state.whispers += n;
  state.totalEarned += n;
  state.lifetimeEarned += n;
}

export function chant() {
  const m = modifiers();
  if (m.noChant) return false;
  earn(clickValue(m));
  state.stats.chants++;
  state.runChants++;
  fx.chant = 1;
  return true;
}

export function setBuyMode(mode) {
  state.buyMode = mode === 'max' ? 'max' : Number(mode);
}

export function buyGenerator(id, n = buyAmount(gen(id))) {
  const g = gen(id), m = modifiers();
  if (isBarred(id, m)) return false;
  const cost = genCost(g, n);
  if (state.whispers < cost) return false;
  state.whispers -= cost;
  state.owned[id] += n;
  if (m.oneFaith && state.oneFaith === null) {
    state.oneFaith = id;
    log(`You have chosen your faith: ${g.name}s alone.`);
  }
  return true;
}

export function canBuyUpgrade(u) {
  return !state.upgrades.includes(u.id) && state.whispers >= u.cost && !modifiers().noRites;
}

export function buyUpgrade(id) {
  const u = UPGRADES.find(u => u.id === id);
  if (!canBuyUpgrade(u)) return false;
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

export function steadyMind(quiet = false) {
  const m = modifiers();
  if (state.sanity >= 100 || m.sanityLock !== null) return false;
  if (!m.steadyFree) state.whispers *= 1 - STEADY_COST;
  state.sanity = Math.min(100, state.sanity + STEADY_AMOUNT);
  if (!quiet) log('You breathe. You count your fingers. There are still ten.');
  return true;
}

export function addBuff(id, power = 1) {
  const time = BUFFS[id].time * Math.min(2, Math.sqrt(power)); // power stretches buffs a little, at most ×2
  const b = state.buffs.find(b => b.id === id);
  if (b) b.left = Math.max(b.left, time); else state.buffs.push({ id, left: time });
}

function tickBuffs(dt) {
  for (const b of state.buffs) b.left -= dt;
  state.buffs = state.buffs.filter(b => b.left > 0);
}

// ---------- madness and its questions ----------

const api = () => ({ s: state, topFollower, wps: () => wps(), clickValue: () => clickValue(), earn, fmt, addBuff: id => addBuff(id) });

// index forces a plain event (tests, admin); otherwise it sometimes asks a question instead
export function madnessEvent(index) {
  state.stats.madnessEvents++;
  fx.chant = 1; // jolt the scene
  if (index === undefined && !state.pendingChoice && Math.random() < CHOICE_CHANCE && askChoice()) return;
  const i = index ?? (Math.random() * MADNESS_EVENTS.length | 0);
  countLosses(() => log(MADNESS_EVENTS[i](state, { topFollower, wps: () => wps(), earn, fmt })));
}

const followerCount = () => Object.values(state.owned).reduce((a, b) => a + b, 0);
// Followers lost to madness feed the Seal of Blood
function countLosses(fn) {
  const before = followerCount();
  fn();
  state.runLost += Math.max(0, before - followerCount());
}

export function askChoice(id) {
  const left = CHOICES.filter(c => !(c.id in state.choicesMade));
  const c = id ? CHOICES.find(c => c.id === id) : left[Math.random() * left.length | 0];
  if (!c) return false;
  state.pendingChoice = c.id;
  log(`${c.text} (Your answer is awaited, in the Ritual.)`);
  emit('choice', c.id);
  return true;
}

export function answerChoice(optionIndex) {
  const c = CHOICES.find(c => c.id === state.pendingChoice);
  const o = c?.options[optionIndex];
  if (!o) return false;
  state.pendingChoice = null;
  state.choicesMade[c.id] = optionIndex;
  state.alignment[o.align]++;
  state.stats.choices++;
  countLosses(() => log(o.effect(api())));
  return true;
}

// ---------- apparitions ----------

function pickWeighted(list) {
  let r = Math.random() * list.reduce((a, x) => a + x.weight, 0);
  return list.find(x => (r -= x.weight) < 0) ?? list[0];
}

export function spawnApparition(id, m = modifiers()) {
  const pool = APPARITIONS.filter(a => !a.unlock || a.unlock(state));
  const a = id ? APPARITIONS.find(a => a.id === id) : pickWeighted(pool);
  // positions stay inside the part of the scene a phone shows (sky ones also fit the folded strip)
  const sky = a.where === 'sky';
  const x = sky ? 100 + Math.random() * 120 : (Math.random() < 0.5 ? 100 + Math.random() * 20 : 200 + Math.random() * 20);
  const y = sky ? 10 + Math.random() * 16 : 66 + Math.random() * 12;
  fx.apparition = { id: a.id, x: Math.round(x), y: Math.round(y), age: 0, life: APPARITION_LIFE * m.apparitionLife };
  emit('apparition', a.id);
}

function tickApparitions(dt, m) {
  const a = fx.apparition;
  if (a) { a.age += dt; if (a.age >= a.life) fx.apparition = null; return; }
  fx.apparitionTimer -= dt * m.apparitionRate;
  if (fx.apparitionTimer > 0) return;
  const [lo, hi] = APPARITION_INTERVAL;
  fx.apparitionTimer = lo + Math.random() * (hi - lo);
  spawnApparition(undefined, m);
}

export function catchApparition() {
  const a = fx.apparition;
  if (!a) return false;
  fx.apparition = null;
  const def = APPARITIONS.find(d => d.id === a.id), m = modifiers();
  const msg = def.grant({ ...api(), power: m.apparitionPower, addBuff: id => addBuff(id, m.apparitionPower) });
  state.stats.apparitions++;
  log(msg);
  emit('caught', def.id);
  return true;
}

// ---------- progress: omens, story, revelations, vestments ----------

export function checkProgress() {
  while (state.omensSeen < OMENS.length && state.totalEarned >= OMENS[state.omensSeen][0]) {
    log(OMENS[state.omensSeen][1]);
    state.omensSeen++;
  }
  if (!state.summoned && state.totalEarned >= VEIL_GOAL) {
    state.summoned = true;
    state.veilTime = Math.max(1, state.runTime);
    log('THE VEIL TEARS. It waits for you to call it through.');
  }
  const trial = state.challenge && TRIALS.find(t => t.id === state.challenge);
  if (trial && state.totalEarned >= trial.goal) {
    state.challengesDone.push(trial.id);
    state.challenge = null;
    state.oneFaith = null;
    log(`${trial.name} is passed. ${trial.reward} The rule lifts.`);
    emit('trial-passed', trial.id);
  }
  for (const b of STORY) if (!state.story.includes(b.id) && b.when(state)) { state.story.push(b.id); log(b.text); }
  for (const r of REVELATIONS) {
    if (state.revelations.includes(r.id) || !r.check(state)) continue;
    state.revelations.push(r.id);
    log(`Revelation: ${r.name}. (+${REVELATION_BONUS * 100}% to everything)`);
    emit('revelation', r.id);
  }
  checkCosmetics();
}

// ---------- automation ----------

let autoAcc = 0;
function automate(dt, m) {
  autoAcc = Math.min(autoAcc + dt, AUTO_BUY_INTERVAL * 20); // cap the backlog after a long step
  for (; autoAcc >= AUTO_BUY_INTERVAL; autoAcc -= AUTO_BUY_INTERVAL) {
    if (hasPact('faithful') || (hasSigil('multitude') && state.auto.buy)) {
      const options = GENERATORS.filter(g => isRevealed(g) && !isBarred(g.id, m));
      const cheapest = options.sort((a, b) => genCost(a) - genCost(b))[0];
      if (cheapest) buyGenerator(cheapest.id, 1);
    }
    if (hasSigil('rote') && state.auto.rites && !m.noRites) {
      const next = UPGRADES.filter(u => u.unlock(state) && canBuyUpgrade(u)).sort((a, b) => a.cost - b.cost)[0];
      if (next) buyUpgrade(next.id);
    }
  }
  if (hasSigil('stillness') && state.auto.steady && state.sanity < state.auto.steadyAt) steadyMind(true);
  autoSummon();
}

// ---------- time ----------

// One live step of dt seconds
export function tick(dt) {
  const m = modifiers();
  earn(wps(m) * dt);
  state.runTime += dt;

  if (m.sanityLock !== null) state.sanity = m.sanityLock;
  else state.sanity = Math.max(0, Math.min(100, state.sanity + (SANITY_REGEN - sanityDrain(m)) * dt));
  state.stats.minSanity = Math.min(state.stats.minSanity, state.sanity);
  state.abyssTime = state.sanity <= 0 ? state.abyssTime + dt : 0;
  if (state.sanity < MADNESS_THRESHOLD && Math.random() < Math.min(0.5, (MADNESS_THRESHOLD - state.sanity) / MADNESS_PACE * dt))
    madnessEvent();

  state.ichor += ichorRate(m) * dt;
  tickBuffs(dt);
  tickApparitions(dt, m);
  automate(dt, m);
  checkProgress();
}

// Time away (closed tab, throttled background): earn, but the mind rests —
// sanity doesn't move and no madness strikes while you're gone. Buffs run out,
// and no apparitions come (they wait to be seen).
export function catchUp(seconds) {
  const m = modifiers();
  const gained = wps(m) * seconds;
  earn(gained);
  state.runTime += seconds;
  state.ichor += ichorRate(m) * seconds;
  tickBuffs(seconds);
  checkProgress();
  return gained;
}
