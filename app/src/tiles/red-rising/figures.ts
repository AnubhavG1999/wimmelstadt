// The cast of the Iron Rain, and the soldiers about them: figures at the size
// of the tile's people, made recognisable by their colours, armour, cloaks,
// hair and weapons, and by the books' sizes, so that the Obsidians are giants.
// Every figure is drawn from a handful of shared parts, each part one
// instanced mesh for every figure that wears it, so that a hundred figures
// cost a handful of draw calls. The show (show.ts) stands them, poses them
// and moves them; this file only gives them their looks and their bodies.
//
// One builder's file: see the builders' brief. It is a stub until it is built:
// the stub draws every figure as a plain coloured post, so that the show can
// be written against it.

import * as THREE from 'three';
import type { Build } from '../../engine/tile';

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
  /** Each leg swings forward (positive) from the hip, and its knee bends (positive). */
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
  /** How far the whole figure sinks, as in a crouch, a kneel or the moment before a leap: 0 to 1. */
  crouch: number;
}

export const STANDING: Pose = { lean: 0, tilt: 0, twist: 0, head: 0, nod: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, spreadL: 0, spreadR: 0, elbowL: 0, elbowR: 0, crouch: 0 };

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
  /** How many triangles one figure of a look costs, for the console. */
  triangles(): number;
}

// ---------------------------------------------------------------------------
// The looks, from the books (docs/districts/research/red-rising.md, section 3)
// ---------------------------------------------------------------------------

export type CastId =
  | 'darrow' | 'sovereign' | 'aja' | 'lorn' | 'alexandar' | 'boyAlexandar' | 'sevro' | 'ragnar'
  | 'mustang' | 'cassius' | 'jackal' | 'fitchner' | 'karnus' | 'kavax' | 'sefi' | 'windKnight'
  | 'clown' | 'pebble' | 'screwface' | 'holiday' | 'thraxa' | 'lysander' | 'atalantia' | 'victra' | 'daxo';

/** The look of every named figure. The builder of this file fills it from the research note. */
export const LOOKS = {} as Record<CastId, Look>;

/** The looks of the soldiers about them, by kind. */
export type SoldierKind = 'gray' | 'augustanGray' | 'praetorian' | 'bellona' | 'obsidian' | 'howler' | 'valkyrie' | 'sonsOfAres' | 'lornsMan';
export const SOLDIERS = {} as Record<SoldierKind, Look>;

// ---------------------------------------------------------------------------
// Poses for the show to use, each at a moment of its own cycle or action
// ---------------------------------------------------------------------------
//
// Each takes how far through it is, from 0 to 1 (a cycle repeats), and gives a
// pose. The show blends them.

export const walk = (_phase: number): Partial<Pose> => ({});
export const run = (_phase: number): Partial<Pose> => ({});
/** A leap on gravBoots: crouch, spring, tuck in the air, land. */
export const leap = (_t: number): Partial<Pose> => ({});
/** A razor's cut, from the guard to the follow-through, with the right arm. */
export const strike = (_t: number): Partial<Pose> => ({});
/** Turning a cut aside. */
export const parry = (_t: number): Partial<Pose> => ({});
/** Head thrown back, arms out: a Howler's howl. */
export const howl = (_t: number): Partial<Pose> => ({});
export const bow = (_t: number): Partial<Pose> => ({});
export const salute = (_t: number): Partial<Pose> => ({});
export const kneel = (_t: number): Partial<Pose> => ({});
/** Drawing a bow and loosing: Mustang. */
export const draw = (_t: number): Partial<Pose> => ({});
/** Hauling someone up by the arm, as out of the river. */
export const haul = (_t: number): Partial<Pose> => ({});
/** Shoulder set against a door, pushing. */
export const push = (_t: number): Partial<Pose> => ({});
/** Sitting on a step, eating: the boy Alexandar. */
export const sit = (_t: number): Partial<Pose> => ({});
/** Flying on gravBoots: body flat, arms back. */
export const fly = (_t: number): Partial<Pose> => ({});
/** A guard at attention, or at ease. */
export const guard = (_t: number): Partial<Pose> => ({});

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

// ---------------------------------------------------------------------------
// The stub: a plain post for each figure, until this file is built
// ---------------------------------------------------------------------------

export function buildCast(k: Build): Cast {
  const geo = new THREE.BoxGeometry(0.6, 1, 0.4).translate(0, 0.5, 0);
  const max = 256;
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  k.group.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  let n = 0;
  return {
    add(look: Look): Figure {
      const i = n++;
      mesh.count = n;
      mesh.setColorAt(i, col.set(look.body));
      let shown = true;
      const place = { x: 0, y: -50, z: 0, h: 0 };
      const write = (): void => {
        q.setFromAxisAngle(up, -place.h);
        s.set(look.build, shown ? look.height : 0.001, look.build);
        p.set(place.x, place.y, place.z);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        mesh.instanceMatrix.needsUpdate = true;
      };
      write();
      return {
        look,
        at(x, y, z, heading) { Object.assign(place, { x, y, z, h: heading }); write(); },
        pose() {},
        razor() {},
        boots() {},
        cloak() {},
        helm() {},
        shown(v) { shown = v; write(); },
      };
    },
    commit() {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    triangles: () => 12,
  };
}

export function buildGriffins(_k: Build, _n: number): Griffin[] {
  return [];
}

export function buildFox(_k: Build): Fox | null {
  return null;
}
