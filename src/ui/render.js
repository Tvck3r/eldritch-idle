// ============================================================
// RENDER — writes game state into the page. Called every tick.
// ============================================================
import { VEIL_GOAL, SANITY_REGEN, MADNESS_THRESHOLD } from '../core/constants.js';
import { GENERATORS, UPGRADES, PACTS } from '../core/content.js';
import { state, fx, hasPact } from '../core/state.js';
import {
  modifiers, wps, clickValue, genRate, genCost, buyAmount, isRevealed,
  sanityDrain, madnessMult, favorMult, favorGain, veilPct,
} from '../core/economy.js';
import { on } from '../core/events.js';
import { fmt } from '../core/format.js';
import { settings } from '../core/settings.js';
import { $ } from './dom.js';

// ---------- the omen log ----------

export function initLog() {
  on('log', msg => {
    const p = document.createElement('p');
    p.textContent = msg;
    $('log').prepend(p);
    while ($('log').children.length > 40) $('log').lastChild.remove();
  });
}

export function clearLog() { $('log').innerHTML = ''; }

// ---------- lists ----------

export function buildGenerators() {
  $('generators').innerHTML = GENERATORS.map(g => `
    <button class="row" id="gen-${g.id}" data-gen="${g.id}" data-tip="gen:${g.id}">
      <div class="info"><div class="name">${g.name}<span class="count"></span></div><div class="desc">${g.desc}</div><div class="desc rate"></div></div>
      <div class="buy"><div class="qty sub"></div><div class="cost"></div></div>
    </button>`).join('');
}

// Rebuild a list only when the set of visible items changes
const listKeys = {};
export function buildList(el, items, rowHtml, empty) {
  const key = items.map(i => i.id).join(',');
  if (listKeys[el] === key) return;
  listKeys[el] = key;
  $(el).innerHTML = items.length ? items.map(rowHtml).join('') : `<div class="sub">${empty}</div>`;
}
export function rebuildLists() { for (const k in listKeys) delete listKeys[k]; }

// A purchasable row: tap the left to inspect, the right to buy
export const rowHtml = ({ attr, tip, name, desc, price, cls = '' }) => `
  <button class="row ${cls}" ${attr} data-tip="${tip}">
    <div class="info"><div class="name">${name}</div><div class="desc">${desc}</div></div>
    <div class="buy">${price}</div></button>`;

// ---------- count-up ----------
// The big number eases toward the real one instead of jumping.

let shownWhispers = null;
function countUp(target) {
  if (shownWhispers === null || settings.reducedMotion || !Number.isFinite(target)) return (shownWhispers = target);
  const diff = target - shownWhispers;
  shownWhispers = Math.abs(diff) <= Math.max(1, Math.abs(target) * 0.002) ? target : shownWhispers + diff * 0.35;
  return shownWhispers;
}
on('state-replaced', () => { shownWhispers = null; });

// ---------- every tick ----------

export function render() {
  const m = modifiers();

  // HUD
  $('whispers').textContent = fmt(countUp(state.whispers));
  $('wps').textContent = `${fmt(wps(m))}/s  ·  ${fmt(clickValue(m))}/chant`;
  $('favor').hidden = state.favor <= 0;
  $('favor').textContent = `✦ ${state.favor}  ×${favorMult().toFixed(1)}`;

  // Sanity: ring in the HUD, full card in the Ritual panel
  const drain = sanityDrain() - SANITY_REGEN;
  const low = state.sanity < MADNESS_THRESHOLD;
  $('sanity-arc').style.strokeDashoffset = 100 - state.sanity;
  $('sanity-pct').textContent = Math.floor(state.sanity);
  $('sanity-ring').classList.toggle('low', low);
  $('sanity-fill').style.width = state.sanity + '%';
  $('sanity-fill').style.background = low ? 'var(--blood)' : '';
  $('sanity-label').textContent = `${Math.floor(state.sanity)}%` +
    (drain > 0 ? `  ·  −${drain.toFixed(2)}/s` : '') +
    (state.sanity < 100 ? `  ·  madness ×${madnessMult().toFixed(2)}` : '');
  $('sanity-card').hidden = !(sanityDrain() > 0 || state.sanity < 100);
  $('steady').disabled = state.sanity >= 100;
  document.body.classList.toggle('mad', state.sanity < 25);

  // Followers
  document.querySelectorAll('[data-buy]').forEach(b =>
    b.classList.toggle('active', String(state.buyMode) === b.dataset.buy));
  for (const g of GENERATORS) {
    const el = $(`gen-${g.id}`);
    const n = buyAmount(g);
    const cost = genCost(g, n);
    el.hidden = !isRevealed(g);
    el.style.display = el.hidden ? 'none' : '';
    // a class, not `disabled`: disabled buttons swallow the events inspection needs
    el.classList.toggle('cant', state.whispers < cost);
    el.querySelector('.count').textContent = state.owned[g.id] ? ` · ${state.owned[g.id]}` : '';
    el.querySelector('.qty').textContent = `Recruit${n > 1 ? ' ×' + n : ''}`;
    el.querySelector('.cost').textContent = fmt(cost);
    el.querySelector('.rate').textContent = state.owned[g.id] ? `${fmt(genRate(g, m))} / sec total` : '';
  }

  // Rites
  buildList('upgrades',
    UPGRADES.filter(u => !state.upgrades.includes(u.id) && u.unlock(state)),
    u => rowHtml({ attr: `data-upg="${u.id}"`, tip: `upg:${u.id}`, name: u.name, desc: u.desc, price: fmt(u.cost) }),
    'No rites are known to you yet.');
  document.querySelectorAll('[data-upg]').forEach(el => {
    el.classList.toggle('cant', state.whispers < UPGRADES.find(u => u.id === el.dataset.upg).cost);
  });

  // Pacts — section appears after first summoning
  $('pacts-section').style.display = state.summonings > 0 || state.favor > 0 ? '' : 'none';
  buildList('pacts',
    PACTS.filter(p => !hasPact(p.id)),
    p => rowHtml({ attr: `data-pact="${p.id}"`, tip: `pact:${p.id}`, cls: 'pact', name: p.name, desc: p.desc, price: `${p.cost} Favor` }),
    'You have bargained for everything It offers. For now.');
  document.querySelectorAll('[data-pact]').forEach(el => {
    el.classList.toggle('cant', state.favor < PACTS.find(p => p.id === el.dataset.pact).cost);
  });

  // Summon
  const gain = favorGain();
  const summonable = gain > 0 && !fx.summonStart;
  $('summon').style.display = summonable ? 'block' : 'none';
  document.body.classList.toggle('can-summon', summonable);
  $('summon').textContent = `Summon It  ·  +${gain} Favor`;

  const pct = veilPct();
  $('veil-fill').style.width = (pct * 100).toFixed(1) + '%';
  $('veil-label').textContent = fx.summonStart
    ? 'IT COMES.'
    : state.totalEarned >= VEIL_GOAL
      ? 'The veil is torn.'
      : `Veil ${(pct * 100).toFixed(1)}%`;
}
