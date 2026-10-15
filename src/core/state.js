import { GENERATORS } from './content.js';
import { emit } from './events.js';

export function freshState(now = Date.now()) {
  return {
    whispers: 0,
    totalEarned: 0,    // this run
    lifetimeEarned: 0, // across all runs
    owned: Object.fromEntries(GENERATORS.map(g => [g.id, 0])),
    upgrades: [],      // ids of purchased rites
    omensSeen: 0,      // index into OMENS
    summoned: false,   // veil-torn message shown this run
    favor: 0,          // unspent prestige currency
    summonings: 0,
    pacts: [],         // ids of purchased pacts (permanent)
    sanity: 100,
    buyMode: 1,        // 1, 10, or 'max'
    stats: { chants: 0, madnessEvents: 0, minSanity: 100 },
    cosmetics: { unlocked: [], equipped: { robe: 'plain', mask: 'none', relic: 'none', familiar: 'none' }, unseen: false },
    seenIntro: false,
    hints: [],         // one-time teaching hints already shown
    lastTick: now,
  };
}

// Keys that survive a summoning
export const PERSIST = ['lifetimeEarned', 'omensSeen', 'pacts', 'buyMode', 'stats', 'cosmetics', 'seenIntro', 'favor', 'summonings', 'hints'];
export const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

// The one saved object. Importers see reassignments (ES live binding),
// but must call setState() to replace it.
export let state = freshState();

export function setState(next) {
  state = next;
  emit('state-replaced');
}

export const hasPact = id => state.pacts.includes(id);

// Transient, never saved
export const fx = { chant: 0, flash: 0, summonStart: 0 }; // visual signals for the scene
export const runtime = { timeScale: 1 };                  // admin speed-up
