// Builds everything that stands still on Gotham.
//
// The plan is in plan.ts. The ground is laid by land.ts and the roads by
// roads.ts. What stands on the ground is built region by region, each in a
// file of its own (regions.ts lists them). A lot that no region builds, or
// whose model fails, stands as a plain box with its name on a board, so the
// tile is whole at every stage.

import * as THREE from 'three';
import { checkLanes, checkRoads, type Solid } from '../../engine/checks';
import type { V3 } from '../../engine/geo';
import type { Build, TileParts } from '../../engine/tile';
import { aim, close, fourViews, frames, look, sheet } from './debug';
import { buildLand, landAt } from './land';
import { buildLife } from './life';
import { BOARDS, STONE, STONE_DARK, STONE_LIGHT, boardOf, nameBoard } from './look';
import type { Model } from './models';
import { HERO_SPOTS, LOTS, groundAt, lotOf, type Lot } from './plan';
import { REGIONS } from './regions';
import { MIDDLES, SPANS, buildRoads } from './roads';
import { checkSight } from './sight';
import { KINDS } from './traffic';

/** A lot as a plain box on the level it stands on, with its name on a board on its roof. */
function box(k: Build, l: Lot): void {
  const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  const tone = [STONE, STONE_DARK, STONE_LIGHT][Math.abs(Math.round(l.x0 * 3 + l.z0 * 7)) % 3];
  k.b.box(l.x0, Math.max(-1.2, l.base - 0.5), l.z0, l.x1, Math.max(l.base + 0.5, l.top), l.z1, tone, { seed: l.x0 * 0.13 + l.z0 * 0.07, win: { cell: 2, storey: 4, lit: 0.8, kind: 6 } });
  if (l.name) nameBoard(k, boardOf(l.name), cx, cz, l.top);
}

/**
 * While the bridges are not built: a plain slab under every road where it
 * runs over water, so that a road does not hang in the air as a sheet.
 */
function slabs(k: Build, covered: Set<string>): void {
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  const over: Record<string, string> = { circuit: 'trigate', river: 'trigate', 'ring-trigate': 'trigate', 'arkham-arm': 'trigate', ring: 'bascules' };
  for (const [id, path] of Object.entries(MIDDLES)) {
    if (!(id in over) || covered.has(over[id])) continue;
    // the river road's and River Street's ends over the reach are the Trigate's arms
    const half = id.startsWith('ring-') ? 3.6 : id === 'ring' ? 7.2 : 5.6, thick = 1.1;
    const n = Math.ceil(path.length / 1.5);
    for (let i = 0; i < n; i++) {
      path.at((i / n) * path.length, p);
      path.at(((i + 1) / n) * path.length, q);
      const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
      if (groundAt(mx, mz) >= 0) continue;
      const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, rx = (-dz / l) * half, rz = (dx / l) * half;
      const y1 = p.y - 0.02, y0 = p.y - thick;
      const a: V3 = [p.x - rx, y0, p.z - rz], b: V3 = [p.x + rx, y0, p.z + rz], c: V3 = [q.x + rx, y0, q.z + rz], d: V3 = [q.x - rx, y0, q.z - rz];
      const up = (v: V3): V3 => [v[0], y1, v[2]];
      k.b.quad(a, b, c, d, [0, -1, 0], STONE_DARK);
      k.b.quad(a, d, up(d), up(a), [-rx / half, 0, -rz / half], STONE);
      k.b.quad(c, b, up(b), up(c), [rx / half, 0, rz / half], STONE);
      // and a strip of paving under the street's sidewalks, where it has them
      k.b.quad(up(a), up(b), up(c), up(d), [0, 1, 0], STONE_LIGHT);
    }
  }
}

/**
 * While the Cobblepot Bridge is not built: two plain stone towers, each two
 * piers with a beam between them over the road, and a cable from tower to
 * tower and down to each end, so that the deck reads as a bridge.
 */
function bridgeTowers(k: Build): void {
  const S = SPANS.cobblepot, dx = S.b[0] - S.a[0], dz = S.b[1] - S.a[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, yaw = Math.atan2(uz, ux);
  const top = 30, at = [8, l - 8];
  for (const side of [-1, 1]) {
    const ox = -uz * side * (S.half + 1.1), oz = ux * side * (S.half + 1.1);
    for (const s of at) k.b.obox(S.a[0] + ux * s + ox, top / 2 - 0.75, S.a[1] + uz * s + oz, 1.6, top / 2 + 0.75, 1.1, yaw, STONE);
    const p = (s: number, y: number): V3 => [S.a[0] + ux * s + ox, y, S.a[1] + uz * s + oz];
    k.b.beam(p(-4, S.y + 1), p(at[0], top - 1), 0.22, 0.22, STONE_DARK);
    k.b.beam(p(at[1], top - 1), p(l + 4, S.y), 0.22, 0.22, STONE_DARK);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const sag = (f: number): number => top - 1 - 14 * 4 * f * (1 - f);
      k.b.beam(p(at[0] + ((at[1] - at[0]) * i) / n, sag(i / n)), p(at[0] + ((at[1] - at[0]) * (i + 1)) / n, sag((i + 1) / n)), 0.22, 0.22, STONE_DARK);
    }
  }
  for (const s of at) k.b.obox(S.a[0] + ux * s, top - 3, S.a[1] + uz * s, 1.6, 2, S.half + 2.2, yaw, STONE_LIGHT);
}

export function buildGotham(k: Build): TileParts {
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
      console.error(`Gotham: the model of ${l.id} failed.`, e);
      box(k, l);
    }
  }
  for (const [name, r] of regions) {
    try {
      const before = k.b.triangles;
      counted(name, () => r.extras(k));
      dear.push([`what ${name} builds besides`, k.b.triangles - before]);
    } catch (e) {
      console.error(`Gotham: what ${name} builds besides its lots failed.`, e);
    }
  }
  counted('the blockout', () => slabs(k, new Set([...covered, ...models.keys()])));
  if (!models.has('cobblepot-bridge')) counted('the blockout', () => bridgeTowers(k));
  // the screen, until the waterfront's builder hangs it: on a frame on the bank's roof, facing the view
  if (!models.has('bank')) {
    const t = lotOf('bank'), cx = (t.x0 + t.x1) / 2 + 1, cz = (t.z0 + t.z1) / 2 + 1;
    for (const s of [-1, 1]) k.b.beam([cx - 0.743 * s * 4.6, t.top, cz + 0.669 * s * 4.6], [cx - 0.743 * s * 4.6, t.top + 8.4, cz + 0.669 * s * 4.6], 0.22, 0.2, STONE_DARK);
    k.b.obox(cx - 0.669 * 0.12, t.top + 5.3, cz - 0.743 * 0.12, 5.6, 3.2, 0.1, Math.atan2(0.669, -0.743), STONE_DARK, { faces: 'B' });
    k.sign('screen', cx, t.top + 5.3, cz, 0.669, 0.743, 6, 10.6);
  }

  // the life of the open paving, last of all, once everything else stands: it finds its ground from what is built
  const parked = counted('the life of its paving', () => buildLife(k));

  if (import.meta.env.DEV) {
    const all = [...cost.values()].reduce((s, n) => s + n, 0);
    console.info(`Gotham: ${all} triangles stand still. ${[...cost].sort((a, b) => b[1] - a[1]).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    if (dear.length > 0) console.info(`Gotham: the dearest lots: ${dear.sort((a, b) => b[1] - a[1]).slice(0, 20).map(([what, n]) => `${what} ${n}`).join(', ')}.`);
    const solids: Solid[] = LOTS.filter((l) => !l.part).map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: l.base, y1: l.top }));
    checkRoads('Gotham', routes, {}, solids);
    const lanes = checkLanes('Gotham', routes, k.b, { kinds: KINDS, people: k.people });
    checkSight();
    // For the console: pictures with `wimmel.shot`, which leaves the heroes out. gotham.fourViews(name, x, y, z, r)
    // takes a thing from two opposite sides by day and by night; gotham.close(name, { ...gotham.aim(x, y, z, az, elev), zoom }, part)
    // takes one close picture.
    (window as unknown as { gotham: object }).gotham = { lanes, frames, look, close, aim, sheet, fourViews, landAt };
  }

  return {
    routes,
    parked,
    heroSpots: HERO_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z, heading: s.heading, ...(s.turn ? { turn: s.turn } : {}) })),
    kinds: KINDS,
  };
}
