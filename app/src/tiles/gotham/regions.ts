// The regions of the tile, each a file of its own built by one builder, and
// what they add up to. A lot whose file is not here yet stands as a plain box
// with its name on a board.

import type { Region } from './models';

export const REGIONS: Record<string, Region> = {};
