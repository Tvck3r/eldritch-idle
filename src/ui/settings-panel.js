// ============================================================
// SETTINGS — preferences, save export/import, and wiping progress.
// ============================================================
import { settings, setSetting } from '../core/settings.js';
import { on } from '../core/events.js';
import { setState } from '../core/state.js';
import { resetAll } from '../core/economy.js';
import { exportSave, importSave } from '../core/save.js';
import { $, storage, save } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { clearLog } from './render.js';

const toggle = (key, label, hint) => `
  <label class="setting">
    <input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}>
    <span><b>${label}</b><span class="sub">${hint}</span></span>
  </label>`;

export function openSettings() {
  openModal(`
    <h2 class="modal-title">Settings</h2>
    <div class="settings">
      <h3>Display</h3>
      ${toggle('reducedMotion', 'Reduce motion', 'No flashes, screen shake or glitching.')}
      ${toggle('omenFeed', 'Omen feed', 'On phones, omens drift in over the game.')}
      ${toggle('haptics', 'Vibration', 'A small buzz when you chant or buy (Android).')}
      <label class="setting">
        <select data-setting="notation">
          <option value="suffix" ${settings.notation === 'suffix' ? 'selected' : ''}>1.23M</option>
          <option value="scientific" ${settings.notation === 'scientific' ? 'selected' : ''}>1.23e6</option>
        </select>
        <span><b>Number format</b><span class="sub">How big numbers are written.</span></span>
      </label>

      <h3>Your save</h3>
      <p class="sub">Copy this somewhere safe, or paste it on another device to continue there.</p>
      <textarea id="save-export" readonly rows="3"></textarea>
      <div class="row-buttons"><button class="small" id="copy-save">Copy</button></div>
      <textarea id="save-import" rows="3" placeholder="Paste a save here…"></textarea>
      <div class="row-buttons"><button class="small" id="load-save">Load this save</button><span id="save-msg" class="sub"></span></div>

      <h3>Forget</h3>
      <div class="row-buttons"><button class="small danger" id="wipe-save">Wipe all progress</button></div>
    </div>`);

  save();
  $('save-export').value = exportSave();

  $('modal-body').onchange = e => {
    const el = e.target.closest('[data-setting]'); if (!el) return;
    setSetting(el.dataset.setting, el.type === 'checkbox' ? el.checked : el.value, storage);
  };

  $('copy-save').onclick = async () => {
    $('save-export').select();
    try { await navigator.clipboard.writeText($('save-export').value); $('copy-save').textContent = 'Copied'; }
    catch { document.execCommand('copy'); $('copy-save').textContent = 'Copied'; }
  };

  $('load-save').onclick = () => {
    let next;
    try { next = importSave($('save-import').value); }
    catch (err) { $('save-msg').textContent = err.message; return; }
    if (!confirm('Replace your current progress with this save?')) return;
    setState(next);
    save();
    closeModal();
  };

  $('wipe-save').onclick = () => {
    if (!confirm('Forget everything, even your Favor and Pacts? The thing beneath will not forget you.')) return;
    resetAll();
    clearLog();
    save();
    closeModal();
  };
}

function applyBodyClasses() {
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
}

export function initSettings() {
  applyBodyClasses();
  on('settings', applyBodyClasses);
  $('open-settings').addEventListener('click', openSettings);
}
