// The cast of Gotham: Batman and his family, the police, the rogues, the
// Justice League on its visits, and the walk-ons, as figures at the size of
// the tile's people, each known at a glance by its colours, its outline, its
// build and the one thing it carries.
//
// It is built as the Iron Rain's cast is (tiles/red-rising/figures.ts): every
// figure is a toy's body on a simple skeleton (hips, chest and head; upper
// arms, forearms and hands; thighs, shins and feet), and every part is one
// instanced mesh for all the figures that wear it, so that the whole cast costs
// a few dozen draw calls however many stand. A pose turns the joints; a crouch
// sinks the hips and bends the knees by itself. What a figure wears rides its
// bones: cowls, hoods, hats and hair on the head, emblems on the chest, a cape
// in two halves of two pieces each from the shoulders that hang by their own
// weight, stream out behind and open wide like wings. What it carries is drawn
// from a handful of plain pieces (a rod, a block, a drum, a cone, a ball, a
// card, a blade, a loop), put away on the body or out in the hand.
//
// Gotham's figures differ from the Iron Rain's in what the show asks of them:
// `lie` turns the whole body about its middle (a flyer level in the air, one
// hanging by its feet, a cartwheel), `hold` puts away or brings out what it
// carries and turns it, `cape` streams and spreads, `glow` lights eyes, rings,
// domes and lenses, and `size` swells, shrinks or melts it.
//
// The looks are the comics' as the two research notes give them
// (docs/districts/research/gotham-batman-and-rogues.md, sections 1 to 3 and 6;
// gotham-the-wider-cast.md, sections 1 to 4), with the tile's own decisions
// over them: Batman in black with a yellow oval and a plain black bat, Harley
// Quinn in the jester's suit, and nobody carrying a gun. The comment on each
// look says what is the comics' and what is this file's own drawing. An emblem
// is a plain patch of colour in a plain shape, never any era's exact emblem and
// never lettering. Disfigurement is flat colour and shape, never a wound.

import * as THREE from 'three';
import type { Build } from '../../engine/tile';

// ---------------------------------------------------------------------------
// Who there is
// ---------------------------------------------------------------------------

/** Every named figure. */
export type CastId =
  // Batman and his family
  | 'batman' | 'robin' | 'damian' | 'nightwing' | 'redHood' | 'batgirl' | 'batwoman' | 'alfred'
  | 'huntress' | 'azrael' | 'spoiler' | 'orphan' | 'signal' | 'batMite'
  // the city
  | 'gordon' | 'bullock' | 'montoya' | 'lucius' | 'leslie' | 'vicki'
  // the rogues
  | 'joker' | 'harley' | 'penguin' | 'catwoman' | 'riddler' | 'twoFace' | 'ivy' | 'freeze' | 'scarecrow' | 'bane' | 'croc'
  | 'manBat' | 'langstrom' | 'clayface' | 'ras' | 'talia' | 'killerMoth' | 'madHatter' | 'kiteMan' | 'hush' | 'deathstroke'
  | 'blackMask' | 'talon' | 'firefly' | 'ventriloquist' | 'grundy' | 'calendarMan' | 'hugoStrange' | 'tweedledum' | 'tweedledee' | 'polkaDotMan'
  // the Justice League
  | 'superman' | 'wonderWoman' | 'flash' | 'greenLantern' | 'aquaman' | 'martianManhunter';

/** The kinds of unnamed figure the stories need several of. */
export type ExtraKind = 'officer' | 'clown' | 'thug' | 'assassin' | 'citizen' | 'fisher' | 'doorman' | 'guard' | 'collector';

/** What covers the head. */
export type HeadGear = 'none' | 'cowl' | 'helmet' | 'hood' | 'jester';
/** Hair, where it shows. */
export type HairStyle = 'none' | 'short' | 'long' | 'fringe' | 'bun';
/** A hat, made of plain pieces. */
export type Hat = 'top' | 'bowler' | 'fedora' | 'cap' | 'flat' | 'floppy' | 'bonnet';
/** A cape, or what serves for one. */
export type CapeKind = 'cape' | 'scallop' | 'tails' | 'wings' | 'moth' | 'kite';
/** Emblems on the chest, and one on the back. */
export type Mark = 'batOval' | 'bat' | 'boltDisc' | 'disc' | 'shield' | 'bird' | 'xstraps' | 'qmark' | 'dots' | 'leaves';
/** Small things on the head and body. */
export type Bit =
  | 'grin' | 'moustache' | 'goatee' | 'longNose' | 'monocle' | 'temples' | 'brow' | 'snout' | 'tiara' | 'bracelets'
  | 'earWings' | 'antennae' | 'collar' | 'tanks' | 'jetpack' | 'tubes' | 'tail' | 'lumps' | 'vines' | 'ruff' | 'badge'
  | 'band' | 'jersey' | 'bowtie' | 'stitches' | 'redNose';
/** The one thing a figure carries. */
export type Carry =
  | 'batarang' | 'staff' | 'sword' | 'swordBack' | 'escrima' | 'tray' | 'doughnut' | 'camera' | 'cards' | 'mallet'
  | 'umbrella' | 'whip' | 'cane' | 'coin' | 'freezeGun' | 'pouch' | 'crate' | 'trident' | 'lasso' | 'cocoon'
  | 'teacup' | 'tin' | 'dummy' | 'ring';

/**
 * What a figure looks like. The show reads only `name` and `height`; the rest
 * is how this file draws it. Colours are in big blocks: the chest, the hips (a
 * suit's trunks), the arms and forearms, the hands (gloves or skin), the
 * thighs and shins, the boots (or bare feet), and the belt.
 */
export interface Look {
  /** Who it is, for the console and the checks. */
  name: string;
  /** How tall, to the top of the head, in units: one of the tile's people is 2.3. */
  height: number;
  /** How broad for its height: 0.85 slight, 1 a person, 1.4 a giant. */
  build?: number;
  /** The head's size against the body's, 1 as a person's: Bat-Mite's and the Mad Hatter's are large. */
  headScale?: number;
  /** The legs' length against a person's: the Penguin's are short. */
  legLength?: number;
  skin: number;
  /** The head's own colour where it is not skin: a mask that covers it (Bane's, Black Mask's), or clay. */
  face?: number;
  chest: number;
  hips?: number;
  arms?: number;
  fore?: number;
  hands?: number;
  legs?: number;
  shins?: number;
  boots?: number;
  belt?: number;
  /** A round belly under the chest. */
  belly?: boolean;
  /** A jacket or coat open over the chest, which is then the waistcoat or shirt; and a shirt front on the chest. */
  jacket?: number;
  bib?: number;
  /** A long coat's skirt from the waist, `skirtLength` of the body down (0.4 to the knee). */
  skirt?: number;
  skirtLength?: number;
  /** A suit split down the middle: the figure's left half in other colours (Two-Face, Harley Quinn, Deathstroke's mask). */
  left?: { chest?: number; hips?: number; arms?: number; fore?: number; hands?: number; legs?: number; shins?: number; boots?: number; face?: number; check?: number };
  /** Stripes down the front and back of the arms and the legs. */
  stripes?: { arms?: number; legs?: number };
  marks?: Mark[];
  /** The colour of a plain emblem (`bat`, `bird`, `xstraps`, `qmark`, `leaves`). */
  markColor?: number;
  hair?: number;
  hairStyle?: HairStyle;
  hairScale?: number;
  head?: HeadGear;
  /** The colour of the cowl, helmet, hood or cap. */
  headColor?: number;
  /** A cowl's ears, by their length against Batman's: 0 none, 0.5 a cat's. */
  ears?: number;
  /** A domino mask over the eyes, or glasses. */
  mask?: number;
  glasses?: number;
  hat?: Hat;
  hatColor?: number;
  hatBand?: number;
  /** How large the hat is drawn, 1 as a person's: the Mad Hatter's is huge. */
  hatSize?: number;
  /** White eyes over a cowl or mask, which glow; or a creature's eyes. */
  eyes?: number;
  /** Round goggles, which glow, in this colour. */
  goggles?: number;
  /** A clear dome over the head, which glows. */
  dome?: boolean;
  bits?: Bit[];
  /** Colours of the bits, where not their own. */
  bitColor?: Partial<Record<Bit, number>>;
  cape?: { kind: CapeKind; out: number; in?: number; length?: number; width?: number };
  carries?: Carry;
  carryColor?: number;
  /** `size` melts it rather than shrinking it: Clayface. */
  melts?: boolean;
  [more: string]: unknown;
}

// ---------------------------------------------------------------------------
// How a figure stands
// ---------------------------------------------------------------------------

/**
 * A pose, as angles in radians. Every one is 0 for a figure standing straight
 * with its arms at its sides. Forward is the way the figure faces.
 */
export interface Pose {
  /** The body leans forward (positive) or back, from the hips. */
  lean: number;
  /** The body leans to its left (positive) or right. */
  tilt: number;
  /** The shoulders turn, to the left positive. */
  twist: number;
  /** The head turns, to the left positive, and nods forward (positive). */
  head: number;
  nod: number;
  /** Each leg swings forward (positive) from the hip, and its knee bends (positive). Both add to what a crouch bends by itself. */
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  /** Each arm swings forward (positive) from the shoulder, up to straight overhead at about 3; out to the side (positive); and its elbow bends. */
  armL: number;
  armR: number;
  spreadL: number;
  spreadR: number;
  elbowL: number;
  elbowR: number;
  /** How far the whole figure sinks, as in a crouch or a kneel: 0 to 1. The knees bend by themselves to keep the feet on the ground. */
  crouch: number;
  /** The legs spread apart sideways, as astride a motorcycle: 0 to 1. */
  straddle: number;
}

export const STANDING: Pose = { lean: 0, tilt: 0, twist: 0, head: 0, nod: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, spreadL: 0, spreadR: 0, elbowL: 0, elbowR: 0, crouch: 0, straddle: 0 };

/** A figure on the tile, which the show moves and poses. */
export interface Figure {
  readonly look: Look;
  /** Stands it with its feet on whatever is at height `y`, at (x, z), facing `heading` (radians: 0 east, a quarter turn south). */
  at(x: number, y: number, z: number, heading: number): void;
  /**
   * Turns the whole body about its middle, legs and all: `pitch` forward
   * (a flyer level in the air is about 1.45, one hanging by its feet is
   * pi) and `roll` to its right (a cartwheel goes round in roll). 0, 0 is
   * upright. `at` still says where its feet would be if it stood.
   */
  lie(pitch: number, roll?: number): void;
  /** Poses it. What is left out is as in STANDING. */
  pose(p: Partial<Pose>): void;
  /**
   * What it carries: `out` from 0, put away, closed or at its side, to 1, out,
   * open or raised (an umbrella opened, a whip cracked, a sword drawn, a coin
   * in the air, a lasso thrown), and `spin`, a turn in radians for what turns
   * (the umbrella's canopy, the coin, the mallet).
   */
  hold(out: number, spin?: number): void;
  /** Its cape, cloak or coat-tails: `stream` from 0 hanging still to 1 streaming out behind, and `spread` from 0 to 1 opened wide to either side like wings. */
  cape(stream: number, spread?: number): void;
  /** Whatever on it gives light, from 0 to 1: a cowl's white eyes, a ring, a helmet's dome, a lasso. */
  glow(f: number): void;
  /** How large it is drawn, 1 as its look says: for a figure that shrinks, swells or melts. */
  size(s: number): void;
  /** Shown, or hidden. */
  shown(v: boolean): void;
}

/** Everyone on the tile. */
export interface Cast {
  /** A figure with this look, standing nowhere and hidden until it is put somewhere and shown. */
  add(look: Look): Figure;
  /** Called once a frame, after posing: writes what changed into the meshes. */
  commit(): void;
  /** How many triangles one figure costs on average, for the console. */
  triangles(): number;
}

// ---------------------------------------------------------------------------
// The looks
// ---------------------------------------------------------------------------

/** Skins. */
const SKIN = 0xeac29e, FAIR = 0xf3d6bc, TAN = 0xc8956a, BROWN_SKIN = 0x7a4e34, DEEP = 0x5e3a26, WHITE_FACE = 0xf6f4ee;
/** Black that still shows its shape: a dark blue-grey, as the comics print it. */
const BLACK = 0x24262d, INK = 0x1c1d23;
const YELLOW = 0xf0c21e, GOLD = 0xd6a83a, RED = 0xc8232a, GREEN = 0x2f8a3e, PURPLE = 0x6a2c8c, ORANGE = 0xe8862a, WHITE = 0xffffff;
const STEELC = 0xc8ccd2, WOOD = 0x8a643a;

/** The look of every named figure. */
export const LOOKS: Record<CastId, Look> = {
  // ---- Batman and his family

  // The comics' cowl with two pointed ears, white eyes without pupils, the scalloped cape, the yellow belt and the batarang
  // (rogues note 1, after wp Batsuit). The black suit with a yellow oval carrying a plain black bat is the collector's
  // decision over the note's grey suit. The deep blue-black lining is the comics' printing of black (wp Batsuit), and the
  // cape to mid-calf with five scallops is the note's [tile]. The gloves' fins are too small to draw at this size.
  batman: { name: 'Batman', height: 2.95, build: 1.18, skin: SKIN, chest: BLACK, arms: BLACK, hands: INK, legs: BLACK, boots: INK, belt: YELLOW, head: 'cowl', headColor: INK, ears: 1, eyes: WHITE, marks: ['batOval'], cape: { kind: 'scallop', out: INK, in: 0x1f2a4c, length: 0.8, width: 1.15 }, carries: 'batarang', carryColor: 0x3a3d46 },
  // Tim Drake's first suit of 1989 (wider cast 1): red tunic, green sleeves, gloves and trousers, black boots, a yellow
  // belt, a cape black outside and yellow inside, a black domino mask and black hair [mem], a bo staff. The scallops on the
  // cape's foot are this file's.
  robin: { name: 'Robin (Tim Drake)', height: 2.4, build: 0.95, skin: SKIN, chest: RED, hips: GREEN, arms: GREEN, hands: GREEN, legs: GREEN, boots: BLACK, belt: YELLOW, hair: 0x1c1a1c, hairStyle: 'short', mask: INK, eyes: WHITE, cape: { kind: 'scallop', out: INK, in: YELLOW, length: 0.66 }, carries: 'staff', carryColor: 0x44464c },
  // Damian Wayne's suit of 2009 (wider cast 1): red tunic over black sleeves and trousers, green gloves and boots, a green
  // mask, a black hood up, a cape yellow outside; the smallest of the heroes; a sword on his back. The hood's and cape's
  // inner colours are mine.
  damian: { name: 'Robin (Damian Wayne)', height: 1.95, build: 0.92, skin: SKIN, chest: RED, hips: BLACK, arms: BLACK, hands: GREEN, legs: BLACK, boots: GREEN, belt: YELLOW, head: 'hood', headColor: INK, mask: 0x2a8a44, eyes: WHITE, cape: { kind: 'cape', out: YELLOW, in: 0xd4a41c, length: 0.62 }, carries: 'swordBack' },
  // Nightwing's suit of 1995 (wider cast 1): black, one blue bird from shoulder to shoulder and down both arms, a black
  // domino mask, black hair worn longish [mem], two escrima sticks. Lean.
  nightwing: { name: 'Nightwing', height: 2.8, build: 0.98, skin: SKIN, chest: BLACK, arms: BLACK, hands: BLACK, legs: BLACK, boots: INK, hair: 0x1a181c, hairStyle: 'short', hairScale: 1.12, mask: INK, eyes: WHITE, marks: ['bird'], markColor: 0x2f72e0, stripes: { arms: 0x2f72e0 }, carries: 'escrima' },
  // The Red Hood of 2011 (wider cast 1): a smooth red helmet, a brown leather jacket open over dark grey with a red bat,
  // dark trousers and boots, broad as Batman; his guns left out, and he carries nothing.
  redHood: { name: 'Red Hood', height: 2.85, build: 1.16, skin: SKIN, chest: 0x3a3c43, jacket: 0x6e4a2c, arms: 0x6e4a2c, hands: INK, legs: 0x2c2e35, boots: 0x2c2420, belt: 0x3a2c22, head: 'helmet', headColor: 0xc4262a, marks: ['bat'], markColor: 0xd02a2a },
  // Barbara Gordon's suit of 1967 (rogues note 2): a black bodysuit, yellow bat, gloves, boots and belt, a blue cape and
  // cowl with ears, red hair flowing from the cowl [mem]. The scalloped foot is mine.
  batgirl: { name: 'Batgirl', height: 2.6, build: 0.9, skin: FAIR, chest: BLACK, arms: BLACK, hands: YELLOW, legs: BLACK, boots: YELLOW, belt: YELLOW, head: 'cowl', headColor: 0x2c4c9e, ears: 0.8, eyes: WHITE, hair: 0xc8401e, hairStyle: 'long', marks: ['bat'], markColor: YELLOW, cape: { kind: 'scallop', out: 0x2c4c9e, in: 0x223c7e, length: 0.74 } },
  // Kate Kane (wider cast 4): black, a red bat, red gloves, boots and belt, a black cape lined bright red, long red hair (a
  // wig, in the comics). Ears on her cowl [mem].
  batwoman: { name: 'Batwoman', height: 2.75, build: 0.95, skin: FAIR, chest: BLACK, arms: BLACK, hands: 0xcc1e28, legs: BLACK, boots: 0xcc1e28, belt: 0xcc1e28, head: 'cowl', headColor: INK, ears: 0.85, eyes: WHITE, hair: 0xd42a1e, hairStyle: 'long', marks: ['bat'], markColor: 0xd8202a, cape: { kind: 'scallop', out: INK, in: 0xd01e28, length: 0.78 } },
  // Slim, with the thin moustache of Det. 83 (1944), balding, a butler's black tailcoat [mem] (rogues note 2). The grey
  // trousers, the white shirt front and the silver tray are mine.
  alfred: { name: 'Alfred Pennyworth', height: 2.6, build: 0.86, skin: FAIR, chest: 0x2a2a30, jacket: 0x1f1f25, bib: 0xf2f0ea, arms: 0x1f1f25, hands: FAIR, legs: 0x6c6e74, boots: INK, hair: 0xa6a6a2, hairStyle: 'fringe', bits: ['moustache'], bitColor: { moustache: 0x6a6662 }, cape: { kind: 'tails', out: 0x1f1f25, in: 0x1f1f25 }, carries: 'tray', carryColor: STEELC },
  // Helena Bertinelli (wider cast 4): a purple and black suit with a cape, long black hair, a mask [mem]. Her crossbow is
  // left out for a staff, as the task says; the white cross on her chest is left out as too small.
  huntress: { name: 'Huntress', height: 2.65, build: 0.92, skin: FAIR, chest: 0x5c2a80, arms: BLACK, hands: 0x5c2a80, legs: BLACK, boots: 0x5c2a80, belt: 0x3a1c52, hair: 0x18161a, hairStyle: 'long', mask: 0x5c2a80, eyes: WHITE, cape: { kind: 'cape', out: 0x5c2a80, in: INK, length: 0.66 }, carries: 'staff', carryColor: 0x3a3a40 },
  // Jean-Paul Valley (wider cast 4): the note gives red and gold. The task's white and gold armour, a red cloak and hood,
  // is drawn; his flaming sword is left out. The white face band is mine.
  azrael: { name: 'Azrael', height: 2.85, build: 1.05, skin: SKIN, chest: 0xeae6dc, arms: 0xeae6dc, hands: GOLD, legs: 0xeae6dc, boots: GOLD, belt: GOLD, head: 'hood', headColor: 0xb0201e, mask: 0xeae6dc, eyes: WHITE, marks: ['xstraps'], markColor: GOLD, cape: { kind: 'cape', out: 0xb0201e, in: 0x8a1a18, length: 0.82 } },
  // Stephanie Brown (wider cast 1): a purple hooded cloak and a full black mask [mem]. The black legs are mine.
  spoiler: { name: 'Spoiler', height: 2.45, build: 0.9, skin: FAIR, chest: 0x6c3a9c, arms: 0x6c3a9c, hands: 0x6c3a9c, legs: INK, boots: INK, belt: 0x3a1c52, head: 'hood', headColor: 0x6c3a9c, face: INK, eyes: WHITE, cape: { kind: 'cape', out: 0x6c3a9c, in: 0x4a2470, length: 0.72 } },
  // Cassandra Cain as Orphan: all black, a full mask (its stitched mouth left plain), a short ragged cape. From memory; the
  // notes do not describe her.
  orphan: { name: 'Orphan', height: 2.45, build: 0.9, skin: SKIN, chest: INK, arms: INK, hands: INK, legs: INK, boots: INK, belt: BLACK, head: 'helmet', headColor: INK, eyes: WHITE, cape: { kind: 'scallop', out: INK, in: BLACK, length: 0.42 } },
  // Duke Thomas as Signal: yellow and black, a bat on the chest, a helmet with goggles. From memory; the notes do not
  // describe him.
  signal: { name: 'Signal', height: 2.6, build: 1.0, skin: BROWN_SKIN, chest: INK, arms: YELLOW, hands: INK, legs: INK, boots: YELLOW, belt: YELLOW, head: 'helmet', headColor: INK, goggles: 0xffe060, marks: ['bat'], markColor: YELLOW },
  // "A small, childlike man in an ill-fitting copy of Batman's costume" (wider cast 4, after wp Bat-Mite): a baggy grey
  // and purple suit, a cape too long, big ears on his cowl, a big head [mem for the colours].
  batMite: { name: 'Bat-Mite', height: 1.3, build: 1.25, headScale: 1.55, legLength: 0.9, skin: 0xf2c8a8, chest: 0x8c8e98, arms: 0x8c8e98, hands: 0x5c3a8c, legs: 0x8c8e98, boots: 0x5c3a8c, belt: YELLOW, head: 'cowl', headColor: 0x5c3a8c, ears: 1.7, eyes: WHITE, marks: ['batOval'], cape: { kind: 'scallop', out: 0x5c3a8c, in: 0x4a2c72, length: 1.0, width: 1.2 } },

  // ---- The city

  // Glasses, a moustache, grey hair and a trench coat (rogues note 2, [mem]); no pipe or cigarette. The coat's tan is mine.
  gordon: { name: 'Commissioner Gordon', height: 2.6, build: 1.02, skin: SKIN, chest: 0xb69a6c, arms: 0xb69a6c, hands: SKIN, legs: 0x4c4238, boots: 0x3a2a20, belt: 0x957a50, skirt: 0xb69a6c, skirtLength: 0.42, hair: 0xb4b4b0, hairStyle: 'short', glasses: 0x3a3a3c, bits: ['moustache'], bitColor: { moustache: 0xb4b4b0 } },
  // Harvey Bullock, heavy, in a rumpled coat and a fedora, with a doughnut: the task's look; the notes say only that a
  // stranger would not know him. The red tie is mine.
  bullock: { name: 'Harvey Bullock', height: 2.6, build: 1.36, belly: true, skin: SKIN, chest: 0xd8d2c0, jacket: 0x6e6248, bib: 0xa83a2a, arms: 0x6e6248, hands: SKIN, legs: 0x4a4438, boots: 0x3a2e24, hat: 'fedora', hatColor: 0x5a5040, hatBand: 0x3a3228, hair: 0x3a2e24, hairStyle: 'short', carries: 'doughnut', carryColor: 0xc8864e },
  // Renee Montoya: a dark jacket, her badge on her belt (the task); black hair and the rest are mine.
  montoya: { name: 'Renee Montoya', height: 2.5, build: 0.95, skin: TAN, chest: 0x3c3c42, jacket: 0x2a2c33, arms: 0x2a2c33, hands: TAN, legs: 0x2a2a30, boots: INK, belt: INK, hair: 0x18161a, hairStyle: 'short', bits: ['badge'] },
  // Lucius Fox: a grey suit and glasses (the task); the grey hair and moustache are mine.
  lucius: { name: 'Lucius Fox', height: 2.65, build: 1.0, skin: DEEP, chest: 0x6a6e76, jacket: 0x5e626a, bib: 0xf0eee8, arms: 0x5e626a, hands: DEEP, legs: 0x5e626a, boots: INK, hair: 0xa8a8a4, hairStyle: 'short', hairScale: 1.02, glasses: 0x2a2a2c, bits: ['moustache'], bitColor: { moustache: 0xa8a8a4 } },
  // Dr. Leslie Thompkins: a white coat and grey hair in a bun (the task); her clothes under it are mine.
  leslie: { name: 'Leslie Thompkins', height: 2.4, build: 0.9, skin: FAIR, chest: 0xeeeeea, arms: 0xeeeeea, hands: FAIR, legs: 0x5a6070, boots: 0x3a3a40, skirt: 0xeeeeea, skirtLength: 0.44, hair: 0xc4c2be, hairStyle: 'bun' },
  // Vicki Vale: red hair, a green suit, a camera whose flash is her glow (the task).
  vicki: { name: 'Vicki Vale', height: 2.5, build: 0.88, skin: FAIR, chest: 0x3a8a5c, jacket: 0x337a52, arms: 0x337a52, hands: FAIR, legs: 0x2c3a32, boots: 0x2a2a2e, hair: 0xc8401e, hairStyle: 'long', carries: 'camera' },

  // ---- The rogues

  // "A purple suit with a long-tailed, padded-shoulder jacket, a string tie, gloves, striped pants and spats"; chalk-white
  // skin, green hair, red lips and a fixed grin; tall and lean since 1973 (rogues note 3, wp Joker). A green or orange
  // shirt [mem]: the orange waistcoat and green shirt front are the task's. The giant cards are the comics' trophy card
  // and the note's proposal [tile].
  joker: { name: 'The Joker', height: 2.9, build: 0.88, skin: WHITE_FACE, chest: ORANGE, jacket: PURPLE, bib: 0x3a9a4a, arms: PURPLE, hands: 0xf2f2ee, legs: PURPLE, boots: 0x2a2228, hair: 0x3aa84a, hairStyle: 'short', hairScale: 1.22, stripes: { legs: 0x4a1a66 }, bits: ['grin'], cape: { kind: 'tails', out: PURPLE, in: 0x5a2278 }, carries: 'cards' },
  // Timm's design, as the comics drew it from 1999 to 2011 (rogues note 3): a jester's hat with two points, a ruffled
  // collar and a domino mask on a red-and-black bodysuit, white face [mem]; a mallet as big as she is. Its quarters (her
  // left half red above and black below) are this file's reading of the diamonds.
  harley: { name: 'Harley Quinn', height: 2.5, build: 0.9, skin: WHITE_FACE, chest: INK, hips: RED, arms: INK, hands: INK, legs: RED, boots: INK, left: { chest: RED, hips: INK, arms: RED, hands: RED, legs: INK, boots: RED }, head: 'jester', mask: INK, bits: ['ruff'], carries: 'mallet' },
  // "A short, fat man with a long nose who wears a monocle, top hat, and morning suit while carrying his signature umbrella",
  // spats [mem] (rogues note 3). The purple waistcoat is the task's; the umbrella twice as wide as he is is the note's.
  penguin: { name: 'The Penguin', height: 2.0, build: 1.4, belly: true, headScale: 1.12, legLength: 0.78, skin: 0xf0cdb0, chest: 0x6a3a8c, jacket: 0x1f1f25, bib: 0xf4f2ec, arms: 0x1f1f25, hands: 0xf0cdb0, legs: 0x3a3a42, boots: 0xf0f0ea, hat: 'top', hatColor: INK, hatBand: 0x3a3a42, bits: ['longNose', 'monocle'], cape: { kind: 'tails', out: 0x1f1f25, in: 0x1f1f25 }, carries: 'umbrella', carryColor: INK },
  // Darwyn Cooke's look of 2001 (rogues note 3): a black bodysuit, a cowl with ears, round goggles, a bullwhip. The
  // goggles' pale green is mine.
  catwoman: { name: 'Catwoman', height: 2.6, build: 0.86, skin: FAIR, chest: BLACK, arms: BLACK, hands: INK, legs: BLACK, boots: INK, belt: INK, head: 'cowl', headColor: INK, ears: 0.5, goggles: 0xc8f0b0, carries: 'whip', carryColor: 0x2a2a30 },
  // The green suit and bowler, a domino mask, one large question mark on the back and the cane (rogues note 3); purple for
  // the mask, the gloves and the mark is the comics' (the question mark is "black, green or purple").
  riddler: { name: 'The Riddler', height: 2.7, build: 0.84, skin: SKIN, chest: 0x2fae4a, arms: 0x2fae4a, hands: PURPLE, legs: 0x2fae4a, boots: 0x1f5a2a, belt: 0x268a3a, hair: 0x8a4a2a, hairStyle: 'short', mask: PURPLE, hat: 'bowler', hatColor: 0x26923c, hatBand: PURPLE, marks: ['qmark'], markColor: PURPLE, carries: 'cane', carryColor: PURPLE },
  // A suit split down the middle, one half sober and the other loud [mem]; the coin (rogues note 3). The left half of his
  // face is a flat pale green with no wound drawn, as the note asks; his right sober grey and his left purple with an
  // orange check are the task's.
  twoFace: { name: 'Two-Face', height: 2.75, build: 1.02, skin: SKIN, chest: 0x4a4c53, hips: 0x4a4c53, arms: 0x4a4c53, hands: SKIN, legs: 0x4a4c53, boots: INK, bib: 0xf0eee8, left: { chest: PURPLE, hips: PURPLE, arms: PURPLE, legs: PURPLE, boots: 0x3a1c52, face: 0xa8cc96, check: ORANGE }, hair: 0x4a3a2a, hairStyle: 'short', carries: 'coin', carryColor: 0xd8dce2 },
  // "Barefoot with long flowing hair, plant vines extending over her limbs, and a green one-piece suit adorned with leaves",
  // sometimes green skin; red hair [mem] (rogues note 3).
  ivy: { name: 'Poison Ivy', height: 2.6, build: 0.88, skin: 0xb8dca2, chest: 0x3a8a3a, hips: 0x3a8a3a, hair: 0xc8381e, hairStyle: 'long', marks: ['leaves'], markColor: 0x4aa83e, bits: ['vines'], bitColor: { vines: 0x2a6a2a } },
  // A pale, bald man under a clear dome, on a bulky cold suit of white and ice blue, with a freezing gun (rogues note 3,
  // the comics' look since the late 1960s, not Mignola's). The tanks on his back and the hose are mine.
  freeze: { name: 'Mr. Freeze', height: 3.0, build: 1.32, skin: 0xc0dcf0, chest: 0xe8eef2, arms: 0x9ad0ea, hands: 0x9ad0ea, legs: 0xe8eef2, boots: 0x7ab8dc, belt: 0x6ab0da, dome: true, bits: ['tanks'], carries: 'freezeGun' },
  // A lanky man in a scarecrow's clothes with a stitched burlap mask, a floppy hat, straw at his cuffs [mem] (rogues note
  // 3); his noose and scythe left out. The pouch is his dust's, which the tile shows as a harmless puff.
  scarecrow: { name: 'The Scarecrow', height: 3.0, build: 0.8, skin: 0xb8986a, chest: 0x6a5236, jacket: 0x5e4830, arms: 0x5e4830, hands: 0xdcc474, legs: 0x4a3a28, boots: 0x3a2c20, skirt: 0x5e4830, skirtLength: 0.46, hat: 'floppy', hatColor: 0x5a4428, bits: ['stitches'], carries: 'pouch', carryColor: 0x8a6a3a },
  // Graham Nolan's luchador mask; tubes into his head; a black mask, bare arms and dark tights [mem] (rogues note 3). The
  // white eyes are the mask's; the crate is the note's [tile].
  bane: { name: 'Bane', height: 3.5, build: 1.48, skin: 0xb8865a, face: 0x1c1c21, eyes: 0xf2f2f2, chest: 0x1f1f25, arms: 0xb8865a, hands: 0xb8865a, legs: 0x2a2c34, boots: INK, belt: INK, bits: ['tubes'], bitColor: { tubes: 0x3aa84a }, carries: 'crate', carryColor: WOOD },
  // "A powerfully built man covered entirely in green scales", ragged trousers [mem] (rogues note 3). A green giant, drawn
  // as flat colour and shape. The heavy jaw, the yellow eyes and the short tail are the task's.
  croc: { name: 'Killer Croc', height: 3.6, build: 1.5, skin: 0x4a7a3a, chest: 0x4a7a3a, arms: 0x4a7a3a, hands: 0x4a7a3a, hips: 0x5a5040, legs: 0x5a5040, shins: 0x4a7a3a, boots: 0x4a7a3a, eyes: 0xf0d040, bits: ['snout', 'tail'], bitColor: { snout: 0x4a7a3a, tail: 0x4a7a3a } },
  // Brown fur, leathery wings and bat's ears [mem]; wings three times a person's height (rogues note 3). The red eyes are mine.
  manBat: { name: 'Man-Bat', height: 3.2, build: 1.1, skin: 0x6a4a32, chest: 0x6a4a32, arms: 0x6a4a32, hands: 0x5a3e2a, legs: 0x6a4a32, boots: 0x5a3e2a, head: 'cowl', headColor: 0x6a4a32, ears: 1.35, eyes: 0xe04030, bits: ['snout'], bitColor: { snout: 0x5a3e2a }, cape: { kind: 'wings', out: 0x4e3424, in: 0x4e3424 } },
  // Kirk Langstrom, the zoologist (rogues note 3): a white lab coat and glasses, as the task gives him.
  langstrom: { name: 'Kirk Langstrom', height: 2.6, build: 0.92, skin: SKIN, chest: 0xeeeeea, arms: 0xeeeeea, hands: SKIN, legs: 0x3a3c44, boots: INK, skirt: 0xeeeeea, skirtLength: 0.44, hair: 0x6a4a2a, hairStyle: 'short', glasses: 0x2a2a2c },
  // Matt Hagen as a lumpy brown man of clay that melts and reshapes [mem] (rogues note 3). His yellow eyes are mine.
  clayface: { name: 'Clayface', height: 3.4, build: 1.45, headScale: 0.92, skin: 0x8a6a48, chest: 0x8a6a48, arms: 0x8a6a48, hands: 0x7e6040, legs: 0x8a6a48, boots: 0x7e6040, eyes: 0xf0c050, bits: ['lumps'], bitColor: { lumps: 0x7e6040 }, melts: true },
  // Neal Adams's: a high widow's peak of black hair grey at the temples, a short beard, a green cape with a high collar
  // [mem] (wider cast 2). The green cloak over black and gold is the task's, over the note's green robe; drawn as a
  // gentleman in green, with nothing that marks him as of any people.
  ras: { name: "Ra's al Ghul", height: 2.9, build: 0.96, skin: TAN, chest: BLACK, arms: BLACK, hands: INK, legs: BLACK, boots: INK, belt: GOLD, hair: 0x18161a, hairStyle: 'short', bits: ['goatee', 'temples', 'collar'], bitColor: { goatee: 0x18161a, temples: 0xb8b8b4, collar: 0x2a6a3c }, marks: ['xstraps'], markColor: GOLD, cape: { kind: 'cape', out: 0x2a6a3c, in: 0x1e4a2a, length: 0.84, width: 1.1 }, carries: 'sword' },
  // Long dark hair [mem] (wider cast 2); the dark red and black bodysuit and the sword are the task's, over the note's
  // dark green.
  talia: { name: "Talia al Ghul", height: 2.65, build: 0.9, skin: TAN, chest: 0x7a1a26, arms: 0x7a1a26, hands: INK, legs: INK, boots: INK, belt: GOLD, hair: 0x2a1e18, hairStyle: 'long', carries: 'sword' },
  // A purple suit with orange or green panels, a moth's wings on his back, antennae, round goggles [mem] (wider cast 4);
  // his cocoon gun is a net thrower, drawn as a fat tube. His air pistol is left out.
  killerMoth: { name: 'Killer Moth', height: 2.7, build: 0.96, skin: SKIN, chest: PURPLE, arms: PURPLE, hands: 0x3aa83e, legs: PURPLE, boots: 0x3aa83e, belt: ORANGE, head: 'helmet', headColor: PURPLE, goggles: 0xf0d070, stripes: { arms: ORANGE, legs: 0x5ab83e }, bits: ['antennae'], bitColor: { antennae: INK }, cape: { kind: 'moth', out: 0xe8a040, in: 0xe8a040 }, carries: 'cocoon', carryColor: 0x5ab83e },
  // Drawn from Carroll's Hatter; a huge top hat with a price card in its band, a big head on a small body [mem] (rogues
  // note 3). The green coat, the bow tie and the teacup are the task's; he stands near no child.
  madHatter: { name: 'The Mad Hatter', height: 2.2, build: 0.96, headScale: 1.45, skin: FAIR, chest: 0xc8a040, jacket: 0x2f6a38, bib: 0xf2f0e8, arms: 0x2f6a38, hands: FAIR, legs: 0x6a5a3a, boots: 0x3a2a20, hair: 0xd87a2a, hairStyle: 'short', hairScale: 1.18, hat: 'top', hatColor: 0x2f5a34, hatBand: 0xa83a2a, hatSize: 1.6, bits: ['bowtie'], bitColor: { bowtie: 0xc0262a }, carries: 'teacup', carryColor: 0xf4f2ec },
  // Kite Man: green and yellow, a helmet, a big diamond kite on his back (the task); from memory, the notes do not
  // describe him. The hood and yellow mask are this file's helmet.
  kiteMan: { name: 'Kite Man', height: 2.6, build: 1.0, skin: SKIN, chest: 0x3a9a3a, arms: YELLOW, hands: 0x3a9a3a, legs: 0x3a9a3a, boots: YELLOW, belt: YELLOW, head: 'hood', headColor: 0x3a9a3a, mask: YELLOW, cape: { kind: 'kite', out: 0x3a9a3a, in: YELLOW } },
  // His face wrapped in bandages (rogues note 3, wp Hush), a trench coat [mem]: tan and long, as the task gives it.
  hush: { name: 'Hush', height: 2.8, build: 1.0, skin: SKIN, chest: 0x3a3a42, jacket: 0xa8885a, arms: 0xa8885a, hands: INK, legs: 0x2e2e34, boots: INK, skirt: 0xa8885a, skirtLength: 0.5, head: 'helmet', headColor: 0xe8e0cc, eyes: 0x222226 },
  // A black and orange mask (wider cast 4, wp Deathstroke); blue and orange armour and a sword, as the task gives them;
  // which half is orange is mine.
  deathstroke: { name: 'Deathstroke', height: 2.9, build: 1.15, skin: SKIN, chest: 0x26365e, arms: ORANGE, fore: 0x2f4a8a, hands: INK, legs: 0x2f4a8a, boots: ORANGE, belt: INK, head: 'helmet', headColor: INK, left: { face: 0xe07a22 }, eyes: WHITE, carries: 'swordBack' },
  // Roman Sionis: a black skull mask and a white suit (the task); the note leaves him out for his story, and the tile
  // shows nothing of it.
  blackMask: { name: 'Black Mask', height: 2.75, build: 1.02, skin: SKIN, face: 0x161619, eyes: 0xd8d8d0, chest: INK, jacket: 0xeeeeea, bib: INK, arms: 0xeeeeea, hands: INK, legs: 0xeeeeea, boots: INK },
  // A Talon: dark armour and goggles with gold lenses [mem] (wider cast 4); black and bronze, an owl's mask, as the task
  // gives it. Their knives are left out.
  talon: { name: 'Talon', height: 2.7, build: 1.0, skin: SKIN, chest: INK, arms: 0x9a743a, hands: INK, legs: INK, boots: 0x9a743a, belt: 0x9a743a, head: 'helmet', headColor: 0x2a2620, goggles: 0xf0c050, bits: ['brow'], bitColor: { brow: 0x9a743a }, cape: { kind: 'cape', out: INK, in: 0x3a3228, length: 0.5 } },
  // Garfield Lynns (wider cast 4): a fireproof suit with wings after 1986; the task's grey flight suit, a helmet with big
  // lenses and a jet pack whose flame is his glow. Nothing burns.
  firefly: { name: 'Firefly', height: 2.7, build: 1.02, skin: SKIN, chest: 0x8a8e94, arms: 0x8a8e94, hands: 0x5a5e64, legs: 0x8a8e94, boots: 0x5a5e64, belt: 0x5a5e64, head: 'helmet', headColor: 0x6a6e74, goggles: 0xffa040, bits: ['jetpack'] },
  // Arnold Wesker: a meek man with a dummy dressed as a 1920s gangster in a pinstripe suit (wider cast 4). The dummy holds
  // nothing, as the task says; bald and the glasses are the task's.
  ventriloquist: { name: 'The Ventriloquist', height: 2.3, build: 0.82, skin: FAIR, chest: 0x6a5236, jacket: 0x5e4a30, bib: 0xeeeae0, arms: 0x5e4a30, hands: FAIR, legs: 0x5e4a30, boots: INK, hair: 0x8a7a6a, hairStyle: 'fringe', glasses: 0x2a2a2c, carries: 'dummy' },
  // A huge figure with chalk-white skin, lank hair and a ragged suit [mem] (wider cast 4); the task's torn black frock coat.
  grundy: { name: 'Solomon Grundy', height: 3.6, build: 1.42, skin: 0xc6cac6, chest: 0x5a5a5e, jacket: 0x26262b, arms: 0x26262b, hands: 0xc6cac6, legs: 0x3a3a40, boots: 0x26262b, hair: 0xf0f0ee, hairStyle: 'long', cape: { kind: 'tails', out: 0x26262b, in: 0x26262b } },
  // Calendar Man: a red suit with a white cape printed with a calendar's grid (the task). The grid is too fine to draw at
  // this size: the cape is plain white, lined red.
  calendarMan: { name: 'Calendar Man', height: 2.6, build: 1.0, skin: SKIN, chest: 0xb82a2a, arms: 0xb82a2a, hands: 0xb82a2a, legs: 0xb82a2a, boots: 0xb82a2a, belt: 0xf2f0ea, hair: 0x3a2a20, hairStyle: 'short', cape: { kind: 'cape', out: 0xf2f0ea, in: 0xb82a2a, length: 0.72 } },
  // Hugo Strange: bald, round dark glasses, a chin-strap beard, a white lab coat (the task).
  hugoStrange: { name: 'Hugo Strange', height: 2.5, build: 0.96, skin: FAIR, chest: 0xeeeeea, arms: 0xeeeeea, hands: FAIR, legs: 0x3a3a40, boots: INK, skirt: 0xeeeeea, skirtLength: 0.44, glasses: 0x101012, bits: ['goatee'], bitColor: { goatee: 0x3a3028 } },
  // Tweedledum and Tweedledee: round twins in schoolboy caps, in matching yellow and red (the task).
  tweedledum: { name: 'Tweedledum', height: 2.2, build: 1.36, belly: true, legLength: 0.86, skin: SKIN, chest: YELLOW, arms: RED, hands: SKIN, hips: RED, legs: RED, shins: 0xf0eee8, boots: INK, hat: 'cap', hatColor: RED, hatBand: YELLOW, hair: 0xd8a040, hairStyle: 'short' },
  tweedledee: { name: 'Tweedledee', height: 2.2, build: 1.36, belly: true, legLength: 0.86, skin: SKIN, chest: YELLOW, arms: RED, hands: SKIN, hips: RED, legs: RED, shins: 0xf0eee8, boots: INK, hat: 'cap', hatColor: RED, hatBand: YELLOW, hair: 0xd8a040, hairStyle: 'short' },
  // Polka-Dot Man: a white suit covered in coloured dots (the task); the white hood is mine.
  polkaDotMan: { name: 'Polka-Dot Man', height: 2.6, build: 1.06, skin: SKIN, chest: 0xf2f2ee, hips: 0xf2f2ee, arms: 0xf2f2ee, hands: 0xf2f2ee, legs: 0xf2f2ee, boots: 0xf2f2ee, head: 'hood', headColor: 0xf2f2ee, marks: ['dots'] },

  // ---- The Justice League, the classic seven of 1960 (wider cast 3)

  // Shuster's tights, over-shorts and cape, red boots; a yellow belt, a plain red-and-yellow shield, black hair [mem].
  superman: { name: 'Superman', height: 3.0, build: 1.22, skin: SKIN, chest: 0x2a5ad2, hips: RED, arms: 0x2a5ad2, hands: 0x2a5ad2, legs: 0x2a5ad2, boots: RED, belt: YELLOW, hair: 0x161620, hairStyle: 'short', marks: ['shield'], cape: { kind: 'cape', out: RED, in: 0xae1a22, length: 0.82, width: 1.15 } },
  // A red top with a gold band, blue star-spangled bottoms (the stars too small to draw), red boots, silver bracelets, a
  // gold tiara, long black hair, the golden lasso (wider cast 3, wp Wonder Woman, [mem]).
  wonderWoman: { name: 'Wonder Woman', height: 2.85, build: 1.0, skin: 0xe0b08a, chest: 0xc8202a, hips: 0x2a4ab4, arms: 0xe0b08a, hands: 0xe0b08a, legs: 0xe0b08a, boots: 0xc8202a, belt: GOLD, hair: 0x161418, hairStyle: 'long', bits: ['band', 'tiara', 'bracelets'], bitColor: { band: GOLD }, carries: 'lasso' },
  // Barry Allen: a red suit and cowl, a yellow bolt on a white disc, yellow boots and belt, small wings on the cowl [mem].
  flash: { name: 'The Flash', height: 2.75, build: 0.92, skin: SKIN, chest: 0xd2202a, arms: 0xd2202a, hands: 0xd2202a, legs: 0xd2202a, boots: YELLOW, belt: YELLOW, head: 'cowl', headColor: 0xd2202a, ears: 0, eyes: 0x2a2a30, marks: ['boltDisc'], bits: ['earWings'], bitColor: { earWings: YELLOW } },
  // Hal Jordan: green and black, white gloves, a green domino mask, the lantern emblem on a white disc (drawn as the plain
  // disc), brown hair [mem]; his ring glows.
  greenLantern: { name: 'Green Lantern', height: 2.8, build: 1.05, skin: SKIN, chest: 0x2a9a4a, arms: INK, fore: 0x2a9a4a, hands: 0xf2f2ee, legs: INK, boots: 0x2a9a4a, hair: 0x6a4a2a, hairStyle: 'short', mask: 0x2a9a4a, eyes: WHITE, marks: ['disc'], carries: 'ring', carryColor: 0x40ff70 },
  // "His trademark orange and green costume": an orange shirt of scales, green gloves and trousers, a gold belt, blond and
  // clean-shaven, the trident (wider cast 3, wp Aquaman, [mem]).
  aquaman: { name: 'Aquaman', height: 2.85, build: 1.1, skin: SKIN, chest: 0xe8862a, arms: 0xe8862a, hands: 0x2a8a4a, legs: 0x2a8a4a, boots: 0x2a8a4a, belt: GOLD, hair: 0xe8c860, hairStyle: 'short', carries: 'trident', carryColor: GOLD },
  // Green skin, bald, a heavy brow, red eyes, a blue cape with a high collar, red straps crossed on the chest (wider cast
  // 3, [mem]); black trunks, as the task says, over the note's blue.
  martianManhunter: { name: 'Martian Manhunter', height: 3.1, build: 1.22, skin: 0x4a9a4a, chest: 0x4a9a4a, hips: INK, arms: 0x4a9a4a, hands: 0x4a9a4a, legs: 0x4a9a4a, boots: 0x2a4ab4, eyes: 0xe02a2a, marks: ['xstraps'], markColor: 0xc8262a, bits: ['brow', 'collar'], bitColor: { brow: 0x3e8a3e, collar: 0x2a4ab4 }, cape: { kind: 'cape', out: 0x2a4ab4, in: 0x223c90, length: 0.8 } },
};

/** The looks of the unnamed, by kind: all this file's drawing, after the task's lines. */
export const EXTRAS: Record<ExtraKind, Look> = {
  // a dark blue uniform, a peaked cap with a badge, no gun
  officer: { name: 'a police officer', height: 2.3, build: 1.0, skin: SKIN, chest: 0x22305a, arms: 0x22305a, hands: SKIN, legs: 0x22305a, boots: INK, belt: INK, hat: 'cap', hatColor: 0x1c284c, hatBand: INK, bits: ['badge'] },
  // the Joker's men: a suit and a clown's mask
  clown: { name: "one of the Joker's men", height: 2.35, build: 1.05, skin: SKIN, face: WHITE_FACE, chest: 0x4a3e5a, arms: 0x4a3e5a, hands: 0xf2f2ee, legs: 0x4a3e5a, boots: INK, hair: 0xe0602a, hairStyle: 'short', hairScale: 1.32, bits: ['grin', 'redNose'] },
  // a flat cap, a striped jersey
  thug: { name: 'a thug', height: 2.35, build: 1.12, skin: SKIN, chest: 0x2a2e3e, arms: 0x2a2e3e, hands: SKIN, legs: 0x4a4440, boots: INK, hat: 'flat', hatColor: 0x5a4a38, bits: ['jersey'], bitColor: { jersey: 0xe8e4da } },
  // Ra's al Ghul's: black from head to foot, a hood and a cloth mask, a red sash, a sword on the back
  assassin: { name: 'a League assassin', height: 2.55, build: 0.95, skin: SKIN, face: INK, chest: INK, arms: INK, hands: INK, legs: INK, boots: INK, belt: 0xb0201e, head: 'hood', headColor: INK, mask: SKIN, carries: 'swordBack' },
  // a coat and a hat
  citizen: { name: 'a citizen', height: 2.3, build: 1.0, skin: SKIN, chest: 0x5a5450, arms: 0x5a5450, hands: SKIN, legs: 0x3a3836, boots: 0x2a2420, skirt: 0x5a5450, skirtLength: 0.34, hat: 'fedora', hatColor: 0x3a3632, hatBand: 0x22201e },
  // yellow oilskins
  fisher: { name: 'a fisherman', height: 2.3, build: 1.05, skin: SKIN, chest: 0xf0c020, arms: 0xf0c020, hands: SKIN, legs: 0xf0c020, boots: INK, skirt: 0xf0c020, skirtLength: 0.3, hat: 'fedora', hatColor: 0xe8b818, hatBand: 0xe8b818 },
  // a long coat with braid, a cap
  doorman: { name: 'a doorman', height: 2.35, build: 1.02, skin: SKIN, chest: 0x5a1a26, arms: 0x5a1a26, hands: 0xf2f0ea, legs: 0x2a1a1e, boots: INK, belt: GOLD, skirt: 0x5a1a26, skirtLength: 0.46, hat: 'cap', hatColor: 0x5a1a26, hatBand: GOLD, bits: ['band'], bitColor: { band: GOLD } },
  // Arkham's: a grey uniform, a cap
  guard: { name: 'an Arkham guard', height: 2.35, build: 1.05, skin: SKIN, chest: 0x6a6e74, arms: 0x6a6e74, hands: SKIN, legs: 0x5a5e64, boots: INK, belt: INK, hat: 'cap', hatColor: 0x5a5e64, hatBand: INK, bits: ['badge'] },
  // a charity collector: a dark uniform, a bonnet, a tin
  collector: { name: 'a charity collector', height: 2.25, build: 0.95, skin: FAIR, chest: 0x22283a, arms: 0x22283a, hands: FAIR, legs: 0x22283a, boots: INK, skirt: 0x22283a, skirtLength: 0.4, hat: 'bonnet', hatColor: 0x1c2232, hatBand: RED, carries: 'tin', carryColor: 0xc0242a },
};

// ---------------------------------------------------------------------------
// Poses, each at a moment `t` from 0 to 1 of its round or of its doing
// ---------------------------------------------------------------------------
//
// Each is big and clear, as a toy's would be, to be read from across the
// table. A cycle ends as it began; a blow begins and ends in the guard.

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c); };
const smooth = (a: number, b: number, v: number): number => ease((v - a) / (b - a));

/** A pose at moment t of a run of keyed poses, eased from each to the next. */
function keyed(t: number, keys: [number, Partial<Pose>][]): Partial<Pose> {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) return blend(a, b, ease((t - t0) / Math.max(1e-6, t1 - t0)));
  }
  return keys[keys.length - 1][1];
}
/** In at the start, held, and out at the end. */
const held = (t: number, p: Partial<Pose>, a = 0.25, b = 0.75): Partial<Pose> => keyed(t, [[0, {}], [a, p], [b, p], [1, {}]]);

/** On guard: knees a little bent, the left foot forward, both hands up before the chest. */
const READY: Partial<Pose> = { crouch: 0.14, lean: 0.06, hipL: 0.18, hipR: -0.12, kneeL: 0.06, armL: 0.45, spreadL: 0.12, elbowL: 1.2, armR: 0.55, spreadR: 0.12, elbowR: 1.2 };

/** A walk and a run, one stride to a round; the Penguin's waddle. */
export const walk = (t: number): Partial<Pose> => {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  return {
    hipL: 0.45 * s, hipR: -0.45 * s, kneeL: 0.08 + 0.6 * Math.max(0, c), kneeR: 0.08 + 0.6 * Math.max(0, -c),
    armL: -0.42 * s, armR: 0.42 * s, elbowL: 0.3 + 0.18 * Math.max(0, -s), elbowR: 0.3 + 0.18 * Math.max(0, s), spreadL: 0.04, spreadR: 0.04,
    lean: 0.05, twist: 0.1 * s, crouch: 0.03 + 0.03 * s * s, nod: 0.03,
  };
};
export const run = (t: number): Partial<Pose> => {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  return {
    hipL: 0.8 * s + 0.14, hipR: -0.8 * s + 0.14, kneeL: 0.25 + 1.35 * Math.max(0, c), kneeR: 0.25 + 1.35 * Math.max(0, -c),
    armL: -0.85 * s, armR: 0.85 * s, elbowL: 1.45, elbowR: 1.45, spreadL: 0.12, spreadR: 0.12,
    lean: 0.34, twist: 0.18 * s, crouch: 0.1 + 0.06 * Math.abs(c), nod: -0.16,
  };
};
export const waddle = (t: number): Partial<Pose> => {
  const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
  return {
    hipL: 0.24 * s, hipR: -0.24 * s, kneeL: 0.05 + 0.2 * Math.max(0, c), kneeR: 0.05 + 0.2 * Math.max(0, -c),
    tilt: 0.16 * s, twist: 0.05 * s, head: -0.08 * s, lean: -0.08,
    armL: 0.1, armR: 0.1, spreadL: 0.4 - 0.12 * s, spreadR: 0.4 + 0.12 * s, elbowL: 0.35, elbowR: 0.35, nod: -0.05,
  };
};
/** A leap: gathering at 0, in the air at a half, landing at 1. */
export const leap = (t: number): Partial<Pose> => keyed(t, [
  [0, {}],
  [0.15, { crouch: 0.65, lean: 0.48, armL: -0.75, armR: -0.75, elbowL: 0.3, elbowR: 0.3, nod: 0.1 }],
  [0.3, { lean: 0.05, hipL: 0.1, hipR: -0.2, kneeL: 0.1, kneeR: 0.35, armL: 2.5, armR: 2.5, spreadL: 0.4, spreadR: 0.4, elbowL: 0.2, elbowR: 0.2, nod: -0.2 }],
  [0.5, { lean: 0.28, hipL: 1.25, hipR: 0.95, kneeL: 1.75, kneeR: 1.95, armL: 1.0, armR: 1.3, spreadL: 0.6, spreadR: 0.6, elbowL: 0.7, elbowR: 0.9, nod: 0.05 }],
  [0.7, { lean: 0.1, hipL: 0.3, hipR: 0.1, kneeL: 0.35, kneeR: 0.25, armL: 0.7, armR: 0.8, spreadL: 0.8, spreadR: 0.8, elbowL: 0.3, elbowR: 0.3 }],
  [0.85, { crouch: 0.68, lean: 0.42, armL: 0.6, armR: 0.6, spreadL: 0.6, spreadR: 0.6, elbowL: 0.4, elbowR: 0.4, nod: 0.15 }],
  [1, {}],
]);
/** Crouched on a gargoyle or a roof's edge, cape about it, looking down. Round and round, the head turns slowly over the city. */
export const perch = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { crouch: 1, lean: 0.62, hipL: 0.35, hipR: 0.25, kneeL: 0.25, kneeR: 0.3, armL: 0.55, armR: 0.7, spreadL: 0.25, spreadR: 0.2, elbowL: 0.6, elbowR: 0.45, nod: 0.25 + 0.08 * s, head: 0.45 * s };
};
/** Hanging from a line by one raised arm, legs trailing: swinging forward as t grows. */
export const swing = (t: number): Partial<Pose> => {
  const u = ease(t);
  return {
    armR: 3.05, spreadR: 0.05, elbowR: 0.05, armL: mix(-0.4, 0.9, u), spreadL: 0.5, elbowL: 0.5,
    lean: mix(-0.25, 0.3, u), hipL: mix(-0.35, 0.9, u), hipR: mix(-0.5, 0.75, u), kneeL: mix(0.5, 0.25, u), kneeR: mix(0.8, 0.45, u),
    tilt: 0.06, nod: mix(0.15, -0.1, u), head: 0.1,
  };
};
/** Arms out to either side and legs together, as under a spread cape. */
export const glide = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { armL: 0.15, armR: 0.15, spreadL: 1.45 + 0.08 * s, spreadR: 1.45 - 0.08 * s, elbowL: 0.12, elbowR: 0.12, lean: 0.18, hipL: -0.12, hipR: -0.08, kneeL: 0.15, kneeR: 0.2, tilt: 0.06 * s, nod: -0.1 };
};
/** One arm stretched ahead, the other at the side, legs together: for a body that `lie` has laid level. */
export const fly = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { armR: 3.05, spreadR: 0.06, elbowR: 0, armL: -0.1, spreadL: 0.12, elbowL: 0.15, hipL: -0.05, hipR: 0.03, kneeL: 0.1 + 0.05 * s, kneeR: 0.18 - 0.05 * s, nod: -0.85, tilt: 0.04 * s };
};
/** A blow with what it holds: up behind the head, and a great swing down and across with the right arm. */
export const strike = (t: number): Partial<Pose> => keyed(t, [
  [0, READY],
  [0.3, { armR: 2.85, spreadR: 0.35, elbowR: 1.3, armL: 0.55, spreadL: 0.25, elbowL: 0.9, twist: -0.45, lean: -0.12, crouch: 0.18, hipL: 0.25, hipR: -0.15, kneeL: 0.1, head: 0.25 }],
  [0.5, { armR: 0.9, spreadR: 0.05, elbowR: 0.15, armL: 0.2, spreadL: 0.35, elbowL: 0.6, twist: 0.45, lean: 0.38, crouch: 0.38, hipL: 0.45, hipR: -0.35, kneeL: 0.25, kneeR: 0.05, head: -0.25 }],
  [0.7, { armR: -0.1, spreadR: -0.3, elbowR: 0.35, armL: -0.2, spreadL: 0.45, elbowL: 0.3, twist: 0.7, lean: 0.42, crouch: 0.32, hipL: 0.45, hipR: -0.35, kneeL: 0.25, head: -0.4 }],
  [1, READY],
]);
/** Turning a blow aside: the right arm up across the body, the blow taken at a half, and swept out. */
export const parry = (t: number): Partial<Pose> => keyed(t, [
  [0, READY],
  [0.3, { armR: 2.0, spreadR: -0.25, elbowR: 1.0, armL: 0.9, spreadL: 0.15, elbowL: 1.2, twist: 0.25, lean: -0.12, crouch: 0.28, hipL: 0.12, hipR: -0.3, kneeR: 0.25 }],
  [0.5, { armR: 1.85, spreadR: -0.1, elbowR: 0.85, armL: 0.8, spreadL: 0.2, elbowL: 1.1, twist: 0.15, lean: -0.2, crouch: 0.32, hipL: 0.12, hipR: -0.3, kneeR: 0.25 }],
  [0.7, { armR: 1.4, spreadR: 0.6, elbowR: 0.7, armL: 0.5, spreadL: 0.3, elbowL: 0.9, twist: -0.35, lean: 0.05, crouch: 0.25, hipL: 0.15, hipR: -0.2 }],
  [1, READY],
]);
/** A lunge: from the guard, a long step forward with the right arm thrust straight out, held, and back. */
export const lunge = (t: number): Partial<Pose> => {
  const L: Partial<Pose> = { crouch: 0.42, lean: 0.36, hipL: -0.55, kneeL: 0.1, hipR: 0.95, kneeR: 0.95, armR: 1.55, spreadR: 0.05, elbowR: 0, armL: -0.5, spreadL: 0.55, elbowL: 0.6, twist: -0.3, head: 0.2, nod: -0.15 };
  return keyed(t, [[0, READY], [0.35, L], [0.6, L], [1, READY]]);
};
/** A bow from the waist, a hand on the heart. */
export const bow = (t: number): Partial<Pose> => held(t, { lean: 0.75, nod: 0.35, crouch: 0.05, armR: 0.55, spreadR: -0.35, elbowR: 1.95, armL: 0.1 }, 0.3, 0.7);
/** The right hand up to the brow, held, and down. */
export const salute = (t: number): Partial<Pose> => held(t, { armR: 1.3, spreadR: 0.85, elbowR: 2.35, nod: -0.04 });
/** From standing at 0 to down on the right knee at 1. */
export const kneel = (t: number): Partial<Pose> => blend({}, { crouch: 1, hipL: 0.52, kneeL: -0.52, hipR: -1.05, kneeR: -0.52, lean: 0.12, nod: 0.3, armL: 0.75, elbowL: 0.75, spreadL: 0.1, armR: 0.15, spreadR: 0.15, elbowR: 0.2 }, ease(t));
/** Sitting down: from standing at 0 to seated at 0.4, the hands on the knees, and there to 1. */
export const sit = (t: number): Partial<Pose> => blend({}, { crouch: 1, hipL: 0.52, kneeL: -0.52, hipR: 0.52, kneeR: -0.52, lean: 0.1, armL: 0.85, elbowL: 0.5, spreadL: 0.12, armR: 0.85, elbowR: 0.5, spreadR: 0.12 }, smooth(0, 0.4, t));
/** Pointing: the right arm straight out ahead and a little up, the head with it. */
export const point = (t: number): Partial<Pose> => held(t, { armR: 1.75, spreadR: 0.1, elbowR: 0, armL: 0.05, twist: -0.15, head: 0.1, nod: -0.12, lean: 0.04 }, 0.2, 0.8);
/** A shrug: the forearms out, palms up, the head on one side. */
export const shrug = (t: number): Partial<Pose> => held(t, { armL: 0.25, armR: 0.25, spreadL: 0.55, spreadR: 0.55, elbowL: 1.45, elbowR: 1.45, tilt: 0.12, nod: -0.05, head: 0.15, crouch: 0.04 }, 0.3, 0.7);
/** Laughing with the head thrown back, shaking with it, a hand on the belly. */
export const laugh = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU * 5), f = smooth(0, 0.15, t) * (1 - smooth(0.85, 1, t));
  return blend({}, { lean: -0.3 + 0.05 * s, nod: -0.75 + 0.12 * s, crouch: 0.08 + 0.05 * s, armR: 0.6, spreadR: -0.2, elbowR: 1.8, armL: 0.25, spreadL: 0.6, elbowL: 0.4, hipL: 0.1 }, f);
};
/** Tossing or flipping something up with the right hand: the hand low, flicked up, and held up as the eyes follow it. */
export const toss = (t: number): Partial<Pose> => keyed(t, [
  [0, { armR: 0.35, elbowR: 1.3, spreadR: 0.05 }],
  [0.25, { armR: 0.2, elbowR: 1.6, crouch: 0.08, nod: 0.1 }],
  [0.45, { armR: 1.7, elbowR: 0.4, spreadR: 0.1, nod: -0.3 }],
  [1, { armR: 1.45, elbowR: 0.7, spreadR: 0.1, nod: -0.55 }],
]);
/** Catching it: the hand up at 0, closing on it, and brought down to the chest at 1. */
export const caught = (t: number): Partial<Pose> => keyed(t, [
  [0, { armR: 1.45, elbowR: 0.7, spreadR: 0.1, nod: -0.55 }],
  [0.3, { armR: 1.6, elbowR: 0.6, spreadR: 0.12, nod: -0.45, crouch: 0.06 }],
  [1, { armR: 0.65, elbowR: 1.85, spreadR: -0.15, nod: 0.1 }],
]);
/** Holding something large overhead in both hands, braced, swaying a little. */
export const carry = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { armL: 2.95, armR: 2.95, spreadL: 0.28, spreadR: 0.28, elbowL: 0.35, elbowR: 0.35, straddle: 0.22, crouch: 0.12 + 0.03 * s, lean: -0.06, tilt: 0.04 * s, nod: -0.1 };
};
/** Both arms pushing ahead, one leg braced behind, straining in bursts. */
export const push = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { lean: 0.5 + 0.06 * s, crouch: 0.35, armL: 1.45, armR: 1.45, spreadL: 0.12, spreadR: 0.12, elbowL: 0.5 + 0.1 * s, elbowR: 0.5 - 0.1 * s, hipL: 0.5, hipR: -0.65, kneeL: 0.35, kneeR: 0.05, nod: -0.25 };
};
/** Climbing hand over hand, the knees coming up in turn. */
export const climb = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { armL: 2.6 + 0.4 * s, armR: 2.6 - 0.4 * s, spreadL: 0.2, spreadR: 0.2, elbowL: 0.5 - 0.4 * s, elbowR: 0.5 + 0.4 * s, hipL: 0.8 * Math.max(0, s), hipR: 0.8 * Math.max(0, -s), kneeL: 1.3 * Math.max(0, s) + 0.1, kneeR: 1.3 * Math.max(0, -s) + 0.1, lean: 0.12, nod: -0.4 };
};
/** A swimming stroke, for a body that `lie` has laid level: the arms over in turn, the legs kicking. */
export const swim = (t: number): Partial<Pose> => {
  const a = t * TAU, s = Math.sin(a), k = Math.sin(a * 3);
  return { armR: 1.55 + 1.5 * s, armL: 1.55 - 1.5 * s, spreadL: 0.2, spreadR: 0.2, elbowL: 0.3, elbowR: 0.3, hipL: 0.22 * k, hipR: -0.22 * k, kneeL: 0.2, kneeR: 0.2, twist: 0.2 * s, nod: -0.7 };
};
/** Rowing, seated: reaching forward and pulling back. */
export const row = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU), pull = 0.5 + 0.5 * s;
  return { crouch: 1, hipL: 0.52, kneeL: -0.52, hipR: 0.52, kneeR: -0.52, lean: mix(0.45, -0.2, pull), armL: mix(1.5, 0.7, pull), armR: mix(1.5, 0.7, pull), elbowL: mix(0.1, 1.6, pull), elbowR: mix(0.1, 1.6, pull), spreadL: 0.15, spreadR: 0.15, nod: -0.1 };
};
/** Sitting at a wheel or on a saddle, the hands ahead, steering a little. */
export const drive = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { crouch: 1, hipL: 0.5, kneeL: -0.4, hipR: 0.5, kneeR: -0.4, lean: 0.14, armL: 1.15 + 0.1 * s, armR: 1.15 - 0.1 * s, elbowL: 0.7, elbowR: 0.7, spreadL: 0.1, spreadR: 0.1, twist: 0.06 * s };
};
/** Arms crossed on the chest and legs together, for one that hangs by its feet. */
export const hang = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { armL: 0.75, armR: 0.8, spreadL: -0.38, spreadR: -0.32, elbowL: 2.1, elbowR: 2.05, hipL: 0.02, hipR: -0.02, kneeL: 0.05, kneeR: 0.05, nod: -0.2 + 0.05 * s };
};
/** Arms and legs spread like a star, for a cartwheel that `lie` turns. */
export const star = (_t: number): Partial<Pose> => ({ armL: 0, armR: 0, spreadL: 2.2, spreadR: 2.2, elbowL: 0.05, elbowR: 0.05, straddle: 0.75, nod: 0 });
/** At ease, looking about: for a figure at home. */
export const idle = (t: number): Partial<Pose> => {
  const a = t * TAU;
  return { head: 0.55 * Math.sin(a), nod: 0.05 * Math.sin(a * 2), tilt: 0.03 * Math.sin(a), armL: 0.04, armR: 0.04, elbowL: 0.18, elbowR: 0.2, spreadL: 0.04, spreadR: 0.04, crouch: 0.02, hipL: 0.05 * Math.sin(a), hipR: -0.05 * Math.sin(a) };
};

/** One pose blended into another. */
export function blend(a: Partial<Pose>, b: Partial<Pose>, t: number): Partial<Pose> {
  const out: Partial<Pose> = {};
  for (const key of Object.keys(STANDING) as (keyof Pose)[]) out[key] = (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * t;
  return out;
}

// ---------------------------------------------------------------------------
// Shapes: the parts' geometry
// ---------------------------------------------------------------------------
//
// Each part is built once, in units of its own bone or of its own size, and
// every figure's copy is scaled to that figure. Corners carry what the
// material makes of them: TINT takes the figure's colour for that part, OWN
// keeps a colour of its own (a yellow oval's black bat, a card's red pip).

type P = [number, number, number];
const TINT = 0, OWN = 5;

const avg = (pts: P[]): P => {
  let x = 0, y = 0, z = 0;
  for (const p of pts) { x += p[0]; y += p[1]; z += p[2]; }
  return [x / pts.length, y / pts.length, z / pts.length];
};

/** Triangles for one part: flat-shaded, each corner with a colour and what it is to the material. */
class Shape {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly col: number[] = [];
  readonly kind: number[] = [];
  private readonly c = new THREE.Color();

  /** A triangle, its front turned away from `inside`; without it, facing the way its corners turn anticlockwise. */
  tri(a: P, b: P, c: P, color = WHITE, kind = TINT, inside?: P): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    let q = b, r = c;
    if (inside) {
      const ox = (a[0] + b[0] + c[0]) / 3 - inside[0], oy = (a[1] + b[1] + c[1]) / 3 - inside[1], oz = (a[2] + b[2] + c[2]) / 3 - inside[2];
      if (ox * nx + oy * ny + oz * nz < 0) { q = c; r = b; nx = -nx; ny = -ny; nz = -nz; }
    }
    this.c.set(color);
    for (const p of [a, q, r]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }

  quad(a: P, b: P, c: P, d: P, color = WHITE, kind = TINT, inside?: P): void {
    this.tri(a, b, c, color, kind, inside);
    this.tri(a, c, d, color, kind, inside);
  }

  /** A quad seen from both sides. */
  both(a: P, b: P, c: P, d: P, color = WHITE, kind = TINT, n: P = [1, 0, 0]): void {
    const m = avg([a, b, c, d]);
    this.quad(a, b, c, d, color, kind, [m[0] - n[0], m[1] - n[1], m[2] - n[2]]);
    this.quad(a, b, c, d, color, kind, [m[0] + n[0], m[1] + n[1], m[2] + n[2]]);
  }

  /** A flat outline, as a fan from its first corner. */
  poly(pts: P[], color = WHITE, kind = TINT, inside?: P): void {
    for (let i = 1; i + 1 < pts.length; i++) this.tri(pts[0], pts[i], pts[i + 1], color, kind, inside);
  }

  /** Rings of corners joined into a tube, its sides facing away from the line through their middles; caps close the first and the last. */
  tube(rings: P[][], color = WHITE, kind = TINT, capA = true, capB = true, shade?: (j: number) => number): void {
    const mids = rings.map(avg);
    for (let i = 0; i + 1 < rings.length; i++) {
      const A = rings[i], B = rings[i + 1], m = avg([mids[i], mids[i + 1]]);
      for (let j = 0; j < A.length; j++) {
        const k = (j + 1) % A.length, c = shade ? shadeOf(color, shade(j)) : color;
        this.tri(A[j], A[k], B[k], c, kind, m);
        this.tri(A[j], B[k], B[j], c, kind, m);
      }
    }
    if (capA) this.poly(rings[0], color, kind, mids[1]);
    if (capB) this.poly(rings[rings.length - 1], color, kind, mids[mids.length - 2]);
  }

  /** A solid from its eight corners: four round its bottom, then the four above them in the same order. */
  solid(c: P[], color = WHITE, kind = TINT): void {
    const m = avg(c);
    for (const [a, b, d, e] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) this.quad(c[a], c[b], c[d], c[e], color, kind, m);
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color = WHITE, kind = TINT): void {
    this.solid([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], color, kind);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.kind, 1));
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(new Array<number>(this.kind.length).fill(0), 1));
    g.computeBoundingSphere();
    return g;
  }
}

const shadeOf = (c: number, k: number): number => new THREE.Color(c).multiplyScalar(k).getHex();
const dot = (p: P, n: number): P[] => Array.from({ length: n }, (): P => [p[0], p[1], p[2]]);

/** An upright ring of `n` corners at height y, `rx` deep and `rz` wide about (cx, cz); the first corner `phase` round from straight ahead. */
function ring(n: number, y: number, rx: number, rz: number, cx = 0, cz = 0, phase = Math.PI / n): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    out.push([cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz]);
  }
  return out;
}

/** Rings of `n` corners round a line of points, each `ra` from it in the line's own up and `rb` to its side. */
function along(pts: P[], ra: number[], rb: number[], n: number, side: P = [0, 0, 1], phase = 0): P[][] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const d = side[0] * tx + side[1] * ty + side[2] * tz;
    let sx = side[0] - tx * d, sy = side[1] - ty * d, sz = side[2] - tz * d;
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    const ux = sy * tz - sz * ty, uy = sz * tx - sx * tz, uz = sx * ty - sy * tx;
    const out: P[] = [];
    for (let k = 0; k < n; k++) {
      const an = phase + (k / n) * TAU, c = Math.cos(an) * ra[i], s = Math.sin(an) * rb[i];
      out.push([p[0] + ux * c + sx * s, p[1] + uy * c + sy * s, p[2] + uz * c + sz * s]);
    }
    return out;
  });
}

/** A flat blade along a line in the x-y plane, `widths` across it and `thick` through it in z. A width of 0 makes a point. */
function bladeSheet(s: Shape, line: [number, number][], widths: number[], thick: number, color = WHITE, kind = TINT): void {
  const rings = line.map(([x, y], i): P[] => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const w = widths[i], t = w > 0 ? thick : 0;
    return [[x - ty * w, y + tx * w, 0], [x, y, t], [x + ty * w, y - tx * w, 0], [x, y, -t]];
  });
  s.tube(rings, color, kind, true, false);
}

// ---- the head, in head units from the base of the neck, the face looking along +x

const HEAD: [number, number, number, number][] = [[0.19, 0.25, 0.22, 0.07], [0.42, 0.42, 0.37, 0.02], [0.75, 0.45, 0.4, 0], [1.02, 0.38, 0.34, -0.02], [1.16, 0.2, 0.19, -0.03]];
const MID: P = [0, 0.68, 0];

function headAt(y: number): [number, number, number] {
  if (y <= HEAD[0][0]) return [HEAD[0][1], HEAD[0][2], HEAD[0][3]];
  for (let i = 0; i + 1 < HEAD.length; i++) {
    const a = HEAD[i], b = HEAD[i + 1];
    if (y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];
    }
  }
  const l = HEAD[HEAD.length - 1];
  return [l[1], l[2], l[3]];
}
/** A point on the head, `a` round from straight ahead (a quarter turn is its right) at height y, pushed out from its middle by k. */
function scalp(a: number, y: number, k = 1): P {
  const [rx, rz, cx] = headAt(y);
  return [MID[0] + (cx + Math.cos(a) * rx - MID[0]) * k, MID[1] + (y - MID[1]) * k, MID[2] + (Math.sin(a) * rz - MID[2]) * k];
}
/** Where the face looks out at height y: the front of the six-sided head. */
const faceX = (y: number): number => { const [rx, , cx] = headAt(y); return cx + rx * Math.cos(Math.PI / 6); };

function headShape(): Shape {
  const s = new Shape();
  s.tube([ring(6, -0.25, 0.17, 0.17), ring(6, 0.4, 0.17, 0.17)], WHITE, TINT, false, false);
  s.tube(HEAD.map(([y, rx, rz, cx]) => ring(6, y, rx, rz, cx)), WHITE, TINT, true, true);
  for (const side of [-1, 1]) {
    const x = faceX(0.63) + 0.012;
    s.quad([x, 0.6, side * 0.055], [x, 0.6, side * 0.135], [x, 0.668, side * 0.135], [x, 0.668, side * 0.055], 0x1c1c24, OWN, [x - 1, 0.63, side * 0.1]);
  }
  const nx = faceX(0.54), inside: P = [nx - 0.2, 0.55, 0];
  const tl: P = [nx, 0.62, -0.04], tr: P = [nx, 0.62, 0.04], bl: P = [nx, 0.47, -0.05], br: P = [nx, 0.47, 0.05], tip: P = [nx + 0.075, 0.49, 0];
  s.tri(tl, bl, tip, WHITE, TINT, inside);
  s.tri(tr, br, tip, WHITE, TINT, inside);
  s.tri(bl, br, tip, 0xd8d8d8, TINT, inside);
  return s;
}

/** A shell over the head, `n` corners round: rows of heights by angle, pushed out by k, closed over the top. */
function shell(s: Shape, n: number, rows: { y: (a: number) => number; k: number }[], color = WHITE, kind = TINT, top = true, phase = Math.PI / n): void {
  const rings = rows.map((r) => Array.from({ length: n }, (_, i): P => { const a = phase + (i / n) * TAU; return scalp(a, r.y(a), r.k); }));
  s.tube(rings, color, kind, false, top);
}
/** A cap over the head whose rim is at `rim(a)`, k times the head. */
function bowl(s: Shape, k: number, rim: (a: number) => number, color = WHITE, kind = TINT, n = 8): void {
  shell(s, n, [{ y: rim, k }, { y: (a) => Math.max(rim(a) + 0.08, 0.72), k }, { y: (a) => Math.max(rim(a) + 0.16, 1.0), k }, { y: () => 1.16, k }], color, kind);
}

/** Hair close over the head: over the brow in front, the ears at the sides, down to `back` behind. */
function hairCap(s: Shape, k: number, back: number, front = 0.88): void {
  const line = (a: number): number => { const c = Math.cos(a); return c >= 0 ? mix(0.6, front, c) : mix(0.6, back, -c); };
  shell(s, 6, [{ y: line, k }, { y: (a) => Math.max(line(a) + 0.05, 0.8), k }, { y: () => 1.0, k }, { y: () => 1.16, k }]);
}

function hairShortShape(): Shape { const s = new Shape(); hairCap(s, 1.1, 0.4); return s; }
/** Long hair: a cap, and a fall down the back past the shoulders. */
function hairLongShape(): Shape {
  const s = new Shape();
  hairCap(s, 1.1, 0.3, 0.9);
  // the fall: a thick sheet from the crown behind down to the upper back, wider at its foot
  const cols: [number, number][] = [[-0.12, -0.46], [-0.42, -0.24], [-0.46, 0], [-0.42, 0.24], [-0.12, 0.46]];
  const top = cols.map(([x, z]): P => [x - 0.02, 0.95, z * 0.9]);
  const foot = cols.map(([x, z]): P => [x - 0.22, -0.85, z * 1.25]);
  const t = 0.1;
  for (let i = 0; i + 1 < cols.length; i++) {
    const m = avg([top[i], top[i + 1], foot[i], foot[i + 1]]);
    s.quad(top[i], top[i + 1], foot[i + 1], foot[i], WHITE, TINT, [m[0] + 1, m[1], m[2]]);
    const ti = (p: P): P => [p[0] + t, p[1], p[2]];
    s.quad(ti(top[i]), ti(top[i + 1]), ti(foot[i + 1]), ti(foot[i]), 0xd8d8d8, TINT, [m[0] - 1, m[1], m[2]]);
    s.quad(foot[i], foot[i + 1], ti(foot[i + 1]), ti(foot[i]), WHITE, TINT, [m[0], m[1] + 1, m[2]]);
  }
  for (const i of [0, cols.length - 1]) {
    const sg = Math.sign(cols[i][1]);
    const ti = (p: P): P => [p[0] + t, p[1], p[2]];
    s.quad(top[i], foot[i], ti(foot[i]), ti(top[i]), WHITE, TINT, [top[i][0], 0, top[i][2] - sg]);
  }
  return s;
}
/** A fringe round the back and sides of a bald head. */
function hairFringeShape(): Shape {
  const s = new Shape(), n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = mix(1.0, TAU - 1.0, i / n), a1 = mix(1.0, TAU - 1.0, (i + 1) / n);
    const p = (a: number, y: number, k: number): P => scalp(a, y, k);
    s.quad(p(a0, 0.46, 1.09), p(a1, 0.46, 1.09), p(a1, 0.8, 1.09), p(a0, 0.8, 1.09), WHITE, TINT, MID);
    s.quad(p(a0, 0.8, 1.09), p(a1, 0.8, 1.09), p(a1, 0.84, 1.0), p(a0, 0.84, 1.0), WHITE, TINT, MID);
    s.quad(p(a0, 0.46, 1.09), p(a1, 0.46, 1.09), p(a1, 0.44, 1.0), p(a0, 0.44, 1.0), WHITE, TINT, MID);
  }
  return s;
}

/** A cowl: over the head and down the neck, its rim just under the nose in front. */
function cowlShape(): Shape {
  const s = new Shape();
  const rim = (a: number): number => { const c = Math.cos(a); return c > 0.6 ? 0.46 : c > -0.2 ? 0.28 : 0.1; };
  bowl(s, 1.12, rim);
  return s;
}
/** Two pointed ears, from a base on top of the head: in head units from the crown, so that they are stretched from their base. */
function earsShape(): Shape {
  const s = new Shape();
  for (const side of [-1, 1]) {
    const b0: P = [0.1, -0.05, side * 0.13], b1: P = [-0.12, -0.05, side * 0.16], b2: P = [-0.01, -0.12, side * 0.34], tip: P = [-0.02, 0.48, side * 0.27];
    const m = avg([b0, b1, b2]), inside: P = [m[0], m[1] - 0.2, m[2]];
    s.tri(b0, b1, tip, WHITE, TINT, inside);
    s.tri(b1, b2, tip, WHITE, TINT, inside);
    s.tri(b2, b0, tip, WHITE, TINT, inside);
  }
  return s;
}
/** A closed helmet over the whole head, smooth. */
function helmetShape(): Shape {
  const s = new Shape();
  bowl(s, 1.15, () => 0.2);
  // the chin closed under it
  s.poly(ring(8, 0.2, 0.3, 0.28, 0.06).map(([x, y, z]): P => [x * 1.05, y, z * 1.05]), WHITE, TINT, [0, 0.6, 0]);
  return s;
}
/** A hood: over the top, the sides and the back down to the shoulders, open round the face. */
function hoodShape(): Shape {
  const s = new Shape();
  const rim = (a: number): number => { const c = Math.cos(a); return c > 0.8 ? 0.9 : c > 0.3 ? 0.3 : -0.1; };
  shell(s, 10, [{ y: rim, k: 1.22 }, { y: (a) => Math.max(rim(a) + 0.12, 0.85), k: 1.22 }, { y: () => 1.05, k: 1.22 }, { y: () => 1.2, k: 1.15 }], WHITE, TINT, false);
  // a soft point at the crown behind
  const ring0 = Array.from({ length: 10 }, (_, i): P => scalp(Math.PI / 10 + (i / 10) * TAU, 1.2, 1.15));
  const tip: P = [-0.32, 1.38, 0];
  for (let i = 0; i < 10; i++) s.tri(ring0[i], ring0[(i + 1) % 10], tip, WHITE, TINT, MID);
  return s;
}
/** Harley Quinn's jester's cap: a close cap and two floppy points to either side, red and black, with white bobbles. */
function jesterShape(): Shape {
  const s = new Shape();
  bowl(s, 1.12, (a) => (Math.cos(a) > 0.5 ? 0.86 : 0.42), INK, OWN);
  for (const side of [-1, 1]) {
    const pts: P[] = [[-0.05, 1.05, side * 0.18], [-0.1, 1.28, side * 0.42], [-0.12, 1.22, side * 0.72], [-0.1, 0.92, side * 0.86], [-0.08, 0.66, side * 0.84]];
    const r = [0.2, 0.16, 0.12, 0.08, 0.02];
    s.tube(along(pts, r, r, 6, [1, 0, 0]), side > 0 ? 0xc8232a : INK, OWN, true, false);
    const b: P = [-0.08, 0.6, side * 0.84];
    s.tube([dot([b[0], b[1] + 0.12, b[2]], 6), ring(6, b[1] + 0.06, 0.1, 0.1, b[0], b[2]), ring(6, b[1] - 0.06, 0.1, 0.1, b[0], b[2]), dot([b[0], b[1] - 0.12, b[2]], 6)], 0xf6f4ee, OWN, false, false);
  }
  return s;
}
/** A band across the front of the head between two heights, k out: a domino mask, or glasses when thin. */
function maskShape(): Shape {
  const s = new Shape(), k = 1.06, y0 = 0.56, y1 = 0.72;
  const corners = [-3, -1, 1, 3].map((i) => (i * Math.PI) / 8);
  for (let i = 0; i + 1 < corners.length; i++) {
    const a = corners[i], b = corners[i + 1];
    s.quad(scalp(a, y0, k), scalp(b, y0, k), scalp(b, y1, k), scalp(a, y1, k), WHITE, TINT, MID);
  }
  // pointed ends at the temples
  for (const side of [-1, 1]) {
    const a = side * (3 * Math.PI) / 8;
    s.tri(scalp(a, y0, k), scalp(a, y1, k), scalp(side * 1.55, (y0 + y1) / 2 + 0.06, k * 1.01), WHITE, TINT, MID);
  }
  return s;
}
/** The Joker's grin: a wide red mouth with a white row of teeth, drawn on the face. */
function grinShape(): Shape {
  const s = new Shape(), n = 6, k = 1.03;
  const at = (u: number, y: number, kk = k): P => scalp(u * 0.62, y, kk);
  for (let i = 0; i < n; i++) {
    const u0 = mix(-1, 1, i / n), u1 = mix(-1, 1, (i + 1) / n);
    const lift = (u: number): number => 0.07 * u * u;
    s.quad(at(u0, 0.31 + lift(u0)), at(u1, 0.31 + lift(u1)), at(u1, 0.4 + lift(u1) * 1.3), at(u0, 0.4 + lift(u0) * 1.3), 0xc8202a, OWN, MID);
    const tw = (u: number): number => 0.6 * (1 - u * u);
    if (Math.abs(u0) < 0.9 && Math.abs(u1) < 0.9) s.quad(at(u0 * 0.9, 0.345 + lift(u0) * 1.1, k + 0.012), at(u1 * 0.9, 0.345 + lift(u1) * 1.1, k + 0.012), at(u1 * 0.9, 0.345 + lift(u1) * 1.1 + 0.03 * tw(u1) + 0.01, k + 0.012), at(u0 * 0.9, 0.345 + lift(u0) * 1.1 + 0.03 * tw(u0) + 0.01, k + 0.012), 0xf6f6f0, OWN, MID);
  }
  return s;
}
/** The left half of the face, from the chin to the brow, a flat colour of its own; with an eye. Two-Face; over a helmet, Deathstroke's mask. */
function halfFaceShape(): Shape {
  const s = new Shape();
  const ys = [0.19, 0.42, 0.62, 0.86];
  // the six-sided head's corners on the left, with the middles of the front and back faces
  const angles = [0, -Math.PI / 6, -Math.PI / 2, -(5 * Math.PI) / 6, -Math.PI];
  const at = (a: number, y: number): P => {
    const [rx, rz, cx] = headAt(y);
    const corner = (b: number): [number, number] => [cx + Math.cos(b) * rx, Math.sin(b) * rz];
    let p: [number, number];
    if (a === 0) { const c0 = corner(-Math.PI / 6), c1 = corner(Math.PI / 6); p = [(c0[0] + c1[0]) / 2, 0]; } else if (a === -Math.PI) { const c0 = corner((5 * Math.PI) / 6), c1 = corner(-(5 * Math.PI) / 6); p = [(c0[0] + c1[0]) / 2, 0]; } else p = corner(a);
    return [MID[0] + (p[0] - MID[0]) * 1.025, MID[1] + (y - MID[1]) * 1.025, (p[1] - MID[2]) * 1.025];
  };
  for (let r = 0; r + 1 < ys.length; r++) for (let i = 0; i + 1 < angles.length; i++) s.quad(at(angles[i], ys[r]), at(angles[i + 1], ys[r]), at(angles[i + 1], ys[r + 1]), at(angles[i], ys[r + 1]), WHITE, TINT, MID);
  const x = faceX(0.63) * 1.025 + 0.02;
  s.quad([x, 0.6, -0.055], [x, 0.6, -0.14], [x, 0.672, -0.14], [x, 0.672, -0.055], 0x1c1c24, OWN, [x - 1, 0.63, -0.1]);
  return s;
}
/** A high collar standing round the back of the neck, open in front: in head units. */
function collarShape(): Shape {
  const s = new Shape(), n = 7;
  for (let i = 0; i < n; i++) {
    const a0 = mix(0.9, TAU - 0.9, i / n), a1 = mix(0.9, TAU - 0.9, (i + 1) / n);
    const p = (a: number, y: number, r: number): P => [Math.cos(a) * r, y, Math.sin(a) * r * 1.15];
    s.both(p(a0, 0, 0.42), p(a1, 0, 0.42), p(a1, 0.85, 0.66), p(a0, 0.85, 0.66), WHITE, TINT, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]);
  }
  return s;
}

// ---- the body, in its bones' units

/** The chest's rings: [height, half its depth, half its width, how far forward its middle is]. */
const CH: [number, number, number, number][] = [[-0.08, 0.84, 0.8, 0], [0.42, 0.97, 0.93, 0.04], [0.78, 1, 1, 0.03], [1.0, 0.6, 0.52, -0.06]];
const HP: [number, number, number, number][] = [[-0.45, 0.86, 0.86, 0], [1.15, 0.94, 0.94, 0]];

function ringsAt(R: [number, number, number, number][], y: number): [number, number, number] {
  if (y <= R[0][0]) return [R[0][1], R[0][2], R[0][3]];
  for (let i = 0; i + 1 < R.length; i++) {
    const a = R[i], b = R[i + 1];
    if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)]; }
  }
  const l = R[R.length - 1];
  return [l[1], l[2], l[3]];
}
/** A point on an eight-sided body (the chest or the hips) at angle a (0 ahead, a quarter turn its right) and height y, `out` beyond its surface. */
function surf(R: [number, number, number, number][], a: number, y: number, out = 0.03): P {
  const [rx, rz, cx] = ringsAt(R, y);
  const q = Math.PI / 4, d = ((a % q) + q) % q - q / 2 + 0;
  const near = a - Math.round(a / q) * q;
  const r = Math.cos(Math.PI / 8) / Math.cos(Math.abs(near) <= Math.PI / 8 ? near : d);
  return [cx + Math.cos(a) * (rx * r + out), y, Math.sin(a) * (rz * r + out)];
}
const chestAt = (a: number, y: number, out = 0.03): P => surf(CH, a, y, out);
const hipsAt = (a: number, y: number, out = 0.03): P => surf(HP, a, y, out);

function hipsShape(): Shape {
  const s = new Shape();
  s.tube([ring(8, -0.45, 0.86, 0.86), ring(8, 1.15, 0.94, 0.94)], WHITE, TINT, true, false);
  return s;
}
function beltShape(): Shape {
  const s = new Shape();
  s.tube([ring(8, 0.8, 1.06, 1.05), ring(8, 1.12, 1.04, 1.03)], WHITE, TINT, false, false);
  // the buckle
  s.box(1.0, 0.86, -0.16, 1.1, 1.06, 0.16, 0xe6e2d6, TINT);
  return s;
}
function chestShape(): Shape {
  const s = new Shape();
  const r = CH.map(([y, rx, rz, cx]) => ring(8, y, rx, rz, cx));
  s.tube([r[0], r[1]], 0xe4e4e4, TINT, false, false);
  s.tube([r[1], r[2], r[3]], WHITE, TINT, false, true);
  return s;
}
function bellyShape(): Shape {
  const s = new Shape();
  const rings = [0.6, 1.04, 1.24].map((x, i) => ring(6, 0, [0.4, 0.3, 0.1][i], [0.7, 0.58, 0.22][i]).map(([u, , v]): P => [x, 0.28 + u, v]));
  s.tube(rings, WHITE, TINT, false, true);
  return s;
}
/** A jacket or coat open down the front over the chest, which shows as the waistcoat or shirt. */
function jacketShape(): Shape {
  const s = new Shape(), n = 16, ys = [-0.1, 0.42, 0.78, 1.0];
  const rings = ys.map((y) => Array.from({ length: n }, (_, i): P => chestAt((i / n) * TAU, y, 0.05)));
  for (let r = 0; r + 1 < rings.length; r++) {
    const A = rings[r], B = rings[r + 1], m: P = [0, (ys[r] + ys[r + 1]) / 2, 0];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n, a = ((j + 0.5) / n) * TAU;
      // the opening down the front, widest at the waist
      const open = r === 2 ? 0.25 : 0.55;
      if (Math.cos(a) > Math.cos(open)) continue;
      s.tri(A[j], A[k], B[k], WHITE, TINT, m);
      s.tri(A[j], B[k], B[j], WHITE, TINT, m);
    }
  }
  s.poly(rings[3], WHITE, TINT, [0, 0.6, 0]);
  return s;
}
/** A shirt front down the middle of the chest. */
function bibShape(): Shape {
  const s = new Shape(), ys = [0.2, 0.42, 0.78, 0.98];
  for (let r = 0; r + 1 < ys.length; r++) {
    const w0 = r === 0 ? 0.05 : 0.26, w1 = 0.26;
    s.quad(chestAt(-w0, ys[r], 0.018), chestAt(w0, ys[r], 0.018), chestAt(w1, ys[r + 1], 0.018), chestAt(-w1, ys[r + 1], 0.018), WHITE, TINT, [0, ys[r], 0]);
  }
  return s;
}
/** A strip down the front and the back of a limb, in limb units. */
function stripeShape(): Shape {
  const s = new Shape();
  for (const back of [0, 1]) {
    const sg = back ? -1 : 1;
    const at = (y: number, u: number): P => { const r = mix(1.0, 0.86, (0.1 - y) / 1.14) * 1.04; return [sg * r * Math.cos(Math.PI / 6), y, u * r * 0.42]; };
    s.quad(at(0.05, -1), at(0.05, 1), at(-1.0, 1), at(-1.0, -1), WHITE, TINT, [0, -0.5, 0]);
  }
  return s;
}
/** A limb, six-sided, from its joint at the top down. */
function limbShape(top: number, bottom: number, r0: number, r1: number, capTop = true, capBottom = true): Shape {
  const s = new Shape();
  s.tube([ring(6, top, r0, r0), ring(6, bottom, r1, r1)], WHITE, TINT, capTop, capBottom);
  return s;
}
function handShape(): Shape {
  const s = new Shape();
  s.solid([[0.3, 0.05, 0.21], [0.3, 0.05, -0.21], [-0.3, 0.05, -0.21], [-0.3, 0.05, 0.21], [0.26, -1, 0.17], [0.26, -1, -0.17], [-0.2, -1, -0.17], [-0.2, -1, 0.17]]);
  return s;
}
const ANKLE = 0.045 / 0.14;
function bootShape(): Shape {
  const s = new Shape(), a = ANKLE;
  s.solid([[-0.28, -a, -0.24], [0.72, -a, -0.2], [0.72, -a, 0.2], [-0.28, -a, 0.24], [-0.26, 0.42, -0.25], [0.24, 0.3, -0.24], [0.24, 0.3, 0.24], [-0.26, 0.42, 0.25]]);
  return s;
}
/** A long coat's skirt, from the waist (y = 0) down to its hem (y = -1), flaring; seen from outside and from below. */
function skirtShape(): Shape {
  const s = new Shape(), n = 8;
  const top = ring(n, 0, 1.06, 1.06), hem = ring(n, -1, 1.4, 1.36);
  for (let j = 0; j < n; j++) {
    const k = (j + 1) % n;
    s.quad(top[j], top[k], hem[k], hem[j], WHITE, TINT, [0, -0.5, 0]);
    const inn = (p: P): P => [p[0] * 0.97, p[1], p[2] * 0.97];
    s.quad(inn(top[j]), inn(top[k]), inn(hem[k]), inn(hem[j]), 0xc8c8c8, TINT, [hem[j][0] * 3, -0.5, hem[j][2] * 3]);
  }
  return s;
}

// ---- marks on the chest, in chest units

/** A band across the chest from shoulder to shoulder dipping to a point: Nightwing's bird. */
function birdShape(): Shape {
  const s = new Shape(), n = 10;
  for (let i = 0; i < n; i++) {
    const u0 = mix(-1, 1, i / n), u1 = mix(-1, 1, (i + 1) / n);
    const yc = (u: number): number => 0.5 + 0.42 * Math.pow(Math.abs(u), 1.1);
    const p = (u: number, dy: number): P => chestAt(u * 1.35, Math.min(0.97, yc(u) + dy), 0.035);
    s.quad(p(u0, -0.09), p(u1, -0.09), p(u1, 0.09), p(u0, 0.09), WHITE, TINT, [0, 0.5, 0]);
  }
  return s;
}
/** Two straps crossed on the chest, front and back. */
function xstrapsShape(): Shape {
  const s = new Shape(), n = 5;
  for (const back of [0, Math.PI]) for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const p = (t: number, dy: number): P => chestAt(back + side * mix(1.05, -0.75, t), mix(0.96, -0.02, t) + dy, 0.03 + 0.005 * side);
      s.quad(p(t0, -0.075), p(t1, -0.075), p(t1, 0.075), p(t0, 0.075), WHITE, TINT, [0, 0.5, 0]);
    }
  }
  return s;
}
/** Polka dots of many colours, all round: on the chest, and the hips scaled to them. */
function dotsShape(): Shape {
  const s = new Shape(), colors = [0xe8302a, 0xf0c020, 0x2a6ad8, 0x3aa84a, 0xe8862a, 0xd84aa0];
  let c = 0;
  for (const [y, n, off] of [[0.08, 7, 0], [0.42, 7, 0.45], [0.74, 6, 0.1]] as [number, number, number][]) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU, ctr = chestAt(a, y, 0.04);
      const pts = Array.from({ length: 6 }, (_, j): P => { const b = (j / 6) * TAU; return chestAt(a + 0.2 * Math.cos(b), y + 0.11 * Math.sin(b), 0.04); });
      s.poly(pts, colors[c++ % colors.length], OWN, [ctr[0] * 0.5, ctr[1], ctr[2] * 0.5]);
    }
  }
  return s;
}
/** Leaves all over the chest, pointing down, in two greens of the tint. */
function leavesShape(): Shape {
  const s = new Shape();
  let c = 0;
  for (const [y, n, off] of [[0.92, 7, 0], [0.62, 8, 0.3], [0.3, 8, 0], [0.0, 8, 0.35]] as [number, number, number][]) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU, k = c++ % 2 ? 0.7 : 1.0;
      const l = chestAt(a - 0.24, y + 0.1, 0.03), r = chestAt(a + 0.24, y + 0.1, 0.03), tip = chestAt(a, y - 0.24, 0.14);
      s.tri(l, r, tip, shadeOf(WHITE, k), TINT, [0, y, 0]);
    }
  }
  return s;
}
/** The left half of the chest, or of the hips, in another colour. */
function halfShape(R: [number, number, number, number][], ys: number[]): Shape {
  const s = new Shape(), n = 8;
  const at = (a: number, y: number): P => surf(R, a, y, 0.028);
  for (let r = 0; r + 1 < ys.length; r++) {
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI + (i / n) * Math.PI, a1 = -Math.PI + ((i + 1) / n) * Math.PI;
      s.quad(at(a0, ys[r]), at(a1, ys[r]), at(a1, ys[r + 1]), at(a0, ys[r + 1]), WHITE, TINT, [0, ys[r], 0]);
    }
  }
  const top = ys[ys.length - 1], pts: P[] = [];
  for (let i = 0; i <= n; i++) pts.push(at(-Math.PI + (i / n) * Math.PI, top));
  s.poly(pts, WHITE, TINT, [0, top - 1, 0]);
  return s;
}
/** Two-Face's loud check: squares over the left half of his chest. */
function checkShape(): Shape {
  const s = new Shape(), cols = 6, rows = 5;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if ((i + j) % 2) continue;
    const a0 = -Math.PI + (i / cols) * Math.PI, a1 = -Math.PI + ((i + 1) / cols) * Math.PI, y0 = mix(-0.06, 0.98, j / rows), y1 = mix(-0.06, 0.98, (j + 1) / rows);
    s.quad(chestAt(a0, y0, 0.045), chestAt(a1, y0, 0.045), chestAt(a1, y1, 0.045), chestAt(a0, y1, 0.045), WHITE, TINT, [0, y0, 0]);
  }
  return s;
}

// ---- flat emblems, in their own units: in the y-z plane, facing +x

/** A plain ellipse, one unit across each way. */
function ovalShape(): Shape {
  const s = new Shape();
  s.poly(Array.from({ length: 12 }, (_, i): P => [0, Math.sin((i / 12) * TAU), Math.cos((i / 12) * TAU)]), WHITE, TINT, [-1, 0, 0]);
  return s;
}
/** A plain bat's outline, wings spread, a unit wide each side; seen from both sides, so that it also serves as a batarang. */
function batShape(): Shape {
  const s = new Shape();
  const half: [number, number][] = [[0.07, 0.34], [0.13, 0.14], [0.42, 0.24], [0.92, 0.36], [1.0, 0.05], [0.8, -0.08], [0.66, -0.06], [0.5, -0.2], [0.34, -0.16], [0.16, -0.42], [0, -0.3]];
  const pts: P[] = [[0, 0.12, 0], ...half.map(([z, y]): P => [0, y, z])];
  const rest = half.slice(0, -1).reverse().map(([z, y]): P => [0, y, -z]);
  const all = [...pts, ...rest];
  const c: P = [0, 0, 0];
  for (let i = 0; i < all.length; i++) {
    const a = all[i], b = all[(i + 1) % all.length];
    s.tri(c, a, b, WHITE, TINT, [-1, 0, 0]);
    s.tri(c, a, b, WHITE, TINT, [1, 0, 0]);
  }
  return s;
}
/** A lightning bolt. */
function boltShape(): Shape {
  const s = new Shape(), q = (pts: [number, number][]): void => s.poly(pts.map(([z, y]): P => [0, y, z]), WHITE, TINT, [-1, 0, 0]);
  q([[0.1, 1], [0.45, 1], [0.12, 0.12], [-0.24, 0.12]]);
  q([[-0.32, 0.18], [0.36, 0.18], [0.3, -0.08], [-0.38, -0.08]]);
  q([[0.0, -0.06], [0.36, -0.06], [-0.4, -1]]);
  return s;
}
/** A plain shield: a red border round a yellow middle. */
function shieldShape(): Shape {
  const s = new Shape();
  const outline: [number, number][] = [[-1, 0.62], [1, 0.62], [1.18, 0.28], [0, -0.95], [-1.18, 0.28]];
  s.poly(outline.map(([z, y]): P => [0, y, z]), 0xc8202a, OWN, [-1, 0, 0]);
  s.poly(outline.map(([z, y]): P => [0.02, y * 0.74 + 0.03, z * 0.74]), 0xf0c820, OWN, [-1, 0, 0]);
  return s;
}
/** A question mark: a hooked ribbon and a dot, seen from both sides. */
function qmarkShape(): Shape {
  const s = new Shape(), w = 0.13;
  const line: [number, number][] = [];
  for (let i = 0; i <= 8; i++) { const a = mix(2.6, -1.25, i / 8); line.push([Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.32]); }
  line.push([0.02, 0.0], [0.02, -0.18]);
  for (let i = 0; i + 1 < line.length; i++) {
    const [z0, y0] = line[i], [z1, y1] = line[i + 1];
    const dz = z1 - z0, dy = y1 - y0, l = Math.hypot(dz, dy) || 1, nz = -dy / l * w, ny = dz / l * w;
    s.both([0, y0 + ny, z0 + nz], [0, y1 + ny, z1 + nz], [0, y1 - ny, z1 - nz], [0, y0 - ny, z0 - nz]);
  }
  const dot = Array.from({ length: 6 }, (_, i): P => [0, -0.42 + Math.sin((i / 6) * TAU) * 0.12, 0.02 + Math.cos((i / 6) * TAU) * 0.12]);
  s.poly(dot, WHITE, TINT, [-1, -0.42, 0]);
  s.poly(dot, WHITE, TINT, [1, -0.42, 0]);
  return s;
}

// ---- capes, in their bones' units: x through the sheet (+x towards the body), y down from 0 to -1, z across one half, -0.5 to 0.5

const CAPE_T = 0.12;
/** One face of a cape's piece: the outer (with its edges) or the inner. `top`/`foot` are the half-widths, `feet` the foot's heights across. */
function capeSheet(outer: boolean, top: number, foot: number, feet: number[]): Shape {
  const s = new Shape(), n = feet.length;
  const zs = Array.from({ length: n }, (_, i) => mix(-1, 1, i / (n - 1)));
  const T = zs.map((z): P => [0, 0, z * top]), F = zs.map((z, i): P => [0, feet[i], z * foot]);
  const o = (p: P): P => [p[0] - CAPE_T, p[1], p[2]];
  for (let i = 0; i + 1 < n; i++) {
    const m = avg([T[i], T[i + 1], F[i], F[i + 1]]);
    if (outer) {
      s.quad(o(T[i]), o(T[i + 1]), o(F[i + 1]), o(F[i]), WHITE, TINT, [m[0] + 1, m[1], m[2]]);
      s.quad(F[i], F[i + 1], o(F[i + 1]), o(F[i]), WHITE, TINT, [m[0] - CAPE_T / 2, m[1] + 1, m[2]]);
      s.quad(T[i], T[i + 1], o(T[i + 1]), o(T[i]), WHITE, TINT, [m[0] - CAPE_T / 2, m[1] - 1, m[2]]);
    } else s.quad(T[i], T[i + 1], F[i + 1], F[i], WHITE, TINT, [m[0] - 1, m[1], m[2]]);
  }
  if (outer) for (const i of [0, n - 1]) {
    const sg = Math.sign(zs[i]);
    s.quad(T[i], F[i], o(F[i]), o(T[i]), WHITE, TINT, [-CAPE_T / 2, feet[i] / 2, zs[i] * top - sg]);
  }
  return s;
}
const SCALLOPS = [-1, -0.84, -1, -0.84, -1];
/** A bat's wing for Man-Bat, in its spread place: z out from the shoulder to the tip, y down, seen from both sides. */
function batWingShape(): Shape {
  const s = new Shape();
  const top: [number, number][] = [[0, 0], [0.3, 0.1], [0.62, 0.16], [0.85, 0.12], [1.0, 0.04]];
  const foot: [number, number][] = [[0, -0.9], [0.3, -0.62], [0.62, -0.68], [0.85, -0.44], [1.0, -0.1]];
  for (let i = 0; i + 1 < top.length; i++) {
    const a: P = [0, top[i][1], top[i][0]], b: P = [0, top[i + 1][1], top[i + 1][0]], c: P = [0, foot[i + 1][1], foot[i + 1][0]], d: P = [0, foot[i][1], foot[i][0]];
    // a scallop between the fingers
    const notch: P = [0, mix(foot[i][1], foot[i + 1][1], 0.5) + 0.16, mix(foot[i][0], foot[i + 1][0], 0.5)];
    const k = i % 2 ? 0.82 : 1;
    for (const sg of [1, -1]) {
      s.tri(a, b, notch, shadeOf(WHITE, k), TINT, [sg, 0, 0]);
      s.tri(a, notch, d, shadeOf(WHITE, k), TINT, [sg, 0, 0]);
      s.tri(b, c, notch, shadeOf(WHITE, k), TINT, [sg, 0, 0]);
    }
  }
  // the arm along the top edge
  s.tube(along(top.map(([z, y]): P => [0, y + 0.02, z]), [0.03, 0.03, 0.025, 0.02, 0.0], [0.03, 0.03, 0.025, 0.02, 0.0], 4, [1, 0, 0]), 0x3a281c, OWN, true, false);
  return s;
}
/** A moth's wing, rounded, with a darker band across: in its spread place, z out, seen from both sides. */
function mothWingShape(): Shape {
  const s = new Shape(), n = 8, c: P = [0, -0.1, 0.05];
  const edge = Array.from({ length: n + 1 }, (_, i): P => { const a = mix(1.7, -1.9, i / n); return [0, Math.sin(a) * 0.55 - 0.1, 0.05 + Math.max(0, Math.cos(a)) * 1.0 + 0.02]; });
  for (let i = 0; i < n; i++) {
    const k = i % 3 === 1 ? 0.6 : 1;
    s.tri(c, edge[i], edge[i + 1], shadeOf(WHITE, k), TINT, [1, 0, 0]);
    s.tri(c, edge[i], edge[i + 1], shadeOf(WHITE, k), TINT, [-1, 0, 0]);
  }
  return s;
}
/** Kite Man's kite: a diamond in green and yellow quarters, seen from both sides, with its spars. */
function kiteShape(): Shape {
  const s = new Shape(), top: P = [0, 0.85, 0], bot: P = [0, -0.85, 0], l: P = [0, 0.2, -0.55], r: P = [0, 0.2, 0.55], c: P = [0, 0.2, 0];
  const g = 0x3a9a3a, y = 0xf0c21e;
  for (const sg of [1, -1]) {
    s.tri(top, l, c, g, OWN, [sg, 0, 0]); s.tri(top, c, r, y, OWN, [sg, 0, 0]);
    s.tri(bot, c, l, y, OWN, [sg, 0, 0]); s.tri(bot, r, c, g, OWN, [sg, 0, 0]);
  }
  s.box(-0.03, -0.85, -0.02, 0.03, 0.85, 0.02, 0x6a4a2a, OWN);
  s.box(-0.03, 0.18, -0.55, 0.03, 0.22, 0.55, 0x6a4a2a, OWN);
  return s;
}

// ---- plain pieces, for what is carried and worn

function rodShape(): Shape { const s = new Shape(); s.tube([ring(6, 0, 1, 1), ring(6, 1, 1, 1)], WHITE, TINT, true, true); return s; }
function blockShape(): Shape { const s = new Shape(); s.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5); return s; }
function drumShape(): Shape { const s = new Shape(); s.tube([ring(8, -0.5, 1, 1), ring(8, 0.5, 1, 1)], WHITE, TINT, true, true); return s; }
/** A cone from a base one unit round up to a point; its panels in two shades, so that a turn shows. */
function coneShape(): Shape {
  const s = new Shape(), base = ring(8, 0, 1, 1), tip: P = [0, 1, 0];
  for (let i = 0; i < 8; i++) s.tri(base[i], base[(i + 1) % 8], tip, shadeOf(WHITE, i % 2 ? 0.8 : 1), TINT, [0, 0.3, 0]);
  s.poly(base, 0xb0b0b0, TINT, [0, 1, 0]);
  return s;
}
function ballShape(): Shape {
  const s = new Shape(), lat = [-0.7, -0.25, 0.25, 0.7];
  const rings = lat.map((y) => ring(8, y, Math.sqrt(1 - y * y), Math.sqrt(1 - y * y)));
  s.tube([dot([0, -1, 0], 8), ...rings, dot([0, 1, 0], 8)], WHITE, TINT, false, false);
  return s;
}
/** A playing card, a unit wide and 1.4 tall, white with a red pip on each face. */
function cardShape(): Shape {
  const s = new Shape();
  s.box(-0.015, -0.7, -0.5, 0.015, 0.7, 0.5, 0xf6f4ee, OWN);
  for (const sg of [1, -1]) {
    const x = sg * 0.02;
    s.poly([[x, 0.36, 0], [x, 0, 0.26], [x, -0.36, 0], [x, 0, -0.26]], 0xc8202a, OWN, [-sg, 0, 0]);
  }
  return s;
}
/** A sword along +y from its grip's top at 0 to its point at 1: steel, a gold guard, a dark grip. */
function swordShape(): Shape {
  const s = new Shape();
  bladeSheet(s, [[0, 0.02], [0, 0.6], [0, 0.88], [0, 1]], [0.045, 0.042, 0.036, 0], 0.012, 0xdfe3e8, OWN);
  s.box(-0.13, -0.02, -0.03, 0.13, 0.03, 0.03, 0xd6a83a, OWN);
  s.box(-0.025, -0.22, -0.025, 0.025, -0.02, 0.025, 0x2a2228, OWN);
  return s;
}
/** A torus round the y axis, a unit round, its tube a sixth of that. */
function loopShape(): Shape {
  const s = new Shape(), n = 10, m = 4, r = 0.17;
  const at = (i: number, j: number): P => { const a = (i / n) * TAU, b = (j / m) * TAU, R = 1 + r * Math.cos(b); return [Math.cos(a) * R, r * Math.sin(b), Math.sin(a) * R]; };
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = (i + 0.5) / n * TAU;
    s.quad(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1), WHITE, TINT, [Math.cos(a), 0, Math.sin(a)]);
  }
  return s;
}
/** A whip loose from the fist in a long arc, its tip curling back, in units for a figure 2.5 tall. */
function whipShape(): Shape {
  const s = new Shape();
  const pts: P[] = [[0, 0, 0], [0.4, 0.06, 0], [0.8, 0.04, 0.02], [1.15, -0.1, 0.05], [1.42, -0.32, 0.05], [1.52, -0.55, 0.02], [1.42, -0.72, -0.03], [1.24, -0.76, -0.07]];
  const r = pts.map((_, i) => mix(0.035, 0.012, i / (pts.length - 1)));
  s.tube(along(pts, r, r, 3, [0, 0, 1]), WHITE, TINT, false, true);
  return s;
}

// ---- what gives light, drawn in light: in head units unless said

/** White eyes, slanting, on the front of the head a little out from its surface. */
/** Where a cowl's, a mask's or a helmet's front is at height y, before it is pushed out: the front of the eight-sided shell. */
const shellX = (y: number): number => { const [rx, , cx] = headAt(y); return cx + rx * Math.cos(Math.PI / 8); };
function eyesShape(): Shape {
  const s = new Shape(), x = shellX(0.63) + 0.03;
  for (const side of [-1, 1]) s.quad([x, 0.595, side * 0.045], [x, 0.61, side * 0.15], [x, 0.685, side * 0.14], [x, 0.655, side * 0.045], WHITE, TINT, [x - 1, 0.63, side * 0.1]);
  return s;
}
/** Round goggles, standing out from the face. */
function gogglesShape(): Shape {
  const s = new Shape(), x = shellX(0.63) + 0.01;
  for (const side of [-1, 1]) {
    const c: P = [x + 0.07, 0.635, side * 0.11];
    const rim = Array.from({ length: 6 }, (_, i): P => { const a = (i / 6) * TAU; return [x - 0.01, 0.635 + Math.sin(a) * 0.095, side * 0.11 + Math.cos(a) * 0.095]; });
    for (let i = 0; i < 6; i++) s.tri(rim[i], rim[(i + 1) % 6], c, WHITE, TINT, [x - 1, 0.635, side * 0.1]);
  }
  return s;
}
/** A clear dome over the head. */
function domeShape(): Shape {
  const s = new Shape(), ys = [0.12, 0.5, 0.88, 1.18, 1.36], rs = [0.6, 0.66, 0.62, 0.46, 0.18];
  s.tube([...ys.map((y, i) => ring(10, y, rs[i], rs[i], 0.02)), dot([0.02, 1.42, 0], 10)], WHITE, TINT, false, false);
  return s;
}
/** A flash: a star of three crossed points. */
function flashShape(): Shape {
  const s = new Shape();
  const spike = (ax: P, w: number): void => {
    const [x, y, z] = ax, o: P[] = y === 0 ? [[0, w, 0], [0, 0, w], [0, -w, 0], [0, 0, -w]] : [[w, 0, 0], [0, 0, w], [-w, 0, 0], [0, 0, -w]];
    for (let i = 0; i < 4; i++) {
      const a = o[i], b = o[(i + 1) % 4];
      s.tri(a, b, [x, y, z], WHITE, TINT, [0, 0, 0]);
      s.tri(b, a, [-x, -y, -z], WHITE, TINT, [0, 0, 0]);
    }
  };
  spike([1, 0, 0], 0.14); spike([0, 1, 0], 0.14); spike([0, 0, 0.9], 0.12);
  return s;
}
/** A jet's flame: a cone down from y = 0, white at the nozzle and orange at its tip. */
function flameShape(): Shape {
  const s = new Shape(), top = ring(6, 0, 1, 1), tip: P = [0, -3.2, 0];
  for (let i = 0; i < 6; i++) s.tri(top[i], top[(i + 1) % 6], tip, 0xfff1c8, TINT, [0, -1, 0]);
  for (let i = 0; i < s.col.length; i += 3) if (s.pos[i + 1] < -2) { s.col[i] = 1.0; s.col[i + 1] = 0.42; s.col[i + 2] = 0.08; }
  return s;
}

const SHAPES: Record<string, () => Shape> = {
  hips: hipsShape, belt: beltShape, chest: chestShape, belly: bellyShape, jacket: jacketShape, bib: bibShape, stripe: stripeShape,
  upper: () => limbShape(0.1, -1.04, 1, 0.86), fore: () => limbShape(0.08, -1.0, 0.92, 0.72), hand: handShape,
  thigh: () => limbShape(0.14, -1.06, 1, 0.82, false, true), shin: () => limbShape(0.12, -1.0, 0.95, 0.68, false, false), boot: bootShape, skirt: skirtShape,
  head: headShape, 'hair-short': hairShortShape, 'hair-long': hairLongShape, 'hair-fringe': hairFringeShape,
  cowl: cowlShape, ears: earsShape, helmet: helmetShape, hood: hoodShape, jester: jesterShape, mask: maskShape, grin: grinShape, 'half-face': halfFaceShape, collar: collarShape,
  bird: birdShape, xstraps: xstrapsShape, dots: dotsShape, leaves: leavesShape, 'half-chest': () => halfShape(CH, [-0.08, 0.42, 0.78, 1.0]), 'half-hips': () => halfShape(HP, [-0.45, 1.15]), check: checkShape,
  oval: ovalShape, bat: batShape, bolt: boltShape, shield: shieldShape, qmark: qmarkShape,
  'cape-up-o': () => capeSheet(true, 0.5, 0.55, [-1, -1, -1, -1, -1]), 'cape-up-i': () => capeSheet(false, 0.5, 0.55, [-1, -1, -1, -1, -1]),
  'cape-lo-o': () => capeSheet(true, 0.55, 0.62, [-1, -1, -1, -1, -1]), 'cape-lo-i': () => capeSheet(false, 0.55, 0.62, [-1, -1, -1, -1, -1]),
  'cape-sc-o': () => capeSheet(true, 0.55, 0.64, SCALLOPS), 'cape-sc-i': () => capeSheet(false, 0.55, 0.64, SCALLOPS),
  batwing: batWingShape, mothwing: mothWingShape, kite: kiteShape,
  rod: rodShape, block: blockShape, drum: drumShape, cone: coneShape, ball: ballShape, card: cardShape, sword: swordShape, loop: loopShape, whip: whipShape,
  eyes: eyesShape, goggles: gogglesShape, gloop: loopShape, gball: ballShape, flame: flameShape, dome: domeShape, flash: flashShape,
};
/** Parts drawn in light: solid, and added light. */
const GLOWS = new Set(['eyes', 'goggles', 'gloop', 'gball', 'flame']);
const ADDED = new Set(['dome', 'flash']);

// ---------------------------------------------------------------------------
// The parts, each one instanced mesh for every figure that wears it
// ---------------------------------------------------------------------------

/** One kind of part: an instanced mesh, with a copy for each figure that wears it now, packed so that only those are drawn. */
class Pool {
  readonly name: string;
  readonly tris: number;
  mesh: THREE.InstancedMesh;
  readonly owners: Slot[] = [];
  matrices = false;
  colors = false;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.Material;
  private readonly group: THREE.Group;
  private readonly lit: boolean;

  constructor(group: THREE.Group, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, lit: boolean, cap = 16) {
    this.group = group;
    this.name = name;
    this.geo = geo;
    this.mat = mat;
    this.lit = lit;
    this.tris = geo.getAttribute('position').count / 3;
    this.mesh = this.make(cap);
    group.add(this.mesh);
  }

  private make(cap: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.name = `gotham-figures-${this.name}`;
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = !this.lit;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color(1, 1, 1));
    return m;
  }

  take(s: Slot): void {
    if (this.owners.length >= this.mesh.instanceMatrix.count) this.grow();
    s.index = this.owners.length;
    this.owners.push(s);
    this.mesh.setColorAt(s.index, s.color);
    this.mesh.count = this.owners.length;
    this.mesh.visible = true;
    this.colors = this.matrices = true;
  }

  drop(s: Slot): void {
    const i = s.index, last = this.owners.length - 1;
    if (i < 0) return;
    if (i !== last) {
      const moved = this.owners[last];
      this.owners[i] = moved;
      moved.index = i;
      const m = this.mesh.instanceMatrix.array as Float32Array;
      m.copyWithin(i * 16, last * 16, last * 16 + 16);
      this.mesh.setColorAt(i, moved.color);
    }
    this.owners.pop();
    s.index = -1;
    this.mesh.count = this.owners.length;
    this.mesh.visible = this.owners.length > 0;
    this.colors = this.matrices = true;
  }

  recolor(s: Slot): void {
    if (s.index < 0) return;
    this.mesh.setColorAt(s.index, s.color);
    this.colors = true;
  }

  private grow(): void {
    const old = this.mesh, m = this.make(old.instanceMatrix.count * 2);
    (m.instanceMatrix.array as Float32Array).set(old.instanceMatrix.array as Float32Array);
    (m.instanceColor!.array as Float32Array).set(old.instanceColor!.array as Float32Array);
    m.count = old.count;
    m.visible = old.visible;
    m.renderOrder = old.renderOrder;
    this.group.remove(old);
    old.dispose();
    this.group.add(m);
    this.mesh = m;
  }

  flush(): void {
    const n = this.owners.length;
    if (this.matrices && n > 0) {
      this.mesh.instanceMatrix.clearUpdateRanges();
      this.mesh.instanceMatrix.addUpdateRange(0, n * 16);
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.colors && this.mesh.instanceColor && n > 0) {
      this.mesh.instanceColor.clearUpdateRanges();
      this.mesh.instanceColor.addUpdateRange(0, n * 3);
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.matrices = this.colors = false;
  }
}

/** When a part is drawn: always, while what is carried is put away or out, or while the figure gives light. */
type Role = 'body' | 'in' | 'out' | 'lit';

/** One figure's copy of one part. */
interface Slot {
  pool: Pool;
  index: number;
  color: THREE.Color;
  role: Role;
  bone: number;
  off: THREE.Vector3 | null;
  rot: THREE.Quaternion | null;
  scale: THREE.Vector3;
  /** For what moves of itself: writes the copy's place in the tile into `m`. */
  place?: (m: THREE.Matrix4) => void;
  /** For what gives light: its colour at full light, and how bright it is unlit and lit. */
  glow?: { base: THREE.Color; lo: number; hi: number };
  want: boolean;
}

// ---------------------------------------------------------------------------
// A figure's measures and bones
// ---------------------------------------------------------------------------

interface Measures {
  H: number; B: number; head: number; neck: number; hb: number;
  hip: number; ankle: number; thigh: number; shin: number; foot: number;
  hipW: number; hipD: number; hipsH: number; legW: number;
  chestH: number; chestW: number; chestD: number;
  shoulderY: number; shoulderW: number;
  upper: number; fore: number; hand: number;
  armR: number; foreR: number; thighR: number; shinR: number;
}

function measure(l: Look): Measures {
  const H = l.height, B = l.build ?? 1, legs = l.legLength ?? 1;
  const head = 0.49 * Math.pow(H / 2.3, 0.6) * (l.headScale ?? 1), neck = 0.19 * head, hb = H - head - neck;
  const hip = 0.55 * hb * legs, ankle = 0.045 * hb, waist = hip + 0.14 * hb;
  const thin = Math.pow(B, 0.7), deep = Math.pow(B, 0.8);
  const chestW = 0.13 * hb * B, armR = 0.042 * hb * thin;
  const chestH = hb - waist;
  return {
    H, B, head, neck, hb, hip, ankle, thigh: (hip - ankle) / 2, shin: (hip - ankle) / 2, foot: 0.14 * hb,
    hipW: 0.11 * hb * B, hipD: 0.072 * hb * deep, hipsH: waist - hip, legW: 0.058 * hb * B,
    chestH, chestW, chestD: 0.08 * hb * deep,
    shoulderY: chestH - 0.08 * hb, shoulderW: chestW + 0.45 * armR,
    upper: 0.235 * hb, fore: 0.21 * hb, hand: 0.085 * hb,
    armR, foreR: 0.037 * hb * thin, thighR: 0.057 * hb * thin, shinR: 0.047 * hb * thin,
  };
}

/** How wide a figure of a look stands, shoulder to shoulder. */
export function widthOf(l: Look): number {
  const d = measure(l);
  return 2 * (d.shoulderW + d.armR);
}

const ROOT = 0, PELVIS = 1, HIPS = 2, CHEST = 3, HEAD_B = 4, UPPER_L = 5, UPPER_R = 6, FORE_L = 7, FORE_R = 8, HAND_L = 9, HAND_R = 10;
const THIGH_L = 11, THIGH_R = 12, SHIN_L = 13, SHIN_R = 14, FOOT_L = 15, FOOT_R = 16;
const CAPE_L1 = 17, CAPE_L2 = 18, CAPE_R1 = 19, CAPE_R2 = 20, BONES = 21;
const GRIP = -0.55;
const REST_SPREAD = 0.07, SPLAY = 0.04;

// scratch, so that a frame makes no garbage
const M1 = new THREE.Matrix4(), M2 = new THREE.Matrix4(), TMP = new THREE.Matrix4(), LOC = new THREE.Matrix4();
const Q1 = new THREE.Quaternion(), E1 = new THREE.Euler();
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3(), V5 = new THREE.Vector3(), V6 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const rotX = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationX(a));
const rotY = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationY(a));
const rotZ = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationZ(a));
const move = (m: THREE.Matrix4, x: number, y: number, z: number): THREE.Matrix4 => m.multiply(M1.makeTranslation(x, y, z));
/** A place, a turn (as angles about x, y and z) and a size, as one matrix. */
const trs = (m: THREE.Matrix4, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): THREE.Matrix4 =>
  m.compose(V5.set(x, y, z), Q1.setFromEuler(E1.set(rx, ry, rz)), V6.set(sx, sy, sz));

/** What the figures share: their pools and their clock. */
interface Kit { pool(name: string): Pool; clock: number }

/** The frames that what is carried is placed in, worked out afresh each time a figure is written. */
type FrameId = 'gripR' | 'gripL' | 'upR' | 'downR' | 'fwdR' | 'levelR' | 'levelL' | 'hipR' | 'hipL' | 'back' | 'between' | 'air' | 'chestF';
const FRAME_IDS: FrameId[] = ['gripR', 'gripL', 'upR', 'downR', 'fwdR', 'levelR', 'levelL', 'hipR', 'hipL', 'back', 'between', 'air', 'chestF'];

class Fig implements Figure {
  readonly look: Look;
  private readonly kit: Kit;
  private readonly d: Measures;
  private readonly seed: number;
  private x = 0; private y = -50; private z = 0; private h = 0;
  private pitch = 0; private roll = 0;
  private readonly p: Pose = { ...STANDING };
  private outF = 0; private spinF = 0;
  private streamF = 0; private spreadF = 0;
  private glowF = 0;
  private sizeF = 1;
  private isShown = false;
  dirty = true;
  private readonly M: THREE.Matrix4[] = Array.from({ length: BONES }, () => new THREE.Matrix4());
  private readonly S: THREE.Vector3[] = Array.from({ length: BONES }, () => new THREE.Vector3(1, 1, 1));
  private readonly F = Object.fromEntries(FRAME_IDS.map((id) => [id, new THREE.Matrix4()])) as Record<FrameId, THREE.Matrix4>;
  readonly slots: Slot[] = [];
  private readonly glows: Slot[] = [];
  private capeLen = [0, 0];
  private capeW = 0;

  constructor(look: Look, kit: Kit, seed: number) {
    this.look = look;
    this.kit = kit;
    this.seed = seed;
    const d = (this.d = measure(look));
    const S = this.S, l = look;
    S[HIPS].set(d.hipD, d.hipsH, d.hipW);
    S[CHEST].set(d.chestD, d.chestH, d.chestW);
    S[HEAD_B].setScalar(d.head);
    S[UPPER_L].set(d.armR, d.upper, d.armR); S[UPPER_R].copy(S[UPPER_L]);
    S[FORE_L].set(d.foreR, d.fore, d.foreR); S[FORE_R].copy(S[FORE_L]);
    S[HAND_L].setScalar(d.hand); S[HAND_R].setScalar(d.hand);
    S[THIGH_L].set(d.thighR, d.thigh, d.thighR); S[THIGH_R].copy(S[THIGH_L]);
    S[SHIN_L].set(d.shinR, d.shin, d.shinR); S[SHIN_R].copy(S[SHIN_L]);
    S[FOOT_L].setScalar(d.foot); S[FOOT_R].setScalar(d.foot);

    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    const q = (rx: number, ry: number, rz: number): THREE.Quaternion => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    const add = (role: Role, part: string, color: number, bone: number, off: THREE.Vector3 | null = null, scale: THREE.Vector3 | null = null, rot: THREE.Quaternion | null = null): Slot => {
      const slot: Slot = { pool: kit.pool(part), index: -1, color: new THREE.Color(color), role, bone, off, rot, scale: scale ?? S[bone], want: false };
      this.slots.push(slot);
      return slot;
    };
    const placed = (role: Role, part: string, color: number, place: (m: THREE.Matrix4) => void): Slot => {
      const slot = add(role, part, color, ROOT);
      slot.place = place;
      return slot;
    };
    const lit = (s: Slot, lo: number, hi: number): Slot => { s.glow = { base: s.color.clone(), lo, hi }; this.glows.push(s); return s; };
    const h = d.head, u = l.height / 2.5;
    const left = l.left ?? {};
    const arms = l.arms ?? l.chest, fore = l.fore ?? arms, hands = l.hands ?? l.skin, legs = l.legs ?? l.chest, shins = l.shins ?? legs, boots = l.boots ?? shadeOf(legs, 0.55);
    const headMid = (k: number): THREE.Vector3 => v(0, MID[1] * h * (1 - k), 0);
    const onHead = (k: number): THREE.Vector3 => v(h * k, h * k, h * k);

    // ---- the body
    add('body', 'hips', l.hips ?? legs, HIPS);
    if (left.hips !== undefined) add('body', 'half-hips', left.hips, HIPS);
    add('body', 'chest', l.chest, CHEST);
    if (left.chest !== undefined) add('body', 'half-chest', left.chest, CHEST);
    if (left.check !== undefined) add('body', 'check', left.check, CHEST);
    if (l.belly) add('body', 'belly', l.jacket ? l.chest : l.chest, CHEST);
    if (l.jacket !== undefined) add('body', 'jacket', l.jacket, CHEST);
    if (l.bib !== undefined) add('body', 'bib', l.bib, CHEST);
    if (l.belt !== undefined) add('body', 'belt', l.belt, HIPS);
    add('body', 'upper', left.arms ?? arms, UPPER_L); add('body', 'upper', arms, UPPER_R);
    add('body', 'fore', left.fore ?? left.arms ?? fore, FORE_L); add('body', 'fore', fore, FORE_R);
    add('body', 'hand', left.hands ?? hands, HAND_L); add('body', 'hand', hands, HAND_R);
    add('body', 'thigh', left.legs ?? legs, THIGH_L); add('body', 'thigh', legs, THIGH_R);
    add('body', 'shin', left.shins ?? left.legs ?? shins, SHIN_L); add('body', 'shin', shins, SHIN_R);
    add('body', 'boot', left.boots ?? boots, FOOT_L); add('body', 'boot', boots, FOOT_R);
    if (l.skirt !== undefined) add('body', 'skirt', l.skirt, HIPS, v(0, d.hipsH * 0.96, 0), v(d.hipD * 1.08, (l.skirtLength ?? 0.4) * d.hb, d.hipW * 1.08));
    if (l.stripes?.arms !== undefined) for (const b of [UPPER_L, UPPER_R, FORE_L, FORE_R]) add('body', 'stripe', l.stripes.arms, b);
    if (l.stripes?.legs !== undefined) for (const b of [THIGH_L, THIGH_R, SHIN_L, SHIN_R]) add('body', 'stripe', l.stripes.legs, b);

    // ---- the marks on the chest and back
    const front = (y: number): number => { const [rx, , cx] = ringsAt(CH, y); return (cx + rx * Math.cos(Math.PI / 8)) * d.chestD + 0.012; };
    const back = (y: number): number => { const [rx, , cx] = ringsAt(CH, y); return (cx - rx * Math.cos(Math.PI / 8)) * d.chestD - 0.012; };
    const markY = 0.6, mc = l.markColor ?? YELLOW, cw = d.chestW;
    for (const m of l.marks ?? []) {
      const fx = front(markY), y = markY * d.chestH;
      switch (m) {
        case 'batOval':
          add('body', 'oval', YELLOW, CHEST, v(fx, y, 0), v(1, cw * 0.24, cw * 0.36));
          add('body', 'bat', INK, CHEST, v(fx + 0.008, y, 0), v(1, cw * 0.26, cw * 0.3));
          break;
        case 'bat': add('body', 'bat', mc, CHEST, v(fx, y + 0.02 * d.chestH, 0), v(1, cw * 0.34, cw * 0.36)); break;
        case 'boltDisc':
          add('body', 'oval', 0xf6f4ee, CHEST, v(fx, y, 0), v(1, cw * 0.3, cw * 0.3));
          add('body', 'bolt', YELLOW, CHEST, v(fx + 0.008, y, 0), v(1, cw * 0.26, cw * 0.3));
          break;
        case 'disc': add('body', 'oval', 0xf6f4ee, CHEST, v(fx, y, 0), v(1, cw * 0.3, cw * 0.3)); break;
        case 'shield': add('body', 'shield', WHITE, CHEST, v(fx, y, 0), v(1, cw * 0.32, cw * 0.3)); break;
        case 'bird': add('body', 'bird', mc, CHEST); break;
        case 'xstraps': add('body', 'xstraps', mc, CHEST); break;
        case 'dots': add('body', 'dots', WHITE, CHEST); add('body', 'dots', WHITE, HIPS, v(0, 0.3 * d.hipsH, 0), v(d.hipD * 0.95, d.hipsH * 0.9, d.hipW * 0.95)); break;
        case 'leaves': add('body', 'leaves', mc, CHEST); add('body', 'leaves', mc, HIPS, v(0, 0.35 * d.hipsH, 0), v(d.hipD * 0.95, d.hipsH * 0.8, d.hipW * 0.95)); break;
        case 'qmark': add('body', 'qmark', mc, CHEST, v(back(0.5), 0.42 * d.chestH, 0), v(1, d.chestH * 0.78, cw * 0.9), q(0, Math.PI, 0)); break;
      }
    }

    // ---- the head and what is on it
    add('body', 'head', l.face ?? l.skin, HEAD_B);
    if (left.face !== undefined) add('body', 'half-face', left.face, HEAD_B, l.head === 'helmet' ? headMid(1.13) : null, l.head === 'helmet' ? onHead(1.13) : null);
    const gear = l.head ?? 'none', gc = l.headColor ?? BLACK;
    const style = l.hairStyle ?? 'none', hs = l.hairScale ?? 1;
    // hair that a cowl or helmet leaves showing: a long fall below it
    if (style !== 'none' && l.hair !== undefined) {
      const covered = gear === 'helmet' || gear === 'hood' || gear === 'jester';
      if (style === 'long' && (gear === 'cowl' || !covered)) add('body', 'hair-long', l.hair, HEAD_B);
      else if (!covered && gear !== 'cowl') {
        if (style === 'short') add('body', 'hair-short', l.hair, HEAD_B, hs !== 1 ? headMid(hs) : null, hs !== 1 ? onHead(hs) : null);
        if (style === 'fringe') add('body', 'hair-fringe', l.hair, HEAD_B);
        if (style === 'bun') { add('body', 'hair-short', l.hair, HEAD_B); add('body', 'ball', l.hair, HEAD_B, v(-0.42 * h, 0.95 * h, 0), v(0.2 * h, 0.2 * h, 0.2 * h)); }
      }
    }
    if (gear === 'cowl') add('body', 'cowl', gc, HEAD_B);
    if (gear === 'helmet') add('body', 'helmet', gc, HEAD_B);
    if (gear === 'hood') add('body', 'hood', gc, HEAD_B);
    if (gear === 'jester') add('body', 'jester', WHITE, HEAD_B);
    if (gear === 'cowl' && (l.ears ?? 1) > 0) { const e = l.ears ?? 1; add('body', 'ears', gc, HEAD_B, v(0, 1.08 * h, 0), v(h * Math.min(1.3, 0.8 + 0.25 * e), h * e, h * Math.min(1.3, 0.85 + 0.2 * e))); }
    const shellK = gear === 'cowl' ? 1.12 : gear === 'helmet' ? 1.15 : 1;
    if (l.mask !== undefined) add('body', 'mask', l.mask, HEAD_B, gear === 'hood' ? null : null);
    if (l.glasses !== undefined) add('body', 'mask', l.glasses, HEAD_B, v(0, 0.02 * h, 0), v(h * 1.0, h * 0.55, h * 1.02));
    if (l.eyes !== undefined) {
      // on a bare head the face is flatter than a shell's front: drawn a little further in
      const k = l.mask !== undefined ? 1.065 : shellK, bare = k === 1 ? 0.95 : 1;
      const big = l.face !== undefined && gear === 'none' ? 1.3 : 1;
      lit(add('body', 'eyes', l.eyes, HEAD_B, v(0, MID[1] * h * (1 - k * big), 0), v(h * k * bare, h * k * big, h * k * big)), 0.85, 1.9);
    }
    if (l.goggles !== undefined) lit(add('body', 'goggles', l.goggles, HEAD_B, headMid(shellK), v(h * shellK * (shellK === 1 ? 0.95 : 1), h * shellK, h * shellK)), 0.45, 1.8);
    if (l.dome) lit(add('body', 'dome', 0x9ad8ff, HEAD_B), 0.22, 0.75);
    // the hat, of plain pieces
    if (l.hat) {
      const hc = l.hatColor ?? BLACK, band = l.hatBand ?? shadeOf(hc, 0.6), z = l.hatSize ?? 1, top = 1.0 * h;
      switch (l.hat) {
        case 'top':
          add('body', 'drum', hc, HEAD_B, v(-0.03 * h, top + 0.38 * h * z, 0), v(0.42 * h * z, 0.78 * h * z, 0.42 * h * z));
          add('body', 'drum', band, HEAD_B, v(-0.03 * h, top + 0.1 * h * z, 0), v(0.44 * h * z, 0.12 * h * z, 0.44 * h * z));
          add('body', 'drum', hc, HEAD_B, v(-0.03 * h, top, 0), v(0.66 * h * z, 0.05 * h, 0.66 * h * z));
          if (z > 1.2) add('body', 'card', WHITE, HEAD_B, v(0.36 * h * z, top + 0.32 * h * z, 0.12 * h * z), v(0.26 * h * z, 0.26 * h * z, 0.26 * h * z), q(0, 0, -0.15));
          break;
        case 'bowler':
          add('body', 'ball', hc, HEAD_B, v(-0.02 * h, top - 0.02 * h, 0), v(0.48 * h, 0.44 * h, 0.48 * h));
          add('body', 'drum', band, HEAD_B, v(-0.02 * h, top + 0.03 * h, 0), v(0.49 * h, 0.07 * h, 0.49 * h));
          add('body', 'drum', hc, HEAD_B, v(-0.02 * h, top - 0.03 * h, 0), v(0.64 * h, 0.04 * h, 0.64 * h));
          break;
        case 'fedora':
          add('body', 'drum', hc, HEAD_B, v(-0.02 * h, top + 0.14 * h, 0), v(0.42 * h, 0.36 * h, 0.44 * h));
          add('body', 'drum', band, HEAD_B, v(-0.02 * h, top + 0.03 * h, 0), v(0.43 * h, 0.08 * h, 0.45 * h));
          add('body', 'drum', hc, HEAD_B, v(-0.02 * h, top - 0.02 * h, 0), v(0.74 * h, 0.04 * h, 0.74 * h), q(0, 0, -0.08));
          break;
        case 'cap':
        case 'flat': {
          const tall = l.hat === 'cap' ? 0.3 : 0.16;
          add('body', 'drum', hc, HEAD_B, v(0, top + tall * 0.5 * h - 0.04 * h, 0), v(0.5 * h, tall * h, 0.5 * h));
          if (l.hat === 'cap') add('body', 'drum', band, HEAD_B, v(0, top - 0.02 * h, 0), v(0.47 * h, 0.1 * h, 0.47 * h));
          add('body', 'block', l.hat === 'cap' ? INK : hc, HEAD_B, v(0.5 * h, top - 0.05 * h, 0), v(0.38 * h, 0.04 * h, 0.6 * h), q(0, 0, -0.2));
          break;
        }
        case 'floppy':
          add('body', 'cone', hc, HEAD_B, v(-0.05 * h, top - 0.06 * h, 0), v(0.5 * h, 1.0 * h, 0.5 * h), q(0.25, 0, 0.35));
          add('body', 'drum', hc, HEAD_B, v(-0.02 * h, top - 0.04 * h, 0), v(0.88 * h, 0.04 * h, 0.88 * h), q(0.12, 0, -0.1));
          break;
        case 'bonnet':
          add('body', 'ball', hc, HEAD_B, v(-0.08 * h, top - 0.1 * h, 0), v(0.56 * h, 0.5 * h, 0.54 * h));
          add('body', 'drum', band, HEAD_B, v(0.04 * h, top - 0.12 * h, 0), v(0.52 * h, 0.08 * h, 0.55 * h), q(0, 0, 0.5));
          break;
      }
    }

    // ---- the bits
    const bc = (b: Bit, c: number): number => l.bitColor?.[b] ?? c;
    const fx = (y: number): number => faceX(y) * h;
    for (const b of l.bits ?? []) {
      switch (b) {
        case 'grin': add('body', 'grin', WHITE, HEAD_B); break;
        case 'redNose': add('body', 'ball', 0xd8202a, HEAD_B, v(fx(0.52) + 0.05 * h, 0.52 * h, 0), v(0.09 * h, 0.09 * h, 0.09 * h)); break;
        case 'moustache': add('body', 'block', bc(b, 0x5a5654), HEAD_B, v(fx(0.44) + 0.035 * h, 0.44 * h, 0), v(0.05 * h, 0.06 * h, 0.3 * h)); break;
        case 'goatee': add('body', 'block', bc(b, 0x2a2420), HEAD_B, v(fx(0.24) + 0.0 * h, 0.22 * h, 0), v(0.16 * h, 0.16 * h, l.name === 'Hugo Strange' ? 0.46 * h : 0.16 * h)); break;
        case 'stitches': add('body', 'block', 0x3a2a1c, HEAD_B, v(fx(0.36) + 0.012 * h, 0.36 * h, 0), v(0.02 * h, 0.035 * h, 0.4 * h)); add('body', 'block', 0x3a2a1c, HEAD_B, v(fx(0.36) + 0.014 * h, 0.36 * h, 0), v(0.02 * h, 0.14 * h, 0.03 * h)); break;
        case 'longNose': add('body', 'cone', l.skin, HEAD_B, v(fx(0.52) - 0.02 * h, 0.52 * h, 0), v(0.08 * h, 0.36 * h, 0.08 * h), q(0, 0, -Math.PI / 2 + 0.25)); break;
        case 'monocle': add('body', 'loop', GOLD, HEAD_B, v(fx(0.63) + 0.03 * h, 0.635 * h, 0.095 * h), v(0.07 * h, 0.07 * h, 0.07 * h), q(0, 0, Math.PI / 2)); break;
        case 'temples': for (const sd of [-1, 1]) add('body', 'block', bc(b, 0xb0b0b0), HEAD_B, v(-0.02 * h, 0.72 * h, sd * 0.43 * h), v(0.3 * h, 0.2 * h, 0.04 * h)); break;
        case 'brow': add('body', 'block', bc(b, l.skin), HEAD_B, v(fx(0.76) + 0.02 * h, 0.76 * h, 0), v(0.12 * h, 0.09 * h, 0.56 * h)); break;
        case 'snout': add('body', 'block', bc(b, l.skin), HEAD_B, v(0.42 * h, 0.36 * h, 0), v(0.4 * h, 0.24 * h, 0.44 * h), q(0, 0, -0.12)); break;
        case 'tiara': add('body', 'block', GOLD, HEAD_B, v(fx(0.86) + 0.05 * h, 0.86 * h, 0), v(0.05 * h, 0.14 * h, 0.44 * h), q(0, 0, -0.2)); add('body', 'ball', 0xd8202a, HEAD_B, v(fx(0.86) + 0.09 * h, 0.88 * h, 0), v(0.05 * h, 0.05 * h, 0.05 * h)); break;
        case 'earWings': for (const sd of [-1, 1]) add('body', 'mothwing', bc(b, YELLOW), HEAD_B, v(-0.05 * h, 0.82 * h, sd * 0.42 * h), v(1, 0.5 * h, 0.4 * h), q(0, sd > 0 ? -0.6 : Math.PI + 0.6, 0.5)); break;
        case 'antennae': for (const sd of [-1, 1]) add('body', 'rod', bc(b, INK), HEAD_B, v(0.2 * h, 1.08 * h, sd * 0.12 * h), v(0.025 * h, 0.75 * h, 0.025 * h), q(sd * 0.45, 0, -0.35)); break;
        case 'collar': add('body', 'collar', bc(b, BLACK), CHEST, v(-0.1 * d.chestD, d.chestH * 0.92, 0), v(h, h, h)); break;
        case 'ruff': add('body', 'drum', 0xf6f4ee, CHEST, v(0, d.chestH * 1.0, 0), v(d.chestD * 0.85, 0.1 * h, d.chestW * 0.7)); break;
        case 'bowtie': add('body', 'block', bc(b, RED), CHEST, v(front(0.97) + 0.01, d.chestH * 0.96, 0), v(0.05 * h, 0.1 * h, 0.3 * h)); break;
        case 'badge': add('body', 'block', GOLD, CHEST, v(front(0.7) + 0.01, d.chestH * 0.72, -0.45 * d.chestW), v(0.02, 0.07 * u, 0.06 * u)); break;
        case 'band': add('body', 'belt', bc(b, GOLD), CHEST, v(0, 0.05 * d.chestH, 0), v(d.chestD * 0.96, d.chestH * 0.56, d.chestW * 0.96)); break;
        case 'jersey': for (const y of [0.28, 0.62]) add('body', 'belt', bc(b, WHITE), CHEST, v(0, y * d.chestH - 0.8 * 0.4 * d.chestH, 0), v(d.chestD * 0.96, d.chestH * 0.4, d.chestW * 0.97)); break;
        case 'bracelets': for (const fb of [FORE_L, FORE_R]) add('body', 'loop', 0xd8dce2, fb, v(0, -0.82 * d.fore, 0), v(d.foreR * 1.0, d.fore * 0.5, d.foreR * 1.0)); break;
        case 'vines': for (const lb of [FORE_L, FORE_R, SHIN_L, SHIN_R]) {
          const sc = this.S[lb], r = sc.x;
          add('body', 'loop', bc(b, GREEN), lb, v(0, -0.5 * sc.y, 0), v(r * 0.95, r * 1.6, r * 0.95), q(0.35, 0, 0.2));
        } break;
        case 'lumps': {
          const at: [number, number, number, number, number][] = [[CHEST, 0.9, 0.85, 0.5, 0.16], [CHEST, 0.6, 0.4, -0.55, 0.18], [CHEST, -0.85, 0.7, 0.2, 0.2], [CHEST, 0.2, 1.0, -0.8, 0.15], [HIPS, 0.8, 0.6, 0.6, 0.15], [CHEST, -0.4, 0.15, 0.85, 0.14]];
          for (const [bn, ax, ay, az, r] of at) { const sc = this.S[bn]; add('body', 'ball', bc(b, l.skin), bn, v(ax * sc.x, ay * sc.y, az * sc.z), v(r * u, r * u * 0.85, r * u)); }
          break;
        }
        case 'tanks': for (const sd of [-1, 1]) add('body', 'drum', 0xdfe8ee, CHEST, v(back(0.45) - 0.1 * u, 0.5 * d.chestH, sd * 0.42 * d.chestW), v(0.11 * u, 0.85 * d.chestH, 0.11 * u)); break;
        case 'jetpack':
          add('body', 'block', 0x5a5e64, CHEST, v(back(0.5) - 0.12 * u, 0.55 * d.chestH, 0), v(0.24 * u, 0.7 * d.chestH, 1.4 * d.chestW));
          for (const sd of [-1, 1]) {
            add('body', 'drum', 0x3a3c42, CHEST, v(back(0.5) - 0.14 * u, 0.12 * d.chestH, sd * 0.45 * d.chestW), v(0.08 * u, 0.3 * d.chestH, 0.08 * u));
            lit(add('lit', 'flame', 0xffffff, CHEST, v(back(0.5) - 0.14 * u, -0.05 * d.chestH, sd * 0.45 * d.chestW), v(0.07 * u, 0.3 * u, 0.07 * u)), 0, 1.3);
          }
          break;
        case 'tubes':
          for (const sd of [-1, 1]) placed('body', 'rod', bc(b, GREEN), (m) => {
            V1.set(-0.42 * h, 0.55 * h, sd * 0.2 * h).applyMatrix4(this.M[HEAD_B]);
            V2.set(back(0.8), 0.75 * d.chestH, sd * 0.4 * d.chestW).applyMatrix4(this.M[CHEST]);
            barTo(m, V1, V2, 0.035 * u);
          });
          break;
        case 'tail': add('body', 'cone', bc(b, l.skin), HIPS, v(-0.8 * d.hipD, 0.3 * d.hipsH, 0), v(0.75 * d.hipW, 1.25 * u, 0.6 * d.hipW), q(0, 0, 2.05)); break;
      }
    }

    // ---- the cape, or what serves for one
    const c = l.cape;
    if (c) {
      const inner = c.in ?? c.out;
      if (c.kind === 'cape' || c.kind === 'scallop') {
        const L = (c.length ?? 0.78) * d.hb;
        this.capeLen = [0.42 * L, 0.58 * L];
        this.capeW = d.chestW * (c.width ?? 1.05);
        const lower = c.kind === 'scallop' ? 'cape-sc' : 'cape-lo';
        for (const [b1, b2] of [[CAPE_L1, CAPE_L2], [CAPE_R1, CAPE_R2]]) {
          add('body', 'cape-up-o', c.out, b1, null, v(0.28, this.capeLen[0], this.capeW)); add('body', 'cape-up-i', inner, b1, null, v(0.28, this.capeLen[0], this.capeW));
          add('body', `${lower}-o`, c.out, b2, null, v(0.28, this.capeLen[1], this.capeW)); add('body', `${lower}-i`, inner, b2, null, v(0.28, this.capeLen[1], this.capeW));
        }
      } else if (c.kind === 'tails') {
        this.capeLen = [0.36 * d.hb, 0];
        this.capeW = d.hipW * 0.5;
        for (const b1 of [CAPE_L1, CAPE_R1]) { add('body', 'cape-up-o', c.out, b1, null, v(0.22, this.capeLen[0], this.capeW)); add('body', 'cape-up-i', inner, b1, null, v(0.22, this.capeLen[0], this.capeW)); }
      } else if (c.kind === 'wings' || c.kind === 'moth') {
        const span = c.kind === 'wings' ? 0.95 * l.height : 0.42 * l.height, deep = c.kind === 'wings' ? 0.5 * l.height : 0.42 * l.height;
        this.capeLen = [span, deep];
        for (const b1 of [CAPE_L1, CAPE_R1]) add('body', c.kind === 'wings' ? 'batwing' : 'mothwing', c.out, b1, null, v(1, deep, span));
      } else if (c.kind === 'kite') {
        add('body', 'kite', WHITE, CAPE_L1, null, v(1, 0.85 * u, 0.95 * u));
      }
    }

    // ---- what it carries
    if (l.carries) this.carry(l.carries, l.carryColor, placed, lit, u);
  }

  /** Adds the pieces of what it carries, each placed by what it is doing. */
  private carry(what: Carry, color: number | undefined, placed: (role: Role, part: string, color: number, place: (m: THREE.Matrix4) => void) => Slot, lit: (s: Slot, lo: number, hi: number) => Slot, u: number): void {
    const F = this.F, H = this.look.height;
    const at = (frame: FrameId, local: (m: THREE.Matrix4) => THREE.Matrix4) => (m: THREE.Matrix4): void => { m.copy(F[frame]).multiply(local(LOC)); };
    const o = (): number => this.outF, sp = (): number => this.spinF;
    switch (what) {
      case 'batarang':
        placed('in', 'bat', color ?? INK, at('hipR', (m) => trs(m, 0.05, 0, 0.02, 0, Math.PI / 2, 0, 1, 0.07 * u, 0.12 * u)));
        placed('out', 'bat', color ?? INK, at('gripR', (m) => trs(m, 0.1 * u, 0.0, 0, 0, sp(), Math.PI / 2, 1, 0.09 * u, 0.17 * u)));
        break;
      case 'staff': {
        const c = color ?? 0x44464c;
        placed('in', 'rod', c, at('back', (m) => trs(m, -0.04 * u, -0.25 * u, 0, 0.6, 0, 0, 0.035 * u, 0.7 * u, 0.035 * u)));
        placed('out', 'rod', c, at('upR', (m) => trs(m, 0, -0.55 * H, 0, 0, 0, 0, 0.035 * u, 1.15 * H, 0.035 * u)));
        break;
      }
      case 'sword': {
        placed('in', 'sword', WHITE, at('hipL', (m) => trs(m, -0.05 * u, 0.12 * u, -0.05, 0, 0, Math.PI - 0.5, 0.75 * u, 0.75 * u, 0.75 * u)));
        placed('out', 'sword', WHITE, at('gripR', (m) => trs(m, 0.02 * u, 0, 0, sp(), 0, -Math.PI / 2 + 0.55, 0.8 * u, 0.8 * u, 0.8 * u)));
        break;
      }
      case 'swordBack': {
        placed('in', 'sword', WHITE, at('back', (m) => trs(m, -0.04 * u, 0.1 * u, 0, 0.7, 0, 0, 0.6 * u, 0.6 * u, 0.6 * u)));
        placed('out', 'sword', WHITE, at('gripR', (m) => trs(m, 0.02 * u, 0, 0, sp(), 0, -Math.PI / 2 + 0.55, 0.62 * u, 0.62 * u, 0.62 * u)));
        break;
      }
      case 'escrima':
        for (const sd of [-1, 1]) {
          placed('in', 'rod', 0x2a2c32, at('back', (m) => trs(m, -0.04 * u, -0.2 * u, sd * 0.06 * u, sd * 0.55, 0, 0, 0.026 * u, 0.5 * u, 0.026 * u)));
          placed('out', 'rod', 0x2a2c32, at(sd > 0 ? 'gripR' : 'gripL', (m) => trs(m, 0, 0, 0, sd * sp(), 0, -Math.PI / 2 + 0.3, 0.028 * u, 0.5 * u, 0.028 * u)));
          placed('out', 'ball', 0x2f72e0, at(sd > 0 ? 'gripR' : 'gripL', (m) => { E1.set(sd * sp(), 0, -Math.PI / 2 + 0.3); Q1.setFromEuler(E1); V5.set(0, 0.5 * u, 0).applyQuaternion(Q1); return m.compose(V5, Q1, V6.set(0.04 * u, 0.04 * u, 0.04 * u)); }));
        }
        break;
      case 'tray':
        placed('in', 'drum', color ?? STEELC, at('gripL', (m) => trs(m, 0.02 * u, -0.2 * u, 0, 0, 0, Math.PI / 2, 0.32 * u, 0.02 * u, 0.32 * u)));
        placed('out', 'drum', color ?? STEELC, at('levelL', (m) => trs(m, 0.1 * u, 0.04 * u, 0, 0, 0, 0, 0.34 * u, 0.02 * u, 0.34 * u)));
        placed('out', 'drum', 0xf4f2ec, at('levelL', (m) => trs(m, 0.12 * u, 0.1 * u, 0.05 * u, 0, 0, 0, 0.06 * u, 0.1 * u, 0.06 * u)));
        break;
      case 'doughnut':
        placed('body', 'loop', color ?? 0xc8864e, at('levelR', (m) => trs(m, 0.04 * u, 0.04 * u + o() * 0.1 * u, 0, Math.PI / 2, 0, 0, 0.07 * u, 0.12 * u, 0.07 * u)));
        break;
      case 'camera': {
        const cam = (frame: FrameId) => (m: THREE.Matrix4): THREE.Matrix4 => trs(m, 0.06 * u, 0.02 * u, 0, 0, 0, 0, 0.12 * u, 0.15 * u, 0.24 * u);
        placed('in', 'block', 0x2a2a2e, at('chestF', cam('chestF')));
        placed('out', 'block', 0x2a2a2e, at('between', (m) => trs(m, 0.12 * u, 0.08 * u, 0, 0, 0, 0, 0.12 * u, 0.15 * u, 0.24 * u)));
        placed('out', 'drum', 0x4a4a52, at('between', (m) => trs(m, 0.22 * u, 0.08 * u, 0.0, 0, 0, Math.PI / 2, 0.06 * u, 0.1 * u, 0.06 * u)));
        lit(placed('lit', 'flash', 0xffffff, at('between', (m) => trs(m, 0.2 * u, 0.2 * u, -0.08 * u, 0, 0, 0, 0.6 * u, 0.6 * u, 0.6 * u))), 0, 1.4);
        break;
      }
      case 'cards':
        for (let i = 0; i < 5; i++) placed('body', 'card', WHITE, at('upR', (m) => {
          const s = mix(0.14, 0.62, o()) * u, a = (i - 2) * mix(0.06, 0.32, o());
          E1.set(a, 0, 0); Q1.setFromEuler(E1);
          V5.set(0.01 * i, 0.7 * s, 0).applyQuaternion(Q1);
          return m.compose(V5, Q1, V6.set(s, s, s));
        }));
        break;
      case 'mallet': {
        const lift = (m: THREE.Matrix4, y: number, sx: number, sy: number, sz: number, rx: number): THREE.Matrix4 => {
          E1.set(0, sp(), mix(0.75, -0.2, o())); Q1.setFromEuler(E1);
          V5.set(0, y, 0).applyQuaternion(Q1);
          M2.compose(V5, Q1, V6.set(1, 1, 1));
          return m.multiplyMatrices(M2, TMP.makeRotationX(rx).scale(V6.set(sx, sy, sz)));
        };
        placed('body', 'rod', 0x8a5a32, at('upR', (m) => lift(m, -0.15 * u, 0.04 * u, 1.5 * u, 0.04 * u, 0)));
        placed('body', 'drum', 0xc8232a, at('upR', (m) => lift(m, 1.35 * u, 0.3 * u, 0.7 * u, 0.3 * u, Math.PI / 2)));
        for (const e of [-1, 1]) placed('body', 'drum', 0xf6f4ee, at('upR', (m) => { lift(m, 1.35 * u, 1, 1, 1, 0); return m.multiply(TMP.makeTranslation(0, 0, e * 0.36 * u)).multiply(M2.makeRotationX(Math.PI / 2).scale(V6.set(0.31 * u, 0.04 * u, 0.31 * u))); }));
        break;
      }
      case 'umbrella': {
        const c = color ?? INK;
        // closed, a cane to the ground; open, a canopy over his head twice as wide as he is
        placed('in', 'rod', c, at('downR', (m) => trs(m, 0, -0.1 * u, 0, 0, 0, 0, 0.025 * u, 1.05 * u, 0.025 * u)));
        placed('in', 'cone', c, at('downR', (m) => trs(m, 0, 0.95 * u, 0, Math.PI, 0, 0, 0.09 * u, 0.6 * u, 0.09 * u)));
        placed('in', 'loop', 0x6a4a2a, at('downR', (m) => trs(m, 0.06 * u, -0.12 * u, 0, Math.PI / 2, 0, 0, 0.06 * u, 0.1 * u, 0.06 * u)));
        placed('out', 'rod', c, at('upR', (m) => trs(m, 0, -0.1 * u, 0, 0, 0, 0, 0.025 * u, 0.86 * H, 0.025 * u)));
        placed('out', 'cone', c, at('upR', (m) => trs(m, 0, 0.7 * H, 0, 0, sp(), 0, mix(0.2, 1.0, o()) * u, 0.42 * u, mix(0.2, 1.0, o()) * u)));
        break;
      }
      case 'whip':
        placed('in', 'loop', color ?? 0x2a2a30, at('hipR', (m) => trs(m, 0, 0, 0.03, Math.PI / 2, 0, 0, 0.12 * u, 0.25 * u, 0.12 * u)));
        placed('out', 'whip', color ?? 0x2a2a30, at('fwdR', (m) => trs(m, 0, 0, 0, sp(), 0, Math.PI / 2, u, u * mix(0.5, 1.2, o()), u)));
        break;
      case 'cane': {
        const c = color ?? PURPLE;
        placed('in', 'rod', 0x2a2a30, at('downR', (m) => trs(m, 0, -0.1 * u, 0, 0, 0, 0, 0.022 * u, 1.0 * u, 0.022 * u)));
        placed('in', 'qmark', c, at('downR', (m) => trs(m, 0, -0.22 * u, 0, 0, Math.PI / 2, Math.PI, 1, 0.3 * u, 0.3 * u)));
        placed('out', 'rod', 0x2a2a30, at('upR', (m) => trs(m, 0, -0.1 * u, 0, 0, sp(), 0, 0.022 * u, 1.0 * u, 0.022 * u)));
        placed('out', 'qmark', c, at('upR', (m) => trs(m, 0, 1.0 * u, 0, 0, Math.PI / 2 + sp(), 0, 1, 0.36 * u, 0.36 * u)));
        break;
      }
      case 'coin':
        placed('body', 'drum', color ?? 0xd8dce2, at('air', (m) => trs(m, 0.06 * u, 0, 0, sp(), 0, Math.PI / 2 * (1 - o()) + o() * 0.0, 0.14 * u, 0.025 * u, 0.14 * u)));
        break;
      case 'freezeGun': {
        const aim = (m: THREE.Matrix4, x: number, y: number, sx: number, sy: number, sz: number): THREE.Matrix4 => {
          E1.set(0, 0, mix(Math.PI, 1.5 * Math.PI, o())); Q1.setFromEuler(E1);
          V5.set(x, y, 0).applyQuaternion(Q1);
          return m.compose(V5, Q1, V6.set(sx, sy, sz));
        };
        placed('body', 'block', 0xe8eef2, at('gripR', (m) => aim(m, 0, 0.1 * u, 0.2 * u, 0.42 * u, 0.18 * u)));
        placed('body', 'drum', 0x7ac8ea, at('gripR', (m) => aim(m, 0, 0.42 * u, 0.08 * u, 0.36 * u, 0.08 * u)));
        placed('body', 'rod', 0x6aa8c8, (m) => {
          V1.set(0, -0.1 * u, 0).applyMatrix4(TMP.copy(this.F.gripR).multiply(aim(LOC, 0, -0.08 * u, 1, 1, 1)));
          V2.set(-1.15 * this.d.chestD, 0.1 * this.d.chestH, 0.4 * this.d.chestW).applyMatrix4(this.M[CHEST]);
          barTo(m, V1, V2, 0.03 * u);
        });
        break;
      }
      case 'cocoon': {
        const aim = (m: THREE.Matrix4, y: number, sx: number, sy: number, sz: number): THREE.Matrix4 => {
          E1.set(0, 0, mix(Math.PI, 1.5 * Math.PI, o())); Q1.setFromEuler(E1);
          V5.set(0, y, 0).applyQuaternion(Q1);
          return m.compose(V5, Q1, V6.set(sx, sy, sz));
        };
        placed('body', 'drum', color ?? 0x5ab83e, at('gripR', (m) => aim(m, 0.25 * u, 0.13 * u, 0.6 * u, 0.13 * u)));
        placed('body', 'drum', PURPLE, at('gripR', (m) => aim(m, 0.56 * u, 0.15 * u, 0.06 * u, 0.15 * u)));
        break;
      }
      case 'pouch':
        placed('in', 'block', color ?? 0x8a6a3a, at('hipR', (m) => trs(m, 0.02, -0.04 * u, 0.04 * u, 0, 0, 0, 0.12 * u, 0.16 * u, 0.1 * u)));
        placed('out', 'block', color ?? 0x8a6a3a, at('fwdR', (m) => trs(m, 0.1 * u, 0.08 * u, 0, 0, 0, 0, 0.16 * u, 0.16 * u, 0.12 * u)));
        break;
      case 'crate':
        placed('out', 'block', color ?? WOOD, at('between', (m) => trs(m, 0, 0.42 * u, 0, 0, 0, 0, 0.75 * u, 0.62 * u, 1.05 * u)));
        placed('out', 'block', 0x6a4a28, at('between', (m) => trs(m, 0, 0.42 * u, 0, 0, 0, 0, 0.77 * u, 0.12 * u, 1.07 * u)));
        break;
      case 'trident': {
        const c = color ?? GOLD;
        placed('body', 'rod', c, at('upR', (m) => trs(m, 0, -0.6 * u, 0, 0, sp(), 0, 0.03 * u, 2.3 * u, 0.03 * u)));
        placed('body', 'block', c, at('upR', (m) => trs(m, 0, 1.7 * u, 0, 0, sp(), 0, 0.05 * u, 0.05 * u, 0.42 * u)));
        for (const zz of [-0.19, 0, 0.19]) placed('body', 'cone', c, at('upR', (m) => { E1.set(0, sp(), 0); Q1.setFromEuler(E1); V5.set(0, 1.7 * u, zz * u).applyQuaternion(Q1); return m.compose(V5, Q1, V6.set(0.04 * u, (zz === 0 ? 0.42 : 0.32) * u, 0.04 * u)); }));
        break;
      }
      case 'lasso':
        lit(placed('in', 'gloop', 0xf0c040, at('hipR', (m) => trs(m, 0, 0, 0.04 * u, Math.PI / 2, 0, 0, 0.13 * u, 0.18 * u, 0.13 * u))), 0.75, 1.8);
        lit(placed('out', 'gloop', 0xf0c040, at('levelR', (m) => trs(m, 0.9 * u, 0.25 * u, 0, sp() * 0.2, 0, 0, 0.5 * u, 0.15 * u, 0.5 * u))), 0.75, 1.8);
        lit(placed('out', 'gball', 0xf0c040, (m) => {
          V1.setFromMatrixPosition(this.F.gripR);
          V2.set(0.4 * u, 0.25 * u, 0).applyMatrix4(this.F.levelR);
          barTo(m, V1, V2, 0.02 * u);
        }), 0.75, 1.8);
        break;
      case 'teacup':
        placed('body', 'drum', color ?? 0xf4f2ec, at('levelR', (m) => trs(m, 0.06 * u, 0.06 * u, 0, 0, 0, 0, 0.07 * u, 0.09 * u, 0.07 * u)));
        placed('body', 'drum', color ?? 0xf4f2ec, at('levelR', (m) => trs(m, 0.06 * u, 0.015 * u, 0, 0, 0, 0, 0.11 * u, 0.012 * u, 0.11 * u)));
        break;
      case 'tin':
        placed('body', 'drum', color ?? RED, at('levelR', (m) => trs(m, 0.06 * u, 0.08 * u, 0, 0, 0, 0, 0.09 * u, 0.16 * u, 0.09 * u)));
        break;
      case 'dummy':
        // the dummy sits on his left hand: a pinstriped body, a pale head, a fedora
        placed('body', 'block', 0x3a3a46, at('levelL', (m) => trs(m, 0.05 * u, 0.17 * u, 0, 0, 0, 0, 0.18 * u, 0.32 * u, 0.24 * u)));
        placed('body', 'ball', 0xf0d4b8, at('levelL', (m) => trs(m, 0.06 * u, 0.42 * u, 0, 0, 0.3, 0, 0.12 * u, 0.13 * u, 0.12 * u)));
        placed('body', 'drum', 0x2a2a30, at('levelL', (m) => trs(m, 0.06 * u, 0.55 * u, 0, 0, 0, 0, 0.1 * u, 0.08 * u, 0.1 * u)));
        placed('body', 'drum', 0x2a2a30, at('levelL', (m) => trs(m, 0.06 * u, 0.51 * u, 0, 0, 0, 0, 0.17 * u, 0.012 * u, 0.17 * u)));
        break;
      case 'ring':
        lit(placed('body', 'gball', color ?? 0x40ff70, at('gripR', (m) => trs(m, 0.2 * this.d.hand, -0.35 * this.d.hand, 0, 0, 0, 0, 0.035 * u, 0.035 * u, 0.035 * u))), 0.8, 2.4);
        break;
    }
  }

  // ---- what the show calls

  at(x: number, y: number, z: number, heading: number): void {
    if (x === this.x && y === this.y && z === this.z && heading === this.h) return;
    this.x = x; this.y = y; this.z = z; this.h = heading;
    this.dirty = true;
  }
  lie(pitch: number, roll = 0): void {
    if (pitch !== this.pitch || roll !== this.roll) { this.pitch = pitch; this.roll = roll; this.dirty = true; }
  }
  pose(p: Partial<Pose>): void {
    const q = this.p as unknown as Record<string, number>, src = p as Record<string, number | undefined>;
    for (const key in STANDING) {
      const val = src[key] ?? 0;
      if (q[key] !== val) { q[key] = val; this.dirty = true; }
    }
  }
  hold(out: number, spin = 0): void {
    if (out !== this.outF || spin !== this.spinF) { this.outF = out; this.spinF = spin; this.dirty = true; }
  }
  cape(stream: number, spread = 0): void {
    if (stream !== this.streamF || spread !== this.spreadF) { this.streamF = stream; this.spreadF = spread; this.dirty = true; }
  }
  glow(f: number): void {
    if (f === this.glowF) return;
    this.glowF = f;
    this.dirty = true;
    for (const s of this.glows) {
      const g = s.glow!;
      s.color.copy(g.base).multiplyScalar(mix(g.lo, g.hi, clamp(f)));
      s.pool.recolor(s);
    }
  }
  size(s: number): void {
    if (s !== this.sizeF) { this.sizeF = s; this.dirty = true; }
  }
  shown(v: boolean): void {
    if (v !== this.isShown) { this.isShown = v; this.dirty = true; }
  }

  /** Whether it moves of itself between poses: a cape that flutters, a flame that flickers. */
  get live(): boolean {
    return this.isShown && ((this.streamF > 0.01 && this.look.cape !== undefined) || (this.glowF > 0.02 && this.look.bits?.includes('jetpack') === true));
  }

  get triangles(): number {
    let n = 0;
    for (const s of this.slots) if (s.index >= 0) n += s.pool.tris;
    return n;
  }

  // ---- drawing it

  private wants(): void {
    const on = this.isShown, out = this.outF >= 0.5, lit = this.glowF > 0.02;
    for (const s of this.slots) {
      s.want = on && (s.role === 'body' || (s.role === 'in' && !out) || (s.role === 'out' && out) || (s.role === 'lit' && lit));
      if (s.want && s.index < 0) s.pool.take(s);
      else if (!s.want && s.index >= 0) s.pool.drop(s);
    }
  }

  private bones(): void {
    const d = this.d, p = this.p, M = this.M, k = this.sizeF;
    const upright = Math.abs(this.pitch) < 0.05 && Math.abs(this.roll) < 0.05;
    const root = M[ROOT].makeRotationY(-this.h).setPosition(this.x, this.y, this.z);
    if (!upright) {
      const c = 0.5 * d.H * k;
      move(root, 0, c, 0);
      rotX(rotZ(root, -this.pitch), this.roll);
      move(root, 0, -c, 0);
    }
    if (k !== 1) {
      if (this.look.melts && k < 1) root.scale(V1.set(1 + (1 - k) * 0.9, k, 1 + (1 - k) * 0.9));
      else root.scale(V1.set(k, k, k));
    }
    const legs = d.thigh + d.shin, drop = clamp(p.crouch, 0, 1.1) * 0.5 * legs;
    const th = Math.acos(clamp(1 - drop / legs, -1, 1));
    move(M[PELVIS].copy(root), 0, d.hip - drop, 0);
    rotX(rotZ(M[HIPS].copy(M[PELVIS]), -p.lean), -p.tilt);
    rotY(move(M[CHEST].copy(M[HIPS]), 0, d.hipsH, 0), p.twist);
    rotZ(rotY(move(M[HEAD_B].copy(M[CHEST]), 0, d.chestH, 0), p.head), -p.nod);
    for (const side of [-1, 1]) {
      const L = side < 0, U = L ? UPPER_L : UPPER_R, F = L ? FORE_L : FORE_R, Hd = L ? HAND_L : HAND_R;
      const arm = L ? p.armL : p.armR, spread = (L ? p.spreadL : p.spreadR) + REST_SPREAD, elbow = L ? p.elbowL : p.elbowR;
      rotZ(rotX(move(M[U].copy(M[CHEST]), 0, d.shoulderY, side * d.shoulderW), -side * spread), arm);
      rotZ(move(M[F].copy(M[U]), 0, -d.upper, 0), Math.max(0, elbow));
      move(M[Hd].copy(M[F]), 0, -d.fore, 0);
    }
    const straddle = p.straddle ?? 0;
    for (const side of [-1, 1]) {
      const L = side < 0, T = L ? THIGH_L : THIGH_R, Sh = L ? SHIN_L : SHIN_R, Ft = L ? FOOT_L : FOOT_R;
      const hip = L ? p.hipL : p.hipR, knee = L ? p.kneeL : p.kneeR, splay = SPLAY + straddle * 1.05;
      rotZ(rotX(move(M[T].copy(M[PELVIS]), 0, 0, side * d.legW), -side * splay), hip + th);
      rotZ(move(M[Sh].copy(M[T]), 0, -d.thigh, 0), -(knee + 2 * th));
      V1.set(0, -d.shin, 0).applyMatrix4(M[Sh]);
      const shinPitch = hip - knee - th;
      const off = upright ? Math.max(smooth(1.4 * d.ankle, 3 * d.ankle, V1.y - this.y), smooth(1.0, 1.5, -shinPitch)) : 1;
      M[Ft].copy(root).setPosition(V1);
      rotZ(rotX(M[Ft], -side * splay * 0.6), shinPitch * off);
    }
    this.capeBones(upright);
  }

  /** The cape: two halves of two pieces, hanging by their weight, streaming behind, and opening wide like wings. */
  private capeBones(upright: boolean): void {
    const c = this.look.cape;
    if (!c) return;
    const d = this.d, M = this.M, clock = this.kit.clock, f = clamp(this.streamF), sp = clamp(this.spreadF);
    const tails = c.kind === 'tails';
    const base = tails ? M[HIPS] : M[CHEST];
    // which way is down, and which way the wind of going comes from, in the base's own frame
    V1.setFromMatrixColumn(base, 0).normalize(); V2.setFromMatrixColumn(base, 1).normalize(); V3.setFromMatrixColumn(base, 2).normalize();
    // the wind of going comes from ahead, the way it heads, whatever its body is turned to
    V4.set(-Math.cos(this.h), -0.3, -Math.sin(this.h)).normalize();
    const gx = -V1.y, gy = -V2.y;
    const wx = V4.dot(V1), wy = V4.dot(V2);
    const hangAt = (k: number): number => {
      const x = mix(gx, wx, k), y = mix(gy, wy, k);
      return Math.atan2(-x, -y);
    };
    // how far back the thighs reach, which the cape must hang clear of
    let legBack = -1;
    for (const T of [THIGH_L, THIGH_R]) {
      V5.setFromMatrixColumn(M[T], 1).normalize();
      legBack = Math.max(legBack, Math.atan2(V5.dot(V1), V5.dot(V2)));
    }
    const flutter = (i: number, s: number): number => f * (0.07 + 0.07 * i) * Math.sin(clock * (6.5 + 1.3 * i) + i * 1.3 + this.seed + s);
    const kind = c.kind;
    if (kind === 'kite') {
      rotZ(move(M[CAPE_L1].copy(M[CHEST]), -1.05 * d.chestD - 0.04, 0.45 * d.chestH, 0), 0.15 + f * 0.6 + flutter(0, 0) * 0.3);
      this.S[CAPE_L1].z = 0.95 * (this.look.height / 2.5) * mix(1, 1.2, sp);
      return;
    }
    for (const s of [-1, 1]) {
      const b1 = s < 0 ? CAPE_L1 : CAPE_R1, b2 = s < 0 ? CAPE_L2 : CAPE_R2;
      if (kind === 'wings' || kind === 'moth') {
        // a wing from the back of the shoulder: folded, it hangs down behind; spread, it stands out to the side
        const m = move(M[b1].copy(M[CHEST]), -1.0 * d.chestD, 0.9 * d.chestH, s * 0.3 * d.chestW);
        rotY(m, -s * (0.25 + 0.55 * f - 0.2 * sp));
        if (s < 0) rotY(m, Math.PI);
        rotX(m, (1 - sp) * (Math.PI / 2 - 0.15) - sp * 0.2 + flutter(1, s) * 0.5);
        this.S[b1].set(1, this.capeLen[1], this.capeLen[0] * mix(0.6, 1, sp));
        continue;
      }
      const W = this.capeW, L1 = this.capeLen[0], L2 = this.capeLen[1];
      // spread wide, the cape is held out by the arms and streams less
      const held = tails ? 1 : 1 - 0.75 * sp;
      let phi1 = Math.max(tails ? 0.06 : 0.1, hangAt(f * 0.8 * held) + flutter(0, s) * 0.5);
      if (tails) phi1 = Math.max(phi1, legBack + 0.08);
      const ax = tails ? -1.0 * d.hipD : -1.0 * d.chestD, ay = tails ? 0.96 * d.hipsH : 0.96 * d.chestH;
      const spread = tails ? sp * 0.3 : sp * 1.15;
      const m1 = M[b1].copy(base);
      move(m1, ax, ay, 0);
      rotX(m1, -s * spread);
      move(m1, 0, 0, s * W * 0.5);
      rotZ(m1, -phi1);
      this.S[b1].set(tails ? 0.22 : 0.28, L1, W * (1 + sp * (tails ? 0.3 : 1.7)));
      if (tails) continue;
      let phi2 = Math.max(phi1 * 0.6, hangAt(f * held) + flutter(1, s), legBack + 0.1 - sp * 0.6);
      const m2 = M[b2];
      for (let tries = 0; tries < 10; tries++) {
        move(m2.copy(m1), 0, -L1, 0);
        rotZ(m2, -(phi2 - phi1));
        V5.set(0, -L2, 0).applyMatrix4(m2);
        if (!upright || V5.y > this.y + 0.05) break;
        phi2 += 0.14;
      }
      this.S[b2].set(0.28, L2, W * (1 + sp * 1.9));
    }
  }

  /** Works out the frames that what is carried is placed in. */
  private frames(): void {
    const d = this.d, M = this.M, F = this.F, k = this.sizeF;
    const fw = V1.setFromMatrixColumn(M[ROOT], 0).normalize().clone(), up = V2.setFromMatrixColumn(M[ROOT], 1).normalize().clone();
    const basis = (m: THREE.Matrix4, pos: THREE.Vector3, Y: THREE.Vector3): void => {
      const X = V3.copy(fw).addScaledVector(Y, -fw.dot(Y));
      if (X.lengthSq() < 1e-4) X.set(1, 0, 0);
      X.normalize();
      const Z = V4.crossVectors(X, Y);
      m.makeBasis(X, Y, Z).setPosition(pos).scale(V6.set(k, k, k));
    };
    F.gripR.copy(M[HAND_R]).multiply(TMP.makeTranslation(0, GRIP * d.hand, 0));
    F.gripL.copy(M[HAND_L]).multiply(TMP.makeTranslation(0, GRIP * d.hand, 0));
    F.fwdR.copy(F.gripR).multiply(TMP.makeRotationZ(-Math.PI / 2));
    const pR = new THREE.Vector3().setFromMatrixPosition(F.gripR), pL = new THREE.Vector3().setFromMatrixPosition(F.gripL);
    const hx = new THREE.Vector3().setFromMatrixColumn(M[HAND_R], 0).normalize();
    basis(F.upR, pR, new THREE.Vector3().copy(up).addScaledVector(hx, 0.35).normalize());
    basis(F.downR, pR, new THREE.Vector3().copy(up).negate().addScaledVector(hx, 0.15).normalize());
    basis(F.levelR, new THREE.Vector3().copy(pR).addScaledVector(up, 0.03 * k), up);
    basis(F.levelL, new THREE.Vector3().copy(pL).addScaledVector(up, 0.03 * k), up);
    basis(F.between, new THREE.Vector3().addVectors(pR, pL).multiplyScalar(0.5), up);
    basis(F.air, new THREE.Vector3().copy(pR).addScaledVector(up, (0.12 + 1.3 * this.outF) * (this.look.height / 2.5) * k), up);
    F.hipR.copy(M[HIPS]).multiply(TMP.makeTranslation(0.1 * d.hipD, 0.72 * d.hipsH, 1.08 * d.hipW));
    F.hipL.copy(M[HIPS]).multiply(TMP.makeTranslation(0.1 * d.hipD, 0.72 * d.hipsH, -1.08 * d.hipW));
    F.back.copy(M[CHEST]).multiply(TMP.makeTranslation(-1.05 * d.chestD, 0.5 * d.chestH, 0));
    F.chestF.copy(M[CHEST]).multiply(TMP.makeTranslation(1.05 * d.chestD, 0.5 * d.chestH, 0));
  }

  write(): void {
    this.wants();
    this.dirty = false;
    if (!this.isShown) return;
    this.bones();
    this.frames();
    const M = this.M, clock = this.kit.clock;
    for (const s of this.slots) {
      if (s.index < 0) continue;
      s.pool.matrices = true;
      if (s.place) {
        s.place(M1);
      } else {
        M1.copy(M[s.bone]);
        if (s.off) M1.multiply(TMP.makeTranslation(s.off.x, s.off.y, s.off.z));
        if (s.rot) M1.multiply(TMP.makeRotationFromQuaternion(s.rot));
        M1.scale(s.scale);
      }
      if (s.pool.name === 'flame') M1.scale(V1.set(1, 0.4 + 0.6 * this.glowF * (0.85 + 0.15 * Math.sin(clock * 37 + this.seed)), 1));
      s.pool.mesh.setMatrixAt(s.index, M1);
    }
  }
}

/** Lays a rod's copy from one point to another, `r` thick. */
function barTo(m: THREE.Matrix4, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
  const dir = V3.copy(b).sub(a), len = Math.max(1e-3, dir.length());
  Q1.setFromUnitVectors(UP, dir.divideScalar(len));
  m.compose(a, Q1, V4.set(r, len, r));
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

function kitFor(k: Build): Kit & { pools: Map<string, Pool>; glow: THREE.MeshBasicMaterial; added: THREE.MeshBasicMaterial } {
  const paint = k.mat.vehicle();
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const added = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pools = new Map<string, Pool>();
  return {
    pools, glow, added, clock: 0,
    pool(name: string): Pool {
      let p = pools.get(name);
      if (!p) {
        const make = SHAPES[name];
        if (!make) throw new Error(`Gotham: no figure part ${name}`);
        const isGlow = GLOWS.has(name), isAdded = ADDED.has(name);
        p = new Pool(k.group, name, make().build(), isAdded ? added : isGlow ? glow : paint, isGlow || isAdded);
        if (isAdded) p.mesh.renderOrder = 3;
        pools.set(name, p);
      }
      return p;
    },
  };
}

/** Builds the meshes every figure is drawn from, and hands back the cast. */
export function buildCast(k: Build): Cast {
  const kit = kitFor(k);
  const figs: Fig[] = [];
  let seed = 0;
  k.each((dt, _time, night) => {
    kit.clock += dt;
    kit.glow.color.setScalar(1.0 + 1.2 * night);
    kit.added.color.setScalar(1.0 + 1.4 * night);
  });
  const cast: Cast = {
    add(look: Look): Figure {
      const f = new Fig(look, kit, (seed++ * 2.39996) % TAU);
      figs.push(f);
      return f;
    },
    commit() {
      for (const f of figs) if (f.dirty || f.live) f.write();
      for (const p of kit.pools.values()) p.flush();
    },
    triangles: () => {
      const shown = figs.filter((f) => f.triangles > 0);
      return shown.length ? Math.round(shown.reduce((n, f) => n + f.triangles, 0) / shown.length) : 0;
    },
  };
  if (import.meta.env.DEV) devTools(cast, kit.pools, () => figs);
  return cast;
}

// ---------------------------------------------------------------------------
// For checking, on the development server: window.gothamCast
// ---------------------------------------------------------------------------
//
// gothamCast.parade() stands every named look and every extra in two rows
// along the docks' apron (rows at z 33.6 and 36.2, from x 48 eastwards,
// facing south, on y 0) and shows them; parade('rogues') and the like stand a
// group alone, 1.9 apart. pose(name, t) gives them all one pose by its name;
// capes, hold, lie, glow and size set them all; turn(heading) turns them;
// clear() hides them. costs() says what they cost.

const POSES: Record<string, (t: number) => Partial<Pose>> = { walk, run, waddle, leap, perch, swing, glide, fly, strike, parry, lunge, bow, salute, kneel, sit, point, shrug, laugh, toss, caught, carry, push, climb, swim, row, drive, hang, star, idle };
const GROUPS: Record<string, string[]> = {
  family: ['batman', 'robin', 'damian', 'nightwing', 'redHood', 'batgirl', 'batwoman', 'alfred', 'huntress', 'azrael', 'spoiler', 'orphan', 'signal', 'batMite'],
  city: ['gordon', 'bullock', 'montoya', 'lucius', 'leslie', 'vicki'],
  rogues: ['joker', 'harley', 'penguin', 'catwoman', 'riddler', 'twoFace', 'ivy', 'freeze', 'scarecrow', 'bane', 'croc', 'manBat', 'langstrom', 'clayface', 'ras', 'talia'],
  more: ['killerMoth', 'madHatter', 'kiteMan', 'hush', 'deathstroke', 'blackMask', 'talon', 'firefly', 'ventriloquist', 'grundy', 'calendarMan', 'hugoStrange', 'tweedledum', 'tweedledee', 'polkaDotMan'],
  league: ['superman', 'wonderWoman', 'flash', 'greenLantern', 'aquaman', 'martianManhunter'],
  three: ['batman', 'penguin', 'bane'],
  must: ['batman', 'robin', 'joker', 'penguin', 'catwoman', 'riddler', 'twoFace', 'ivy', 'freeze', 'harley', 'bane', 'superman', 'wonderWoman', 'flash'],
};

interface Marcher { name: string; f: Figure; x: number; z: number }

function devTools(cast: Cast, pools: Map<string, Pool>, figs: () => Fig[]): void {
  const made = new Map<string, Figure>();
  let line: Marcher[] = [];
  let floor = 0;
  const ROWS = [33.6, 36.2], X0 = 48, X1 = 103;
  const lookOf = (n: string): Look => (n in LOOKS ? LOOKS[n as CastId] : EXTRAS[n as ExtraKind]);
  const figOf = (n: string): Figure => { let f = made.get(n); if (!f) { f = cast.add(lookOf(n)); made.set(n, f); } return f; };
  const tools = {
    /** Stands a group (or everyone, with the extras) in two rows on the apron. */
    parade(group = 'all', dz = 0, y = 0, rowGap = 2.6, gapX = 1.9): string {
      for (const m of line) m.f.shown(false);
      const names = group === 'all' ? [...Object.keys(LOOKS), ...Object.keys(EXTRAS)] : group === 'extras' ? Object.keys(EXTRAS) : GROUPS[group] ?? [];
      const per = rowGap > 0 ? Math.ceil(names.length / 2) : names.length, gap = Math.min(gapX, (X1 - X0) / Math.max(1, per - 1));
      floor = y;
      line = names.map((name, i) => {
        const row = i < per ? 0 : 1, x = X0 + (row ? i - per + 0.5 : i) * gap, z = ROWS[0] + row * rowGap + dz;
        const f = figOf(name);
        f.at(x, y, z, Math.PI / 2); f.lie(0, 0); f.pose({}); f.hold(0); f.cape(0, 0); f.glow(0); f.size(1); f.shown(true);
        return { name, f, x, z };
      });
      return `${line.length} figures, ${gap.toFixed(2)} apart, x ${X0} to ${(X0 + (per - 1) * gap).toFixed(1)}, rows at z ${ROWS[0] + dz} and ${ROWS[0] + rowGap + dz}, on y ${y}`;
    },
    pose(name: string | null, t = 0.5): string {
      const fn = name ? POSES[name] : undefined;
      for (const m of line) m.f.pose(fn ? fn(t) : {});
      return fn ? `${name} at ${t}` : 'standing';
    },
    capes(stream: number, spread = 0): void { for (const m of line) m.f.cape(stream, spread); },
    hold(out: number, spin = 0): void { for (const m of line) m.f.hold(out, spin); },
    lie(pitch: number, roll = 0): void { for (const m of line) m.f.lie(pitch, roll); },
    glow(f: number): void { for (const m of line) m.f.glow(f); },
    size(s: number): void { for (const m of line) m.f.size(s); },
    turn(heading: number): void { for (const m of line) m.f.at(m.x, floor, m.z, heading); },
    /** Lifts them all off the ground by `y`, for poses in the air. */
    lift(y: number): void { for (const m of line) m.f.at(m.x, floor + y, m.z, Math.PI / 2); },
    clear(): void { for (const m of line) m.f.shown(false); line = []; },
    where(name: string): [number, number, number] | null {
      const m = line.find((l) => l.name === name);
      return m ? [m.x, floor + m.f.look.height / 2, m.z] : null;
    },
    /** What they cost now: the triangles of each, on average and in all, and the draw calls. */
    costs(): { figures: Record<string, number>; average: number; total: number; meshes: number; kinds: number } {
      const figures: Record<string, number> = {};
      let total = 0;
      for (const f of figs()) { const t = f.triangles; if (t > 0) { figures[f.look.name] = t; total += t; } }
      return { figures, average: cast.triangles(), total, meshes: [...pools.values()].filter((p) => p.mesh.visible).length, kinds: pools.size };
    },
    LOOKS, EXTRAS, GROUPS,
  };
  (window as unknown as { gothamCast: object }).gothamCast = tools;
}
