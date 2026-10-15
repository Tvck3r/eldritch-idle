// Tuning knobs. Change numbers here; logic and UI text read from them.

export const VEIL_GOAL = 1e9;           // whispers earned in one run needed to summon
export const FAVOR_BONUS = 0.1;         // +10% to everything per unspent Eldritch Favor
export const SUMMON_MS = 3000;          // length of the summoning animation
export const COST_GROWTH = 1.15;        // each follower costs this much more than the last

export const SANITY_REGEN = 0.5;        // per second
export const MADNESS_MAX_BONUS = 1;     // +100% production at 0 sanity
export const MADNESS_THRESHOLD = 40;    // madness events start below this
export const STEADY_COST = 0.1;         // fraction of whispers spent to steady your mind
export const STEADY_AMOUNT = 25;

export const AUTO_BUY_INTERVAL = 0.5;   // seconds between purchases with The Faithful Multiply
export const CATCH_UP_THRESHOLD = 5;    // gaps longer than this (seconds) count as time away
