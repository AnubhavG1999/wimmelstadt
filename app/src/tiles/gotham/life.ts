// The life of Gotham's open paving, put down last of all, once everything else
// stands: street trees in grates, old lamps, benches, hydrants, boxes for
// newspapers, a kiosk here and there, crates on the quays, people about them,
// and cars parked in the courts and the yards. And one place of its own: the
// ball court behind the fire house.
//
// The engine has a kit for this (engine/furnish.ts), and its fixtures are used
// here. Its way of finding bare paving is not: it reads only pale stone at
// height 0, and Gotham's ground is dark and stands on five levels. So this
// file finds the bare ground itself, the same way, from what is built: a unit
// of ground is bare where the plan has level city ground, no lot, lane, stage,
// place for a hero or place of a story takes it, and no triangle of anything
// built stands over it lower than a storey and a half.

import { placed } from '../../engine/build';
import { bench, bikes, bollards, kiosk, lampPost, newsBoxes, planter, treeInGrate, type Fixture } from '../../engine/furnish';
import type { GeoBuilder } from '../../engine/geo';
import type { Build, ParkedSpot } from '../../engine/tile';
import { BOARDS, IRON, IRON_DARK, STEEL, TIMBER, TIMBER_DARK, TIMBER_PALE } from './look';
import { BOARD, HERO_SPOTS, LANDS, LOTS, SHOW_LANES, STAGES, TRIGATE, TURNS, VENTS, ceilingOver, groundAt, inside } from './plan';
import { REGIONS } from './regions';
import { LANES, toEl, underBuilt } from './roads';

const X0 = BOARD.x0, Z0 = BOARD.z0, NX = BOARD.x1 - BOARD.x0, NZ = BOARD.z1 - BOARD.z0;
/** The way the view the tile opens with looks back from, on the ground. */
const VX = 0.669, VZ = 0.743;

/** The bare ground of the tile as built: how far each place is from anything, how high it stands, and where only what is low may be. */
interface Bare {
  room(x: number, z: number): number;
  y(x: number, z: number): number;
  low(x: number, z: number): boolean;
  /** Whether a car may stand at a place: beyond the sidewalks of every lane, and well away from every stage and place of the stories, whose figures the show does not keep clear of parked cars. */
  offStreet(x: number, z: number): boolean;
  /** Takes a round of ground, so that nothing else is put on it. */
  take(x: number, z: number, r: number): void;
  away(x: number, z: number): number;
}

function bareGround(k: Build): Bare {
  const n = NX * NZ, ground = new Float32Array(n), shut = new Uint8Array(n), low = new Uint8Array(n), street = new Uint8Array(n);
  const cell = (x: number, z: number): number => {
    const i = Math.floor(x - X0), j = Math.floor(z - Z0);
    return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i;
  };
  const disc = (arr: Uint8Array, x: number, z: number, r: number): void => {
    for (let j = Math.max(0, Math.floor(z - r - Z0)); j <= Math.min(NZ - 1, Math.floor(z + r - Z0)); j++) {
      for (let i = Math.max(0, Math.floor(x - r - X0)); i <= Math.min(NX - 1, Math.floor(x + r - X0)); i++) {
        if (Math.hypot(X0 + i + 0.5 - x, Z0 + j + 0.5 - z) <= r + 0.5) arr[j * NX + i] = 1;
      }
    }
  };
  const rect = (x0: number, z0: number, x1: number, z1: number): void => {
    for (let j = Math.max(0, Math.floor(z0 - Z0)); j <= Math.min(NZ - 1, Math.floor(z1 - Z0)); j++) {
      for (let i = Math.max(0, Math.floor(x0 - X0)); i <= Math.min(NX - 1, Math.floor(x1 - X0)); i++) shut[j * NX + i] = 1;
    }
  };

  // the plan's ground: the two banks' paving on whatever level, where it is level
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const c = j * NX + i, x = X0 + i + 0.5, z = Z0 + j + 0.5, g = groundAt(x, z);
      ground[c] = g;
      const city = inside(LANDS.west, x, z) || inside(LANDS.east, x, z);
      const level = [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([dx, dz]) => Math.abs(groundAt(x + dx, z + dz) - g) < 0.02);
      if (!city || !level || g < -0.01 || i < 2 || j < 2 || i >= NX - 2 || j >= NZ - 2) shut[c] = 1;
    }
  }
  // every lot is its builder's: a building, or ground a builder has dressed. So are the wharf and the goods yard
  // under the terrace's north wall, which have no lot: rails and ballast lie flat on them
  for (const l of LOTS) rect(l.x0 - 0.4, l.z0 - 0.4, l.x1 + 0.4, l.z1 + 0.4);
  rect(-2, -67, 104, -50);

  // what is built: a triangle that stands higher than a hand over the ground of a cell it lies over or passes, and
  // lower than a storey and a half above it
  const read = (geo: GeoBuilder): void => {
    const pos = geo.added.pos;
    for (let t = 0, nt = pos.length / 9; t < nt; t++) {
      const q = t * 9;
      const ax = pos[q], ay = pos[q + 1], az = pos[q + 2], bx = pos[q + 3], by = pos[q + 4], bz = pos[q + 5], cx = pos[q + 6], cy = pos[q + 7], cz = pos[q + 8];
      const hi = Math.max(ay, by, cy), lo = Math.min(ay, by, cy);
      const mark = (c: number): void => { if (c >= 0 && hi > ground[c] + 0.22 && lo < ground[c] + 6.5) shut[c] = 1; };
      const across = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(across) > 0.02) {
        const within = (px: number, pz: number): boolean => {
          const d1 = (bx - ax) * (pz - az) - (px - ax) * (bz - az), d2 = (cx - bx) * (pz - bz) - (px - bx) * (cz - bz), d3 = (ax - cx) * (pz - cz) - (px - cx) * (az - cz);
          return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
        };
        for (let j = Math.max(0, Math.floor(Math.min(az, bz, cz) - Z0)); j <= Math.min(NZ - 1, Math.floor(Math.max(az, bz, cz) - Z0)); j++) {
          for (let i = Math.max(0, Math.floor(Math.min(ax, bx, cx) - X0)); i <= Math.min(NX - 1, Math.floor(Math.max(ax, bx, cx) - X0)); i++) {
            if (within(X0 + i + 0.5, Z0 + j + 0.5)) mark(j * NX + i);
          }
        }
      }
      for (const [px, pz, qx, qz] of [[ax, az, bx, bz], [bx, bz, cx, cz], [cx, cz, ax, az]]) {
        const m = Math.ceil(Math.hypot(qx - px, qz - pz) / 0.5);
        for (let s = 0; s <= m; s++) mark(cell(px + ((qx - px) * s) / Math.max(1, m), pz + ((qz - pz) * s) / Math.max(1, m)));
      }
    }
  };
  read(k.b);
  read(k.deck);

  // every lane that runs on the ground, with its kerb; the rings to turn in, islands and all; the show's own lanes
  for (const line of Object.values(LANES)) {
    for (const p of line) {
      const c = cell(p[0], p[2]);
      if (c < 0 || Math.abs(p[1] - ground[c]) > 1.2) continue;
      disc(shut, p[0], p[2], 3.5);
      disc(street, p[0], p[2], 6.4);
    }
  }
  for (const t of [...Object.values(TURNS), { c: TRIGATE.c, r: TRIGATE.r }, TRIGATE.arkham]) disc(shut, t.c[0], t.c[1], t.r + 3.6);
  for (const s of Object.values(SHOW_LANES)) rect(s.x0 - 1, s.z - 3.2, s.x1 + 1, s.z + 3.2);
  // the stories' stages and every place a story stands a figure; the places for heroes and the strips they are seen through
  for (const s of Object.values(STAGES)) {
    rect(s.x0 - 0.8, s.z0 - 0.8, s.x1 + 0.8, s.z1 + 0.8);
    for (let x = s.x0; x <= s.x1 + 0.01; x += 2) for (let z = s.z0; z <= s.z1 + 0.01; z += 2) disc(street, x, z, 8);
  }
  for (const r of Object.values(REGIONS)) {
    for (const p of Object.values(r.PLACES)) {
      const c = cell(p.x, p.z);
      if (c < 0 || Math.abs(p.y - ground[c]) > 1.6) continue;
      disc(shut, p.x, p.z, 2.2);
      disc(street, p.x, p.z, 8);
    }
  }
  for (const h of HERO_SPOTS) {
    disc(shut, h.x, h.z, 6.5);
    for (let d = 0; d <= 18; d++) disc(low, h.x + VX * d, h.z + VZ * d, 4.5);
  }
  // what already stands that is no triangle of the city's: trees, people, lamps; name boards and the way they are read from; steam
  for (const t of k.trees ?? []) disc(shut, t.x, t.z, 1 + 1.3 * t.s);
  for (const p of k.people) disc(shut, p.x, p.z, 0.7);
  for (const l of k.lamps ?? []) disc(shut, l.x, l.z, 0.7);
  for (const b of BOARDS) {
    disc(shut, b.x, b.z, b.w / 2 + 0.8);
    for (let d = 1; d <= 7; d++) disc(low, b.x + VX * d, b.z + VZ * d, b.w / 2 + 0.5);
  }
  for (const [x, z] of VENTS) disc(shut, x, z, 1.4);
  // under the elevated railway its columns stand, and under what is built over a road there is the road
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const c = j * NX + i;
      if (shut[c]) continue;
      const x = X0 + i + 0.5, z = Z0 + j + 0.5;
      if (toEl(x, z) < 1.6 || underBuilt(x, z, 0.5)) shut[c] = 1;
    }
  }

  // how far each bare cell is from the nearest that is not, by two sweeps
  const room = new Float32Array(n), D = Math.SQRT2;
  const sweep = (): void => {
    for (let c = 0; c < n; c++) room[c] = shut[c] ? 0 : 1e6;
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const c = j * NX + i;
        if (room[c] === 0) continue;
        let v = room[c];
        if (i > 0) v = Math.min(v, room[c - 1] + 1);
        if (j > 0) v = Math.min(v, room[c - NX] + 1);
        if (i > 0 && j > 0) v = Math.min(v, room[c - NX - 1] + D);
        if (i < NX - 1 && j > 0) v = Math.min(v, room[c - NX + 1] + D);
        room[c] = v;
      }
    }
    for (let j = NZ - 1; j >= 0; j--) {
      for (let i = NX - 1; i >= 0; i--) {
        const c = j * NX + i;
        if (room[c] === 0) continue;
        let v = room[c];
        if (i < NX - 1) v = Math.min(v, room[c + 1] + 1);
        if (j < NZ - 1) v = Math.min(v, room[c + NX] + 1);
        if (i < NX - 1 && j < NZ - 1) v = Math.min(v, room[c + NX + 1] + D);
        if (i > 0 && j < NZ - 1) v = Math.min(v, room[c + NX - 1] + D);
        room[c] = v;
      }
    }
  };
  sweep();
  const roomAt = (x: number, z: number): number => { const c = cell(x, z); return c < 0 ? 0 : room[c]; };
  return {
    room: roomAt,
    y: (x, z) => { const c = cell(x, z); return c < 0 ? 0 : ground[c]; },
    low: (x, z) => { const c = cell(x, z); return c < 0 || low[c] === 1; },
    offStreet: (x, z) => { const c = cell(x, z); return c >= 0 && street[c] === 0; },
    take: (x, z, r) => { disc(shut, x, z, r); sweep(); },
    away: (x, z) => {
      const gx = roomAt(x + 1.5, z) - roomAt(x - 1.5, z), gz = roomAt(x, z + 1.5) - roomAt(x, z - 1.5);
      return Math.round(Math.atan2(gz, gx) / (Math.PI / 2)) * (Math.PI / 2);
    },
  };
}

/** A run of numbers of its own, the same on every load. */
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

// ---------------------------------------------------------------------------
// Gotham's own fixtures, beside the engine's
// ---------------------------------------------------------------------------

/** A fire hydrant: red, squat, two caps. */
function hydrant(w: number): Fixture {
  const RED = 0x9a2a24;
  return {
    r: 0.4, h: 0.9, w,
    make: (k, x, z) => {
      k.b.cyl(x, z, 0, 0.62, 0.17, 0.15, 6, RED);
      k.b.cyl(x, z, 0.62, 0.82, 0.13, 0.05, 6, RED, { cap: false });
      k.b.box(x - 0.3, 0.36, z - 0.07, x + 0.3, 0.5, z + 0.07, RED, { faces: 'NESWTB' });
    },
  };
}

/** Crates left on the paving: two, and a third on top of one as often as not. */
function crates(w: number): Fixture {
  const woods = [TIMBER, TIMBER_DARK, TIMBER_PALE];
  return {
    r: 1.0, h: 1.5, w, people: 1,
    make: (k, x, z, yaw, t) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.7, 0, -0.75, 0.25, 0.9, 0.2, woods[Math.floor(t * 3) % 3], { faces: 'NESWT' });
      k.b.box(-0.2, 0, 0.3, 0.7, 0.72, 0.95, woods[Math.floor(t * 7) % 3], { faces: 'NESWT' });
      if (t > 0.45) k.b.box(-0.55, 0.9, -0.6, 0.1, 1.5, 0.05, woods[Math.floor(t * 11) % 3], { faces: 'NESWT' });
    }),
  };
}

/** A telephone box: dark green iron, its panes lit at night, a pale roof. */
function phoneBox(w: number): Fixture {
  return {
    r: 0.65, h: 2.7, w, people: 1,
    make: (k, x, z, yaw) => k.b.moved(x, 0, z, yaw, () => {
      k.b.box(-0.45, 0, -0.45, 0.45, 2.4, 0.45, 0x23382f, { win: { cell: 0.45, storey: 2.4, lit: 1, kind: 1 } });
      k.b.box(-0.52, 2.4, -0.52, 0.52, 2.62, 0.52, 0x8a8d84, { faces: 'NESWTB' });
      k.b.box(0.45, 0.1, -0.3, 0.47, 2.2, 0.3, 0x3d3226, { faces: 'E' });
    }),
  };
}

/** What Gotham puts on its paving, and how often: mostly trees, lamps, benches and hydrants, in the city's dark iron and muted paint. */
const FIXTURES: Fixture[] = [
  treeInGrate(0.8, 0x2f3236, 3),
  // a young tree, which wants only the room of its grate: its crown may reach over a kerb or lean on a wall
  { ...treeInGrate(0.58, 0x2f3236, 6), r: 1.0, h: 3.6 },
  lampPost(0x1b1c20, 3.4, 2),
  bench(0x5a4634, 0x2b2f33, 3),
  hydrant(3),
  newsBoxes([0x2f4a6a, 0x7a2f2a, 0x8a7a3a, 0x3a5a44], 2),
  crates(2),
  bollards(0x3c4047, 0x8a8d94, 1),
  planter(0x7a7d84, [0x8a2f2a, 0xb89a3a, 0x6a4a7a], 1),
  kiosk(0x2c4a3e, 0x1f2226, 0x6a2a26, 1),
  phoneBox(1),
  bikes([0x2b2f33, 0x5a2a26, 0x2f4a6a, 0x6a6a3a], 1),
];

// ---------------------------------------------------------------------------
// The ball court behind the fire house
// ---------------------------------------------------------------------------

/** Where it lies: the bare ground east of Kane Street between the fire house and Ace Chemicals' wall. */
const COURT = { x0: 90.2, z0: 10.6, x1: 102.4, z1: 17.2 };

/** A fenced ball court: painted asphalt, a hoop at each end, a bench, and four who play. The East End's own. */
function ballCourt(k: Build): void {
  const b = k.b, C = COURT, y = 0.03, PAINT = 0x3f5347, LINE = 0xcfd3d0, cz = (C.z0 + C.z1) / 2, cx = (C.x0 + C.x1) / 2;
  const flat = (x0: number, z0: number, x1: number, z1: number, color: number, lift = 0): void => b.quad([x0, y + lift, z1], [x1, y + lift, z1], [x1, y + lift, z0], [x0, y + lift, z0], [0, 1, 0], color);
  flat(C.x0, C.z0, C.x1, C.z1, PAINT);
  // its lines: the bounds, the middle, a key at each end
  const t = 0.09, L = 0.012;
  flat(C.x0 + 0.4, C.z0 + 0.4, C.x1 - 0.4, C.z0 + 0.4 + t, LINE, L);
  flat(C.x0 + 0.4, C.z1 - 0.4 - t, C.x1 - 0.4, C.z1 - 0.4, LINE, L);
  for (const x of [C.x0 + 0.4, C.x1 - 0.4 - t, cx - t / 2]) flat(x, C.z0 + 0.4, x + t, C.z1 - 0.4, LINE, L);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? C.x0 + 0.4 : C.x1 - 0.4 - 2.6, x1 = x0 + 2.6;
    flat(x0, cz - 1.3, x1, cz - 1.3 + t, LINE, L);
    flat(x0, cz + 1.3 - t, x1, cz + 1.3, LINE, L);
    flat(s < 0 ? x1 - t : x0, cz - 1.3, s < 0 ? x1 : x0 + t, cz + 1.3, LINE, L);
    // the hoop: a post, an arm, a board and a rim
    const px = s < 0 ? C.x0 + 0.15 : C.x1 - 0.15;
    b.beam([px, 0, cz], [px, 3.0, cz], 0.09, 0.08, IRON_DARK);
    b.beam([px, 3.0, cz], [px - s * 0.7, 3.25, cz], 0.07, 0.06, IRON_DARK);
    b.box(Math.min(px - s * 0.7, px - s * 0.78), 2.9, cz - 0.6, Math.max(px - s * 0.7, px - s * 0.78), 3.7, cz + 0.6, 0xd9dde0, { faces: 'NESWTB' });
    b.box(Math.min(px - s * 0.8, px - s * 1.25), 3.0, cz - 0.22, Math.max(px - s * 0.8, px - s * 1.25), 3.06, cz + 0.22, 0xd2622a, { faces: 'NESWTB' });
  }
  // a fence of wire on iron posts along the north and the east, where the yard's walls are
  for (let x = C.x0; x <= C.x1 + 0.01; x += (C.x1 - C.x0) / 5) b.beam([x, 0, C.z0 - 0.25], [x, 2.6, C.z0 - 0.25], 0.06, 0.06, IRON);
  for (const yy of [0.15, 1.35, 2.55]) b.beam([C.x0, yy, C.z0 - 0.25], [C.x1, yy, C.z0 - 0.25], 0.035, 0.035, STEEL);
  // a bench along its south side, and the players
  b.box(cx - 1.3, 0.4, C.z1 + 0.35, cx + 1.3, 0.5, C.z1 + 0.95, 0x5a4634, { faces: 'NESWTB' });
  for (const x of [cx - 1.1, cx + 1.1]) b.box(x - 0.06, 0, C.z1 + 0.4, x + 0.06, 0.4, C.z1 + 0.9, IRON_DARK);
  for (const [x, z] of [[cx - 2.6, cz - 0.6], [cx - 1.2, cz + 1.1], [cx + 1.6, cz - 1.0], [cx + 3.4, cz + 0.4]]) k.person(x, z);
  k.person(cx + 0.4, C.z1 + 1.5);
  b.cyl(cx - 1.9, cz - 0.2, 0.03, 0.4, 0.2, 0.2, 6, 0xc8622a);
  k.lights.push({ x: cx, z: cz, r: 9, color: '#ffcf7a', k: 0.4 });
}

// ---------------------------------------------------------------------------
// All of it
// ---------------------------------------------------------------------------

/** The kinds of car that stand parked: the tile's own, in its dark paint (traffic.ts). */
const PARKED_KINDS = ['oldSedan', 'coupe', 'oldSedan', 'cab'];

/**
 * Puts down the life of the paving. Call it last, once everything else stands
 * still. It hands back where cars stand parked, and says in the console what
 * it put down.
 */
export function buildLife(k: Build): ParkedSpot[] {
  const tris = k.b.triangles, folk = k.people.length;
  ballCourt(k);
  const g = bareGround(k);
  g.take((COURT.x0 + COURT.x1) / 2, (COURT.z0 + COURT.z1) / 2, 7.4);
  const rand = numbers(0x607a);
  const fits = (x: number, z: number, r: number, h: number): boolean => {
    const y = g.y(x, z);
    return y + h <= ceilingOver(x - r, z - r, x + r, z + r) + 0.01;
  };

  // every unit of bare ground with room on it, in an order of its own
  const cand: [number, number][] = [];
  for (let z = Z0 + 0.5; z < BOARD.z1; z += 1) for (let x = X0 + 0.5; x < BOARD.x1; x += 1) if (g.room(x, z) >= 1.1) cand.push([x, z]);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }

  // cars first, where there is a court or a yard to stand in, well apart: each wants its length clear both ways
  const parked: ParkedSpot[] = [];
  for (const [x, z] of cand) {
    if (parked.length >= 12) break;
    if (g.room(x, z) < 2.4 || !g.offStreet(x, z) || g.low(x, z) || !fits(x, z, 2, 2)) continue;
    if (parked.some((p) => Math.hypot(p.x - x, p.z - z) < 16)) continue;
    // along x or along z, whichever has its length clear
    const clear = (dx: number, dz: number): boolean => [-3.4, -1.7, 1.7, 3.4].every((s) => g.room(x + dx * s, z + dz * s) >= 2.0 && g.offStreet(x + dx * s, z + dz * s));
    const ways = [[1, 0], [0, 1]].filter(([dx, dz]) => clear(dx, dz));
    if (ways.length === 0) continue;
    const [dx, dz] = ways[Math.floor(rand() * ways.length)];
    const heading = Math.atan2(dz, dx) + (rand() > 0.5 ? Math.PI : 0);
    parked.push({ x, y: g.y(x, z) + 0.02, z, heading, type: PARKED_KINDS[parked.length % PARKED_KINDS.length] });
    for (const s of [-3, -1.5, 0, 1.5, 3]) g.take(x + dx * s, z + dz * s, 2.3);
  }

  // then the fixtures, each the choice of those that fit, on a loose grid, until there are enough
  const spots: { x: number; z: number; r: number; f: Fixture }[] = [];
  const STEP = 3.4, MOST = 5200;
  for (const [x, z] of cand) {
    if (k.b.triangles - tris > MOST) break;
    const px = x + (rand() - 0.5) * 0.6, pz = z + (rand() - 0.5) * 0.6;
    const t = rand(), pick = rand(), room = g.room(px, pz);
    if (room < 1.1) continue;
    const able = FIXTURES.filter((f) =>
      f.r + 0.7 <= room &&
      (f.h <= 1.9 || !g.low(px, pz)) &&
      spots.every((s) => Math.hypot(s.x - px, s.z - pz) > s.r + f.r + STEP) &&
      fits(px, pz, f.r, f.h));
    if (able.length === 0) continue;
    let w = pick * able.reduce((sum, f) => sum + f.w, 0);
    const f = able.find((c) => (w -= c.w) < 0) ?? able[able.length - 1];
    const yaw = g.away(px, pz);
    placed(k, 0, 0, 0, (kk) => f.make(kk, px, pz, yaw, t), g.y(px, pz));
    spots.push({ x: px, z: pz, r: f.r, f });
  }
  // people about them, where there is room and nothing else
  for (const s of spots) {
    const m = Math.floor(rand() * ((s.f.people ?? 1) + 1));
    for (let i = 0; i < m; i++) {
      const a = rand() * Math.PI * 2, d = s.r + 0.5 + rand() * 0.8;
      const qx = s.x + Math.cos(a) * d, qz = s.z + Math.sin(a) * d;
      if (g.room(qx, qz) >= 0.9 && spots.every((q) => Math.hypot(q.x - qx, q.z - qz) > q.r + 0.4)) k.person(qx, qz, g.y(qx, qz));
    }
  }
  if (import.meta.env.DEV) console.info(`Gotham: the life of its paving: ${spots.length} things on bare ground and ${parked.length} cars parked, ${k.b.triangles - tris} triangles, ${k.people.length - folk} people about them.`);
  return parked;
}
