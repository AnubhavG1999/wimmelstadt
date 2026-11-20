// Builds everything that stands still on Blackwater Bay, and sets going what
// moves.
//
// The plan is in plan.ts. The ground is laid by land.ts and the roads by
// roads.ts. While the tile is blocked out, every lot stands as a plain box
// with its name on a board, and each dragon's home is marked on the ground.

import { checkLanes, checkRoads, type Solid } from '../../engine/checks';
import { lathe } from '../../engine/parts';
import type { Build, TileParts } from '../../engine/tile';
import { STONE, buildLand, landAt } from './land';
import { BOARDS, nameBoard } from './look';
import { HERO_SPOTS, HOMES, LENGTH, LOTS, RHAENYS, type Lot } from './plan';
import { buildRoads } from './roads';
import { checkSight } from './sight';
import { DRAGON_NAMES, boardOf } from './signs';
import { TRAFFIC } from './traffic';

/** Lots that the blockout builds in a shape of their own, not as a box. */
const SHAPED = new Set(['dragonpit']);
/** Lots that a road runs into or through: in the blockout, a tower at each corner and nothing between. */
const HOLLOW = new Set(['iron-gate', 'river-gate', 'drovers-pen', 'duskendale', 'ds-castle', 'high-tide']);

/** A lot that a road runs through, as four corner towers. */
function hollow(k: Build, l: Lot): void {
  const t = Math.min(2.2, (l.x1 - l.x0) / 4, (l.z1 - l.z0) / 4);
  for (const [x, z] of [[l.x0, l.z0], [l.x1 - t, l.z0], [l.x0, l.z1 - t], [l.x1 - t, l.z1 - t]]) {
    const y0 = landAt(x + t / 2, z + t / 2);
    k.b.box(x, y0, z, x + t, Math.max(y0 + 0.5, l.top), z + t, STONE);
  }
  if (l.name) nameBoard(k, boardOf(l.name), l.x1 - t / 2, l.z1 - t / 2, l.top);
}

/** A lot as a plain box on the ground it stands on, with its name on a board on its roof. */
function box(k: Build, l: Lot): void {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y0 = landAt(cx, cz), top = Math.max(y0 + 0.5, l.top);
  k.b.box(l.x0, y0, l.z0, l.x1, top, l.z1, STONE, { seed: l.x0 * 0.13 + l.z0 * 0.07 });
  if (l.name) nameBoard(k, boardOf(l.name), cx, cz, top);
}

/** The Dragonpit, roughly, so that it reads in the blockout: a drum and a dome on its terrace. */
function dragonpitBlock(k: Build): void {
  const R = RHAENYS, [x, z] = R.c;
  k.b.cyl(x, z, R.y, R.wall, R.drum, R.drum, 40, 0xb4746a, { cap: false });
  const rings: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    rings.push([R.drum * Math.cos(a), R.wall + (R.dome - R.wall) * Math.sin(a)]);
  }
  lathe(k.b, x, z, rings, 40, 0x9a6a5c);
  nameBoard(k, boardOf('The Dragonpit'), -24, -6, R.y);
}

/**
 * The board for the music, at the top of the climb on the forecourt's south
 * edge, west of where the road comes up: two timber posts, and the screen on
 * a dark backing between them, facing the view the tile opens with.
 */
function giveWayBoard(k: Build): void {
  const x = -49, z = -5.2, y = RHAENYS.y, f = [0.669, 0.743], h = 4.6;
  const w = k.sign('give-way', x, y + 2.6 + h / 2, z, f[0], f[1], h, 9);
  const ax = -f[1], az = f[0];
  for (const s of [-1, 1]) k.b.beam([x + ax * s * (w / 2 + 0.25) - f[0] * 0.15, y, z + az * s * (w / 2 + 0.25) - f[1] * 0.15], [x + ax * s * (w / 2 + 0.25) - f[0] * 0.15, y + 3.0 + h, z + az * s * (w / 2 + 0.25) - f[1] * 0.15], 0.22, 0.2, 0x5a3b22);
  k.b.obox(x - f[0] * 0.1, y + 2.6 + h / 2, z - f[1] * 0.1, w / 2 + 0.2, h / 2 + 0.2, 0.06, Math.atan2(az, ax), 0x2b1d12, { faces: 'B' });
}

/** Each dragon's home, marked: the ground it will lie on, dark, and a board with its name. */
function homesBlock(k: Build): void {
  Object.entries(HOMES).forEach(([id, h], i) => {
    const L = LENGTH[id], a = (h.facing * Math.PI) / 180, fx = Math.cos(a), fz = Math.sin(a);
    // from its feet to the reach of its head, and as wide as its braced wings
    const back = 0.17 * L, front = 0.34 * L, half = 0.13 * L, mid = (front - back) / 2;
    k.b.obox(h.x + fx * mid, h.y + 0.06, h.z + fz * mid, (front + back) / 2, 0.06, half, -a, 0x2a1c2c);
    nameBoard(k, boardOf(DRAGON_NAMES[i]), h.x + fx * (front + 1.5), h.z + fz * (front + 1.5), h.y);
  });
}

export function buildBlackwaterBay(k: Build): TileParts {
  BOARDS.length = 0;
  const cost = new Map<string, number>();
  const counted = <T>(what: string, fn: () => T): T => {
    const before = k.b.triangles + k.street.triangles + k.deck.triangles;
    try {
      return fn();
    } finally {
      cost.set(what, (cost.get(what) ?? 0) + k.b.triangles + k.street.triangles + k.deck.triangles - before);
    }
  };

  counted('the land', () => buildLand(k));
  const routes = counted('the roads', () => buildRoads(k));
  counted('the blockout', () => {
    for (const l of LOTS) {
      if (l.part || SHAPED.has(l.id)) continue;
      if (HOLLOW.has(l.id)) hollow(k, l);
      else box(k, l);
    }
    dragonpitBlock(k);
    homesBlock(k);
    giveWayBoard(k);
  });

  if (import.meta.env.DEV) {
    const all = [...cost.values()].reduce((s, n) => s + n, 0);
    console.info(`Blackwater Bay: ${all} triangles stand still. ${[...cost].sort((a, b) => b[1] - a[1]).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    // a road may run through a gate, and the climb runs up onto the terrace
    const open = new Set(['iron-gate', 'river-gate', 'duskendale', 'ds-castle', 'high-tide', 'drovers-pen']);
    const solids: Solid[] = LOTS.filter((l) => !l.part && !open.has(l.id)).map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: 0, y1: l.top }));
    checkRoads('Blackwater Bay', routes, {}, solids);
    const lanes = checkLanes('Blackwater Bay', routes, k.b, { kinds: TRAFFIC, people: k.people });
    (window as unknown as { blackwater: object }).blackwater = { lanes };
    checkSight();
  }

  return {
    routes,
    parked: [],
    heroSpots: HERO_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z, heading: s.heading })),
    kinds: TRAFFIC,
  };
}
