// ============================================================
// VESSEL PANEL — dress the avatar. Lives in its own tab; the preview
// only animates while the tab is on screen.
// ============================================================
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { COSMETICS, SLOT_NAMES, isUnlocked, equip } from '../core/cosmetics.js';
import { drawVessel } from '../scene/vessel.js';
import { REVELATION_BONUS } from '../core/constants.js';
import { REVELATIONS } from '../core/content-acts.js';
import { $, haptic } from './dom.js';
import { registerTip } from './inspect.js';

let previewOn = false, lastKey = '';

// Locked items are buttons without `disabled` so they can still be inspected (unlock hints)
export function drawSlots(force = false) {
  const key = state.cosmetics.unlocked.join() + JSON.stringify(state.cosmetics.equipped);
  if (!force && key === lastKey) return;
  lastKey = key;
  $('slots').innerHTML = Object.entries(COSMETICS).map(([slot, opts]) => `
    <h3>${SLOT_NAMES[slot]}</h3>
    <div class="opts">${opts.map(o => {
      const open = isUnlocked(slot, o.id), worn = state.cosmetics.equipped[slot] === o.id;
      return `<button class="small ${worn ? 'active' : ''} ${open ? '' : 'sealed'}" data-equip="${slot}:${o.id}" data-tip="cos:${slot}:${o.id}">
        ${open ? o.name : '???'}</button>`;
    }).join('')}</div>`).join('');
}

// Revelations (achievements): a grid of tiles; sealed ones show only their hint
let revKey = '';
function drawRevelations(force = false) {
  const key = state.revelations.join();
  if (!force && key === revKey) return;
  revKey = key;
  const n = state.revelations.length;
  $('vessel-extra').innerHTML = `
    <h2>Revelations <span class="sub">${n} / ${REVELATIONS.length} · +${Math.round(n * REVELATION_BONUS * 100)}% to everything</span></h2>
    <div class="revelations">${REVELATIONS.map(r => {
      const got = state.revelations.includes(r.id);
      return `<div class="rev ${got ? 'got' : ''}" data-tip="rev:${r.id}">${got ? r.name : '?'}</div>`;
    }).join('')}</div>`;
}

function startPreview() {
  if (previewOn) return;
  previewOn = true;
  const pc = $('vessel-preview'), g = pc.getContext('2d');
  const loop = now => {
    if (!previewOn) return;
    const t = now / 1000;
    g.clearRect(0, 0, pc.width, pc.height);
    g.fillStyle = 'rgba(125,255,176,0.12)';
    g.beginPath(); g.ellipse(20, 30, 12, 2.5, 0, 0, Math.PI * 2); g.fill();
    drawVessel(g, 20, 30, t, (t % 3) > 1.5);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export function initVesselPanel() {
  $('slots').addEventListener('click', e => {
    const b = e.target.closest('[data-equip]'); if (!b || b.classList.contains('sealed')) return;
    const [slot, id] = b.dataset.equip.split(':');
    equip(slot, id); drawSlots(); haptic(8);
  });
  on('tab', tab => {
    if (tab === 'vessel') { state.cosmetics.unseen = false; drawSlots(true); startPreview(); }
    else previewOn = false;
  });
  on('state-replaced', () => { drawSlots(true); drawRevelations(true); });
  on('revelation', () => drawRevelations());
  registerTip('rev', id => {
    const r = REVELATIONS.find(r => r.id === id), got = state.revelations.includes(id);
    return `<b>${got ? r.name : '???'}</b><p>${r.desc}</p><p class="sub">${got ? `Revealed. +${REVELATION_BONUS * 100}% to everything.` : 'Not yet revealed.'}</p>`;
  });
  setInterval(() => { if (previewOn) drawSlots(); }, 1000);
  drawSlots(true);
  drawRevelations(true);
}
