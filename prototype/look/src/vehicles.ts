// Everything that drives: plain traffic, drawn in a handful of batches, and the
// stand-in heroes, each a mesh of its own with a decal sheet and turning wheels.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEROES, LOOPS, PARKED, TURNTABLE_RATE, type HeroBody, type HeroDef, type LoopKind } from './scene-data';
import { buildPath, type Path } from './paths';
import { makeHeroMaterial, makePropMaterial, makeVehicleMaterial } from './materials';
import { rng } from './geo';

type P2 = [number, number];

// Which part of a vehicle a vertex belongs to. The shader lights lamps at night
// and lets only the paint take a vehicle's colour.
const PAINT = 0, GLASS = 1, TRIM = 2, HEAD = 3, TAIL = 4, HUB = 5;
const C_GLASS = 0x1c2733, C_TYRE = 0x17171a, C_TRIM = 0x2a2c31, C_HUB = 0xb9bcc2, C_HEAD = 0xfff4d6, C_TAIL = 0xc81e1e;

function part(g: THREE.BufferGeometry, p: number, color: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  ng.computeVertexNormals();
  const n = ng.getAttribute('position').count;
  ng.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(p), 1));
  const c = new THREE.Color(color);
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  ng.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  if (!ng.getAttribute('uv')) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  ng.clearGroups();
  return ng;
}

/** A side profile pushed out to a width: the quickest way to a car-shaped body. */
function extrude(pts: P2[], width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -width / 2);
  return g;
}

function box(sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
}

function wheelsFor(r: number, wid: number, xs: number[]): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const x of xs) {
    for (const side of [-1, 1]) {
      const z = side * (wid / 2 - 0.32);
      out.push(part(new THREE.CylinderGeometry(r, r, 0.85, 10).rotateX(Math.PI / 2).translate(x, r, z), TRIM, C_TYRE));
      out.push(part(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.93, 8).rotateX(Math.PI / 2).translate(x, r, z), HUB, C_HUB));
    }
  }
  return out;
}

function lampsFor(nose: number, tail: number, yHead: number, yTail: number, wid: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    out.push(part(box(0.16, 0.36, 0.8, nose, yHead, side * (wid / 2 - 0.7)), HEAD, C_HEAD));
    out.push(part(box(0.16, 0.3, 0.85, tail, yTail, side * (wid / 2 - 0.7)), TAIL, C_TAIL));
  }
  return out;
}

interface VType { name: string; geo: THREE.BufferGeometry; len: number; wid: number; wb: number; colors: number[] }

const TRAFFIC_COLORS = [0xd9d4cc, 0x9aa3ad, 0x5b6b7a, 0x2e3440, 0xb5483a, 0x4f7a6b, 0x3f6fa3, 0xd1b25a, 0xf2f0ea, 0x8b5e83, 0x6d8f9b];

function trafficTypes(): VType[] {
  const types: VType[] = [];

  {
    const W = 3.1;
    types.push({
      name: 'sedan', len: 7.2, wid: W, wb: 4.4, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.6, 0.55], [3.5, 0.5], [3.6, 0.9], [3.45, 1.25], [1.3, 1.45], [-2.2, 1.5], [-3.6, 1.4]], W), PAINT, 0xffffff),
        part(extrude([[1.2, 1.42], [0.35, 2.2], [-1.7, 2.2], [-2.5, 1.48]], W - 0.5), GLASS, C_GLASS),
        part(box(2.15, 0.13, W - 0.6, -0.675, 2.26, 0), PAINT, 0xffffff),
        ...wheelsFor(0.98, W, [2.2, -2.2]),
        ...lampsFor(3.56, -3.58, 1.02, 1.2, W),
      ])!,
    });
  }
  {
    const W = 3.0;
    types.push({
      name: 'hatch', len: 6.2, wid: W, wb: 3.8, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.1, 0.55], [3.0, 0.5], [3.1, 0.9], [2.95, 1.25], [1.2, 1.5], [-3.1, 1.55]], W), PAINT, 0xffffff),
        part(extrude([[1.1, 1.48], [0.4, 2.3], [-2.6, 2.3], [-3.0, 1.55]], W - 0.5), GLASS, C_GLASS),
        part(box(3.05, 0.13, W - 0.6, -1.1, 2.36, 0), PAINT, 0xffffff),
        ...wheelsFor(0.95, W, [1.95, -1.95]),
        ...lampsFor(3.06, -3.08, 1.02, 1.25, W),
      ])!,
    });
  }
  {
    const W = 3.2;
    types.push({
      name: 'van', len: 7.4, wid: W, wb: 4.5, colors: [0xf2f0ea, 0xd9d4cc, 0x9aa3ad, 0x3f6fa3, 0xd1b25a, 0x4f7a6b],
      geo: mergeGeometries([
        part(extrude([[-3.7, 0.55], [3.6, 0.5], [3.7, 1.0], [3.55, 1.7], [2.5, 1.85], [-3.7, 1.85]], W), PAINT, 0xffffff),
        part(extrude([[2.5, 1.85], [1.95, 2.95], [0.5, 2.95], [0.5, 1.85]], W - 0.4), GLASS, C_GLASS),
        part(box(4.2, 1.35, W, -1.6, 2.52, 0), PAINT, 0xffffff),
        part(box(1.5, 0.13, W - 0.5, 1.2, 3.02, 0), PAINT, 0xffffff),
        ...wheelsFor(1.0, W, [2.3, -2.3]),
        ...lampsFor(3.66, -3.68, 1.15, 1.4, W),
      ])!,
    });
  }
  {
    const W = 3.2;
    types.push({
      name: 'pickup', len: 7.6, wid: W, wb: 4.7, colors: TRAFFIC_COLORS,
      geo: mergeGeometries([
        part(extrude([[-3.8, 0.6], [3.7, 0.55], [3.8, 1.0], [3.65, 1.45], [1.7, 1.62], [-3.8, 1.62]], W), PAINT, 0xffffff),
        part(extrude([[1.6, 1.6], [1.0, 2.45], [-0.5, 2.45], [-0.7, 1.6]], W - 0.5), GLASS, C_GLASS),
        part(box(1.55, 0.13, W - 0.6, 0.25, 2.51, 0), PAINT, 0xffffff),
        part(box(3.0, 0.45, 0.16, -2.25, 1.84, W / 2 - 0.08), PAINT, 0xffffff),
        part(box(3.0, 0.45, 0.16, -2.25, 1.84, -W / 2 + 0.08), PAINT, 0xffffff),
        part(box(0.16, 0.45, W, -3.72, 1.84, 0), PAINT, 0xffffff),
        part(box(2.9, 0.06, W - 0.4, -2.2, 1.65, 0), TRIM, C_TRIM),
        ...wheelsFor(1.05, W, [2.35, -2.35]),
        ...lampsFor(3.76, -3.82, 1.1, 1.3, W),
      ])!,
    });
  }
  {
    // toy size: the bus is hardly longer than a car, as its diecast would be
    const W = 3.3;
    types.push({
      name: 'bus', len: 8.8, wid: W, wb: 5.2, colors: [0x4aa3a2, 0xc8523f, 0xe8c24a, 0x5676b8],
      geo: mergeGeometries([
        part(box(8.8, 1.45, W, 0, 1.275, 0), PAINT, 0xffffff),
        part(box(8.5, 1.05, W - 0.12, 0, 2.52, 0), GLASS, C_GLASS),
        part(box(8.8, 0.6, W, 0, 3.34, 0), PAINT, 0xffffff),
        part(box(0.3, 1.05, W - 0.08, -4.2, 2.52, 0), PAINT, 0xffffff),
        part(box(0.25, 1.05, W - 0.08, -1.2, 2.52, 0), PAINT, 0xffffff),
        part(box(0.25, 1.05, W - 0.08, 1.6, 2.52, 0), PAINT, 0xffffff),
        ...wheelsFor(1.05, W, [2.7, -2.7]),
        ...lampsFor(4.42, -4.42, 1.0, 1.2, W),
      ])!,
    });
  }
  return types;
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

interface HeroGeo {
  geo: THREE.BufferGeometry;
  len: number; wid: number; h: number; x0: number; wb: number;
  wheelR: number; wheelX: [number, number]; wheelZ: number;
}

// Where things sit on a hero's decal sheet (512 x 512, v downwards).
const SHEET = 512, SIDE_H = 176, TOP_Y = 192, TOP_H = 192;

function heroGeometry(body: HeroBody): HeroGeo {
  let parts: THREE.BufferGeometry[];
  let len: number, wid: number, h: number, wheelR: number, wheelX: [number, number];

  if (body === 'racer') {
    len = 7.6; wid = 3.5; h = 2.5; wheelR = 1.02; wheelX = [2.35, -2.3];
    parts = [
      part(extrude([[-3.8, 0.42], [3.7, 0.38], [3.8, 0.7], [3.55, 1.0], [1.6, 1.28], [-2.6, 1.42], [-3.8, 1.3]], wid), PAINT, 0xffffff),
      part(extrude([[1.5, 1.26], [0.5, 1.95], [-1.5, 1.98], [-2.5, 1.42]], wid - 0.7), GLASS, C_GLASS),
      part(box(2.0, 0.12, wid - 0.8, -0.5, 2.02, 0), PAINT, 0xffffff),
      part(box(0.95, 0.12, wid + 0.1, -3.4, 2.38, 0), PAINT, 0xffffff), // the wing
      part(box(0.14, 0.95, 0.14, -3.35, 1.86, 1.15), TRIM, C_TRIM),
      part(box(0.14, 0.95, 0.14, -3.35, 1.86, -1.15), TRIM, C_TRIM),
      part(box(0.14, 0.5, 0.12, -3.4, 2.2, wid / 2 + 0.02), PAINT, 0xffffff),
      part(box(0.14, 0.5, 0.12, -3.4, 2.2, -wid / 2 - 0.02), PAINT, 0xffffff),
      part(box(0.7, 0.1, wid + 0.1, 3.6, 0.36, 0), TRIM, C_TRIM), // the splitter
      part(box(4.2, 0.16, 0.16, 0, 0.42, wid / 2), TRIM, C_TRIM),
      part(box(4.2, 0.16, 0.16, 0, 0.42, -wid / 2), TRIM, C_TRIM),
      part(box(0.3, 0.2, 0.34, 0.9, 1.6, wid / 2 - 0.1), PAINT, 0xffffff),
      part(box(0.3, 0.2, 0.34, 0.9, 1.6, -wid / 2 + 0.1), PAINT, 0xffffff),
      part(box(0.7, 0.3, 0.5, -3.75, 0.62, 0.8), TRIM, 0x8a8d93), // twin exhausts
      part(box(0.7, 0.3, 0.5, -3.75, 0.62, -0.8), TRIM, 0x8a8d93),
      ...lampsFor(3.68, -3.78, 0.84, 1.12, wid),
    ];
  } else if (body === 'coupe') {
    len = 7.2; wid = 3.3; h = 2.6; wheelR = 1.0; wheelX = [2.2, -2.15];
    parts = [
      part(extrude([[-3.6, 0.5], [3.5, 0.46], [3.6, 0.85], [3.45, 1.22], [1.4, 1.42], [-2.1, 1.5], [-3.6, 1.42]], wid), PAINT, 0xffffff),
      part(extrude([[1.3, 1.4], [0.55, 2.15], [-1.55, 2.15], [-2.3, 1.5]], wid - 0.6), GLASS, C_GLASS),
      part(box(2.1, 0.12, wid - 0.7, -0.5, 2.21, 0), PAINT, 0xffffff),
      part(box(0.8, 0.1, wid - 0.1, -3.2, 2.05, 0), PAINT, 0xffffff), // the wing
      part(box(0.12, 0.55, 0.12, -3.2, 1.76, 1.2), TRIM, C_TRIM),
      part(box(0.12, 0.55, 0.12, -3.2, 1.76, -1.2), TRIM, C_TRIM),
      part(box(0.5, 0.12, wid + 0.06, 3.5, 0.44, 0), TRIM, C_TRIM), // the front lip
      part(box(3.8, 0.2, 0.14, 0, 0.52, wid / 2), TRIM, C_TRIM),
      part(box(3.8, 0.2, 0.14, 0, 0.52, -wid / 2), TRIM, C_TRIM),
      part(box(0.3, 0.2, 0.34, 0.8, 1.66, wid / 2 - 0.08), PAINT, 0xffffff),
      part(box(0.3, 0.2, 0.34, 0.8, 1.66, -wid / 2 + 0.08), PAINT, 0xffffff),
      part(box(1.0, 0.12, 1.3, 2.4, 1.38, 0), TRIM, C_TRIM), // a bonnet scoop
      part(box(0.6, 0.34, 0.34, -3.6, 0.66, 1.0), TRIM, 0x8a8d93),
      ...lampsFor(3.56, -3.58, 0.98, 1.2, wid),
    ];
  } else {
    len = 5.6; wid = 2.9; h = 3.4; wheelR = 0.82; wheelX = [1.75, -1.75];
    parts = [
      part(extrude([[-2.8, 0.5], [2.7, 0.46], [2.8, 1.0], [2.68, 1.75], [2.25, 1.86], [-2.8, 1.86]], wid), PAINT, 0xffffff),
      part(extrude([[2.25, 1.86], [1.8, 2.95], [-2.7, 2.95], [-2.7, 1.86]], wid - 0.3), GLASS, C_GLASS),
      part(box(4.6, 0.16, wid - 0.2, -0.45, 3.03, 0), PAINT, 0xffffff),
      part(box(0.3, 1.1, wid - 0.22, 0.5, 2.4, 0), PAINT, 0xffffff), // pillars
      part(box(0.3, 1.1, wid - 0.22, -1.2, 2.4, 0), PAINT, 0xffffff),
      part(box(0.3, 1.1, wid - 0.22, -2.6, 2.4, 0), PAINT, 0xffffff),
      part(box(3.4, 0.1, 0.1, -0.6, 3.3, 1.0), TRIM, C_TRIM), // a roof rack
      part(box(3.4, 0.1, 0.1, -0.6, 3.3, -1.0), TRIM, C_TRIM),
      part(box(0.1, 0.22, 2.1, 0.9, 3.2, 0), TRIM, C_TRIM),
      part(box(0.1, 0.22, 2.1, -2.1, 3.2, 0), TRIM, C_TRIM),
      part(box(1.6, 0.4, 1.5, -0.6, 3.5, 0), PAINT, 0xffffff), // a box strapped on top
      part(box(0.25, 0.2, 0.3, 1.9, 1.95, wid / 2 - 0.05), PAINT, 0xffffff),
      part(box(0.25, 0.2, 0.3, 1.9, 1.95, -wid / 2 + 0.05), PAINT, 0xffffff),
      ...lampsFor(2.76, -2.78, 1.2, 1.3, wid),
    ];
  }

  const geo = mergeGeometries(parts)!;
  const x0 = -len / 2;
  // Lay the paint onto the decal sheet: sides from the side, everything else from above.
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), prt = geo.getAttribute('aPart');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    if (prt.getX(i) !== PAINT) {
      uv[i * 2] = 0.985;
      uv[i * 2 + 1] = 0.985;
      continue;
    }
    let u = Math.min(0.995, Math.max(0.005, (pos.getX(i) - x0) / len));
    const nz = nor.getZ(i);
    if (Math.abs(nz) > 0.6) {
      if (nz < 0) u = 1 - u;
      const v = Math.min(0.99, Math.max(0.01, 1 - pos.getY(i) / h));
      uv[i * 2] = u;
      uv[i * 2 + 1] = (v * SIDE_H) / SHEET;
    } else {
      const v = Math.min(0.99, Math.max(0.01, (pos.getZ(i) + wid / 2) / wid));
      uv[i * 2] = u;
      uv[i * 2 + 1] = (TOP_Y + v * TOP_H) / SHEET;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return { geo, len, wid, h, x0, wb: wheelX[0] - wheelX[1], wheelR, wheelX, wheelZ: wid / 2 - 0.3 };
}

/** Draws a hero's decal sheet: paint, stripes, a number and an invented sponsor. */
function heroTexture(def: HeroDef): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SHEET;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SHEET, SHEET);
  const FONT = '"Arial Black", "Segoe UI Black", Arial, sans-serif';

  const roundel = (x: number, y: number, r: number, fg = '#111', bg = '#fff') => {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = fg;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${r * 1.15}px ${FONT}`;
    ctx.fillText(def.number, x, y + r * 0.06);
  };
  const text = (s: string, x: number, y: number, size: number, color: string, italic = true) => {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${italic ? 'italic ' : ''}900 ${size}px ${FONT}`;
    ctx.fillText(s, x, y);
  };

  // --- the side, nose to the right ---
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, SHEET, SIDE_H); ctx.clip();
  ctx.fillStyle = def.paint;
  ctx.fillRect(0, 0, SHEET, SIDE_H);
  if (def.body === 'racer') {
    ctx.fillStyle = def.accent;
    ctx.beginPath(); ctx.moveTo(0, 118); ctx.lineTo(512, 96); ctx.lineTo(512, 118); ctx.lineTo(0, 140); ctx.fill();
    ctx.fillStyle = def.accent2;
    ctx.beginPath(); ctx.moveTo(0, 142); ctx.lineTo(512, 120); ctx.lineTo(512, 130); ctx.lineTo(0, 152); ctx.fill();
    roundel(250, 104, 30);
    text(def.sponsor, 120, 96, 22, def.accent2);
    text('64', 420, 100, 16, def.accent, false);
  } else if (def.body === 'coupe') {
    ctx.fillStyle = def.accent;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(40 + i * 46, 176); ctx.lineTo(130 + i * 46, 70); ctx.lineTo(152 + i * 46, 70); ctx.lineTo(62 + i * 46, 176);
      ctx.fill();
    }
    ctx.fillStyle = def.accent2;
    for (const [x, y, r] of [[300, 150, 10], [326, 132, 6], [350, 156, 8], [380, 140, 5], [60, 110, 6]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    text(def.sponsor, 300, 104, 30, def.accent2);
    roundel(452, 108, 20, '#111', def.accent2);
  } else {
    ctx.fillStyle = def.accent;
    ctx.fillRect(0, 128, SHEET, 48);
    // a chequered band
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = i % 2 ? def.accent : '#ffffff';
      ctx.fillRect(i * 16, 112, 16, 8);
      ctx.fillStyle = i % 2 ? '#ffffff' : def.accent;
      ctx.fillRect(i * 16, 120, 16, 8);
    }
    roundel(150, 80, 24, '#111', '#fff');
    text(def.sponsor, 330, 150, 24, def.accent2);
    ctx.fillStyle = def.accent2;
    ctx.beginPath(); ctx.arc(330, 80, 18, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // --- from above, nose to the right ---
  ctx.save();
  ctx.beginPath(); ctx.rect(0, TOP_Y, SHEET, TOP_H); ctx.clip();
  ctx.fillStyle = def.paint;
  ctx.fillRect(0, TOP_Y, SHEET, TOP_H);
  const mid = TOP_Y + TOP_H / 2;
  if (def.body === 'racer') {
    ctx.fillStyle = def.accent;
    ctx.fillRect(0, mid - 34, SHEET, 22);
    ctx.fillStyle = def.accent2;
    ctx.fillRect(0, mid + 12, SHEET, 22);
    roundel(420, mid, 34);
    text(def.sponsor, 70, mid, 18, def.accent2, false);
  } else if (def.body === 'coupe') {
    ctx.fillStyle = '#1d1d1f';
    ctx.fillRect(340, mid - 62, 160, 124);
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(343, mid - 59, 154, 118);
    ctx.fillStyle = def.accent;
    ctx.fillRect(120, mid - 14, 200, 28);
    roundel(60, mid, 26, '#111', def.accent2);
  } else {
    ctx.fillStyle = def.accent2;
    ctx.fillRect(0, mid - 40, SHEET, 14);
    ctx.fillRect(0, mid + 26, SHEET, 14);
    roundel(250, mid, 30);
  }
  ctx.restore();

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}

function wheelTexture(): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  ctx.fillStyle = '#c9ccd2';
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#141416';
  for (let i = 0; i < 5; i++) {
    // the gaps between five spokes
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a + 0.2) * 12, Math.sin(a + 0.2) * 12);
    ctx.arc(0, 0, 34, a + 0.2, a + 1.05);
    ctx.lineTo(Math.cos(a + 1.05) * 12, Math.sin(a + 1.05) * 12);
    ctx.fill();
  }
  ctx.fillStyle = '#8a8d93';
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8eaee';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 41, 0, Math.PI * 2); ctx.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Hero {
  def: HeroDef;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  mat: THREE.MeshToonMaterial;
  wheelR: number;
  /** Where the hero is now, for anything that wants to look at it. */
  pos: THREE.Vector3;
}

// ---------------------------------------------------------------------------
// Soft things on the road: shadows, headlight pools and spray
// ---------------------------------------------------------------------------

function radialTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}

// ---------------------------------------------------------------------------
// The system
// ---------------------------------------------------------------------------

interface Veh {
  path: Path | null;
  s: number; v: number; vmax: number;
  len: number; wid: number; wb: number;
  type: number; inst: number; // traffic: which batch and which slot in it
  hero: Hero | null;
  heading: number; turntable: boolean; lit: boolean;
  fx: number; // slot among the moving vehicles, or -1
  shadow: number;
  phase: number;
  pos: THREE.Vector3;
}

export interface Vehicles {
  group: THREE.Group;
  heroes: Hero[];
  moving: number;
  parked: number;
  update(dt: number, time: number, night: number, wet: number): void;
}

const KIND_TYPES: Record<LoopKind, number[]> = {
  // indices into trafficTypes(): sedan, hatch, van, pickup, bus
  street: [0, 0, 1, 1, 2, 3],
  boulevard: [0, 0, 1, 2, 3, 4],
  perimeter: [0, 1, 1, 2, 3, 4],
  express: [0, 0, 1, 2, 3],
  carpark: [0, 1, 1],
};

export function buildVehicles(): Vehicles {
  const group = new THREE.Group();
  const rand = rng(8675309);
  const types = trafficTypes();
  const wheelMat = makePropMaterial({ vertexColors: false, map: wheelTexture() });

  const makeHero = (def: HeroDef): { hero: Hero; hg: HeroGeo } => {
    const hg = heroGeometry(def.body);
    const tex = heroTexture(def);
    const mat = makeHeroMaterial(tex);
    mat.emissiveMap = tex;
    mat.emissive.set(0xffffff);
    mat.emissiveIntensity = 0;
    const g = new THREE.Group();
    const body = new THREE.Mesh(hg.geo, mat);
    body.receiveShadow = true;
    g.add(body);
    const wheels: THREE.Mesh[] = [];
    const wg = new THREE.CylinderGeometry(hg.wheelR, hg.wheelR, 0.95, 16).rotateX(Math.PI / 2);
    const wuv = wg.getAttribute('uv');
    for (let i = 0; i < 34; i++) wuv.setXY(i, 0.03, 0.03); // the tread stays plain rubber
    for (const x of hg.wheelX) {
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(wg, wheelMat);
        w.position.set(x, hg.wheelR, side * hg.wheelZ);
        g.add(w);
        wheels.push(w);
      }
    }
    g.matrixAutoUpdate = false;
    group.add(g);
    return { hero: { def, group: g, wheels, mat, wheelR: hg.wheelR, pos: new THREE.Vector3() }, hg };
  };

  // --- who drives where ---
  const vehs: Veh[] = [];
  const loops: { path: Path; list: Veh[] }[] = [];
  const heroes: Hero[] = [];
  let movingCount = 0;

  const blank = (): Veh => ({
    path: null, s: 0, v: 0, vmax: 0, len: 7, wid: 3, wb: 4.4, type: -1, inst: -1, hero: null,
    heading: 0, turntable: false, lit: false, fx: -1, shadow: -1, phase: rand() * 10, pos: new THREE.Vector3(),
  });

  for (const def of LOOPS) {
    const path = buildPath(def.segs, true);
    const list: Veh[] = [];
    const n = def.count + (def.hero !== undefined ? 1 : 0);
    const heroSlot = def.hero !== undefined ? Math.floor(n / 2) : -1;
    for (let i = 0; i < n; i++) {
      const v = blank();
      v.path = path;
      v.s = ((i + 0.15 + rand() * 0.5) / n) * path.length;
      v.vmax = def.speed * (0.86 + rand() * 0.3);
      v.v = v.vmax * 0.8;
      if (i === heroSlot) {
        const { hero, hg } = makeHero(HEROES[def.hero!]);
        v.hero = hero;
        v.len = hg.len; v.wid = hg.wid; v.wb = hg.wb;
        heroes.push(hero);
      } else {
        const pool = KIND_TYPES[def.kind];
        v.type = pool[Math.floor(rand() * pool.length)];
        const t = types[v.type];
        v.len = t.len; v.wid = t.wid; v.wb = t.wb;
      }
      v.fx = movingCount++;
      list.push(v);
      vehs.push(v);
    }
    loops.push({ path, list });
  }

  let parkedCount = 0;
  for (const spot of PARKED) {
    const v = blank();
    v.pos.set(spot.x, spot.y, spot.z);
    v.heading = spot.heading;
    v.turntable = spot.turntable === true;
    v.lit = spot.lit === true;
    if (spot.hero !== undefined) {
      const { hero, hg } = makeHero(HEROES[spot.hero]);
      v.hero = hero;
      v.len = hg.len; v.wid = hg.wid; v.wb = hg.wb;
      heroes.push(hero);
    } else {
      v.type = rand() < 0.55 ? 0 : rand() < 0.75 ? 1 : rand() < 0.5 ? 2 : 3;
      const t = types[v.type];
      v.len = t.len; v.wid = t.wid; v.wb = t.wb;
    }
    parkedCount++;
    vehs.push(v);
  }

  // --- batches of traffic, one per type ---
  const vehicleMat = makeVehicleMaterial();
  const counts = types.map(() => 0);
  for (const v of vehs) if (v.type >= 0) v.inst = counts[v.type]++;
  const batches = types.map((t, i) => {
    const n = Math.max(1, counts[i]);
    const lit = new Float32Array(n);
    for (const v of vehs) if (v.type === i && v.lit) lit[v.inst] = 1;
    t.geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 1));
    const mesh = new THREE.InstancedMesh(t.geo, vehicleMat, n);
    mesh.count = counts[i];
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  });
  const col = new THREE.Color();
  for (const v of vehs) {
    if (v.type < 0) continue;
    const palette = types[v.type].colors;
    batches[v.type].setColorAt(v.inst, col.set(palette[Math.floor(rand() * palette.length)]));
  }

  // --- shadows under everything, headlight pools and spray for whatever moves ---
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowTex = radialTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 6, 32, 32, 31);
    g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#bbb'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  });
  const poolTex = radialTexture(128, 64, (ctx) => {
    ctx.setTransform(1, 0, 0, 0.5, 0, 16);
    const g = ctx.createRadialGradient(10, 32, 0, 10, 32, 116);
    g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#999'); g.addColorStop(0.6, '#333'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, -32, 128, 128);
  });
  const sprayTex = radialTexture(64, 64, (ctx) => {
    for (const [x, y, r, a] of [[46, 32, 16, 0.9], [30, 24, 13, 0.6], [30, 41, 13, 0.6], [14, 32, 12, 0.35]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }
  });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x05060a, alphaMap: shadowTex, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const sprayMat = new THREE.MeshBasicMaterial({ color: 0xc8d6ff, alphaMap: sprayTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

  vehs.forEach((v, i) => (v.shadow = i));
  const shadows = new THREE.InstancedMesh(flat, shadowMat, vehs.length);
  const pools = new THREE.InstancedMesh(flat, poolMat, Math.max(1, movingCount));
  const sprays = new THREE.InstancedMesh(flat, sprayMat, Math.max(1, movingCount));
  for (const m of [shadows, pools, sprays]) {
    m.frustumCulled = false;
    m.layers.set(1); // kept out of the mirror image used for wet streets
    m.renderOrder = 2;
    group.add(m);
  }

  // --- placing things ---
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), pos = new THREE.Vector3();
  const sx = new THREE.Vector3(), sz = new THREE.Vector3(), p2 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  const place = (v: Veh, time: number, moving: boolean): void => {
    right.crossVectors(fwd, WORLD_UP).normalize();
    up.crossVectors(right, fwd).normalize();
    m4.makeBasis(fwd, up, right).setPosition(pos);
    if (v.hero) {
      v.hero.group.matrix.copy(m4);
      v.hero.group.matrixWorldNeedsUpdate = true;
      v.hero.pos.copy(pos);
    } else {
      batches[v.type].setMatrixAt(v.inst, m4);
    }
    // the soft shadow underneath
    sx.copy(fwd).multiplyScalar(v.len + 1.3);
    sz.copy(right).multiplyScalar(v.wid + 1.1);
    p2.copy(pos).addScaledVector(up, 0.07);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    shadows.setMatrixAt(v.shadow, m4);
    if (!moving || v.fx < 0) return;
    // the pool of light ahead
    sx.copy(fwd).multiplyScalar(11);
    sz.copy(right).multiplyScalar(v.wid + 3.6);
    p2.copy(pos).addScaledVector(fwd, v.len / 2 + 5.0).addScaledVector(up, 0.09);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    pools.setMatrixAt(v.fx, m4);
    // the spray behind, longer the faster it goes
    const k = Math.min(1, v.v / 14);
    const l = (2.6 + 2.8 * k) * (0.85 + 0.15 * Math.sin(time * 9 + v.phase)) * (k > 0.25 ? 1 : 0);
    sx.copy(fwd).multiplyScalar(l);
    sz.copy(right).multiplyScalar((v.wid + 0.9) * (l > 0 ? 1 : 0));
    p2.copy(pos).addScaledVector(fwd, -(v.len / 2 + l / 2 - 0.4)).addScaledVector(up, 0.11);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    sprays.setMatrixAt(v.fx, m4);
  };

  const placeParked = (v: Veh, time: number): void => {
    fwd.set(Math.cos(v.heading), 0, Math.sin(v.heading));
    pos.copy(v.pos);
    place(v, time, false);
  };
  for (const v of vehs) if (!v.path) placeParked(v, 0);

  const update = (dt: number, time: number, night: number, wet: number): void => {
    for (const { path, list } of loops) {
      const n = list.length, L = path.length;
      for (let i = 0; i < n; i++) {
        const v = list[i], lead = list[(i + 1) % n];
        let gap = lead.s - v.s;
        if (gap <= 0) gap += L;
        gap -= (lead.len + v.len) / 2;
        // slow for bends, and for whoever is ahead
        const r = Math.min(path.radiusAt(v.s + v.len * 0.5), path.radiusAt(v.s + v.len * 0.5 + v.v * 0.5));
        let target = Math.min(v.vmax, Math.max(5.5, r * 2.2));
        const safe = 2.4 + v.v * 0.55;
        if (n > 1 && gap < safe) target = Math.min(target, Math.max(0, lead.v * (gap / safe) - 0.4));
        if (n > 1 && gap < 0.9) target = 0;
        if (target > v.v) v.v = Math.min(target, v.v + 9 * dt);
        else v.v = Math.max(target, v.v - 24 * dt);
        v.s = (v.s + v.v * dt) % L;

        path.at(v.s + v.wb / 2, A);
        path.at(v.s - v.wb / 2, B);
        pos.addVectors(A, B).multiplyScalar(0.5);
        fwd.subVectors(A, B).normalize();
        v.pos.copy(pos);
        place(v, time, true);
        if (v.hero) for (const w of v.hero.wheels) w.rotation.z -= (v.v * dt) / v.hero.wheelR;
      }
    }
    for (const v of vehs) {
      if (!v.turntable) continue;
      v.heading += TURNTABLE_RATE * dt;
      placeParked(v, time);
    }
    for (const b of batches) b.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
    pools.instanceMatrix.needsUpdate = true;
    sprays.instanceMatrix.needsUpdate = true;

    shadowMat.opacity = 0.42 - 0.2 * night;
    poolMat.opacity = Math.max(0, night - 0.15) * 0.75;
    pools.visible = poolMat.opacity > 0.01;
    sprayMat.opacity = wet * 0.2;
    sprays.visible = sprayMat.opacity > 0.01;
    for (const v of vehs) if (v.hero) v.hero.mat.emissiveIntensity = v.lit ? 0.55 * night : 0;
  };

  update(0, 0, 0, 0);
  return { group, heroes, moving: movingCount, parked: parkedCount, update };
}
