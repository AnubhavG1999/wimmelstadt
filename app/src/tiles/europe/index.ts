// Europe: London, Paris and Italy along one river.
//
// The ground, the river, the roads and the traffic are as they will be, and
// London's river front is built. The rest of the things that will stand on
// the tile are still plain boxes with their numbers on, or rough shapes where
// the shape decides how a road runs: see NOTES.md for which is which.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { ordinaryBuildings, type BuildingRules, type Lot } from '../../engine/buildings';
import { interior } from '../../engine/geo';
import { LAWN, area, flat, ground, oval, rect, terrace, walls, water, type P2 } from '../../engine/ground';
import { buildPath, type Path } from '../../engine/paths';
import { lampsAlong, roadDeck, street } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, HeroSpot, ParkedSpot, TileDef, TileParts } from '../../engine/tile';
import { balloon, concorde } from './air';
import { eiffel, pisa } from './landmarks';
import { bridgeStreetLamps, londonEye, parliament, towerBridge, westminsterBridge } from './london';
import {
  ARC, ARNO_X, BEND_1, BEND_2, CANAL, COLOSSEUM, CONCORDE, HILL, IENA_X, ISLAND, LINGOTTO_ROOF, NEUF_X, PLOTS, RIVER_WIDTH, SEINE_Z,
  THAMES_X, THINGS, WATER_DROP, onHill, type Quarter, type Thing,
} from './plan';
import { HILL_DOWN_ROAD, HILL_ROAD, HILL_UP_ROAD, ROUTES, STREETS } from './roads';

const PAVING = 0xb9b1a2, QUAY = 0xa49f93, STONE = 0xcfc6b2, WATER = 0x5f9fc4, PLAZA = 0xd8d2c4;
/** What a quarter's boxes are painted until its things are built. */
const BOX: Record<Quarter, number> = { london: 0xb98f72, paris: 0xe4d9bd, italy: 0xe6b98a };
const BOARD: Record<Quarter, string> = { london: '#c8202c', paris: '#1f4fa3', italy: '#2f8f4f' };

// ---------------------------------------------------------------------------
// Signs: a numbered board for each thing, and what the shops of each quarter say
// ---------------------------------------------------------------------------

const shop = (id: string, text: string, color: string, ink: string): SignDef => ({ id, lines: [text], color, ink, aspect: Math.max(2.4, text.length * 0.62), kind: 'board' });

/** What is over the shopfronts of each quarter, in its own language. All of these are invented or generic. */
const SHOPS: Record<Quarter, SignDef[]> = {
  london: [
    shop('pub', 'THE RED LION', '#5e1a1a', '#f2d58f'), shop('tea', 'TEA ROOMS', '#1f3b2c', '#f4f1e8'),
    shop('chips', 'FISH & CHIPS', '#1c2f5e', '#f4f1e8'), shop('books', 'BOOKS', '#3a2a1a', '#f2d58f'),
  ],
  paris: [
    shop('cafe', 'CAFÉ', '#7a1f1f', '#f4f1e8'), shop('boulangerie', 'BOULANGERIE', '#f0e6cf', '#5e3a1a'), shop('tabac', 'TABAC', '#b3202a', '#ffffff'),
    shop('fleurs', 'FLEURS', '#2f5d48', '#f4f1e8'), shop('brasserie', 'BRASSERIE', '#1c2f5e', '#f2d58f'),
  ],
  italy: [
    shop('gelateria', 'GELATERIA', '#f4f1e8', '#b3202a'), shop('trattoria', 'TRATTORIA', '#2f5d48', '#f4f1e8'), shop('bar', 'BAR', '#f4f1e8', '#1c2f5e'),
    shop('pizzeria', 'PIZZERIA', '#b3202a', '#f4f1e8'), shop('farmacia', 'FARMACIA', '#f4f1e8', '#2f8f4f'),
  ],
};

const SIGNS: SignDef[] = [
  ...THINGS.map((t): SignDef => ({ id: `thing-${t.id}`, lines: [String(t.n), t.name], color: BOARD[t.quarter], ink: '#ffffff', aspect: 2.2, size: [264, 120], kind: 'board' })),
  ...Object.values(SHOPS).flat(),
];

/** A plot with the quarter it stands in, which decides its roof and its signs. */
type Sited = Lot & { quarter: Quarter };

const RULES: BuildingRules<Sited> = {
  styles: {
    brick: { palette: [0xb99a6f, 0xa9805c, 0xc4a57c], win: { cell: 2.6, storey: 5, lit: 0.34, kind: 2 }, shops: true },
    stucco: { palette: [0xeeeae0, 0xe6e1d4], win: { cell: 2.6, storey: 5, lit: 0.34, kind: 2 }, shops: true },
    haussmann: { palette: [0xe9dfc8, 0xe4d6b8, 0xf0e6cf], win: { cell: 2.4, storey: 5, lit: 0.38, kind: 2 }, shops: true },
    ochre: { palette: [0xe8c27a, 0xd9a25f, 0xe9b38a, 0xf0d9a0, 0xd98f6a], win: { cell: 2.8, storey: 5, lit: 0.32, kind: 2 }, shops: true },
    shed: { palette: [0xd8d4c8], win: { cell: 3.4, storey: 8, lit: 0.2, kind: 4 } },
  },
  roofs: [0x8d8a83, 0x7b7a7e],
  // slate and chimney pots in London, zinc in Paris, clay tiles in Italy
  hip: (l) => (l.quarter === 'london' ? { colors: [0x5a5f66, 0x4f555c], chimneys: true } : l.quarter === 'paris' ? { colors: [0x7d8691, 0x6f7883] } : { colors: [0xb5654a, 0xa85a44, 0xc0704f] }),
  pool: (l) => ({ fascia: SHOPS[l.quarter].map((s) => s.id), blade: [], billboard: [] }),
  neon: ['#ffd9a0'],
};

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The river's outline: a band along its middle line, wider and narrower as it goes, with Venice's canal let into its east bank. */
function riverShape(): P2[] {
  const mid = buildPath([
    { t: 'poly', pts: [[THAMES_X, -112.8], [THAMES_X, SEINE_Z], [20, SEINE_Z]], y: 0, r: BEND_1 },
    { t: 'poly', pts: [[20, SEINE_Z], [ARNO_X, SEINE_Z], [ARNO_X, 112.8]], y: 0, r: BEND_2 },
  ], false);
  const half = (s: number): number => {
    for (let i = 0; i + 1 < RIVER_WIDTH.length; i++) {
      const [s0, w0] = RIVER_WIDTH[i], [s1, w1] = RIVER_WIDTH[i + 1];
      if (s <= s1) return w0 + (w1 - w0) * smooth(s0, s1, s);
    }
    return RIVER_WIDTH[RIVER_WIDTH.length - 1][1];
  };
  const n = Math.ceil(mid.length / 2.5);
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  // the bank on the left of someone who follows the river from the north edge, and the one on their right
  const left: P2[] = [], right: P2[] = [];
  let notched = false;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * mid.length;
    mid.at(s, p);
    mid.at(Math.min(mid.length, s + 0.6), a);
    mid.at(Math.max(0, s - 0.6), b);
    const tx = a.x - b.x, tz = a.z - b.z, l = Math.hypot(tx, tz) || 1, hw = half(s);
    right.push([p.x - (tz / l) * hw, p.z + (tx / l) * hw]);
    const bank: P2 = [p.x + (tz / l) * hw, p.z - (tx / l) * hw];
    // on the Arno the left bank is the east one, where the canal leaves for the edge of the board
    const onArno = p.x > ARNO_X - 1 && p.z > SEINE_Z + BEND_2 + 4;
    if (onArno && bank[1] > CANAL.z0 && bank[1] < CANAL.z1) {
      if (!notched) left.push([bank[0], CANAL.z0], [103.8, CANAL.z0], [103.8, CANAL.z1], [bank[0], CANAL.z1]);
      notched = true;
      continue;
    }
    left.push(bank);
  }
  return [...left, ...right.reverse()];
}

/** A shape, cut off a hair inside the edge of the board. */
function onBoard(shape: P2[]): P2[] {
  const X = 103.8, Z = 112.8;
  const cutX = (x: number) => (a: P2, b: P2): P2 => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const cutZ = (z: number) => (a: P2, b: P2): P2 => [a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]), z];
  const edges: [(p: P2) => boolean, (a: P2, b: P2) => P2][] = [
    [(p) => p[0] <= X, cutX(X)], [(p) => p[0] >= -X, cutX(-X)], [(p) => p[1] <= Z, cutZ(Z)], [(p) => p[1] >= -Z, cutZ(-Z)],
  ];
  let out = shape;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    src.forEach((p, i) => {
      const q = src[(i + 1) % src.length];
      if (inside(p)) out.push(p);
      if (inside(p) !== inside(q)) out.push(cut(p, q));
    });
  }
  return out;
}

/** A flat bridge: a slab from bank to bank under the street, piers in the water and a low wall along each side. */
function slabBridge(k: Build, x0: number, z0: number, x1: number, z1: number, alongX: boolean, piers: number): void {
  const deep = -(WATER_DROP + 0.6);
  k.b.box(x0, -1.1, z0, x1, 0, z1, STONE, { faces: 'NESWTB' });
  for (let i = 1; i <= piers; i++) {
    const t = i / (piers + 1);
    if (alongX) {
      const x = x0 + (x1 - x0) * t;
      k.b.box(x - 1, deep, z0 - 0.8, x + 1, -1.1, z1 + 0.8, STONE, { faces: 'NESWT' });
    } else {
      const z = z0 + (z1 - z0) * t;
      k.b.box(x0 - 0.8, deep, z - 1, x1 + 0.8, -1.1, z + 1, STONE, { faces: 'NESWT' });
    }
  }
  if (alongX) for (const z of [z0, z1 - 0.5]) k.b.box(x0, 0, z, x1, 1.0, z + 0.5, STONE);
  else for (const x of [x0, x1 - 0.5]) k.b.box(x, 0, z0, x + 0.5, 1.0, z1, STONE);
}

/** A number and a name on a board above a thing, turned to the south-east, where the tile is usually looked at from. */
function board(k: Build, t: Thing, x: number, y: number, z: number): void {
  k.sign(`thing-${t.id}`, x, y, z, Math.SQRT1_2, Math.SQRT1_2, 9);
  k.b.box(x - 0.2, y - 12, z - 0.2, x + 0.2, y - 4.5, z + 0.2, 0x4b4f57);
}

function build(k: Build): TileParts {
  const b = k.b, rand = k.rand;
  const thing = (id: string): Thing => THINGS.find((t) => t.id === id)!;

  // -------------------------------------------------------------------------
  // The ground: paving with a hole for the river, the water, the island and the hill
  // -------------------------------------------------------------------------

  const river = riverShape();
  ground(k, { color: PAVING, holes: [river] });
  water(k, river, { drop: WATER_DROP, color: WATER, quay: QUAY });
  // the Île de la Cité, shaped like a ship
  const { x0: ix0, x1: ix1, half: ih } = ISLAND;
  terrace(k, [[ix0, SEINE_Z], [ix0 + 6, SEINE_Z - ih], [ix1 - 3, SEINE_Z - ih], [ix1, SEINE_Z - ih + 2.5], [ix1, SEINE_Z + ih - 2.5], [ix1 - 3, SEINE_Z + ih], [ix0 + 6, SEINE_Z + ih]], -(WATER_DROP + 0.6), 0, { top: PLAZA, side: QUAY });

  // Montmartre, in three levels, in the north-east corner. Each level is a strip
  // of the hill that runs the same way as the Champs-Élysées. The second and
  // third are only as long as the loop on them: beyond its hairpins the first
  // level is wide. The first is cut back at its west end, where the road comes
  // down off it, and carries two lanes: the loop's above, the way to the star below.
  const [r1, r2, r3] = HILL.rims, [h1, h2, h3] = HILL.heights;
  const FAR = 140, HILLSIDE = { top: LAWN, side: 0x9a8f7c };
  terrace(k, onBoard([onHill(HILL.t0, r1), onHill(FAR, r1), onHill(FAR, FAR), onHill(HILL.t0 - 6, FAR), onHill(HILL.t0 - 6, HILL.way + 3), onHill(HILL.t0, HILL.way + 3)]), 0, h1, HILLSIDE);
  terrace(k, onBoard([onHill(HILL.t0, r2), onHill(HILL.t1, r2), onHill(HILL.t1, FAR), onHill(HILL.t0, FAR)]), h1, h2, HILLSIDE);
  terrace(k, onBoard([onHill(HILL.t0 + 1, r3), onHill(HILL.t1, r3), onHill(HILL.t1, FAR), onHill(HILL.t0 + 1, FAR)]), h2, h3, { top: PLAZA, side: 0x9a8f7c });
  // The hill's roads: its own loop, the way up from the Champs-Élysées and the
  // way down to the star. Each lies a hair higher than the last, so that where
  // two of them run together their surfaces are never in one plane.
  const hillDeck = { thick: 0.5, wall: 0.5, lanes: 1, skirt: 20, step: 1.5 };
  roadDeck(k, buildPath(HILL_ROAD, true), 2.8, { ...hillDeck, lift: 0.04 });
  roadDeck(k, buildPath(HILL_DOWN_ROAD, false), 2.8, { ...hillDeck, lift: 0.05 });
  roadDeck(k, buildPath(HILL_UP_ROAD, false), 2.8, { ...hillDeck, lift: 0.06 });

  // lawns: the Champ de Mars, which runs down to the Field of Miracles
  area(k, rect(-15, 76, 11, 79.5), LAWN);
  area(k, rect(-36, 95, 12, 112.5), LAWN);
  // Victoria Tower Gardens, beside Parliament, and the Tuileries, between the Louvre and the Champs-Élysées
  area(k, rect(-60, 15, -47, 21.3), LAWN);
  area(k, [[47, -49.5], [60, -41.5], [60, -36.5], [47, -36.5]], LAWN);
  // Ace Cafe's forecourt
  area(k, rect(-83, 9, -66, 20.5), 0x55575d);

  // -------------------------------------------------------------------------
  // Streets, and the bridges that carry them over the river
  // -------------------------------------------------------------------------

  const laid: { id: string; path: Path; reach: number; lamps: number }[] = STREETS.map((s) => {
    const path = buildPath(s.segs, s.closed === true);
    street(k, path, s.opts);
    const width = s.opts?.width ?? (s.opts?.lanes ?? 2) * 5;
    return { id: s.id, path, reach: width / 2 + (s.opts?.sidewalk ?? 3), lamps: s.lamps ?? width / 2 + 1.3 };
  });
  for (const s of laid) if (s.lamps > 0) lampsAlong(k, s.path, s.lamps);

  // (London's two bridges are built with the rest of its river front)
  slabBridge(k, IENA_X - 7.5, SEINE_Z - 13.9, IENA_X + 7.5, SEINE_Z + 13.9, false, 3);
  slabBridge(k, NEUF_X - 6.5, SEINE_Z - 13.9, NEUF_X + 6.5, SEINE_Z + 13.9, false, 2);

  /** Whether a box stands clear of every street and its sidewalks. Said out loud while the tile is being built. */
  const clear = (name: string, x0: number, z0: number, x1: number, z1: number): void => {
    if (!import.meta.env.DEV) return;
    const p = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3();
    for (const s of laid) {
      let hit = false;
      for (let d = 0; d <= s.path.length && !hit; d += 1) {
        s.path.at(d, p);
        s.path.at(Math.min(s.path.length, d + 0.5), a);
        s.path.at(Math.max(0, d - 0.5), c);
        const tx = a.x - c.x, tz = a.z - c.z, l = Math.hypot(tx, tz) || 1;
        // every place across the street here, from the back of one sidewalk to the back of the other
        for (let o = -s.reach; o <= s.reach && !hit; o += 0.75) {
          const x = p.x - (tz / l) * o, z = p.z + (tx / l) * o;
          if (x > x0 + 0.2 && x < x1 - 0.2 && z > z0 + 0.2 && z < z1 - 0.2) {
            console.warn(`${name} stands in ${s.id}, near ${Math.round(x)}, ${Math.round(z)}.`);
            hit = true;
          }
        }
      }
    }
  };

  // -------------------------------------------------------------------------
  // Ordinary buildings, in each quarter's own style
  // -------------------------------------------------------------------------

  PLOTS.forEach((p, i) => clear(`plot ${i + 1}`, p.x, p.z, p.x + p.w, p.z + p.d));
  ordinaryBuildings(k, PLOTS.map((p, i): Sited => ({
    x: p.x, z: p.z, w: p.w, d: p.d, y0: 0, y1: p.h, style: p.style, tint: i, roof: p.style === 'shed' ? 'bare' : 'hip', signs: p.signs ?? '', quarter: p.quarter,
  })), RULES);

  // -------------------------------------------------------------------------
  // The things, as boxes with their numbers on
  // -------------------------------------------------------------------------

  for (const t of THINGS) {
    const y0 = t.y ?? 0, cx = t.x + t.w / 2, cz = t.z + t.d / 2;
    if (!t.shaped) {
      if (y0 === 0) clear(t.name, t.x, t.z, t.x + t.w, t.z + t.d);
      b.box(t.x, y0, t.z, t.x + t.w, y0 + t.h, t.z + t.d, BOX[t.quarter], { win: { cell: 2.6, storey: 5, lit: 0.3, kind: 0 }, seed: t.n * 0.137, top: 0x8d8a83 });
      board(k, t, cx, y0 + t.h + 12, cz);
    }
  }

  // --- London's river: Parliament and Big Ben, Westminster Bridge, Tower Bridge and the Eye ---
  parliament(k);
  westminsterBridge(k);
  towerBridge(k);
  londonEye(k);
  bridgeStreetLamps(k);

  // --- The Eiffel Tower ---
  {
    const t = thing('eiffel');
    placed(k, t.x + t.w / 2, t.z + t.d / 2, 0, (q) => eiffel(q, 14.6, t.h));
    b.box(t.x, 0, t.z, t.x + t.w, 0.05, t.z + t.d, PLAZA, { faces: 'T' });
    board(k, t, t.x + t.w + 3, 34, t.z + t.d + 3);
  }

  // --- The Arc de Triomphe: two piers and the mass above them, looking down the Champs-Élysées ---
  {
    const t = thing('arc');
    const turn = THREE.MathUtils.radToDeg(Math.atan2(-(CONCORDE[0] - ARC[0]), CONCORDE[1] - ARC[1]));
    placed(k, ARC[0], ARC[1], turn, (q) => {
      q.b.cyl(0, 0, 0, 0.2, 9, 9, 28, PLAZA);
      for (const side of [-1, 1]) q.b.box(side * 7 - (side > 0 ? 4.4 : 0), 0.2, -3.5, side * 7 + (side < 0 ? 4.4 : 0), 14, 3.5, 0xe6dcc3);
      q.b.box(-7, 14, -3.5, 7, 22, 3.5, 0xe6dcc3, { faces: 'NESWTB' });
      q.b.box(-7.4, 20.6, -3.9, 7.4, 22.6, 3.9, 0xd9cfb4);
    });
    board(k, t, ARC[0], 36, ARC[1]);
  }

  // --- The obelisk of the Concorde ---
  {
    const t = thing('concorde');
    b.cyl(CONCORDE[0], CONCORDE[1], 0, 0.25, 6, 6, 24, PLAZA);
    b.box(CONCORDE[0] - 1.6, 0.25, CONCORDE[1] - 1.6, CONCORDE[0] + 1.6, 3, CONCORDE[1] + 1.6, STONE);
    b.cyl(CONCORDE[0], CONCORDE[1], 3, 19, 1.5, 0.75, 4, 0xd9a98a, { phase: Math.PI / 4, cap: false });
    b.cyl(CONCORDE[0], CONCORDE[1], 19, 20.6, 0.75, 0.05, 4, 0xe9c94a, { phase: Math.PI / 4, cap: false });
    board(k, t, CONCORDE[0], 34, CONCORDE[1]);
  }

  // --- The Louvre: three wings round a court that opens towards the Champs-Élysées, and the pyramid in it ---
  {
    const t = thing('louvre');
    const x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, wing = 7;
    const win = { cell: 2.2, storey: 6, lit: 0.4, kind: 0 }, WALL = 0xe6dcc3, ROOF = 0x6f7883;
    clear(t.name, x0, z1 - wing, x1, z1);
    b.box(x0, 0, z1 - wing, x1, t.h, z1, WALL, { win, seed: 0.3, top: ROOF });
    b.box(x0, 0, z0, x0 + wing, t.h, z1 - wing, WALL, { win, seed: 0.5, top: ROOF, faces: 'NEWT' });
    b.box(x1 - wing, 0, z0 + 6, x1, t.h, z1 - wing, WALL, { win, seed: 0.7, top: ROOF, faces: 'NEWT' });
    b.box(x0 + wing, 0, z0 + 2, x1 - wing, 0.06, z1 - wing, PLAZA, { faces: 'T' });
    const px = (x0 + x1) / 2, pz = z0 + 7.5;
    b.cyl(px, pz, 0.06, 6.2, 6.6, 0.05, 4, 0xa9d3e6, { phase: Math.PI / 4, win: interior(1.3), cap: false });
    k.lights.push({ x: px, z: pz, r: 13, color: '#fff3dc', k: 0.6 });
    board(k, t, px, t.h + 12, z1 - 3);
  }

  // --- The Colosseum: an oval ring, open to the sky ---
  {
    const t = thing('colosseum');
    const outer = oval(COLOSSEUM.x, COLOSSEUM.z, t.w / 2, t.d / 2, 32), inner = oval(COLOSSEUM.x, COLOSSEUM.z, t.w / 2 - 4.5, t.d / 2 - 4.5, 32);
    walls(b, outer, 0, t.h, 0xdcc9a6, { win: { cell: 1.7, storey: t.h / 4, lit: 0.5, kind: 6 }, seed: 0.3 });
    walls(b, inner, 3, t.h, 0xcbb894, { inward: true });
    flat(b, outer, t.h, 0xcbb894, { holes: [inner] });
    flat(b, inner, 3, 0xd9c7a0);
    board(k, t, COLOSSEUM.x, t.h + 14, COLOSSEUM.z);
  }

  // --- The Ponte Vecchio: for people only, with houses along both its sides ---
  {
    const t = thing('ponte-vecchio');
    slabBridge(k, t.x - 0.4, t.z, t.x + t.w + 0.4, t.z + t.d, true, 2);
    for (let i = 0; i < 5; i++) {
      const x = t.x + 1.2 + i * 3.1;
      for (const z of [t.z - 1.6, t.z + t.d - 0.4]) b.box(x, -0.6, z, x + 2.7, 4.2 + (i % 2) * 0.9, z + 2.0, [0xe8c27a, 0xd9a25f, 0xf0d9a0][i % 3], { top: 0xb5654a });
    }
    board(k, t, t.x + t.w / 2, 19, t.z + t.d / 2);
  }

  // --- Lingotto: the long factory, with the test track on its roof ---
  {
    const t = thing('lingotto'), r = LINGOTTO_ROOF;
    clear(t.name, t.x, t.z, t.x + t.w, t.z + t.d);
    b.box(t.x, 0, t.z, t.x + t.w, r.y, t.z + t.d, 0xf1ede2, { win: { cell: 2.4, storey: 5, lit: 0.35, kind: 0 }, seed: 0.21, top: 0xb9b6ae });
    const track = buildPath([{ t: 'ring', pts: [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]], y: r.y, r: 5.25 }], true);
    roadDeck(k, track, 2.9, { thick: 0, wall: 0, lanes: 1, lift: 0.05, structure: false });
    board(k, t, t.x + t.w / 2, r.y + 16, t.z + 8);
  }

  // --- Pisa: the tower leans at the east end of the lawn; the cathedral is the box, and the baptistery is round ---
  placed(k, 5.5, 102, 0, (q) => pisa(q, 24));
  b.cyl(-32, 102.5, 0, 9, 4.2, 4.2, 12, BOX.italy, { cap: 0xb5654a });

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  {
    const [ax, az] = ARC, ux = CONCORDE[0] - ax, uz = CONCORDE[1] - az, ul = Math.hypot(ux, uz);
    const dx = ux / ul, dz = uz / ul;
    // a ring of plane trees round the star, broken where its avenues leave it
    const champs = Math.atan2(dz, dx), kleber = Math.atan2(-6.5 - az, IENA_X - ax), hill = Math.atan2(HILL.up[1], HILL.up[0]);
    const near = (a: number, c: number, w: number): boolean => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))) < w;
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      // (the road down from the hill comes in on a slant, so its gap is wider on the side it comes from)
      if (near(a, champs, 0.62) || near(a, kleber, 0.36) || near(a, hill + 0.5, 0.64)) continue;
      k.tree(ax + Math.cos(a) * 28, az + Math.sin(a) * 28, 0.6);
    }
    // two rows down each side of the Champs-Élysées
    for (let d = 31; d <= ul - 22; d += 5.2) {
      // (the row on the hill's side starts beyond the turning for Montmartre)
      for (const off of [-12, 12]) if (off > 0 || d > 44) k.tree(ax + dx * d - dz * off, az + dz * d + dx * off, 0.62);
    }
    // the wall of trees behind the South Bank, where London ends
    for (let z = -72; z <= -38; z += 6.5) k.tree(0.2 + (z + 72) * 0.07, z, 0.75);
    // poplars between London and Italy, and cypresses behind the factory and along the Via Emilia
    for (let z = 10; z <= 20; z += 5) k.tree(-63, z, 0.9, true);
    for (let x = -72; x <= -38; x += 5) k.tree(x, 109.5, 0.85, true);
    for (let x = 14; x <= 62; x += 6) k.tree(x, 110.5, 0.8, true);
    for (const [x, z] of [[-16, 77.5], [-9, 77.8], [4, 77.6], [10, 77.9], [-20, 42], [14, 42.5], [16, 50], [15, 58], [-21, -3], [-14, -14], [-25, -8], [66, 4], [74, 2], [82, 6], [-57, 18], [-50, 18.5], [50, -40], [56, -38.5]]) k.tree(x, z, 0.7 + rand() * 0.3);
    // on Montmartre: the wide end of the first level, and round Sacré-Cœur
    for (const [t, o, y] of [[37, 6, h1], [42, 10, h1], [38, 18, h1], [46, 22, h1], [35.5, 27, h1], [40, 33, h1], [13, 26, h3], [28.5, 26, h3], [12, 31, h3]]) {
      const [x, z] = onHill(t, o);
      if (x < 102 && z > -111) k.tree(x, z, 0.75, false, y);
    }
  }

  // -------------------------------------------------------------------------
  // People: still figures, as on a model railway
  // -------------------------------------------------------------------------

  {
    const scatter = (n: number, x0: number, z0: number, x1: number, z1: number, y = 0): void => {
      for (let i = 0; i < n; i++) k.person(x0 + rand() * (x1 - x0), z0 + rand() * (z1 - z0), y);
    };
    const ringOf = (n: number, cx: number, cz: number, r0: number, r1: number): void => {
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = r0 + rand() * (r1 - r0);
        k.person(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
      }
    };
    ringOf(14, ARC[0], ARC[1], 4.5, 8.4);
    ringOf(6, CONCORDE[0], CONCORDE[1], 2.6, 5.4);
    scatter(26, -15, 47, 11, 73); // under the Eiffel Tower
    scatter(8, -22, -16, -12, -9); // the Trocadéro
    scatter(12, -34, 97, 11, 111); // the Field of Miracles
    scatter(10, -66, 58, -44, 71); // the piazza
    scatter(8, 88, 31, 103, 34); // in front of the Duomo
    scatter(6, 70, 54.5, 86, 57.5); // on the Ponte Vecchio
    scatter(9, -82, 13.6, -67, 16.4); // Ace Cafe's forecourt
    scatter(6, -95.5, -76, -94, -48); // at the palace railings
    scatter(8, 42, -34, 68, -24); // the Louvre's court
    for (let i = 0; i < 9; i++) {
      const [x, z] = onHill(13 + rand() * 15, 24.8 + rand() * 1.6);
      k.person(x, z, h3); // the terrace below Sacré-Cœur
    }
  }

  // -------------------------------------------------------------------------
  // In the air: Concorde on a round over London and Paris, and a balloon over the left bank
  // -------------------------------------------------------------------------

  concorde(k, { x: 0, z: -4, rx: 80, rz: 90, y: 132, length: 24 });
  balloon(k, { x: -46, z: 52, r: 11, y: 56 });

  // -------------------------------------------------------------------------
  // Places for heroes, and a few parked cars
  // -------------------------------------------------------------------------

  const heroSpots: HeroSpot[] = [
    { id: 'ace-cafe', x: -75.8, y: 0.04, z: 11.6, heading: Math.PI / 2 },
    { id: 'trocadero', x: -16.5, y: 0.02, z: -7, heading: 1.25 },
    { id: 'maranello', x: -55, y: 0.02, z: 93.4, heading: 0 },
    { id: 'piazza', x: -50, y: 0.02, z: 66, heading: -0.6 },
    { id: 'lingotto-roof', x: -93.2, y: LINGOTTO_ROOF.y + 0.05, z: 57, heading: -Math.PI / 2 },
  ];
  const parked: ParkedSpot[] = [{ x: -62, y: 0.02, z: 62, heading: 1.1 }, { x: -46, y: 0.02, z: 60, heading: -2.2 }];
  // Ace Cafe's forecourt: two rows nose to tail, with the bay nearest the door kept for a hero
  for (const x of [-80, -71.6, -67.6]) parked.push({ x, y: 0.04, z: 11.6, heading: Math.PI / 2 });
  for (const x of [-80, -75.8, -71.6]) parked.push({ x, y: 0.04, z: 18, heading: -Math.PI / 2 });

  return { routes: ROUTES, parked, heroSpots };
}

export const europe: TileDef = { id: 'europe', name: 'Europe', seed: 20261119, signs: SIGNS, build };

export default europe;
