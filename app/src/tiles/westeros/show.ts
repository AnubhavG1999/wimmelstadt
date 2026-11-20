// The dragons' show, as data: which formation they fly where on the circuit,
// where the fire and the roll come, and what each does alone when they split.
// Nothing in this file draws or moves anything.
//
// Places on the circuit are named by their number in CIRCUIT, in plan.ts:
//   0 to 3    the run-in over the south-east sea
//   4 to 6    the low pass, north along the east edge
//   7 to 10   the pull-up and the climb; 10 is the top
//   11 to 14  off the top and west over the bay; 13 is over the Dragonpit
//   15 to 17  north up the kingsroad
//   18 to 25  once round Winterfell
//   26 to 30  north-east to the Wall's east end
//   31 to 34  west along the Wall
//   35 to 42  south down the west coast
//   43 to 54  round the Hightower
//   55 to 57  east along the south shore

import { ABREAST, ASTERN, ECHELON_LEFT, TRAIL, VIC, type Formation, type ShowPlan } from './flight';
import { CIRCUIT, DRAGONMONT, lotOf, type Waypoint } from './plan';

/** The echelon of the low pass: tighter than the usual one, to keep all three clear of Storm's End. */
const ECHELON_PASS: Formation = [[0, 0, 0], [-5, 9, 0], [-10, 18, 0]];

/**
 * Where Drogon lands: the back rim of the Dragonmont's crater, at the height of the mountain's top.
 * The places before and after it lie on the line he faces along, so that he comes down facing that way.
 */
const PERCH: Waypoint = [DRAGONMONT.perch[0], lotOf('dragonmont').top, DRAGONMONT.perch[1], 5];

export const SHOW: ShowPlan = {
  circuit: CIRCUIT,
  top: 10,
  rejoin: 13,
  pass: 4,
  pull: 6,
  lance: 8,
  roll: 31,
  keys: [
    { at: 2, form: ECHELON_PASS, over: 30 }, // over the sea, into echelon for the pass
    { at: 6, form: ABREAST, over: 26 }, // side by side for the climb
    { at: 11, form: VIC, over: 50 }, // the arrowhead again, off the top
    { at: 17, form: ECHELON_LEFT, over: 40 }, // both wingmen inside the turn round Winterfell
    { at: 26, form: ASTERN, over: 60 }, // one behind another for the Wall
    { at: 35, form: ECHELON_LEFT, over: 50 }, // side by side against the sea, down the west coast
    { at: 42, form: TRAIL, over: 36 }, // in trail round the Hightower
    { at: 54, form: VIC, over: 50 }, // the arrowhead, east along the south shore
  ],
  solos: [
    // Drogon: down to the sea in the south-east corner, a long breath over open water, back north past
    // Storm's End and up the west side of Dragonstone, round to the right in a hard turn north of the
    // Dragonmont, and down over its back onto the high rim of its crater. There he stands a while, the
    // crater before him, facing the view the tile opens with. Then off over the crater, round the south
    // of the island and up to the others.
    {
      way: [
        [97, 100, 54, 22], [99, 72, 70, 44], [98, 40, 86, 50], [96, 24, 100, 46],
        [92, 24, 109, 34], [84, 27, 106, 30], [82, 30, 90, 30], [82, 30, 66, 30],
        [81, 34, 46, 28], [78, 44, 27, 26], [78.5, 46, 9, 22], [84.5, 43, 1, 17], [90.2, 38, 5.5, 12.5], [91.4, 33, 13.7, 8.5],
        PERCH,
        [99, 29, 26.9, 12], [99.6, 30, 34.5, 18], [95, 31.5, 43.5, 22], [83.5, 37, 42.5, 26], [75, 45, 28, 28], [69, 52, 16, 32],
      ],
      fire: [{ at: 2, seconds: 1.5 }],
      perch: { at: 14, seconds: 9 },
      beats: [{ at: 13, n: 3 }],
    },
    // Rhaegal: west across the riverlands to the Sunset Sea, south over Pyke and past the Rock, then very
    // low down the sea past the Hightower on its seaward side, with one short breath over open water where
    // the tower does not stand between him and the opening view. Round the south-west corner, once round
    // Highgarden, and back north-east.
    {
      way: [
        [84, 96, 42, 30], [60, 74, 40, 50], [20, 60, 28, 54], [-30, 58, 0, 52], [-70, 56, -26, 48], [-90, 46, -40, 40],
        [-95, 44, -20, 36], [-95, 50, 10, 36], [-96, 48, 28, 38],
        [-97, 38, 46, 42], [-98, 22, 66, 46], [-98, 15, 84, 46], [-98, 15, 96, 46],
        [-96, 19, 106, 42], [-88, 28, 111, 36], [-72, 38, 110, 33], [-56, 48, 102, 32],
        [-34, 54, 99, 32], [-12, 54, 86, 32], [-10, 55, 64, 32], [-34, 55, 54, 32], [-56, 55, 62, 32], [-62, 55, 82, 32],
        [-40, 55, 98, 32], [-14, 55, 88, 32], [-6, 56, 64, 32], [2, 56, 46, 34], [14, 57, 34, 34], [40, 57, 22, 34],
      ],
      fire: [{ at: 11, seconds: 0.5 }],
    },
    // Viserion: north to Winterfell, up over it in circles that widen, down to the Wall, along it alone,
    // and back down the east side over the Vale and Dragonstone.
    {
      way: [
        [96, 96, 36, 30], [84, 74, 10, 42], [60, 62, -24, 42], [30, 58, -44, 38],
        [6, 57, -60, 26], [-6, 60, -79, 25], [-28, 63, -80, 25], [-38, 66, -60, 25], [-28, 69, -41, 25], [-4, 71, -40, 25],
        [14, 74, -58, 25], [0, 77, -84, 25], [-30, 79, -86, 26], [-46, 80, -62, 28],
        [-30, 66, -66, 38], [-6, 44, -75, 42],
        [30, 37, -76, 42], [70, 37, -76, 40],
        [84, 38, -70, 34], [88, 50, -56, 34], [87, 70, -30, 34], [89, 68, -8, 34], [90, 64, 12, 32], [86, 61, 26, 32], [76, 59, 24, 32],
      ],
      beats: [{ at: 4, n: 3 }, { at: 8, n: 3 }],
    },
  ],
};
