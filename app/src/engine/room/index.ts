// The collector's room. The table the tiles stand on rests on a long desk
// whose top is an old map of the world, and round the desk is the room: a
// floor of boards, four walls, shelves of small cars in their boxes, tall
// windows that show the hour, and brass lamps that light the map at night.
//
// It is all one centimetre to the unit, as the cars are. A tile is two metres
// across at that scale, so the desk is long and the room is a hall.
//
// A wall that would stand between the view and the table is left off, as the
// front of a doll's house is. The room is drawn in one colour pass with the
// city, and is left out of the mirror image that wet streets and water show.

import * as THREE from 'three';
import { GeoBuilder, rng } from '../geo';
import type { Rect } from '../tile';
import { mostInside, type Hall } from '../within';
import { MAX_LAMPS, ROOM, roomToon } from './look';
import { buildWorldMap, type MapPin, type WorldMap } from './map';

export interface Room {
  group: THREE.Group;
  /** The ground the desk covers, which the view may roam over. */
  desk: Rect;
  /** How far from the middle of the table the room reaches, walls and all. */
  reach: number;
  /** Its floor and the height of its walls, for keeping the view inside it. */
  hall: Hall;
  map: WorldMap;
  /**
   * Brings the room up to date with the view and the hour: `az` is the side
   * the camera stands on, `viewH` how much it sees, `night` how dark it is and
   * `sky` the colour of the sky outside the windows.
   */
  update(az: number, viewH: number, night: number, sky: THREE.Color): void;
  /** Whether it is large enough for a screen of this shape, on which the whole board is `fit` units from top to bottom. */
  fits(aspect: number, fit: number): boolean;
  /** Gives back what it holds, before another is built in its place. */
  dispose(): void;
}

/** The tilt the view opens with, which the room is made large enough for. */
const OPENS_AT = (38 * Math.PI) / 180;

/** A tile, as the room needs to know it: its name, where it stands, and where in the world its place is. */
export interface RoomTile { name: string; x: number; z: number; place?: { lon: number; lat: number; land?: [number, number][]; words?: string } }

const WALNUT = 0x4a3323, WALNUT_TOP = 0x5c4130, BRASS = 0xb08d3c, PLASTER = 0xd9d2c2, PLASTER_TOP = 0xf1ece0, SKIRTING = 0x6b5a48, SHELF = 0x7a5c3e, PAINTED = 0xf4f0e6;
const CARD_HUES = [0x1f4e8c, 0x1f4e8c, 0xc7352b, 0xe8a23d, 0x23272e, 0x23272e, 0xf2efe6, 0x2f7d6a, 0x6a3f8f, 0xd9662c];
const CAR_HUES = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xeeeeee, 0x2f2f38, 0xf08a4b, 0x7fd0c8, 0xc77dba, 0xb7bcc4, 0x8a1f2b, 0x1d3f72];

/**
 * One wall, as it is being built. It is built as if it ran from x = 0 to its
 * length with the room on its +z side, and is turned to where it belongs
 * afterwards. `out` is the way it faces from outside the room.
 */
interface Wall {
  b: GeoBuilder;
  /** The panes of its windows, which show the sky. */
  panes: GeoBuilder;
  /** The cars in their boxes on its shelves: where every card stands, and every car in front of its card. */
  cards: THREE.Matrix4[];
  cars: THREE.Matrix4[];
  /** How much of it is drawn, from 0 to 1. */
  show: THREE.IUniform<number>;
  out: [number, number];
}

/**
 * Builds the room round a table. `table` is the ground the table covers,
 * `deskY` the height its underside rests at, which is the top of the desk,
 * and `tableTop` the height of its wooden edge. A small screen gets a smaller
 * picture of the map. `view` is the shape of the screen, and how many units
 * from top to bottom the view shows when the whole board is in it: the walls
 * stand far enough off for that view.
 */
export function buildRoom(table: Rect, deskY: number, tableTop: number, tiles: RoomTile[], small: boolean, view: { aspect: number; fit: number }): Room {
  const group = new THREE.Group();
  const pins: MapPin[] = tiles.flatMap((t) => (t.place ? [{ name: t.name, ...t.place }] : []));
  const map = buildWorldMap(table, deskY, pins, small);
  group.add(map.group);
  const { sheet, r } = map;
  const rand = rng(6464);
  const b = new GeoBuilder();

  // --- the desk: a slab of walnut with a strip of brass round the sheet, on stout legs ---
  const RIM = 14, SLAB = 9, HIGH = 88;
  const desk: Rect = { x0: sheet.x0 - RIM, z0: sheet.z0 - RIM, x1: sheet.x1 + RIM, z1: sheet.z1 + RIM };
  const floorY = deskY - HIGH, top = deskY - 0.05;
  b.box(desk.x0, deskY - SLAB, desk.z0, desk.x1, top, desk.z1, WALNUT, { top: WALNUT_TOP, faces: 'NESWTB' });
  for (const [x0, z0, x1, z1] of [[sheet.x0 - 3, sheet.z0 - 3, sheet.x1 + 3, sheet.z0 - 1], [sheet.x0 - 3, sheet.z1 + 1, sheet.x1 + 3, sheet.z1 + 3], [sheet.x0 - 3, sheet.z0 - 1, sheet.x0 - 1, sheet.z1 + 1], [sheet.x1 + 1, sheet.z0 - 1, sheet.x1 + 3, sheet.z1 + 1]]) {
    b.box(x0, top, z0, x1, deskY + 0.07, z1, BRASS, { faces: 'NESWT' });
  }
  // the frame under the top, and the legs, each in a brass shoe
  const IN = 26, under = deskY - SLAB;
  b.box(desk.x0 + IN, under - 13, desk.z0 + IN, desk.x1 - IN, under, desk.z0 + IN + 5, WALNUT, { faces: 'NESWB' });
  b.box(desk.x0 + IN, under - 13, desk.z1 - IN - 5, desk.x1 - IN, under, desk.z1 - IN, WALNUT, { faces: 'NESWB' });
  b.box(desk.x0 + IN, under - 13, desk.z0 + IN + 5, desk.x0 + IN + 5, under, desk.z1 - IN - 5, WALNUT, { faces: 'NESWB' });
  b.box(desk.x1 - IN - 5, under - 13, desk.z0 + IN + 5, desk.x1 - IN, under, desk.z1 - IN - 5, WALNUT, { faces: 'NESWB' });
  const legs = Math.max(2, Math.round((desk.x1 - desk.x0) / 420) + 1);
  for (let i = 0; i < legs; i++) {
    const x = desk.x0 + IN + 6 + ((desk.x1 - desk.x0 - 2 * IN - 30) * i) / (legs - 1);
    for (const z of [desk.z0 + IN + 6, desk.z1 - IN - 24]) {
      b.box(x, floorY + 5, z, x + 18, under - 13, z + 18, WALNUT, { faces: 'NESW' });
      b.box(x - 2, floorY, z - 2, x + 20, floorY + 5, z + 20, BRASS);
    }
  }

  // --- the room ---
  const TALL = 330, THICK = 14;
  const hallAt = (round: number): Hall => ({ floor: { x0: desk.x0 - round, z0: desk.z0 - round, x1: desk.x1 + round, z1: desk.z1 + round }, y: floorY, top: floorY + TALL });
  // The view is kept inside the room (see within.ts), so the walls stand far
  // enough from the desk that the view the board opens with, and a fifth more
  // than it, shows nothing but the room whichever way it is turned.
  const enough = (h: Hall, aspect: number, fit: number): boolean => mostInside(h, OPENS_AT, aspect, 34, fit * 1.22) >= fit * 1.22 - 0.5;
  let round = Math.max(210, r * 0.8);
  while (round < 2600 && !enough(hallAt(round), view.aspect, view.fit)) round += 30;
  const hall = hallAt(round), room = hall.floor;
  ROOM.uDesk.value.set((desk.x0 + desk.x1) / 2, (desk.z0 + desk.z1) / 2, (desk.x1 - desk.x0) / 2, (desk.z1 - desk.z0) / 2);
  // the floor, and the slab it lies on, whose edge shows where a wall is left off
  const floor = new THREE.BufferGeometry();
  floor.setAttribute('position', new THREE.Float32BufferAttribute([room.x0, floorY, room.z1, room.x1, floorY, room.z1, room.x1, floorY, room.z0, room.x0, floorY, room.z1, room.x1, floorY, room.z0, room.x0, floorY, room.z0], 3));
  floor.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  group.add(new THREE.Mesh(floor, roomToon({ vertexColors: false, color: 0x7b5c41 }, { kind: 'planks' })));
  b.box(room.x0 - THICK, floorY - 16, room.z0 - THICK, room.x1 + THICK, floorY - 0.05, room.z1 + THICK, 0x3b322b, { faces: 'NESW' });

  const walls: Wall[] = [];
  const glass: THREE.MeshToonMaterial[] = [];
  const wall = (length: number, origin: [number, number], yaw: number, out: [number, number], furnish: (w: Wall, length: number) => void): void => {
    const w: Wall = { b: new GeoBuilder(), panes: new GeoBuilder(), cards: [], cars: [], show: { value: 1 }, out };
    w.b.box(-THICK, floorY, -THICK, length + THICK, floorY + TALL, 0, PLASTER, { top: PLASTER_TOP, faces: 'NESWT' });
    w.b.box(0, floorY, 0, length, floorY + 11, 1.6, SKIRTING, { faces: 'ESWT' });
    furnish(w, length);
    const holder = new THREE.Group();
    holder.position.set(origin[0], 0, origin[1]);
    holder.rotation.y = yaw;
    holder.add(new THREE.Mesh(w.b.build(), roomToon({}, { show: w.show })));
    if (w.panes.triangles > 0) {
      // a pane is lit from outside, whatever the light in the room is
      const m = roomToon({ vertexColors: false, color: 0x000000, emissive: 0xffffff }, { show: w.show });
      glass.push(m);
      holder.add(new THREE.Mesh(w.panes.build(), m));
    }
    // every card is one shape drawn many times, and so is every car
    const many = (list: THREE.Matrix4[], hues: number[]): void => {
      if (list.length === 0) return;
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), roomToon({ vertexColors: false }, { show: w.show }), list.length);
      const c = new THREE.Color();
      list.forEach((m, i) => {
        inst.setMatrixAt(i, m);
        inst.setColorAt(i, c.set(hues[Math.floor(rand() * hues.length)]));
      });
      holder.add(inst);
    };
    many(w.cards, CARD_HUES);
    many(w.cars, CAR_HUES);
    group.add(holder);
    walls.push(w);
  };

  /** Shelves along a wall, from `x0` to `x1`, with cars in their boxes standing on them. */
  const shelves = (w: Wall, x0: number, x1: number): void => {
    const DEEP = 10, upright = new THREE.Quaternion(), tilt = new THREE.Vector3(0, 0, 1);
    w.b.box(x0 - 3, floorY + 40, 0, x0, floorY + 300, DEEP, SHELF);
    w.b.box(x1, floorY + 40, 0, x1 + 3, floorY + 300, DEEP, SHELF);
    for (let x = x0 + 190; x < x1 - 60; x += 190) w.b.box(x - 1.5, floorY + 40, 0, x + 1.5, floorY + 300, DEEP, SHELF);
    for (const h of [58, 100, 142, 184, 226, 268]) {
      w.b.box(x0, floorY + h - 2.4, 0, x1, floorY + h, DEEP, SHELF, { faces: 'ESWTB' });
      // a run of cards, then a gap, as a collection that is still growing has
      let x = x0 + 6;
      while (x < x1 - 14) {
        if (rand() < 0.16) {
          x += 12 + rand() * 40;
          continue;
        }
        // a card stands on its edge, face out, and sometimes a second one stands on top of it
        const stack = rand() < 0.62 ? 2 : 1;
        for (let up = 0; up < stack; up++) {
          const y = floorY + h + 8.4 + up * 16.9;
          w.cards.push(new THREE.Matrix4().compose(new THREE.Vector3(x + 5.2, y, 3.4), new THREE.Quaternion().setFromAxisAngle(tilt, (rand() - 0.5) * 0.06), new THREE.Vector3(10.4, 16.4, 1.2)));
          w.cars.push(new THREE.Matrix4().compose(new THREE.Vector3(x + 5.2, y - 3.6, 5.2), upright, new THREE.Vector3(6.6, 2.4, 2.6)));
        }
        x += 11.6;
      }
    }
  };

  /** Tall windows along a wall. The wall is not cut: a window is a lit pane in a frame, a hair in front of it. */
  const windows = (w: Wall, length: number): void => {
    const count = Math.max(2, Math.round(length / 330)), wide = 150, sill = floorY + 74, head = floorY + 284;
    for (let i = 0; i < count; i++) {
      const x = (length * (i + 0.5)) / count - wide / 2;
      w.b.box(x - 7, sill - 6, 0, x + wide + 7, sill, 6.5, PAINTED);
      // the frame, the bar down the middle and the bar across
      for (const [x0, y0, x1, y1] of [[x - 6, sill, x, head + 6], [x + wide, sill, x + wide + 6, head + 6], [x, head, x + wide, head + 6], [x + wide / 2 - 1.6, sill, x + wide / 2 + 1.6, head], [x, sill + 100, x + wide, sill + 103.2]]) {
        w.b.box(x0, y0, 0, x1, y1, 3.2, PAINTED);
      }
      w.panes.quad([x, sill, 1.1], [x + wide, sill, 1.1], [x + wide, head, 1.1], [x, head, 1.1], [0, 0, 1], 0xffffff);
    }
  };

  const long = room.x1 - room.x0, deep = room.z1 - room.z0;
  // north: shelves from end to end
  wall(long, [room.x0, room.z0], 0, [0, -1], (w, len) => shelves(w, 70, len - 70));
  // west: the windows
  wall(deep, [room.x0, room.z1], Math.PI / 2, [-1, 0], windows);
  // east: shelves again
  wall(deep, [room.x1, room.z0], -Math.PI / 2, [1, 0], (w, len) => shelves(w, 70, len - 70));
  // south: a door, and pictures of cars to either side of it
  wall(long, [room.x1, room.z1], Math.PI, [0, 1], (w, len) => {
    const door = len * 0.5;
    w.b.box(door - 52, floorY, 0, door + 52, floorY + 214, 2.4, PAINTED);
    w.b.box(door - 46, floorY, 2.4, door + 46, floorY + 208, 3.4, 0x6e8e86);
    w.b.box(door + 33, floorY + 98, 3.4, door + 39, floorY + 104, 5.6, BRASS);
    for (let i = 0; i < 6; i++) {
      const x = len * (i < 3 ? 0.1 + i * 0.11 : 0.57 + (i - 3) * 0.11), y = floorY + 150, hue = CAR_HUES[(i * 5) % CAR_HUES.length];
      w.b.box(x - 44, y - 31, 0, x + 44, y + 31, 2.2, 0x2b221b);
      w.b.box(x - 40, y - 27, 2.2, x + 40, y + 27, 2.6, 0xf1ead8);
      // a car, side on, in three boxes and two wheels
      w.b.box(x - 26, y - 13, 2.6, x + 26, y - 2, 3.1, hue);
      w.b.box(x - 13, y - 2, 2.6, x + 11, y + 7, 3.1, hue);
      for (const wx of [x - 16, x + 16]) w.b.box(wx - 5, y - 18, 2.6, wx + 5, y - 9, 3.3, 0x1c1c20);
    }
  });

  // --- the lamps: brass, with green shades. One at each end of the desk, and one on each long side. ---
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const glows = new GeoBuilder();
  const mx = (desk.x0 + desk.x1) / 2, mz = (desk.z0 + desk.z1) / 2;
  const aside = (table.x1 - table.x0) / 2 + r * 0.24;
  // where each one's foot is, which way its arm reaches, and how far its light carries
  const lamps: [number, number, number, number, number][] = [
    [desk.x0 + 9, mz, 1, 0, r * 2.7], [desk.x1 - 9, mz, -1, 0, r * 2.7],
    [mx - aside, desk.z0 + 9, 0, 1, r * 2.0], [mx + aside, desk.z1 - 9, 0, -1, r * 2.0],
  ];
  lamps.slice(0, MAX_LAMPS).forEach(([x, z, ax, az, far], i) => {
    const up = r * 0.36, arm = r * 0.27;
    const hx = x + ax * arm, hz = z + az * arm, hy = top + up;
    b.cyl(x, z, top, top + 3, 9, 8, 16, BRASS, { cap: BRASS });
    b.beam([x, top + 3, z], [x, hy, z], 1.5, 1.3, BRASS);
    b.beam([x, hy, z], [hx, hy + 7, hz], 1.2, 1.1, BRASS);
    b.beam([hx, hy + 7, hz], [hx, hy, hz], 0.9, 0.9, BRASS);
    b.cyl(hx, hz, hy - 12, hy + 1, 15, 6, 14, 0x1f5a45, { cap: BRASS });
    glows.cyl(hx, hz, hy - 14, hy - 6, 3.4, 3.4, 8, 0xfff6e0, { cap: 0xfff6e0 });
    ROOM.uLampPos.value[i].set(hx, hy - 8, hz, far);
    ROOM.uLampCol.value[i].setRGB(1.2, 0.82, 0.46);
  });
  group.add(new THREE.Mesh(glows.build(), glowMat));

  // --- a pin in the map at every tile's place, and a red thread from it to the table ---
  for (const t of tiles) {
    const at = t.place ? map.place(t.place.lon, t.place.lat) : null;
    if (!at) continue;
    b.beam([at.x, deskY, at.z], [at.x + 0.8, deskY + 6.4, at.z], 0.28, 0.28, 0xc9c2b4);
    b.cyl(at.x + 0.8, at.z, deskY + 6.2, deskY + 9, 1.9, 1.9, 10, 0xb3202a, { cap: 0xd8433f });
    // where the line from the tile to its place leaves the table, a brass tack holds the thread to the wooden edge
    const dx = at.x - t.x, dz = at.z - t.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
    const far = Math.min(dx > 0 ? (table.x1 - t.x) / dx : dx < 0 ? (table.x0 - t.x) / dx : 1e9, dz > 0 ? (table.z1 - t.z) / dz : dz < 0 ? (table.z0 - t.z) / dz : 1e9);
    const ex = t.x + dx * far, ez = t.z + dz * far;
    b.cyl(ex - ux * 5, ez - uz * 5, tableTop, tableTop + 0.9, 1.5, 1.5, 10, BRASS, { cap: BRASS });
    // the thread: over the edge, down to the map, along it, and up to the head of the pin
    const run: [number, number, number][] = [[ex - ux * 5, tableTop + 0.9, ez - uz * 5], [ex + ux * 0.8, tableTop + 0.5, ez + uz * 0.8], [ex + ux * 3.5, deskY + 2.6, ez + uz * 3.5], [ex + ux * 9, deskY + 0.45, ez + uz * 9]];
    const span = Math.hypot(at.x - ex, at.z - ez);
    for (let s = 0.2; s < 0.95; s += 0.15) run.push([ex + ux * (9 + (span - 16) * s), deskY + 0.45, ez + uz * (9 + (span - 16) * s)]);
    run.push([at.x - ux * 5, deskY + 0.6, at.z - uz * 5], [at.x + 0.8, deskY + 6.6, at.z]);
    b.sweep(run, run.map(() => 0.42), 0xb3202a);
  }

  // --- a few things left lying on the desk ---
  {
    const y = deskY + 0.02, fx = (table.x0 + table.x1) / 2, fz = (sheet.z1 + table.z1) / 2;
    // a cup, beside the ring it left on the map
    const cx = fx + r * 0.62 + 13, cz = fz + 4;
    b.cyl(cx, cz, y, y + 9.2, 4.1, 4.3, 14, 0xf1ece0, { cap: 0x3a2416 });
    b.box(cx + 4, y + 2.4, cz - 0.8, cx + 6.6, y + 7.4, cz + 0.8, 0xf1ece0);
    // a few cars still in their boxes, stacked, and one beside the stack
    const sx = fx - r * 0.72, sz = fz + 6;
    for (let i = 0; i < 5; i++) b.obox(sx + (rand() - 0.5) * 2, y + 1.75 + i * 3.5, sz + (rand() - 0.5) * 2, 8.2, 1.7, 5.4, (rand() - 0.5) * 0.5, CARD_HUES[(i * 3) % CARD_HUES.length]);
    b.obox(sx + 22, y + 1.75, sz - 3, 8.2, 1.7, 5.4, 0.9, 0xf2efe6);
    // a pencil
    b.beam([sx + 60, y + 0.5, sz - 10], [sx + 76, y + 0.5, sz + 2], 0.45, 0.45, 0xe8b33d);
    b.beam([sx + 76, y + 0.5, sz + 2], [sx + 77.6, y + 0.5, sz + 3.2], 0.45, 0.05, 0x3a2416);
    // a magnifying glass, lying on the widest sea
    const g = map.place(-142, 8);
    if (g) {
      const ring = 14;
      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
        b.beam([g.x + Math.cos(a0) * ring, y + 1.6, g.z + Math.sin(a0) * ring], [g.x + Math.cos(a1) * ring, y + 1.6, g.z + Math.sin(a1) * ring], 1.1, 1.1, BRASS);
      }
      b.beam([g.x + ring * 0.72, y + 1.6, g.z + ring * 0.72], [g.x + ring * 2.4, y + 1.8, g.z + ring * 2.4], 1.5, 1.9, 0x2b221b);
    }
    // a pair of dividers, by the scale
    const dvx = sheet.x1 - r * 0.4 - 30, dvz = sheet.z1 - r * 0.82;
    b.beam([dvx, y + 0.6, dvz], [dvx + 19, y + 0.4, dvz + 7], 0.5, 0.12, BRASS);
    b.beam([dvx, y + 0.6, dvz], [dvx + 19, y + 0.4, dvz - 5], 0.5, 0.12, BRASS);
    b.cyl(dvx, dvz, y, y + 1.6, 1.3, 1.3, 10, BRASS, { cap: BRASS });
  }

  group.add(new THREE.Mesh(b.build(), roomToon()));
  group.traverse((o) => o.layers.set(1));

  const reach = Math.hypot((room.x1 - room.x0) / 2 + THICK, (room.z1 - room.z0) / 2 + THICK) + 40;
  const smooth = (a: number, c: number, v: number): number => {
    const t = Math.min(1, Math.max(0, (v - a) / (c - a)));
    return t * t * (3 - 2 * t);
  };
  const pane = new THREE.Color(), dusk = new THREE.Color(0.05, 0.07, 0.13);
  return {
    group, desk, reach, hall, map,
    fits: (aspect, fit) => enough(hall, aspect, fit),
    dispose() {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          (m as THREE.MeshToonMaterial).map?.dispose();
          m.dispose();
        }
      });
    },
    update(az, viewH, night, sky) {
      // A wall is drawn when the view looks at its face from inside the room,
      // and left off when it would stand between the view and the table. The
      // view is kept where a wall that is drawn hides whatever is beyond it.
      for (const w of walls) w.show.value = smooth(-0.05, 0, -(Math.sin(az) * w.out[0] + Math.cos(az) * w.out[1]));
      map.fine.visible = viewH < 620;
      // the lamps come on as night falls
      const on = Math.min(1, Math.max(0, (night - 0.25) / 0.45));
      ROOM.uLampOn.value = on;
      glowMat.color.setRGB(0.5 + 3.4 * on, 0.46 + 2.6 * on, 0.38 + 1.5 * on);
      // the panes show the sky by day, and a deep blue by night
      pane.copy(sky).multiplyScalar(1.45 - 0.9 * night).lerp(dusk, night * 0.75);
      for (const m of glass) m.emissive.copy(pane);
    },
  };
}
