// Roads. Above the ground: the deck of an expressway, a flyover, a ramp, a
// bridge. On the ground: streets laid as strips along any line, with their
// junctions.

import * as THREE from 'three';
import type { V3, WinSpec } from './geo';
import type { Path } from './paths';
import type { Build } from './tile';

export const CONCRETE = 0xbdb8ad;
export const ASPHALT = 0x4f5157;

export interface DeckOpts {
  thick: number; wall: number; lanes: number; lift?: number; structure?: boolean; step?: number;
  /** Where the road is lower than this, its sides run down to the ground, as on a ramp of earth. */
  skirt?: number;
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
  let f0 = frame(0), s0 = 0;
  for (let i = 1; i <= n; i++) {
    const s1 = (i / n) * path.length;
    const f1 = frame(s1);
    const L0: V3 = [f0.x - f0.rx * hw, f0.y, f0.z - f0.rz * hw], R0: V3 = [f0.x + f0.rx * hw, f0.y, f0.z + f0.rz * hw];
    const L1: V3 = [f1.x - f1.rx * hw, f1.y, f1.z - f1.rz * hw], R1: V3 = [f1.x + f1.rx * hw, f1.y, f1.z + f1.rz * hw];
    deckB.quad(L0, R0, R1, L1, [0, 1, 0], ASPHALT, { uvs: [[0, s0], [1, s0], [1, s1], [0, s1]], win });
    if (o.structure !== false) {
      const { t: t0, w: w0 } = dims(f0), { t: t1, w: w1 } = dims(f1), inset = 0.45;
      const nx = (f0.rx + f1.rx) / 2, nz = (f0.rz + f1.rz) / 2;
      const Ri0: V3 = [R0[0] - f0.rx * inset, R0[1], R0[2] - f0.rz * inset], Ri1: V3 = [R1[0] - f1.rx * inset, R1[1], R1[2] - f1.rz * inset];
      const Li0: V3 = [L0[0] + f0.rx * inset, L0[1], L0[2] + f0.rz * inset], Li1: V3 = [L1[0] + f1.rx * inset, L1[1], L1[2] + f1.rz * inset];
      cityB.quad(up(L0, -t0), up(R0, -t0), up(R1, -t1), up(L1, -t1), [0, -1, 0], CONCRETE);
      cityB.quad(up(R0, -t0), up(R1, -t1), up(R1, w1), up(R0, w0), [nx, 0, nz], CONCRETE);
      cityB.quad(up(L0, -t0), up(L1, -t1), up(L1, w1), up(L0, w0), [-nx, 0, -nz], CONCRETE);
      cityB.quad(Ri0, Ri1, up(Ri1, w1), up(Ri0, w0), [-nx, 0, -nz], CONCRETE);
      cityB.quad(Li0, Li1, up(Li1, w1), up(Li0, w0), [nx, 0, nz], CONCRETE);
      cityB.quad(up(Ri0, w0), up(R0, w0), up(R1, w1), up(Ri1, w1), [0, 1, 0], CONCRETE);
      cityB.quad(up(Li0, w0), up(L0, w0), up(L1, w1), up(Li1, w1), [0, 1, 0], CONCRETE);
    }
    f0 = f1;
    s0 = s1;
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

interface Laid { path: Path; width: number; walk: number; zebras: boolean; color: number }

/** The streets laid on each tile so far, so that where two of them cross can be found. */
const LAID = new WeakMap<object, Laid[]>();
const laidOn = (k: Build): Laid[] => {
  let list = LAID.get(k.street);
  if (!list) LAID.set(k.street, (list = []));
  return list;
};

const PLAIN: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 0 };

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
  const strip = (f0: Across, f1: Across, l0: number, l1: number, dy: number, col: number, win: WinSpec, s0: number, s1: number): void => {
    const at = (f: Across, l: number): V3 => [f.x + f.rx * l, f.y + dy, f.z + f.rz * l];
    k.street.quad(at(f0, l0), at(f0, l1), at(f1, l1), at(f1, l0), [0, 1, 0], col, { uvs: [[0, s0], [1, s0], [1, s1], [0, s1]], win });
  };
  let f0 = acrossAt(path, 0), s0 = 0;
  for (let i = 1; i <= n; i++) {
    const s1 = (i / n) * path.length;
    const f1 = acrossAt(path, s1);
    strip(f0, f1, -width / 2, width / 2, 0.03, color, { cell: lanes, storey: width, lit: 0, kind: 0 }, s0, s1);
    if (walk > 0) {
      const win: WinSpec = { cell: 0, storey: walk, lit: 0, kind: 1 };
      strip(f0, f1, -width / 2 - walk, -width / 2, 0.015, paving, win, s0, s1);
      strip(f0, f1, width / 2, width / 2 + walk, 0.015, paving, win, s0, s1);
    }
    f0 = f1;
    s0 = s1;
  }
  laidOn(k).push({ path, width, walk, zebras: o.zebras !== false, color });
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
 * each arm. Called once for each tile when its build is finished.
 */
export function finishStreets(k: Build): void {
  const streets = laidOn(k);
  const spines = streets.map((s) => spine(s.path));
  const PAINT = 0xf2efe6;
  for (let i = 0; i < streets.length; i++) {
    for (let j = i + 1; j < streets.length; j++) {
      const A = streets[i], B = streets[j];
      const done: [number, number][] = [];
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
