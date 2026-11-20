// Delhi's own traffic: what drives among the plain cars and is of the place.
//
// An auto-rickshaw in green and yellow, a cycle rickshaw with its puller, a
// scooter with its rider, the city's buses, a school's buses in yellow and in
// white, the white saloon of Lutyens' Delhi, and a lorry with a painted body.
// Each is one rigid shape with its nose along +x, standing on y = 0: nothing
// in it moves, so wheels do not turn and nobody pedals. None carries a maker's
// name or badge.
//
// Paint is given in white and takes one of the kind's colours for each
// vehicle. Every other part keeps the colour it is given.

import type { TrafficKind } from '../../engine/tile';
import { PART, boxAt, lampsFor, shapeFrom, shapePart, sideProfile, wheelsFor } from '../../engine/vehicles';

const WHITE = 0xffffff, DARK = 0x2a2c31, GLASS = 0x1c2733, YELLOW = 0xf2c81e, SKIN = 0xb98a66, STEEL = 0xb9bcc2;
const paint = (g: ReturnType<typeof boxAt>) => shapePart(g, PART.paint, WHITE);
const trim = (g: ReturnType<typeof boxAt>, color: number) => shapePart(g, PART.trim, color);
const glass = (g: ReturnType<typeof boxAt>) => shapePart(g, PART.glass, GLASS);

/** A rider or a puller: legs, a body in a shirt of some colour, and a head, sitting with their middle at x. */
const rider = (x: number, seat: number, shirt: number, hat?: number) => [
  trim(boxAt(0.55, 0.6, 0.62, x + 0.2, seat + 0.3, 0), 0x4a4f58),
  trim(boxAt(0.5, 0.95, 0.72, x, seat + 1.05, 0), shirt),
  trim(boxAt(0.42, 0.42, 0.42, x + 0.05, seat + 1.75, 0), hat ?? SKIN),
];

/** An auto-rickshaw: green below, a yellow hood above, one wheel in front and two behind. */
const AUTO: TrafficKind = {
  name: 'auto', len: 4.4, wid: 2.3, wb: 2.9, colors: [0x2f8f4f, 0x2a8a4a, 0x379a55],
  geo: shapeFrom([
    paint(sideProfile([[-2.1, 0.5], [1.4, 0.5], [2.15, 0.8], [2.15, 1.05], [1.55, 1.3], [-2.1, 1.3]], 2.1)),
    glass(sideProfile([[1.55, 1.3], [1.2, 2.2], [1.05, 2.2], [1.05, 1.3]], 1.9)),
    trim(boxAt(3.2, 0.2, 2.2, -0.5, 2.36, 0), YELLOW), // the hood
    trim(boxAt(0.14, 0.95, 2.1, -2.03, 1.8, 0), YELLOW), // and its back
    trim(boxAt(1.0, 0.5, 1.8, -1.3, 1.55, 0), DARK), // the bench
    ...rider(0.35, 0.95, 0xd9d4cc),
    shapePart(boxAt(0.14, 0.3, 0.42, 2.17, 1.05, 0), PART.head, 0xfff4d6),
    shapePart(boxAt(0.14, 0.22, 1.7, -2.12, 0.95, 0), PART.tail, 0xc81e1e),
    ...wheelsFor(0.55, 2.3, [-1.35]),
    ...wheelsFor(0.55, 0.64, [1.75]),
  ]),
};

/** A cycle rickshaw: the puller on his saddle, and a seat for two under a hood of oilcloth. It has no lamps. */
const RICKSHAW: TrafficKind = {
  name: 'rickshaw', len: 4.6, wid: 2.2, wb: 3.0, lamps: false, colors: [0xc8322a, 0x2a6fb0, 0x2f8f4f, 0xc8322a, 0x7a3fa0],
  geo: shapeFrom([
    trim(boxAt(1.4, 0.45, 1.75, -1.25, 1.15, 0), 0x8a5a3a), // the seat
    paint(sideProfile([[-2.1, 1.38], [-0.55, 1.38], [-0.3, 2.75], [-1.95, 2.95], [-2.2, 2.25]], 1.85)), // the hood
    trim(boxAt(2.9, 0.12, 0.14, 0.35, 0.95, 0), DARK), // the frame
    trim(boxAt(0.12, 0.95, 0.12, 1.72, 1.4, 0), DARK),
    trim(boxAt(0.12, 0.12, 1.25, 1.62, 1.88, 0), STEEL),
    ...rider(0.55, 1.05, 0xe9e3d6),
    ...wheelsFor(0.82, 2.2, [-1.3]),
    ...wheelsFor(0.82, 0.64, [1.8]),
  ]),
};

/** A scooter and its rider, in a helmet. */
const BIKE: TrafficKind = {
  name: 'bike', len: 3.6, wid: 1.5, wb: 2.4, colors: [0x2a2c31, 0xc8322a, 0x2a6fb0, 0xf2f0ea, 0x8e939b, 0x2f8f4f],
  geo: shapeFrom([
    paint(sideProfile([[-1.6, 0.55], [0.4, 0.45], [1.1, 0.7], [1.25, 1.55], [1.0, 1.6], [0.7, 0.95], [-0.3, 0.95], [-0.5, 1.25], [-1.65, 1.25]], 0.72)),
    trim(boxAt(1.2, 0.2, 0.62, -1.0, 1.36, 0), DARK), // the seat
    trim(boxAt(0.12, 0.12, 1.2, 1.12, 1.72, 0), STEEL), // the handlebar
    ...rider(-0.55, 1.4, 0x5b6b7a, 0xf2f0ea),
    shapePart(boxAt(0.14, 0.26, 0.36, 1.3, 1.25, 0), PART.head, 0xfff4d6),
    shapePart(boxAt(0.12, 0.2, 0.4, -1.68, 1.05, 0), PART.tail, 0xc81e1e),
    ...wheelsFor(0.5, 0.64, [1.15, -1.2]),
  ]),
};

/** One of the city's low-floor buses: green, red, orange or blue, with tanks of gas along its roof. */
const BUS: TrafficKind = {
  name: 'city-bus', len: 10.4, wid: 3.3, wb: 6.2, colors: [0x2f9a5a, 0x2f9a5a, 0xc8402f, 0xe8862a, 0x2f7fb5],
  geo: shapeFrom([
    paint(boxAt(10.4, 1.25, 3.3, 0, 1.12, 0)),
    glass(boxAt(10.1, 1.25, 3.18, 0, 2.37, 0)),
    paint(boxAt(10.4, 0.45, 3.3, 0, 3.22, 0)),
    trim(boxAt(10.42, 0.2, 3.32, 0, 1.68, 0), 0xf2efe6), // a pale band under the windows
    ...[-4.9, -2.3, 0.3, 2.9].map((x) => paint(boxAt(0.26, 1.25, 3.22, x, 2.37, 0))),
    trim(boxAt(5.2, 0.34, 1.9, -1.0, 3.62, 0), 0xd8dde4), // the tanks
    ...wheelsFor(1.05, 3.3, [3.3, -3.0]),
    ...lampsFor(5.22, -5.22, 0.95, 1.2, 3.3),
  ]),
};

/** A school's bus: yellow, or white, with a dark band along it and a rack on its roof. */
const SCHOOL_BUS: TrafficKind = {
  name: 'school-bus', len: 8.6, wid: 3.2, wb: 5.2, colors: [0xf2c81e, 0xf4f1e8, 0xf2c81e, 0xf4f1e8, 0xf2c81e],
  geo: shapeFrom([
    paint(sideProfile([[-4.3, 0.6], [4.1, 0.6], [4.3, 1.1], [4.3, 1.75], [-4.3, 1.75]], 3.2)),
    glass(boxAt(8.0, 1.0, 3.08, -0.1, 2.25, 0)),
    paint(boxAt(8.5, 0.5, 3.2, -0.05, 3.0, 0)),
    trim(boxAt(8.62, 0.22, 3.22, 0, 1.5, 0), DARK),
    ...[-4.1, -2.1, -0.1, 1.9].map((x) => paint(boxAt(0.24, 1.0, 3.12, x, 2.25, 0))),
    trim(boxAt(4.6, 0.12, 2.2, -0.8, 3.34, 0), STEEL),
    ...wheelsFor(1.0, 3.2, [2.7, -2.6]),
    ...lampsFor(4.32, -4.32, 1.0, 1.2, 3.2),
  ]),
};

/** The round-backed saloon that carried Delhi's officials for half a century, in white. No badge. */
const SALOON: TrafficKind = {
  name: 'white-saloon', len: 7.0, wid: 3.0, wb: 4.3, colors: [0xf4f1e8, 0xf4f1e8, 0xeeeae0],
  geo: shapeFrom([
    paint(sideProfile([[-3.5, 0.6], [3.3, 0.55], [3.5, 0.95], [3.4, 1.35], [2.6, 1.55], [1.2, 1.6], [-1.9, 1.6], [-3.0, 1.45], [-3.5, 1.1]], 3.0)),
    glass(sideProfile([[1.25, 1.58], [0.7, 2.25], [-1.5, 2.3], [-2.2, 1.58]], 2.55)),
    paint(sideProfile([[0.85, 2.2], [0.55, 2.42], [-1.35, 2.46], [-1.7, 2.26]], 2.5)),
    trim(boxAt(0.2, 0.3, 2.3, 3.5, 1.05, 0), STEEL), // a grille of chrome
    trim(boxAt(0.16, 0.16, 3.04, 3.52, 0.72, 0), STEEL), // and the two bumpers
    trim(boxAt(0.16, 0.16, 3.04, -3.52, 0.78, 0), STEEL),
    ...wheelsFor(0.95, 3.0, [2.15, -2.1]),
    ...lampsFor(3.5, -3.52, 1.2, 1.2, 3.0),
  ]),
};

/** A lorry in the colours of truck art: a painted cab, and a load body with panels of colour and a yellow tailboard. */
const LORRY: TrafficKind = {
  name: 'lorry', len: 9.6, wid: 3.4, wb: 5.6, colors: [0xe8862a, 0x2a6fb0, 0x2f8f4f, 0xc8402f],
  geo: shapeFrom([
    paint(sideProfile([[2.2, 0.7], [4.7, 0.7], [4.8, 1.3], [4.75, 2.2], [4.3, 3.1], [2.2, 3.1]], 3.3)), // the cab
    glass(sideProfile([[4.76, 2.2], [4.36, 3.0], [3.6, 3.0], [3.6, 2.2]], 3.0)),
    trim(boxAt(2.7, 0.3, 3.36, 3.45, 3.3, 0), YELLOW), // the crown over the cab
    trim(boxAt(6.9, 0.3, 3.2, -1.3, 1.1, 0), DARK), // the bed
    paint(boxAt(6.9, 1.9, 3.4, -1.3, 2.2, 0)), // the load body
    ...[-3.9, -2.2, -0.5, 1.2].map((x, i) => trim(boxAt(1.4, 1.2, 3.44, x, 2.2, 0), [0xc8202c, YELLOW, 0x1f8f4f, 0xff7fb0][i])), // its painted panels
    trim(boxAt(0.14, 1.7, 3.2, -4.78, 2.2, 0), YELLOW), // the tailboard
    trim(boxAt(0.16, 0.5, 2.6, -4.8, 2.3, 0), 0xc8202c),
    ...wheelsFor(1.1, 3.4, [3.3, -2.9]),
    ...lampsFor(4.82, -4.8, 1.1, 1.0, 3.4),
  ]),
};

// A route's `paint` would repaint every kind on it, the autos and the buses too. So the city's ordinary cars are kinds
// of the tile's own as well, in Delhi's colours: mostly white and silver, with a little colour among them.
const CITY = [0xf2f0ea, 0xf2f0ea, 0xf2f0ea, 0xf2f0ea, 0xd9dbe0, 0xd9dbe0, 0xbfc3c9, 0x8e939b, 0x5b6b7a, 0x9c2b2b, 0x2a3f6b, 0x1b1b1f];

/** A saloon. */
const CAR: TrafficKind = {
  name: 'car', len: 7.2, wid: 3.1, wb: 4.4, colors: CITY,
  geo: shapeFrom([
    paint(sideProfile([[-3.6, 0.55], [3.5, 0.5], [3.6, 0.9], [3.45, 1.25], [1.3, 1.45], [-2.2, 1.5], [-3.6, 1.4]], 3.1)),
    glass(sideProfile([[1.2, 1.42], [0.35, 2.2], [-1.7, 2.2], [-2.5, 1.48]], 2.6)),
    paint(boxAt(2.15, 0.13, 2.5, -0.675, 2.26, 0)),
    ...wheelsFor(0.98, 3.1, [2.2, -2.2]),
    ...lampsFor(3.56, -3.58, 1.02, 1.2, 3.1),
  ]),
};

/** A small hatchback, of which Delhi has more than of anything else. */
const SMALL_CAR: TrafficKind = {
  name: 'small-car', len: 6.0, wid: 2.9, wb: 3.7, colors: CITY,
  geo: shapeFrom([
    paint(sideProfile([[-3.0, 0.55], [2.9, 0.5], [3.0, 0.9], [2.85, 1.25], [1.2, 1.5], [-3.0, 1.55]], 2.9)),
    glass(sideProfile([[1.1, 1.48], [0.45, 2.3], [-2.5, 2.3], [-2.9, 1.55]], 2.4)),
    paint(boxAt(2.9, 0.13, 2.3, -1.05, 2.36, 0)),
    ...wheelsFor(0.92, 2.9, [1.9, -1.9]),
    ...lampsFor(2.96, -2.98, 1.02, 1.25, 2.9),
  ]),
};

/** A small van with a flat nose and sliding doors: a school run, a delivery, a family of eight. */
const MINI_VAN: TrafficKind = {
  name: 'mini-van', len: 6.4, wid: 2.9, wb: 3.9, colors: [0xf2f0ea, 0xf2f0ea, 0xd9dbe0, 0xbfc3c9, 0x2a3f6b],
  geo: shapeFrom([
    paint(sideProfile([[-3.2, 0.55], [3.0, 0.55], [3.2, 1.0], [3.15, 1.7], [-3.2, 1.7]], 2.9)),
    glass(sideProfile([[3.14, 1.7], [2.7, 2.7], [-3.1, 2.7], [-3.1, 1.7]], 2.78)),
    paint(boxAt(5.9, 0.16, 2.9, -0.25, 2.78, 0)),
    ...[-3.1, -1.2, 0.8].map((x) => paint(boxAt(0.22, 1.0, 2.84, x, 2.2, 0))),
    ...wheelsFor(0.9, 2.9, [2.1, -2.1]),
    ...lampsFor(3.18, -3.2, 1.05, 1.2, 2.9),
  ]),
};

/** Every kind of traffic that is Delhi's own. */
export const KINDS: TrafficKind[] = [CAR, SMALL_CAR, MINI_VAN, AUTO, RICKSHAW, BIKE, BUS, SCHOOL_BUS, SALOON, LORRY];
