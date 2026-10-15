import { describe, it, expect, beforeEach } from 'vitest';
import { state, setState, freshState } from './state.js';
import {
  SAVE_KEY, SAVE_VERSION, serialize, deserialize, migrate, saveGame, loadGame, exportSave, importSave,
} from './save.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), keys: () => [...m.keys()] };
};

beforeEach(() => setState(freshState()));

describe('save format', () => {
  it('round-trips the state', () => {
    state.whispers = 1234.5;
    state.owned.cultist = 7;
    state.pacts.push('steadfast');
    expect(deserialize(serialize())).toEqual(state);
  });

  it('writes a versioned envelope', () => {
    expect(JSON.parse(serialize()).v).toBe(SAVE_VERSION);
  });

  it('migrates a v1 save (bare object, from the first builds)', () => {
    const v1 = { whispers: 50, totalEarned: 900, owned: { acolyte: 3 }, upgrades: [], favor: 0, summonings: 0, sanity: 100 };
    const s = migrate(v1);
    expect(s.lifetimeEarned).toBe(900);          // backfilled from totalEarned
    expect(s.owned.acolyte).toBe(3);
    expect(s.owned.city).toBe(0);                // new tiers filled in
    expect(s.cosmetics.equipped.robe).toBe('plain');
    expect(s.stats.chants).toBe(0);
  });

  it('refuses a save from a newer version', () => {
    expect(() => migrate({ v: SAVE_VERSION + 1, state: freshState() })).toThrow(/newer version/);
  });

  it('refuses damaged numbers', () => {
    expect(() => migrate({ v: SAVE_VERSION, state: { ...freshState(), whispers: null } })).toThrow();
    expect(() => migrate({ v: SAVE_VERSION, state: { ...freshState(), owned: { acolyte: -1 } } })).toThrow();
  });
});

describe('storage', () => {
  it('saves and loads', () => {
    const storage = memoryStorage();
    state.whispers = 42;
    saveGame(storage);
    setState(freshState());
    expect(loadGame(storage).state.whispers).toBe(42);
  });

  it('returns nothing when there is no save', () => {
    expect(loadGame(memoryStorage())).toEqual({ state: null });
  });

  it('sets a corrupt save aside instead of crashing', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    const result = loadGame(storage);
    expect(result.state).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    const backup = storage.keys().find(k => k.startsWith(`${SAVE_KEY}-corrupt-`));
    expect(storage.getItem(backup)).toBe('{not json');
  });
});

describe('export / import', () => {
  it('round-trips through the copy-paste string', () => {
    state.favor = 17;
    state.cosmetics.equipped.mask = 'goat';
    const text = exportSave();
    expect(text.startsWith('SUMMONING:')).toBe(true);
    expect(importSave(`  ${text}\n`)).toEqual(state);
  });

  it('rejects text that is not a save', () => {
    expect(() => importSave('hello')).toThrow(/not a Summoning save/);
    expect(() => importSave('SUMMONING:%%%')).toThrow(/garbled/);
  });
});
