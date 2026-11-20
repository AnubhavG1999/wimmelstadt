// Builds everything that stands still on the Iron Rain, and sets going what
// moves.
//
// The plan is in plan.ts. The ground is laid by land.ts and the roads by
// roads.ts. What stands on the ground is built region by region, each in a
// file of its own (regions.ts lists them). A lot that no region builds, or
// whose model fails, stands as a plain box with its name on a board, so the
// tile is whole at every stage.

import { checkLanes, roadFaults, throughSolids, type Solid } from '../../engine/checks';
import type { Build, TileParts } from '../../engine/tile';
import { aim, close, fourViews, frames, look, sheet } from './debug';
import { buildLand, landAt } from './land';
import { BOARDS, STONE, boardOf, nameBoard } from './look';
import type { Model } from './models';
import { HERO_SPOTS, LOTS, type Lot } from './plan';
import { REGIONS } from './regions';
import { buildRoads, cutRoads } from './roads';
import { checkSight } from './sight';
import { skyBlockout } from './sky-blockout';

/** Lots that a road runs through: while they are boxes, a tower at each corner and nothing between. */
const HOLLOW = new Set(['north-gate', 'south-gate']);

/** A lot as a plain box on the ground it stands on, with its name on a board on its roof. */
function box(k: Build, l: Lot): void {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y0 = Math.min(landAt(l.x0, l.z0), landAt(l.x1, l.z1), landAt(cx, cz)), top = Math.max(y0 + 0.5, l.top);
  if (HOLLOW.has(l.id)) {
    const t = Math.min(3, (l.x1 - l.x0) / 4, (l.z1 - l.z0) / 4);
    for (const [x, z] of [[l.x0, l.z0], [l.x1 - t, l.z0], [l.x0, l.z1 - t], [l.x1 - t, l.z1 - t]]) k.b.box(x, y0, z, x + t, top, z + t, STONE);
    if (l.name) nameBoard(k, boardOf(l.name), l.x1 - t / 2, l.z1 - t / 2, top);
    return;
  }
  k.b.box(l.x0, y0 - 0.5, l.z0, l.x1, top, l.z1, STONE, { seed: l.x0 * 0.13 + l.z0 * 0.07 });
  if (l.name) nameBoard(k, boardOf(l.name), cx, cz, top);
}

export function buildIronRain(k: Build): TileParts {
  BOARDS.length = 0;
  const regions = Object.entries(REGIONS);

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

  cutRoads();
  counted('the land', () => buildLand(k));
  const routes = counted('the roads', () => buildRoads(k));

  const models = new Map<string, [string, Model]>(regions.flatMap(([name, r]) => Object.entries(r.MODELS).map(([id, m]): [string, [string, Model]] => [id, [name, m]])));
  const covered = new Set(regions.flatMap(([, r]) => r.COVERS));
  for (const l of LOTS) {
    const model = models.get(l.id);
    if (!model) {
      if (!l.part && !covered.has(l.id)) counted('the blockout', () => box(k, l));
      continue;
    }
    try {
      const before = k.b.triangles;
      counted(model[0], () => model[1](k, l));
      dear.push([l.id, k.b.triangles - before]);
    } catch (e) {
      // one model that fails does not take the tile with it: its lot stands as a box, and the console says why
      console.error(`The Iron Rain: the model of ${l.id} failed.`, e);
      box(k, l);
    }
  }
  for (const [name, r] of regions) {
    try {
      const before = k.b.triangles;
      counted(name, () => r.extras(k));
      dear.push([`what ${name} builds besides`, k.b.triangles - before]);
    } catch (e) {
      console.error(`The Iron Rain: what ${name} builds besides its lots failed.`, e);
    }
  }
  // the fleet and the Rain, where they will be, until they are built
  skyBlockout(k);
  // the screen, until the towers' builder hangs it: on the south face of the tower that carries it
  if (!models.has('tower-4')) {
    const t = LOTS.find((l) => l.id === 'tower-4')!;
    const cx = (t.x0 + t.x1) / 2;
    k.b.box(cx - 5.6, 46.2, t.z1, cx + 5.6, 53.2, t.z1 + 0.12, 0x16181c);
    k.sign('forecast', cx, 49.7, t.z1 + 0.15, 0, 1, 6.5, 11);
  }

  if (import.meta.env.DEV) {
    const all = [...cost.values()].reduce((s, n) => s + n, 0);
    console.info(`The Iron Rain: ${all} triangles stand still. ${[...cost].sort((a, b) => b[1] - a[1]).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    if (dear.length > 0) console.info(`The Iron Rain: the dearest lots: ${dear.sort((a, b) => b[1] - a[1]).slice(0, 20).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    // roads run through the gates, and cut into the canyon's wall
    const open = new Set(['north-gate', 'south-gate']);
    const solids: Solid[] = LOTS.filter((l) => !l.part && !open.has(l.id)).map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: 0, y1: l.top }));
    // routes share the loop's lanes on purpose, so the checks for shared lanes are the ones that apply
    const faults = [...roadFaults(routes), ...throughSolids(routes, solids)];
    if (faults.length > 0) console.warn(`The Iron Rain: roads:\n  ${faults.join('\n  ')}`);
    else console.info('The Iron Rain: no route crosses another, none meets another head-on, and none runs through anything built.');
    const lanes = checkLanes('The Iron Rain', routes, k.b, { people: k.people });
    checkSight();
    // For the console: pictures with `wimmel.shot`, which leaves the heroes out. rr.fourViews(name, x, y, z, r)
    // takes a thing from two opposite sides by day and by night; rr.close(name, { ...rr.aim(x, y, z, az, elev), zoom }, part)
    // takes one close picture.
    (window as unknown as { rr: object }).rr = { lanes, frames, look, close, aim, sheet, fourViews, landAt };
  }

  return {
    routes,
    parked: [],
    heroSpots: HERO_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z, heading: s.heading })),
  };
}
