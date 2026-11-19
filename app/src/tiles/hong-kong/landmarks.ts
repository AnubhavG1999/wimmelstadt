// Toy versions of Hong Kong's buildings and monuments. Each is a few dozen
// boxes, prisms and bars: enough for the silhouette. Each stands on a lot from
// plan.ts, and is built by its own function here.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { FUNICULAR, HILL, groundAt, type Lot } from './plan';
import { beacon, centre, chamfered, drum, face3, gable, prism, railing, shell, slab, slope3, type XZ } from './shapes';

type Model = (k: Build, l: Lot) => void;

const ROOF = 0x8d9299;

// ---------------------------------------------------------------------------
// Central
// ---------------------------------------------------------------------------

/**
 * The Bank of China Tower: a square shaft cut along both diagonals into four,
 * each ending at a height of its own under a roof that slopes up to the middle,
 * with white braces crossing every face and two masts on top.
 */
const bankOfChina: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), H = l.h;
  const a = centre(l).half - 0.9, base = 4.2, rise = a * 1.15;
  const GLASS = 0x7d9bb3, EDGE = 0xeef2f4, GRANITE = 0x8e9196;
  const win: WinSpec = { cell: 1.45, storey: 3.1, lit: 0.42, kind: 1 }, lit = { win: interior(1.2) };
  b.box(l.x0 + 0.3, 0, l.z0 + 0.3, l.x1 - 0.3, base, l.z1 - 0.3, GRANITE, { win: { cell: 2.3, storey: base, lit: 0.6, kind: 2 }, seed: 0.3, top: 0x9d988f });
  // its corners, from the north-west round by the east, and the face each of the four shafts shows: north, east, south, west
  const corner: XZ[] = [[cx - a, cz - a], [cx + a, cz - a], [cx + a, cz + a], [cx - a, cz + a]];
  const out: XZ[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  // the shafts towards the view, south and east, stop lowest, and the west one carries the masts
  const tops = [0.8, 0.6, 0.42, 1].map((f) => base + (H - rise - base) * f);
  const at = (p: XZ, y: number, n: XZ = [0, 0], d = 0): V3 => [p[0] + n[0] * d, y, p[1] + n[1] * d];
  /** A wall along a diagonal, from the middle out to a corner, facing away from `inside`. */
  const diagonal = (p: XZ, inside: XZ, y0: number, y1: number, peak: number): void => {
    const dx = p[0] - cx, dz = p[1] - cz, len = Math.hypot(dx, dz);
    let nx = dz / len, nz = -dx / len;
    if (nx * (inside[0] - cx) + nz * (inside[1] - cz) > 0) { nx = -nx; nz = -nz; }
    if (y1 > y0) b.quad([cx, y0, cz], at(p, y0), at(p, y1), [cx, y1, cz], [nx, 0, nz], GLASS, { win, seed: 0.5, L: len });
    face3(b, at(p, y1), [cx, y1, cz], [cx, peak, cz], [nx, 0, nz], GLASS);
  };
  for (let i = 0; i < 4; i++) {
    const p = corner[i], q = corner[(i + 1) % 4], n = out[i], top = tops[i], peak = top + rise;
    const mid: XZ = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    b.quad(at(p, base), at(q, base), at(q, top), at(p, top), [n[0], 0, n[1]], GLASS, { win, seed: 0.1 + i * 0.2, L: a * 2 });
    // its two inner walls show only above the shaft beside it
    diagonal(p, mid, Math.max(base, tops[(i + 3) % 4]), top, peak);
    diagonal(q, mid, Math.max(base, tops[(i + 1) % 4]), top, peak);
    slope3(b, at(p, top), at(q, top), [cx, peak, cz], 0x8fabc1, { win: interior(0.3) });
    // the braces: a cross in every square of the face, a band at the foot of the roof, and its two sloping edges
    const u = a * 2;
    for (let y = base; y + u * 0.55 <= top; y += u) {
      const y1 = Math.min(top, y + u);
      b.beam(at(p, y, n, 0.12), at(q, y1, n, 0.12), 0.2, 0.2, EDGE, lit);
      b.beam(at(q, y, n, 0.12), at(p, y1, n, 0.12), 0.2, 0.2, EDGE, lit);
    }
    b.beam(at(p, top, n, 0.1), at(q, top, n, 0.1), 0.2, 0.2, EDGE, lit);
    b.beam(at(p, top), [cx, peak, cz], 0.2, 0.16, EDGE, lit);
    b.beam(at(q, top), [cx, peak, cz], 0.2, 0.16, EDGE, lit);
    // and each corner, as high as the taller of the two shafts that meet there
    b.beam(at(p, base), at(p, Math.max(top, tops[(i + 3) % 4])), 0.24, 0.24, EDGE, lit);
  }
  for (const dx of [-0.9, 0.9]) {
    b.cyl(cx + dx, cz, H - 1.5, H + 15, 0.3, 0.08, 6, 0xe9e9ec, { cap: false });
    beacon(k, cx + dx, H + 15.4, cz, 0.5);
  }
  k.lights.push({ x: cx + a + 4, z: cz, r: 12, color: '#e6f0ff', k: 0.5 });
};

/** A lion in bronze on a plinth, facing east. */
function lion(k: Build, x: number, z: number): void {
  const b = k.b, BRONZE = 0x8a6a3c, STONE = 0xb9b2a2;
  b.box(x - 1.1, 0.1, z - 0.6, x + 1.1, 0.75, z + 0.6, STONE);
  b.box(x - 0.9, 0.75, z - 0.42, x + 0.55, 1.4, z + 0.42, BRONZE);
  b.box(x + 0.2, 1.2, z - 0.4, x + 0.95, 2.05, z + 0.4, BRONZE);
  b.box(x + 0.55, 0.75, z - 0.42, x + 1.05, 1.0, z + 0.42, BRONZE);
}

/**
 * The HSBC building: a hall of glass hung from pairs of steel masts, with the
 * ground under it left open for people to walk through. Its front, with the
 * two lions, faces the harbour.
 */
const hsbc: Model = (k, l) => {
  const b = k.b, H = l.h;
  const x0 = l.x0 + 1.4, x1 = l.x1 - 2.6, z0 = l.z0 + 0.6, z1 = l.z1 - 0.6, zc = (z0 + z1) / 2;
  const STEEL = 0x8a939c, DARK = 0x4f5861, GLASS = 0xa9bac6;
  const belly = 6.2, core = 1.5;
  const win: WinSpec = { cell: 1.3, storey: 3.0, lit: 0.5, kind: 1 }, lit = { win: interior(0.7) };
  // the plaza under it, lit from above at night
  b.box(l.x0 + 0.3, 0, l.z0 + 0.3, l.x1 - 0.3, 0.1, l.z1 - 0.3, 0xe6e1d6, { faces: 'T', win: interior(0.45) });
  // a core of stairs and lifts at each end, which come down to the ground
  for (const [a, c] of [[z0, z0 + core], [z1 - core, z1]]) {
    b.box(x0 + 1, 0, a, x1 - 1, H * 0.93, c, STEEL, { win: { cell: 1.2, storey: 3, lit: 0.25, kind: 4 }, seed: 0.2, top: DARK });
  }
  // the hall in three bays, the middle one tallest: the front one is towards the harbour
  const depth = (x1 - x0) / 3;
  const bays: [number, number, number][] = [[x1 - depth, x1, H * 0.8], [x0 + depth, x1 - depth, H], [x0, x0 + depth, H * 0.66]];
  bays.forEach(([a, c, h], i) => {
    b.box(a, belly, z0 + core, c, h, z1 - core, GLASS, { win, seed: 0.3 + i * 0.2, top: ROOF });
    b.box(a + 0.6, h, zc - 2.2, c - 0.6, h + 1.4, zc + 2.2, STEEL, { top: DARK });
  });
  // the masts, in two pairs at the front and two at the back, and the hangers on them: at every level two arms that slope down and out from each pair
  const faces: [number, number][] = [[x1 + 0.4, H * 0.8], [x0 - 0.4, H * 0.66]];
  for (const [x, top] of faces) {
    for (const m of [zc - 3.1, zc + 3.1]) {
      for (const dz of [-0.5, 0.5]) b.box(x - 0.3, 0, m + dz - 0.28, x + 0.3, top + 2.4, m + dz + 0.28, STEEL);
      for (let i = 1; i <= 4; i++) {
        const y = belly + ((top - belly) * i) / 4 - 0.5;
        b.beam([x, y, m], [x, y - 2.4, m - 3.0], 0.22, 0.2, DARK, lit);
        b.beam([x, y, m], [x, y - 2.4, m + 3.0], 0.22, 0.2, DARK, lit);
      }
    }
    for (let i = 1; i <= 4; i++) {
      const y = belly + ((top - belly) * i) / 4 - 2.9;
      b.box(x - 0.14, y - 0.22, z0 + core, x + 0.14, y + 0.22, z1 - core, DARK);
    }
  }
  // the two lions, and people in the shade under the hall
  lion(k, l.x1 - 1.3, zc - 2.6);
  lion(k, l.x1 - 1.3, zc + 2.6);
  for (let i = 0; i < 14; i++) k.person(x0 + 1 + k.rand() * (x1 - x0 - 2), z0 + core + 0.8 + k.rand() * (z1 - z0 - 2 * core - 1.6), 0.1);
  beacon(k, (x0 + x1) / 2, H + 1.9, zc, 0.5);
  k.lights.push({ x: (x0 + x1) / 2, z: zc, r: 13, color: '#fff0d6', k: 0.8 });
  k.lights.push({ x: l.x1 + 3, z: zc, r: 11, color: '#e6f0ff', k: 0.5 });
};

/**
 * Two IFC: a pale shaft of pinstriped glass that slims as it rises, and a
 * crown of fins that stand up past the roof like the tines of a claw.
 */
const ifc: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), H = l.h, a = centre(l).half - 0.8;
  const GLASS = 0xb4c7d4, FIN = 0xeef2f4;
  const win: WinSpec = { cell: 0.95, storey: 3.2, lit: 0.45, kind: 6 };
  // the mall at its foot
  b.box(l.x0 + 0.2, 0, l.z0 + 0.2, l.x1 - 0.2, 6, l.z1 - 0.2, 0xcfd3d6, { win: { cell: 2.4, storey: 6, lit: 0.7, kind: 2 }, seed: 0.4, top: 0x9d988f });
  const steps: [number, number][] = [[0.4, 0], [0.64, 0.35], [0.8, 0.7], [0.9, 1.05], [0.95, 1.5]];
  let y = 6;
  steps.forEach(([f, slim], i) => {
    prism(b, chamfered(cx, cz, a - slim, 1.2), y, H * f, GLASS, { win, seed: 0.2 + i * 0.17, top: FIN });
    y = H * f;
  });
  // the crown: three fins on every side and a taller one at every corner, lit at night
  const r = a - 1.5;
  for (const [nx, nz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    for (const t of [-0.6, 0, 0.6]) {
      const x = cx + nx * r - nz * t * r, z = cz + nz * r + nx * t * r;
      b.cyl(x, z, y - 5, H - 1.5 - Math.abs(t) * 1.2, 0.55, 0.16, 4, FIN, { win: interior(1.1), cap: false, phase: Math.PI / 4 });
    }
    const x = cx + (nx - nz) * (r - 0.5), z = cz + (nz + nx) * (r - 0.5);
    b.cyl(x, z, y - 6, H, 0.7, 0.14, 4, FIN, { win: interior(1.1), cap: false, phase: Math.PI / 4 });
  }
  b.box(cx - r + 1, y, cz - r + 1, cx + r - 1, y + 1.6, cz + r - 1, 0xd8dfe4, { win: interior(0.8), top: ROOF });
  beacon(k, cx, H + 0.4, cz, 0.5, '#fff1c9');
  k.lights.push({ x: cx + a + 3, z: cz, r: 12, color: '#e6f0ff', k: 0.5 });
};

/**
 * Central Plaza: three-sided, with its corners cut off, in gold and silver
 * glass, under a pyramid and a mast. The four lamps on the mast tell the time
 * by their colours, so they change as the minutes pass.
 */
const centralPlaza: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), H = l.h, R = centre(l).half + 1.0;
  const GOLD = 0xd9bf78, SILVER = 0xc4cdd3, CAP = 0xe2c56a;
  const win: WinSpec = { cell: 1.3, storey: 3.2, lit: 0.45, kind: 1 };
  /** A triangle with one flat side to the east and its corners cut off: `R` is how far its points would reach. */
  const plan = (r: number, cut: number): XZ[] => {
    const tip = (i: number): XZ => [cx + Math.cos(Math.PI + (i * 2 * Math.PI) / 3) * r, cz + Math.sin(Math.PI + (i * 2 * Math.PI) / 3) * r];
    const pts: XZ[] = [];
    for (let i = 0; i < 3; i++) {
      const v = tip(i), before = tip((i + 2) % 3), after = tip((i + 1) % 3);
      pts.push([v[0] + (before[0] - v[0]) * cut, v[1] + (before[1] - v[1]) * cut], [v[0] + (after[0] - v[0]) * cut, v[1] + (after[1] - v[1]) * cut]);
    }
    return pts;
  };
  b.box(l.x0 + 0.3, 0, l.z0 + 0.3, l.x1 - 0.3, 5.5, l.z1 - 0.3, 0xd6d0c2, { win: { cell: 2.4, storey: 5.5, lit: 0.7, kind: 2 }, seed: 0.7, top: 0x9d988f });
  const yA = H * 0.72, yB = H * 0.79, yC = H * 0.88;
  // the shaft in bands of gold and silver, then two lengths that step in, then the pyramid
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    prism(b, plan(R, 0.16), 5.5 + ((yA - 5.5) * i) / bands, 5.5 + ((yA - 5.5) * (i + 1)) / bands, i % 2 ? SILVER : GOLD, { win, seed: 0.1 + i * 0.3, top: i === bands - 1 ? ROOF : false });
  }
  prism(b, plan(R * 0.84, 0.18), yA, yB, SILVER, { win, seed: 0.6, top: ROOF });
  b.cyl(cx, cz, yB, yC, R * 0.62, 0.5, 3, CAP, { phase: Math.PI, win: interior(0.9), cap: false });
  b.cyl(cx, cz, yC, H + 9, 0.34, 0.1, 6, 0xe9e9ec, { cap: false });
  beacon(k, cx, H + 9.4, cz, 0.5);
  for (const [dx, dz] of [[R * 0.3, 0], [-R * 0.2, R * 0.3], [-R * 0.2, -R * 0.3]]) k.glows.push({ x: cx + dx, y: yB + 0.3, z: cz + dz, sx: 1.6, sy: 0.25, sz: 1.6, color: '#ffe9a8' });
  // the four lamps on the mast
  const colours = ['#ff4a4a', '#ffffff', '#c77dff', '#ffd23f', '#ff7ab8', '#5dff8a'].map((c) => new THREE.Color(c));
  const lampsOnMast = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.9), new THREE.MeshBasicMaterial({ toneMapped: false }));
    m.position.set(cx, yC + 1.6 + i * 2.5, cz);
    k.group.add(m);
    return m.material;
  });
  k.each((_dt, time, night) => {
    // each lamp holds one colour for a few seconds, and the four change one after another
    lampsOnMast.forEach((mat, i) => mat.color.copy(colours[Math.floor(time / 6 + i * 0.25) % colours.length]).multiplyScalar(0.5 + 2.6 * night));
  });
  k.lights.push({ x: cx + R, z: cz, r: 12, color: '#ffe9c4', k: 0.5 });
};

/**
 * Jardine House: a plain square shaft clad in pale metal, with a small window
 * in every panel, where the real one has a round one.
 */
const jardine: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), H = l.h;
  b.box(l.x0, 0, l.z0, l.x1, 5, l.z1, 0x9aa1a8, { win: { cell: 2, storey: 5, lit: 0.7, kind: 2 }, seed: 0.2, top: ROOF });
  b.box(l.x0 + 0.5, 5, l.z0 + 0.5, l.x1 - 0.5, H, l.z1 - 0.5, 0xd3d8dc, { win: { cell: 1.4, storey: 2.6, lit: 0.5, kind: 4 }, seed: 0.6, top: ROOF });
  b.box(l.x0 + 1.7, H, l.z0 + 1.7, l.x1 - 1.7, H + 2.2, l.z1 - 1.7, 0xaeb4ba, { top: ROOF });
  beacon(k, cx, H + 2.6, cz, 0.5);
  k.lights.push({ x: cx, z: l.z1 + 3, r: 10, color: '#e6f0ff', k: 0.45 });
};

/**
 * The Observation Wheel on Central's waterfront. Its rim, its spokes and its
 * cabins are a mesh of their own, which turns; each cabin is a drum on the
 * same axle as the wheel, so that it looks the same however far it has turned.
 */
const wheel: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), R = (l.h - 2.6) / 2, hub = R + 2.6;
  const WHITE = 0xf1ede2, STEEL = 0xc4cad0;
  // a leg from each side to each end of the axle, and the stage where people board
  for (const s of [-1, 1]) for (const dz of [-5.4, 5.4]) b.beam([cx + s * 1.9, 0, cz + dz], [cx + s * 1.0, hub, cz], 0.3, 0.24, WHITE);
  b.box(cx - 1.2, hub - 0.45, cz - 0.45, cx + 1.2, hub + 0.45, cz + 0.45, STEEL, { faces: 'NESWTB' });
  b.box(cx - 2.1, 0, cz - 4.2, cx + 2.1, 0.9, cz + 4.2, 0xd9d4c7, { top: 0xb9b2a2 });
  b.box(cx - 2.1, 0.9, cz + 2.6, cx - 0.6, 3.3, cz + 4.2, 0xe9e6df, { win: { cell: 1.5, storey: 2.4, lit: 0.8, kind: 2 }, top: 0x3f6fa3 });
  for (let i = 0; i < 8; i++) k.person(cx + (i % 2 ? 1 : -1) * (1.15 + k.rand() * 0.7), cz - 3.6 + k.rand() * 5.6, 0.9);
  const g = new GeoBuilder(), n = 24;
  const at = (i: number, r: number, dx = 0): V3 => [dx, Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r];
  for (let i = 0; i < n; i++) {
    for (const dx of [-0.5, 0.5]) {
      g.beam(at(i, R, dx), at(i + 1, R, dx), 0.15, 0.15, WHITE, { win: interior(1.5) });
      g.beam(at(i, R * 0.5, dx), at(i + 1, R * 0.5, dx), 0.07, 0.07, STEEL);
      if (i % 2 === 0) g.beam([dx * 1.6, 0, 0], at(i, R, dx), 0.09, 0.07, STEEL);
    }
    g.beam(at(i, R, -0.5), at(i, R, 0.5), 0.08, 0.08, STEEL);
    drum(g, at(i, R + 0.8), 0.62, 0.55, i % 6 === 0 ? 0xc8322b : 0xe6edf2, { win: interior(i % 6 === 0 ? 0.5 : 1.0), cap: 0x9fb4c2 });
  }
  drum(g, [0, 0, 0], 1.05, 0.9, WHITE);
  const mesh = new THREE.Mesh(g.build(), k.mat.city());
  mesh.position.set(cx, hub, cz);
  mesh.castShadow = true;
  k.group.add(mesh);
  k.each((dt) => { mesh.rotation.x += dt * 0.06; });
  k.lights.push({ x: cx + 3, z: cz, r: 15, color: '#dff1ff', k: 0.6 });
};

/**
 * Central's ferry piers: three fingers of deck on piles. The one nearest the
 * view is the Star Ferry's, green and white under a clock tower, and the
 * ferries nose in at its south side.
 */
const piers: Model = (k, l) => {
  const b = k.b, WHITE = 0xf2efe6, GREEN = 0x2f7a55, DECK = 0xb9b2a2, PILE = 0x7b7468;
  const x0 = l.x0 - 0.7, x1 = l.x1;
  const deck = (z0: number, z1: number): void => {
    b.box(x0, -0.35, z0, x1, 0.2, z1, 0xa9a59a, { top: DECK });
    for (let x = x0 + 1.4; x < x1; x += 2.8) for (const z of [z0 + 0.4, z1 - 0.4]) b.box(x - 0.22, -2.3, z - 0.22, x + 0.22, -0.35, z + 0.22, PILE, { faces: 'NESW' });
  };
  // two plain piers: a long shed with a deck of seats above, under a roof like a wave
  for (const z0 of [l.z0 + 0.4, l.z0 + 5.9]) {
    const z1 = z0 + 3.3, zc = (z0 + z1) / 2;
    deck(z0 - 0.3, z1 + 0.3);
    b.box(x0 + 1.2, 0.2, z0, x1 - 1.4, 2.6, z1, 0xdfe4e6, { win: { cell: 1.6, storey: 2.4, lit: 0.75, kind: 2 }, seed: z0 * 0.1, top: DECK });
    b.box(x0 + 1.2, 2.6, z0 + 0.15, x1 - 1.4, 4.2, z1 - 0.15, 0xbfd3df, { win: interior(0.9), faces: 'NESW' });
    shell(b, 'x', x0 + 0.8, x1 - 1.0, [[z0 - 0.4, 4.1], [zc - 0.6, 4.9], [zc + 0.6, 4.9], [z1 + 0.4, 4.1]], 0.22, 0x8fb0c4, { under: 0xe9e6df });
    k.lights.push({ x: x1 - 1, z: zc, r: 8, color: '#fff0d6', k: 0.5 });
  }
  // the Star Ferry's pier
  const z0 = l.z1 - 5.4, z1 = l.z1 - 0.6, zc = (z0 + z1) / 2, a = x0 + 0.9, c = x1 - 0.6;
  deck(z0 - 0.4, l.z1);
  b.box(a, 0.2, z0, c, 1.0, z1, GREEN, { faces: 'NESW' });
  b.box(a, 1.0, z0, c, 3.4, z1, WHITE, { win: { cell: 1.5, storey: 2.4, lit: 0.85, kind: 2 }, seed: 0.3, faces: 'NESW' });
  b.box(a - 0.15, 3.4, z0 - 0.15, c + 0.15, 3.8, z1 + 0.15, GREEN);
  b.box(a, 3.8, z0, c, 6.0, z1, WHITE, { win: { cell: 1.2, storey: 2.2, lit: 0.6, kind: 4 }, seed: 0.7, faces: 'NESW' });
  gable(b, a, z0, c, z1, 6.0, 1.5, GREEN, WHITE, 'x');
  // its clock tower, through the roof, with a face on each side
  const tx = (a + c) / 2, T = 1.05;
  b.box(tx - T, 6.0, zc - T, tx + T, 11.2, zc + T, WHITE);
  b.box(tx - T - 0.15, 11.2, zc - T - 0.15, tx + T + 0.15, 11.6, zc + T + 0.15, GREEN);
  b.cyl(tx, zc, 11.6, 13.4, T * 1.25, 0.08, 4, GREEN, { cap: false, phase: Math.PI / 4 });
  b.cyl(tx, zc, 13.4, 15.2, 0.07, 0.04, 4, 0xe9e9ec, { cap: false });
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) k.sign('clock', tx + nx * (T + 0.06), 9.9, zc + nz * (T + 0.06), nx, nz, 1.6);
  k.sign('star-ferry', tx, 4.9, z1 + 0.08, 0, 1, 1.5, c - a - 1);
  k.sign('star-ferry', a - 0.08, 4.9, zc, -1, 0, 1.5, z1 - z0 - 0.6);
  k.lights.push({ x: tx, z: l.z1 + 1.5, r: 11, color: '#fff0d6', k: 0.7 });
  k.lights.push({ x: x0 - 2, z: zc, r: 9, color: '#fff0d6', k: 0.5 });
};

/**
 * The Convention and Exhibition Centre's new wing, on its point in the
 * harbour: walls of glass under a roof of pale metal that sweeps up to the
 * middle like the wings of a bird.
 */
const conventionCentre: Model = (k, l) => {
  const b = k.b, GLASS = 0x7fb2cc, METAL = 0xe9ecee, UNDER = 0xb8bec4;
  const zc = (l.z0 + l.z1) / 2, x0 = l.x0 - 0.8, x1 = l.x1 + 1.4, half = 6;
  const wall: WinSpec = { cell: 1.5, storey: 4.4, lit: 0.9, kind: 1 }, lit = { win: interior(0.9) };
  b.box(l.x0, 0, zc - half, l.x1, 8.8, zc + half, GLASS, { win: wall, seed: 0.3, top: UNDER });
  b.box(l.x0 + 0.3, 8.8, zc - 4.4, l.x1 - 0.3, 12.05, zc + 4.4, GLASS, { win: wall, seed: 0.5, top: UNDER });
  // the vault down the middle, and glass under each of its ends
  const vault: [number, number][] = [[zc - 5.4, 10.9], [zc - 3.4, 13.9], [zc - 1.2, 15.2], [zc + 1.2, 15.2], [zc + 3.4, 13.9], [zc + 5.4, 10.9]];
  shell(b, 'x', x0, x1, vault, 0.35, METAL, { under: UNDER });
  const ends: [number, number][] = [[zc - 4.4, 12.05], [zc - 3.4, 13.55], [zc - 1.2, 14.85], [zc + 1.2, 14.85], [zc + 3.4, 13.55], [zc + 4.4, 12.05]];
  for (const [x, n] of [[l.x1 - 0.3, 1], [l.x0 + 0.3, -1]]) {
    for (let i = 1; i < ends.length - 2; i++) {
      const [za, ya] = ends[i], [zb, yb] = ends[i + 1];
      b.quad([x, 12.05, za], [x, 12.05, zb], [x, yb, zb], [x, ya, za], [n, 0, 0], GLASS, lit);
    }
    for (const [za, zb, zt] of [[ends[0][0], ends[1][0], ends[1][0]], [ends[4][0], ends[5][0], ends[4][0]]]) face3(b, [x, 12.05, za], [x, 12.05, zb], [x, 13.55, zt], [n, 0, 0], GLASS, lit);
  }
  // a wing on each side, in two feathers, the outer one lower and longer, and each with its tip turned up
  for (const s of [-1, 1]) {
    shell(b, 'x', x0 + 0.5, x1 - 0.5, [[zc + s * 4.8, 10.3], [zc + s * 6.4, 9.6], [zc + s * 7.9, 8.4], [zc + s * 8.5, 8.7]], 0.3, METAL, { under: UNDER });
    shell(b, 'x', x0 + 1.4, x1 + 0.9, [[zc + s * 6.05, 8.2], [zc + s * 7.3, 7.6], [zc + s * 8.0, 6.7], [zc + s * 8.5, 6.95]], 0.3, 0xd6dbdf, { under: UNDER });
  }
  // a terrace along the water, and the light the hall throws on it
  for (let i = 0; i < 10; i++) k.person(l.x1 + 0.4 + k.rand() * 0.8, zc - half + 1 + k.rand() * (2 * half - 2));
  k.lights.push({ x: l.x1 + 2, z: zc, r: 14, color: '#dff1ff', k: 0.8 });
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: zc + half + 3, r: 12, color: '#dff1ff', k: 0.6 });
};

/** The Convention Centre's old wing, across the road: a hall of glass, with two hotels standing on it. */
const conventionOld: Model = (k, l) => {
  const b = k.b;
  b.box(l.x0, 0, l.z0, l.x1, 9, l.z1, 0xa9c4d2, { win: { cell: 1.6, storey: 4.5, lit: 0.8, kind: 1 }, seed: 0.2, top: 0x9d988f });
  b.box(l.x0 + 0.8, 9, l.z0 + 0.6, l.x1 - 3.4, 26, l.z0 + 5.2, 0xdccdb4, { win: { cell: 1.5, storey: 2.8, lit: 0.5, kind: 0 }, seed: 0.4, top: ROOF });
  b.box(l.x0 + 0.8, 9, l.z1 - 5.2, l.x1 - 3.4, 22, l.z1 - 0.6, 0xcfd6da, { win: { cell: 1.5, storey: 2.8, lit: 0.5, kind: 0 }, seed: 0.8, top: ROOF });
  k.lights.push({ x: l.x1 + 2.5, z: (l.z0 + l.z1) / 2, r: 11, color: '#dff1ff', k: 0.6 });
};

/**
 * The Blue House: a tong lau of four storeys, painted blue all over, with a
 * balcony the width of its front on every floor. The yellow house is beside it.
 */
const blueHouse: Model = (k, l) => {
  const b = k.b, WHITE = 0xf2efe6, front = l.x1, wall = front - 1.3;
  const house = (z0: number, z1: number, storeys: number, paint: number, seed: number): void => {
    const sh = 4.4, h = storeys * sh;
    b.box(l.x0, 0, z0, wall, h, z1, paint, { win: { cell: 1.7, storey: sh, lit: 0.55, kind: 4 }, seed, top: 0x8d8a83 });
    b.box(wall, 0, z0, wall + 0.05, sh, z1, paint, { win: { cell: 2.1, storey: sh, lit: 0.8, kind: 2 }, seed, faces: 'E' });
    for (let f = 1; f < storeys; f++) {
      b.box(wall, f * sh - 0.3, z0, front, f * sh, z1, WHITE, { faces: 'NESWTB' });
      b.box(front - 0.14, f * sh, z0, front, f * sh + 1.05, z1, WHITE, { faces: 'NESWT' });
    }
    // the posts that carry the balconies, from the pavement to the eaves
    const posts = Math.max(2, Math.round((z1 - z0) / 2.6) + 1);
    for (let i = 0; i < posts; i++) {
      const z = z0 + 0.16 + ((z1 - z0 - 0.32) * i) / (posts - 1);
      b.box(front - 0.3, 0, z - 0.16, front, h, z + 0.16, paint, { faces: 'NESW' });
    }
    b.box(l.x0, h, z0, front, h + 0.5, z1, paint, { top: 0x8d8a83 });
    gable(b, l.x0 + 0.4, z0 + 0.3, wall, z1 - 0.3, h + 0.5, 1.3, 0x6b625a, paint, 'z', 0.2);
  };
  house(l.z0, l.z0 + 6.6, 4, 0x3f79c4, 0.2);
  house(l.z0 + 6.6, l.z1, 3, 0xe8b93a, 0.7);
  for (let i = 0; i < 5; i++) k.person(front + 0.5 + k.rand() * 0.6, l.z0 + 0.5 + k.rand() * (l.z1 - l.z0 - 1));
  k.lights.push({ x: front + 2.5, z: (l.z0 + l.z1) / 2, r: 10, color: '#ffe2ae', k: 0.6 });
};

// ---------------------------------------------------------------------------
// The Peak
// ---------------------------------------------------------------------------

/**
 * The Peak Tower: a bowl like a wok, held up on four legs over a block of
 * shops, with a terrace on top to look out from. The Peak Tram comes in under
 * a roof on its north side.
 */
const peakTower: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), y = l.y0 ?? 0, top = y + l.h;
  const STONE = 0xd9d4c7, GLASS = 0x9fc0d2, SHELL = 0xe9e5db;
  b.box(cx - 5.4, y, cz - 5, cx + 5.4, y + 4.6, cz + 5, STONE, { win: { cell: 2.2, storey: 4.6, lit: 0.8, kind: 2 }, seed: 0.3, top: 0xb9b2a2 });
  b.box(cx - 3.8, y + 4.6, cz - 3.4, cx + 3.8, y + 10.2, cz + 3.4, GLASS, { win: { cell: 1.3, storey: 2.8, lit: 0.75, kind: 1 }, seed: 0.6 });
  // the bowl: level on top, and a keel that curves up to a point at each end
  const L = 10.2, W = 4.7, D = 5.3, n = 10;
  const keel = (i: number): [number, number] => {
    const u = -1 + (2 * i) / n;
    return [cx + u * L, top - 0.06 - D * (1 - u * u)];
  };
  for (let i = 0; i < n; i++) {
    const [xa, ya] = keel(i), [xb, yb] = keel(i + 1), len = Math.hypot(xb - xa, yb - ya);
    b.quad([xa, ya, cz - W], [xb, yb, cz - W], [xb, yb, cz + W], [xa, ya, cz + W], [(yb - ya) / len, -(xb - xa) / len, 0], SHELL);
    for (const s of [-1, 1]) {
      const q = { win: { cell: 1.25, storey: 1.9, lit: 0.8, kind: 1 }, L: 2 * L, u0: xa - cx + L, u1: xb - cx + L, seed: 0.4 };
      b.quad([xa, ya, cz + s * W], [xb, yb, cz + s * W], [xb, top, cz + s * W], [xa, top, cz + s * W], [0, 0, s], GLASS, q);
    }
  }
  b.box(cx - L, top, cz - W, cx + L, top + 0.12, cz + W, 0xcfc8b8, { faces: 'T' });
  railing(b, cx - L + 0.6, cz - W, cx + L - 0.6, cz + W, top + 0.12, 0xf2efe6);
  for (let i = 0; i < 12; i++) k.person(cx - L + 2 + k.rand() * (2 * L - 4), cz - W + 0.7 + k.rand() * (2 * W - 1.4), top + 0.12);
  // its four legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(cx + sx * 5 - 0.55, y + 4.6, cz + sz * 3.9 - 0.55, cx + sx * 5 + 0.55, top - D * 0.76, cz + sz * 3.9 + 0.55, STONE, { faces: 'NESW' });
  // the Peak Tram's upper stop
  const F = FUNICULAR, GREEN = 0x1d5a3c;
  b.box(F.x - 2.8, y + 4.5, F.z1 - 8.8, F.x + 2.8, y + 4.9, cz - 5, GREEN, { faces: 'NESWTB', top: 0xdad6ca });
  for (const sx of [-2.5, 2.5]) for (const z of [F.z1 - 8.4, F.z1 - 3.4]) b.box(F.x + sx - 0.18, groundAt(F.x + sx, z) - 0.4, z - 0.18, F.x + sx + 0.18, y + 4.5, z + 0.18, 0xe9e6df, { faces: 'NESW' });
  beacon(k, cx - L + 0.5, top + 1.3, cz, 0.4, '#fff1c9');
  beacon(k, cx + L - 0.5, top + 1.3, cz, 0.4, '#fff1c9');
  k.lights.push({ x: cx, z: cz + 8, r: 14, color: '#fff0d6', k: 0.8 });
  k.lights.push({ x: cx + 8, z: cz, r: 11, color: '#dff1ff', k: 0.5 });
};

/**
 * Man Mo Temple, at the foot of Mid-Levels: two halls side by side, each a
 * front hall and a taller rear hall under roofs of green tile, in grey brick
 * on a footing of granite. Its doors face east, on to a forecourt.
 */
const manMo: Model = (k, l) => {
  const b = k.b, BRICK = 0x8c9196, GRANITE = 0xb5b0a4, TILE = 0x2f7d5b, RIDGE = 0x1f5a48, RED = 0xb3261e, GOLD = 0xd9a93a;
  const hall = (z0: number, z1: number, tall: number): void => {
    const zc = (z0 + z1) / 2, xf = l.x1, xr = l.x0;
    const part = (x0: number, x1: number, h: number, rise: number): void => {
      b.box(x0, 0, z0, x1, 0.8, z1, GRANITE, { faces: 'NESW' });
      b.box(x0, 0.8, z0, x1, h, z1, BRICK, { faces: 'NESW' });
      b.box(x0 - 0.3, h - 0.25, z0 - 0.05, x1 + 0.3, h, z1 + 0.05, RED, { faces: 'NESWB' });
      gable(b, x0, z0, x1, z1, h, rise, TILE, BRICK, 'z', 0.4);
      // the ridge, with its ends turned up and a pearl in the middle
      const xc = (x0 + x1) / 2, top = h + rise;
      b.box(xc - 0.2, top - 0.1, z0 - 0.2, xc + 0.2, top + 0.4, z1 + 0.2, RIDGE);
      for (const z of [z0 - 0.2, z1 - 0.25]) b.box(xc - 0.22, top + 0.4, z, xc + 0.22, top + 0.8, z + 0.45, RIDGE);
      b.box(xc - 0.25, top + 0.4, zc - 0.25, xc + 0.25, top + 0.9, zc + 0.25, GOLD);
    };
    part(xf - 4.0, xf, 3.5 * tall, 1.4);
    part(xr, xr + 5.0, 4.5 * tall, 1.7);
    b.box(xr + 5.0, 0, z0 + 0.3, xf - 4.0, 3.0 * tall, z1 - 0.3, BRICK, { top: 0x6b625a });
    // the doors, red, with a red strip of writing at each side, a lantern over each, and the name above
    b.box(xf, 0, zc - 0.75, xf + 0.07, 2.35, zc + 0.75, RED, { faces: 'NEST' });
    b.box(xf, 0, zc - 0.03, xf + 0.09, 2.35, zc + 0.03, 0x5e1410, { faces: 'NEST' });
    for (const s of [-1, 1]) {
      b.box(xf, 0.5, zc + s * 1.25 - 0.17, xf + 0.06, 2.3, zc + s * 1.25 + 0.17, 0x8f1f18, { faces: 'NEST' });
      k.glows.push({ x: xf + 0.5, y: 2.75, z: zc + s * 0.95, sx: 0.42, sy: 0.5, sz: 0.42, color: '#ff5a36' });
    }
  };
  hall(l.z0 + 0.2, l.z0 + 4.4, 1);
  hall(l.z0 + 4.6, l.z1 - 0.1, 0.88);
  const zm = l.z0 + 2.3;
  k.sign('man-mo', l.x1 + 0.1, 2.84, zm, 1, 0, 0.7, 2.6);
  // the forecourt: paving, the bronze urn where incense burns, and a lion of stone at each side of the way in
  b.box(l.x1, 0, l.z0, l.x1 + 6, 0.14, l.z1, 0xcfc8b8, { top: 0xd6d0c2 });
  const ux = l.x1 + 3.2;
  for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]) b.box(ux + dx - 0.08, 0.14, zm + dz - 0.08, ux + dx + 0.08, 0.6, zm + dz + 0.08, 0x6d5a3a);
  b.cyl(ux, zm, 0.55, 1.25, 0.5, 0.72, 8, 0x8a6a3c, { cap: 0x3a3028 });
  b.box(ux - 0.9, 1.0, zm - 0.07, ux + 0.9, 1.14, zm + 0.07, 0x8a6a3c);
  k.glows.push({ x: ux, y: 1.32, z: zm, sx: 0.5, sy: 0.1, sz: 0.5, color: '#ff8a3a' });
  for (const s of [-1, 1]) {
    b.box(l.x1 + 0.9, 0.14, zm + s * 2.0 - 0.3, l.x1 + 1.6, 0.6, zm + s * 2.0 + 0.3, GRANITE);
    b.box(l.x1 + 0.95, 0.6, zm + s * 2.0 - 0.24, l.x1 + 1.5, 1.25, zm + s * 2.0 + 0.24, 0xc4beb0);
  }
  for (let i = 0; i < 7; i++) k.person(l.x1 + 1 + k.rand() * 4.6, l.z0 + 0.6 + k.rand() * (l.z1 - l.z0 - 1.2), 0.14);
  k.lights.push({ x: l.x1 + 2.5, z: zm, r: 9, color: '#ffb070', k: 0.8 });
};

/** A small pavilion to look out from, as Chinese gardens have: red posts, and a roof of green tile that comes to a point. */
function pavilion(k: Build, x: number, z: number, y: number): void {
  const b = k.b, R = 2.1;
  b.box(x - R - 0.3, y, z - R - 0.3, x + R + 0.3, y + 0.3, z + R + 0.3, 0xcfc8b8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * R - 0.16, y + 0.3, z + sz * R - 0.16, x + sx * R + 0.16, y + 3.3, z + sz * R + 0.16, 0xb3261e, { faces: 'NESW' });
  b.box(x - R - 0.3, y + 3.3, z - R - 0.3, x + R + 0.3, y + 3.6, z + R + 0.3, 0xb3261e, { faces: 'NESWB' });
  b.cyl(x, z, y + 3.6, y + 5.5, (R + 0.9) * Math.SQRT2, 0.2, 4, 0x2f7d5b, { cap: false, phase: Math.PI / 4 });
  b.box(x - 0.2, y + 5.4, z - 0.2, x + 0.2, y + 6.0, z + 0.2, 0xd9a93a);
}

/** The Peak Tram's lower stop, in Sheung Wan: a roof that slopes as the track does, and a ticket hall beside it. */
function peakTramFoot(k: Build): void {
  const b = k.b, F = FUNICULAR, GREEN = 0x1d5a3c, CREAM = 0xf2e6c4;
  const roof = (z: number): number => F.y(z) + 4.3;
  slab(b, [F.x, roof(F.z0 - 1.4), F.z0 - 1.4], [F.x, roof(F.z0 + 10.6), F.z0 + 10.6], 2.9, 0.3, GREEN, { under: CREAM });
  for (const s of [-1, 1]) {
    for (const z of [F.z0 - 1, F.z0 + 4.6, F.z0 + 10.2]) b.box(F.x + s * 2.6 - 0.16, groundAt(F.x + s * 2.6, z) - 0.5, z - 0.16, F.x + s * 2.6 + 0.16, roof(z) - 0.3, z + 0.16, CREAM, { faces: 'NESW' });
  }
  const x0 = F.x + 3.2, x1 = x0 + 5.6, z0 = -112.3, z1 = -106.8;
  b.box(x0, 0, z0, x1, 4.6, z1, CREAM, { win: { cell: 1.8, storey: 4.6, lit: 0.85, kind: 2 }, seed: 0.5, top: 0x8d8a83 });
  b.box(x0 - 0.2, 4.6, z0 - 0.2, x1 + 0.2, 5.3, z1 + 0.2, GREEN, { top: 0x8d8a83 });
  const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  b.box(x0 + 0.3, 5.3, zc - 0.1, x1 - 0.3, 7.5, zc + 0.1, 0x2a2c31);
  k.sign('peak-tram', xc, 6.4, zc + 0.14, 0, 1, 2.0, x1 - x0 - 0.8);
  k.sign('peak-tram', xc, 6.4, zc - 0.14, 0, -1, 2.0, x1 - x0 - 0.8);
  for (let i = 0; i < 6; i++) k.person(x0 - 1.1 + k.rand() * 0.8, z0 + 0.6 + k.rand() * (z1 - z0), 0);
  k.lights.push({ x: xc, z: z1 + 2.5, r: 9, color: '#fff0d6', k: 0.7 });
  k.lights.push({ x: F.x, z: F.z0 + 4, r: 9, color: '#fff0d6', k: 0.6 });
}

/** Where the Mid-Levels Escalator runs: along `x`, in flights from one `z` to the next. */
export const ESCALATOR = { x: -64, z: [-98, -90, -82, -74, -66, -58, -50] };

/**
 * The Mid-Levels Escalator: a covered stair that moves, up the north face of
 * the Peak from Sheung Wan, flight after flight on posts.
 */
function escalator(k: Build): void {
  const b = k.b, x = ESCALATOR.x, W = 1.25, STEEL = 0x9aa3ab;
  const zs = ESCALATOR.z, deck = (z: number): number => groundAt(x, z) + 2.3;
  for (let i = 0; i < zs.length - 1; i++) {
    const z0 = zs[i], z1 = zs[i + 1], y0 = deck(z0), y1 = deck(z1);
    slab(b, [x, y0, z0], [x, y1, z1], W, 0.3, 0x7f868d);
    slab(b, [x, y0 + 3.1, z0], [x, y1 + 3.1, z1], W + 0.3, 0.18, 0xdfe8e4, { under: 0xf2f5f2 });
    for (const s of [-1, 1]) {
      b.beam([x + s * W, y0 + 1.05, z0], [x + s * W, y1 + 1.05, z1], 0.08, 0.08, 0xe9eef0, { win: interior(1.2) });
      b.box(x + s * W - 0.12, groundAt(x + s * W, z0) - 0.5, z0 - 0.12, x + s * W + 0.12, y0 + 3.0, z0 + 0.12, STEEL, { faces: 'NESW' });
    }
    for (const t of [0.25, 0.6, 0.85]) k.person(x - 0.6 + k.rand() * 1.2, z0 + (z1 - z0) * t, y0 + (y1 - y0) * t);
    k.lights.push({ x, z: (z0 + z1) / 2, r: 6, color: '#e8fff4', k: 0.5 });
  }
  const zt = zs[zs.length - 1], yt = deck(zt), zf = zs[0], yf = deck(zf);
  for (const s of [-1, 1]) b.box(x + s * W - 0.12, groundAt(x + s * W, zt) - 0.5, zt - 0.12, x + s * W + 0.12, yt + 3.0, zt + 0.12, STEEL, { faces: 'NESW' });
  // a landing where it reaches the hill at the top, and steps down to the street at the foot
  b.box(x - W, yt - 0.3, zt, x + W, yt, zt + 4, 0x7f868d, { faces: 'NESWTB' });
  slab(b, [x, yf, zf], [x, 0.1, zf - 5.5], W, 0.3, 0xb9b2a2);
}

/** Ground that is kept clear of trees, though it is nobody's lot: [x0, z0, x1, z1]. */
export const OPEN: [number, number, number, number][] = [[-85, -111.5, -78.6, -103], [-73.4, -113, -60.8, -99.4]];

/** What stands on the tile that is not on a lot of its own. */
export function extras(k: Build): void {
  peakTramFoot(k);
  escalator(k);
  // on the summit: a pavilion at the lookout, and a rail along its edge
  pavilion(k, -81, -18.6, HILL.top);
  k.b.box(-87.5, HILL.top + 0.85, -15.5, -64.4, HILL.top + 1.05, -15.36, 0xf2efe6, { faces: 'NESWTB' });
  for (let x = -87.5; x < -64.3; x += 3.3) k.b.box(x, HILL.top, -15.5, x + 0.14, HILL.top + 0.85, -15.36, 0xf2efe6, { faces: 'NESW' });
}


/** The model for each thing that has one, by the id of its lot. A lot without one is a plain box with its name on it. */
export const MODELS: Record<string, Model> = {
  'bank-of-china': bankOfChina,
  hsbc,
  ifc,
  'central-plaza': centralPlaza,
  jardine,
  wheel,
  piers,
  hkcec: conventionCentre,
  'hkcec-old': conventionOld,
  'blue-house': blueHouse,
  'peak-tower': peakTower,
  'man-mo': manMo,
};
