// The Dragonpit on the Hill of Rhaenys, whole, as it stood in 129 AC: the
// tile's centrepiece and its tallest building.
//
// From the books (Fire & Blood, as the research note gives it): a vast
// vaulted building under a great dome on the crown of the Hill of Rhaenys,
// one of the largest in the city, begun by Maegor as a great stable of stone
// for dragons and finished by Jaehaerys in 55 AC. Benches round its sand held
// some 80,000. Its main gate is the bronze doors, of bronze with some iron,
// wide enough for thirty knights to ride through abreast. Forty vaults lie in
// a ring beneath the dome, each closed by thick iron doors on both sides, with
// long tunnels dug into the hill. The Dragonkeepers guard it, in black armour
// with helms crested with dragon scales.
//
// Here: a drum of forty bays, one for each vault beneath, of pale stone with
// buttresses, a blind arcade below and lit windows above; a great lead dome,
// ribbed, rising to a level crown where Balerion lies (`domeAt` in the plan); the bronze doors in a
// portal on the south, which Dreamfyre lies in; a stone terrace all round,
// with the forty vaults' iron doors in its walls and one standing open for a
// hero; the climb up the Street of the Sisters to the forecourt; braziers,
// banners and the Dragonkeepers. The books give no colours for its stone or
// its dome, nor which way the doors face: those are this tile's.

import { interior, type V3 } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { archway, lathe, tri } from '../../engine/parts';
import { gable } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BRONZE, BRONZE_DARK, DARK, STONE, banner, brazier, doorway, fire, keeper, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { HERO_SPOTS, KEEPERS, RHAENYS, lotOf, type Lot, type P2 } from './plan';
import { CLIMB, roadY } from './roads';

const R = RHAENYS, [CX, CZ] = R.c;
/** The drum's bays: one for each of the forty vaults beneath. */
const SIDES = 40, STEP = (Math.PI * 2) / SIDES;
const PIT = STONE.pit, SHADE = STONE.pitShade, RECESS = 0x857b6e, WINDOW = 0x2c2622;
const LEAD = 0x4d5157, RIB = 0x9c6c38, IRON = 0x7b8189, IRON_STRAP = 0x9aa0a8, SOFFIT = 0x7d7466;

/** The bearings the bronze doors' portal takes out of the drum: no bay is built there. */
const DOOR_SPAN = [(72 * Math.PI) / 180, (108 * Math.PI) / 180];
const inDoors = (a: number): boolean => {
  const m = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return m > DOOR_SPAN[0] - 1e-6 && m < DOOR_SPAN[1] + 1e-6;
};

/** A place round the drum, at a distance from its middle and a bearing (0 east, a quarter turn south). */
const at = (r: number, a: number, y: number): V3 => [CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r];

/** The hero's vault: an open door in the forecourt's south wall, east of the climb. */
const VAULT = (() => {
  const s = HERO_SPOTS.find((h) => h.id === 'vault')!;
  return { x: s.x, x0: s.x - 2.2, x1: s.x + 2.2, z0: R.forecourt.z1 - 3.5, z1: R.forecourt.z1, h: 3.8 };
})();

/** The gap the hero's vault leaves in the terrace's south wall, for land.ts to leave out. */
export const VAULT_GAP: [number, number] = [VAULT.x0, VAULT.x1];

// ---------------------------------------------------------------------------
// The drum
// ---------------------------------------------------------------------------

/** A flat arched shape standing on a wall that faces (nx, nz): a rectangle from y0 up to `spring`, and a half circle on it. */
function arched(b: Build['b'], x: number, z: number, nx: number, nz: number, w: number, y0: number, spring: number, color: number, lit = 0): void {
  const ax = -nz, az = nx, n: V3 = [nx, 0, nz], o = lit > 0 ? { win: interior(lit) } : {};
  const p = (s: number, y: number): V3 => [x + ax * s, y, z + az * s];
  b.quad(p(-w / 2, y0), p(w / 2, y0), p(w / 2, spring), p(-w / 2, spring), n, color, o);
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    tri(b, p(0, spring), p((Math.cos(a0) * w) / 2, spring + (Math.sin(a0) * w) / 2), p((Math.cos(a1) * w) / 2, spring + (Math.sin(a1) * w) / 2), n, color, o);
  }
}

/** A ring of facets round the drum, from y0 to y1 at radius r, leaving out the doors' span, with a top and a bottom where it stands proud. */
function ring(b: Build['b'], r: number, y0: number, y1: number, color: number, inner = 0): void {
  for (let i = 0; i < SIDES; i++) {
    const a0 = i * STEP, a1 = (i + 1) * STEP, mid = (i + 0.5) * STEP;
    if (inDoors(mid)) continue;
    b.quad(at(r, a0, y0), at(r, a1, y0), at(r, a1, y1), at(r, a0, y1), [Math.cos(mid), 0, Math.sin(mid)], color, { L: r * STEP });
    if (inner > 0) {
      // its top and its underside, from the face back to the wall behind it
      b.quad(at(inner, a0, y1), at(inner, a1, y1), at(r, a1, y1), at(r, a0, y1), [0, 1, 0], color);
      b.quad(at(r, a0, y0), at(r, a1, y0), at(inner, a1, y0), at(inner, a0, y0), [0, -1, 0], SHADE);
    }
  }
}

function drum(k: Build): void {
  const b = k.b, D = R.drum, base = R.y, WALL0 = base + 1.2, MID = 16, CORNICE = R.wall - 1.4;
  // the plinth it stands on, the wall, the string course between its two tiers, and the cornice under the dome
  ring(b, D + 0.7, base, WALL0, SHADE, D);
  ring(b, D, WALL0, CORNICE, PIT);
  ring(b, D + 0.45, MID - 0.3, MID + 0.3, SHADE, D);
  ring(b, D + 1.0, CORNICE, R.wall, SHADE, D);
  for (let i = 0; i < SIDES; i++) {
    const a = i * STEP, mid = (i + 0.5) * STEP;
    // a buttress between each two bays, from the plinth to the cornice; the portal stands where the doors' bays would be
    if (!inDoors(a)) {
      const [x, , z] = at(D + 0.42, a, 0);
      b.obox(x, (WALL0 + CORNICE) / 2, z, 0.44, (CORNICE - WALL0) / 2, 0.4, a, PIT, { top: SHADE });
    }
    if (inDoors(mid)) continue;
    // in each bay, a tall blind arch below and a window above, lit at night: the pit is lit inside
    const nx = Math.cos(mid), nz = Math.sin(mid), [x, , z] = at(D * Math.cos(STEP / 2) + 0.04, mid, 0);
    arched(b, x, z, nx, nz, 1.75, WALL0 + 0.8, MID - 2.4, RECESS);
    arched(b, x, z, nx, nz, 1.2, MID + 1.3, CORNICE - 1.9, WINDOW, 1.5);
  }
}

// ---------------------------------------------------------------------------
// The dome
// ---------------------------------------------------------------------------

function dome(k: Build): void {
  const b = k.b, D = R.drum;
  // the dome rises from inside the cornice to its level crown, which domeAt in the plan gives
  // in even steps of angle round its quarter of an ellipse, so that its steep foot is as smooth as its crown
  const profile = (th: number): [number, number] => [R.cap + (D - R.cap) * Math.cos(th), R.wall + (R.capY - R.wall) * Math.sin(th)];
  const rings: [number, number][] = [];
  for (let i = 0; i <= 10; i++) rings.push(profile((i / 10) * (Math.PI / 2)));
  lathe(b, CX, CZ, rings, SIDES, LEAD);
  // the crown: level, and a low rim round it, no higher than half a unit
  b.cyl(CX, CZ, R.capY - 0.25, R.capY, R.cap, R.cap, 20, LEAD, { cap: 0x59636d });
  b.cyl(CX, CZ, R.capY, R.capY + 0.45, R.cap + 0.35, R.cap + 0.35, 20, RIB, { cap: false });
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
    b.quad(at(R.cap, a0, R.capY + 0.45), at(R.cap, a1, R.capY + 0.45), at(R.cap + 0.35, a1, R.capY + 0.45), at(R.cap + 0.35, a0, R.capY + 0.45), [0, 1, 0], RIB);
    b.quad(at(R.cap, a1, R.capY + 0.02), at(R.cap, a0, R.capY + 0.02), at(R.cap, a0, R.capY + 0.45), at(R.cap, a1, R.capY + 0.45), [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)], RIB);
  }
  // twenty ribs of stone, from the cornice up to the crown
  for (let i = 0; i < 20; i++) {
    const a = (i + 0.5) * ((Math.PI * 2) / 20), pts: V3[] = [], radii: number[] = [];
    for (let j = 0; j <= 7; j++) {
      const [d, y] = profile((j / 7) * (Math.PI / 2) * 0.97);
      pts.push(at(d + 0.18 * Math.cos((j / 7) * (Math.PI / 2)), a, y + 0.18 * Math.sin((j / 7) * (Math.PI / 2))));
      radii.push(0.36 - 0.14 * (j / 7));
    }
    b.sweep(pts, radii, RIB);
  }
}

// ---------------------------------------------------------------------------
// The bronze doors
// ---------------------------------------------------------------------------

/** The portal on the drum's south side, its bronze doors standing open, and what stands before it. */
function doors(k: Build, l: Lot): void {
  const b = k.b, y = R.y, top = l.top, front = l.z1 + 0.4, back = l.z0;
  const pierW = 1.6, x0 = l.x0, x1 = l.x1, ox0 = x0 + pierW, ox1 = x1 - pierW, w = ox1 - ox0, spring = y + 8.5;
  // two great piers, and the arch between them, its soffit, and the walls over it to the portal's top
  b.box(x0, y, back, ox0, top, front, PIT, { top: SHADE, faces: 'NESWT' });
  b.box(ox1, y, back, x1, top, front, PIT, { top: SHADE, faces: 'NESWT' });
  archway(b, CX, back, front, w, spring, top, PIT, SOFFIT, 10);
  // the dark of the pit, beyond the doorway
  b.quad([ox0, y, back + 0.06], [ox1, y, back + 0.06], [ox1, spring + w / 2, back + 0.06], [ox0, spring + w / 2, back + 0.06], [0, 0, 1], DARK, { win: interior(0.5) });
  // a cornice over the portal, and a stepped crest
  b.box(x0 - 0.35, top, back, x1 + 0.35, top + 0.7, front + 0.35, SHADE, { faces: 'NESWTB' });
  b.box(CX - 3.2, top + 0.7, front - 1.2, CX + 3.2, top + 1.9, front, PIT, { top: SHADE });
  // the keystone: a dragon's head, its jaws open, looking down at whoever comes in
  const ky = spring + w / 2 + 0.2, kz = front + 0.25;
  b.box(CX - 0.9, ky - 0.4, front - 0.2, CX + 0.9, ky + 1.6, kz, SHADE);
  b.box(CX - 0.55, ky - 0.1, kz, CX + 0.55, ky + 0.75, kz + 1.3, BRONZE_DARK);
  b.box(CX - 0.45, ky - 0.55, kz + 0.1, CX + 0.45, ky - 0.15, kz + 1.1, BRONZE_DARK);
  for (const s of [-1, 1]) b.beam([CX + s * 0.35, ky + 0.7, kz + 0.2], [CX + s * 0.75, ky + 1.55, kz - 0.6], 0.14, 0.03, BRONZE);
  // the bronze doors, standing open inwards against the sides of the passage, banded with iron
  for (const s of [-1, 1]) {
    const x = s < 0 ? ox0 + 0.12 : ox1 - 0.12, len = Math.min(w / 2, front - back - 0.6), h = 8.6;
    b.box(x - 0.11, y, front - 0.3 - len, x + 0.11, y + h, front - 0.3, BRONZE, { faces: 'NESWT' });
    for (const v of [1.6, 4.3, 7.0]) b.box(x - 0.16, y + v, front - 0.3 - len + 0.1, x + 0.16, y + v + 0.28, front - 0.4, IRON_STRAP);
  }
  // a torch on each pier's face, and two braziers before the doors
  for (const x of [x0 + 0.8, x1 - 0.8]) {
    b.box(x - 0.12, y + 6.4, front, x + 0.12, y + 7.2, front + 0.35, 0x3a3532);
    fire(k, x, y + 7.6, front + 0.25, 0.28, 0);
  }
  for (const x of [x0 - 2.4, x1 + 2.4]) brazier(k, x, front + 1.4, y);
  k.lights.push({ x: CX, z: front + 4, r: 12, color: '#ffcf8a', k: 0.6 });
}

// ---------------------------------------------------------------------------
// The terrace: its vaults, its parapet, its climb
// ---------------------------------------------------------------------------

/**
 * An iron vault door in a terrace wall that faces (nx, nz), its foot on the
 * ground: an arched stone frame, the door in it, and two iron straps. An open
 * one stands back against the wall beside its doorway, and the dark inside
 * glows at night.
 */
function vaultDoor(k: Build, x: number, z: number, nx: number, nz: number, open = false): void {
  const b = k.b, ax = -nz, az = nx, y = 0;
  const p = (s: number, v: number, out: number): V3 => [x + ax * s + nx * out, y + v, z + az * s + nz * out];
  const n: V3 = [nx, 0, nz];
  arched(b, x + nx * 0.03, z + nz * 0.03, nx, nz, 3.0, y, y + 2.6, SHADE);
  if (open) {
    arched(b, x + nx * 0.06, z + nz * 0.06, nx, nz, 2.3, y, y + 2.55, DARK, 2.4);
    // the door swung back against the wall, beside its doorway
    b.quad(p(1.5, 0, 0.1), p(3.8, 0, 0.1), p(3.8, 3.2, 0.1), p(1.5, 3.2, 0.1), n, IRON);
    k.lights.push({ x: x + nx * 2, z: z + nz * 2, r: 5, color: '#ffb873', k: 0.5 });
    return;
  }
  arched(b, x + nx * 0.06, z + nz * 0.06, nx, nz, 2.3, y, y + 2.55, IRON);
  for (const v of [0.8, 2.0]) b.quad(p(-1.1, v, 0.09), p(1.1, v, 0.09), p(1.1, v + 0.22, 0.09), p(-1.1, v + 0.22, 0.09), n, IRON_STRAP);
}

/** The forty vaults' doors round the terrace, and the hero's open vault among them. */
function vaults(k: Build): void {
  const w = R.apronW, e = R.apronE, f = R.forecourt;
  const doors: [number, number, number, number, boolean?][] = [];
  // the south faces of the two aprons
  for (const x of [-96.5, -92, -87.5, -83, -78.5, -74.5]) doors.push([x, w.z1, 0, 1, x === -83]);
  for (const x of [-44.5, -40, -35.5, -31, -26.5, -22, -18]) doors.push([x, e.z1, 0, 1, x === -26.5]);
  // the forecourt's west and east faces, and its south face west of the climb
  for (const z of [-1.2, 3.4]) doors.push([f.x0, z, -1, 0], [f.x1, z, 1, 0]);
  doors.push([f.x0 + 3.6, f.z1, 0, 1]);
  // the north faces, behind the drum
  for (const x of [-96, -91, -86, -81.5]) doors.push([x, w.z0, 0, -1]);
  for (const x of [-39, -34, -29, -24, -19]) doors.push([x, e.z0, 0, -1]);
  // round the crown's north side
  for (let i = 0; i < 9; i++) {
    const a = (-130 + i * 10) * (Math.PI / 180), [x, , z] = at(R.crown, a, 0);
    doors.push([x + Math.cos(a) * 0.02, z + Math.sin(a) * 0.02, Math.cos(a), Math.sin(a)]);
  }
  for (const [x, z, nx, nz, open] of doors) vaultDoor(k, x, z, nx, nz, open);
  heroVault(k);
}

/** The open vault where a hero stands, half inside: its walls, its roof, the stone over its doorway, its door swung back, and a warm light. */
function heroVault(k: Build): void {
  const b = k.b, V = VAULT, h = V.h;
  b.quad([V.x0, 0, V.z0], [V.x1, 0, V.z0], [V.x1, h, V.z0], [V.x0, h, V.z0], [0, 0, 1], 0x3a2e26, { win: interior(1.4) });
  b.quad([V.x0, 0, V.z1], [V.x0, 0, V.z0], [V.x0, h, V.z0], [V.x0, h, V.z1], [1, 0, 0], RECESS);
  b.quad([V.x1, 0, V.z0], [V.x1, 0, V.z1], [V.x1, h, V.z1], [V.x1, h, V.z0], [-1, 0, 0], RECESS);
  b.quad([V.x0, h, V.z1], [V.x1, h, V.z1], [V.x1, h, V.z0], [V.x0, h, V.z0], [0, -1, 0], SOFFIT);
  // the wall over the doorway, up to the terrace's top, with an arch of voussoirs on it
  b.quad([V.x0, h, V.z1], [V.x1, h, V.z1], [V.x1, R.y, V.z1], [V.x0, R.y, V.z1], [0, 0, 1], 0xb9b0a0);
  arched(b, V.x, V.z1 + 0.04, 0, 1, 4.4, h - 0.6, h - 0.6, SHADE);
  area(k, rect(V.x0 + 0.05, V.z0 + 0.05, V.x1 - 0.05, V.z1 + 4), 0x9f968a, 0.036);
  // its iron door, swung back against the wall to the east of the doorway
  b.quad([V.x1 + 0.3, 0, V.z1 + 0.1], [V.x1 + 2.7, 0, V.z1 + 0.1], [V.x1 + 2.7, 3.4, V.z1 + 0.1], [V.x1 + 0.3, 3.4, V.z1 + 0.1], [0, 0, 1], IRON);
  fire(k, V.x1 + 0.5, 4.1, V.z1 + 0.25, 0.22, 0);
  k.lights.push({ x: V.x, z: V.z1, r: 7, color: '#ffc27f', k: 0.6 });
}

/** A low parapet along the terrace's edge between two corners, on the terrace's side of it. */
function parapet(k: Build, a: P2, c: P2, inward: [number, number]): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  const t = 0.5, mx = (a[0] + c[0]) / 2 + inward[0] * (t / 2), mz = (a[1] + c[1]) / 2 + inward[1] * (t / 2);
  k.b.obox(mx, R.y + 0.42, mz, len / 2, 0.42, t / 2, yaw, SHADE, { top: PIT });
}

function terrace(k: Build): void {
  const w = R.apronW, e = R.apronE, f = R.forecourt, gap = [CLIMB.top[0] - 4.6, CLIMB.top[0] + 4.6];
  // along every edge with a drop, but where the city's walls stand and where the climb comes up
  parapet(k, [w.x0, w.z1], [f.x0, w.z1], [0, -1]);
  parapet(k, [f.x1, e.z1], [e.x1, e.z1], [0, -1]);
  parapet(k, [f.x0, w.z1], [f.x0, f.z1], [1, 0]);
  parapet(k, [f.x1, e.z1], [f.x1, f.z1], [-1, 0]);
  parapet(k, [f.x0, f.z1], [gap[0], f.z1], [0, -1]);
  parapet(k, [gap[1], f.z1], [f.x1, f.z1], [0, -1]);
  parapet(k, [w.x0, w.z0], [w.x1, w.z0], [0, 1]);
  parapet(k, [e.x0, e.z0], [e.x1, e.z0], [0, 1]);
  const t = R.terrace, i0 = t.findIndex((p) => p[0] === w.x1 && p[1] !== w.z0), i1 = t.findIndex((p) => p[0] === e.x0 && p[1] !== e.z0);
  for (let i = i0; i < i1; i++) {
    const m: P2 = [(t[i][0] + t[i + 1][0]) / 2, (t[i][1] + t[i + 1][1]) / 2], l = Math.hypot(m[0] - CX, m[1] - CZ);
    parapet(k, t[i], t[i + 1], [(CX - m[0]) / l, (CZ - m[1]) / l]);
  }
  // torches on posts along the aprons and before the doors, and the terrace's own lights
  for (const [x, z] of [[-94, -8], [-82, -8], [-70, -19], [-50, -19], [-38, -8], [-20, -8], [-94, -58], [-20, -58]] as P2[]) {
    k.b.box(x - 0.14, R.y, z - 0.14, x + 0.14, R.y + 2.6, z + 0.14, 0x3a3532);
    fire(k, x, R.y + 2.95, z, 0.24, 0);
  }
  for (const [x, z] of [[-89, -30], [-29, -30], [-89, -10], [-29, -10]] as P2[]) k.lights.push({ x, z, r: 13, color: '#ffcf8a', k: 0.45 });
  // great iron rings set in the aprons' paving, where dragons were chained
  for (const [x, z] of [[-92, -24], [-86, -40], [-36, -22], [-24, -40]] as P2[]) {
    k.b.cyl(x, z, R.y, R.y + 0.12, 0.9, 0.9, 10, 0x55585e, { cap: false });
    k.b.cyl(x, z, R.y, R.y + 0.12, 0.65, 0.65, 10, 0x55585e, { cap: 0x6a6d72 });
  }
}

/**
 * The climb: the Street of the Sisters' last stretch up to the forecourt, on
 * a stone ramp between walls, with a low parapet each side. The road's own
 * surface is laid by roads.ts at the heights `roadY` gives.
 */
function climb(k: Build): void {
  const b = k.b, [cx, z0] = CLIMB.foot, z1 = CLIMB.top[1], half = 4.4, t = 0.45, steps = 12;
  for (const s of [-1, 1]) {
    const x = cx + s * half, n: V3 = [s, 0, 0];
    for (let i = 0; i < steps; i++) {
      const za = z0 + ((z1 - z0) * i) / steps, zb = z0 + ((z1 - z0) * (i + 1)) / steps;
      const ya = roadY(cx, za) + 0.03, yb = roadY(cx, zb) + 0.03, pa = ya + 0.8, pb = yb + 0.8;
      // the wall's outer face down to the street, the parapet's inner face over the road, and its top
      b.quad([x + s * t, 0, za], [x + s * t, 0, zb], [x + s * t, pb, zb], [x + s * t, pa, za], n, PIT, { L: Math.abs(zb - za) });
      b.quad([x, ya, za], [x, pa, za], [x, pb, zb], [x, yb, zb], [-s, 0, 0], PIT);
      b.quad([x, pa, za], [x + s * t, pa, za], [x + s * t, pb, zb], [x, pb, zb], [0, 1, 0], SHADE);
    }
  }
  k.lights.push({ x: cx, z: (z0 + z1) / 2, r: 11, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// On the aprons: the Dragonkeepers' hall, and the dragons' larder
// ---------------------------------------------------------------------------

/** Small windows in two rows of 3 above the terrace, lit at night. */
const KEEP_WIN = { cell: 1.9, storey: 3, lit: 0.45, kind: 4 };

/**
 * A long building on the terrace: stone walls from the terrace up to `eaves`,
 * windows in them, and a slate roof along its length with its gable ends,
 * the undersides of its eaves, and a door at its south end.
 */
function longHouse(k: Build, x0: number, z0: number, x1: number, z1: number, eaves: number, ridge: number, color: number): void {
  const b = k.b, over = 0.45, xc = (x0 + x1) / 2;
  b.box(x0, R.y, z0, x1, eaves, z1, color, { top: SHADE, win: KEEP_WIN, seed: x0 * 0.3, faces: 'NESW' });
  gable(b, x0, z0, x1, z1, eaves, ridge - eaves, 0x4c5661, color, 'z', over);
  // the eaves seen from below
  for (const [a, c] of [[x0 - over, x0], [x1, x1 + over]]) b.quad([a, eaves - 0.02, z0 - over], [c, eaves - 0.02, z0 - over], [c, eaves - 0.02, z1 + over], [a, eaves - 0.02, z1 + over], [0, -1, 0], TIMBER_SOFFIT);
  doorway(b, xc, R.y, z1, 0, 1, 2.2, 3.1, 1.8);
}
const TIMBER_SOFFIT = 0x4a3a2c;

/** The Dragonkeepers' hall, on the east apron against the city's wall: where the order of seventy-seven keeps its watch. */
function hall(k: Build): void {
  const l = lotOf('dp-hall'), x0 = l.x0 + 3, x1 = l.x0 + 13, z0 = l.z0 + 1, z1 = l.z1 - 1;
  longHouse(k, x0, z0, x1, z1, R.y + 6, l.top, STONE.shore);
  // a bell under a little roof at its south end, and a rack of spears by its door
  const bx = (x0 + x1) / 2;
  k.b.beam([bx - 1.4, R.y, z1 + 1.6], [bx - 1.4, R.y + 3.6, z1 + 1.6], 0.12, 0.12, 0x5b4634);
  k.b.beam([bx + 1.4, R.y, z1 + 1.6], [bx + 1.4, R.y + 3.6, z1 + 1.6], 0.12, 0.12, 0x5b4634);
  k.b.box(bx - 1.7, R.y + 3.6, z1 + 1.2, bx + 1.7, R.y + 3.85, z1 + 2.0, 0x4c5661);
  k.b.cyl(bx, z1 + 1.6, R.y + 2.5, R.y + 3.5, 0.35, 0.55, 8, BRONZE, { cap: BRONZE_DARK });
  for (let i = 0; i < 5; i++) k.b.beam([x1 + 0.8, R.y, z1 - 3 + i * 0.5], [x1 + 0.8, R.y + 3.1, z1 - 3 + i * 0.5], 0.05, 0.03, 0x9a8a72);
  // keepers at drill before it, in a row, and one at its door
  for (let i = 0; i < 5; i++) keeper(k.b, x0 + 1.2 + i * 1.9, z1 + 5, R.y, 90);
  keeper(k.b, bx + 2.4, z1 + 0.9, R.y, 90);
  fire(k, bx - 1.6, R.y + 3.3, z1 + 0.25, 0.22, 0);
  k.lights.push({ x: bx, z: z1 + 3, r: 9, color: '#ffcf8a', k: 0.5 });
}

/**
 * The dragons' larder, on the west apron: a long storehouse of fish in barrels
 * and of salt, carts at its door, and a fold of sheep beside it. How the
 * Dragonpit's dragons were fed is not in the books; dragons ate meat and
 * fish, and took food from their keepers.
 */
function larder(k: Build): void {
  const l = lotOf('dp-larder'), b = k.b, x0 = l.x0 + 2, x1 = l.x0 + 11, z0 = l.z0 + 1, z1 = l.z1 - 3;
  longHouse(k, x0, z0, x1, z1, R.y + 4.5, l.top, STONE.city);
  // barrels stacked at its door, and two carts
  for (let i = 0; i < 6; i++) b.cyl(x1 + 1 + (i % 3) * 0.9, z1 - 1 - Math.floor(i / 3) * 0.9, R.y, R.y + 1.1, 0.4, 0.4, 7, 0x7a5a3a, { cap: 0x5a4028 });
  for (const [x, z] of [[x0 + 2, z1 + 3.2], [x0 + 6.5, z1 + 3.6]] as P2[]) {
    b.box(x - 1.3, R.y + 0.6, z - 0.8, x + 1.3, R.y + 1.4, z + 0.8, 0x6e5238);
    for (const s of [-1, 1]) b.cyl(x, z + s * 0.9, R.y, R.y + 1.1, 0.55, 0.55, 8, 0x4a3826, { cap: 0x3a2c1e });
  }
  // a fold of hurdles beside it, with sheep in it
  const fx0 = l.x0 + 0.5, fx1 = l.x0 + 9, fz0 = l.z1 + 3, fz1 = l.z1 + 11;
  for (const [a, c] of [[[fx0, fz0], [fx1, fz0]], [[fx1, fz0], [fx1, fz1]], [[fx1, fz1], [fx0, fz1]], [[fx0, fz1], [fx0, fz0]]] as [P2, P2][]) {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    b.obox((a[0] + c[0]) / 2, R.y + 0.5, (a[1] + c[1]) / 2, len / 2, 0.5, 0.06, Math.atan2(c[1] - a[1], c[0] - a[0]), 0x8a6f4c);
  }
  for (let i = 0; i < 9; i++) {
    const x = fx0 + 1.2 + (i % 3) * 2.6 + (i % 2) * 0.4, z = fz0 + 1.3 + Math.floor(i / 3) * 2.3;
    b.box(x - 0.55, R.y + 0.35, z - 0.35, x + 0.55, R.y + 1.0, z + 0.35, 0xe8e2d2);
    b.box(x + 0.5, R.y + 0.65, z - 0.2, x + 0.85, R.y + 1.05, z + 0.2, 0x2e2a26);
  }
  keeper(b, x1 + 2.6, z1 + 1.2, R.y, 135);
  k.person(fx1 + 1.2, fz0 + 2, R.y);
  k.lights.push({ x: (x0 + x1) / 2, z: z1 + 3, r: 9, color: '#ffcf8a', k: 0.45 });
}

// ---------------------------------------------------------------------------
// The board for the music, banners, and the Dragonkeepers
// ---------------------------------------------------------------------------

/**
 * The board for the music, at the top of the climb on the forecourt's south
 * edge, west of where the road comes up: two timber posts, and the screen on
 * a dark backing between them, facing the view the tile opens with.
 */
function giveWayBoard(k: Build): void {
  const x = -68.5, z = -0.5, y = R.y, f = [0.669, 0.743], h = 4.4;
  const w = k.sign('give-way', x, y + 2.6 + h / 2, z, f[0], f[1], h, 9);
  const ax = -f[1], az = f[0];
  for (const s of [-1, 1]) k.b.beam([x + ax * s * (w / 2 + 0.25) - f[0] * 0.15, y, z + az * s * (w / 2 + 0.25) - f[1] * 0.15], [x + ax * s * (w / 2 + 0.25) - f[0] * 0.15, y + 3.0 + h, z + az * s * (w / 2 + 0.25) - f[1] * 0.15], 0.22, 0.2, 0x5a3b22);
  k.b.obox(x - f[0] * 0.1, y + 2.6 + h / 2, z - f[1] * 0.1, w / 2 + 0.2, h / 2 + 0.2, 0.06, Math.atan2(az, ax), 0x2b1d12, { faces: 'B' });
}

function life(k: Build): void {
  // the Targaryens' red dragon on black, round the drum's cornice and at the forecourt's corners
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    if (inDoors(a)) continue;
    const [x, , z] = at(R.drum + 0.6, a, 0);
    banner(k.b, x, z, R.wall, 'targaryen', 3.6, 0.9);
  }
  for (const [x, z] of [[-71.2, 5.2], [-48.8, 5.2]] as P2[]) banner(k.b, x, z, R.y, 'targaryen', 5.5, 1.1);
  // the Dragonkeepers at their posts: the doors, the open vault, the terrace's edge
  for (const s of KEEPERS.slice(0, 7)) keeper(k.b, s.x, s.z, s.y, s.facing);
  // folk on the forecourt come to see the dragons, kept well back from the doors
  for (const [x, z] of [[-70.5, -6.5], [-69.6, -8.2], [-50.4, -4.3], [-49.5, -5.7], [-75.5, -12], [-45, -15.5]] as P2[]) k.person(x, z, R.y);
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  dragonpit: (k) => {
    drum(k);
    dome(k);
  },
  'dp-doors': doors,
};

export const COVERS: string[] = ['dp-crown', 'dp-apron-w', 'dp-apron-e', 'dp-front', 'dp-forecourt', 'dp-hall', 'dp-larder'];
export const SIGNS: SignDef[] = [nameSign('dragonpit-name', 'The Dragonpit')];

export function extras(k: Build): void {
  vaults(k);
  terrace(k);
  climb(k);
  giveWayBoard(k);
  hall(k);
  larder(k);
  life(k);
  // its name, on the east apron's edge, where the opening view reads it
  nameBoard(k, 'dragonpit-name', -29, -6.2, R.y);
}

export function heightAt(_x: number, _z: number): number {
  return 0;
}
