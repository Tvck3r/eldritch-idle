// ============================================================
// SHELL — the app frame: bottom tabs with badges, the scene that
// collapses to a strip while you scroll a panel, and the omen feed.
// On desktop the Ritual panel is a permanent side column.
// ============================================================
import { on, emit } from '../core/events.js';
import { settings } from '../core/settings.js';
import { state } from '../core/state.js';
import { $, isWide } from './dom.js';

let activeTab = 'followers', unreadOmens = 0;
export const currentTab = () => activeTab;

// ---------- tabs ----------

function updateBadges() {
  const counts = {
    ritual: unreadOmens + (state.pendingChoice ? 1 : 0),
    followers: document.querySelectorAll('#generators [data-gen]:not(.cant):not([hidden])').length,
    rites: document.querySelectorAll('#app [data-upg]:not(.cant), #app [data-pact]:not(.cant), #app [data-sigil]:not(.cant)').length,
    vessel: state.cosmetics.unseen ? '•' : 0,
  };
  for (const [tab, n] of Object.entries(counts)) {
    const badge = document.querySelector(`#tabbar [data-tab="${tab}"] .badge`);
    if (!badge) continue;
    badge.textContent = n > 9 ? '9+' : n || '';
    badge.classList.toggle('on', !!n && tab !== activeTab);
  }
}

export function showTab(tab) {
  if (tab === 'ritual' && isWide.matches) tab = 'followers'; // ritual is always visible on desktop
  activeTab = tab;
  if (tab === 'ritual') { unreadOmens = 0; omenQueue.length = 0; $('omen-feed').replaceChildren(); }
  document.querySelectorAll('#tabbar [data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('shown', p.dataset.panel === tab));
  $('app').classList.remove('collapsed');
  document.querySelector(`.panel[data-panel="${tab}"]`).scrollTop = 0;
  emit('tab', tab);
  updateBadges();
}

function initTabs() {
  $('tabbar').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  isWide.addEventListener('change', () => showTab(activeTab));
  setInterval(updateBadges, 300);
}

// ---------- collapsing scene ----------
// Scrolling down inside a panel folds the scene into a strip so the list gets the room.

function initCollapse() {
  for (const panel of document.querySelectorAll('.panel')) {
    panel.addEventListener('scroll', () => {
      if (isWide.matches || !panel.classList.contains('shown')) return;
      const app = $('app'), collapsed = app.classList.contains('collapsed');
      // hysteresis so it doesn't flap at the threshold
      if (!collapsed && panel.scrollTop > 40) app.classList.add('collapsed');
      else if (collapsed && panel.scrollTop < 4) app.classList.remove('collapsed');
    }, { passive: true });
  }
}

// ---------- omen feed ----------
// New log lines drop in from the top of the content area (under the scene,
// away from the thumb). Newest on top; older ones fall, dim and fade.

const OMEN_FEED_MAX = 3;   // visible at once
const OMEN_GAP_MS = 900;   // bursts (e.g. on load) drip in one at a time
const omenQueue = [];
let omenPumping = false;

function retireOmen(el) {
  if (el.classList.contains('out')) return;
  el.classList.add('out');
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1200); // in case animationend never fires (background tab, etc.)
}

function showOmen(msg) {
  const feed = $('omen-feed');
  const el = document.createElement('div');
  el.className = 'omen-toast';
  el.textContent = msg;
  feed.prepend(el);
  [...feed.children].filter(c => !c.classList.contains('out')).slice(OMEN_FEED_MAX).forEach(retireOmen);
  setTimeout(() => retireOmen(el), 4000 + msg.length * 40);
}

function pumpOmens() {
  if (!omenQueue.length) { omenPumping = false; return; }
  omenPumping = true;
  showOmen(omenQueue.shift());
  setTimeout(pumpOmens, OMEN_GAP_MS);
}

function initOmenFeed() {
  on('log', msg => {
    if (isWide.matches || activeTab === 'ritual') return; // the log itself is on screen
    unreadOmens++;
    if (!settings.omenFeed) return;
    omenQueue.push(msg);
    if (omenQueue.length > 6) omenQueue.splice(0, omenQueue.length - 6); // don't backlog forever
    if (!omenPumping) pumpOmens();
  });
}

export function initShell() {
  initTabs();
  initCollapse();
  initOmenFeed();
}
