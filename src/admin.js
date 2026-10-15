// ============================================================
// ADMIN — dev cheats. Toggle with the ` (backtick) key, or open the
// page with ?admin in the URL. ?admin&save=<exported save> loads a
// save straight from the URL (handy for screenshots and bug reports).
// Remove the import in main.js to strip it.
// ============================================================
import { VEIL_GOAL, AWAKEN_FAVOR, ACT3_AWAKENINGS } from './core/constants.js';
import { GENERATORS, UPGRADES, PACTS } from './core/content.js';
import { SEALS } from './core/content-acts.js';
import { state, setState, freshState, runtime } from './core/state.js';
import { earn, madnessEvent, spawnApparition, askChoice } from './core/economy.js';
import { beginSummon, freshRun, awaken } from './core/prestige.js';
import { emit } from './core/events.js';
import { unlockAllCosmetics } from './core/cosmetics.js';
import { importSave, SAVE_KEY } from './core/save.js';
import { storage } from './ui/dom.js';
import { showIntro } from './ui/intro.js';
import { rebuildLists } from './ui/render.js';

const params = new URLSearchParams(location.search);

// Call before the first render
export function applyDebugSave() {
  if (!params.has('admin') || !params.has('save')) return;
  try { setState(importSave(params.get('save'))); } catch (e) { console.warn('Bad ?save param:', e.message); }
}

const actions = {
  w3: () => earn(1e3),
  w6: () => earn(1e6),
  w9: () => earn(1e9),
  gens: () => GENERATORS.forEach(g => state.owned[g.id] += 10),
  rites: () => { state.upgrades = UPGRADES.map(u => u.id); },
  veil: () => earn(Math.max(0, VEIL_GOAL - state.totalEarned)),
  favor: () => { state.favor += 10; },
  pacts: () => { state.pacts = PACTS.map(p => p.id); },
  max: () => {
    GENERATORS.forEach(g => state.owned[g.id] = Math.max(state.owned[g.id], 30));
    state.upgrades = UPGRADES.map(u => u.id);
    state.pacts = PACTS.map(p => p.id);
    state.summonings = Math.max(state.summonings, 6);  // biggest Watcher
    state.favor += 20;
    earn(Math.max(0, VEIL_GOAL * 4 - state.totalEarned));
  },
  preview: () => beginSummon({ preview: true }),
  event: () => madnessEvent(),
  blank: () => freshRun(),
  cosmetics: () => unlockAllCosmetics(),
  intro: () => showIntro(),
  wipe: () => { storage.removeItem(SAVE_KEY); setState(freshState()); location.reload(); },
  // Acts
  apparition: () => spawnApparition(),
  question: () => { if (!state.pendingChoice) askChoice() || log('Every question has been asked.'); },
  awaken: () => { state.favorEarned = Math.max(state.favorEarned, AWAKEN_FAVOR); awaken(); },
  signs: () => { state.elderSigns += 10; state.elderSignsTotal += 10; },
  ichor: () => { state.ichor += 100; },
  act3: () => { state.awakenings = Math.max(state.awakenings, ACT3_AWAKENINGS); },
  seal: () => { const s = SEALS.find(s => !state.seals.includes(s.id) && s.id !== 'name'); if (s) state.seals.push(s.id); },
  finale: () => {
    state.awakenings = Math.max(state.awakenings, ACT3_AWAKENINGS);
    state.seals = SEALS.map(s => s.id);
    state.finale = true;
    emit('finale');
  },
};
const log = msg => emit('log', msg);

export function initAdmin() {
  const panel = document.createElement('div');
  panel.id = 'admin';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="title"><span>ADMIN <span class="sub">\` to toggle</span></span><button data-close class="small">×</button></div>
    <label>Whispers</label>
    <div class="grid">
      <button data-a="w3">+1K</button><button data-a="w6">+1M</button><button data-a="w9">+1B</button>
    </div>
    <label>Unlock</label>
    <div class="grid">
      <button data-a="gens">+10 all followers</button><button data-a="rites">All rites</button><button data-a="veil">Tear veil</button>
      <button data-a="favor">+10 Favor</button><button data-a="pacts">All pacts</button><button data-a="max">EVERYTHING</button>
    </div>
    <label>Watch</label>
    <div class="grid">
      <button data-a="preview">Summon anim</button><button data-a="event">Madness event</button><button data-a="blank">Fresh run</button>
      <button data-a="cosmetics">All vestments</button><button data-a="intro">Title screen</button><button data-a="wipe">Wipe save</button>
    </div>
    <label>Acts</label>
    <div class="grid">
      <button data-a="apparition">Apparition</button><button data-a="question">Question</button><button data-a="awaken">Awaken</button>
      <button data-a="signs">+10 Signs</button><button data-a="ichor">+100 Ichor</button><button data-a="act3">Act III</button>
      <button data-a="seal">Break a seal</button><button data-a="finale">Finale</button>
    </div>
    <label>Speed</label>
    <div class="grid">
      <button data-speed="1" class="on">1×</button><button data-speed="10">10×</button><button data-speed="100">100×</button>
    </div>
    <label>Sanity <span id="admin-san"></span></label>
    <input id="admin-sanity" type="range" min="0" max="100">
  `;
  document.body.appendChild(panel);

  const toggle = () => { panel.style.display = panel.style.display === 'none' ? '' : 'none'; };
  if (params.has('admin') && params.get('admin') !== '0') toggle(); // ?admin=0: cheats loaded, panel closed
  window.addEventListener('keydown', e => { if (e.key === '`') toggle(); });

  panel.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return toggle();
    const a = e.target.closest('[data-a]');
    if (a) { actions[a.dataset.a](); rebuildLists(); }
    const s = e.target.closest('[data-speed]');
    if (s) {
      runtime.timeScale = Number(s.dataset.speed);
      panel.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', b === s));
    }
  });

  const slider = panel.querySelector('#admin-sanity');
  slider.addEventListener('input', () => { state.sanity = Number(slider.value); });
  setInterval(() => {
    if (document.activeElement !== slider) slider.value = state.sanity;
    panel.querySelector('#admin-san').textContent = Math.floor(state.sanity);
  }, 200);
}
