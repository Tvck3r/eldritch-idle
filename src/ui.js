// ============================================================
// UI — tooltips, the title screen, the Grimoire, and the wardrobe.
// ============================================================

const pctOf = (part, total) => total > 0 ? `${(part / total * 100).toFixed(1)}%` : '—';
const dl = pairs => `<dl>${pairs.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

// ---------- tooltips ----------
// Any element with data-tip="key" gets a live tooltip. Keys map to functions
// returning HTML; prefixed keys ("gen:acolyte", "cos:mask:bone") cover lists.
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
      <p>Your greater followers wear on your mind. Lower sanity makes you more productive (up to ×${1 + MADNESS_MAX_BONUS} at 0%), but below ${MADNESS_THRESHOLD}% madness strikes at random.</p>` +
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

const tipEl = document.createElement('div');
tipEl.id = 'tooltip';
document.body.appendChild(tipEl);
let tipTarget = null, mouse = { x: 0, y: 0 };

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
// Mouse: hover. Touch: tap plain text to read it, press-and-hold buttons
// (a tap on a button still buys). Tap anywhere else to dismiss.
let lastPointer = 'mouse', pressTimer = null, swallowClick = false;
document.addEventListener('mouseover', e => {
  if (lastPointer === 'touch') return; // browsers fake mouseover after a tap
  tipTarget = e.target.closest('[data-tip]'); refreshTip();
});
document.addEventListener('mousemove', e => {
  if (lastPointer === 'touch') return;
  mouse = { x: e.clientX, y: e.clientY }; if (tipTarget) placeTip();
});
document.addEventListener('pointerdown', e => {
  lastPointer = e.pointerType;
  if (e.pointerType !== 'touch') return;
  const el = e.target.closest('[data-tip]');
  mouse = { x: e.clientX, y: e.clientY - 40 }; // keep the tip clear of the finger
  if (!el) { tipTarget = null; refreshTip(); return; }
  if (el.tagName !== 'BUTTON') { tipTarget = el; refreshTip(); return; }
  pressTimer = setTimeout(() => { tipTarget = el; refreshTip(); swallowClick = true; }, 450);
}, true);
for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => clearTimeout(pressTimer), true);
document.addEventListener('click', e => {
  if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('contextmenu', e => { if (lastPointer === 'touch' && e.target.closest('[data-tip]')) e.preventDefault(); });
window.addEventListener('scroll', () => { if (lastPointer === 'touch' && tipTarget) { tipTarget = null; refreshTip(); } }, { passive: true });
setInterval(() => { if (tipTarget) refreshTip(); }, 250);

// ---------- modal ----------

const modal = $('modal');
let onModalClose = null;
function openModal(html, onClose = null) {
  $('modal-body').innerHTML = html;
  modal.hidden = false;
  onModalClose = onClose;
}
function closeModal() {
  modal.hidden = true;
  if (onModalClose) onModalClose();
  onModalClose = null;
}
$('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// ---------- title screen ----------

function showIntro() { $('intro').hidden = false; }
function hideIntro() { $('intro').hidden = true; state.seenIntro = true; save(); }
$('intro-begin').addEventListener('click', hideIntro);
$('intro-guide').addEventListener('click', () => { hideIntro(); openGrimoire(); });
if (!state.seenIntro) showIntro();

// ---------- the Grimoire (guide) ----------
// Sections with an unlock stay sealed until the player has encountered that mechanic.

const GUIDE = [
  { id: 'ritual', title: 'The Ritual', body: () => `
    <p>Something sleeps beneath the world. Your purpose is to wake it.</p>
    <p><b>Chant</b> (the big circle) to earn <b>whispers</b>, the currency of devotion. Spend whispers on
    <b>Followers</b>, who whisper for you even while you're away.</p>
    <p>Earn <b>${fmt(VEIL_GOAL)}</b> whispers in a single run to tear the veil — then call It through.</p>
    <p class="hint">Hover over any number (or press and hold on mobile) to see what it means and where it comes from.</p>` },

  { id: 'followers', title: 'Followers', body: () => `
    <p>Each follower produces whispers every second. Each one you buy makes the next of that kind
    ${Math.round((COST_GROWTH - 1) * 100)}% more expensive, so spreading out across tiers pays off.</p>
    <p>New kinds of follower reveal themselves once you own one of the kind before it.</p>
    <p>Use <b>×1 / ×10 / Max</b> beside the Followers heading to buy in bulk.</p>
    <p>Greater followers — Ritual Circles and beyond — <b>drain your sanity</b>.</p>` },

  { id: 'rites', title: 'Rites', unlock: s => s.totalEarned >= 50 || s.summonings > 0, body: () => `
    <p>Rites are one-time upgrades that appear as you grow. Most double the output of one kind of follower;
    some empower your chant or everything at once.</p>
    <p>Rites are forgotten when you summon — unless you've sealed the right Pact.</p>` },

  { id: 'veil', title: 'The Veil', body: () => `
    <p>The bar at the top tracks your progress toward ${fmt(VEIL_GOAL)} whispers earned this run.
    It's logarithmic: going from 1K to 10K moves it as far as 100M to 1B.</p>
    <p>As the veil thins, the world changes. Watch the sky. Watch the circle.</p>` },

  { id: 'sanity', title: 'Sanity', unlock: s => s.stats.minSanity < 100, body: () => `
    <p>Sanity recovers ${SANITY_REGEN}/s on its own, but greater followers drain it. When the drain wins, it falls.</p>
    <p><b>Madness is power:</b> production scales up to <b>×${1 + MADNESS_MAX_BONUS}</b> as sanity approaches 0%.</p>
    <p><b>Madness is danger:</b> below ${MADNESS_THRESHOLD}%, random events strike — followers wander into the sea,
    whispers turn on you, though sometimes a vision rewards you.</p>
    <p><b>Steady Mind</b> spends ${STEADY_COST * 100}% of your whispers to restore ${STEADY_AMOUNT} sanity.
    Ride the edge, or stay safe — your call.</p>` },

  { id: 'summoning', title: 'Summoning', unlock: s => s.lifetimeEarned >= VEIL_GOAL || s.summonings > 0, body: () => `
    <p>Once the veil is torn, <b>Summon It</b> to begin again, stronger. You lose your whispers, followers and rites,
    and gain <b>Eldritch Favor</b>.</p>
    <p>Favor earned = 10 × √(whispers this run ÷ ${fmt(VEIL_GOAL)}). Pushing past the goal pays:
    1B → 10, 4B → 20, 9B → 30.</p>
    <p>Each unspent Favor adds <b>+${FAVOR_BONUS * 100}%</b> to everything.</p>` },

  { id: 'pacts', title: 'Pacts', unlock: s => s.summonings > 0, body: () => `
    <p>Spend Favor on Pacts — permanent perks that survive every summoning.</p>
    <p>The catch: Favor spent on a Pact no longer gives its +${FAVOR_BONUS * 100}% bonus. Buy the Pacts that change how
    you play, and hoard the rest.</p>
    ${dl(PACTS.map(p => [p.name, `${p.desc} (${p.cost})`]))}` },

  { id: 'vessel', title: 'Your Vessel', body: () => `
    <p>The figure at the front of the circle is you. Open <b>Vessel</b> at the top to dress it.</p>
    <p>New robes, masks, relics and familiars unlock as you reach milestones. Locked ones hint at how to earn them.</p>
    <p>Purely cosmetic. Purely necessary.</p>` },
];

function openGrimoire(sectionId = 'ritual') {
  const sealed = sec => sec.unlock && !sec.unlock(state);
  const draw = id => {
    const sec = GUIDE.find(s => s.id === id);
    $('modal-body').innerHTML = `
      <h2 class="modal-title">The Grimoire</h2>
      <div class="grimoire">
        <nav>${GUIDE.map(s => `<button class="small ${s.id === id ? 'active' : ''}" data-sec="${s.id}" ${sealed(s) ? 'disabled' : ''}>
          ${sealed(s) ? '???' : s.title}</button>`).join('')}</nav>
        <article><h3>${sec.title}</h3>${sec.body()}</article>
      </div>`;
  };
  openModal('');
  draw(sectionId);
  $('modal-body').onclick = e => { const b = e.target.closest('[data-sec]'); if (b) draw(b.dataset.sec); };
}

// ---------- the wardrobe ----------

function openWardrobe() {
  state.cosmetics.unseen = false;
  openModal(`
    <h2 class="modal-title">Your Vessel</h2>
    <div class="wardrobe">
      <canvas id="vessel-preview" width="36" height="32"></canvas>
      <div id="slots"></div>
    </div>`, () => { previewOn = false; });

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
let previewOn = false;

// ---------- mobile tabs ----------
// On narrow screens the right column becomes tabs; on desktop every panel shows.

const isMobile = matchMedia('(max-width: 700px)');
let activeTab = 'followers', unreadOmens = 0;

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  activeTab = b.dataset.tab;
  if (activeTab === 'log') unreadOmens = 0;
  document.querySelectorAll('#tabs button').forEach(t => t.classList.toggle('active', t === b));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('shown', p.dataset.panel === activeTab));
  updateBadges();
});
// Tabs stick just under the pinned resource bar, whatever its height
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--res-h', e.target.offsetHeight + 'px'))
  .observe($('resource'));
// Tab badges: how many things you can buy there, or unread omens
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
setInterval(updateBadges, 300);

// ---------- omen feed ----------
// On mobile, new log lines drift in over the game and fade away, so you
// don't have to visit the Omens tab. Newest on top; older ones fall and fade.

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
document.addEventListener('omen', e => {
  if (!isMobile.matches || activeTab === 'log') return;
  unreadOmens++;
  omenQueue.push(e.detail);
  if (omenQueue.length > 6) omenQueue.splice(0, omenQueue.length - 6); // don't backlog forever
  if (!omenPumping) pumpOmens();
});

// ---------- chant feedback ----------

$('chant').addEventListener('pointerdown', e => {
  const f = document.createElement('div');
  f.className = 'floater';
  f.textContent = '+' + fmt(clickValue());
  f.style.left = e.clientX + (Math.random() - 0.5) * 40 + 'px';
  f.style.top = e.clientY - 12 + 'px';
  document.body.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
});

$('open-guide').addEventListener('click', () => openGrimoire());
$('open-vessel').addEventListener('click', openWardrobe);
setInterval(() => $('open-vessel').classList.toggle('new', state.cosmetics.unseen), 250);
