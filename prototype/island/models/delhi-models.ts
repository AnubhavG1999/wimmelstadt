// Delhi's own landmarks, made the same way as the monuments in landmark-models.ts:
// a few dozen boxes, cylinders and flat leaves each, enough for the silhouette.
// What each looks like, and where its parts lie, follows the notes in
// docs/districts/research.
//
// Several of them are tombs, memorials or places of worship. They are drawn
// plainly, nothing drives over them and nothing is parked on them.

import { interior, type GeoBuilder, type V3, type WinSpec } from '../look/geo.ts';
import type { LandmarkCtx } from './landmark-models.ts';

const RED = 0xb5553c, BUFF = 0xdcc096, BUFF_SHADE = 0xcbb085, MARBLE = 0xf3efe6;
const RUBBLE = 0x9a8f80, RUBBLE_LIGHT = 0xb5ab98, LIME = 0xc9c0b0, RECESS = 0x6a5f52;
const LAWN = 0x79b35f, WATER = 0x6fb7d9;

/** A dome, turned from a profile of [height, radius] pairs. */
function turned(b: GeoBuilder, cx: number, cz: number, profile: [number, number][], sides: number, color: number, win?: WinSpec): void {
  for (let i = 0; i < profile.length - 1; i++) {
    const [y0, r0] = profile[i], [y1, r1] = profile[i + 1];
    b.cyl(cx, cz, y0, y1, r0, r1, sides, color, { win, cap: i === profile.length - 2 ? color : false });
  }
}

/** A chhatri: a small dome on four posts. */
function chhatri(b: GeoBuilder, x: number, y: number, z: number, half: number, post: number, stone: number, dome: number): void {
  const t = Math.max(0.14, half * 0.13);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.box(x + sx * half - t, y, z + sz * half - t, x + sx * half + t, y + post, z + sz * half + t, stone, { faces: 'NESW' });
  }
  b.box(x - half - 0.25, y + post, z - half - 0.25, x + half + 0.25, y + post + 0.22, z + half + 0.25, stone, { faces: 'NESWTB' });
  const top = y + post + 0.22;
  turned(b, x, z, [[top, half * 1.05], [top + half * 0.35, half * 1.08], [top + half * 0.85, half * 0.6], [top + half * 1.1, 0.06]], 8, dome);
}

/**
 * Hauz Khas: Firoz Shah's tomb at the corner of the royal tank, and the two
 * arms of the madrasa that run from it along the water. It is built round the
 * tomb: one arm runs west and the other north, and the tank lies in the angle
 * between them.
 */
export function hauzKhas({ b, lights }: LandmarkCtx): void {
  const arches: WinSpec = { cell: 1.7, storey: 2.9, lit: 0.1, kind: 6 };
  // everything starts below the ground, because the bank falls away towards the water
  const FOOT = -2.6;

  // the tomb: square and thick-walled, leaning in a little, under a shallow dome
  b.cyl(0, 0, FOOT, 5.6, 5.5, 4.9, 4, RUBBLE, { phase: Math.PI / 4, cap: RUBBLE_LIGHT });
  b.box(-3.75, 5.6, -3.75, 3.75, 6.05, 3.75, RED);
  b.cyl(0, 0, 6.05, 6.9, 3.4, 3.4, 8, RUBBLE_LIGHT, { cap: false });
  turned(b, 0, 0, [[6.9, 3.4], [7.8, 3.2], [8.8, 2.45], [9.5, 1.3], [9.85, 0.12]], 12, LIME);
  // its door, on the south side, in a frame of red stone
  b.box(-1.35, 0, 3.7, 1.35, 3.7, 3.86, RED, { faces: 'ESWT' });
  b.box(-0.8, 0, 3.86, 0.8, 2.9, 3.9, RECESS, { faces: 'S' });

  // the madrasa: two long arms, two storeys of arches each, with a string of small domes along the roof
  const arm = (x0: number, z0: number, x1: number, z1: number, seed: number): void => {
    b.box(x0, FOOT, z0, x1, 5.4, z1, RUBBLE, { win: arches, seed, top: RUBBLE_LIGHT });
    b.box(x0 - 0.12, 2.62, z0 - 0.12, x1 + 0.12, 2.95, z1 + 0.12, RUBBLE_LIGHT, { faces: 'NESW' });
    b.box(x0 - 0.12, 5.4, z0 - 0.12, x1 + 0.12, 5.75, z1 + 0.12, RUBBLE_LIGHT, { faces: 'NESW' });
  };
  arm(-31, -2.3, -4.6, 2.3, 0.31);
  arm(-2.3, -24, 2.3, -4.6, 0.57);
  const bump: [number, number][] = [[5.4, 1.5], [5.9, 1.55], [6.6, 0.9], [6.9, 0.08]];
  for (const x of [-10, -17.5, -25]) turned(b, x, 0, bump, 8, LIME);
  for (const z of [-10.5, -17.5]) turned(b, 0, z, bump, 8, LIME);
  // a pavilion at the far end of each arm, looking over the water
  chhatri(b, -29.6, 5.4, 0, 1.25, 1.7, RUBBLE_LIGHT, LIME);
  chhatri(b, 0, 5.4, -22.6, 1.25, 1.7, RUBBLE_LIGHT, LIME);
  // steps down to the water, in the angle
  for (let i = 0; i < 4; i++) {
    b.box(-23, FOOT, -2.3 - (i + 1) * 1.0, -9, -0.15 - i * 0.42, -2.3 - i * 1.0, RUBBLE_LIGHT, { faces: 'NEWT' });
  }
  lights.push({ x: -16, z: -6, r: 14, color: '#ffd9a0', k: 0.4 });
}

/** The Qutub Minar: a tapering tower of red stone in five storeys, each ending in a balcony, the top two faced in marble. */
export function qutubMinar({ b, lights }: LandmarkCtx): void {
  const g = interior(0.32);
  b.cyl(0, 0, 0, 0.5, 6.2, 6.2, 16, 0xcfc4ae);
  const storeys: [number, number, number, number, number, number][] = [
    [0.5, 16.5, 3.7, 2.95, RED, BUFF],
    [16.5, 26, 2.8, 2.3, RED, BUFF],
    [26, 33, 2.15, 1.8, RED, BUFF],
    [33, 38.2, 1.65, 1.45, MARBLE, RED],
    [38.2, 42.6, 1.35, 1.15, MARBLE, RED],
  ];
  for (const [y0, y1, r0, r1, stone, band] of storeys) {
    b.cyl(0, 0, y0, y1, r0, r1, 16, stone, { win: g, cap: false });
    // bands of carved writing round the shaft
    for (const f of [0.3, 0.62]) {
      const y = y0 + (y1 - y0) * f, r = r0 + (r1 - r0) * f + 0.05;
      b.cyl(0, 0, y, y + 0.5, r, r - 0.02, 16, band, { win: g, cap: false });
    }
    // the balcony at its head: the shaft swells out to carry a floor and a rail
    b.cyl(0, 0, y1 - 0.9, y1, r1, r1 + 0.8, 16, stone, { win: g, cap: false });
    b.cyl(0, 0, y1, y1 + 0.5, r1 + 0.85, r1 + 0.85, 16, band, { win: g, cap: band });
  }
  b.cyl(0, 0, 43.1, 44.2, 0.85, 0.45, 8, MARBLE, { win: g, cap: MARBLE });
  b.cyl(0, 0, 44.2, 45.6, 0.12, 0.03, 5, 0xd9b24a, { cap: false });
  lights.push({ x: 0, z: 0, r: 12, color: '#ffc38a', k: 0.5 });
}

/**
 * India Gate: a tall arch of pale sandstone with a shallow bowl on its top, and
 * the empty canopy that stands beyond it. Built to be passed through along z.
 */
export function indiaGate({ b, lights }: LandmarkCtx): void {
  const g = interior(0.42);
  b.box(-10.2, 0, -4.6, 10.2, 0.35, 4.6, 0xd8cfbb);
  // two piers, and the head of the arch between them
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -8.4 : 3.2, x1 = s < 0 ? -3.2 : 8.4;
    b.box(x0, 0.35, -3, x1, 15, 3, BUFF, { win: g });
    // a tall niche on each face, and a small arch through the side
    for (const f of [-1, 1]) b.box(x0 + 1.3, 1.4, f < 0 ? -3.07 : 3, x1 - 1.3, 8, f < 0 ? -3 : 3.07, BUFF_SHADE, { faces: f < 0 ? 'N' : 'S' });
    b.box(s < 0 ? -8.47 : 8.4, 0.35, -1.2, s < 0 ? -8.4 : 8.47, 6.4, 1.2, RECESS, { faces: s < 0 ? 'W' : 'E' });
    // the haunches of the arch
    b.box(s < 0 ? -3.2 : 2.3, 12.2, -3, s < 0 ? -2.3 : 3.2, 13.7, 3, BUFF, { win: g, faces: 'NESWB' });
    b.box(s < 0 ? -2.3 : 1.2, 13.1, -3, s < 0 ? -1.2 : 2.3, 13.7, 3, BUFF, { win: g, faces: 'NESWB' });
  }
  b.box(-3.2, 13.7, -3, 3.2, 15, 3, BUFF, { win: g, faces: 'NSB' });
  b.box(-8.9, 15, -3.4, 8.9, 15.7, 3.4, BUFF_SHADE, { faces: 'NESWTB' });
  // the attic, stepping in twice, and the bowl
  b.box(-7.6, 15.7, -2.7, 7.6, 18.6, 2.7, BUFF, { win: g });
  b.box(-6.2, 18.6, -2.3, 6.2, 20.2, 2.3, BUFF, { win: g });
  b.box(-6.6, 20.2, -2.6, 6.6, 20.6, 2.6, BUFF_SHADE, { faces: 'NESWTB' });
  b.cyl(0, 0, 20.6, 21.3, 1.5, 2.3, 12, BUFF_SHADE, { cap: 0x8a7a66 });

  // the canopy, a little way beyond
  const cz = 17;
  b.cyl(0, cz, 0, 0.4, 3.1, 3.1, 8, 0xd8cfbb);
  chhatri(b, 0, 0.4, cz, 1.7, 5.6, BUFF, BUFF_SHADE);
  lights.push({ x: 0, z: 0, r: 16, color: '#ffe2ae', k: 0.5 });
}

/**
 * The Lotus Temple: twenty-seven white leaves in three rings of nine, standing
 * in a lawn with nine pools round it.
 */
export function lotusTemple({ b, lights }: LandmarkCtx): void {
  const SHELL = 0xf6f3ec, g = interior(0.5);
  b.cyl(0, 0, 0, 0.04, 21, 21, 36, LAWN);
  b.cyl(0, 0, 0.04, 0.5, 13.4, 13.4, 27, 0xe6dfd0);
  b.cyl(0, 0, 0.5, 0.9, 9.8, 9.8, 27, 0xefe9dc);
  const at = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
  /** One flat piece of a leaf, seen from both sides. */
  const piece = (p0: V3, p1: V3, p2: V3, p3: V3): void => {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    b.quad(p0, p1, p2, p3, [nx, ny, nz], SHELL, { win: g });
    b.quad(p0, p1, p2, p3, [-nx, -ny, -nz], SHELL, { win: g });
  };
  /**
   * A leaf: broad at its foot, swelling outwards a little above the middle, and
   * drawn in to a point. `swell` is how far it bellies out from the straight line
   * between its foot and its point.
   */
  const leaf = (a: number, half: number, r: number, y: number, tipR: number, tipY: number, swell: number): void => {
    const f = 0.55, rm = r + (tipR - r) * f + swell, ym = y + (tipY - y) * f;
    const fl = at(a - half, r, y), fr = at(a + half, r, y), ml = at(a - half * 0.74, rm, ym), mr = at(a + half * 0.74, rm, ym), tip = at(a, tipR, tipY);
    piece(fl, fr, mr, ml);
    piece(ml, mr, tip, tip);
  };
  const step = (Math.PI * 2) / 9;
  for (let k = 0; k < 9; k++) {
    const a = k * step;
    leaf(a, 0.3, 8.8, 0.5, 12.2, 5.2, 0.5); // the entrance leaves open outwards
    leaf(a + step / 2, 0.33, 8.6, 0.9, 4.6, 9.6, 1.5); // the outer leaves lean in over the hall
    leaf(a, 0.34, 5.9, 0.9, 1.2, 13.2, 1.4); // the inner leaves close over it like a bud
    const [px, , pz] = at(a + step / 2, 17, 0);
    b.cyl(px, pz, 0.04, 0.14, 2.9, 2.9, 12, 0xd9d2c3);
    b.cyl(px, pz, 0.14, 0.2, 2.5, 2.5, 12, WATER);
  }
  lights.push({ x: 0, z: 0, r: 22, color: '#f4f0e6', k: 0.5 });
}

/**
 * The Red Fort: its long front wall with the Lahori Gate in the middle, and the
 * rest of the walls round a lawn with two marble halls. Built with the gate
 * facing +z.
 */
export function redFort({ b, lights }: LandmarkCtx): void {
  const WALL = 0xa8452f, DARK = 0x8f3a28;
  const g = interior(0.28);
  const W = 28, D = 19, H = 8.5; // half the length of the front, half the depth, and the height of the walls
  b.box(-W + 1, 0, -D + 1, W - 1, 0.04, D - 1, LAWN, { faces: 'T' });
  const wall = (x0: number, z0: number, x1: number, z1: number): void => b.box(x0, -2, z0, x1, H, z1, WALL, { win: g, top: DARK });
  wall(-W, D - 2.4, W, D);
  wall(-W, -D, W, -D + 2.4);
  wall(-W, -D + 2.4, -W + 2.4, D - 2.4);
  wall(W - 2.4, -D + 2.4, W, D - 2.4);
  // teeth along the top of the front
  for (let x = -W + 0.7; x < W - 1.2; x += 1.9) b.box(x, H, D - 0.55, x + 1.05, H + 0.9, D, WALL, { faces: 'NESWT' });
  // a tower at each corner, under a small white dome
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.cyl(sx * W, sz * D, -2, H + 2.2, 3.1, 2.9, 8, WALL, { win: g, cap: DARK });
    chhatri(b, sx * W, H + 2.2, sz * D, 1.5, 1.6, WALL, MARBLE);
  }
  // the Lahori Gate: a tall block in the middle of the front, between two eight-sided towers
  b.box(-6, -2, D - 4.2, 6, 13, D + 1.6, WALL, { win: g, top: DARK });
  b.box(-2.4, 0, D + 1.6, 2.4, 8.2, D + 1.67, RECESS, { faces: 'S' });
  for (const s of [-1, 1]) {
    b.cyl(s * 6.7, D + 1.0, -2, 15.5, 2.5, 2.3, 8, WALL, { win: g, cap: DARK });
    chhatri(b, s * 6.7, 15.5, D + 1.0, 1.6, 1.8, WALL, MARBLE);
  }
  // seven small white domes in a row over the gate
  for (let i = -3; i <= 3; i++) turned(b, i * 1.45, D + 0.9, [[13, 0.55], [13.3, 0.58], [13.8, 0.3], [14.0, 0.04]], 6, MARBLE);
  // the flag over the gate
  b.cyl(0, D - 1.2, 13, 21, 0.12, 0.08, 5, 0xd9d9d9, { cap: false });
  for (const [y, colour] of [[19.7, 0xff9933], [19.1, 0xffffff], [18.5, 0x138808]]) {
    b.box(0.1, y, D - 1.24, 3.2, y + 0.6, D - 1.16, colour, { faces: 'NS' });
  }
  // two marble halls on the lawn
  const hall: WinSpec = { cell: 1.3, storey: 3.4, lit: 0.3, kind: 6 };
  b.box(-11, 0, -9, -2, 3.4, -4, MARBLE, { win: hall, seed: 0.4, top: 0xe6e0d2 });
  b.box(5, 0, -11, 16, 3.0, -6.5, MARBLE, { win: hall, seed: 0.6, top: 0xe6e0d2 });
  lights.push({ x: 0, z: D + 4, r: 18, color: '#ffc8a0', k: 0.5 });
}

/**
 * Rashtrapati Bhavan: a long palace of red and cream stone with a great dome
 * over its middle, a row of columns along its front and a wing at either end.
 * Built facing +z, with the Jaipur Column in its forecourt.
 */
export function rashtrapatiBhavan({ b, lights }: LandmarkCtx): void {
  const CREAM = 0xe9d9b8, ROOF = 0xcfc4ae, FOOT = -8;
  const tall: WinSpec = { cell: 1.5, storey: 5.2, lit: 0.35, kind: 6 };
  // each part has a red base, cream storeys above it, and a deep red eave
  const part = (x0: number, z0: number, x1: number, z1: number, seed: number): void => {
    b.box(x0, FOOT, z0, x1, 2.2, z1, RED, { faces: 'NESW' });
    b.box(x0, 2.2, z0, x1, 7.4, z1, CREAM, { win: tall, seed, top: ROOF });
    b.box(x0 - 0.35, 7.4, z0 - 0.35, x1 + 0.35, 7.85, z1 + 0.35, RED, { faces: 'NESWTB' });
    // the flat roof inside the eave
    b.box(x0 + 0.5, 7.85, z0 + 0.5, x1 - 0.5, 7.97, z1 - 0.5, ROOF);
  };
  part(-22, -4, 22, 4, 0.3);
  part(-22, 4, -15, 12, 0.5);
  part(15, 4, 22, 12, 0.7);
  // the row of columns in the middle of the front, on its steps
  b.box(-6.6, FOOT, 4, 6.6, 2.2, 6.8, RED);
  for (let i = -4; i <= 4; i++) b.box(i * 1.4 - 0.24, 2.2, 5.6, i * 1.4 + 0.24, 7.0, 6.08, CREAM, { faces: 'NESW' });
  b.box(-6.6, 7.0, 4, 6.6, 7.85, 6.4, CREAM, { faces: 'NESWTB' });
  // the dome on its drum
  b.cyl(0, 0, 7.97, 9.2, 5.6, 5.6, 16, CREAM, { cap: ROOF });
  b.cyl(0, 0, 9.2, 12.4, 4.4, 4.4, 16, CREAM, { win: { cell: 1.1, storey: 3.2, lit: 0.5, kind: 6 }, seed: 0.2, cap: false });
  b.cyl(0, 0, 12.4, 12.9, 4.8, 4.8, 16, RED);
  turned(b, 0, 0, [[12.9, 4.5], [14.2, 4.3], [15.6, 3.4], [16.6, 2.0], [17.1, 0.4]], 16, 0x4f5358);
  b.cyl(0, 0, 17.1, 19, 0.14, 0.04, 5, 0xd9b24a, { cap: false });
  for (const [x, z] of [[-10, 0], [10, 0], [-18.5, 8], [18.5, 8]]) chhatri(b, x, 7.97, z, 1.3, 1.5, CREAM, RED);
  // the forecourt, and the Jaipur Column in the middle of it
  b.box(-15, FOOT, 12, 15, 0.12, 30, 0xd8cfbb, { faces: 'ESWT' });
  b.cyl(0, 22, 0.12, 9.6, 0.45, 0.3, 8, CREAM, { cap: false });
  b.cyl(0, 22, 9.6, 10.3, 0.75, 0.2, 6, 0xd9b24a);
  lights.push({ x: 0, z: 10, r: 22, color: '#ffe2ae', k: 0.5 });
}

/** Connaught Place: white blocks with colonnades, bent in a ring round a circular park, with a road out between each pair like a spoke. */
export function connaughtPlace({ b, lights }: LandmarkCtx): void {
  const WHITE = 0xf2efe6;
  const colonnade: WinSpec = { cell: 1.05, storey: 2.9, lit: 0.55, kind: 6 };
  b.cyl(0, 0, 0, 0.05, 22.5, 22.5, 40, 0x6c717c);
  b.cyl(0, 0, 0.05, 0.12, 8.6, 8.6, 28, LAWN);
  b.cyl(0, 0, 0.12, 0.5, 1.7, 1.7, 12, 0xd8cfbb);
  b.cyl(0, 0, 0.5, 0.56, 1.3, 1.3, 12, WATER);
  /** A straight piece of a block: `deep` from the circle outwards, `long` along it. */
  const piece = (a: number, r: number, deep: number, long: number, seed: number): void => {
    const c = Math.cos(a), s = Math.sin(a), x = c * r, z = s * r, y1 = 5.8;
    const at = (lx: number, y: number, lz: number): V3 => [x + lx * c - lz * s, y, z + lx * s + lz * c];
    const to = (lx: number, lz: number): V3 => [lx * c - lz * s, 0, lx * s + lz * c];
    const q = { win: colonnade, seed };
    b.quad(at(-deep, 0, long), at(deep, 0, long), at(deep, y1, long), at(-deep, y1, long), to(0, 1), WHITE, { ...q, L: deep * 2 });
    b.quad(at(deep, 0, -long), at(-deep, 0, -long), at(-deep, y1, -long), at(deep, y1, -long), to(0, -1), WHITE, { ...q, L: deep * 2 });
    b.quad(at(deep, 0, long), at(deep, 0, -long), at(deep, y1, -long), at(deep, y1, long), to(1, 0), WHITE, { ...q, L: long * 2 });
    b.quad(at(-deep, 0, -long), at(-deep, 0, long), at(-deep, y1, long), at(-deep, y1, -long), to(-1, 0), WHITE, { ...q, L: long * 2 });
    b.quad(at(-deep, y1, long), at(deep, y1, long), at(deep, y1, -long), at(-deep, y1, -long), [0, 1, 0], 0xd9d4ca);
  };
  const blocks = 6, open = 0.2, each = 4;
  for (let k = 0; k < blocks; k++) {
    const a0 = (k / blocks) * Math.PI * 2 + open / 2, a1 = ((k + 1) / blocks) * Math.PI * 2 - open / 2;
    const half = (a1 - a0) / each / 2, r = 15.4;
    for (let i = 0; i < each; i++) piece(a0 + (i * 2 + 1) * half, r, 2.7, r * Math.tan(half) * 1.08, 0.15 + k * 0.11);
  }
  lights.push({ x: 0, z: 0, r: 24, color: '#fff0d6', k: 0.5 });
}
