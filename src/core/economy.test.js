import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { COST_GROWTH, VEIL_GOAL, SUMMON_MS, SANITY_REGEN, STEADY_AMOUNT } from './constants.js';
import { GENERATORS, OMENS } from './content.js';
import { state, setState, freshState, fx } from './state.js';
import { on } from './events.js';
import * as eco from './economy.js';

const [acolyte, cultist, circle] = GENERATORS;

beforeEach(() => {
  setState(freshState());
  fx.summonStart = 0;
  fx.flash = 0;
});
afterEach(() => vi.restoreAllMocks());

describe('costs', () => {
  it('first purchase costs the base cost', () => {
    expect(eco.genCost(acolyte)).toBe(acolyte.baseCost);
  });

  it('grows by COST_GROWTH for each one owned', () => {
    state.owned.acolyte = 10;
    expect(eco.genCost(acolyte)).toBe(Math.ceil(acolyte.baseCost * COST_GROWTH ** 10));
  });

  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += acolyte.baseCost * COST_GROWTH ** i;
    expect(eco.genCost(acolyte, 10)).toBe(Math.ceil(sum));
  });

  it('maxAffordable is exactly the most you can buy', () => {
    for (const w of [0, 14, 15, 100, 1234, 1e6, 1e12]) {
      state.whispers = w;
      const n = eco.maxAffordable(acolyte);
      if (n > 0) expect(eco.genCost(acolyte, n)).toBeLessThanOrEqual(w);
      expect(eco.genCost(acolyte, n + 1)).toBeGreaterThan(w);
    }
  });

  it('buyGenerator spends whispers, and refuses when you cannot afford it', () => {
    state.whispers = 20;
    expect(eco.buyGenerator('acolyte', 1)).toBe(true);
    expect(state.owned.acolyte).toBe(1);
    expect(state.whispers).toBe(5);
    expect(eco.buyGenerator('acolyte', 1)).toBe(false);
    expect(state.owned.acolyte).toBe(1);
  });

  it('max buy mode buys as many as affordable, but at least shows one', () => {
    state.buyMode = 'max';
    expect(eco.buyAmount(acolyte)).toBe(1);
    state.whispers = 1e4;
    expect(eco.buyAmount(acolyte)).toBe(eco.maxAffordable(acolyte));
  });
});

describe('production', () => {
  it('nothing owned, nothing produced', () => {
    expect(eco.wps()).toBe(0);
  });

  it('sums each follower tier', () => {
    state.owned.acolyte = 10;
    state.owned.cultist = 2;
    expect(eco.wps()).toBeCloseTo(10 * acolyte.rate + 2 * cultist.rate);
  });

  it('rites multiply their tier', () => {
    state.owned.acolyte = 10;
    state.upgrades.push('robes');
    expect(eco.wps()).toBeCloseTo(10 * acolyte.rate * 2);
  });

  it('each unspent Favor adds 10%', () => {
    state.owned.cultist = 1;
    state.favor = 5;
    expect(eco.wps()).toBeCloseTo(cultist.rate * 1.5);
  });

  it('madness doubles output at 0 sanity', () => {
    state.owned.cultist = 1;
    state.sanity = 0;
    expect(eco.wps()).toBeCloseTo(cultist.rate * 2);
  });

  it('chanting earns the click value and counts chants', () => {
    state.pacts.push('deepchant');
    eco.chant();
    expect(state.whispers).toBe(5);
    expect(state.stats.chants).toBe(1);
  });
});

describe('favor', () => {
  it.each([
    [VEIL_GOAL - 1, 0],
    [VEIL_GOAL, 10],
    [VEIL_GOAL * 4, 20],
    [VEIL_GOAL * 9, 30],
  ])('earning %d this run gives %d Favor', (earned, favor) => {
    expect(eco.favorGain(earned)).toBe(favor);
  });

  it('pacts spend Favor', () => {
    state.favor = 10;
    expect(eco.buyPact('steadfast')).toBe(true);
    expect(state.favor).toBe(5);
    expect(eco.buyPact('steadfast')).toBe(false); // already sealed
  });
});

describe('summoning', () => {
  const tornVeil = () => {
    state.totalEarned = VEIL_GOAL * 4;
    state.lifetimeEarned = VEIL_GOAL * 5;
    state.whispers = 1e6;
    state.owned.cultist = 40;
    state.upgrades.push('robes');
    state.favor = 3;
    state.summonings = 1;
    state.pacts.push('firstborn');
    state.stats.chants = 99;
  };

  it('resets the run but keeps lasting progress', () => {
    tornVeil();
    eco.performSummon();
    expect(state.whispers).toBe(0);
    expect(state.totalEarned).toBe(0);
    expect(state.owned.cultist).toBe(0);
    expect(state.upgrades).toEqual([]);
    expect(state.favor).toBe(3 + 20);
    expect(state.summonings).toBe(2);
    expect(state.lifetimeEarned).toBe(VEIL_GOAL * 5);
    expect(state.stats.chants).toBe(99);
    expect(state.sanity).toBe(100);
  });

  it('applies starting-follower pacts', () => {
    tornVeil();
    state.pacts.push('congregation');
    eco.performSummon();
    expect(state.owned.acolyte).toBe(10);
    expect(state.owned.cultist).toBe(10);
  });

  it('keeps rites with Rites Remembered', () => {
    tornVeil();
    state.pacts.push('remembered');
    eco.performSummon();
    expect(state.upgrades).toEqual(['robes']);
  });

  it('refuses before the veil tears', () => {
    state.totalEarned = VEIL_GOAL / 2;
    expect(eco.canSummon()).toBe(false);
    expect(eco.beginSummon()).toBe(false);
  });

  it('waits for the animation before resetting', () => {
    vi.useFakeTimers();
    tornVeil();
    expect(eco.beginSummon()).toBe(true);
    expect(eco.beginSummon()).toBe(false); // already underway
    expect(state.summonings).toBe(1);
    vi.advanceTimersByTime(SUMMON_MS);
    expect(state.summonings).toBe(2);
    expect(fx.summonStart).toBe(0);
    vi.useRealTimers();
  });

  it('preview plays the animation without resetting', () => {
    vi.useFakeTimers();
    state.owned.cultist = 5;
    expect(eco.beginSummon({ preview: true })).toBe(true);
    vi.advanceTimersByTime(SUMMON_MS);
    expect(state.owned.cultist).toBe(5);
    vi.useRealTimers();
  });
});

describe('time', () => {
  it('tick earns production and moves sanity', () => {
    state.owned.cultist = 10;
    state.owned.city = 10; // drains 5/s
    state.sanity = 50;
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no madness
    const rate = eco.wps(); // production is computed before sanity moves
    eco.tick(1);
    expect(state.totalEarned).toBeCloseTo(rate);
    expect(state.sanity).toBeCloseTo(50 + SANITY_REGEN - 5);
  });

  it('catchUp earns but the mind rests: no sanity change, no madness', () => {
    state.owned.city = 10;
    state.sanity = 20;
    const random = vi.spyOn(Math, 'random');
    const rate = eco.wps();
    eco.catchUp(3600);
    expect(state.whispers).toBeCloseTo(rate * 3600);
    expect(state.sanity).toBe(20);
    expect(random).not.toHaveBeenCalled();
  });

  it('omens fire once each, in order', () => {
    const lines = [];
    const off = on('log', msg => lines.push(msg));
    state.totalEarned = 1500;
    eco.checkOmens();
    eco.checkOmens();
    off();
    expect(lines).toEqual(OMENS.slice(0, 3).map(([, text]) => text));
    expect(state.omensSeen).toBe(3);
  });

  it('The Faithful Multiply buys the cheapest follower over time', () => {
    state.pacts.push('faithful');
    state.whispers = 1e6;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    eco.tick(1);
    expect(state.owned.acolyte).toBe(2);
  });
});

describe('sanity', () => {
  it('Steady Mind trades 10% of whispers for sanity', () => {
    state.whispers = 1000;
    state.sanity = 50;
    expect(eco.steadyMind()).toBe(true);
    expect(state.whispers).toBe(900);
    expect(state.sanity).toBe(50 + STEADY_AMOUNT);
  });

  it('Steady Mind does nothing at full sanity', () => {
    state.whispers = 1000;
    expect(eco.steadyMind()).toBe(false);
    expect(state.whispers).toBe(1000);
  });

  it('Iron Mind halves the drain', () => {
    state.owned.circle = 10;
    const full = eco.sanityDrain();
    state.pacts.push('steadfast');
    expect(eco.sanityDrain()).toBeCloseTo(full / 2);
    expect(full).toBeCloseTo(10 * circle.drain);
  });
});

describe('ceaseless chant', () => {
  it('holding Chant is unlocked by the Ceaseless Chant rite', () => {
    expect(eco.canHoldChant()).toBe(false);
    state.totalEarned = 300;
    state.whispers = 500;
    expect(eco.buyUpgrade('ceaseless')).toBe(true);
    expect(eco.canHoldChant()).toBe(true);
  });
});
