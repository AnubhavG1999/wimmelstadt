// The regions of the tile, each a file of its own built by one builder, and
// what they add up to.

import * as canyon from './canyon';
import * as citadel from './citadel';
import * as flank from './flank';
import type { Region } from './models';
import * as quarter from './quarter';
import * as towers from './towers';
import * as walls from './walls';

export const REGIONS: Record<string, Region> = { citadel, towers, canyon, walls, quarter, flank };
