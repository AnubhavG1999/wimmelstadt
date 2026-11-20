// What a tile is, as far as the engine is concerned, and what a tile is given to
// build itself with.
//
// A tile is one district on a board of its own. It is built in its own
// coordinates, with the middle of its board at (0, 0), and knows nothing about
// where it stands in the city or about any other tile.
//
// Units: 1 unit is 1 cm of toy. A lane is 5 wide, a storey is 5 high and a car
// is about 7 long. x points east, z points south, y points up.

import type * as THREE from 'three';
import type { GeoBuilder } from './geo';
import type { Hump, Seg } from './paths';
import type { SignDef, Signs } from './signs';
import type { TileLook, TileMaterials } from './look/materials';

export interface Rect { x0: number; z0: number; x1: number; z1: number }

/** The ground every tile has: the look prototype's board, 208 units by 226. */
export const TILE: Rect = { x0: -104, x1: 104, z0: -113, z1: 113 };

export const LANE = 5;
export const STOREY = 5;

/** A pool of light on the ground at night: a street lamp, a shopfront, a sign. */
export interface Light { x: number; z: number; r: number; color: string; k: number }
/** A small box that glows: a lamp, a strip of neon, a warning light on a mast. */
export interface Glow { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string }

/** The plain vehicles that make up the traffic. */
export type TrafficType = 'sedan' | 'hatch' | 'van' | 'pickup' | 'bus';

/**
 * A kind of traffic that is a tile's own: a rider, a cart, an auto-rickshaw.
 * The tile hands its kinds over in `TileParts`, and a route or a parked spot
 * asks for one by its name. See "Traffic of a tile's own" in vehicles.ts for
 * how its shape is made.
 */
export interface TrafficKind {
  /** What a route's `types` and a parked spot's `type` call it. Not the name of one of the plain kinds. */
  name: string;
  /**
   * Its shape: nose along +x, standing on y = 0, its middle over (0, 0), made
   * with `shapeFrom` in vehicles.ts so that it carries what the traffic's
   * material needs. One shape is drawn for every one of the kind there is.
   */
  geo: THREE.BufferGeometry;
  /** How long and how wide it is. Traffic keeps its distance by these. */
  len: number;
  wid: number;
  /** How far apart the two places are that hold it to the road, which sets how it swings through a bend. Six tenths of its length unless this says otherwise. */
  wb?: number;
  /** The colours its paint is picked from, one for each of the kind. */
  colors: number[];
  /** Whether it throws a beam ahead at night. It does unless this says no: a horse has no lamps. */
  lamps?: boolean;
}

/** A closed road that vehicles drive round. */
export interface Route {
  id: string;
  segs: Seg[];
  /** Cruising speed in units per second. */
  speed: number;
  /** How many plain vehicles drive it. */
  count: number;
  /** Which kinds they are: plain kinds, or kinds of the tile's own by name. Any plain kind, if this is left out. */
  types?: (TrafficType | (string & {}))[];
  /** The colours they are painted, in place of each kind's own: a city's red taxis, or its yellow ones. */
  paint?: number[];
  hump?: Hump;
  /** Whether a hero may drive here. It may, unless this says no. */
  heroes?: boolean;
}

/** Where a plain vehicle stands parked. */
export interface ParkedSpot {
  x: number; y: number; z: number;
  /** Radians: 0 faces east, a quarter turn faces south. */
  heading: number;
  /** Whether it stands inside a lit interior. */
  lit?: boolean;
  /** For a spot on a turntable: how fast it turns, in radians per second. */
  turn?: number;
  /** Which kind stands there: a plain kind, or one of the tile's own by name. One of the plain cars, if this is left out. */
  type?: TrafficType | (string & {});
}

/** A place where a hero may stand on show. It is empty until a hero is given it. */
export interface HeroSpot extends ParkedSpot { id: string }

/** What a tile hands back once it has built everything that stands still. */
export interface TileParts {
  routes: Route[];
  parked: ParkedSpot[];
  heroSpots: HeroSpot[];
  /** Kinds of traffic that are the tile's own, which its routes and parked spots ask for by name. */
  kinds?: TrafficKind[];
}

/**
 * What a tile builds with. Everything it adds is in the tile's own
 * coordinates. Shapes go into `b`, which becomes one mesh, so a whole tile is
 * a handful of draw calls.
 */
export interface Build {
  /** The tile's ground. */
  board: Rect;
  /** Everything solid: buildings, bridges, monuments, kerbs. */
  b: GeoBuilder;
  /** The surfaces of roads above the ground, which carry lane markings. */
  deck: GeoBuilder;
  /** The surfaces of streets on the ground, which carry lane markings and shine when wet. */
  street: GeoBuilder;
  glows: Glow[];
  lights: Light[];
  signs: Signs;
  /** Hangs a sign that faces the way (nx, nz) points, `h` tall and no wider than `maxW`. Returns its width. */
  sign(id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW?: number): number;
  /** Plants a tree. A tall one is slender, like a redwood or a cypress. `y` is the ground it stands on. */
  tree(x: number, z: number, size: number, tall?: boolean, y?: number): void;
  /** Stands a figure on the ground, or on whatever is at height `y`. */
  person(x: number, z: number, y?: number): void;
  /** Stands a street lamp whose arm points along (cos yaw, sin yaw). */
  lamp(x: number, z: number, yaw: number, y?: number): void;
  /** Random numbers that are the same on every load, so the tile is too. */
  rand(): number;
  /** For the few things that are meshes of their own: a turntable, a ring of light, a train. */
  group: THREE.Group;
  /** Materials in the city's look, for meshes of the tile's own. */
  mat: TileMaterials;
  /** For a tile that writes a material of its own. */
  look: TileLook;
  /** Has `fn` called on every frame, for whatever moves or changes with the hour. */
  each(fn: (dt: number, time: number, night: number) => void): void;
  /** Set by anything that mirrors the city whatever the weather, such as water. */
  mirrors: boolean;
}

export interface TileDef {
  /** Its name in addresses and in code, such as `north-america`. */
  id: string;
  /** Its name for people. */
  name: string;
  /** Seeds `rand`. */
  seed: number;
  /** Every sign the tile hangs. */
  signs: SignDef[];
  /** Left off the board unless it is asked for by name. */
  hidden?: boolean;
  /**
   * Where in the world its place is, in degrees: east and north are positive.
   * The map on the desk under the table has a pin there, and a thread from
   * the pin to the tile. A place that is in no atlas can bring its own land:
   * `land` is its coast, as corners so many degrees east and north of the
   * place, and it is drawn there as the real coasts are, so put it in open
   * sea. `words` are lettered beside it.
   */
  place?: { lon: number; lat: number; land?: [number, number][]; words?: string };
  build(k: Build): TileParts;
}
