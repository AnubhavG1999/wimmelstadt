// The board: every tile of the city, each on a base of its own, and the heroes
// that are put on them.

import * as THREE from 'three';
import { startBuild, type Standing } from './build';
import type { LoadedHero } from './hero';
import { copyLook } from './look/materials';
import { TILE, type Rect, type TileDef } from './tile';
import type { PartyTrick } from './tricks';
import { buildVehicles, type Hero, type HeroPlace, type Vehicles } from './vehicles';

/** The space between the bases of two tiles that stand next to each other. */
const GAP = 22;
/** How far a tile's base reaches beyond its ground on each side. */
const RIM = 3.5;

/** One tile, standing on the board. */
export interface OnBoard {
  def: TileDef;
  /** Where the middle of its ground is, in the city. */
  x: number;
  z: number;
  standing: Standing;
  vehicles: Vehicles;
}

/** A hero, and where it has been put. */
export interface BoardHero {
  name: string;
  capture: string;
  tile: OnBoard;
  hero: Hero;
  /** Where it is now, in the city. */
  pos: THREE.Vector3;
}

export interface Board {
  group: THREE.Group;
  tiles: OnBoard[];
  /** The ground the tiles cover between them. */
  bounds: Rect;
  heroes: BoardHero[];
  /** Whether any tile has water, which mirrors the city whatever the weather. */
  mirrors: boolean;
  update(dt: number, time: number, night: number, wet: number): void;
  /**
   * Puts each hero on a tile picked at random, and somewhere at random on it:
   * on one of its roads, or on show. Nothing here is the same from one load of
   * the page to the next. For looking at one place while working on it, `prefer`
   * names a route or a spot, and the heroes are put there if there is room.
   */
  placeHeroes(list: LoadedHero[], tricks: Record<string, PartyTrick>, prefer?: string | null): void;
  /** Shows the heroes or hides them. */
  showHeroes(on: boolean): void;
  stats(): { triangles: number; signs: number; glows: number; trees: number; people: number; moving: number; parked: number };
}

export function buildBoard(defs: TileDef[]): Board {
  const group = new THREE.Group();
  const w = TILE.x1 - TILE.x0, d = TILE.z1 - TILE.z0;
  const cols = Math.ceil(Math.sqrt(defs.length)), rows = Math.ceil(defs.length / cols);
  const stepX = w + 2 * RIM + GAP, stepZ = d + 2 * RIM + GAP;

  const tiles = defs.map((def, i): OnBoard => {
    // the tiles stand in rows, and the board as a whole is centred on (0, 0)
    const x = ((i % cols) - (cols - 1) / 2) * stepX, z = (Math.floor(i / cols) - (rows - 1) / 2) * stepZ;
    const { k, finish } = startBuild(def, x, z);
    const parts = def.build(k);
    const standing = finish();
    const vehicles = buildVehicles(k, parts.routes, parts.parked, parts.heroSpots);
    standing.group.add(vehicles.group);
    group.add(standing.group);
    return { def, x, z, standing, vehicles };
  });

  const bounds: Rect = {
    x0: Math.min(...tiles.map((t) => t.x)) + TILE.x0, x1: Math.max(...tiles.map((t) => t.x)) + TILE.x1,
    z0: Math.min(...tiles.map((t) => t.z)) + TILE.z0, z1: Math.max(...tiles.map((t) => t.z)) + TILE.z1,
  };
  const heroes: BoardHero[] = [];

  /** One of a list, picked with odds in proportion to each one's room. */
  const pick = <T extends { room: number }>(list: T[]): T | null => {
    let at = Math.random() * list.reduce((s, p) => s + p.room, 0);
    for (const p of list) {
      at -= p.room;
      if (at <= 0) return p;
    }
    return list[list.length - 1] ?? null;
  };

  return {
    group,
    tiles,
    bounds,
    heroes,
    mirrors: tiles.some((t) => t.standing.mirrors),

    update(dt, time, night, wet) {
      for (const t of tiles) {
        t.standing.frame(dt, time, night);
        t.vehicles.update(dt, time, night, wet);
      }
      for (const h of heroes) h.pos.set(h.hero.pos.x + h.tile.x, h.hero.pos.y, h.hero.pos.z + h.tile.z);
    },

    placeHeroes(list, tricks, prefer = null) {
      for (const loaded of list) {
        // a tile at random; if it has no room, the next one along
        const first = Math.floor(Math.random() * tiles.length);
        const order = tiles.map((_, n) => tiles[(first + n) % tiles.length]);
        // a place that was asked for by name is looked for on every tile
        const has = (t: OnBoard): number => (t.vehicles.places().some((p) => p.id === prefer) ? 1 : 0);
        if (prefer) order.sort((a, b) => has(b) - has(a));
        for (const tile of order) {
          const open = tile.vehicles.places();
          const place: HeroPlace | null = open.find((p) => p.id === prefer) ?? pick(open);
          if (!place) continue;
          const info = { name: loaded.info.name, capture: loaded.info.capture, length: loaded.length, width: loaded.width };
          const hero = tile.vehicles.adopt(loaded.body, info, place, tricks[loaded.info.capture] ?? null);
          if (!hero) continue;
          // from now on it is lit by this tile's lamps and signs
          copyLook(loaded.look, tile.standing.look);
          heroes.push({ name: info.name, capture: info.capture, tile, hero, pos: new THREE.Vector3() });
          break;
        }
      }
    },

    showHeroes(on) {
      for (const t of tiles) t.vehicles.showHeroes(on);
    },

    stats() {
      const sum = { triangles: 0, signs: 0, glows: 0, trees: 0, people: 0, moving: 0, parked: 0 };
      for (const t of tiles) {
        const s = t.standing.stats;
        sum.triangles += s.triangles; sum.signs += s.signs; sum.glows += s.glows; sum.trees += s.trees; sum.people += s.people;
        sum.moving += t.vehicles.moving; sum.parked += t.vehicles.parked;
      }
      return sum;
    },
  };
}
