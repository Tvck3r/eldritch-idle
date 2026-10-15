// ============================================================
// TOOLTIPS — any element with data-tip="key" gets a live tooltip.
// Keys map to functions returning HTML; prefixed keys ("gen:acolyte",
// "cos:mask:bone") cover list items.
//
// Mouse: hover. Touch: tap text to toggle its tip; press-and-hold a
// button (a plain tap still buys). Tap anywhere else to dismiss.
// (Phase 2 replaces touch tooltips with a tap-to-inspect bottom sheet.)
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, SANITY_REGEN, MADNESS_MAX_BONUS, MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT,
} from '../core/constants.js';
import { GENERATORS } from '../core/content.js';
import { state, hasPact } from '../core/state.js';
import {
  modifiers, wps, genRate, clickValue, favorMult, madnessMult, favorGain, sanityDrain, genCost,
} from '../core/economy.js';
import { cosmetic, isUnlocked } from '../core/cosmetics.js';
import { fmt } from '../core/format.js';
import { dl, pctOf } from './dom.js';

const TIPS = {
  whispers: () => `<b>Whispers</b>
    <p>The currency of devotion. Chant or let your followers murmur, then spend them on Followers and Rites.</p>` +
    dl([['This run', fmt(state.totalEarned)], ['All lives', fmt(state.lifetimeEarned)]]),

  wps: () => {
    const m = modifiers(), total = wps(m);
    return `<b>Whispers per second</b>
      <p>What your followers produce on their own. The second number is what one Chant gives you.</p>` +
      dl([
        ...GENERATORS.filter(g => state.owned[g.id]).map(g => [g.name, pctOf(genRate(g, m), total)]),
        state.favor > 0 && ['Favor bonus', `×${favorMult().toFixed(2)}`],
        state.sanity < 100 && ['Madness bonus', `×${madnessMult().toFixed(2)}`],
        ['Per chant', fmt(clickValue(m))],
      ]);
  },

  favor: () => `<b>Eldritch Favor</b>
    <p>Earned by summoning It. Each <i>unspent</i> point adds +${FAVOR_BONUS * 100}% to everything. Spend it on Pacts for permanent perks — but spent Favor stops boosting you.</p>` +
    dl([['Unspent', state.favor], ['Current bonus', `×${favorMult().toFixed(2)}`],
        ['Next summoning', favorGain() > 0 ? `+${favorGain()}` : `Earn ${fmt(VEIL_GOAL)} this run`]]),

  sanity: () => {
    const net = SANITY_REGEN - sanityDrain();
    return `<b>Sanity</b>
      <p>Your greater followers wear on your mind. Lower sanity makes you more productive (up to ×${1 + MADNESS_MAX_BONUS} at 0%), but below ${MADNESS_THRESHOLD}% madness strikes at random. Your mind rests while you're away.</p>` +
      dl([['Recovers', `+${SANITY_REGEN}/s`], ['Drained by followers', `−${sanityDrain().toFixed(2)}/s`],
          ['Net', `${net >= 0 ? '+' : ''}${net.toFixed(2)}/s`], ['Madness bonus', `×${madnessMult().toFixed(2)}`],
          ['Steady Mind', `costs ${STEADY_COST * 100}% of whispers, +${STEADY_AMOUNT}`]]);
  },

  veil: () => `<b>The Veil</b>
    <p>The barrier between this world and Its. Earn ${fmt(VEIL_GOAL)} whispers in a single run to tear it, then Summon It for Eldritch Favor. The bar is logarithmic — every ×10 moves it the same distance.</p>` +
    dl([['This run', `${fmt(state.totalEarned)} / ${fmt(VEIL_GOAL)}`], ['Summonings', state.summonings]]),

  gen: id => {
    const g = GENERATORS.find(g => g.id === id), m = modifiers();
    const each = g.rate * m.gen[g.id] * m.all, n = state.owned[g.id];
    const drain = g.drain * n * (hasPact('steadfast') ? 0.5 : 1);
    return `<b>${g.name}</b><p>${g.desc}</p>` + dl([
      ['Each produces', `${fmt(each)}/s`],
      ['All ' + n, `${fmt(each * n)}/s (${pctOf(each * n, wps(m))})`],
      g.drain > 0 && ['Sanity drain', `−${drain.toFixed(2)}/s (${g.drain} each)`],
      ['Next one costs', fmt(genCost(g))],
    ]);
  },

  cos: key => {
    const [slot, id] = key.split(':'), o = cosmetic(slot, id);
    return isUnlocked(slot, id)
      ? `<b>${o.name}</b><p>${state.cosmetics.equipped[slot] === id ? 'Worn.' : 'Click to equip.'}</p>`
      : `<b>???</b><p>${o.hint}</p>`;
  },
};

function tipHtml(key) {
  const [name, ...rest] = key.split(':');
  return TIPS[name](rest.join(':'));
}

let tipEl, tipTarget = null, mouse = { x: 0, y: 0 };

function placeTip() {
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = mouse.x + 16, y = mouse.y + 18;
  if (x + w > innerWidth - 8) x = mouse.x - w - 12;
  if (y + h > innerHeight - 8) y = mouse.y - h - 12;
  tipEl.style.left = Math.max(8, x) + 'px';
  tipEl.style.top = Math.max(8, y) + 'px';
}

function refreshTip() {
  if (!tipTarget || !document.contains(tipTarget)) { tipTarget = null; tipEl.style.display = 'none'; return; }
  tipEl.innerHTML = tipHtml(tipTarget.dataset.tip);
  tipEl.style.display = 'block';
  placeTip();
}

const showTip = el => { tipTarget = el; refreshTip(); };
const hideTip = () => { tipTarget = null; refreshTip(); };

export function initTooltips() {
  tipEl = document.createElement('div');
  tipEl.id = 'tooltip';
  document.body.appendChild(tipEl);

  let lastPointer = 'mouse', pressTimer = null, swallowClick = false;

  document.addEventListener('mouseover', e => {
    if (lastPointer === 'touch') return; // browsers fake mouseover after a tap
    showTip(e.target.closest('[data-tip]'));
  });
  document.addEventListener('mousemove', e => {
    if (lastPointer === 'touch') return;
    mouse = { x: e.clientX, y: e.clientY };
    if (tipTarget) placeTip();
  });

  document.addEventListener('pointerdown', e => {
    lastPointer = e.pointerType;
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest('[data-tip]');
    if (!el) return hideTip();
    if (el.tagName !== 'BUTTON') {
      // tapping the same thing again closes it instead of nudging it around
      if (el === tipTarget) return hideTip();
      mouse = { x: e.clientX, y: e.clientY - 40 }; // keep the tip clear of the finger
      return showTip(el);
    }
    if (tipTarget) hideTip(); // tapping a button dismisses whatever was open
    pressTimer = setTimeout(() => {
      mouse = { x: e.clientX, y: e.clientY - 40 };
      showTip(el);
      swallowClick = true; // the long-press shouldn't also buy
    }, 450);
  }, true);

  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => clearTimeout(pressTimer), true);
  document.addEventListener('click', e => {
    if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('contextmenu', e => {
    if (lastPointer === 'touch' && e.target.closest('[data-tip]')) e.preventDefault();
  });
  window.addEventListener('scroll', () => { if (lastPointer === 'touch' && tipTarget) hideTip(); }, { passive: true });

  setInterval(() => { if (tipTarget) refreshTip(); }, 250);
}
