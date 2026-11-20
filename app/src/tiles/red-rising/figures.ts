// The cast of the Iron Rain, and the soldiers about them: figures at the size
// of the tile's people, made recognisable by their colours, armour, cloaks,
// hair and weapons, and by the books' sizes, so that the Obsidians are giants.
// Every figure is drawn from a handful of shared parts, each part one
// instanced mesh for every figure that wears it, so that a hundred figures
// cost a handful of draw calls. The show (show.ts) stands them, poses them
// and moves them; this file only gives them their looks and their bodies.
//
// A figure is a toy's body on a simple skeleton: hips, chest and head; upper
// arms, forearms and hands; thighs, shins and feet. A pose turns its joints;
// a crouch sinks its hips and bends its knees by itself, so that its feet stay
// on the ground. What it wears rides its bones: hair and helms on the head, a
// cloak in three pieces from the shoulders that hang by their own weight and
// stream out behind, a razor coiled round the right forearm, loose as a whip,
// or rigid as a blade. Its gravBoots burn under its feet when it flies.
//
// The looks are the books', as section 3 of the research gives them
// (docs/districts/research/red-rising.md); where the books are silent, a look
// is this file's own drawing, and the comment on each look says which.

import * as THREE from 'three';
import type { Build } from '../../engine/tile';
import { AUGUSTUS_RED, BELLONA_BLUE, BELLONA_SILVER, PRAETORIAN } from './look';

// ---------------------------------------------------------------------------
// What a figure looks like
// ---------------------------------------------------------------------------

export type Hair = 'short' | 'curly' | 'mohawk' | 'lock' | 'braid' | 'long' | 'streaming' | 'bald' | 'halfShaved' | 'cropped';
export type Helm = 'none' | 'rageWolf' | 'morningSun' | 'protean' | 'wind' | 'praetorian' | 'gray' | 'obsidian' | 'scarab' | 'bellona';
export type Arms = 'none' | 'razor' | 'twoRazors' | 'ionBlades' | 'bow' | 'sceptre' | 'pulseFist' | 'rifle' | 'bread' | 'spear';
export type Mark = 'peerlessScar' | 'skullHand' | 'faceTattoos' | 'wingTattoo' | 'eyelidEyes' | 'noseBar' | 'stump' | 'angelTattoos' | 'redSlingBlade' | 'seaSerpents' | 'lion' | 'griffin' | 'pyramid' | 'swanWings' | 'burningHeart' | 'bionicEye' | 'blueTattoos';

export interface Look {
  /** Who it is, for the console and the checks. */
  name: string;
  /** How tall, to the top of the head, in units: one of the tile's people is 2.3, a Gold 2.6 to 2.9, an Obsidian 3.2 to 3.5, a Red 2.1. */
  height: number;
  /** How broad for its height: 0.85 slight, 1 a Gold, 1.25 an Obsidian, 1.4 Ragnar or Karnus. */
  build: number;
  skin: number;
  hair: number;
  hairStyle: Hair;
  beard?: 'grey' | 'forkedRed' | 'stubble';
  /** What covers the body: armour or clothes. `body` the chest and back, `limbs` the arms and legs, `trim` the edges, plates and belts. */
  body: number;
  limbs: number;
  trim: number;
  /** A helm, and whether it is worn now (a figure may take it off in a story; a recognisable face shows best without one). */
  helm: Helm;
  helmOn: boolean;
  cloak?: { color: number; kind: 'wolf' | 'plain' | 'long' | 'pyramid' };
  arms: Arms;
  marks?: Mark[];
  /** A long robe to the feet in place of armoured legs: the Sovereign. */
  robe?: boolean;
  /** A paunch: Fitchner. */
  paunch?: boolean;
  /** Plates on the shoulders, gauntlets and boots in the trim's colour: armour, unless this says no. Clothes have bare hands and plain boots. */
  armour?: boolean;
  /** A left arm of a colour of its own: Thraxa's, of unpolished asteroid metal. */
  leftArm?: number;
  /** How large the hair stands, 1 as drawn: Clown's puffs out further. */
  hairScale?: number;
  /** Something worn in the hair, in this colour: Thraxa's garland of white feathers. */
  garland?: number;
  /** The razor's colour: steel, unless this says otherwise (Darrow's is bone-white). */
  razorColor?: number;
  /** The razor's shape when it is rigid: a curved sabre, or the half-moon of a slingBlade (Darrow's). */
  blade?: 'sabre' | 'sling';
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
  /** Each arm swings forward (positive) from the shoulder, up to straight overhead at about 3; out to the side (positive); and its elbow bends. With an arm out to the side at about 1.57, its swing turns it level from the side to straight ahead. */
  armL: number;
  armR: number;
  spreadL: number;
  spreadR: number;
  elbowL: number;
  elbowR: number;
  /** How far the whole figure sinks, as in a crouch, a kneel or the moment before a leap: 0 to 1. The hips sink by up to half the legs' length and the knees bend by themselves to keep the feet on the ground; at 1 the thighs are level, as in sitting. */
  crouch: number;
  /** The legs spread apart sideways, as astride a griffin: 0 to 1. */
  straddle?: number;
}

export const STANDING: Pose = { lean: 0, tilt: 0, twist: 0, head: 0, nod: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, spreadL: 0, spreadR: 0, elbowL: 0, elbowR: 0, crouch: 0, straddle: 0 };

/** A figure on the tile, which the show moves and poses. */
export interface Figure {
  readonly look: Look;
  /** Stands it with its feet on whatever is at height `y`, at (x, z), facing `heading` (radians: 0 east, a quarter turn south). */
  at(x: number, y: number, z: number, heading: number): void;
  /** Poses it. What is left out is as in STANDING. */
  pose(p: Partial<Pose>): void;
  /** A razor: coiled round the forearm, loose as a whip, or rigid as a blade; and a flash where it rings against another, from 0 to 1. Ragnar's ionBlades take 'blade' or 'coiled' (sheathed). */
  razor(state: 'coiled' | 'whip' | 'blade', flash?: number): void;
  /** The flame of its gravBoots under its feet, from 0 off to 1 full, for flying and leaping. */
  boots(f: number): void;
  /** Its cloak, from 0 hanging still to 1 streaming out behind. */
  cloak(f: number): void;
  /** Its helm on or off. */
  helm(on: boolean): void;
  /** Shown, or hidden. */
  shown(v: boolean): void;
}

/** Everyone on the tile: the cast, and the soldiers about them. */
export interface Cast {
  /** A figure with this look, standing nowhere until it is put somewhere. */
  add(look: Look): Figure;
  /** Called once a frame, after posing: writes what changed into the meshes. */
  commit(): void;
  /** How many triangles one figure of a look costs, for the console: on average, over the figures there are. */
  triangles(): number;
}

// ---------------------------------------------------------------------------
// The looks, from the books (docs/districts/research/red-rising.md, section 3)
// ---------------------------------------------------------------------------

export type CastId =
  | 'darrow' | 'sovereign' | 'aja' | 'lorn' | 'alexandar' | 'boyAlexandar' | 'sevro' | 'ragnar'
  | 'mustang' | 'cassius' | 'jackal' | 'fitchner' | 'karnus' | 'kavax' | 'sefi' | 'windKnight'
  | 'clown' | 'pebble' | 'screwface' | 'holiday' | 'thraxa' | 'lysander' | 'atalantia' | 'victra' | 'daxo';

/** Skins and hair, and the metals. */
const GOLD_SKIN = 0xf0c8a0, TAN = 0xe2b289, PALE = 0xebdccd, FAIR = 0xf4dcc4;
const GOLD_HAIR = 0xe2ba4c, WHITE_HAIR = 0xf6f2e8;
const STEEL = 0xd4dae0, BONE = 0xf2ead6, GILT = 0xd4a63a;
/** The Howlers: pitch-black scarabSkin under grey wolf cloaks. */
const SCARAB = 0x1e1f23, SCARAB_LIMB = 0x18191c, WOLF = 0x8b867e;
/** House Telemanus, which the books give no colours: this file's own green and bronze. */
const TELEMANUS = 0x2f5b3e, TELEMANUS_LIMB = 0x284e35, BRONZE = 0xa67c3c;

/** The look of every named figure. */
export const LOOKS: Record<CastId, Look> = {
  // Large and tall even for a Gold, broad in the chest, golden hair; pulseArmor painted blood red; the skull of his blood
  // brotherhood with Ragnar on his right hand [all uncited]. Virginia's bone-white razor, set to a slingBlade's curve
  // (GS 1, 18, 28; MS 3; RR 1, 2). The wolf cloak he lends Alexandar (DA). The trim's dark iron is this file's.
  darrow: { name: 'Darrow, the Reaper', height: 2.95, build: 1.15, skin: TAN, hair: 0xdfb345, hairStyle: 'short', body: 0xa8181b, limbs: 0x8e1417, trim: 0x2e2628, helm: 'none', helmOn: false, cloak: { color: WOLF, kind: 'wolf' }, arms: 'razor', marks: ['skullHand'], razorColor: BONE, blade: 'sling' },
  // An ageless face with the Peerless scar along the right cheekbone (RR 2, 5); the Dawn Scepter, a metre of gold and iron
  // tipped with the Society's pyramid (DA 30, 31). Her clothes are silent: an ivory robe with gold, and a long cloak in
  // her Praetorians' purple, are this file's.
  sovereign: { name: 'Octavia au Lune, the Sovereign', height: 2.65, build: 0.92, skin: 0xf3d6b8, hair: 0xe9c96c, hairStyle: 'long', body: 0xf4eee2, limbs: 0xefe7d8, trim: GILT, helm: 'none', helmOn: false, cloak: { color: 0x40204e, kind: 'long' }, arms: 'sceptre', marks: ['peerlessScar'], robe: true, armour: false },
  // Tall and powerful, dark skin [uncited]; the Protean Knight's armour of gold and midnight blue with blue sea serpents
  // [uncited]; the knights' cloak with the pyramid (RR 17); a razor (MS 2). Her hair is silent: cropped and black is mine.
  aja: { name: 'Aja au Grimmus, the Protean Knight', height: 2.95, build: 1.12, skin: 0x6c4632, hair: 0x1d1714, hairStyle: 'cropped', body: 0xcda33c, limbs: 0x1f2648, trim: 0xcda33c, helm: 'protean', helmOn: false, cloak: { color: 0x1f2648, kind: 'pyramid' }, arms: 'razor', marks: ['seaSerpents'] },
  // Grizzled, grey-haired and bearded, shorter than Darrow but broad [uncited]; plain dark armour, the griffin of House
  // Arcos [uncited] on his cloak. The cloak's slate blue and the griffin's pale gold are mine.
  lorn: { name: 'Lorn au Arcos', height: 2.6, build: 1.22, skin: 0xdcae8c, hair: 0xa8a6a0, hairStyle: 'short', beard: 'grey', body: 0x3c3f45, limbs: 0x34373c, trim: 0x6c7076, helm: 'none', helmOn: false, cloak: { color: 0x2d4250, kind: 'plain' }, arms: 'razor', marks: ['griffin'] },
  // Tall and thin, white-blond hair that streams behind him like a comet's tail, fair skin (IG 16, 27); Darrow's wolf
  // cloak (DA), worn here as the scene's liberty. His armour's steel grey is mine.
  alexandar: { name: 'Alexandar au Arcos', height: 2.9, build: 0.86, skin: FAIR, hair: WHITE_HAIR, hairStyle: 'streaming', body: 0x8f9aa8, limbs: 0x707a88, trim: 0x3c434c, helm: 'none', helmOn: false, cloak: { color: WOLF, kind: 'wolf' }, arms: 'razor' },
  // The boy who watched Lorn teach Darrow, with his sister's hazelnut bread (IG 45). His clothes are mine.
  boyAlexandar: { name: 'Alexandar au Arcos, a boy', height: 1.4, build: 0.85, skin: FAIR, hair: WHITE_HAIR, hairStyle: 'short', body: 0x4f7bab, limbs: 0x6a5846, trim: 0x3a2e24, helm: 'none', helmOn: false, arms: 'bread', armour: false },
  // Short for a Gold (RR 16; GS 17); most of his hair shaved and the rest a mohawk (GS 17; MS 9; DA 27); a bionic eye
  // (GS 17); the wolf pelt (RR 23); the Peerless scar [uncited]; the skull on his right hand. The Howlers' black scarabSkin
  // [uncited]; which eye is bionic is mine.
  sevro: { name: 'Sevro au Barca, the Goblin', height: 2.35, build: 0.92, skin: 0xe8c09a, hair: 0xd8ae48, hairStyle: 'mohawk', body: SCARAB, limbs: SCARAB_LIMB, trim: 0x55514c, helm: 'scarab', helmOn: false, cloak: { color: 0x857d72, kind: 'wolf' }, arms: 'razor', marks: ['bionicEye', 'peerlessScar', 'skullHand'] },
  // Eight feet (MS 9, 29): the largest of all. His head shaved but for a metre-long white lock, his face tattooed;
  // bone-white pulseArmor with a red slingBlade, and two white ionBlades built into it [all uncited]. Pale skin is mine.
  ragnar: { name: 'Ragnar Volarus, the Stained', height: 3.5, build: 1.4, skin: 0xead8c6, hair: 0xfdfcf8, hairStyle: 'lock', body: 0xe6dccb, limbs: 0xd8cebd, trim: 0x8f8b84, helm: 'none', helmOn: false, arms: 'ionBlades', marks: ['faceTattoos', 'redSlingBlade', 'skullHand'] },
  // Long golden hair, braided (RR 14, 26), golden eyes (RR 31); a bow (MS 29). Her armour is silent: ivory with gold, a
  // cloak in House Augustus's red, and its gold lion on her breast, are mine.
  mustang: { name: 'Virginia au Augustus, Mustang', height: 2.6, build: 0.9, skin: 0xf2cfa8, hair: 0xf2ca58, hairStyle: 'braid', body: 0xeee2c4, limbs: 0xd8c8a2, trim: 0xc99a34, helm: 'none', helmOn: false, cloak: { color: AUGUSTUS_RED, kind: 'plain' }, arms: 'bow', marks: ['lion'] },
  // The perfect Gold: thick curly golden hair, powerfully built (RR 15); the Morning Knight's white armour and a helm
  // crested by a rising golden sun [uncited]; the knights' cloak (RR 17) in the Bellona blue (GS 38).
  cassius: { name: 'Cassius au Bellona, the Morning Knight', height: 2.85, build: 1.08, skin: GOLD_SKIN, hair: GOLD_HAIR, hairStyle: 'curly', body: 0xf5f2ea, limbs: 0xe6e2da, trim: 0xd8ae44, helm: 'morningSun', helmOn: true, cloak: { color: BELLONA_BLUE, kind: 'pyramid' }, arms: 'razor' },
  // Small and unusually skinny for a Gold, slightly oily blond hair, a stump where he sawed off his hand [uncited]: which
  // hand is not given, and the left is mine. His dark clothes with gold are mine.
  jackal: { name: 'Adrius au Augustus, the Jackal', height: 2.4, build: 0.78, skin: 0xefcaa6, hair: 0xc4a252, hairStyle: 'short', body: 0x2a2a30, limbs: 0x222227, trim: 0xc59a3a, helm: 'none', helmOn: false, arms: 'none', marks: ['stump'], armour: false },
  // Flaxen-brown hair, a hatchet face and a paunch; the Rage Knight in 742, in its dark red armour with the laughing
  // wolf's helm [uncited]; a pulseFist (GS 42). The knights' cloak (RR 17); its black is mine.
  fitchner: { name: 'Fitchner au Barca, the Rage Knight', height: 2.55, build: 1.05, skin: 0xe2b48c, hair: 0xa8804a, hairStyle: 'short', body: 0x7c1c1a, limbs: 0x6a1917, trim: 0x2e2422, helm: 'rageWolf', helmOn: true, cloak: { color: 0x1f1c1d, kind: 'pyramid' }, arms: 'pulseFist', paunch: true },
  // Like an Obsidian in all but colour, shoulders twice as broad as Darrow's [uncited]; the Bellona blue and silver.
  karnus: { name: 'Karnus au Bellona', height: 3.2, build: 1.42, skin: GOLD_SKIN, hair: 0xd9b04a, hairStyle: 'cropped', body: BELLONA_BLUE, limbs: 0x264a8c, trim: BELLONA_SILVER, helm: 'bellona', helmOn: false, arms: 'razor' },
  // A giant with a shaved head and a forked beard dyed red [uncited]; his fox Sophocles (GS 33) is buildFox's. House
  // Telemanus's green and bronze are mine.
  kavax: { name: 'Kavax au Telemanus', height: 3.2, build: 1.36, skin: 0xe8c29e, hair: 0xc23b1c, hairStyle: 'bald', beard: 'forkedRed', body: TELEMANUS, limbs: TELEMANUS_LIMB, trim: BRONZE, helm: 'none', helmOn: false, arms: 'razor' },
  // Slightly taller than Darrow; the left side of her head shaved with a blue wing tattoo, the right long, white and
  // braided; an iron bar through her nose; eyes tattooed on her eyelids (MS 30). Her pale furs, cloak and spear are mine.
  sefi: { name: 'Sefi Volarus, Queen of the Valkyrie', height: 3.1, build: 1.12, skin: 0xeedccb, hair: WHITE_HAIR, hairStyle: 'halfShaved', body: 0xdcd5c8, limbs: 0x5c4a3a, trim: 0x34548a, helm: 'none', helmOn: false, cloak: { color: 0xe4ddd0, kind: 'plain' }, arms: 'spear', marks: ['wingTattoo', 'noseBar', 'eyelidEyes'], armour: false },
  // The books are silent: a knight in pale grey-blue, with a helm swept back like the wind, is this file's.
  windKnight: { name: 'The Wind Knight', height: 2.8, build: 1.0, skin: GOLD_SKIN, hair: 0xd8b04a, hairStyle: 'cropped', body: 0xa8bccb, limbs: 0x91a5b7, trim: 0xdfe7ee, helm: 'wind', helmOn: true, cloak: { color: 0xc7d5e1, kind: 'pyramid' }, arms: 'razor' },
  // Howlers in wolf cloaks over scarabSkin [uncited]: Clown with his puffy hair, Pebble small, Screwface plain-faced (RR 18).
  clown: { name: 'Clown', height: 2.7, build: 1.0, skin: 0xefc6a0, hair: 0xe6c25a, hairStyle: 'curly', hairScale: 1.4, body: SCARAB, limbs: SCARAB_LIMB, trim: 0x3a3c40, helm: 'scarab', helmOn: false, cloak: { color: WOLF, kind: 'wolf' }, arms: 'razor' },
  pebble: { name: 'Pebble', height: 2.42, build: 1.16, skin: 0xf0c6a2, hair: 0xd9b452, hairStyle: 'short', body: SCARAB, limbs: SCARAB_LIMB, trim: 0x3a3c40, helm: 'scarab', helmOn: false, cloak: { color: 0x908a80, kind: 'wolf' }, arms: 'razor' },
  screwface: { name: 'Screwface', height: 2.75, build: 1.02, skin: 0xe6b994, hair: 0xc9a24c, hairStyle: 'cropped', body: SCARAB, limbs: SCARAB_LIMB, trim: 0x3a3c40, helm: 'scarab', helmOn: false, cloak: { color: 0x837d74, kind: 'wolf' }, arms: 'razor' },
  // Short and heavily built like a boxer, one bionic eye [uncited]; a Gray's uniform and rifle, and which eye, are mine.
  holiday: { name: 'Holiday ti Nakamura', height: 2.1, build: 1.3, skin: 0xd2a07c, hair: 0x6e6c6a, hairStyle: 'cropped', body: 0x5f666f, limbs: 0x4f555d, trim: 0x2e3238, helm: 'none', helmOn: false, arms: 'rifle', marks: ['bionicEye'] },
  // Wild gold hair garlanded with white feathers, stout, a left arm of unpolished asteroid metal (IG 1; DA 7). Telemanus
  // green is mine.
  thraxa: { name: 'Thraxa au Telemanus', height: 2.7, build: 1.18, skin: 0xf0c49e, hair: 0xe8c04a, hairStyle: 'curly', hairScale: 1.2, garland: 0xfbfaf6, body: TELEMANUS, limbs: TELEMANUS_LIMB, trim: BRONZE, leftArm: 0x8a857c, helm: 'none', helmOn: false, arms: 'razor' },
  // Golden hair, lean and tall [uncited]. The Praetorians' purple and black, whom he leads in LB 23, are mine for him.
  lysander: { name: 'Lysander au Lune', height: 2.8, build: 0.9, skin: 0xf2d0ac, hair: 0xecca62, hairStyle: 'short', body: PRAETORIAN, limbs: 0x231f27, trim: GILT, helm: 'praetorian', helmOn: false, cloak: { color: 0x1c1a1f, kind: 'long' }, arms: 'razor' },
  // Looks no older than twenty-five in her late forties (DA 6); the rest is silent: black and gold armour, long gold
  // hair and a cloak in her sister's midnight blue are mine.
  atalantia: { name: 'Atalantia au Grimmus', height: 2.7, build: 1.0, skin: 0xe8bf98, hair: 0xdcb44e, hairStyle: 'long', body: 0x26262c, limbs: 0x1f1f24, trim: GILT, helm: 'none', helmOn: false, cloak: { color: 0x1f2648, kind: 'long' }, arms: 'razor' },
  // Taller and heavier than her half-sister, jagged hair, the Peerless mark among her scars, jade, and a liking for
  // green (GS 23).
  victra: { name: 'Victra au Julii', height: 2.75, build: 1.15, skin: 0xefc8a2, hair: 0xd6ac4a, hairStyle: 'cropped', body: 0x2f7d5c, limbs: 0x27634b, trim: 0x9fd6b8, helm: 'none', helmOn: false, arms: 'razor', marks: ['peerlessScar'] },
  // Very tall and thin, with golden angels tattooed over his bald head and down his spine (DA 31).
  daxo: { name: 'Daxo au Telemanus', height: 3.1, build: 0.92, skin: 0xe9c29c, hair: 0xd8b04a, hairStyle: 'bald', body: TELEMANUS, limbs: TELEMANUS_LIMB, trim: BRONZE, helm: 'none', helmOn: false, arms: 'razor', marks: ['angelTattoos'] },
};

/** The looks of the soldiers about them, by kind. */
export type SoldierKind = 'gray' | 'augustanGray' | 'praetorian' | 'bellona' | 'obsidian' | 'howler' | 'valkyrie' | 'sonsOfAres' | 'lornsMan';
export const SOLDIERS: Record<SoldierKind, Look> = {
  // The Society's Grays, in grey (the caste's colour); their helm and rifle are mine.
  gray: { name: 'a Gray', height: 2.3, build: 1.0, skin: 0xd8ae8c, hair: 0x8a8a88, hairStyle: 'cropped', body: 0x7a8088, limbs: 0x686d74, trim: 0x34373c, helm: 'gray', helmOn: true, arms: 'rifle' },
  // The Augustan column's Grays: grey, with House Augustus's red and its gold lion (mine).
  augustanGray: { name: 'an Augustan Gray', height: 2.3, build: 1.0, skin: 0xd8ae8c, hair: 0x8a8a88, hairStyle: 'cropped', body: 0x7a8088, limbs: 0x686d74, trim: AUGUSTUS_RED, helm: 'gray', helmOn: true, arms: 'rifle', marks: ['lion'] },
  // The Praetorians in purple and black (GS 11); their crested helms and short black cloaks are mine.
  praetorian: { name: 'a Praetorian', height: 2.55, build: 1.05, skin: GOLD_SKIN, hair: GOLD_HAIR, hairStyle: 'cropped', body: PRAETORIAN, limbs: 0x1e1b21, trim: 0x141216, helm: 'praetorian', helmOn: true, cloak: { color: 0x1a181c, kind: 'plain' }, arms: 'razor' },
  // The Bellona blue and silver (GS 38); the helm is mine.
  bellona: { name: 'a Bellona', height: 2.65, build: 1.05, skin: GOLD_SKIN, hair: GOLD_HAIR, hairStyle: 'cropped', body: BELLONA_BLUE, limbs: 0x264a8c, trim: BELLONA_SILVER, helm: 'bellona', helmOn: true, arms: 'razor' },
  // Ragnar's Obsidians: giants, in dark armour, with pale braided hair (the braid and helm are mine).
  obsidian: { name: 'an Obsidian', height: 3.3, build: 1.3, skin: 0xe6d6c6, hair: 0xf0ece2, hairStyle: 'braid', body: 0x2e2c2c, limbs: 0x262424, trim: 0x5c5654, helm: 'obsidian', helmOn: false, arms: 'razor' },
  // A Howler: a wolf cloak over pitch-black scarabSkin, its helm a demon's face with empty insect eyes [uncited].
  howler: { name: 'a Howler', height: 2.75, build: 1.0, skin: GOLD_SKIN, hair: GOLD_HAIR, hairStyle: 'short', body: SCARAB, limbs: SCARAB_LIMB, trim: 0x34363a, helm: 'scarab', helmOn: true, cloak: { color: WOLF, kind: 'wolf' }, arms: 'razor' },
  // Obsidian women with white braids, who ride griffins (MS 29, 30); their furs and spears are mine.
  valkyrie: { name: 'a Valkyrie', height: 3.1, build: 1.12, skin: 0xead8c6, hair: 0xf2f0ea, hairStyle: 'braid', body: 0xd8d0c2, limbs: 0x5c4a3a, trim: 0x34548a, helm: 'none', helmOn: false, cloak: { color: 0xe0d9cc, kind: 'plain' }, arms: 'spear', armour: false },
  // Reds, small, red-haired, in working clothes; the rust coveralls are mine.
  sonsOfAres: { name: 'a Son of Ares', height: 2.1, build: 1.0, skin: 0xe9b496, hair: 0xb2361c, hairStyle: 'short', body: 0x7a5236, limbs: 0x5e4430, trim: 0x3a2c22, helm: 'none', helmOn: false, arms: 'none', armour: false },
  // Lorn's force: silent. Plain dark armour like his, his griffin on slate-blue cloaks, and soldiers' helms, are mine.
  lornsMan: { name: "one of Lorn's men", height: 2.55, build: 1.05, skin: 0xdcae8c, hair: 0x6a5a4a, hairStyle: 'cropped', body: 0x3c3f45, limbs: 0x34373c, trim: 0x6c7076, helm: 'gray', helmOn: true, cloak: { color: 0x2d4250, kind: 'plain' }, arms: 'razor', marks: ['griffin'] },
};

// ---------------------------------------------------------------------------
// Poses for the show to use, each at a moment of its own cycle or action
// ---------------------------------------------------------------------------
//
// Each takes how far through it is, from 0 to 1 (a cycle repeats), and gives a
// pose. The show blends them. A strike and a parry begin and end in the guard,
// guard(0), so that a fight can run one into the next; a cycle ends as it
// began. Each is big and clear, as a toy's would be, to be read from across
// the table.

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

/** On guard: knees a little bent, the left foot forward, the weapon hand up before the chest. */
const READY: Partial<Pose> = { crouch: 0.12, lean: 0.06, hipL: 0.16, hipR: -0.1, kneeL: 0.06, armL: 0.3, spreadL: 0.12, elbowL: 0.8, armR: 0.5, spreadR: 0.12, elbowR: 1.15 };
/** At ease: hands behind the back. */
const AT_EASE: Partial<Pose> = { armL: -0.32, spreadL: 0.12, elbowL: 1.05, armR: -0.32, spreadR: 0.12, elbowR: 1.05, lean: -0.02, nod: 0.04 };

export const walk = (phase: number): Partial<Pose> => {
  const a = phase * TAU, s = Math.sin(a), c = Math.cos(a);
  return {
    hipL: 0.42 * s, hipR: -0.42 * s, kneeL: 0.08 + 0.55 * Math.max(0, c), kneeR: 0.08 + 0.55 * Math.max(0, -c),
    armL: -0.38 * s, armR: 0.38 * s, elbowL: 0.32 + 0.14 * Math.max(0, -s), elbowR: 0.32 + 0.14 * Math.max(0, s), spreadL: 0.04, spreadR: 0.04,
    lean: 0.05, twist: 0.08 * s, crouch: 0.03 + 0.03 * s * s, nod: 0.03,
  };
};
export const run = (phase: number): Partial<Pose> => {
  const a = phase * TAU, s = Math.sin(a), c = Math.cos(a);
  return {
    hipL: 0.72 * s + 0.12, hipR: -0.72 * s + 0.12, kneeL: 0.25 + 1.3 * Math.max(0, c), kneeR: 0.25 + 1.3 * Math.max(0, -c),
    armL: -0.78 * s, armR: 0.78 * s, elbowL: 1.4, elbowR: 1.4, spreadL: 0.12, spreadR: 0.12,
    lean: 0.32, twist: 0.16 * s, crouch: 0.1 + 0.06 * Math.abs(c), nod: -0.16,
  };
};
/** A leap on gravBoots: crouch, spring, tuck in the air, land. */
export const leap = (t: number): Partial<Pose> => keyed(t, [
  [0, {}],
  [0.15, { crouch: 0.62, lean: 0.45, armL: -0.7, armR: -0.7, elbowL: 0.3, elbowR: 0.3, nod: 0.1 }],
  [0.3, { lean: 0.05, hipL: 0.1, hipR: -0.15, kneeL: 0.1, kneeR: 0.3, armL: 2.4, armR: 2.4, spreadL: 0.35, spreadR: 0.35, elbowL: 0.2, elbowR: 0.2, nod: -0.2 }],
  [0.5, { lean: 0.25, hipL: 1.2, hipR: 0.9, kneeL: 1.7, kneeR: 1.9, armL: 1.0, armR: 1.3, spreadL: 0.55, spreadR: 0.55, elbowL: 0.7, elbowR: 0.9, nod: 0.05 }],
  [0.7, { lean: 0.1, hipL: 0.3, hipR: 0.1, kneeL: 0.35, kneeR: 0.25, armL: 0.7, armR: 0.8, spreadL: 0.75, spreadR: 0.75, elbowL: 0.3, elbowR: 0.3 }],
  [0.85, { crouch: 0.65, lean: 0.4, armL: 0.6, armR: 0.6, spreadL: 0.6, spreadR: 0.6, elbowL: 0.4, elbowR: 0.4, nod: 0.15 }],
  [1, {}],
]);
/** A razor's cut, from the guard to the follow-through, with the right arm: up behind the head, and a great swing down and across. It rings at 0.5. */
export const strike = (t: number): Partial<Pose> => keyed(t, [
  [0, READY],
  [0.3, { armR: 2.85, spreadR: 0.35, elbowR: 1.35, armL: 0.55, spreadL: 0.25, elbowL: 0.9, twist: -0.45, lean: -0.12, crouch: 0.18, hipL: 0.25, hipR: -0.15, kneeL: 0.1, head: 0.25, nod: -0.05 }],
  [0.5, { armR: 0.9, spreadR: 0.05, elbowR: 0.15, armL: 0.2, spreadL: 0.35, elbowL: 0.6, twist: 0.45, lean: 0.38, crouch: 0.38, hipL: 0.45, hipR: -0.35, kneeL: 0.25, kneeR: 0.05, head: -0.25 }],
  [0.7, { armR: -0.1, spreadR: -0.35, elbowR: 0.35, armL: -0.2, spreadL: 0.45, elbowL: 0.3, twist: 0.7, lean: 0.42, crouch: 0.32, hipL: 0.45, hipR: -0.35, kneeL: 0.25, head: -0.4 }],
  [1, READY],
]);
/** Turning a cut aside: the blade up across the body, the blow taken at 0.5, and swept out. */
export const parry = (t: number): Partial<Pose> => keyed(t, [
  [0, READY],
  [0.3, { armR: 2.0, spreadR: -0.25, elbowR: 1.0, armL: 0.9, spreadL: 0.15, elbowL: 1.2, twist: 0.25, lean: -0.12, crouch: 0.28, hipL: 0.12, hipR: -0.3, kneeR: 0.25 }],
  [0.5, { armR: 1.85, spreadR: -0.1, elbowR: 0.85, armL: 0.8, spreadL: 0.2, elbowL: 1.1, twist: 0.15, lean: -0.2, crouch: 0.32, hipL: 0.12, hipR: -0.3, kneeR: 0.25 }],
  [0.7, { armR: 1.4, spreadR: 0.6, elbowR: 0.7, armL: 0.5, spreadL: 0.3, elbowL: 0.9, twist: -0.35, lean: 0.05, crouch: 0.25, hipL: 0.15, hipR: -0.2 }],
  [1, READY],
]);
/** Head thrown back, arms out: a Howler's howl. It is held at 1. */
export const howl = (t: number): Partial<Pose> => {
  const HOWL: Partial<Pose> = { crouch: 0.08, lean: -0.3, nod: -1.05 + 0.05 * Math.sin(t * 90), armL: 0.35, armR: 0.35, spreadL: 1.6, spreadR: 1.6, elbowL: 0.15, elbowR: 0.15 };
  return keyed(t, [
    [0, {}],
    [0.12, { crouch: 0.3, lean: 0.4, nod: 0.4, armL: 0.3, armR: 0.3, spreadL: 0.3, spreadR: 0.3, elbowL: 0.6, elbowR: 0.6 }],
    [0.3, HOWL],
    [1, HOWL],
  ]);
};
/** A bow from the waist, a hand on the heart. */
export const bow = (t: number): Partial<Pose> => {
  const B: Partial<Pose> = { lean: 0.72, nod: 0.35, crouch: 0.05, armR: 0.55, spreadR: -0.35, elbowR: 1.95, armL: 0.08 };
  return keyed(t, [[0, {}], [0.3, B], [0.7, B], [1, {}]]);
};
/** The right fist to the heart, held, and down again. */
export const salute = (t: number): Partial<Pose> => {
  const S: Partial<Pose> = { armR: 0.75, spreadR: -0.42, elbowR: 2.35, nod: 0.12 };
  return keyed(t, [[0, {}], [0.25, S], [0.75, S], [1, {}]]);
};
/** From standing at 0 to down on the right knee at 1. */
export const kneel = (t: number): Partial<Pose> => blend({}, { crouch: 1, hipL: 0.52, kneeL: -0.52, hipR: -1.05, kneeR: -0.52, lean: 0.12, nod: 0.3, armL: 0.75, elbowL: 0.75, spreadL: 0.1, armR: 0.15, spreadR: 0.15, elbowR: 0.2 }, ease(t));
/** Drawing a bow and loosing: Mustang. The bow comes up, the string is drawn to the cheek, loosed, and the bow comes down. */
export const draw = (t: number): Partial<Pose> => {
  const LOW: Partial<Pose> = { armL: 0.55, spreadL: 0.1, elbowL: 0.35, armR: 0.2, elbowR: 0.3 };
  const FULL: Partial<Pose> = { armL: 1.55, spreadL: 0.02, elbowL: 0, armR: -0.25, spreadR: 1.5, elbowR: 2.7, twist: -0.3, head: 0.3, lean: -0.03 };
  return keyed(t, [
    [0, LOW],
    [0.25, { armL: 1.5, spreadL: 0.05, elbowL: 0.05, armR: 1.35, spreadR: 0.05, elbowR: 0.4, twist: -0.15, head: 0.1 }],
    [0.55, FULL],
    [0.68, FULL],
    [0.74, { ...FULL, armR: -0.6, elbowR: 1.6 }],
    [1, LOW],
  ]);
};
/** Hauling someone up by the arm, as out of the river: reach down, take hold, heave up, and again. Half-way, it is also how one hangs from another who carries him. */
export const haul = (t: number): Partial<Pose> => {
  const REACH: Partial<Pose> = { lean: 0.85, crouch: 0.45, armR: 1.0, spreadR: 0.05, elbowR: 0.05, armL: 0.6, elbowL: 0.5, nod: 0.35, hipL: 0.25, hipR: -0.1 };
  return keyed(t, [
    [0, REACH],
    [0.3, { ...REACH, armR: 0.85, elbowR: 0.2 }],
    [0.6, { lean: 0.25, crouch: 0.35, armR: 0.5, elbowR: 1.6, armL: 0.2, elbowL: 0.4, twist: 0.25, nod: 0.1, hipL: 0.2, hipR: -0.1 }],
    [0.8, { lean: 0.08, crouch: 0.15, armR: 0.6, elbowR: 1.8, armL: 0.15, elbowL: 0.3, twist: 0.15, hipL: 0.1 }],
    [1, REACH],
  ]);
};
/** Shoulder set against a door, pushing, straining in bursts. */
export const push = (t: number): Partial<Pose> => {
  const s = Math.sin(t * TAU);
  return { lean: 0.6 + 0.06 * s, crouch: 0.42, twist: 0.45, armL: 1.35, spreadL: 0.1, elbowL: 1.5, armR: 1.1, spreadR: -0.1, elbowR: 1.75, hipL: 0.45 + 0.08 * s, hipR: -0.6 - 0.08 * s, kneeL: 0.3, kneeR: 0.05, nod: -0.2 };
};
/** Sitting on a step, eating: the boy Alexandar. A bite comes near the end of each cycle; at 0.5 the hands rest forward, as a rider's on a griffin. */
export const sit = (t: number): Partial<Pose> => {
  const b = smooth(0.62, 0.78, t) * (1 - smooth(0.84, 0.98, t));
  return {
    crouch: 1, hipL: 0.52, kneeL: -0.52, hipR: 0.52, kneeR: -0.52, lean: 0.12,
    armL: 0.9, elbowL: 0.55, spreadL: 0.1,
    armR: mix(0.9, 0.55, b), elbowR: mix(0.55, 2.4, b), spreadR: mix(0.1, -0.25, b), nod: mix(0.05, 0.15, b),
  };
};
/** Flying on gravBoots: body flat, arms back, the head up to see ahead. It eases in from a leap's tuck and out to its landing. */
export const fly = (t: number): Partial<Pose> => {
  const f = smooth(0, 0.16, t) * (1 - smooth(0.84, 1, t));
  const wob = Math.sin(t * TAU * 2);
  const FLAT: Partial<Pose> = { lean: 1.3, tilt: 0.08 * wob, hipL: -1.12, hipR: -1.02, kneeL: 0.22 + 0.12 * wob, kneeR: 0.42 - 0.12 * wob, armL: -0.42, armR: -0.42, spreadL: 0.32, spreadR: 0.32, elbowL: 0.12, elbowR: 0.12, nod: -0.95 };
  return blend(t < 0.5 ? leap(0.5) : leap(0.7), FLAT, f);
};
/** A guard on guard at 0, at ease half-way, and on guard again at 1: a guard at rest is given it slowly, round and round. */
export const guard = (t: number): Partial<Pose> => blend(READY, AT_EASE, 0.5 - 0.5 * Math.cos(t * TAU));
/** Astride a griffin: seated, the legs out round its body, the hands forward. */
export const ride = (_t: number): Partial<Pose> => ({ crouch: 1, straddle: 0.7, hipL: 0.32, hipR: 0.32, kneeL: -0.25, kneeR: -0.25, lean: 0.18, armL: 0.95, armR: 0.95, elbowL: 0.6, elbowR: 0.6, spreadL: 0.12, spreadR: 0.12 });

/** Mixes two poses: 0 is all of `a`, 1 all of `b`. */
export function blend(a: Partial<Pose>, b: Partial<Pose>, t: number): Partial<Pose> {
  const out: Partial<Pose> = {};
  for (const key of Object.keys(STANDING) as (keyof Pose)[]) out[key] = (a[key] ?? 0) * (1 - t) + (b[key] ?? 0) * t;
  return out;
}

// ---------------------------------------------------------------------------
// Griffins, for Sefi and the Valkyrie, and Kavax's fox
// ---------------------------------------------------------------------------

/** A griffin: an eagle's head, wings and forelegs, a lion's hindquarters and tail, as the books' Valkyrie ride them. A rider sits at `saddle`. */
export interface Griffin {
  at(x: number, y: number, z: number, heading: number, pitch?: number, bank?: number): void;
  /** How far through a wingbeat, 0 to 1; and how far folded its wings are, 0 spread to 1 folded on the ground. */
  wings(beat: number, folded: number): void;
  /** Where its rider sits now, in the tile's coordinates. */
  saddle(): [number, number, number];
  shown(v: boolean): void;
}
export interface Fox { at(x: number, y: number, z: number, heading: number): void; trot(phase: number): void; shown(v: boolean): void }

/**
 * How far above a griffin's feet its rider's feet go, for a rider posed with
 * `sit` or `ride`: the show puts them 1.5 up, and the saddle is made to fit a
 * Valkyrie seated there.
 */
export const RIDER_FEET = 1.5;

// ---------------------------------------------------------------------------
// Shapes: the parts' geometry
// ---------------------------------------------------------------------------
//
// Each part is built once, in units of its own bone (a forearm one forearm
// long and one forearm thick, a head one head high), and every figure's copy
// is scaled to that figure's measures. Corners carry what the material makes
// of them, as the engine's people and traffic do: TINT takes the figure's
// colour for that part, OWN keeps a colour of its own (a gold sun on a white
// helm, the dark of the eyes), LAMP and EMBER give a warm or a red light of
// their own by night.

type P = [number, number, number];
const TINT = 0, LAMP = 3, EMBER = 4, OWN = 5;
const WHITE = 0xffffff;

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

  get triangles(): number {
    return this.pos.length / 9;
  }

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

  /** A flat outline, as a fan from its first corner. */
  poly(pts: P[], color = WHITE, kind = TINT, inside?: P): void {
    for (let i = 1; i + 1 < pts.length; i++) this.tri(pts[0], pts[i], pts[i + 1], color, kind, inside);
  }

  /** Rings of corners joined into a tube, its sides facing away from the line through their middles; caps close the first and the last. A ring can be a single corner repeated, for a point. */
  tube(rings: P[][], color = WHITE, kind = TINT, capA = true, capB = true): void {
    const mids = rings.map(avg);
    for (let i = 0; i + 1 < rings.length; i++) {
      const A = rings[i], B = rings[i + 1], m = avg([mids[i], mids[i + 1]]);
      for (let j = 0; j < A.length; j++) {
        const k = (j + 1) % A.length;
        this.tri(A[j], A[k], B[k], color, kind, m);
        this.tri(A[j], B[k], B[j], color, kind, m);
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

/** A ring that is a single point, for a tube that ends in a point. */
const point = (p: P, n: number): P[] => Array.from({ length: n }, (): P => [p[0], p[1], p[2]]);

/** Turns a shape's corners and their faces' directions by a proper rotation given as a function of a point, then moves them. */
function turned(s: Shape, f: (p: P) => P, by: P = [0, 0, 0]): Shape {
  for (let i = 0; i < s.pos.length; i += 3) {
    const p = f([s.pos[i], s.pos[i + 1], s.pos[i + 2]]), n = f([s.nor[i], s.nor[i + 1], s.nor[i + 2]]);
    s.pos[i] = p[0] + by[0]; s.pos[i + 1] = p[1] + by[1]; s.pos[i + 2] = p[2] + by[2];
    s.nor[i] = n[0]; s.nor[i + 1] = n[1]; s.nor[i + 2] = n[2];
  }
  return s;
}
/** Adds one shape's triangles to another's. */
function merge(into: Shape, from: Shape): Shape {
  into.pos.push(...from.pos); into.nor.push(...from.nor); into.col.push(...from.col); into.kind.push(...from.kind);
  return into;
}

/** An upright ring of `n` corners at height y, `rx` deep and `rz` wide about (cx, cz); the first corner `phase` round from straight ahead, so that by default a face, not a corner, looks ahead. */
function ring(n: number, y: number, rx: number, rz: number, cx = 0, cz = 0, phase = Math.PI / n): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    out.push([cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz]);
  }
  return out;
}

/** Rings of `n` corners round a line of points, each `ra` from it in the line's own up and `rb` to its side; the side is `side`, made square to the line. */
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
    // up: the side crossed with the line
    const ux = sy * tz - sz * ty, uy = sz * tx - sx * tz, uz = sx * ty - sy * tx;
    const out: P[] = [];
    for (let k = 0; k < n; k++) {
      const an = phase + (k / n) * TAU, c = Math.cos(an) * ra[i], s = Math.sin(an) * rb[i];
      out.push([p[0] + ux * c + sx * s, p[1] + uy * c + sy * s, p[2] + uz * c + sz * s]);
    }
    return out;
  });
}

/**
 * A flat blade along a line in the x-y plane: two edges in the plane and two
 * faces either side of it, `widths` across at each point of the line and
 * `thick` through it. A width of 0 makes a point.
 */
function blade(s: Shape, line: [number, number][], widths: number[], thick: number, color = WHITE, kind = TINT): void {
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

/**
 * A hanging sheet: a piece of a cloak, or hair down the back. `cols` are its
 * corners across, as [x, z], x towards the body; it hangs from y = 0 to each
 * corner's foot, flaring outwards by `flare` at the foot, and is `t` thick on
 * its outer side.
 */
function drape(s: Shape, cols: [number, number][], feet: number[], flare: number, t: number, color = WHITE, kind = TINT): void {
  const n = cols.length;
  const inT = cols.map(([x, z]): P => [x, 0.03, z]);
  const inB = cols.map(([x, z], i): P => [x * (1 + flare * 0.4), feet[i], z * (1 + flare)]);
  const outT = inT.map(([x, y, z]): P => [x - t, y, z]);
  const outB = inB.map(([x, y, z]): P => [x - t, y, z]);
  for (let i = 0; i + 1 < n; i++) {
    const m = avg([inT[i], inT[i + 1], inB[i], inB[i + 1]]);
    s.quad(inT[i], inT[i + 1], inB[i + 1], inB[i], color, kind, [m[0] - 1, m[1], m[2]]);
    s.quad(outT[i], outT[i + 1], outB[i + 1], outB[i], color, kind, [m[0] + 1, m[1], m[2]]);
    const fb = avg([inB[i], inB[i + 1]]);
    s.quad(inB[i], inB[i + 1], outB[i + 1], outB[i], color, kind, [fb[0] - t / 2, fb[1] + 1, fb[2]]);
  }
  for (const i of [0, n - 1]) {
    const m = avg([inT[i], inB[i]]), sgn = Math.sign(cols[i][1]) || 1;
    s.quad(inT[i], outT[i], outB[i], inB[i], color, kind, [m[0] - t / 2, m[1], m[2] - sgn]);
  }
}

// ---------------------------------------------------------------------------
// The head, on which hair, beards, helms and marks are built
// ---------------------------------------------------------------------------

/**
 * The head, in head units from the base of the neck: each ring [height, half
 * its depth, half its width, how far forward its middle is], from the chin to
 * the crown. It is six-sided, with a face looking straight ahead.
 */
const HEAD: [number, number, number, number][] = [[0.19, 0.25, 0.22, 0.07], [0.42, 0.42, 0.37, 0.02], [0.75, 0.45, 0.4, 0], [1.02, 0.38, 0.34, -0.02], [1.16, 0.2, 0.19, -0.03]];
/** The middle of the head, which hair and helms stand out from. */
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

/** A point on the head, `a` round from straight ahead (a quarter turn is its right) at height y, pushed out from its middle by k (1 on it). */
function scalp(a: number, y: number, k = 1): P {
  const [rx, rz, cx] = headAt(y);
  return [MID[0] + (cx + Math.cos(a) * rx - MID[0]) * k, MID[1] + (y - MID[1]) * k, MID[2] + (Math.sin(a) * rz - MID[2]) * k];
}

/** How far the head reaches from its middle, straight ahead (0) round over the top (a quarter turn) to the back (a half). */
function profile(th: number): number {
  const c = Math.cos(th) / 0.45, s = Math.sin(th) / 0.48;
  return 1 / Math.sqrt(c * c + s * s);
}

/** Where the face looks out at height y: the front face of the six-sided head. */
const faceX = (y: number): number => { const [rx, , cx] = headAt(y); return cx + rx * Math.cos(Math.PI / 6); };

/** A point on the face of the head that looks out at angle `at` (a multiple of a sixth of a turn), `u` across it from -1 to 1, at height y, `out` in front of it. */
function onFace(at: number, u: number, y: number, out = 0.014): P {
  const [rx, rz, cx] = headAt(y);
  const a0 = at - Math.PI / 6, a1 = at + Math.PI / 6, t = (u + 1) / 2;
  const x = mix(cx + Math.cos(a0) * rx, cx + Math.cos(a1) * rx, t), z = mix(Math.sin(a0) * rz, Math.sin(a1) * rz, t);
  // the face's outward direction
  const nx = Math.cos(at) * rz, nz = Math.sin(at) * rx, nl = Math.hypot(nx, nz) || 1;
  return [x + (nx / nl) * out, y, z + (nz / nl) * out];
}

/** A stripe from one point to another, `w` wide, lying on a face whose outward direction is `n`. */
function stripe(s: Shape, a: P, b: P, w: number, n: P, color: number, kind = OWN): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  // across the stripe: square to it and to the face's outward direction
  let cx = dy * n[2] - dz * n[1], cy = dz * n[0] - dx * n[2], cz = dx * n[1] - dy * n[0];
  const l = Math.hypot(cx, cy, cz) || 1;
  cx = (cx / l) * w / 2; cy = (cy / l) * w / 2; cz = (cz / l) * w / 2;
  const m = avg([a, b]);
  s.quad([a[0] - cx, a[1] - cy, a[2] - cz], [a[0] + cx, a[1] + cy, a[2] + cz], [b[0] + cx, b[1] + cy, b[2] + cz], [b[0] - cx, b[1] - cy, b[2] - cz], color, kind, [m[0] - n[0], m[1] - n[1], m[2] - n[2]]);
}

const faceNormal = (at: number): P => [Math.cos(at), 0, Math.sin(at)];

function headShape(): Shape {
  const s = new Shape();
  // the neck, from inside the chest up into the head
  s.tube([ring(6, -0.25, 0.17, 0.17), ring(6, 0.4, 0.17, 0.17)], WHITE, TINT, false, false);
  s.tube(HEAD.map(([y, rx, rz, cx]) => ring(6, y, rx, rz, cx)), WHITE, TINT, true, true);
  // the eyes
  for (const side of [-1, 1]) {
    const x = faceX(0.63) + 0.012;
    s.quad([x, 0.6, side * 0.055], [x, 0.6, side * 0.135], [x, 0.668, side * 0.135], [x, 0.668, side * 0.055], 0x1c1c24, OWN, [x - 1, 0.63, side * 0.1]);
  }
  // the nose
  const nx = faceX(0.54);
  const inside: P = [nx - 0.2, 0.55, 0];
  const tl: P = [nx, 0.62, -0.04], tr: P = [nx, 0.62, 0.04], bl: P = [nx, 0.47, -0.05], br: P = [nx, 0.47, 0.05], tip: P = [nx + 0.075, 0.49, 0];
  s.tri(tl, bl, tip, WHITE, TINT, inside);
  s.tri(tr, br, tip, WHITE, TINT, inside);
  s.tri(bl, br, tip, 0xd8d8d8, TINT, inside);
  return s;
}

/** A shell over the head, `n` corners round: rows of heights for each corner by its angle, each pushed out from the head by its own k, closed over the top. */
function shell(s: Shape, n: number, rows: { y: (a: number) => number; k: (a: number, i: number) => number }[], color = WHITE, kind = TINT, top = true, phase = Math.PI / n): P[][] {
  const rings = rows.map((r) => Array.from({ length: n }, (_, i): P => { const a = phase + (i / n) * TAU; return scalp(a, r.y(a), r.k(a, i)); }));
  s.tube(rings, color, kind, false, top);
  return rings;
}

/** Hair close over the head: over the brow in front, the ears at the sides, down to `back` behind. */
function hairCap(s: Shape, k: number, back: number, front = 0.88): void {
  const line = (a: number): number => { const c = Math.cos(a); return c >= 0 ? mix(0.6, front, c) : mix(0.6, back, -c); };
  shell(s, 6, [{ y: line, k: () => k }, { y: (a) => Math.max(line(a) + 0.05, 0.8), k: () => k }, { y: () => 1.0, k: () => k }, { y: () => 1.16, k: () => k }]);
}

/**
 * A crest along the middle of the head from front to back, as a mohawk or a
 * helm's plume: from angle `from` (0 straight ahead, a quarter turn the top)
 * to `to`, standing `height` off a surface k times the head's, `half` thick,
 * waving sideways by `wave`.
 */
function crest(s: Shape, k: number, from: number, to: number, height: number, half: number, steps: number, color = WHITE, kind = TINT, wave = 0): void {
  const base: P[] = [], top: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, th = mix(from, to, u), r = profile(th) * k;
    const h = height * Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.6);
    const dx = Math.cos(th), dy = Math.sin(th), z = wave * Math.sin(u * Math.PI * 3);
    base.push([MID[0] + dx * (r - 0.03), MID[1] + dy * (r - 0.03), z]);
    top.push([MID[0] + dx * (r + h), MID[1] + dy * (r + h), z]);
  }
  const L = (p: P): P => [p[0], p[1], p[2] - half], R = (p: P): P => [p[0], p[1], p[2] + half];
  for (let i = 0; i < steps; i++) {
    const c = avg([base[i], base[i + 1], top[i], top[i + 1]]);
    s.quad(L(base[i]), L(base[i + 1]), L(top[i + 1]), L(top[i]), color, kind, c);
    s.quad(R(base[i]), R(base[i + 1]), R(top[i + 1]), R(top[i]), color, kind, c);
    s.quad(L(top[i]), L(top[i + 1]), R(top[i + 1]), R(top[i]), color, kind, avg([base[i], base[i + 1]]));
  }
  s.quad(L(base[0]), R(base[0]), R(top[0]), L(top[0]), color, kind, avg([base[1], top[1]]));
  s.quad(L(base[steps]), R(base[steps]), R(top[steps]), L(top[steps]), color, kind, avg([base[steps - 1], top[steps - 1]]));
}

// ---------------------------------------------------------------------------
// Hair, beards and the marks of the head
// ---------------------------------------------------------------------------

const hairShort = (): Shape => { const s = new Shape(); hairCap(s, 1.1, 0.4); return s; };
const hairCropped = (): Shape => { const s = new Shape(); hairCap(s, 1.05, 0.52, 0.9); return s; };

/** Thick curls: twelve lumps round the head and a puff on top. */
function hairCurly(): Shape {
  const s = new Shape();
  const line = (a: number): number => { const c = Math.cos(a); return c >= 0 ? mix(0.56, 0.84, c) : mix(0.56, 0.36, -c); };
  const alt = (lo: number, hi: number) => (_a: number, i: number): number => (i % 2 ? hi : lo);
  const rings = shell(s, 12, [{ y: line, k: alt(1.14, 1.26) }, { y: () => 0.98, k: alt(1.24, 1.38) }, { y: () => 1.12, k: alt(1.2, 1.3) }], WHITE, TINT, false);
  const last = rings[rings.length - 1], top: P = [-0.02, MID[1] + 0.48 * 1.42, 0], m = avg(last);
  for (let i = 0; i < last.length; i++) s.tri(last[i], last[(i + 1) % last.length], top, WHITE, TINT, [m[0], m[1] - 0.3, m[2]]);
  return s;
}

/** Sevro's mohawk: a crest from the brow to the nape, the sides shaved. */
function hairMohawk(): Shape {
  const s = new Shape();
  crest(s, 1.0, 0.95, 3.75, 0.24, 0.075, 6);
  return s;
}

/** The root of Ragnar's lock, from the crown down the back of his head. */
function lockRoot(): Shape {
  const s = new Shape();
  const pts: P[] = [[0.02, 1.17, 0], [-0.24, 1.13, 0], [-0.42, 0.96, 0], [-0.52, 0.72, 0]];
  s.tube(along(pts, [0.07, 0.1, 0.1, 0.1], [0.08, 0.1, 0.1, 0.1], 4, [0, 0, 1], Math.PI / 4), WHITE, TINT, true, true);
  return s;
}

/** A lock or braid hanging down the back, in head units from a point behind the base of the neck: `bulge` swells it into a braid's plaits. */
function hanging(len: number, r0: number, r1: number, steps: number, bulge: number): Shape {
  const s = new Shape();
  const pts: P[] = [], ra: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push([mix(0.1, -0.08, Math.sqrt(u)), mix(0.62, -len, u), 0]);
    ra.push(mix(r0, r1, u) * (1 + (i % 2 ? -bulge : bulge)) * (i === steps ? 0.4 : 1));
  }
  s.tube(along(pts, ra, ra, 4, [0, 0, 1], Math.PI / 4), WHITE, TINT, false, true);
  return s;
}

/** Hair to the shoulders: a cap and a fall down the back of the head. */
function hairLong(): Shape {
  const s = new Shape();
  hairCap(s, 1.1, 0.3, 0.9);
  const fall = new Shape();
  drape(fall, [[0.24, -0.46], [-0.06, -0.2], [-0.06, 0.2], [0.24, 0.46]], [-0.95, -1.0, -1.0, -0.95], 0.06, 0.07);
  // the fall hangs from the back of the head, behind its middle, down to below the jaw
  for (let i = 0; i < fall.pos.length; i += 3) {
    const x = fall.pos[i], y = fall.pos[i + 1];
    fall.pos[i] = x - 0.5;
    fall.pos[i + 1] = 0.92 + y * 0.92;
  }
  s.pos.push(...fall.pos); s.nor.push(...fall.nor); s.col.push(...fall.col); s.kind.push(...fall.kind);
  return s;
}

/** Alexandar's: white hair streaming out behind him like a comet's tail. */
function hairStreaming(): Shape {
  const s = new Shape();
  hairCap(s, 1.1, 0.5, 0.9);
  const pts: P[] = [[-0.3, 0.8, 0], [-0.8, 0.72, 0], [-1.32, 0.63, 0], [-1.82, 0.55, 0], [-2.2, 0.5, 0]];
  s.tube(along(pts, [0.34, 0.27, 0.18, 0.09, 0], [0.38, 0.36, 0.27, 0.14, 0], 6), WHITE, TINT, false, false);
  return s;
}

/** Sefi's: the left side shaved, the right long, white and braided; this is the cap, and the braid is `sideBraid`. */
function hairHalfShaved(): Shape {
  const s = new Shape();
  // corners at 30, 90, 150, 210, 270 and 330 degrees round from straight ahead: the right side first, then the left
  const line = [0.86, 0.52, 0.44, 1.08, 1.12, 1.05];
  const at = (a: number): number => line[Math.round((a - Math.PI / 6) / (Math.PI / 3) + 6) % 6];
  shell(s, 6, [{ y: at, k: () => 1.08 }, { y: (a) => Math.max(at(a) + 0.04, 0.8), k: () => 1.08 }, { y: (a) => Math.max(at(a) + 0.08, 1.0), k: () => 1.08 }, { y: () => 1.16, k: () => 1.08 }]);
  return s;
}

/** The braid on the right side of Sefi's head, falling forward over her shoulder. */
function sideBraid(): Shape {
  const s = new Shape();
  const pts: P[] = [[0.0, 0.8, 0.44], [0.16, 0.36, 0.5], [0.38, -0.08, 0.44], [0.48, -0.5, 0.38], [0.52, -0.92, 0.34], [0.53, -1.18, 0.33]];
  const r = [0.1, 0.12, 0.09, 0.11, 0.08, 0.03];
  s.tube(along(pts, r, r, 4, [1, 0, 0], Math.PI / 4), WHITE, TINT, true, true);
  return s;
}

function beardShape(kind: 'grey' | 'forkedRed' | 'stubble'): Shape {
  const s = new Shape();
  const fx = faceX(0.42);
  if (kind === 'stubble') {
    s.solid([[0.08, 0.17, -0.3], [fx + 0.02, 0.17, -0.18], [fx + 0.02, 0.17, 0.18], [0.08, 0.17, 0.3], [0.0, 0.44, -0.37], [fx + 0.025, 0.44, -0.2], [fx + 0.025, 0.44, 0.2], [0.0, 0.44, 0.37]]);
    return s;
  }
  const full = kind === 'grey';
  const low = full ? 0.0 : 0.13;
  // a block over the jaw and chin, standing out from the face
  s.solid([[0.1, low, -0.24], [fx + 0.06, low, -0.16], [fx + 0.06, low, 0.16], [0.1, low, 0.24], [-0.04, 0.46, -0.39], [fx + 0.1, 0.47, -0.22], [fx + 0.1, 0.47, 0.22], [-0.04, 0.46, 0.39]]);
  if (full) {
    // sideburns up the sides to the hair
    for (const side of [-1, 1]) {
      const a = onFace(side * Math.PI / 3, side * 0.7, 0.44, 0.03), b = onFace(side * Math.PI / 3, side * 0.7, 0.68, 0.03);
      stripe(s, a, b, 0.12, faceNormal(side * Math.PI / 3), WHITE, TINT);
    }
  } else {
    // Kavax's: two forks hanging from the chin
    for (const side of [-1, 1]) {
      const pts: P[] = [[fx, 0.2, side * 0.08], [fx - 0.02, -0.12, side * 0.11], [fx - 0.06, -0.42, side * 0.14]];
      s.tube(along(pts, [0.07, 0.055, 0.0], [0.07, 0.055, 0.0], 4, [0, 0, 1], Math.PI / 4), WHITE, TINT, true, false);
    }
  }
  return s;
}

/** The marks on the face and head. */
function scarShape(): Shape {
  // the Peerless scar, along the right cheekbone
  const s = new Shape();
  stripe(s, onFace(Math.PI / 3, -0.55, 0.6), onFace(Math.PI / 3, 0.45, 0.47), 0.05, faceNormal(Math.PI / 3), 0xb8584c);
  return s;
}
function tattooShape(): Shape {
  // Ragnar's tattooed face: a chevron over the brow, a stripe down the chin, and slashes across both cheeks
  const s = new Shape(), ink = 0x262838, n0 = faceNormal(0);
  stripe(s, onFace(0, 0, 0.88), onFace(0, -0.85, 0.76), 0.05, n0, ink);
  stripe(s, onFace(0, 0, 0.88), onFace(0, 0.85, 0.76), 0.05, n0, ink);
  stripe(s, onFace(0, 0, 0.4), onFace(0, 0, 0.22), 0.07, n0, ink);
  for (const side of [-1, 1]) {
    const at = side * Math.PI / 3, n = faceNormal(at);
    stripe(s, onFace(at, -0.75 * side, 0.6), onFace(at, 0.7 * side, 0.68), 0.05, n, ink);
    stripe(s, onFace(at, -0.75 * side, 0.48), onFace(at, 0.7 * side, 0.4), 0.05, n, ink);
  }
  return s;
}
function wingTattooShape(): Shape {
  // Sefi's blue wing, on the shaved left side of her head: three feathers fanning back and up
  const s = new Shape(), blue = 0x3a6cc8;
  for (const [at, root, tips] of [[-Math.PI / 3, [0.6, 0.66], [[-0.5, 0.98], [-0.85, 0.84]]], [-2 * Math.PI / 3, [-0.7, 0.68], [[0.2, 1.0], [0.75, 0.92]]]] as [number, [number, number], [number, number][]][]) {
    const n = faceNormal(at), r = onFace(at, root[0], root[1], 0.016);
    for (const [u, y] of tips) {
      const t = onFace(at, u, y, 0.016), m = avg([r, t]);
      const side = onFace(at, (root[0] + u) / 2 + 0.12, (root[1] + y) / 2 - 0.06, 0.016);
      s.tri(r, t, side, blue, OWN, [m[0] - n[0], m[1], m[2] - n[2]]);
    }
  }
  return s;
}
function noseBarShape(): Shape {
  const s = new Shape(), x = faceX(0.52);
  s.box(x + 0.035, 0.5, -0.085, x + 0.065, 0.53, 0.085, 0x8a8e94, OWN);
  return s;
}
function angelsShape(): Shape {
  // Daxo's golden angels, over his bald head and down the back of his neck
  const s = new Shape(), gold = 0xd9b244;
  const angel = (a: number, y: number, size: number): void => {
    const p = scalp(a, y, 1.02), q = scalp(a, y + 0.06, 1.02), n: P = [p[0] - MID[0], p[1] - MID[1], p[2] - MID[2]];
    const up: P = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], ul = Math.hypot(...up) || 1;
    const u: P = [up[0] / ul * size, up[1] / ul * size, up[2] / ul * size];
    const side: P = [0, 0, size];
    const at = (du: number, ds: number): P => [p[0] + u[0] * du + side[0] * ds, p[1] + u[1] * du + side[1] * ds, p[2] + u[2] * du + side[2] * ds];
    const inside: P = [p[0] - n[0], p[1] - n[1], p[2] - n[2]];
    s.tri(at(-1, 0), at(0.3, -0.25), at(0.3, 0.25), gold, OWN, inside);
    s.tri(at(1, 0), at(0.3, -0.25), at(0.3, 0.25), gold, OWN, inside);
    s.tri(at(0.5, 0), at(1.1, -1.1), at(0.1, -0.9), gold, OWN, inside);
    s.tri(at(0.5, 0), at(1.1, 1.1), at(0.1, 0.9), gold, OWN, inside);
  };
  angel(Math.PI, 1.0, 0.11);
  angel(Math.PI * 0.8, 0.84, 0.08);
  angel(Math.PI * 1.2, 0.84, 0.08);
  angel(Math.PI, 0.5, 0.09);
  return s;
}
function bionicEyeShape(): Shape {
  // a glowing red eye in place of his left
  const s = new Shape(), x = faceX(0.63) + 0.022;
  s.quad([x, 0.59, -0.05], [x, 0.59, -0.145], [x, 0.678, -0.145], [x, 0.678, -0.05], 0xff4a30, EMBER, [x - 1, 0.63, -0.1]);
  return s;
}
function garlandShape(): Shape {
  // Thraxa's white feathers, round her head in her hair
  const s = new Shape();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    const b = scalp(a, 0.96, 1.36), t = scalp(a + 0.1, 1.2, 1.56), w = scalp(a + 0.22, 0.98, 1.38);
    s.tri(b, w, t, 0xfbfaf6, OWN);
    s.tri(b, t, w, 0xfbfaf6, OWN);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Helms
// ---------------------------------------------------------------------------

/** A helm's bowl, `k` times the head, from its rim (by angle round) over the top; eight-sided. */
function bowl(s: Shape, k: number, rim: (a: number) => number, color = WHITE, kind = TINT): void {
  shell(s, 8, [{ y: rim, k: () => k }, { y: (a) => Math.max(rim(a) + 0.08, 0.72), k: () => k }, { y: (a) => Math.max(rim(a) + 0.16, 1.0), k: () => k }, { y: () => 1.16, k: () => k }], color, kind);
}
const CLOSED = (a: number): number => 0.25 + 0.06 * (1 - Math.cos(a));
const OPEN = (front: number) => (a: number): number => { const c = Math.cos(a); return c >= 0 ? mix(0.48, front, c) : mix(0.48, 0.34, -c); };

/** A band over the front of a helm, between two heights, `k` out: a visor, a face plate. */
function front(s: Shape, k: number, y0: number, y1: number, color: number, kind = OWN, reach = 3): void {
  const corners = [-3, -1, 1, 3].slice(2 - Math.ceil(reach / 2), 2 + Math.ceil(reach / 2)).map((i) => (i * Math.PI) / 8);
  for (let i = 0; i + 1 < corners.length; i++) {
    const a = corners[i], b = corners[i + 1], m = scalp((a + b) / 2, (y0 + y1) / 2, 1);
    s.quad(scalp(a, y0, k), scalp(b, y0, k), scalp(b, y1, k), scalp(a, y1, k), color, kind, m);
  }
}

function helmShape(kind: Helm): Shape {
  const s = new Shape();
  const DARK = 0x16161a, K = 1.18;
  switch (kind) {
    case 'gray': {
      // a soldier's helmet down over the eyes, with a dark visor across them
      bowl(s, 1.15, OPEN(0.52));
      front(s, 1.19, 0.53, 0.7, 0x1a1d22, OWN, 3);
      break;
    }
    case 'praetorian': {
      // closed, with a dark T for the eyes and nose, and a tall black crest
      bowl(s, K, CLOSED);
      front(s, K + 0.03, 0.61, 0.69, DARK, OWN, 3);
      front(s, K + 0.03, 0.36, 0.61, DARK, OWN, 1);
      crest(s, K, 0.55, 3.35, 0.42, 0.065, 4, 0x141216, OWN);
      break;
    }
    case 'bellona': {
      // closed, a silver face and a low silver crest
      bowl(s, K, CLOSED);
      front(s, K + 0.025, 0.27, 0.6, 0xd6dee6, OWN, 3);
      front(s, K + 0.03, 0.6, 0.68, DARK, OWN, 3);
      crest(s, K, 0.7, 3.2, 0.2, 0.05, 3, 0xd6dee6, OWN);
      break;
    }
    case 'obsidian': {
      // open, low over the brow, with a guard down the nose
      bowl(s, 1.15, OPEN(0.82));
      const x = faceX(0.7);
      s.box(x + 0.04, 0.5, -0.04, x + 0.09, 0.86, 0.04, 0x55595e, OWN);
      break;
    }
    case 'scarab': {
      // the Howlers' scarabSkin: closed and black, a demon's face with great empty insect eyes, fangs and horns
      bowl(s, 1.2, CLOSED);
      for (const side of [-1, 1]) {
        const a = side * 0.42, c = scalp(a, 0.68, 1.22), nl = Math.hypot(c[0] - MID[0], c[2] - MID[2]);
        const nx = (c[0] - MID[0]) / nl, nz = (c[2] - MID[2]) / nl;
        // a lens: a low six-sided cone on the face, its point out
        const pts = Array.from({ length: 6 }, (_, i): P => { const an = (i / 6) * TAU; const du = Math.cos(an) * 0.12, dv = Math.sin(an) * 0.15; return [c[0] - nz * dv, c[1] + du, c[2] + nx * dv]; });
        const tip: P = [c[0] + nx * 0.08, c[1], c[2] + nz * 0.08];
        for (let i = 0; i < 6; i++) s.tri(pts[i], pts[(i + 1) % 6], tip, 0x4a1714, OWN, [c[0] - nx, c[1], c[2] - nz]);
        // a horn from the brow, swept back
        const horn: P[] = [scalp(side * 0.75, 1.0, 1.18), scalp(side * 0.9, 1.25, 1.35), scalp(side * 1.1, 1.38, 1.5)];
        s.tube(along(horn, [0.08, 0.05, 0], [0.08, 0.05, 0], 3, [1, 0, 0]), WHITE, TINT, true, false);
      }
      break;
    }
    case 'rageWolf': {
      // the laughing wolf's head: a snout, its jaw dropped open, ears up, amber eyes
      bowl(s, K, CLOSED);
      const x0 = faceX(0.55) + 0.02;
      s.solid([[x0, 0.46, -0.22], [1.0, 0.52, -0.1], [1.0, 0.52, 0.1], [x0, 0.46, 0.22], [x0, 0.74, -0.24], [1.0, 0.64, -0.1], [1.0, 0.64, 0.1], [x0, 0.74, 0.24]]);
      s.quad([1.005, 0.56, -0.07], [1.005, 0.56, 0.07], [1.005, 0.64, 0.07], [1.005, 0.64, -0.07], 0x141214, OWN, [0.9, 0.6, 0]);
      s.solid([[x0, 0.3, -0.18], [0.9, 0.12, -0.08], [0.9, 0.12, 0.08], [x0, 0.3, 0.18], [x0, 0.42, -0.19], [0.9, 0.2, -0.09], [0.9, 0.2, 0.09], [x0, 0.42, 0.19]]);
      for (const z of [-0.06, 0.06]) {
        s.tri([0.86, 0.52, z - 0.025], [0.86, 0.52, z + 0.025], [0.86, 0.45, z], 0xf2ecdc, OWN, [0.6, 0.6, z]);
        s.tri([0.8, 0.22, z - 0.025], [0.8, 0.22, z + 0.025], [0.8, 0.29, z], 0xf2ecdc, OWN, [0.6, 0.1, z]);
        s.tri([0.86, 0.45, z], [0.86, 0.52, z - 0.025], [0.86, 0.52, z + 0.025], 0xf2ecdc, OWN, [0.9, 0.6, z]);
      }
      for (const side of [-1, 1]) {
        const b0 = scalp(side * 1.25, 1.04, 1.16), b1 = scalp(side * 1.75, 1.04, 1.16), b2 = scalp(side * 1.5, 0.96, 1.22), tip: P = [-0.12, 1.52, side * 0.34];
        const m = avg([b0, b1, b2]);
        s.tri(b0, b1, tip, WHITE, TINT, [m[0], m[1] - 0.2, m[2] - side * 0.1]);
        s.tri(b1, b2, tip, WHITE, TINT, [m[0], m[1] - 0.2, m[2] - side * 0.1]);
        s.tri(b2, b0, tip, WHITE, TINT, [m[0], m[1] - 0.2, m[2] - side * 0.1]);
        const e = scalp(side * 0.28, 0.82, K + 0.03);
        s.quad([e[0], e[1] - 0.03, e[2] - 0.06], [e[0], e[1] - 0.03, e[2] + 0.06], [e[0], e[1] + 0.03, e[2] + 0.06], [e[0], e[1] + 0.03, e[2] - 0.06], 0xe0a030, OWN, [e[0] - 1, e[1], e[2]]);
      }
      break;
    }
    case 'morningSun': {
      // white and closed, a dark slit for the eyes, and a rising golden sun for its crest
      bowl(s, K, CLOSED);
      front(s, K + 0.03, 0.6, 0.67, DARK, OWN, 3);
      const sun = 0xf0c040, cy = 1.16, r = 0.3;
      for (const side of [-1, 1]) {
        const x = side * 0.035, inside: P = [-side, cy + 0.2, 0];
        for (let i = 0; i < 8; i++) {
          const a0 = (i / 8) * Math.PI, a1 = ((i + 1) / 8) * Math.PI;
          s.tri([x, cy, 0], [x, cy + Math.sin(a0) * r, Math.cos(a0) * r], [x, cy + Math.sin(a1) * r, Math.cos(a1) * r], sun, OWN, inside);
        }
        for (let i = 0; i < 7; i++) {
          const a = ((i + 0.5) / 7) * Math.PI, w = 0.11;
          s.tri([x, cy + Math.sin(a - w) * r * 0.95, Math.cos(a - w) * r * 0.95], [x, cy + Math.sin(a + w) * r * 0.95, Math.cos(a + w) * r * 0.95], [x, cy + Math.sin(a) * r * 1.9, Math.cos(a) * r * 1.9], sun, OWN, inside);
        }
      }
      break;
    }
    case 'protean': {
      // midnight blue, a golden face, and a golden sea serpent for its crest
      bowl(s, K, CLOSED);
      front(s, K + 0.025, 0.27, 0.6, 0xd8b04a, OWN, 3);
      front(s, K + 0.03, 0.6, 0.67, DARK, OWN, 3);
      crest(s, K, 0.45, 3.4, 0.24, 0.045, 5, 0xd8b04a, OWN, 0.06);
      break;
    }
    case 'wind': {
      // pale and closed, with silver fins swept back from the temples like the wind
      bowl(s, K, CLOSED);
      front(s, K + 0.03, 0.6, 0.67, DARK, OWN, 3);
      for (const side of [-1, 1]) {
        const z0 = side * 0.47, z1 = side * 0.53;
        const out: [number, number][] = [[0.28, 0.82], [-0.3, 1.02], [-0.92, 1.4], [-0.62, 0.95], [-0.1, 0.72]];
        const c = avg(out.map(([x, y]): P => [x, y, 0]));
        for (const z of [z0, z1]) for (let i = 1; i + 1 < out.length; i++) s.tri([out[0][0], out[0][1], z], [out[i][0], out[i][1], z], [out[i + 1][0], out[i + 1][1], z], 0xe8eef4, OWN, [c[0], c[1], z === z0 ? side * 0.6 : side * 0.2]);
        for (let i = 0; i < out.length; i++) {
          const a = out[i], b = out[(i + 1) % out.length];
          s.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], 0xe8eef4, OWN, [c[0], c[1], (z0 + z1) / 2]);
        }
      }
      break;
    }
    case 'none':
      break;
  }
  return s;
}

/** Whether a helm covers the face, hiding the marks on it. */
const COVERS: Record<Helm, boolean> = { none: false, rageWolf: true, morningSun: true, protean: true, wind: true, praetorian: true, gray: true, obsidian: false, scarab: true, bellona: true };
/** Which of a look's colours each helm takes: its trims are its own. */
const HELM_COLOR: Record<Helm, 'body' | 'limbs' | 'trim'> = { none: 'body', rageWolf: 'body', morningSun: 'body', protean: 'limbs', wind: 'body', praetorian: 'body', gray: 'body', obsidian: 'limbs', scarab: 'body', bellona: 'body' };

// ---------------------------------------------------------------------------
// The body's parts
// ---------------------------------------------------------------------------

function hipsShape(): Shape {
  const s = new Shape();
  s.tube([ring(8, -0.45, 0.86, 0.86), ring(8, 1.15, 0.94, 0.94)], WHITE, TINT, true, false);
  return s;
}
function beltShape(): Shape {
  const s = new Shape();
  s.tube([ring(8, 0.8, 1.06, 1.05), ring(8, 1.12, 1.04, 1.03)], WHITE, TINT, false, false);
  return s;
}
function chestShape(): Shape {
  const s = new Shape();
  const r = [ring(8, -0.08, 0.84, 0.8), ring(8, 0.42, 0.97, 0.93, 0.04), ring(8, 0.78, 1, 1, 0.03), ring(8, 1.0, 0.6, 0.52, -0.06)];
  // the belly a shade darker than the breast, as a breastplate's edge
  s.tube([r[0], r[1]], 0xe2e2e2, TINT, false, false);
  s.tube([r[1], r[2], r[3]], WHITE, TINT, false, true);
  return s;
}
function paunchShape(): Shape {
  const s = new Shape();
  const rings = [0.62, 1.02, 1.2].map((x, i) => ring(6, 0, [0.34, 0.26, 0.1][i], [0.62, 0.5, 0.2][i]).map(([u, , v]): P => [x, 0.28 + u, v]));
  s.tube(rings, WHITE, TINT, false, true);
  return s;
}
function pauldronShape(): Shape {
  const s = new Shape();
  s.tube([ring(4, -0.55, 1.75, 1.75, 0, 0, Math.PI / 4), ring(4, 0.8, 1.05, 1.05, 0, 0, Math.PI / 4)], WHITE, TINT, false, true);
  return s;
}
/** A limb, six-sided, from its joint at the top down; `caps` says which ends are closed, where they can be seen. */
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
/** A boot: the foot from the heel to the toe, rising to a cuff round the ankle; the sole is where the ground is when the figure stands. In foot lengths. */
const ANKLE = 0.045 / 0.14;
function bootShape(): Shape {
  const s = new Shape(), a = ANKLE;
  s.solid([[-0.28, -a, -0.24], [0.72, -a, -0.2], [0.72, -a, 0.2], [-0.28, -a, 0.24], [-0.26, 0.42, -0.25], [0.24, 0.3, -0.24], [0.24, 0.3, 0.24], [-0.26, 0.42, 0.25]]);
  return s;
}
function robeShape(): Shape {
  const s = new Shape();
  const r = [ring(8, 0.03, 1.08, 1.06), ring(8, -0.45, 1.2, 1.24), ring(8, -1.0, 1.55, 1.62)];
  s.tube(r, WHITE, TINT, false, true);
  // a gold border down its front
  const x = (y: number): number => (y > -0.45 ? mix(1.08, 1.2, (0.03 - y) / 0.48) : mix(1.2, 1.55, (-y - 0.45) / 0.55)) * Math.cos(Math.PI / 8) + 0.03;
  for (const [y0, y1] of [[0.02, -0.45], [-0.45, -0.99]]) s.quad([x(y0), y0, -0.12], [x(y0), y0, 0.12], [x(y1), y1, 0.16], [x(y1), y1, -0.16], 0xd4a63a, OWN, [0, (y0 + y1) / 2, 0]);
  return s;
}

/** A piece of a cloak, hanging from y = 0 to -1, in the units of its bone: x the chest's depth, z its own half-width. */
function cloakShape(jagged: boolean): Shape {
  const s = new Shape();
  if (jagged) {
    // the pelt's ragged foot
    const z = [-1, -0.5, 0, 0.5, 1], wrap = [0.34, 0.06, 0.0, 0.06, 0.34];
    drape(s, z.map((v, i): [number, number] => [wrap[i], v]), [-1.02, -1.28, -1.0, -1.3, -1.04], 0.12, 0.22);
  } else {
    drape(s, [[0.34, -1], [0.02, -0.42], [0.02, 0.42], [0.34, 1]], [-1, -1, -1, -1], 0.12, 0.22);
  }
  return s;
}
/** A wolf's head on the back of the shoulders, as the pelt's hood thrown back, its muzzle hanging down the back: its ears show over the shoulders. In head units. */
function wolfHoodShape(): Shape {
  const s = new Shape(), dark = 0x7a7a7a;
  s.solid([[-0.02, 0.0, -0.27], [-0.44, 0.0, -0.22], [-0.44, 0.0, 0.22], [-0.02, 0.0, 0.27], [-0.05, 0.52, -0.25], [-0.4, 0.46, -0.2], [-0.4, 0.46, 0.2], [-0.05, 0.52, 0.25]]);
  s.solid([[-0.26, -0.4, -0.07], [-0.42, -0.4, -0.07], [-0.42, -0.4, 0.07], [-0.26, -0.4, 0.07], [-0.18, 0.06, -0.13], [-0.48, 0.06, -0.13], [-0.48, 0.06, 0.13], [-0.18, 0.06, 0.13]], dark);
  // the ears stand out either side of the wearer's head, so that they show from the front
  for (const side of [-1, 1]) {
    const b0: P = [-0.06, 0.48, side * 0.12], b1: P = [-0.04, 0.42, side * 0.3], b2: P = [-0.28, 0.44, side * 0.2], tip: P = [-0.1, 1.12, side * 0.5];
    const m = avg([b0, b1, b2]), inside: P = [m[0], m[1] - 0.3, m[2]];
    s.tri(b0, b1, tip, WHITE, TINT, inside);
    s.tri(b1, b2, tip, dark, TINT, inside);
    s.tri(b2, b0, tip, dark, TINT, inside);
  }
  return s;
}
/** The emblem on a cloak's middle piece, on its outer side: the Society's pyramid, or the griffin of House Arcos. */
function cloakEmblemShape(kind: 'pyramid' | 'griffin'): Shape {
  const s = new Shape(), x = -0.25, inside: P = [1, -0.5, 0];
  const at = (y: number, z: number): P => [x, y, z];
  if (kind === 'pyramid') {
    s.tri(at(-0.8, -0.44), at(-0.8, 0.44), at(-0.18, 0), 0xe0b445, OWN, inside);
    return s;
  }
  const c = 0xdcc07a;
  for (const side of [-1, 1]) {
    s.tri(at(-0.42, 0), at(-0.12, side * 0.66), at(-0.52, side * 0.42), c, OWN, inside);
    s.tri(at(-0.42, 0), at(-0.52, side * 0.42), at(-0.58, side * 0.12), c, OWN, inside);
  }
  s.tri(at(-0.26, 0), at(-0.56, -0.13), at(-0.56, 0.13), c, OWN, inside);
  s.tri(at(-0.84, 0), at(-0.56, -0.13), at(-0.56, 0.13), c, OWN, inside);
  s.tri(at(-0.2, -0.03), at(-0.3, -0.1), at(-0.24, 0.14), c, OWN, inside);
  s.tri(at(-0.82, 0), at(-1.0, -0.14), at(-0.94, 0.1), c, OWN, inside);
  return s;
}

/** Where the breastplate's surface is, `z` across it (in its own half-widths), and a little in front. */
const plateX = (z: number): number => (Math.abs(z) < 0.383 ? 0.95 : 1.33 - Math.abs(z)) + 0.07;
function chestMarkShape(kind: 'lion' | 'pyramid' | 'redSlingBlade' | 'seaSerpents' | 'burningHeart'): Shape {
  const s = new Shape(), inside: P = [0, 0.55, 0];
  switch (kind) {
    case 'lion': {
      // House Augustus's lion, as a gold roundel with a red heart to it
      const c = (r: number, ry: number, x: number): P[] => Array.from({ length: 6 }, (_, i): P => [x, 0.6 + Math.sin((i / 6) * TAU) * ry, Math.cos((i / 6) * TAU) * r]);
      s.poly(c(0.3, 0.13, plateX(0) + 0.01), 0xe0b445, OWN, inside);
      s.poly(c(0.15, 0.065, plateX(0) + 0.03), 0xa3241f, OWN, inside);
      break;
    }
    case 'pyramid':
      s.tri([plateX(0), 0.34, -0.3], [plateX(0), 0.34, 0.3], [plateX(0), 0.74, 0], 0xe0b445, OWN, inside);
      break;
    case 'redSlingBlade': {
      // Ragnar's red slingBlade: a half moon across his breast
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI * (1.12 + (0.76 * i) / n), a1 = Math.PI * (1.12 + (0.76 * (i + 1)) / n);
        const w = (a: number): number => 0.55 + 0.35 * Math.sin(((a / Math.PI - 1.12) / 0.76) * Math.PI);
        const p = (a: number, k: number): P => { const z = Math.cos(a) * 0.46 * k; return [plateX(z), 0.96 + Math.sin(a) * 0.52 * k, z]; };
        s.quad(p(a0, 1), p(a1, 1), p(a1, 1 - 0.3 * w(a1)), p(a0, 1 - 0.3 * w(a0)), 0xb3241e, OWN, inside);
      }
      break;
    }
    case 'seaSerpents': {
      // Aja's blue sea serpents, rising across the gold of her breastplate
      for (const side of [-1, 1]) {
        const pts: [number, number][] = [[0.24, 0.36], [0.42, 0.44], [0.33, 0.58], [0.16, 0.66], [0.28, 0.8], [0.2, 0.9]];
        for (let i = 0; i + 1 < pts.length; i++) {
          const [z0, y0] = pts[i], [z1, y1] = pts[i + 1], w = i === pts.length - 2 ? 0.07 : 0.045;
          const a: P = [plateX(z0) + 0.005, y0, side * z0], b: P = [plateX(z1) + 0.005, y1, side * z1];
          s.quad([a[0], a[1] - w, a[2]], [b[0], b[1] - w, b[2]], [b[0], b[1] + w, b[2]], [a[0], a[1] + w, a[2]], 0x2f78d8, OWN, inside);
        }
      }
      break;
    }
    case 'burningHeart': {
      const x = plateX(0.2) + 0.01, y = 0.62, z = -0.2;
      s.tri([x, y - 0.12, z], [x, y + 0.05, z - 0.14], [x, y + 0.05, z + 0.14], 0xff6a30, EMBER, inside);
      s.tri([x, y + 0.05, z - 0.14], [x, y + 0.12, z - 0.07], [x, y + 0.05, z], 0xff6a30, EMBER, inside);
      s.tri([x, y + 0.05, z], [x, y + 0.12, z + 0.07], [x, y + 0.05, z + 0.14], 0xff6a30, EMBER, inside);
      break;
    }
  }
  return s;
}
/** The skull on the back of the right hand. */
function skullShape(): Shape {
  const s = new Shape();
  s.quad([0.1, -0.28, 0.225], [-0.1, -0.28, 0.225], [-0.1, -0.52, 0.205], [0.1, -0.52, 0.205], 0xf2eee6, OWN, [0, -0.4, 0]);
  return s;
}

// ---------------------------------------------------------------------------
// Weapons, and what burns
// ---------------------------------------------------------------------------

/** Where a hand grips, in hand units: the middle of the fist. */
const GRIP = -0.55;

/** A razor coiled round the forearm, as a bracer: in forearm units. */
function coilShape(): Shape {
  const s = new Shape(), n = 12, r = 1.22, h = 0.11;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2.0 * TAU, a1 = ((i + 1) / n) * 2.0 * TAU, y0 = -0.28 - (0.6 * i) / n, y1 = -0.28 - (0.6 * (i + 1)) / n;
    const p = (a: number, y: number): P => [Math.cos(a) * r, y, Math.sin(a) * r];
    s.quad(p(a0, y0 - h), p(a1, y1 - h), p(a1, y1 + h), p(a0, y0 + h), WHITE, TINT, [0, (y0 + y1) / 2, 0]);
  }
  return s;
}
/** A razor loose as a whip: out from the fist in a loose arc, its tip curling back, in units for a figure 2.3 tall; it stays clear of the ground from a hand held low. */
function whipShape(): Shape {
  const s = new Shape();
  const pts: P[] = [[0, 0, 0], [0.32, 0.04, 0], [0.62, 0.0, 0.02], [0.88, -0.14, 0.05], [1.06, -0.34, 0.05], [1.12, -0.52, 0.02], [1.04, -0.64, -0.03], [0.9, -0.68, -0.07]];
  const r = pts.map((_, i) => mix(0.032, 0.012, i / (pts.length - 1)));
  s.tube(along(pts, r, r, 3, [0, 0, 1]), WHITE, TINT, false, true);
  return s;
}
/** A razor rigid as a blade, in hand units from the wrist: a curved sabre out from the fist. */
function sabreShape(): Shape {
  const s = new Shape(), L = 5.8;
  const line: [number, number][] = [0, 0.2, 0.4, 0.6, 0.8, 1].map((u) => [0.2 + u * L, GRIP + 0.55 * u * u]);
  blade(s, line, [0.3, 0.3, 0.29, 0.25, 0.17, 0], 0.07);
  return s;
}
/** Darrow's razor set to a slingBlade's curve: a half moon out from the fist, its edge on the inside. */
function slingShape(): Shape {
  const s = new Shape(), R = 2.65, n = 7;
  const line: [number, number][] = [], w: number[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * 1.95;
    line.push([0.2 + R * Math.sin(th), GRIP - R + R * Math.cos(th)]);
    w.push(i === n ? 0 : 0.16 + 0.42 * Math.sin((i / n) * Math.PI) ** 0.8);
  }
  blade(s, line, w, 0.075);
  // the salt-stained calf-leather grip
  s.box(-0.1, GRIP - 0.16, -0.12, 0.62, GRIP + 0.16, 0.12, 0x7a5638, OWN);
  return s;
}
/** One of Ragnar's white ionBlades, out from the wrist past the fist along the forearm's line: in forearm units. */
function ionBladeShape(): Shape {
  // laid down the forearm's line, then turned so that its flat faces look ahead and behind, and moved to the forearm's front
  const s = new Shape();
  blade(s, [[0, -0.62], [0, -1.4], [-0.02, -2.1], [-0.05, -2.5], [-0.1, -2.78]], [0.36, 0.36, 0.33, 0.2, 0], 0.14);
  return turned(s, ([x, y, z]) => [z, y, -x], [0.66, 0, 0]);
}
/** Mustang's bow, held at its middle in the left fist: in hand units, along the hand's x, its tips curving towards her. */
const BOW_TIP: P = [4.0, GRIP + 0.74, 0];
function bowShape(): Shape {
  const s = new Shape();
  const xs = [-4.0, -3.5, -2.2, 0, 2.2, 3.5, 4.0];
  const pts = xs.map((x): P => { const u = Math.abs(x) / 4.0; return [x, GRIP + 0.85 * u * u - (u > 0.9 ? (u - 0.9) * 1.1 : 0), 0]; });
  const r = xs.map((x) => mix(0.15, 0.065, Math.abs(x) / 4.0));
  s.tube(along(pts, r, r, 4, [0, 0, 1], Math.PI / 4), WHITE, TINT, true, true);
  return s;
}
/** A thin bar from y = 0 to 1: a bowstring, an arrow. */
function barShape(): Shape {
  const s = new Shape();
  s.tube([ring(4, 0, 1, 1), ring(4, 1, 1, 1)], WHITE, TINT, false, false);
  return s;
}
/** The Dawn Scepter: a metre of gold and iron tipped with the Society's pyramid (DA 30, 31), held at a third of its length. In units for a figure 2.65 tall. */
function sceptreShape(): Shape {
  const s = new Shape(), gold = 0xe0b445, iron = 0x4a4d52;
  s.tube([ring(6, -0.46, 0.032, 0.032), ring(6, 0.98, 0.034, 0.034)], gold, OWN, true, false);
  for (const y of [-0.3, 0.22, 0.56, 0.86]) s.tube([ring(6, y, 0.046, 0.046), ring(6, y + 0.07, 0.046, 0.046)], iron, OWN, false, false);
  s.tube([ring(4, 0.97, 0.095, 0.095, 0, 0, Math.PI / 4), point([0, 1.17, 0], 4)], gold, OWN, true, false);
  return s;
}
/** Fitchner's pulseFist: a heavy gauntlet over the fist, its muzzle at the knuckles. In hand units. */
function pulseFistShape(): Shape {
  const s = new Shape();
  s.tube([ring(8, 0.4, 0.5, 0.42), ring(8, -0.3, 0.56, 0.48), ring(8, -1.02, 0.5, 0.42)], 0x3a3c41, OWN, false, false);
  s.poly(ring(8, -1.02, 0.5, 0.42), 0x2a2c30, OWN, [0, 0, 0]);
  s.poly(ring(8, -1.06, 0.3, 0.26), 0xbfe6ff, LAMP, [0, 0, 0]);
  return s;
}
/** A Gray's rifle, gripped in the fist and pointing along the hand: in hand units. */
function rifleShape(): Shape {
  const s = new Shape(), dark = 0x33363b, steel = 0x5f646b;
  s.box(-1.95, GRIP - 0.28, -0.13, -0.26, GRIP + 0.23, 0.13, dark, OWN);
  s.box(-0.26, GRIP - 0.2, -0.15, 1.68, GRIP + 0.32, 0.15, dark, OWN);
  s.box(1.68, GRIP - 0.02, -0.07, 3.7, GRIP + 0.12, 0.07, steel, OWN);
  s.box(0.3, GRIP - 0.66, -0.1, 0.75, GRIP - 0.2, 0.1, steel, OWN);
  return s;
}
/** The boy's bread: a small loaf. In hand units. */
function breadShape(): Shape {
  const s = new Shape();
  s.solid([[-0.25, GRIP - 0.3, -0.3], [1.0, GRIP - 0.25, -0.24], [1.0, GRIP - 0.25, 0.24], [-0.25, GRIP - 0.3, 0.3], [-0.2, GRIP + 0.3, -0.26], [0.92, GRIP + 0.26, -0.2], [0.92, GRIP + 0.26, 0.2], [-0.2, GRIP + 0.3, 0.26]], 0xb47c3c, OWN);
  return s;
}
/** A Valkyrie's spear, held upright: in units for a figure 3.1 tall. */
function spearShape(): Shape {
  const s = new Shape();
  s.tube([ring(4, -1.0, 0.04, 0.04, 0, 0, Math.PI / 4), ring(4, 2.12, 0.035, 0.035, 0, 0, Math.PI / 4)], 0x6e4c32, OWN, true, true);
  // the head, laid along x and stood up along the shaft, its flat faces looking ahead and behind
  const head = new Shape();
  blade(head, [[2.06, 0], [2.3, 0], [2.64, 0]], [0.11, 0.11, 0], 0.03, 0xc8ced6, OWN);
  return merge(s, turned(head, ([x, y, z]) => [z, x, y]));
}
/** The gravBoots' flame: a cone down from the sole, white at the boot and orange at its tip. Drawn in light. */
function flameShape(): Shape {
  const s = new Shape();
  const top = ring(6, 0, 0.36, 0.3), tip: P = [0, -1.7, 0];
  for (let i = 0; i < 6; i++) {
    const a = top[i], b = top[(i + 1) % 6];
    // corners coloured by height: hot white under the boot, orange at the tip
    s.tri(a, b, tip, 0xfff1c8, TINT, [0, -0.5, 0]);
  }
  for (let i = 0; i < s.col.length; i += 3) {
    if (s.pos[i + 1] < -1) { s.col[i] = 1.0; s.col[i + 1] = 0.36; s.col[i + 2] = 0.06; }
  }
  return s;
}
/** Where a razor rings: a spark of three crossed points. Drawn in light. */
function flashShape(): Shape {
  const s = new Shape();
  const spike = (ax: P, w: number): void => {
    const [x, y, z] = ax, o: P[] = y === 0 ? [[0, w, 0], [0, 0, w], [0, -w, 0], [0, 0, -w]] : [[w, 0, 0], [0, 0, w], [-w, 0, 0], [0, 0, -w]];
    for (let i = 0; i < 4; i++) {
      const a = o[i], b = o[(i + 1) % 4];
      s.tri(a, b, [x, y, z], 0xe8f6ff, TINT, [0, 0, 0]);
      s.tri(b, a, [-x, -y, -z], 0xe8f6ff, TINT, [0, 0, 0]);
    }
  };
  spike([1, 0, 0], 0.12);
  spike([0, 1, 0], 0.12);
  spike([0, 0, 0.8], 0.1);
  return s;
}

// ---------------------------------------------------------------------------
// The parts, each one instanced mesh for every figure that wears it
// ---------------------------------------------------------------------------

const SHAPES: Record<string, () => Shape> = {
  hips: hipsShape, belt: beltShape, chest: chestShape, paunch: paunchShape, pauldron: pauldronShape,
  upper: () => limbShape(0.1, -1.04, 1, 0.86), fore: () => limbShape(0.08, -1.0, 0.92, 0.72), hand: handShape,
  thigh: () => limbShape(0.14, -1.06, 1, 0.82, false, true), shin: () => limbShape(0.12, -1.0, 0.95, 0.68, false, false), boot: bootShape, robe: robeShape,
  head: headShape,
  'hair-short': hairShort, 'hair-cropped': hairCropped, 'hair-curly': hairCurly, 'hair-mohawk': hairMohawk, 'hair-long': hairLong,
  'hair-streaming': hairStreaming, 'hair-halfShaved': hairHalfShaved, 'hair-lockRoot': lockRoot,
  'hair-lock': () => hanging(1.75, 0.13, 0.07, 7, 0.0), 'hair-braid': () => hanging(1.45, 0.12, 0.08, 6, 0.16), 'hair-sideBraid': sideBraid,
  'beard-grey': () => beardShape('grey'), 'beard-forkedRed': () => beardShape('forkedRed'), 'beard-stubble': () => beardShape('stubble'),
  'mark-scar': scarShape, 'mark-tattoos': tattooShape, 'mark-wing': wingTattooShape, 'mark-noseBar': noseBarShape, 'mark-angels': angelsShape,
  'mark-eye': bionicEyeShape, 'mark-skull': skullShape, garland: garlandShape,
  'chest-lion': () => chestMarkShape('lion'), 'chest-pyramid': () => chestMarkShape('pyramid'), 'chest-sling': () => chestMarkShape('redSlingBlade'),
  'chest-serpents': () => chestMarkShape('seaSerpents'), 'chest-heart': () => chestMarkShape('burningHeart'),
  cloak: () => cloakShape(false), 'cloak-jagged': () => cloakShape(true), 'wolf-hood': wolfHoodShape,
  'emblem-pyramid': () => cloakEmblemShape('pyramid'), 'emblem-griffin': () => cloakEmblemShape('griffin'),
  coil: coilShape, whip: whipShape, sabre: sabreShape, sling: slingShape, 'ion-blade': ionBladeShape, bow: bowShape, bar: barShape,
  sceptre: sceptreShape, 'pulse-fist': pulseFistShape, rifle: rifleShape, bread: breadShape, spear: spearShape,
  flame: flameShape, flash: flashShape,
};
for (const h of ['rageWolf', 'morningSun', 'protean', 'wind', 'praetorian', 'gray', 'obsidian', 'scarab', 'bellona'] as Helm[]) SHAPES[`helm-${h}`] = () => helmShape(h);
/** Parts drawn in light rather than paint. */
const LIT = new Set(['flame', 'flash']);

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
    m.name = `figures-${this.name}`;
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.receiveShadow = !this.lit;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color(1, 1, 1));
    return m;
  }

  /** Gives a slot a copy of the part to draw. */
  take(s: Slot): void {
    if (this.owners.length >= this.mesh.instanceMatrix.count) this.grow();
    s.index = this.owners.length;
    this.owners.push(s);
    this.mesh.setColorAt(s.index, s.color);
    this.mesh.count = this.owners.length;
    this.mesh.visible = true;
    this.colors = this.matrices = true;
  }

  /** Takes a slot's copy away, moving the last copy into its place. */
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

  private grow(): void {
    const old = this.mesh, m = this.make(old.instanceMatrix.count * 2);
    (m.instanceMatrix.array as Float32Array).set(old.instanceMatrix.array as Float32Array);
    (m.instanceColor!.array as Float32Array).set(old.instanceColor!.array as Float32Array);
    m.count = old.count;
    m.visible = old.visible;
    this.group.remove(old);
    old.dispose();
    this.group.add(m);
    this.mesh = m;
  }

  /** Sends what changed this frame to the graphics card. */
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

/** One figure's copy of one part: where it is in its pool, its colour, which bone it rides and how it sits there. */
interface Slot {
  pool: Pool;
  index: number;
  color: THREE.Color;
  bone: number;
  /** Where it sits on its bone, in units, or null at the bone itself. */
  off: THREE.Vector3 | null;
  scale: THREE.Vector3;
  /** Whether it should be drawn now. */
  want: boolean;
}

// ---------------------------------------------------------------------------
// A figure's measures and bones
// ---------------------------------------------------------------------------

/** Every length of a figure's body, from its look, in units. */
interface Measures {
  H: number; B: number;
  /** The head, chin to crown, and the neck below it. */
  head: number; neck: number;
  /** The top of the chest above the soles. */
  hb: number;
  /** The hip joints above the soles when it stands, and the ankles. */
  hip: number; ankle: number;
  thigh: number; shin: number; foot: number;
  hipW: number; hipD: number; hipsH: number; legW: number;
  chestH: number; chestW: number; chestD: number;
  shoulderY: number; shoulderW: number;
  upper: number; fore: number; hand: number;
  armR: number; foreR: number; thighR: number; shinR: number;
}

function measure(l: Look): Measures {
  const H = l.height, B = l.build;
  // a toy's head, large enough to carry its hair and helm; it grows more slowly than the body, so that a child's is large and a giant's small
  const head = 0.49 * Math.pow(H / 2.3, 0.6), neck = 0.19 * head, hb = H - head - neck;
  const hip = 0.55 * hb, ankle = 0.045 * hb, waist = 0.69 * hb;
  const thin = Math.pow(B, 0.7), deep = Math.pow(B, 0.8);
  const chestW = 0.13 * hb * B, armR = 0.042 * hb * thin;
  return {
    H, B, head, neck, hb, hip, ankle, thigh: (hip - ankle) / 2, shin: (hip - ankle) / 2, foot: 0.14 * hb,
    hipW: 0.11 * hb * B, hipD: 0.072 * hb * deep, hipsH: waist - hip, legW: 0.058 * hb * B,
    chestH: hb - waist, chestW, chestD: 0.08 * hb * deep,
    shoulderY: 0.92 * hb - waist, shoulderW: chestW + 0.45 * armR,
    upper: 0.235 * hb, fore: 0.21 * hb, hand: 0.085 * hb,
    armR, foreR: 0.037 * hb * thin, thighR: 0.057 * hb * thin, shinR: 0.047 * hb * thin,
  };
}

/** How wide a figure of a look stands, shoulder to shoulder. */
export function widthOf(l: Look): number {
  const d = measure(l);
  return 2 * (d.shoulderW + d.armR);
}

/** How far above its feet a figure's seat is when it sits (`sit`, `ride`): for putting a rider on a saddle. */
export function seatOf(l: Look): number {
  const d = measure(l);
  return d.hip - 0.5 * (d.thigh + d.shin);
}

const ROOT = 0, PELVIS = 1, HIPS = 2, CHEST = 3, HEAD_B = 4, UPPER_L = 5, UPPER_R = 6, FORE_L = 7, FORE_R = 8, HAND_L = 9, HAND_R = 10;
const THIGH_L = 11, THIGH_R = 12, SHIN_L = 13, SHIN_R = 14, FOOT_L = 15, FOOT_R = 16, CLOAK_1 = 17, CLOAK_2 = 18, CLOAK_3 = 19;
const ROBE = 20, UPRIGHT = 21, WHIP_R = 22, WHIP_L = 23, FLASH = 24, BONES = 25;

/** The arms stand a little out from the hips, and the legs a little apart, even when the pose says 0. */
const REST_SPREAD = 0.07, SPLAY = 0.04;

// scratch, so that a frame makes no garbage
const M1 = new THREE.Matrix4(), TMP = new THREE.Matrix4(), Q1 = new THREE.Quaternion(), E1 = new THREE.Euler();
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3(), V5 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
const rotX = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationX(a));
const rotY = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationY(a));
const rotZ = (m: THREE.Matrix4, a: number): THREE.Matrix4 => m.multiply(M1.makeRotationZ(a));
const move = (m: THREE.Matrix4, x: number, y: number, z: number): THREE.Matrix4 => m.multiply(M1.makeTranslation(x, y, z));

/** What the figures share: their pools, their clock and the hour. */
interface Kit {
  pool(name: string): Pool;
  clock: number;
}

const CLOAK_LENGTH = { wolf: 0.66, plain: 0.78, long: 0.88, pyramid: 0.88 };
/** Hair that a helm hides, and hair that hangs out below one. */
const UNDER_HELM: Record<Hair, boolean> = { short: true, curly: true, mohawk: true, lock: false, braid: true, long: true, streaming: true, bald: false, halfShaved: true, cropped: true };

class Fig implements Figure {
  readonly look: Look;
  private readonly kit: Kit;
  private readonly d: Measures;
  private readonly seed: number;
  private x = 0; private y = -50; private z = 0; private h = 0;
  private readonly p: Pose = { ...STANDING };
  private state: 'coiled' | 'whip' | 'blade' = 'coiled';
  private flashF = 0;
  private bootsF = 0;
  private cloakF = 0;
  private helmOn: boolean;
  private isShown = true;
  dirty = true;
  /** The bones, in the tile's coordinates. */
  private readonly M: THREE.Matrix4[] = Array.from({ length: BONES }, () => new THREE.Matrix4());
  private readonly S: THREE.Vector3[] = Array.from({ length: BONES }, () => new THREE.Vector3(1, 1, 1));
  private readonly slots: Slot[] = [];
  private readonly roles = new Map<string, Slot[]>();
  private readonly cloakLen: number;

  constructor(look: Look, kit: Kit, seed: number) {
    this.look = look;
    this.kit = kit;
    this.seed = seed;
    this.helmOn = look.helmOn;
    const d = (this.d = measure(look));
    const S = this.S, l = look, armour = l.armour !== false;
    S[HIPS].set(d.hipD, d.hipsH, d.hipW);
    S[CHEST].set(d.chestD, d.chestH, d.chestW);
    S[HEAD_B].setScalar(d.head);
    S[UPPER_L].set(d.armR, d.upper, d.armR); S[UPPER_R].copy(S[UPPER_L]);
    S[FORE_L].set(d.foreR, d.fore, d.foreR); S[FORE_R].copy(S[FORE_L]);
    S[HAND_L].setScalar(d.hand); S[HAND_R].setScalar(d.hand);
    S[THIGH_L].set(d.thighR, d.thigh, d.thighR); S[THIGH_R].copy(S[THIGH_L]);
    S[SHIN_L].set(d.shinR, d.shin, d.shinR); S[SHIN_R].copy(S[SHIN_L]);
    S[FOOT_L].setScalar(d.foot); S[FOOT_R].setScalar(d.foot);
    const kind = l.cloak?.kind ?? 'plain';
    this.cloakLen = CLOAK_LENGTH[kind] * d.hb;
    for (let i = 0; i < 3; i++) S[CLOAK_1 + i].set(d.chestD, this.cloakLen / 3, d.chestW * 1.02 * Math.pow(1.12, i));

    const hs = l.hairScale ?? 1;
    const add = (role: string, part: string, color: number, bone: number, off: THREE.Vector3 | null = null, scale: THREE.Vector3 | null = null): void => {
      const slot: Slot = { pool: kit.pool(part), index: -1, color: new THREE.Color(color), bone, off, scale: scale ?? S[bone], want: false };
      this.slots.push(slot);
      const list = this.roles.get(role);
      if (list) list.push(slot); else this.roles.set(role, [slot]);
    };
    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    const darker = (c: number, k: number): number => new THREE.Color(c).multiplyScalar(k).getHex();

    // the body
    if (!l.robe) add('body', 'hips', l.limbs, HIPS);
    add('body', 'belt', l.trim, HIPS);
    add('body', 'chest', l.body, CHEST);
    if (l.paunch) add('body', 'paunch', l.body, CHEST);
    const leftArm = l.leftArm ?? l.limbs;
    add('body', 'upper', leftArm, UPPER_L);
    add('body', 'upper', l.limbs, UPPER_R);
    add('body', 'fore', leftArm, FORE_L);
    add('body', 'fore', l.limbs, FORE_R);
    const hand = armour ? l.trim : l.skin;
    if (!l.marks?.includes('stump')) add('body', 'hand', l.leftArm ?? hand, HAND_L);
    add('body', 'hand', hand, HAND_R);
    if (armour) {
      add('body', 'pauldron', l.leftArm ?? l.trim, UPPER_L, null, v(d.armR, d.armR, d.armR));
      add('body', 'pauldron', l.trim, UPPER_R, null, v(d.armR, d.armR, d.armR));
    }
    if (l.robe) {
      add('body', 'robe', l.body, ROBE, null, S[ROBE]);
    } else {
      add('body', 'thigh', l.limbs, THIGH_L); add('body', 'thigh', l.limbs, THIGH_R);
      add('body', 'shin', l.limbs, SHIN_L); add('body', 'shin', l.limbs, SHIN_R);
      const boot = armour ? l.trim : darker(l.limbs, 0.55);
      add('body', 'boot', boot, FOOT_L); add('body', 'boot', boot, FOOT_R);
    }
    // the head and what is on it
    add('body', 'head', l.skin, HEAD_B);
    const headMid = (k: number): THREE.Vector3 => v(0, MID[1] * d.head * (1 - k), 0);
    const style = l.hairStyle;
    if (style === 'lock') {
      add('hair', 'hair-lockRoot', l.hair, HEAD_B);
      add('tail', 'hair-lock', l.hair, CHEST, v(-1.02 * d.chestD - 0.16 * d.head, d.chestH, 0), v(d.head, d.head, d.head));
    } else if (style === 'braid') {
      add('hair', 'hair-cropped', l.hair, HEAD_B);
      add('tail', 'hair-braid', l.hair, CHEST, v(-1.0 * d.chestD - 0.12 * d.head, d.chestH, 0), v(d.head, d.head, d.head));
    } else if (style === 'halfShaved') {
      add('hair', 'hair-halfShaved', l.hair, HEAD_B);
      add('tail', 'hair-sideBraid', l.hair, HEAD_B);
    } else if (style !== 'bald') {
      add('hair', `hair-${style}`, l.hair, HEAD_B, hs !== 1 ? headMid(hs) : null, hs !== 1 ? v(d.head * hs, d.head * hs, d.head * hs) : null);
    }
    if (l.garland !== undefined) add('hair', 'garland', l.garland, HEAD_B, hs !== 1 ? headMid(hs) : null, hs !== 1 ? v(d.head * hs, d.head * hs, d.head * hs) : null);
    if (l.beard) add('beard', `beard-${l.beard}`, l.beard === 'forkedRed' ? 0xc8401e : l.beard === 'grey' ? 0xb4b2ac : darker(l.hair, 0.75), HEAD_B);
    if (l.helm !== 'none') add('helm', `helm-${l.helm}`, l[HELM_COLOR[l.helm]], HEAD_B);
    const marks = new Set(l.marks ?? []);
    const face: [Mark, string][] = [['peerlessScar', 'mark-scar'], ['faceTattoos', 'mark-tattoos'], ['wingTattoo', 'mark-wing'], ['noseBar', 'mark-noseBar'], ['angelTattoos', 'mark-angels'], ['bionicEye', 'mark-eye']];
    for (const [m, part] of face) if (marks.has(m)) add('face', part, WHITE, HEAD_B);
    if (marks.has('skullHand')) add('body', 'mark-skull', WHITE, HAND_R);
    const breast: [Mark, string][] = [['lion', 'chest-lion'], ['redSlingBlade', 'chest-sling'], ['seaSerpents', 'chest-serpents'], ['burningHeart', 'chest-heart']];
    for (const [m, part] of breast) if (marks.has(m)) add('body', part, WHITE, CHEST);
    if (marks.has('pyramid') && !l.cloak) add('body', 'chest-pyramid', WHITE, CHEST);
    // the cloak
    if (l.cloak) {
      const c = l.cloak.color;
      add('cloak', 'cloak', c, CLOAK_1);
      add('cloak', 'cloak', c, CLOAK_2);
      add('cloak', l.cloak.kind === 'wolf' ? 'cloak-jagged' : 'cloak', c, CLOAK_3);
      if (l.cloak.kind === 'wolf') add('cloak', 'wolf-hood', c, CHEST, v(-1.0 * d.chestD, 0.96 * d.chestH, 0), v(d.head * 0.92, d.head * 0.92, d.head * 0.92));
      if (l.cloak.kind === 'pyramid' || marks.has('pyramid')) add('cloak', 'emblem-pyramid', WHITE, CLOAK_2);
      if (marks.has('griffin')) add('cloak', 'emblem-griffin', WHITE, CLOAK_2);
    }
    // the arms they bear
    const razor = l.razorColor ?? STEEL, rigid = l.blade === 'sling' ? 'sling' : 'sabre';
    const tall = l.height / 2.3;
    const razorIn = (side: 'R' | 'L'): void => {
      const R = side === 'R';
      add(`coil${side}`, 'coil', razor, R ? FORE_R : FORE_L);
      add(`whip${side}`, 'whip', razor, R ? WHIP_R : WHIP_L, null, v(tall, tall, tall));
      add(`blade${side}`, rigid, razor, R ? HAND_R : HAND_L);
    };
    switch (l.arms) {
      case 'razor': razorIn('R'); break;
      case 'twoRazors': razorIn('R'); razorIn('L'); break;
      case 'ionBlades':
        add('ion', 'ion-blade', 0xf4f6f8, FORE_L, null, v(d.foreR, d.fore, d.foreR));
        add('ion', 'ion-blade', 0xf4f6f8, FORE_R, null, v(d.foreR, d.fore, d.foreR));
        break;
      case 'bow':
        add('body', 'bow', 0x9a6a36, HAND_L);
        add('string', 'bar', 0xf0ead8, ROOT);
        add('string', 'bar', 0xf0ead8, ROOT);
        add('arrow', 'bar', 0xd8c8a0, ROOT);
        break;
      case 'sceptre': add('body', 'sceptre', WHITE, UPRIGHT, null, v(l.height / 2.65, l.height / 2.65, l.height / 2.65)); break;
      case 'spear': add('body', 'spear', WHITE, UPRIGHT, null, v(l.height / 3.1, l.height / 3.1, l.height / 3.1)); break;
      case 'pulseFist': add('body', 'pulse-fist', WHITE, HAND_R); break;
      case 'rifle': add('body', 'rifle', WHITE, HAND_R); break;
      case 'bread': add('body', 'bread', WHITE, HAND_R); break;
      case 'none': break;
    }
    // what burns: the boots' flames, and the spark where a razor rings
    add('flame', 'flame', 0xffffff, FOOT_L, v(0.2 * d.foot, -d.ankle, 0), v(d.foot, d.foot, d.foot));
    add('flame', 'flame', 0xffffff, FOOT_R, v(0.2 * d.foot, -d.ankle, 0), v(d.foot, d.foot, d.foot));
    add('flash', 'flash', 0xffffff, FLASH, null, v(1, 1, 1));
  }

  // ---- what the show calls

  at(x: number, y: number, z: number, heading: number): void {
    if (x === this.x && y === this.y && z === this.z && heading === this.h) return;
    this.x = x; this.y = y; this.z = z; this.h = heading;
    this.dirty = true;
  }

  pose(p: Partial<Pose>): void {
    const q = this.p as unknown as Record<string, number>, src = p as Record<string, number | undefined>;
    for (const key in STANDING) {
      const val = src[key] ?? 0;
      if (q[key] !== val) { q[key] = val; this.dirty = true; }
    }
  }

  razor(state: 'coiled' | 'whip' | 'blade', flash = 0): void {
    const s = this.look.arms === 'ionBlades' && state === 'whip' ? 'blade' : state;
    if (s !== this.state || flash !== this.flashF) { this.state = s; this.flashF = flash; this.dirty = true; }
  }

  boots(f: number): void {
    if (f !== this.bootsF) { this.bootsF = f; this.dirty = true; }
  }

  cloak(f: number): void {
    if (f !== this.cloakF) { this.cloakF = f; this.dirty = true; }
  }

  helm(on: boolean): void {
    if (on !== this.helmOn) { this.helmOn = on; this.dirty = true; }
  }

  shown(v: boolean): void {
    if (v !== this.isShown) { this.isShown = v; this.dirty = true; }
  }

  /** Whether it moves of itself between poses, and has to be drawn afresh every frame: a cloak that streams, a flame, a spark, a whip. */
  get live(): boolean {
    return this.isShown && (this.cloakF > 0.01 || this.bootsF > 0.01 || this.flashF > 0.01 || this.state === 'whip');
  }

  /** How many triangles it costs now. */
  get triangles(): number {
    let n = 0;
    for (const s of this.slots) if (s.index >= 0) n += s.pool.tris;
    return n;
  }

  // ---- drawing it

  /** Which of its parts it should draw now. */
  private wants(): void {
    const l = this.look, on = this.isShown;
    const helmed = this.helmOn && l.helm !== 'none';
    const want = (role: string, v: boolean): void => { for (const s of this.roles.get(role) ?? []) s.want = v; };
    want('body', on);
    want('tail', on);
    want('beard', on);
    want('cloak', on);
    want('hair', on && !(helmed && UNDER_HELM[l.hairStyle]));
    want('helm', on && helmed);
    want('face', on && !(helmed && COVERS[l.helm]));
    want('coilR', on && this.state === 'coiled'); want('coilL', on && this.state === 'coiled');
    want('whipR', on && this.state === 'whip'); want('whipL', on && this.state === 'whip');
    want('bladeR', on && this.state === 'blade'); want('bladeL', on && this.state === 'blade');
    want('ion', on);
    want('flame', on && this.bootsF > 0.02);
    want('flash', on && this.flashF > 0.02);
    const strings = this.roles.get('string');
    if (strings) {
      strings[0].want = on;
      strings[1].want = on && this.drawing();
      for (const s of this.roles.get('arrow') ?? []) s.want = on && this.drawing() && this.p.elbowR > 2.0;
    }
    for (const s of this.slots) {
      if (s.want && s.index < 0) s.pool.take(s);
      else if (!s.want && s.index >= 0) s.pool.drop(s);
    }
  }

  /** Whether the right hand is at the bowstring: the bow arm up and the hands near. */
  private drawing(): boolean {
    return this.p.armL > 0.9 && this.p.spreadR > 0.6;
  }

  /** Works out every bone from where it stands and how. */
  private bones(): void {
    const d = this.d, p = this.p, M = this.M, clock = this.kit.clock;
    const root = M[ROOT].makeRotationY(-this.h).setPosition(this.x, this.y, this.z);
    // a crouch sinks the hips, and the legs bend to keep the feet down
    const legs = d.thigh + d.shin, drop = clamp(p.crouch, 0, 1.1) * 0.5 * legs;
    const th = Math.acos(clamp(1 - drop / legs, -1, 1));
    move(M[PELVIS].copy(root), 0, d.hip - drop, 0);
    rotX(rotZ(M[HIPS].copy(M[PELVIS]), -p.lean), -p.tilt);
    rotY(move(M[CHEST].copy(M[HIPS]), 0, d.hipsH, 0), p.twist);
    rotZ(rotY(move(M[HEAD_B].copy(M[CHEST]), 0, d.chestH, 0), p.head), -p.nod);
    // the arms: swing, then out to the side, then the elbow
    for (const side of [-1, 1]) {
      const L = side < 0, U = L ? UPPER_L : UPPER_R, F = L ? FORE_L : FORE_R, Hd = L ? HAND_L : HAND_R;
      const arm = L ? p.armL : p.armR, spread = (L ? p.spreadL : p.spreadR) + REST_SPREAD, elbow = L ? p.elbowL : p.elbowR;
      rotZ(rotX(move(M[U].copy(M[CHEST]), 0, d.shoulderY, side * d.shoulderW), -side * spread), arm);
      rotZ(move(M[F].copy(M[U]), 0, -d.upper, 0), Math.max(0, elbow));
      move(M[Hd].copy(M[F]), 0, -d.fore, 0);
    }
    // the legs, and the feet: level while they are on the ground, following the shins when they are off it
    const straddle = p.straddle ?? 0;
    for (const side of [-1, 1]) {
      const L = side < 0, T = L ? THIGH_L : THIGH_R, Sh = L ? SHIN_L : SHIN_R, Ft = L ? FOOT_L : FOOT_R;
      const hip = L ? p.hipL : p.hipR, knee = L ? p.kneeL : p.kneeR, splay = SPLAY + straddle * 1.05;
      rotZ(rotX(move(M[T].copy(M[PELVIS]), 0, 0, side * d.legW), -side * splay), hip + th);
      rotZ(move(M[Sh].copy(M[T]), 0, -d.thigh, 0), -(knee + 2 * th));
      V1.set(0, -d.shin, 0).applyMatrix4(M[Sh]);
      const shinPitch = hip - knee - th;
      const off = Math.max(smooth(1.4 * d.ankle, 3 * d.ankle, V1.y - this.y), smooth(1.0, 1.5, -shinPitch), this.bootsF > 0.3 ? 1 : 0);
      rotZ(rotX(M[Ft].copy(root).setPosition(V1), -side * splay * 0.6), shinPitch * off);
    }
    // the cloak: three pieces from the back of the shoulders, hanging by their weight and streaming out behind
    if (this.look.cloak) {
      const c = M[CHEST];
      V1.set(-1.02 * d.chestD, 0.97 * d.chestH, 0).applyMatrix4(c);
      // which way the chest faces, and how far it leans that way
      V2.setFromMatrixColumn(c, 0);
      const yaw = Math.atan2(-V2.z, V2.x);
      V3.setFromMatrixColumn(c, 1);
      const fx = Math.cos(yaw), fz = -Math.sin(yaw);
      const leanW = Math.atan2(V3.x * fx + V3.z * fz, V3.y);
      // how far back the thighs reach, which the cloak must hang clear of; over the calves it drapes
      let legBack = 0;
      for (const T of [THIGH_L, THIGH_R]) {
        V4.setFromMatrixColumn(M[T], 1);
        legBack = Math.max(legBack, Math.atan2(V4.x * fx + V4.z * fz, V4.y));
      }
      legBack = Math.max(0, legBack * 0.8);
      const base = Math.max(leanW + 0.12, 0.12), f = clamp(this.cloakF);
      const flutter = (i: number): number => f * (0.08 + 0.07 * i) * Math.sin(clock * (6.5 + 1.3 * i) + i * 1.3 + this.seed);
      const want = [
        mix(base, Math.max(base, 0.95), f) + flutter(0) * 0.5,
        mix(Math.max(base * 0.35, legBack), Math.max(base, 1.25), f) + flutter(1),
        mix(Math.max(base * 0.2, legBack * 0.9), Math.max(base, 1.45), f) + flutter(2),
      ];
      const len = this.cloakLen / 3;
      for (let i = 0; i < 3; i++) {
        let phi = Math.max(0, want[i]);
        // never into the ground
        const room = V1.y - this.y - 0.06;
        if (room < len * Math.cos(phi)) phi = Math.max(phi, Math.acos(clamp(room / len, -1, 1)));
        const m = M[CLOAK_1 + i];
        rotZ(rotY(m.makeTranslation(V1.x, V1.y, V1.z), yaw), -phi);
        V1.set(V1.x - Math.sin(phi) * len * fx, V1.y - Math.cos(phi) * len, V1.z - Math.sin(phi) * len * fz);
      }
    }
    // the robe, from the waist straight down to the ground, turning a little with the body
    if (this.look.robe) {
      const waist = d.hip - drop + d.hipsH;
      rotY(move(M[ROBE].copy(root), 0, waist, 0), p.twist * 0.3);
      this.S[ROBE].set(d.hipD, waist, d.hipW * 1.05);
    }
    // a staff held upright in the right hand, leaning a little the way the hand points
    V1.set(0, GRIP * d.hand, 0).applyMatrix4(M[HAND_R]);
    V2.setFromMatrixColumn(M[HAND_R], 0).normalize();
    V3.copy(UP).addScaledVector(V2, 0.35).normalize();
    M[UPRIGHT].compose(V1, Q1.setFromUnitVectors(UP, V3), ONE);
    // a whip out from each fist, drooping by its own weight, and swaying
    for (const [Hd, W] of [[HAND_R, WHIP_R], [HAND_L, WHIP_L]]) {
      V1.set(0, GRIP * d.hand, 0).applyMatrix4(M[Hd]);
      V2.setFromMatrixColumn(M[Hd], 0).normalize();
      V3.copy(UP).addScaledVector(V2, -V2.y);
      if (V3.lengthSq() < 0.04) V3.setFromMatrixColumn(M[Hd], 1);
      V3.normalize();
      V4.crossVectors(V2, V3);
      rotY(M[W].makeBasis(V2, V3, V4).setPosition(V1), 0.25 * Math.sin(clock * 5 + this.seed));
    }
  }

  /** Where the razor rings, or the fist fires: in the tile's coordinates. */
  private flashAt(out: THREE.Vector3): THREE.Vector3 {
    const d = this.d, M = this.M, l = this.look;
    if (l.arms === 'ionBlades') return out.set(0.6 * d.foreR, -1.9 * d.fore, 0).applyMatrix4(M[FORE_R]);
    if (l.arms === 'pulseFist') return out.set(0, -1.15 * d.hand, 0).applyMatrix4(M[HAND_R]);
    if (l.arms === 'razor' || l.arms === 'twoRazors') {
      if (this.state === 'whip') return out.set(0.9 * (l.height / 2.3), -0.45 * (l.height / 2.3), 0).applyMatrix4(M[WHIP_R]);
      if (this.state === 'blade') return (l.blade === 'sling' ? out.set(2.7 * d.hand, (GRIP - 1.2) * d.hand, 0) : out.set(4.2 * d.hand, (GRIP + 0.2) * d.hand, 0)).applyMatrix4(M[HAND_R]);
    }
    return out.set(0, GRIP * d.hand, 0).applyMatrix4(M[HAND_R]);
  }

  /** Writes the figure into the meshes. */
  write(): void {
    this.wants();
    this.dirty = false;
    if (!this.isShown) return;
    this.bones();
    const M = this.M, d = this.d, clock = this.kit.clock;
    for (const s of this.slots) {
      if (s.index < 0) continue;
      s.pool.matrices = true;
      if (s.bone === ROOT || s.bone === FLASH) continue;
      M1.copy(M[s.bone]);
      if (s.off) M1.multiply(TMP.makeTranslation(s.off.x, s.off.y, s.off.z));
      M1.scale(s.scale);
      s.pool.mesh.setMatrixAt(s.index, M1);
    }
    // the flames: as long as the boots burn, and flickering
    for (const s of this.roles.get('flame') ?? []) {
      if (s.index < 0) continue;
      const left = s.bone === FOOT_L, f = this.bootsF * (0.85 + 0.15 * Math.sin(clock * 37 + (left ? 0 : 2) + this.seed));
      M1.copy(M[s.bone]).multiply(TMP.makeTranslation(s.off!.x, s.off!.y, s.off!.z)).scale(V1.set(d.foot * (0.7 + 0.3 * this.bootsF), d.foot * Math.max(0.05, f), d.foot * (0.7 + 0.3 * this.bootsF)));
      s.pool.mesh.setMatrixAt(s.index, M1);
    }
    // the ionBlades, out or sheathed along the forearm
    for (const s of this.roles.get('ion') ?? []) {
      if (s.index < 0) continue;
      M1.copy(M[s.bone]).scale(V1.set(d.foreR, d.fore * (this.state === 'blade' ? 1 : 0.42), d.foreR));
      s.pool.mesh.setMatrixAt(s.index, M1);
    }
    // the spark
    for (const s of this.roles.get('flash') ?? []) {
      if (s.index < 0) continue;
      const size = (0.22 + 0.42 * clamp(this.flashF)) * (this.look.height / 2.3);
      this.flashAt(V1);
      Q1.setFromEuler(E1.set(clock * 7 + this.seed, clock * 5, 0.6));
      M1.compose(V1, Q1, V2.set(size, size, size));
      s.pool.mesh.setMatrixAt(s.index, M1);
    }
    // the bowstring, straight between the tips or drawn back to the right hand, and the arrow on it
    const strings = this.roles.get('string');
    if (strings) {
      const tipA = V1.set(BOW_TIP[0] * d.hand, BOW_TIP[1] * d.hand, 0).applyMatrix4(M[HAND_L]).clone();
      const tipB = V2.set(-BOW_TIP[0] * d.hand, BOW_TIP[1] * d.hand, 0).applyMatrix4(M[HAND_L]).clone();
      const pull = V3.set(0, GRIP * d.hand, 0).applyMatrix4(M[HAND_R]).clone();
      const r = 0.012 * (this.look.height / 2.3);
      if (strings[1].index >= 0) {
        bar(strings[0], tipA, pull, r);
        bar(strings[1], pull, tipB, r);
      } else bar(strings[0], tipA, tipB, r);
      const arrow = this.roles.get('arrow')?.[0];
      if (arrow && arrow.index >= 0) {
        const grip = V4.set(0, GRIP * d.hand, 0).applyMatrix4(M[HAND_L]);
        const far = grip.clone().sub(pull).normalize().multiplyScalar(0.25 * (this.look.height / 2.3)).add(grip);
        bar(arrow, pull, far, r * 1.4);
      }
    }
  }
}

/** Lays a bar's copy from one point to another, `r` thick. */
function bar(s: Slot, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
  if (s.index < 0) return;
  const dir = V4.copy(b).sub(a), len = Math.max(1e-3, dir.length());
  Q1.setFromUnitVectors(UP, dir.divideScalar(len));
  M1.compose(a, Q1, V5.set(r, len, r));
  s.pool.mesh.setMatrixAt(s.index, M1);
  s.pool.matrices = true;
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

/** Makes the pools of parts for a tile, built as each is first worn: paint in the city's look, and light for what burns. */
function kitFor(k: Build): Kit & { pools: Map<string, Pool>; glow: THREE.MeshBasicMaterial; spark: THREE.MeshBasicMaterial } {
  const paint = k.mat.vehicle();
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const spark = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pools = new Map<string, Pool>();
  const kit = {
    pools, glow, spark, clock: 0,
    pool(name: string): Pool {
      let p = pools.get(name);
      if (!p) {
        const make = SHAPES[name];
        if (!make) throw new Error(`The Iron Rain: no figure part ${name}`);
        p = new Pool(k.group, name, make().build(), name === 'flash' ? spark : LIT.has(name) ? glow : paint, LIT.has(name));
        if (name === 'flash') p.mesh.renderOrder = 3;
        pools.set(name, p);
      }
      return p;
    },
  };
  return kit;
}

export function buildCast(k: Build): Cast {
  const kit = kitFor(k);
  const figs: Fig[] = [];
  let seed = 0;
  // the clock that cloaks flutter and flames flicker by, and the flames bright by night
  k.each((dt, _time, night) => {
    kit.clock += dt;
    kit.glow.color.setScalar(1.0 + 1.4 * night);
    kit.spark.color.setScalar(1.2 + 1.6 * night);
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
    triangles: () => (figs.length ? Math.round(figs.reduce((n, f) => n + f.triangles, 0) / figs.length) : 0),
  };
  if (import.meta.env.DEV) {
    devTools(k, cast, kit.pools);
    // how long writing every figure afresh takes, in milliseconds, as when all of them move at once
    Object.assign((window as unknown as { rrCast: object }).rrCast, {
      bench(n = 60): string {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) { for (const f of figs) f.dirty = true; cast.commit(); }
        return `${figs.length} figures, all of them written afresh: ${((performance.now() - t0) / n).toFixed(3)} ms a frame`;
      },
    });
  }
  return cast;
}

// ---------------------------------------------------------------------------
// Griffins
// ---------------------------------------------------------------------------
//
// The books give the Valkyrie griffins (MS 29, 30) and no look beyond the
// beast: this one is this file's drawing. A white eagle's head with a golden
// hooked beak, ear tufts and amber eyes; brown wings with pale tips; yellow
// eagle's forelegs with talons; a tawny lion's body, haunches and tail with a
// dark tuft; and a saddle on a blue blanket behind the wings. It is 6 long,
// its back 2.2 high, its wings 11 across.

const G_WHITE = 0xf2eee6, G_TAWNY = 0xc9975a, G_GOLD = 0xe0b13a, G_BROWN = 0x7c5b3b, G_PALE = 0xe6dccb, G_UNDER = 0xa98b69;
/** The saddle's top, in the griffin's own units: where a rider's seat goes. */
const SADDLE: P = [0.1, 2.24, 0];
/** Where each wing is joined on, and how long its two parts are. */
const SHOULDER: P = [0.42, 2.12, 0.5], INNER = 2.3, OUTER = 2.6;

function griffinBodyShape(): Shape {
  const s = new Shape();
  // the body and neck along one line, from the rump to the beak's root: [x, y, half its height, half its width, colour]
  const spine: [number, number, number, number, number][] = [
    [-2.25, 1.66, 0.34, 0.36, G_TAWNY], [-1.8, 1.62, 0.62, 0.6, G_TAWNY], [-0.8, 1.56, 0.58, 0.56, G_TAWNY], [0.25, 1.62, 0.6, 0.58, 0xd8b07c],
    [0.95, 1.84, 0.5, 0.48, G_WHITE], [1.32, 2.28, 0.37, 0.35, G_WHITE], [1.6, 2.72, 0.31, 0.29, G_WHITE], [1.92, 3.0, 0.32, 0.29, G_WHITE],
    [2.3, 2.98, 0.23, 0.21, G_WHITE], [2.46, 2.93, 0.15, 0.13, G_WHITE],
  ];
  const rings = along(spine.map(([x, y]): P => [x, y, 0]), spine.map((p) => p[2]), spine.map((p) => p[3]), 8);
  for (let i = 0; i + 1 < rings.length; i++) s.tube([rings[i], rings[i + 1]], spine[i][4], TINT, i === 0, false);
  // the hooked beak
  const beak: P[] = [[2.44, 2.93, 0], [2.66, 2.89, 0], [2.8, 2.79, 0], [2.85, 2.66, 0]];
  s.tube(along(beak, [0.15, 0.1, 0.06, 0], [0.13, 0.08, 0.04, 0], 4, [0, 0, 1], Math.PI / 4), G_GOLD, TINT, true, false);
  // amber eyes, and the tufts over them
  for (const side of [-1, 1]) {
    const e: P = [2.06, 3.06, side * 0.27];
    s.quad([e[0] - 0.06, e[1] - 0.05, e[2]], [e[0] + 0.06, e[1] - 0.05, e[2]], [e[0] + 0.06, e[1] + 0.05, e[2]], [e[0] - 0.06, e[1] + 0.05, e[2]], 0xe0a020, OWN, [e[0], e[1], 0]);
    s.quad([e[0] + 0.0, e[1] - 0.025, e[2] + side * 0.005], [e[0] + 0.05, e[1] - 0.025, e[2] + side * 0.005], [e[0] + 0.05, e[1] + 0.025, e[2] + side * 0.005], [e[0] + 0.0, e[1] + 0.025, e[2] + side * 0.005], 0x141414, OWN, [e[0], e[1], 0]);
    const t0: P = [1.95, 3.24, side * 0.12], t1: P = [1.72, 3.22, side * 0.18], tip: P = [1.58, 3.56, side * 0.22];
    s.tri(t0, t1, tip, G_WHITE, TINT, [1.8, 3.2, side * 0.05]);
    s.tri(t1, t0, tip, G_WHITE, TINT, [1.8, 3.2, side * 0.5]);
  }
  // the eagle's forelegs, feathered at the top and yellow below, with talons
  for (const side of [-1, 1]) {
    const z = side * 0.3;
    s.tube(along([[0.72, 1.5, z], [0.82, 0.76, z]], [0.17, 0.12], [0.15, 0.11], 6), G_WHITE, TINT, false, false);
    s.tube(along([[0.82, 0.8, z], [0.8, 0.12, z]], [0.08, 0.07], [0.08, 0.07], 6), G_GOLD, TINT, false, true);
    for (const [dx, dz] of [[0.3, 0], [0.24, 0.12], [0.24, -0.12], [-0.2, 0]]) s.tube(along([[0.8, 0.12, z], [0.8 + dx, 0.03, z + dz], [0.8 + dx * 1.2, 0.0, z + dz * 1.2]], [0.045, 0.035, 0], [0.045, 0.035, 0], 3), dx > 0 ? G_GOLD : 0x2a2420, TINT, false, false);
  }
  // the lion's haunches and hind legs, with paws
  for (const side of [-1, 1]) {
    const z = side * 0.38;
    s.tube(along([[-1.6, 1.55, z], [-1.86, 0.84, z]], [0.28, 0.17], [0.2, 0.15], 6), G_TAWNY, TINT, false, false);
    s.tube(along([[-1.86, 0.86, z], [-1.7, 0.14, z]], [0.12, 0.1], [0.11, 0.1], 6), G_TAWNY, TINT, false, false);
    s.box(-1.86, 0, z - 0.12, -1.5, 0.16, z + 0.12, 0xb8884e);
  }
  // the tail, with its dark tuft
  const tail: P[] = [[-2.2, 1.66, 0], [-2.6, 1.55, 0], [-3.0, 1.25, 0], [-3.3, 1.0, 0], [-3.55, 0.98, 0], [-3.72, 1.1, 0]];
  s.tube(along(tail, [0.1, 0.09, 0.08, 0.07, 0.06, 0.06], [0.1, 0.09, 0.08, 0.07, 0.06, 0.06], 5), G_TAWNY, TINT, false, false);
  s.tube(along([[-3.68, 1.06, 0], [-3.82, 1.2, 0], [-3.98, 1.34, 0]], [0.06, 0.16, 0], [0.06, 0.16, 0], 5), 0x4a3222, TINT, false, false);
  // the saddle, on a blue blanket over the back behind the wings
  s.solid([[-0.36, 2.02, -0.5], [0.56, 2.02, -0.5], [0.56, 2.02, 0.5], [-0.36, 2.02, 0.5], [-0.32, SADDLE[1] + 0.02, -0.36], [0.52, SADDLE[1] - 0.02, -0.36], [0.52, SADDLE[1] - 0.02, 0.36], [-0.32, SADDLE[1] + 0.02, 0.36]], 0x5a3a24);
  s.box(-0.36, SADDLE[1] + 0.02, -0.3, -0.22, SADDLE[1] + 0.16, 0.3, 0x5a3a24);
  for (const side of [-1, 1]) {
    const z0 = side * 0.6, z1 = side * 0.64;
    s.box(-0.46, 1.5, Math.min(z0, z1), 0.62, 2.12, Math.max(z0, z1), 0x34548a);
  }
  return s;
}

/** A wing's two parts, for the right side (+z) or the left (-z): the inner from the shoulder to the wrist, the outer with its long feathers. */
function wingShape(outer: boolean, side: number): Shape {
  const s = new Shape(), t = 0.05;
  const lead: [number, number][] = outer ? [[0.38, 0], [0.1, 1.3], [-0.24, 2.6]] : [[0.52, 0], [0.45, 1.15], [0.38, INNER]];
  const trail: [number, number][] = outer ? [[-0.92, 0], [-1.25, 0.55], [-0.88, 0.9], [-1.3, 1.4], [-0.92, 1.72], [-1.12, 2.2], [-0.5, 2.6]] : [[-1.1, 0], [-1.0, 1.15], [-0.92, INNER]];
  // a strip of columns across, from the leading edge to the trailing one, at each trailing corner
  const leadAt = (z: number): number => {
    for (let i = 0; i + 1 < lead.length; i++) if (z <= lead[i + 1][1]) return mix(lead[i][0], lead[i + 1][0], (z - lead[i][1]) / (lead[i + 1][1] - lead[i][1]));
    return lead[lead.length - 1][0];
  };
  const col = (i: number): number => (outer && i >= trail.length - 3 ? G_PALE : G_BROWN);
  for (let i = 0; i + 1 < trail.length; i++) {
    const [x0, z0] = trail[i], [x1, z1] = trail[i + 1];
    const a: P = [leadAt(z0), 0, z0 * side], b: P = [leadAt(z1), 0, z1 * side], c: P = [x1, 0, z1 * side], dd: P = [x0, 0, z0 * side];
    const camber = (p: P, k: number): P => [p[0], p[1] + k, p[2]];
    // the top, the underside, and the leading and trailing edges
    s.quad(camber(a, t), camber(b, t), camber(c, t * 0.4), camber(dd, t * 0.4), col(i), TINT, [(a[0] + c[0]) / 2, -1, (a[2] + c[2]) / 2]);
    s.quad(camber(a, -t), camber(b, -t), camber(c, -t * 0.4), camber(dd, -t * 0.4), G_UNDER, TINT, [(a[0] + c[0]) / 2, 1, (a[2] + c[2]) / 2]);
    s.quad(camber(a, t), camber(b, t), camber(b, -t), camber(a, -t), G_BROWN, TINT, [a[0] - 1, 0, a[2]]);
    s.quad(camber(dd, t * 0.4), camber(c, t * 0.4), camber(c, -t * 0.4), camber(dd, -t * 0.4), col(i), TINT, [dd[0] + 1, 0, dd[2]]);
  }
  // the ends: at the shoulder or the wrist, and at the tip
  for (const z of [0, outer ? 2.6 : INNER]) {
    const x0 = leadAt(z), x1 = z === 0 ? trail[0][0] : trail[trail.length - 1][0];
    s.quad([x0, t, z * side], [x1, t * 0.4, z * side], [x1, -t * 0.4, z * side], [x0, -t, z * side], G_BROWN, TINT, [(x0 + x1) / 2, 0, (z === 0 ? 1 : z - 1) * side]);
  }
  return s;
}

export function buildGriffins(k: Build, n: number): Griffin[] {
  if (n <= 0) return [];
  const paint = k.mat.vehicle();
  const parts = {
    body: new Pool(k.group, 'griffin-body', griffinBodyShape().build(), paint, false, n),
    innerR: new Pool(k.group, 'griffin-inner-r', wingShape(false, 1).build(), paint, false, n),
    innerL: new Pool(k.group, 'griffin-inner-l', wingShape(false, -1).build(), paint, false, n),
    outerR: new Pool(k.group, 'griffin-outer-r', wingShape(true, 1).build(), paint, false, n),
    outerL: new Pool(k.group, 'griffin-outer-l', wingShape(true, -1).build(), paint, false, n),
  };
  const out: Griffin[] = [];
  const W = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const G = new THREE.Matrix4();
    const tint = new THREE.Color().setScalar(1 - 0.05 * (i % 3));
    const slots = Object.values(parts).map((pool): Slot => ({ pool, index: -1, color: tint, bone: 0, off: null, scale: ONE, want: true }));
    for (const s of slots) s.pool.take(s);
    const st = { x: 0, y: -50, z: 0, h: 0, pitch: 0, bank: 0, beat: 0, folded: 1, shown: true };
    const write = (): void => {
      if (!st.shown) return;
      // the body turns about its middle, not about its feet
      G.makeRotationY(-st.h).setPosition(st.x, st.y, st.z);
      rotX(rotZ(move(G, 0, 1.8, 0), st.pitch), st.bank);
      move(G, 0, -1.8, 0);
      slots[0].pool.mesh.setMatrixAt(slots[0].index, G);
      const b = Math.sin(st.beat * TAU), fo = clamp(st.folded);
      // spread, the wings beat; folded, they sweep back along the body and turn on edge against its flanks, the leading edge on top
      const sweepIn = mix(0.1 * b, -1.36, fo), flapIn = mix(0.12 + 0.62 * b, -0.06, fo), roll = 1.32 * fo;
      const sweepOut = mix(-0.22, -0.1, fo), flapOut = mix(0.32 * Math.sin(st.beat * TAU - 0.8), 0.04, fo);
      for (const side of [1, -1]) {
        const inner = side > 0 ? slots[1] : slots[2], outer = side > 0 ? slots[3] : slots[4];
        W.copy(G);
        rotX(rotZ(rotY(move(W, SHOULDER[0], SHOULDER[1], SHOULDER[2] * side), sweepIn * side), roll), -flapIn * side);
        inner.pool.mesh.setMatrixAt(inner.index, W);
        rotX(rotY(move(W, 0, 0, INNER * side), sweepOut * side), -flapOut * side);
        outer.pool.mesh.setMatrixAt(outer.index, W);
      }
      for (const s of slots) { s.pool.matrices = true; s.pool.flush(); }
    };
    out.push({
      at(x, y, z, heading, pitch = 0, bank = 0) { Object.assign(st, { x, y, z, h: heading, pitch, bank }); write(); },
      wings(beat, folded) { st.beat = beat; st.folded = folded; write(); },
      saddle() {
        V1.set(SADDLE[0], SADDLE[1], SADDLE[2]).applyMatrix4(G);
        return [V1.x, V1.y, V1.z];
      },
      shown(v) {
        if (v === st.shown) return;
        st.shown = v;
        for (const s of slots) { if (v) s.pool.take(s); else s.pool.drop(s); s.pool.flush(); }
        if (v) write();
      },
    });
    out[i].at(0, -50, 0, 0);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kavax's fox, Sophocles (GS 33)
// ---------------------------------------------------------------------------
//
// Small and red: a red-orange body, a white throat and chest, a bushy tail
// with a white tip, black stockings and ear tips, trotting on diagonal pairs.
// The look is a red fox's; the books name him and little more.

const FOX_RED = 0xc85a20, FOX_WHITE = 0xf4ede0, FOX_DARK = 0x2a201c;

function foxBodyShape(): Shape {
  const s = new Shape();
  const spine: [number, number, number, number][] = [[-0.42, 0.47, 0.14, 0.13], [-0.15, 0.48, 0.16, 0.14], [0.18, 0.5, 0.16, 0.14], [0.38, 0.58, 0.12, 0.11], [0.5, 0.7, 0.12, 0.11], [0.62, 0.71, 0.11, 0.1], [0.76, 0.66, 0.055, 0.05], [0.86, 0.64, 0.02, 0.02]];
  const rings = along(spine.map(([x, y]): P => [x, y, 0]), spine.map((p) => p[2]), spine.map((p) => p[3]), 6);
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1], m = avg([avg(A), avg(B)]);
    for (let j = 0; j < 6; j++) {
      const k2 = (j + 1) % 6, under = (A[j][1] + A[k2][1]) / 2 < m[1] - 0.03;
      const c = i === rings.length - 2 ? FOX_DARK : under && i >= 2 && i <= 5 ? FOX_WHITE : FOX_RED;
      s.tri(A[j], A[k2], B[k2], c, TINT, m);
      s.tri(A[j], B[k2], B[j], c, TINT, m);
    }
  }
  s.poly(rings[0], FOX_RED, TINT, avg(rings[1]));
  for (const side of [-1, 1]) {
    const b0: P = [0.6, 0.78, side * 0.03], b1: P = [0.52, 0.78, side * 0.1], b2: P = [0.64, 0.76, side * 0.11], tip: P = [0.56, 0.95, side * 0.1];
    const m = avg([b0, b1, b2]), inside: P = [m[0], m[1] - 0.2, m[2]];
    s.tri(b0, b1, tip, FOX_DARK, TINT, inside);
    s.tri(b1, b2, tip, FOX_RED, TINT, inside);
    s.tri(b2, b0, tip, FOX_RED, TINT, inside);
  }
  const tail: P[] = [[-0.42, 0.5, 0], [-0.62, 0.45, 0], [-0.85, 0.39, 0], [-1.04, 0.4, 0], [-1.18, 0.45, 0]];
  const tr = along(tail, [0.07, 0.12, 0.14, 0.11, 0], [0.07, 0.12, 0.14, 0.11, 0], 6);
  for (let i = 0; i + 1 < tr.length; i++) s.tube([tr[i], tr[i + 1]], i === tr.length - 2 ? FOX_WHITE : FOX_RED, TINT, false, false);
  return s;
}
function foxLegShape(): Shape {
  const s = new Shape();
  s.tube([ring(4, 0.06, 0.05, 0.05, 0, 0, Math.PI / 4), ring(4, -0.2, 0.04, 0.04, 0, 0, Math.PI / 4)], FOX_RED, TINT, false, false);
  s.tube([ring(4, -0.2, 0.04, 0.04, 0, 0, Math.PI / 4), ring(4, -0.42, 0.032, 0.032, 0, 0, Math.PI / 4)], FOX_DARK, TINT, false, true);
  return s;
}

export function buildFox(k: Build): Fox | null {
  const paint = k.mat.vehicle();
  const body = new Pool(k.group, 'fox-body', foxBodyShape().build(), paint, false, 1);
  const legs = new Pool(k.group, 'fox-legs', foxLegShape().build(), paint, false, 4);
  const white = new THREE.Color(1, 1, 1);
  const bs: Slot = { pool: body, index: -1, color: white, bone: 0, off: null, scale: ONE, want: true };
  const ls: Slot[] = [0, 1, 2, 3].map((): Slot => ({ pool: legs, index: -1, color: white, bone: 0, off: null, scale: ONE, want: true }));
  body.take(bs);
  for (const s of ls) legs.take(s);
  const hips: P[] = [[0.22, 0.42, -0.07], [0.22, 0.42, 0.07], [-0.32, 0.42, -0.08], [-0.32, 0.42, 0.08]];
  const st = { x: 0, y: -50, z: 0, h: 0, phase: 0, shown: true };
  const B = new THREE.Matrix4(), L = new THREE.Matrix4();
  const write = (): void => {
    if (!st.shown) return;
    const s = Math.sin(st.phase * TAU), bob = 0.025 * Math.abs(Math.cos(st.phase * TAU));
    B.makeRotationY(-st.h).setPosition(st.x, st.y + bob, st.z);
    body.mesh.setMatrixAt(bs.index, B);
    hips.forEach((hp, i) => {
      // diagonal pairs: the near fore with the far hind
      const swing = (i === 0 || i === 3 ? 1 : -1) * 0.5 * s;
      rotZ(move(L.copy(B), hp[0], hp[1] - bob, hp[2]), swing);
      legs.mesh.setMatrixAt(ls[i].index, L);
    });
    body.matrices = legs.matrices = true;
    body.flush();
    legs.flush();
  };
  write();
  return {
    at(x, y, z, heading) { Object.assign(st, { x, y, z, h: heading }); write(); },
    trot(phase) { st.phase = phase; write(); },
    shown(v) {
      if (v === st.shown) return;
      st.shown = v;
      if (v) { body.take(bs); for (const s of ls) legs.take(s); write(); } else { body.drop(bs); for (const s of ls) legs.drop(s); }
      body.flush(); legs.flush();
    },
  };
}

// ---------------------------------------------------------------------------
// For checking, on the development server: window.rrCast
// ---------------------------------------------------------------------------
//
// rrCast.lineup() stands every named figure in a row on the Field of Mars
// (z 46, from x -22 eastwards, facing south, on the floor at 20), and a figure
// of each soldier's kind in front of them with a griffin and the fox, a few of
// them moving: a Gray walking, a Bellona striking, a Howler howling, another
// flying a little over the ground with its boots lit, Mustang drawing her bow.
// rrCast.pose(name), .helms(on), .razors(state), .turn(heading), .cloaks(f)
// set them all; rrCast.costs() lists what each look costs.

interface LineFig { name: string; f: Figure; x: number; z: number; act?: (t: number) => void }

function devTools(k: Build, cast: Cast, pools: Map<string, Pool>): void {
  let line: LineFig[] | null = null;
  let griffin: Griffin | null = null, fox: Fox | null = null, gAt: [number, number] | null = null;
  let clock = 0, held: string | null = null;
  // the cast in a row on the Field of Mars, and the soldiers in a second row north of them, where the view from the
  // south sees both over the south wall; the griffin and the flier behind, the fox trotting between
  const floor = 20, row = 46, back = 37;
  const FOX: [number, number] = [-9, 33.5];
  let wingsHeld: [number, number] | null = null;
  k.each((dt) => {
    clock += dt;
    if (!line) return;
    for (const l of line) l.act?.(clock);
    griffin?.wings(wingsHeld ? wingsHeld[0] : (clock * 0.9) % 1, wingsHeld ? wingsHeld[1] : 0.15 + 0.15 * Math.sin(clock * 0.4));
    if (fox) { fox.at(FOX[0] + Math.sin(clock * 0.5) * 1.2, floor, FOX[1], Math.cos(clock * 0.5) > 0 ? 0 : Math.PI); fox.trot((clock * 1.8) % 1); }
  });
  const poses: Record<string, (t: number) => Partial<Pose>> = { walk, run, leap, strike, parry, howl, bow, salute, kneel, draw, haul, push, sit, fly, guard, ride };
  const tools = {
    lineup(): string {
      if (line) return `${line.length} figures already stand`;
      line = [];
      let x = -22;
      for (const id of Object.keys(LOOKS) as CastId[]) {
        const look = LOOKS[id], w = Math.max(0.9, widthOf(look));
        x += w / 2;
        const f = cast.add(look);
        f.at(x, floor, row, Math.PI / 2);
        line.push({ name: id, f, x, z: row });
        x += w / 2 + 0.55;
      }
      x = -22;
      for (const kind of Object.keys(SOLDIERS) as SoldierKind[]) {
        const look = SOLDIERS[kind], w = Math.max(0.9, widthOf(look));
        x += w / 2;
        const f = cast.add(look);
        f.at(x, floor, back, Math.PI / 2);
        line.push({ name: kind, f, x, z: back });
        x += w / 2 + 0.7;
      }
      // a few of them moving
      const byName = (n: string): LineFig => line!.find((l) => l.name === n)!;
      const g = byName('gray'), b = byName('bellona'), h = byName('howler'), m = byName('mustang');
      g.act = (t) => { g.f.pose(walk((t * 0.9) % 1)); };
      b.act = (t) => { const f = (t / 2.2) % 1; b.f.pose(strike(f)); b.f.razor('blade', f > 0.45 && f < 0.55 ? 1 : 0); };
      h.act = (t) => { h.f.pose(howl(Math.min(1, (t % 8) / 6))); h.f.cloak(0.6); };
      m.act = (t) => { m.f.pose(draw((t / 2.6) % 1)); };
      // a Howler flying a little over the plaza with his boots lit, side on to the view from the south
      const flier = cast.add(SOLDIERS.howler), fx = -19, fz = 32.5;
      flier.at(fx, floor + 1.4, fz, 0);
      line.push({ name: 'flying howler', f: flier, x: fx, z: fz, act: (t) => { flier.at(fx, floor + 1.4 + 0.15 * Math.sin(t * 2), fz, 0); flier.pose(fly(0.5)); flier.boots(1); flier.cloak(1); } });
      griffin = buildGriffins(k, 1)[0] ?? null;
      gAt = [-11.5, 30.5];
      griffin?.at(gAt[0], floor, gAt[1], Math.PI / 2);
      fox = buildFox(k);
      return `${line.length} figures, a griffin and the fox stand on the Field of Mars, from x -22 east, at z ${row} and ${back}`;
    },
    /** Every figure of the lineup in one pose, at a moment of it; or back to its own. */
    pose(name: string | null, t = 0.5): string {
      held = name;
      for (const l of line ?? []) {
        if (name && poses[name]) { l.f.pose(poses[name](t)); l.act = l.name === 'flying howler' ? l.act : undefined; } else l.f.pose({});
      }
      return held ?? 'standing';
    },
    /** The griffin's wings held at a moment of a beat and folded so far, or beating again (null). */
    wings(beat: number | null, folded = 0): void { wingsHeld = beat === null ? null : [beat, folded]; },
    /** Puts the Valkyrie of the lineup on the griffin's back, as the show does (her feet 1.5 over its feet, seated), or back in her row. */
    mount(on = true): void {
      const v = line?.find((l) => l.name === 'valkyrie');
      if (!v || !gAt) return;
      if (on) { v.f.at(gAt[0], floor + RIDER_FEET, gAt[1], Math.PI / 2); v.f.pose(sit(0.5)); v.act = undefined; } else { v.f.at(v.x, floor, v.z, Math.PI / 2); v.f.pose({}); }
    },
    helms(on: boolean): void { for (const l of line ?? []) l.f.helm(on); },
    razors(state: 'coiled' | 'whip' | 'blade', flash = 0): void { for (const l of line ?? []) l.f.razor(state, flash); },
    cloaks(f: number): void { for (const l of line ?? []) l.f.cloak(f); },
    boots(f: number): void { for (const l of line ?? []) l.f.boots(f); },
    turn(heading: number): void { for (const l of line ?? []) l.f.at(l.x, floor, l.z, heading); },
    /** Stands one row alone at z, facing south, the other hidden: for pictures from low over the south wall. No argument puts both back. */
    row(which?: 'cast' | 'soldiers', z = 34): void {
      const isCast = (l: LineFig): boolean => l.name in LOOKS;
      for (const l of line ?? []) {
        if (l.name === 'flying howler') { l.f.shown(!which); continue; }
        const mine = which === 'cast' ? isCast(l) : which === 'soldiers' ? !isCast(l) && l.name in SOLDIERS : true;
        l.f.shown(mine);
        l.f.at(l.x, floor, which && mine ? z : l.z, Math.PI / 2);
      }
      griffin?.shown(!which);
      fox?.shown(!which);
    },
    /** Where a figure of the lineup stands, by its name, for aiming a picture at it. */
    where(name: string): [number, number, number] | null {
      if (name === 'griffin') return gAt ? [gAt[0], floor + 2, gAt[1]] : null;
      if (name === 'fox') return [FOX[0], floor + 0.5, FOX[1]];
      const l = line?.find((f) => f.name === name);
      return l ? [l.x, floor + l.f.look.height / 2, l.z] : null;
    },
    /** The triangles each figure of the lineup costs now, and the parts' meshes. */
    costs(): { figures: Record<string, number>; average: number; meshes: number } {
      const figures: Record<string, number> = {};
      for (const l of line ?? []) figures[l.name] = (l.f as unknown as { triangles: number }).triangles;
      return { figures, average: cast.triangles(), meshes: [...pools.values()].filter((p) => p.mesh.visible).length };
    },
    LOOKS, SOLDIERS,
  };
  (window as unknown as { rrCast: object }).rrCast = tools;
}
