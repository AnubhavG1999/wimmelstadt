// Europe: London, Paris and Italy along one river.
//
// This is the blockout. The ground, the river, the roads and the traffic are
// as they will be. The things that will stand on the tile are plain boxes with
// their numbers on, except the few whose shape decides how a road runs: the
// bridges, the wheel, the arch and the tower with the lawn under it.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import type { V3 } from '../../engine/geo';
import { LAWN, area, flat, ground, oval, rect, terrace, walls, water, type P2 } from '../../engine/ground';
import { buildPath, type Path } from '../../engine/paths';
import { lampsAlong, roadDeck, street } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, HeroSpot, ParkedSpot, TileDef, TileParts } from '../../engine/tile';
import { bigBen, eiffel, pisa } from './landmarks';
import {
  ARC, ARNO_X, BEND_1, BEND_2, CANAL, COLOSSEUM, CONCORDE, IENA_X, ISLAND, LINGOTTO_ROOF, NEUF_X, RIVER_WIDTH, SEINE_Z, THAMES_X, THINGS,
  TOWER_Z, WATER_DROP, WESTMINSTER_Z, type Quarter, type Thing,
} from './plan';
import { ROUTES, STREETS } from './roads';

const PAVING = 0xb9b1a2, QUAY = 0xa49f93, STONE = 0xcfc6b2, WATER = 0x5f9fc4;
/** What a quarter's boxes are painted until its things are built. */
const BOX: Record<Quarter, number> = { london: 0xb98f72, paris: 0xe4d9bd, italy: 0xe6b98a };
const BOARD: Record<Quarter, string> = { london: '#c8202c', paris: '#1f4fa3', italy: '#2f8f4f' };

const SIGNS: SignDef[] = THINGS.map((t) => ({
  id: `thing-${t.id}`, lines: [String(t.n), t.name], color: BOARD[t.quarter], ink: '#ffffff', aspect: 2.2, size: [264, 120], kind: 'board',
}));

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
  const b = k.b;
  const thing = (id: string): Thing => THINGS.find((t) => t.id === id)!;

  // -------------------------------------------------------------------------
  // The ground: paving with a hole for the river, the water, the island and the hill
  // -------------------------------------------------------------------------

  const river = riverShape();
  ground(k, { color: PAVING, holes: [river] });
  water(k, river, { drop: WATER_DROP, color: WATER, quay: QUAY });
  // the Île de la Cité, shaped like a ship
  terrace(k, oval((ISLAND.x0 + ISLAND.x1) / 2, SEINE_Z, (ISLAND.x1 - ISLAND.x0) / 2, ISLAND.half, 28), -(WATER_DROP + 0.6), 0, { top: 0xd8d2c4, side: QUAY });

  // Montmartre, in three levels, in the north-east corner
  const HILL: [P2[], number][] = [
    [[[63, -112.8], [103.8, -112.8], [103.8, -61], [95, -61], [86, -66], [76, -73], [66, -80], [58, -86], [55, -94], [63, -100]], 4],
    [[[72, -112.8], [103.8, -112.8], [103.8, -70], [95, -70], [86, -75], [77, -82], [70, -89], [68, -100]], 8],
    [[[78, -112.8], [103.8, -112.8], [103.8, -82], [95, -82], [86, -86], [80, -92]], 12],
  ];
  HILL.forEach(([shape, top], i) => terrace(k, shape, top - 4, top, { top: i === 2 ? 0xd8d2c4 : LAWN, side: 0x9a8f7c }));

  // lawns: the Champ de Mars, which runs down to the Field of Miracles
  area(k, rect(-15, 76, 11, 79.5), LAWN);
  area(k, rect(-36, 95, 12, 112.5), LAWN);

  // -------------------------------------------------------------------------
  // Streets, and the bridges that carry them over the river
  // -------------------------------------------------------------------------

  const laid: { path: Path; width: number; lamps: number }[] = STREETS.map((s) => {
    const path = buildPath(s.segs, s.closed === true);
    street(k, path, s.opts);
    const width = s.opts?.width ?? (s.opts?.lanes ?? 2) * 5;
    return { path, width, lamps: s.lamps ?? width / 2 + 1.3 };
  });
  for (const s of laid) if (s.lamps > 0) lampsAlong(k, s.path, s.lamps);

  const tx0 = THAMES_X - 10.4, tx1 = THAMES_X + 10.4;
  slabBridge(k, tx0, TOWER_Z - 7.5, tx1, TOWER_Z + 7.5, true, 0);
  slabBridge(k, tx0, WESTMINSTER_Z - 7.5, tx1, WESTMINSTER_Z + 7.5, true, 3);
  slabBridge(k, IENA_X - 7.5, SEINE_Z - 13.9, IENA_X + 7.5, SEINE_Z + 13.9, false, 3);
  slabBridge(k, NEUF_X - 6.5, SEINE_Z - 13.9, NEUF_X + 6.5, SEINE_Z + 13.9, false, 2);

  // -------------------------------------------------------------------------
  // The things, as boxes with their numbers on
  // -------------------------------------------------------------------------

  for (const t of THINGS) {
    const y0 = t.y ?? 0, cx = t.x + t.w / 2, cz = t.z + t.d / 2;
    if (!t.built) {
      b.box(t.x, y0, t.z, t.x + t.w, y0 + t.h, t.z + t.d, BOX[t.quarter], { win: { cell: 2.6, storey: 5, lit: 0.3, kind: 0 }, seed: t.n * 0.137, top: 0x8d8a83 });
      board(k, t, cx, y0 + t.h + 12, cz);
    }
  }

  // --- Tower Bridge: two towers astride the road, and the walkways between their tops ---
  {
    const t = thing('tower-bridge');
    for (const x of [THAMES_X - 6.5, THAMES_X + 6.5]) {
      for (const side of [-1, 1]) b.box(x - 2.6, -(WATER_DROP + 0.6), TOWER_Z + side * 8.2 - 1.8, x + 2.6, 30, TOWER_Z + side * 8.2 + 1.8, 0xb9ad96);
      b.box(x - 2.6, 9, TOWER_Z - 6.4, x + 2.6, 30, TOWER_Z + 6.4, 0xb9ad96, { faces: 'NESWTB' });
      b.cyl(x, TOWER_Z, 30, 36, 7.4, 0.3, 4, 0x4a4f55, { phase: Math.PI / 4, cap: false });
    }
    for (const z of [TOWER_Z - 5.5, TOWER_Z + 5.5]) b.box(THAMES_X - 4, 25, z - 0.6, THAMES_X + 4, 27.5, z + 0.6, 0x6fa3c7, { faces: 'NESWTB' });
    board(k, t, THAMES_X, 50, TOWER_Z);
  }

  // --- The London Eye: a wheel over the water's edge, on two legs ---
  {
    const t = thing('eye');
    const cx = THAMES_X + 9.4, cz = t.z + t.d / 2, hub = 24.5, R = 21;
    const rim: V3[] = [];
    for (let i = 0; i <= 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      rim.push([cx, hub + Math.sin(a) * R, cz + Math.cos(a) * R]);
    }
    b.sweep(rim, rim.map(() => 0.45), 0xf2f2f2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.beam([cx, hub, cz], [cx, hub + Math.sin(a) * R, cz + Math.cos(a) * R], 0.16, 0.12, 0xdadada);
      b.box(cx - 1.1, hub + Math.sin(a) * (R + 1.4) - 0.9, cz + Math.cos(a) * (R + 1.4) - 1.3, cx + 1.1, hub + Math.sin(a) * (R + 1.4) + 0.9, cz + Math.cos(a) * (R + 1.4) + 1.3, 0xbfe0ee);
    }
    for (const side of [-1, 1]) b.beam([cx + 5.5, 0, cz + side * 9], [cx + 0.6, hub, cz], 0.6, 0.45, 0xf2f2f2);
    b.box(cx - 0.6, hub - 0.8, cz - 0.8, cx + 1.4, hub + 0.8, cz + 0.8, 0xdadada, { faces: 'NESWTB' });
    board(k, t, cx + 5, 58, cz);
  }

  // --- Big Ben, at the north end of Parliament, by Westminster Bridge ---
  placed(k, -51, -18.5, 0, (q) => bigBen(q, 56));

  // --- The Eiffel Tower ---
  {
    const t = thing('eiffel');
    placed(k, t.x + t.w / 2, t.z + t.d / 2, 0, (q) => eiffel(q, 14.6, t.h));
    b.box(t.x, 0, t.z, t.x + t.w, 0.05, t.z + t.d, 0xd8d2c4, { faces: 'T' });
    board(k, t, t.x + t.w + 3, 34, t.z + t.d + 3);
  }

  // --- The Arc de Triomphe: two piers and the mass above them, looking down the Champs-Élysées ---
  {
    const t = thing('arc');
    const turn = THREE.MathUtils.radToDeg(Math.atan2(-(CONCORDE[0] - ARC[0]), CONCORDE[1] - ARC[1]));
    placed(k, ARC[0], ARC[1], turn, (q) => {
      q.b.cyl(0, 0, 0, 0.2, 9, 9, 28, 0xd8d2c4);
      for (const side of [-1, 1]) q.b.box(side * 7 - (side > 0 ? 4.4 : 0), 0.2, -3.5, side * 7 + (side < 0 ? 4.4 : 0), 14, 3.5, 0xe6dcc3);
      q.b.box(-7, 14, -3.5, 7, 22, 3.5, 0xe6dcc3, { faces: 'NESWTB' });
      q.b.box(-7.4, 20.6, -3.9, 7.4, 22.6, 3.9, 0xd9cfb4);
    });
    board(k, t, ARC[0], 36, ARC[1]);
  }

  // --- The obelisk of the Concorde ---
  {
    const t = thing('concorde');
    b.cyl(CONCORDE[0], CONCORDE[1], 0, 0.25, 6, 6, 24, 0xd8d2c4);
    b.box(CONCORDE[0] - 1.6, 0.25, CONCORDE[1] - 1.6, CONCORDE[0] + 1.6, 3, CONCORDE[1] + 1.6, 0xcfc6b2);
    b.cyl(CONCORDE[0], CONCORDE[1], 3, 19, 1.5, 0.75, 4, 0xd9a98a, { phase: Math.PI / 4, cap: false });
    b.cyl(CONCORDE[0], CONCORDE[1], 19, 20.6, 0.75, 0.05, 4, 0xe9c94a, { phase: Math.PI / 4, cap: false });
    board(k, t, CONCORDE[0], 34, CONCORDE[1]);
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
    b.box(t.x, 0, t.z, t.x + t.w, r.y, t.z + t.d, 0xf1ede2, { win: { cell: 2.4, storey: 5, lit: 0.35, kind: 0 }, seed: 0.21, top: 0xb9b6ae });
    const track = buildPath([{ t: 'ring', pts: [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]], y: r.y, r: 5.25 }], true);
    roadDeck(k, track, 2.9, { thick: 0, wall: 0, lanes: 1, lift: 0.05, structure: false });
    board(k, t, t.x + t.w / 2, r.y + 16, t.z + 8);
  }

  // --- Pisa: the tower leans at the east end of the lawn; the cathedral is the box, and the baptistery is round ---
  placed(k, 5.5, 102, 0, (q) => pisa(q, 24));
  b.cyl(-32, 102.5, 0, 9, 4.2, 4.2, 12, BOX.italy, { cap: 0xb5654a });

  // -------------------------------------------------------------------------
  // Places for heroes, and a few parked cars
  // -------------------------------------------------------------------------

  const heroSpots: HeroSpot[] = [
    { id: 'ace-cafe', x: -95.5, y: 0.02, z: 0, heading: 0 },
    { id: 'trocadero', x: -16.5, y: 0.02, z: -7, heading: 1.25 },
    { id: 'maranello', x: -55, y: 0.02, z: 93.4, heading: 0 },
    { id: 'piazza', x: -50, y: 0.02, z: 66, heading: -0.6 },
    { id: 'lingotto-roof', x: -93.2, y: LINGOTTO_ROOF.y + 0.05, z: 57, heading: -Math.PI / 2 },
  ];
  const parked: ParkedSpot[] = [
    { x: -101, y: 0.02, z: -2, heading: 0.3 },
    { x: -89.5, y: 0.02, z: 2.5, heading: -0.2 },
    { x: -62, y: 0.02, z: 62, heading: 1.1 },
  ];

  return { routes: ROUTES, parked, heroSpots };
}

export const europe: TileDef = { id: 'europe', name: 'Europe', seed: 20261119, signs: SIGNS, build };

export default europe;
