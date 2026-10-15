import { state } from '../core/state.js';
import { $, save } from './dom.js';
import { openGrimoire } from './grimoire.js';

export function showIntro() { $('intro').hidden = false; }

function hideIntro() {
  $('intro').hidden = true;
  state.seenIntro = true;
  save();
}

export function initIntro() {
  $('intro-begin').addEventListener('click', hideIntro);
  $('intro-guide').addEventListener('click', () => { hideIntro(); openGrimoire(); });
  if (!state.seenIntro) showIntro();
}
