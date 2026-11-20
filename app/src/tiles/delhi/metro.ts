// The Metro: the Pink Line's viaduct along the Ring Road's verge and over the
// Yamuna, its two stations and its trains.
//
// The viaduct is one deck for two tracks on single round piers with a flared
// head, as Delhi's are: a slab with low parapets on a box girder with sloping
// sides. Over the river the girder deepens towards one pier in the water, with
// cutwaters up and down stream. Moti Bagh stands over the Ring Road at the
// line's west end, its piers in the verge and its stairs and lift towers
// outside the lanes on either side; Mayur Vihar-I stands on the east bank at
// the other end, with a concourse under its platforms. Two trains of three
// cars run there and back between the two, each on a track of its own, and
// pass each other on the way.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3 } from '../../engine/geo';
import { back, lane, lengthOf, sample, toSegs, totalLength, type Piece } from '../../engine/lines';
import { buildPath } from '../../engine/paths';
import { train } from '../../engine/rail';
import { CONCRETE, inStreet } from '../../engine/roads';
import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { AUROBINDO_X, EAST_BANK, METRO, RING, RIVER, SHANTI_X, WEST_BANK, thing, type Thing } from './plan';
import { METRO_LINE } from './roads';

export type Model = (k: Build, t: Thing) => void;

// ---------------------------------------------------------------------------
// Measures
// ---------------------------------------------------------------------------

/** From the middle of the viaduct to the middle of either track. */
const TRACK = 1.75;
/** Half the width of a car, and from a track's middle to the edge of its platform. */
const HALF_CAR = 1.32, EDGE = TRACK + HALF_CAR + 0.12;
/** A platform's outer edge, and the outer face of the wall along it. */
const OUTER = 5.3, WALL = 5.45;
/** How far a car's floor is above the line its track follows: the platform's height. */
const FLOOR = 0.67;
/** A car's length, and from the middle of one to the middle of the next. */
const CAR = 6.4, PITCH = CAR + 0.3;
/** Where a train stands at the end of the line: its middle this far from the end of the track. */
const STAND = 11;

const PINK = 0xe2508f, STEEL = 0xc9ced3, GIRDER = 0xaea99f, PARAPET = 0xc9c4b9, RAILS_C = 0xb4bac2, PLINTH = 0x9f9a90;
const CLAD = 0xdcdedb, ROOF = 0xaab1b6, UNDER = 0xe6e8e6, POST = 0x9aa2a9, GLASS = 0x8fb0bf, PLATFORM = 0xcfc8bb, YELLOW = 0xe9c94a;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** A station's name board: lit, with the name in Hindi above and in English below, as the Metro's own boards have it. */
const BOARD = { color: '#f4f6f8', ink: '#1d3f8f', kind: 'box' as const, real: true, font: DEVANAGARI };

/** The signs this file hangs. */
export const SIGNS: SignDef[] = [
  { id: 'metro-moti-bagh', lines: ['सर एम. विश्वेश्वरैया मोती बाग', 'SIR M. VISHWESHWARAIAH MOTI BAGH'], aspect: 5.2, size: [624, 120], ...BOARD },
  { id: 'metro-moti-bagh-platform', lines: ['मोती बाग', 'MOTI BAGH'], aspect: 4.6, size: [460, 100], ...BOARD },
  { id: 'metro-mayur-vihar', lines: ['मयूर विहार-I', 'MAYUR VIHAR-I'], aspect: 6, size: [660, 110], ...BOARD },
  { id: 'metro-mayur-vihar-platform', lines: ['मयूर विहार-I', 'MAYUR VIHAR-I'], aspect: 6, size: [540, 90], ...BOARD },
];

// ---------------------------------------------------------------------------
// Along the line
// ---------------------------------------------------------------------------

/** A place on the line: where it is, how high, and which way is to its right. */
interface Sec { s: number; x: number; z: number; y: number; rx: number; rz: number }

function secAt(pieces: Piece[], s: number): Sec {
  let run = 0;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i], len = lengthOf(p);
    if (s <= run + len + 1e-6 || i === pieces.length - 1) {
      const u = Math.min(1, Math.max(0, (s - run) / (len || 1)));
      const y = p.y0 + (p.y1 - p.y0) * u;
      if (p.t === 'line') {
        const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1], l = Math.hypot(dx, dz) || 1;
        return { s, x: p.a[0] + dx * u, z: p.a[1] + dz * u, y, rx: -dz / l, rz: dx / l };
      }
      const a = p.a0 + (p.a1 - p.a0) * u, sg = Math.sign(p.a1 - p.a0);
      const tx = -Math.sin(a) * sg, tz = Math.cos(a) * sg;
      return { s, x: p.c[0] + Math.cos(a) * p.r, z: p.c[1] + Math.sin(a) * p.r, y, rx: -tz, rz: tx };
    }
    run += len;
  }
  throw new Error('metro: off the end of the line');
}

/** Places along the line from s0 to s1: its two ends, every join of its pieces, and every `step` round a bend. */
function secs(pieces: Piece[], s0: number, s1: number, step = 1.6): Sec[] {
  const at = [s0];
  let run = 0;
  for (const p of pieces) {
    const len = lengthOf(p);
    const n = p.t === 'arc' ? Math.max(1, Math.ceil(len / step)) : 1;
    for (let i = 1; i <= n; i++) {
      const s = run + (len * i) / n;
      if (s > s0 + 0.05 && s < s1 - 0.05) at.push(s);
    }
    run += len;
  }
  at.push(s1);
  return at.map((s) => secAt(pieces, s));
}

const off = (c: Sec, v: number, dy: number): V3 => [c.x + c.rx * v, c.y + dy, c.z + c.rz * v];

/**
 * A long shape drawn along the line: the outline `prof`, as (across, up) pairs
 * going round clockwise when looked at along the line, laid from each place to
 * the next. Each edge of the outline faces away from it.
 */
function loft(b: GeoBuilder, S: Sec[], prof: [number, number][], color: number): void {
  for (let i = 0; i + 1 < S.length; i++) {
    const A = S[i], B = S[i + 1];
    const rx = (A.rx + B.rx) / 2, rz = (A.rz + B.rz) / 2;
    for (let j = 0; j + 1 < prof.length; j++) {
      const p = prof[j], q = prof[j + 1];
      const nv = -(q[1] - p[1]), ny = q[0] - p[0], l = Math.hypot(nv, ny) || 1;
      b.quad(off(A, p[0], p[1]), off(A, q[0], q[1]), off(B, q[0], q[1]), off(B, p[0], p[1]), [(rx * nv) / l, ny / l, (rz * nv) / l], color);
    }
  }
}

/** The end of a shape of four corners, facing along the line (`dir` 1) or back along it (-1). */
function cap(b: GeoBuilder, c: Sec, quad: [number, number][], dir: number, color: number): void {
  const n: V3 = [c.rz * dir, 0, -c.rx * dir];
  b.quad(off(c, ...quad[0]), off(c, ...quad[1]), off(c, ...quad[2]), off(c, ...quad[3]), n, color);
}

/** Three sides and the top of a bar from v0 to v1 across the line, y0 to y1 above it. */
const bar = (v0: number, v1: number, y0: number, y1: number): [number, number][] => [[v0, y0], [v0, y1], [v1, y1], [v1, y0]];

// ---------------------------------------------------------------------------
// Where the line runs
// ---------------------------------------------------------------------------

const LINE_LENGTH = totalLength(METRO_LINE);
const START = secAt(METRO_LINE, 0);

/** The line's tracks begin a little short of where its viaduct does, so that a train stands at Moti Bagh's middle. */
function trimmed(by: number): Piece[] {
  const [first, ...rest] = METRO_LINE;
  if (first.t !== 'line') throw new Error('metro: the line should begin straight');
  const dx = first.b[0] - first.a[0], dz = first.b[1] - first.a[1], l = Math.hypot(dx, dz);
  return [{ ...first, a: [first.a[0] + (dx / l) * by, first.a[1] + (dz / l) * by] }, ...rest];
}

// ---------------------------------------------------------------------------
// Checks: nothing of this file stands in a lane
// ---------------------------------------------------------------------------

/** The south leg's two lanes are slim decks, which `inStreet` does not know of: the ground under them. */
function inLane(x0: number, z0: number, x1: number, z1: number): boolean {
  const xa = RING.x0, xb = RING.x0 + 2 + 2 * (RING.span + 2 * RING.ramp);
  if (x1 < xa || x0 > xb) return false;
  return [-1, 1].some((s) => {
    const m = RING.z + s * RING.off;
    return z1 > m - RING.half && z0 < m + RING.half;
  });
}

function clear(k: Build, what: string, x0: number, z0: number, x1: number, z1: number): void {
  if (!import.meta.env.DEV) return;
  const at = inStreet(k, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1));
  if (at) console.warn(`delhi: the Metro's ${what} stands in a street, near ${at.x.toFixed(0)}, ${at.z.toFixed(0)}.`);
  if (inLane(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1))) console.warn(`delhi: the Metro's ${what} stands in a lane of the Ring Road, near ${((x0 + x1) / 2).toFixed(0)}, ${((z0 + z1) / 2).toFixed(0)}.`);
}

// ---------------------------------------------------------------------------
// Piers
// ---------------------------------------------------------------------------

/** A single round pier with a flared head, from `foot` up to the underside of what it carries at `top`. */
function pier(k: Build, x: number, z: number, foot: number, top: number, r = 0.8, flare = 1.6, check = true): void {
  const b = k.b;
  const neck = top - 1.5;
  b.cyl(x, z, foot, neck, r, r, 10, CONCRETE, { cap: false });
  b.cyl(x, z, neck, top - 0.02, r, flare, 10, CONCRETE);
  if (check) clear(k, 'pier', x - r, z - r, x + r, z + r);
}

// ---------------------------------------------------------------------------
// A station
// ---------------------------------------------------------------------------

interface Frame { cx: number; cz: number; yaw: number }

/** Where a place given along the track (u) and across it (v) is on the tile. */
const world = (f: Frame, u: number, v: number): [number, number] => {
  const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  return [f.cx + u * c - v * s, f.cz + u * s + v * c];
};
/** Which way, on the tile, a face that looks across the track to `side` faces. */
const facing = (f: Frame, side: number): [number, number] => [-Math.sin(f.yaw) * side, Math.cos(f.yaw) * side];

interface StationOpts {
  /** The track's height, the station's length along it, and how high its roof stands above the track. */
  y: number; len: number; h: number;
  /** Where its piers stand, along the track from its middle. */
  piers: number[];
  /** Along each outer wall, the stretches that are left open for a way out. */
  gaps: [number, number][];
  sign: string; platformSign: string;
  seed: number;
}

/**
 * What every station of the line has, built along local x with its middle at
 * the origin: a platform outside each track, a wall along its outer edge with
 * the name on it, a curved roof of sheet metal over both on round posts, and
 * a pier with a wide head under each crossbeam.
 */
function stationCore(k: Build, f: Frame, o: StationOpts): void {
  const b = k.b, Y = o.y, top = Y + FLOOR, L = o.len / 2;
  const rand = rng(o.seed);
  b.moved(f.cx, 0, f.cz, f.yaw, () => {
    for (const side of [-1, 1]) {
      const v = (a: number, c: number): [number, number] => (side > 0 ? [a, c] : [-c, -a]);
      // the platform, with a yellow line along its edge
      {
        const [v0, v1] = v(EDGE, OUTER);
        b.box(-L, Y - 0.6, v0, L, top, v1, PLATFORM, { faces: 'NESWTB' });
        const [e0, e1] = v(EDGE, EDGE + 0.28);
        b.box(-L + 0.2, top, e0, L - 0.2, top + 0.02, e1, YELLOW, { faces: 'T' });
      }
      // the wall along its outer edge, which hangs down over the edge of the deck, with gaps for the ways out
      {
        const [w0, w1] = v(OUTER, WALL);
        let u = -L;
        for (const [g0, g1] of [...o.gaps, [L, L] as [number, number]]) {
          if (g0 > u + 0.05) b.box(u, Y - 1.0, w0, g0, top + 1.25, w1, CLAD, { faces: 'NESWTB' });
          u = g1;
        }
        // a pink band along its top, as the line's stations have
        let u2 = -L;
        for (const [g0, g1] of [...o.gaps, [L, L] as [number, number]]) {
          if (g0 > u2 + 0.05) {
            const [p0, p1] = v(WALL, WALL + 0.04);
            b.box(u2, top + 0.95, p0, g0, top + 1.2, p1, PINK, { faces: side > 0 ? 'S' : 'N' });
          }
          u2 = g1;
        }
      }
      // the name: outside, on a board on the wall, and inside, facing the track
      {
        const [d0, d1] = v(WALL, WALL + 0.1);
        b.box(-4.4, top - 0.75, d0, 4.4, top + 0.55, d1, 0x1f2d52, { faces: 'NESWTB' });
        const [x, z] = world(f, 0, side * (WALL + 0.13));
        const [nx, nz] = facing(f, side);
        k.sign(o.sign, x, top - 0.1, z, nx, nz, 1.15, 8.4);
        for (const u of [-L / 2, 0]) {
          const [i0, i1] = v(OUTER - 0.08, OUTER);
          b.box(u - 2, top + 1.6, i0, u + 2, top + 2.3, i1, 0x1f2d52, { faces: 'NESWTB' });
          const [ix, iz] = world(f, u, side * (OUTER - 0.11));
          k.sign(o.platformSign, ix, top + 1.95, iz, -nx, -nz, 0.55, 3.8);
        }
      }
      // posts for the roof
      for (let i = 0; i < 4; i++) {
        const u = -L + 2.5 + (i * (o.len - 5)) / 3;
        b.cyl(u, side * 4.75, top, Y + o.h - 1.45, 0.17, 0.17, 6, POST, { cap: false });
      }
      // people waiting
      for (let i = 0; i < 3; i++) {
        const u = -L + 2 + rand() * (o.len - 4), vv = side * (EDGE + 0.7 + rand() * (OUTER - EDGE - 1.2));
        const [x, z] = world(f, u, vv);
        k.person(x, z, top);
      }
    }

    // the roof: a curve of sheet metal over both platforms, with its underside and its edges
    {
      const half = 6.0, rise = 1.25, crown = Y + o.h, edge = crown - rise;
      const R = (half * half + rise * rise) / (2 * rise), n = 10, U = L + 0.6;
      const yAt = (vv: number): number => crown - R + Math.sqrt(R * R - vv * vv);
      for (let i = 0; i < n; i++) {
        const v0 = -half + (i * 2 * half) / n, v1 = -half + ((i + 1) * 2 * half) / n;
        const y0 = yAt(v0), y1 = yAt(v1);
        const nv = -(y1 - y0), ny = v1 - v0, l = Math.hypot(nv, ny);
        b.quad([-U, y0, v0], [U, y0, v0], [U, y1, v1], [-U, y1, v1], [0, ny / l, nv / l], ROOF);
        b.quad([-U, y0 - 0.14, v0], [U, y0 - 0.14, v0], [U, y1 - 0.14, v1], [-U, y1 - 0.14, v1], [0, -ny / l, -nv / l], UNDER);
        for (const e of [-1, 1]) b.quad([e * U, y0 - 0.14, v0], [e * U, y0 - 0.14, v1], [e * U, y1, v1], [e * U, y0, v0], [e, 0, 0], ROOF);
      }
      for (const side of [-1, 1]) b.box(-U, edge - 0.45, side * half - 0.1, U, edge + 0.02, side * half + 0.1, ROOF, { faces: 'NESWTB' });
      // lamps under it, along both platforms
      for (const side of [-1, 1]) {
        for (const u of [-L * 0.6, 0, L * 0.6]) {
          const [x, z] = world(f, u, side * 4.2);
          k.glows.push({ x, y: yAt(4.2) - 0.3, z, sx: 0.7, sy: 0.12, sz: 0.7, color: '#f4f7ff' });
        }
      }
    }

    // under the platforms: a crossbeam on each pier
    for (const u of o.piers) b.box(u - 0.75, Y - 1.75, -OUTER - 0.1, u + 0.75, Y - 0.5, OUTER + 0.1, CONCRETE, { faces: 'NESWB' });
  });
  for (const u of o.piers) {
    const [x, z] = world(f, u, 0);
    pier(k, x, z, 0, Y - 1.75, 1.0, 1.7);
  }
  const [lx, lz] = world(f, 0, 0);
  k.lights.push({ x: lx, z: lz, r: 14, color: '#eef2ff', k: 0.6 });
}

/** A flight of steps from `h` down to the ground, along local x from `u0` the way `dir` points, between v0 and v1. */
function stairs(b: GeoBuilder, u0: number, dir: number, v0: number, v1: number, h: number): number {
  const n = Math.max(4, Math.round(h / 0.55)), going = 0.6;
  for (let i = 0; i < n; i++) {
    const top = (h * (n - i)) / (n + 1), u = u0 + dir * (i + 0.5) * going;
    b.box(u - going / 2 - 0.01, top - h / (n + 1) - 0.12, v0, u + going / 2 + 0.01, top, v1, CONCRETE, { faces: 'NESWTB' });
  }
  const end = u0 + dir * n * going;
  // a stringer under each side, and a post under the middle
  for (const vv of [v0 + 0.08, v1 - 0.08]) b.beam([u0, h - 0.5, vv], [end, -0.05, vv], 0.12, 0.12, GIRDER);
  const mid = (u0 + end) / 2;
  b.box(mid - 0.2, 0, (v0 + v1) / 2 - 0.2, mid + 0.2, h / 2 - 0.4, (v0 + v1) / 2 + 0.2, CONCRETE);
  return end;
}

/** A lift's tower of glass, with a concrete cap, from the ground to `h`. */
function liftTower(b: GeoBuilder, u0: number, u1: number, v0: number, v1: number, h: number): void {
  b.box(u0, 0, v0, u1, h, v1, GLASS, { win: interior(0.8) });
  for (const [a, c] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) b.box(a - 0.12, 0, c - 0.12, a + 0.12, h, c + 0.12, CLAD);
  b.box(u0 - 0.2, h, v0 - 0.2, u1 + 0.2, h + 0.4, v1 + 0.2, CLAD);
}

// ---------------------------------------------------------------------------
// The two stations
// ---------------------------------------------------------------------------

/**
 * Sir M. Vishweshwaraiah Moti Bagh: over the Ring Road, its three piers in the
 * verge between the lanes. From the east end of each platform a covered
 * bridge reaches out over the lane to a lift tower and a flight of stairs that
 * come down outside the road: to R. K. Puram on the south side, and to Moti
 * Bagh on the north.
 */
const motiBagh: Model = (k, t) => {
  const b = k.b, Y = t.y ?? METRO.y, top = Y + FLOOR, L = t.w / 2;
  const f: Frame = { cx: t.x + L, cz: RING.z, yaw: 0 };
  // the way out leaves from this stretch of each platform's wall
  const g0 = L - 4.4, g1 = L;
  stationCore(k, f, { y: Y, len: t.w, h: t.h, piers: [-6, 0, 6], gaps: [[g0, g1]], sign: 'metro-moti-bagh', platformSign: 'metro-moti-bagh-platform', seed: 3601 });
  // How far out the stairs come down: just beyond the lane's deck, on each side.
  const reach = RING.off + RING.half + 1.1;
  b.moved(f.cx, 0, f.cz, f.yaw, () => {
    for (const side of [-1, 1]) {
      const v = (a: number, c: number): [number, number] => (side > 0 ? [a, c] : [-c, -a]);
      const out = reach + 1.6;
      // the bridge, at the platform's height, with glass sides and a roof
      {
        const [v0, v1] = v(WALL, out);
        b.box(g0, top - 0.4, v0, g1, top, v1, PLATFORM, { faces: 'NESWTB' });
        b.box(g0 - 0.1, top + 2.4, v0, g1 + 0.1, top + 2.62, v1 + side * 0.1, ROOF, { faces: 'NESWTB' });
        // its glass sides: the east one whole, the west one open where the stairs begin
        b.box(g1 - 0.14, top, v0, g1, top + 1.3, v1, GLASS, { faces: 'NESWT', win: interior(0.6) });
        const [s0] = v(reach, out);
        const [a0, a1] = side > 0 ? [v0, s0] : [v(WALL, reach)[0], v1];
        b.box(g0, top, a0, g0 + 0.14, top + 1.3, a1, GLASS, { faces: 'NESWT', win: interior(0.6) });
        for (const [pu, pv] of [[g0, v0], [g1, v0], [g0, v1], [g1, v1]]) b.box(pu - 0.1, top, pv - 0.1, pu + 0.1, top + 2.4, pv + 0.1, POST);
      }
      // the lift, at the bridge's outer end
      {
        const [v0, v1] = v(reach - 0.2, out + 0.3);
        liftTower(b, g1 - 2.0, g1 + 0.3, v0, v1, top + 3.3);
        const [x0, z0] = world(f, g1 - 2.0, v0), [x1, z1] = world(f, g1 + 0.3, v1);
        clear(k, 'lift tower', x0, z0, x1, z1);
      }
      // and the stairs, down to the west from the bridge
      {
        const [v0, v1] = v(reach, out);
        const end = stairs(b, g0, -1, v0, v1, top);
        const [x0, z0] = world(f, end, v0), [x1, z1] = world(f, g0, v1);
        clear(k, 'stairs', x0, z0, x1, z1);
        // a canopy over its foot, and a light
        b.box(end - 1.2, 2.6, v0 - 0.2, end + 1.0, 2.8, v1 + 0.2, ROOF, { faces: 'NESWTB' });
        b.box(end - 1.1, 0, v0 - 0.05, end - 0.9, 2.6, v0 + 0.15, POST);
        b.box(end - 1.1, 0, v1 - 0.15, end - 0.9, 2.6, v1 + 0.05, POST);
        const [lx, lz] = world(f, end, (v0 + v1) / 2);
        k.lights.push({ x: lx, z: lz, r: 8, color: '#fff0d6', k: 0.55 });
        k.glows.push({ x: lx, y: 2.5, z: lz, sx: 0.6, sy: 0.1, sz: 0.6, color: '#fff3dc' });
      }
    }
  });
};

/**
 * Mayur Vihar-I: on the east bank, at the line's end. It stands on open
 * ground, so it has a concourse under its platforms, as Delhi's stations do,
 * and two flights of stairs and a lift come down from it on the river side.
 */
const mayurVihar: Model = (k, t) => {
  const b = k.b, Y = t.y ?? METRO.y, L = t.d / 2;
  // the line runs north here: along the station, local x points south and local z west
  const f: Frame = { cx: METRO.x1, cz: t.z + L, yaw: Math.PI / 2 };
  stationCore(k, f, { y: Y, len: t.d, h: t.h, piers: [-8, 0, 8], gaps: [], sign: 'metro-mayur-vihar', platformSign: 'metro-mayur-vihar-platform', seed: 4401 });
  const C0 = 4.4, C1 = Y - 1.9, CU = 6.5, CV = 5.6;
  b.moved(f.cx, 0, f.cz, f.yaw, () => {
    // the concourse: a box of panels with a band of glass, lit inside at night
    b.box(-CU, C0, -CV, CU, C1, CV, CLAD, { faces: 'NESWTB' });
    b.box(-CU - 0.05, C0 + 0.7, -CV - 0.05, CU + 0.05, C1 - 0.5, CV + 0.05, GLASS, { faces: 'NESW', win: interior(1.0) });
    b.box(-CU - 0.08, C1 - 0.42, -CV - 0.08, CU + 0.08, C1 - 0.12, CV + 0.08, PINK, { faces: 'NESW' });
    // two ways down on the river side, one to the north and one to the south
    for (const dir of [-1, 1]) {
      const u0 = dir * (CU - 1), v0 = CV + 0.05, v1 = CV + 1.85;
      b.box(u0 - 1, C0 - 0.4, v0, u0 + 1, C0, v1, PLATFORM, { faces: 'NESWTB' });
      b.box(u0 - 1.1, C0 + 2.3, v0, u0 + 1.1, C0 + 2.5, v1 + 0.15, ROOF, { faces: 'NESWTB' });
      const end = stairs(b, u0 + dir, dir, v0 + 0.1, v1 - 0.1, C0);
      const [x0, z0] = world(f, u0 - 1, v0), [x1, z1] = world(f, end, v1);
      clear(k, 'stairs', x0, z0, x1, z1);
      const [lx, lz] = world(f, end, (v0 + v1) / 2);
      k.lights.push({ x: lx, z: lz, r: 8, color: '#fff0d6', k: 0.55 });
    }
    liftTower(b, -1, 1, CV + 0.05, CV + 1.9, Y + 0.4);
  });
  const [lx, lz] = world(f, 0, CV + 3);
  k.lights.push({ x: lx, z: lz, r: 12, color: '#fff0d6', k: 0.6 });
};

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = { 'moti-bagh-station': motiBagh, 'mayur-vihar-station': mayurVihar };

// ---------------------------------------------------------------------------
// The tracks, and the trains on them
// ---------------------------------------------------------------------------

/** Each track's line, from where it begins short of Moti Bagh's middle to the end of the line at Mayur Vihar. */
function trackLines(motiBaghMid: number): { north: Piece[]; south: Piece[] } {
  const start = motiBaghMid - STAND;
  const pieces = trimmed(start);
  return { north: lane(pieces, TRACK), south: lane(pieces, -TRACK) };
}

/** How far along the line Moti Bagh's middle is: its lot's middle, measured from where the line begins. */
const motiBaghMid = (t: { x: number; w: number }): number => t.x + t.w / 2 - START.x;

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = (() => {
  const lines = trackLines(motiBaghMid(thing('moti-bagh-station')));
  return { 'metro-north': sample(lines.north, 1), 'metro-south': sample(lines.south, 1) };
})();

/** The car of the Pink Line: stainless steel, a pink stripe below its windows, lit inside at night. Alike from both ends. */
function carGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const L = CAR / 2, W = HALF_CAR, DARK = 0x33363b, WIN = 0x4d5c66;
  b.box(-L + 0.4, 0.1, -W + 0.2, L - 0.4, 0.5, W - 0.2, DARK, { faces: 'NESWB' });
  for (const x of [-2.1, 2.1]) b.box(x - 0.85, 0, -W + 0.12, x + 0.85, 0.42, W - 0.12, 0x26282c, { faces: 'NESWB' });
  b.box(-L, 0.5, -W, L, 1.35, W, STEEL, { faces: 'NESWB' });
  b.box(-L - 0.02, 1.06, -W - 0.02, L + 0.02, 1.32, W + 0.02, PINK, { faces: 'NESW' });
  b.box(-L, 1.35, -W, L, 2.45, W, WIN, { win: interior(1.3), faces: 'NESW' });
  // the posts between its windows, and three doors a side
  for (const x of [-L + 0.15, -1.05, 1.05, L - 0.15]) b.box(x - 0.15, 1.35, -W - 0.03, x + 0.15, 2.45, W + 0.03, STEEL, { faces: 'NS' });
  for (const x of [-2.15, 0, 2.15]) {
    b.box(x - 0.42, 0.55, -W - 0.04, x + 0.42, 2.4, W + 0.04, 0xdde1e4, { faces: 'NS' });
    b.box(x - 0.25, 1.5, -W - 0.06, x + 0.25, 2.25, W + 0.06, WIN, { faces: 'NS', win: interior(1.3) });
  }
  b.box(-L, 2.45, -W, L, 2.82, W, STEEL, { top: 0xb9bec3 });
  b.box(-1.6, 2.82, -W + 0.35, 1.6, 2.98, W - 0.35, 0x9aa0a8);
  // both ends: a dark face of glass over the stripe, and lamps
  for (const e of [-1, 1]) {
    b.box(e > 0 ? L : -L - 0.04, 1.4, -W + 0.12, e > 0 ? L + 0.04 : -L, 2.4, W - 0.12, 0x1e2328, { faces: e > 0 ? 'E' : 'W', win: interior(0.4) });
    for (const z of [-0.85, 0.85]) b.box(e > 0 ? L : -L - 0.06, 0.72, z - 0.18, e > 0 ? L + 0.06 : -L, 0.92, z + 0.18, 0xfff4d6, { faces: e > 0 ? 'E' : 'W', win: interior(3) });
  }
  return b.build();
}

// ---------------------------------------------------------------------------
// The viaduct, the tracks and the trains
// ---------------------------------------------------------------------------

/** Whatever this file builds that is not one of the plan's things. */
export function extras(k: Build): void {
  const b = k.b, P = METRO_LINE, END = LINE_LENGTH;
  const west = thing('moti-bagh-station'), east = thing('mayur-vihar-station');
  const westMid = motiBaghMid(west);
  // the stretches along the line that the two stations take
  const W0 = west.x - START.x, W1 = W0 + west.w, E0 = END - east.d, E1 = END;

  // --- the deck: a slab on a box girder, the whole way ---
  const all = secs(P, 0, END);
  loft(b, all, [[-3.55, -0.15], [3.55, -0.15], [3.55, -0.45], [-3.55, -0.45], [-3.55, -0.15]], CONCRETE);
  const GIR: [number, number][] = [[2.2, -0.45], [1.4, -1.5], [-1.4, -1.5], [-2.2, -0.45]];
  loft(b, all, GIR, GIRDER);
  for (const [c, dir] of [[all[0], -1], [all[all.length - 1], 1]] as [Sec, number][]) {
    cap(b, c, [[-3.55, -0.45], [3.55, -0.45], [3.55, -0.15], [-3.55, -0.15]], dir, CONCRETE);
    cap(b, c, [[-1.4, -1.5], [1.4, -1.5], [2.2, -0.45], [-2.2, -0.45]], dir, GIRDER);
  }
  // low parapets, except along the stations' platforms
  for (const [s0, s1] of [[0, W0], [W1, E0]]) {
    if (s1 - s0 < 0.5) continue;
    const run = secs(P, s0, s1);
    for (const side of [-1, 1]) {
      const [v0, v1] = side > 0 ? [3.35, 3.55] : [-3.55, -3.35];
      loft(b, run, bar(v0, v1, -0.15, 0.6), PARAPET);
      for (const [c, dir] of [[run[0], -1], [run[run.length - 1], 1]] as [Sec, number][]) cap(b, c, [[v0, -0.15], [v1, -0.15], [v1, 0.6], [v0, 0.6]], dir, PARAPET);
    }
  }

  // --- the two tracks: rails on a concrete plinth, with no sleepers, as on Delhi's viaducts ---
  const tracks = secs(P, westMid - STAND, END, 1.4);
  for (const tc of [-TRACK, TRACK]) {
    loft(b, tracks, bar(tc - 0.95, tc + 0.95, -0.2, 0.02), PLINTH);
    for (const rc of [tc - 0.78, tc + 0.78]) loft(b, tracks, bar(rc - 0.07, rc + 0.07, 0.02, 0.2), RAILS_C);
    // a buffer stop at each end
    for (const [c, dir] of [[tracks[0], 1], [tracks[tracks.length - 1], -1]] as [Sec, number][]) {
      const p = off(c, tc, 0), tx = c.rz * dir, tz = -c.rx * dir;
      b.obox(p[0] + tx * 0.3, c.y + 0.45, p[2] + tz * 0.3, 0.3, 0.45, 1.1, Math.atan2(c.rz, c.rx) + Math.PI / 2, 0x3a3d42);
      b.obox(p[0] + tx * 0.62, c.y + 0.62, p[2] + tz * 0.62, 0.04, 0.22, 1.0, Math.atan2(c.rz, c.rx) + Math.PI / 2, 0xd8b23a);
    }
  }

  // --- the bridge over the Yamuna: the girder deepens towards its one pier in the water ---
  const RX = RIVER.x, span = RIVER.half + 1, deep = 2.3, Y = METRO.y;
  {
    // where the line crosses the river's middle: it runs straight along one z from bank to bank
    let crossing = secAt(P, W1);
    for (let s = W1; s < E0; s += 0.25) {
      const c = secAt(P, s);
      if (Math.abs(c.x - RX) < Math.abs(crossing.x - RX)) crossing = c;
    }
    const zc = crossing.z, hz = 1.4;
    const d = (x: number): number => deep * Math.max(0, 1 - Math.abs(x - RX) / span) ** 1.6;
    const n = 8;
    for (const sg of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const xa = RX + sg * span * (i / n), xb = RX + sg * span * ((i + 1) / n);
        const ya = Y - 1.5 - d(xa), yb = Y - 1.5 - d(xb);
        for (const e of [-1, 1]) b.quad([xa, ya, zc + e * hz], [xb, yb, zc + e * hz], [xb, Y - 1.5, zc + e * hz], [xa, Y - 1.5, zc + e * hz], [0, 0, e], GIRDER);
        const m = (yb - ya) / (xb - xa), l = Math.hypot(m, 1);
        b.quad([xa, ya, zc - hz], [xb, yb, zc - hz], [xb, yb, zc + hz], [xa, ya, zc + hz], [m / l, -1 / l, 0], GIRDER);
      }
    }
    // the pier in the water: a wall along the stream, pointed at both ends, under a wide cap
    const capY = Y - 1.5 - deep - 0.02;
    b.box(RX - 1.1, capY - 0.7, zc - 2.5, RX + 1.1, capY, zc + 2.5, CONCRETE, { faces: 'NESWTB' });
    b.box(RX - 0.7, -2.4, zc - 1.6, RX + 0.7, capY - 0.7, zc + 1.6, CONCRETE);
    for (const e of [-1, 1]) b.cyl(RX, zc + e * 1.6, -2.4, capY - 0.7, 0.7, 0.7, 4, CONCRETE, { phase: 0 });
    // a darker band where the river has stained it
    b.box(RX - 0.72, -1.2, zc - 1.62, RX + 0.72, -0.5, zc + 1.62, 0x8f8a7e, { faces: 'NESW' });
    // a steel handrail along both parapets over the water, on posts, with a lamp at every fourth post
    const rail = secs(P, crossing.s - span, crossing.s + span);
    for (const side of [-1, 1]) {
      const v = side * 3.45;
      loft(b, rail, bar(v - 0.07, v + 0.07, 1.05, 1.17), 0xd9dde0);
      for (let i = 0; i <= 8; i++) {
        const c = secAt(P, crossing.s - span + (i * 2 * span) / 8), p = off(c, v, 0.6);
        b.box(p[0] - 0.07, p[1], p[2] - 0.07, p[0] + 0.07, Y + 1.05, p[2] + 0.07, 0xd9dde0);
        if (i % 4 === 2) k.glows.push({ x: p[0], y: Y + 1.3, z: p[2], sx: 0.22, sy: 0.22, sz: 0.22, color: '#fff3dc' });
      }
    }
    // the piers on the two banks
    pier(k, WEST_BANK - 1, zc, 0, Y - 1.5);
    pier(k, EAST_BANK + 1, zc, 0, Y - 1.5);
  }

  // --- the piers along the rest of the line, every twelve or so, kept out of the streets and the river ---
  const special = [WEST_BANK - 1, RX, EAST_BANK + 1];
  const onRoad = (x: number, z: number): boolean =>
    // the two streets under the flyovers, the Ring Road's corner, where its lanes swing north under the viaduct, and the river
    (z < RING.z + 12 && (Math.abs(x - SHANTI_X) < 8.5 || Math.abs(x - AUROBINDO_X) < 8.5)) || (x > 46 && x < 68) || (x > WEST_BANK - 2 && x < EAST_BANK + 2);
  /** From where the Ring Road leaves the south leg's decks to its corner, the line runs down the middle of its verge, which is in the street. */
  const onVerge = (x: number): boolean => x > 23 && x < 50.5;
  for (let s = W1 + 8; s < E0 - 4; s += 12) {
    const c = secAt(P, s);
    if (onRoad(c.x, c.z) || special.some((x) => Math.abs(c.x - x) < 6 && Math.abs(c.z - 74) < 2)) continue;
    // (on the verge the line is the Ring Road's own middle, so a pier there stands between its two carriageways)
    if (!onVerge(c.x) && inStreet(k, c.x - 0.9, c.z - 0.9, c.x + 0.9, c.z + 0.9)) continue;
    pier(k, c.x, c.z, 0, Y - 1.5, 0.8, 1.6, !onVerge(c.x));
  }

  // --- the trains: three cars each, there and back on a track of their own, so that they pass ---
  const car = { geometry: carGeometry(), length: CAR };
  const lines = trackLines(westMid);
  ([[lines.north, 0], [lines.south, 1]] as [Piece[], number][]).forEach(([line, which]) => {
    const path = buildPath(toSegs([...line, ...back(line)]), true);
    const half = path.length / 2;
    const stops = [half - STAND, path.length - STAND];
    // one starts out of Moti Bagh, the other at Mayur Vihar
    const from = which === 0 ? STAND + PITCH : half - STAND + PITCH;
    train(k, path, { cars: 3, speed: 14, stops, ends: [0, half], from, dwell: 6, turnDwell: 9, car });
  });
}

