// Everything that drives on one tile: plain traffic, drawn in a handful of
// batches, and the heroes, each a model of its own made from a real diecast.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './geo';
import { buildPath, type Path } from './paths';
import type { Build, HeroSpot, ParkedSpot, Route, TrafficKind, TrafficType } from './tile';
import { Bulbs, Discs, Flames, Lamps, Smoke, Sparks, Strips } from './effects';
import type { Lamp, PartyTrick, Pipe, TrickFx, TrickRun } from './tricks';

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

interface VType { name: string; geo: THREE.BufferGeometry; len: number; wid: number; wb: number; colors: number[]; lamps?: boolean }

// ---------------------------------------------------------------------------
// Traffic of a tile's own
// ---------------------------------------------------------------------------
//
// A tile can bring kinds of traffic of its own shape (`TrafficKind` in
// tile.ts): a rider, a cart, an auto-rickshaw. A kind's shape is made of the
// same parts as the plain cars are, with the pieces below, so that it is
// drawn by the same material, in one batch for the whole kind:
//
//   const cart: TrafficKind = {
//     name: 'cart', len: 6, wid: 2.8, colors: [0x8a6a44, 0x6b5136], lamps: false,
//     geo: shapeFrom([
//       shapePart(boxAt(3.6, 0.9, 2.6, -1, 1.4, 0), PART.paint, 0xffffff),   // takes one of `colors`
//       shapePart(boxAt(1.8, 1.5, 0.7, 2, 1.3, 0), PART.trim, 0x5a4636),     // keeps its own colour
//       ...wheelsFor(0.9, 2.8, [-1]),
//     ]),
//   };
//
// The shape has its nose along +x, stands on y = 0 and has its middle over
// (0, 0). Paint is given in white and takes the colour picked for each one;
// every other part keeps the colour it is given. `head` and `tail` are lamps:
// they light up at night, and a kind that has none says `lamps: false`, so
// that it throws no beam on the road either.

/** The parts a shape is made of. Only `paint` takes the colour picked for each vehicle; `head` and `tail` light up at night. */
export const PART = { paint: PAINT, glass: GLASS, trim: TRIM, head: HEAD, tail: TAIL, hub: HUB } as const;
/** A piece of a shape as one of its parts, in a colour. Paint is given in white. */
export const shapePart = part;
/** A side profile, as corners with x along the vehicle and y up, pushed out to a width. */
export const sideProfile = extrude;
/** A box so long, so high and so wide, with its middle at a place. */
export const boxAt = box;
export { wheelsFor, lampsFor };
/** One shape from its pieces. */
export function shapeFrom(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(pieces)!;
}

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

/**
 * Where a hero can be on a tile: driving one of its routes, or standing on
 * show at one of its spots. `room` says how likely the place is to be picked
 * when a hero is put somewhere at random: a long road has more of it than a
 * short one.
 */
export type HeroPlace = { kind: 'route' | 'spot'; id: string; room: number };

export interface HeroInfo { name: string; capture: string; length: number; width: number }

export interface Hero {
  name: string;
  /** The capture it was made from. */
  capture: string;
  place: HeroPlace;
  /** Holds its model. The engine moves it. */
  group: THREE.Group;
  /** Where it is now, in the tile's own coordinates, which way it points, and which way is up for it. */
  pos: THREE.Vector3;
  fwd: THREE.Vector3;
  up: THREE.Vector3;
  /** Which way it is going, which in a slide is not the way it points. */
  way: THREE.Vector3;
  /** Where it is on the road, which is under it when it is off the road. */
  road: THREE.Vector3;
  /** Its own nose, top and right flank, as its trick has tilted and leant it: what is fixed to it is placed by these. */
  nose: THREE.Vector3;
  top: THREE.Vector3;
  flank: THREE.Vector3;
  /** How far it is off the road. */
  rise: number;
  /** Where each wheel last laid a mark, front left, front right, rear left, rear right; and where each corner of its tail last drew a ribbon. */
  wheel: { p: THREE.Vector3; live: boolean }[];
  tip: { p: THREE.Vector3; live: boolean }[];
  /** Its party trick, running, and what the trick can show. */
  run: TrickRun | null;
  fx: TrickFx;
  /** Where its exhaust comes out, if its trick says that is not at its tail. */
  pipes: Pipe[] | null;
  /** Where its headlamps are, if its trick says. */
  lamps: Lamp | null;
  /** What it is putting into the air and showing: how many seconds of each are left, and how strong. */
  air: {
    flame: number; flamePower: number; flameBlue: boolean; tyres: number; tyrePower: number; exhaust: number; exhaustPower: number;
    screen: number; screenPower: number; under: number; underPower: number; underColour: number;
    purge: number; purgePower: number; bulbs: number; bulbsPower: number; hazards: number;
    lamps: number; lampsPower: number; lampsColour: number; mist: number; mistPower: number; was: number;
    sparks: number; sparksPower: number; sparksNose: boolean; glow: number; marks: number; marksAll: boolean;
    streaks: number; streaksPower: number; streaksColour: number; streaksUp: number;
  };
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
  /** Tells vehicles apart where two of them would otherwise have equal claim to go first. */
  id: number;
  path: Path | null;
  s: number; v: number; vmax: number;
  /** How fast it likes to drive, as a share of the speed of whatever road it is on. */
  pace: number;
  /** How many seconds it has stood waiting to join a lane that it shares with another route. */
  held: number;
  len: number; wid: number; wb: number;
  type: number; inst: number; // traffic: which batch and which slot in it
  /** Whether it throws a beam ahead at night. */
  lamps: boolean;
  hero: Hero | null;
  heading: number; turn: number; lit: boolean;
  fx: number; // slot among the moving vehicles, or -1
  shadow: number;
  phase: number;
  pos: THREE.Vector3;
}

export interface Vehicles {
  group: THREE.Group;
  heroes: Hero[];
  readonly moving: number;
  readonly parked: number;
  update(dt: number, time: number, night: number, wet: number): void;
  /** The places a hero could take now: every route that takes heroes, and every spot that is free. */
  places(): HeroPlace[];
  /**
   * Puts a hero in a place. `body` stands on y = 0 with its nose along +x.
   * Returns null if the place is taken or the tile is full.
   */
  adopt(body: THREE.Object3D, info: HeroInfo, place: HeroPlace, trick: PartyTrick | null): Hero | null;
  /** Shows the heroes or hides them, with their shadows and their lights. */
  showHeroes(on: boolean): void;
  /** The lanes that routes were found to share, for checking a tile's roads: which two routes, where along each, and for how long. */
  shared(): { route: string; other: string; from: number; otherFrom: number; length: number }[];
  /** Where every moving vehicle is, for checking a tile's roads: its route, how far along it, its speed and its place. */
  positions(): { route: string; s: number; v: number; x: number; y: number; z: number; hero: boolean }[];
}

/**
 * A stretch of lane that two routes both run along: from `a0` on one of them,
 * from `b0` on the other, for `len`. Each of the two routes holds it from its
 * own side, and the two hold the same numbers: see `findShares`.
 */
interface Share { other: Loop; a0: number; b0: number; len: number }
/** One route, the line it follows, the vehicles on it in the order they drive, and the lanes it shares. */
interface Loop { def: Route; path: Path; list: Veh[]; shares: Share[] }

/** How far before a lane it shares a vehicle starts to look at the other route's traffic: two seconds of a fast road. */
const MERGE_LOOK = 60;
/** How far short of the shared lane a vehicle waits for another to go first: where the two lanes are still a car's width apart. */
const MERGE_HOLD = 7;

/** How long a vehicle waits to join a busy lane before the traffic on it has to let it in. */
const PATIENCE = 2.5;

/** How far past the end of a shared lane a vehicle is still in the way of the one behind it, though their ways have parted. */
const PART_CLEAR = 9;

/** How many seconds the traffic of a tile with shared lanes drives before anyone sees it: see the end of `buildVehicles`. */
const SETTLE = 4;

/** How far a vehicle is past the place a shared stretch starts, going round its own route: from 0 up to the route's length. */
const pastStart = (s: number, from: number, L: number): number => (((s - from) % L) + L) % L;

/**
 * Finds where routes run along the same lane, the same way. There their
 * vehicles take turns: each keeps its distance from whoever is ahead of it on
 * that lane, whichever route that one is on, and where two routes come
 * together the vehicle that is nearer goes first. Routes that merely cross are
 * not found, and their vehicles still pass through each other.
 *
 * Every two routes are looked at once, from the one that comes first, and both
 * are given the one record of each stretch they share, each from its own side.
 * They must not each measure it for themselves. Measured from points a unit
 * apart, two measures of one stretch differ by up to a unit, and then each of
 * two vehicles reckons where the other is a little differently from how the
 * other reckons it itself. That is enough for each of two that stand waiting
 * to take the other for the one that goes first, and then neither moves again.
 */
function findShares(loops: Loop[]): void {
  const STEP = 1, CELL = 3;
  interface Dot { loop: number; s: number; x: number; y: number; z: number; tx: number; tz: number }
  const grid = new Map<number, Dot[]>();
  const key = (cx: number, cz: number): number => (cx + 512) * 4096 + (cz + 512);
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  // every route as points a unit apart, sorted into squares on the ground
  const lines = loops.map((l, li) => {
    const n = Math.max(1, Math.floor(l.path.length / STEP));
    return Array.from({ length: n }, (_, i): Dot => {
      const s = (i / n) * l.path.length;
      l.path.at(s, p);
      l.path.at(s + 0.5, q);
      const tx = q.x - p.x, tz = q.z - p.z, tl = Math.hypot(tx, tz) || 1;
      return { loop: li, s, x: p.x, y: p.y, z: p.z, tx: tx / tl, tz: tz / tl };
    });
  });
  for (const line of lines) {
    for (const d of line) {
      const at = key(Math.floor(d.x / CELL), Math.floor(d.z / CELL));
      let cell = grid.get(at);
      if (!cell) grid.set(at, (cell = []));
      cell.push(d);
    }
  }
  lines.forEach((line, a) => {
    const A = loops[a], n = line.length, step = A.path.length / n;
    // for each of this route's points, the place on every route after it that lies on it and heads the same way
    const match = new Map<number, Float64Array>();
    line.forEach((d, i) => {
      const cx = Math.floor(d.x / CELL), cz = Math.floor(d.z / CELL);
      const best = new Map<number, [number, number]>();
      for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -1; iz <= 1; iz++) {
          for (const e of grid.get(key(cx + ix, cz + iz)) ?? []) {
            if (e.loop <= a || Math.abs(e.y - d.y) > 0.6 || e.tx * d.tx + e.tz * d.tz < 0.92) continue;
            const fore = (d.x - e.x) * e.tx + (d.z - e.z) * e.tz;
            const off = Math.abs((d.x - e.x) * e.tz - (d.z - e.z) * e.tx);
            if (off > 0.45 || Math.abs(fore) > 0.75) continue;
            const had = best.get(e.loop);
            if (!had || Math.abs(fore) < had[0]) best.set(e.loop, [Math.abs(fore), e.s + fore]);
          }
        }
      }
      for (const [b, [, s]] of best) {
        let m = match.get(b);
        if (!m) match.set(b, (m = new Float64Array(n).fill(NaN)));
        m[i] = s;
      }
    });
    for (const [b, m] of match) {
      const B = loops[b], LB = B.path.length;
      // the one record of a stretch, handed to both routes: what is `a0` to the one is `b0` to the other
      const lay = (a0: number, b0: number, len: number): void => {
        A.shares.push({ other: B, a0, b0, len });
        B.shares.push({ other: A, a0: b0, b0: a0, len });
      };
      const onB = (s: number): number => ((s % LB) + LB) % LB;
      // two points in a row belong to one stretch if the other route moves along in step with this one
      const follows = (i: number, j: number): boolean => {
        if (Number.isNaN(m[i]) || Number.isNaN(m[j])) return false;
        const d = (((m[j] - m[i]) % LB) + LB) % LB;
        return d < step * 2.2;
      };
      let start = -1;
      for (let i = 0; i < n; i++) {
        if (!follows((i + n - 1) % n, i)) { start = i; break; }
      }
      // the two routes are the same lane all the way round
      if (start < 0) { lay(0, onB(m[0]), A.path.length); continue; }
      let i = 0;
      while (i < n) {
        const at = (start + i) % n;
        if (Number.isNaN(m[at])) { i++; continue; }
        let run = 0;
        while (i + run + 1 < n && follows((start + i + run) % n, (start + i + run + 1) % n)) run++;
        if (run * step >= 4) lay(line[at].s, onB(m[at]), run * step);
        i += run + 1;
      }
    }
  });
}

const TYPE_NAMES: TrafficType[] = ['sedan', 'hatch', 'van', 'pickup', 'bus'];
/** How many heroes one tile has room for. */
const HERO_ROOM = 40;
/** How much room a spot counts for, next to a road's length, when a hero is put somewhere at random. */
const SPOT_ROOM = 80;
/** Where a hero's exhaust comes out unless its trick says otherwise: two pipes at its tail. */
const TAIL_PIPES: Pipe[] = [{ along: -0.5, across: -0.145, points: 'back' }, { along: -0.5, across: 0.145, points: 'back' }];
/** How far a hero's axles are from its middle, as shares of its length. It stands on the rear one to lift its nose and on the front one to dip it. */
const AXLE_FRONT = 0.29, AXLE_REAR = 0.26;
/** How high a hero's middle is, as a share of its length: it is what it turns about when it leans or goes right over. */
const MIDDLE = 0.11;
/** How far a trick may move its hero sideways in its lane, which leaves room beside whoever is in the next one. */
const SWAY = 1.1;
/** Where a hero's headlamps are unless its trick says otherwise: at the corners of its nose. */
const NOSE_LAMPS: Lamp = { along: 0.43, across: 0.33, up: 1, wide: 0.17 };

export function buildVehicles(k: Build, routes: Route[], parked: ParkedSpot[], heroSpots: HeroSpot[], kinds: TrafficKind[] = []): Vehicles {
  const group = new THREE.Group();
  const rand = rng(8675309);
  // the plain kinds first, always in the same order, and then the tile's own
  const types: VType[] = [...trafficTypes(), ...kinds.map((q): VType => ({ ...q, wb: q.wb ?? q.len * 0.6 }))];
  /** Which of the kinds a name means. A name nobody knows is said out loud, and a plain sedan stands in for it. */
  const kindOf = (name: string): number => {
    const i = types.findIndex((t) => t.name === name);
    if (i < 0) console.warn(`There is no kind of traffic called "${name}" on this tile. The plain kinds are ${TYPE_NAMES.join(', ')}; a tile's own are handed over as \`kinds\`.`);
    return Math.max(0, i);
  };

  // --- who drives where ---
  const vehs: Veh[] = [];
  const loops = new Map<string, Loop>();
  const heroes: Hero[] = [];
  let movingCount = 0, serial = 0;
  /** The vehicles whose road says what colours they are. */
  const paints = new Map<Veh, number[]>();

  const blank = (): Veh => ({
    id: serial++, path: null, s: 0, v: 0, vmax: 0, pace: 1, held: 0, len: 7, wid: 3, wb: 4.4, type: -1, inst: -1, hero: null, lamps: true,
    heading: 0, turn: 0, lit: false, fx: -1, shadow: -1, phase: rand() * 10, pos: new THREE.Vector3(),
  });

  for (const def of routes) {
    const path = buildPath(def.segs, true, def.hump);
    const list: Veh[] = [];
    const pool = (def.types ?? TYPE_NAMES).map(kindOf);
    for (let i = 0; i < def.count; i++) {
      const v = blank();
      v.path = path;
      v.s = ((i + 0.15 + rand() * 0.5) / def.count) * path.length;
      v.pace = 0.86 + rand() * 0.3;
      v.vmax = def.speed * v.pace;
      v.v = v.vmax * 0.8;
      v.type = pool[Math.floor(rand() * pool.length)];
      const t = types[v.type];
      v.len = t.len; v.wid = t.wid; v.wb = t.wb;
      v.lamps = t.lamps !== false;
      if (def.paint && def.paint.length > 0) paints.set(v, def.paint);
      v.fx = movingCount++;
      list.push(v);
      vehs.push(v);
    }
    loops.set(def.id, { def, path, list, shares: [] });
  }
  findShares([...loops.values()]);

  // Who stands near a place: the tile's figures, sorted into squares, so that the few near a
  // hero are found without going through all of them. The squares are laid out the first
  // time anything asks, by when the tile has stood every figure it has.
  type Figure = { x: number; y: number; z: number };
  const SQUARE = 8, NEAR = 17;
  const square = (cx: number, cz: number): number => (cx + 4096) * 8192 + cz + 4096;
  let crowds: Map<number, Figure[]> | null = null;
  const nearby: Figure[] = [];
  /** The figures that stand near enough to a place on a road to see what is there. The list is the same one each time. */
  const onlookers = (p: THREE.Vector3): Figure[] => {
    if (!crowds) {
      crowds = new Map();
      for (const who of k.people) {
        const key = square(Math.floor(who.x / SQUARE), Math.floor(who.z / SQUARE));
        const list = crowds.get(key);
        if (list) list.push(who);
        else crowds.set(key, [who]);
      }
    }
    nearby.length = 0;
    for (let cx = Math.floor((p.x - NEAR) / SQUARE); cx <= Math.floor((p.x + NEAR) / SQUARE); cx++) {
      for (let cz = Math.floor((p.z - NEAR) / SQUARE); cz <= Math.floor((p.z + NEAR) / SQUARE); cz++) {
        for (const who of crowds.get(square(cx, cz)) ?? []) {
          const d2 = (who.x - p.x) ** 2 + (who.z - p.z) ** 2;
          // not one it would have to run over, and not one on a level far above it or below
          if (d2 <= NEAR * NEAR && d2 >= 9 && Math.abs(who.y - p.y) < 7) nearby.push(who);
        }
      }
    }
    return nearby;
  };

  for (const spot of parked) {
    const v = blank();
    v.pos.set(spot.x, spot.y, spot.z);
    v.heading = spot.heading;
    v.turn = spot.turn ?? 0;
    v.lit = spot.lit === true;
    // the kind the spot asks for, or else one of the plain cars
    v.type = spot.type !== undefined ? kindOf(spot.type) : rand() < 0.55 ? 0 : rand() < 0.75 ? 1 : rand() < 0.5 ? 2 : 3;
    const t = types[v.type];
    v.len = t.len; v.wid = t.wid; v.wb = t.wb;
    vehs.push(v);
  }
  let parkedCount = parked.length;

  // --- batches of traffic, one per type ---
  const vehicleMat = k.mat.vehicle();
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
    const palette = paints.get(v) ?? types[v.type].colors;
    batches[v.type].setColorAt(v.inst, col.set(palette[Math.floor(rand() * palette.length)]));
  }

  // --- shadows under everything, headlight pools and spray for whatever moves ---
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowTex = radialTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 6, 32, 32, 31);
    g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#bbb'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  });
  // A beam, not a patch: narrow at the lamps, fanning out and fading with distance,
  // and dark at every edge of the square it is drawn on, so that no edge ever shows.
  const poolTex = radialTexture(128, 128, (ctx) => {
    const S = 128, img = ctx.createImageData(S, S);
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = (x + 0.5) / S; // along the beam, away from the car
        const v = Math.abs(((y + 0.5) / S) * 2 - 1); // across it, from the middle outwards
        const half = 0.3 + 0.7 * Math.pow(u, 0.85); // how wide the beam is here
        const across = 1 - smooth(0.4, 1, v / half);
        const along = Math.pow(1 - u, 1.5) * smooth(0, 0.05, u);
        // close to the car the two lamps still read as two
        const lamps = Math.exp(-(((v - 0.19) / 0.1) ** 2)) * (1 - smooth(0.05, 0.4, u));
        const c = Math.round(255 * Math.min(1, across * along * (0.8 + 0.6 * lamps)));
        const i = (y * S + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const sprayTex = radialTexture(64, 64, (ctx) => {
    for (const [x, y, r, a] of [[46, 32, 16, 0.9], [30, 24, 13, 0.6], [30, 41, 13, 0.6], [14, 32, 12, 0.35]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }
  });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x05060a, alphaMap: shadowTex, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // the beams are light added to the road: the haze of distance is left out of them, or it would show as a pale square round each
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const sprayMat = new THREE.MeshBasicMaterial({ color: 0xc8d6ff, alphaMap: sprayTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

  // Heroes arrive after the tile is built, so there is room kept for them.
  let shadowCount = vehs.length, fxCount = movingCount;
  vehs.forEach((v, i) => (v.shadow = i));
  const shadows = new THREE.InstancedMesh(flat, shadowMat, vehs.length + HERO_ROOM);
  const pools = new THREE.InstancedMesh(flat, poolMat, movingCount + HERO_ROOM);
  const sprays = new THREE.InstancedMesh(flat, sprayMat, movingCount + HERO_ROOM);
  shadows.count = shadowCount;
  pools.count = sprays.count = fxCount;
  for (const m of [shadows, pools, sprays]) {
    m.frustumCulled = false;
    m.layers.set(1); // kept out of the mirror image used for wet streets
    m.renderOrder = 2;
    group.add(m);
  }

  const flames = new Flames();
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 420);
  const flashes = new Lamps(poolTex, shadowTex);
  const bulbs = new Bulbs();
  const sparks = new Sparks();
  const discs = new Discs();
  // tyre marks stay whole for most of a minute; a ribbon in the air is gone in under a second
  const marks = new Strips(2400, 0.62, true, 0.6);
  const streaks = new Strips(360, 0.8, false, 0);
  group.add(flames.mesh, smoke.mesh, flashes.mesh, flashes.beams, flashes.glows, bulbs.mesh, sparks.mesh, discs.mesh, marks.mesh, streaks.mesh);

  // --- placing things ---
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), pos = new THREE.Vector3();
  const sx = new THREE.Vector3(), sz = new THREE.Vector3(), p2 = new THREE.Vector3();
  const tilted = new THREE.Vector3(), tiltedUp = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const NOTHING = new THREE.Matrix4().makeScale(0, 0, 0);
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  const place = (v: Veh, time: number, moving: boolean): void => {
    right.crossVectors(fwd, WORLD_UP).normalize();
    up.crossVectors(right, fwd).normalize();
    const h = v.hero;
    if (h) {
      h.way.copy(fwd);
      const run = moving ? h.run : null;
      // A party trick may move it sideways in its lane.
      const sway = Math.max(-SWAY, Math.min(SWAY, run?.sway ?? 0));
      if (sway !== 0) pos.addScaledVector(right, sway);
      // A party trick may swing its tail out. It turns about a place just ahead of its
      // middle, so that its nose keeps near its line and its tail does the travelling.
      // Its shadow and the beam of its lamps turn with it.
      const slide = run?.slide ?? 0;
      if (slide !== 0) {
        const ahead = v.len * 0.15;
        pos.addScaledVector(fwd, ahead);
        fwd.multiplyScalar(Math.cos(slide)).addScaledVector(right, Math.sin(slide)).normalize();
        right.crossVectors(fwd, WORLD_UP).normalize();
        up.crossVectors(right, fwd).normalize();
        pos.addScaledVector(fwd, -ahead);
      }
      // A party trick may lift its nose or dip it, lean it to one side, and take it off the
      // road. It stands on its rear wheels to lift its nose and on its front ones to dip
      // it, so that neither end sinks into the road. Its shadow stays on the road.
      const pitch = h.run?.pitch ?? 0, roll = h.run?.roll ?? 0;
      tilted.copy(fwd).multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch));
      tiltedUp.copy(up).multiplyScalar(Math.cos(pitch)).addScaledVector(fwd, -Math.sin(pitch));
      h.nose.copy(tilted);
      h.top.copy(tiltedUp).multiplyScalar(Math.cos(roll)).addScaledVector(right, Math.sin(roll));
      h.flank.copy(right).multiplyScalar(Math.cos(roll)).addScaledVector(tiltedUp, -Math.sin(roll));
      h.rise = Math.max(0, run?.rise ?? 0);
      h.road.copy(pos);
      h.pos.copy(pos).addScaledVector(up, h.rise + Math.abs(Math.sin(pitch)) * v.len * (pitch > 0 ? AXLE_REAR : AXLE_FRONT));
      // it leans about its own middle, not about the road under it
      if (roll !== 0) h.pos.addScaledVector(up, MIDDLE * v.len).addScaledVector(h.top, -MIDDLE * v.len);
      h.group.matrix.makeBasis(h.nose, h.top, h.flank).setPosition(h.pos);
      h.group.matrixWorldNeedsUpdate = true;
      h.fwd.copy(fwd);
      h.up.copy(up);
    } else {
      m4.makeBasis(fwd, up, right).setPosition(pos);
      batches[v.type].setMatrixAt(v.inst, m4);
    }
    // a hero that is hidden takes its shadow and its lights with it
    const hidden = h !== null && !h.group.visible;
    if (hidden) {
      shadows.setMatrixAt(v.shadow, NOTHING);
      if (v.fx >= 0) {
        pools.setMatrixAt(v.fx, NOTHING);
        sprays.setMatrixAt(v.fx, NOTHING);
      }
      return;
    }
    // the soft shadow underneath
    sx.copy(fwd).multiplyScalar(v.len + 1.3);
    sz.copy(right).multiplyScalar(v.wid + 1.1);
    p2.copy(pos).addScaledVector(up, 0.07);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    shadows.setMatrixAt(v.shadow, m4);
    if (!moving || v.fx < 0) return;
    // the beam ahead: it starts at the nose, as wide as the lamps are apart, and
    // stays within the lane at its far end
    sx.copy(fwd).multiplyScalar(13);
    sz.copy(right).multiplyScalar(v.wid + 3.8);
    p2.copy(pos).addScaledVector(fwd, v.len / 2 + 6.3).addScaledVector(up, 0.09);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    pools.setMatrixAt(v.fx, v.lamps ? m4 : NOTHING);
    // the spray behind, longer the faster it goes
    const quick = Math.min(1, v.v / 14);
    const l = (2.6 + 2.8 * quick) * (0.85 + 0.15 * Math.sin(time * 9 + v.phase)) * (quick > 0.25 ? 1 : 0);
    sx.copy(fwd).multiplyScalar(l);
    sz.copy(right).multiplyScalar((v.wid + 0.9) * (l > 0 ? 1 : 0));
    p2.copy(pos).addScaledVector(fwd, -(v.len / 2 + l / 2 - 0.4)).addScaledVector(up, 0.11);
    m4.makeBasis(sx, up, sz).setPosition(p2);
    sprays.setMatrixAt(v.fx, m4);
  };

  const carry = new THREE.Vector3(), at = new THREE.Vector3(), side = new THREE.Vector3(), back = new THREE.Vector3(), drift = new THREE.Vector3(), out = new THREE.Vector3();

  /** What a hero puts into the air on this frame. */
  const breathe = (v: Veh, h: Hero, dt: number): void => {
    const a = h.air;
    const gain = (v.v - a.was) / Math.max(dt, 1e-4);
    a.was = v.v;
    if (!h.group.visible) return;
    side.crossVectors(h.fwd, h.up).normalize();
    back.copy(h.fwd).negate();
    // it is carried the way it is going, which in a slide is not the way it points
    carry.copy(h.way).multiplyScalar(v.path ? v.v : 0);
    // Where its exhaust comes out: two pipes at its tail, unless its trick says otherwise.
    // `pipe` gives the place and leaves the way the pipe points in `out`: one in a
    // flank points sideways and a little back.
    const pipes = h.pipes ?? TAIL_PIPES;
    const pipe = (p: Pipe): THREE.Vector3 => {
      if (p.points === 'back') out.copy(back);
      else out.copy(side).multiplyScalar(p.points === 'left' ? -1 : 1).addScaledVector(back, 0.4).normalize();
      return at.copy(h.pos).addScaledVector(h.fwd, p.along * (v.len - 0.2)).addScaledVector(h.up, p.up ?? 0.6).addScaledVector(side, p.across * v.wid);
    };

    // flame, for as long as a burst lasts: a couple of tongues from each pipe on every frame
    if (a.flame > 0) {
      a.flame -= dt;
      for (const p of pipes) {
        const bore = p.bore ?? 1;
        for (let i = 0; i < Math.round(2 * bore); i++) {
          const from = pipe(p);
          // a jet reaches further the harder it is blown
          const reach = p.reach ? p.reach * v.len * (0.5 + 0.5 * Math.min(1, a.flamePower)) : 0;
          flames.tongue(from, out, h.up, carry, a.flamePower * (1 + 0.5 * (bore - 1)), a.flameBlue, reach);
        }
      }
    }

    // exhaust: a wisp whenever it pulls away, and a cloud when its trick asks for one
    let rate = v.path ? Math.min(1, Math.max(0, (gain - 3) / 14)) * 16 : 0;
    let size = 0.5;
    if (a.exhaust > 0) {
      a.exhaust -= dt;
      rate = Math.max(rate, 30 * a.exhaustPower);
      size = 0.55 + 0.5 * a.exhaustPower;
    }
    if (Math.random() < rate * dt) {
      const from = pipe(pipes[Math.floor(Math.random() * pipes.length)]);
      drift.copy(carry).multiplyScalar(0.35).addScaledVector(out, 2.2);
      smoke.puff(from, drift, size, 0.8);
    }

    // tyre smoke, from both rear wheels
    if (a.tyres > 0) {
      a.tyres -= dt;
      for (const off of [-1, 1]) {
        if (Math.random() > 46 * a.tyrePower * dt) continue;
        at.copy(h.pos).addScaledVector(h.fwd, -v.len * 0.3).addScaledVector(h.up, 0.25).addScaledVector(side, off * (v.wid / 2 - 0.25));
        drift.copy(carry).multiplyScalar(0.25).addScaledVector(back, 1.5).addScaledVector(side, off * 1.2);
        smoke.puff(at, drift, 0.8 + 0.7 * a.tyrePower, 0.97);
      }
    }

    // Mist, from behind both rear wheels: it stands higher the harder it is thrown. It is left
    // where it was thrown up, so that it hangs behind the hero and not about it.
    if (a.mist > 0) {
      a.mist -= dt;
      for (const off of [-1, 1]) {
        if (Math.random() > 20 * a.mistPower * dt) continue;
        at.copy(h.pos).addScaledVector(h.fwd, -v.len * 0.62).addScaledVector(h.up, 0.5).addScaledVector(side, off * (v.wid / 2 - 0.35));
        drift.copy(carry).multiplyScalar(0.12).addScaledVector(h.up, 2.2 + 2.4 * a.mistPower).addScaledVector(side, off * 0.4);
        smoke.puff(at, drift, 0.75 + 0.7 * a.mistPower, 1);
      }
    }

    // its lamps, for as long as a flash lasts: a slab of light lying over each, and their light on the road ahead
    if (a.lamps > 0) {
      a.lamps -= dt;
      const lamp = h.lamps ?? NOSE_LAMPS;
      for (const off of [-1, 1]) {
        at.copy(h.pos).addScaledVector(h.nose, lamp.along * v.len).addScaledVector(h.top, lamp.up).addScaledVector(h.flank, off * lamp.across * v.wid);
        flashes.lamp(at, h.nose, h.top, h.flank, lamp.wide * v.wid * (0.85 + 0.15 * a.lampsPower), a.lampsColour);
      }
      sx.copy(h.fwd).multiplyScalar(11);
      sz.copy(side).multiplyScalar(v.wid + 3);
      p2.copy(h.road).addScaledVector(h.fwd, v.len / 2 + 5.3).addScaledVector(h.up, 0.1);
      m4.makeBasis(sx, h.up, sz).setPosition(p2);
      flashes.beam(m4, a.lampsColour);
    }

    // a smoke screen: thick smoke from the whole width of its tail, left hanging where it was laid
    if (a.screen > 0) {
      a.screen -= dt;
      const n = Math.floor(70 * a.screenPower * dt + Math.random());
      for (let i = 0; i < n; i++) {
        at.copy(h.pos).addScaledVector(h.fwd, -(v.len / 2 + 0.2)).addScaledVector(h.up, 0.5 + Math.random() * 0.5).addScaledVector(side, (Math.random() - 0.5) * v.wid);
        drift.copy(carry).multiplyScalar(0.08).addScaledVector(back, 1.5);
        smoke.puff(at, drift, 1.5 + Math.random() * 1.1, 0.86);
      }
    }

    // two jets of white vapour from its bonnet, one to each side: they shoot up and out, and stay with it
    if (a.purge > 0) {
      a.purge -= dt;
      for (const off of [-1, 1]) {
        const n = Math.floor(90 * a.purgePower * dt + Math.random());
        for (let i = 0; i < n; i++) {
          at.copy(h.pos).addScaledVector(h.nose, v.len * 0.27).addScaledVector(h.top, v.len * 0.15).addScaledVector(h.flank, off * v.wid * 0.3);
          drift.copy(carry).addScaledVector(side, off * 4.5).addScaledVector(h.up, 9);
          smoke.jet(at, drift, 0.34 + 0.2 * Math.random());
        }
      }
    }

    // a glow on the road under it and round it
    if (a.under > 0) {
      a.under -= dt;
      sx.copy(h.fwd).multiplyScalar(v.len + 5.5);
      sz.copy(side).multiplyScalar(v.wid + 5.5);
      p2.copy(h.road).addScaledVector(h.up, 0.085);
      m4.makeBasis(sx, h.up, sz).setPosition(p2);
      flashes.glow(m4, a.underColour, a.underPower);
    }

    // Flashbulbs: the cameras of the figures that stand near it, each held at its owner's
    // head. Where nobody stands there are none.
    if (a.bulbs > 0) {
      a.bulbs -= dt;
      let n = Math.floor(6 * a.bulbsPower * dt + Math.random());
      const near = n > 0 ? onlookers(h.road) : nearby;
      for (; n > 0 && near.length > 0; n--) {
        const who = near[Math.floor(Math.random() * near.length)];
        at.set(who.x + (Math.random() - 0.5) * 0.7, who.y + 2 + Math.random() * 0.5, who.z + (Math.random() - 0.5) * 0.7);
        bulbs.flash(at, who.y + 0.25);
      }
    }

    // its four hazard lamps: the two at its nose where its lamps are, and two at its tail
    if (a.hazards > 0) {
      a.hazards -= dt;
      const lamp = h.lamps ?? NOSE_LAMPS;
      for (const end of [1, -1]) {
        for (const off of [-1, 1]) {
          at.copy(h.pos).addScaledVector(h.nose, end * lamp.along * v.len).addScaledVector(h.top, end > 0 ? lamp.up : lamp.up * 0.8).addScaledVector(h.flank, off * lamp.across * v.wid);
          flashes.lamp(at, h.nose, h.top, h.flank, lamp.wide * v.wid * 0.9, 0xffa31a);
        }
      }
    }

    // --- what its wheels, its tail and its belly leave behind ---
    const front = v.len * AXLE_FRONT, rear = -v.len * AXLE_REAR, half = v.wid / 2 - 0.3;

    // black marks under its tyres, for as long as its trick asks and it is on the road
    if (a.marks > 0 && h.rise < 0.05) {
      a.marks -= dt;
      for (let w = 0; w < 4; w++) {
        const was = h.wheel[w];
        if (w < 2 && !a.marksAll) { was.live = false; continue; }
        at.copy(h.road).addScaledVector(h.fwd, w < 2 ? front : rear).addScaledVector(side, (w % 2 ? 1 : -1) * half).addScaledVector(h.up, 0.075);
        if (!was.live) { was.p.copy(at); was.live = true; }
        else if (was.p.distanceToSquared(at) > 0.5) { marks.add(was.p, at, h.up, 0.44, 0x0c0c0e, 45); was.p.copy(at); }
      }
    } else {
      for (const was of h.wheel) was.live = false;
    }

    // ribbons through the air from the corners of its tail
    if (a.streaks > 0) {
      a.streaks -= dt;
      for (let n = 0; n < 2; n++) {
        const was = h.tip[n];
        at.copy(h.pos).addScaledVector(h.nose, -v.len * 0.47).addScaledVector(h.flank, (n ? 1 : -1) * (v.wid / 2 - 0.1)).addScaledVector(h.top, a.streaksUp);
        if (!was.live) { was.p.copy(at); was.live = true; }
        else if (was.p.distanceToSquared(at) > 0.16) { streaks.add(was.p, at, h.up, 0.3 + 0.2 * a.streaksPower, a.streaksColour, 0.5 + 0.45 * a.streaksPower); was.p.copy(at); }
      }
    } else {
      for (const was of h.tip) was.live = false;
    }

    // sparks: from under its nose, where a splitter touches the road, or from under the whole of it
    if (a.sparks > 0) {
      a.sparks -= dt;
      const n = Math.floor(260 * a.sparksPower * dt + Math.random());
      for (let i = 0; i < n; i++) {
        const along = a.sparksNose ? v.len / 2 - 0.15 : (Math.random() - 0.5) * v.len * 0.8;
        at.copy(h.road).addScaledVector(h.fwd, along).addScaledVector(side, (Math.random() - 0.5) * (v.wid - 0.5)).addScaledVector(h.up, 0.1);
        sparks.spark(at, back, carry, a.sparksPower, a.sparksNose);
      }
    }

    // its brake discs, glowing through its wheels: they cool by themselves
    if (a.glow > 0.03) {
      for (let w = 0; w < 4; w++) {
        at.copy(h.pos).addScaledVector(h.nose, w < 2 ? front : rear).addScaledVector(h.flank, (w % 2 ? 1 : -1) * (v.wid / 2 - 0.1)).addScaledVector(h.top, v.len * 0.072);
        discs.disc(at, h.nose, h.top, h.flank, v.len * 0.043, a.glow);
      }
    }
    a.glow = Math.max(0, a.glow - dt * 0.5);
  };

  const placeParked = (v: Veh, time: number): void => {
    fwd.set(Math.cos(v.heading), 0, Math.sin(v.heading));
    pos.copy(v.pos);
    place(v, time, false);
  };
  for (const v of vehs) if (!v.path) placeParked(v, 0);

  const update = (dt: number, time: number, night: number, wet: number): void => {
    flashes.begin();
    discs.begin();
    for (const { path, list, shares } of loops.values()) {
      const n = list.length, L = path.length;
      for (let i = 0; i < n; i++) {
        const v = list[i];
        // Whoever is behind it on its own route: how far. A trick may want to know.
        let behind = L;
        if (n > 1) {
          const tail = list[(i + n - 1) % n];
          behind = v.s - tail.s;
          if (behind <= 0) behind += L;
          behind -= (tail.len + v.len) / 2;
        }
        // Whoever is ahead of it on its own route: how far, and how fast that one is going.
        let ahead = n > 1, aheadV = 0, gap = L;
        if (ahead) {
          const lead = list[(i + 1) % n];
          gap = lead.s - v.s;
          if (gap <= 0) gap += L;
          gap -= (lead.len + v.len) / 2;
          aheadV = lead.v;
        }
        // And whoever it meets on a lane that it shares with another route.
        let coming = false, waiting = false;
        for (const sh of shares) {
          // Where it is: on the shared lane, or coming up to where that starts. It can
          // be both at once, on a ring that the other route leaves and soon joins again.
          const mr = pastStart(v.s, sh.a0, L);
          const myOn = mr < sh.len ? mr : null, myBefore = mr - L > -MERGE_LOOK ? mr - L : null;
          if (myOn === null && myBefore === null) continue;
          if (myBefore !== null) coming = true;
          const LB = sh.other.path.length;
          for (const w of sh.other.list) {
            const wr = pastStart(w.s, sh.b0, LB);
            // one that has just left the lane by another way still counts as on it, until it is clear
            const theirOn = wr < sh.len + PART_CLEAR ? wr : null, theirBefore = wr - LB > -MERGE_LOOK ? wr - LB : null;
            let g = Infinity, speed = 0;
            // It follows whoever is ahead of it on the lane, as it would on its own route.
            if (theirOn !== null) {
              for (const mine of [myOn, myBefore]) {
                if (mine === null || theirOn < mine || (theirOn === mine && w.id < v.id)) continue;
                const d = theirOn - mine - (w.len + v.len) / 2;
                if (d < g) {
                  g = d;
                  speed = w.v;
                }
              }
            }
            // Where both are still coming up to the place the lanes meet, one of them
            // goes first. The other waits, far enough back that the first one's lane
            // is clear of it: `myRoom` is how far it still has to that place.
            if (myBefore !== null && theirBefore !== null) {
              const myRoom = -myBefore - v.len / 2 - MERGE_HOLD, theirRoom = -theirBefore - w.len / 2 - MERGE_HOLD;
              // whether each could still stop short of that place, braking as hard as it can
              const iMust = myRoom < (v.v * v.v) / 48, theyMust = theirRoom < (w.v * w.v) / 48;
              // how much sooner it would get there than the other, in seconds
              const sooner = -theirBefore / Math.max(w.v, 3) - -myBefore / Math.max(v.v, 3);
              let first: boolean;
              if (iMust !== theyMust) first = iMust; // one of them can no longer stop in time
              else if (v.held > PATIENCE !== w.held > PATIENCE) first = v.held > PATIENCE; // one of them has waited long enough
              else if (Math.abs(sooner) > 1) first = sooner > 0; // one of them is clearly there first
              else first = v.v !== w.v ? v.v > w.v : v.id > w.id; // it is close: the faster one keeps going
              if (!first) {
                waiting = true;
                if (myRoom < g) {
                  g = myRoom;
                  speed = 0;
                }
              }
            }
            if (g < gap) {
              gap = g;
              aheadV = speed;
              ahead = true;
            }
          }
        }
        // It counts the time it stands waiting to join a lane, and keeps the count
        // until it has joined: once that is long enough, the others let it in.
        if (waiting && v.v < 2) v.held += dt;
        else if (!coming) v.held = 0;
        // slow for bends, for a stretch with a speed of its own, and for whoever is ahead
        const r = Math.min(path.radiusAt(v.s + v.len * 0.5), path.radiusAt(v.s + v.len * 0.5 + v.v * 0.5));
        const bend = Math.max(5.5, r * 2.2);
        const limit = path.limitAt(v.s + v.len * 0.5);
        let target = Math.min(limit > 0 ? limit * v.pace : v.vmax, bend);
        let pull = 9;
        const run = v.hero?.run;
        if (run?.drive && v.hero) {
          // a party trick has a say in how fast its hero goes, within what the bend allows
          // which way the bend goes that `r` is the radius of: the one it is in, or the one half a second ahead
          const here = v.s + v.len * 0.5, soon = here + v.v * 0.5;
          const turn = path.turnAt(path.radiusAt(soon) < path.radiusAt(here) ? soon : here);
          const want = run.drive({ dt, time, night, wet, speed: v.v, cruise: target, gap: ahead ? gap : L, behind, bend: r, turn, straight: path.straightAt(here), crowd: onlookers(v.hero.road).length, lap: v.s / L }, v.hero.fx);
          target = Math.min(want.speed, bend * 1.3);
          pull = want.accel ?? 9;
        }
        // The room it keeps to whoever is ahead: more the faster it goes, and never less than it
        // needs to come down to that one's speed, braking as hard as it can. The second is what
        // counts when it comes up fast behind one that stands still.
        const safe = 2.4 + Math.max(v.v * 0.55, (v.v * v.v - aheadV * aheadV) / 48);
        if (ahead && gap < safe) target = Math.min(target, Math.max(0, aheadV * (gap / safe) - 0.4));
        if (ahead && gap < 0.9) target = 0;
        if (target > v.v) v.v = Math.min(target, v.v + pull * dt);
        else v.v = Math.max(target, v.v - 24 * dt);
        v.s = (v.s + v.v * dt) % L;

        path.at(v.s + v.wb / 2, A);
        path.at(v.s - v.wb / 2, B);
        pos.addVectors(A, B).multiplyScalar(0.5);
        fwd.subVectors(A, B).normalize();
        v.pos.copy(pos);
        place(v, time, true);
        if (v.hero) breathe(v, v.hero, dt);
      }
    }
    for (const v of vehs) {
      if (v.path) continue;
      // whatever stands on a turntable turns with it
      if (v.turn !== 0) {
        v.heading += v.turn * dt;
        placeParked(v, time);
      } else if (v.hero) {
        placeParked(v, time);
      }
      if (v.hero) {
        v.hero.run?.idle?.(dt, time, v.hero.fx);
        breathe(v, v.hero, dt);
      }
    }
    flames.update(dt, night);
    smoke.update(dt);
    // the light of each flashbulb on the ground round it
    bulbs.update(dt, night, (x, y, z, wide, strength) => {
      m4.makeScale(wide, 1, wide).setPosition(x, y, z);
      flashes.glow(m4, 0xfff6e0, strength * 0.6);
    });
    flashes.update(night);
    sparks.update(dt, night);
    discs.update(night);
    marks.update(dt);
    streaks.update(dt);
    for (const b of batches) b.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
    pools.instanceMatrix.needsUpdate = true;
    sprays.instanceMatrix.needsUpdate = true;

    shadowMat.opacity = 0.42 - 0.2 * night;
    poolMat.opacity = Math.max(0, night - 0.15) * 0.75;
    pools.visible = poolMat.opacity > 0.01;
    sprayMat.opacity = wet * 0.2;
    sprays.visible = sprayMat.opacity > 0.01;
  };

  // --- heroes ---
  const freeSpots = new Map(heroSpots.map((s) => [s.id, s]));

  const places = (): HeroPlace[] => {
    if (heroes.length >= HERO_ROOM) return [];
    const open: HeroPlace[] = [];
    for (const { def, path } of loops.values()) if (def.heroes !== false) open.push({ kind: 'route', id: def.id, room: path.length });
    for (const id of freeSpots.keys()) open.push({ kind: 'spot', id, room: SPOT_ROOM });
    return open;
  };

  const adopt = (body: THREE.Object3D, info: HeroInfo, at: HeroPlace, trick: PartyTrick | null): Hero | null => {
    if (heroes.length >= HERO_ROOM) return null;
    const loop = at.kind === 'route' ? loops.get(at.id) : undefined;
    const spot = at.kind === 'spot' ? freeSpots.get(at.id) : undefined;
    if (!loop && !spot) return null;

    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    g.add(body);
    group.add(g);
    const v = blank();
    const air = {
      flame: 0, flamePower: 0, flameBlue: false, tyres: 0, tyrePower: 0, exhaust: 0, exhaustPower: 0, lamps: 0, lampsPower: 0, lampsColour: 0xfff4d6, mist: 0, mistPower: 0, was: 0,
      screen: 0, screenPower: 0, under: 0, underPower: 0, underColour: 0x2a6bff, purge: 0, purgePower: 0, bulbs: 0, bulbsPower: 0, hazards: 0,
      sparks: 0, sparksPower: 0, sparksNose: false, glow: 0, marks: 0, marksAll: false, streaks: 0, streaksPower: 0, streaksColour: 0xffffff, streaksUp: 0.8,
    };
    const laid = (): { p: THREE.Vector3; live: boolean } => ({ p: new THREE.Vector3(), live: false });
    const hero: Hero = {
      name: info.name, capture: info.capture, place: at, group: g,
      pos: new THREE.Vector3(), fwd: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), way: new THREE.Vector3(1, 0, 0),
      road: new THREE.Vector3(), nose: new THREE.Vector3(1, 0, 0), top: new THREE.Vector3(0, 1, 0), flank: new THREE.Vector3(0, 0, 1), rise: 0,
      wheel: [laid(), laid(), laid(), laid()], tip: [laid(), laid()],
      run: trick ? trick.start() : null,
      pipes: trick?.pipes ?? null,
      lamps: trick?.lamps ?? null,
      air,
      // each of these lasts a moment, and longer the stronger it is
      fx: {
        flame(strength, blue = false) { air.flame = Math.max(air.flame, 0.1 + 0.22 * strength); air.flamePower = strength; air.flameBlue = blue; },
        screen(strength) { air.screen = Math.max(air.screen, 0.1 + 0.2 * strength); air.screenPower = strength; },
        under(strength, colour = 0x2a6bff) { air.under = Math.max(air.under, 0.1); air.underPower = strength; air.underColour = colour; },
        purge(strength) { air.purge = Math.max(air.purge, 0.08 + 0.1 * strength); air.purgePower = strength; },
        bulbs(strength) { air.bulbs = Math.max(air.bulbs, 0.12); air.bulbsPower = strength; },
        hazards() { air.hazards = Math.max(air.hazards, 0.06); },
        tyreSmoke(strength) { air.tyres = Math.max(air.tyres, 0.25 + 0.6 * strength); air.tyrePower = strength; },
        exhaust(strength) { air.exhaust = Math.max(air.exhaust, 0.2 + 0.5 * strength); air.exhaustPower = strength; },
        lamps(strength, colour = 0xfff4d6) { air.lamps = Math.max(air.lamps, 0.07 + 0.07 * strength); air.lampsPower = strength; air.lampsColour = colour; },
        mist(strength) { air.mist = Math.max(air.mist, 0.15 + 0.3 * strength); air.mistPower = strength; },
        sparks(strength, from = 'under') { air.sparks = Math.max(air.sparks, 0.08 + 0.2 * strength); air.sparksPower = strength; air.sparksNose = from === 'nose'; },
        glow(heat) { air.glow = Math.max(air.glow, Math.min(1, heat)); },
        // these two last only as long as the trick goes on asking, so that a mark ends where the slide does
        marks(strength, all = false) { air.marks = Math.max(air.marks, 0.05 + 0.05 * strength); air.marksAll = all; },
        streaks(strength, colour = 0xffffff, up = 0.8) { air.streaks = Math.max(air.streaks, 0.08); air.streaksPower = strength; air.streaksColour = colour; air.streaksUp = up; },
      },
    };
    v.hero = hero;
    v.len = info.length; v.wid = info.width; v.wb = info.length * 0.6;
    v.shadow = shadowCount++;
    shadows.count = shadowCount;

    if (loop) {
      v.path = loop.path;
      v.pace = 1.08;
      v.vmax = loop.def.speed * v.pace;
      v.v = v.vmax * 0.8;
      // it joins the traffic half way between two vehicles, somewhere at random
      const list = loop.list;
      if (list.length === 0) {
        v.s = Math.random() * loop.path.length;
        list.push(v);
      } else {
        const i = Math.floor(Math.random() * list.length);
        const a = list[i], c = list[(i + 1) % list.length];
        let gap = c.s - a.s;
        if (gap <= 0) gap += loop.path.length;
        v.s = (a.s + gap / 2) % loop.path.length;
        list.splice(i + 1, 0, v);
      }
      v.fx = fxCount++;
      pools.count = sprays.count = fxCount;
      movingCount++;
    } else if (spot) {
      freeSpots.delete(at.id);
      v.pos.set(spot.x, spot.y, spot.z);
      v.heading = spot.heading;
      v.turn = spot.turn ?? 0;
      v.lit = spot.lit === true;
      placeParked(v, 0);
      parkedCount++;
    }
    vehs.push(v);
    heroes.push(hero);
    return hero;
  };

  const showHeroes = (on: boolean): void => {
    for (const h of heroes) h.group.visible = on;
  };

  const shared = (): ReturnType<Vehicles['shared']> =>
    [...loops.values()].flatMap((l) => l.shares.map((sh) => ({ route: l.def.id, other: sh.other.def.id, from: sh.a0, otherFrom: sh.b0, length: sh.len })));
  const positions = (): ReturnType<Vehicles['positions']> =>
    [...loops.values()].flatMap((l) => l.list.map((v) => ({ route: l.def.id, s: v.s, v: v.v, x: v.pos.x, y: v.pos.y, z: v.pos.z, hero: v.hero !== null })));

  update(0, 0, 0, 0);
  // The vehicles were spread along their own routes, which takes no account of a lane that two
  // routes share: there two of them can have been put down in one place. So on a tile with such
  // lanes the traffic drives for a few seconds before anyone sees it, long enough for those to part.
  if ([...loops.values()].some((l) => l.shares.length > 0)) for (let i = 0; i < SETTLE * 60; i++) update(1 / 60, 0, 0, 0);
  return {
    group, heroes, update, places, adopt, showHeroes, shared, positions,
    get moving() { return movingCount; },
    get parked() { return parkedCount; },
  };
}
