// Who travels the roads of Blackwater Bay in place of cars: a drover and his
// flock, a drover and his cattle, a litter on the shoulders of its bearers, a
// string of pack mules with bales of spice, and a fishwife's barrow.
//
// These are stand-ins for the blockout, of the right sizes: plain boxes with
// the right colours, so that the roads can be driven and checked. Each follows
// the rules of `TrafficKind` in tile.ts: nose along +x, standing on y = 0, the
// middle over (0, 0), paint given in white.

import type { TrafficKind } from '../../engine/tile';
import { PART, boxAt, shapeFrom, shapePart } from '../../engine/vehicles';

const paint = (len: number, h: number, wid: number, x: number, y: number, z = 0) => shapePart(boxAt(len, h, wid, x, y, z), PART.paint, 0xffffff);
const own = (color: number, len: number, h: number, wid: number, x: number, y: number, z = 0) => shapePart(boxAt(len, h, wid, x, y, z), PART.trim, color);
/** A person standing: legs, a body in a colour, a head. */
const person = (x: number, z: number, coat: number) => [
  own(0x3a3128, 0.36, 0.8, 0.36, x, 0.4, z), own(coat, 0.46, 0.85, 0.5, x, 1.22, z), own(0xd9a77e, 0.32, 0.32, 0.32, x, 1.82, z),
];

export const TRAFFIC: TrafficKind[] = [
  {
    // a dozen sheep packed round a drover with a crook, and his dog
    name: 'flock', len: 7, wid: 3.4, lamps: false, colors: [0xece6d6, 0xe2dccb, 0xd9d1bd],
    geo: shapeFrom([paint(5.4, 1.0, 3.0, 0.6, 0.6), ...person(-2.8, 0.6, 0x6b5a3e), own(0x2b2622, 0.9, 0.5, 0.35, -2.3, 0.35, -1.2)]),
  },
  {
    // three cattle in a row, and their drover behind
    name: 'cattle', len: 7.5, wid: 2.6, lamps: false, colors: [0x7a5034, 0x3d332c, 0xb98d5c],
    geo: shapeFrom([paint(5.8, 1.5, 1.6, 0.7, 1.2), ...person(-3.2, 0, 0x5c4a35)]),
  },
  {
    // a curtained litter on two poles, and four bearers
    name: 'litter', len: 5.4, wid: 2.4, lamps: false, colors: [0x8a1d22, 0x2f4f7a, 0x5b3f6e, 0x2e5a3c],
    geo: shapeFrom([paint(2.6, 1.6, 1.5, 0, 2.2), own(0x4a3220, 5.2, 0.14, 1.8, 0, 2.0), ...person(-2.2, 0.75, 0xd8cfbd), ...person(-2.2, -0.75, 0xd8cfbd), ...person(2.2, 0.75, 0xd8cfbd), ...person(2.2, -0.75, 0xd8cfbd)]),
  },
  {
    // three mules in a string, with bales, and the muleteer ahead
    name: 'mules', len: 7.5, wid: 2, lamps: false, colors: [0xc98a3a, 0xa8402e, 0xd8b45a],
    geo: shapeFrom([own(0x6e5a48, 5.6, 1.3, 1.0, -0.6, 1.0), paint(5.2, 0.9, 1.8, -0.6, 1.9), ...person(3.2, 0, 0x7a3e2a)]),
  },
  {
    // a fishwife pushing a barrow of fish
    name: 'barrow', len: 3.6, wid: 1.6, lamps: false, colors: [0x6b7f8c, 0x8a6f4c, 0x56707a],
    geo: shapeFrom([paint(1.8, 0.7, 1.2, 0.6, 0.75), ...person(-1.1, 0, 0x9a4a3a)]),
  },
];
