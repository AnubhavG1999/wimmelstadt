// Rails: a track along any line, the steel that carries it above a street, a
// station beside it, and the trains that run on it. A tram at street level is
// a track and a train with one car; an elevated railway adds a trestle.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3 } from './geo';
import type { Path } from './paths';
import type { Build } from './tile';

const STEEL = 0x5b4a42, RAIL = 0x9aa0a8, SLEEPER = 0x5a4636;
/** How far the floor of a car is above the line its track follows. */
const FLOOR = 0.67;
/** How far a car's side is from the middle of the track. */
const HALF_CAR = 1.32;

/** Where a path is at a place along it, which way it heads, and which way is to its right. */
export interface Frame { x: number; y: number; z: number; tx: number; tz: number; rx: number; rz: number }

const P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();

function frameAt(path: Path, s: number): Frame {
  path.at(s, P);
  path.at(s + 0.6, A);
  path.at(s - 0.6, B);
  const tx = A.x - B.x, tz = A.z - B.z, l = Math.hypot(tx, tz) || 1;
  return { x: P.x, y: P.y, z: P.z, tx: tx / l, tz: tz / l, rx: -tz / l, rz: tx / l };
}

/** A bar that runs along a path, `side` to the right of it and `dy` above it. */
function along(k: Build, path: Path, side: number, dy: number, r: number, color: number): void {
  const n = Math.ceil(path.length / 1.5);
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const f = frameAt(path, (i / n) * path.length);
    pts.push([f.x + f.rx * side, f.y + dy, f.z + f.rz * side]);
  }
  k.b.sweep(pts, pts.map(() => r), color);
}

/** Two rails on sleepers, along a path and at its height. */
export function track(k: Build, path: Path, o: { sleepers?: boolean } = {}): void {
  for (const side of [-0.78, 0.78]) along(k, path, side, 0.12, 0.09, RAIL);
  if (o.sleepers === false) return;
  const n = Math.floor(path.length / 1.15);
  for (let i = 0; i < n; i++) {
    const f = frameAt(path, (i / n) * path.length);
    k.b.obox(f.x, f.y - 0.06, f.z, 1.35, 0.09, 0.2, Math.atan2(f.rz, f.rx), SLEEPER);
  }
}

/**
 * What holds the track up at one place: `T` is a column under the middle of
 * it, `{ arm }` a column that far to the right of it (to the left if negative)
 * with a beam reaching across, and null nothing at all.
 */
export type Bent = 'T' | { arm: number } | null;

export interface TrestleOpts {
  /** How far apart the bents stand. */
  every?: number;
  /**
   * Asked for each bent, with where its middle would be: which kind stands
   * there. A tile uses it to keep columns out of its lanes and junctions. If
   * the answer is null the trestle tries a little further on and a little
   * further back before it goes without.
   */
  bent?: (x: number, z: number, f: Frame) => Bent;
  color?: number;
}

/** The steel under a track that runs above the ground: two girders, and a bent every so often. */
export function trestle(k: Build, path: Path, o: TrestleOpts = {}): void {
  const b = k.b, color = o.color ?? STEEL, every = o.every ?? 8;
  for (const side of [-1.02, 1.02]) along(k, path, side, -0.45, 0.3, color);
  const n = Math.max(1, Math.round(path.length / every));
  for (let i = 0; i < n; i++) {
    for (const shift of [0, every / 3, -every / 3]) {
      const f = frameAt(path, (i / n) * path.length + shift);
      const kind = o.bent ? o.bent(f.x, f.z, f) : 'T';
      if (!kind) continue;
      const yaw = Math.atan2(f.rz, f.rx); // across the track
      const top = f.y - 0.75; // the underside of the girders
      if (kind === 'T') {
        b.obox(f.x, top / 2, f.z, 0.3, top / 2, 0.3, yaw, color);
        b.obox(f.x, top - 0.28, f.z, 1.7, 0.28, 0.34, yaw, color, { faces: 'B' });
      } else {
        const a = kind.arm, far = a < 0 ? 1.4 : -1.4;
        const cx = f.x + f.rx * a, cz = f.z + f.rz * a;
        b.obox(cx, top / 2, cz, 0.32, top / 2, 0.32, yaw, color);
        // the beam reaches from the column to the girder furthest from it, with a brace underneath
        const mid = (a + far) / 2;
        b.obox(f.x + f.rx * mid, top - 0.3, f.z + f.rz * mid, Math.abs(far - a) / 2, 0.3, 0.34, yaw, color, { faces: 'B' });
        const reach = a + Math.sign(far - a) * 2.3;
        b.beam([cx, top - 3.2, cz], [f.x + f.rx * reach, top - 0.55, f.z + f.rz * reach], 0.2, 0.2, color);
      }
      break;
    }
  }
}

export interface StationOpts {
  /** How long the platform is. */
  length: number;
  /** Which side of the track it is on, for someone riding along the path: 1 is the right, -1 the left. */
  side: 1 | -1;
  /** The sign that carries its name. */
  name?: string;
  /** From the platform's edge by the track to its outer edge. */
  width?: number;
  /** The colour of the canopy's roof. */
  roof?: number;
}

/**
 * A platform beside the track, `at` this far along the path, with a canopy, its
 * name, people waiting, and stairs down to the street at its far end. Returns
 * where a train stops for it.
 */
export function station(k: Build, path: Path, at: number, o: StationOpts): number {
  const b = k.b;
  const width = o.width ?? 4.6, inner = HALF_CAR + 0.43, outer = inner + width;
  const WOOD = 0xb9a888, EDGE = 0xe9c94a, CREAM = 0xe9e3d6, roof = o.roof ?? 0x3f5f58;
  const mid = frameAt(path, at);
  const deck = mid.y + FLOOR; // level with the floor of a car
  const yawAlong = (f: Frame): number => Math.atan2(f.tz, f.tx);
  const put = (f: Frame, lat: number): [number, number] => [f.x + f.rx * lat * o.side, f.z + f.rz * lat * o.side];

  // the platform, in short lengths so that it follows the track round a bend
  const steps = Math.max(1, Math.round(o.length / 2)), piece = o.length / steps;
  for (let i = 0; i < steps; i++) {
    const f = frameAt(path, at - o.length / 2 + (i + 0.5) * piece);
    const [x, z] = put(f, (inner + outer) / 2);
    b.obox(x, deck - 0.18, z, piece / 2 + 0.02, 0.18, width / 2, yawAlong(f), WOOD, { faces: 'B' });
    const [ex, ez] = put(f, inner + 0.14);
    b.obox(ex, deck + 0.01, ez, piece / 2 + 0.02, 0.012, 0.14, yawAlong(f), EDGE);
    const [rx, rz] = put(f, outer - 0.07);
    b.obox(rx, deck + 0.42, rz, piece / 2 + 0.02, 0.42, 0.06, yawAlong(f), STEEL);
  }
  // columns under its outer edge, each with a beam back to the track's girders
  const posts = Math.max(2, Math.round(o.length / 5.5));
  for (let i = 0; i <= posts; i++) {
    const f = frameAt(path, at - o.length / 2 + 0.6 + (i / posts) * (o.length - 1.2));
    const yaw = Math.atan2(f.rz, f.rx);
    const [x, z] = put(f, outer - 0.35);
    b.obox(x, (deck - 0.36) / 2, z, 0.26, (deck - 0.36) / 2, 0.26, yaw, STEEL);
    const [bx, bz] = put(f, (outer + 1.0) / 2);
    b.obox(bx, deck - 0.6, bz, (outer - 1.0) / 2, 0.24, 0.26, yaw, STEEL, { faces: 'B' });
  }
  // the canopy over the middle of it, on posts along the outer edge
  const cover = o.length * 0.62, top = deck + 3.5;
  const covers = Math.max(1, Math.round(cover / 2)), cp = cover / covers;
  for (let i = 0; i < covers; i++) {
    const f = frameAt(path, at - cover / 2 + (i + 0.5) * cp);
    const [x, z] = put(f, (inner + outer) / 2 + 0.2);
    b.obox(x, top, z, cp / 2 + 0.02, 0.13, width / 2 + 0.25, yawAlong(f), CREAM, { top: roof, faces: 'B' });
  }
  for (const u of [-0.5, -0.17, 0.17, 0.5]) {
    const f = frameAt(path, at + u * (cover - 0.8));
    const [x, z] = put(f, outer - 0.3);
    b.box(x - 0.1, deck, z - 0.1, x + 0.1, top - 0.13, z + 0.1, STEEL);
    const [gx, gz] = put(f, (inner + outer) / 2);
    k.glows.push({ x: gx, y: top - 0.22, z: gz, sx: 0.5, sy: 0.14, sz: 0.5, color: '#fff3dc' });
  }
  // its name, on the edge of the canopy: once for the street and once for the train
  if (o.name) {
    const [x, z] = put(mid, outer + 0.47);
    k.sign(o.name, x, top - 0.75, z, mid.rx * o.side, mid.rz * o.side, 1.05, cover - 2);
    const [ix, iz] = put(mid, inner - 0.07);
    k.sign(o.name, ix, top - 0.75, iz, -mid.rx * o.side, -mid.rz * o.side, 1.05, cover - 2);
  }
  // people waiting
  for (let i = 0; i < Math.round(o.length / 3); i++) {
    const f = frameAt(path, at - o.length / 2 + 1 + k.rand() * (o.length - 2));
    const [x, z] = put(f, inner + 0.8 + k.rand() * (width - 1.6));
    k.person(x, z, deck);
  }
  // stairs from its far end down to the street
  const end = frameAt(path, at + o.length / 2);
  const flight = Math.ceil(deck / 0.85), tread = 0.95;
  for (let i = 0; i < flight; i++) {
    const h = deck * (1 - (i + 1) / flight) + 0.02;
    const [cx, cz] = put(end, outer - 0.75);
    const x = cx + end.tx * (i + 0.5) * tread, z = cz + end.tz * (i + 0.5) * tread;
    b.obox(x, h / 2, z, tread / 2 + 0.01, h / 2, 0.7, yawAlong(end), STEEL, { top: WOOD });
  }
  const [lx, lz] = put(mid, (inner + outer) / 2);
  k.lights.push({ x: lx, z: lz, r: 11, color: '#fff0d6', k: 0.5 });
  return at;
}

function carGeometry(body: number, stripe: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const L = 3.9, W = HALF_CAR; // half its length and half its width; its nose points along +x
  const GLASS = 0xbfd3df, DARK = 0x2a2c31;
  b.box(-L, 0.55, -W, L, 1.3, W, body);
  b.box(-L - 0.02, 0.98, -W - 0.02, L + 0.02, 1.3, W + 0.02, stripe, { faces: 'NESW' });
  // a band of windows that is lit at night, with posts between them and two doors a side
  b.box(-L, 1.3, -W, L, 2.5, W, GLASS, { win: interior(1.25), faces: 'NESW' });
  for (let i = 0; i <= 6; i++) {
    const x = -L + (i / 6) * 2 * L;
    b.box(x - 0.14, 1.3, -W - 0.03, x + 0.14, 2.5, W + 0.03, body, { faces: 'NESW' });
  }
  for (const x of [-1.95, 1.95]) b.box(x - 0.42, 0.62, -W - 0.04, x + 0.42, 2.44, W + 0.04, 0x8f9aa3, { faces: 'NS' });
  b.box(-L, 2.5, -W, L, 2.95, W, body, { top: 0x8d9299 });
  b.box(-L + 0.5, 2.95, -W + 0.3, L - 0.5, 3.15, W - 0.3, 0x9aa0a8);
  for (const x of [-2.5, 2.5]) b.box(x - 0.9, 0.12, -W + 0.15, x + 0.9, 0.55, W - 0.15, DARK);
  // lamps at both ends
  for (const z of [-0.8, 0.8]) {
    b.box(L, 0.78, z - 0.2, L + 0.06, 1.04, z + 0.2, 0xfff4d6, { win: interior(3), faces: 'E' });
    b.box(-L - 0.06, 0.78, z - 0.2, -L, 1.04, z + 0.2, 0xfff4d6, { win: interior(3), faces: 'W' });
  }
  return b.build();
}

export interface TrainOpts {
  cars: number;
  /** Its speed between stops, in units per second. */
  speed: number;
  /** Where along the path it stops: the places `station` returned. */
  stops?: number[];
  /** Where along the path it starts. */
  from?: number;
  /** How many seconds it waits at a stop. */
  dwell?: number;
  /** The colour of its body, and of the stripe below its windows. */
  body?: number;
  stripe?: number;
  /**
   * A car of the tile's own in place of the L's: a tram, a bullet train, a
   * ferry. Its shape is built with a GeoBuilder, standing on y = 0 with its
   * nose along +x and its middle at the origin, and is `length` long.
   */
  car?: { geometry: THREE.BufferGeometry; length: number };
  /**
   * Where the track ends and the train goes back the way it came, as distances
   * along the path: the path runs up to the end of the line and back again
   * from there. The train needs a stop just short of each, and changes ends
   * while it stands there.
   */
  ends?: number[];
  /** How many seconds it waits where it changes ends. */
  turnDwell?: number;
  /**
   * For trains that share track. The path is cut into stretches, each with the
   * name of the piece of track it runs on, and a train enters a piece only
   * when no other train is on it: it waits at the end of the piece before.
   * Trains on different paths name the track they share alike. Where two
   * tracks join, end the pieces before the join far enough back that a train
   * waiting there is clear of the other track.
   */
  blocks?: { name: string; from: number; to: number }[];
}

/** Which train is on each piece of shared track, for every tile. */
const HELD = new WeakMap<object, Map<string, object>>();

/** A train that runs round a closed path for ever, stopping where it is told to. */
export function train(k: Build, path: Path, o: TrainOpts): void {
  const geo = o.car?.geometry ?? carGeometry(o.body ?? 0xc9d3db, o.stripe ?? 0x2f5fa8);
  const carLen = o.car?.length ?? 7.8;
  const mat = k.mat.city();
  const cars = Array.from({ length: o.cars }, () => {
    const m = new THREE.Mesh(geo, mat);
    m.name = 'train';
    m.matrixAutoUpdate = false;
    m.receiveShadow = true;
    k.group.add(m);
    return m;
  });
  // `pitch` is from the middle of one car to the middle of the next; `bogie` is how far its wheels are from its middle
  const len = path.length, pitch = carLen + 0.3, bogie = carLen * 0.32;
  const wrap = (d: number): number => ((d % len) + len) % len;
  const stops = (o.stops ?? []).map(wrap);
  const ends = (o.ends ?? []).map(wrap);
  let s = wrap(o.from ?? 0), v = 0, wait = 0, left = -1; // `left` is the stop it has just pulled out of

  // --- the pieces of track it shares with other trains ---
  let held = HELD.get(k.group);
  if (!held) HELD.set(k.group, (held = new Map()));
  const signals = held, me = {};
  const blocks = (o.blocks ?? []).map((b) => ({ name: b.name, from: wrap(b.from), len: wrap(b.to - b.from) || len }));
  const within = (b: { from: number; len: number }, d: number): boolean => wrap(d - b.from) < b.len;
  /** The piece it has asked for and not yet reached. */
  let asked = '';
  /** Takes the pieces it stands on, gives up the ones it has left, and says how far it may go before it must wait. */
  const signal = (): number => {
    if (blocks.length === 0) return Infinity;
    const front = s + carLen / 2, back = s - (o.cars - 1) * pitch - carLen / 2;
    const on = new Set<string>();
    for (const b of blocks) if (within(b, back) || wrap(b.from - back) < front - back) on.add(b.name);
    for (const name of on) signals.set(name, me);
    for (const [name, who] of signals) if (who === me && !on.has(name) && name !== asked) signals.delete(name);
    if (on.has(asked)) asked = '';
    const here = blocks.find((b) => within(b, front));
    if (!here) return Infinity;
    const toEnd = here.len - wrap(front - here.from);
    const next = blocks.find((b) => within(b, front + toEnd + 0.05));
    if (!next || on.has(next.name)) return Infinity;
    const who = signals.get(next.name);
    if (who === me) return Infinity;
    if (!who) {
      // the way is clear: it asks for the piece a little before it gets there, so that two trains never both take it
      if (toEnd < 18) {
        signals.set(next.name, me);
        asked = next.name;
      }
      return Infinity;
    }
    return toEnd - 1.2;
  };
  signal();
  const a = new THREE.Vector3(), c = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), pos = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const place = (): void => {
    cars.forEach((m, i) => {
      const sc = s - i * pitch;
      path.at(sc + bogie, a);
      path.at(sc - bogie, c);
      pos.addVectors(a, c).multiplyScalar(0.5);
      pos.y += 0.12;
      fwd.subVectors(a, c).normalize();
      right.crossVectors(fwd, UP).normalize();
      up.crossVectors(right, fwd).normalize();
      m.matrix.makeBasis(fwd, up, right).setPosition(pos);
      m.matrixWorldNeedsUpdate = true;
    });
  };
  place();

  k.each((dt) => {
    if (wait > 0) {
      wait -= dt;
      return;
    }
    const middle = s - ((o.cars - 1) * pitch) / 2;
    if (left >= 0 && wrap(middle - stops[left]) > 3 && wrap(middle - stops[left]) < len / 2) left = -1;
    // the next stop ahead of the middle of the train
    let next = Infinity, which = -1;
    stops.forEach((at, i) => {
      const d = wrap(at - middle);
      if (i !== left && d < next) { next = d; which = i; }
    });
    // slow for bends, and brake so as to stop with its middle at the middle of the platform
    const bend = Math.min(path.radiusAt(s), path.radiusAt(s - (o.cars - 1) * pitch));
    let target = Math.min(o.speed, Math.max(5, bend * 1.3));
    if (which >= 0) {
      target = Math.min(target, Math.sqrt(11 * Math.max(0, next - 0.05)) + 0.25);
      if (next < 0.12) {
        wait = o.dwell ?? 4;
        left = which;
        v = 0;
        // At the end of the line it changes ends. Its cars are alike from both
        // ends, so the last one becomes the first where it stands, and the path
        // ahead of it is the way back.
        const end = ends.find((c) => wrap(c - s) < carLen);
        if (end !== undefined) {
          s = wrap(2 * end - s + (o.cars - 1) * pitch);
          wait = o.turnDwell ?? 8;
          place();
        }
        return;
      }
    }
    // and wait for the piece of track ahead, if another train is on it
    const room = signal();
    if (room < 40) target = Math.min(target, room > 0.08 ? Math.sqrt(11 * room) : 0);
    v += Math.max(-9 * dt, Math.min(4.5 * dt, target - v));
    s = wrap(s + v * dt);
    place();
  });
}
