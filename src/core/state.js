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
    stats: { chants: 0, madnessEvents: 0, minSanity: 100, apparitions: 0, choices: 0 },
    cosmetics: { unlocked: [], equipped: { robe: 'plain', mask: 'none', relic: 'none', familiar: 'none' }, unseen: false },
    seenIntro: false,
    hints: [],         // one-time teaching hints already shown
    lastTick: now,

    // this run only
    runTime: 0,        // seconds of play this run
    runChants: 0,
    abyssTime: 0,      // seconds spent at 0 sanity in a row
    veilTime: 0,       // runTime when the veil tore this run (0 = not yet)
    runLost: 0,        // followers lost to madness this run
    buffs: [],         // [{ id, left }] temporary effects

    // Act I depth
    revelations: [],   // achievement ids
    story: [],         // story beat ids already told
    pendingChoice: null, // id of a madness choice waiting for an answer
    choicesMade: {},   // choice id -> option index
    alignment: { devotion: 0, defiance: 0, hunger: 0 },

    // Act II
    favorEarned: 0,    // Favor gained since the last Awakening
    awakenings: 0,
    elderSigns: 0,     // unspent
    elderSignsTotal: 0,
    sigils: [],
    ichor: 0,
    mutations: {},     // id -> level
    challenge: null,   // id of the running Trial
    challengesDone: [],
    oneFaith: null,    // Trial of One Faith: the follower chosen this run
    auto: { rites: false, steady: false, steadyAt: 20, buy: false, summon: false, summonAt: 50 },

    // Act III and after
    seals: [],
    finale: false,     // the Last Seal is broken: the final choice waits
    ending: null,      // the ending reached in this cycle
    endings: [],       // every ending ever reached
    ngPlus: 0,
    ngMods: [],        // ending ids whose NG+ modifiers apply
    endless: false,
    depth: 0,
  };
}

// Keys that survive a summoning (the rest are rebuilt fresh)
export const PERSIST = [
  'lifetimeEarned', 'omensSeen', 'pacts', 'buyMode', 'stats', 'cosmetics', 'seenIntro', 'favor', 'summonings', 'hints',
  'revelations', 'story', 'pendingChoice', 'choicesMade', 'alignment',
  'favorEarned', 'awakenings', 'elderSigns', 'elderSignsTotal', 'sigils', 'ichor', 'mutations', 'challengesDone', 'auto',
  'seals', 'finale', 'ending', 'endings', 'ngPlus', 'ngMods', 'endless', 'depth',
];
// An Awakening also forgets these (on top of a summoning's reset)
export const AWAKEN_RESET = ['favor', 'pacts', 'favorEarned', 'ichor', 'mutations'];
// A new game+ keeps only these
export const NG_KEEP = ['lifetimeEarned', 'buyMode', 'stats', 'cosmetics', 'seenIntro', 'hints', 'revelations', 'endings', 'ngPlus', 'ngMods', 'auto'];

export const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

// The one saved object. Importers see reassignments (ES live binding),
// but must call setState() to replace it.
export let state = freshState();

export function setState(next) {
  state = next;
  emit('state-replaced');
}

export const hasPact = id => state.pacts.includes(id);
export const hasSigil = id => state.sigils.includes(id);

// Transient, never saved
export const fx = {
  chant: 0, flash: 0, summonStart: 0,  // visual signals for the scene
  apparition: null,                    // { id, x, y, age, life } while one is on screen
  apparitionTimer: 60,                 // seconds until the next one
  ending: null,                        // { id, start } while the ending plays
};
export const runtime = { timeScale: 1 };                  // admin speed-up
