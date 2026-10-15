// ============================================================
// SAVE — versioned envelope + migration chain + export/import.
//
// Stored as JSON: { v: SAVE_VERSION, state: {...} }.
// To change the save shape: bump SAVE_VERSION and add MIGRATIONS[old]
// that turns a version-`old` state into version `old + 1`.
// ============================================================
import { state, freshState } from './state.js';

export const SAVE_KEY = 'summoning-save-v1'; // kept for continuity; the real version lives inside
export const SAVE_VERSION = 3;
const EXPORT_PREFIX = 'SUMMONING:';

const MIGRATIONS = {
  // v1 (first builds, 2026-10-14): bare state object, no envelope
  1: s => ({ ...s, lifetimeEarned: s.lifetimeEarned ?? s.totalEarned ?? 0 }),
  // v2 (Phase 1–2): Acts I–III add many fields; normalize() fills them in. Nothing to convert.
  2: s => s,
};

// Fill in anything missing from older saves and reject garbage
function normalize(s) {
  const fresh = freshState();
  if (typeof s !== 'object' || s === null) throw new Error('Save is not an object');
  if (!Number.isFinite(s.whispers) || !Number.isFinite(s.totalEarned ?? 0)) throw new Error('Save numbers are damaged');
  const out = {
    ...fresh, ...s,
    owned: { ...fresh.owned, ...s.owned },
    stats: { ...fresh.stats, ...s.stats },
    cosmetics: { ...fresh.cosmetics, ...s.cosmetics,
      equipped: { ...fresh.cosmetics.equipped, ...s.cosmetics?.equipped } },
    alignment: { ...fresh.alignment, ...s.alignment },
    auto: { ...fresh.auto, ...s.auto },
  };
  if (Object.values(out.owned).some(n => !Number.isFinite(n) || n < 0)) throw new Error('Follower counts are damaged');
  return out;
}

export function migrate(data) {
  const enveloped = data && typeof data.v === 'number' && typeof data.state === 'object';
  let v = enveloped ? data.v : 1;
  let s = enveloped ? data.state : data;
  if (v > SAVE_VERSION) throw new Error(`Save is from a newer version (v${v})`);
  for (; v < SAVE_VERSION; v++) s = MIGRATIONS[v](s);
  return normalize(s);
}

export const serialize = (s = state) => JSON.stringify({ v: SAVE_VERSION, state: s });
export const deserialize = json => migrate(JSON.parse(json));

export function saveGame(storage, s = state) {
  try { storage.setItem(SAVE_KEY, serialize(s)); return true; } catch { return false; }
}

// → { state } on success, { state: null } if there's no save,
//   { state: null, error } if the save is unreadable (a copy is kept aside)
export function loadGame(storage) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { state: null };
  try {
    return { state: deserialize(raw) };
  } catch (error) {
    try { storage.setItem(`${SAVE_KEY}-corrupt-${Date.now()}`, raw); } catch { /* storage full */ }
    return { state: null, error };
  }
}

// ---------- export / import (copy-paste string) ----------

const toBase64 = str => {
  let bin = '';
  for (const b of new TextEncoder().encode(str)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export const exportSave = (s = state) => EXPORT_PREFIX + toBase64(serialize(s));

export function importSave(text) {
  const t = text.trim();
  if (!t.startsWith(EXPORT_PREFIX)) throw new Error('That is not a Summoning save.');
  let json;
  try { json = fromBase64(t.slice(EXPORT_PREFIX.length)); } catch { throw new Error('The save text is garbled.'); }
  return deserialize(json);
}
