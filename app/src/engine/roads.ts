// Roads. Above the ground: the deck of an expressway, a flyover, a ramp, a
// bridge. On the ground: streets laid as strips along any line, with their
// junctions.

import * as THREE from 'three';
import type { V3, WinSpec } from './geo';
import { FLAG, flat, type P2 } from './ground';
import type { Path } from './paths';
import type { Build } from './tile';

export const CONCRETE = 0xbdb8ad;
export const ASPHALT = 0x4f5157;

export interface DeckOpts {
  thick: number; wall: number; lanes: number; lift?: number; structure?: boolean; step?: number;
  /** Where the road is lower than this, its sides run down to the ground, as on a ramp of earth. */
  skirt?: number;
  /**
   * Says where a low wall is left out, so that another road can join this one:
   * asked with how far along the path, and which side, -1 for the left of the
   * way the path runs and 1 for the right.
   */
  open?: (s: number, side: -1 | 1) => boolean;
}

/**
 * Lays a strip of road along a path, `hw` wide to either side of it. Unless
 * `structure` is false it gets the concrete that carries it: an underside, two
 * sides and a low wall along each edge.
 */
export function roadDeck(k: Build, path: Path, hw: number, o: DeckOpts): void {
  const deckB = k.deck, cityB = k.b;
  const n = Math.max(1, Math.ceil(path.length / (o.step ?? 2)));
  const lift = o.lift ?? 0;
  // how deep the structure is and how tall its low walls are, at one place along the road
  const dims = (f: { y: number }): { t: number; w: number } => {
    if (o.skirt === undefined) return { t: o.thick, w: o.wall };
    const h = f.y - lift;
    return { t: h < o.skirt ? f.y : o.thick, w: o.wall * Math.min(1, h / 1.2) };
  };
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const frame = (s: number) => {
    path.at(s, p);
    path.at(s + 0.6, a);
    path.at(s - 0.6, b);
    const tx = a.x - b.x, tz = a.z - b.z;
    const l = Math.hypot(tx, tz) || 1;
    return { x: p.x, y: p.y + lift, z: p.z, rx: -tz / l, rz: tx / l };
  };
  const win: WinSpec = { cell: o.lanes, storey: hw * 2, lit: 0, kind: 0 };
  const up = (q: V3, dy: number): V3 => [q[0], q[1] + dy, q[2]];
  // One edge of the road at a place along it: the left for -1, the right for 1.
  // On the inside of a bend that is tighter than the road is wide, the edge
  // would run backwards, and the deck would lie folded over itself: two
  // surfaces in one plane, whose lines flicker. There the edge waits at the
  // corner, a hair further on each time, until the bend has passed.
  const edge = (f: ReturnType<typeof frame>, side: -1 | 1, from: V3 | null): V3 => {
    const raw: V3 = [f.x + f.rx * hw * side, f.y, f.z + f.rz * hw * side];
    if (!from) return raw;
    // the way the road runs is a quarter turn from the way across it
    const ahead = (raw[0] - from[0]) * f.rz - (raw[2] - from[2]) * f.rx;
    return ahead > 0 ? raw : [from[0] + f.rz * 1e-3, f.y, from[2] - f.rx * 1e-3];
  };
  // every place along the road first: how far along it is, where it is, and where its two edges are
  const at: { s: number; f: ReturnType<typeof frame>; L: V3; R: V3 }[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * path.length, f = frame(s), last = at[i - 1];
    at.push({ s, f, L: edge(f, -1, last ? last.L : null), R: edge(f, 1, last ? last.R : null) });
  }
  // the road's surface as it lies on the ground, stretch by stretch
  const tops = at.slice(1).map((b, i) => {
    const a = at[i], p: P2[] = [[a.L[0], a.L[2]], [a.R[0], a.R[2]], [b.R[0], b.R[2]], [b.L[0], b.L[2]]];
    const xs = p.map((c) => c[0]), zs = p.map((c) => c[1]);
    return { p: Math.abs(twice(p)) > 1e-6 ? wound(p) : null, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs), y: Math.max(a.f.y, b.f.y) };
  });
  /** Whether a place on the edge of one stretch lies on another stretch of this road: it does where the road closes on itself. */
  const onItself = (i: number, x: number, z: number, y: number): boolean => tops.some((t, j) => {
    const p = t.p;
    return p !== null && Math.abs(j - i) > 2 && Math.abs(t.y - y) < 0.3 && x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1 && p.every((_, e) => hand(p, e, [x, z]) > 0.05);
  });
  // whether the wall on each side was left out along the piece before: the left, then the right
  const was = [false, false];
  for (let i = 1; i <= n; i++) {
    const { s: s0, f: f0, L: L0, R: R0 } = at[i - 1], { s: s1, f: f1, L: L1, R: R1 } = at[i];
    deckB.quad(L0, R0, R1, L1, [0, 1, 0], ASPHALT, { uvs: [[0, s0], [1, s0], [1, s1], [0, s1]], win });
    if (o.structure !== false) {
      const { t: t0, w: w0 } = dims(f0), { t: t1, w: w1 } = dims(f1), inset = 0.45;
      const nx = (f0.rx + f1.rx) / 2, nz = (f0.rz + f1.rz) / 2;
      cityB.quad(up(L0, -t0), up(R0, -t0), up(R1, -t1), up(L1, -t1), [0, -1, 0], CONCRETE);
      // each side in turn: the left, then the right
      const sides: [V3, V3, number, number][] = [[L0, L1, -1, 0], [R0, R1, 1, 1]];
      for (const [E0, E1, side, slot] of sides) {
        // no wall where the tile says another road joins, nor across the road's own surface
        const gone = (o.open?.((s0 + s1) / 2, side as -1 | 1) ?? false) || onItself(i - 1, (E0[0] + E1[0]) / 2, (E0[2] + E1[2]) / 2, (f0.y + f1.y) / 2);
        const h0 = gone ? 0 : w0, h1 = gone ? 0 : w1;
        cityB.quad(up(E0, -t0), up(E1, -t1), up(E1, h1), up(E0, h0), [nx * side, 0, nz * side], CONCRETE);
        const I0: V3 = [E0[0] - f0.rx * inset * side, E0[1], E0[2] - f0.rz * inset * side], I1: V3 = [E1[0] - f1.rx * inset * side, E1[1], E1[2] - f1.rz * inset * side];
        // Where a road comes down to the ground its wall has no height, and is
        // not built: its top would lie in the road's own surface and flicker.
        if (!gone && (w0 > 1e-3 || w1 > 1e-3)) {
          cityB.quad(I0, I1, up(I1, w1), up(I0, w0), [-nx * side, 0, -nz * side], CONCRETE);
          cityB.quad(up(I0, w0), up(E0, w0), up(E1, w1), up(I1, w1), [0, 1, 0], CONCRETE);
        }
        // where the wall stops or starts again it gets an end, so that it is not hollow
        if (gone !== was[slot] && i > 1 && w0 > 0) {
          const along = gone ? 1 : -1;
          cityB.quad(E0, I0, up(I0, w0), up(E0, w0), [f0.rz * along, 0, -f0.rx * along], CONCRETE);
        }
        was[slot] = gone;
      }
    }
  }
  // Where the road closes on itself, as a loop to turn in does at its neck,
  // two stretches of it lie in one plane, and their lines would cross and
  // flicker. A plain patch a hair above clears the place, as a junction's
  // patch does on a street.
  for (let a = 0; a < tops.length; a++) {
    const A = tops[a];
    if (!A.p) continue;
    for (let b = a + 3; b < tops.length; b++) {
      const B = tops[b];
      if (!B.p || A.x1 < B.x0 || B.x1 < A.x0 || A.z1 < B.z0 || B.z1 < A.z0 || Math.abs(A.y - B.y) > 0.3) continue;
      const ring = overlap(A.p, B.p).filter((c, m, all) => Math.hypot(c[0] - all[(m + 1) % all.length][0], c[1] - all[(m + 1) % all.length][1]) > 1e-5);
      if (ring.length < 3 || Math.abs(twice(ring)) < 0.04) continue;
      const y = Math.max(A.y, B.y) + 0.01;
      const corner = (m: number): V3 => [ring[m][0], y, ring[m][1]];
      for (let m = 1; m + 1 < ring.length; m++) deckB.up(corner(0), corner(m), corner(m + 1), ASPHALT, { win: { cell: 0, storey: hw * 2, lit: 0, kind: 0 } });
    }
  }
}

// ---------------------------------------------------------------------------
// Streets on the ground
// ---------------------------------------------------------------------------

export interface StreetOpts {
  /** How many lanes it has in all. Two is one each way. */
  lanes?: number;
  /** How wide its carriageway is. Five for each lane, unless this says otherwise. */
  width?: number;
  /** How wide the sidewalk on either side is. None, if 0. */
  sidewalk?: number;
  color?: number;
  walk?: number;
  /** Whether a zebra crossing is painted on it where it meets another street. It is, unless this says no. */
  zebras?: boolean;
}

/** A stretch of a street's carriageway: its four corners on the ground, the ground it covers, and how high it lies. */
interface Piece { p: P2[]; x0: number; z0: number; x1: number; z1: number; y: number }

interface Laid { path: Path; width: number; walk: number; zebras: boolean; color: number; pieces: Piece[] }

/** Twice the ground a shape covers, with a sign that says which way round its corners run. */
function twice(shape: P2[]): number {
  let a = 0;
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length];
    a += p[0] * q[1] - q[0] * p[1];
  });
  return a;
}

/** A shape with its corners in the order the next two functions expect. */
const wound = (shape: P2[]): P2[] => (twice(shape) < 0 ? [...shape].reverse() : shape);

/** Which hand of the edge that starts at corner e of a shape a place is on: not below 0 is the inside. */
function hand(shape: P2[], e: number, c: P2): number {
  const p = shape[e], q = shape[(e + 1) % shape.length];
  return (q[0] - p[0]) * (c[1] - p[1]) - (q[1] - p[1]) * (c[0] - p[0]);
}

/** The part of one shape that lies inside another. Both bulge outwards all the way round, as a stretch of road does. */
function overlap(a: P2[], b: P2[]): P2[] {
  let ring = a;
  for (let e = 0; e < b.length && ring.length >= 3; e++) {
    const out: P2[] = [];
    ring.forEach((c, i) => {
      const d = ring[(i + 1) % ring.length], sc = hand(b, e, c), sd = hand(b, e, d);
      if (sc >= 0) out.push(c);
      if ((sc >= 0) !== (sd >= 0)) out.push([c[0] + ((d[0] - c[0]) * sc) / (sc - sd), c[1] + ((d[1] - c[1]) * sc) / (sc - sd)]);
    });
    ring = out;
  }
  return ring;
}

/** The streets laid on each tile so far, so that where two of them cross can be found. */
const LAID = new WeakMap<object, Laid[]>();
const laidOn = (k: Build): Laid[] => {
  let list = LAID.get(k.street);
  if (!list) LAID.set(k.street, (list = []));
  return list;
};

const PLAIN: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 0 };

/**
 * Where a box stands in a street or on its sidewalk, among the streets laid
 * on the tile so far, or null if it stands clear of them all. A round or
 * slanted thing is better asked about as several small boxes than as one big
 * one, which gives false alarms.
 */
export function inStreet(k: Build, x0: number, z0: number, x1: number, z1: number): { x: number; z: number } | null {
  const p = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3();
  for (const s of laidOn(k)) {
    const reach = s.width / 2 + s.walk;
    for (let d = 0; d <= s.path.length; d += 1) {
      s.path.at(d, p);
      s.path.at(Math.min(s.path.length, d + 0.5), a);
      s.path.at(Math.max(0, d - 0.5), c);
      const tx = a.x - c.x, tz = a.z - c.z, l = Math.hypot(tx, tz) || 1;
      // every place across the street here, from the back of one sidewalk to the back of the other
      for (let o = -reach; o <= reach; o += 0.75) {
        const x = p.x - (tz / l) * o, z = p.z + (tx / l) * o;
        if (x > x0 + 0.2 && x < x1 - 0.2 && z > z0 + 0.2 && z < z1 - 0.2) return { x, z };
      }
    }
  }
  return null;
}

/**
 * Says so in the console, on the development server, if a box stands in a
 * street. Call it for every lot and every footprint once the streets are laid:
 * a building in a road shows in no picture until someone looks from the far side.
 */
export function clearOfStreets(k: Build, name: string, x0: number, z0: number, x1: number, z1: number): void {
  if (!import.meta.env.DEV) return;
  const at = inStreet(k, x0, z0, x1, z1);
  if (at) console.warn(`${name} stands in a street, near ${Math.round(at.x)}, ${Math.round(at.z)}.`);
}

interface Across { x: number; y: number; z: number; tx: number; tz: number; rx: number; rz: number }

function acrossAt(path: Path, s: number): Across {
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  path.at(s, p);
  // a street that is not a ring has no "just before" at its start or "just after" at its end
  path.at(path.closed ? s + 0.6 : Math.min(path.length, s + 0.6), a);
  path.at(path.closed ? s - 0.6 : Math.max(0, s - 0.6), b);
  const tx = a.x - b.x, tz = a.z - b.z, l = Math.hypot(tx, tz) || 1;
  return { x: p.x, y: p.y, z: p.z, tx: tx / l, tz: tz / l, rx: -tz / l, rz: tx / l };
}

/**
 * Lays a street on the ground along a path: a carriageway with its markings,
 * and a sidewalk on either side. Where two streets cross, the junction is
 * cleared of markings and given zebra crossings when the tile is finished, so
 * lay streets in the tile's own coordinates and not inside `placed`.
 *
 * The path may climb: a street follows it up a ramp or over a terrace.
 */
export function street(k: Build, path: Path, o: StreetOpts = {}): void {
  const lanes = o.lanes ?? 2, width = o.width ?? lanes * 5, walk = o.sidewalk ?? 3;
  const color = o.color ?? 0x4a4c52, paving = o.walk ?? 0xc9c2b4;
  const n = Math.max(1, Math.ceil(path.length / 2));
  // the four lines along a street: the back of one sidewalk, the two kerbs, and the back of the other sidewalk
  const offs = [-width / 2 - walk, -width / 2, width / 2, width / 2 + walk];
  // Where those lines are at one place along the street. On the inside of a
  // corner sharper than the street is wide a line would run backwards, and the
  // street would lie folded over itself: two surfaces in one plane, whose
  // lines flicker. There the line waits at the corner, a hair further on each
  // time, until the corner is past.
  const linesAt = (f: Across, from: P2[] | null): P2[] => offs.map((l, e): P2 => {
    const x = f.x + f.rx * l, z = f.z + f.rz * l;
    if (!from || (x - from[e][0]) * f.tx + (z - from[e][1]) * f.tz > 0) return [x, z];
    return [from[e][0] + f.tx * 1e-3, from[e][1] + f.tz * 1e-3];
  });
  const pieces: Piece[] = [];
  let f0 = acrossAt(path, 0), s0 = 0, e0 = linesAt(f0, null);
  for (let i = 1; i <= n; i++) {
    const s1 = (i / n) * path.length;
    const f1 = acrossAt(path, s1), e1 = linesAt(f1, e0);
    // one strip between two of the lines: the carriageway, or a sidewalk
    const strip = (a: number, b: number, dy: number, col: number, win: WinSpec): void => {
      const at = (f: Across, p: P2): V3 => [p[0], f.y + dy, p[1]];
      k.street.quad(at(f0, e0[a]), at(f0, e0[b]), at(f1, e1[b]), at(f1, e1[a]), [0, 1, 0], col, { uvs: [[0, s0], [1, s0], [1, s1], [0, s1]], win });
    };
    strip(1, 2, 0.03, color, { cell: lanes, storey: width, lit: 0, kind: 0 });
    const p = [e0[1], e0[2], e1[2], e1[1]];
    if (Math.abs(twice(p)) > 1e-6) {
      const xs = p.map((c) => c[0]), zs = p.map((c) => c[1]);
      pieces.push({ p: wound(p), x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs), y: (f0.y + f1.y) / 2 });
    }
    if (walk > 0) {
      // laid in flags, square to the tile, so that where two sidewalks overlap at a corner they look the same
      const win: WinSpec = { cell: FLAG, storey: walk, lit: 0.5, kind: 1 };
      strip(0, 1, 0.015, paving, win);
      strip(2, 3, 0.015, paving, win);
    }
    f0 = f1;
    s0 = s1;
    e0 = e1;
  }
  laidOn(k).push({ path, width, walk, zebras: o.zebras !== false, color, pieces });
}

/** Where a street's middle runs, as corners a couple of units apart, with how far along each is. */
function spine(path: Path): { x: number; y: number; z: number; s: number }[] {
  const n = Math.max(1, Math.ceil(path.length / 2));
  const p = new THREE.Vector3();
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (i / n) * path.length;
    path.at(s, p);
    return { x: p.x, y: p.y, z: p.z, s };
  });
}

/**
 * Finds where the streets laid on a tile cross, and finishes each junction: a
 * plain patch of asphalt over the markings of both, and a zebra crossing on
 * each arm. Then it clears every other place where two carriageways lie over
 * each other: where one street runs on along another, joins the bend of one,
 * or ends in a turning circle. Two carriageways in one plane flicker. Called
 * once for each tile when its build is finished.
 */
export function finishStreets(k: Build): void {
  const streets = laidOn(k);
  const spines = streets.map((s) => spine(s.path));
  const PAINT = 0xf2efe6;
  for (let i = 0; i < streets.length; i++) {
    for (let j = i + 1; j < streets.length; j++) {
      const A = streets[i], B = streets[j];
      const done: [number, number][] = [];
      /** The patches laid where these two cross. */
      const patches: P2[][] = [];
      for (let m = 0; m + 1 < spines[i].length; m++) {
        for (let n = 0; n + 1 < spines[j].length; n++) {
          const a0 = spines[i][m], a1 = spines[i][m + 1], b0 = spines[j][n], b1 = spines[j][n + 1];
          const ax = a1.x - a0.x, az = a1.z - a0.z, bx = b1.x - b0.x, bz = b1.z - b0.z;
          const den = ax * bz - az * bx;
          if (Math.abs(den) < 1e-6) continue;
          const t = ((b0.x - a0.x) * bz - (b0.z - a0.z) * bx) / den, u = ((b0.x - a0.x) * az - (b0.z - a0.z) * ax) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const x = a0.x + ax * t, z = a0.z + az * t, y = a0.y + (a1.y - a0.y) * t;
          // two streets at different heights pass over each other: that is a bridge, not a junction
          if (Math.abs(y - (b0.y + (b1.y - b0.y) * u)) > 0.6) continue;
          if (done.some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 2)) continue;
          done.push([x, z]);

          const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
          const da: [number, number] = [ax / la, az / la], db: [number, number] = [bx / lb, bz / lb];
          const sin = Math.abs(da[0] * db[1] - da[1] * db[0]);
          if (sin < 0.3) continue; // they run nearly side by side: nothing to clear
          // the patch is where the two carriageways overlap
          const ha = B.width / 2 / sin, hb = A.width / 2 / sin;
          const corner = (sa: number, sb: number): V3 => [x + da[0] * ha * sa + db[0] * hb * sb, y + 0.045, z + da[1] * ha * sa + db[1] * hb * sb];
          k.street.quad(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), [0, 1, 0], A.color, { win: PLAIN });
          patches.push(wound([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].map((c): P2 => [c[0], c[2]])));

          // a zebra crossing on each arm, where it passes the other street's sidewalk
          const arms: [Laid, [number, number], number, number, number][] = [
            [A, da, ha, B.walk, a0.s + la * t],
            [B, db, hb, A.walk, b0.s + lb * u],
          ];
          for (const [S, d, half, depth, at] of arms) {
            if (!S.zebras || depth <= 0) continue;
            for (const way of [-1, 1]) {
              // only if the street goes on that way
              if (!S.path.closed && (way > 0 ? S.path.length - at : at) < half + depth + 2) continue;
              const cx = x + d[0] * way * (half + depth / 2), cz = z + d[1] * way * (half + depth / 2);
              const rx = -d[1], rz = d[0];
              const bars = Math.floor((S.width - 0.6) / 1.5);
              for (let b = 0; b < bars; b++) {
                const l = (b - (bars - 1) / 2) * 1.5;
                const bar = (sl: number, sd: number): V3 => [cx + rx * (l + 0.375 * sl) + d[0] * (depth / 2 - 0.25) * sd, y + 0.055, cz + rz * (l + 0.375 * sl) + d[1] * (depth / 2 - 0.25) * sd];
                k.street.quad(bar(-1, -1), bar(1, -1), bar(1, 1), bar(-1, 1), [0, 1, 0], PAINT, { win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
              }
            }
          }
        }
      }

      // what the patches of the crossings leave uncovered of the ground the two share
      const covered = (c: P2): boolean => patches.some((patch) => patch.every((_, e) => hand(patch, e, c) >= -1e-6));
      for (const a of A.pieces) {
        for (const b of B.pieces) {
          if (a.x1 < b.x0 || b.x1 < a.x0 || a.z1 < b.z0 || b.z1 < a.z0 || Math.abs(a.y - b.y) > 0.6) continue;
          const ring = overlap(a.p, b.p).filter((c, n, all) => Math.hypot(c[0] - all[(n + 1) % all.length][0], c[1] - all[(n + 1) % all.length][1]) > 1e-5);
          if (ring.length < 3 || Math.abs(twice(ring)) < 0.04) continue;
          const mid: P2 = [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];
          // asked in its middle and just inside each of its corners: it can be covered at one end and bare at the other
          if ([mid, ...ring.map((c): P2 => [mid[0] + (c[0] - mid[0]) * 0.9, mid[1] + (c[1] - mid[1]) * 0.9])].every(covered)) continue;
          flat(k.street, ring, Math.max(a.y, b.y) + 0.045, A.color, { win: PLAIN });
        }
      }
    }
  }
}

/**
 * Stands street lamps along a street, on alternate sides, `off` from its
 * middle. Call it after every street has been laid: no lamp is put where it
 * would stand in another street.
 */
export function lampsAlong(k: Build, path: Path, off: number, every = 22): void {
  const streets = laidOn(k);
  const blocked = (x: number, z: number): boolean => streets.some((s) => {
    if (s.path === path) return false;
    const near = new THREE.Vector3();
    s.path.at(s.path.closest(x, z), near);
    return Math.hypot(near.x - x, near.z - z) < s.width / 2 + s.walk * 0.4;
  });
  const n = Math.floor(path.length / (every / 2));
  for (let i = 0; i < n; i++) {
    const f = acrossAt(path, (i + 0.5) * (every / 2));
    const side = i % 2 ? 1 : -1;
    const x = f.x + f.rx * off * side, z = f.z + f.rz * off * side;
    if (x < k.board.x0 + 1 || x > k.board.x1 - 1 || z < k.board.z0 + 1 || z > k.board.z1 - 1 || blocked(x, z)) continue;
    // its arm reaches back over the street
    k.lamp(x, z, Math.atan2(-f.rz * side, -f.rx * side), f.y);
  }
}
