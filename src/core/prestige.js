// ============================================================
// PRESTIGE — the three layers and what comes after.
//   Act I:   Summon It → Eldritch Favor (spent on Pacts)
//   Act II:  Awaken → Elder Signs (spent on Sigils); Ichor buys Mutations; Trials
//   Act III: break the Seven Seals → choose an ending → NG+ or keep dreaming
// No DOM; announces through events.
// ============================================================
import {
  SUMMON_MS, AWAKEN_FAVOR, ACT3_AWAKENINGS, DEPTH_BASE, DEPTH_GROWTH,
} from './constants.js';
import { SUMMON_LINES } from './content.js';
import { SIGILS, MUTATIONS, MUTATION_GROWTH, TRIALS, SEALS, ENDINGS, ENDING_MIN_ALIGN } from './content-acts.js';
import {
  state, setState, freshState, PERSIST, AWAKEN_RESET, NG_KEEP, pick, hasSigil, fx,
} from './state.js';
import { favorGain, modifiers } from './economy.js';
import { emit } from './events.js';
import { fmt } from './format.js';

const log = msg => emit('log', msg);

// Which act the player is in (drives the scene and which panels show)
export function act(s = state) {
  if (s.awakenings >= ACT3_AWAKENINGS) return 3;
  if (s.awakenings >= 1) return 2;
  return 1;
}

// Start a new run, keeping `keep` keys from the old state, plus pact starting gifts
function newRun(keep, extra = {}) {
  const next = { ...freshState(), ...pick(state, keep), ...extra };
  if (!modifiers(next).noFavor) {
    if (next.pacts.includes('firstborn')) next.owned.acolyte = 10;
    if (next.pacts.includes('congregation')) next.owned.cultist = 10;
  }
  return next;
}

// ---------- Act I: summoning ----------

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
  const next = newRun(PERSIST, { favor: keep.favor + gain, favorEarned: keep.favorEarned + gain, summonings: keep.summonings + 1 });
  if (keep.pacts.includes('remembered')) next.upgrades = keep.upgrades;
  fx.summonStart = 0;
  fx.flash = 1;
  fx.apparition = null;
  setState(next);
  log(`+${gain} Eldritch Favor.`);
  log(SUMMON_LINES[Math.min(next.summonings, SUMMON_LINES.length) - 1]);
  emit('summoned', gain);
  return gain;
}

// Automation (Sigil of Return)
export function autoSummon() {
  if (!hasSigil('return') || !state.auto.summon || fx.summonStart) return false;
  const gain = favorGain();
  return gain > 0 && gain >= state.auto.summonAt && beginSummon();
}

// ---------- Act II: awakening ----------

export function signsGain(favorEarned = state.favorEarned) {
  return favorEarned < AWAKEN_FAVOR ? 0 : Math.floor(3 * Math.sqrt(favorEarned / AWAKEN_FAVOR));
}
export const canAwaken = () => signsGain() > 0 && !fx.summonStart && !state.challenge;
export const awakeningVisible = () => state.summonings >= 3 || state.awakenings > 0;

export function awaken() {
  if (!canAwaken()) return false;
  const gain = signsGain(), keep = state;
  const next = newRun(PERSIST.filter(k => !AWAKEN_RESET.includes(k)), {
    elderSigns: keep.elderSigns + gain,
    elderSignsTotal: keep.elderSignsTotal + gain,
    awakenings: keep.awakenings + 1,
  });
  if (keep.sigils.includes('memory')) next.pacts = [...keep.pacts];
  if (keep.sigils.includes('covenant')) next.pacts = [...new Set([...next.pacts, 'deepchant', 'steadfast'])];
  fx.flash = 1;
  fx.apparition = null;
  setState(next);
  log(`You wake. ${gain} Elder Sign${gain > 1 ? 's' : ''} burn${gain > 1 ? '' : 's'} on your palms.`);
  emit('awakened', gain);
  return gain;
}

export function buySigil(id) {
  const g = SIGILS.find(g => g.id === id);
  if (!g || hasSigil(id) || state.elderSigns < g.cost) return false;
  state.elderSigns -= g.cost;
  state.sigils.push(id);
  if (g.auto) state.auto[g.auto] = true; // switch the automation on; it can be turned off
  log(`${g.name} is carved into you.`);
  return true;
}

// ---------- Act II: ichor and mutations ----------

export const mutationLevel = id => state.mutations[id] || 0;
export function mutationCost(id, m = modifiers()) {
  const mu = MUTATIONS.find(x => x.id === id);
  return Math.ceil(mu.baseCost * MUTATION_GROWTH ** mutationLevel(id) * m.mutationCost);
}
export const mutationMaxed = id => {
  const mu = MUTATIONS.find(x => x.id === id);
  return mu.max !== undefined && mutationLevel(id) >= mu.max;
};

export function buyMutation(id) {
  if (mutationMaxed(id)) return false;
  const cost = mutationCost(id);
  if (state.ichor < cost) return false;
  state.ichor -= cost;
  state.mutations[id] = mutationLevel(id) + 1;
  return true;
}

// ---------- Act II: trials ----------

export const trialsUnlocked = () => state.awakenings >= 1;

// Begins a fresh run under the trial's rule. The current run is forfeited.
export function startTrial(id) {
  if (!trialsUnlocked() || state.challenge || fx.summonStart || !TRIALS.some(t => t.id === id)) return false;
  setState(newRun(PERSIST, { challenge: id }));
  const t = TRIALS.find(t => t.id === id);
  log(`${t.name} begins. ${t.rule} Earn ${fmt(t.goal)} whispers this run to pass.`);
  return true;
}

export function abandonTrial() {
  if (!state.challenge) return false;
  setState(newRun(PERSIST));
  log('You abandon the trial. It is patient.');
  return true;
}

// ---------- Act III: the seals ----------

export const sealsUnlocked = () => act() >= 3;
export const sealBroken = id => state.seals.includes(id);
export function canBreakSeal(id) {
  const seal = SEALS.find(x => x.id === id);
  return sealsUnlocked() && !sealBroken(id) && !state.ending && seal.check(state) && state.whispers >= seal.cost;
}

export function breakSeal(id) {
  if (!canBreakSeal(id)) return false;
  const seal = SEALS.find(x => x.id === id);
  state.whispers -= seal.cost;
  state.seals.push(id);
  fx.flash = 1;
  log(`${seal.name} breaks. Everything you do is doubled, and the sky splits a little further.`);
  if (id === 'name') {
    state.finale = true;
    log('It is awake. It is waiting for you. Choose.');
    emit('finale');
  }
  return true;
}

// The ending you lean toward most is always open; others open if you leaned their way enough
export function availableEndings(s = state) {
  const a = s.alignment, top = Math.max(a.devotion, a.defiance, a.hunger);
  return ENDINGS.filter(e => a[e.align] === top || a[e.align] >= ENDING_MIN_ALIGN);
}

export function chooseEnding(id) {
  if (!state.finale || !availableEndings().some(e => e.id === id)) return false;
  state.finale = false;
  state.ending = id;
  if (!state.endings.includes(id)) state.endings.push(id);
  fx.ending = { id, start: Math.max(1, performance.now()) };
  emit('ending', id);
  return true;
}

// ---------- after the end ----------

// Begin again from nothing, stronger, carrying the ending's mark
export function newGamePlus() {
  if (!state.ending) return false;
  const ngMods = [...new Set([...state.ngMods, state.ending])];
  setState({ ...freshState(), ...pick(state, NG_KEEP), ngPlus: state.ngPlus + 1, ngMods, seenIntro: true });
  fx.ending = null;
  log(`It begins again. It has always begun again. (New Game+ ${state.ngPlus}: everything ×${1 + state.ngPlus}.)`);
  emit('new-game-plus');
  return true;
}

// Stay in the world after the ending and keep descending
export function keepDreaming() {
  if (!state.ending) return false;
  state.endless = true;
  fx.ending = null;
  log('You do not wake. You go deeper.');
  return true;
}

export const depthCost = () => DEPTH_BASE * DEPTH_GROWTH ** state.depth;
export function dreamDeeper() {
  if (!state.endless || state.whispers < depthCost()) return false;
  state.whispers -= depthCost();
  state.depth++;
  log(`Depth ${state.depth}. The dream is thicker here. (Everything ×3)`);
  return true;
}

// ---------- resets ----------

export function resetAll() {
  setState(freshState());
}

// Admin "fresh run": new run, keep everything that survives a summoning
export function freshRun() {
  setState(newRun(PERSIST));
}
