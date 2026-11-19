// North America: five cities on one tile. Chicago on its lake in the north-west,
// New York round its harbour in the north-east, St. Louis and New Orleans on the
// Mississippi, which runs down the middle, and San Francisco on its hills above
// the bay in the south-west.
//
// Its roads are a cross with a diagonal: a boulevard from west to east, a raised
// freeway from north to south with a stack where they meet, and Route 66 from
// Chicago to the south edge.
//
// While the tile is a blockout, only six of its things have their model. The
// rest stand as rough shapes, and its ordinary buildings as plain volumes.

import { rect, type Solid, type TilePlan } from './plan.ts';

const BRICK = 0xa5553f, STONE = 0xd9d0bf, WHITE = 0xf2efe6, STEEL = 0x8a929c, BLACK = 0x2b2e35, WOOD = 0xd9c39a;
const PASTEL = [0xf2b8a0, 0x9fd3c9, 0xf6dc9a, 0xb9cfe6, 0xf2a9b8, 0xcfe0b0];

/** A row of narrow gabled houses side by side: the Painted Ladies. */
const terrace: Solid[] = PASTEL.flatMap((colour, i): Solid[] => [
  { box: [5.4, 3, 6.4], at: [0, -7.5 + i * 3, 0], colour, windows: true },
  { box: [5.6, 3.1, 1.1], at: [0, -7.5 + i * 3, 6.4], colour: 0x6b5a5a },
]);

/** The gondolas of a big wheel, standing across the pier. */
const wheel: Solid[] = Array.from({ length: 12 }, (_, i): Solid => {
  const a = (i / 12) * Math.PI * 2;
  return { box: [1.1, 0.9, 1.1], at: [Math.cos(a) * 6.2, 0, 8 + Math.sin(a) * 6.2], colour: i % 2 ? 0xe2532f : WHITE };
});

export const NORTH_AMERICA: TilePlan = {
  id: 'north-america',
  name: 'North America',

  water: [
    rect(104, 8, 152, 40), // Lake Michigan
    { line: [[104, 30], [66, 30], [52, 44], [52, 56]], width: 8 }, // the Chicago River
    { outline: [[234, 36], [262, 36], [262, 112], [244, 112], [236, 104], [234, 84]] }, // New York Harbor
    { line: [[150, 112], [153, 130], [149, 156], [146, 180], [148, 204], [152, 224], [154, 244], [152, 260]], width: 11 }, // the Mississippi
    { round: [151, 264], rx: 13, rz: 7 }, // its delta
    { outline: [[8, 206], [52, 198], [84, 214], [92, 244], [80, 272], [8, 272]] }, // San Francisco Bay
    { round: [178, 22], rx: 9, rz: 5 }, // the pond in Central Park
  ],
  land: [
    { outline: [[8, 240], [36, 236], [46, 272], [8, 272]] }, // the headland across the Golden Gate
    { round: [250, 96], rx: 8, rz: 8 }, // Liberty Island
  ],
  parks: [
    rect(156, 4, 199.5, 45), // Central Park
    rect(104, 44, 126, 58), // Millennium Park
    rect(100, 66, 148, 102), // Grant Park
    rect(128, 131, 144, 165), // the Arch grounds
    rect(51, 181, 69, 193), // Alamo Square
    rect(27, 153, 45, 175), // the gardens of Lombard Street
    { outline: [[8, 240], [36, 236], [46, 272], [8, 272]] },
    { round: [250, 96], rx: 8, rz: 8 },
  ],
  hills: [
    { at: [36, 164], r: 16, h: 11 }, // Russian Hill
    { at: [86, 166], r: 13, h: 10 }, // Telegraph Hill
  ],

  streets: [
    { id: 'boulevard', name: 'the Boulevard', kind: 'boulevard', path: [[0, 124], [280, 124]], width: 12, drive: true },
    { id: 'route-66', name: 'Route 66', kind: 'route', path: [[94, 110], [112, 150], [112, 196], [108, 280]], width: 8, drive: true },
    // Chicago
    { id: 'michigan-avenue', kind: 'street', path: [[94, 0], [94, 118]], width: 7, drive: true },
    { id: 'state-street', kind: 'street', path: [[56, 62], [56, 118]], width: 6 },
    { id: 'wells-street', kind: 'street', path: [[18, 44], [18, 118]], width: 6 },
    { id: 'lake-street', kind: 'street', path: [[0, 62], [94, 62]], width: 6, drive: true },
    { id: 'van-buren-street', kind: 'street', path: [[18, 106], [94, 106]], width: 6 },
    { id: 'addison-street', kind: 'street', path: [[0, 44], [44, 44]], width: 5 },
    { id: 'clark-street', kind: 'street', path: [[42, 0], [42, 41]], width: 5 },
    { id: 'columbus-drive', kind: 'street', path: [[152, 44], [152, 100]], width: 6 },
    // New York
    { id: 'fifth-avenue', kind: 'street', path: [[178, 48], [178, 118]], width: 7 },
    { id: 'under-the-freeway', kind: 'street', path: [[204, 0], [204, 280]], width: 8 },
    { id: '59th-street', kind: 'street', path: [[152, 48], [230, 48]], width: 6 },
    { id: '42nd-street', kind: 'street', path: [[152, 74], [280, 74]], width: 6, drive: true },
    { id: '14th-street', kind: 'street', path: [[152, 100], [204, 100]], width: 6 },
    // St. Louis
    { id: 'market-street', kind: 'street', path: [[100, 158], [128, 158]], width: 6 },
    // San Francisco
    { id: 'polk-street', kind: 'street', path: [[24, 130], [24, 204]], width: 6 },
    { id: 'hyde-street', kind: 'street', path: [[48, 130], [48, 198]], width: 6 },
    { id: 'kearny-street', kind: 'street', path: [[72, 130], [72, 212]], width: 6 },
    { id: 'california-street', kind: 'street', path: [[0, 150], [100, 150]], width: 6 },
    { id: 'fell-street', kind: 'street', path: [[0, 178], [100, 178]], width: 6, drive: true },
    { id: 'lombard-street', name: 'Lombard Street', kind: 'lane', path: [[45, 164], [42, 157], [39, 171], [36, 157], [33, 171], [30, 157], [27, 164]], width: 3 },
    { id: 'golden-gate-road', kind: 'street', path: [[72, 196], [62, 203], [34, 238], [30, 256], [26, 280]], width: 7, drive: true },
    // New Orleans
    { id: 'st-charles-avenue', kind: 'street', path: [[190, 226], [214, 210], [238, 188], [250, 160], [280, 160]], width: 8, drive: true },
    { id: 'bourbon-street', kind: 'lane', path: [[161, 235.3], [197.3, 223.6]], width: 4 },
    { id: 'royal-street', kind: 'lane', path: [[166.7, 252.4], [199.5, 241.8]], width: 4 },
    { id: 'st-peter-street', kind: 'lane', path: [[166.9, 220.8], [179.9, 260.8]], width: 4 },
    { id: 'st-ann-street', kind: 'lane', path: [[184.1, 215.2], [197.1, 255.2]], width: 4 },
  ],

  raised: [
    // the freeway comes down to street level at both edges, as every road must
    { id: 'freeway', name: 'the Freeway', path: [[204, 0, 0], [204, 42, 9], [204, 238, 9], [204, 280, 0]], width: 9, drive: true, pillars: 24 },
    // the stack: four ramps between the boulevard and the freeway
    { id: 'stack-nw', path: [[176, 119, 0], [190, 113, 4.5], [199.5, 98, 9]], width: 5 },
    { id: 'stack-ne', path: [[232, 119, 0], [218, 113, 4.5], [208.5, 98, 9]], width: 5 },
    { id: 'stack-sw', path: [[176, 129, 0], [190, 135, 4.5], [199.5, 150, 9]], width: 5 },
    { id: 'stack-se', path: [[232, 129, 0], [218, 135, 4.5], [208.5, 150, 9]], width: 5 },
  ],

  rails: [
    { id: 'the-l', kind: 'trestle', path: [[18, 62], [94, 62], [94, 106], [18, 106]], closed: true, y: 7.5 },
    { id: 'streetcar', kind: 'tram', path: [[190, 226], [214, 210], [238, 188], [250, 160], [280, 160]] },
    { id: 'cable-car', kind: 'tram', path: [[72, 130], [72, 212]] },
  ],

  quarters: [
    { name: 'Chicago', at: [56, 84] },
    { name: 'New York', at: [190, 62] },
    { name: 'St. Louis', at: [122, 170] },
    { name: 'San Francisco', at: [50, 140] },
    { name: 'New Orleans', at: [226, 236] },
  ],

  fills: [
    { area: [0, 0, 100, 118], style: 'chicago' },
    { area: [100, 44, 152, 118], style: 'chicago' },
    { area: [152, 0, 280, 118], style: 'new-york' },
    { area: [100, 130, 146, 204], style: 'st-louis' },
    { area: [100, 204, 152, 280], style: 'roadside' },
    { area: [0, 130, 100, 280], style: 'san-francisco' },
    { area: [160, 214, 200, 264], style: 'french-quarter', turn: -18 },
    { area: [146, 130, 280, 280], style: 'new-orleans' },
  ],

  things: [
    // --- with their model already ---
    { id: 'sears', name: 'Sears Tower', at: [37, 90], major: true, model: 'sears', scale: 0.9, clear: [10.5, 10.5], top: 160 },
    { id: 'twin-towers', name: 'the Twin Towers', at: [220, 92], major: true, model: 'twin-towers', clear: [12.5, 15], top: 162 },
    { id: 'empire-state', name: 'Empire State Building', at: [165, 87], major: true, model: 'empire-state', scale: 0.82, clear: [6.5, 9.8], top: 113 },
    { id: 'liberty', name: 'Statue of Liberty', at: [250, 96], major: true, model: 'liberty', clear: [0, 0], top: 31 },
    { id: 'gateway-arch', name: 'Gateway Arch', at: [136, 148], major: true, model: 'gateway-arch', scale: 0.6, clear: [4, 17], top: 33 },
    { id: 'golden-gate', name: 'Golden Gate Bridge', at: [48, 220.5], major: true, model: 'golden-gate', span: [[62, 203], [34, 238]], top: 28 },

    // --- New York ---
    {
      id: 'brooklyn-bridge', name: 'Brooklyn Bridge', at: [248, 74], major: true, top: 22,
      solids: [
        { box: [3, 9, 20], at: [-7, 0, -2.4], colour: 0x9a8a74 }, { box: [3, 9, 20], at: [7, 0, -2.4], colour: 0x9a8a74 },
      ],
    },
    {
      id: 'chrysler', name: 'Chrysler Building', at: [186, 55], major: true, clear: [4.6, 4.2],
      solids: [
        { box: [8, 7.4, 52], colour: 0xc9cdd2, windows: true }, { drum: [3.6, 2.2, 8], sides: 8, at: [0, 0, 52], colour: STEEL, lit: 0.8 },
        { drum: [2.2, 0.9, 7], sides: 8, at: [0, 0, 60], colour: STEEL, lit: 0.8 }, { drum: [0.5, 0.05, 12], sides: 6, at: [0, 0, 67], colour: 0xdfe3e6 },
      ],
    },
    { id: 'flatiron', name: 'Flatiron Building', at: [190.5, 87], clear: [4.4, 9], solids: [{ box: [6.5, 16, 32], colour: STONE, windows: true }, { box: [3.6, 4, 32], at: [0, -10, 0], colour: STONE, windows: true }] },
    {
      id: 'grand-central', name: 'Grand Central', at: [190.5, 65.5], major: true, clear: [8.5, 5.6],
      solids: [{ box: [16, 10.5, 8], colour: STONE, windows: true, top: 0x7fb5a5 }, { box: [9, 10.7, 3], at: [0, 0, 8], colour: STONE, top: 0x7fb5a5 }],
    },
    { id: 'central-park', name: 'Central Park', at: [178, 34], top: 6 },
    {
      id: 'deli', name: 'the deli', at: [216, 61], clear: [4.6, 3.6], top: 12,
      solids: [{ box: [8, 6, 5], colour: BRICK, windows: true }, { box: [6, 0.5, 2.4], at: [0, 3.4, 5.6], colour: 0xe2532f, lit: 3 }],
    },
    {
      id: 'hot-dog-cart', name: 'the hot-dog cart', at: [188, 46.2], top: 5,
      solids: [{ box: [1.8, 1.1, 1.3], colour: STEEL }, { drum: [1.5, 0.1, 0.7], sides: 8, at: [0, 0, 2.2], colour: 0xe2532f }, { drum: [0.06, 0.06, 2.2], sides: 4, colour: STEEL }],
    },
    {
      id: 'ferry', name: 'the ferry', at: [243, 105], afloat: true, turn: -20, top: 8,
      solids: [{ box: [10, 3.6, 2], colour: 0xe8862c }, { box: [7, 3, 1.4], at: [0, 0, 2], colour: 0xf2a65a, windows: true }, { box: [2.2, 2, 1.2], at: [0, 0, 3.4], colour: WHITE }],
    },

    // --- Chicago ---
    { id: 'the-l', name: 'the L', at: [56, 62], major: true, top: 13 },
    {
      id: 'hancock', name: 'John Hancock Center', at: [76, 13], major: true, clear: [7.4, 7.4],
      solids: [
        { drum: [9.6, 6.6, 68], sides: 4, colour: BLACK, lit: 0.12 }, { drum: [0.4, 0.1, 18], sides: 5, at: [-1.8, 0, 68], colour: WHITE },
        { drum: [0.4, 0.1, 18], sides: 5, at: [1.8, 0, 68], colour: WHITE },
      ],
    },
    {
      id: 'marina-city', name: 'Marina City', at: [76, 46.5], major: true, clear: [11.4, 6.6],
      solids: [
        { drum: [4.8, 4.8, 38], sides: 14, at: [-5.6, -1.2, 0], colour: 0xe6e1d6, lit: 0.25 }, { drum: [4.8, 4.8, 38], sides: 14, at: [5.6, 1.2, 0], colour: 0xe6e1d6, lit: 0.25 },
        { drum: [1.6, 1.6, 4], sides: 8, at: [-5.6, -1.2, 38], colour: 0xb9b5aa }, { drum: [1.6, 1.6, 4], sides: 8, at: [5.6, 1.2, 38], colour: 0xb9b5aa },
      ],
    },
    {
      id: 'cloud-gate', name: 'Cloud Gate', at: [115, 51], clear: [4.4, 3.4], top: 7,
      solids: [{ drum: [2.2, 3.4, 1.6], sides: 16, at: [0, 0, 0.4], colour: 0xcfd6dc }, { drum: [3.4, 1.6, 2], sides: 16, at: [0, 0, 2], colour: 0xdfe5ea }],
    },
    {
      id: 'wrigley-field', name: 'Wrigley Field', at: [21, 21], major: true, clear: [17, 16], top: 12,
      solids: [
        { box: [22, 20, 0.3], colour: 0x6fa85a }, { box: [32, 5, 8], at: [0, -12.5, 0], colour: BRICK, windows: true },
        { box: [5, 20, 8], at: [-13.5, 0, 0], colour: BRICK, windows: true }, { box: [5, 20, 5], at: [13.5, 0, 0], colour: 0x3f6f52 },
        { box: [32, 5, 5], at: [0, 12.5, 0], colour: 0x3f6f52 }, { box: [9, 0.6, 3], at: [-9, -15.4, 8.6], colour: 0xc8402a, lit: 2.5 },
      ],
    },
    {
      id: 'navy-pier', name: 'Navy Pier', at: [128, 27], major: true, afloat: true, top: 18,
      solids: [{ box: [7, 26, 2.2], at: [0, 0, -1], colour: WOOD }, { box: [5, 10, 3], at: [0, -6, 1.2], colour: BRICK, windows: true }, { box: [0.5, 0.5, 8], at: [0, 6, 1.2], colour: STEEL }, ...wheel.map((s): Solid => ('box' in s ? { ...s, at: [s.at![0], 6, s.at![2] + 1.2] } : s))],
    },
    { id: 'lift-bridge', name: 'the lift bridge', at: [94, 30], top: 16, solids: [{ box: [2, 2, 13], at: [-4.6, -3.4, 0], colour: 0x7a5a4a }, { box: [2, 2, 13], at: [4.6, -3.4, 0], colour: 0x7a5a4a }, { box: [2, 2, 13], at: [-4.6, 3.4, 0], colour: 0x7a5a4a }, { box: [2, 2, 13], at: [4.6, 3.4, 0], colour: 0x7a5a4a }] },
    {
      id: 'buckingham-fountain', name: 'Buckingham Fountain', at: [124, 84], clear: [8, 8], top: 7,
      solids: [{ drum: [7, 7, 0.7], sides: 20, colour: 0xd8cfbb, top: 0x8fd3e8 }, { drum: [3.4, 3.4, 1.6], sides: 14, colour: 0xd8cfbb, top: 0x8fd3e8 }, { drum: [1.5, 1.2, 2.8], sides: 10, colour: 0xe9e3d3, top: 0x8fd3e8 }],
    },

    // --- St. Louis ---
    {
      id: 'old-courthouse', name: 'the Old Courthouse', at: [122, 146], clear: [6, 6.4], top: 20,
      solids: [{ box: [10.5, 11, 6.5], colour: WHITE, windows: true }, { drum: [2.8, 2.8, 4], sides: 12, at: [0, 0, 6.5], colour: WHITE, lit: 0.4 }, { drum: [2.9, 0.3, 4.2], sides: 12, at: [0, 0, 10.5], colour: 0x7fb5a5 }],
    },
    {
      id: 'paddle-steamer', name: 'the paddle steamer', at: [149.5, 160], afloat: true, turn: 96, top: 9,
      solids: [
        { box: [11, 4, 1.4], colour: WHITE }, { box: [8, 3.4, 1.5], at: [0.4, 0, 1.4], colour: WHITE, windows: true }, { box: [5, 2.8, 1.3], at: [0.6, 0, 2.9], colour: WHITE, windows: true },
        { drum: [0.35, 0.35, 3.4], sides: 6, at: [2.4, 0.8, 4.2], colour: BLACK }, { drum: [0.35, 0.35, 3.4], sides: 6, at: [2.4, -0.8, 4.2], colour: BLACK }, { box: [1.8, 4.2, 2.6], at: [-6.2, 0, 0], colour: 0xc8402a },
      ],
    },
    { id: 'custard-stand', name: 'the custard stand', at: [121, 178], clear: [4.4, 3.4], top: 9, solids: [{ box: [7.5, 5, 3.6], colour: WHITE, windows: true }, { box: [8.3, 5.8, 0.6], at: [0, 0, 3.6], colour: 0xf6c744 }, { drum: [0.9, 0.2, 2.4], sides: 8, at: [-2.4, 0, 4.2], colour: 0xfff1c9, lit: 2 }] },

    // --- San Francisco ---
    { id: 'lombard-street', name: 'Lombard Street', at: [36, 164], major: true, top: 4 },
    { id: 'painted-ladies', name: 'the Painted Ladies', at: [79, 189.5], clear: [3.4, 9.4], top: 10, solids: terrace },
    {
      id: 'coit-tower', name: 'Coit Tower', at: [86, 166], major: true, clear: [3.4, 3.4],
      solids: [{ drum: [3.2, 3.2, 1.4], sides: 12, colour: 0xd8cfbb }, { drum: [2.1, 1.9, 15], sides: 12, colour: WHITE, lit: 0.5 }, { drum: [2.2, 2.2, 1.6], sides: 12, at: [0, 0, 15], colour: WHITE, lit: 0.8 }],
    },
    { id: 'transamerica', name: 'Transamerica Pyramid', at: [60, 139], major: true, clear: [5.6, 5.6], solids: [{ drum: [7, 0.3, 54], sides: 4, colour: WHITE, lit: 0.2 }, { box: [10, 10, 2.5], colour: 0xd9d4ca }] },
    { id: 'cable-car', name: 'the cable car', at: [72, 172], top: 7, solids: [{ box: [2.3, 5.4, 2.2], at: [0, 0, 0.5], colour: 0x8f2f2a, windows: true }, { box: [2.5, 5.8, 0.4], at: [0, 0, 2.7], colour: 0xe9dcc3 }] },
    {
      id: 'wharf', name: 'the sea lions at the wharf', at: [89, 227], afloat: true, top: 6,
      solids: [
        { box: [12, 5, 1.6], at: [1, 0, -0.9], colour: WOOD }, { box: [4.4, 3, 0.5], at: [-6, 5, -0.2], colour: 0xb9a680 },
        { drum: [0.5, 0.3, 0.7], sides: 6, at: [-6.8, 4.6, 0.3], colour: 0x5b4a3d }, { drum: [0.5, 0.3, 0.7], sides: 6, at: [-5.4, 5.4, 0.3], colour: 0x6b5a4a }, { drum: [0.45, 0.3, 0.6], sides: 6, at: [-6, 5.9, 0.3], colour: 0x4f4138 },
      ],
    },

    // --- New Orleans ---
    { id: 'french-quarter', name: 'the French Quarter', at: [183, 238], major: true, top: 14 },
    { id: 'streetcar', name: 'the St. Charles streetcar', at: [226, 199], turn: -42, top: 7, solids: [{ box: [6.4, 2.3, 2.3], at: [0, 0, 0.5], colour: 0x3f6f52, windows: true }, { box: [6.8, 2.5, 0.4], at: [0, 0, 2.8], colour: 0xb5553c }] },
    {
      id: 'jazz-band', name: 'the jazz band', at: [186.5, 217.5], top: 5,
      solids: [
        { drum: [2.3, 2.3, 0.35], sides: 10, colour: 0xd8cfbb }, { drum: [0.28, 0.2, 1.7], sides: 6, at: [-0.9, 0.3, 0.35], colour: 0x2b2e35 }, { drum: [0.28, 0.2, 1.7], sides: 6, at: [0.2, -0.8, 0.35], colour: 0xc8402a },
        { drum: [0.28, 0.2, 1.7], sides: 6, at: [1, 0.5, 0.35], colour: 0x3f6fa3 }, { drum: [0.5, 0.5, 0.9], sides: 8, at: [0.1, 0.9, 0.35], colour: 0xd9b24a },
      ],
    },
    { id: 'superdome', name: 'the Superdome', at: [240, 143], clear: [13.4, 13.4], top: 16, solids: [{ drum: [12.6, 12.6, 7], sides: 24, colour: 0xc9c2b4 }, { drum: [12.6, 3, 3.6], sides: 24, at: [0, 0, 7], colour: 0xe9e6df }] },
  ],
};
