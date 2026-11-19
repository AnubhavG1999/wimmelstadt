// Toy versions of Hong Kong's buildings and monuments. Each is a few dozen
// boxes, prisms and bars: enough for the silhouette. Each stands on a lot from
// plan.ts, and is built by its own function here.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import { area } from '../../engine/ground';
import { train } from '../../engine/rail';
import type { Build } from '../../engine/tile';
import { eased, flat, lengths, pathOf, raised, rounded, through } from './geom';
import { horse, jumbo } from './movers';
import { FUNICULAR, HILL, LION, LOTS, RACECOURSE, groundAt, type Lot } from './plan';
import { beacon, centre, chamfered, drum, face3, gable, hip, prism, railing, shell, slab, slope3, type XZ } from './shapes';

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
// Tsim Sha Tsui
// ---------------------------------------------------------------------------

/** The four ways a wall can face: south, east, north, west. */
const FOUR: XZ[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * The Clock Tower: all that is left of the railway terminus. Red brick with
 * granite at its corners, a clock on every side, and a little dome on top.
 */
const clockTower: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), a = 1.7, BRICK = 0xa5553f, STONE = 0xd9d2c0, COPPER = 0x7a9a8c;
  b.box(cx - a - 0.6, 0, cz - a - 0.6, cx + a + 0.6, 0.5, cz + a + 0.6, STONE);
  b.box(cx - a - 0.15, 0.5, cz - a - 0.15, cx + a + 0.15, 3.6, cz + a + 0.15, STONE);
  b.box(cx - a, 3.6, cz - a, cx + a, 19.5, cz + a, BRICK, { win: { cell: 1.7, storey: 4.0, lit: 0.3, kind: 6 }, seed: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(cx + sx * a - 0.24, 3.6, cz + sz * a - 0.24, cx + sx * a + 0.24, 19.5, cz + sz * a + 0.24, STONE, { faces: 'NESW' });
  b.box(cx - a - 0.3, 19.5, cz - a - 0.3, cx + a + 0.3, 20.1, cz + a + 0.3, STONE);
  b.box(cx - a, 20.1, cz - a, cx + a, 24.2, cz + a, BRICK);
  for (const [nx, nz] of FOUR) k.sign('clock', cx + nx * (a + 0.07), 22.15, cz + nz * (a + 0.07), nx, nz, 2.8);
  b.box(cx - a - 0.4, 24.2, cz - a - 0.4, cx + a + 0.4, 24.9, cz + a + 0.4, STONE);
  // the turret: eight-sided, under a dome and a rod
  b.cyl(cx, cz, 24.9, 27.6, 1.25, 1.25, 8, STONE, { win: interior(0.6) });
  b.cyl(cx, cz, 27.6, 28.5, 1.42, 1.05, 8, COPPER, { cap: false });
  b.cyl(cx, cz, 28.5, 29.3, 1.05, 0.25, 8, COPPER, { cap: false });
  b.cyl(cx, cz, 29.3, 31.4, 0.09, 0.04, 4, 0x4a4f55, { cap: false });
  for (const [nx, nz] of FOUR) k.lights.push({ x: cx + nx * 3.5, z: cz + nz * 3.5, r: 7, color: '#ffe2ae', k: 0.7 });
};

/** The Star Ferry's pier at Tsim Sha Tsui: a long shed of green and white, out over the water. */
const starFerryPier: Model = (k, l) => {
  const b = k.b, WHITE = 0xf2efe6, GREEN = 0x2f7a55;
  b.box(l.x0, -0.35, l.z0, l.x1 + 0.4, 0.2, l.z1, 0xa9a59a, { top: 0xb9b2a2 });
  for (let x = l.x0 + 1; x < l.x1; x += 2.6) for (const z of [l.z0 + 0.4, l.z1 - 0.4]) b.box(x - 0.22, -2.3, z - 0.22, x + 0.22, -0.35, z + 0.22, 0x7b7468, { faces: 'NESW' });
  const a = l.x0 + 0.5, c = l.x1 - 0.2, z0 = l.z0 + 1.0, z1 = l.z1 - 0.6, zc = (z0 + z1) / 2;
  b.box(a, 0.2, z0, c, 1.0, z1, GREEN, { faces: 'NESW' });
  b.box(a, 1.0, z0, c, 3.3, z1, WHITE, { win: { cell: 1.5, storey: 2.3, lit: 0.85, kind: 2 }, seed: 0.4, faces: 'NESW' });
  b.box(a - 0.15, 3.3, z0 - 0.15, c + 0.15, 3.7, z1 + 0.15, GREEN);
  b.box(a, 3.7, z0, c, 5.5, z1, WHITE, { win: { cell: 1.2, storey: 1.8, lit: 0.6, kind: 4 }, seed: 0.8, faces: 'NESW' });
  gable(b, a, z0, c, z1, 5.5, 1.4, GREEN, WHITE, 'x');
  k.sign('star-ferry', (a + c) / 2, 4.6, z1 + 0.08, 0, 1, 1.4, c - a - 1);
  k.sign('star-ferry', a - 0.08, 4.6, zc, -1, 0, 1.3, z1 - z0 - 0.5);
  k.lights.push({ x: (a + c) / 2, z: l.z1 + 2, r: 10, color: '#fff0d6', k: 0.7 });
};

/**
 * The Cultural Centre: no windows, tiled in pale pink, with a roof that sweeps
 * down from each end to the middle like a ski jump, and an arcade along the
 * walk by the water.
 */
const culturalCentre: Model = (k, l) => {
  const b = k.b, TILE = 0xdcbcaa, TOP = 0xcbaa98;
  const w = l.x1 - l.x0;
  const line: [number, number][] = [[0, 15], [0.13, 11.6], [0.3, 9.2], [0.5, 8], [0.67, 8.5], [0.83, 10.2], [1, 13.2]];
  const prof = line.map(([f, y]): [number, number] => [l.x0 + f * w, y]);
  for (let i = 0; i < prof.length - 1; i++) {
    const [xa, ya] = prof[i], [xb, yb] = prof[i + 1], len = Math.hypot(xb - xa, yb - ya);
    for (const [z, n] of [[l.z1, 1], [l.z0, -1]]) b.quad([xa, 0, z], [xb, 0, z], [xb, yb, z], [xa, ya, z], [0, 0, n], TILE);
    b.quad([xa, ya, l.z0], [xb, yb, l.z0], [xb, yb, l.z1], [xa, ya, l.z1], [-(yb - ya) / len, (xb - xa) / len, 0], TOP);
  }
  b.quad([l.x0, 0, l.z0], [l.x0, 0, l.z1], [l.x0, prof[0][1], l.z1], [l.x0, prof[0][1], l.z0], [-1, 0, 0], TILE);
  b.quad([l.x1, 0, l.z0], [l.x1, 0, l.z1], [l.x1, 13.2, l.z1], [l.x1, 13.2, l.z0], [1, 0, 0], TILE);
  // the arcade: dark behind a row of piers, along the south and the west
  b.box(l.x0 + 0.4, 0, l.z1, l.x1 - 0.4, 2.9, l.z1 + 0.06, 0x3a3f46, { faces: 'S', win: interior(0.8) });
  b.box(l.x0 - 0.06, 0, l.z0 + 0.4, l.x0, 2.9, l.z1 - 0.4, 0x3a3f46, { faces: 'W', win: interior(0.8) });
  b.box(l.x0, 2.9, l.z1, l.x1, 3.5, l.z1 + 0.7, TILE);
  for (let x = l.x0 + 0.3; x < l.x1; x += 1.8) b.box(x - 0.22, 0, l.z1 + 0.25, x + 0.22, 2.9, l.z1 + 0.7, TILE, { faces: 'NESW' });
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 + 3, r: 12, color: '#ffe2ae', k: 0.7 });
  k.lights.push({ x: l.x0 - 3, z: (l.z0 + l.z1) / 2, r: 9, color: '#ffe2ae', k: 0.5 });
};

/** The Space Museum: a white dome like half an egg, with its halls beside it. */
const spaceMuseum: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), R = centre(l).half - 0.2, WHITE = 0xf5f1e8;
  b.cyl(cx, cz, 0, 1.0, R + 0.5, R + 0.5, 20, 0xd9d4c7);
  const rings: [number, number][] = [[1.0, 1], [2.6, 0.95], [4.0, 0.82], [5.2, 0.62], [6.1, 0.36], [6.5, 0.1]];
  for (let i = 0; i < rings.length - 1; i++) b.cyl(cx, cz, rings[i][0], rings[i + 1][0], R * rings[i][1], R * rings[i + 1][1], 20, i % 2 ? 0xe9e4d8 : WHITE, { cap: i === rings.length - 2 ? WHITE : false });
  b.box(l.x0 - 4.2, 0, l.z0 + 1, l.x0 + 0.8, 4.2, l.z1 - 1, 0xe3ddd0, { win: { cell: 2.4, storey: 4.2, lit: 0.6, kind: 2 }, seed: 0.3, top: 0x9d988f });
  k.lights.push({ x: cx, z: cz + R + 2, r: 11, color: '#e6f0ff', k: 0.9 });
  k.lights.push({ x: cx + R + 2, z: cz, r: 9, color: '#e6f0ff', k: 0.7 });
};

/** A long car of the kind a grand hotel keeps, in one colour all over. */
function limousine(b: GeoBuilder, x: number, z: number, yaw: number, paint: number): void {
  b.moved(x, 0, z, yaw, () => {
    b.box(-2.8, 0.45, -1.05, 2.8, 1.3, 1.05, paint);
    b.box(-1.5, 1.3, -0.92, 1.3, 2.05, 0.92, 0x1c2733, { top: paint });
    b.box(2.8, 0.7, -0.5, 2.86, 1.2, 0.5, 0xd9dde0, { faces: 'E' });
    for (const wx of [-1.8, 1.8]) for (const s of [-1, 1]) b.box(wx - 0.48, 0, s * 0.82 - 0.26, wx + 0.48, 0.92, s * 0.82 + 0.26, 0x17171a);
  });
}

/**
 * The Peninsula: the old hotel of seven storeys, its two wings reaching forward
 * round a court, the forecourt with its fountain, and the tower behind with a
 * place for a helicopter at each end of its roof. A hero stands on the forecourt.
 */
const peninsula: Model = (k, l) => {
  const b = k.b, CREAM = 0xefe2c4, BASE = 0xd9cbb0, TRIM = 0xf7efdc, GREEN = 0x1f4a3a, FLAT = 0x8d8a83;
  const cx = (l.x0 + l.x1) / 2, sh = 2.6, H = 7 * sh;
  const zt = l.z0 + 5.4, zm = l.z0 + 9.4, zw = l.z0 + 12.4;
  const block = (x0: number, z0: number, x1: number, z1: number, seed: number): void => {
    b.box(x0, 0, z0, x1, sh * 1.4, z1, BASE, { win: { cell: 1.9, storey: sh * 1.4, lit: 0.8, kind: 2 }, seed });
    b.box(x0, sh * 1.4, z0, x1, H, z1, CREAM, { win: { cell: 1.3, storey: sh, lit: 0.5, kind: 0 }, seed, top: FLAT });
    b.box(x0 - 0.2, H, z0 - 0.2, x1 + 0.2, H + 0.5, z1 + 0.2, TRIM, { top: FLAT });
  };
  block(l.x0 + 0.2, zt, l.x1 - 0.2, zm, 0.2);
  block(l.x0 + 0.2, zm, l.x0 + 5.6, zw, 0.5);
  block(l.x1 - 5.6, zm, l.x1 - 0.2, zw, 0.8);
  // the tower
  const T = l.h;
  b.box(cx - 5.6, 0, l.z0 + 0.2, cx + 5.6, T, zt + 0.3, 0xe9dfc8, { win: { cell: 1.3, storey: sh, lit: 0.55, kind: 0 }, seed: 0.35, top: FLAT });
  b.box(cx - 4.2, T, l.z0 + 1.1, cx + 4.2, T + 2.4, zt - 0.6, BASE, { win: interior(0.8), top: FLAT });
  for (const s of [-1, 1]) {
    const px = cx + s * 4.7, pz = (l.z0 + 0.2 + zt + 0.3) / 2;
    b.cyl(px, pz, T, T + 1.2, 1.1, 1.1, 8, BASE);
    b.cyl(px, pz, T + 1.2, T + 1.5, 2.5, 2.5, 14, 0x4b5560, { cap: 0x59636d });
    b.cyl(px, pz, T + 1.5, T + 1.54, 1.7, 1.7, 14, 0xe9c94a);
    b.cyl(px, pz, T + 1.54, T + 1.58, 1.3, 1.3, 14, 0x59636d);
    beacon(k, px + s * 2.5, T + 1.8, pz, 0.35);
  }
  // its name along the roof of the old hotel, and the way in under a canopy
  b.box(cx - 5.2, H + 0.5, zm - 0.5, cx + 5.2, H + 2.9, zm - 0.3, 0x2a2c31);
  k.sign('peninsula', cx, H + 1.7, zm - 0.26, 0, 1, 2.2, 10);
  b.box(cx - 2.2, 3.1, zm, cx + 2.2, 3.5, zm + 1.1, GREEN, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(cx + s * 2.0 - 0.12, 0, zm + 0.85, cx + s * 2.0 + 0.12, 3.1, zm + 1.09, TRIM, { faces: 'NESW' });
  // the forecourt: paving, the fountain, one of the hotel's own green cars, and people
  b.box(l.x0, 0, zw, l.x1, 0.04, l.z1, 0xd6d0c2, { faces: 'T' });
  const fz = zw + 3.2;
  b.cyl(cx, fz, 0, 0.6, 1.6, 1.6, 12, 0xd9d2c0, { cap: 0x6fb3d0 });
  b.cyl(cx, fz, 0.6, 1.1, 0.5, 0.4, 8, 0xd9d2c0);
  b.cyl(cx, fz, 1.1, 2.3, 0.12, 0.05, 6, 0xdff3ff, { win: interior(0.9), cap: false });
  k.glows.push({ x: cx, y: 0.75, z: fz, sx: 0.5, sy: 0.12, sz: 0.5, color: '#bfe8ff' });
  limousine(b, cx + 5.4, fz + 0.2, 0, GREEN);
  for (const [x, z] of [[l.x0 + 0.9, zw + 0.9], [l.x1 - 0.9, zw + 0.9], [cx - 3.4, zm + 0.9], [cx + 3.4, zm + 0.9]]) k.tree(x, z, 0.32);
  for (const [x, z] of [[cx - 1.2, zm + 1.6], [cx + 1.0, zm + 1.7], [cx + 2.2, fz + 2.2], [cx - 2.4, fz + 2.4], [l.x1 - 2.2, fz + 2.3], [cx + 3.0, zw + 0.7], [cx + 8.2, fz - 1.9]]) k.person(x, z, 0.04);
  k.lights.push({ x: cx, z: fz, r: 13, color: '#fff0d6', k: 0.9 });
  k.lights.push({ x: cx - 5.4, z: fz, r: 10, color: '#fff0d6', k: 0.8 });
};

// ---------------------------------------------------------------------------
// Kowloon
// ---------------------------------------------------------------------------

/**
 * ICC: the tallest thing on the tile. A square shaft of steel-blue glass with
 * its corners cut in, slimming a little near the top, its four walls standing
 * up past the roof, and a canopy of glass sweeping out from its foot.
 */
const icc: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), H = l.h, a = centre(l).half - 0.9;
  const GLASS = 0x5f86a8, PALE = 0x9fb9cc;
  const win: WinSpec = { cell: 1.1, storey: 3.0, lit: 0.42, kind: 1 };
  b.box(l.x0, 0, l.z0, l.x1, 4.5, l.z1, 0xb9c3cc, { win: { cell: 2.4, storey: 4.5, lit: 0.7, kind: 2 }, seed: 0.2, top: 0x9d988f });
  slab(b, [cx, 13, l.z1 - 1.1], [cx, 4.7, l.z1 + 2.8], a - 0.8, 0.3, PALE, { win: interior(0.5), under: 0x8fa3b3 });
  slab(b, [l.x1 - 1.1, 13, cz], [l.x1 + 2.8, 4.7, cz], a - 0.8, 0.3, PALE, { win: interior(0.5), under: 0x8fa3b3 });
  const tiers: [number, number][] = [[H * 0.8, 0], [H * 0.9, 0.4], [H * 0.955, 0.8]];
  let y = 4.5;
  tiers.forEach(([top, slim], i) => {
    prism(b, chamfered(cx, cz, a - slim, 1.5), y, top, GLASS, { win, seed: 0.3 + i * 0.21, top: PALE });
    y = top;
  });
  // the crown
  const r = a - 1.0;
  for (const [nx, nz] of FOUR) {
    if (nx) b.box(cx + nx * r - 0.2, y, cz - r + 1.5, cx + nx * r + 0.2, H, cz + r - 1.5, PALE, { win: interior(0.9) });
    else b.box(cx - r + 1.5, y, cz + nz * r - 0.2, cx + r - 1.5, H, cz + nz * r + 0.2, PALE, { win: interior(0.9) });
  }
  b.box(cx - r + 1.2, y, cz - r + 1.2, cx + r - 1.2, y + 2.5, cz + r - 1.2, 0x8d9299, { top: ROOF });
  beacon(k, cx - r, H + 0.5, cz - r, 0.5);
  beacon(k, cx + r, H + 0.5, cz + r, 0.5);
  k.lights.push({ x: cx, z: l.z1 + 4, r: 13, color: '#dff1ff', k: 0.7 });
  k.lights.push({ x: l.x1 + 4, z: cz, r: 13, color: '#dff1ff', k: 0.7 });
};

/**
 * Wong Tai Sin Temple: the great hall with its red posts and its two roofs of
 * golden tile, a gateway of three arches in front, an urn for incense, and
 * rows of lanterns over the court.
 */
const wongTaiSin: Model = (k, l) => {
  const b = k.b, { cx } = centre(l), RED = 0xb3261e, TILE = 0xd9a520, GREEN = 0x2f7d5b, STONE = 0xd6d0c2, BLUE = 0x2f5fa8;
  b.box(l.x0, 0, l.z0, l.x1, 0.15, l.z1, 0xcfc8b8, { top: STONE });
  // the hall, on its terrace
  const x0 = cx - 4.3, x1 = cx + 4.3, z0 = l.z0 + 1.0, z1 = l.z0 + 5.8;
  b.box(x0 - 0.9, 0.15, z0 - 0.5, x1 + 0.9, 1.0, z1 + 1.0, STONE);
  b.box(cx - 1.7, 0.15, z1 + 1.0, cx + 1.7, 0.6, z1 + 1.6, STONE);
  b.box(x0 + 0.5, 1.0, z0 + 0.4, x1 - 0.5, 4.3, z1 - 0.55, 0xc8432f, { win: interior(0.45) });
  for (let i = 0; i < 6; i++) {
    const x = x0 + 0.2 + (i * (x1 - x0 - 0.4)) / 5;
    b.box(x - 0.18, 1.0, z1 - 0.2, x + 0.18, 4.3, z1 + 0.16, RED, { faces: 'NESW' });
  }
  b.box(x0, 4.3, z0, x1, 4.9, z1, BLUE);
  hip(b, x0, z0, x1, z1, 4.9, 1.9, TILE, 1.0);
  b.box(x0 + 1.9, 6.0, z0 + 1.5, x1 - 1.9, 7.3, z1 - 1.5, RED);
  hip(b, x0 + 1.9, z0 + 1.5, x1 - 1.9, z1 - 1.5, 7.3, 1.5, TILE, 0.9);
  b.box(x0 + 3.0, 8.7, (z0 + z1) / 2 - 0.16, x1 - 3.0, 9.15, (z0 + z1) / 2 + 0.16, GREEN);
  // every corner of both roofs turns up
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.beam([sx > 0 ? x1 + 0.8 : x0 - 0.8, 5.0, sz > 0 ? z1 + 0.8 : z0 - 0.8], [sx > 0 ? x1 + 1.5 : x0 - 1.5, 5.55, sz > 0 ? z1 + 1.5 : z0 - 1.5], 0.14, 0.06, GREEN);
    b.beam([sx > 0 ? x1 - 1.2 : x0 + 1.2, 7.4, sz > 0 ? z1 - 0.8 : z0 + 0.8], [sx > 0 ? x1 - 0.6 : x0 + 0.6, 7.9, sz > 0 ? z1 - 0.2 : z0 + 0.2], 0.12, 0.05, GREEN);
  }
  // the gateway: four posts, three arches, a little roof over each, and the temple's name
  const gz = l.z1 - 1.3, posts = [-3.5, -1.35, 1.35, 3.5];
  posts.forEach((dx, i) => b.box(cx + dx - 0.2, 0.15, gz - 0.2, cx + dx + 0.2, i === 0 || i === 3 ? 3.5 : 4.6, gz + 0.2, RED, { faces: 'NESW' }));
  b.box(cx - 3.8, 3.1, gz - 0.14, cx + 3.8, 3.5, gz + 0.14, RED);
  b.box(cx - 1.6, 4.2, gz - 0.14, cx + 1.6, 4.6, gz + 0.14, RED);
  gable(b, cx - 3.9, gz - 0.35, cx - 1.2, gz + 0.35, 3.5, 0.55, TILE, RED, 'x', 0.3);
  gable(b, cx + 1.2, gz - 0.35, cx + 3.9, gz + 0.35, 3.5, 0.55, TILE, RED, 'x', 0.3);
  gable(b, cx - 1.7, gz - 0.4, cx + 1.7, gz + 0.4, 4.6, 0.7, TILE, RED, 'x', 0.35);
  k.sign('wong-tai-sin', cx, 3.85, gz + 0.16, 0, 1, 0.62, 2.5);
  // the urn, and lanterns in rows across the court
  const uz = z1 + 3.0;
  b.cyl(cx, uz, 0.15, 0.6, 0.55, 0.4, 8, 0x6d5a3a);
  b.cyl(cx, uz, 0.6, 1.3, 0.55, 0.78, 8, 0x8a6a3c, { cap: 0x3a3028 });
  k.glows.push({ x: cx, y: 1.38, z: uz, sx: 0.55, sy: 0.1, sz: 0.55, color: '#ff8a3a' });
  for (const z of [uz - 1.3, uz + 0.3, uz + 1.9]) {
    b.box(l.x0 + 0.6, 3.3, z - 0.03, l.x1 - 0.6, 3.36, z + 0.03, 0x3a3028, { faces: 'NSTB' });
    for (let x = l.x0 + 1.2; x < l.x1 - 0.8; x += 1.25) k.glows.push({ x, y: 3.0, z, sx: 0.36, sy: 0.44, sz: 0.36, color: '#ff5a36' });
  }
  for (const x of [l.x0 + 0.6, l.x1 - 0.6]) for (const z of [uz - 1.3, uz + 0.3, uz + 1.9]) b.box(x - 0.08, 0.15, z - 0.08, x + 0.08, 3.36, z + 0.08, 0x3a3028, { faces: 'NESW' });
  for (let i = 0; i < 14; i++) k.person(l.x0 + 1 + k.rand() * (l.x1 - l.x0 - 2), z1 + 1.9 + k.rand() * (gz - z1 - 2.6), 0.15);
  k.lights.push({ x: cx, z: uz, r: 11, color: '#ffb070', k: 0.9 });
  k.lights.push({ x: cx, z: l.z1 + 1.5, r: 8, color: '#ffd9a0', k: 0.6 });
};

/**
 * A tower being mended, in bamboo scaffolding: poles lashed in a grid from the
 * pavement to the roof, and green netting over most of it.
 */
const bamboo: Model = (k, l) => {
  const b = k.b, H = l.h, POLE = 0xcfa85c, NET = 0x3f8f5f;
  const x0 = l.x0 + 1.3, x1 = l.x1 - 1.3, z0 = l.z0 + 1.3, z1 = l.z1 - 1.3, off = 0.75, step = 3.4, levels = Math.floor(H / step);
  b.box(x0, 0, z0, x1, H, z1, 0xb9b5ac, { win: { cell: 2.2, storey: step, lit: 0.14, kind: 0 }, seed: 0.3, top: 0x8d8a83 });
  const ax0 = x0 - off, ax1 = x1 + off, az0 = z0 - off, az1 = z1 + off;
  // the netting, a hand's width inside the poles, with a few bays left open
  for (let i = 1; i < levels; i++) {
    const y0 = i * step + 0.1, y1 = (i + 1) * step - 0.1, d = off - 0.12;
    if (i % 5 !== 2) b.box(x0 - d, y0, z1 + d - 0.04, x1 + d, y1, z1 + d, NET, { faces: 'S' });
    if (i % 4 !== 1) b.box(x1 + d - 0.04, y0, z0 - d, x1 + d, y1, z1 + d, NET, { faces: 'E' });
    b.box(x0 - d, y0, z0 - d, x1 + d, y1, z0 - d + 0.04, NET, { faces: 'N' });
    if (i % 3 !== 0) b.box(x0 - d, y0, z0 - d, x0 - d + 0.04, y1, z1 + d, NET, { faces: 'W' });
  }
  // the poles: uprights every couple of units, a ledger at every storey, and braces that cross
  const up = (x: number, z: number): void => b.beam([x, 0, z], [x, H + 1.4, z], 0.09, 0.08, POLE);
  const nx = Math.round((ax1 - ax0) / 2.3), nz = Math.round((az1 - az0) / 2.3);
  for (let i = 0; i <= nx; i++) for (const z of [az0, az1]) up(ax0 + ((ax1 - ax0) * i) / nx, z);
  for (let i = 1; i < nz; i++) for (const x of [ax0, ax1]) up(x, az0 + ((az1 - az0) * i) / nz);
  for (let i = 1; i <= levels; i++) {
    const y = i * step;
    b.beam([ax0, y, az0], [ax1, y, az0], 0.08, 0.08, POLE);
    b.beam([ax0, y, az1], [ax1, y, az1], 0.08, 0.08, POLE);
    b.beam([ax0, y, az0], [ax0, y, az1], 0.08, 0.08, POLE);
    b.beam([ax1, y, az0], [ax1, y, az1], 0.08, 0.08, POLE);
  }
  for (let i = 0; i + 2 <= levels; i += 2) {
    const y0 = i * step, y1 = (i + 2) * step, m = (ax0 + ax1) / 2, mz = (az0 + az1) / 2;
    b.beam([ax0, y0, az1], [m, y1, az1], 0.06, 0.06, POLE);
    b.beam([ax1, y0, az1], [m, y1, az1], 0.06, 0.06, POLE);
    b.beam([ax1, y0, az0], [ax1, y1, mz], 0.06, 0.06, POLE);
    b.beam([ax1, y0, az1], [ax1, y1, mz], 0.06, 0.06, POLE);
  }
  // a hoarding round its foot, and men at work on the roof
  b.box(ax0 - 0.3, 0, az1 + 0.2, ax1 + 0.3, 2.5, az1 + 0.4, 0x2f6fb0);
  b.box(ax1 + 0.2, 0, az0 - 0.3, ax1 + 0.4, 2.5, az1 + 0.4, 0x2f6fb0);
  k.sign('works', (ax0 + ax1) / 2, 1.4, az1 + 0.46, 0, 1, 1.5);
  for (let i = 0; i < 4; i++) k.person(x0 + 1 + k.rand() * (x1 - x0 - 2), z0 + 1 + k.rand() * (z1 - z0 - 2), H);
  b.box(x0 + 1, H, z0 + 1, x0 + 3.4, H + 1.8, z0 + 2.8, 0xe9c94a);
  k.lights.push({ x: (ax0 + ax1) / 2, z: az1 + 3, r: 10, color: '#ffe2ae', k: 0.5 });
};

/**
 * Hong Kong Coliseum: a pyramid standing on its point, or nearly: four walls
 * that lean outwards from a small foot to a wide roof, over a plaza.
 */
const coliseum: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), R1 = centre(l).half - 0.4, R0 = 4.6, CONC = 0x9aa3ad, DARK = 0x626b75;
  b.box(l.x0, 0, l.z0, l.x1, 2.2, l.z1, 0xb9b5ac, { win: { cell: 2.6, storey: 2.2, lit: 0.5, kind: 2 }, seed: 0.4, top: 0xcfc8b8 });
  const y0 = 4.6, y1 = 18.5, bands = 5;
  b.box(cx - R0 + 0.5, 2.2, cz - R0 + 0.5, cx + R0 - 0.5, y0, cz + R0 - 0.5, 0x8fb4cf, { win: interior(1.0) });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(cx + sx * (R0 - 0.5) - 0.6, 2.2, cz + sz * (R0 - 0.5) - 0.6, cx + sx * (R0 - 0.5) + 0.6, y0 + 0.4, cz + sz * (R0 - 0.5) + 0.6, CONC, { faces: 'NESW' });
  for (let i = 0; i < bands; i++) {
    const ya = y0 + ((y1 - y0) * i) / bands, yb = y0 + ((y1 - y0) * (i + 1)) / bands;
    const ra = R0 + ((R1 - R0) * i) / bands, rb = R0 + ((R1 - R0) * (i + 1)) / bands;
    b.cyl(cx, cz, ya, yb, ra * Math.SQRT2, rb * Math.SQRT2, 4, i % 2 ? DARK : CONC, { phase: Math.PI / 4, cap: false, win: i === 3 ? interior(0.7) : undefined });
  }
  b.box(cx - R1, y1, cz - R1, cx + R1, y1 + 1.3, cz + R1, CONC, { top: 0x7b838c });
  b.box(cx - R1 + 2.5, y1 + 1.3, cz - R1 + 2.5, cx + R1 - 2.5, y1 + 2.3, cz + R1 - 2.5, DARK, { top: 0x7b838c });
  for (let i = 0; i < 16; i++) {
    const side = i % 4, t = -R1 + 0.6 + k.rand() * (2 * R1 - 1.2), d = R1 - 0.2 + k.rand() * 0.5 - (k.rand() < 0.5 ? 0 : 3);
    k.person(cx + (side === 0 ? t : side === 1 ? d : side === 2 ? t : -d), cz + (side === 0 ? d : side === 1 ? t : side === 2 ? -d : t), 2.2);
  }
  for (const [nx, nz] of FOUR) k.lights.push({ x: cx + nx * (R1 - 1), z: cz + nz * (R1 - 1), r: 9, color: '#dff1ff', k: 0.7 });
};

/** The colours of Choi Hung, from the ground up. Its name means rainbow. */
const RAINBOW = [0xe86a6a, 0xf0934e, 0xf2c94c, 0x8fcf72, 0x5fbfc9, 0x6f8fe0, 0xa884d9];

/** A block of Choi Hung Estate: a plain slab of flats, each storey painted one colour of the rainbow. */
const estate: Model = (k, l) => {
  const b = k.b, floors = 8, sh = l.h / floors;
  for (let f = 0; f < floors; f++) {
    const paint = f === 0 ? 0xdcd6c8 : RAINBOW[f - 1];
    b.box(l.x0, f * sh, l.z0, l.x1, (f + 1) * sh, l.z1, paint, { win: { cell: 1.45, storey: sh, lit: f === 0 ? 0.7 : 0.55, kind: f === 0 ? 2 : 0 }, seed: 0.37, faces: f === floors - 1 ? 'NESWT' : 'NESW', top: 0x9d988f });
  }
  // a stair at each end, white, and tanks on the roof
  const long = l.x1 - l.x0 > l.z1 - l.z0;
  for (const s of [0, 1]) {
    if (long) b.box(s ? l.x1 - 1.3 : l.x0 - 0.3, 0, l.z0 - 0.35, s ? l.x1 + 0.3 : l.x0 + 1.3, l.h + 1.6, l.z1 + 0.35, 0xf2efe6, { win: { cell: 1.6, storey: sh, lit: 0.4, kind: 6 }, top: 0x9d988f });
    else b.box(l.x0 - 0.35, 0, s ? l.z1 - 1.3 : l.z0 - 0.3, l.x1 + 0.35, l.h + 1.6, s ? l.z1 + 0.3 : l.z0 + 1.3, 0xf2efe6, { win: { cell: 1.6, storey: sh, lit: 0.4, kind: 6 }, top: 0x9d988f });
  }
  const { cx, cz } = centre(l);
  b.box(cx - 1.4, l.h, cz - 1.2, cx + 1.4, l.h + 1.5, cz + 1.2, 0xb9bcc0);
  k.lights.push({ x: cx, z: l.z1 + 3, r: 11, color: '#ffe2ae', k: 0.5 });
};

/**
 * Choi Hung's car park, with the courts on its roof that everybody
 * photographs: painted in bright colours, with the rainbow flats behind. The
 * south end of the roof is left for a hero.
 */
const courts: Model = (k, l) => {
  const b = k.b, top = l.h, PALE = 0xe9e3d6, LINE = 0xf7f4ea;
  b.box(l.x0 + 0.2, 0, l.z0 + 0.2, l.x1 - 0.2, top - 0.7, l.z1 - 0.2, 0x3a3f46, { win: interior(0.3), faces: 'NESW' });
  for (const y of [0, top / 2 - 0.2]) b.box(l.x0, y, l.z0, l.x1, y + 1.3, l.z1, PALE, { faces: 'NESW' });
  b.box(l.x0, top - 0.7, l.z0, l.x1, top, l.z1, PALE, { top: 0x6f7780 });
  for (let z = l.z0; z < l.z1 + 0.1; z += (l.z1 - l.z0) / 7) for (const x of [l.x0, l.x1 - 0.5]) b.box(x, 0, Math.min(z, l.z1 - 0.5), x + 0.5, top - 0.7, Math.min(z, l.z1 - 0.5) + 0.5, PALE, { faces: 'NESW' });
  railing(b, l.x0 + 0.1, l.z0 + 0.1, l.x1 - 0.1, l.z1 - 0.1, top, 0x59636d, 'NESW', 1.2);
  // two courts, each in colours of its own: the floor, a key at each end, and its lines
  const x0 = l.x0 + 0.9, x1 = l.x1 - 0.9, xc = (x0 + x1) / 2, Y = top + 0.02;
  const court = (z0: number, z1: number, floor: number, key: number): void => {
    const paint = (ax: number, az: number, cx2: number, cz2: number, col: number, lift: number): void => b.box(ax, Y, az, cx2, Y + lift, cz2, col, { faces: 'T' });
    paint(x0, z0, x1, z1, floor, 0.02);
    for (const [a, c] of [[z0, z0 + 2.9], [z1 - 2.9, z1]]) paint(xc - 1.5, a, xc + 1.5, c, key, 0.03);
    b.cyl(xc, (z0 + z1) / 2, Y, Y + 0.035, 1.3, 1.3, 14, key);
    for (const z of [z0, (z0 + z1) / 2 - 0.06, z1 - 0.12]) paint(x0, z, x1, z + 0.12, LINE, 0.045);
    for (const x of [x0, x1 - 0.12]) paint(x, z0, x + 0.12, z1, LINE, 0.045);
    // a post, a board and a ring at each end
    for (const [z, s] of [[z0 + 0.25, 1], [z1 - 0.25, -1]]) {
      b.box(xc - 0.1, top, z - 0.1, xc + 0.1, top + 3.0, z + 0.1, 0x59636d, { faces: 'NESW' });
      b.box(xc - 0.1, top + 2.9, z, xc + 0.1, top + 3.05, z + s * 0.9, 0x59636d, { faces: 'NESWTB' });
      b.box(xc - 0.8, top + 2.6, z + s * 0.9 - 0.05, xc + 0.8, top + 3.7, z + s * 0.9 + 0.05, 0xf7f4ea, { faces: 'NESWTB' });
      b.box(xc - 0.28, top + 2.75, z + s * 0.95, xc + 0.28, top + 2.8, z + s * 1.5, 0xf0782e, { faces: 'NESWTB' });
    }
    for (let i = 0; i < 7; i++) k.person(x0 + 0.6 + k.rand() * (x1 - x0 - 1.2), z0 + 1 + k.rand() * (z1 - z0 - 2), top + 0.04);
  };
  const zs = l.z0 + 1.0, len = 10.2;
  court(zs, zs + len, 0x3f8fd9, 0xf2a23a);
  court(zs + len + 0.8, zs + 2 * len + 0.8, 0x4fb07a, 0xf08aa8);
  // the hero's place: the rainbow, in stripes across the roof
  const zh = zs + 2 * len + 1.6, stripe = (l.z1 - 1.0 - zh) / RAINBOW.length;
  RAINBOW.forEach((col, i) => b.box(x0, Y, zh + i * stripe, x1, Y + 0.02, zh + (i + 1) * stripe, col, { faces: 'T' }));
  for (const [x, z] of [[l.x0 + 0.7, l.z0 + 0.7], [l.x1 - 0.7, l.z0 + 0.7], [l.x0 + 0.7, zs + len + 0.4], [l.x1 - 0.7, zs + len + 0.4]]) k.tree(x, z, 0.5, true, top);
  for (const z of [l.z0 + 5, (l.z0 + l.z1) / 2, l.z1 - 5]) k.lights.push({ x: xc, z, r: 10, color: '#fff0d6', k: 0.8 });
};

/**
 * Temple Street Night Market: two rows of stalls under canvas of red, white
 * and blue, a string of lamps over each, a gateway at each end with the
 * street's name on it, and a dai pai dong where people eat at folding tables.
 */
const nightMarket: Model = (k, l) => {
  const b = k.b, RED = 0xb3261e, CANVAS = [0xc8322b, 0x2f5fa8, 0xf2efe6, 0x2f8f5f, 0xe8b93a], GOODS = [0xe86a6a, 0xf2c94c, 0x5fbfc9, 0xa884d9, 0xf0934e, 0x8fcf72, 0xf7f4ea];
  const za = l.z0 + 2.3, zb = l.z1 - 2.3, zc = (l.z0 + l.z1) / 2;
  b.box(l.x0, 0, l.z0, l.x1, 0.08, l.z1, 0x7f7c78, { faces: 'T' });
  // a gateway at each end of the street
  for (const [x, n] of [[l.x0 + 0.7, -1], [l.x1 - 0.7, 1]]) {
    for (const z of [zc - 2.6, zc + 2.6]) b.box(x - 0.22, 0, z - 0.22, x + 0.22, 4.4, z + 0.22, RED, { faces: 'NESW' });
    b.box(x - 0.16, 3.5, zc - 3.0, x + 0.16, 4.4, zc + 3.0, RED);
    gable(b, x - 0.4, zc - 3.2, x + 0.4, zc + 3.2, 4.4, 0.7, 0x2f7d5b, RED, 'z', 0.35);
    k.sign('temple-street', x + n * 0.2, 3.95, zc, n, 0, 0.8, 5.4);
    k.sign('temple-street', x - n * 0.2, 3.95, zc, -n, 0, 0.8, 5.4);
  }
  // the stalls: a table of goods, four posts, and canvas that slopes down towards the people
  let n = 0;
  for (let x = l.x0 + 3.6; x < l.x1 - 11; x += 3.3) {
    for (const [z, s] of [[za, 1], [zb, -1]]) {
      const col = CANVAS[(n * 3 + (s > 0 ? 0 : 2)) % CANVAS.length];
      b.box(x - 1.3, 0.08, z - 0.75, x + 1.3, 1.0, z + 0.75, 0x8a6a48, { top: 0xd9d4c7 });
      for (let g = 0; g < 4; g++) b.box(x - 1.15 + g * 0.6, 1.0, z - 0.5 + ((g * 7 + n) % 3) * 0.2, x - 0.7 + g * 0.6, 1.25 + ((g + n) % 3) * 0.14, z + 0.2 + ((g * 5 + n) % 2) * 0.2, GOODS[(n + g * 2) % GOODS.length]);
      for (const dx of [-1.4, 1.4]) for (const dz of [-0.85, 0.85]) b.box(x + dx - 0.05, 0.08, z + dz - 0.05, x + dx + 0.05, 2.5 + (dz * s < 0 ? 0.5 : 0), z + dz + 0.05, 0x59636d, { faces: 'NESW' });
      slab(b, [x, 3.05, z - s * 0.95], [x, 2.45, z + s * 1.35], 1.55, 0.07, col, { under: col });
      k.glows.push({ x, y: 2.2, z: z + s * 1.0, sx: 0.26, sy: 0.26, sz: 0.26, color: '#ffe2a0' });
      if (n % 2 === 0) k.lights.push({ x, z: zc, r: 6, color: '#ffd9a0', k: 0.7 });
      n++;
    }
  }
  // the dai pai dong: a green stall with its wok on the go, and tables out in the street
  const dx = l.x1 - 8.4;
  b.box(dx, 0.08, l.z0 + 0.8, dx + 3.6, 2.7, l.z0 + 3.0, 0x2f7d5b, { win: interior(0.9), top: 0x4d8f6f });
  slab(b, [dx + 1.8, 3.0, l.z0 + 2.6], [dx + 1.8, 2.5, l.z0 + 4.6], 2.0, 0.07, 0x2f7d5b, { under: 0x4d8f6f });
  k.sign('dai-pai-dong', dx + 1.8, 3.25, l.z0 + 3.06, 0, 1, 0.8, 3.4);
  k.glows.push({ x: dx + 0.8, y: 1.3, z: l.z0 + 3.2, sx: 0.4, sy: 0.3, sz: 0.3, color: '#ff8a3a' });
  for (const [tx, tz] of [[dx + 0.6, zc + 0.4], [dx + 3.2, zc - 0.3], [dx + 5.6, zc + 0.8], [dx + 1.9, zc + 2.6], [dx + 4.6, zc + 2.9]]) {
    b.cyl(tx, tz, 0.08, 0.14, 0.3, 0.3, 6, 0x59636d);
    b.cyl(tx, tz, 0.14, 0.8, 0.07, 0.07, 6, 0x59636d);
    b.cyl(tx, tz, 0.8, 0.9, 0.75, 0.75, 10, 0xf2efe6);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + tx;
      b.box(tx + Math.cos(a) * 1.15 - 0.2, 0.08, tz + Math.sin(a) * 1.15 - 0.2, tx + Math.cos(a) * 1.15 + 0.2, 0.5, tz + Math.sin(a) * 1.15 + 0.2, i % 2 ? 0xc8322b : 0x2f5fa8);
      if (i !== 1) k.person(tx + Math.cos(a) * 1.15, tz + Math.sin(a) * 1.15, 0.2);
    }
    k.glows.push({ x: tx, y: 2.6, z: tz, sx: 0.26, sy: 0.26, sz: 0.26, color: '#ffe2a0' });
  }
  k.lights.push({ x: dx + 3, z: zc + 1, r: 11, color: '#ffd9a0', k: 0.9 });
  // and the crowd, down the middle of the street
  for (let i = 0; i < 46; i++) k.person(l.x0 + 2.2 + k.rand() * (l.x1 - l.x0 - 13.5), zc - 1.0 + k.rand() * 2.0, 0.08);
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

// ---------------------------------------------------------------------------
// The Island's south: Happy Valley, Causeway Bay, the typhoon shelter
// ---------------------------------------------------------------------------

/**
 * The Monster Building: a wall of small flats along the west, three wings
 * that reach out from it, and between the wings two yards so narrow that
 * people come to stand in them and look up. Every length of it is painted a
 * colour of its own, and its walls are hung with air conditioners and washing.
 */
const monster: Model = (k, l) => {
  const b = k.b, H = l.h, sx = l.x0 + 3.6;
  const PAINT = [0xd9c9b8, 0x9fc4c9, 0xe0b9b0, 0xcfd6a8, 0xb9c3d9], CLOTHES = [0xe86a6a, 0xf2c94c, 0x5fbfc9, 0xf7f4ea, 0xa884d9, 0x6f8fe0];
  const win: WinSpec = { cell: 0.95, storey: 2.0, lit: 0.55, kind: 4 };
  const n = 6, dz = (l.z1 - l.z0) / n;
  for (let i = 0; i < n; i++) b.box(l.x0, 0, l.z0 + i * dz, sx, H + (i % 2) * 1.2, l.z0 + (i + 1) * dz, PAINT[i % PAINT.length], { win, seed: 0.1 + i * 0.17, top: 0x8d8a83 });
  const wing = 10, yard = (l.z1 - l.z0 - 3 * wing) / 2;
  /** An air conditioner on a wall that faces (nx, nz), at a window. */
  const cooler = (x: number, y: number, z: number, nx: number, nz: number): void => {
    if (nz > 0) b.box(x - 0.28, y, z, x + 0.28, y + 0.42, z + 0.32, 0xe6e8ea, { faces: 'ESWTB' });
    else if (nx > 0) b.box(x, y, z - 0.28, x + 0.32, y + 0.42, z + 0.28, 0xe6e8ea, { faces: 'NESTB' });
  };
  for (let w = 0; w < 3; w++) {
    const z0 = l.z0 + w * (wing + yard), z1 = z0 + wing;
    for (let i = 0; i < 3; i++) {
      const x0 = sx + ((l.x1 - sx) * i) / 3, x1 = sx + ((l.x1 - sx) * (i + 1)) / 3;
      b.box(x0, 0, z0, x1, H - 0.8 + ((w + i) % 3) * 0.9, z1, PAINT[(w * 2 + i + 1) % PAINT.length], { win, seed: 0.3 + w * 0.2 + i * 0.11, top: 0x8d8a83 });
    }
    // shops at the foot of its end, under an awning
    b.box(l.x1, 0, z0 + 0.3, l.x1 + 0.06, 2.3, z1 - 0.3, 0xe9e3d6, { win: { cell: 1.6, storey: 2.3, lit: 0.9, kind: 2 }, seed: w * 0.3, faces: 'E' });
    b.box(l.x1, 2.3, z0, l.x1 + 0.9, 2.5, z1, w % 2 ? 0x2f7d5b : 0xc8322b, { faces: 'NESWTB' });
    k.lights.push({ x: l.x1 + 2.5, z: (z0 + z1) / 2, r: 9, color: '#ffe2ae', k: 0.6 });
    // what hangs on the walls that the view can see: the south side, and the end
    for (let j = 0; j < 26; j++) {
      const x = sx + 0.5 + Math.floor(k.rand() * 7) * 0.95, y = 4.3 + Math.floor(k.rand() * 15) * 2.0;
      cooler(x, y, z1, 0, 1);
    }
    for (let j = 0; j < 20; j++) cooler(l.x1, 4.3 + Math.floor(k.rand() * 15) * 2.0, z0 + 0.6 + Math.floor(k.rand() * 9) * 0.95, 1, 0);
  }
  // the two yards: paving, washing on lines from wing to wing, and people looking up
  for (let w = 0; w < 2; w++) {
    const z0 = l.z0 + wing + w * (wing + yard), z1 = z0 + yard;
    b.box(sx, 0, z0, l.x1, 0.06, z1, 0xbfb9ac, { faces: 'T' });
    for (let j = 0; j < 5; j++) {
      const x = sx + 1.0 + j * 1.45, y = 5 + ((j * 7 + w * 3) % 5) * 5.2;
      b.beam([x, y, z0], [x, y, z1], 0.03, 0.03, 0x4a4f55);
      for (let c = 0; c < 5; c++) b.box(x - 0.03, y - 0.75, z0 + 0.7 + c * ((yard - 1.4) / 4) - 0.3, x + 0.03, y, z0 + 0.7 + c * ((yard - 1.4) / 4) + 0.3, CLOTHES[(j + c * 2 + w) % CLOTHES.length], { faces: 'EW' });
    }
    for (let j = 0; j < 12; j++) cooler(sx, 4.3 + Math.floor(k.rand() * 15) * 2.0, z0 + 0.6 + Math.floor(k.rand() * 7) * 0.95, 1, 0);
    for (let i = 0; i < 7; i++) k.person(sx + 0.8 + k.rand() * (l.x1 - sx - 1.2), z0 + 0.8 + k.rand() * (yard - 1.6), 0.06);
    k.lights.push({ x: (sx + l.x1) / 2, z: (z0 + z1) / 2, r: 7, color: '#ffd9a0', k: 0.8 });
  }
};

/**
 * The Noonday Gun: a small naval gun on the quay of the typhoon shelter,
 * inside a white rail, with the bell that is rung before it is fired.
 */
const noondayGun: Model = (k, l) => {
  const b = k.b, { cx, cz } = centre(l), NAVY = 0x3a4250, BRASS = 0xc9a13a;
  b.box(l.x0, 0, l.z0, l.x1, 0.3, l.z1, 0xd6d0c2, { top: 0xcfc8b8 });
  railing(b, l.x0, l.z0, l.x1, l.z1, 0.3, 0xf2efe6, 'NSW', 0.9);
  b.cyl(cx - 0.2, cz, 0.3, 1.0, 0.42, 0.3, 8, NAVY);
  b.beam([cx - 0.55, 1.15, cz], [cx + 1.5, 1.45, cz], 0.2, 0.12, NAVY);
  b.box(cx - 0.8, 1.0, cz - 0.2, cx - 0.45, 1.36, cz + 0.2, BRASS);
  b.box(l.x0 + 0.3, 0.3, l.z1 - 0.5, l.x0 + 0.42, 1.7, l.z1 - 0.38, 0xf2efe6, { faces: 'NESW' });
  b.box(l.x0 + 0.2, 1.45, l.z1 - 0.62, l.x0 + 0.54, 1.8, l.z1 - 0.28, BRASS);
  k.person(cx - 0.6, cz - 0.9, 0.3);
  b.box(cx - 1.05, 0.3, l.z1 + 0.02, cx + 1.05, 1.0, l.z1 + 0.08, 0x3a4250, { faces: 'NESWT' });
  k.sign('noonday-gun', cx, 0.65, l.z1 + 0.1, 0, 1, 0.58, 2.0);
  k.lights.push({ x: cx, z: cz, r: 6, color: '#ffe2ae', k: 0.9 });
};

/** How high the car ferry's deck is, where a hero stands. */
export const FERRY_DECK = 0.9;

/**
 * The car ferry, tied up at its pier with its ramp down: an open deck for
 * cars, with the house, the wheelhouse and the funnel along one side, so that
 * what stands on the deck can be seen. A hero stands there.
 */
const carFerry: Model = (k, l) => {
  const b = k.b, HULL = 0x2f4f7a, WHITE = 0xf2efe6, DECK = 0x6f7780, y = FERRY_DECK;
  const x0 = l.x0 + 0.2, x1 = l.x1, z0 = l.z0 + 0.8, z1 = l.z1 - 0.8;
  const plan: XZ[] = [[x0, z0], [x1 - 1.4, z0], [x1, z0 + 1.3], [x1, z1 - 1.3], [x1 - 1.4, z1], [x0, z1]];
  prism(b, plan, -1.5, y - 0.45, HULL, { top: false });
  prism(b, plan, y - 0.45, y, WHITE, { top: DECK });
  b.box(x0, y, z1 - 0.2, x1 - 1.4, y + 0.8, z1, WHITE);
  b.box(x0, y, z0, x1 - 1.4, y + 0.8, z0 + 0.2, WHITE);
  b.box(x1 - 0.2, y, z0 + 1.3, x1, y + 0.8, z1 - 1.3, WHITE);
  // the house along the north side
  const hx0 = x0 + 3.4, hx1 = x1 - 3.0, hz1 = z0 + 2.0;
  b.box(hx0, y, z0 + 0.2, hx1, y + 4.4, hz1, WHITE, { win: { cell: 1.1, storey: 2.2, lit: 0.7, kind: 0 }, seed: 0.3, top: 0xd9d4c7 });
  b.box(hx0 + 1.6, y + 4.4, z0 + 0.3, hx0 + 4.0, y + 6.1, hz1 - 0.1, WHITE, { win: interior(1.0), top: HULL });
  b.cyl(hx1 - 1.0, z0 + 1.1, y + 4.4, y + 7.2, 0.55, 0.48, 8, 0xe8b93a, { cap: 0x2a2c31 });
  b.cyl(hx1 - 1.0, z0 + 1.1, y + 6.7, y + 7.2, 0.58, 0.52, 8, 0x2a2c31, { cap: false });
  railing(b, hx0, z0 + 0.2, hx1, hz1, y + 4.4, 0xd9dde0, 'ES', 0.8);
  for (let i = 0; i < 3; i++) k.person(hx0 + 0.5 + k.rand() * 1.0, z0 + 0.6 + k.rand() * 1.0, y + 4.4);
  // lanes on the deck, the ramp let down on to the quay, and a gantry with its name over the way on
  const mid = (hz1 + z1 - 0.2) / 2;
  for (const z of [hz1 + 0.15, z1 - 0.47]) b.box(x0 + 0.6, y + 0.01, z, x1 - 2.0, y + 0.03, z + 0.12, 0xf7f4ea, { faces: 'T' });
  slab(b, [x0 + 0.15, y, mid], [x0 - 2.3, 0.07, mid], 2.3, 0.18, DECK);
  for (const z of [mid - 2.9, mid + 2.9]) b.box(x0 - 1.75, 0, z - 0.16, x0 - 1.43, 5.4, z + 0.16, 0x59636d, { faces: 'NESW' });
  b.box(x0 - 1.75, 4.5, mid - 2.9, x0 - 1.43, 5.5, mid + 2.9, 0x2f4f7a, { faces: 'NESWTB' });
  k.sign('car-ferry', x0 - 1.79, 5.0, mid, -1, 0, 0.8, 5.4);
  k.sign('car-ferry', x0 - 1.39, 5.0, mid, 1, 0, 0.8, 5.4);
  k.person(x0 + 1.0, z1 - 0.8, y);
  k.person(x1 - 2.4, hz1 + 0.6, y);
  k.lights.push({ x: (x0 + x1) / 2, z: mid, r: 10, color: '#fff0d6', k: 0.9 });
  k.lights.push({ x: x0 - 3, z: mid, r: 8, color: '#fff0d6', k: 0.7 });
};

/** A line round a course that is two straights and two half circles: `r` from its middle line, the straights `ls` to each side of its middle. It runs clockwise, as the horses do. */
const course = (r: number, step = 2): XZ[] => {
  const R = RACECOURSE, cx = TRACK.cx, cz = (R.z0 + R.z1) / 2, ls = (R.z1 - R.z0) / 2 - TRACK.r, pts: XZ[] = [];
  const turn = Math.max(6, Math.ceil((Math.PI * r) / step)), run = Math.max(2, Math.ceil((2 * ls) / step));
  for (let i = 0; i < run; i++) pts.push([cx + r, cz - ls + (2 * ls * i) / run]);
  for (let i = 0; i < turn; i++) pts.push([cx + Math.cos((Math.PI * i) / turn) * r, cz + ls + Math.sin((Math.PI * i) / turn) * r]);
  for (let i = 0; i < run; i++) pts.push([cx - r, cz + ls - (2 * ls * i) / run]);
  for (let i = 0; i < turn; i++) pts.push([cx - Math.cos((Math.PI * i) / turn) * r, cz - ls - Math.sin((Math.PI * i) / turn) * r]);
  return pts;
};

/** Happy Valley's track: where its middle is, how far out its outer rail is, and how wide the turf is. */
const TRACK = { cx: -69, r: 11, wide: 4 };

/**
 * Happy Valley Racecourse: a ring of turf between white rails, a lawn with a
 * pitch inside it, a grandstand along the west side, floodlights on masts for
 * the races at night, and horses that run.
 */
function racecourse(k: Build): void {
  const b = k.b, R = RACECOURSE, T = TRACK, WHITE = 0xf7f4ea, cz = (R.z0 + R.z1) / 2;
  area(k, [[R.x0, R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1]], 0x86b96a, 0.03);
  area(k, course(T.r), 0x4f9a48, 0.04);
  area(k, course(T.r - T.wide), 0x7fb85f, 0.05);
  for (const r of [T.r, T.r - T.wide]) {
    const line = course(r, 2.4);
    line.forEach((p, i) => {
      const q = line[(i + 1) % line.length];
      b.beam([p[0], 0.85, p[1]], [q[0], 0.85, q[1]], 0.06, 0.06, WHITE);
      b.box(p[0] - 0.06, 0, p[1] - 0.06, p[0] + 0.06, 0.85, p[1] + 0.06, WHITE, { faces: 'NESW' });
    });
  }
  // a pitch on the lawn, and the board that shows the odds
  const px0 = T.cx - 4.2, px1 = T.cx + 4.2, pz0 = cz - 7, pz1 = cz + 7, L = 0.1;
  for (const [x0, z0, x1, z1] of [[px0, pz0, px1, pz0 + L], [px0, pz1 - L, px1, pz1], [px0, pz0, px0 + L, pz1], [px1 - L, pz0, px1, pz1], [px0, cz - L / 2, px1, cz + L / 2]]) b.box(x0, 0.05, z0, x1, 0.075, z1, WHITE, { faces: 'T' });
  b.cyl(T.cx, cz, 0.05, 0.07, 1.6, 1.6, 16, WHITE);
  b.cyl(T.cx, cz, 0.07, 0.08, 1.5, 1.5, 16, 0x7fb85f);
  const bz = cz + 13.5;
  for (const x of [T.cx - 2.6, T.cx + 2.6]) b.box(x - 0.14, 0, bz - 0.14, x + 0.14, 2.2, bz + 0.14, 0x59636d, { faces: 'NESW' });
  b.box(T.cx - 3.3, 2.2, bz - 0.18, T.cx + 3.3, 5.4, bz + 0.18, 0x23252b);
  k.sign('tote', T.cx, 3.8, bz + 0.2, 0, 1, 2.9, 6.3);
  k.sign('tote', T.cx, 3.8, bz - 0.2, 0, -1, 2.9, 6.3);
  // the grandstand: three tiers that step up to the back, boxes of glass behind them, and a roof that reaches forward
  const gx0 = R.x0 + 0.1, gx1 = T.cx - T.r - 0.7, gz0 = cz - 13.5, gz1 = cz + 13.5, tier = (gx1 - gx0) / 3;
  for (let i = 0; i < 3; i++) {
    const x1 = gx1 - i * tier, top = 2.1 * (i + 1);
    b.box(x1 - tier, 0, gz0, x1, top, gz1, 0xd9d4c7, { top: 0xbfb9ac });
    for (let j = 0; j < 22; j++) k.person(x1 - tier + 0.35 + k.rand() * (tier - 0.7), gz0 + 0.5 + k.rand() * (gz1 - gz0 - 1), top);
  }
  b.box(gx0, 6.3, gz0, gx0 + 1.1, 10.6, gz1, 0x8fb4cf, { win: { cell: 1.6, storey: 2.1, lit: 0.9, kind: 1 }, seed: 0.3 });
  b.box(gx0, 10.6, gz0, gx0 + 0.5, 12.4, gz1, 0xe9e6df);
  slab(b, [gx0 - 0.2, 12.5, cz], [gx1 + 1.3, 14.4, cz], (gz1 - gz0) / 2 + 0.6, 0.3, 0xf2efe6, { under: 0xd9d4c7 });
  for (const z of [gz0 + 0.3, cz, gz1 - 0.3]) b.beam([gx0 + 0.25, 12.3, z], [gx1 + 0.9, 13.9, z], 0.16, 0.1, 0x9aa3ab);
  b.box(gx1 + 1.0, 13.3, gz0 + 2, gx1 + 1.3, 14.9, gz1 - 2, 0x1d5a3c, { faces: 'NESWTB' });
  k.sign('happy-valley', gx1 + 1.34, 14.1, cz, 1, 0, 1.3, gz1 - gz0 - 5);
  k.sign('happy-valley', (gx0 + gx1) / 2, 9.3, gz1 + 0.06, 0, 1, 1.1, gx1 - gx0 - 0.4);
  b.box(gx0, 6.3, gz1 - 0.05, gx1, 10.6, gz1, 0xe9e6df, { faces: 'S' });
  for (const z of [gz0 + 5, cz, gz1 - 5]) k.lights.push({ x: gx1 - 1, z, r: 11, color: '#fff0d6', k: 0.9 });
  // floodlights: a mast at each corner, and its pool of light on the turf
  for (const [sx, sz] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    const x = sx > 0 ? R.x1 - 1.2 : T.cx - T.r + 2.2, z = cz + sz * ((R.z1 - R.z0) / 2 - 1.4);
    b.box(x - 0.2, 0, z - 0.2, x + 0.2, 17, z + 0.2, 0x9aa3ab, { faces: 'NESW' });
    b.box(x - 1.3, 17, z - 0.3, x + 1.3, 18.5, z + 0.3, 0x59636d, { faces: 'NESWTB' });
    for (const dx of [-0.8, 0, 0.8]) k.glows.push({ x: x + dx, y: 17.75, z: z - sz * 0.36, sx: 0.55, sy: 1.0, sz: 0.2, color: '#f4fbff' });
    k.lights.push({ x: x - sx * 5, z: z - sz * 9, r: 20, color: '#f4fbff', k: 0.75 });
  }
  // the winning post, and the field
  const wx = T.cx + T.r + 0.5;
  b.box(wx - 0.08, 0, cz - 0.08, wx + 0.08, 3.2, cz + 0.08, WHITE, { faces: 'NESW' });
  b.cyl(wx, cz, 3.2, 4.1, 0.5, 0.5, 8, 0xc8322b, { cap: 0xc8322b });
  const SILKS = [0xc8322b, 0xf2c94c, 0x3f6fb5, 0x2f8f5f, 0xa884d9], COATS = [0x6b4a32, 0x8a5a36, 0xb9b5ac, 0x2e2620, 0x7a4a2a];
  SILKS.forEach((silks, i) => {
    const lane = flat(course(T.r - T.wide / 2 + (i - 2) * 0.62, 1.2), 0.06);
    train(k, pathOf(lane, true), { cars: 1, speed: 13.4 + [0.3, -0.2, 0.5, 0, -0.4][i], car: horse(silks, COATS[i]), from: 3 + i * 1.3 });
  });
}

/**
 * A Symphony of Lights: at night, beams of light from the roofs of the tall
 * buildings on both shores swing to and fro across the sky.
 */
function symphony(k: Build): void {
  const from: [string, string][] = [['ifc', '#7dffb0'], ['bank-of-china', '#ffffff'], ['central-plaza', '#ff8ae0'], ['hsbc', '#9fdcff'], ['icc', '#7dffb0'], ['icc', '#ffffff'], ['hkcec', '#9fdcff'], ['jardine', '#fff1a8']];
  const beams = from.map(([id, color], i) => {
    const l = LOTS.find((q) => q.id === id)!, len = 95;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.12, len, 5, 1, true).translate(0, len / 2, 0), mat), pivot = new THREE.Object3D();
    pivot.position.set((l.x0 + l.x1) / 2, (l.y0 ?? 0) + l.h + (id === 'hkcec' ? 4 : 1), (l.z0 + l.z1) / 2);
    arm.frustumCulled = false;
    pivot.add(arm);
    pivot.visible = false;
    k.group.add(pivot);
    return { arm, pivot, mat, phase: i * 1.7 };
  });
  k.each((_dt, time, night) => {
    const on = Math.max(0, (night - 0.55) / 0.45);
    for (const q of beams) {
      q.pivot.visible = on > 0.01;
      q.mat.opacity = 0.17 * on;
      q.pivot.rotation.y = q.phase + Math.sin(time * 0.21 + q.phase) * 1.1;
      q.arm.rotation.z = 0.5 + 0.35 * Math.sin(time * 0.33 + q.phase * 2);
    }
  });
}

/**
 * A jumbo jet on the old approach to Kai Tak: low over the roofs of Kowloon,
 * round over the harbour, and back again, like a toy aeroplane on a wire.
 */
function kaiTak(k: Build): void {
  const round = rounded([[8, -64], [88, -64], [88, 100], [8, 100]], 24, true, 3);
  const total = lengths(round)[round.length - 1];
  const way = eased(raised(round, through([[0, 68], [total * 0.2, 70], [total * 0.32, 62], [total * 0.55, 42], [total * 0.63, 42], [total * 0.82, 58], [total, 68]])), 22, true);
  train(k, pathOf(way, true), { cars: 1, speed: 15, car: jumbo(), from: total * 0.3 });
}

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

/** A figure of bronze on a plinth, in a fighter's stance: the statue on the Avenue of Stars. */
function statue(b: GeoBuilder, x: number, z: number): void {
  const BRONZE = 0x6d5a3a, y = 1.1;
  b.box(x - 0.9, 0, z - 0.9, x + 0.9, y, z + 0.9, 0x4a4f55, { top: 0x59636d });
  b.beam([x - 0.1, y + 1.5, z + 0.1], [x - 0.6, y, z + 0.6], 0.18, 0.2, BRONZE);
  b.beam([x + 0.1, y + 1.5, z - 0.1], [x + 0.55, y, z - 0.6], 0.18, 0.2, BRONZE);
  b.box(x - 0.36, y + 1.4, z - 0.3, x + 0.36, y + 2.7, z + 0.3, BRONZE);
  b.beam([x + 0.3, y + 2.5, z + 0.2], [x + 1.1, y + 2.35, z + 0.75], 0.14, 0.12, BRONZE);
  b.beam([x - 0.3, y + 2.5, z - 0.2], [x - 0.75, y + 1.9, z - 0.55], 0.14, 0.12, BRONZE);
  b.box(x - 0.24, y + 2.7, z - 0.24, x + 0.24, y + 3.25, z + 0.24, BRONZE);
}

/**
 * The Avenue of Stars, along Tsim Sha Tsui's waterfront: a rail by the water,
 * a brass star set in the paving every few steps, the statue, and the figure
 * from the film awards at its north end.
 */
function avenueOfStars(k: Build): void {
  const b = k.b, A = AVENUE, RAIL = 0xd9dde0;
  b.box(A.x0, 0.95, A.z0, A.x0 + 0.12, 1.12, A.z1, RAIL, { faces: 'NESWTB' });
  for (let z = A.z0; z <= A.z1; z += 2.4) b.box(A.x0, 0, z, A.x0 + 0.12, 0.95, z + 0.12, RAIL, { faces: 'NESW' });
  for (let z = A.z0 + 3; z < A.z1 - 1; z += 2.6) {
    if (Math.abs(z - A.statue) < 2.2) continue;
    b.obox(A.stars, 0.05, z, 0.42, 0.03, 0.42, Math.PI / 4, 0xc9a13a);
    b.obox(A.stars, 0.07, z, 0.22, 0.03, 0.22, 0, 0xe8c85a);
  }
  statue(b, A.stars, A.statue);
  // the figure from the film awards: slim and tall, holding a pearl up, on a drum of steps
  const fz = A.z0 + 1.6;
  b.cyl(A.stars, fz, 0, 0.5, 1.3, 1.3, 10, 0x4a4f55, { cap: 0x59636d });
  b.cyl(A.stars, fz, 0.5, 4.0, 0.3, 0.16, 6, 0xc9a13a, { cap: false });
  b.beam([A.stars, 3.6, fz], [A.stars + 0.3, 4.9, fz], 0.1, 0.08, 0xc9a13a);
  b.box(A.stars + 0.08, 4.85, fz - 0.24, A.stars + 0.56, 5.33, fz + 0.24, 0xf2e6c4, { win: interior(1.2), faces: 'NESWTB' });
  // two kiosks, and a lamp over each of the monuments
  for (const z of [A.z0 + 14, A.z1 - 12]) {
    b.box(A.x1 - 2.1, 0, z, A.x1 - 0.3, 2.5, z + 2.6, 0xe9e6df, { win: { cell: 1.3, storey: 2.5, lit: 0.9, kind: 2 }, top: 0xc8322b });
    b.box(A.x1 - 2.6, 2.5, z - 0.3, A.x1 - 0.1, 2.7, z + 2.9, 0xc8322b);
    k.lights.push({ x: A.x1 - 2.5, z: z + 1.3, r: 7, color: '#ffe2ae', k: 0.7 });
  }
  k.lights.push({ x: A.stars, z: A.statue, r: 7, color: '#ffe2ae', k: 0.9 });
  k.lights.push({ x: A.stars, z: fz, r: 7, color: '#ffe2ae', k: 0.9 });
}

/** The Avenue of Stars: between `x0`, the water's edge, and `x1`; where its stars are set, and where the statue stands. */
export const AVENUE = { x0: 22.5, x1: 28, z0: 0, z1: 60.5, stars: 24.2, statue: 24 };

/**
 * The crag on Lion Rock: a lion of bare rock lying along the ridge, seen from
 * its side as Kowloon sees it, with its head to the right. It is one outline,
 * from the tip of its tail to its paws, and as wide at each point as a lion
 * is there.
 */
function lionCrag(k: Build): void {
  const b = k.b, ROCKS = [0xa08f72, 0x938468, 0xab9a7c, 0x8a7b60, 0x9c8c70];
  const G = groundAt(94, LION.ridge), bottom = G - 9;
  // from the tail to the paws: [x, how high above the ridge, half its width, how far south of the ridge's middle]
  const S: [number, number, number, number][] = [
    [84.6, -0.4, 0.6, 0.7], [85.9, 3.0, 2.0, 0.4], [87.9, 5.2, 3.0, 0.2], [90.6, 3.2, 2.5, -0.1], [93.4, 3.4, 2.5, 0],
    [95.0, 6.2, 3.0, 0.1], [96.2, 9.2, 2.5, 0], [98.4, 9.6, 2.2, 0], [99.2, 7.2, 1.6, 0], [100.4, 6.4, 1.3, 0],
    [100.7, 2.4, 2.2, 0], [102.5, 1.6, 2.4, 0], [103.5, -1.2, 2.1, 0],
  ];
  const at = (i: number, side: number, y?: number): V3 => [S[i][0], y ?? G + S[i][1], LION.ridge + S[i][3] + side * S[i][2]];
  for (let i = 0; i < S.length - 1; i++) {
    const rock = ROCKS[i % ROCKS.length];
    slope3(b, at(i, -1), at(i, 1), at(i + 1, 1), rock);
    slope3(b, at(i, -1), at(i + 1, 1), at(i + 1, -1), rock);
    for (const side of [-1, 1]) {
      const p = at(i, side), q = at(i + 1, side), len = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1;
      let nx = (q[2] - p[2]) / len, nz = -(q[0] - p[0]) / len;
      if (nz * side < 0) { nx = -nx; nz = -nz; }
      b.quad(at(i, side, bottom), at(i + 1, side, bottom), q, p, [nx, 0, nz], ROCKS[(i + (side > 0 ? 2 : 3)) % ROCKS.length]);
    }
  }
  const last = S.length - 1;
  b.quad(at(0, -1, bottom), at(0, 1, bottom), at(0, 1), at(0, -1), [-1, 0, 0], ROCKS[1]);
  b.quad(at(last, -1, bottom), at(last, 1, bottom), at(last, 1), at(last, -1), [1, 0, 0], ROCKS[2]);
}

/** Ground that is kept clear of trees, though it is nobody's lot: [x0, z0, x1, z1]. */
export const OPEN: [number, number, number, number][] = [[-85, -111.5, -78.6, -103], [-73.4, -113, -60.8, -99.4], [83.5, LION.ridge - 4.6, 104, LION.ridge + 4.6]];

/** What stands on the tile that is not on a lot of its own. */
export function extras(k: Build): void {
  peakTramFoot(k);
  escalator(k);
  avenueOfStars(k);
  lionCrag(k);
  racecourse(k);
  symphony(k);
  kaiTak(k);
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
  'clock-tower': clockTower,
  'star-ferry': starFerryPier,
  'cultural-centre': culturalCentre,
  'space-museum': spaceMuseum,
  peninsula,
  icc,
  'wong-tai-sin': wongTaiSin,
  bamboo,
  coliseum,
  'choi-hung-a': estate,
  'choi-hung-b': estate,
  'choi-hung-park': courts,
  'night-market': nightMarket,
  monster,
  'noonday-gun': noondayGun,
  'car-ferry': carFerry,
};
