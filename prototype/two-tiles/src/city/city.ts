// The city: which tiles there are, and where each one stands. Tiles stand in a
// grid with an avenue between every two and round the outside. A tile knows
// nothing about its neighbours, so moving one is a change to this table and to
// nothing else.

import { DOWNTOWN } from './downtown.ts';
import { NORTH_AMERICA } from './north-america.ts';
import { AVENUE, TILE, type P, type TilePlan } from './plan.ts';

/** A tile and the square of the grid it stands on, counted from the north-west. */
export interface Placed { plan: TilePlan; col: number; row: number }

export const CITY: Placed[] = [
  { plan: NORTH_AMERICA, col: 0, row: 0 },
  { plan: DOWNTOWN, col: 1, row: 0 },
];

/** From the middle of one avenue to the middle of the next. */
export const PITCH = TILE + AVENUE;

/** Where a tile's north-west corner is in the city. */
export const origin = (t: Placed): P => [t.col * PITCH, t.row * PITCH];

/** How many tiles the grid is across, and how many down. */
export const COLS = Math.max(...CITY.map((t) => t.col)) + 1, ROWS = Math.max(...CITY.map((t) => t.row)) + 1;
const cols = COLS, rows = ROWS;

/** The city's edges, taking in the avenue that runs round the outside. */
export const BOUNDS = { x0: -AVENUE, z0: -AVENUE, x1: cols * PITCH, z1: rows * PITCH };

/** The middle line of every avenue: those that run north to south, then those that run west to east. */
export const AVENUES: { id: string; from: P; to: P }[] = [
  ...Array.from({ length: cols + 1 }, (_, i) => ({ id: `avenue-n${i}`, from: [i * PITCH - AVENUE / 2, BOUNDS.z0 + AVENUE / 2] as P, to: [i * PITCH - AVENUE / 2, BOUNDS.z1 - AVENUE / 2] as P })),
  ...Array.from({ length: rows + 1 }, (_, j) => ({ id: `avenue-w${j}`, from: [BOUNDS.x0 + AVENUE / 2, j * PITCH - AVENUE / 2] as P, to: [BOUNDS.x1 - AVENUE / 2, j * PITCH - AVENUE / 2] as P })),
];

/** The avenue that runs right round the outside of the city, as one closed line. */
export const OUTER: P[] = [
  [BOUNDS.x0 + AVENUE / 2, BOUNDS.z0 + AVENUE / 2], [BOUNDS.x1 - AVENUE / 2, BOUNDS.z0 + AVENUE / 2],
  [BOUNDS.x1 - AVENUE / 2, BOUNDS.z1 - AVENUE / 2], [BOUNDS.x0 + AVENUE / 2, BOUNDS.z1 - AVENUE / 2],
];
