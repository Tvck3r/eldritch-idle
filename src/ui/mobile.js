// ============================================================
// MOBILE — tabs with count badges, the omen feed, chant feedback.
// On desktop the tabs are hidden and every panel shows.
// ============================================================
import { on } from '../core/events.js';
import { settings } from '../core/settings.js';
import { clickValue } from '../core/economy.js';
import { fmt } from '../core/format.js';
import { $, isMobile } from './dom.js';

let activeTab = 'followers', unreadOmens = 0;

// ---------- tabs ----------

function updateBadges() {
  const counts = {
    followers: [...document.querySelectorAll('[data-gen]:not(.cant)')].filter(el => el.style.display !== 'none').length,
    rites: document.querySelectorAll('[data-upg]:not(:disabled), [data-pact]:not(:disabled)').length,
    log: unreadOmens,
  };
  for (const [tab, n] of Object.entries(counts)) {
    const badge = document.querySelector(`[data-tab="${tab}"] .badge`);
    badge.textContent = n > 9 ? '9+' : n || '';
    badge.classList.toggle('on', n > 0 && tab !== activeTab);
  }
}

function initTabs() {
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    activeTab = b.dataset.tab;
    if (activeTab === 'log') unreadOmens = 0;
    document.querySelectorAll('#tabs button').forEach(t => t.classList.toggle('active', t === b));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('shown', p.dataset.panel === activeTab));
    updateBadges();
  });
  // Tabs and the omen feed sit just under the pinned resource bar, whatever its height
  new ResizeObserver(([e]) => document.documentElement.style.setProperty('--res-h', e.target.offsetHeight + 'px'))
    .observe($('resource'));
  setInterval(updateBadges, 300);
}

// ---------- omen feed ----------
// New log lines drop in from the top, under the resource bar (away from the
// thumb on the chant bar). Newest on top; older ones fall, dim and fade.

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
    if (!isMobile.matches || activeTab === 'log') return;
    unreadOmens++;
    if (!settings.omenFeed) return;
    omenQueue.push(msg);
    if (omenQueue.length > 6) omenQueue.splice(0, omenQueue.length - 6); // don't backlog forever
    if (!omenPumping) pumpOmens();
  });
}

// ---------- chant feedback ----------

function initFloaters() {
  $('chant').addEventListener('pointerdown', e => {
    if (settings.reducedMotion) return;
    const f = document.createElement('div');
    f.className = 'floater';
    f.textContent = '+' + fmt(clickValue());
    f.style.left = e.clientX + (Math.random() - 0.5) * 40 + 'px';
    f.style.top = e.clientY - 12 + 'px';
    document.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
    setTimeout(() => f.remove(), 1500);
  });
}

export function initMobile() {
  initTabs();
  initOmenFeed();
  initFloaters();
}
