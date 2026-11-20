// The landmarks: where each one stands. Places are set where their real
// surroundings would put them: a bridge across its strait, a tower on its hill,
// a fort on its river. No two districts share a layout.
//
// The fourteen newer districts are placed from general knowledge. The research
// in docs/districts/research refines them before anything is modelled.

import type { P } from './shape.ts';
import type { DistrictId } from './districts.ts';

export interface Landmark {
  id: string;
  name: string;
  district: DistrictId;
  at: P;
  /** Named on the map. The rest are dots until their district is detailed. */
  major?: boolean;
  /** A model of it exists: it stands in the app in its real shape, not as a block. */
  built?: boolean;
  /** Which way its label sits on the map, as a compass point. */
  label?: 'n' | 'e' | 's' | 'w';
  /** It stands in or over the sea. */
  water?: boolean;
}

const L = (district: DistrictId, id: string, name: string, x: number, z: number, o: Partial<Landmark> = {}): Landmark => ({ id, name, district, at: [x, z], ...o });

export const LANDMARKS: Landmark[] = [
  // Downtown: everything here is invented
  L('downtown', 'halo', 'Halo Tower', 62, 70, { major: true, built: true, label: 'e' }),
  L('downtown', 'gate-tower', 'the Gate Tower', 40, 6, { major: true, built: true, label: 'n' }),
  L('downtown', 'showroom', 'Mochi Motors showroom', 150, 30, { built: true }),
  L('downtown', 'car-park', 'Ponpoko car park', 150, 140, { major: true, built: true, label: 'e' }),

  // America. New York faces Liverpool across the harbour
  L('america', 'liberty', 'Statue of Liberty', -500, -45, { major: true, built: true, label: 's' }),
  L('america', 'brooklyn-bridge', 'Brooklyn Bridge', -300, -53, { major: true, label: 'e', water: true }),
  L('america', 'twin-towers', 'the Twin Towers', -425, 50, { major: true, built: true, label: 'w' }),
  L('america', 'empire-state', 'Empire State Building', -390, 112, { major: true, built: true, label: 'e' }),
  L('america', 'chrysler', 'Chrysler Building', -358, 92),
  L('america', 'flatiron', 'Flatiron Building', -408, 142),
  L('america', 'grand-central', 'Grand Central Terminal', -364, 124),
  L('america', 'central-park', 'Central Park', -330, 160),
  // Chicago sits on the Lake, with the river on two sides of the Loop
  L('america', 'sears', 'Sears Tower', -128, 132, { major: true, built: true, label: 'w' }),
  L('america', 'the-l', 'the L', -116, 176, { major: true, label: 's' }),
  L('america', 'hancock', 'John Hancock Center', -95, 30),
  L('america', 'marina-city', 'Marina City', -112, 48),
  L('america', 'cloud-gate', 'Cloud Gate', -80, 112),
  L('america', 'navy-pier', 'Navy Pier', -34, 44),
  L('america', 'wrigley', 'Wrigley Field', -128, 0),
  // St. Louis is on the west bank of the Mississippi
  L('america', 'gateway-arch', 'Gateway Arch', -105, 375, { major: true, built: true, label: 'w' }),
  L('america', 'old-courthouse', 'Old Courthouse', -140, 375),
  L('america', 'eads-bridge', 'Eads Bridge', -72, 348),
  L('america', 'drive-in', 'the drive-in', -240, 300, { major: true, label: 'w' }),
  // New Orleans, on the delta where the Mississippi reaches the sea
  L('america', 'french-quarter', 'the French Quarter', -98, 514),
  L('america', 'streetcar', 'the St. Charles streetcar', -112, 532),
  L('america', 'steamboat', 'the steamboat landing', -88, 496),
  L('america', 'superdome', 'the Superdome', -120, 498),
  // San Francisco, on its hills
  L('america', 'golden-gate', 'Golden Gate Bridge', -448, 300, { major: true, built: true, label: 'w', water: true }),
  L('america', 'alcatraz', 'Alcatraz', -385, 298),
  L('america', 'lombard', 'Lombard Street', -392, 392, { major: true, label: 'w' }),
  L('america', 'coit', 'Coit Tower', -352, 352),
  L('america', 'transamerica', 'Transamerica Pyramid', -342, 386),
  L('america', 'painted-ladies', 'the Painted Ladies', -372, 432),
  L('america', 'wharf', "Fisherman's Wharf", -372, 330),
  // the coast road south to Los Angeles
  L('america', 'bixby', 'Bixby Bridge', -470, 552, { major: true, label: 'e' }),
  L('america', 'laguna-seca', "Laguna Seca's Corkscrew", -438, 512),
  L('america', 'pebble-beach', 'the concours lawn at Pebble Beach', -464, 503),

  // The Southwest: Las Vegas, and the desert Route 66 crosses
  L('southwest', 'sphere', 'the Sphere', -300, 508, { major: true, label: 'e' }),
  L('southwest', 'strip', 'the Strip', -312, 528),
  L('southwest', 'welcome-sign', 'the Welcome sign', -312, 548),
  L('southwest', 'hoover-dam', 'Hoover Dam', -262, 548, { major: true, label: 's' }),
  L('southwest', 'salt-flats', 'the salt flats', -392, 512, { major: true, label: 'n' }),
  L('southwest', 'cadillac-ranch', 'Cadillac Ranch', -150, 462, { major: true, label: 'w' }),
  L('southwest', 'monument-valley', 'Monument Valley', -166, 496, { major: true, label: 'n' }),
  L('southwest', 'ghost-town', 'the ghost town', -296, 584),
  L('southwest', 'meteor-crater', 'the meteor crater', -158, 574),
  L('southwest', 'wigwam', 'the Wigwam Motel', -128, 532),
  L('southwest', 'u-drop-inn', 'the U-Drop Inn', -148, 447),
  L('southwest', 'half-dome', 'Half Dome', -285, 462),
  L('southwest', 'sequoia', 'the drive-through tree', -262, 456),

  // Los Angeles
  L('losangeles', 'hollywood-sign', 'the Hollywood Sign', -335, 612, { major: true, label: 'n' }),
  L('losangeles', 'griffith', 'Griffith Observatory', -292, 622),
  L('losangeles', 'capitol-records', 'the Capitol Records tower', -322, 646),
  L('losangeles', 'bobs', "Bob's Big Boy", -372, 603),
  L('losangeles', 'dodger', 'Dodger Stadium', -270, 660),
  L('losangeles', 'stack', 'the Stack', -300, 678, { major: true, label: 'w' }),
  L('losangeles', 'city-hall', 'City Hall', -280, 692),
  L('losangeles', 'petersen', 'the Petersen museum', -372, 690),
  L('losangeles', 'viaduct', 'the Sixth Street Viaduct', -258, 706),
  L('losangeles', 'whittier', 'Whittier Boulevard', -236, 718),
  L('losangeles', 'randys', 'the giant doughnut', -348, 748, { major: true, label: 's' }),
  L('losangeles', 'lax', 'the Theme Building', -392, 768),
  L('losangeles', 'venice', 'the Venice canals', -434, 782),
  L('losangeles', 'queen-mary', 'the Queen Mary', -312, 796),

  // The Boardwalk: where Route 66 ends
  L('boardwalk', 'pier', 'the pier and its wheel', -528, 740, { major: true, label: 's', water: true }),
  L('boardwalk', 'cyclone', 'the wooden coaster', -438, 714),
  L('boardwalk', 'parachute-jump', 'the Parachute Jump', -430, 742),
  L('boardwalk', 'wonder-wheel', 'the Wonder Wheel', -442, 764),

  // Mexico
  L('mexico', 'teotihuacan', 'Teotihuacan', -70, 636, { major: true, label: 'n' }),
  L('mexico', 'popocatepetl', 'Popocatépetl', -22, 748),
  L('mexico', 'angel', 'the Angel of Independence', -156, 708),
  L('mexico', 'bellas-artes', 'Palacio de Bellas Artes', -133, 697),
  L('mexico', 'chapultepec', 'Chapultepec Castle', -184, 714),
  L('mexico', 'zocalo', 'the Zócalo', -118, 702, { major: true, label: 's' }),
  L('mexico', 'autodromo', 'the Autódromo', -52, 712, { major: true, label: 'e' }),
  L('mexico', 'arena', 'Arena México', -150, 730),
  L('mexico', 'azteca', 'Estadio Azteca', -128, 768),
  L('mexico', 'xochimilco', 'Xochimilco', -96, 786),
  L('mexico', 'chichen-itza', 'Chichén Itzá', 16, 690, { major: true, label: 'n' }),
  L('mexico', 'ensenada', 'where the Baja 1000 starts', -288, 818),
  L('mexico', 'cabo-arch', 'the Arch of Cabo', -264, 902, { major: true, label: 'e' }),

  // Rio
  L('rio', 'maracana', 'the Maracanã', 150, 768, { major: true, label: 'e' }),
  L('rio', 'sambadrome', 'the Sambadrome', 180, 794),
  L('rio', 'saucer', 'the saucer museum', 250, 800),
  L('rio', 'hillside', 'the hillside houses', 122, 806),
  L('rio', 'lapa', 'the Lapa arches and their tram', 200, 812),
  L('rio', 'christ', 'Christ the Redeemer', 150, 818, { major: true, label: 'w' }),
  L('rio', 'sugarloaf', 'Sugarloaf', 236, 858, { major: true, label: 'e' }),
  L('rio', 'ipanema', 'Ipanema', 108, 880),
  L('rio', 'copacabana', 'Copacabana', 182, 884, { major: true, label: 's' }),

  // Havana
  L('havana', 'malecon', 'the Malecón', 115, 612, { major: true, label: 'n' }),
  L('havana', 'morro', 'El Morro', 148, 611),
  L('havana', 'nacional', 'the Hotel Nacional', 100, 620),
  L('havana', 'capitolio', 'El Capitolio', 128, 628),
  L('havana', 'plaza-vieja', 'Plaza Vieja', 142, 636),

  // Merseyside
  L('merseyside', 'liver-building', 'the Three Graces', -405, -130, { major: true, label: 'w' }),
  L('merseyside', 'albert-dock', 'Royal Albert Dock', -340, -102, { major: true, label: 'n' }),
  L('merseyside', 'docks', 'the Docks', -452, -232, { major: true, label: 'n' }),
  L('merseyside', 'anfield', 'Anfield', -285, -246, { major: true, label: 'e' }),
  L('merseyside', 'goodison', 'Goodison Park', -336, -314, { major: true, label: 'n' }),
  L('merseyside', 'stanley-park', 'Stanley Park', -318, -278),
  L('merseyside', 'anglican-cathedral', 'Liverpool Cathedral', -282, -140, { major: true, label: 'w' }),
  L('merseyside', 'metropolitan-cathedral', 'Metropolitan Cathedral', -300, -186),
  L('merseyside', 'cavern', 'the Cavern Club', -370, -152),
  L('merseyside', 'radio-city', 'Radio City Tower', -350, -176),
  L('merseyside', 'chinatown-arch', 'Chinatown Arch', -295, -112),
  L('merseyside', 'hadrians-wall', "Hadrian's Wall", -284, -337, { major: true, label: 'e' }),

  // Scotland
  L('scotland', 'kelpies', 'the Kelpies', -372, -408),
  L('scotland', 'distillery', 'the distillery', -352, -530),
  L('scotland', 'finnieston', 'the Finnieston Crane', -500, -382),
  L('scotland', 'glenfinnan', 'Glenfinnan Viaduct', -512, -432, { major: true, label: 'n' }),
  L('scotland', 'edinburgh-castle', 'Edinburgh Castle', -305, -440, { major: true, label: 'w' }),
  L('scotland', 'urquhart', 'Urquhart Castle', -424, -456),
  L('scotland', 'eilean-donan', 'Eilean Donan', -538, -466),
  L('scotland', 'bealach', 'the Bealach na Bà', -515, -500),
  L('scotland', 'forth-bridge', 'the Forth Bridge', -268, -520, { major: true, label: 'n', water: true }),
  L('scotland', 'old-course', 'the Old Course', -302, -536),
  L('scotland', 'john-o-groats', "John o' Groats", -312, -557, { major: true, label: 'w' }),

  // Germany
  L('germany', 'bmw', 'the BMW tower', 18, -318),
  L('germany', 'autostadt', 'the Autostadt towers', -125, -324, { major: true, label: 's' }),
  L('germany', 'old-town', 'the old town and its Christmas market', -205, -330),
  L('germany', 'brandenburg-gate', 'Brandenburg Gate', -40, -348, { major: true, label: 'e' }),
  L('germany', 'reichstag', 'the Reichstag dome', -40, -361),
  L('germany', 'tv-tower', 'the TV Tower', -14, -352),
  L('germany', 'elbphilharmonie', 'the Elbphilharmonie', -238, -364),
  L('germany', 'wunderland', 'Miniatur Wunderland', -215, -368),
  L('germany', 'cologne-cathedral', 'Cologne Cathedral', -118, -391, { major: true, label: 's' }),
  L('germany', 'neuschwanstein', 'Neuschwanstein', 22, -398, { major: true, label: 'w' }),
  L('germany', 'nurburgring', 'the Nürburgring', -182, -430, { major: true, label: 's' }),
  L('germany', 'fairy-forest', 'the fairy-tale forest', -60, -474, { major: true, label: 'n' }),

  // The Alps
  L('alps', 'st-moritz', 'St. Moritz', 186, -346, { major: true, label: 'w' }),
  L('alps', 'landwasser', 'the Landwasser Viaduct', 130, -372),
  L('alps', 'chalets', 'the chalet village', 70, -385),
  L('alps', 'stelvio', 'Stelvio Pass', 212, -395, { major: true, label: 'e' }),
  L('alps', 'cable-car', 'the cable car', 150, -400),
  L('alps', 'matterhorn', 'the Matterhorn', 92, -420, { major: true, label: 'n' }),
  L('alps', 'belvedere', 'Hotel Belvédère on its hairpin', 66, -446),

  // Monaco
  L('monaco', 'palace', "the Prince's Palace", 284, -325),
  L('monaco', 'oceanographic', 'the Oceanographic Museum', 291, -323),
  L('monaco', 'casino', 'the Casino', 292, -364, { major: true, label: 'n' }),
  L('monaco', 'turini', 'the Col de Turini', 318, -400),

  // Europe: one river, three names
  L('europe', 'tower-bridge', 'Tower Bridge', -225, -122, { major: true, label: 's' }),
  L('europe', 'tower-of-london', 'Tower of London', -240, -146),
  L('europe', 'big-ben', 'Big Ben', -118, -194, { major: true, built: true, label: 'n' }),
  L('europe', 'london-eye', 'London Eye', -130, -146, { major: true, label: 'e' }),
  L('europe', 'st-pauls', "St Paul's", -172, -190),
  L('europe', 'buckingham', 'Buckingham Palace', -96, -242),
  L('europe', 'eiffel', 'Eiffel Tower', -64, -118, { major: true, built: true, label: 'w' }),
  L('europe', 'notre-dame', 'Notre-Dame', -26, -100),
  L('europe', 'louvre', 'the Louvre', 10, -106),
  L('europe', 'arc', 'Arc de Triomphe', 10, -215, { major: true, label: 'e' }),
  L('europe', 'sacre-coeur', 'Sacré-Cœur', 85, -255, { major: true, label: 'n' }),
  L('europe', 'moulin-rouge', 'Moulin Rouge', 68, -228),
  L('europe', 'pisa', 'Leaning Tower of Pisa', 128, -112, { major: true, built: true, label: 's' }),
  L('europe', 'duomo', 'the Duomo of Florence', 88, -152),
  L('europe', 'colosseum', 'the Colosseum', 158, -196, { major: true, label: 'e' }),
  L('europe', 'piazza', 'the piazza and its fountain', 140, -152),
  // the north of Italy, up to the foot of the Alps
  L('europe', 'rialto', 'Rialto Bridge', 226, -228),
  L('europe', 'maranello', 'Maranello', 134, -252),
  L('europe', 'monza', "Monza's banking", 158, -296),
  L('europe', 'sant-agata', "Sant'Agata", 150, -272, { major: true, label: 'e' }),
  L('europe', 'lingotto', 'Lingotto and its rooftop track', 112, -292),
  L('europe', 'villa-deste', "Villa d'Este", 190, -310),

  // Westeros
  L('westeros', 'bloody-gate', 'the Bloody Gate', 215, -478),
  L('westeros', 'eyrie', 'the Eyrie', 250, -462, { major: true, label: 'e' }),
  L('westeros', 'red-keep', 'the Red Keep', 455, -530, { major: true, label: 'n' }),
  L('westeros', 'crossroads-inn', 'the Inn at the Crossroads', 150, -535, { major: true, label: 's' }),
  L('westeros', 'great-sept', 'the Great Sept', 400, -540),
  L('westeros', 'harrenhal', 'Harrenhal', 272, -552),
  L('westeros', 'winterfell', 'Winterfell', -150, -560, { major: true, label: 's' }),
  L('westeros', 'dragonpit', 'the Dragonpit', 385, -565, { major: true, label: 'w' }),
  L('westeros', 'dragonstone', 'Dragonstone', 560, -560, { major: true, label: 'n' }),
  L('westeros', 'castle-black', 'Castle Black', 0, -612, { major: true, label: 'e' }),
  L('westeros', 'eastwatch', 'Eastwatch', 438, -616),
  L('westeros', 'shadow-tower', 'the Shadow Tower', -240, -618),
  L('westeros', 'weirwood', 'the weirwood grove', 30, -690),

  // Japan: Kyoto in the south-west, Tokyo on its bay, mountains at the tip
  L('japan', 'kyoto-tower', 'Kyoto Tower', 250, -85, { major: true, built: true, label: 's' }),
  L('japan', 'pagoda', 'the five-storey pagoda', 256, -140, { built: true }),
  L('japan', 'fushimi-inari', 'Fushimi Inari', 218, -175, { major: true, label: 'w' }),
  L('japan', 'suzuka', 'Suzuka', 328, -205, { major: true, label: 'w' }),
  L('japan', 'tokyo-station', 'Tokyo Station', 432, -215),
  L('japan', 'kinkakuji', 'the Golden Pavilion', 286, -232),
  L('japan', 'garage', "the tuner's garage", 372, -232),
  L('japan', 'tokyo-tower', 'Tokyo Tower', 452, -240, { major: true, label: 'e' }),
  L('japan', 'shibuya', 'Shibuya Crossing', 410, -253, { major: true, label: 'n' }),
  L('japan', 'torii', 'the torii in the water', 292, -266, { water: true }),
  L('japan', 'castle', 'the white castle', 322, -292, { major: true, label: 's' }),
  L('japan', 'sensoji', 'Sensō-ji and Kaminarimon', 470, -318),
  L('japan', 'skytree', 'Tokyo Skytree', 505, -338, { major: true, label: 'n' }),
  L('japan', 'black-castle', 'the black castle', 520, -368),
  L('japan', 'touge', 'the mountain pass', 462, -408, { major: true, label: 'w' }),
  L('japan', 'shirakawa', 'Shirakawa-go', 530, -418),
  L('japan', 'snow-corridor', 'the snow corridor', 492, -426),
  L('japan', 'snow-monkeys', "the snow monkeys' hot spring", 538, -445),
  // across Tokyo Bay
  L('japan', 'daikoku', 'Daikoku parking area', 596, -262, { major: true, label: 'n' }),
  L('japan', 'umihotaru', 'Umihotaru', 634, -254),
  L('japan', 'fuji-speedway', 'Fuji Speedway', 754, -236),
  L('japan', 'fuji', 'Mount Fuji', 720, -250, { major: true, label: 's' }),

  // China
  L('china', 'great-wall', 'the Great Wall', 440, -184, { major: true, label: 'n' }),
  L('china', 'forbidden-city', 'the Forbidden City', 372, -150, { major: true, label: 'n' }),
  L('china', 'wild-goose', 'the Wild Goose Pagoda', 306, -116),
  L('china', 'temple-of-heaven', 'the Temple of Heaven', 392, -124),
  L('china', 'pandas', 'the panda base', 304, -96),
  L('china', 'shanghai-circuit', 'the Shanghai circuit', 428, -138),
  L('china', 'oriental-pearl', 'Oriental Pearl Tower', 512, -104, { major: true, label: 'e' }),
  L('china', 'bund', 'the Bund', 478, -102, { major: true, label: 'w' }),
  L('china', 'shanghai-tower', 'Shanghai Tower', 524, -88),
  L('china', 'yu-garden', "Yu Garden's zigzag bridge", 458, -88),
  L('china', 'tianmen', "Heaven's Gate and its 99 bends", 412, -78),
  L('china', 'karst', 'the karst peaks', 468, -56),
  L('china', 'hongya', 'Hongya Cave', 306, -74),
  L('china', 'interchange', 'the five-level interchange', 342, -62),
  L('china', 'nanpu', "Nanpu Bridge's spiral ramp", 506, -58),
  L('china', 'liziba', 'Liziba station', 318, -50, { major: true, label: 'e' }),

  // Hong Kong
  L('hongkong', 'clock-tower', 'Clock Tower and Star Ferry', 381, 110, { major: true, label: 'w' }),
  L('hongkong', 'peninsula', 'the Peninsula', 362, 90),
  L('hongkong', 'icc', 'ICC', 380, 32, { major: true, label: 'w' }),
  L('hongkong', 'mong-kok', 'Mong Kok', 300, 82),
  L('hongkong', 'temple-street', 'Temple Street night market', 318, 132),
  L('hongkong', 'lion-rock', 'Lion Rock', 258, 48, { major: true, label: 'n' }),
  L('hongkong', 'bank-of-china', 'Bank of China Tower', 456, 112, { major: true, label: 'n' }),
  L('hongkong', 'hsbc', 'HSBC', 457, 136),
  L('hongkong', 'ifc', 'IFC', 449, 86),
  L('hongkong', 'convention-centre', 'the Convention Centre', 447, 170),
  L('hongkong', 'peak', 'the Peak', 508, 118, { major: true, label: 'e' }),
  L('hongkong', 'big-buddha', 'the Big Buddha', 498, 216),

  // Singapore
  L('singapore', 'vending-tower', 'the car vending tower', 498, 390),
  L('singapore', 'raffles', 'Raffles Hotel', 520, 364),
  L('singapore', 'jewel', "the Jewel's waterfall", 578, 362),
  L('singapore', 'supertrees', 'the Supertrees', 546, 388),
  L('singapore', 'mbs', 'Marina Bay Sands', 532, 388, { major: true, label: 's' }),
  L('singapore', 'shophouses', 'the shophouses', 504, 380),
  L('singapore', 'lau-pa-sat', 'Lau Pa Sat', 512, 388),
  L('singapore', 'merlion', 'the Merlion', 520, 378),
  L('singapore', 'flyer', 'the Singapore Flyer', 537, 374),

  // Delhi. The Yamuna runs past the Red Fort and on to the Taj Mahal
  L('delhi', 'connaught-place', 'Connaught Place', 120, 272, { major: true, built: true, label: 'w' }),
  L('delhi', 'red-fort', 'the Red Fort', 300, 300, { major: true, built: true, label: 'n' }),
  L('delhi', 'jama-masjid', 'Jama Masjid', 250, 332),
  L('delhi', 'chandni-chowk', 'Chandni Chowk', 225, 300),
  L('delhi', 'rashtrapati-bhavan', 'Rashtrapati Bhavan', 75, 390, { major: true, built: true, label: 'w' }),
  L('delhi', 'india-gate', 'India Gate', 205, 390, { major: true, built: true, label: 'n' }),
  L('delhi', 'purana-qila', 'Purana Qila', 285, 395),
  L('delhi', 'humayun', "Humayun's Tomb", 255, 436),
  L('delhi', 'akshardham', 'Akshardham', 395, 330),
  L('delhi', 'lotus-temple', 'the Lotus Temple', 175, 470, { major: true, built: true, label: 's' }),
  L('delhi', 'hauz-khas', 'Hauz Khas', 58, 446, { major: true, built: true, label: 'n' }),
  L('delhi', 'deer-park', 'Deer Park', 28, 412),
  L('delhi', 'qutub-minar', 'Qutub Minar', -2, 474, { major: true, built: true, label: 's' }),
  L('delhi', 'taj-mahal', 'the Taj Mahal', 305, 496, { major: true, built: true, label: 'e' }),

  // Dubai and Egypt: the canal runs between them
  L('arabia', 'pharos', 'the Lighthouse of Alexandria', 324, 622),
  L('arabia', 'cairo-tower', 'the Cairo Tower', 345, 662),
  L('arabia', 'gem', 'the Grand Egyptian Museum', 310, 676),
  L('arabia', 'pyramids', 'the Pyramids of Giza', 318, 690, { major: true, label: 'w' }),
  L('arabia', 'sphinx', 'the Sphinx', 328, 698),
  L('arabia', 'karnak', "Karnak's columns", 356, 738),
  L('arabia', 'abu-simbel', 'Abu Simbel', 334, 770),
  L('arabia', 'stuck-ship', 'the ship stuck in the canal', 387, 742, { major: true, label: 'e' }),
  L('arabia', 'burj-al-arab', 'Burj Al Arab', 502, 592, { major: true, label: 'e' }),
  L('arabia', 'marina', 'Dubai Marina', 412, 624),
  L('arabia', 'creek', 'the Creek and its souks', 534, 632),
  L('arabia', 'burj-khalifa', 'Burj Khalifa', 474, 642, { major: true, label: 'n' }),
  L('arabia', 'museum-future', 'the Museum of the Future', 498, 652),
  L('arabia', 'dubai-frame', 'the Dubai Frame', 516, 648),
  L('arabia', 'yas', 'Yas Marina Circuit', 428, 702, { major: true, label: 'e' }),
  L('arabia', 'grand-mosque', 'the Grand Mosque', 446, 728),
  L('arabia', 'big-dune', 'the great dune', 482, 752),
  L('arabia', 'petra', 'the Treasury at Petra', 404, 756),

  // Australia
  L('australia', 'big-banana', 'the Big Banana', 786, 520),
  L('australia', 'uluru', 'Uluru', 712, 528, { major: true, label: 'n' }),
  L('australia', 'mount-panorama', 'Mount Panorama', 746, 548, { major: true, label: 'w' }),
  L('australia', 'harbour-bridge', 'the Harbour Bridge', 784, 556),
  L('australia', 'opera-house', 'Sydney Opera House', 790, 566, { major: true, label: 'e' }),
  L('australia', 'bondi', 'Bondi Beach', 784, 584),
  L('australia', 'nullarbor', 'the 90 Mile Straight', 695, 596),
  L('australia', 'twelve-apostles', 'the Twelve Apostles', 745, 598),
  L('australia', 'flinders', 'Flinders Street Station', 760, 602),

  // Iceland
  L('iceland', 'black-beach', 'the black beach', -680, -479),
  L('iceland', 'volcano', 'the crater row', -712, -487),
  L('iceland', 'blue-lagoon', 'the Blue Lagoon', -726, -491),
  L('iceland', 'hallgrimskirkja', 'Hallgrímskirkja', -732, -507, { major: true, label: 'w' }),
  L('iceland', 'geysir', 'the geyser', -702, -521, { major: true, label: 'n' }),
  L('iceland', 'ferry-port', 'the ferry from Scotland', -634, -537),
  L('iceland', 'gullfoss', 'Gullfoss', -676, -542),
  L('iceland', 'akureyri', 'Akureyri', -688, -560),
];
