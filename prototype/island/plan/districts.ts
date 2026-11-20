// The districts: which part of the island each one holds, and what it is built
// around. The outlines are rough on purpose. The coast and the rivers trim them,
// and neighbours blend into each other across them.

import type { P } from './shape.ts';

export type DistrictId =
  // the nine planned first
  | 'downtown' | 'america' | 'boardwalk' | 'merseyside' | 'europe'
  | 'westeros' | 'japan' | 'hongkong' | 'delhi'
  // the fourteen that followed
  | 'alps' | 'germany' | 'monaco' | 'losangeles' | 'southwest' | 'china' | 'arabia'
  | 'rio' | 'singapore' | 'australia' | 'scotland' | 'mexico' | 'havana' | 'iceland';

export interface District {
  id: DistrictId;
  name: string;
  /** What the district is built around. */
  theme: string;
  /** The kind of ground that sets it apart from every other district. */
  ground: string;
  /** The road worth driving that it adds to the island. */
  road: string;
  /** Traffic keeps to the left here, as it does in the real place. */
  drivesOnLeft?: boolean;
  area: P[];
  /** Where its name goes on the map. */
  label: P;
  colour: string;
  /** How large its name is drawn on the map. */
  labelSize?: number;
  /** Named parts of a district that holds more than one place. */
  quarters?: { name: string; at: P }[];
}

export const DISTRICTS: District[] = [
  {
    id: 'westeros', name: 'Westeros', colour: '#cfd8e3', label: [140, -578], labelSize: 24,
    theme: 'the Seven Kingdoms and the Wall, with three dragons overhead',
    ground: 'a cold cape: forest and snowfields under a wall of ice, and a city on three hills',
    road: 'the Kingsroad, from King\'s Landing to Castle Black and out through the Wall',
    area: [[-264, -476], [40, -478], [250, -480], [430, -486], [640, -470], [640, -800], [-330, -800], [-330, -640], [-300, -560]],
    quarters: [{ name: 'beyond the Wall', at: [200, -676] }, { name: "King's Landing", at: [392, -598] }, { name: 'the North', at: [-60, -506] }, { name: 'the Vale', at: [322, -476] }],
  },
  {
    id: 'scotland', drivesOnLeft: true, name: 'Scotland', colour: '#cbc4e0', label: [-405, -516], labelSize: 20,
    theme: 'Edinburgh, the Highlands and a loch with something in it',
    ground: 'glens, a long narrow loch and a rocky coast',
    road: 'the North Coast 500 and the hairpins of the Bealach na Bà',
    area: [[-600, -352], [-258, -352], [-258, -476], [-290, -560], [-330, -610], [-600, -610]],
    quarters: [{ name: 'the Highlands', at: [-478, -478] }],
  },
  {
    id: 'germany', name: 'Germany', colour: '#c9dcb4', label: [-45, -446], labelSize: 22,
    theme: 'the Nürburgring, the Autobahn and Berlin, with a fairy-tale forest at its northern edge',
    ground: 'forest and river valley',
    road: 'the Nordschleife, and an Autobahn with no limit',
    area: [[-258, -352], [-258, -300], [40, -300], [40, -478], [-258, -476]],
    quarters: [{ name: 'Berlin', at: [-36, -320] }],
  },
  {
    id: 'alps', name: 'the Alps', colour: '#e6ebf0', label: [140, -452], labelSize: 22,
    theme: 'the high Alps: the Matterhorn, Stelvio and St. Moritz',
    ground: 'the island\'s mountains: snow, glaciers, a frozen lake and high passes',
    road: 'the Stelvio Pass, 48 hairpins up one side',
    area: [[40, -300], [240, -300], [262, -292], [285, -376], [334, -376], [400, -440], [430, -486], [250, -480], [40, -478]],
  },
  {
    id: 'monaco', name: 'Monaco', colour: '#f2b3ad', label: [246, -317], labelSize: 13,
    theme: 'Monaco and the Riviera, where the Alps drop into the sea',
    ground: 'a harbour under cliffs',
    road: 'the Grand Prix circuit through the streets, and the Col de Turini above',
    area: [[262, -292], [318, -292], [334, -376], [285, -376]],
  },
  {
    id: 'merseyside', drivesOnLeft: true, name: 'Merseyside', colour: '#e3b7a6', label: [-345, -204], labelSize: 19,
    theme: 'Liverpool, its docks and its two football grounds',
    ground: 'flat terraced streets behind a dock wall, on a wide river',
    road: 'the Dock Road',
    area: [[-640, -352], [-258, -352], [-258, -300], [-248, -110], [-262, -92], [-300, -53], [-640, -53]],
  },
  {
    id: 'europe', name: 'Europe', colour: '#e9dcae', label: [0, -160],
    theme: 'London, Paris and Italy',
    ground: 'one river with three names, a hill for Montmartre and a plain for Italy',
    road: 'the Champs-Élysées, and the star of twelve avenues at its end',
    area: [[-258, -300], [40, -300], [240, -300], [248, -262], [238, -222], [190, -150], [170, -50], [70, -40], [-45, -35], [-120, -60], [-210, -55], [-300, -53], [-262, -92], [-248, -110]],
    quarters: [{ name: 'London', at: [-178, -226] }, { name: 'Paris', at: [-40, -238] }, { name: 'Italy', at: [100, -128] }],
  },
  {
    id: 'japan', drivesOnLeft: true, name: 'Japan', colour: '#f0c3cf', label: [392, -300],
    theme: 'Kyoto, Tokyo and the Japanese Alps',
    ground: 'a long peninsula between the Inland Sea and Tokyo Bay, with mountains at its tip',
    road: 'the Bayshore Route out to Daikoku, and a mountain pass of five hairpins',
    area: [[238, -222], [262, -212], [305, -275], [372, -358], [446, -436], [512, -490], [790, -470], [790, -195], [575, -190], [300, -178], [300, -60], [250, -35], [170, -50], [190, -150]],
    quarters: [{ name: 'Kyoto', at: [262, -112] }, { name: 'Tokyo', at: [476, -284] }, { name: 'the Japanese Alps', at: [524, -390] }],
  },
  {
    id: 'china', name: 'China', colour: '#efb09c', label: [562, -158], labelSize: 22,
    theme: 'Shanghai, Beijing and Chongqing',
    ground: 'a river plain under a walled ridge, with karst peaks and a city of stacked roads',
    road: 'Chongqing\'s five-level interchange, and the 99 bends up Tianmen Mountain',
    area: [[300, -178], [575, -190], [660, -160], [660, -40], [430, -22], [392, -10], [300, -20], [250, -35], [300, -60]],
    quarters: [{ name: 'Shanghai', at: [566, -126] }, { name: 'Beijing', at: [350, -132] }, { name: 'Chongqing', at: [345, -24] }],
  },
  {
    id: 'hongkong', drivesOnLeft: true, name: 'Hong Kong', colour: '#bfe0d2', label: [316, 190], labelSize: 22,
    theme: 'both sides of Victoria Harbour',
    ground: 'a narrow shore under a steep green peak, across the water from a flat grid',
    road: 'Nathan Road, and the tunnel under the harbour',
    area: [[250, -35], [300, -20], [392, -10], [430, -22], [600, -30], [600, 290], [425, 270], [330, 262], [262, 222], [235, 90]],
    quarters: [{ name: 'Kowloon', at: [318, 44] }],
  },
  {
    id: 'delhi', drivesOnLeft: true, name: 'Delhi', colour: '#f2cf9c', label: [150, 322],
    theme: 'Old Delhi, New Delhi and Hauz Khas, with the Taj Mahal down the Yamuna',
    ground: 'a flat plain: tangled lanes on one side, lawns and avenues on the other',
    road: 'Kartavya Path, from Raisina Hill to India Gate',
    area: [[0, 116], [42, 98], [105, 148], [185, 190], [262, 222], [330, 262], [425, 270], [470, 290], [470, 560], [-40, 560], [-70, 486], [-75, 410], [-60, 330], [-100, 265], [-62, 200], [-62, 128]],
    quarters: [{ name: 'Old Delhi', at: [270, 356] }, { name: 'New Delhi', at: [132, 414] }, { name: 'Agra', at: [352, 476] }],
  },
  {
    id: 'downtown', name: 'Downtown', colour: '#d7d2c8', label: [182, -8], labelSize: 20,
    theme: 'the invented city the others grew around',
    ground: 'the shore of the Lake',
    road: 'the Lake Ring, and the expressways that pass between its towers',
    area: [[-62, 8], [-45, -35], [70, -40], [170, -50], [250, -35], [235, 90], [262, 222], [185, 190], [105, 148], [42, 98], [0, 116], [-62, 128]],
  },
  {
    id: 'america', name: 'America', colour: '#b9cfe6', label: [-262, 232],
    theme: 'New York, Chicago, St. Louis, New Orleans and San Francisco',
    ground: 'a harbour, a lake shore, a great river down to its delta, and a city on hills',
    road: 'Route 66, which starts at the Lake',
    area: [[-640, -53], [-300, -53], [-210, -55], [-120, -60], [-45, -35], [-62, 8], [-62, 128], [-62, 200], [-100, 265], [-60, 330], [-75, 410], [-70, 486], [-40, 600], [-125, 600], [-130, 440], [-330, 455], [-430, 470], [-440, 600], [-640, 600]],
    quarters: [{ name: 'New York', at: [-385, 190] }, { name: 'Chicago', at: [-114, 102] }, { name: 'St. Louis', at: [-150, 345] }, { name: 'San Francisco', at: [-352, 414] }, { name: 'New Orleans', at: [-6, 556] }],
  },
  {
    id: 'southwest', name: 'the Southwest', colour: '#e9b48f', label: [-345, 476], labelSize: 19,
    theme: 'Las Vegas and the desert that Route 66 crosses',
    ground: 'red desert: buttes, a canyon, a dam and a salt flat',
    road: 'Route 66 through the desert, and the road over the dam',
    area: [[-430, 470], [-330, 455], [-130, 440], [-125, 600], [-215, 605], [-262, 600], [-440, 600]],
    quarters: [{ name: 'Las Vegas', at: [-352, 545] }],
  },
  {
    id: 'losangeles', name: 'Los Angeles', colour: '#f9d6b8', label: [-352, 724], labelSize: 22,
    theme: 'Hollywood, the freeways and the beach',
    ground: 'a wide basin between hills and the sea, with a river set in concrete',
    road: 'Mulholland Drive along the hills, and the coast highway down from San Francisco',
    area: [[-440, 600], [-262, 600], [-215, 605], [-214, 670], [-218, 735], [-232, 792], [-305, 812], [-420, 800], [-420, 690], [-480, 690], [-480, 640]],
    quarters: [{ name: 'Hollywood', at: [-398, 654] }],
  },
  {
    id: 'boardwalk', name: 'the Boardwalk', colour: '#f6e3a1', label: [-548, 712], labelSize: 15,
    theme: 'a seaside amusement park and its pier, where Route 66 ends',
    ground: 'a beach, a promenade and a pier on piles',
    road: 'the last mile of Route 66',
    area: [[-480, 690], [-420, 690], [-420, 800], [-480, 800]],
  },
  {
    id: 'mexico', name: 'Mexico', colour: '#cfe5a8', label: [-112, 668],
    theme: 'Mexico City, the pyramids and Baja',
    ground: 'a high basin under a smoking volcano, a jungle coast, and a desert finger of land',
    road: 'the Pan-American Highway, and the Baja 1000',
    area: [[-215, 605], [-125, 600], [-62, 612], [45, 700], [45, 835], [-205, 808], [-236, 800], [-236, 915], [-312, 915], [-312, 806], [-232, 790], [-218, 735], [-214, 670]],
    quarters: [{ name: 'Mexico City', at: [-172, 754] }, { name: 'Baja', at: [-272, 846] }],
  },
  {
    id: 'rio', name: 'Rio', colour: '#b5e3b0', label: [112, 778], labelSize: 22,
    theme: 'Rio de Janeiro',
    ground: 'granite peaks straight out of the sea, with a crescent beach between them',
    road: 'Avenida Atlântica along Copacabana, at the end of the Pan-American Highway',
    area: [[45, 760], [262, 730], [264, 900], [60, 900]],
  },
  {
    id: 'havana', name: 'Havana', colour: '#f7c9a0', label: [128, 670], labelSize: 14,
    theme: 'Havana and its old American cars',
    ground: 'a low island with a sea wall',
    road: 'the Malecón',
    area: [[70, 604], [186, 604], [186, 654], [70, 654]],
  },
  {
    id: 'arabia', name: 'Dubai & Egypt', colour: '#f3d89a', label: [452, 776], labelSize: 17,
    theme: 'Dubai on one side of a canal and Egypt on the other',
    ground: 'dunes, a river through the sand, and islands shaped like a palm',
    road: 'Sheikh Zayed Road between its towers, and the hairpins up Jebel Hafeet',
    area: [[290, 566], [566, 566], [566, 796], [290, 796]],
    quarters: [{ name: 'Egypt', at: [322, 744] }, { name: 'Dubai', at: [520, 668] }],
  },
  {
    id: 'singapore', drivesOnLeft: true, name: 'Singapore', colour: '#e3c6ea', label: [536, 328], labelSize: 14,
    theme: 'Singapore, the garden city',
    ground: 'a small green island around a bay',
    road: 'the Marina Bay street circuit, raced under floodlights',
    area: [[476, 336], [596, 336], [596, 406], [476, 406]],
  },
  {
    id: 'australia', drivesOnLeft: true, name: 'Australia', colour: '#eeb89a', label: [712, 502], labelSize: 20,
    theme: 'Sydney, Mount Panorama and the outback',
    ground: 'red earth, with a harbour city on its green south-east corner',
    road: 'Mount Panorama, up and over its hill',
    area: [[624, 440], [804, 440], [804, 614], [624, 614]],
  },
  {
    id: 'iceland', name: 'Iceland', colour: '#cfe3ea', label: [-688, -588], labelSize: 15,
    theme: 'Iceland: fire, ice and a ring road',
    ground: 'a volcanic island: lava, black sand, a glacier and a geyser',
    road: 'the Ring Road, with its one-lane bridges',
    area: [[-750, -572], [-626, -572], [-626, -470], [-750, -470]],
  },
];
