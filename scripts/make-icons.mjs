// Draws the app icon (the Watcher's eye) as pixel art and writes PNG + SVG
// files to src/public. Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const GRID = 32;
const COLORS = { bg: '#07060b', rim: '#3a1f5c', rimHi: '#6b3fa0', sclera: '#d8d29a', vein: '#a8573f', iris: '#7dffb0', pupil: '#050308', glow: '#14241c' };

// Same lens maths as the in-game Watcher
function pixels() {
  const px = Array.from({ length: GRID }, () => Array(GRID).fill('bg'));
  const cx = 16, cy = 16, w = 13, h = 7.5, ir = 6;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d < 15 && d > 13.5 && (x + y) % 3 === 0) px[y][x] = 'glow';
  }
  for (let x = -w; x <= w; x++) {
    const lens = h * (1 - (x / w) ** 2);
    for (let y = -Math.ceil(lens) - 1; y <= Math.ceil(lens) + 1; y++) {
      const ay = Math.abs(y), gx = cx + x, gy = cy + y;
      if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID || ay > lens + 1) continue;
      if (ay > lens) { px[gy][gx] = Math.abs(x) < w * 0.5 ? 'rimHi' : 'rim'; continue; }
      const d = Math.hypot(x, y);
      let c = (x + y * 3) % 7 === 0 && Math.abs(x) > w * 0.6 ? 'vein' : 'sclera';
      if (d < ir) c = Math.abs(x) < 1.5 ? 'pupil' : 'iris';
      px[gy][gx] = c;
    }
  }
  return px;
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

// Minimal PNG encoder (RGB, no filter)
function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px, pad = 0) {
  const inner = size - pad * 2, scale = inner / GRID;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const bg = rgb(COLORS.bg);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - pad) / scale), gy = Math.floor((y - pad) / scale);
      const col = gx >= 0 && gy >= 0 && gx < GRID && gy < GRID ? rgb(COLORS[px[gy][gx]]) : bg;
      col.forEach((v, i) => { raw[y * (size * 3 + 1) + 1 + x * 3 + i] = v; });
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function svg(px) {
  const rects = [];
  px.forEach((row, y) => row.forEach((c, x) => { if (c !== 'bg') rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>`); }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges"><rect width="${GRID}" height="${GRID}" rx="6" fill="${COLORS.bg}"/>${rects.join('')}</svg>\n`;
}

const px = pixels();
const out = 'src/public/';
writeFileSync(out + 'icon-192.png', png(192, px));
writeFileSync(out + 'icon-512.png', png(512, px));
writeFileSync(out + 'icon-maskable-512.png', png(512, px, 64));   // safe zone for round masks
writeFileSync(out + 'icon-180.png', png(180, px));                 // apple-touch-icon
writeFileSync(out + 'icon.svg', svg(px));
console.log('icons written to', out);
