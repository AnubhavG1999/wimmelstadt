// The dragons of the city, each after the books: its colours, its size, its
// fire and its manner of flight. A tile makes a `Dragon` of one (`model.ts`)
// and flies it with a `Pilot` (`pilot.ts`).

import type { DragonKind } from './model';

// ---------------------------------------------------------------------------
// Daenerys's three, which fly over Westeros
// ---------------------------------------------------------------------------

/** Black, streaked with scarlet. The largest of the three. Its fire is black, shot through with red. */
export const DROGON: DragonKind = {
  name: 'Drogon', length: 14, body: 0x1b181e, belly: 0x29232b, streak: 0x9e1018, horn: 0xb3141c, bone: 0x141216,
  skin: [0x4a080c, 0x3a0609], claw: 0x0b0a0c, eye: 0xff2a1a, mouth: 0x6a0c0c, glow: 0xff3018,
  flame: { core: [0.02, 0.015, 0.02], edge: [1.0, 0.08, 0.04], fleck: [1.0, 0.3, 0.05], flecks: 0.08, cores: 0.62, dark: true, reach: 13, light: 0xff3a1a },
  // its wings beat the slowest of the three, because it is the largest
  flight: { beat: 0.74, answer: 6 },
};
/** Green and bronze, with wings of jade. Its fire is orange and yellow, with veins of green. */
export const RHAEGAL: DragonKind = {
  name: 'Rhaegal', length: 12, body: 0x1f4a2a, belly: 0x2c5e36, streak: 0x8c5a26, horn: 0x8c5a26, bone: 0x7a4e22,
  skin: [0x216349, 0x1b533d], claw: 0x0b0a0c, eye: 0xd98a2a, mouth: 0x4a2a10, glow: 0xffa020,
  flame: { core: [1.0, 0.86, 0.3], edge: [1.0, 0.5, 0.1], fleck: [0.2, 0.92, 0.3], flecks: 0.2, cores: 0.4, reach: 11, light: 0xffa030 },
  flight: { beat: 0.65, answer: 4.6 },
};
/** Cream and gold. The pale one. Its fire is pale gold, flecked with red and orange. */
export const VISERION: DragonKind = {
  name: 'Viserion', length: 11.5, body: 0xd8c79a, belly: 0xe2d4ae, streak: 0xb8861f, horn: 0xb8861f, bone: 0xa87a1c,
  skin: [0xc2a878, 0xb09462], claw: 0x0b0a0c, eye: 0xffc83a, mouth: 0x7a4a18, glow: 0xffd870,
  flame: { core: [1.0, 0.93, 0.66], edge: [1.0, 0.8, 0.36], fleck: [1.0, 0.26, 0.08], flecks: 0.2, cores: 0.45, reach: 11, light: 0xffd880 },
  flight: { beat: 0.61, answer: 7.4 },
};

// ---------------------------------------------------------------------------
// The great dragons of the Targaryens
// ---------------------------------------------------------------------------
//
// From docs/districts/research/the-great-dragons.md, which says what the books
// give and what is a choice. Their sizes against each other are the note's
// (section 14): the jump up from Drogon is squeezed, and the books' order
// among them is kept. Each is meant to be known at a glance, by its outline
// as much as its colours, and by how it flies: the old giants beat slowly and
// seldom and bank as ships do, the young and the quick snap into a turn.
// Where the books give no colour for eyes or fire, the choice is the note's
// or this file's, and says so.

/**
 * Balerion, the Black Dread: the largest of all. Black all over, with no red
 * on him but in his fire, which is black swirled with red. The broadest wings
 * of any, a heavy head with a deep jaw, and teeth like swords that show. His
 * eyes are not in the books: here they smoulder red, as his fire does.
 */
export const BALERION: DragonKind = {
  name: 'Balerion', length: 57, body: 0x100e12, belly: 0x1a171d, streak: 0x15121a, horn: 0x1d1a21, bone: 0x0f0d11,
  skin: [0x18151c, 0x0f0d12], claw: 0x070608, eye: 0xd8301c, mouth: 0x3a0a0a, glow: 0xc0221a, tooth: 0x2c2733,
  flame: { core: [0.01, 0.008, 0.012], edge: [0.8, 0.05, 0.04], fleck: [1.0, 0.22, 0.05], flecks: 0.12, cores: 0.66, dark: true, reach: 32, size: 2.6, spread: 3.4, light: 0xe0301a },
  shape: { head: 1.15, heft: 1.35, neck: 0.9, throat: 1.35, bulk: 1.3, reach: 1.15, breadth: 1.35, horns: 1.1, crest: 1.1, fin: 1.1, fangs: 0.32 },
  // a few slow, deep beats and long glides; he turns as a ship turns, and hardly looks about him
  flight: { beat: 1.6, answer: 2.2, bank: 40, glide: 2.2, stroke: 1.15, heave: 1.1, rock: 0.5, look: 0.4, sway: 0.7, swayRate: 0.55 },
};

/**
 * Vhagar: nearly Balerion's size, and the heaviest built, with a deep chest,
 * a thick neck and the scars of a hundred battles. Bronze with green-blue
 * highlights and bright green eyes, as the author's team gave them; the books
 * give none. Old and slow.
 */
export const VHAGAR: DragonKind = {
  name: 'Vhagar', length: 44, body: 0x665834, belly: 0x7d6d44, streak: 0x4a7d74, horn: 0x463a24, bone: 0x3a3220,
  skin: [0x5c5236, 0x48452f], claw: 0x0b0a0c, eye: 0x3dff6a, mouth: 0x4a2410, glow: 0xff8a2a, scar: 0xc8b08a,
  flame: { core: [1.0, 0.82, 0.4], edge: [1.0, 0.42, 0.08], fleck: [0.35, 0.9, 0.7], flecks: 0.1, cores: 0.45, reach: 26, size: 2.2, spread: 2.8, light: 0xff9a40 },
  // her wings are a little short for her length, broad, and worn at their edges: an old, heavy flier
  shape: { head: 1.05, heft: 1.25, neck: 0.85, throat: 1.45, body: 1.15, tail: 0.95, bulk: 1.5, reach: 0.9, breadth: 1.25, horns: 0.85, crest: 0.75, fin: 0.9, fangs: 0.12, scars: 0.85, ragged: 0.15 },
  // the slowest of all: long glides, heavy beats that lift her whole body, and a wide slow turn
  flight: { beat: 1.4, answer: 2.4, bank: 38, glide: 1.9, stroke: 1.1, heave: 1.25, rock: 0.4, look: 0.5, sway: 0.6, swayRate: 0.6 },
};

/**
 * Meraxes: silver, with golden eyes, among the three greatest. Lighter than
 * Vhagar and longer in the wing, as a dragon that spent more time in the air
 * than her sisters'. Her silver is a darker steel than Silverwing's, and her
 * horns and spines are pale gold to go with her eyes, so that the two are not
 * taken for each other: a choice, as her fire's gold is.
 */
export const MERAXES: DragonKind = {
  name: 'Meraxes', length: 37, body: 0x8f98a3, belly: 0xc8cdd3, streak: 0x6a7480, horn: 0xd8b860, bone: 0x6c7682,
  skin: [0x9aa3ae, 0x858e9a], claw: 0x0b0a0c, eye: 0xffc53a, mouth: 0x5a2a20, glow: 0xffd060,
  flame: { core: [1.0, 0.95, 0.7], edge: [1.0, 0.72, 0.22], fleck: [1.0, 0.4, 0.1], flecks: 0.15, cores: 0.5, reach: 22, size: 1.9, spread: 2.4, light: 0xffd070 },
  shape: { heft: 1.1, neck: 1.05, tail: 1.05, bulk: 1.1, throat: 1.05, reach: 1.18, horns: 1.1, crest: 1.2 },
  // long, sweeping glides on long wings, and a smooth, wide turn
  flight: { beat: 1.15, answer: 3.4, bank: 55, glide: 1.6, rock: 0.8, look: 0.8, sway: 0.9, swayRate: 0.8 },
};

/**
 * Vermithor, the Bronze Fury: bronze, with great tan wings, heavy and broad
 * in the chest, second only to Vhagar among the living. Old and hoary by the
 * Dance. His eyes and his fire are not in the books.
 */
export const VERMITHOR: DragonKind = {
  name: 'Vermithor', length: 26, body: 0x9c5f22, belly: 0xbb7c3a, streak: 0x6a3a14, horn: 0x6b4520, bone: 0x7a5a36,
  skin: [0xc9a46e, 0xb48f5c], claw: 0x0b0a0c, eye: 0xffa83a, mouth: 0x4a2410, glow: 0xff9a30, scar: 0xd8c09a,
  flame: { core: [1.0, 0.85, 0.35], edge: [1.0, 0.45, 0.08], fleck: [1.0, 0.25, 0.05], flecks: 0.18, cores: 0.42, reach: 18, size: 1.5, spread: 1.9, light: 0xffa040 },
  shape: { heft: 1.15, neck: 0.95, throat: 1.25, bulk: 1.35, reach: 1.05, breadth: 1.15, horns: 1.15, fangs: 0.08, scars: 0.3 },
  flight: { beat: 1.15, answer: 3.0, bank: 48, glide: 1.6, heave: 1.15, rock: 0.6, look: 0.6, sway: 0.8, swayRate: 0.75 },
};

/**
 * The Cannibal: black as coal, with green eyes of a menacing look. Wild, never
 * saddled, lean and scarred from a life of fighting other dragons. His fire is
 * not in the books, and is not black here, so that he is not taken for Balerion.
 */
export const CANNIBAL: DragonKind = {
  name: 'The Cannibal', length: 24, body: 0x161517, belly: 0x201e22, streak: 0x29272b, horn: 0x2e2b2e, bone: 0x1b191c,
  skin: [0x1f1d21, 0x151316], claw: 0x070608, eye: 0x40ff4a, mouth: 0x2a1414, glow: 0xffb84a, scar: 0x6e6a74, tooth: 0x2a2630,
  flame: { core: [1.0, 0.78, 0.3], edge: [0.9, 0.36, 0.06], fleck: [0.5, 0.9, 0.2], flecks: 0.12, cores: 0.38, reach: 16, size: 1.4, spread: 1.7, light: 0xffa030 },
  shape: { heft: 1.1, tail: 1.1, bulk: 0.9, throat: 0.95, reach: 1.05, horns: 1.3, crest: 1.5, fangs: 0.22, scars: 1, ragged: 0.45 },
  // restless and quick to turn, forever looking about him, as a hunter of his own kind
  flight: { beat: 0.85, answer: 7.5, bank: 80, glide: 0.8, stroke: 1.1, rock: 1.4, look: 2.2, sway: 1.3, swayRate: 1.2, snake: 0.3 },
};

/**
 * Silverwing: silvery, lighter than her mate Vermithor, and gentle. Her eyes
 * and her fire are not in the books: here the eyes are a soft blue and the
 * fire white gold, to set her apart from Meraxes, who is silver too.
 */
export const SILVERWING: DragonKind = {
  name: 'Silverwing', length: 24, body: 0xd7dde5, belly: 0xeff2f6, streak: 0xb8c6d8, horn: 0xe9edf3, bone: 0xaab6c6,
  skin: [0xdde4ee, 0xc5d0de], claw: 0x0b0a0c, eye: 0x7ac8ff, mouth: 0x5a3a40, glow: 0xffe8b0,
  flame: { core: [1.0, 0.98, 0.88], edge: [1.0, 0.85, 0.5], fleck: [0.7, 0.85, 1.0], flecks: 0.15, cores: 0.5, reach: 16, size: 1.4, spread: 1.7, light: 0xfff0c0 },
  shape: { neck: 1.05, tail: 1.05, bulk: 0.95, throat: 0.95, reach: 1.08, breadth: 1.05, horns: 0.8, crest: 0.8 },
  // a graceful glider, unhurried in her turns
  flight: { beat: 0.95, answer: 4, bank: 55, glide: 1.5, stroke: 0.9, rock: 0.7, look: 0.8, swayRate: 0.85 },
};

/**
 * Caraxes, the Blood Wyrm: blood red, huge and lean. The books never say his
 * neck was long; lean, and a wyrm, make a long and snaky build a fair reading
 * of them. The longest and thinnest neck and body of all, a long tail, and
 * wings no larger than Meleys's: he is longer than she is, and spans about the
 * same. His eyes and his fire are not in the books.
 */
export const CARAXES: DragonKind = {
  name: 'Caraxes', length: 25, body: 0x8e0f12, belly: 0xa8221e, streak: 0x5a0608, horn: 0x2a0a0a, bone: 0x5a0a0c,
  skin: [0x9e1a1c, 0x7e1214], claw: 0x0b0a0c, eye: 0xffd23a, mouth: 0x2a0505, glow: 0xff4a1a, scar: 0xc87a6a, tooth: 0x2a1a1a,
  flame: { core: [1.0, 0.7, 0.25], edge: [1.0, 0.22, 0.05], fleck: [1.0, 0.85, 0.3], flecks: 0.15, cores: 0.4, reach: 16, size: 1.3, spread: 1.5, light: 0xff5a20 },
  shape: { head: 1.1, heft: 0.85, neck: 1.9, throat: 0.7, body: 1.05, tail: 1.25, bulk: 0.75, reach: 0.85, breadth: 0.9, horns: 1.2, crest: 1.2, fangs: 0.1, scars: 0.35 },
  // quick and cunning: he snaps into his turns, his tail whips, and his long neck never keeps still
  flight: { beat: 0.75, answer: 8.5, bank: 82, glide: 1.0, rock: 1.2, look: 1.6, sway: 1.6, swayRate: 1.3, snake: 1 },
};

/**
 * Dreamfyre: pale blue with silver markings, silver crests and pale blue
 * wings; the slimmest of all. Her eyes and her fire are not in the books:
 * here they are pale blue and white, to go with her.
 */
export const DREAMFYRE: DragonKind = {
  name: 'Dreamfyre', length: 22, body: 0x9ec3e0, belly: 0xc5dcef, streak: 0xe2e8f0, horn: 0xd8dee6, bone: 0x8fb0cc,
  skin: [0xa9cbe6, 0x92b8d8], claw: 0x0b0a0c, eye: 0x9ad8ff, mouth: 0x3a3a5a, glow: 0xb8e0ff,
  flame: { core: [0.9, 0.97, 1.0], edge: [0.45, 0.72, 1.0], fleck: [1.0, 1.0, 1.0], flecks: 0.18, cores: 0.5, reach: 15, size: 1.3, spread: 1.5, light: 0xb0d8ff },
  shape: { heft: 0.85, neck: 1.15, tail: 1.15, bulk: 0.72, throat: 0.75, breadth: 0.95, horns: 0.9, crest: 2.4 },
  flight: { beat: 0.85, answer: 5, bank: 65, glide: 1.3, rock: 1.0, look: 0.9, sway: 1.2, swayRate: 0.9, snake: 0.25 },
};

/**
 * Meleys, the Red Queen: scarlet, with pink membranes in her wings and a
 * crest, horns and claws as bright as copper. Among the swiftest dragons of
 * her day: compact and swept back, built for speed. Her eyes and her fire are
 * not in the books.
 */
export const MELEYS: DragonKind = {
  name: 'Meleys', length: 22, body: 0xd8202a, belly: 0xe8504a, streak: 0xa83018, horn: 0xc87533, bone: 0xb85a4a,
  skin: [0xf08aa0, 0xe0708a], claw: 0xc87533, eye: 0xffe066, mouth: 0x5a1010, glow: 0xffa040,
  flame: { core: [1.0, 0.9, 0.45], edge: [1.0, 0.5, 0.12], fleck: [1.0, 0.3, 0.3], flecks: 0.18, cores: 0.45, reach: 15, size: 1.3, spread: 1.6, light: 0xffa850 },
  shape: { head: 0.95, neck: 0.8, body: 0.95, tail: 0.85, bulk: 0.95, throat: 0.95, reach: 0.95, breadth: 0.85, horns: 1.15, crest: 1.5, fin: 0.9 },
  // the quickest of all: fast beats, and she snaps over into a turn and out of it
  flight: { beat: 0.5, answer: 10, bank: 85, glide: 0.9, stroke: 0.9, rock: 0.9, look: 1.2, sway: 0.9, swayRate: 1.4 },
};

/**
 * Sheepstealer: an ugly mud brown, thin, the rangiest and roughest of all, his
 * wings ragged at their edges as no keeper ever groomed them. His eyes and his
 * fire are not in the books.
 */
export const SHEEPSTEALER: DragonKind = {
  name: 'Sheepstealer', length: 20, body: 0x5a4630, belly: 0x6e5a40, streak: 0x4a3a28, horn: 0x3a2e22, bone: 0x4a3c2a,
  skin: [0x6a563c, 0x584632], claw: 0x0b0a0c, eye: 0xffb030, mouth: 0x2a1a10, glow: 0xff9a3a, scar: 0x9a8a70, tooth: 0x2a2420,
  flame: { core: [1.0, 0.8, 0.35], edge: [0.95, 0.42, 0.1], fleck: [0.8, 0.6, 0.2], flecks: 0.15, cores: 0.4, reach: 14, size: 1.2, spread: 1.4, light: 0xffa040 },
  shape: { heft: 0.95, neck: 1.1, tail: 1.1, bulk: 0.78, throat: 0.72, breadth: 0.95, horns: 1.05, crest: 0.9, fangs: 0.06, scars: 0.5, ragged: 0.9 },
  // he works hard for his height: short glides, unsteady on the air, and always looking about for sheep
  flight: { beat: 0.7, answer: 6, bank: 70, glide: 0.75, stroke: 1.05, heave: 1.1, rock: 1.6, look: 1.8, sway: 1.3, swayRate: 1.1 },
};

/** The great dragons, from the largest down. */
export const GREAT_DRAGONS: DragonKind[] = [BALERION, VHAGAR, MERAXES, VERMITHOR, CANNIBAL, SILVERWING, CARAXES, DREAMFYRE, MELEYS, SHEEPSTEALER];
