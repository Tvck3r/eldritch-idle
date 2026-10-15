import { settings } from './settings.js';

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n, notation = settings.notation) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.floor(n).toString();
  const tier = Math.floor(Math.log10(n) / 3);
  if (notation === 'scientific' || tier >= UNITS.length) return n.toExponential(2).replace('e+', 'e');
  return (n / Math.pow(1000, tier)).toFixed(2) + UNITS[tier];
}
