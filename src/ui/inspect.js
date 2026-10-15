// ============================================================
// INSPECT — any element with data-tip="key" can be inspected.
// Keys map to functions returning HTML; prefixed keys ("gen:acolyte",
// "cos:mask:bone") cover list items. Other modules add their own with
// registerTip() / registerAction().
//
// Mouse: a hover tooltip. Touch: a tap opens a bottom sheet that stays
// live (and can carry a buy button). On list rows, the info side
// inspects and the price side buys, so there is no long-press guessing.
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, SANITY_REGEN, MADNESS_MAX_BONUS, MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT,
} from '../core/constants.js';
import { GENERATORS, UPGRADES, PACTS } from '../core/content.js';
import { state, hasPact } from '../core/state.js';
import {
  modifiers, wps, genRate, clickValue, favorMult, madnessMult, favorGain, sanityDrain, rawDrain, genCost, buyAmount,
  buyGenerator, buyUpgrade, buyPact,
} from '../core/economy.js';
import { cosmetic, isUnlocked } from '../core/cosmetics.js';
import { fmt } from '../core/format.js';
import { $, dl, pctOf, haptic } from './dom.js';

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
    dl([['Unspent', fmt(state.favor)], ['Current bonus', `×${fmt(favorMult())}`],
        ['Next summoning', favorGain() > 0 ? `+${fmt(favorGain())}` : `Earn ${fmt(VEIL_GOAL)} this run`]]),

  sanity: () => {
    const net = SANITY_REGEN - sanityDrain();
    return `<b>Sanity</b>
      <p>Your greater followers wear on your mind. The more followers, the faster it falls, though the fall eases off as it steepens. Lower sanity makes you more productive (up to ×${1 + MADNESS_MAX_BONUS} at 0%), but below ${MADNESS_THRESHOLD}% madness strikes at random. Your mind rests while you're away.</p>` +
      dl([['Sanity', `${Math.floor(state.sanity)}%`], ['Recovers', `+${SANITY_REGEN}/s`], ['Drained by followers', `−${sanityDrain().toFixed(2)}/s`],
          ['Net', `${net >= 0 ? '+' : ''}${net.toFixed(2)}/s`], ['Madness bonus', `×${madnessMult().toFixed(2)}`],
          ['Steady Mind', `costs ${STEADY_COST * 100}% of whispers, +${STEADY_AMOUNT}`]]);
  },

  veil: () => `<b>The Veil</b>
    <p>The barrier between this world and Its. Earn ${fmt(VEIL_GOAL)} whispers in a single run to tear it, then Summon It for Eldritch Favor. The bar is logarithmic — every ×10 moves it the same distance.</p>` +
    dl([['This run', `${fmt(state.totalEarned)} / ${fmt(VEIL_GOAL)}`], ['Summonings', state.summonings]]),

  gen: id => {
    const g = GENERATORS.find(g => g.id === id), m = modifiers();
    const each = g.rate * m.gen[g.id] * m.all, n = state.owned[g.id];
    const raw = rawDrain(), share = raw > 0 ? g.drain * n / raw : 0;
    return `<b>${g.name}</b><p>${g.desc}</p>` + dl([
      ['Owned', n],
      ['Each produces', `${fmt(each)}/s`],
      ['All ' + n, `${fmt(each * n)}/s (${pctOf(each * n, wps(m))})`],
      g.drain > 0 && ['Share of sanity drain', `${Math.round(share * 100)}% (${g.drain} each)`],
      ['Next one costs', fmt(genCost(g))],
    ]);
  },

  upg: id => {
    const u = UPGRADES.find(u => u.id === id);
    return `<b>${u.name}</b><p>${u.desc}</p>` + dl([['Cost', `${fmt(u.cost)} whispers`], ['You have', fmt(state.whispers)]]) +
      '<p class="sub">Rites are forgotten when you summon.</p>';
  },

  pact: id => {
    const p = PACTS.find(p => p.id === id);
    return `<b>${p.name}</b><p>${p.desc}</p>` + dl([['Cost', `${p.cost} Favor`], ['Unspent Favor', fmt(state.favor)],
      ['Bonus you give up', `−${Math.round(p.cost * FAVOR_BONUS * 100)}% to everything`]]) +
      '<p class="sub">Pacts are permanent.</p>';
  },

  cos: key => {
    const [slot, id] = key.split(':'), o = cosmetic(slot, id);
    return isUnlocked(slot, id)
      ? `<b>${o.name}</b><p>${state.cosmetics.equipped[slot] === id ? 'Worn.' : 'Tap to equip.'}</p>`
      : `<b>???</b><p>${o.hint}</p>`;
  },
};

// Buttons shown in the touch sheet: key → { label, enabled, run } (or null for none)
const ACTIONS = {
  gen: id => {
    const g = GENERATORS.find(g => g.id === id), n = buyAmount(g), cost = genCost(g, n);
    return { label: `Recruit ${n > 1 ? '×' + n + ' ' : ''}· ${fmt(cost)}`, enabled: state.whispers >= cost, run: () => buyGenerator(id) };
  },
  upg: id => {
    const u = UPGRADES.find(u => u.id === id);
    if (state.upgrades.includes(id)) return null;
    return { label: `Perform · ${fmt(u.cost)}`, enabled: state.whispers >= u.cost, run: () => buyUpgrade(id) };
  },
  pact: id => {
    const p = PACTS.find(p => p.id === id);
    if (hasPact(id)) return null;
    return { label: `Seal the pact · ${p.cost} Favor`, enabled: state.favor >= p.cost, run: () => buyPact(id) };
  },
};

export const registerTip = (name, fn) => { TIPS[name] = fn; };
export const registerAction = (name, fn) => { ACTIONS[name] = fn; };

const split = key => { const [name, ...rest] = key.split(':'); return [name, rest.join(':')]; };
function tipHtml(key) {
  const [name, arg] = split(key);
  return TIPS[name] ? TIPS[name](arg) : '';
}

// ---------- desktop: hover tooltip ----------

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
  tipEl.style.display = tipEl.innerHTML ? 'block' : 'none';
  placeTip();
}

// ---------- touch: inspect sheet ----------

let sheetKey = null, sheetActionHtml = '';

export function openSheet(key) {
  sheetKey = key;
  $('sheet').hidden = false;
  refreshSheet(true);
}

export function closeSheet() {
  sheetKey = null;
  $('sheet').hidden = true;
}

function refreshSheet(force = false) {
  if (!sheetKey) return;
  $('sheet-body').innerHTML = tipHtml(sheetKey);
  const [name, arg] = split(sheetKey);
  const a = ACTIONS[name]?.(arg);
  const html = a ? `<button data-sheet-act ${a.enabled ? '' : 'disabled'}>${a.label}</button>` : '';
  if (force || html !== sheetActionHtml) { $('sheet-actions').innerHTML = html; sheetActionHtml = html; }
}

function initSheet() {
  $('sheet-backdrop').addEventListener('click', closeSheet);
  $('sheet-actions').addEventListener('click', e => {
    if (!e.target.closest('[data-sheet-act]') || !sheetKey) return;
    const [name, arg] = split(sheetKey);
    const a = ACTIONS[name]?.(arg);
    if (a?.enabled && a.run() !== false) haptic(12);
    refreshSheet(true);
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetKey) closeSheet(); });

  // swipe the sheet down to dismiss
  const card = $('sheet-card');
  let startY = null;
  card.addEventListener('pointerdown', e => { startY = card.scrollTop <= 0 ? e.clientY : null; });
  card.addEventListener('pointermove', e => {
    if (startY === null) return;
    const dy = Math.max(0, e.clientY - startY);
    card.style.transform = dy ? `translateY(${dy}px)` : '';
  });
  const end = e => {
    if (startY !== null && e.clientY - startY > 70) closeSheet();
    startY = null; card.style.transform = '';
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

export function initInspect() {
  tipEl = document.createElement('div');
  tipEl.id = 'tooltip';
  document.body.appendChild(tipEl);

  let lastPointer = 'mouse';
  document.addEventListener('pointerdown', e => {
    lastPointer = e.pointerType;
    if (lastPointer !== 'mouse' && tipTarget) { tipTarget = null; refreshTip(); }
  }, true);

  document.addEventListener('mouseover', e => {
    if (lastPointer !== 'mouse') return; // browsers fake mouseover after a tap
    tipTarget = e.target.closest('[data-tip]');
    refreshTip();
  });
  document.addEventListener('mousemove', e => {
    if (lastPointer !== 'mouse') return;
    mouse = { x: e.clientX, y: e.clientY };
    if (tipTarget) placeTip();
  });

  // Touch: decide whether a tap acts or inspects
  document.addEventListener('click', e => {
    if (lastPointer === 'mouse') return;
    const el = e.target.closest('[data-tip]');
    if (!el || el.closest('#sheet')) return;
    const btn = e.target.closest('button');
    if (btn && btn !== el && el.contains(btn)) return;    // a real button inside an inspectable card
    if (e.target.closest('.buy')) return;                  // the price side of a row buys
    if (el.tagName === 'BUTTON' && !el.querySelector('.buy') && !el.classList.contains('sealed')) return; // plain buttons act
    e.preventDefault(); e.stopPropagation();
    openSheet(el.dataset.tip);
  }, true);

  initSheet();
  setInterval(() => { if (tipTarget) refreshTip(); refreshSheet(); }, 250);
}
