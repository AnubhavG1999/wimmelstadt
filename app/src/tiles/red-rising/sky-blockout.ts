// Where the sky's things will be, while they are still to be built: the
// fleets as plain warships where they will fly, a wave of the Iron Rain as
// streaks from the Pax's spitTubes down to where it lands, and the shield over
// the city. Nothing here moves yet; it stands for the layout and the scale, as
// a lot's box does. It goes once the fleet and the Rain are built.
//
// The warships are meant to frighten: the Pax, Darrow's flagship, a
// dreadnought five kilometres long in the books (GS 22), is a hundred units
// long here, half the board, a dark blade over the canyon with its port side
// lit by the mouths of its spitTubes (GS 37) and eight engines at its stern
// (MS 45). The Warchild, the Bellona flagship, is blue and silver (GS 38).

import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { F, SHIELD } from './plan';

const SHELL = 0xffb25a;

interface Paint { hull: number; armour: number; trim: number; dark: number; light: string; engine: string }
const PAX: Paint = { hull: 0x2f3136, armour: 0x45474e, trim: 0x8e1d18, dark: 0x16171a, light: '#ff5a3c', engine: '#ffb36b' };
const AUGUSTAN: Paint = { hull: 0x4a4b51, armour: 0x5d5f66, trim: 0x8e1d18, dark: 0x1d1e22, light: '#ff8a5a', engine: '#ffc078' };
const BELLONA: Paint = { hull: 0x23447e, armour: 0x9fb0c4, trim: 0xd9e1ea, dark: 0x111a2c, light: '#9fd8ff', engine: '#8fd0ff' };

/**
 * A warship laid along its heading (radians: 0 is east, a quarter turn is
 * south), its middle at (x, y, z), `len` long. A long blade of a hull tapering
 * to a point at the bow, armour plates along its flanks, a spine of turrets,
 * a tower for its bridge towards the stern, a block of engines, and lights.
 */
function warship(k: Build, x: number, y: number, z: number, len: number, heading: number, p: Paint, o: { engines?: number; tubes?: boolean } = {}): void {
  const cx = Math.cos(heading), cz = Math.sin(heading);
  // a point along the ship (from -0.5 at the stern to 0.5 at the bow), across it (to port is negative), and up
  const at = (s: number, across = 0, up = 0): V3 => [x + cx * s * len - cz * across, y + up, z + cz * s * len + cx * across];
  const W = len * 0.085;
  // the hull: a blade, thick amidships and drawn out to a point at the bow, its keel a ridge below
  k.b.sweep([at(-0.5), at(-0.36), at(0.18), at(0.4), at(0.5)], [W * 0.9, W, W * 0.92, W * 0.5, W * 0.05], p.hull);
  k.b.sweep([at(-0.46, 0, -W * 0.7), at(0.05, 0, -W * 1.05), at(0.42, 0, -W * 0.45)], [W * 0.35, W * 0.42, W * 0.08], p.dark);
  // armour plates along each flank, and a deck along the top
  for (const side of [-1, 1]) {
    k.b.sweep([at(-0.42, side * W * 1.05, -W * 0.15), at(0.1, side * W * 1.18, -W * 0.15), at(0.34, side * W * 0.7, -W * 0.1)], [W * 0.32, W * 0.38, W * 0.12], p.armour);
  }
  k.b.sweep([at(-0.44, 0, W * 0.95), at(0.26, 0, W * 0.85)], [W * 0.55, W * 0.4], p.armour);
  // a red line along each flank, its house's colour
  for (const side of [-1, 1]) k.b.sweep([at(-0.4, side * W * 1.42, -W * 0.05), at(0.12, side * W * 1.55, -W * 0.05)], [W * 0.06, W * 0.06], p.trim);
  // the bridge: a tower of three steps a third of the way from the stern
  k.b.sweep([at(-0.3, 0, W * 1.2), at(-0.16, 0, W * 1.3)], [W * 0.5, W * 0.45], p.armour);
  k.b.sweep([at(-0.28, 0, W * 1.9), at(-0.2, 0, W * 1.95)], [W * 0.32, W * 0.28], p.hull);
  k.b.sweep([at(-0.27, 0, W * 2.45), at(-0.22, 0, W * 2.5)], [W * 0.18, W * 0.16], p.dark);
  k.glows.push({ ...xyz(at(-0.22, 0, W * 2.0)), sx: W * 0.5, sy: 0.25, sz: W * 0.5, color: p.light });
  // turrets along the spine, each a block with two barrels pointing forward
  for (const s of [-0.08, 0.02, 0.12, 0.22]) {
    k.b.sweep([at(s - 0.02, 0, W * 1.45), at(s + 0.02, 0, W * 1.45)], [W * 0.3, W * 0.3], p.dark);
    for (const side of [-1, 1]) k.b.beam(at(s + 0.02, side * W * 0.12, W * 1.5), at(s + 0.09, side * W * 0.12, W * 1.5), W * 0.05, W * 0.04, p.armour);
  }
  // the engines: a block at the stern, and a ring of nozzles glowing in it
  const n = o.engines ?? 4;
  k.b.sweep([at(-0.52), at(-0.47)], [W * 1.05, W * 1.0], p.dark);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = n > 4 ? W * 0.65 : W * 0.45;
    const q = at(-0.535, Math.cos(a) * r, Math.sin(a) * r);
    k.glows.push({ ...xyz(q), sx: W * 0.32, sy: W * 0.32, sz: W * 0.32, color: p.engine });
  }
  // lights along the flanks, and on the Pax the mouths of its spitTubes in a row along the port side
  for (let s = -0.38; s <= 0.3; s += 0.05) for (const side of [-1, 1]) k.glows.push({ ...xyz(at(s, side * W * 1.02, W * 0.45)), sx: 0.25, sy: 0.25, sz: 0.25, color: p.light });
  if (o.tubes) for (let s = -0.34; s <= 0.26; s += 0.022) k.glows.push({ ...xyz(at(s, -W * 1.02, -W * 0.35)), sx: 0.55, sy: 0.55, sz: 0.55, color: '#ffd28a' });
}

const xyz = (v: V3): { x: number; y: number; z: number } => ({ x: v[0], y: v[1], z: v[2] });

/** A streak of the Rain: a line of glowing shells from one place to another. */
function streak(k: Build, a: V3, b: V3, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
    k.b.box(x - 0.6, y - 0.9, z - 0.6, x + 0.6, y + 0.9, z + 0.6, SHELL, { faces: 'NESWTB' });
    k.glows.push({ x, y: y + 1.8, z, sx: 0.4, sy: 2.6, sz: 0.4, color: '#ffd28a' });
  }
}

export function skyBlockout(k: Build): void {
  const N = -Math.PI / 2, E = 0, W = Math.PI;
  // The Pax, Darrow's flagship: over the board's east edge, its bow to the north and its port side, with the
  // spitTubes, towards the city.
  warship(k, 90, 104, 52, 100, N, PAX, { engines: 8, tubes: true });
  // two Augustan destroyers with her
  warship(k, 70, 94, 18, 38, N, AUGUSTAN);
  warship(k, 72, 112, 98, 34, W, AUGUSTAN);
  // the Bellona line over the south: the Warchild and two consorts, blue and silver
  warship(k, 18, 98, 104, 66, E, BELLONA, { engines: 6 });
  warship(k, 58, 88, 88, 32, E + 0.3, BELLONA);
  warship(k, -6, 110, 92, 30, E - 0.2, BELLONA);
  // ripWings and wasps between the lines
  for (const [x, y, z] of [[40, 92, 48], [52, 86, 66], [24, 96, 70], [60, 98, 30], [30, 84, 86], [66, 90, 78], [44, 102, 58]] as V3[]) {
    k.b.box(x - 1.6, y - 0.3, z - 0.9, x + 1.6, y + 0.3, z + 0.9, 0x2a2c31, { faces: 'NESWTB' });
    k.glows.push({ x: x - 1.9, y, z, sx: 0.5, sy: 0.3, sz: 0.5, color: '#9fd8ff' });
  }
  // a wave of the Rain from the Pax's port side: to the canyon's east end, the plateau, the peaks and the flank
  for (const [a, b] of [
    [[81, 100, 26], [95, 22, -20]],
    [[81, 100, 34], [94, 18, 4]],
    [[81, 100, 42], [93, 16, 20]],
    [[81, 100, 20], [8, 34, -95]],
    [[81, 100, 30], [0, 36, -92]],
    [[81, 100, 54], [84, 14, 88]],
    [[81, 100, 48], [20, 18, 74]],
  ] as [V3, V3][]) streak(k, a, b, 11);
  // the shield over the city: a ring at its foot for now, where its dome meets the city's walls
  const [cx, , cz] = SHIELD.c;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, x = cx + Math.cos(a) * (SHIELD.rx - 6), z = cz + Math.sin(a) * (SHIELD.rz - 6);
    k.glows.push({ x, y: F + 0.6, z, sx: 1.2, sy: 0.4, sz: 1.2, color: '#7fd6ff' });
  }
}
