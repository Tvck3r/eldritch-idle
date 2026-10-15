import { state } from '../core/state.js';
import { COSMETICS, SLOT_NAMES, isUnlocked, equip } from '../core/cosmetics.js';
import { drawVessel } from '../scene/vessel.js';
import { $ } from './dom.js';
import { openModal } from './modal.js';

let previewOn = false;

export function openWardrobe() {
  state.cosmetics.unseen = false;
  openModal(`
    <h2 class="modal-title">Your Vessel</h2>
    <div class="wardrobe">
      <canvas id="vessel-preview" width="36" height="32"></canvas>
      <div id="slots"></div>
    </div>`, () => { previewOn = false; });

  // Locked items are buttons without `disabled` so their tooltips (unlock hints) still work
  const drawSlots = () => {
    $('slots').innerHTML = Object.entries(COSMETICS).map(([slot, opts]) => `
      <h3>${SLOT_NAMES[slot]}</h3>
      <div class="opts">${opts.map(o => {
        const open = isUnlocked(slot, o.id), worn = state.cosmetics.equipped[slot] === o.id;
        return `<button class="small ${worn ? 'active' : ''} ${open ? '' : 'sealed'}" data-equip="${slot}:${o.id}" data-tip="cos:${slot}:${o.id}">
          ${open ? o.name : '???'}</button>`;
      }).join('')}</div>`).join('');
  };
  drawSlots();
  $('slots').onclick = e => {
    const b = e.target.closest('[data-equip]'); if (!b) return;
    const [slot, id] = b.dataset.equip.split(':');
    equip(slot, id); drawSlots();
  };

  // live preview: alternate poses so you can see relics raised and lowered
  const pc = $('vessel-preview'), g = pc.getContext('2d');
  previewOn = true;
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
