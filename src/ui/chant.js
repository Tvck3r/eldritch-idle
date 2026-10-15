// ============================================================
// CHANT — the main button. Tap to chant; with the Ceaseless Chant
// rite, hold it to keep chanting. Floaters + haptics on each chant.
// ============================================================
import { HOLD_CHANT_RATE } from '../core/constants.js';
import { state } from '../core/state.js';
import { settings } from '../core/settings.js';
import { on, emit } from '../core/events.js';
import { chant, clickValue, canHoldChant } from '../core/economy.js';
import { fmt } from '../core/format.js';
import { $, haptic } from './dom.js';
import { chantSound } from './audio.js';

const HOLD_DELAY_MS = 260;   // a press longer than this starts the repeat

function floater(x, y) {
  if (settings.reducedMotion) return;
  const f = document.createElement('div');
  f.className = 'floater';
  f.textContent = '+' + fmt(clickValue());
  f.style.left = x + (Math.random() - 0.5) * 40 + 'px';
  f.style.top = y - 12 + 'px';
  document.body.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
  setTimeout(() => f.remove(), 1500);
}

function doChant(x, y) {
  if (!chant()) return;
  floater(x, y);
  haptic(6);
  chantSound();
}

// One-time teaching hint: pulse the button until the player first holds it
function updateHint() {
  const can = canHoldChant();
  if (can && !state.hints.includes('hold-told')) {
    state.hints.push('hold-told');
    emit('log', 'Your voice no longer needs to rest. Press and hold Chant.');
  }
  $('chant').classList.toggle('hint', can && !state.hints.includes('hold'));
}

export function initChant() {
  const btn = $('chant');
  let holdStart = null, repeat = null, pointerId = null;

  const stop = () => {
    clearTimeout(holdStart); clearInterval(repeat);
    holdStart = repeat = pointerId = null;
    btn.classList.remove('holding', 'pressed');
  };

  btn.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pointerId !== null) return;
    pointerId = e.pointerId;
    try { btn.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    btn.classList.add('pressed');
    doChant(e.clientX, e.clientY);
    if (!canHoldChant()) return;
    holdStart = setTimeout(() => {
      btn.classList.add('holding');
      if (!state.hints.includes('hold')) { state.hints.push('hold'); updateHint(); }
      const r = btn.getBoundingClientRect();
      repeat = setInterval(() => doChant(r.left + r.width / 2, r.top + 10), 1000 / HOLD_CHANT_RATE);
    }, HOLD_DELAY_MS);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, stop);
  window.addEventListener('blur', stop);
  btn.addEventListener('contextmenu', e => e.preventDefault()); // long-press menu on Android

  // keyboard (Enter/Space) fires click with detail 0; pointer chants already happened on pointerdown
  btn.addEventListener('click', e => {
    if (e.detail === 0) { const r = btn.getBoundingClientRect(); doChant(r.left + r.width / 2, r.top); }
  });

  updateHint();
  setInterval(updateHint, 1000);
  on('state-replaced', updateHint);
}
