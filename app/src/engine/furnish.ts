// Things for open paving. Once a tile has built everything else, `furnish`
// finds the paving it has left bare and wide enough to stand in, and puts on it
// what a square of its place has: benches, planters, trees in grates, a café's
// tables, a kiosk, a fountain, a stall, and people about them. The tile says
// what, from the fixtures here or from its own.
//
// It reads what is built and not the plan: a cell of the ground, a unit square,
// is bare where the highest thing lying flat on it is paving of a stone colour,
// nothing built stands in it, no tree, lamp or figure is near, it is well off
// every lane, and it is not about a place for a hero or a parked car.

import * as THREE from 'three';
import type { GeoBuilder } from './geo';
import { lantern, parasol, twoWheeler } from './parts';
import { buildPath } from './paths';
import type { Build, HeroSpot, ParkedSpot, Route } from './tile';

/** One thing to put down on bare paving. */
export interface Fixture {
  /** How far it reaches from its middle. */
  r: number;
  /** How tall it stands. What is taller than a person keeps out of the view of a place for a hero. */
  h: number;
  /** How often it is chosen, against the others that fit. */
  w: number;
  /** How many people stand about it, at most. */
  people?: number;
  /**
   * Builds it at (x, z) with its front facing along `yaw` (0 faces east, a
   * quarter turn south), which is away from whatever is nearest; `t` is a
   * number from 0 to 1 of its own, for its colours.
   */
  make(k: Build, x: number, z: number, yaw: number, t: number): void;
}

export interface FurnishOpts {
  routes: Route[];
  heroes: HeroSpot[];
  parked: ParkedSpot[];
  fixtures: Fixture[];
  /** Numbers of its own, so that nothing else the tile scatters moves. */
  seed: number;
  /** How much room is left between one thing and the next, at least. */
  step?: number;
  /** Anywhere else the tile wants left alone: false refuses a thing `h` high at (x, z). */
  keep?: (x: number, z: number, h: number) => boolean;
  /** Its name, for the console. */
  name?: string;
}

/** The bare paving on a tile as built so far: how far each place is from anything, and where only what is low may stand. */
export interface Bare {
  /** How far (x, z) is from the nearest thing that is not bare paving, in units: 0 if it is not bare. */
  room(x: number, z: number): number;
  /** Whether only what is lower than a person may stand at (x, z), before a place for a hero. */
  low(x: number, z: number): boolean;
  /** The way away from whatever is nearest (x, z), to a quarter turn. */
  away(x: number, z: number): number;
}

const ROAD = 1, STONE = 2, OTHER = 3;
/** Where the opening view looks from, along the ground. */
const VIEW_X = 0.67, VIEW_Z = 0.74;

/** Finds the bare paving on a tile, as built so far. */
export function bare(k: Build, o: { routes: Route[]; heroes: HeroSpot[]; parked: ParkedSpot[] }): Bare {
  const { x0, z0, x1, z1 } = k.board;
  const nx = Math.ceil(x1 - x0), nz = Math.ceil(z1 - z0), n = nx * nz;
  const top = new Float32Array(n).fill(-9), what = new Uint8Array(n), shut = new Uint8Array(n), low = new Uint8Array(n);
  const cell = (x: number, z: number): number => {
    const i = Math.floor(x - x0), j = Math.floor(z - z0);
    return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i;
  };
  const disc = (arr: Uint8Array, x: number, z: number, r: number): void => {
    for (let j = Math.max(0, Math.floor(z - r - z0)); j <= Math.min(nz - 1, Math.floor(z + r - z0)); j++) {
      for (let i = Math.max(0, Math.floor(x - r - x0)); i <= Math.min(nx - 1, Math.floor(x + r - x0)); i++) {
        if (Math.hypot(x0 + i + 0.5 - x, z0 + j + 0.5 - z) <= r + 0.5) arr[j * nx + i] = 1;
      }
    }
  };
  // a colour that reads as stone: pale and nearly grey, as it was given and not as it is kept
  const stony = (r: number, g: number, b: number): boolean => {
    const R = Math.pow(r, 1 / 2.2), G = Math.pow(g, 1 / 2.2), B = Math.pow(b, 1 / 2.2);
    const hi = Math.max(R, G, B);
    return hi > 0.55 && (hi - Math.min(R, G, B)) / hi < 0.22;
  };
  const read = (geo: GeoBuilder, streets: boolean): void => {
    const { pos, col, win } = geo.added;
    for (let t = 0, nt = pos.length / 9; t < nt; t++) {
      const q = t * 9;
      const ax = pos[q], ay = pos[q + 1], az = pos[q + 2], bx = pos[q + 3], by = pos[q + 4], bz = pos[q + 5];
      const cx = pos[q + 6], cy = pos[q + 7], cz = pos[q + 8];
      const hi = Math.max(ay, by, cy), lo = Math.min(ay, by, cy);
      const across = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      const inside = (px: number, pz: number): boolean => {
        const d1 = (bx - ax) * (pz - az) - (px - ax) * (bz - az);
        const d2 = (cx - bx) * (pz - bz) - (px - bx) * (cz - bz);
        const d3 = (ax - cx) * (pz - cz) - (px - cx) * (az - cz);
        return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
      };
      const cells = (fn: (c: number) => void): void => {
        for (let j = Math.max(0, Math.floor(Math.min(az, bz, cz) - z0)); j <= Math.min(nz - 1, Math.floor(Math.max(az, bz, cz) - z0)); j++) {
          for (let i = Math.max(0, Math.floor(Math.min(ax, bx, cx) - x0)); i <= Math.min(nx - 1, Math.floor(Math.max(ax, bx, cx) - x0)); i++) {
            if (inside(x0 + i + 0.5, z0 + j + 0.5)) fn(j * nx + i);
          }
        }
      };
      if (!streets && hi > 0.12) {
        // something that stands: every cell it lies across, and every cell its edges pass
        if (Math.abs(across) > 0.02) cells((c) => void (shut[c] = 1));
        for (const [px, pz, qx, qz] of [[ax, az, bx, bz], [bx, bz, cx, cz], [cx, cz, ax, az]]) {
          const m = Math.ceil(Math.hypot(qx - px, qz - pz) / 0.5);
          for (let s = 0; s <= m; s++) {
            const c = cell(px + ((qx - px) * s) / m, pz + ((qz - pz) * s) / m);
            if (c >= 0) shut[c] = 1;
          }
        }
        continue;
      }
      if (hi - lo > 0.05 || hi > 0.3 || Math.abs(across) < 1e-6) continue;
      const kind = streets ? win[t * 12 + 3] : 1;
      const type = kind < 0.5 ? ROAD : stony(col[q], col[q + 1], col[q + 2]) ? STONE : OTHER;
      const y = (ay + by + cy) / 3;
      cells((c) => {
        if (y >= top[c]) {
          top[c] = y;
          what[c] = type;
        }
      });
    }
  };
  read(k.street, true);
  read(k.b, false);
  read(k.deck, false);
  for (const t of k.trees ?? []) disc(shut, t.x, t.z, 1 + 1.3 * t.s);
  for (const p of k.people) disc(shut, p.x, p.z, 0.5);
  for (const l of k.lamps ?? []) disc(shut, l.x, l.z, 0.5);
  // every lane, a unit at a time, and every place for a hero or a parked car
  const p = new THREE.Vector3();
  for (const r of o.routes) {
    const path = buildPath(r.segs, true, r.hump);
    for (let s = 0; s < path.length; s += 1) {
      path.at(s, p);
      if (p.y < 2) disc(shut, p.x, p.z, 3.4);
    }
  }
  for (const h of o.heroes) {
    disc(shut, h.x, h.z, 6.5);
    for (let d = 0; d <= 18; d++) disc(low, h.x + VIEW_X * d, h.z + VIEW_Z * d, 4.5);
  }
  for (const q of o.parked) disc(shut, q.x, q.z, 4.5);
  // how far each bare cell is from the nearest that is not, by two sweeps
  const room = new Float32Array(n);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const c = j * nx + i;
      const edge = i < 2 || j < 2 || i >= nx - 2 || j >= nz - 2;
      room[c] = what[c] === STONE && !shut[c] && !edge ? 1e6 : 0;
    }
  }
  const D = Math.SQRT2;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const c = j * nx + i;
      if (room[c] === 0) continue;
      let v = room[c];
      if (i > 0) v = Math.min(v, room[c - 1] + 1);
      if (j > 0) v = Math.min(v, room[c - nx] + 1);
      if (i > 0 && j > 0) v = Math.min(v, room[c - nx - 1] + D);
      if (i < nx - 1 && j > 0) v = Math.min(v, room[c - nx + 1] + D);
      room[c] = v;
    }
  }
  for (let j = nz - 1; j >= 0; j--) {
    for (let i = nx - 1; i >= 0; i--) {
      const c = j * nx + i;
      if (room[c] === 0) continue;
      let v = room[c];
      if (i < nx - 1) v = Math.min(v, room[c + 1] + 1);
      if (j < nz - 1) v = Math.min(v, room[c + nx] + 1);
      if (i < nx - 1 && j < nz - 1) v = Math.min(v, room[c + nx + 1] + D);
      if (i > 0 && j < nz - 1) v = Math.min(v, room[c + nx - 1] + D);
      room[c] = v;
    }
  }
  const roomAt = (x: number, z: number): number => {
    const c = cell(x, z);
    return c < 0 ? 0 : room[c];
  };
  return {
    room: roomAt,
    low: (x, z) => {
      const c = cell(x, z);
      return c < 0 || low[c] === 1;
    },
    away: (x, z) => {
      const gx = roomAt(x + 1.5, z) - roomAt(x - 1.5, z), gz = roomAt(x, z + 1.5) - roomAt(x, z - 1.5);
      return Math.round(Math.atan2(gz, gx) / (Math.PI / 2)) * (Math.PI / 2);
    },
  };
}

/** A run of numbers of its own. */
function numbers(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Puts fixtures on the bare paving of a tile, on a loose grid `step` apart,
 * each the largest that the room there allows, chosen by weight. Call it last,
 * once everything else stands. It says in the console what it put down.
 */
export function furnish(k: Build, o: FurnishOpts): { things: number; triangles: number; people: number } {
  const g = bare(k, o);
  const rand = numbers(o.seed);
  const step = o.step ?? 2.5;
  const tris = k.b.triangles, folk = k.people.length;
  const { x0, z0, x1, z1 } = k.board;
  const spots: { x: number; z: number; r: number; f: Fixture }[] = [];
  // every unit of bare paving with room on it, in an order of its own: each may be the middle of something
  const cand: [number, number][] = [];
  for (let z = z0 + 0.5; z < z1; z += 1) for (let x = x0 + 0.5; x < x1; x += 1) if (g.room(x, z) >= 1.5) cand.push([x, z]);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  for (const [x, z] of cand) {
    const px = x + (rand() - 0.5) * 0.6, pz = z + (rand() - 0.5) * 0.6;
    const t = rand(), pick = rand();
    const room = g.room(px, pz);
    const fits = o.fixtures.filter((f) =>
      f.r + 0.7 <= room &&
      (f.h <= 1.9 || !g.low(px, pz)) &&
      spots.every((s) => Math.hypot(s.x - px, s.z - pz) > s.r + f.r + step) &&
      (o.keep ? o.keep(px, pz, f.h) : true));
    if (fits.length === 0) continue;
    let w = pick * fits.reduce((sum, f) => sum + f.w, 0);
    const f = fits.find((c) => (w -= c.w) < 0) ?? fits[fits.length - 1];
    f.make(k, px, pz, g.away(px, pz), t);
    spots.push({ x: px, z: pz, r: f.r, f });
  }
  // people about them, where there is room and nothing else
  for (const s of spots) {
    const m = Math.floor(rand() * ((s.f.people ?? 1) + 1));
    for (let i = 0; i < m; i++) {
      const a = rand() * Math.PI * 2, d = s.r + 0.5 + rand() * 0.8;
      const qx = s.x + Math.cos(a) * d, qz = s.z + Math.sin(a) * d;
      if (g.room(qx, qz) >= 1 && spots.every((q) => Math.hypot(q.x - qx, q.z - qz) > q.r + 0.4)) k.person(qx, qz);
    }
  }
  const out = { things: spots.length, triangles: k.b.triangles - tris, people: k.people.length - folk };
  console.info(`${o.name ?? 'A tile'}: ${out.things} things on bare paving, ${out.triangles} triangles, ${out.people} people about them.`);
  return out;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const IRON = 0x2b2f33;

/** The middle of a glow `along` wide on the front of a thing at (x, z) facing `yaw`, `out` from its middle. */
function front(x: number, z: number, yaw: number, out: number, along: number): { x: number; z: number; sx: number; sz: number } {
  const c = Math.cos(yaw), s = Math.sin(yaw), side = Math.abs(c) > 0.5;
  return { x: x + c * out, z: z + s * out, sx: side ? 0.1 : along, sz: side ? along : 0.1 };
}

/** A bench, its back to whatever is nearest. */
export function bench(seat = 0x9a6b3f, frame = IRON, w = 3): Fixture {
  return {
    r: 1.3, h: 1.1, w,
    make: (k, x, z, yaw) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.32, 0.4, -1.1, 0.32, 0.5, 1.1, seat);
      k.b.box(-0.42, 0.56, -1.1, -0.32, 1.02, 1.1, seat);
      for (const e of [-0.95, 0.95]) k.b.box(-0.36, 0, e - 0.06, 0.3, 0.4, e + 0.06, frame);
    }),
  };
}

/** A planter of stone with a shrub in it and flowers round it. */
export function planter(box = 0xb9b2a5, blooms = [0xe0503c, 0xf2c81e, 0xe86fa0], w = 2): Fixture {
  return {
    r: 0.95, h: 1.3, w,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.6, 0, -0.6, 0.6, 0.62, 0.6, box);
      k.b.box(-0.5, 0.62, -0.5, 0.5, 0.68, 0.5, 0x5a3f2a);
      k.b.cyl(0, 0, 0.68, 1.28, 0.48, 0.14, 6, 0x4f8a3c);
      const bloom = blooms[Math.floor(t * blooms.length)];
      for (const [a, b] of [[-0.34, -0.34], [0.34, -0.34], [0.34, 0.34], [-0.34, 0.34]]) k.b.box(a - 0.1, 0.68, b - 0.1, a + 0.1, 0.84, b + 0.1, bloom);
    }),
  };
}

/** A tree in a grate. */
export function treeInGrate(size = 0.9, grate = 0x3a3d40, w = 3): Fixture {
  return {
    r: 1.9, h: 5, w,
    make: (k, x, z, _yaw, t) => {
      k.b.box(x - 0.85, 0, z - 0.85, x + 0.85, 0.057, z + 0.85, grate);
      k.tree(x, z, size * (0.85 + 0.3 * t));
    },
  };
}

/** A lamp on a post, a lantern at its top. */
export function lampPost(post = IRON, h = 3.2, w = 2): Fixture {
  return { r: 0.6, h: h + 0.6, w, make: (k, x, z) => lantern(k, x, z, 0, h, post) };
}

/** A row of four bollards, across the way to whatever is nearest. */
export function bollards(color = IRON, band = 0xd9d4c8, w = 1): Fixture {
  return {
    r: 1.7, h: 0.8, w,
    make: (k, x, z, yaw) => k.b.moved(x, 0, z, yaw, () => {
      for (const e of [-1.2, -0.4, 0.4, 1.2]) {
        k.b.cyl(0, e, 0, 0.62, 0.13, 0.11, 6, color);
        k.b.cyl(0, e, 0.62, 0.74, 0.11, 0.05, 6, band);
      }
    }),
  };
}

/** A café's two tables under parasols, with a chair either side of each. */
export function cafe(shades = [0xc8392b, 0xf2efe6, 0x2f6b4f], chair = 0x8d8a83, w = 3): Fixture {
  return {
    r: 2.8, h: 2.8, w, people: 3,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      const shade = shades[Math.floor(t * shades.length)];
      for (const e of [-1.4, 1.4]) {
        parasol(k.b, 0, e, shade);
        for (const s of [-1, 1]) {
          k.b.box(s * 0.85 - 0.2, 0, e - 0.2, s * 0.85 + 0.2, 0.45, e + 0.2, chair);
          k.b.box(s * 1.05 - 0.05, 0.45, e - 0.2, s * 1.05 + 0.05, 0.95, e + 0.2, chair);
        }
      }
    }),
  };
}

/** A kiosk, its hatch to the open side, lit at night. */
export function kiosk(body = 0x2f6b4f, roof = 0x23272b, awning = 0xc8392b, w = 1): Fixture {
  return {
    r: 2.0, h: 3.0, w, people: 2,
    make: (k, x, z, yaw) => {
      k.b.moved(x, 0, z, yaw, () => {
        k.b.box(-1.0, 0, -1.1, 1.0, 2.2, 1.1, body);
        k.b.box(-1.25, 2.2, -1.35, 1.25, 2.42, 1.35, roof, { faces: 'NESWTB' });
        k.b.box(1.0, 0.9, -0.85, 1.06, 1.6, 0.85, 0x3a3128);
        k.b.box(1.0, 1.74, -1.0, 1.6, 1.84, 1.0, awning, { faces: 'NESWTB' });
      });
      k.glows.push({ ...front(x, z, yaw, 1.08, 1.6), y: 1.25, sy: 0.6, color: '#ffd9a0' });
      k.lights.push({ x: x + Math.cos(yaw) * 2.2, z: z + Math.sin(yaw) * 2.2, r: 6, color: '#ffc98a', k: 0.35 });
    },
  };
}

/** A round fountain: a basin, a bowl on a stem, and its jet. */
export function fountain(stone = 0xcfc6b2, water = 0x7fb8d6, w = 1): Fixture {
  return {
    r: 3.0, h: 2.2, w, people: 4,
    make: (k, x, z) => {
      k.b.cyl(x, z, 0, 0.5, 2.6, 2.6, 16, stone);
      k.b.cyl(x, z, 0.5, 0.56, 2.25, 2.25, 16, water);
      k.b.cyl(x, z, 0.56, 1.35, 0.32, 0.26, 8, stone);
      k.b.cyl(x, z, 1.35, 1.55, 0.95, 1.05, 10, stone);
      k.b.cyl(x, z, 1.55, 1.6, 0.85, 0.85, 10, water);
      k.b.cyl(x, z, 1.6, 2.2, 0.07, 0.03, 4, 0xe8f4fa);
      k.lights.push({ x, z, r: 7, color: '#bfe3ff', k: 0.35 });
    },
  };
}

/** A stall under an awning, its goods laid out in rows. */
export function stall(canopies = [0xc8392b, 0x2f6b9a, 0xe0a030], goods = [0xe0503c, 0xf2c81e, 0x6aa84f, 0xe58a2e], w = 1): Fixture {
  return {
    r: 1.9, h: 2.6, w, people: 3,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.55, 0, -1.2, 0.55, 0.85, 1.2, 0x9a6b3f);
      for (let i = 0; i < 4; i++) {
        const c = goods[(i + Math.floor(t * 4)) % goods.length];
        k.b.box(-0.45, 0.85, -1.1 + i * 0.56, 0.45, 1.0, -0.62 + i * 0.56, c);
      }
      for (const [a, b] of [[-0.62, -1.27], [-0.62, 1.27], [0.62, -1.27], [0.62, 1.27]]) k.b.box(a - 0.04, 0, b - 0.04, a + 0.04, 2.3, b + 0.04, 0x5a5550);
      k.b.box(-0.95, 2.3, -1.5, 0.95, 2.42, 1.5, canopies[Math.floor(t * canopies.length)], { faces: 'NESWTB' });
    }),
  };
}

/** Bicycles at a rack. */
export function bikes(colors = [0x2f6b9a, 0xc8392b, 0x2b2f33, 0xe0a030], w = 1): Fixture {
  return {
    r: 1.8, h: 1.3, w,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.04, 0.56, -1.4, 0.04, 0.64, 1.4, 0x9ea3a8);
      for (const e of [-1.4, 1.4]) k.b.box(-0.05, 0, e - 0.05, 0.05, 0.56, e + 0.05, 0x9ea3a8);
      for (let i = 0; i < 4; i++) twoWheeler(k.b, 0, -1.05 + i * 0.7, 0, colors[(i + Math.floor(t * 4)) % colors.length]);
    }),
  };
}

/** Three boxes for newspapers, side by side. */
export function newsBoxes(colors = [0x2f6b9a, 0xc8392b, 0xe0a030, 0x3f8a4f], w = 1): Fixture {
  return {
    r: 1.2, h: 1.1, w,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      for (let i = 0; i < 3; i++) {
        const e = (i - 1) * 0.62;
        k.b.box(-0.24, 0, e - 0.26, 0.24, 1.0, e + 0.26, colors[(i + Math.floor(t * 4)) % colors.length]);
        k.b.box(0.24, 0.6, e - 0.18, 0.27, 0.9, e + 0.18, 0xe8e4da);
      }
    }),
  };
}
