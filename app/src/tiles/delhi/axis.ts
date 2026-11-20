// The axis: Rashtrapati Bhavan and the Jaipur Column on Raisina Hill, North
// Block and South Block, Vijay Chowk, Kartavya Path between its lawns and
// canals, India Gate, the canopy and the National War Memorial.
//
// Everything here looks east, down the avenue, as it does in life. India Gate
// is a war memorial, the canopy holds a memorial statue, and the War Memorial
// is what its name says: they are drawn plainly, nothing drives through them
// and no hero is put on show near them.

import { interior, type WinSpec } from '../../engine/geo';
import { area, oval, rect } from '../../engine/ground';
import { figure, lathe } from '../../engine/parts';
import type { Build } from '../../engine/tile';
import { BUFF, BUFF_SHADE, CREAM, GOLD, MARBLE, RECESS, RED, RED_DARK, RED_LIGHT, arcade, archThrough, chhatri, dome, drum, niche, steps, tiranga } from './mughal';
import { AXIS_Z, HEX, RAISINA, type Thing } from './plan';

const GRAVEL = 0xc9906f, COPPER = 0x4b5257, STONE = 0xd8cfbb, CANAL = 0x7fa6a0;
/** Two storeys of tall windows, as on all three buildings on the hill. Their walls start a whole number of storeys above the ground. */
const TALL: WinSpec = { cell: 1.45, storey: 2.7, lit: 0.42, kind: 6 };
const BASE = 2.4, BODY = 5.4;

/** A wing of the palace or of a Block: a red base, two cream storeys, a deep red eave and a parapet. `y` is the hill's top. */
function wing(k: Build, x0: number, z0: number, x1: number, z1: number, y: number, seed: number, faces = 'NESW'): number {
  const b = k.b, y1 = y + BASE, y2 = y1 + BODY;
  b.box(x0, y, z0, x1, y1, z1, RED, { faces });
  b.box(x0 - 0.12, y1 - 0.25, z0 - 0.12, x1 + 0.12, y1, z1 + 0.12, RED_DARK, { faces: 'NESW' });
  b.box(x0, y1, z0, x1, y2, z1, CREAM, { win: TALL, seed, faces });
  // the chajja: a deep eave that throws a shadow, with its underside
  b.box(x0 - 0.5, y2, z0 - 0.5, x1 + 0.5, y2 + 0.3, z1 + 0.5, RED, { faces: 'NESWTB' });
  b.box(x0, y2 + 0.3, z0, x1, y2 + 0.95, z1, CREAM, { top: 0xcfc4ae });
  return y2 + 0.95;
}

function rashtrapatiBhavan(k: Build, t: Thing): void {
  const b = k.b, y = t.y ?? 0, x0 = t.x + 0.5, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, cz = (z0 + z1) / 2;
  const xm = x0 + 7.5; // the front of the main block: the two wings reach forward from here
  const roof = wing(k, x0, z0, xm, z1, y, 0.3);
  wing(k, xm, z0, x1, z0 + 8, y, 0.5, 'NES');
  wing(k, xm, z1 - 8, x1, z1, y, 0.7, 'ESN');

  // the portico in the middle of the front: twelve columns on a floor at the head of the steps, and deep shade behind them
  const p0 = cz - 9, p1 = cz + 9, floor = y + BASE, head = floor + BODY - 0.7, px = xm + 2.6;
  b.box(xm, y, p0, px, floor, p1, RED, { faces: 'ENS' });
  b.box(xm + 0.04, floor, p0 + 0.3, xm + 0.1, head, p1 - 0.3, RECESS, { win: interior(0.9), faces: 'E' });
  for (let i = 0; i < 12; i++) {
    const z = p0 + 0.6 + (i / 11) * (p1 - p0 - 1.2);
    b.box(px - 0.75, floor, z - 0.26, px - 0.23, head, z + 0.26, CREAM, { faces: 'NESW' });
  }
  b.box(xm, head, p0, px, head + 0.7, p1, CREAM, { faces: 'ENSB' });
  b.box(xm - 0.1, head + 0.7, p0 - 0.4, px + 0.45, head + 1.0, p1 + 0.4, RED, { faces: 'NESWTB' });
  b.box(xm, head + 1.0, p0, px, head + 1.65, p1, CREAM, { top: 0xcfc4ae });
  steps(b, 'E', px, cz - 7.5, cz + 7.5, y, floor, 7, 0.42, STONE);
  // arcades at the foot of the two wings, towards the forecourt
  arcade(b, 'E', x1, z0 + 0.8, z0 + 7.2, y + 0.1, 3, 1.9, RECESS, { round: true, lit: 0.5 });
  arcade(b, 'E', x1, z1 - 7.2, z1 - 0.8, y + 0.1, 3, 1.9, RECESS, { round: true, lit: 0.5 });

  // the dome: a square stage, a drum ringed with arches, a railing as at Sanchi, and the dark copper dome
  const dx = x0 + 4.9;
  b.box(dx - 4.8, roof - 0.3, cz - 5.6, dx + 4.8, roof + 1.0, cz + 5.6, CREAM, { top: 0xcfc4ae });
  b.cyl(dx, cz, roof + 1.0, roof + 1.5, 4.75, 4.75, 16, RED, { cap: 0xcfc4ae });
  drum(b, dx, cz, roof + 1.5, roof + 4.3, 4.1, CREAM, { sides: 16, arches: 16, lit: 0.8 });
  b.cyl(dx, cz, roof + 4.3, roof + 4.7, 4.6, 4.6, 16, RED, { cap: CREAM });
  b.cyl(dx, cz, roof + 4.7, roof + 5.3, 4.15, 4.15, 16, CREAM, { cap: false });
  const top = dome(b, dx, roof + 5.3, cz, 4.0, COPPER, { kind: 'round', sides: 16, tall: 1.12, finial: false });
  b.cyl(dx, cz, top - 0.05, top + 0.5, 0.5, 0.35, 8, COPPER);
  tiranga(b, dx, cz, top + 0.5, 3.2, 2.1, 1.4);
  // chhatris and the saucer fountains on the roof
  for (const [cx, z] of [[dx, cz - 10.5], [dx, cz + 10.5], [x1 - 2, z0 + 4], [x1 - 2, z1 - 4]]) chhatri(b, cx, roof, z, 1.15, 1.35, CREAM, RED);
  for (const z of [cz - 16.5, cz + 16.5]) {
    lathe(b, dx, z, [[0.3, roof], [0.5, roof + 0.5], [1.6, roof + 0.9]], 10, CREAM);
    b.cyl(dx, z, roof + 0.85, roof + 0.9, 1.5, 1.5, 10, CANAL);
  }

  // the forecourt, the Jaipur Column in the middle of it, and the railings along its front
  const fx = RAISINA_GATE;
  area(k, rect(x1, z0, fx, z1), GRAVEL, y + 0.02);
  const jx = (x1 + fx) / 2;
  b.box(jx - 1.3, y, cz - 1.3, jx + 1.3, y + 0.9, cz + 1.3, RED);
  b.box(jx - 0.85, y + 0.9, cz - 0.85, jx + 0.85, y + 2.4, cz + 0.85, CREAM);
  b.cyl(jx, cz, y + 2.4, y + 10.2, 0.52, 0.36, 10, CREAM, { cap: false });
  b.cyl(jx, cz, y + 10.2, y + 10.6, 0.36, 0.7, 8, CREAM);
  lathe(b, jx, cz, [[0.3, y + 10.6], [0.62, y + 10.95], [0.36, y + 11.4], [0.05, y + 11.6]], 8, GOLD);
  b.cyl(jx, cz, y + 11.6, y + 12.3, 0.03, 0.34, 6, 0xf4f8fb, { cap: false });
  b.cyl(jx, cz, y + 12.3, y + 12.9, 0.34, 0.02, 6, 0xf4f8fb, { cap: false });
  for (let z = z0; z <= z1 + 0.01; z += 4.4) {
    if (Math.abs(z - cz) < 4) continue; // the gates stand open
    b.box(fx - 0.4, y, z - 0.4, fx + 0.4, y + 2.2, z + 0.4, CREAM, { top: RED });
  }
  for (const [a, c] of [[z0, cz - 4.4], [cz + 4.4, z1]]) {
    b.box(fx - 0.15, y, a, fx + 0.15, y + 0.6, c, CREAM);
    b.box(fx - 0.06, y + 1.25, a, fx + 0.06, y + 1.5, c, 0x6f7f72, { faces: 'EWTB' });
  }

  k.lights.push({ x: x1 + 2, z: cz, r: 20, color: '#ffe2ae', k: 0.7 }, { x: x1 + 1, z: z0 + 6, r: 12, color: '#ffe2ae', k: 0.55 }, { x: x1 + 1, z: z1 - 6, r: 12, color: '#ffe2ae', k: 0.55 });
  k.lights.push({ x: jx, z: cz, r: 7, color: '#fff3dc', k: 0.5 });
}

/** Where the railings along the front of Rashtrapati Bhavan's forecourt stand. */
const RAISINA_GATE = -84;

/** North Block or South Block: a long secretariat with a domed tower, an arcade towards the avenue and a pavilion at its east end. */
function block(k: Build, t: Thing): void {
  const b = k.b, y = t.y ?? 0, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, cz = (z0 + z1) / 2;
  const north = cz < AXIS_Z; // North Block looks south onto the avenue, South Block north
  const roof = wing(k, x0, z0, x1, z1, y, north ? 0.2 : 0.6);
  // an arcade along both long sides, at the foot of the wall
  for (const f of ['N', 'S'] as const) arcade(b, f, f === 'N' ? z0 : z1, x0 + 1, x1 - 1, y + 0.15, 9, 1.9, RECESS, { round: true, lit: 0.5 });
  // the pavilion at the east end, which looks down the hill: four columns and a pediment of shade
  b.box(x1, y, cz - 3.2, x1 + 1.4, y + BASE, cz + 3.2, RED, { faces: 'ENS' });
  b.box(x1 + 0.04, y + BASE, cz - 2.8, x1 + 0.1, y + BASE + BODY - 0.6, cz + 2.8, RECESS, { win: interior(0.8), faces: 'E' });
  for (let i = 0; i < 4; i++) b.box(x1 + 0.75, y + BASE, cz - 2.7 + i * 1.8 - 0.24, x1 + 1.25, y + BASE + BODY - 0.6, cz - 2.7 + i * 1.8 + 0.24, CREAM, { faces: 'NESW' });
  b.box(x1, y + BASE + BODY - 0.6, cz - 3.2, x1 + 1.4, y + BASE + BODY + 0.46, cz + 3.2, CREAM, { faces: 'ENSTB' });
  // the tower: square, then eight-sided, then a dome of red stone
  const tx = x0 + (x1 - x0) * 0.62, tz = north ? z1 - 3 : z0 + 3;
  b.box(tx - 2.2, roof - 0.4, tz - 2.2, tx + 2.2, roof + 2.6, tz + 2.2, CREAM, { win: { cell: 1.4, storey: 2.7, lit: 0.4, kind: 6 }, seed: 0.4 });
  b.box(tx - 2.6, roof + 2.6, tz - 2.6, tx + 2.6, roof + 2.9, tz + 2.6, RED, { faces: 'NESWTB' });
  drum(b, tx, tz, roof + 2.9, roof + 4.5, 1.9, CREAM, { sides: 8, arches: 8, lit: 0.7 });
  b.cyl(tx, tz, roof + 4.5, roof + 4.75, 2.2, 2.2, 8, RED, { cap: CREAM });
  dome(b, tx, roof + 4.75, tz, 1.8, RED_LIGHT, { kind: 'round', sides: 8, tall: 1.1, finial: 0.9 });
  for (const [cx, z] of [[x0 + 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z0 + 2], [x1 - 2, z1 - 2]]) chhatri(b, cx, roof, z, 0.95, 1.2, CREAM, RED);
  k.lights.push({ x: (x0 + x1) / 2, z: north ? z1 + 3 : z0 - 3, r: 14, color: '#ffe2ae', k: 0.55 }, { x: x1 + 3, z: cz, r: 9, color: '#ffe2ae', k: 0.5 });
}

/** Vijay Chowk, at the foot of the hill: paving, and a fountain either side of the road. */
function vijayChowk(k: Build): void {
  const b = k.b, x0 = RAISINA.x1, x1 = -44;
  for (const [z0, z1] of [[RAISINA.z0 + 6, AXIS_Z - 7], [AXIS_Z + 7, RAISINA.z1 - 6]]) {
    area(k, rect(x0, z0, x1, z1), 0xd9c2a4);
    const cx = (x0 + x1) / 2 + 1, cz = (z0 + z1) / 2;
    b.cyl(cx, cz, 0, 0.5, 3.0, 3.0, 12, RED_LIGHT);
    b.cyl(cx, cz, 0.5, 0.56, 2.7, 2.7, 12, CANAL);
    lathe(b, cx, cz, [[0.3, 0.5], [0.35, 1.5], [1.2, 1.9]], 8, RED_LIGHT);
    b.cyl(cx, cz, 1.85, 1.9, 1.1, 1.1, 8, CANAL);
    b.cyl(cx, cz, 1.9, 2.9, 0.12, 0.03, 5, 0xf4f8fb, { cap: false });
    k.lights.push({ x: cx, z: cz, r: 8, color: '#cfe6ff', k: 0.5 });
  }
}

/** A lamp-post of Kartavya Path: cream stone with a red band, and a lantern on it. */
function lampPost(k: Build, x: number, z: number): void {
  const b = k.b;
  b.box(x - 0.28, 0, z - 0.28, x + 0.28, 0.8, z + 0.28, RED);
  b.box(x - 0.17, 0.8, z - 0.17, x + 0.17, 3.6, z + 0.17, CREAM, { faces: 'NESW' });
  b.box(x - 0.3, 3.6, z - 0.3, x + 0.3, 3.8, z + 0.3, RED);
  k.glows.push({ x, y: 4.15, z, sx: 0.5, sy: 0.6, sz: 0.5, color: '#fff0c8' });
  k.lights.push({ x, z, r: 7.5, color: '#ffe2ae', k: 0.42 });
}

/** Kartavya Path: the kerbs of the two canals, the small bridges over them, and the lamp-posts along the walks. */
function kartavyaPath(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x + 2, x1 = t.x + t.w - 2;
  for (const z of [AXIS_Z - 12, AXIS_Z + 12]) {
    for (const s of [-1, 1]) b.box(x0 - 0.3, 0, z + s * 1.25 - 0.15, x1 + 0.3, 0.22, z + s * 1.25 + 0.15, STONE);
    for (const x of [x0 + 7, x1 - 7]) {
      b.box(x - 1.1, 0.05, z - 1.7, x + 1.1, 0.4, z + 1.7, RED_LIGHT, { faces: 'NESWT' });
      for (const s of [-1, 1]) b.box(x + s * 1.0 - 0.1, 0.4, z - 1.7, x + s * 1.0 + 0.1, 0.9, z + 1.7, STONE);
    }
  }
  for (let x = t.x + 1.5; x <= t.x + t.w - 1; x += 7.6) for (const s of [-1, 1]) lampPost(k, x, AXIS_Z + s * 6.2);
}

function indiaGate(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const way = 5.2, pier = (t.d - way) / 2, y0 = 0.7, body = t.h * 0.69, side = 1.9;
  // its low base of red stone, in two steps
  b.box(x0 - 1.2, 0, z0 - 1.2, x1 + 1.2, 0.35, z1 + 1.2, RED_LIGHT);
  b.box(x0 - 0.6, 0.35, z0 - 0.6, x1 + 0.6, y0, z1 + 0.6, RED_LIGHT);
  // two piers, each of two legs with a small arch through it from north to south
  for (const pz of [z0, z1 - pier]) {
    const pc = pz + pier / 2;
    for (const [a, c] of [[x0, cx - side / 2], [cx + side / 2, x1]]) b.box(a, y0, pz, c, body, pz + pier, BUFF, { faces: 'NESW' });
    archThrough(b, 'z', cx, pc, pier, side, y0, 5.2, body, BUFF, BUFF_SHADE, true);
    b.box(cx - side / 2, y0, pz + 0.5, cx + side / 2, y0 + 0.02, pz + pier - 0.5, BUFF_SHADE, { faces: 'T' });
    // a tall niche on each leg's east and west face, with a band at the springing of the great arch
    for (const f of ['E', 'W'] as const) niche(b, f, f === 'E' ? x1 : x0, pc, y0 + 0.6, pier * 0.42, 4.6, BUFF_SHADE, { round: true });
    b.box(x0 - 0.15, body * 0.62, pz - 0.15, x1 + 0.15, body * 0.62 + 0.3, pz + pier + 0.15, BUFF_SHADE, { faces: 'NESW' });
  }
  // the great arch, from east to west, and the wall over it
  archThrough(b, 'x', cx, cz, t.w, way, y0, body * 0.86 - y0, body, BUFF, BUFF_SHADE, true);
  b.box(x0, y0, cz - way / 2, x1, y0 + 0.02, cz + way / 2, 0xd8cfbb, { faces: 'T' });
  // the cornice, the attic stepping in twice, and the shallow bowl on top
  b.box(x0 - 0.45, body, z0 - 0.45, x1 + 0.45, body + 0.6, z1 + 0.45, BUFF_SHADE, { faces: 'NESWTB' });
  b.box(x0 + 0.35, body + 0.6, z0 + 0.9, x1 - 0.35, body + 2.6, z1 - 0.9, BUFF);
  for (const f of ['E', 'W'] as const) b.box(f === 'E' ? x1 - 0.35 : x0 + 0.29, body + 1.2, cz - 3.4, f === 'E' ? x1 - 0.29 : x0 + 0.35, body + 2.1, cz + 3.4, BUFF_SHADE, { faces: f });
  b.box(x0 + 0.1, body + 2.6, z0 + 0.65, x1 - 0.1, body + 2.95, z1 - 0.65, BUFF_SHADE, { faces: 'NESWTB' });
  b.box(x0 + 0.9, body + 2.95, z0 + 2.2, x1 - 0.9, body + 3.9, z1 - 2.2, BUFF);
  b.box(x0 + 0.65, body + 3.9, z0 + 1.95, x1 - 0.65, body + 4.15, z1 - 1.95, BUFF_SHADE, { faces: 'NESWTB' });
  b.cyl(cx, cz, body + 4.15, t.h, 1.35, 2.0, 12, BUFF_SHADE, { cap: 0x8a7a66 });
  // the walk through it along the axis, and light on its two faces
  area(k, rect(HEX[0] - 13, AXIS_Z - 1.6, HEX[0] + 5, AXIS_Z + 1.6), 0xd9c2a4, 0.025);
  k.lights.push({ x: x1 + 4, z: cz, r: 15, color: '#ffe2ae', k: 0.8 }, { x: x0 - 4, z: cz, r: 15, color: '#ffe2ae', k: 0.8 });
}

/** The canopy east of India Gate: a cupola on four columns, with a dark statue under it. */
function canopy(k: Build, t: Thing): void {
  const b = k.b, cx = t.x + t.w / 2, cz = t.z + t.d / 2;
  b.cyl(cx, cz, 0, 0.5, 2.5, 2.5, 8, RED_LIGHT);
  chhatri(b, cx, 0.5, cz, 1.45, t.h - 3.2, BUFF, BUFF_SHADE, { kind: 'round' });
  b.box(cx - 0.5, 0.5, cz - 0.5, cx + 0.5, 1.5, cz + 0.5, 0x4a4d52);
  figure(b, cx, cz, 1.5, { coat: 0x2c2e31, legs: 0x2c2e31, hat: 0x2c2e31, hatH: 0.12, skin: 0x2c2e31 });
  k.lights.push({ x: cx, z: cz, r: 6, color: '#fff3dc', k: 0.6 });
}

/** The National War Memorial: rings of low walls round an obelisk, with the flame at its foot. */
function warMemorial(k: Build, t: Thing): void {
  const b = k.b, cx = t.x + t.w / 2, cz = t.z + t.d / 2, R = 4.5, GRANITE = 0xc7b299;
  area(k, oval(cx, cz, R, R, 24), 0xd9c2a4, 0.025);
  // each ring is sixteen lengths of wall, with a way in from the four sides
  for (const [r, h] of [[4.1, 0.55], [2.9, 0.8]]) {
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) continue;
      const a = (i / 16) * Math.PI * 2;
      b.obox(cx + Math.cos(a) * r, h / 2 + 0.02, cz + Math.sin(a) * r, 0.16, h / 2, r * Math.tan(Math.PI / 16) + 0.02, a, GRANITE);
    }
  }
  b.cyl(cx, cz, 0, 0.45, 1.5, 1.5, 12, GRANITE);
  b.cyl(cx, cz, 0.45, t.h, 0.42, 0.24, 4, MARBLE, { phase: Math.PI / 4, cap: false });
  b.cyl(cx, cz, t.h, t.h + 0.5, 0.24, 0.02, 4, GOLD, { phase: Math.PI / 4, cap: false });
  // the flame
  b.box(cx + 0.75, 0.45, cz - 0.2, cx + 1.15, 0.75, cz + 0.2, 0x3a3d42);
  k.glows.push({ x: cx + 0.95, y: 1.0, z: cz, sx: 0.26, sy: 0.42, sz: 0.26, color: '#ff9a3c' });
  k.lights.push({ x: cx, z: cz, r: 7, color: '#ffd9a0', k: 0.55 });
  for (const [dx, dz] of [[-3.6, -3.6], [3.6, -3.6], [3.6, 3.6], [-3.6, 3.6]]) k.tree(cx + dx * 0.98, cz + dz * 0.98, 0.5);
}

/** What this file builds, by the id of the thing in the plan. */
export const AXIS: Record<string, (k: Build, t: Thing) => void> = {
  'rashtrapati-bhavan': rashtrapatiBhavan,
  'north-block': block,
  'south-block': (k, t) => { block(k, t); vijayChowk(k); },
  'kartavya-path': kartavyaPath,
  'india-gate': indiaGate,
  canopy,
  'war-memorial': warMemorial,
};
