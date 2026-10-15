// ============================================================
// COSMETICS — the Vessel's wardrobe. Purely cosmetic.
// Each slot's options unlock via achievements; add more freely.
// Sprites are text grids: each letter maps to a color in `colors`,
// '.' is transparent. Drawing lives in scene/vessel.js.
// ============================================================
import { VEIL_GOAL } from './constants.js';
import { UPGRADES, PACTS, OMENS } from './content.js';
import { state } from './state.js';
import { emit } from './events.js';

const GLOW = '#7dffb0';

export const COSMETICS = {
  robe: [
    { id: 'plain', name: 'Novice Robe', free: true,
      colors: { o: '#4a4258', d: '#2f2a3a', t: '#7a6f8f' } },
    { id: 'crimson', name: 'Crimson Vestments', hint: 'Command 25 Cultists at once.',
      unlock: s => s.owned.cultist >= 25, colors: { o: '#8a1f33', d: '#5c1222', t: '#d8b04a' } },
    { id: 'abyssal', name: 'Abyssal Silk', hint: 'Raise a Drowned Temple.',
      unlock: s => s.owned.temple >= 1, colors: { o: '#14505c', d: '#0b2f37', t: GLOW } },
    { id: 'void', name: 'Robe of the Void', hint: 'Summon It.',
      unlock: s => s.summonings >= 1, colors: { o: '#16101f', d: '#08060d', t: '#8f4fd6' } },
    { id: 'yellow', name: 'Tattered Yellow', hint: 'Summon It three times.',
      unlock: s => s.summonings >= 3, colors: { o: '#b89b2e', d: '#7a6418', t: '#3a2a08' } },
  ],
  mask: [
    { id: 'none', name: 'Bare Hood', free: true, rows: [] },
    { id: 'bone', name: 'Bone Mask', hint: 'Chant 500 times.',
      unlock: s => s.stats.chants >= 500,
      colors: { w: '#d8d0b8', e: GLOW },
      rows: ['.........', '.........', '.........', '.........', '.........',
             '...www...', '..wewew..', '..wwwww..', '...www...'] },
    { id: 'goat', name: 'Goat Skull', hint: 'Draw 10 Ritual Circles.',
      unlock: s => s.owned.circle >= 10,
      colors: { h: '#6b5a44', w: '#d8d0b8', e: '#ff5b6e', k: '#050308' },
      rows: ['h.......h', 'hh.....hh', '.hh...hh.', '..hwwwh..', '...www...',
             '..wewew..', '..wwwww..', '...wkw...', '...www...'] },
    { id: 'squid', name: 'Tentacled Visage', hint: 'Tear the veil.',
      unlock: s => s.lifetimeEarned >= VEIL_GOAL,
      colors: { g: '#3f7a5c', e: '#d8d29a' },
      rows: ['.........', '.........', '.........', '.........', '.........',
             '..ggggg..', '..gegeg..', '..ggggg..', '..g.g.g..', '..g.g.g..', '.g..g..g.'] },
    { id: 'eyes', name: 'Crown of Eyes', hint: 'Let your sanity reach zero.',
      unlock: s => s.stats.minSanity <= 0,
      colors: { r: '#ff5b6e' },
      rows: ['..r.r.r..', '.r.....r.', '.........', '...rrr...', '..r...r..'] },
  ],
  relic: [
    { id: 'none', name: 'Empty Hands', free: true },
    { id: 'candle', name: 'Black Candle', hint: 'Earn 1,000 whispers in total.',
      unlock: s => s.lifetimeEarned >= 1000, anchor: [1, 5],
      colors: { f: '#ff9b3b', y: '#ffd76b', k: '#1a1420' },
      rows: ['.f.', '.y.', '.k.', '.k.', '.k.', '.k.'] },
    { id: 'book', name: 'The Unnamed Text', hint: 'Build 5 Forbidden Libraries.',
      unlock: s => s.owned.library >= 5, anchor: [1, 3],
      colors: { b: '#4a2c1a', p: '#c9b88a', e: GLOW },
      rows: ['bbbbb', 'bpppb', 'bpepb', 'bbbbb'] },
    { id: 'dagger', name: 'Ritual Dagger', hint: 'Endure 5 episodes of madness.',
      unlock: s => s.stats.madnessEvents >= 5, anchor: [1, 5],
      colors: { m: '#c0c8d0', h: '#3a2a20', r: '#b3263e' },
      rows: ['.m.', '.m.', '.r.', '.m.', 'hhh', '.h.', '.h.'] },
    { id: 'staff', name: 'Staff of the Deep', hint: 'Perform every Rite in a single run.',
      unlock: s => s.upgrades.length >= UPGRADES.length, anchor: [1, 8],
      colors: { g: '#3a1f5c', e: GLOW, s: '#5a4030' },
      rows: ['.g.', 'geg', '.g.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.', '.s.'] },
  ],
  familiar: [
    { id: 'none', name: 'Alone', free: true },
    { id: 'rat', name: 'Whispering Rat', hint: 'Gather 50 Acolytes.', ground: true,
      unlock: s => s.owned.acolyte >= 50,
      colors: { r: '#5a5060', e: GLOW },
      frames: [['r....rr.', '.rrrrrer', '..r..r..'], ['r....rr.', '.rrrrrer', '.r....r.']] },
    { id: 'crow', name: 'Crow of Ill Omen', hint: 'Witness every omen.',
      unlock: s => s.omensSeen >= OMENS.length,
      colors: { k: '#1c1824', e: '#ff5b6e' },
      frames: [['k...k', 'kk.kk', '.kek.', '..k..'], ['.....', 'kkekk', 'k.k.k', '..k..']] },
    { id: 'eye', name: 'Floating Eye', hint: 'Seal a Pact.',
      unlock: s => s.pacts.length >= 1,
      colors: { p: '#3a1f5c', w: '#d8d29a', e: GLOW },
      frames: [['.ppp.', 'pwewp', '.ppp.'], ['.ppp.', 'pewwp', '.ppp.']] },
    { id: 'spawn', name: 'Star Spawnling', hint: 'Seal every Pact.',
      unlock: s => s.pacts.length >= PACTS.length,
      colors: { g: '#3f7a5c', e: '#d8d29a' },
      frames: [['.ggg.', 'gegeg', 'ggggg', 'g.g.g'], ['.ggg.', 'gegeg', 'ggggg', '.g.g.']] },
  ],
};
export const SLOT_NAMES = { robe: 'Robe', mask: 'Mask', relic: 'Relic', familiar: 'Familiar' };

export function cosmetic(slot, id) {
  return COSMETICS[slot].find(o => o.id === id) || COSMETICS[slot][0];
}

export function isUnlocked(slot, id) {
  const o = cosmetic(slot, id);
  return o.free || state.cosmetics.unlocked.includes(`${slot}:${id}`);
}

export function checkCosmetics() {
  for (const slot in COSMETICS) for (const o of COSMETICS[slot]) {
    if (o.free || isUnlocked(slot, o.id) || !o.unlock(state)) continue;
    state.cosmetics.unlocked.push(`${slot}:${o.id}`);
    state.cosmetics.unseen = true;
    emit('log', `Your vessel may now bear: ${o.name}.`);
  }
}

export function unlockAllCosmetics() {
  for (const slot in COSMETICS) for (const o of COSMETICS[slot])
    if (!o.free && !isUnlocked(slot, o.id)) state.cosmetics.unlocked.push(`${slot}:${o.id}`);
  state.cosmetics.unseen = true;
}

export function equip(slot, id) {
  if (isUnlocked(slot, id)) state.cosmetics.equipped[slot] = id;
}
