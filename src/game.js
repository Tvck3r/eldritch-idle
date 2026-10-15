// ============================================================
// DATA — add content here. Everything else reads from these.
// ============================================================

const VEIL_GOAL = 1e9;     // whispers earned in one run needed to summon
const FAVOR_BONUS = 0.1;   // +10% to everything per unspent Eldritch Favor
const SUMMON_MS = 3000;    // length of the summoning animation

const GENERATORS = [
  { id: 'acolyte',  name: 'Acolyte',            desc: 'Mumbles in their sleep.',            baseCost: 15,    rate: 0.1,  drain: 0 },
  { id: 'cultist',  name: 'Cultist',            desc: 'Chants with conviction.',            baseCost: 100,   rate: 1,    drain: 0 },
  { id: 'circle',   name: 'Ritual Circle',      desc: 'Salt, chalk, and something wet.',    baseCost: 1100,  rate: 8,    drain: 0.03 },
  { id: 'library',  name: 'Forbidden Library',  desc: 'The books read themselves aloud.',   baseCost: 12000, rate: 47,   drain: 0.08 },
  { id: 'temple',   name: 'Drowned Temple',     desc: 'Prayers bubble up from below.',      baseCost: 130000, rate: 260, drain: 0.2 },
  { id: 'city',     name: 'Dreaming City',      desc: 'An entire population, dreaming of It.', baseCost: 1.4e6, rate: 1400, drain: 0.5 },
];
const COST_GROWTH = 1.15;

// unlock(s) -> bool, apply(mods) mutates the modifier object
const UPGRADES = [
  { id: 'syllables', name: 'Guttural Syllables', desc: 'Chanting is twice as effective.', cost: 100,
    unlock: s => s.totalEarned >= 50, apply: m => { m.click *= 2; } },
  { id: 'robes', name: 'Black Robes', desc: 'Acolytes x2.', cost: 200,
    unlock: s => s.owned.acolyte >= 5, apply: m => { m.gen.acolyte *= 2; } },
  { id: 'tithe', name: 'Tithe of Blood', desc: 'Cultists x2.', cost: 1500,
    unlock: s => s.owned.cultist >= 5, apply: m => { m.gen.cultist *= 2; } },
  { id: 'echo', name: 'Echoing Chant', desc: 'Each chant also yields 2% of whispers/sec.', cost: 5000,
    unlock: s => s.totalEarned >= 2000, apply: m => { m.clickWpsPct += 0.02; } },
  { id: 'chalk', name: 'Bone Chalk', desc: 'Ritual Circles x2.', cost: 15000,
    unlock: s => s.owned.circle >= 5, apply: m => { m.gen.circle *= 2; } },
  { id: 'ink', name: 'Ink of the Deep', desc: 'Forbidden Libraries x2.', cost: 150000,
    unlock: s => s.owned.library >= 5, apply: m => { m.gen.library *= 2; } },
  { id: 'geometry', name: 'Non-Euclidean Geometry', desc: 'All followers x1.5.', cost: 1e6,
    unlock: s => s.totalEarned >= 300000, apply: m => { m.all *= 1.5; } },
  { id: 'tides', name: 'Wrong Tides', desc: 'Drowned Temples x2.', cost: 2e6,
    unlock: s => s.owned.temple >= 5, apply: m => { m.gen.temple *= 2; } },
  { id: 'dreams', name: 'Shared Dreams', desc: 'Dreaming Cities x2.', cost: 2e7,
    unlock: s => s.owned.city >= 5, apply: m => { m.gen.city *= 2; } },
];

// Permanent perks bought with Eldritch Favor; they survive summonings.
// Spent Favor no longer boosts production — that's the tradeoff.
const PACTS = [
  { id: 'deepchant',  name: 'Voice From Below',     desc: 'Chanting x5, forever.',                        cost: 2,
    apply: m => { m.click *= 5; } },
  { id: 'firstborn',  name: 'Pact of the Firstborn', desc: 'Begin each run with 10 Acolytes.',            cost: 3 },
  { id: 'steadfast',  name: 'Iron Mind',            desc: 'Sanity drains half as fast.',                  cost: 5 },
  { id: 'congregation', name: 'The Congregation',   desc: 'Begin each run with 10 Cultists.',             cost: 8 },
  { id: 'faithful',   name: 'The Faithful Multiply', desc: 'Followers recruit themselves (auto-buy cheapest).', cost: 15 },
  { id: 'remembered', name: 'Rites Remembered',     desc: 'Keep all Rites when you summon.',              cost: 25 },
];

// Sanity: higher-tier followers drain it; low sanity boosts output but invites madness
const SANITY_REGEN = 0.5;      // per second
const MADNESS_MAX_BONUS = 1;   // +100% production at 0 sanity
const MADNESS_THRESHOLD = 40;  // events start below this
const STEADY_COST = 0.1;       // fraction of whispers spent to steady your mind
const STEADY_AMOUNT = 25;

// fire(s) mutates state and returns the log line
const MADNESS_EVENTS = [
  s => { const g = topFollower(s); if (!g) return 'You scream into an empty room.';
         const lost = Math.max(1, Math.floor(s.owned[g.id] * 0.1)); s.owned[g.id] -= lost;
         return `${lost} ${g.name}${lost > 1 ? 's' : ''} walked into the sea, smiling.`; },
  s => { const lost = s.whispers * 0.25; s.whispers -= lost;
         return `The whispers turned on you. ${fmt(lost)} of them are gone.`; },
  s => { const gain = wps() * 60; earn(gain);
         return `A vision! You glimpse the shape of It. (+${fmt(gain)})`; },
  s => 'You lost an hour. There is chalk under your fingernails.',
];

// Flavor text fired once (ever) when a run's totalEarned crosses the threshold
const OMENS = [
  [0,     'You hear something beneath the floorboards. It is listening.'],
  [100,   'The candles lean toward you.'],
  [1000,  'Dogs in the neighborhood have stopped barking.'],
  [1e4,   'The stars outside are not quite where they were.'],
  [1e5,   'Your reflection blinks a moment too late.'],
  [1e6,   'The sea is rising, though the moon is new.'],
  [1e7,   'Geometry fails in the corners of the room.'],
  [1e8,   'It knows your name now. It is saying it back.'],
  [5e8,   'The veil is thin as paper. Something presses against it.'],
];

// Logged after each summoning; the last line repeats forever
const SUMMON_LINES = [
  'It opened one eye. Everything you built is gone. It remembers you.',
  'It came closer this time. The world forgot, but you did not.',
  'Again it looks through. Again the world is unmade around you.',
  'You have done this before. You will do it again. It is pleased.',
];

// ============================================================
// STATE
// ============================================================

const SAVE_KEY = 'summoning-save-v1';

function freshState() {
  return {
    whispers: 0,
    totalEarned: 0,    // this run
    lifetimeEarned: 0, // across all runs
    owned: Object.fromEntries(GENERATORS.map(g => [g.id, 0])),
    upgrades: [],      // ids of purchased rites
    omensSeen: 0,      // index into OMENS
    summoned: false,   // veil-torn message shown this run
    favor: 0,          // unspent prestige currency
    summonings: 0,
    pacts: [],         // ids of purchased pacts (permanent)
    sanity: 100,
    buyMode: 1,        // 1, 10, or 'max'
    stats: { chants: 0, madnessEvents: 0, minSanity: 100 },
    cosmetics: { unlocked: [], equipped: { robe: 'plain', mask: 'none', relic: 'none', familiar: 'none' }, unseen: false },
    seenIntro: false,
    lastTick: Date.now(),
  };
}

// Survive a summoning (favor/summonings handled separately)
const PERSIST = ['lifetimeEarned', 'omensSeen', 'pacts', 'buyMode', 'stats', 'cosmetics', 'seenIntro', 'favor', 'summonings'];
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

let state = load() || freshState();

// Transient (not saved)
const fx = { chant: 0, flash: 0, summonStart: 0 }; // visual signals for scene.js
let timeScale = 1;                                  // admin speed-up
let autoBuyAcc = 0;

const hasPact = id => state.pacts.includes(id);

// ============================================================
// LOGIC
// ============================================================

function favorMult() { return 1 + state.favor * FAVOR_BONUS; }
function madnessMult() { return 1 + (1 - state.sanity / 100) * MADNESS_MAX_BONUS; }

function modifiers() {
  const all = favorMult() * madnessMult();
  const m = { click: all, clickWpsPct: 0, all, gen: Object.fromEntries(GENERATORS.map(g => [g.id, 1])) };
  for (const u of UPGRADES) if (state.upgrades.includes(u.id)) u.apply(m);
  for (const p of PACTS) if (p.apply && hasPact(p.id)) p.apply(m);
  return m;
}

function genRate(g, m = modifiers()) {
  return g.rate * state.owned[g.id] * m.gen[g.id] * m.all;
}

function wps(m = modifiers()) {
  return GENERATORS.reduce((sum, g) => sum + genRate(g, m), 0);
}

function clickValue(m = modifiers()) {
  return m.click + wps(m) * m.clickWpsPct;
}

// Total cost of the next n of a generator (geometric series)
function genCost(g, n = 1) {
  const first = g.baseCost * Math.pow(COST_GROWTH, state.owned[g.id]);
  return Math.ceil(first * (Math.pow(COST_GROWTH, n) - 1) / (COST_GROWTH - 1));
}

function maxAffordable(g) {
  const first = g.baseCost * Math.pow(COST_GROWTH, state.owned[g.id]);
  let n = Math.floor(Math.log(1 + state.whispers * (COST_GROWTH - 1) / first) / Math.log(COST_GROWTH));
  while (n > 0 && genCost(g, n) > state.whispers) n--; // guard against float rounding
  return n;
}

function buyAmount(g) {
  return state.buyMode === 'max' ? Math.max(1, maxAffordable(g)) : state.buyMode;
}

function topFollower(s = state) {
  return [...GENERATORS].reverse().find(g => s.owned[g.id] > 0);
}

function sanityDrain() {
  const d = GENERATORS.reduce((sum, g) => sum + g.drain * state.owned[g.id], 0);
  return hasPact('steadfast') ? d / 2 : d;
}

// 0..1 progress toward the veil, log-scaled so it moves early on
function veilPct() {
  return Math.min(1, Math.log10(state.totalEarned + 1) / Math.log10(VEIL_GOAL));
}

function favorGain() {
  if (state.totalEarned < VEIL_GOAL) return 0;
  return Math.floor(10 * Math.sqrt(state.totalEarned / VEIL_GOAL));
}

function earn(n) {
  state.whispers += n;
  state.totalEarned += n;
  state.lifetimeEarned += n;
}

function chant() {
  earn(clickValue());
  state.stats.chants++;
  fx.chant = 1;
}

function buyGenerator(id, n = buyAmount(GENERATORS.find(g => g.id === id))) {
  const g = GENERATORS.find(g => g.id === id);
  const cost = genCost(g, n);
  if (state.whispers < cost) return false;
  state.whispers -= cost;
  state.owned[id] += n;
  return true;
}

function buyUpgrade(id) {
  const u = UPGRADES.find(u => u.id === id);
  if (state.upgrades.includes(id) || state.whispers < u.cost) return;
  state.whispers -= u.cost;
  state.upgrades.push(id);
  log(`Rite performed: ${u.name}.`);
}

function buyPact(id) {
  const p = PACTS.find(p => p.id === id);
  if (hasPact(id) || state.favor < p.cost) return;
  state.favor -= p.cost;
  state.pacts.push(id);
  log(`A pact is sealed: ${p.name}.`);
}

function steadyMind() {
  if (state.sanity >= 100) return;
  state.whispers *= 1 - STEADY_COST;
  state.sanity = Math.min(100, state.sanity + STEADY_AMOUNT);
  log('You breathe. You count your fingers. There are still ten.');
}

function madnessEvent() {
  const e = MADNESS_EVENTS[Math.random() * MADNESS_EVENTS.length | 0];
  log(e(state));
  state.stats.madnessEvents++;
  fx.chant = 1; // jolt the scene
}

// preview = play the animation without resetting (admin)
function startSummon(preview = false) {
  const gain = favorGain();
  if (fx.summonStart || (!preview && gain <= 0)) return;
  if (!preview && !confirm(`Summon It? All whispers, followers, and rites will be lost.\nYou will gain ${gain} Eldritch Favor (+${Math.round(gain * FAVOR_BONUS * 100)}% to everything, forever).`)) return;
  fx.summonStart = performance.now();
  setTimeout(preview ? () => { fx.summonStart = 0; fx.flash = 1; } : performSummon, SUMMON_MS);
}

function performSummon() {
  const gain = favorGain();
  const keep = state;
  state = {
    ...freshState(),
    ...pick(keep, PERSIST),
    favor: keep.favor + gain,
    summonings: keep.summonings + 1,
  };
  if (hasPact('firstborn')) state.owned.acolyte = 10;
  if (hasPact('congregation')) state.owned.cultist = 10;
  if (hasPact('remembered')) state.upgrades = keep.upgrades;
  fx.summonStart = 0;
  fx.flash = 1;
  rebuildLists();
  log(`+${gain} Eldritch Favor.`);
  log(SUMMON_LINES[Math.min(state.summonings, SUMMON_LINES.length) - 1]);
  save();
}

function checkOmens() {
  while (state.omensSeen < OMENS.length && state.totalEarned >= OMENS[state.omensSeen][0]) {
    log(OMENS[state.omensSeen][1]);
    state.omensSeen++;
  }
  if (!state.summoned && state.totalEarned >= VEIL_GOAL) {
    state.summoned = true;
    log('THE VEIL TEARS. It waits for you to call it through.');
  }
}

function tick() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000 * timeScale;
  state.lastTick = now;
  earn(wps() * dt);

  state.sanity = Math.max(0, Math.min(100, state.sanity + (SANITY_REGEN - sanityDrain()) * dt));
  state.stats.minSanity = Math.min(state.stats.minSanity, state.sanity);
  // Cap event rolls so a long offline gap doesn't fire dozens at once
  if (state.sanity < MADNESS_THRESHOLD && Math.random() < Math.min(0.5, (MADNESS_THRESHOLD - state.sanity) / 400 * dt))
    madnessEvent();

  if (hasPact('faithful')) {
    autoBuyAcc += dt;
    while (autoBuyAcc >= 0.5) {
      autoBuyAcc -= 0.5;
      const cheapest = [...GENERATORS].sort((a, b) => genCost(a) - genCost(b))[0];
      buyGenerator(cheapest.id, 1);
    }
  }

  checkOmens();
  checkCosmetics();
  render();
}

// ============================================================
// SAVE / LOAD
// ============================================================

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    // merge onto fresh state so new fields/generators don't break old saves
    const fresh = freshState();
    const saved = JSON.parse(raw);
    return {
      ...fresh, ...saved,
      owned: { ...fresh.owned, ...saved.owned },
      stats: { ...fresh.stats, ...saved.stats },
      cosmetics: { ...fresh.cosmetics, ...saved.cosmetics,
        equipped: { ...fresh.cosmetics.equipped, ...saved.cosmetics?.equipped } },
      lifetimeEarned: saved.lifetimeEarned ?? saved.totalEarned ?? 0,
    };
  } catch { return null; }
}

function reset() {
  if (!confirm('Forget everything, even your Favor and Pacts? The thing beneath will not forget you.')) return;
  state = freshState();
  document.getElementById('log').innerHTML = '';
  rebuildLists();
  save();
}

// ============================================================
// UI
// ============================================================

const $ = id => document.getElementById(id);

function fmt(n) {
  if (n < 1000) return n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.floor(n).toString();
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= units.length) return n.toExponential(2);
  return (n / Math.pow(1000, tier)).toFixed(2) + units[tier];
}

function log(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  $('log').prepend(p);
  while ($('log').children.length > 30) $('log').lastChild.remove();
}

function buildGenerators() {
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
function rebuildLists() { for (const k in listKeys) delete listKeys[k]; }

function render() {
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

  // Followers — hidden until the previous one is owned
  document.querySelectorAll('[data-buy]').forEach(b =>
    b.classList.toggle('active', String(state.buyMode) === b.dataset.buy));
  GENERATORS.forEach((g, i) => {
    const el = $(`gen-${g.id}`);
    const n = buyAmount(g);
    const cost = genCost(g, n);
    const revealed = i === 0 || state.owned[GENERATORS[i - 1].id] > 0 || state.owned[g.id] > 0;
    el.style.display = revealed ? '' : 'none';
    el.classList.toggle('cant', state.whispers < cost);
    el.querySelector('.count').textContent = state.owned[g.id];
    el.querySelector('.cost').textContent = (n > 1 ? `×${n}  ` : '') + fmt(cost);
    el.querySelector('.rate').textContent = `${fmt(genRate(g, m))} / sec total`;
  });

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
  $('summon').style.display = gain > 0 && !fx.summonStart ? 'block' : 'none';
  document.body.classList.toggle('can-summon', gain > 0 && !fx.summonStart);
  $('summon').textContent = `Summon It  ·  +${gain} Favor`;

  const pct = veilPct();
  $('veil-fill').style.width = (pct * 100).toFixed(1) + '%';
  $('veil-label').textContent = fx.summonStart
    ? 'IT COMES.'
    : state.totalEarned >= VEIL_GOAL
      ? 'The veil is torn. It waits to be called.'
      : `The veil weakens… ${(pct * 100).toFixed(1)}%`;
}
