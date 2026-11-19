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
 * Mini GT prints captions along the bottom of its product pictures and sometimes
 * a badge in the top left corner.
 */
const LAYOUTS = {
  minigt: { window: { x0: 0.04, y0: 0.04, x1: 0.96, y1: 0.78 }, badge: { x1: 0.17, y1: 0.2 } },
  own: { window: { x0: 0.02, y0: 0.02, x1: 0.98, y1: 0.98 }, badge: null },
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

/** Paints a badge in the top left corner over with the backdrop beside it. Returns whether there was one. */
function paintOutBadge(img, zone) {
  const { data, W, H } = img;
  const zx = Math.round(W * zone.x1), zy = Math.round(H * zone.y1), run = Math.max(3, Math.round(W * 0.03));
  let marked = 0;
  for (let y = 0; y < zy; y++) {
    const bg = rowColour(img, y, zx, run);
    for (let x = 0; x < zx; x++) if (differs(data, (y * W + x) * 3, bg) > 70) marked++;
  }
  if (marked < zx * zy * 0.015) return false;
  for (let y = 0; y < zy; y++) {
    const bg = rowColour(img, y, zx, run).map(Math.round);
    for (let x = 0; x < zx; x++) data.set(bg, (y * W + x) * 3);
  }
  return true;
}

/** Finds the car inside the window: whatever differs from the backdrop of its own row. */
function findCar(img, window) {
  const { data, W, H } = img;
  const wx = Math.round(W * window.x0), wy = Math.round(H * window.y0);
  const w = Math.round(W * (window.x1 - window.x0)), h = Math.round(H * (window.y1 - window.y0));
  const run = Math.max(3, Math.round(w * 0.03));
  const cols = new Uint32Array(w), rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    // the backdrop is a soft gradient from top to bottom, so every row is judged by its own two ends
    const a = rowColour(img, wy + y, wx, run), b = rowColour(img, wy + y, wx + w - run, run);
    const bg = a.map((v, c) => (v + b[c]) / 2);
    for (let x = 0; x < w; x++) {
      if (differs(data, ((wy + y) * W + wx + x) * 3, bg) > 42) { cols[x]++; rows[y]++; }
    }
  }
  // a row or column counts once more than a sliver of it differs: specks do not
  const first = (a, min) => a.findIndex((v) => v > min);
  const last = (a, min) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] > min) return i; return -1; };
  const x0 = first(cols, h * 0.012), x1 = last(cols, h * 0.012), y0 = first(rows, w * 0.012), y1 = last(rows, w * 0.012);
  const sane = x0 >= 0 && y0 >= 0 && x1 - x0 > w * 0.3 && y1 - y0 > h * 0.1 && x1 - x0 < w * 0.97;
  if (!sane) return { found: false, box: { left: wx, top: wy, width: w, height: h } };
  // leave air around the car: a pale car on a pale backdrop is found a little too small
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.1);
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad), right = Math.min(w, x1 + pad), bottom = Math.min(h, y1 + pad);
  return { found: true, car: { width: x1 - x0, height: y1 - y0 }, box: { left: wx + left, top: wy + top, width: right - left, height: bottom - top } };
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
    const badge = layout.badge ? paintOutBadge(img, layout.badge) : false;
    const { box, found, car } = findCar(img, layout.window);
    // written from bare pixels, so the copy carries no camera or location data
    await sharp(img.data, { raw: { width: img.W, height: img.H, channels: 3 } })
      .extract(box).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(join(dir, 'prepared', `${view}.jpg`));
    const how = found ? `car about ${car.width} x ${car.height}` : 'car not found, kept the whole window';
    console.log(`  ${view.padEnd(11)} ${img.W} x ${img.H}  ->  ${box.width} x ${box.height}  (${how}${badge ? ', badge painted out' : ''})`);
  }
  console.log(`Written to ${join(dir, 'prepared')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
