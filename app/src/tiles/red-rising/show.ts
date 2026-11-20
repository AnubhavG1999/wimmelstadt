// What moves over and on the Iron Rain besides the traffic: the fleet in the
// sky, the Rain falling from it, and the cast acting out their stories.
//
// The cast rest at posts of their own between stories, where the opening view
// sees them: the attackers on the canyon's rim above the city, Sefi and the
// Valkyrie with their griffins in the snow, the Sovereign and her guard on the
// landing pads, Cassius and the Bellona on the north wall, Lysander and
// Atalantia on the south wall, Lorn with his force in the Augustan camp, and
// the Jackal on the tallest tower's roof. A story calls its cast to its stage:
// each flies there on gravBoots, or walks if it is near, plays its part, and
// goes home again. A director chooses what plays, several stories at once, so
// that no figure is ever in two, no two share a stage, and each gets its turn.
// Nobody dies: every fight stops at the clash, as the research's stories say.
//
// The stories, from the books (docs/districts/research/red-rising.md, section 4):
//  1. The Reaper's squadron falls in the Rain onto the canyon's west end (GS 38).
//  2. Into the river: the group comes up inside the wall, a pulse kills their boots, and they haul each other out (GS 39, 40).
//  3. Ragnar opens the postern: he clashes with the Wind Knight and Cassius, and the infantry march in (GS 41).
//  4. Sevro and the last boots: roof to roof, Darrow lifted onto the Citadel's wall, and the howl (GS 41).
//  5. Mustang drops the shield, and a wave falls into the open city (GS 41).
//  6. The Sovereign's shuttle: Darrow on the ramp, Aja's kick, Fitchner's rescue, and the decoys (GS 41, 42).
//  7. Lorn at the south wall, turning the bolts aside, and over the empty wall (GS 39, 41).
//  8. The Willow Way: Lorn and Darrow spar, a boy watches with bread, and a grown Alexandar takes his place (GS 6, 12; IG 30, 45).
//  9. Darrow, Mustang, Cassius and Sevro ring Aja on the pads (MS 61, 62).
// 10. Ragnar and Aja in the snow, Mustang's arrows on Cassius, and the Valkyrie come (MS 29, 30).
// 11. The leeches on the Warchild (GS 38): the fleet's.
// 12. The Howlers drop onto a tower's roof and howl (RR 23; GS 41).
// 13. The Charybdis chases the Archimedes through the fleet: the fleet's.
//
// Written by the tile's main session. The fleet, the Rain, the figures and the
// column's vehicles are builders' files; this file sets them going and directs
// them. Each is set going on its own, so that one that fails does not take the
// others with it.

import * as THREE from 'three';
import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { SHUTTLE_PADS, shuttleGeometry } from './citadel';
import {
  LOOKS, SOLDIERS, blend, bow, buildCast, buildFox, buildGriffins, draw, fly, guard, haul, howl, kneel, leap, parry, push, run, salute, sit, strike, walk,
  type Cast, type CastId, type Figure, type Fox, type Griffin, type Look, type Pose, type SoldierKind,
} from './figures';
import { buildFleet, type Fleet } from './fleet';
import { landAt } from './land';
import { F, LANDINGS, LOTS, STAGES } from './plan';
import { buildPylonTops } from './quarter';
import { buildRain, type Rain, type Zone } from './rain';
import { buildSpiders } from './traffic';
import { buildPosternDoors } from './walls';

export interface Sky { fleet: Fleet | null; rain: Rain | null; cast: Cast | null }

const TAU = Math.PI * 2;
const E = 0, S = Math.PI / 2, W = Math.PI, N = -Math.PI / 2;
const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c); };
/** How far through a stretch of time a moment is, from 0 before it to 1 after it. */
const span = (t: number, t0: number, t1: number): number => clamp((t - t0) / Math.max(1e-6, t1 - t0));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** The way from one place to another, as a heading: 0 east, a quarter turn south. */
const toward = (ax: number, az: number, bx: number, bz: number): number => Math.atan2(bz - az, bx - ax);
/** Turns from one heading to another the shorter way, by t. */
function turnTo(a: number, b: number, t: number): number {
  const d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + d * clamp(t);
}

/** Sets one part going, and says in the console if it fails. */
function tried<T>(what: string, fn: () => T): T | null {
  try {
    return fn();
  } catch (e) {
    console.error(`The Iron Rain: ${what} failed.`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/** A place a figure stands, on whatever is at height y, facing h. */
interface Spot { x: number; y: number; z: number; h: number }
const at = (x: number, y: number, z: number, h: number): Spot => ({ x, y, z, h });
/** A place on the ground as built, facing h. */
const onGround = (x: number, z: number, h: number): Spot => at(x, landAt(x, z), z, h);

/** Lots that are open ground with low things on it, which figures stand among: their tops are not roofs. */
const OPEN_GROUND = new Set(['camp', 'shield-park']);

/** How high what is built stands at a place, by the plan: the ground, or the top of a lot over it. */
function topAt(x: number, z: number): number {
  let y = landAt(x, z);
  for (const l of LOTS) {
    if (x < l.x0 || x > l.x1 || z < l.z0 || z > l.z1) continue;
    if (l.part && l.id !== 'citadel-wall' && l.id !== 'olympus') continue;
    if (OPEN_GROUND.has(l.id)) continue;
    // Olympus floats: under it there is air, and over it its top
    y = Math.max(y, l.top);
  }
  return y;
}

// ---------------------------------------------------------------------------
// The cast and their posts
// ---------------------------------------------------------------------------

type Id = string;

interface State { x: number; y: number; z: number; h: number; pose: Partial<Pose>; razor: 'coiled' | 'whip' | 'blade'; flash: number; boots: number; cloak: number; shown: boolean }

interface Actor {
  id: Id;
  look: Look;
  fig: Figure | null;
  /** Where it rests between stories, or null if it is away (aboard a ship, inside the Citadel) until a story brings it. */
  post: Spot | null;
  /** The story it is in now. */
  busy: string | null;
  now: State;
  /** How it stands at rest: a guard, a figure looking about. */
  rest: 'guard' | 'look' | 'pace' | 'sit';
}

const still = (s: Spot, pose: Partial<Pose> = {}, more: Partial<State> = {}): State => ({ x: s.x, y: s.y, z: s.z, h: s.h, pose, razor: 'coiled', flash: 0, boots: 0, cloak: 0, shown: true, ...more });

/** A look for whoever the figures' file has not given one: a plain figure in the colours of its side. */
function fallbackLook(name: string, body: number, height = 2.6): Look {
  return { name, height, build: 1, skin: 0xd9a77e, hair: 0xd8b04a, hairStyle: 'short', body, limbs: body, trim: 0x2a2a2a, helm: 'none', helmOn: false, arms: 'razor' };
}

const CAST_COLOR: Record<string, number> = {
  darrow: 0xa3241f, sovereign: 0xe8d7a0, aja: 0x1d2c5c, lorn: 0x4a4038, alexandar: 0x8a8f96, boyAlexandar: 0x6b8fb0, sevro: 0x6c6f74, ragnar: 0xe8e2d6,
  mustang: 0xd4a63a, cassius: 0xf2efe6, jackal: 0xc9b26a, fitchner: 0x7a1d18, karnus: 0x2f5aa8, kavax: 0xb03a28, sefi: 0x2a2a30, windKnight: 0xaab8c8,
  clown: 0x6c6f74, pebble: 0x6c6f74, screwface: 0x6c6f74, holiday: 0x5e6670, thraxa: 0xc9a23a, lysander: 0xd4a63a, atalantia: 0x6a1f2a, victra: 0x2f6b4f, daxo: 0xb03a28,
};
const SOLDIER_COLOR: Record<SoldierKind, number> = {
  gray: 0x7c8088, augustanGray: 0x7a6f68, praetorian: 0x5a2a6e, bellona: 0x2f5aa8, obsidian: 0x2b2a2c, howler: 0x6c6f74, valkyrie: 0x34363c, sonsOfAres: 0x9a5434, lornsMan: 0x4f5a4a,
};

const lookOf = (id: CastId): Look => LOOKS[id] ?? fallbackLook(id, CAST_COLOR[id] ?? 0x888888, id === 'ragnar' ? 3.5 : id === 'boyAlexandar' ? 1.4 : 2.7);
const soldierLook = (k: SoldierKind): Look => SOLDIERS[k] ?? fallbackLook(k, SOLDIER_COLOR[k], k === 'obsidian' || k === 'valkyrie' ? 3.3 : 2.3);

/**
 * Where everyone rests. The attackers' camp is on the canyon's rim above the
 * city, north of the rim road, between the guns: they look down on Agea, and
 * the opening view sees them against the plateau. Heights come from the
 * ground as built when the show begins.
 */
function posts(): Record<Id, Spot | null> {
  const rim = (x: number, z: number): Spot => onGround(x, z, S);
  const p: Record<Id, Spot | null> = {
    // the attackers, on the rim
    darrow: rim(6, -91.6), mustang: rim(9.5, -92.3), sevro: rim(13, -91.4), alexandar: rim(16, -92.6), ragnar: rim(1.5, -93.2),
    clown: rim(-1.5, -91.6), pebble: rim(3.6, -91.2), screwface: rim(18.6, -91.8),
    'obsidian-0': rim(-3, -95.4), 'obsidian-1': rim(0, -96.2), 'obsidian-2': rim(3.2, -96.6), 'obsidian-3': rim(6.4, -95.8),
    // Sefi and the Valkyrie, in the snow, beside their griffins
    sefi: onGround(61, -95.4, S), 'valkyrie-0': onGround(42.5, -96.6, S), 'valkyrie-1': onGround(47.8, -97.4, S), 'valkyrie-2': onGround(55.8, -96.8, S), 'valkyrie-3': onGround(67, -94.4, S),
    // the north wall: Cassius over the grates, the Wind Knight on the postern's tower, the Bellona along the walk
    cassius: at(20, F + 10, -49.5, S + 0.5), windKnight: at(-22, F + 12, -49.6, S),
    'bellona-0': at(-44, F + 10, -49.5, N), 'bellona-1': at(-34, F + 10, -49.5, N), 'bellona-2': at(34, F + 10, -49.5, N), 'bellona-3': at(48, F + 10, -49.5, N),
    // the south wall: Lysander and Atalantia, and the Bellona
    lysander: at(6, F + 8, 60.5, S), atalantia: at(13, F + 8, 60.5, S),
    'bellona-4': at(-16, F + 8, 60.5, S), 'bellona-5': at(-7, F + 8, 60.5, S), 'bellona-6': at(22, F + 8, 60.5, S), 'bellona-7': at(30, F + 8, 60.5, S),
    // the camp on the south flank: Lorn and his force, Kavax and Daxo, and the Republic's later figures
    lorn: onGround(-40, 70, E), kavax: onGround(-62, 68.5, E), daxo: onGround(-65, 70.5, E), holiday: onGround(-33.5, 67.5, E), thraxa: onGround(-30.5, 69, E),
    // the Jackal on the tallest tower, watching
    jackal: at(-74, F + 66, -34, S - 0.6),
    // away until a story brings them
    boyAlexandar: null, victra: null,
  };
  for (let i = 0; i < 8; i++) p[`lornsMan-${i}`] = onGround(-52 + (i % 4) * 3.2, 73.5 + Math.floor(i / 4) * 2.6, E);
  // the Sovereign's guard on the pads, and the Sovereign herself by her shuttle (the pads' builder sets where the shuttles stand)
  const [own] = SHUTTLE_PADS;
  const deck = F + 6;
  p.sovereign = at(own.x - 2.5, deck, own.z + 4.2, E);
  p.aja = at(own.x + 0.2, deck, own.z + 4.6, E);
  p.karnus = at(own.x + 4.6, deck, own.z + 3.6, W);
  p.fitchner = at(own.x + 4.4, deck, own.z + 6.2, W);
  for (let i = 0; i < 8; i++) p[`praetorian-${i}`] = at(-29 + i * 2.2, deck, 24.4, N);
  // the infantry who march in through the postern wait outside the wall, unseen, until the postern opens
  for (let i = 0; i < 8; i++) p[`augustanGray-${i}`] = null;
  return p;
}

// ---------------------------------------------------------------------------
// Getting about: walking, running, and flying on gravBoots
// ---------------------------------------------------------------------------

/** A way from one place to another, which takes `dur` seconds, and where the figure is on it at each moment. */
interface Leg { dur: number; at(t: number): State }

const WALK = 2.2, RUN = 5.6, FLY = 15;

function walkLeg(a: Spot, b: Spot, speed: number): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), h = d > 0.05 ? toward(a.x, a.z, b.x, b.z) : a.h;
  const dur = d / speed + 0.6, stride = speed > 3 ? 2.6 : 1.6;
  return {
    dur,
    at(t) {
      const s = clamp((t - 0.3) / Math.max(1e-6, dur - 0.6));
      const x = lerp(a.x, b.x, s), z = lerp(a.z, b.z, s), y = lerp(a.y, b.y, s);
      // turn to the way first, and to the place's own way at the end
      const head = t < 0.3 ? turnTo(a.h, h, t / 0.3) : t > dur - 0.3 ? turnTo(h, b.h, (t - dur + 0.3) / 0.3) : h;
      const phase = (s * d) / stride;
      const pose = s > 0 && s < 1 ? (speed > 3 ? run(phase % 1) : walk(phase % 1)) : {};
      return still(at(x, y, z, head), pose, { cloak: speed > 3 ? 0.6 : 0.2 });
    },
  };
}

/**
 * A flight on gravBoots: up off the ground, along an arc high enough to clear
 * everything built under it by 3, and down again, the body flat and the
 * boots alight, the cloak streaming.
 */
function flyLeg(a: Spot, b: Spot): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const up = 2.5;
  // the arc's height over the straight line between the two places
  let bump = 2 + d * 0.06;
  for (let i = 1; i < 24; i++) {
    const s = i / 24, x = lerp(a.x, b.x, s), z = lerp(a.z, b.z, s), base = lerp(a.y + up, b.y + up, s);
    bump = Math.max(bump, (topAt(x, z) + 3 - base) / Math.max(0.12, Math.sin(Math.PI * s)));
  }
  const rise = 0.7, land = 0.8, glide = Math.max(1.2, (d + bump * 1.6) / FLY);
  const dur = rise + glide + land, h = d > 0.05 ? toward(a.x, a.z, b.x, b.z) : a.h;
  return {
    dur,
    at(t) {
      if (t < rise) {
        const s = t / rise;
        return still(at(a.x, a.y + up * ease(s), a.z, turnTo(a.h, h, s)), leap(0.2 + 0.3 * s), { boots: s, cloak: 0.4 * s });
      }
      if (t < rise + glide) {
        const s = (t - rise) / glide, e = ease(s);
        const x = lerp(a.x, b.x, e), z = lerp(a.z, b.z, e), y = lerp(a.y + up, b.y + up, e) + bump * Math.sin(Math.PI * e);
        return still(at(x, y, z, h), fly(s), { boots: 1, cloak: 1 });
      }
      const s = (t - rise - glide) / land;
      return still(at(b.x, b.y + up * (1 - ease(s)), b.z, turnTo(h, b.h, s)), leap(0.7 + 0.3 * s), { boots: 1 - s, cloak: 1 - s });
    },
  };
}

/** The quickest sensible way from one place to another: a walk if near and level, else a flight. */
function legBetween(a: Spot, b: Spot, hurry = false): Leg {
  const d = Math.hypot(b.x - a.x, b.z - a.z), dy = Math.abs(b.y - a.y);
  if (d < 0.05 && dy < 0.05) return { dur: 0, at: () => still(b) };
  if (dy < 1.2 && d < (hurry ? 22 : 12)) return walkLeg(a, b, hurry ? RUN : WALK);
  return flyLeg(a, b);
}

// ---------------------------------------------------------------------------
// Little effects of the show's own: tracer bolts, arrows, a grenade, rings
// ---------------------------------------------------------------------------

/** Glowing streaks and specks, drawn in one batch: bolts, arrows, a grenade, a razor's ring. */
class Specks {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly col = new THREE.Color();
  constructor(k: Build, max = 64) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 3;
    k.group.add(this.mesh);
  }
  /** Starts a frame's specks afresh. */
  begin(): void { this.n = 0; }
  /** A streak from a to b, `w` thick, in a colour. */
  streak(a: V3, b: V3, w: number, color: number): void {
    if (this.n >= this.mesh.instanceMatrix.count) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1e-3;
    this.v.set(dx / l, dy / l, dz / l);
    this.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.v);
    this.sc.set(w, w, l);
    this.m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), this.q, this.sc);
    this.mesh.setMatrixAt(this.n, this.m);
    this.mesh.setColorAt(this.n, this.col.set(color));
    this.n++;
  }
  /** A speck, `r` across, at a place. */
  speck(p: V3, r: number, color: number): void {
    this.streak([p[0], p[1] - r / 2, p[2]], [p[0], p[1] + r / 2, p[2]], r, color);
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Rings that spread over the ground or the water and fade: a pulse, a splash, a burst. */
class Rings {
  private readonly meshes: THREE.Mesh[] = [];
  constructor(k: Build, n = 6) {
    const geo = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      k.group.add(mesh);
      this.meshes.push(mesh);
    }
  }
  /** Shows ring `i` at a place, `r` across, as bright as `a` (0 hides it). */
  set(i: number, p: V3, r: number, a: number, color = 0x9fe0ff): void {
    const mesh = this.meshes[i];
    if (!mesh) return;
    mesh.visible = a > 0.01;
    if (!mesh.visible) return;
    mesh.position.set(p[0], p[1], p[2]);
    mesh.scale.setScalar(Math.max(0.05, r));
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = clamp(a);
    mat.color.set(color);
  }
  hideAll(): void { for (const m of this.meshes) m.visible = false; }
}

// ---------------------------------------------------------------------------
// The stories
// ---------------------------------------------------------------------------

/** What a story's body says each figure is doing: `put` sets one, and `from` asks where one stood when the body began. */
interface Putter {
  put(id: Id, s: State): void;
  from(id: Id): Spot;
}

/** The things a story moves besides its figures, which are the show's: the shuttles, the postern's doors, the pylons, the griffins, the specks and rings. */
interface Props {
  shuttles: { set(i: number, x: number, y: number, z: number, h: number, bank: number, shown: boolean, engines: number): void } | null;
  doors: { open(f: number): void } | null;
  pylons: { flare(i: number, f: number): void } | null;
  griffins: Griffin[];
  specks: Specks;
  rings: Rings;
}

interface StoryDef {
  id: string;
  name: string;
  cast: Id[];
  /** What it holds while it plays: its stages, and 'shuttles', 'griffins', 'shield' or 'sky'. */
  holds: string[];
  /** How often it should play, by its turn: 1 as often as any other. */
  weight: number;
  /** Where each figure must stand when the body begins: a place, or 'post' to stay at its post. A figure that is away appears there when the body shows it. */
  marks: Record<Id, Spot | 'post'>;
  /** How long its body lasts, in seconds. */
  body: number;
  /** Whether it may begin now. */
  may?(): boolean;
  /** Poses its cast at body time tb. A figure it leaves alone holds what it was last given. */
  play(tb: number, P: Putter): void;
  /** Moves its props at body time tb, and, if `live`, does what can only be done once (fires the Rain, drops the shield). */
  props?(tb: number, X: Props, live: boolean, once: (key: string, fn: () => void) => void): void;
  /** For a story of the sky alone, played by the fleet: it starts it and says how long it lasts. */
  sky?(): number;
}

/** Everything a story can reach while it is written: the posts, and the live parts. */
interface World { posts: Record<Id, Spot | null>; fleet: Fleet | null; rain: Rain | null }

function stories(Wd: World): StoryDef[] {
  const P0 = Wd.posts;
  const post = (id: Id): Spot => P0[id] ?? at(0, F, 0, S);
  const out: StoryDef[] = [];
  const deck = F + 6;

  // ---------------------------------------------------------------- 1. The Reaper's squadron falls
  {
    const who = ['darrow', 'sevro', 'alexandar', 'clown', 'pebble', 'screwface'];
    const lz = LANDINGS.west;
    // where each shell lands on the canyon's west end, and where each stands once out of it
    const spots = who.map((_, i) => onGround(lz.x0 + 3 + (i % 3) * 3.2, -12 + Math.floor(i / 3) * 4.4 + (i % 2) * 0.6, E));
    const marks: Record<Id, Spot | 'post'> = {};
    who.forEach((id) => (marks[id] = 'post'));
    const UP = 9, GONE = 4, FALL = 6.5;
    /** When each shell opened, in story time, once the Rain has said; until then, the time it is expected to take. */
    const opens: (number | undefined)[] = [];
    out.push({
      id: 'reaper', name: "the Reaper's squadron falls", cast: who, holds: ['westLz'], weight: 1.2, marks, body: UP + GONE + FALL + 16,
      play(tb, P) {
        who.forEach((id, i) => {
          const home = P.from(id), land = spots[i];
          if (tb < UP) {
            // up off the rim, straight up into the sky, and gone
            const s = tb / UP;
            P.put(id, still(at(home.x, home.y + 70 * ease(s), home.z, home.h), fly(s), { boots: 1, cloak: 1, shown: s < 0.92 }));
          } else if (tb < (opens[i] ?? UP + GONE + FALL + i * 0.35)) {
            P.put(id, still(land, {}, { shown: false }));
          } else {
            // out of the husk: a crouch, up, the razor out, and the squadron forms on Darrow
            const s = tb - (opens[i] ?? UP + GONE + FALL + i * 0.35);
            const pose = s < 1.2 ? blend(kneel(1), {}, s / 1.2) : id === 'darrow' && s > 3 && s < 7 ? salute(span(s, 3, 7)) : {};
            P.put(id, still(at(land.x, land.y, land.z, turnTo(E, toward(land.x, land.z, 0, -20), span(s, 1, 2))), pose, { razor: s > 2 ? 'blade' : 'coiled', flash: id === 'darrow' && s > 3 && s < 3.4 ? 1 : 0 }));
          }
        });
      },
      props(tb, _X, live, once) {
        if (!live || !Wd.rain) return;
        if (tb < UP) opens.length = 0;
        // the shells, one after another: the Reaper's red, the Howlers' wolf grey
        who.forEach((id, i) => {
          const t0 = UP + GONE + i * 0.35;
          if (tb < t0) return;
          once(`fire-${i}`, () => {
            const tubes = Wd.fleet?.tubes('pax') ?? [];
            const from: V3 = tubes[(i * 3) % Math.max(1, tubes.length)] ?? [84, 100, 30];
            const land = spots[i];
            const d = Wd.rain?.drop(from, [land.x, land.y, land.z], id === 'darrow' ? 0xb3201a : 0x6c6f74) ?? FALL;
            opens[i] = t0 + Math.max(0.5, d);
          });
        });
      },
    });
    // the drop is fired when the squadron is gone into the sky
    const def = out[out.length - 1];
    const props = def.props!;
    def.props = (tb, X, live, once) => { props(tb, X, live, once); };
  }

  // ---------------------------------------------------------------- 2. Into the river
  {
    const group = ['darrow', 'mustang', 'ragnar', 'clown', 'pebble'];
    const water = F - 0.8;
    // into the river north of the wall, in a line across it
    const inRiver = group.map((_, i) => at(7.6 + i * 1.3, water - 0.3, -53.6 - (i % 2) * 0.8, S));
    // up out of the water inside the wall, onto the banks either side
    const banks = [at(5.2, F, -44.2, E), at(15.6, F, -43.4, W), at(16.2, F, -41.6, W), at(5.6, F, -41.8, E), at(15.4, F, -45.6, W)];
    // the streets beyond the banks: west of the river towards the avenue, east of it along the forest's edge
    const street = [at(-2, F, -40.6, S), at(19, F, -41.6, E), at(21.6, F, -40.6, E), at(0.4, F, -42.2, S), at(24, F, -41.8, E)];
    /** Where each comes down in the shallows when the pulse kills the boots: the edge of the water on the bank's side. */
    const shallow = (b: Spot): number => (b.x < 10.5 ? 8.2 : 12.9);
    /** Out of the water: straight up the bank's side to the floor, then onto the bank. */
    const climb = (b: Spot, s: number, from: number): Spot => {
      const edge = b.x < 10.5 ? 7.4 : 13.7;
      if (s < 0.5) { const u = s / 0.5; return at(lerp(from, edge, u), lerp(water - 0.4, F + 0.05, Math.sqrt(u)), b.z, b.h); }
      const u = (s - 0.5) / 0.5;
      return at(lerp(edge, b.x, u), F, b.z, b.h);
    };
    const marks: Record<Id, Spot | 'post'> = { cassius: 'post' };
    group.forEach((id, i) => (marks[id] = at(inRiver[i].x, F + 4, -57.5, S)));
    out.push({
      id: 'river', name: 'into the river', cast: [...group, 'cassius'], holds: ['banks', 'apron'], weight: 1, marks, body: 30,
      play(tb, P) {
        group.forEach((id, i) => {
          const a = P.from(id), dip = 0.4 * i;
          if (tb < 1.5 + dip) {
            // down into the water north of the wall
            const s = span(tb, dip, 1.5 + dip);
            P.put(id, still(at(a.x, lerp(a.y, inRiver[i].y, ease(s)), lerp(a.z, inRiver[i].z, s), S), leap(0.6 + 0.4 * s), { boots: 1 - s }));
          } else if (tb < 5.5 + dip) {
            // under the grates, unseen
            P.put(id, still(inRiver[i], {}, { shown: false }));
          } else if (tb < 7 + dip) {
            // up out of the water inside, onto the bank
            const s = span(tb, 5.5 + dip, 7 + dip), b = banks[i];
            P.put(id, still(at(lerp(10.5, b.x, s), lerp(water, F, ease(s)), lerp(-47.5, b.z, s), b.h), leap(0.8 * (1 - s)), {}));
          } else if (tb < 9.5) {
            // up on their boots...
            const b = banks[i], s = span(tb, 7 + dip, 9.5);
            P.put(id, still(at(b.x, F + 3 * ease(s), b.z, b.h), fly(s), { boots: 1, cloak: 0.5 }));
          } else if (tb < 10.6) {
            // ...the pulse: the boots sputter and they drop into the shallows
            const b = banks[i], s = span(tb, 9.5, 10.6);
            P.put(id, still(at(lerp(b.x, shallow(b), s), lerp(F + 3, water, s * s), b.z, b.h), leap(0.5), { boots: s < 0.6 ? (Math.sin(tb * 60) > 0 ? 0.6 : 0) : 0 }));
          } else if (tb < 21) {
            // Darrow and Ragnar haul the others up the banks one by one
            const b = banks[i];
            const hauler = id === 'darrow' || id === 'ragnar';
            const turn = ['mustang', 'clown', 'pebble'].indexOf(id);
            if (hauler) {
              const s = span(tb, 10.6, 12);
              const pose = tb > 12 ? haul(((tb - 12) / 3) % 1) : leap(0.8);
              const p = climb(b, s, shallow(b));
              P.put(id, still(at(p.x, p.y, p.z, b.h + Math.PI), pose, {}));
            } else {
              const up = 12.5 + turn * 3;
              const s = span(tb, up, up + 2);
              P.put(id, still(climb(b, s, shallow(b)), s < 1 ? kneel(1 - s) : {}, {}));
            }
          } else if (tb < 25) {
            // a shake of the mud, and into the streets
            const b = banks[i], s = span(tb, 21.5, 25);
            const st = street[i];
            P.put(id, still(at(lerp(b.x, st.x, ease(s)), F, lerp(b.z, st.z, ease(s)), toward(b.x, b.z, st.x, st.z)), s > 0 && s < 1 ? run((s * 4) % 1) : {}, { cloak: 0.5 }));
          } else {
            P.put(id, still(street[i]));
          }
        });
        // Cassius on the wall walk watches them come up, his razor coiled
        const c = P.from('cassius');
        const look = tb > 5 && tb < 25 ? toward(c.x, c.z, 10.5, -43) : c.h;
        P.put('cassius', still(at(c.x, c.y, c.z, turnTo(c.h, look, span(tb, 5, 6.5))), tb > 9.6 && tb < 11 ? { armR: 1.2, elbowR: 0.6 } : {}, {}));
      },
      props(tb, X) {
        // the pulse from a device on the bank: a ring of light that spreads over the water and the banks
        const s = span(tb, 9.4, 11.2);
        X.rings.set(0, [10.5, F + 0.08, -44], 1 + 16 * s, s > 0 && s < 1 ? 1 - s : 0, 0xbfe8ff);
        // the splash where they go in, and where they drop back
        const a = span(tb, 0.9, 2.6), b = span(tb, 10.3, 11.6);
        X.rings.set(1, [10.5, F - 0.7, -53.8], 0.5 + 3.5 * a, a > 0 && a < 1 ? 0.8 * (1 - a) : 0, 0xe8f6ff);
        X.rings.set(2, [10.5, F - 0.7, -43.6], 0.5 + 4 * b, b > 0 && b < 1 ? 0.8 * (1 - b) : 0, 0xe8f6ff);
      },
    });
  }

  // ---------------------------------------------------------------- 3. Ragnar opens the postern
  {
    const obs = ['obsidian-0', 'obsidian-1', 'obsidian-2', 'obsidian-3'];
    const inf = Array.from({ length: 8 }, (_, i) => `augustanGray-${i}`);
    const tower = at(-22, F + 12, -49.6, S);
    const inside = at(-22, F, -46.2, N);
    const marks: Record<Id, Spot | 'post'> = { ragnar: at(-23.5, F + 12, -49.6, E), windKnight: 'post', cassius: at(-15.6, F + 10, -49.5, W) };
    obs.forEach((id, i) => (marks[id] = at(-28.5 + (i % 2) * 13, F, -43 + Math.floor(i / 2) * 2.4, N)));
    inf.forEach((id, i) => (marks[id] = at(-22.6 + (i % 2) * 1.2, F, -60 - Math.floor(i / 2) * 1.6, S)));
    out.push({
      id: 'postern', name: 'Ragnar opens the postern', cast: ['ragnar', 'windKnight', 'cassius', ...obs, ...inf], holds: ['postern', 'wallWalk', 'apron'], weight: 1, marks, body: 34,
      play(tb, P) {
        const r = P.from('ragnar'), wk = P.from('windKnight'), c = P.from('cassius');
        // the Wind Knight turns to him; three exchanges, and a blow knocks him off the parapet: he floats away on his boots
        if (tb < 8) {
          const ex = Math.floor(tb / 2.2), f = (tb % 2.2) / 2.2;
          P.put('ragnar', still(at(r.x + 0.3 * Math.sin(tb * 2), r.y, r.z, E), ex % 2 === 0 ? strike(f) : parry(f), { razor: 'blade', flash: f > 0.45 && f < 0.55 ? 1 : 0 }));
          P.put('windKnight', still(at(wk.x + 0.4, wk.y, wk.z, W), ex % 2 === 0 ? parry(f) : strike(f), { razor: 'blade' }));
        } else if (tb < 13) {
          const s = span(tb, 8, 13);
          P.put('ragnar', still(at(r.x, r.y, r.z, E), s < 0.3 ? strike(s / 0.3) : guard(0), { razor: 'blade', flash: s < 0.12 ? 1 : 0 }));
          // knocked back off the parapet, he floats away north over the canyon on his boots
          P.put('windKnight', still(at(wk.x + 2 * s, wk.y + 9 * ease(s), wk.z - 26 * ease(s), W), fly(s), { boots: 1, cloak: 1, shown: s < 0.98 }));
        } else {
          P.put('windKnight', still(wk, {}, { shown: false }));
        }
        // Cassius, in white with his golden sun, comes along the walk: three crossings of blades, and he leaps back
        if (tb >= 12 && tb < 20) {
          // Ragnar comes to the tower's east edge, over Cassius on the walk
          const s = tb - 12, f = (s % 2) / 2;
          P.put('cassius', still(at(c.x - 0.3 * Math.min(1, s), c.y, c.z, W), strike(f), { razor: 'blade', flash: f > 0.45 && f < 0.55 ? 1 : 0 }));
          P.put('ragnar', still(at(lerp(r.x, -19.2, Math.min(1, s)), r.y, r.z, E), parry(f), { razor: 'blade', flash: f > 0.45 && f < 0.55 ? 1 : 0 }));
        } else if (tb >= 20 && tb < 22) {
          const s = span(tb, 20, 22);
          P.put('cassius', still(at(c.x + 5 * ease(s), c.y + 1.5 * Math.sin(Math.PI * s), c.z, W), leap(s), { razor: 'blade', boots: Math.sin(Math.PI * s) }));
        } else if (tb >= 22) {
          P.put('cassius', still(at(c.x + 5, c.y, c.z, W), guard(0), { razor: 'whip' }));
        } else {
          P.put('cassius', still(c, guard(0), { razor: 'whip' }));
        }
        // Ragnar drops inside, sets his shoulder to the doors, and they swing open
        if (tb >= 22) {
          const s = span(tb, 22, 23.5);
          const edge = at(-20.4, r.y, -46.7, S);
          if (tb < 22.6) P.put('ragnar', still(at(lerp(-19.2, edge.x, span(tb, 22, 22.6)), r.y, lerp(r.z, edge.z, span(tb, 22, 22.6)), S), walk((tb * 1.4) % 1), { razor: 'coiled' }));
          else if (tb < 23.5) { const u = span(tb, 22.6, 23.5); P.put('ragnar', still(at(lerp(edge.x, inside.x, u), lerp(edge.y, inside.y, u * u), lerp(edge.z, inside.z, u), N), leap(0.5 + 0.5 * u), { razor: 'coiled', boots: 1 - u })); }
          else if (tb < 28) P.put('ragnar', still(inside, push(((tb - 23.5) / 1.5) % 1), {}));
          else P.put('ragnar', still(at(inside.x - 2.6, F, inside.z + 2, E), salute(span(tb, 29, 32)), { razor: 'blade' }));
        }
        // his Obsidians stand guard either side
        obs.forEach((id) => P.put(id, still(P.from(id), guard(0))));
        // the infantry march in through the open postern, and on into the city
        inf.forEach((id, i) => {
          const a = P.from(id), t0 = 26.5 + Math.floor(i / 2) * 0.9;
          if (tb < t0) { P.put(id, still(a, {}, { shown: false })); return; }
          const s = span(tb, t0, t0 + 6.5), x = a.x, z = lerp(-52.4, -34, s);
          P.put(id, still(at(x, F, z, S), walk(((tb - t0) * 1.3) % 1), { shown: s < 0.98 }));
        });
      },
      props(tb, X) {
        X.doors?.open(ease(span(tb, 24.5, 28)) * (1 - ease(span(tb, 32.5, 34))));
      },
    });
  }

  // ---------------------------------------------------------------- 4. Sevro and the last boots
  {
    const howlers = ['clown', 'pebble', 'screwface'];
    const roofs = [at(-23.4, F + 28, -38.6, S), at(-23.4, F + 24, -15.4, S), at(-19, F + 1.2, -10, S)];
    const wall = at(-32.4, F + 7, 1.5, W);
    const marks: Record<Id, Spot | 'post'> = { sevro: roofs[0], darrow: at(-9.5, F, -38, S) };
    howlers.forEach((id, i) => (marks[id] = at(-10.5 + i * 1.2, F, -40 - i * 1.4, S)));
    out.push({
      id: 'boots', name: 'Sevro and the last boots', cast: ['sevro', 'darrow', ...howlers], holds: ['roofs', 'citadelWall'], weight: 1, marks, body: 30,
      play(tb, P) {
        // Sevro hops from roof to roof, waving the others on below
        const hop = (a: Spot, b: Spot, t0: number, t1: number): void => {
          const s = span(tb, t0, t1), e = ease(s);
          const y = lerp(a.y, b.y, e) + (3 + 0.6 * Math.abs(a.y - b.y)) * Math.sin(Math.PI * s);
          P.put('sevro', still(at(lerp(a.x, b.x, e), y, lerp(a.z, b.z, e), toward(a.x, a.z, b.x, b.z)), leap(s), { boots: s > 0 && s < 1 ? 1 : 0, cloak: 1 }));
        };
        if (tb < 3) P.put('sevro', still(roofs[0], tb > 1 ? salute(span(tb, 1, 3)) : {}, { cloak: 0.4 }));
        else if (tb < 6) hop(roofs[0], roofs[1], 3, 6);
        else if (tb < 7.5) P.put('sevro', still(roofs[1], { armR: 2.4, spreadR: 0.6 }, { cloak: 0.4 }));
        else if (tb < 10) hop(roofs[1], roofs[2], 7.5, 10);
        // the others run down the avenue's sidewalk below
        const runner = (id: Id, i: number): void => {
          const a = P.from(id), b = at(-12.4 + (i % 2) * 1.2, F, -6.2 - i * 1.3, S);
          const s = span(tb, 1 + i * 0.4, 10 + i * 0.4);
          P.put(id, still(at(lerp(a.x, b.x, s), F, lerp(a.z, b.z, s), toward(a.x, a.z, b.x, b.z)), s > 0 && s < 1 ? run((tb * 1.4) % 1) : {}, { cloak: 0.6 }));
        };
        howlers.forEach((id, i) => runner(id, i + 1));
        if (tb < 12) runner('darrow', 0);
        // at the Citadel's outer wall Sevro takes Darrow up to the top of it
        const d0 = at(-12.4, F, -6.2, S);
        if (tb >= 10 && tb < 12) P.put('sevro', still(at(lerp(roofs[2].x, d0.x - 0.3, span(tb, 10, 12)), F, lerp(roofs[2].z, d0.z + 1.5, span(tb, 10, 12)), N), run((tb * 1.5) % 1), {}));
        if (tb >= 12 && tb < 15.5) {
          const s = ease(span(tb, 12, 15.5));
          const x = lerp(d0.x, wall.x, s), z = lerp(d0.z, wall.z, s), y = lerp(F, wall.y, s) + 3 * Math.sin(Math.PI * s);
          P.put('sevro', still(at(x + 0.6, y + 0.4, z + 0.4, W), fly(s), { boots: 1, cloak: 1 }));
          P.put('darrow', still(at(x, y - 0.6, z, W), haul(0.5), { cloak: 0.8 }));
        }
        if (tb >= 15.5) {
          // Darrow runs on alone along the wall's top and over it, into the grounds
          const s = span(tb, 16, 21);
          P.put('darrow', still(at(wall.x - 0.2, wall.y, wall.z + 9 * ease(s), S), s > 0 && s < 1 ? run((tb * 1.4) % 1) : {}, { cloak: 0.7, shown: s < 0.97 }));
        }
        if (tb >= 15.5 && tb < 19) {
          // Sevro goes back for the next, and his boots die halfway: he drops lightly to the ground
          const s = span(tb, 15.5, 17.5);
          const x = lerp(wall.x + 0.6, -18, s), z = lerp(wall.z + 0.4, -3.4, s);
          const falling = tb > 17.5 ? span(tb, 17.5, 18.4) : 0;
          const y = tb < 17.5 ? lerp(wall.y + 0.4, F + 4, s) : lerp(F + 4, F, falling * falling);
          P.put('sevro', still(at(x, y, z, E), tb < 17.5 ? fly(s) : leap(0.8 + 0.2 * falling), { boots: tb < 17 ? 1 : Math.sin(tb * 50) > 0.3 && tb < 17.6 ? 0.5 : 0, cloak: 0.8 }));
        }
        if (tb >= 19) {
          // a shrug, and the Howlers throw back their heads and howl
          const sev = at(-18, F, -3.4, E);
          P.put('sevro', still(sev, tb < 21 ? { spreadL: 0.6, spreadR: 0.6, elbowL: 1.2, elbowR: 1.2 } : howl(span(tb, 21, 28)), { cloak: 0.3 }));
          howlers.forEach((id, i) => {
            const spot = at(sev.x + 2.2 * Math.cos(i * 2.1 + 1), F, sev.z + 2.2 * Math.sin(i * 2.1 + 1), 0);
            const h = toward(spot.x, spot.z, sev.x, sev.z);
            const s = span(tb, 19, 21);
            const from = P.from(id), b = at(-12.4 + ((i + 1) % 2) * 1.2, F, -6.2 - (i + 1) * 1.3, S);
            P.put(id, still(at(lerp(b.x, spot.x, s), F, lerp(b.z, spot.z, s), h), tb > 21 ? howl(span(tb, 21, 28)) : run((tb * 1.4) % 1), { cloak: 0.5 }));
            void from;
          });
        }
      },
    });
  }

  // ---------------------------------------------------------------- 5. Mustang drops the shield
  {
    const team = ['mustang', 'obsidian-0', 'obsidian-1'];
    const pylons: V3[] = [[60, F, -40], [82, F, -40], [60, F, -12], [82, F, -12]];
    const field = [at(-22, F, 34, S), at(-16.5, F, 31.5, S)];
    const marks: Record<Id, Spot | 'post'> = { mustang: at(64, F, -36, E), 'obsidian-0': at(66.2, F, -33, E), 'obsidian-1': at(68.6, F, -34.6, E), holiday: 'post', thraxa: 'post' };
    out.push({
      id: 'shield', name: 'Mustang drops the shield', cast: [...team, 'holiday', 'thraxa'], holds: ['park', 'shield', 'cityLz'], weight: 1, marks, body: 44,
      may: () => Wd.rain?.shield.isUp() ?? true,
      play(tb, P) {
        // she sets a charge on each pylon in turn, kneeling at its foot, while her Obsidians keep watch
        const m = P.from('mustang');
        const stops = pylons.map((p, i): Spot => at(p[0] + (p[0] < 70 ? 2.6 : -2.6), F, p[2] + (p[2] < -20 ? 2.6 : -2.6), toward(p[0] + (p[0] < 70 ? 2.6 : -2.6), p[2] + (p[2] < -20 ? 2.6 : -2.6), p[0], p[2]) + 0 * i));
        let here = m;
        let pose: Partial<Pose> = {};
        for (let i = 0; i < 4; i++) {
          const t0 = i * 4.5, prev = i === 0 ? m : stops[i - 1];
          if (tb >= t0 && tb < t0 + 2.5) {
            const s = span(tb, t0, t0 + 2.5);
            here = at(lerp(prev.x, stops[i].x, ease(s)), F, lerp(prev.z, stops[i].z, ease(s)), toward(prev.x, prev.z, stops[i].x, stops[i].z));
            pose = run((tb * 1.5) % 1);
          } else if (tb >= t0 + 2.5 && tb < t0 + 4.5) {
            here = stops[i];
            pose = kneel(span(tb, t0 + 2.5, t0 + 3.2));
          }
        }
        if (tb >= 18 && tb < 21) {
          // and runs clear
          const s = span(tb, 18, 21);
          here = at(lerp(stops[3].x, 71, ease(s)), F, lerp(stops[3].z, -26, ease(s)), toward(stops[3].x, stops[3].z, 71, -26));
          pose = run((tb * 1.5) % 1);
        } else if (tb >= 21) {
          here = at(71, F, -26, W);
          pose = tb > 32 ? draw(span(tb, 32, 36)) : guard(0);
        }
        P.put('mustang', still(here, pose, { cloak: 0.3 }));
        ['obsidian-0', 'obsidian-1'].forEach((id, i) => {
          const a = P.from(id);
          const b = i === 0 ? at(68.8, F, -27.6, E) : at(69.6, F, -24.2, E);
          const s = span(tb, 18, 21.5);
          P.put(id, still(at(lerp(a.x, b.x, s), F, lerp(a.z, b.z, s), s > 0 ? W : a.h), s > 0 && s < 1 ? run((tb * 1.2) % 1) : guard(0)));
        });
        // Holiday and Thraxa come down in the wave through the open sky, onto the Field of Mars
        ['holiday', 'thraxa'].forEach((id, i) => {
          const home = P.from(id), spot = field[i];
          const t0 = 27 + i * 0.6;
          if (tb < 22) P.put(id, still(home));
          else if (tb < 26) {
            const s = span(tb, 22, 26);
            P.put(id, still(at(home.x, home.y + 75 * ease(s), home.z, home.h), fly(s), { boots: 1, cloak: 1, shown: s < 0.92 }));
          } else if (tb < t0 + 6) P.put(id, still(spot, {}, { shown: false }));
          else {
            const s = tb - t0 - 6;
            P.put(id, still(spot, s < 1.2 ? blend(kneel(1), {}, s / 1.2) : guard(0), { razor: id === 'thraxa' ? 'blade' : 'coiled' }));
          }
        });
      },
      props(tb, X, live, once) {
        // one after another the pylons flare...
        for (let i = 0; i < 4; i++) {
          const t0 = 21.5 + i * 0.8;
          const f = tb < t0 ? 0 : tb < t0 + 0.5 ? span(tb, t0, t0 + 0.5) : 1 - span(tb, t0 + 0.5, t0 + 4);
          X.pylons?.flare(i, f);
        }
        if (!live || !Wd.rain) return;
        // ...the shield shatters...
        if (tb >= 22) once('down', () => Wd.rain?.shield.down());
        // ...and a wave from the Morning Star falls into the open city, with two marked shells for Holiday and Thraxa
        if (tb >= 26.5) {
          once('wave', () => {
            const tubes = () => Wd.fleet?.tubes('morningStar') ?? [[80, 120, 60]];
            Wd.rain?.wave(tubes, [LANDINGS.city, LANDINGS.flank], 18);
            field.forEach((spot, i) => {
              const from = tubes()[i * 4] ?? [80, 120, 60];
              Wd.rain?.drop(from, [spot.x, spot.y, spot.z], i === 0 ? 0x5e6670 : 0xc9a23a);
            });
          });
        }
      },
    });
    // the shield stays down while the show says so: see the director
  }

  // ---------------------------------------------------------------- 6. The Sovereign's shuttle
  {
    const guards = Array.from({ length: 8 }, (_, i) => `praetorian-${i}`);
    const pad = SHUTTLE_PADS[0];
    const ramp = at(pad.x - 3.4, deck, pad.z, E);
    const marks: Record<Id, Spot | 'post'> = { sovereign: 'post', aja: 'post', karnus: 'post', fitchner: 'post', darrow: at(-13, deck, 2.8, W) };
    guards.forEach((id) => (marks[id] = 'post'));
    out.push({
      id: 'shuttle', name: "the Sovereign's shuttle", cast: ['sovereign', 'aja', 'karnus', 'fitchner', 'darrow', ...guards], holds: ['pads', 'shuttles'], weight: 1.1, marks, body: 46,
      play(tb, P) {
        // the Praetorians form two lines from her place to the ramp, and she walks between them
        guards.forEach((id, i) => {
          const a = P.from(id);
          const b = at(ramp.x - 1 - Math.floor(i / 2) * 1.6, deck, ramp.z + (i % 2 ? 1.6 : -1.6) + 2.4, i % 2 ? N : S);
          const s = span(tb, 0, 4);
          const turnToDarrow = tb > 9 && tb < 16 ? toward(b.x, b.z, -13, 4) : b.h;
          P.put(id, still(at(lerp(a.x, b.x, ease(s)), deck, lerp(a.z, b.z, ease(s)), s < 1 ? toward(a.x, a.z, b.x, b.z) : turnTo(b.h, turnToDarrow, span(tb, 9, 10))), s > 0 && s < 1 ? walk((tb * 1.2) % 1) : guard(0), { razor: tb > 9.5 && tb < 16 ? 'blade' : 'coiled' }));
        });
        const sv = P.from('sovereign'), aja = P.from('aja'), kar = P.from('karnus'), fit = P.from('fitchner');
        // the Sovereign walks to the ramp and up into the shuttle; Aja at her shoulder; Karnus and Fitchner behind
        const walkTo = (id: Id, a: Spot, b: Spot, t0: number, t1: number, hide: number): void => {
          const s = span(tb, t0, t1);
          P.put(id, still(at(lerp(a.x, b.x, s), deck + (tb > t1 ? 0.6 : 0), lerp(a.z, b.z, s), toward(a.x, a.z, b.x, b.z)), s > 0 && s < 1 ? walk((tb * 1.1) % 1) : {}, { shown: tb < hide }));
        };
        walkTo('sovereign', sv, at(pad.x, deck, pad.z, E), 4, 9, 9.2);
        walkTo('aja', aja, at(pad.x - 0.8, deck, pad.z + 0.6, E), 4.4, 9.4, 9.8);
        // Karnus stands at the hatch; Fitchner at the ramp's foot
        walkTo('karnus', kar, at(ramp.x + 1.2, deck, ramp.z + 0.4, W), 5, 9.5, 99);
        walkTo('fitchner', fit, at(ramp.x - 1.4, deck, ramp.z - 1.4, W), 5.4, 9.6, 99);
        // Darrow sprints across the pads, weaving through the guards, and leaps onto the ramp as it lifts
        const d = P.from('darrow');
        if (tb < 9) P.put('darrow', still(d, guard(0), { razor: 'coiled' }));
        else if (tb < 13.5) {
          const s = span(tb, 9, 13.5), weave = Math.sin(s * Math.PI * 3) * 1.6;
          const x = lerp(d.x, ramp.x - 1.2, s), z = lerp(d.z, ramp.z, s) + weave * (1 - s);
          P.put('darrow', still(at(x, deck, z, toward(d.x, d.z, ramp.x, ramp.z)), run((tb * 1.6) % 1), { razor: 'blade', cloak: 0.8 }));
        } else if (tb < 15) {
          const s = span(tb, 13.5, 15);
          P.put('darrow', still(at(lerp(ramp.x - 1.2, ramp.x + 0.6, s), deck + 2.6 * Math.sin(Math.PI * s * 0.8) + 2 * s, ramp.z, E), leap(s), { razor: 'blade' }));
        } else if (tb < 19) {
          // on the ramp as the shuttle rolls; Karnus swings and Darrow vaults over him
          const lift = 2 + 3 * span(tb, 15, 19);
          const v = span(tb, 16.6, 17.6);
          P.put('darrow', still(at(ramp.x + 0.6 + 1.2 * v, deck + lift + 1.6 * Math.sin(Math.PI * v), ramp.z, E), v > 0 && v < 1 ? leap(v) : guard(0), { razor: 'blade' }));
          P.put('karnus', still(at(ramp.x + 1.6, deck + lift, ramp.z + 0.4, W), strike(span(tb, 15.6, 17)), { razor: 'blade' }));
        } else if (tb < 23) {
          // Fitchner turns with his pulseFist flashing, seizes Darrow and drops off the ramp on blazing boots
          const s = span(tb, 19, 23);
          const x = lerp(ramp.x + 1.8, -17, ease(s)), z = lerp(ramp.z, 18, ease(s)), y = lerp(deck + 5, deck, ease(s));
          P.put('fitchner', still(at(x + 0.6, y + 0.5, z, W), fly(s), { boots: 1, cloak: 1 }));
          P.put('darrow', still(at(x, y - 0.4, z + 0.3, W), haul(0.5), { razor: 'coiled' }));
          P.put('karnus', still(kar, {}, { shown: false }));
        } else if (tb < 30) {
          // he sets Darrow down on a pad, salutes, and is gone
          const set = at(-17, deck, 18, W);
          P.put('darrow', still(at(set.x - 0.8, deck, set.z + 0.4, E), tb < 24 ? kneel(1 - span(tb, 23, 24)) : guard(0), { razor: 'coiled' }));
          const s = span(tb, 26, 30);
          P.put('fitchner', still(at(set.x + 0.6 + 6 * s, deck + 20 * s * s, set.z - 4 * s, W), tb < 26 ? salute(span(tb, 23.6, 26)) : fly(s), { boots: tb > 26 ? 1 : 0, shown: s < 0.95 }));
        } else if (tb < 38) {
          P.put('darrow', still(at(-17.8, deck, 18.4, E), guard(0)));
          P.put('fitchner', still(fit, {}, { shown: false }));
        } else {
          // the shuttles come back down and her party walks out again, to the places they began
          const s = span(tb, 40, 45);
          walkTo('sovereign', at(pad.x, deck, pad.z, W), sv, 40, 45, 99);
          walkTo('aja', at(pad.x - 0.8, deck, pad.z + 0.6, W), aja, 40.3, 45, 99);
          walkTo('karnus', at(ramp.x + 1.2, deck, ramp.z + 0.4, W), kar, 40.6, 45, 99);
          P.put('fitchner', still(fit, guard(0), { shown: tb > 41 }));
          P.put('darrow', still(at(-17.8, deck, 18.4, E), guard(0)));
          void s;
        }
      },
      props(tb, X) {
        if (!X.shuttles) return;
        // the four shuttles start their engines together, climb, swap places, and the Sovereign's shimmers out of sight
        SHUTTLE_PADS.forEach((p, i) => {
          const eng = tb > 8 && tb < 36 ? 1 : tb > 7 && tb < 38 ? 0.5 : 0;
          const lift = ease(span(tb, 14, 19)) * 4 + ease(span(tb, 19, 28)) * (18 + i * 3);
          const swap = Math.sin(span(tb, 22, 30) * Math.PI) * (i % 2 ? 5 : -5);
          const bank = i === 0 ? Math.sin(span(tb, 15.5, 19) * Math.PI * 2) * 0.7 : 0;
          const down = ease(span(tb, 34, 40));
          const y = deck + lift * (1 - down);
          const shown = i !== 0 || tb < 27 || tb > 33;
          X.shuttles!.set(i, p.x + swap * (1 - down), y, p.z, p.heading, bank * (1 - down), shown, eng);
        });
        // the grenade Aja kicks out of the hatch, tumbling down to burst harmlessly in a puff of light
        const g = span(tb, 17.6, 19.6);
        if (g > 0 && g < 1) X.specks.speck([pad.x - 1, deck + 4.5 - 5 * g * g, pad.z + 1.4 + 2 * g], 0.5, 0xffd27a);
        const b = span(tb, 19.6, 21);
        X.rings.set(3, [pad.x - 1, deck + 0.2, pad.z + 3.4], 0.4 + 3 * b, b > 0 && b < 1 ? 1 - b : 0, 0xffe2a0);
      },
    });
  }

  // ---------------------------------------------------------------- 7. Lorn at the south wall
  {
    const men = Array.from({ length: 8 }, (_, i) => `lornsMan-${i}`);
    const defenders = ['lysander', 'atalantia', 'bellona-4', 'bellona-5', 'bellona-6', 'bellona-7'];
    const line = (i: number): Spot => onGround(-12 + i * 3.4, 69.5, N);
    const foot = (i: number): Spot => onGround(-12 + i * 3.4, 64.2, N);
    const marks: Record<Id, Spot | 'post'> = { lorn: onGround(3.3, 70, N) };
    men.forEach((id, i) => (marks[id] = line(i)));
    defenders.forEach((id) => (marks[id] = 'post'));
    out.push({
      id: 'southWall', name: 'Lorn at the south wall', cast: ['lorn', ...men, ...defenders], holds: ['outside', 'southWalk'], weight: 1, marks, body: 40,
      play(tb, P) {
        // Lorn walks to the wall without hurrying, his razor snapping between whip and blade as he turns the bolts aside
        const l = P.from('lorn');
        const lz = lerp(l.z, 64.8, span(tb, 0, 12));
        const snap = tb < 12 ? (Math.floor(tb * 2.2) % 2 ? 'blade' : 'whip') : 'blade';
        if (tb < 12) P.put('lorn', still(at(l.x, landAt(l.x, lz), lz, N), blend(walk((tb * 0.9) % 1), parry((tb * 1.1) % 1), 0.5), { razor: snap, flash: (tb * 2.2) % 1 < 0.15 ? 1 : 0 }));
        // his force charges, falls back, and charges again
        men.forEach((id, i) => {
          const a = P.from(id), f = foot(i);
          let z = a.z;
          if (tb > 4 && tb < 8) z = lerp(a.z, f.z, ease(span(tb, 4, 8)));
          else if (tb >= 8 && tb < 11) z = lerp(f.z, a.z, ease(span(tb, 8, 11)));
          else if (tb >= 11 && tb < 15) z = lerp(a.z, f.z, ease(span(tb, 11, 15)));
          else if (tb >= 15) z = f.z;
          const moving = (tb > 4 && tb < 15) && Math.abs(z - a.z) > 0.05 && Math.abs(z - f.z) > 0.05;
          let s: State = still(at(a.x, landAt(a.x, z), z, tb >= 8 && tb < 11 ? S : N), moving ? run((tb * 1.3 + i * 0.2) % 1) : guard(0), { razor: 'blade' });
          // over the empty wall, after Lorn
          if (tb >= 26) {
            const u = span(tb, 26 + i * 0.25, 28.5 + i * 0.25);
            s = still(at(a.x, lerp(landAt(a.x, f.z), F + 8, Math.sqrt(u)) + 2.5 * Math.sin(Math.PI * u), lerp(f.z, 60.6, ease(u)), N), leap(u), { razor: 'blade', boots: Math.sin(Math.PI * u) });
          }
          P.put(id, s);
        });
        // the defenders on the walk fire their bolts, then rush away north towards the opened gate, and come back when it is over
        defenders.forEach((id, i) => {
          const a = P.from(id);
          if (tb < 18) P.put(id, still(a, tb > 2 && tb < 14 && i > 1 ? { armR: 1.4, armL: 1.3, elbowL: 0.4 } : guard(0), { razor: i < 2 ? 'blade' : 'coiled' }));
          else if (tb < 24) {
            const s = span(tb, 18 + i * 0.3, 22 + i * 0.3);
            P.put(id, still(at(a.x, lerp(a.y, F, s), lerp(a.z, 46, s), N), s > 0 && s < 1 ? run((tb * 1.3) % 1) : {}, { shown: s < 0.97 }));
          } else P.put(id, still(a, {}, { shown: false }));
        });
        // Lorn lifts his razor, goes over the empty wall, and stands on the parapet looking up at the Rain
        if (tb >= 12 && tb < 26) P.put('lorn', still(at(l.x, landAt(l.x, 64.8), 64.8, N), tb > 23 ? { armR: 2.9, elbowR: 0.2 } : guard(0), { razor: 'blade' }));
        if (tb >= 26) {
          const u = span(tb, 26, 28.5);
          P.put('lorn', still(at(l.x, lerp(landAt(l.x, 64.8), F + 8, Math.sqrt(u)) + 2.5 * Math.sin(Math.PI * u), lerp(64.8, 60.4, ease(u)), N), tb < 28.5 ? leap(u) : { nod: -0.7, armR: tb < 33 ? 2.6 : 0 }, { razor: 'blade', boots: Math.sin(Math.PI * u) }));
        }
      },
      props(tb, X) {
        // the bolts from the wall at Lorn, turned aside by his razor in sparks
        if (tb > 2 && tb < 12) {
          for (let i = 0; i < 4; i++) {
            const f = ((tb * 1.6 + i * 0.27) % 1);
            const sx = -7 + i * 9, sz = 60.5, lz = lerp(70, 64.8, span(tb, 0, 12));
            const p: V3 = [lerp(sx, 4, f), lerp(F + 8.6, landAt(4, lz) + 1.8, f), lerp(sz, lz, f)];
            X.specks.streak(p, [p[0] + 0.6, p[1] + 0.25, p[2] - 0.9], 0.16, 0xff8c5a);
          }
        }
      },
    });
  }

  // ---------------------------------------------------------------- 8. The Willow Way
  {
    const T = STAGES.terrace, ty = T.y;
    const lornAt = at(-41, ty, 43.5, S), darrowAt = at(-41, ty, 46.5, N);
    const steps = at(-41.5, F + 1.6, 52.8, S);
    const door = at(-45.6, ty, 44, E);
    const marks: Record<Id, Spot | 'post'> = { lorn: lornAt, darrow: darrowAt, alexandar: at(-37.8, ty, 40.2, S), boyAlexandar: door };
    out.push({
      id: 'willow', name: 'the Willow Way', cast: ['lorn', 'darrow', 'alexandar', 'boyAlexandar'], holds: ['terrace'], weight: 0.9, marks, body: 46,
      play(tb, P) {
        // the boy comes out with his bread and sits on the steps to watch
        if (tb < 1) P.put('boyAlexandar', still(door, {}, { shown: false }));
        else if (tb < 5) {
          const s = span(tb, 1, 5);
          P.put('boyAlexandar', still(at(lerp(door.x, steps.x, s), lerp(ty, steps.y, s * s), lerp(door.z, steps.z, s), toward(door.x, door.z, steps.x, steps.z)), walk((tb * 1.4) % 1)));
        } else if (tb < 24) P.put('boyAlexandar', still(at(steps.x, steps.y, steps.z, N), sit(((tb - 5) / 3) % 1)));
        else if (tb < 28) {
          const s = span(tb, 24, 28);
          P.put('boyAlexandar', still(at(lerp(steps.x, door.x, s), lerp(steps.y, ty, s), lerp(steps.z, door.z, s), toward(steps.x, steps.z, door.x, door.z)), walk((tb * 1.4) % 1), { shown: s < 0.95 }));
        } else P.put('boyAlexandar', still(door, {}, { shown: false }));
        // Lorn and Darrow spar slowly, in the Willow Way's sets of twelve moves (GS 12)
        const sparring = (a: Id, b: Id, sa: Spot, sb: Spot, t0: number, t1: number): void => {
          if (tb < t0 || tb >= t1) return;
          const beat = (tb - t0) / 1.6, f = beat % 1, k = Math.floor(beat) % 2;
          const sway = Math.sin((tb - t0) * 0.8) * 0.5;
          P.put(a, still(at(sa.x + sway, sa.y, sa.z, sa.h), k ? strike(f) : parry(f), { razor: 'blade', flash: f > 0.46 && f < 0.54 ? 0.6 : 0 }));
          P.put(b, still(at(sb.x + sway, sb.y, sb.z, sb.h), k ? parry(f) : strike(f), { razor: 'blade', flash: f > 0.46 && f < 0.54 ? 0.6 : 0 }));
        };
        sparring('lorn', 'darrow', lornAt, darrowAt, 1, 20);
        // Lorn steps back, and a grown Alexandar, white hair streaming, takes his place
        if (tb >= 20 && tb < 23) {
          const s = span(tb, 20, 23);
          P.put('lorn', still(at(lerp(lornAt.x, -44.4, s), ty, lerp(lornAt.z, 40.6, s), E), walk((tb * 1.1) % 1), { razor: 'coiled' }));
          P.put('darrow', still(darrowAt, guard(0), { razor: 'blade' }));
          const a = P.from('alexandar');
          P.put('alexandar', still(at(lerp(a.x, lornAt.x, s), ty, lerp(a.z, lornAt.z, s), S), walk((tb * 1.2) % 1), { cloak: 0.5 }));
        }
        if (tb >= 23) P.put('lorn', still(at(-44.4, ty, 40.6, E + 0.6), guard(0), { razor: 'coiled' }));
        sparring('alexandar', 'darrow', lornAt, darrowAt, 23, 38);
        // and the three bow to each other
        if (tb >= 38) {
          const s = bow(span(tb, 39, 44));
          P.put('darrow', still(at(darrowAt.x, ty, darrowAt.z, toward(darrowAt.x, darrowAt.z, -42.6, 42)), s, { razor: 'coiled' }));
          P.put('alexandar', still(at(lornAt.x, ty, lornAt.z, toward(lornAt.x, lornAt.z, -42.6, 44)), s, { razor: 'coiled' }));
          P.put('lorn', still(at(-44.4, ty, 40.6, toward(-44.4, 40.6, -41, 45)), s, { razor: 'coiled' }));
        }
        if (tb < 1) {
          P.put('lorn', still(lornAt));
          P.put('darrow', still(darrowAt));
        }
        if (tb < 20) P.put('alexandar', still(P.from('alexandar'), guard(0)));
      },
    });
  }

  // ---------------------------------------------------------------- 9. Darrow and his companions against Aja
  {
    const pad = SHUTTLE_PADS[0];
    const ajaAt = at(pad.x - 4.6, deck, pad.z + 0.4, E);
    const ring = (i: number, r: number): Spot => {
      const a = W + (i - 1.5) * 0.7;
      return at(ajaAt.x + Math.cos(a) * r, deck, ajaAt.z + Math.sin(a) * r, a + Math.PI);
    };
    const marks: Record<Id, Spot | 'post'> = { aja: ajaAt, darrow: ring(0, 3.4), mustang: ring(1, 3.6), cassius: ring(2, 3.4), sevro: ring(3, 5.4) };
    out.push({
      id: 'aja', name: 'Darrow and his companions against Aja', cast: ['aja', 'darrow', 'mustang', 'cassius', 'sevro'], holds: ['pads', 'shuttles'], weight: 1.2, marks, body: 40,
      play(tb, P) {
        const order = ['darrow', 'mustang', 'cassius'];
        // they circle her, and she turns each of them aside in turn, razors ringing
        const circling = (id: Id, i: number): Spot => {
          const a = W + (i - 1) * 0.9 + Math.sin(tb * 0.5 + i) * 0.3, r = 3.2 + 0.4 * Math.sin(tb * 0.7 + i * 2);
          return at(ajaAt.x + Math.cos(a) * r, deck, ajaAt.z + Math.sin(a) * r, a + Math.PI);
        };
        const turn = Math.floor(tb / 3) % 3, f = (tb % 3) / 3;
        if (tb < 24) {
          order.forEach((id, i) => {
            const c = circling(id, i), lunging = i === turn && f > 0.2 && f < 0.75;
            const p = lunging ? at(lerp(c.x, ajaAt.x, 0.35), deck, lerp(c.z, ajaAt.z, 0.35), c.h) : c;
            P.put(id, still(p, lunging ? strike(span(f, 0.2, 0.75)) : guard(0), { razor: 'blade', flash: lunging && f > 0.45 && f < 0.52 ? 1 : 0, cloak: 0.4 }));
          });
          const foe = circling(order[turn], turn);
          P.put('aja', still(at(ajaAt.x, deck, ajaAt.z, toward(ajaAt.x, ajaAt.z, foe.x, foe.z)), f > 0.25 && f < 0.75 ? parry(span(f, 0.25, 0.75)) : guard(0), { razor: 'blade', flash: f > 0.45 && f < 0.52 ? 1 : 0, cloak: 0.3 }));
          // Sevro is knocked down early, and lies still as if out of the fight
          const sv = P.from('sevro');
          const down = span(tb, 2, 3);
          P.put('sevro', still(at(sv.x, deck, sv.z, sv.h), tb < 2 ? guard(0) : kneel(down), { razor: 'blade' }));
        } else {
          // Sevro springs up behind her; the four close in a ring with their razors raised
          const s = span(tb, 24, 26);
          ['darrow', 'mustang', 'cassius', 'sevro'].forEach((id, i) => {
            const r = ring(i, 2.9);
            const from = id === 'sevro' ? P.from('sevro') : circling(id, i);
            P.put(id, still(at(lerp(from.x, r.x, ease(s)), deck, lerp(from.z, r.z, ease(s)), r.h), tb < 26 ? leap(s) : { armR: 2.7, elbowR: 0.3 }, { razor: 'blade', cloak: 0.3 }));
          });
          // Aja salutes with her blade and steps back up the ramp, and the shuttle lifts away
          if (tb < 32) P.put('aja', still(ajaAt, salute(span(tb, 26.5, 31)), { razor: 'blade' }));
          else {
            const u = span(tb, 32, 34.5);
            P.put('aja', still(at(lerp(ajaAt.x, pad.x, u), deck + 0.6 * u, lerp(ajaAt.z, pad.z, u), E), walk((tb * 1.1) % 1), { shown: u < 0.97, razor: 'coiled' }));
          }
          if (tb >= 37) ['darrow', 'mustang', 'cassius', 'sevro'].forEach((id, i) => P.put(id, still(ring(i, 2.9), guard(0), { razor: 'coiled' })));
        }
      },
      props(tb, X) {
        if (!X.shuttles) return;
        // her shuttle lifts away, out over the city, and comes down again once the story is over
        const p = SHUTTLE_PADS[0];
        const up = ease(span(tb, 34.5, 38)), back = ease(span(tb, 38, 40));
        X.shuttles.set(0, p.x + 30 * up * (1 - back), F + 6 + 40 * up * (1 - back), p.z - 10 * up * (1 - back), p.heading, 0, tb < 37 || tb > 39.5, tb > 33 && tb < 40 ? 1 : 0);
      },
    });
  }

  // ---------------------------------------------------------------- 10. Ragnar and Aja in the snow, and the Valkyrie
  {
    const T = STAGES.snow;
    const g = (x: number, z: number, h: number): Spot => onGround(x, z, h);
    const ragnarAt = g(50, -95, E), ajaAt = g(54, -95, W);
    const darrowAt = g(40, -92.5, E), cassiusAt = g(44.5, -92.5, W), mustangAt = g(38, -96.5, E);
    const vk = ['sefi', 'valkyrie-0', 'valkyrie-1', 'valkyrie-2', 'valkyrie-3'];
    const marks: Record<Id, Spot | 'post'> = { ragnar: ragnarAt, aja: ajaAt, darrow: darrowAt, cassius: cassiusAt, mustang: mustangAt };
    vk.forEach((id) => (marks[id] = 'post'));
    out.push({
      id: 'snow', name: 'Ragnar and Aja in the snow, and the Valkyrie', cast: ['ragnar', 'aja', 'darrow', 'cassius', 'mustang', ...vk], holds: ['snow', 'griffins'], weight: 1, marks, body: 42,
      may: () => true,
      play(tb, P) {
        // Ragnar and Aja duel in the snow, his ionBlades against her razor
        const duel = tb < 26;
        if (duel) {
          const f = (tb / 1.8) % 1, k = Math.floor(tb / 1.8) % 2;
          const step = Math.sin(tb * 0.6) * 0.8;
          P.put('ragnar', still(at(ragnarAt.x + step, ragnarAt.y, ragnarAt.z, E), k ? strike(f) : parry(f), { razor: 'blade', flash: f > 0.46 && f < 0.54 ? 1 : 0 }));
          P.put('aja', still(at(ajaAt.x + step, ajaAt.y, ajaAt.z, W), k ? parry(f) : strike(f), { razor: 'blade', flash: f > 0.46 && f < 0.54 ? 1 : 0, cloak: 0.4 }));
        } else {
          // the griffins come over the rim, and Aja springs back and slides away down a snowy cleft
          const s = span(tb, 26, 30);
          const ax = ajaAt.x + 14 * ease(s), az = ajaAt.z + 3 * s;
          P.put('aja', still(at(ax, landAt(ax, az) + 0.6 + 2 * Math.sin(Math.PI * Math.min(1, s * 2)), az, E), s < 0.5 ? leap(s * 2) : fly(s), { shown: s < 0.97, boots: s > 0.4 ? 1 : 0 }));
          P.put('ragnar', still(ragnarAt, guard(0), { razor: 'blade' }));
        }
        // nearby, Mustang's arrows keep Cassius off Darrow
        P.put('mustang', still(mustangAt, tb < 26 ? draw((tb / 2.2) % 1) : guard(0), {}));
        const back = tb < 26 ? Math.min(1.4, ((tb / 2.2) % 1) * 2) : 1.4;
        P.put('cassius', still(at(cassiusAt.x + back, cassiusAt.y, cassiusAt.z, W), tb < 26 ? parry((tb / 2.2) % 1) : guard(0), { razor: 'blade' }));
        P.put('darrow', still(darrowAt, tb < 26 ? guard(0) : { head: 0.6 }, { razor: 'blade' }));
        // the riders mount, ride out over the plateau and back over the rim, and Sefi lands beside her brother
        vk.forEach((id, i) => {
          const home = P.from(id), w = wingsAt(i, tb, ragnarAt);
          const saddle = at(w.x, w.y + 1.5, w.z, w.h);
          if (tb < 5) P.put(id, still(home));
          else if (tb < 6) {
            const u = span(tb, 5, 6);
            P.put(id, still(at(lerp(home.x, saddle.x, u), lerp(home.y, saddle.y, u) + Math.sin(Math.PI * u), lerp(home.z, saddle.z, u), saddle.h), leap(u)));
          } else if (i === 0 ? tb < 33 : tb < 30.5) P.put(id, still(saddle, sit(0.5), { cloak: 0.8 }));
          else if (i === 0) {
            const sefiAt = at(ragnarAt.x + 1.5, ragnarAt.y, ragnarAt.z + 0.4, W);
            const u = span(tb, 33, 34);
            P.put(id, still(at(lerp(saddle.x, sefiAt.x, u), lerp(saddle.y, sefiAt.y, u), lerp(saddle.z, sefiAt.z, u), W), tb > 35 ? { armR: 1.3, elbowR: 0.8 } : leap(u)));
          } else {
            const u = span(tb, 30.5, 31.5);
            P.put(id, still(at(lerp(saddle.x, home.x, u), lerp(saddle.y, home.y, u) + Math.sin(Math.PI * u), lerp(saddle.z, home.z, u), home.h), leap(u)));
          }
        });
        if (tb >= 33) P.put('ragnar', still(at(ragnarAt.x, ragnarAt.y, ragnarAt.z, E), tb > 35 ? { armR: 1.3, elbowR: 0.8 } : guard(0), { razor: 'coiled' }));
      },
      props(tb, X) {
        // the griffins: up off the snow, out over the plateau to the east, and back over the rim with the Valkyrie on their backs
        X.griffins.forEach((gr, i) => {
          const w = wingsAt(i, tb, ragnarAt);
          gr.at(w.x, w.y, w.z, w.h, w.pitch, w.bank);
          gr.wings(w.beat, w.folded);
        });
        void T;
      },
    });
  }

  // ---------------------------------------------------------------- 11. The leeches on the Warchild, and 13. the chase: the fleet's
  out.push({ id: 'leeches', name: 'the leeches on the Warchild', cast: [], holds: ['sky'], weight: 0.7, marks: {}, body: 40, play() {}, sky: () => Wd.fleet?.leeches() ?? 0 });
  out.push({ id: 'chase', name: 'the Charybdis chases the Archimedes', cast: [], holds: ['sky'], weight: 0.7, marks: {}, body: 30, play() {}, sky: () => Wd.fleet?.chase() ?? 0 });

  // ---------------------------------------------------------------- 12. The Howlers' howl
  {
    const pack = ['sevro', 'alexandar', 'clown', 'pebble', 'screwface'];
    const T = STAGES.howl, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2;
    const ringAt = (i: number): Spot => {
      const a = (i / pack.length) * TAU;
      return at(cx + Math.cos(a) * 2.4, T.y, cz + Math.sin(a) * 2.4, a + Math.PI);
    };
    const marks: Record<Id, Spot | 'post'> = {};
    pack.forEach((id) => (marks[id] = 'post'));
    out.push({
      id: 'howl', name: "the Howlers' howl", cast: pack, holds: ['howl'], weight: 0.9, marks, body: 36,
      play(tb, P) {
        pack.forEach((id, i) => {
          const home = P.from(id), r = ringAt(i);
          // one by one they drop onto the roof from the sky...
          const t0 = i * 1.6, t1 = t0 + 7;
          if (tb < t0) { P.put(id, still(home)); return; }
          if (tb < t1) {
            const s = span(tb, t0, t1);
            if (s < 0.7) {
              // across, high over the city, to above its place on the roof
              const e = ease(s / 0.7);
              const x = lerp(home.x, r.x, e), z = lerp(home.z, r.z, e), y = lerp(home.y, r.y + 12, e) + 18 * Math.sin(Math.PI * e);
              P.put(id, still(at(x, y, z, toward(home.x, home.z, r.x, r.z)), fly(s), { boots: 1, cloak: 1 }));
            } else {
              // and straight down onto it
              const e = ease((s - 0.7) / 0.3);
              P.put(id, still(at(r.x, lerp(r.y + 12, r.y, e), r.z, r.h), leap(0.6 + 0.4 * e), { boots: e < 0.95 ? 1 : 0, cloak: 1 - 0.5 * e }));
            }
            return;
          }
          // ...gather in a ring, throw back their heads and howl, cloaks flapping...
          if (tb < 26) { P.put(id, still(r, tb > 14 ? howl(span(tb, 14, 24)) : guard(0), { cloak: tb > 14 ? 0.8 : 0.2 })); return; }
          // ...and leap off together in every direction, curving back home to the rim
          const s = span(tb, 26 + i * 0.35, 35);
          if (s <= 0) { P.put(id, still(r, howl(1), { cloak: 0.6 })); return; }
          // straight up off the roof and out, each its own way, and then away home in an arc
          const out = (i / pack.length) * TAU;
          const top = at(r.x + Math.cos(out) * 4, r.y + 10, r.z + Math.sin(out) * 4, r.h);
          if (s < 0.3) {
            const e = ease(s / 0.3);
            P.put(id, still(at(lerp(r.x, top.x, e), lerp(r.y, top.y, e), lerp(r.z, top.z, e), out), leap(0.3 + 0.4 * e), { boots: 1, cloak: 1 }));
          } else {
            const e = ease((s - 0.3) / 0.7);
            const x = lerp(top.x, home.x, e), z = lerp(top.z, home.z, e), y = lerp(top.y, home.y, e) + 14 * Math.sin(Math.PI * e);
            P.put(id, still(at(x, y, z, toward(top.x, top.z, home.x, home.z)), s < 0.95 ? fly(s) : {}, { boots: s < 0.95 ? 1 : 0, cloak: 1 }));
          }
        });
      },
    });
    // they end at home: no way back is needed
  }

  return out;
}

/** Where each griffin rests in the snow, by the Valkyrie: set when the show begins. */
let WINGS_HOME: V3[] = [];

/**
 * Where griffin `i` is at a moment of the Valkyrie's story: at rest in the
 * snow, then up and out in a wide loop east over the plateau, and back over
 * the rim; Sefi's comes down beside Ragnar at the end, the others home again.
 */
function wingsAt(i: number, tb: number, ragnarAt: Spot): { x: number; y: number; z: number; h: number; pitch: number; bank: number; beat: number; folded: number } {
  const home = WINGS_HOME[i] ?? [50, 30, -99];
  const rest = { x: home[0], y: home[1], z: home[2], h: S, pitch: 0, bank: 0, beat: 0, folded: 1 };
  const s = span(tb, 6, 30);
  if (s <= 0) return rest;
  if (s < 1) {
    const a = s * TAU, reach = 18 + i * 3;
    const x = home[0] + reach * Math.sin(a / 2) * (0.9 + 0.1 * Math.cos(a));
    const z = home[2] + 8 * Math.sin(a) - 4 * Math.sin(a / 2);
    const y = home[1] + (22 + i * 3.5) * Math.sin(Math.PI * s) + 2 * Math.sin(a * 2 + i);
    const dx = Math.cos(a / 2) * reach * 0.5, dz = 8 * Math.cos(a) - 2 * Math.cos(a / 2);
    return { x, y, z, h: Math.atan2(dz, dx), pitch: 0.25 * Math.cos(Math.PI * s), bank: -0.35 * Math.sin(a), beat: (tb * 1.6 + i * 0.2) % 1, folded: 0 };
  }
  if (i === 0) {
    const u = span(tb, 30, 33), e = ease(u);
    const x = lerp(home[0], ragnarAt.x + 3.4, e), z = lerp(home[2], ragnarAt.z - 1.8, e), y = lerp(home[1], ragnarAt.y, e) + 5 * Math.sin(Math.PI * u);
    return { x, y, z, h: W, pitch: 0, bank: 0, beat: u < 1 ? (tb * 1.6) % 1 : 0, folded: u < 1 ? 0 : 1 };
  }
  return rest;
}

// ---------------------------------------------------------------------------
// The director
// ---------------------------------------------------------------------------

/** How many stories on the ground play at once, and in the sky. */
const AT_ONCE = 4, SKY_AT_ONCE = 1;

interface Running {
  def: StoryDef;
  t: number;
  tin: number;
  tout: number;
  legsIn: Map<Id, Leg>;
  legsOut: Map<Id, Leg>;
  fromSpot: Map<Id, Spot>;
  done: Set<string>;
  skyLen: number;
}

export function buildShow(k: Build): Sky {
  const fleet = tried('the fleet', () => buildFleet(k));
  const rain = tried('the Rain', () => buildRain(k, landAt));
  const cast = tried('the cast', () => buildCast(k));
  tried('the spider tanks', () => buildSpiders(k));
  const doors = tried('the postern', () => buildPosternDoors(k));
  const pylons = tried('the pylons', () => buildPylonTops(k));
  const griffins = tried('the griffins', () => buildGriffins(k, 5)) ?? [];
  const fox = tried('the fox', () => buildFox(k));
  const specks = new Specks(k);
  const rings = new Rings(k);
  const shuttles = tried('the shuttles', () => buildShuttles(k));

  const POSTS = posts();
  const W0: World = { posts: POSTS, fleet, rain };

  // the cast, each at its post
  const actors = new Map<Id, Actor>();
  if (cast) {
    for (const [id, spot] of Object.entries(POSTS)) {
      const dash = id.lastIndexOf('-');
      const look = dash > 0 && /\d$/.test(id) ? soldierLook(id.slice(0, dash) as SoldierKind) : lookOf(id as CastId);
      const fig = tried(`the figure of ${id}`, () => cast.add(look));
      const now = spot ? still(spot) : still(at(0, -20, 0, S), {}, { shown: false });
      const rest: Actor['rest'] = id === 'jackal' ? 'pace' : id.startsWith('praetorian') || id.startsWith('bellona') || id.startsWith('lornsMan') || id.startsWith('obsidian') ? 'guard' : 'look';
      actors.set(id, { id, look, fig, post: spot, busy: null, now, rest });
    }
  }
  const show = (a: Actor, s: State): void => {
    a.now = s;
    const f = a.fig;
    if (!f) return;
    f.at(s.x, s.y, s.z, s.h);
    f.pose(s.pose);
    f.razor(s.razor, s.flash);
    f.boots(s.boots);
    f.cloak(s.cloak);
    f.shown(s.shown);
  };
  for (const a of actors.values()) show(a, a.now);

  // the griffins at rest in the snow, beside their riders
  // griffin 0 is Sefi's, and each of the others a Valkyrie's, resting just behind its rider
  WINGS_HOME = [0, 1, 2, 3, 4].map((i) => {
    const x = [62, 41, 47, 55, 68][i], z = [-99.4, -99.6, -100.2, -99.8, -97.6][i];
    return [x, landAt(x, z), z] as V3;
  });
  griffins.forEach((g, i) => { const h = WINGS_HOME[i]; g.at(h[0], h[1], h[2], S); g.wings(0, 1); });

  const defs = stories(W0);
  const X: Props = { shuttles, doors, pylons, griffins, specks, rings };
  const running: Running[] = [];
  const lastStart = new Map<string, number>();
  const holding = new Set<string>();
  let clock = 0, nextPick = 3, shieldUpAt = -1;

  const start = (def: StoryDef): void => {
    const r: Running = { def, t: 0, tin: 0, tout: 0, legsIn: new Map(), legsOut: new Map(), fromSpot: new Map(), done: new Set(), skyLen: 0 };
    if (def.sky) {
      r.skyLen = Math.max(1, def.sky());
    } else {
      for (const id of def.cast) {
        const a = actors.get(id);
        if (!a) continue;
        a.busy = def.id;
        const mark = def.marks[id];
        const here = at(a.now.x, a.now.y, a.now.z, a.now.h);
        const to = !mark || mark === 'post' ? (a.post ?? here) : mark;
        r.fromSpot.set(id, to);
        // a figure that is away appears at its mark: the story's body shows it when it should
        const leg = a.post && a.now.shown ? legBetween(here, to) : { dur: 0, at: () => still(to, {}, { shown: false }) };
        r.legsIn.set(id, leg);
        r.tin = Math.max(r.tin, leg.dur);
      }
      // where the body leaves each, and the way home from there
      const last = new Map<Id, State>();
      def.play(def.body, { put: (id, s) => last.set(id, s), from: (id) => r.fromSpot.get(id) ?? at(0, F, 0, S) });
      for (const id of def.cast) {
        const a = actors.get(id);
        if (!a) continue;
        const end = last.get(id);
        if (!a.post) { r.legsOut.set(id, { dur: 0, at: () => still(at(0, -20, 0, S), {}, { shown: false }) }); continue; }
        if (!end) { r.legsOut.set(id, { dur: 0, at: () => still(a.post!) }); continue; }
        const from = at(end.x, end.y, end.z, end.h);
        const leg = end.shown ? legBetween(from, a.post) : { dur: 0.1, at: () => still(a.post!) };
        r.legsOut.set(id, leg);
        r.tout = Math.max(r.tout, leg.dur);
      }
    }
    def.holds.forEach((h) => holding.add(h));
    lastStart.set(def.id, clock);
    running.push(r);
  };

  const finish = (r: Running): void => {
    for (const id of r.def.cast) {
      const a = actors.get(id);
      if (!a) continue;
      a.busy = null;
      if (a.post) show(a, still(a.post));
      else show(a, still(at(0, -20, 0, S), {}, { shown: false }));
    }
    r.def.holds.forEach((h) => holding.delete(h));
    running.splice(running.indexOf(r), 1);
  };

  const free = (def: StoryDef): boolean => def.cast.every((id) => !actors.get(id)?.busy) && def.holds.every((h) => !holding.has(h)) && (def.may?.() ?? true);

  const pick = (): void => {
    const ground = running.filter((r) => !r.def.sky).length, sky = running.filter((r) => r.def.sky).length;
    let best: StoryDef | null = null, bestScore = -1;
    for (const def of defs) {
      if (running.some((r) => r.def === def)) continue;
      if (def.sky ? sky >= SKY_AT_ONCE : ground >= AT_ONCE) continue;
      if (def.sky && !fleet) continue;
      if (!def.sky && !cast) continue;
      if (!free(def)) continue;
      // each waits its turn: the longer since it last began, the more it is owed
      const since = clock - (lastStart.get(def.id) ?? -400);
      const score = since * def.weight;
      if (score > bestScore) { bestScore = score; best = def; }
    }
    if (best) start(best);
  };

  // the opening: the Reaper's squadron falls, the Sovereign walks to her shuttle, and Lorn marches on the south wall
  for (const id of ['reaper', 'shuttle', 'southWall']) { const d = defs.find((x) => x.id === id); if (d && free(d)) start(d); }

  // the Rain that falls all the time, from the Pax and the Morning Star in turn, onto the ground outside the shield
  let nextWave = 4, fromPax = true;
  const outside: Zone[] = [LANDINGS.west, LANDINGS.east, LANDINGS.flank, LANDINGS.peaks];

  let frame = 0;
  k.each((dt) => {
    if (dt <= 0) return;
    clock += dt;
    frame++;
    specks.begin();
    // the Rain
    if (rain && fleet) {
      nextWave -= dt;
      if (nextWave <= 0) {
        const ship = fromPax ? 'pax' : 'morningStar';
        fromPax = !fromPax;
        const zones = rain.shield.isUp() ? outside : [...outside, LANDINGS.city];
        nextWave = Math.max(28, rain.wave(() => fleet.tubes(ship), zones, 22) * 0.6);
      }
      // the shield comes back up a while after Mustang has dropped it
      if (!rain.shield.isUp()) {
        if (shieldUpAt < 0) shieldUpAt = clock + 75;
        if (clock > shieldUpAt && !holding.has('shield')) { rain.shield.up(); shieldUpAt = -1; }
      }
    }
    // the stories
    nextPick -= dt;
    if (nextPick <= 0) { pick(); nextPick = 2.5; }
    for (const r of [...running]) {
      r.t += dt;
      if (r.def.sky) {
        if (r.t > r.skyLen + 2) finish(r);
        continue;
      }
      const tb = r.t - r.tin;
      if (tb < 0) {
        for (const [id, leg] of r.legsIn) {
          const a = actors.get(id);
          if (!a) continue;
          if (r.t <= leg.dur) show(a, leg.at(r.t));
          else { const m = r.fromSpot.get(id)!; show(a, still(m, guard(0), { shown: !!a.post && a.now.shown })); }
        }
      } else if (tb <= r.def.body) {
        r.def.play(tb, { put: (id, s) => { const a = actors.get(id); if (a) show(a, s); }, from: (id) => r.fromSpot.get(id) ?? at(0, F, 0, S) });
        r.def.props?.(tb, X, true, (key, fn) => { if (!r.done.has(key)) { r.done.add(key); fn(); } });
      } else {
        const tl = tb - r.def.body;
        for (const [id, leg] of r.legsOut) { const a = actors.get(id); if (a) show(a, leg.at(Math.min(tl, leg.dur))); }
        if (tl >= r.tout) finish(r);
      }
    }
    // the cast at rest look about, each in its own way, a few at a frame
    let n = 0;
    for (const a of actors.values()) {
      n++;
      if (a.busy || !a.post || (frame + n) % 4) continue;
      const t = clock + n * 1.7;
      const look = Math.sin(t * 0.31) * 0.6 * (Math.sin(t * 0.11) > 0.3 ? 1 : 0);
      if (a.rest === 'pace') {
        const s = (Math.sin(t * 0.18) + 1) / 2;
        show(a, still(at(a.post.x - 1.6 + 3.2 * s, a.post.y, a.post.z + 1.2 * s, a.post.h + (Math.cos(t * 0.18) > 0 ? 0 : Math.PI)), walk((t * 0.6) % 1)));
      } else show(a, still(a.post, a.rest === 'guard' ? guard((t * 0.05) % 1) : { head: look, nod: 0.05 * Math.sin(t * 0.7) }));
    }
    // Kavax's fox trots round him
    if (fox) {
      const kv = POSTS.kavax;
      if (kv) {
        const a = clock * 0.35;
        fox.at(kv.x + Math.cos(a) * 2.2, landAt(kv.x + Math.cos(a) * 2.2, kv.z + Math.sin(a) * 2.2), kv.z + Math.sin(a) * 2.2, a + Math.PI / 2);
        fox.trot((clock * 1.8) % 1);
      }
    }
    specks.end();
    cast?.commit();
  });

  if (import.meta.env.DEV) {
    const report = checkShow(defs, POSTS);
    console.info(`The Iron Rain: ${defs.length} stories: ${defs.map((d) => `${d.id} ${d.body} s`).join(', ')}.`);
    if (report.length) console.warn(`The Iron Rain: the show's check:\n  ${report.join('\n  ')}`);
    else console.info('The Iron Rain: the show\'s check: no figure stands in anything built or below the ground, none passes through another, and every flight clears what is under it.');
    (window as unknown as { rrShow: object }).rrShow = {
      play: (id: string) => { const d = defs.find((x) => x.id === id); if (d) start(d); return d ? d.name : 'no such story'; },
      running: () => running.map((r) => `${r.def.id} ${r.t.toFixed(1)}`),
      stories: () => defs.map((d) => d.id),
    };
  }
  return { fleet, rain, cast };
}

// ---------------------------------------------------------------------------
// The shuttles
// ---------------------------------------------------------------------------

/** Four shuttles on the pads, the Sovereign's and three decoys alike, as meshes the stories move. */
function buildShuttles(k: Build): Props['shuttles'] {
  const geo = shuttleGeometry() ?? new THREE.BoxGeometry(9, 2.6, 4).translate(0, 1.3, 0);
  const meshes: THREE.Mesh[] = [];
  const glows: THREE.Mesh[] = [];
  const glowGeo = new THREE.SphereGeometry(0.6, 8, 6);
  SHUTTLE_PADS.forEach((p) => {
    const mesh = new THREE.Mesh(geo, k.mat.city());
    mesh.position.set(p.x, F + 6, p.z);
    mesh.rotation.y = -p.heading;
    k.group.add(mesh);
    meshes.push(mesh);
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.set(-4.8, 1.2, 0);
    mesh.add(glow);
    glows.push(glow);
  });
  return {
    set(i, x, y, z, h, bank, shown, engines) {
      const m = meshes[i];
      if (!m) return;
      m.position.set(x, y, z);
      m.rotation.set(bank, -h, 0, 'YXZ');
      m.visible = shown;
      (glows[i].material as THREE.MeshBasicMaterial).opacity = engines;
      glows[i].scale.setScalar(0.6 + engines);
    },
  };
}

// ---------------------------------------------------------------------------
// The show's check
// ---------------------------------------------------------------------------

/**
 * Plays every story through offline, every tenth of a second, from the posts,
 * and says where a figure stands inside a lot or under the ground, where two
 * come nearer than their bodies allow, and where a flight passes lower than
 * 2 over what is built. Lots that figures stand on or in by design are left
 * out: the walls' walks, the pads, the terrace, the towers' roofs that are
 * stages.
 */
function checkShow(defs: StoryDef[], POSTS: Record<Id, Spot | null>): string[] {
  const faults: string[] = [];
  const onTop = new Set(['wall-n-w', 'wall-n-m', 'wall-n-e', 'wall-s-w', 'wall-s-e', 'grates', 'ragnar-gate', 'north-gate', 'pads', 'terrace', 'tower-6', 'tower-1', 'citadel-wall', 'field', 'podium', 'tryst', 'temptation', 'shield-park', 'camp']);
  const solids = LOTS.filter((l) => !l.part && !onTop.has(l.id));
  const inside = (s: State): string | null => {
    for (const l of solids) if (s.x > l.x0 + 0.2 && s.x < l.x1 - 0.2 && s.z > l.z0 + 0.2 && s.z < l.z1 - 0.2 && s.y < l.top - 0.3) return l.id;
    return null;
  };
  for (const def of defs) {
    if (def.sky) continue;
    const from = new Map<Id, Spot>();
    for (const id of def.cast) {
      const m = def.marks[id];
      const p = POSTS[id];
      from.set(id, !m || m === 'post' ? (p ?? at(0, F, 0, S)) : m);
    }
    const seen = new Set<string>();
    for (let tb = 0; tb <= def.body; tb += 0.1) {
      const states = new Map<Id, State>();
      def.play(tb, { put: (id, s) => states.set(id, s), from: (id) => from.get(id) ?? at(0, F, 0, S) });
      const shown = [...states.entries()].filter(([, s]) => s.shown);
      for (const [id, s] of shown) {
        const lot = inside(s);
        if (lot && !seen.has(`${id}-${lot}`)) { seen.add(`${id}-${lot}`); faults.push(`${def.id}: ${id} stands in ${lot} at ${tb.toFixed(1)} s (${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)})`); }
        if (s.boots > 0.5 && s.y < topAt(s.x, s.z) - 0.3 && !seen.has(`${id}-flight`)) { seen.add(`${id}-flight`); faults.push(`${def.id}: ${id} flies ${(topAt(s.x, s.z) - s.y).toFixed(1)} into what is built at ${tb.toFixed(1)} s (${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)})`); }
        const g = landAt(s.x, s.z);
        if (s.y < g - 0.6 && s.boots === 0 && !seen.has(`${id}-under`)) { seen.add(`${id}-under`); faults.push(`${def.id}: ${id} is ${(g - s.y).toFixed(1)} under the ground at ${tb.toFixed(1)} s`); }
      }
      for (let i = 0; i < shown.length; i++) {
        for (let j = i + 1; j < shown.length; j++) {
          const [a, sa] = shown[i], [b, sb] = shown[j];
          const d = Math.hypot(sa.x - sb.x, sa.z - sb.z), dy = Math.abs(sa.y - sb.y);
          // two figures held together on purpose: Sevro carrying Darrow, Fitchner carrying Darrow
          const held = (sa.boots > 0 || sb.boots > 0) && dy > 0.3 && dy < 1.4;
          if (d < 0.75 && dy < 2 && !held && !seen.has(`${a}-${b}`)) { seen.add(`${a}-${b}`); faults.push(`${def.id}: ${a} and ${b} come within ${d.toFixed(2)} at ${tb.toFixed(1)} s`); }
        }
      }
    }
  }
  return faults;
}
