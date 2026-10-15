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
import { $ } from './dom.js';

// ---------- the omen log ----------

export function initLog() {
  on('log', msg => {
    const p = document.createElement('p');
    p.textContent = msg;
    $('log').prepend(p);
    while ($('log').children.length > 30) $('log').lastChild.remove();
  });
}

export function clearLog() { $('log').innerHTML = ''; }

// ---------- lists ----------

export function buildGenerators() {
  $('generators').innerHTML = GENERATORS.map(g => `
    <button class="row" id="gen-${g.id}" data-gen="${g.id}" data-tip="gen:${g.id}">
      <div><div class="name">${g.name}</div><div class="desc">${g.desc}</div><div class="desc rate"></div></div>
      <div class="meta"><div class="count"></div><div class="cost"></div></div>
    </button>`).join('');
}

// Rebuild a list only when the set of visible items changes
const listKeys = {};
function buildList(el, items, rowHtml, empty) {
  const key = items.map(i => i.id).join(',');
  if (listKeys[el] === key) return;
  listKeys[el] = key;
  $(el).innerHTML = items.length ? items.map(rowHtml).join('') : `<div class="sub">${empty}</div>`;
}
export function rebuildLists() { for (const k in listKeys) delete listKeys[k]; }

// ---------- every tick ----------

export function render() {
  const m = modifiers();
  $('whispers').textContent = fmt(state.whispers);
  $('wps').textContent = `${fmt(wps(m))} / sec  ·  ${fmt(clickValue(m))} / chant`;
  $('favor').textContent = state.favor > 0
    ? `${state.favor} Eldritch Favor  ·  ×${favorMult().toFixed(1)} to everything`
    : '';

  // Sanity
  const drain = sanityDrain() - SANITY_REGEN;
  $('sanity-fill').style.width = state.sanity + '%';
  $('sanity-fill').style.background = state.sanity < MADNESS_THRESHOLD ? 'var(--blood)' : '';
  $('sanity-label').textContent = `Sanity ${Math.floor(state.sanity)}%` +
    (drain > 0 ? `  ·  −${drain.toFixed(2)}/s` : '') +
    (state.sanity < 100 ? `  ·  madness ×${madnessMult().toFixed(2)}` : '');
  $('sanity').style.display = sanityDrain() > 0 || state.sanity < 100 ? '' : 'none';
  $('steady').disabled = state.sanity >= 100;
  document.body.classList.toggle('mad', state.sanity < 25);

  // Followers
  document.querySelectorAll('[data-buy]').forEach(b =>
    b.classList.toggle('active', String(state.buyMode) === b.dataset.buy));
  for (const g of GENERATORS) {
    const el = $(`gen-${g.id}`);
    const n = buyAmount(g);
    const cost = genCost(g, n);
    el.style.display = isRevealed(g) ? '' : 'none';
    // a class, not `disabled`: disabled buttons swallow the events tooltips need
    el.classList.toggle('cant', state.whispers < cost);
    el.querySelector('.count').textContent = state.owned[g.id];
    el.querySelector('.cost').textContent = (n > 1 ? `×${n}  ` : '') + fmt(cost);
    el.querySelector('.rate').textContent = `${fmt(genRate(g, m))} / sec total`;
  }

  // Rites
  buildList('upgrades',
    UPGRADES.filter(u => !state.upgrades.includes(u.id) && u.unlock(state)),
    u => `<button class="row" data-upg="${u.id}">
        <div><div class="name">${u.name}</div><div class="desc">${u.desc}</div></div>
        <div class="meta">${fmt(u.cost)}</div></button>`,
    'No rites are known to you yet.');
  document.querySelectorAll('[data-upg]').forEach(el => {
    el.disabled = state.whispers < UPGRADES.find(u => u.id === el.dataset.upg).cost;
  });

  // Pacts — section appears after first summoning
  $('pacts-section').style.display = state.summonings > 0 || state.favor > 0 ? '' : 'none';
  buildList('pacts',
    PACTS.filter(p => !hasPact(p.id)),
    p => `<button class="row pact" data-pact="${p.id}">
        <div><div class="name">${p.name}</div><div class="desc">${p.desc}</div></div>
        <div class="meta">${p.cost} Favor</div></button>`,
    'You have bargained for everything It offers. For now.');
  document.querySelectorAll('[data-pact]').forEach(el => {
    el.disabled = state.favor < PACTS.find(p => p.id === el.dataset.pact).cost;
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
      ? 'The veil is torn. It waits to be called.'
      : `The veil weakens… ${(pct * 100).toFixed(1)}%`;

  $('open-vessel').classList.toggle('new', state.cosmetics.unseen);
}
