import { saveGame } from '../core/save.js';

export const $ = id => document.getElementById(id);

// localStorage can throw (privacy modes, sandboxed iframes) — fall back to memory
export const storage = (() => {
  try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); return localStorage; } catch {
    const m = new Map();
    return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  }
})();

export const save = () => saveGame(storage);

export const isMobile = matchMedia('(max-width: 700px)');

// Little helpers for tooltip/guide HTML
export const pctOf = (part, total) => total > 0 ? `${(part / total * 100).toFixed(1)}%` : '—';
export const dl = pairs => `<dl>${pairs.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
