// Turn a text-grid sprite into a tiny canvas. Each letter maps to a color
// in `colors`; '.' (or any unmapped letter) is transparent.
export function bake(rows, colors) {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); }
  }));
  return c;
}

const cache = new Map();
export function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}
