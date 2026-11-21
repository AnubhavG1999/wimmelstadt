// The regions of the tile, each a file of its own built by one builder, and
// what they add up to. A lot that no region builds stands as a plain box with
// its name on a board.

import * as arkham from './arkham';
import * as bay from './bay';
import * as bayside from './bayside';
import * as bristol from './bristol';
import * as civic from './civic';
import * as docks from './docks';
import * as eastend from './eastend';
import type { Region } from './models';
import * as park from './park';
import * as towers from './towers';
import * as uptown from './uptown';
import * as waterfront from './waterfront';

export const REGIONS: Record<string, Region> = { towers, civic, park, waterfront, bayside, uptown, eastend, docks, bristol, arkham, bay };
