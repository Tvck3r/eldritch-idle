// ============================================================
// ENDING — the finale choice and the closing sequence.
// When the Last Seal breaks, a full-screen choice appears. Choosing plays
// the ending in the pixel scene (blown up to fill the screen) with the
// ending's lines beneath it, then offers New Game+ or to keep dreaming.
// ============================================================
import { ENDING_MS } from '../core/constants.js';
import { ENDINGS, ENDING_MIN_ALIGN } from '../core/content-acts.js';
import { state, fx } from '../core/state.js';
import { availableEndings, chooseEnding, newGamePlus, keepDreaming } from '../core/prestige.js';
import { on } from '../core/events.js';
import { settings } from '../core/settings.js';
import { $, save, haptic } from './dom.js';

const LINE_MS = ENDING_MS / 6;        // the five lines, then THE END

function showFinale() {
  const open = availableEndings().map(e => e.id);
  const a = state.alignment;
  $('ending').hidden = false;
  $('ending').className = 'finale';
  $('ending').innerHTML = `
    <div class="ending-inner">
      <div class="eyebrow">The Last Seal is broken</div>
      <h1>It is awake</h1>
      <p class="tagline">It looks at you, and only you, and waits.</p>
      <div class="ending-choices">${ENDINGS.map(e => {
        const ok = open.includes(e.id);
        return `<button data-ending="${e.id}" ${ok ? '' : 'disabled'}>
          <b>${e.verb}</b><span>${ok ? e.name : `You did not walk this road (${a[e.align]} / ${ENDING_MIN_ALIGN})`}</span></button>`;
      }).join('')}</div>
      <p class="sub">Your answers leaned: devotion ${a.devotion} · defiance ${a.defiance} · hunger ${a.hunger}</p>
    </div>`;
}

let lineTimer = null;
function playEnding(id) {
  const e = ENDINGS.find(e => e.id === id);
  document.body.classList.add('cinematic');
  $('ending').className = 'cinematic';
  $('ending').innerHTML = `<div class="ending-lines"></div>`;
  const lines = $('ending').querySelector('.ending-lines');
  let i = 0;
  const next = () => {
    if (i < e.lines.length) {
      const p = document.createElement('p');
      p.textContent = e.lines[i];
      if (i === e.lines.length - 1) p.className = 'ending-title';
      lines.appendChild(p);
      i++;
      lineTimer = setTimeout(next, settings.reducedMotion ? LINE_MS / 2 : LINE_MS);
    } else showAfter(e);
  };
  next();
  save();
}

function showAfter(e) {
  lines().insertAdjacentHTML('beforeend', `
    <div class="ending-after">
      <p class="sub">Endings seen: ${state.endings.length} / ${ENDINGS.length}</p>
      <button id="end-ngplus">Begin again · New Game+</button>
      <button id="end-dream" class="small">Keep dreaming</button>
      <p class="sub">New Game+: everything ×${state.ngPlus + 2}, and ${e.ngDesc.charAt(0).toLowerCase() + e.ngDesc.slice(1)}</p>
    </div>`);
}
const lines = () => $('ending').querySelector('.ending-lines');

function closeEnding() {
  clearTimeout(lineTimer);
  document.body.classList.remove('cinematic');
  $('ending').hidden = true;
  $('ending').innerHTML = '';
}

export function initEnding() {
  $('ending').addEventListener('click', e => {
    const pick = e.target.closest('[data-ending]');
    if (pick && chooseEnding(pick.dataset.ending)) { haptic([40, 80, 40, 80, 200]); playEnding(pick.dataset.ending); }
    if (e.target.closest('#end-ngplus') && confirm('Begin again from nothing? You keep your revelations, vestments and endings.')) { newGamePlus(); closeEnding(); }
    if (e.target.closest('#end-dream')) { keepDreaming(); closeEnding(); }
  });
  on('finale', showFinale);
  on('state-replaced', () => { if (!state.finale && !fx.ending) closeEnding(); });
  // a reload during the finale brings the choice back (after the sequence, the Ritual tab offers what's next)
  if (state.finale) showFinale();
}
