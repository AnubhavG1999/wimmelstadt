// Downtown: the invented middle of the city, and the look prototype's board
// grown into a tile. A raised ring road runs round a park with Halo Tower in
// its middle and passes through the Gate Tower on its way. A street runs
// through the tower's base underneath it. The showroom faces the boulevard, the
// car park keeps its two spirals, and heroes arrive at the harbour.
//
// While the tile is a blockout, it has its four models and one rough shape.
// The rest of what belongs here is still to be thought up.

import { circle, rect, type TilePlan } from './plan.ts';

/** The middle of the park, and of the ring road. */
const HUB: [number, number] = [136, 136];

export const DOWNTOWN: TilePlan = {
  id: 'downtown',
  name: 'Downtown',

  water: [
    rect(212, 8, 272, 50), // the harbour
    { round: [110, 118], rx: 11, rz: 7 }, // the pond in the park
  ],
  land: [],
  parks: [{ round: HUB, rx: 48, rz: 48 }],
  hills: [],

  streets: [
    { id: 'boulevard', name: 'the Boulevard', kind: 'boulevard', path: [[0, 240], [280, 240]], width: 12, drive: true },
    // this one runs through the base of the Gate Tower
    { id: 'gate-street', kind: 'street', path: [[0, 66], [280, 66]], width: 8, drive: true },
    { id: 'south-street', kind: 'street', path: [[0, 204], [280, 204]], width: 8 },
    { id: 'west-street', kind: 'street', path: [[68, 0], [68, 280]], width: 8, drive: true },
    { id: 'east-street', kind: 'street', path: [[204, 0], [204, 280]], width: 8, drive: true },
    { id: 'park-road', kind: 'street', path: circle(HUB[0], HUB[1], 52, 40), width: 6, closed: true },
    { id: 'west-link', kind: 'street', path: [[0, 136], [84, 136]], width: 7 },
    { id: 'east-link', kind: 'street', path: [[188, 136], [280, 136]], width: 7 },
    { id: 'north-approach', kind: 'street', path: [[136, 0], [136, 48]], width: 6 },
  ],

  raised: [
    { id: 'ring', name: 'the Ring', path: circle(HUB[0], HUB[1], 70, 72).map(([x, z]): [number, number, number] => [x, z, 24]), width: 9, closed: true, drive: true, pillars: 22 },
  ],

  rails: [],
  quarters: [],
  fills: [{ area: [0, 0, 280, 280], style: 'downtown' }],

  things: [
    { id: 'halo', name: 'Halo Tower', at: HUB, major: true, model: 'halo', clear: [14, 14], top: 168 },
    { id: 'gate-tower', name: 'the Gate Tower', at: [136, 66], major: true, model: 'gate-tower', clear: [15, 17], top: 129 },
    { id: 'showroom', name: 'Mochi Motors showroom', at: [136, 224], major: true, model: 'showroom', clear: [17.5, 8], top: 15 },
    { id: 'car-park', name: 'Ponpoko car park', at: [36, 178], major: true, model: 'car-park', clear: [23, 23.5], top: 29 },
    {
      id: 'car-transporter', name: 'the car transporter', at: [242, 27], major: true, afloat: true, top: 13,
      solids: [
        { box: [34, 9, 4.6], at: [0, 0, -0.6], colour: 0xc8523f }, { box: [30, 8, 3.4], at: [-1, 0, 4], colour: 0xf2efe6, windows: true },
        { box: [5, 7, 3], at: [12, 0, 7.4], colour: 0xf2efe6, windows: true }, { drum: [0.9, 0.7, 3], sides: 8, at: [8, 0, 7.4], colour: 0x2b2e35 },
      ],
    },
  ],
};
