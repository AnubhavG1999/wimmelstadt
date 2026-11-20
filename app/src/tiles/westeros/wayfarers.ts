// Who travels the roads of Westeros in place of cars: riders, carts and wains.
//
// A stand-in until the shapes are built: each kind is a plain block of its
// size, so that the roads can be driven and checked.

import { PART, boxAt, shapeFrom, shapePart } from '../../engine/vehicles';
import type { TrafficKind } from '../../engine/tile';

const block = (name: string, len: number, wid: number, high: number, colors: number[]): TrafficKind => ({
  name, len, wid, colors, lamps: false,
  geo: shapeFrom([shapePart(boxAt(len, high, wid, 0, high / 2 + 0.2, 0), PART.paint, 0xffffff)]),
});

export const WAYFARERS: TrafficKind[] = [
  block('rider', 4.2, 1.6, 3.2, [0x6a6f78, 0x8c1c1c, 0xd9b23c, 0x3f7a3a]),
  block('banner', 4.2, 1.6, 5, [0x8c1c1c, 0xd9b23c, 0x2f5fa8]),
  block('watch', 4.4, 3.4, 3.2, [0x1c1c20]),
  block('cart', 7.4, 2.6, 2.6, [0x8a6a44, 0x6b5136]),
  block('haywain', 9.4, 3, 3.6, [0xd9c36a]),
  block('wain', 9.6, 3, 3.8, [0xe6dcc0, 0xc9b99a]),
  block('wheelhouse', 9.8, 3.4, 4.6, [0x8c1c1c, 0x2f5fa8]),
];
