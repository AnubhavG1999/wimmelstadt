// Checks that a tile runs on itself while it is being built. They speak in the
// console, and a tile calls them on the development server only.
//
// Routes know nothing of each other, and neither do trams and buses on lines
// of their own, so nothing on a tile may cross anything else on the level.
// `checkRoads` looks for the places where two of them come closer than two
// vehicles can pass, and for the places where one of them runs through
// something that is built. `hiddenBy` says what stands between a place and
// the camera. Whether a lot stands in a street is `clearOfStreets`, in roads.ts.
// `flatFights` finds surfaces that lie in one plane, which flicker.
//
// A tile whose routes share lanes on purpose checks them with `roadFaults` and
// `throughSolids` instead of `checkRoads`, which takes a shared lane for a
// crossing. Urbana-Champaign's builder wrote those two.
//
// Hong Kong's builder wrote the rest. A tile's faults showed in the console on the
// next load, where before they showed in a picture much later, or not at all.

import { buildPath } from './paths';
import type { Route } from './tile';
import { lengths3, type P3 } from './corners';
import * as THREE from 'three';

interface Sample { x: number; y: number; z: number; s: number }

/** Two vehicles need this much between the middles of their lanes. */
const ROOM = 2.9;
/** Roads further apart than this in height pass over each other. */
const CLEAR = 3.4;

/** Something built: the ground it covers, and from how high to how high it stands. */
export interface Solid { id: string; x0: number; z0: number; x1: number; z1: number; y0: number; y1: number }

/** A vehicle is about this high, and reaches this far to either side of the middle of its lane. */
const TALL = 3, WIDE = 1.5;

/** Something that can hide what is behind it: the ground it covers, and how high its top is. */
export interface Tall { id: string; x0: number; z0: number; x1: number; z1: number; top: number }

/**
 * The things that stand between a point and the camera, in the view the board
 * opens with: from the south-south-east, looking down at 38 degrees. A thing
 * as high as H hides the ground for about 1.3 H behind it. Ask this about the
 * foot and the middle of every landmark, the middle of every street worth
 * watching and every place for a hero, after the blockout and again whenever
 * a height changes.
 */
export function hiddenBy(p: { x: number; y: number; z: number }, things: Tall[], az = 42, elev = 38): string[] {
  const E = Math.sin((az * Math.PI) / 180), S = Math.cos((az * Math.PI) / 180), UP = Math.tan((elev * Math.PI) / 180);
  return things.filter((l) => {
    const tx = [(l.x0 - p.x) / E, (l.x1 - p.x) / E], tz = [(l.z0 - p.z) / S, (l.z1 - p.z) / S];
    const t0 = Math.max(Math.min(...tx), Math.min(...tz), 0), t1 = Math.min(Math.max(...tx), Math.max(...tz));
    return t1 > t0 && p.y + UP * t0 < l.top;
  }).map((l) => l.id);
}

/**
 * Looks along every route, and every line given as `rails`, for two that cross
 * on the level and for one that runs through a `solid`, and says what it finds
 * in the console under the tile's name.
 */
export function checkRoads(tile: string, routes: Route[], rails: Record<string, P3[]>, solids: Solid[] = []): void {
  const lines: { id: string; pts: Sample[]; length: number }[] = [];
  const v = new THREE.Vector3();
  for (const r of routes) {
    const path = buildPath(r.segs, true, r.hump);
    const pts: Sample[] = [];
    for (let s = 0; s < path.length; s += 1) {
      path.at(s, v);
      pts.push({ x: v.x, y: v.y, z: v.z, s });
    }
    lines.push({ id: r.id, pts, length: path.length });
  }
  for (const [id, line] of Object.entries(rails)) {
    const s = lengths3(line);
    lines.push({ id, pts: line.map((p, i) => ({ x: p[0], y: p[1], z: p[2], s: s[i] })), length: s[s.length - 1] });
  }

  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i; j < lines.length; j++) {
      const A = lines[i], B = lines[j];
      let worst = Infinity, at: Sample | null = null;
      for (const a of A.pts) {
        for (const c of B.pts) {
          if (Math.abs(a.y - c.y) > CLEAR) continue;
          if (i === j) {
            // the same road: only places far apart along it count
            const along = Math.abs(a.s - c.s);
            if (Math.min(along, A.length - along) < 14) continue;
          }
          const d = Math.hypot(a.x - c.x, a.z - c.z);
          if (d < worst) { worst = d; at = a; }
        }
      }
      if (at && worst < ROOM) found.push(`${A.id} and ${B.id} come within ${worst.toFixed(1)} at x ${at.x.toFixed(0)}, z ${at.z.toFixed(0)}`);
    }
  }
  const through = new Set<string>();
  for (const line of lines) {
    for (const p of line.pts) {
      for (const q of solids) {
        if (p.x > q.x0 - WIDE && p.x < q.x1 + WIDE && p.z > q.z0 - WIDE && p.z < q.z1 + WIDE && p.y + TALL > q.y0 && p.y < q.y1) through.add(`${line.id} runs through ${q.id}`);
      }
    }
  }
  if (through.size > 0) console.warn(`${tile}: roads that run through what is built:\n  ${[...through].join('\n  ')}`);
  const total = lines.map((l) => `${l.id} ${l.length.toFixed(0)}`).join(', ');
  if (found.length > 0) console.warn(`${tile}: roads that cross on the level:\n  ${found.join('\n  ')}`);
  else console.info(`${tile}: no road crosses another on the level${through.size > 0 ? '' : ', and none runs through anything built'}. Lengths: ${total}`);
}

// ---------------------------------------------------------------------------
// Routes that share lanes
// ---------------------------------------------------------------------------

/** A point on a route, and the way the route heads there. */
interface Heading { x: number; z: number; y: number; tx: number; tz: number }

/** A route as points half a unit apart, each with the way it heads. */
function headings(r: Route): Heading[] {
  const path = buildPath(r.segs, true, r.hump);
  const n = Math.max(8, Math.round(path.length / 0.5));
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  return Array.from({ length: n }, (_, i) => {
    const s = (i / n) * path.length;
    path.at(s, p);
    path.at(s + 0.25, q);
    const tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1;
    return { x: p.x, y: p.y, z: p.z, tx: tx / l, tz: tz / l };
  });
}

/** Where the stretch from a to b and the stretch from c to d cross, if each passes through the inside of the other. */
function crossing(a: Heading, b: Heading, c: Heading, d: Heading): { x: number; z: number } | null {
  const rx = b.x - a.x, rz = b.z - a.z, sx = d.x - c.x, sz = d.z - c.z;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / den, u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / den;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: a.x + rx * t, z: a.z + rz * t };
}

/**
 * For a tile whose routes share lanes on purpose, as a loop round several
 * blocks runs in the lanes of the loops inside it. `checkRoads` takes such a
 * lane for a crossing, since two routes in one lane are no distance apart.
 * This finds the two things that are faults there: the places where two
 * routes cross on the level, and where two meet head-on in one lane. Where one route leaves a lane that another goes on along, the two
 * lines part at a shallow angle and do not cross: only a crossing at more
 * than about 25 degrees counts.
 */
export function roadFaults(routes: Route[]): string[] {
  const lines = routes.map((r) => ({ id: r.id, pts: headings(r) }));
  const found = new Set<string>();
  const CELL = 4;
  const key = (cx: number, cz: number): number => (cx + 256) * 1024 + (cz + 256);
  for (let i = 0; i < lines.length; i++) {
    // this route's stretches, sorted into squares on the ground
    const A = lines[i], grid = new Map<number, number[]>();
    A.pts.forEach((p, n) => {
      const at = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
      let cell = grid.get(at);
      if (!cell) grid.set(at, (cell = []));
      cell.push(n);
    });
    for (let j = i; j < lines.length; j++) {
      const B = lines[j];
      for (let m = 0; m < B.pts.length; m++) {
        const c = B.pts[m], d = B.pts[(m + 1) % B.pts.length];
        const cx = Math.floor(c.x / CELL), cz = Math.floor(c.z / CELL);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
          for (const n of grid.get(key(cx + ix, cz + iz)) ?? []) {
            if (i === j && Math.min(Math.abs(n - m), A.pts.length - Math.abs(n - m)) < 12) continue;
            const a = A.pts[n], b = A.pts[(n + 1) % A.pts.length];
            if (Math.abs(a.y - c.y) > 3.4) continue;
            const dot = a.tx * c.tx + a.tz * c.tz;
            // head-on: in one lane, the opposite way
            if (dot < -0.9 && Math.hypot(a.x - c.x, a.z - c.z) < 1.2) {
              found.add(`${A.id} and ${B.id} meet head-on near x ${Math.round(a.x)}, z ${Math.round(a.z)}`);
              continue;
            }
            if (Math.abs(dot) > 0.9) continue; // side by side, or one leaving the other's lane
            const at = crossing(a, b, c, d);
            if (at) found.add(`${A.id} and ${B.id} cross near x ${Math.round(at.x)}, z ${Math.round(at.z)}`);
          }
        }
      }
    }
  }
  return [...found];
}

/** The routes that run through something built, for a tile that checks its roads with `roadFaults`. */
export function throughSolids(routes: Route[], solids: Solid[]): string[] {
  const found = new Set<string>();
  for (const r of routes) {
    for (const p of headings(r)) {
      for (const q of solids) {
        if (p.x > q.x0 - WIDE && p.x < q.x1 + WIDE && p.z > q.z0 - WIDE && p.z < q.z1 + WIDE && p.y + TALL > q.y0 && p.y < q.y1) found.add(`${r.id} runs through ${q.id}`);
      }
    }
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Surfaces that lie in one plane
// ---------------------------------------------------------------------------

/** Two flat surfaces that lie in one plane and overlap. */
export interface Fight {
  /** Where they overlap, in the coordinates of what was looked through, and how high. */
  x: number;
  z: number;
  y: number;
  /** How much ground the two share near there. */
  area: number;
  /** What the two are: the mesh each is part of, its colour, and whether lines are painted on it. */
  a: string;
  b: string;
}

/** A triangle that faces straight up: its corners on the ground, its height, and what it looks like. */
interface FlatTri { p: number[]; y: number; look: number; plain: boolean }

/**
 * Finds flat surfaces under `root` that lie in one plane, overlap, and do not
 * look the same. Two such surfaces flicker: which of them is drawn in front
 * changes from frame to frame as the view moves. No still picture shows it, so
 * it is found here, or by whoever watches the tile for long enough.
 *
 * The usual causes: two streets that run together along one line (the engine
 * clears a junction only where two streets cross: see `junction` in
 * roads.ts), two decks or two lawns at one height, and two roofs at one height
 * where buildings stand into each other. The cure is to end one of the two
 * short of the other, to lay a junction over them, or to lift one by 0.01.
 *
 * Only surfaces that face straight up are looked at: a wall is rarely built
 * twice. Whatever is in `skip` is left out, with everything under it.
 * Surfaces nearer in height than `gap` count as in one plane: 0.004 apart
 * is enough for the two to be told apart from every side.
 */
export function flatFights(root: THREE.Object3D, skip: Set<THREE.Object3D> = new Set(), gap = 0.0035): Fight[] {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4();
  const tris: FlatTri[] = [], looks: string[] = [];
  const lookOf = (name: string): number => {
    const i = looks.indexOf(name);
    return i < 0 ? looks.push(name) - 1 : i;
  };
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], c = new THREE.Color();
  const walk = (o: THREE.Object3D): void => {
    if (skip.has(o) || !o.visible) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && mesh.geometry.getAttribute('position')) {
      const g = mesh.geometry, pos = g.getAttribute('position'), col = g.getAttribute('color'), win = g.getAttribute('aWin');
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshBasicMaterial;
      const name = mesh.name || 'a mesh of the tile\'s own';
      m.multiplyMatrices(inv, mesh.matrixWorld);
      const n = g.index ? g.index.count : pos.count;
      for (let t = 0; t + 2 < n; t += 3) {
        const i0 = g.index ? g.index.getX(t) : t;
        for (let e = 0; e < 3; e++) v[e].fromBufferAttribute(pos, g.index ? g.index.getX(t + e) : t + e).applyMatrix4(m);
        if (Math.abs(v[0].y - v[1].y) > 1e-4 || Math.abs(v[0].y - v[2].y) > 1e-4) continue;
        // seen from above, the front of a surface is wound against the clock
        const up = (v[1].z - v[0].z) * (v[2].x - v[0].x) - (v[1].x - v[0].x) * (v[2].z - v[0].z);
        if (Math.abs(up) < 1e-5 || (up < 0 && mat.side !== THREE.DoubleSide)) continue;
        // a deck always has its edge lines; a street has lines unless it is a plain patch or paving
        const lined = name === 'deck' || (win !== undefined && win.getX(i0) >= 0.5 && (name !== 'street' || win.getW(i0) < 0.5));
        if (col) c.setRGB(col.getX(i0), col.getY(i0), col.getZ(i0));
        else c.copy(mat.color ?? c.set(0xffffff));
        const p = [v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z];
        // all wound the same way round, so that the inside is on the same hand of every edge
        if (up > 0) p.splice(2, 4, p[4], p[5], p[2], p[3]);
        tris.push({ p, y: v[0].y, look: lookOf(name === 'deck' ? 'deck, with lines' : `${name} #${c.getHexString()}${lined ? ', with lines' : ''}`), plain: !lined });
      }
    }
    for (const child of o.children) walk(child);
  };
  walk(root);

  // every triangle is filed under each square of ground it reaches
  const CELL = 8;
  const cells = new Map<number, number[]>();
  const key = (x: number, z: number): number => (Math.floor(x / CELL) + 4096) * 8192 + Math.floor(z / CELL) + 4096;
  tris.forEach((t, i) => {
    const x0 = Math.min(t.p[0], t.p[2], t.p[4]), x1 = Math.max(t.p[0], t.p[2], t.p[4]), z0 = Math.min(t.p[1], t.p[3], t.p[5]), z1 = Math.max(t.p[1], t.p[3], t.p[5]);
    if (((x1 - x0) / CELL + 1) * ((z1 - z0) / CELL + 1) > 20000) return;
    for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) {
      for (let z = Math.floor(z0 / CELL); z <= Math.floor(z1 / CELL); z++) {
        const at = key(x * CELL, z * CELL), list = cells.get(at);
        if (list) list.push(i);
        else cells.set(at, [i]);
      }
    }
  });

  /** Which hand of the edge from corner e of a triangle a place is on: not below 0 is inside. */
  const side = (t: number[], e: number, x: number, z: number): number => {
    const px = t[e * 2], pz = t[e * 2 + 1], qx = t[((e + 1) % 3) * 2], qz = t[((e + 1) % 3) * 2 + 1];
    return (qx - px) * (z - pz) - (qz - pz) * (x - px);
  };
  const inside = (t: number[], x: number, z: number): boolean => side(t, 0, x, z) >= 0 && side(t, 1, x, z) >= 0 && side(t, 2, x, z) >= 0;
  /** The part of one triangle that lies inside another, as a ring of corners. */
  const shared = (a: number[], b: number[]): number[] => {
    let ring = a;
    for (let e = 0; e < 3 && ring.length >= 6; e++) {
      const out: number[] = [];
      for (let i = 0; i < ring.length; i += 2) {
        const ax = ring[i], az = ring[i + 1], bx = ring[(i + 2) % ring.length], bz = ring[(i + 3) % ring.length];
        const sa = side(b, e, ax, az), sb = side(b, e, bx, bz);
        if (sa >= 0) out.push(ax, az);
        if ((sa >= 0) !== (sb >= 0)) out.push(ax + ((bx - ax) * sa) / (sa - sb), az + ((bz - az) * sa) / (sa - sb));
      }
      ring = out;
    }
    return ring;
  };
  /** Whether something flat lies just over a place: the patch of a junction over two carriageways, say. */
  const covered = (x: number, z: number, y: number): boolean => (cells.get(key(x, z)) ?? []).some((i) => tris[i].y > y + gap && tris[i].y < y + 0.4 && inside(tris[i].p, x, z));

  const tried = new Set<number>(), found = new Map<string, Fight>();
  for (const list of cells.values()) {
    list.sort((i, j) => tris[i].y - tris[j].y);
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length && tris[list[b]].y - tris[list[a]].y < gap; b++) {
        const i = Math.min(list[a], list[b]), j = Math.max(list[a], list[b]);
        const A = tris[i], B = tris[j];
        // two plain surfaces of one colour look the same whichever is in front
        if ((A.plain && B.plain && A.look === B.look) || tried.has(i * tris.length + j)) continue;
        tried.add(i * tris.length + j);
        const ring = shared(A.p, B.p);
        if (ring.length < 6) continue;
        let twice = 0, cx = 0, cz = 0;
        for (let r = 0; r < ring.length; r += 2) {
          const s = (r + 2) % ring.length, w = ring[r] * ring[s + 1] - ring[s] * ring[r + 1];
          twice += w;
          cx += (ring[r] + ring[s]) * w;
          cz += (ring[r + 1] + ring[s + 1]) * w;
        }
        let area = Math.abs(twice) / 2;
        if (area < 0.01) continue;
        cx /= 3 * twice;
        cz /= 3 * twice;
        const top = Math.max(A.y, B.y);
        const probes: [number, number][] = [[cx, cz]];
        // in its middle and just inside each of its corners: it can be covered at one end and bare at the other
        for (let r = 0; r < ring.length; r += 2) probes.push([cx + (ring[r] - cx) * 0.9, cz + (ring[r + 1] - cz) * 0.9]);
        // only the part that nothing covers counts, as near as a handful of places can tell
        const bare = probes.filter(([x, z]) => !covered(x, z, top)).length;
        if (bare === 0) continue;
        area *= bare / probes.length;
        // one line for each few units of ground and each pair of looks
        const [la, lb] = [looks[A.look], looks[B.look]].sort();
        const where = `${Math.round(cx / 4)} ${Math.round(cz / 4)} ${top.toFixed(3)} ${la} ${lb}`;
        const f = found.get(where);
        if (f) {
          f.x = (f.x * f.area + cx * area) / (f.area + area);
          f.z = (f.z * f.area + cz * area) / (f.area + area);
          f.area += area;
        } else {
          found.set(where, { x: cx, z: cz, y: top, area, a: la, b: lb });
        }
      }
    }
  }
  const round = (n: number, to: number): number => Math.round(n * to) / to;
  return [...found.values()].filter((f) => f.area >= 0.25).sort((f, g) => g.area - f.area)
    .map((f) => ({ x: round(f.x, 10), z: round(f.z, 10), y: round(f.y, 1000), area: round(f.area, 10), a: f.a, b: f.b }));
}
