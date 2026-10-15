import { $ } from './dom.js';

let onClose = null;

export function openModal(html, onModalClose = null) {
  $('modal-body').innerHTML = html;
  $('modal-body').onclick = null;
  $('modal').hidden = false;
  onClose = onModalClose;
}

export function closeModal() {
  $('modal').hidden = true;
  if (onClose) onClose();
  onClose = null;
}

export function initModal() {
  $('modal-close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); });
}
