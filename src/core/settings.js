// Player preferences. Stored separately from the save so wiping progress keeps them.
import { emit } from './events.js';

const KEY = 'summoning-settings';

export const settings = {
  reducedMotion: false,   // no flash, shake or glitch; calmer CSS animation
  notation: 'suffix',     // 'suffix' (1.23M) or 'scientific' (1.23e6)
  omenFeed: true,         // mobile: omens drift in over the game
};

export function loadSettings(storage, defaults = {}) {
  Object.assign(settings, defaults);
  try { Object.assign(settings, JSON.parse(storage.getItem(KEY)) ?? {}); } catch { /* keep defaults */ }
}

export function setSetting(key, value, storage) {
  settings[key] = value;
  try { storage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode etc. */ }
  emit('settings', settings);
}
