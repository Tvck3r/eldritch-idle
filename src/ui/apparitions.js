// ============================================================
// APPARITIONS — the scene draws them; this puts an invisible, generous
// tap target over each one, and shows running buffs as chips on the scene.
// ============================================================
import { APPARITIONS, BUFFS } from '../core/content.js';
import { state, fx } from '../core/state.js';
import { catchApparition } from '../core/economy.js';
import { on } from '../core/events.js';
import { $, haptic } from './dom.js';
import { registerTip } from './inspect.js';

const W = 320, H = 100;   // scene canvas size

let target = null, targetFor = null;

function syncTarget() {
  const a = fx.apparition;
  if (!a) { target?.remove(); target = targetFor = null; return; }
  if (targetFor !== a) {
    target?.remove();
    target = document.createElement('button');
    target.className = 'apparition';
    target.setAttribute('aria-label', APPARITIONS.find(d => d.id === a.id).name);
    target.style.left = (a.x / W * 100) + '%';
    target.style.top = (a.y / H * 100) + '%';
    target.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (catchApparition()) haptic([10, 30, 10]);
    });
    $('apparitions').appendChild(target);
    targetFor = a;
  }
}

let buffKey = '';
function syncBuffs() {
  const key = state.buffs.map(b => `${b.id}:${Math.ceil(b.left)}`).join();
  if (key === buffKey) return;
  buffKey = key;
  $('buff-strip').innerHTML = state.buffs.map(b =>
    `<span class="buff" data-tip="buff:${b.id}">${BUFFS[b.id].name} <b>${Math.ceil(b.left)}s</b></span>`).join('');
}

export function initApparitions() {
  registerTip('buff', id => {
    const b = BUFFS[id], live = state.buffs.find(x => x.id === id);
    return `<b>${b.name}</b><p>${b.desc}.</p><p class="sub">${live ? Math.ceil(live.left) + ' seconds left.' : 'Faded.'}</p>`;
  });
  on('state-replaced', () => { buffKey = ''; });
  setInterval(() => { syncTarget(); syncBuffs(); }, 100);
}
