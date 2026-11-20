// The Vale: the Giant's Lance, the Eyrie, the Bloody Gate and the Gates of the Moon. And the inn at the crossroads,
// with the old stone bridge where the kingsroad crosses the Trident beside it.
//
// The Giant's Lance is one mountain over the five `vale-` lots, which are its steps: it stays under each lot's top
// inside that lot and comes down to the level ground at the edge of the last, but at the board's east edge, where it
// is cut off and shows its beds of rock. The Eyrie stands on its south-west shoulder above a sheer face, and the Gates
// of the Moon at the foot of that face, where the high road ends in the ring of its yard.

import * as THREE from 'three';
import { rounded } from '../../engine/corners';
import { Smoke } from '../../engine/effects';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, oval, rect } from '../../engine/ground';
import { lantern, lathe, tri } from '../../engine/parts';
import { gable, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import { drawField, field, heightOn } from '../../engine/terrain';
import type { Build } from '../../engine/tile';
import {
  DAUB, DARK, DOOR, HOUSE_WIN, IRONWORK, LOOPS, LOOPS_CLOSE, PLASTER, ROOF, STONE, TIMBER, TIMBER_DARK,
  banner, brazier, fire, nameBoard, nameSign, rampart, roundTower,
} from './look';
import type { Model } from './models';
import { BOARD, BRIDGES, COAST_EAST, EDGE, HERO_SPOTS, RIVERS, ROADS, TURNS, lotOf, type Lot, type P2 } from './plan';

// ---------------------------------------------------------------------------
// Colours of this file's own. Worth moving into look.ts if another region wants them.
// ---------------------------------------------------------------------------

/** The pale stone of the inn's ground storey: paler than the riverlands' castles. */
const INN_STONE = 0xd3c9b3;
/** The sky blue of House Arryn, for the Eyrie's cone roofs. */
const ARRYN_BLUE = 0x6f98c8;
/** Paving of a yard, and of the inn's yard. */
const PAVE = 0xc4bba9, PAVE_DARK = 0xb3a996;
/** The goat track up the mountain: a pale thread on the rock. */
const TRACK = 0xddd3c0;
/** The mountain: grass and scree at its feet, rock in beds where it is steep, snow above. */
const GRASS = [0x86ad62, 0x7da35a, 0x8fb46b];
const SCREE = [0xa59d8e, 0x968e80, 0xafa697];
const ROCKS = [0x8c877e, 0x7b766e, 0x979188, 0x716c65];
const SNOWS = [0xeef3f6, 0xe2e9ee];
const HIGH_ROCK = 0xaaa9a6;
const STRATA = [0x8a7f70, 0x9c907e, 0x766b5e, 0xa89a84, 0x6c6256, 0x93897a];

const fract = (v: number): number => v - Math.floor(v);
const hash = (x: number, z: number): number => fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const lerpColor = (a: number, b: number, t: number): number => {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, clamp(t, 0, 1)).getHex();
};

// ---------------------------------------------------------------------------
// The lots
// ---------------------------------------------------------------------------

const VN = lotOf('vale-north'), VB = lotOf('vale-body'), VH = lotOf('vale-high'), VS = lotOf('vale-summit'), VSO = lotOf('vale-south');
const EY = lotOf('eyrie'), GM = lotOf('gates-moon');
/** The lots the mountain stands on. */
const ROCKY = [VN, VB, VH, VS, VSO];

const inLot = (l: { x0: number; z0: number; x1: number; z1: number }, x: number, z: number): boolean => x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1;

// ---------------------------------------------------------------------------
// The Giant's Lance: its height everywhere
// ---------------------------------------------------------------------------

/** The shore of the Bite, north of the mountain: the land ends there. */
const SHORE = COAST_EAST[7][1];
const FX0 = Math.min(...ROCKY.map((l) => l.x0)), FX1 = Math.min(BOARD.x1 - EDGE, Math.max(...ROCKY.map((l) => l.x1)));
const FZ0 = Math.max(Math.min(...ROCKY.map((l) => l.z0)), SHORE + 0.25), FZ1 = Math.max(...ROCKY.map((l) => l.z1));
const CELL = 1.25;
const NXC = Math.max(1, Math.round((FX1 - FX0) / CELL)), NZC = Math.max(1, Math.round((FZ1 - FZ0) / CELL));
/** How far round a corner of the grid the facets that meet at it reach: a corner is kept under every top within this. */
const RX = ((FX1 - FX0) / NXC) * 1.02, RZ = ((FZ1 - FZ0) / NZC) * 1.02;

/** The highest a lot lets the rock stand at a place. The castle at the foot stands on level ground. */
function capAt(x: number, z: number): number {
  if (inLot(GM, x, z)) return 0;
  let c = 0;
  for (const l of ROCKY) if (inLot(l, x, z)) c = Math.max(c, l.top);
  return c;
}

/** The lowest of those tops anywhere near a corner of the grid, so that no facet that meets at it rises over a top. */
function capNear(x: number, z: number): number {
  let c = Infinity;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) c = Math.min(c, capAt(clamp(x + (i * RX) / 2, FX0, FX1), clamp(z + (j * RZ) / 2, FZ0, FZ1)));
  }
  return c;
}

/** The level ground round the mountain, as rectangles: west of it, south of its body, south of its south foot, and the castle at its foot. */
const LEVEL: [number, number, number, number][] = [
  [-1e9, -1e9, VN.x0, 1e9],
  [-1e9, VB.z0, VB.x0, 1e9],
  [-1e9, VB.z1, VSO.x0, 1e9],
  [-1e9, VSO.z1, 1e9, 1e9],
  [GM.x0, GM.z0, GM.x1, GM.z1],
];
/** How far a place is from the level ground. */
function fromLevel(x: number, z: number): number {
  let d = Infinity;
  for (const [x0, z0, x1, z1] of LEVEL) d = Math.min(d, Math.hypot(Math.max(0, x0 - x, x - x1), Math.max(0, z0 - z, z - z1)));
  return d;
}

/** The peak, in the middle of the summit's lot. */
const PEAK = { x: (VS.x0 + VS.x1) / 2, z: (VS.z0 + VS.z1) / 2 };
/** The shoulder the Eyrie stands on. */
const SHOULDER = { x: EY.x0 + (EY.x1 - EY.x0) * 0.62, z: (EY.z0 + EY.z1) / 2, y: VH.top };

/** The three waycastles on the way up, Stone, Snow and Sky, each on a ledge of its own. */
const WAY = {
  stone: { x: VB.x0 + 3.3, z: EY.z1 - 3.0, y: 12 },
  snow: { x: VB.x0 + 6.6, z: EY.z0 + 0.6, y: 22 },
  sky: { x: VH.x0 + 2.0, z: EY.z0 - 0.7, y: 31 },
};

/** The mountain as it would be: a lance of rock on a broad body, a shoulder to the south-west, a ridge east and a spur south. */
function natural(x: number, z: number): number {
  const lance = VS.top + 2 - 4.0 * Math.hypot((x - PEAK.x) / 1.25, z - PEAK.z);
  const shoulder = SHOULDER.y + 1.5 - 4.2 * Math.max(0, Math.hypot((x - SHOULDER.x) / 1.3, z - SHOULDER.z) - 2.6);
  const body = VB.top + 2 - 1.25 * Math.hypot((x - PEAK.x - 1) * 0.8, (z - PEAK.z) * 1.3);
  const east = VB.top + 6 - 0.9 * Math.max(0, x - PEAK.x - 3) - 2.4 * Math.abs(z - PEAK.z - 0.5);
  const spur = VSO.top - 1 - 1.4 * Math.abs(x - (VSO.x0 + VSO.x1) / 2 - 2) - 0.7 * Math.max(0, z - VSO.z0 - 1);
  let h = Math.max(lance, shoulder, body, east, spur);
  h += 1.1 * Math.sin(x * 0.83 + z * 0.41) + 0.8 * Math.sin(z * 1.27 - x * 0.53 + 1.3) + 0.45 * Math.sin(x * 2.3 + z * 1.9);
  // its north side falls away towards the Bite, so that the lowest step slopes rather than lies level
  return h - 3.4 * Math.max(0, VH.z0 + 2.5 - z);
}

/**
 * How high the mountain may rise this far from the level ground: its feet are
 * steep, but not sheer, but under the Eyrie, where the face drops straight to
 * the Gates of the Moon. To the north it comes down to a low cliff over the Bite.
 */
function foot(x: number, z: number): number {
  const d = fromLevel(x, z), t = clamp((5.5 - Math.abs(x - SHOULDER.x)) / 2.5, 0, 1);
  const k = 3 + 9 * t * t * (3 - 2 * t);
  const n = z - FZ0, north = n < 5.2 ? 2.5 + 1.45 * n : 10 + 9 * (n - 5.2);
  return Math.min(k * d + 0.35 * d * d, north);
}

function mountainHeight(x: number, z: number): number {
  let h = Math.min(natural(x, z), foot(x, z));
  // a level ledge for each waycastle, and the rock eased round it
  for (const w of Object.values(WAY)) {
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < 1.3) h = w.y;
    else if (d < 2.7) {
      const t = (d - 1.3) / 1.4, s = t * t * (3 - 2 * t);
      h = w.y + (h - w.y) * s;
    }
  }
  h = Math.min(h, capNear(x, z));
  return h < 0.05 ? 0 : h;
}

const LANCE = field(FX0, FZ0, FX1, FZ1, CELL, mountainHeight);

/** The colour of a facet of the mountain. */
function rockColor(y: number, level: number, x: number, z: number): number {
  const n = hash(Math.round(x * 3), Math.round(z * 3));
  const bed = Math.floor((y + 1.1 * Math.sin(x * 0.31 + z * 0.23)) / 3.3);
  if (y > 35.5 + n * 1.5) {
    if (level > 0.4) return SNOWS[n > 0.6 ? 1 : 0];
    return level > 0.22 && n > 0.5 ? SNOWS[1] : HIGH_ROCK;
  }
  if (level < 0.5) return ROCKS[((bed % ROCKS.length) + ROCKS.length) % ROCKS.length];
  if (y > 30 && level > 0.62) return SNOWS[1];
  if (y < 3.2 && level > 0.72) return GRASS[Math.floor(n * 3)];
  if (y < 8) return n > 0.45 ? GRASS[Math.floor(n * 3) % 3] : SCREE[Math.floor(n * 7) % 3];
  return y > 24 && level > 0.8 && n > 0.6 ? SNOWS[1] : SCREE[Math.floor(n * 3)];
}

export function heightAt(x: number, z: number): number {
  return heightOn(LANCE, x, z);
}

/** A point on the mountain, a little above it. */
const onRock = (x: number, z: number, lift = 0): V3 => [x, heightOn(LANCE, x, z) + lift, z];

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/**
 * The fighting top of a rectangular tower or keep: a course that juts out by
 * `flare` from `top - 1` to `top`, and merlons on it to `top + 0.8`.
 */
function crown(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, top: number, color: number, shade: number, flare = 0.2): void {
  const X0 = x0 - flare, X1 = x1 + flare, Z0 = z0 - flare, Z1 = z1 + flare;
  b.box(X0, top - 1, Z0, X1, top, Z1, color, { top: shade, faces: 'NESWTB' });
  const nx = Math.max(2, Math.round((X1 - X0) / 1.7)), nz = Math.max(2, Math.round((Z1 - Z0 - 0.8) / 1.7));
  for (let i = 0; i < nx; i++) {
    const t = X0 + ((i + 0.5) * (X1 - X0)) / nx, w = ((X1 - X0) / nx) * 0.28;
    b.box(t - w, top, Z0, t + w, top + 0.8, Z0 + 0.4, color, { top: shade });
    b.box(t - w, top, Z1 - 0.4, t + w, top + 0.8, Z1, color, { top: shade });
  }
  for (let i = 0; i < nz; i++) {
    const t = Z0 + 0.4 + ((i + 0.5) * (Z1 - Z0 - 0.8)) / nz, w = ((Z1 - Z0 - 0.8) / nz) * 0.28;
    b.box(X0, top, t - w, X0 + 0.4, top + 0.8, t + w, color, { top: shade });
    b.box(X1 - 0.4, top, t - w, X1, top + 0.8, t + w, color, { top: shade });
  }
}

/** A rectangular tower or keep from `y0`: a shaft with loops to `top - 1`, and its crown. Its merlons reach `top + 0.8`. */
function block(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, top: number, color: number, shade: number, win: WinSpec = LOOPS): void {
  b.box(x0, y0, z0, x1, top - 1, z1, color, { win, seed: x0 * 0.13 + z0 * 0.07, faces: 'NESW' });
  crown(b, x0, z0, x1, z1, top, color, shade);
}

/** A doorway or a gate: a dark opening with a round head, standing a hair proud of a wall that faces `n`. */
function doorway(b: GeoBuilder, x: number, z: number, y: number, w: number, h: number, n: V3, lit: number, color = DARK): void {
  const ax = -n[2], az = n[0], hw = w / 2, spring = y + h - hw;
  const P = (u: number, v: number): V3 => [x + ax * u, v, z + az * u];
  b.quad(P(-hw, y), P(hw, y), P(hw, spring), P(-hw, spring), n, color, { win: interior(lit) });
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const a0 = (Math.PI * i) / steps, a1 = (Math.PI * (i + 1)) / steps;
    tri(b, P(0, spring), P(Math.cos(a0) * hw, spring + Math.sin(a0) * hw), P(Math.cos(a1) * hw, spring + Math.sin(a1) * hw), n, color, { win: interior(lit) });
  }
}

/** A lump of rock on the ground: a few facets, up to `h` high. */
function boulder(b: GeoBuilder, x: number, z: number, r: number, h: number, seed: number): void {
  const rand = rng(seed);
  lathe(b, x, z, [[r, -0.2], [r * (0.85 + rand() * 0.2), h * 0.45], [r * 0.45, h * 0.9], [0.05, h]], 5 + Math.floor(rand() * 2), ROCKS[Math.floor(rand() * ROCKS.length)]);
}

/** A horse standing, its head towards `yaw`. */
function horse(b: GeoBuilder, x: number, z: number, yaw: number, color: number): void {
  b.moved(x, 0, z, yaw, () => {
    b.box(-0.75, 0.75, -0.26, 0.75, 1.35, 0.26, color);
    for (const [u, v] of [[-0.6, -0.17], [-0.6, 0.17], [0.6, -0.17], [0.6, 0.17]]) b.box(u - 0.08, 0, v - 0.08, u + 0.08, 0.78, v + 0.08, color, { faces: 'NESW' });
    b.obox(0.95, 1.55, 0, 0.32, 0.18, 0.16, 0, color);
    b.obox(1.18, 1.45, 0, 0.2, 0.15, 0.13, 0, color);
    b.box(-0.95, 0.85, -0.05, -0.75, 1.3, 0.05, 0x2b2420);
  });
}

// ---------------------------------------------------------------------------
// The Giant's Lance, with Alyssa's Tears, the waycastles and the goat track
// ---------------------------------------------------------------------------

const lanceModel: Model = (k) => {
  const b = k.b;
  drawField(b, LANCE, { color: rockColor, cut: STRATA[0], edges: 'NE', strata: STRATA });

  // --- Alyssa's Tears: a thin white fall down the west face, that turns to mist half way down ---
  const fz = VH.z0 + 2.1, fx0 = PEAK.x - 3.0, fx1 = VB.x0 + 4;
  const topY = heightOn(LANCE, fx0, fz), stopY = topY * 0.5;
  let prev: V3 | null = null, mistAt: V3 = onRock(fx1, fz);
  for (let x = fx0; x >= fx1; x -= 0.3) {
    const p: V3 = [x - 0.14, heightOn(LANCE, x, fz) + 0.14, fz];
    if (prev && p[1] >= stopY) {
      const t = (topY - p[1]) / (topY - stopY), w = 0.34 + 0.16 * t;
      const c = lerpColor(0xf6fafc, 0xb8c2c6, t * t);
      b.quad([prev[0], prev[1], prev[2] - w], [prev[0], prev[1], prev[2] + w], [p[0], p[1], p[2] + w], [p[0], p[1], p[2] - w], [-0.7, 0.7, 0], c);
      mistAt = p;
    }
    prev = p;
  }
  // the pool of spray where it gives out, a few pale puffs on the rock
  for (const [dx, dz, s] of [[0, 0, 0.7], [-0.5, 0.6, 0.5], [-0.3, -0.7, 0.55]]) {
    const y = heightOn(LANCE, mistAt[0] + dx, mistAt[2] + dz);
    lathe(b, mistAt[0] + dx - 0.2, mistAt[2] + dz, [[s * 0.6, y - 0.1], [s, y + s * 0.5], [s * 0.5, y + s * 1.0], [0.05, y + s * 1.2]], 6, 0xe8eef1);
  }
  mist = { x: mistAt[0] - 0.3, y: mistAt[1], z: mistAt[2] };

  // --- the waycastles: Stone with its iron gate between two thick towers, Snow a single tower, Sky a crescent wall round a cave ---
  const G = STONE.north, GS = STONE.northShade;
  {
    const w = WAY.stone;
    for (const s of [-1, 1]) roundTower(b, w.x + s * 0.75, w.z + 0.35, 0.5, w.y + 2.4, G, { y0: w.y - 0.6, shade: GS, sides: 8, win: LOOPS_CLOSE });
    b.box(w.x - 0.35, w.y - 0.5, w.z + 0.05, w.x + 0.35, w.y + 1.8, w.z + 0.65, G, { top: GS });
    b.box(w.x - 0.28, w.y, w.z + 0.66, w.x + 0.28, w.y + 1.15, w.z + 0.7, 0x5a5f66, { faces: 'S' });
    banner(b, w.x - 0.75, w.z + 0.35, w.y + 2.4, 'arryn', 2, 0.45);
  }
  {
    const w = WAY.snow;
    roundTower(b, w.x, w.z, 0.62, w.y + 2.8, G, { y0: w.y - 0.6, shade: GS, sides: 8, win: LOOPS_CLOSE, cone: { color: ARRYN_BLUE, h: 1.2 } });
  }
  {
    const w = WAY.sky;
    // the cave, in the rock on the up side, and the wall that curves round in front of it
    const up = Math.atan2(SHOULDER.z - w.z, SHOULDER.x - w.x);
    const cx = w.x + Math.cos(up) * 1.05, cz = w.z + Math.sin(up) * 1.05;
    b.obox(cx, w.y + 0.55, cz, 0.12, 0.55, 0.6, up, DARK, { win: interior(0.35) });
    for (let i = 0; i < 5; i++) {
      const a = up + Math.PI * (0.55 + (i / 4) * 0.9), x = w.x + Math.cos(a) * 1.0, z = w.z + Math.sin(a) * 1.0;
      b.obox(x, w.y + 0.45, z, 0.18, 0.75, 0.42, a, G, { top: GS });
    }
  }

  // --- the goat track: from behind the Gates of the Moon, by way of the three waycastles, to the Eyrie's door ---
  const stops: P2[] = [
    [GM.x0 - 0.6, GM.z0 - 0.3],
    [WAY.stone.x, WAY.stone.z + 1.0],
    [WAY.snow.x - 0.3, WAY.snow.z + 0.9],
    [WAY.sky.x - 0.4, WAY.sky.z + 0.8],
    [SHOULDER.x - 1.6, EY.z0 + 0.4],
  ];
  const legs = [3, 3, 3, 2];
  const pts: P2[] = [stops[0]];
  for (let i = 0; i + 1 < stops.length; i++) {
    const [ax, az] = stops[i], [bx, bz] = stops[i + 1], n = legs[i], l = Math.hypot(bx - ax, bz - az);
    const px = -(bz - az) / l, pz = (bx - ax) / l;
    for (let j = 1; j <= n; j++) {
      const t = j / n, off = j === n ? 0 : (j % 2 ? 1 : -1) * 1.1;
      pts.push([ax + (bx - ax) * t + px * off, az + (bz - az) * t + pz * off]);
    }
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.8));
    for (let j = 0; j < n; j++) {
      const a = onRock(ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n, 0.16), c = onRock(ax + ((bx - ax) * (j + 1)) / n, az + ((bz - az) * (j + 1)) / n, 0.16);
      if (Math.abs(c[1] - a[1]) > 2.5) continue;
      slab(b, a, c, 0.17, 0.12, TRACK);
    }
  }
  // a mule with its load on the way up, and a driver
  {
    const [mx, mz] = pts[4], y = heightOn(LANCE, mx, mz);
    b.moved(mx, y, mz, 0.6, () => {
      b.box(-0.45, 0.45, -0.18, 0.45, 0.85, 0.18, 0x6b5a4a);
      b.box(-0.3, 0.85, -0.3, 0.25, 1.15, 0.3, 0xb59c5e);
      b.box(0.45, 0.75, -0.1, 0.75, 1.05, 0.1, 0x6b5a4a);
      for (const [u, v] of [[-0.35, -0.12], [-0.35, 0.12], [0.35, -0.12], [0.35, 0.12]]) b.box(u - 0.06, 0, v - 0.06, u + 0.06, 0.47, v + 0.06, 0x5a4a3c, { faces: 'NESW' });
    });
    k.person(mx - 0.9, mz - 0.4, heightOn(LANCE, mx - 0.9, mz - 0.4));
  }

  // --- pines on its lower slopes ---
  const rand = rng(91027);
  let planted = 0;
  for (let i = 0; i < 160 && planted < 16; i++) {
    const x = FX0 + rand() * (FX1 - FX0), z = FZ0 + rand() * (FZ1 - FZ0), y = heightOn(LANCE, x, z);
    if (y < 1.2 || y > 11 || inLot(GM, x, z)) continue;
    const g = heightOn(LANCE, x + 0.8, z) - y, h = heightOn(LANCE, x, z + 0.8) - y;
    if (Math.hypot(g, h) > 1.4) continue;
    k.tree(x, z, 0.75 + rand() * 0.35, true, y - 0.1);
    planted++;
  }
};

/** Where the spray of Alyssa's Tears hangs: set when the mountain is built. */
let mist: { x: number; y: number; z: number } | null = null;

// ---------------------------------------------------------------------------
// The Eyrie
// ---------------------------------------------------------------------------

const eyrieModel: Model = (k, l) => {
  const b = k.b, W = STONE.white, WS = STONE.whiteShade;
  const cx = SHOULDER.x, cz = SHOULDER.z;
  /** The lowest the rock is under a round footprint, so that a tower that stands at the edge goes down to it. */
  const under = (x: number, z: number, r: number): number => {
    let y = heightOn(LANCE, x, z);
    for (let i = 0; i < 8; i++) y = Math.min(y, heightOn(LANCE, x + Math.cos(i * 0.785) * r, z + Math.sin(i * 0.785) * r));
    return Math.max(SHOULDER.y - 7, y - 0.4);
  };
  // the keep, low among the towers, and the seven towers bunched round it like arrows in a quiver
  const kx0 = cx - 1.4, kx1 = cx + 1.5, kz0 = cz - 1.6, kz1 = cz + 1.6;
  let ky = Infinity;
  for (const [x, z] of [[kx0, kz0], [kx1, kz0], [kx0, kz1], [kx1, kz1], [cx, cz]]) ky = Math.min(ky, heightOn(LANCE, x, z));
  block(b, kx0, kz0, kx1, kz1, ky - 0.4, l.top - 6.2, W, WS, LOOPS_CLOSE);
  const towers: [number, number, number, number, number][] = [
    // dx, dz, radius, top, cone (0 for battlements)
    [0, -0.3, 1.0, l.top - 0.4, 3.0],
    [-1.25, -1.5, 0.8, l.top - 2.5, 2.6],
    [1.3, -1.4, 0.82, l.top - 2.0, 2.6],
    [-1.35, 0.95, 0.78, l.top - 4.0, 0],
    [1.35, 1.05, 0.84, l.top - 3.0, 2.4],
    [0.05, 1.75, 0.74, l.top - 5.0, 2.2],
    [0.15, -2.45, 0.72, l.top - 4.5, 0],
  ];
  towers.forEach(([dx, dz, r, top, cone], i) => {
    const x = cx + dx, z = cz + dz;
    roundTower(b, x, z, r, top, W, { y0: under(x, z, r), shade: WS, sides: 10, win: LOOPS_CLOSE, seed: 0.31 + i * 0.17, flare: 0.16, cone: cone ? { color: ARRYN_BLUE, h: cone } : undefined });
    if (!cone) banner(b, x, z, top, 'arryn', 3.4, 0.6);
  });
  // a brazier on the keep's roof, and the light that falls round the castle
  brazier(k, kx0 + 0.6, kz1 - 0.5, l.top - 6.2);
  k.lights.push({ x: cx, z: cz + 2, r: 8, color: '#ffd9a8', k: 0.45 });
  for (let i = 0; i < 2; i++) k.person(kx0 + 0.9 + i * 1.3, kz1 - 0.9, l.top - 6.2);
};

// ---------------------------------------------------------------------------
// The Bloody Gate
// ---------------------------------------------------------------------------

const bloodyGateModel: Model = (k, l) => {
  const b = k.b, G = STONE.north, GS = STONE.northShade;
  const arch = lotOf('bloody-gate-arch');
  const road = ROADS.high[ROADS.high.length - 1][1];
  const nz = road - 4.5, sz = road + 4.5, span = 6;
  const x0 = l.x0 + 0.3, x1 = l.x1 - 0.3;
  // the north tower, the tall one: its foot runs south to the edge of the arch
  block(b, x0, l.z0 + 0.3, x1, nz, 0, l.top - 0.8, G, GS, LOOPS);
  banner(b, (x0 + x1) / 2, (l.z0 + nz) / 2, l.top - 0.8, 'arryn', 4, 0.8);
  k.person(x0 + 0.6, nz - 0.6, l.top - 0.8);
  // the south tower, the low one, on the river's edge: it goes down into the water
  const s0 = sz, s1 = sz + 2.6;
  block(b, x0 + 0.3, s0, x1 - 0.3, s1, -1.6, arch.top - 0.8, G, GS, LOOPS);
  // the covered bridge between them: its floor is the arch's soffit
  const by = span;
  b.box(x0 + 0.4, by, nz, x1 - 0.4, by + 0.6, sz, GS, { faces: 'EWTB' });
  b.box(x0 + 0.5, by + 0.6, nz, x1 - 0.5, arch.top - 0.6, sz, G, { faces: 'EW' });
  gable(b, x0 + 0.5, nz, x1 - 0.5, sz, arch.top - 0.6, 0.55, ROOF.slate, G, 'z', 0.15);
  for (const s of [-1, 1]) {
    const x = s < 0 ? x0 + 0.48 : x1 - 0.48;
    for (let i = 0; i < 4; i++) {
      const z = nz + 1.4 + i * ((sz - nz - 2.8) / 3);
      b.box(x - 0.03, by + 0.9, z - 0.22, x + 0.03, by + 1.55, z + 0.22, DARK, { win: interior(0.45), faces: s < 0 ? 'W' : 'E' });
    }
  }
  // corbels under the bridge where it springs from each tower
  for (const z of [nz + 0.25, sz - 0.25]) b.box(x0 + 0.4, by - 0.45, z - 0.25, x1 - 0.4, by, z + 0.25, GS, { faces: 'NESWB' });
  // torches at the arch, and the light on the road under it
  for (const x of [x0 - 0.1, x1 + 0.1]) fire(k, x, 3.4, nz + 0.25, 0.22, 0);
  k.lights.push({ x: (x0 + x1) / 2, z: road, r: 9, color: '#ffcf8a', k: 0.5 });
  // the pass: rocks at the foot of the north tower
  boulder(b, l.x0 - 0.9, l.z0 - 0.5, 1.0, 1.8, 11);
  boulder(b, l.x1 + 0.8, l.z0 + 0.3, 0.9, 1.6, 12);
  boulder(b, (l.x0 + l.x1) / 2, l.z0 - 1.4, 1.2, 1.9, 13);
};

// ---------------------------------------------------------------------------
// The Gates of the Moon
// ---------------------------------------------------------------------------

const gatesModel: Model = (k, l) => {
  const b = k.b, G = STONE.north, GS = STONE.northShade;
  const ring = TURNS.moon, gx = ring.c[0];
  const zf = l.z1 - 0.8, zb = l.z0 + 0.8, wall = 8;
  // the curtain: the front to the yard, and its two sides
  rampart(b, [l.x0 + 1.3, zf], [gx - 1.1, zf], wall, G, { shade: GS, win: LOOPS });
  rampart(b, [gx + 1.1, zf], [l.x1 - 1.3, zf], wall, G, { shade: GS, win: LOOPS });
  for (const x of [l.x0 + 0.8, l.x1 - 0.8]) rampart(b, [x, zf], [x, zb], wall, G, { shade: GS, win: LOOPS });
  // square towers at its corners, the back ones taller, against the rock
  for (const x of [l.x0 + 1.25, l.x1 - 1.25]) {
    block(b, x - 1.05, l.z1 - 2.35, x + 1.05, l.z1 - 0.25, 0, l.top - 1.6, G, GS);
    block(b, x - 1.0, l.z0 + 0.2, x + 1.0, l.z0 + 2.2, 0, l.top - 0.8, G, GS);
  }
  // the keep, built against the rock
  const kx0 = gx - 1.2, kx1 = l.x1 - 2.4;
  block(b, kx0, l.z0 + 0.15, kx1, l.z0 + 2.9, 0, l.top - 0.8, G, GS, { cell: 1.6, storey: (l.top - 1.8) / 3, lit: 0.35, kind: 4 });
  banner(b, (kx0 + kx1) / 2, l.z0 + 1.5, l.top - 0.8, 'arryn', 4, 0.8);
  // the gatehouse, facing south onto the yard, with its gate open and the portcullis up
  const g0 = gx - 1.15, g1 = gx + 1.15;
  block(b, g0, l.z1 - 2.3, g1, l.z1 - 0.05, 0, wall + 1.4, G, GS);
  doorway(b, gx, l.z1 - 0.02, 0, 1.3, 3.0, [0, 0, 1], 0.55);
  for (let i = 0; i < 4; i++) {
    const x = gx - 0.48 + i * 0.32;
    b.box(x - 0.03, 2.25, l.z1 + 0.01, x + 0.03, 3.0, l.z1 + 0.05, 0xa4a8ad, { faces: 'S' });
  }
  for (const x of [g0 - 0.25, g1 + 0.25]) fire(k, x, 3.2, l.z1 + 0.15, 0.22, 0);
  // what is left of the court inside, paved
  area(k, rect(l.x0 + 1.6, zb + 0.8, l.x1 - 1.6, zf - 0.8), PAVE_DARK, 0.04);
  // guards on the wall walk and at the gate, in the sky blue of the Arryns
  k.person(l.x0 + 3, zf, wall);
  k.person(l.x1 - 3.2, zf, wall);
  brazier(k, l.x1 - 2.4, zf, wall);
  k.lights.push({ x: gx, z: l.z1 + 3, r: 11, color: '#ffcf8a', k: 0.55 });

  // --- the yard: the ring where the high road ends. Paved round its north side, with a well in its middle ---
  const [rx, rz] = ring.c, inner = ring.r - 2.6;
  area(k, oval(rx, rz, inner - 0.06, inner - 0.06, 16), PAVE, 0.035);
  const arc: P2[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (-100 + (65 * i) / 10) * (Math.PI / 180);
    arc.push([rx + Math.cos(a) * (ring.r + 2.7), rz + Math.sin(a) * (ring.r + 2.7)]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = (-100 + (65 * i) / 10) * (Math.PI / 180), r = Math.min(ring.r + 4.4, (l.z1 - rz) / Math.sin(a) - 0.02);
    arc.push([rx + Math.cos(a) * Math.max(ring.r + 2.75, r), rz + Math.sin(a) * Math.max(ring.r + 2.75, r)]);
  }
  area(k, arc, PAVE, 0.035);
  area(k, rect(g0 - 0.3, l.z1 - 0.02, g1 + 0.3, rz - Math.sqrt((ring.r + 2.6) ** 2 - 1.45 ** 2) - 0.15), PAVE, 0.035);
  // the well: a stone ring, two posts and a little roof, no more than 1.5 across
  b.cyl(rx, rz, 0, 0.8, 0.62, 0.62, 10, STONE.river, { cap: 0x2c3a40 });
  b.cyl(rx, rz, 0.8, 0.92, 0.7, 0.7, 10, STONE.riverShade, { cap: false });
  for (const s of [-1, 1]) b.box(rx + s * 0.52 - 0.06, 0.8, rz - 0.06, rx + s * 0.52 + 0.06, 2.0, rz + 0.06, TIMBER, { faces: 'NESW' });
  gable(b, rx - 0.6, rz - 0.42, rx + 0.6, rz + 0.42, 2.0, 0.45, ROOF.shingle, TIMBER, 'x', 0.08);
  b.beam([rx - 0.5, 1.6, rz], [rx + 0.5, 1.6, rz], 0.05, 0.05, TIMBER_DARK);
};

// ---------------------------------------------------------------------------
// The Inn at the Crossroads, its stable and its yard
// ---------------------------------------------------------------------------

/** Where the high road's north edge is, at a place along it. */
function highRoadNorth(x: number): number {
  const H = ROADS.high;
  for (let i = 0; i + 1 < H.length; i++) {
    const [ax, az] = H[i], [bx, bz] = H[i + 1];
    if (x >= ax && x <= bx) {
      const t = (x - ax) / (bx - ax), dz = bz - az, dx = bx - ax;
      return az + dz * t - 4 * Math.hypot(dx, dz) / dx;
    }
  }
  return H[H.length - 1][1] - 4;
}

let chimneys: V3[] = [];

const innModel: Model = (k, l) => {
  const b = k.b, ST = INN_STONE, s = HOUSE_WIN.storey;
  // the main house: a ground storey of stone, two of timber and plaster that jut out over it, and a steep roof
  const x0 = l.x0 + 1.0, x1 = l.x1 - 1.4, z0 = l.z0 + 1.4, z1 = l.z1 - 1.0;
  b.box(x0, 0, z0, x1, s, z1, ST, { win: HOUSE_WIN, seed: 0.21, faces: 'NESW' });
  const j = 0.25, X0 = x0 - j, X1 = x1 + j, Z0 = z0 - j, Z1 = z1 + j, eaves = 3 * s;
  b.box(X0, s, Z0, X1, eaves, Z1, PLASTER, { win: HOUSE_WIN, seed: 0.43, faces: 'NESWB' });
  // the timber frame on the faces that are seen: posts between the windows, a beam at each floor
  for (const [z, sgn] of [[Z1, 1], [Z0, -1]] as const) {
    for (let x = X0; x <= X1 + 1e-6; x += HOUSE_WIN.cell) b.box(x - 0.07, s, z - (sgn < 0 ? 0.06 : 0), x + 0.07, eaves, z + (sgn > 0 ? 0.06 : 0), TIMBER, { faces: sgn > 0 ? 'SEW' : 'NEW' });
    for (const y of [s, 2 * s, eaves]) b.box(X0, y - 0.09, z - (sgn < 0 ? 0.07 : 0), X1, y + 0.09, z + (sgn > 0 ? 0.07 : 0), TIMBER, { faces: sgn > 0 ? 'STB' : 'NTB' });
  }
  for (const [x, sgn] of [[X1, 1], [X0, -1]] as const) {
    for (let z = Z0; z <= Z1 + 1e-6; z += HOUSE_WIN.cell) b.box(x - (sgn < 0 ? 0.06 : 0), s, z - 0.07, x + (sgn > 0 ? 0.06 : 0), eaves, z + 0.07, TIMBER, { faces: sgn > 0 ? 'ENS' : 'WNS' });
    for (const y of [s, 2 * s, eaves]) b.box(x - (sgn < 0 ? 0.07 : 0), y - 0.09, Z0, x + (sgn > 0 ? 0.07 : 0), y + 0.09, Z1, TIMBER, { faces: sgn > 0 ? 'ETB' : 'WTB' });
  }
  const rise = 2.3;
  gable(b, X0, Z0, X1, Z1, eaves, rise, ROOF.slate, PLASTER, 'x', 0.35);
  // a gable over the door, facing the yard
  const dx = (x0 + x1) / 2 - 0.4;
  b.box(dx - 1.3, s, Z1, dx + 1.3, eaves, Z1 + 0.5, PLASTER, { win: HOUSE_WIN, seed: 0.77, faces: 'SEWB' });
  gable(b, dx - 1.3, Z0 + 2.4, dx + 1.3, Z1 + 0.5, eaves, 1.6, ROOF.slate, PLASTER, 'z', 0.25);
  for (const y of [s, 2 * s]) b.box(dx - 1.3, y - 0.09, Z1 + 0.5, dx + 1.3, y + 0.09, Z1 + 0.56, TIMBER, { faces: 'STB' });
  // the door, its porch, and the lantern beside it
  b.box(dx - 0.95, 0, z1, dx + 0.95, 0.12, z1 + 0.9, ST, { faces: 'NESWT' });
  doorway(b, dx, z1 + 0.02, 0.12, 1.0, 2.0, [0, 0, 1], 0.7, DOOR);
  for (const sx of [-0.85, 0.85]) b.box(dx + sx - 0.08, 0.12, z1 + 0.75, dx + sx + 0.08, s, z1 + 0.9, TIMBER, { faces: 'NESW' });
  lantern(k, dx + 1.4, z1 + 1.0, 0, 1.9, TIMBER_DARK);

  // turrets at the two front corners, corbelled out from the first floor, with cone roofs
  for (const [tx, tz] of [[X0, Z1], [X1, Z1]]) {
    lathe(b, tx, tz, [[0.12, s + 0.2], [0.62, s + 1.0]], 8, ST);
    b.cyl(tx, tz, s + 1.0, l.top - 1.8, 0.62, 0.62, 8, ST, { win: LOOPS_CLOSE, seed: tx * 0.1, cap: false });
    lathe(b, tx, tz, [[0.82, l.top - 1.8], [0.45, l.top - 0.2], [0.04, l.top + 1.2]], 8, ROOF.slate);
  }
  // chimneys: a stack up each gable end, and two through the roof
  chimneys = [];
  const chimney = (x: number, z: number, from: number): void => {
    b.box(x - 0.32, from, z - 0.32, x + 0.32, l.top - 0.25, z + 0.32, ST, { top: 0x6b6259 });
    b.box(x - 0.38, l.top - 0.25, z - 0.38, x + 0.38, l.top, z + 0.38, STONE.riverShade, { top: 0x3a332d, faces: 'NESWTB' });
    chimneys.push([x, l.top, z]);
  };
  const zc = (Z0 + Z1) / 2;
  chimney(X0 - 0.3, zc, 0);
  chimney(X1 + 0.3, zc - 0.6, 0);
  chimney(x0 + 2.0, Z0 + 0.9, eaves + 0.3);
  chimney(x1 - 2.4, Z0 + 0.9, eaves + 0.3);

  // the bell tower at the back corner: a stone shaft, an open belfry with its bell, and a pointed roof
  const bx0 = l.x1 - 1.6, bx1 = l.x1 - 0.05, bz0 = l.z0 + 0.05, bz1 = l.z0 + 1.6, belfry = l.top - 1.4;
  b.box(bx0, 0, bz0, bx1, belfry, bz1, ST, { win: LOOPS_CLOSE, seed: 0.9, top: 0x9a917f });
  for (const [px, pz] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1]]) b.box(px - (px > bx0 ? 0.25 : 0), belfry, pz - (pz > bz0 ? 0.25 : 0), px + (px > bx0 ? 0 : 0.25), l.top - 0.05, pz + (pz > bz0 ? 0 : 0.25), ST, { faces: 'NESW' });
  b.box(bx0 - 0.1, l.top - 0.05, bz0 - 0.1, bx1 + 0.1, l.top, bz1 + 0.1, ST, { faces: 'NESWTB', top: 0x9a917f });
  lathe(b, (bx0 + bx1) / 2, (bz0 + bz1) / 2, [[0.42, belfry + 0.25], [0.32, belfry + 0.75], [0.08, belfry + 1.05]], 8, 0xb08a3e);
  lathe(b, (bx0 + bx1) / 2, (bz0 + bz1) / 2, [[(bx1 - bx0) * 0.78, l.top], [0.04, l.top + 2.8]], 4, ROOF.slate);
  // a lower wing at the back, to the west
  const w0 = l.x0 + 0.1, w1 = x0 + 2.6, wz0 = l.z0 + 0.1;
  b.box(w0, 0, wz0, w1, 2 * s, z0 + 0.4, ST, { win: HOUSE_WIN, seed: 0.66, faces: 'NESW' });
  gable(b, w0, wz0, w1, z0 + 0.4, 2 * s, 1.7, ROOF.slate, ST, 'z', 0.25);

  // --- the yard, between the inn and the high road ---
  const st = lotOf('inn-stable'), ye = st.x1 + 1.0;
  const yard: P2[] = [[l.x0 - 0.8, l.z1], [st.x0 - 0.5, l.z1], [st.x0 - 0.5, st.z1], [ye, st.z1], [ye, highRoadNorth(ye) - 0.4]];
  for (let x = Math.ceil(ye - 1); x > l.x0 - 0.8; x -= 2) yard.push([x, highRoadNorth(x) - 0.4]);
  yard.push([l.x0 - 0.8, highRoadNorth(l.x0 - 0.8) - 0.4]);
  area(k, yard, PAVE, 0.035);
  const spot = HERO_SPOTS.find((h) => h.id === 'inn')!;
  // the well at the west end, the hitching rail and the horse trough to the east, clear of the place where a hero stands
  const wx = l.x0 - 0.15, wz = spot.z - 0.9;
  b.cyl(wx, wz, 0, 0.8, 0.6, 0.6, 10, ST, { cap: 0x2c3a40 });
  for (const sx of [-0.5, 0.5]) b.box(wx + sx - 0.06, 0.8, wz - 0.06, wx + sx + 0.06, 2.1, wz + 0.06, TIMBER, { faces: 'NESW' });
  gable(b, wx - 0.6, wz - 0.4, wx + 0.6, wz + 0.4, 2.1, 0.45, ROOF.shingle, TIMBER, 'x', 0.08);
  const rz = l.z1 + 0.45, r0 = l.x1 - 0.4, r1 = st.x0 + 1.6;
  for (const x of [r0, (r0 + r1) / 2, r1]) b.box(x - 0.07, 0, rz - 0.07, x + 0.07, 1.0, rz + 0.07, TIMBER, { faces: 'NESW' });
  b.box(r0 - 0.1, 0.82, rz - 0.06, r1 + 0.1, 0.95, rz + 0.06, TIMBER, { faces: 'NESWTB' });
  horse(b, (l.x1 + st.x0) / 2, rz - 1.25, Math.PI / 2, 0x7a5236);
  horse(b, r1 - 0.5, rz + 1.25, -Math.PI / 2 - 0.15, 0x3e3029);
  const tx = st.x0 + 2.2, tz = highRoadNorth(st.x0 + 2.2) - 1.2;
  b.box(tx - 0.8, 0, tz - 0.3, tx + 0.8, 0.65, tz + 0.3, TIMBER, { top: 0x557b8c });
  // who is about: folk at the door, a boy with a tray of bread, a groom with a horse
  k.person(dx - 1.6, z1 + 0.7);
  k.person(dx + 2.1, z1 + 0.6);
  k.person(l.x0 + 0.5, z1 + 0.7);
  b.box(l.x0 + 0.15, 1.45, z1 + 0.95, l.x0 + 0.85, 1.55, z1 + 1.25, 0xc8964f, { faces: 'NESWTB' });
  k.lights.push({ x: dx, z: l.z1 + 1.8, r: 11, color: '#ffcf8a', k: 0.55 });
};

const stableModel: Model = (k, l) => {
  const b = k.b, wallH = 2.4;
  const x0 = l.x0 + 0.2, x1 = l.x1 - 0.2, z0 = l.z0 + 0.6, z1 = l.z1 - 0.2;
  b.box(x0, 0, z0, x1, wallH, z1, DAUB, { faces: 'NESW' });
  // the timber frame, and the stalls open to the yard
  for (let i = 0; i <= 4; i++) {
    const x = x0 + ((x1 - x0) * i) / 4;
    b.box(x - 0.09, 0, z1, x + 0.09, wallH, z1 + 0.08, TIMBER, { faces: 'SEW' });
    if (i < 4) b.box(x + 0.25, 0, z1 + 0.01, x + (x1 - x0) / 4 - 0.25, 1.75, z1 + 0.04, DARK, { win: interior(0.25), faces: 'S' });
  }
  b.box(x0, wallH - 0.15, z1, x1, wallH, z1 + 0.09, TIMBER, { faces: 'STB' });
  horse(b, x0 + (x1 - x0) * 0.375, z1 + 0.3, Math.PI / 2, 0x8a6142);
  // the thatch, thick and low
  gable(b, x0, z0, x1, z1, wallH, l.top - wallH - 0.6, ROOF.thatch, DAUB, 'x', 0.55);
  b.box(x0 - 0.3, l.top - 0.62, (z0 + z1) / 2 - 0.25, x1 + 0.3, l.top - 0.4, (z0 + z1) / 2 + 0.25, 0x9c8550, { faces: 'NESWTB' });
  // the hayloft door in the east gable, a haystack and a cart beyond it, and the groom
  b.box(x1 + 0.01, wallH + 0.15, (z0 + z1) / 2 - 0.4, x1 + 0.05, wallH + 1.15, (z0 + z1) / 2 + 0.4, DOOR, { faces: 'E' });
  lathe(b, l.x1 + 0.45, l.z0 + 1.2, [[0.75, 0], [0.85, 0.8], [0.5, 1.6], [0.05, 2.0]], 8, 0xc9ad62);
  k.person(x1 - 0.8, z1 + 1.0);
};

// ---------------------------------------------------------------------------
// The old stone bridge where the kingsroad crosses the Trident, by the inn
// ---------------------------------------------------------------------------

/** A line of corners cut into short steps. */
function densify(pts: P2[], step: number): P2[] {
  const out: P2[] = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let j = 1; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
  }
  return out;
}

function tridentBridge(k: Build): void {
  const b = k.b, S = STONE.river, SS = STONE.riverShade;
  const at = BRIDGES.find((r) => r.road === 'kingsroad' && r.x > 0 && r.z < 20)!;
  // the river's middle and how wide it is along it, as land.ts lays it
  const river = densify(rounded(RIVERS.trident.line, 7), 0.5);
  const rs: number[] = [0];
  for (let i = 1; i < river.length; i++) rs.push(rs[i - 1] + Math.hypot(river[i][0] - river[i - 1][0], river[i][1] - river[i - 1][1]));
  const total = rs[rs.length - 1], [h0, h1] = RIVERS.trident.half;
  const wet = (x: number, z: number): boolean => {
    let best = Infinity, half = h0;
    for (let i = 0; i < river.length; i++) {
      const d = Math.hypot(river[i][0] - x, river[i][1] - z);
      if (d < best) { best = d; half = h0 + ((h1 - h0) * rs[i]) / total; }
    }
    return best < half + 0.45;
  };
  // the road's middle near the bridge, as roads.ts lays it, and the stretch of it that is over the water at either edge
  const K = ROADS.kingsroad;
  const road = densify(rounded(K.slice(4), 6), 0.25).filter((p) => Math.hypot(p[0] - at.x, p[1] - at.z) < 9);
  const frame = road.map((p, i) => {
    const q = road[Math.min(road.length - 1, i + 1)], o = road[Math.max(0, i - 1)], l = Math.hypot(q[0] - o[0], q[1] - o[1]);
    const tx = (q[0] - o[0]) / l, tz = (q[1] - o[1]) / l;
    return { x: p[0], z: p[1], tx, tz, nx: -tz, nz: tx };
  });
  const span = (v: number): [number, number] | null => {
    let a = -1, c = -1;
    frame.forEach((f, i) => {
      if (wet(f.x + f.nx * v, f.z + f.nz * v)) {
        if (a < 0) a = i;
        c = i;
      }
    });
    return a < 0 ? null : [a, c];
  };
  let ia = Infinity, ic = -Infinity;
  for (let v = -4.5; v <= 4.5; v += 0.75) {
    const s = span(v);
    if (s) { ia = Math.min(ia, s[0]); ic = Math.max(ic, s[1]); }
  }
  if (!Number.isFinite(ia)) return;
  ia = Math.max(0, ia - 3);
  ic = Math.min(frame.length - 1, ic + 3);
  // the deck: solid from the river's bed up to just under the road, half a unit wider than it on each side
  const W = 4.5, top = -0.02, bed = -1.6;
  const edge = (f: (typeof frame)[number], v: number, y: number): V3 => [f.x + f.nx * v, y, f.z + f.nz * v];
  for (let i = ia; i < ic; i++) {
    const f = frame[i], g = frame[i + 1];
    b.quad(edge(f, -W, top), edge(f, W, top), edge(g, W, top), edge(g, -W, top), [0, 1, 0], SS);
    for (const s of [-1, 1]) b.quad(edge(f, s * W, bed), edge(g, s * W, bed), edge(g, s * W, top), edge(f, s * W, top), [f.nx * s, 0, f.nz * s], S);
  }
  for (const [i, s] of [[ia, -1], [ic, 1]] as const) {
    const f = frame[i];
    b.quad(edge(f, -W, bed), edge(f, W, bed), edge(f, W, top), edge(f, -W, top), [f.tx * s, 0, f.tz * s], S);
  }
  // the parapets, on the half unit outside the road, as far as the water reaches at each edge and a little beyond
  for (const s of [-1, 1]) {
    const sp = span(s * 4.25);
    if (!sp) continue;
    const a = Math.max(0, sp[0] - 4), c = Math.min(frame.length - 1, sp[1] + 4);
    for (let i = a; i < c; i += 2) {
      const f = frame[i], g = frame[Math.min(c, i + 2)];
      const mx = (f.x + g.x) / 2 + f.nx * s * 4.25, mz = (f.z + g.z) / 2 + f.nz * s * 4.25;
      b.obox(mx, 0.44, mz, Math.hypot(g.x - f.x, g.z - f.z) / 2 + 0.03, 0.46, 0.2, Math.atan2(f.tz, f.tx), S, { top: SS });
    }
    for (const i of [a, c]) {
      const f = frame[i];
      b.obox(f.x + f.nx * s * 4.25, 0.6, f.z + f.nz * s * 4.25, 0.32, 0.62, 0.3, Math.atan2(f.tz, f.tx), SS, { top: S });
    }
    // on each face over the water, two low arches and the cutwater of the pier between them
    const m = frame[Math.round((sp[0] + sp[1]) / 2)], yaw = Math.atan2(m.tz, m.tx), len = ((sp[1] - sp[0]) * 0.25) / 2;
    b.moved(m.x + m.nx * s * (W + 0.03), 0, m.z + m.nz * s * (W + 0.03), yaw, () => {
      const n: V3 = [0, 0, s];
      for (const u of [-len * 0.5, len * 0.5]) {
        const hw = Math.min(0.85, len * 0.42), spring = -0.62;
        b.quad([u - hw, -0.95, 0], [u + hw, -0.95, 0], [u + hw, spring, 0], [u - hw, spring, 0], n, 0x23272a);
        for (let q = 0; q < 6; q++) {
          const a0 = (Math.PI * q) / 6, a1 = (Math.PI * (q + 1)) / 6;
          tri(b, [u, spring, 0], [u + Math.cos(a0) * hw, spring + Math.sin(a0) * hw * 0.5, 0], [u + Math.cos(a1) * hw, spring + Math.sin(a1) * hw * 0.5, 0], n, 0x23272a);
        }
      }
      tri(b, [-0.35, -1.0, 0], [0.35, -1.0, 0], [0, -1.0, s * 0.8], [0, 1, 0], SS);
      tri(b, [-0.35, -1.0, 0], [0, -1.0, s * 0.8], [0, -0.25, 0], [-0.6, 0.3, s * 0.6], S);
      tri(b, [0.35, -1.0, 0], [0, -0.25, 0], [0, -1.0, s * 0.8], [0.6, 0.3, s * 0.6], S);
    });
  }
}

// ---------------------------------------------------------------------------
// The file's shape
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'vale-summit': lanceModel,
  eyrie: eyrieModel,
  'bloody-gate-n': bloodyGateModel,
  'gates-moon': gatesModel,
  inn: innModel,
  'inn-stable': stableModel,
};
export const COVERS: string[] = ['vale-north', 'vale-body', 'vale-high', 'vale-south', 'bloody-gate-arch'];

const name = (l: Lot): string => l.name;
export const SIGNS: SignDef[] = [
  nameSign('vale-eyrie', name(EY)),
  nameSign('vale-bloody-gate', name(lotOf('bloody-gate-n'))),
  nameSign('vale-gates-moon', name(GM)),
  nameSign('vale-inn', name(lotOf('inn'))),
  nameSign('vale-lance', name(VS)),
];
export const FLOORED: string[] = [];

export function extras(k: Build): void {
  tridentBridge(k);

  // the boards: the inn's west of it, by the kingsroad; the gate's beside its north tower; the rest along the mountain's south foot
  const inn = lotOf('inn'), gate = lotOf('bloody-gate-n');
  nameBoard(k, 'vale-inn', inn.x0 - 4.0, inn.z0 + 1.8, 0, undefined, 1.2);
  nameBoard(k, 'vale-bloody-gate', gate.x0 - 1.9, gate.z0 + 1.0, 0, undefined, 0.9);
  nameBoard(k, 'vale-gates-moon', VSO.x0 + 0.0, VSO.z1 + 3.4, 0, undefined, 1.1);
  nameBoard(k, 'vale-eyrie', VSO.x0 + 8.0, VSO.z1 + 3.1, 0, undefined, 1.2);
  nameBoard(k, 'vale-lance', VSO.x0 + 16.5, VSO.z1 + 3.4, 0, undefined, 1.0);

  // smoke from two of the inn's chimneys, and the spray of Alyssa's Tears
  const puffs = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 90);
  k.group.add(puffs.mesh);
  const rand = rng(5521), from = new THREE.Vector3(), drift = new THREE.Vector3(0.5, 0.2, 0.25), still = new THREE.Vector3(0.1, -0.4, 0);
  const smoking = chimneys.slice(1, 3);
  let dueSmoke = 0, dueMist = 0;
  k.each((dt) => {
    dueSmoke -= dt;
    dueMist -= dt;
    if (dueSmoke <= 0 && smoking.length) {
      dueSmoke = 0.28 + rand() * 0.3;
      const c = smoking[Math.floor(rand() * smoking.length)];
      puffs.puff(from.set(c[0], c[1] + 0.3, c[2]), drift, 0.45, 0.82);
    }
    if (dueMist <= 0 && mist) {
      dueMist = 0.35 + rand() * 0.3;
      puffs.puff(from.set(mist.x - rand() * 0.6, mist.y + 0.2, mist.z + (rand() - 0.5) * 1.2), still, 0.75, 1);
    }
    puffs.update(dt);
  });
}
