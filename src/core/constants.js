// Tuning knobs. Change numbers here; logic and UI text read from them.

export const VEIL_GOAL = 1e9;           // whispers earned in one run needed to summon
export const FAVOR_BONUS = 0.1;         // +10% to everything per unspent Eldritch Favor
export const SUMMON_MS = 3000;          // length of the summoning animation
export const ENDING_MS = 30000;         // length of the closing sequence
export const COST_GROWTH = 1.15;        // each follower costs this much more than the last

export const SANITY_REGEN = 0.5;        // per second
export const MADNESS_MAX_BONUS = 1;     // +100% production at 0 sanity
export const MADNESS_THRESHOLD = 40;    // madness events start below this
export const MADNESS_PACE = 1500;       // higher = rarer episodes (at 0 sanity: one per PACE/THRESHOLD s on average)
export const STEADY_COST = 0.1;         // fraction of whispers spent to steady your mind
export const STEADY_AMOUNT = 25;
export const DRAIN_SOFTCAP = 4;         // total drain eases toward this (per second), so late game isn't pure freefall

export const AUTO_BUY_INTERVAL = 0.5;   // seconds between purchases with The Faithful Multiply
export const CATCH_UP_THRESHOLD = 5;    // gaps longer than this (seconds) count as time away
export const HOLD_CHANT_RATE = 8;       // chants per second while holding Chant (Ceaseless Chant rite)

export const REVELATION_BONUS = 0.02;   // +2% to everything per revelation

// Act II
export const AWAKEN_FAVOR = 150;        // Favor earned since the last Awakening needed to Awaken
export const SIGN_FAVOR_BONUS = 0.25;   // +25% Favor gained per Elder Sign ever earned
export const ICHOR_RATE = 0.02;         // ichor/s at 0 sanity, per order of magnitude of whispers/sec
export const ICHOR_SANITY = 50;         // ichor only weeps below this sanity

// Act III
export const ACT3_AWAKENINGS = 3;       // the seals appear after this many Awakenings
export const SEAL_BONUS = 2;            // each broken seal doubles everything
export const DEPTH_BASE = 1e21;         // post-game: cost of the first Dream Deeper
export const DEPTH_GROWTH = 1000;       // each depth costs this much more
export const DEPTH_BONUS = 3;           // each depth triples everything
export const NG_BONUS = 1;              // NG+: everything ×(1 + NG_BONUS × cycles)
