// Builds everything that stands still on Blackwater Bay, and sets going what
// moves.
//
// The plan is in plan.ts. The ground is laid by land.ts and the roads by
// roads.ts. What stands on the ground is built region by region, each in a
// file of its own (regions.ts lists them). A lot that no region builds, or
// whose model fails, stands as a plain box with its name on a board, so the
// tile is whole at every stage.

import { checkLanes, checkRoads, type Solid } from '../../engine/checks';
import { lathe } from '../../engine/parts';
import type { Build, TileParts } from '../../engine/tile';
import { aim, close, fourViews, frames, look, sheet } from './debug';
import { STONE, buildLand, landAt } from './land';
import { BOARDS, nameBoard } from './look';
import type { Model } from './models';
import { HERO_SPOTS, LOTS, RHAENYS, type Lot } from './plan';
import { REGIONS } from './regions';
import { buildRoads } from './roads';
import { checkSight } from './sight';
import { buildTide, pinTide } from './tide';
import { boardOf } from './signs';
import { TRAFFIC } from './traffic';

/** Lots that a road runs into or through: while they are boxes, a tower at each corner and nothing between. */
const HOLLOW = new Set(['iron-gate', 'river-gate', 'drovers-pen', 'duskendale', 'ds-castle', 'high-tide']);

/** A lot as a plain box on the ground it stands on, with its name on a board on its roof. */
function box(k: Build, l: Lot): void {
  if (l.id === 'dragonpit') return dragonpitBlock(k);
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, y0 = landAt(cx, cz), top = Math.max(y0 + 0.5, l.top);
  if (HOLLOW.has(l.id)) {
    // a tower at each corner, so that the road through it stays clear
    const t = Math.min(2.2, (l.x1 - l.x0) / 4, (l.z1 - l.z0) / 4);
    for (const [x, z] of [[l.x0, l.z0], [l.x1 - t, l.z0], [l.x0, l.z1 - t], [l.x1 - t, l.z1 - t]]) {
      const y = landAt(x + t / 2, z + t / 2);
      k.b.box(x, y, z, x + t, Math.max(y + 0.5, l.top), z + t, STONE);
    }
    if (l.name) nameBoard(k, boardOf(l.name), l.x1 - t / 2, l.z1 - t / 2, l.top);
    return;
  }
  k.b.box(l.x0, y0, l.z0, l.x1, top, l.z1, STONE, { seed: l.x0 * 0.13 + l.z0 * 0.07 });
  if (l.name) nameBoard(k, boardOf(l.name), cx, cz, top);
}

/** The Dragonpit, roughly, so that it reads while it is a box: a drum and a dome on its terrace. */
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

export function buildBlackwaterBay(k: Build): TileParts {
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

  counted('the land', () => buildLand(k));
  buildTide(k);
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
      console.error(`Blackwater Bay: the model of ${l.id} failed.`, e);
      box(k, l);
    }
  }
  for (const [name, r] of regions) {
    try {
      const before = k.b.triangles;
      counted(name, () => r.extras(k));
      dear.push([`what ${name} builds besides`, k.b.triangles - before]);
    } catch (e) {
      console.error(`Blackwater Bay: what ${name} builds besides its lots failed.`, e);
    }
  }
  if (import.meta.env.DEV) {
    const all = [...cost.values()].reduce((s, n) => s + n, 0);
    console.info(`Blackwater Bay: ${all} triangles stand still. ${[...cost].sort((a, b) => b[1] - a[1]).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    console.info(`Blackwater Bay: the dearest lots: ${dear.sort((a, b) => b[1] - a[1]).slice(0, 20).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    // a road may run through a gate, into the pen's yard and High Tide's court, and through Dragonstone's castle and Duskendale
    const open = new Set(['iron-gate', 'river-gate', 'duskendale', 'ds-castle', 'high-tide', 'drovers-pen']);
    const solids: Solid[] = LOTS.filter((l) => !l.part && !open.has(l.id)).map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: 0, y1: l.top }));
    checkRoads('Blackwater Bay', routes, {}, solids);
    const lanes = checkLanes('Blackwater Bay', routes, k.b, { kinds: TRAFFIC, people: k.people });
    checkSight();
    // For the console: pictures with `wimmel.shot`, which leaves the heroes out. blackwater.fourViews(name, x, y, z, r)
    // takes a thing from two opposite sides by day and by night; blackwater.close(name, { ...blackwater.aim(x, y, z, az, elev), zoom }, part)
    // takes one close picture.
    (window as unknown as { blackwater: object }).blackwater = { lanes, frames, look, close, aim, sheet, fourViews, tide: pinTide };
  }

  return {
    routes,
    parked: [],
    heroSpots: HERO_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z, heading: s.heading })),
    kinds: TRAFFIC,
  };
}
