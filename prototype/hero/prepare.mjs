// Gets a capture's pictures ready for the generators: cuts each one down to the
// car, removes the captions and badges printed into product pictures, and writes
// a clean copy that carries no camera or location data.
//
//   node prepare.mjs <capture>
//
// It reads captures/<capture>/capture.json and writes captures/<capture>/prepared/.

import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { VIEWS } from './generators.mjs';

export const CAPTURES = resolve(dirname(fileURLToPath(import.meta.url)), '../../captures');

/**
 * Where the car can be, as shares of the picture, by where the pictures come from.
 * Mini GT prints captions along the bottom of its product pictures, which the
 * window leaves out, and sometimes a badge in a top corner, such as a series'
 * name, which `findCar` paints over.
 */
const LAYOUTS = {
  minigt: { window: { x0: 0.04, y0: 0.04, x1: 0.96, y1: 0.78 } },
  own: { window: { x0: 0.02, y0: 0.02, x1: 0.98, y1: 0.98 } },
};

async function load(file) {
  // rotate() honours the camera's orientation flag
  const { data, info } = await sharp(file).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

const differs = (data, k, bg) => Math.abs(data[k] - bg[0]) + Math.abs(data[k + 1] - bg[1]) + Math.abs(data[k + 2] - bg[2]);

/** The backdrop colour of one row, taken from a short run of pixels starting at x. */
function rowColour({ data, W }, y, x, run) {
  const bg = [0, 0, 0];
  for (let i = 0; i < run; i++) for (let c = 0; c < 3; c++) bg[c] += data[(y * W + x + i) * 3 + c];
  return bg.map((v) => v / run);
}

/**
 * Finds the car inside the window. Whatever differs from the backdrop of its own
 * row is something, and the car is the largest piece of it that hangs
 * together. Every other piece, a badge in a corner or a speck, is painted over
 * with the backdrop: so it is gone even where a tall wing reaches up beside it
 * and the picture cannot be cut clear of it.
 */
function findCar(img, window) {
  const { data, W, H } = img;
  const wx = Math.round(W * window.x0), wy = Math.round(H * window.y0);
  const w = Math.round(W * (window.x1 - window.x0)), h = Math.round(H * (window.y1 - window.y0));
  const whole = { found: false, others: 0, box: { left: wx, top: wy, width: w, height: h } };
  const run = Math.max(3, Math.round(w * 0.03));
  // squares of a few pixels: one counts as something if enough of it differs from the backdrop
  const CELL = Math.max(3, Math.round(w / 300));
  const gw = Math.ceil(w / CELL), gh = Math.ceil(h / CELL);
  const count = new Uint16Array(gw * gh);
  // The backdrop is a soft gradient, darker towards one side and towards the top, so every
  // row is judged by its own two ends and what lies evenly between them. Where the two are
  // far apart, one of them lies on a badge, and the paler one is the backdrop all the way.
  const ends = [];
  const bg = [0, 0, 0];
  const backdropAt = (y, x) => {
    const [a, b] = ends[y];
    const t = x / Math.max(1, w - 1);
    for (let c = 0; c < 3; c++) bg[c] = a[c] + (b[c] - a[c]) * t;
    return bg;
  };
  for (let y = 0; y < h; y++) ends.push([rowColour(img, wy + y, wx, run), rowColour(img, wy + y, wx + w - run, run)]);
  // An end of a row that lies on a badge is no backdrop: it is uneven, or far from what
  // that end is in most rows. It takes the colour of the same end of the nearest row
  // that is clean.
  for (const side of [0, 1]) {
    const x = side === 0 ? wx : wx + w - run;
    const usual = [0, 1, 2].map((c) => ends.map((e) => e[side][c]).sort((p, q) => p - q)[Math.floor(h / 2)]);
    const clean = ends.map((e, y) => {
      let uneven = 0;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (let i = 0; i < run; i++) {
          const v = data[((wy + y) * W + x + i) * 3 + c];
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        uneven = Math.max(uneven, hi - lo);
      }
      const off = Math.abs(e[side][0] - usual[0]) + Math.abs(e[side][1] - usual[1]) + Math.abs(e[side][2] - usual[2]);
      return uneven <= 50 && off <= 70;
    });
    for (let y = 0; y < h; y++) {
      if (clean[y]) continue;
      let near = -1;
      for (let d = 1; d < h && near < 0; d++) {
        if (y - d >= 0 && clean[y - d]) near = y - d;
        else if (y + d < h && clean[y + d]) near = y + d;
      }
      ends[y][side] = near >= 0 ? ends[near][side] : ends[y][1 - side];
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (differs(data, ((wy + y) * W + wx + x) * 3, backdropAt(y, x)) > 42) count[Math.floor(y / CELL) * gw + Math.floor(x / CELL)]++;
    }
  }
  const on = (c) => count[c] >= CELL * CELL * 0.15;
  // the pieces that hang together, and how much there is of each
  const piece = new Int32Array(gw * gh).fill(-1);
  const sizes = [], stack = [];
  for (let s = 0; s < gw * gh; s++) {
    if (!on(s) || piece[s] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    piece[s] = id;
    stack.push(s);
    while (stack.length) {
      const c = stack.pop();
      size += count[c];
      const cx = c % gw, cy = (c - cx) / gw;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const n = ny * gw + nx;
          if (on(n) && piece[n] < 0) { piece[n] = id; stack.push(n); }
        }
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return whole;
  const car = sizes.indexOf(Math.max(...sizes));

  // where the car is
  let cx0 = gw, cx1 = -1, cy0 = gh, cy1 = -1;
  for (let c = 0; c < gw * gh; c++) {
    if (piece[c] !== car) continue;
    const cx = c % gw, cy = (c - cx) / gw;
    cx0 = Math.min(cx0, cx); cx1 = Math.max(cx1, cx); cy0 = Math.min(cy0, cy); cy1 = Math.max(cy1, cy);
  }
  const x0 = cx0 * CELL, x1 = Math.min(w, (cx1 + 1) * CELL), y0 = cy0 * CELL, y1 = Math.min(h, (cy1 + 1) * CELL);
  const sane = x1 - x0 > w * 0.3 && y1 - y0 > h * 0.1 && x1 - x0 < w * 0.97;
  if (!sane) return whole;

  // every other piece is painted over, and a square's width round each, for its soft edge
  const gone = new Uint8Array(gw * gh);
  for (let c = 0; c < gw * gh; c++) {
    if (piece[c] < 0 || piece[c] === car) continue;
    const cx = c % gw, cy = (c - cx) / gw;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && piece[ny * gw + nx] !== car) gone[ny * gw + nx] = 1;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gone[Math.floor(y / CELL) * gw + Math.floor(x / CELL)]) data.set(backdropAt(y, x).map(Math.round), ((wy + y) * W + wx + x) * 3);
    }
  }

  // leave air around the car: a pale car on a pale backdrop is found a little too small
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.1);
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad), right = Math.min(w, x1 + pad), bottom = Math.min(h, y1 + pad);
  return { found: true, others: sizes.length - 1, car: { width: x1 - x0, height: y1 - y0 }, box: { left: wx + left, top: wy + top, width: right - left, height: bottom - top } };
}

export async function readCapture(name) {
  const dir = join(CAPTURES, name);
  const capture = JSON.parse(await readFile(join(dir, 'capture.json'), 'utf8'));
  for (const view of Object.keys(capture.views)) {
    if (!VIEWS.includes(view)) throw new Error(`"${view}" is not a view. The views are: ${VIEWS.join(', ')}.`);
  }
  return { dir, capture };
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.log('Which capture? Usage: node prepare.mjs <capture>');
    process.exit(1);
  }
  const { dir, capture } = await readCapture(name);
  const layout = LAYOUTS[capture.layout ?? 'own'];
  if (!layout) throw new Error(`"${capture.layout}" is not a layout. The layouts are: ${Object.keys(LAYOUTS).join(', ')}.`);
  await mkdir(join(dir, 'prepared'), { recursive: true });
  console.log(`${capture.name}${capture.item ? ` (${capture.item})` : ''}`);
  for (const [view, source] of Object.entries(capture.views)) {
    const img = await load(join(dir, source));
    const { box, found, car, others } = findCar(img, layout.window);
    // written from bare pixels, so the copy carries no camera or location data
    await sharp(img.data, { raw: { width: img.W, height: img.H, channels: 3 } })
      .extract(box).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(join(dir, 'prepared', `${view}.jpg`));
    const how = found ? `car about ${car.width} x ${car.height}` : 'car not found, kept the whole window';
    console.log(`  ${view.padEnd(11)} ${img.W} x ${img.H}  ->  ${box.width} x ${box.height}  (${how}${others ? `, ${others} other ${others === 1 ? 'thing' : 'things'} painted out` : ''})`);
  }
  console.log(`Written to ${join(dir, 'prepared')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
