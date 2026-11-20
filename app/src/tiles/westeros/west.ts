// The west: Casterly Rock, Lannisport, and Pyke on its sea stacks off the coast.
//
// Casterly Rock is a rock that is a castle: one mass of golden-grey stone on
// its island beside the Sunset Sea, higher at the south for the shoulders and
// the head and with a long back falling away to the north, so that its outline
// is a lion at rest and no more. Towers and walls grow out of its ledges, the
// keep stands on the summit, the Lion's Mouth opens at the foot of its east
// face, and a sea gate lets ships into a cave on its west. Lannisport is a
// walled harbour town on its own headland to the south. Pyke stands on a row
// of sea stacks, joined by a covered bridge and by rope bridges.
//
// Everything here is drawn from the books' plain descriptions and is this
// tile's own drawing.

import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { water } from '../../engine/ground';
import { archway, figure, roundel } from '../../engine/parts';
import { beacon, face3, gable, prism, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { drawField, field, heightOn, smooth } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import { SEA_SUNSET, SHORE } from './land';
import { HOUSE_WIN, LOOPS, LOOPS_CLOSE, ROOF, STONE, TIMBER, TIMBER_DARK, banner, brazier, fire, nameBoard, nameSign, rampart, roundTower, squareTower } from './look';
import type { Model } from './models';
import { ISLANDS, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours of this file's own
// ---------------------------------------------------------------------------

/** The crimson of the Lannisters' cloaks, and the red of the cones on the Rock's towers. */
const CRIMSON = 0x9b1b1f, CONE = 0xa63a2b, GILT = ROOF.gilt;
/** The Rock's own stone: STONE.gold darkened, in beds. */
const ROCK = { top: 0xb5a070, ledge: 0xa89263, beds: [0xa38b5d, 0x8f7951, 0xad9466, 0x98825a], foot: 0x7b6a4a, soffit: 0x5f513a };
const PAVE = 0xc8b68b, PAVE_DARK = 0x9c8a63, DARK_IN = 0x2a2016;
const ROPE = 0xe2d2ad, PLANK = 0x8d6e4b, OAR = 0xc2a77c;
/** Pyke: black rock wet from the sea, lichen above it, salt on the Sea Tower, and the surf. */
const IRON = { wet: 0x343a38, lichen: 0x4f5d4c, rock: STONE.iron, high: 0x676e69, top: 0x56604f, salt: 0xd8dbd3, old: 0x8d9390 };
const FOAM = 0xeef4f3;
const GUARD = { coat: CRIMSON, legs: 0x3b2c22, hat: 0xc9a640, hatH: 0.28 };

/** A row of windows that ends a whole number of storeys above the ground at `h`. */
const winFit = (w: WinSpec, h: number): WinSpec => ({ ...w, storey: h / Math.max(1, Math.round(h / w.storey)) });

// ---------------------------------------------------------------------------
// Casterly Rock: the shape of the rock
// ---------------------------------------------------------------------------

const RK = ISLANDS.rock, RN = lotOf('casterly-rock-n'), RS = lotOf('casterly-rock');
/** The rock's foot is an oval a little inside the island's, so that the island's shore stays round it. */
const CX = RK.x, CZ = RK.z, AX = RK.rx - 1.8, AZ = RK.rz - 1.8;
const halfW = (z: number): number => AX * Math.sqrt(Math.max(0, 1 - ((z - CZ) / AZ) ** 2));
/** The Lion's Mouth, at the south end of the east face, and the sea cave in the west face. */
const MOUTH_Z = CZ + 0.58 * AZ, MOUTH_X = CX + halfW(MOUTH_Z);
const CAVE_Z = CZ + 0.15 * AZ, CAVE_X = CX - halfW(CAVE_Z);
/** How far the cliff stands back where each opens. */
const MOUTH_BACK = 3.6, CAVE_BACK = 3.0;
/** How deep each arch's passage runs in from its face. */
const MOUTH_DEPTH = 3.2, CAVE_DEPTH = 2.8;

/** The height of the crest along the rock, from its north end (-1) to its south (1): the haunches, the long back, the shoulders, the head, the face. */
const CREST: [number, number][] = [
  [-1, 6], [-0.92, 11], [-0.78, 14.5], [-0.6, 14], [-0.4, 15], [-0.3, 17.5], [-0.15, 20], [0, 22.5],
  [0.15, 24.5], [0.27, 24], [0.4, 25.5], [0.55, 27.2], [0.68, 26.8], [0.8, 23], [0.9, 17.5], [1, 10],
];
function crest(v: number): number {
  if (v <= CREST[0][0]) return CREST[0][1];
  for (let i = 1; i < CREST.length; i++) {
    const [v1, h1] = CREST[i], [v0, h0] = CREST[i - 1];
    if (v <= v1) return h0 + ((h1 - h0) * (v - v0)) / (v1 - v0);
  }
  return CREST[CREST.length - 1][1];
}

function rockHeight(x: number, z: number): number {
  const u0 = (x - CX) / AX, v = (z - CZ) / AZ, q = Math.hypot(u0, v);
  // how far in from the foot: from the oval, and from the edges of the two lots
  let m = q < 1e-3 ? 99 : (1 - q) / (Math.hypot(u0 / AX, v / AZ) / q);
  if (z < RS.z0 + 0.5) m = Math.min(m, x - (RN.x0 + 0.3), RN.x1 - 0.3 - x);
  m = Math.min(m, z - (RN.z0 + 0.3), RS.x1 - 0.8 - x);
  // the cliff stands back where the Lion's Mouth and the sea cave open
  if (x > CX) m -= MOUTH_BACK * (1 - smooth(3.4, 4.6, Math.abs(z - MOUTH_Z)));
  else m -= CAVE_BACK * (1 - smooth(2.4, 3.4, Math.abs(z - CAVE_Z)));
  if (m <= 0) return 0;
  const w = halfW(z), u = w > 0.01 ? (x - CX) / w : 0;
  let H = crest(v);
  if (z < RS.z0) H = Math.min(H, RN.top - 5);
  // across the rock: the crest, a cliff, and a ledge on the landward side; a narrower ledge to the sea
  let s: number, rough: number;
  if (u >= 0) {
    if (u < 0.12) { s = 1; rough = 0.35; }
    else if (u < 0.4) { s = 1 - 0.45 * smooth(0.12, 0.4, u); rough = 1; }
    else { s = 0.55 - (0.07 * (u - 0.4)) / 0.6; rough = 0.15; }
  } else if (u > -0.45) { s = 1; rough = 0.35; }
  else if (u > -0.66) { s = 1 - 0.28 * smooth(-0.45, -0.66, u); rough = 1; }
  else { s = 0.72 - (0.06 * (-u - 0.66)) / 0.34; rough = 0.15; }
  const crag = 0.6 * Math.sin(x * 1.7 + z * 0.9) + 0.45 * Math.sin(z * 2.3 - x * 1.1);
  return smooth(0, 1.7, m) * Math.max(0, H * s + crag * rough);
}

const ROCK_FIELD = field(CX - AX - 1.2, RN.z0 - 0.2, CX + AX + 1.0, RS.z1 + 0.3, 1.0, rockHeight);
const rockY = (x: number, z: number): number => heightOn(ROCK_FIELD, x, z);
function around(x: number, z: number, r: number, pick: (a: number, b: number) => number): number {
  let y = rockY(x, z);
  for (let i = 0; i < 8; i++) y = pick(y, rockY(x + Math.cos((i / 8) * Math.PI * 2) * r, z + Math.sin((i / 8) * Math.PI * 2) * r));
  return y;
}
const footY = (x: number, z: number, r: number): number => around(x, z, r, Math.min);
const crownY = (x: number, z: number, r: number): number => around(x, z, r, Math.max);
/** A place on the rock: `v` along it from north (-1) to south (1), `u` across it from the sea (-1) to the land (1). */
const onRock = (v: number, u: number): P2 => {
  const z = CZ + v * AZ;
  return [CX + u * halfW(z), z];
};

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

interface PortalSpec { W: number; D: number; H: number; w: number; spring: number; floor: number | null }

/**
 * A great arch in a face of rock: two piers of stone, the arch between them
 * with its soffit, a top, and darkness at the back that glows at night. Built
 * facing local +z from (x, z); `yaw` turns it to face its way.
 */
function portal(b: GeoBuilder, x: number, z: number, yaw: number, p: PortalSpec): void {
  b.moved(x, 0, z, yaw, () => {
    const r = p.w / 2;
    for (const s of [-1, 1]) {
      const xa = s < 0 ? -p.W : r, xb = s < 0 ? -r : p.W;
      b.box(xa, -1.6, -p.D, xb, p.H, 0, ROCK.beds[0], { top: ROCK.ledge });
      // a darker bed across the face, a hair proud of it
      b.box(s < 0 ? xa - 0.07 : xa + 0.05, p.H * 0.36, -0.4, s < 0 ? xb - 0.05 : xb + 0.07, p.H * 0.58, 0.07, ROCK.beds[1], { faces: 'SEWTB' });
    }
    // the rock behind the arch, back to where the cliff rises
    b.box(-p.W, -1.6, -p.D - 1.6, p.W, p.H - 0.3, -p.D, ROCK.beds[3], { top: ROCK.ledge, faces: 'NEWT' });
    archway(b, 0, -p.D, 0, p.w, p.spring, p.H, ROCK.beds[2], ROCK.soffit, 8);
    b.quad([-r, p.H, 0], [r, p.H, 0], [r, p.H, -p.D], [-r, p.H, -p.D], [0, 1, 0], ROCK.ledge);
    const back = -p.D + 0.04, f = p.floor ?? 0.06;
    b.quad([-r, f, back], [r, f, back], [r, p.spring + r, back], [-r, p.spring + r, back], [0, 0, 1], DARK_IN, { win: interior(0.9) });
    if (p.floor !== null) b.box(-r + 0.01, -0.3, -p.D, r - 0.01, p.floor, 0, PAVE_DARK, { faces: 'ST' });
  });
}

/** A hull that rides at `y`: pointed at the bow (+x) and square at the stern, with a deck. */
function hull(b: GeoBuilder, len: number, wid: number, y0: number, y1: number, color: number, deck: number, both = false): P2[] {
  const h = wid / 2;
  const plan: P2[] = both
    ? [[-len / 2, 0], [-len * 0.34, -h], [len * 0.34, -h], [len / 2, 0], [len * 0.34, h], [-len * 0.34, h]]
    : [[-len / 2, -h * 0.72], [len * 0.28, -h], [len / 2, 0], [len * 0.28, h], [-len / 2, h * 0.72]];
  prism(b, plan, y0, y1, color, { top: deck });
  return plan;
}

/** A galley of the Lannister fleet at its moorings, its red sail furled on the yard. `mast` is how high the mast's top is. */
function galley(k: Build, x: number, z: number, yaw: number, len: number, mast: number, y = 0.06): void {
  const b = k.b, wid = len * 0.25;
  b.moved(x, y, z, yaw, () => {
    const plan = hull(b, len, wid, -0.4, 0.56, 0x5e3a26, 0x8a6c4a);
    prism(b, plan.map(([a, c]): P2 => [a * 1.01, c * 1.07]), 0.3, 0.46, CRIMSON, { top: false });
    b.box(-len / 2 + 0.12, 0.56, -wid * 0.3, -len / 2 + 1.0, 1.15, wid * 0.3, TIMBER, { top: 0x8a6c4a });
    b.cyl(0.1, 0, 0.56, mast - y, 0.08, 0.06, 6, TIMBER, { cap: false });
    b.beam([0.1, mast - y - 0.65, -1.15], [0.1, mast - y - 0.65, 1.15], 0.05, 0.05, TIMBER);
    b.box(-0.06, mast - y - 0.92, -1.05, 0.26, mast - y - 0.62, 1.05, CRIMSON, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.beam([-len * 0.3, 0.68, s * wid * 0.42], [len * 0.25, 0.68, s * wid * 0.42], 0.04, 0.04, OAR);
  });
}

/** A small fishing boat with one short mast and its sail furled. */
function fishingBoat(k: Build, x: number, z: number, yaw: number, y = 0.06): void {
  const b = k.b;
  b.moved(x, y, z, yaw, () => {
    hull(b, 1.9, 0.72, -0.3, 0.32, 0x6b5136, 0x9a7c56);
    b.cyl(0.15, 0, 0.32, 2.9, 0.05, 0.04, 5, TIMBER, { cap: false });
    b.box(0.08, 2.0, -0.42, 0.24, 2.18, 0.42, 0xd8c9a2, { faces: 'NESWTB' });
  });
}

/**
 * A longship of the Iron Islands: long, lean and low, with a stem and a stern
 * post, one mast, a row of oars, and a black sail with the golden kraken on it.
 */
function longship(k: Build, x: number, z: number, yaw: number, o: { sail: boolean; oars: boolean; crew: number }): void {
  const b = k.b, len = 5.0, hw = 0.55, y0 = -1.2, y1 = -0.45, mx = 0.2;
  const hullC = 0x2c2724, deck = 0x5a4632;
  b.moved(x, 0, z, yaw, () => {
    hull(b, len, hw * 2, y0, y1, hullC, deck, true);
    for (const s of [-1, 1]) b.sweep([[s * (len / 2 - 0.1), y1 - 0.12, 0], [s * (len / 2 + 0.22), y1 + 0.35, 0], [s * (len / 2 + 0.12), y1 + 0.85, 0]], [0.09, 0.08, 0.06], hullC);
    const top = y1 + 4.3;
    b.cyl(mx, 0, y1, top, 0.07, 0.05, 6, 0x6b5136, { cap: false });
    b.beam([mx, top - 0.5, -1.2], [mx, top - 0.5, 1.2], 0.05, 0.05, 0x6b5136);
    if (o.sail) {
      const sx = mx + 0.12, sy0 = y1 + 1.5, sy1 = top - 0.55, sh = 1.1, ym = (sy0 + sy1) / 2 + 0.15;
      for (const d of [-1, 1]) {
        const at = sx + d * 0.02;
        b.quad([at, sy0, -sh * d], [at, sy0, sh * d], [at, sy1, sh * d], [at, sy1, -sh * d], [d, 0, 0], 0x1d1d20);
        // the kraken: a golden head, and its arms hanging below it
        roundel(b, [sx + d * 0.04, ym, 0], 0.42, d > 0 ? 'E' : 'W', GILT, {}, 8);
        for (const t of [-0.42, -0.14, 0.14, 0.42]) {
          const zz = t * 1.0, w = 0.07;
          b.quad([sx + d * 0.04, sy0 + 0.15, zz - w * d], [sx + d * 0.04, sy0 + 0.15, zz + w * d], [sx + d * 0.04, ym - 0.2, zz * 0.6 + w * d], [sx + d * 0.04, ym - 0.2, zz * 0.6 - w * d], [d, 0, 0], GILT);
        }
      }
    } else {
      b.box(mx - 0.12, top - 0.8, -1.05, mx + 0.16, top - 0.5, 1.05, 0x1d1d20, { faces: 'NESWTB' });
    }
    if (o.oars) {
      for (let i = 0; i < 6; i++) {
        const xo = -len * 0.3 + (i * len * 0.6) / 5;
        for (const s of [-1, 1]) b.beam([xo, y1 + 0.04, s * hw * 0.9], [xo - 0.32, -0.95, s * (hw + 1.0)], 0.035, 0.035, OAR);
      }
    }
  });
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i < o.crew; i++) {
    const lx = -1.6 + i * 1.1;
    k.person(x + lx * c, z + lx * s, y1);
  }
}

// ---------------------------------------------------------------------------
// Casterly Rock
// ---------------------------------------------------------------------------

/** A tower of golden stone that grows out of the rock, with a red cone or battlements. Returns its top. */
function rockTower(k: Build, at: P2, r: number, extra: number, roof: number | null): number {
  const [x, z] = at, cap = z < RS.z0 ? RN.top : RS.top;
  const y0 = Math.max(-0.2, footY(x, z, r) - 0.5);
  const top = Math.min(roof === null ? cap - 0.9 : cap - 0.2, crownY(x, z, r) + extra);
  const cone = roof === null ? undefined : { color: roof, h: Math.min(2.9, 1.6 + r) };
  roundTower(k.b, x, z, r, top, STONE.gold, { y0, sides: 8, shade: STONE.goldShade, win: winFit(LOOPS_CLOSE, top - 1), cone });
  return top;
}

/** A stretch of battlements along a ledge, from one tower to the next. */
function rockWall(k: Build, a: P2, c: P2, rise = 2.0, thick = 1.0): number {
  const mid: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const ys = [a, mid, c].map((p) => rockY(p[0], p[1]));
  const top = Math.max(...ys) + rise;
  rampart(k.b, a, c, top, STONE.gold, { y0: Math.max(-0.2, Math.min(...ys) - 0.7), thick, shade: STONE.goldShade });
  return top;
}

/** Windows and arrow slits all over the rock's faces, small only because the rock is so big. They glow at night. */
function rockWindows(k: Build): void {
  const r = rng(77151), e = 0.06;
  let n = 0;
  for (let i = 0; i < 700 && n < 95; i++) {
    const z = RN.z0 + 1 + r() * (RS.z1 - RN.z0 - 2), x = CX - AX + r() * 2 * AX;
    const y = rockY(x, z);
    if (y < 1.8) continue;
    if (x > CX && Math.abs(z - MOUTH_Z) < 5) continue;
    if (x < CX && Math.abs(z - CAVE_Z) < 3.8) continue;
    const hx = (rockY(x + e, z) - rockY(x - e, z)) / (2 * e), hz = (rockY(x, z + e) - rockY(x, z - e)) / (2 * e);
    const l = Math.hypot(hx, 1, hz), nx = -hx / l, ny = 1 / l, nz = -hz / l;
    if (ny > 0.42) continue;
    // not within a unit of the crest above it, where the window would cut the skyline
    if (y > crownY(x, z, 1.2) - 0.9) continue;
    const hl = Math.hypot(nx, nz), rx = nz / hl, rz = -nx / hl;
    const ux = ny * rz - nz * 0, uy = nz * rx - nx * rz, uz = nx * 0 - ny * rx;
    const slit = r() < 0.4, w = slit ? 0.08 : 0.17, h = slit ? 0.32 : 0.27;
    const c: V3 = [x + nx * 0.13, y + ny * 0.13, z + nz * 0.13];
    const P = (a: number, b2: number): V3 => [c[0] + rx * a + ux * b2, c[1] + uy * b2, c[2] + rz * a + uz * b2];
    k.b.quad(P(-w, -h), P(w, -h), P(w, h), P(-w, h), [nx, ny, nz], DARK_IN, { win: interior(0.8) });
    n++;
  }
}

const casterlyRock: Model = (k: Build, l: Lot): void => {
  const b = k.b;
  drawField(b, ROCK_FIELD, {
    color: (y, level, x, z) => {
      if (y < 0.9) return ROCK.foot;
      if (level > 0.93) return ROCK.top;
      if (level > 0.8) return ROCK.ledge;
      const bed = Math.floor((y + 0.7 * Math.sin(x * 0.35 + z * 0.21)) / 2.4);
      return ROCK.beds[((bed % 4) + 4) % 4];
    },
    cut: ROCK.foot,
    edges: '',
  });
  rockWindows(k);

  // --- the keep on the summit, with a gilt cone on its watchtower ---
  const [kx, kz] = onRock(0.53, -0.12);
  const keepTop = l.top - 1.4;
  squareTower(b, kx, kz, 2.2, keepTop, STONE.gold, { y0: footY(kx, kz, 3) - 0.6, shade: STONE.goldShade, win: winFit(LOOPS_CLOSE, keepTop - 1) });
  roundTower(b, kx - 1.5, kz - 1.5, 0.85, l.top, STONE.gold, { y0: keepTop - 1.6, sides: 8, shade: STONE.goldShade, win: winFit(LOOPS_CLOSE, l.top - 1), cone: { color: GILT, h: 2.8 } });
  banner(b, kx + 1.35, kz + 1.35, keepTop, 'lannister', 4.2);
  fire(k, kx + 2.45, keepTop - 2.3, kz, 0.25, 0);
  k.lights.push({ x: kx, z: kz + 3, r: 10, color: '#ffcf8a', k: 0.45 });
  for (const [dx, dz] of [[1.2, -1.2], [-1.0, 1.4]]) k.person(kx + dx, kz + dz, keepTop);

  // --- a dozen towers, on the crest and on the ledges, at different heights ---
  const T = {
    haunch: onRock(-0.88, 0.0), eN: onRock(-0.58, 0.8), eM: onRock(-0.27, 0.8), eS: onRock(0.0, 0.8), eSS: onRock(0.2, 0.74),
    wN: onRock(-0.62, -0.72), wM: onRock(-0.32, -0.8), wS: onRock(0.48, -0.8), wSS: onRock(0.72, -0.8),
    crest: onRock(-0.05, -0.15), cliff: onRock(0.2, 0.3), headW: onRock(0.8, -0.4), headE: onRock(0.8, 0.3), brow: onRock(0.92, 0.0),
  };
  rockTower(k, T.haunch, 0.85, 4.2, CONE);
  rockTower(k, T.eN, 0.9, 4.8, CONE);
  rockTower(k, T.eM, 1.0, 6.0, CONE);
  rockTower(k, T.eS, 1.0, 5.2, CONE);
  rockTower(k, T.eSS, 1.05, 7.5, CONE);
  rockTower(k, T.wN, 0.85, 4.5, CONE);
  rockTower(k, T.wM, 0.9, 4.0, CONE);
  rockTower(k, T.wS, 0.95, 5.0, CONE);
  rockTower(k, T.wSS, 0.85, 4.4, CONE);
  const crestTop = rockTower(k, T.crest, 1.15, 5.0, null);
  banner(b, T.crest[0], T.crest[1], crestTop, 'lannister', 3.6);
  rockTower(k, T.cliff, 0.9, 3.5, CONE);
  rockTower(k, T.headW, 1.0, 4.6, GILT);
  rockTower(k, T.headE, 0.95, 4.2, GILT);
  rockTower(k, T.brow, 0.85, 3.6, CONE);

  // --- battlements along the ledges, from tower to tower ---
  const walk: [P2, number][] = [];
  for (const [a, c] of [[T.eN, T.eM], [T.eM, T.eS], [T.eS, T.eSS], [T.wN, T.wM], [T.wS, T.wSS], [T.headE, T.brow], [T.brow, T.headW]] as [P2, P2][]) {
    walk.push([[(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], rockWall(k, a, c)]);
  }
  for (const [[x, z], y] of walk.filter((_, i) => i % 2 === 0)) figure(b, x, z, y, GUARD);
  for (const [[x, z], y] of walk.filter((_, i) => i % 2 === 1)) k.person(x, z, y);
  const [bx, bz] = onRock(-0.1, 0.8);
  brazier(k, bx - 0.15, bz, rockY(bx, bz) + 0.05);

  // --- the Lion's Mouth: a vast arch at the foot of the east face, and the paved way up to it ---
  const front = MOUTH_X + 0.45, mouth: PortalSpec = { W: 3.4, D: MOUTH_DEPTH, H: 9, w: 4.8, spring: 4.6, floor: 0.83 };
  portal(b, front, MOUTH_Z, -Math.PI / 2, mouth);
  // battlements on the arch's top, a turret at each end of them
  rampart(b, [front - 0.7, MOUTH_Z - mouth.W + 0.6], [front - 0.7, MOUTH_Z + mouth.W - 0.6], mouth.H + 1.6, STONE.gold, { y0: mouth.H - 0.2, thick: 1.0, shade: STONE.goldShade });
  for (const s of [-1, 1]) {
    roundTower(b, front - 0.8, MOUTH_Z + s * (mouth.W - 0.6), 0.75, mouth.H + 3.4, STONE.gold, { y0: mouth.H - 0.3, sides: 8, shade: STONE.goldShade, win: winFit(LOOPS_CLOSE, mouth.H + 2.4), cone: { color: CONE, h: 2.0 } });
    banner(b, front - 1.9, MOUTH_Z + s * 1.3, mouth.H, 'lannister', 3.4);
  }
  // the way: a causeway over the channel, a quay along it, and a ramp up to the arch
  const xe = l.x1 - 0.05, wayH = 2.3;
  b.box(front - 0.05, -1.6, MOUTH_Z - wayH, xe, 0.25, MOUTH_Z + wayH, 0x9f8d66, { top: PAVE });
  b.box(CX + AX - 0.3, -1.6, MOUTH_Z - 9.8, xe, 0.25, MOUTH_Z - wayH, 0x9f8d66, { top: PAVE });
  slab(b, [xe, 0.3, MOUTH_Z], [front, 0.85, MOUTH_Z], 2.0, 0.5, PAVE, { under: PAVE_DARK });
  for (const s of [-1, 1]) b.box(front + 0.1, 0.25, MOUTH_Z + s * 2.15 - 0.15, xe, 0.75, MOUTH_Z + s * 2.15 + 0.15, 0xa8946a, { top: 0xbfa878 });
  const rampY = (x: number): number => 0.3 + ((0.85 - 0.3) * (xe - x)) / (xe - front);
  for (const s of [-1, 1]) {
    figure(b, front + 0.6, MOUTH_Z + s * 1.55, rampY(front + 0.6), GUARD);
    figure(b, xe - 0.9, MOUTH_Z + s * 1.2, rampY(xe - 0.9), GUARD);
    brazier(k, xe - 0.45, MOUTH_Z + s * 1.85, 0.25);
    fire(k, front - mouth.D + 0.35, 3.2, MOUTH_Z + s * 1.7, 0.22, 0);
  }
  for (const [dx, dz] of [[1.6, 0.4], [2.4, -0.6]]) k.person(front + dx, MOUTH_Z + dz, rampY(front + dx));
  k.person(xe - 0.7, MOUTH_Z - 4.2, 0.25);
  k.lights.push({ x: front + 1.2, z: MOUTH_Z, r: 11, color: '#ffcf8a', k: 0.6 });
  nameBoard(k, 'west-casterly-rock', xe - 0.37, MOUTH_Z - 6.0, 0.25, [1, 0, 0], 0.85);

  // --- the sea cave on the west face: a sea gate, and a ship's mast in the dark ---
  const cf = CAVE_X - 0.45, cave: PortalSpec = { W: 2.4, D: CAVE_DEPTH, H: 6.2, w: 3.4, spring: 3.0, floor: null };
  portal(b, cf, CAVE_Z, Math.PI / 2, cave);
  const edge = RK.x - RK.rx + 0.15, inner = cave.w / 2 - 0.02;
  water(k, [[edge, CAVE_Z - inner], [cf + cave.D - 0.05, CAVE_Z - inner], [cf + cave.D - 0.05, CAVE_Z + inner], [edge, CAVE_Z + inner]], { drop: -0.06, color: SEA_SUNSET, quay: SHORE });
  for (const s of [-1, 1]) {
    const z0 = CAVE_Z + s * (cave.w / 2), z1 = CAVE_Z + s * (cave.w / 2 + 0.75);
    b.box(edge, -1.6, Math.min(z0, z1), cf, 0.45, Math.max(z0, z1), ROCK.beds[3], { top: ROCK.ledge });
    b.box(edge, 0.45, Math.min(z0, z1), edge + 0.5, 2.3, Math.max(z0, z1), ROCK.beds[1], { top: ROCK.ledge });
  }
  // the sea gate: a timber grid let down to the water, under a beam
  b.box(edge + 0.05, 2.0, CAVE_Z - inner - 0.3, edge + 0.45, 2.4, CAVE_Z + inner + 0.3, TIMBER_DARK, { faces: 'NESWTB' });
  for (let i = 0; i < 5; i++) b.beam([edge + 0.25, 0.1, CAVE_Z - inner + 0.3 + i * ((2 * inner - 0.6) / 4)], [edge + 0.25, 2.0, CAVE_Z - inner + 0.3 + i * ((2 * inner - 0.6) / 4)], 0.05, 0.05, 0x8c7a62);
  for (const y of [0.7, 1.4]) b.beam([edge + 0.25, y, CAVE_Z - inner], [edge + 0.25, y, CAVE_Z + inner], 0.04, 0.04, 0x8c7a62);
  galley(k, cf + 0.9, CAVE_Z, Math.PI, 3.4, 4.5);
  fire(k, cf + cave.D - 0.4, 2.4, CAVE_Z, 0.2, 0);
  k.lights.push({ x: cf - 0.8, z: CAVE_Z, r: 7, color: '#ffcf8a', k: 0.4 });
};

// ---------------------------------------------------------------------------
// Lannisport
// ---------------------------------------------------------------------------

const lannisport: Model = (k: Build, l: Lot): void => {
  const b = k.b, TER = 0.5;
  // the harbour along the west side, the town east of it; the town stands on a low headland of paving
  const qx = l.x0 + 5.6, mz = l.z0 + 1.4, bwx = l.x0 + 0.9, bwz = l.z0 + 2.8, sz = l.z1 - 1.2;
  b.box(qx, -0.2, l.z0, l.x1, TER, l.z1, 0xb9a67c, { top: PAVE });
  b.box(l.x0, -0.2, sz, qx, TER, l.z1, 0xb9a67c, { top: PAVE });
  b.box(l.x0, -1.6, bwz, bwx, 0.75, sz, 0xa8956b, { top: 0xbfa878 });
  b.box(l.x0 + 2.0, -0.2, l.z0, qx, 0.75, mz, 0xa8956b, { top: 0xbfa878 });
  // a sill across the harbour mouth, where the chain is drawn up at night
  b.box(l.x0, -1.6, l.z0, l.x0 + 0.15, 0.25, bwz, 0x8f7d58);
  b.box(l.x0 + 0.15, -1.6, l.z0, l.x0 + 2.0, 0.25, l.z0 + 0.15, 0x8f7d58);
  const i = 0.03;
  water(k, [[l.x0 + 0.15 + i, l.z0 + 0.15 + i], [l.x0 + 2.0 - i, l.z0 + 0.15 + i], [l.x0 + 2.0 - i, mz + i], [qx - i, mz + i], [qx - i, sz - i], [bwx + i, sz - i], [bwx + i, bwz - i], [l.x0 + 0.15 + i, bwz - i]], { drop: -0.06, color: SEA_SUNSET, quay: SHORE });

  // the lighthouse on the breakwater's end, its lamp lit
  const lx = l.x0 + 0.45, lz = bwz + 0.55;
  b.cyl(lx, lz, 0.7, 5.6, 0.62, 0.5, 8, STONE.gold, { win: winFit(LOOPS, 5.6), cap: false });
  b.cyl(lx, lz, 5.5, 5.75, 0.68, 0.68, 8, STONE.goldShade);
  for (let j = 0; j < 4; j++) {
    const a = (j / 4) * Math.PI * 2 + Math.PI / 4;
    b.box(lx + Math.cos(a) * 0.45 - 0.06, 5.75, lz + Math.sin(a) * 0.45 - 0.06, lx + Math.cos(a) * 0.45 + 0.06, 6.55, lz + Math.sin(a) * 0.45 + 0.06, STONE.goldShade, { faces: 'NESW' });
  }
  beacon(k, lx, 6.15, lz, 0.55, '#ffd27a');
  b.cyl(lx, lz, 6.55, 7.9, 0.72, 0.04, 8, CONE, { cap: false });
  // the cone's underside, seen from below between the lantern's pillars
  for (let j = 0; j < 8; j++) {
    const a0 = Math.PI / 8 + (j / 8) * Math.PI * 2, a1 = Math.PI / 8 + ((j + 1) / 8) * Math.PI * 2;
    face3(b, [lx, 6.55, lz], [lx + Math.cos(a0) * 0.72, 6.55, lz + Math.sin(a0) * 0.72], [lx + Math.cos(a1) * 0.72, 6.55, lz + Math.sin(a1) * 0.72], [0, -1, 0], STONE.goldShade);
  }
  k.lights.push({ x: lx + 1.2, z: lz, r: 9, color: '#ffd9a0', k: 0.55 });

  // --- the town wall, its towers, and the gate on the road ---
  const wx = l.x1 - 1.5, nz = l.z0 + 0.75, swz = l.z1 - 0.75, gz = l.z1 - 2.45;
  const wall = (a: P2, c: P2): void => rampart(b, a, c, 4.0, STONE.gold, { y0: TER - 0.1, thick: 0.8, shade: STONE.goldShade });
  wall([wx, nz], [wx, gz - 1.55]);
  wall([qx - 0.2, nz], [wx, nz]);
  wall([l.x0 + 0.55, swz], [wx, swz - 0.15]);
  const wt = (x: number, z: number, r: number, top: number, h: number): void =>
    roundTower(b, x, z, r, top, STONE.gold, { y0: TER - 0.1, sides: 8, shade: STONE.goldShade, win: winFit(LOOPS, top - 1), cone: { color: CONE, h } });
  wt(wx, nz, 0.75, 5.4, 2.0);
  wt(qx - 0.2, nz, 0.75, 5.0, 1.9);
  wt(l.x0 + 0.55, swz, 0.55, 4.8, 1.6);
  wt(wx, gz - 1.55, 0.75, 6.0, 2.3);
  wt(wx, gz + 1.55, 0.75, 6.0, 2.3);
  b.box(wx - 0.45, 3.0, gz - 0.85, wx + 0.45, 4.3, gz + 0.85, STONE.gold, { top: STONE.goldShade, faces: 'NESWTB' });
  banner(b, wx, gz, 4.3, 'lannister', 2.6, 0.8);
  // the City Watch in crimson cloaks, at the gate
  for (const dz of [-0.95, 0.95]) figure(b, l.x1 - 0.55, gz + dz, TER, GUARD);
  figure(b, wx - 0.9, gz + 0.3, TER, GUARD);
  for (const dz of [-1.0, 1.0]) fire(k, wx + 0.5, 2.6, gz + dz, 0.2, 0);
  k.lights.push({ x: l.x1 - 0.3, z: gz, r: 8, color: '#ffcf8a', k: 0.55 });
  nameBoard(k, 'west-lannisport', l.x1 - 0.42, l.z0 + 3.2, TER, [1, 0, 0], 0.95);

  // --- houses of golden stone with red tile roofs, packed close ---
  const r = rng(40236), hx0 = qx + 1.0, hx1 = wx - 0.42, rows: [number, number, boolean][] = [[nz + 0.42, l.z0 + 3.75, false], [l.z0 + 4.25, gz - 0.75, true]];
  const walls = [STONE.gold, 0xc9b385, 0xb39b6b, 0xc4ab78], roofs = [ROOF.tile, 0x9e4434, 0xb5603f, 0x963c2e];
  for (const [z0, z1, street] of rows) {
    const n = 4, w = (hx1 - hx0) / n;
    for (let j = 0; j < n; j++) {
      const x0 = hx0 + j * w + 0.02, x1 = hx0 + (j + 1) * w - 0.02, dz = (r() - 0.5) * 0.2;
      const eaves = r() < 0.8 ? 5.2 : 2.6, color = walls[Math.floor(r() * walls.length)];
      const za = z0 + (street ? 0 : dz), zb = z1 + (street ? dz : 0);
      b.box(x0, TER - 0.05, za, x1, eaves, zb, color, { win: HOUSE_WIN, seed: x0 * 0.31 + za });
      gable(b, x0, za, x1, zb, eaves, 1.0 + r() * 0.3, roofs[Math.floor(r() * roofs.length)], color, 'z', 0.2);
      if (r() < 0.5) b.box((x0 + x1) / 2 + 0.25, eaves + 0.2, za + 0.6, (x0 + x1) / 2 + 0.5, eaves + 1.5, za + 0.85, 0x8f7d58);
    }
  }
  // a warehouse on the quay
  b.box(qx + 0.1, TER - 0.05, l.z0 + 4.4, hx0 - 0.15, 2.6, gz - 0.8, 0xb39b6b, { win: HOUSE_WIN, seed: 3.3 });
  gable(b, qx + 0.1, l.z0 + 4.4, hx0 - 0.15, gz - 0.8, 2.6, 0.7, ROOF.tile, 0xb39b6b, 'z', 0.15);

  // the gold shops on the street to the gate: striped awnings, and gold on the counters
  const front = gz - 0.75;
  for (const ax of [hx0 + 1.3, hx0 + 3.7]) {
    for (const s of [-1, 1]) slab(b, [ax + s * 0.28, 2.45, front + 0.03], [ax + s * 0.28, 2.0, front + 0.9], 0.27, 0.04, s < 0 ? CRIMSON : 0xd9b23c);
    b.box(ax - 0.5, TER, front + 0.25, ax + 0.5, 1.15, front + 0.6, TIMBER, { top: 0x6b5136 });
    for (const dx of [-0.25, 0.05, 0.3]) b.box(ax + dx - 0.08, 1.15, front + 0.35, ax + dx + 0.08, 1.3, front + 0.5, GILT);
    k.person(ax, front + 1.25, TER);
  }
  for (const [x, z] of [[hx0 + 2.4, front + 1.0], [wx - 1.6, front + 1.2], [hx0 + 0.3, l.z0 + 4.0]]) k.person(x, z, TER);
  k.lights.push({ x: hx0 + 2.5, z: front + 1, r: 8, color: '#ffcf8a', k: 0.45 });

  // --- the quay: a crane, barrels, crates, and folk at work ---
  const cz = l.z0 + 1.85;
  b.beam([qx + 0.3, TER, cz], [qx + 0.3, TER + 3.6, cz], 0.1, 0.08, TIMBER);
  b.beam([qx + 0.3, TER + 3.4, cz], [qx - 1.6, TER + 3.0, cz], 0.07, 0.05, TIMBER);
  for (let j = 0; j < 5; j++) b.cyl(qx + 0.3 + (j % 2) * 0.45, l.z0 + 2.45 + j * 0.33, TER, TER + 0.5, 0.2, 0.2, 6, 0x7a5a3a, { cap: 0x5b4634 });
  for (let j = 0; j < 2; j++) b.box(qx + 0.15, TER, gz + 0.2 + j * 0.5, qx + 0.55, TER + 0.4, gz + 0.6 + j * 0.5, 0x9a7c56);
  for (const [x, z] of [[qx + 0.55, l.z0 + 4.1], [qx + 0.5, gz - 0.35]]) k.person(x, z, TER);
  k.person(l.x0 + 0.45, sz - 1.5, 0.75);
  k.lights.push({ x: qx + 0.4, z: (l.z0 + l.z1) / 2, r: 10, color: '#ffcf8a', k: 0.5 });

  // --- ships: two galleys of the Lannister fleet, and the fishing boats ---
  galley(k, qx - 1.1, (mz + sz) / 2 + 0.2, Math.PI / 2, 5.2, 6.6);
  galley(k, qx - 3.2, (mz + sz) / 2 + 0.4, -Math.PI / 2, 4.6, 6.0);
  fishingBoat(k, qx - 2.6, mz + 0.65, 0);
  fishingBoat(k, l.x0 + 1.15, l.z0 + 1.2, 0.45);
  fishingBoat(k, qx - 3.5, sz - 0.42, Math.PI);
};

// ---------------------------------------------------------------------------
// Pyke
// ---------------------------------------------------------------------------

interface Stack { x: number; z: number; rx: number; rz: number; top: number; seed: number }

/** The stacks of Pyke, as places in its lot: the headland it was built on, the four that carry its keeps, and a stump. */
const pykeStacks = (l: Lot): Record<'head' | 'great' | 'kitchen' | 'bloody' | 'sea' | 'stump', Stack> => ({
  head: { x: l.x1 - 1.6, z: l.z1 - 4.5, rx: 1.45, rz: 4.0, top: 7.4, seed: 11 },
  great: { x: l.x0 + 7.4, z: l.z0 + 10.0, rx: 1.8, rz: 1.8, top: 7.0, seed: 12 },
  kitchen: { x: l.x0 + 8.8, z: l.z0 + 3.8, rx: 1.5, rz: 1.5, top: 5.6, seed: 13 },
  bloody: { x: l.x0 + 3.4, z: l.z0 + 13.8, rx: 1.4, rz: 1.4, top: 5.0, seed: 14 },
  sea: { x: l.x0 + 1.8, z: l.z0 + 3.6, rx: 0.95, rz: 0.95, top: 4.4, seed: 15 },
  stump: { x: l.x0 + 3.6, z: l.z0 + 9.0, rx: 0.85, rz: 0.85, top: 2.2, seed: 16 },
});
const PYKE = lotOf('pyke');

/** A pillar of dark rock from below the sea, sheer, wet and black-green with lichen, and the surf white round its foot. */
function seaStack(k: Build, s: Stack): void {
  const b = k.b, r = rng(s.seed * 7919), n = 8, ph = r() * Math.PI;
  const jit = Array.from({ length: n }, () => 0.86 + 0.26 * r());
  const rings: [number, number, number][] = [[-1.6, 1.1, IRON.wet], [-0.6, 1.04, IRON.lichen], [s.top * 0.55, 0.97, IRON.rock], [s.top - 0.7, 0.92, IRON.high], [s.top, 0.82, IRON.high]];
  const at = (j: number, i: number): V3 => {
    const [y, sc] = rings[j], a = ph + ((i % n) / n) * Math.PI * 2, wob = 1 + 0.05 * Math.sin(i * 2.3 + j * 1.7 + s.seed);
    return [s.x + Math.cos(a) * s.rx * sc * jit[i % n] * wob, y, s.z + Math.sin(a) * s.rz * sc * jit[i % n] * wob];
  };
  for (let j = 0; j + 1 < rings.length; j++) {
    for (let i = 0; i < n; i++) {
      const p0 = at(j, i), p1 = at(j, i + 1), p2 = at(j + 1, i + 1), p3 = at(j + 1, i);
      const ex = p1[0] - p0[0], ey = p1[1] - p0[1], ez = p1[2] - p0[2], fx = p3[0] - p0[0], fy = p3[1] - p0[1], fz = p3[2] - p0[2];
      let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
      const mx = (p0[0] + p1[0] + p2[0] + p3[0]) / 4 - s.x, mz = (p0[2] + p1[2] + p2[2] + p3[2]) / 4 - s.z;
      if (nx * mx + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      b.quad(p0, p1, p2, p3, [nx / l, ny / l, nz / l], rings[j][2]);
    }
  }
  const top = rings.length - 1;
  for (let i = 0; i < n; i++) b.up([s.x, s.top, s.z], at(top, i), at(top, i + 1), IRON.top);
  // the surf, a ring of foam on the sea round its foot
  for (let i = 0; i < n; i++) {
    const a0 = ph + (i / n) * Math.PI * 2, a1 = ph + ((i + 1) / n) * Math.PI * 2;
    const ring = (a: number, j: number, out: number): V3 => [s.x + Math.cos(a) * (s.rx * 1.07 * jit[j % n] + out), -0.86, s.z + Math.sin(a) * (s.rz * 1.07 * jit[j % n] + out)];
    b.quad(ring(a0, i, 0), ring(a1, i + 1, 0), ring(a1, i + 1, 0.55), ring(a0, i, 0.55 + 0.15 * Math.sin(i * 3.1)), [0, 1, 0], FOAM);
  }
}

/** A rope bridge: a sagging line of planks between two ropes, hung from them. */
function ropeBridge(b: GeoBuilder, a: V3, c: V3, sag: number): void {
  const dx = c[0] - a[0], dz = c[2] - a[2], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const px = -dz / len, pz = dx / len;
  const at = (t: number, off: number, up: number): V3 => [a[0] + dx * t + px * off, a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t) + up, a[2] + dz * t + pz * off];
  const n = Math.max(3, Math.round(len / 0.55));
  for (let i = 0; i < n; i++) {
    const p = at((i + 0.5) / n, 0, 0);
    b.obox(p[0], p[1], p[2], (len / n) * 0.36, 0.04, 0.42, yaw, PLANK, { faces: 'B' });
  }
  for (const s of [-1, 1]) {
    const pts: V3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => at(t, s * 0.46, 0.8));
    b.sweep(pts, pts.map(() => 0.035), ROPE);
    for (const t of [0.25, 0.5, 0.75]) b.beam(at(t, s * 0.44, 0), at(t, s * 0.46, 0.8), 0.022, 0.022, ROPE);
  }
}

/** A door in a tower's face where a bridge comes in, dark, with a light in it at night. */
function bridgeDoor(b: GeoBuilder, x: number, z: number, y: number, towards: P2): void {
  const yaw = Math.atan2(towards[1] - z, towards[0] - x);
  b.obox(x, y + 0.75, z, 0.08, 0.75, 0.45, yaw, DARK_IN, { win: interior(0.85) });
}

const pyke: Model = (k: Build, l: Lot): void => {
  const b = k.b, S = pykeStacks(l);
  for (const s of Object.values(S)) seaStack(k, s);
  const anchor = (s: Stack, to: Stack, d: number, up = 0.05): V3 => {
    const ax = to.x - s.x, az = to.z - s.z, al = Math.hypot(ax, az);
    return [s.x + (ax / al) * d, s.top + up, s.z + (az / al) * d];
  };

  // --- the Great Keep, on the largest stack ---
  const G = S.great;
  roundTower(b, G.x, G.z, 1.15, l.top - 2.8, STONE.iron, { y0: G.top - 0.4, sides: 10, shade: STONE.ironShade, win: winFit(LOOPS, l.top - 3.8) });
  roundTower(b, G.x - 0.75, G.z - 0.75, 0.55, l.top - 0.8, STONE.iron, { y0: l.top - 4.0, sides: 8, shade: STONE.ironShade, win: winFit(LOOPS_CLOSE, l.top - 1.8) });
  banner(b, G.x + 0.7, G.z + 0.7, l.top - 2.8, 'greyjoy', 3.6);

  // --- the Kitchen Keep: squat and square, with a chimney ---
  const K = S.kitchen, kTop = K.top + 5.0;
  squareTower(b, K.x, K.z, 0.8, kTop, STONE.iron, { y0: K.top - 0.4, shade: STONE.ironShade, win: winFit(LOOPS_CLOSE, kTop - 1) });
  b.box(K.x + 0.25, kTop, K.z - 0.45, K.x + 0.6, kTop + 1.6, K.z - 0.1, IRON.rock);

  // --- the Bloody Keep, round, under a cone of slate ---
  const B = S.bloody;
  roundTower(b, B.x, B.z, 0.85, B.top + 7.2, STONE.iron, { y0: B.top - 0.4, sides: 8, shade: STONE.ironShade, win: winFit(LOOPS, B.top + 6.2), cone: { color: ROOF.slate, h: 2.3 } });
  banner(b, B.x - 0.2, B.z + 0.95, B.top, 'greyjoy', 2.6, 0.8);

  // --- the Sea Tower, on the outermost and thinnest: old, round, and white with salt at its foot ---
  const Sea = S.sea;
  roundTower(b, Sea.x, Sea.z, 0.62, l.top - 0.8, IRON.old, { y0: Sea.top - 0.4, sides: 10, flare: 0.2, shade: STONE.iron, win: winFit(LOOPS_CLOSE, l.top - 1.8) });
  b.cyl(Sea.x, Sea.z, Sea.top - 0.2, Sea.top + 3.6, 0.665, 0.64, 10, IRON.salt, { cap: false });
  fire(k, Sea.x, l.top - 0.4, Sea.z, 0.22, 0);

  // --- the headland on the isle: a crescent wall on its clifftop, with a gatehouse to the land ---
  const H = S.head, hy = H.top;
  const wz = [H.z - 2.9, H.z - 1.1, H.z + 1.1, H.z + 2.9], wxs = [H.x + 0.75, H.x + 1.05, H.x + 1.05, H.x + 0.75];
  rampart(b, [wxs[0], wz[0]], [wxs[1], wz[1]], hy + 2.0, STONE.iron, { y0: hy - 1.6, thick: 0.8, shade: STONE.ironShade });
  rampart(b, [wxs[2], wz[2]], [wxs[3], wz[3]], hy + 2.0, STONE.iron, { y0: hy - 1.6, thick: 0.8, shade: STONE.ironShade });
  for (const j of [1, 2]) roundTower(b, wxs[j], wz[j], 0.6, hy + 3.0, STONE.iron, { y0: hy - 1.2, sides: 8, shade: STONE.ironShade, win: winFit(LOOPS, hy + 2.0) });
  for (const j of [0, 3]) roundTower(b, wxs[j], wz[j], 0.45, hy + 2.4, STONE.iron, { y0: hy - 1.6, sides: 8, shade: STONE.ironShade, win: winFit(LOOPS, hy + 1.4), cone: { color: ROOF.slate, h: 1.3 } });
  b.box(wxs[1] - 0.4, hy + 1.5, H.z - 0.6, wxs[1] + 0.4, hy + 2.6, H.z + 0.6, STONE.iron, { top: STONE.ironShade, faces: 'NESWTB' });
  b.box(wxs[1] - 0.04, hy, H.z - 0.5, wxs[1] + 0.04, hy + 1.5, H.z + 0.5, DARK_IN, { faces: 'EW', win: interior(0.8) });
  banner(b, wxs[1], H.z, hy + 2.6, 'greyjoy', 2.4, 0.7);
  brazier(k, H.x - 0.3, H.z - 0.8, hy);
  for (const dz of [-0.75, 0.75]) fire(k, wxs[1] + 0.55, hy + 1.2, H.z + dz, 0.18, 0);
  k.person(H.x - 0.4, H.z + 1.0, hy);
  k.person(wxs[2] - 0.1, (wz[2] + wz[3]) / 2, hy + 2.0);
  k.lights.push({ x: H.x - 1.0, z: H.z, r: 9, color: '#ffcf8a', k: 0.5 });
  k.lights.push({ x: G.x, z: G.z + 1.5, r: 8, color: '#ffcf8a', k: 0.45 });

  // --- the covered bridge of stone from the headland to the Great Keep ---
  const ca = anchor(H, G, 0.6), cb = anchor(G, H, 1.0);
  const cyaw = Math.atan2(cb[2] - ca[2], cb[0] - ca[0]), clen = Math.hypot(cb[0] - ca[0], cb[2] - ca[2]);
  b.moved((ca[0] + cb[0]) / 2, 0, (ca[2] + cb[2]) / 2, cyaw, () => {
    const y0 = Math.min(H.top, G.top) - 0.35;
    b.box(-clen / 2, y0, -0.6, clen / 2, y0 + 1.8, 0.6, STONE.iron, { faces: 'NESWTB' });
    for (const s of [-1, 1]) for (const t of [-0.6, 0, 0.6]) b.box(t - 0.1, y0 + 0.7, s * 0.6 - 0.03, t + 0.1, y0 + 1.25, s * 0.6 + 0.03, DARK_IN, { faces: s > 0 ? 'S' : 'N', win: interior(0.85) });
    gable(b, -clen / 2, -0.6, clen / 2, 0.6, y0 + 1.8, 0.55, ROOF.slate, STONE.iron, 'x', 0.15);
    b.box(-clen / 2 + 0.3, y0 - 0.5, -0.45, clen / 2 - 0.3, y0, 0.45, IRON.rock, { faces: 'NESWB' });
  });

  // --- rope bridges to the outer stacks ---
  // each from a door in one tower to a door in the other; `rs` and `rt` are how far out the towers' faces are
  const rope = (s: Stack, t: Stack, ds: number, dt: number, sag: number, rs: number, rt: number): void => {
    const a = anchor(s, t, ds), c = anchor(t, s, dt), da = anchor(s, t, rs), dc = anchor(t, s, rt);
    ropeBridge(b, a, c, sag);
    bridgeDoor(b, da[0], da[2], da[1], [t.x, t.z]);
    bridgeDoor(b, dc[0], dc[2], dc[1], [s.x, s.z]);
  };
  rope(G, B, 1.3, 0.95, 0.55, 1.13, 0.84);
  rope(G, K, 1.3, 0.95, 0.5, 1.13, 0.84);
  rope(K, Sea, 0.95, 0.7, 0.75, 0.84, 0.62);
  {
    const a = anchor(G, B, 1.3), c = anchor(B, G, 0.95);
    k.person((a[0] + c[0]) / 2, (a[2] + c[2]) / 2, (a[1] + c[1]) / 2 - 0.55 + 0.04);
  }

  // --- longships: one under oars, one at anchor with its sail up, one with its sail furled ---
  longship(k, l.x0 + 5.0, l.z0 + 2.2, 0.05, { sail: true, oars: true, crew: 3 });
  longship(k, l.x1 - 2.6, l.z0 + 1.1, 0.0, { sail: true, oars: false, crew: 2 });
  longship(k, l.x0 + 1.4, l.z0 + 8.0, Math.PI / 2, { sail: false, oars: false, crew: 1 });

  // the name, on a stony strand at the headland's foot: on the mainland shore opposite, Riverrun would hide it
  const strand: Stack = { x: H.x, z: l.z1 - 0.3, rx: 1.9, rz: 1.0, top: 0.35, seed: 17 };
  seaStack(k, strand);
  nameBoard(k, 'west-pyke', strand.x, strand.z, strand.top, undefined, 1.2);
};

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'casterly-rock': casterlyRock,
  lannisport,
  pyke,
};
export const COVERS: string[] = ['casterly-rock-n'];
export const SIGNS: SignDef[] = [
  nameSign('west-casterly-rock', 'Casterly Rock'),
  nameSign('west-lannisport', 'Lannisport'),
  nameSign('west-pyke', 'Pyke'),
];
export const FLOORED: string[] = [];

const STACKS = Object.values(pykeStacks(PYKE));
const PORT = lotOf('lannisport');

export function heightAt(x: number, z: number): number {
  const rock = rockY(x, z);
  if (rock > 0) return rock;
  for (const s of STACKS) if (((x - s.x) / s.rx) ** 2 + ((z - s.z) / s.rz) ** 2 < 0.8) return s.top;
  if (x > PORT.x0 + 5.6 && x < PORT.x1 && z > PORT.z0 && z < PORT.z1) return 0.5;
  return 0;
}

export function extras(_k: Build): void {}
