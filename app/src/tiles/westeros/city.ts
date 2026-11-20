// Builds everything that stands still on Westeros, and sets the dragons flying.
//
// The plan is in plan.ts. The ground is laid by land.ts and the roads by
// roads.ts. What stands on the ground is built region by region, each in a
// file of its own (regions.ts lists them). A lot that no region has built yet
// stands as a plain box with its name on a board.

import { checkRoads, type Solid } from '../../engine/checks';
import type { Build, TileParts } from '../../engine/tile';
import { buildCountry } from './country';
import { buildDragons } from './dragons';
import { buildLand } from './land';
import { BOARDS } from './look';
import type { Model } from './models';
import { GATES, HERO_SPOTS, LOTS, WALL, type Lot } from './plan';
import { REGIONS } from './regions';
import { buildRoads, buildWaysideFires } from './roads';
import { buildShips } from './ships';
import { checkSight } from './sight';
import { WAYFARERS } from './wayfarers';

const ICE = 0xcfe4ee, ICE_SHADE = 0xb4d0de, STONE = 0xb8b2a6, ROCK = 0x9a948a;

/** A lot that is still only a box, with its name on a board that faces the view the tile opens with. */
function box(k: Build, l: Lot): void {
  if (l.id === 'wall') return wallBlock(k);
  const rock = l.id.startsWith('frostfangs') || l.id.startsWith('vale') || l.id.startsWith('casterly') || l.id === 'dragonmont';
  k.b.box(l.x0, 0, l.z0, l.x1, l.top, l.z1, rock ? ROCK : STONE, { seed: l.x0 * 0.13 + l.z0 * 0.07 });
  if (l.part || !l.name) return;
  // the camera stands in the south-south-east: 0.67 east and 0.74 south
  k.sign(`box-${l.id}`, (l.x0 + l.x1) / 2, l.top + 2.4, (l.z0 + l.z1) / 2, 0.669, 0.743, 2.6, 22);
}

/** The Wall as a block of ice that leans back: a face to the south, a walk on top, a face to the north. */
function wallBlock(k: Build): void {
  const b = k.b, W = WALL;
  b.quad([W.x0, 0, W.south], [W.x1, 0, W.south], [W.x1, W.top, W.topSouth], [W.x0, W.top, W.topSouth], [0, 0.07, 1], ICE);
  b.quad([W.x1, 0, W.north], [W.x0, 0, W.north], [W.x0, W.top, W.topNorth], [W.x1, W.top, W.topNorth], [0, 0.05, -1], ICE_SHADE);
  b.quad([W.x0, W.top, W.topSouth], [W.x1, W.top, W.topSouth], [W.x1, W.top, W.topNorth], [W.x0, W.top, W.topNorth], [0, 1, 0], 0xe8f1f5);
  // its east end, where it stops at Eastwatch
  b.quad([W.x1, 0, W.south], [W.x1, 0, W.north], [W.x1, W.top, W.topNorth], [W.x1, W.top, W.topSouth], [1, 0, 0], ICE_SHADE);
}

export function buildWesteros(k: Build): TileParts {
  // On the development server, `?bare` leaves the ground empty: a clear stage for looking at a dragon from every side.
  const bare = import.meta.env.DEV && new URLSearchParams(location.search).has('bare');
  const regions = Object.entries(REGIONS);
  BOARDS.length = 0;

  // what each part of the tile costs in triangles that stand still, for the console
  const cost = new Map<string, number>(), dear: [string, number][] = [];
  const counted = <T>(what: string, fn: () => T): T => {
    const before = k.b.triangles + k.street.triangles + k.deck.triangles;
    try {
      return fn();
    } finally {
      cost.set(what, (cost.get(what) ?? 0) + k.b.triangles + k.street.triangles + k.deck.triangles - before);
    }
  };

  counted('the land', () => buildLand(k, new Set(bare ? [] : regions.flatMap(([, r]) => r.FLOORED))));
  const routes = bare ? [] : counted('the roads', () => buildRoads(k));

  if (!bare) {
    const models = new Map<string, [string, Model]>(regions.flatMap(([name, r]) => Object.entries(r.MODELS).map(([id, m]): [string, [string, Model]] => [id, [name, m]])));
    const covered = new Set(regions.flatMap(([, r]) => r.COVERS));
    for (const l of LOTS) {
      const model = models.get(l.id);
      if (!model) {
        if (!covered.has(l.id)) box(k, l);
        continue;
      }
      try {
        const before = k.b.triangles;
        counted(model[0], () => model[1](k, l));
        dear.push([l.id, k.b.triangles - before]);
      } catch (e) {
        // one model that fails does not take the tile with it: its lot stands as a box, and the console says why
        console.error(`Westeros: the model of ${l.id} failed.`, e);
        box(k, l);
      }
    }
    for (const [name, r] of regions) {
      try {
        const before = k.b.triangles;
        counted(name, () => r.extras(k));
        dear.push([`what ${name} builds besides`, k.b.triangles - before]);
      } catch (e) {
        console.error(`Westeros: what ${name} builds besides its lots failed.`, e);
      }
    }
    // fires by the wayside: after the castles, whose boards they keep off, and before the country, which keeps off them
    counted('the roads', () => buildWaysideFires(k));
    try {
      counted('the open country', () => buildCountry(k));
    } catch (e) {
      console.error('Westeros: the open country failed.', e);
    }
    buildShips(k);
  }
  if (import.meta.env.DEV && !bare) {
    const all = [...cost.values()].reduce((s, n) => s + n, 0);
    console.info(`Westeros: ${all} triangles stand still. ${[...cost].sort((a, b) => b[1] - a[1]).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    console.info(`Westeros: the dearest lots: ${dear.sort((a, b) => b[1] - a[1]).slice(0, 30).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
  }

  buildDragons(k);

  if (import.meta.env.DEV && !bare) {
    // a road may run through a gate, and round the drum of Storm's End, which is round where its lot is square
    const open = new Set([...GATES.map((g) => g.lot), 'se-drum']);
    const solids: Solid[] = LOTS.filter((l) => !open.has(l.id)).map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: 0, y1: l.top }));
    checkRoads('Westeros', routes, {}, solids);
    checkSight();
  }

  return {
    routes,
    // on the bare stage one of each kind of traveller stands in a row, to be looked at
    parked: bare ? WAYFARERS.map((w, i) => ({ x: -42 + i * 13, y: 0, z: 30, heading: 0, type: w.name })) : [],
    heroSpots: bare ? [] : HERO_SPOTS.map((s) => ({ id: s.id, x: s.x, y: 0.03, z: s.z, heading: s.heading })),
    kinds: WAYFARERS,
  };
}
