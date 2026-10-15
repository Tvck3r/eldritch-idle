// ============================================================
// BOOT — load settings and save, wire the page, start the loops.
// ============================================================
import { CATCH_UP_THRESHOLD, FAVOR_BONUS } from './core/constants.js';
import { state, setState, runtime } from './core/state.js';
import { loadSettings } from './core/settings.js';
import { loadGame } from './core/save.js';
import { on, emit } from './core/events.js';
import {
  buyGenerator, buyUpgrade, buyPact, steadyMind, setBuyMode, tick, catchUp, canSummon, beginSummon, favorGain, wps,
} from './core/economy.js';
import { fmt } from './core/format.js';
import { $, storage, save, haptic } from './ui/dom.js';
import { initLog, buildGenerators, rebuildLists, render } from './ui/render.js';
import { initModal } from './ui/modal.js';
import { initInspect } from './ui/inspect.js';
import { initIntro } from './ui/intro.js';
import { openGrimoire } from './ui/grimoire.js';
import { initVesselPanel } from './ui/vessel-panel.js';
import { initShell } from './ui/shell.js';
import { initChant } from './ui/chant.js';
import { initSettings } from './ui/settings-panel.js';
import { startScene } from './scene/scene.js';
import { initAdmin, applyDebugSave } from './admin.js';

// ---------- state ----------

loadSettings(storage, { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
const loaded = loadGame(storage);
if (loaded.state) setState(loaded.state);
applyDebugSave();

// ---------- page ----------

initLog();
initModal();
initInspect();
initShell();
initChant();
initVesselPanel();
initSettings();
initIntro();
initAdmin();
buildGenerators();

on('state-replaced', rebuildLists);
on('summoned', save);

// A purchase succeeded → a little buzz
const bought = ok => { if (ok) haptic(12); };

$('summon').addEventListener('click', () => {
  if (!canSummon()) return;
  const gain = favorGain();
  const ok = confirm(`Summon It? All whispers, followers, and rites will be lost.\n` +
    `You will gain ${gain} Eldritch Favor (+${Math.round(gain * FAVOR_BONUS * 100)}% to everything, forever).`);
  if (ok && beginSummon()) haptic([30, 60, 30, 60, 120]);
});
$('steady').addEventListener('click', () => bought(steadyMind()));
$('buy-mode').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (b) setBuyMode(b.dataset.buy);
});
$('generators').addEventListener('click', e => {
  const b = e.target.closest('[data-gen]'); if (b) bought(buyGenerator(b.dataset.gen));
});
$('upgrades').addEventListener('click', e => {
  const b = e.target.closest('[data-upg]'); if (b) bought(buyUpgrade(b.dataset.upg));
});
$('pacts').addEventListener('click', e => {
  const b = e.target.closest('[data-pact]'); if (b) bought(buyPact(b.dataset.pact));
});
$('save-btn').addEventListener('click', () => { save(); emit('log', 'Your progress is etched into memory.'); });
$('open-guide').addEventListener('click', () => openGrimoire());

if (loaded.error) emit('log', 'Your memories were damaged. A copy was set aside; you begin anew.');

// ---------- time ----------

// Time away since the last save: earn, but sanity rests (see catchUp)
const away = (Date.now() - state.lastTick) / 1000;
if (away > CATCH_UP_THRESHOLD) {
  const rate = wps();
  catchUp(away);
  if (rate > 0) emit('log', `While you slept, your followers whispered ${fmt(rate * away)} times.`);
}

let last = Date.now();
function loop() {
  const now = Date.now();
  const real = (now - last) / 1000;
  const dt = real * runtime.timeScale;
  last = now;
  state.lastTick = now;
  // Browsers throttle background tabs to ~1 tick/minute; treat long gaps as time away
  if (real > CATCH_UP_THRESHOLD) catchUp(dt); else tick(dt);
  render();
}

loop();
setInterval(loop, 50);
setInterval(save, 10000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
startScene();

// ---------- install as an app ----------
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* offline play just won't work */ }));
}
