// The docks: Ace Chemicals, the cold store, the Monarch Playing Card Company, the cranes, the freighter and the dock cut.
//
// The east bank's front, at y 0, between Harbour Road and the harbour, low on
// purpose so that the East End's fronts are seen over it: its height comes
// from thin things, Ace Chemicals' stack with its ring of red lamps, two dock
// cranes on the west yard's quay, and the giant playing card on the Monarch
// company's roof. Its density comes from what crowds the ground and the levels
// over it: Ace's tanks, pipe racks and open green vats under a catwalk at 8, a
// pipe bridge over Kane Street's viaduct, the yard under the railway's station
// with its boxcars, lorries and a dockers' coffee hatch, the old dock tunnel's
// mouth beside the cold store, the dock cut with its bascule leaf and its
// tender's cabin, barges at the quay and a freighter at anchor.
//
// Kept clear: the apron along the quay's edge (the show's lane), the strip
// under the viaduct's deck, everything within 2.4 of the railway's line, and
// under the station's platform nothing is taller than 9.5.
//
// From the comics (the research notes): Ace stands next door to the Monarch
// Playing Card Company (Detective Comics #168); a catwalk over a vat; tanks,
// pipes and a stack [mem]; Freeze's haunt as a frosted cold store [tile]; ice
// lorries lettered ICE, Ace's white tankers with green bands [tile]. Everything
// else here is this tile's own drawing.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { GeoBuilder, interior, rng, type V3 } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { drum, face3, prism, slab, type XZ } from '../../engine/shapes';
import { EN, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { AMBER, BRICK, BRICK_DARK, BRICK_RED, DARK, GLASS, GREEN, ICE, IRON, IRON_DARK, LEAD, RUST, SLATE, SMALL_WIN, SODIUM, STEEL, STONE, STONE_DARK, STONE_LIGHT, STONE_TRIM, TIMBER, TIMBER_DARK, TO_VIEW, fireEscape, gargoyle, gasLamp, waterTank } from './look';
import type { Model, Place } from './models';
import { EL, KANE_ST, LANDS, LANE, SHOW_LANES, STAGES, lotOf, type Lot } from './plan';
import { open } from './space';

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Where things are, from the plan
// ---------------------------------------------------------------------------

/** The quay's edge along the harbour. */
const QUAY = KANE_ST.quay;
/** The apron: the show's lane along the quay's edge, and its stage. */
const APRON = SHOW_LANES.apron, APRON_STAGE = STAGES.apron;
/** The dock cut: the notch in the quay, from the plan's outline of the east bank. */
const CUT = (() => {
  const pts = LANDS.east.filter((p) => p[0] > KANE_ST.x && p[1] > KANE_ST.viaduct && p[1] < QUAY);
  const xs = pts.map((p) => p[0]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: pts[0][1], z1: QUAY };
})();
/**
 * The drawbridge over the cut. The quay stands out over the cut's west abutment
 * in a lip as wide as the leaf, and the leaf is hinged at the lip's edge: so a
 * car stopped before the standing leaf has its front out from under Kane
 * Street's viaduct, whose parapet reaches to x 85.96 over the apron, 3.26 over
 * it, and whoever stands up in that car has his head clear of it. (Hinged at
 * the cut's own side, Batman's cowl stood in the parapet.)
 */
const LEAF_LIP = 0.6, LEAF_W = 5.2;
export const DRAWBRIDGE = { hinge: CUT.x0 + LEAF_LIP, length: CUT.x1 - CUT.x0 - LEAF_LIP };
/** The west yard's quay, where the bank steps back north of the docks' quay: its edge, and its two ends. */
const YARD_QUAY = (() => {
  const pts = LANDS.east.filter((p) => p[0] < KANE_ST.x && p[0] > 40 && p[1] > KANE_ST.viaduct && p[1] < QUAY);
  const xs = pts.map((p) => p[0]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z: pts[0][1] };
})();
/** Kane Street's viaduct over the docks: roads.ts lays its deck this far to either side of the street's middle. */
const DECK_HALF = LANE + 0.6;
const VIADUCT = { x0: KANE_ST.x - DECK_HALF, x1: KANE_ST.x + DECK_HALF, z0: KANE_ST.viaduct, z1: QUAY };
/** How high the viaduct's road is at a place this far south. */
const deckY = (z: number): number => 5.3 * Math.min(1, Math.max(0, (z - VIADUCT.z0) / (VIADUCT.z1 - VIADUCT.z0)));
/** The west yard, under the railway's station: from 2.45 south of the railway's line to the cranes' rails. */
const YARD = { x0: 43.8, x1: 61.9, z0: EL.harbour + 2.45, z1: YARD_QUAY.z - 3.8 };
/**
 * The station's stairs: roads.ts stands the station 17 long about x 56, and the engine's `station` brings its stairs
 * down from the platform's west end, onwards along the line, under its outer edge.
 */
const EL_STAIRS = { x: 56 - 17 / 2, z0: EL.harbour + 4.9, z1: EL.harbour + 6.3 };

const COLD = lotOf('cold-store'), CARD = lotOf('card-company'), ACE = lotOf('ace'), STACK = lotOf('ace-stack');

/** The old tunnel's mouth: its face looks east at the apron's west end, its lane on the apron's middle. */
const TUNNEL = { x: APRON_STAGE.x0 + 1, z: APRON.z, half: 2.2, spring: 2.6, top: 6, deep: 2.6, back: COLD.x0 + 1.6, north: COLD.z1 + 0.4, south: QUAY - 0.05 };
/** The cold store's door: in its south side, east of the tunnel's mouth. */
const FREEZE_DOOR = { x0: TUNNEL.x + 0.4, x1: COLD.x1 - 0.3, h: 3 };
/** The card company's roller door. */
const ROLLER = { x: (CARD.x0 + CARD.x1) / 2, half: 2.1, h: 3.6 };
const ROLLER_NAME = 'docks-roller-door';
/** Ace's vats along its south front, and the catwalk over them at the stage's height. */
const CAT = STAGES.catwalk;
const VATS = { z: 37.8, r: 1.55, h: 2.4, liquid: 2.0, xs: [0, 1, 2, 3].map((i) => ACE.x0 + 2.6 + i * 3.6) };
const WALK = { x0: CAT.x0, x1: CAT.x1, z0: CAT.z1 - 2.1, z1: CAT.z1 - 0.3, y: CAT.y };
/** Ace's process house, its gate on the west side towards Kane Street, and its tanks. */
const HOUSE = { x0: ACE.x0 + 0.6, x1: ACE.x0 + 9.2, z0: ACE.z0 + 8.4, z1: ACE.z1 - 4.8, top: 8 };
const GATE = { z0: ACE.z0 + 1.6, z1: ACE.z0 + 6.8 };
/** The two cranes on the yard's quay: on rails along it, their jibs out over the water. */
const CRANE_Z = YARD_QUAY.z - 2, CRANES = [
  { x: COLD.x0 - 5.6, yaw: 2.2, jib: 20, luff: (60 * PI) / 180 },
  { x: COLD.x0 - 1.9, yaw: PI / 2, jib: 19, luff: (47 * PI) / 180 },
];
/** The crane's parts that the show needs: the portal's height, the cab's place on the turntable and its roof. */
const CRANE = { hx: 1.3, hz: 1.55, legs: 5.6, cab: { x0: 0.35, x1: 1.75, z0: -1.55, z1: -0.7, h: 2.3 } };
/** The pile of crates on the corner east of the cut. */
const CRATES = { x0: CUT.x1 + 1.5, x1: CUT.x1 + 5.5, z0: CUT.z0 + 0.5, z1: APRON_STAGE.z0 - 0.4, layer: 1.22 };
/** The pipe bridge over the viaduct: its line, and the height of its pipes. */
const PIPES = { z: 33.35, x0: CARD.x1 + 0.45, x1: ACE.x0, y: 7.25 };
/** The freighter at anchor: bow west, her bridge and funnel aft. */
const SHIP = { x0: 84.4, x1: 102.8, z0: 60.4, z1: 65.6, deck: 3 };

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const CONCRETE = 0x5d6066, CONCRETE_PALE = 0x7c7f84;
/** Frost on the cold store: pale blue-white. */
const FROST = 0xd8e8ef, FROST_DARK = 0xb5cad6;
/** Ace's green: the liquid in the vats, bright by day. */
const VAT_GREEN = 0x6ee23e;
/** The cranes' paint: a rusted ochre, lighter than it should look, since thin bars come out dark. */
const CRANE_PAINT = 0xa3683d, CRANE_HOUSE = 0x8b5a3a, CAB = 0x6a7078;
const CARD_WHITE = 0xf2eee2;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const board = (id: string, lines: string[], color: string, ink: string, px: number, h = 52): SignDef => ({ id, lines, color, ink, aspect: px / h, kind: 'board', size: [px, h] });

/** The king on the Monarch company's giant card: a plain K under a crown, with a K in two corners. */
function paintKing(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const red = '#b3202a', gold = '#d6a83c';
  ctx.fillStyle = '#f4efe2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = red;
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.strokeRect(w * 0.08, h * 0.06, w * 0.84, h * 0.88);
  ctx.fillStyle = red;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // the corners
  ctx.font = `900 ${Math.round(h * 0.13)}px ${EN}`;
  ctx.fillText('K', w * 0.2, h * 0.14);
  ctx.save();
  ctx.translate(w * 0.8, h * 0.86);
  ctx.rotate(PI);
  ctx.fillText('K', 0, 0);
  ctx.restore();
  // the crown: a band and three points, each with a ball on it
  const cx = w / 2, by = h * 0.44, cw = w * 0.5, ch = h * 0.16;
  ctx.fillStyle = gold;
  ctx.strokeStyle = '#5a3a12';
  ctx.lineWidth = Math.max(1.5, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, by);
  ctx.lineTo(cx - cw / 2, by - ch);
  ctx.lineTo(cx - cw / 4, by - ch * 0.45);
  ctx.lineTo(cx, by - ch * 1.15);
  ctx.lineTo(cx + cw / 4, by - ch * 0.45);
  ctx.lineTo(cx + cw / 2, by - ch);
  ctx.lineTo(cx + cw / 2, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(cx - cw / 2, by, cw, h * 0.04);
  ctx.strokeRect(cx - cw / 2, by, cw, h * 0.04);
  for (const [dx, dy] of [[-cw / 2, -ch], [0, -ch * 1.15], [cw / 2, -ch]]) {
    ctx.beginPath();
    ctx.arc(cx + dx, by + dy, w * 0.035, 0, PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // the K
  ctx.fillStyle = red;
  ctx.font = `900 ${Math.round(h * 0.34)}px ${EN}`;
  ctx.fillText('K', cx, h * 0.68);
}

/** The card's back: deep red with a white border and a lattice. */
function paintBack(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#f4efe2';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8a1f28';
  const m = w * 0.08;
  ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
  ctx.strokeStyle = '#e6c9c0';
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.save();
  ctx.beginPath();
  ctx.rect(m, m, w - 2 * m, h - 2 * m);
  ctx.clip();
  for (let i = -h; i < w + h; i += w * 0.12) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Every sign this file hangs. Each id begins with `docks-`. */
export const SIGNS: SignDef[] = [
  { id: 'docks-ace', lines: ['ACE CHEMICALS'], color: '#e9f0dc', ink: '#1d4f22', aspect: 344 / 52, kind: 'box', size: [344, 52] },
  board('docks-ace-gate', ['DELIVERIES'], '#2a2c30', '#e4dccb', 220),
  board('docks-cold-store', ['COLD STORE'], '#1f2329', '#dfe9ee', 240),
  { id: 'docks-ice', lines: ['ICE'], color: '#9fe8ff', aspect: 2.2, size: [114, 52] },
  board('docks-monarch', ['MONARCH', 'PLAYING CARD CO.'], '#2b2326', '#ead9b8', 230, 72),
  { id: 'docks-card-king', lines: [''], color: '#f4efe2', aspect: 100 / 140, size: [100, 140], paint: paintKing },
  { id: 'docks-card-back', lines: [''], color: '#8a1f28', aspect: 100 / 140, size: [100, 140], paint: paintBack },
  board('docks-coffee', ['HOT COFFEE'], '#3b2a20', '#f1dfb8', 210),
  board('docks-tunnel', ['DOCK TUNNEL'], '#2a2a2e', '#d9d2c2', 220),
  board('docks-ice-lorry', ['ICE'], '#a9cfe0', '#1d3a52', 104),
];

/** A sign on a wall whose face is at (x, z) and looks the way (nx, nz) points: a dark board 0.1 proud, the lettering 0.03 in front of it. */
function wallSign(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW: number, back = DARK): number {
  const w = k.sign(id, x + nx * 0.13, y, z + nz * 0.13, nx, nz, h, maxW);
  k.b.obox(x + nx * 0.05, y, z + nz * 0.05, w / 2 + 0.12, h / 2 + 0.1, 0.05, Math.atan2(nx, -nz), back, { faces: 'B' });
  return w;
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

type B = GeoBuilder;

/** A band of pale stone round a box, proud of it, whose top is the roof: a cornice. */
function cornice(b: B, x0: number, z0: number, x1: number, z1: number, y: number, h: number, out: number, color: number, top: number): void {
  b.box(x0 - out, y, z0 - out, x1 + out, y + h, z1 + out, color, { faces: 'NESWTB', top });
}

/** An open vat: a round wall with its rim, the inside of the wall, and the green liquid in it that glows. */
function vat(k: Build, x: number, z: number, r: number, h: number, liquid: number, sides = 10): void {
  const b = k.b, ri = r - 0.16;
  b.cyl(x, z, 0, h, r, r, sides, 0x56605a, { cap: false });
  const at = (i: number, rr: number, y: number): V3 => {
    const a = (i / sides) * PI * 2 + PI / sides;
    return [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr];
  };
  for (let i = 0; i < sides; i++) {
    const am = ((i + 0.5) / sides) * PI * 2 + PI / sides;
    // the wall's inside, from the liquid up to the rim, facing in
    b.quad(at(i, ri, liquid), at(i + 1, ri, liquid), at(i + 1, ri, h), at(i, ri, h), [-Math.cos(am), 0, -Math.sin(am)], 0x3c4a3e);
    // the rim
    b.quad(at(i, r, h), at(i + 1, r, h), at(i + 1, ri, h), at(i, ri, h), [0, 1, 0], STONE_TRIM);
    // the liquid
    b.up([x, liquid, z], at(i, ri, liquid), at(i + 1, ri, liquid), VAT_GREEN, { win: interior(2.6) });
  }
  k.glows.push({ x, y: liquid + 0.06, z, sx: ri * 1.25, sy: 0.06, sz: ri * 1.25, color: GREEN });
}

/** A tall tank on a plinth: a drum with a pale band round its middle and a shallow cone for a lid. */
function tank(b: B, x: number, z: number, r: number, h: number, color: number): void {
  b.cyl(x, z, 0, 0.5, r + 0.3, r + 0.3, 8, CONCRETE_PALE, { cap: CONCRETE });
  b.cyl(x, z, 0.5, h, r, r, 10, color, { cap: false });
  b.cyl(x, z, h * 0.55, h * 0.55 + 0.3, r + 0.05, r + 0.05, 10, STONE_TRIM, { cap: false });
  b.cyl(x, z, h, h + Math.min(0.9, r * 0.5), r + 0.06, 0.15, 10, color);
  // a ladder up its east side
  b.beam([x + r + 0.15, 0.5, z], [x + r + 0.15, h, z], 0.07, 0.07, STEEL);
}

/** A steel drum standing on its end. */
const barrel = (b: B, x: number, z: number, y: number, color: number): void => b.cyl(x, z, y, y + 0.88, 0.36, 0.36, 6, color, { cap: IRON_DARK });

/** A wheel, as a dark block on the ground. */
const wheelBlock = (b: B, x: number, z: number, r = 0.42, half = 0.16): void => b.box(x - r, 0.02, z - half, x + r, 2 * r, z + half, 0x18191c, { faces: 'NESWT' });

/**
 * A lorry parked along x, its cab at the west end: a cab, a chassis, and a box
 * body or a flatbed with crates on it.
 */
function lorry(b: B, x0: number, z: number, len: number, cab: number, body: number, kind: 'box' | 'flat' | 'tank'): void {
  const w = 1.15, x1 = x0 + len;
  b.box(x0 + 0.2, 0.55, z - w + 0.1, x1, 0.85, z + w - 0.1, 0x1e1f23, { faces: 'NESWT' });
  // the cab, with its windscreen
  b.box(x0, 0.85, z - w, x0 + 1.7, 2.55, z + w, cab, { faces: 'NESWT' });
  b.quad([x0 - 0.02, 1.75, z + w - 0.15], [x0 - 0.02, 1.75, z - w + 0.15], [x0 - 0.02, 2.4, z - w + 0.15], [x0 - 0.02, 2.4, z + w - 0.15], [-1, 0, 0], GLASS);
  for (const s of [-1, 1]) b.quad([x0 + 0.25, 1.75, z + s * (w + 0.02)], [x0 + 1.25, 1.75, z + s * (w + 0.02)], [x0 + 1.25, 2.35, z + s * (w + 0.02)], [x0 + 0.25, 2.35, z + s * (w + 0.02)], [0, 0, s], GLASS);
  if (kind === 'box') b.box(x0 + 1.85, 0.85, z - w - 0.05, x1, 3.2, z + w + 0.05, body, { faces: 'NESWT' });
  else if (kind === 'tank') drum(b, [(x0 + 1.85 + x1) / 2, 1.85, z], 1.0, (x1 - x0 - 1.85) / 2, body, { cap: 0xd9dcd8 });
  else {
    b.box(x0 + 1.85, 0.85, z - w, x1, 1.05, z + w, TIMBER_DARK, { faces: 'NESWT' });
    b.box(x0 + 2.1, 1.05, z - 0.95, x0 + 3.5, 2.2, z + 0.95, TIMBER, { faces: 'NESWT' });
    b.box(x0 + 3.6, 1.05, z - 0.95, x1 - 0.2, 1.9, z + 0.95, TIMBER_PALE_CRATE, { faces: 'NESWT' });
  }
  for (const wx of [x0 + 1.05, x1 - 1.0]) for (const s of [-1, 1]) wheelBlock(b, wx, z + s * (w - 0.05));
}
const TIMBER_PALE_CRATE = 0x8f7454;

/** A boxcar on the yard's track: frame, body, roof and doors, on two bogies. */
function boxcar(b: B, x0: number, x1: number, z: number, color: number, kind: 'box' | 'tank' | 'flat'): void {
  const w = 1.2;
  b.box(x0, 0.55, z - w + 0.1, x1, 0.85, z + w - 0.1, 0x222326, { faces: 'NESWTB' });
  for (const bx of [x0 + 1.1, x1 - 1.1]) b.box(bx - 0.8, 0.05, z - 0.85, bx + 0.8, 0.6, z + 0.85, 0x18191c, { faces: 'NESWT' });
  if (kind === 'box') {
    b.box(x0 + 0.05, 0.85, z - w, x1 - 0.05, 3.2, z + w, color, { faces: 'NESW' });
    b.box(x0 - 0.05, 3.2, z - w - 0.1, x1 + 0.05, 3.42, z + w + 0.1, LEAD, { faces: 'NESWTB' });
    const mx = (x0 + x1) / 2;
    for (const s of [-1, 1]) b.box(mx - 1.0, 1.0, s < 0 ? z - w - 0.06 : z + w, mx + 1.0, 3.0, s < 0 ? z - w : z + w + 0.06, 0x3a2a24, { faces: s < 0 ? 'NEW' : 'SEW' });
  } else if (kind === 'tank') {
    drum(b, [(x0 + x1) / 2, 1.95, z], 1.05, (x1 - x0) / 2 - 0.2, color, { cap: color });
    b.box((x0 + x1) / 2 - 0.4, 2.9, z - 0.4, (x0 + x1) / 2 + 0.4, 3.25, z + 0.4, IRON_DARK, { faces: 'NESWT' });
  } else {
    // a flat wagon with one container on it
    b.box(x0 + 0.3, 0.85, z - 1.1, x1 - 0.3, 3.15, z + 1.1, color, { faces: 'NESWT' });
  }
}

// ---------------------------------------------------------------------------
// Ace Chemicals
// ---------------------------------------------------------------------------

const ace: Model = (k, l) => {
  const b = k.b, r = rng(8812);
  const x1 = Math.min(l.x1, 103.8);
  // the works' yard: concrete in a grid of slabs
  area(k, rect(l.x0 + 0.05, l.z0 + 0.05, x1, l.z1 - 0.05), CONCRETE, 0.035, { size: 2, bond: 0 });

  // --- the process house: two storeys of brick, a glazed monitor along its roof, and the name on a frame over its south edge
  const H = HOUSE;
  b.box(H.x0, 0, H.z0, H.x1, H.top, H.z1, BRICK_RED, { win: SMALL_WIN, seed: r(), faces: 'NESW' });
  b.box(H.x0 - 0.12, 0, H.z0 - 0.12, H.x1 + 0.12, 0.9, H.z1 + 0.12, STONE_DARK, { faces: 'NESW' });
  b.box(H.x0 - 0.06, 3.9, H.z0 - 0.06, H.x1 + 0.06, 4.15, H.z1 + 0.06, STONE_TRIM, { faces: 'NESWB' });
  cornice(b, H.x0, H.z0, H.x1, H.z1, H.top - 0.4, 0.6, 0.2, STONE_TRIM, LEAD);
  const roof = H.top + 0.2;
  b.box(H.x0 + 2, roof, H.z0 + 1.6, H.x1 - 2, roof + 1.3, H.z1 - 2.2, GLASS, { faces: 'NESW', win: interior(1.1) });
  b.box(H.x0 + 1.85, roof + 1.3, H.z0 + 1.45, H.x1 - 1.85, roof + 1.5, H.z1 - 2.05, LEAD, { faces: 'NESWTB' });
  for (const [vx, vz] of [[H.x0 + 1.0, H.z0 + 1.0], [H.x1 - 1.0, H.z0 + 1.2]]) {
    b.cyl(vx, vz, roof, roof + 0.9, 0.28, 0.28, 6, IRON, { cap: false });
    b.cyl(vx, vz, roof + 0.9, roof + 1.2, 0.5, 0.2, 6, IRON_DARK);
  }
  waterTank(b, H.x0 + 1.2, roof, H.z1 - 1.3, 0.8);
  gargoyle(b, H.x1 + 0.1, roof, H.z1 + 0.1, PI / 4, 0.65);
  fireEscape(b, H.x0, (H.z0 + H.z1) / 2 - 1, 'W', 0, H.top);
  // the loading doors in its south wall, onto the vats
  for (const dx of [2.2, 6.4]) b.box(H.x0 + dx - 0.9, 0, H.z1, H.x0 + dx + 0.9, 2.8, H.z1 + 0.08, DARK, { faces: 'SEWT', win: interior(1.4) });
  // the name, on a steel frame over the south edge of the roof, which the view reads over the catwalk
  {
    const mx = (H.x0 + H.x1) / 2, sy = 10.55, sz = H.z1 - 0.05;
    const w = k.sign('docks-ace', mx, sy, sz + 0.08, 0, 1, 1.5, H.x1 - H.x0 - 0.8);
    b.box(mx - w / 2 - 0.12, sy - 0.85, sz - 0.05, mx + w / 2 + 0.12, sy + 0.85, sz + 0.05, DARK, { faces: 'NESWTB' });
    for (const s of [-1, 1]) b.beam([mx + s * (w / 2 - 0.4), roof, sz - 0.12], [mx + s * (w / 2 - 0.4), sy + 0.8, sz - 0.12], 0.1, 0.1, STEEL);
    b.beam([mx - w / 2 + 0.4, sy - 0.2, sz - 0.14], [mx + w / 2 - 0.4, sy - 0.2, sz - 0.14], 0.07, 0.07, STEEL);
    k.glows.push({ x: mx, y: sy - 1.0, z: sz + 0.3, sx: w * 0.8, sy: 0.08, sz: 0.1, color: '#e9ffd8' });
  }

  // --- the gate on the west side, towards Kane Street: two brick piers with gargoyles, an iron bar with a board, the leaves swung open
  const G = GATE;
  for (const [z0, z1] of [[G.z0 - 0.8, G.z0], [G.z1, G.z1 + 0.8]]) {
    b.box(l.x0, 0, z0, l.x0 + 0.9, 4, z1, BRICK_DARK, { faces: 'NESW' });
    b.box(l.x0 - 0.1, 4, z0 - 0.1, l.x0 + 1.0, 4.3, z1 + 0.1, STONE_TRIM, { faces: 'NESWTB' });
    gargoyle(b, l.x0 + 0.35, 4.3, (z0 + z1) / 2, PI, 0.7);
  }
  b.beam([l.x0 + 0.45, 4.25, G.z0], [l.x0 + 0.45, 4.25, G.z1], 0.1, 0.1, IRON);
  wallSign(k, 'docks-ace-gate', l.x0 + 0.32, 4.85, (G.z0 + G.z1) / 2, -1, 0, 0.75, 4);
  for (const [z, s] of [[G.z0 + 0.06, 1], [G.z1 - 0.06, -1]]) b.box(l.x0 + 0.95, 0.1, Math.min(z, z + s * 0.08), l.x0 + 3.3, 2.4, Math.max(z, z + s * 0.08), IRON, { faces: 'NESWT' });
  gasLamp(k, l.x0 + 1.2, 3.2, G.z0 + 0.15);
  gasLamp(k, l.x0 + 1.2, 3.2, G.z1 - 0.15);
  // the gatehouse, east of the north pier, with a lit window onto the gate
  b.box(l.x0 + 1.0, 0, l.z0 + 0.2, l.x0 + 3.8, 3.4, G.z0 - 0.1, BRICK, { faces: 'NESW' });
  b.box(l.x0 + 0.85, 3.4, l.z0 + 0.05, l.x0 + 3.95, 3.65, G.z0 + 0.05, SLATE, { faces: 'NESWTB' });
  b.quad([l.x0 + 1.4, 1.2, G.z0 - 0.08], [l.x0 + 3.2, 1.2, G.z0 - 0.08], [l.x0 + 3.2, 2.6, G.z0 - 0.08], [l.x0 + 1.4, 2.6, G.z0 - 0.08], [0, 0, 1], 0x6b5a3a, { win: interior(2.2) });
  b.quad([l.x0 + 3.82, 1.2, l.z0 + 0.4], [l.x0 + 3.82, 1.2, G.z0 - 0.3], [l.x0 + 3.82, 2.6, G.z0 - 0.3], [l.x0 + 3.82, 2.6, l.z0 + 0.4], [1, 0, 0], 0x6b5a3a, { win: interior(2.2) });

  // --- the yard inside the gate: a tanker of Ace's, white with a green band, and drums on a pallet
  const tz = G.z0 + 1.4;
  lorry(b, l.x0 + 3.4, tz, 6.4, 0xe2e4e0, 0xe8eae6, 'tank');
  drum(b, [l.x0 + 3.4 + 1.85 + 2.27, 1.85, tz], 1.03, 0.22, 0x2f8a3a, { cap: 0x2f8a3a });
  const drums = [0x2f6a3a, 0x7a3a2a, 0x3d5a7a, 0x8a7a30];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) barrel(b, l.x0 + 4.4 + i * 0.85, H.z0 - 1.9 + j * 0.85, 0.18, drums[Math.floor(r() * drums.length)]);
  b.box(l.x0 + 3.9, 0.04, H.z0 - 2.4, l.x0 + 9.3, 0.18, H.z0 - 0.8, TIMBER, { faces: 'NESWT' });

  // --- the boiler house under the stack, and the stack with its ring of red lamps
  const S = STACK, scx = (S.x0 + S.x1) / 2, scz = (S.z0 + S.z1) / 2;
  b.box(S.x0 + 0.2, 0, S.z0 + 0.2, Math.min(S.x1 - 0.2, 103.8), 8, S.z1 - 0.2, BRICK_DARK, { win: SMALL_WIN, seed: r(), faces: 'NESW' });
  cornice(b, S.x0 + 0.2, S.z0 + 0.2, Math.min(S.x1 - 0.2, 103.8), S.z1 - 0.2, 7.6, 0.6, 0.15, STONE_TRIM, LEAD);
  b.cyl(scx, scz, 8.2, 9.6, 2.35, 2.15, 8, BRICK_DARK, { cap: false });
  b.cyl(scx, scz, 9.6, S.top - 1.4, 1.85, 1.32, 10, BRICK_RED, { cap: false });
  for (const y of [15, 21.5]) b.cyl(scx, scz, y, y + 0.35, 1.85 - (0.53 * (y - 9.6)) / (S.top - 11), 1.82 - (0.53 * (y - 9.6)) / (S.top - 11), 10, STONE_TRIM, { cap: false });
  b.cyl(scx, scz, S.top - 1.4, S.top - 0.4, 1.5, 1.55, 10, STONE_DARK, { cap: DARK });
  b.beam([scx, 8.2, scz + 2.0], [scx, S.top - 1.5, scz + 1.42], 0.07, 0.07, STEEL);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.3;
    k.glows.push({ x: scx + Math.cos(a) * 1.62, y: S.top - 1.75, z: scz + Math.sin(a) * 1.62, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff3b3b' });
  }

  // --- three tanks east of the process house, a horizontal one on saddles, and the pipe rack between them and the house
  const T1: [number, number] = [l.x0 + 12.2, H.z0 + 2.2], T3: [number, number] = [l.x0 + 11.2, H.z0 + 6.0], T2: [number, number] = [l.x0 + 14.4, H.z0 + 5.6];
  tank(b, T1[0], T1[1], 1.7, 10.8, 0xa5a8a2);
  tank(b, T3[0], T3[1], 1.3, 10.0, 0x7a5a44);
  tank(b, T2[0], T2[1], 1.05, 9.0, 0x5f7a66);
  for (const dx of [-1.6, 1.6]) b.box(l.x0 + 12.7 + dx - 0.25, 0, H.z1 - 0.8, l.x0 + 12.7 + dx + 0.25, 0.75, H.z1 + 0.8, CONCRETE_PALE, { faces: 'NESWT' });
  drum(b, [l.x0 + 12.7, 1.4, H.z1], 0.78, 2.5, 0xc9ccc6, { cap: 0xb9bcb6 });
  const rx = H.x1 + 0.45;
  for (const z of [H.z0 + 0.4, H.z0 + 4.4, H.z1 - 0.3]) {
    b.beam([rx, 0, z], [rx, 6.7, z], 0.1, 0.1, STEEL);
    b.beam([rx - 0.35, 6.3, z], [rx + 0.35, 6.3, z], 0.07, 0.07, STEEL);
  }
  for (const [dx, y, c] of [[-0.2, 6.5, 0x9aa09a], [0.2, 6.5, 0x6d8a6a], [0, 4.4, 0xb08a4a]] as [number, number, number][]) b.beam([rx + dx, y, S.z1 + 0.4], [rx + dx, y, H.z1 + 0.6], 0.16, 0.16, c);
  // branches from the rack: into the tanks, the boiler house and the house's wall
  b.beam([rx + 0.2, 6.5, T1[1]], [T1[0] - 1.6, 6.5, T1[1]], 0.14, 0.14, 0x9aa09a);
  b.beam([rx + 0.2, 6.5, T3[1]], [T3[0] - 1.2, 6.5, T3[1]], 0.14, 0.14, 0x6d8a6a);
  const gap = (T1[1] + 1.7 + T3[1] - 1.3) / 2;
  b.beam([rx, 4.4, gap], [T2[0], 4.4, gap], 0.13, 0.13, 0xb08a4a);
  b.beam([T2[0], 4.4, gap], [T2[0], 4.4, T2[1] - 0.95], 0.13, 0.13, 0xb08a4a);
  b.beam([rx - 0.2, 6.5, H.z0 + 1.2], [H.x1, 6.5, H.z0 + 1.2], 0.14, 0.14, 0x9aa09a);
  // and down from the house's south wall into each vat
  for (const vx of VATS.xs) {
    if (vx > H.x1) continue;
    b.beam([vx, 3.2, H.z1], [vx, 3.2, VATS.z - VATS.r + 0.6], 0.12, 0.12, 0x8a9088);
    b.beam([vx, 3.2, VATS.z - VATS.r + 0.6], [vx, VATS.h + 0.2, VATS.z - VATS.r + 0.6], 0.12, 0.12, 0x8a9088);
  }
  b.beam([rx, 3.2, H.z1 + 0.6], [VATS.xs[3], 3.2, H.z1 + 0.6], 0.12, 0.12, 0x8a9088);
  for (const vx of VATS.xs.filter((x) => x > H.x1)) b.beam([vx, 3.2, H.z1 + 0.6], [vx, VATS.h + 0.2, VATS.z - VATS.r + 0.6], 0.12, 0.12, 0x8a9088);

  // --- the open vats along the south front, over the dock cut's north edge, glowing green
  for (const vx of VATS.xs) vat(k, vx, VATS.z, VATS.r, VATS.h, VATS.liquid);
  k.lights.push({ x: (VATS.xs[0] + VATS.xs[3]) / 2, z: VATS.z + 0.5, r: 13, color: GREEN, k: 0.7 });
  k.lights.push({ x: (CUT.x0 + CUT.x1) / 2, z: QUAY - 2, r: 14, color: GREEN, k: 0.55 });
  k.lights.push({ x: l.x0 + 3, z: (G.z0 + G.z1) / 2, r: 9, color: SODIUM, k: 0.5 });
  k.lights.push({ x: l.x0 + 13, z: H.z0 + 4, r: 9, color: AMBER, k: 0.4 });

  // --- the catwalk over the vats at the stage's height: a grating on posts, a rail on its outer side only, open at both ends
  const W = WALK;
  b.box(W.x0, W.y - 0.16, W.z0, W.x1, W.y, W.z1, STEEL, { faces: 'NESWTB', top: 0x6f7680 });
  const posts = [W.x0 + 0.3, (VATS.xs[0] + VATS.xs[1]) / 2, (VATS.xs[1] + VATS.xs[2]) / 2, (VATS.xs[2] + VATS.xs[3]) / 2, W.x1 - 0.3];
  for (const px of posts) {
    b.beam([px, 0, W.z1 - 0.15], [px, W.y - 0.16, W.z1 - 0.15], 0.11, 0.11, STEEL);
    b.beam([px, 0, VATS.z - VATS.r - 0.25], [px, W.y - 0.3, VATS.z - VATS.r - 0.25], 0.09, 0.09, STEEL);
    b.beam([px, W.y - 0.3, VATS.z - VATS.r - 0.25], [px, W.y - 0.3, W.z1 - 0.15], 0.08, 0.08, STEEL);
  }
  for (let x = W.x0 + 0.3; x <= W.x1 - 0.2; x += 2.3) b.beam([x, W.y, W.z1 - 0.06], [x, W.y + 1.0, W.z1 - 0.06], 0.05, 0.05, STEEL);
  b.beam([W.x0 + 0.3, W.y + 1.0, W.z1 - 0.06], [W.x1 - 0.3, W.y + 1.0, W.z1 - 0.06], 0.06, 0.06, STEEL);
  b.beam([W.x0 + 0.3, W.y + 0.5, W.z1 - 0.06], [W.x1 - 0.3, W.y + 0.5, W.z1 - 0.06], 0.04, 0.04, STEEL);
  // a feed pipe hung under it, with a spout down over each vat
  const fz = W.z0 + 0.35, fy = W.y - 1.3;
  b.beam([posts[0], fy, fz], [posts[4], fy, fz], 0.13, 0.13, 0x8a9088);
  for (const px of posts) b.beam([px, fy, fz], [px, W.y - 0.3, fz], 0.04, 0.04, STEEL);
  for (const vx of VATS.xs) {
    b.beam([vx, fy, fz], [vx, VATS.h + 0.9, fz], 0.1, 0.1, 0x8a9088);
    b.beam([vx, VATS.h + 0.9, fz], [vx, VATS.h + 0.9, VATS.z], 0.1, 0.1, 0x8a9088);
  }
  // a gangway down onto it from the process house's roof, and a lamp over its middle
  slab(b, [H.x0 + 4.8, roof, H.z1 + 0.25], [H.x0 + 4.8, W.y, W.z0], 0.6, 0.12, 0x6f7680, { under: STEEL });
  k.glows.push({ x: (W.x0 + W.x1) / 2, y: W.y + 1.6, z: W.z1 - 0.06, sx: 0.3, sy: 0.3, sz: 0.3, color: '#e8ffd0' });
  b.beam([(W.x0 + W.x1) / 2, W.y + 1.0, W.z1 - 0.06], [(W.x0 + W.x1) / 2, W.y + 1.45, W.z1 - 0.06], 0.05, 0.05, STEEL);

  // the smoke from the stack
  puffs(k, [{ x: scx, y: S.top - 0.3, z: scz, every: 1.4, size: 1.5, shade: 0.72 }]);
};

// ---------------------------------------------------------------------------
// The cold store
// ---------------------------------------------------------------------------

const coldStore: Model = (k, l) => {
  const b = k.b, r = rng(5521);
  b.box(l.x0, 0, l.z0, l.x1, 8, l.z1, BRICK, { win: SMALL_WIN, seed: r(), faces: 'NESW' });
  b.box(l.x0 - 0.1, 0, l.z0 - 0.1, l.x1 + 0.1, 0.8, l.z1 + 0.1, STONE_DARK, { faces: 'NESW' });
  // frost along the sills and the eaves, pale blue-white, and icicles under the eaves
  b.box(l.x0 - 0.09, 3.85, l.z0 - 0.09, l.x1 + 0.09, 4.12, l.z1 + 0.09, FROST, { faces: 'NESWB' });
  cornice(b, l.x0, l.z0, l.x1, l.z1, 7.45, 0.75, 0.24, FROST, LEAD);
  for (let x = l.x0 + 0.6; x < l.x1 - 0.3; x += 1.25) b.cyl(x, l.z1 + 0.12, 6.75 + 0.25 * Math.sin(x * 3.1), 7.45, 0.02, 0.13, 4, FROST, { cap: false });
  for (let z = l.z0 + 0.8; z < l.z1 - 0.3; z += 1.6) b.cyl(l.x1 + 0.12, z, 6.85 + 0.2 * Math.sin(z * 2.3), 7.45, 0.02, 0.12, 4, FROST, { cap: false });

  // the big insulated door in the south side, slid open on its rail, and the cold light inside
  const D = FREEZE_DOOR;
  b.quad([D.x0 + 0.15, 0.02, l.z1 + 0.02], [D.x1 - 0.15, 0.02, l.z1 + 0.02], [D.x1 - 0.15, D.h, l.z1 + 0.02], [D.x0 + 0.15, D.h, l.z1 + 0.02], [0, 0, 1], 0x9fc4d6, { win: interior(1.8) });
  for (const x of [D.x0, D.x1 - 0.15]) b.box(x, 0, l.z1, x + 0.15, D.h + 0.15, l.z1 + 0.25, 0xc5ccd0, { faces: 'NESWT' });
  b.box(D.x0, D.h, l.z1, D.x1, D.h + 0.15, l.z1 + 0.25, 0xc5ccd0, { faces: 'NESWTB' });
  b.box(TUNNEL.x - 1.8, 0.05, l.z1 + 0.05, D.x0 - 0.05, D.h - 0.1, l.z1 + 0.3, 0xd9d6cb, { faces: 'NESWT' });
  b.box(TUNNEL.x - 2.0, D.h + 0.15, l.z1, D.x1, D.h + 0.35, l.z1 + 0.22, IRON_DARK, { faces: 'NESWTB' });
  gasLamp(k, (D.x0 + D.x1) / 2, D.h + 0.75, l.z1 + 0.35, 0, ICE);
  k.glows.push({ x: (D.x0 + D.x1) / 2, y: 0.5, z: l.z1 + 0.35, sx: D.x1 - D.x0 - 0.4, sy: 0.6, sz: 0.4, color: '#dff6ff' });
  // the name, and ICE in neon over the door
  wallSign(k, 'docks-ice', (D.x0 + D.x1) / 2, 5.7, l.z1, 0, 1, 1.3, 3.0);
  wallSign(k, 'docks-cold-store', (l.x0 + TUNNEL.x) / 2 - 0.5, 6.95, l.z1, 0, 1, 0.85, 5.2);

  // the refrigeration plant on the roof: two condensers with their fans, the compressor house, a receiver, frosted pipes
  const y = 8.2;
  for (const dz of [0.8, 3.6]) {
    b.box(l.x0 + 0.8, y, l.z0 + dz, l.x0 + 3.4, y + 0.65, l.z0 + dz + 2.2, 0x8a9096, { faces: 'NESWT' });
    for (const dx of [1.45, 2.75]) b.cyl(l.x0 + dx, l.z0 + dz + 1.1, y + 0.65, y + 0.72, 0.5, 0.5, 6, DARK);
  }
  b.box(l.x0 + 4.4, y, l.z0 + 0.8, l.x0 + 7.6, y + 0.8, l.z0 + 3.4, 0x7d8389, { faces: 'NESWT', top: LEAD });
  drum(b, [l.x0 + 6.0, y + 0.45, l.z0 + 4.7], 0.35, 1.4, 0xb9c3c9, { cap: FROST_DARK });
  for (const z of [l.z0 + 1.6, l.z0 + 4.4]) b.beam([l.x0 + 3.4, y + 0.4, z], [l.x0 + 4.4, y + 0.4, Math.min(z, l.z0 + 3.0)], 0.09, 0.09, FROST);
  b.beam([l.x0 + 6.0, y + 0.8, l.z0 + 3.4], [l.x0 + 6.0, y + 0.8, l.z0 + 4.4], 0.09, 0.09, FROST);
  gargoyle(b, l.x1 + 0.1, y, l.z1 + 0.1, PI / 4, 0.6);
  gargoyle(b, l.x0 - 0.1, y, l.z1 + 0.1, (3 * PI) / 4, 0.6);

  // the steam pipe at the lot's south-west corner: out of the ground, a valve with its wheel on top, and into the wall
  const vx = l.x0 + 0.45, vz = l.z1 + 0.4;
  b.beam([vx, 0, vz], [vx, 0.95, vz], 0.14, 0.14, RUST);
  b.beam([vx, 0.6, vz], [vx, 0.6, l.z1], 0.12, 0.12, RUST);
  b.box(vx - 0.22, 0.95, vz - 0.22, vx + 0.22, 1.3, vz + 0.22, IRON_DARK, { faces: 'NESWT' });
  b.beam([vx, 1.3, vz], [vx, 1.58, vz], 0.04, 0.04, STEEL);
  b.cyl(vx, vz, 1.55, 1.62, 0.45, 0.45, 8, 0xb84030, { cap: false });
  b.cyl(vx, vz, 1.55, 1.62, 0.36, 0.36, 8, 0xb84030, { cap: false });
  b.beam([vx - 0.4, 1.6, vz], [vx + 0.4, 1.6, vz], 0.03, 0.03, 0xb84030);
  b.beam([vx, 1.6, vz - 0.4], [vx, 1.6, vz + 0.4], 0.03, 0.03, 0xb84030);
  puffs(k, [{ x: vx + 0.3, y: 1.1, z: vz + 0.2, every: 2.6, size: 0.55, shade: 1 }]);
};

// ---------------------------------------------------------------------------
// The Monarch Playing Card Company
// ---------------------------------------------------------------------------

const cardCompany: Model = (k, l) => {
  const b = k.b, r = rng(4413);
  b.box(l.x0, 0, l.z0, l.x1, 8, l.z1, BRICK_DARK, { win: SMALL_WIN, seed: r(), faces: 'NESW' });
  b.box(l.x0 - 0.1, 0, l.z0 - 0.1, l.x1 + 0.1, 0.8, l.z1 + 0.1, STONE_DARK, { faces: 'NESW' });
  b.box(l.x0 - 0.07, 3.88, l.z0 - 0.07, l.x1 + 0.07, 4.1, l.z1 + 0.07, STONE_TRIM, { faces: 'NESWB' });
  cornice(b, l.x0, l.z0, l.x1, l.z1, 7.5, 0.7, 0.2, STONE_TRIM, LEAD);
  const y = 8.2;
  // a north-light roof over the northern half: two teeth, glazed to the north and lit at night
  const teeth = 2, depth = 2.2, rise = 0.75, xa = l.x0 + 0.4, xb = l.x1 - 0.4;
  for (let i = 0; i < teeth; i++) {
    const za = l.z0 + 0.4 + i * depth, zb = za + depth, len = Math.hypot(depth, rise);
    b.quad([xa, y, zb], [xb, y, zb], [xb, y + rise, za], [xa, y + rise, za], [0, depth / len, rise / len], SLATE);
    b.quad([xb, y, za], [xa, y, za], [xa, y + rise, za], [xb, y + rise, za], [0, 0, -1], GLASS, { win: interior(1.3) });
    face3(b, [xa, y, za], [xa, y + rise, za], [xa, y, zb], [-1, 0, 0], BRICK_DARK);
    face3(b, [xb, y, za], [xb, y + rise, za], [xb, y, zb], [1, 0, 0], BRICK_DARK);
  }

  // the roller door in the south side, onto the apron, under its drum's housing: a dark doorway, and before it the
  // shutter as a mesh of its own, hung from the doorway's top, which the show rolls up (see `rollerDoor`)
  const R = ROLLER;
  b.quad([R.x - R.half, 0, l.z1 + 0.03], [R.x + R.half, 0, l.z1 + 0.03], [R.x + R.half, R.h, l.z1 + 0.03], [R.x - R.half, R.h, l.z1 + 0.03], [0, 0, 1], 0x0d0e11);
  {
    const g = new GeoBuilder();
    g.box(-R.half, -R.h, 0.05, R.half, 0, 0.1, 0x767c84, { faces: 'SEWB' });
    for (let i = 1; i < 5; i++) g.box(-R.half + 0.05, -(R.h * i) / 5 - 0.05, 0.1, R.half - 0.05, -(R.h * i) / 5 + 0.05, 0.15, 0x60666e, { faces: 'STB' });
    const shutter = new THREE.Mesh(g.build(), k.mat.city());
    shutter.name = ROLLER_NAME;
    shutter.castShadow = false;
    shutter.receiveShadow = true;
    shutter.position.set(R.x, R.h, l.z1);
    k.group.add(shutter);
  }
  for (const s of [-1, 1]) b.box(R.x + s * R.half - 0.15, 0, l.z1, R.x + s * R.half + 0.15, R.h + 0.1, l.z1 + 0.3, IRON, { faces: 'NESWT' });
  b.box(R.x - R.half - 0.2, R.h, l.z1, R.x + R.half + 0.2, R.h + 0.6, l.z1 + 0.5, IRON, { faces: 'NESWTB' });
  gasLamp(k, R.x + R.half + 0.9, R.h + 0.7, l.z1 + 0.3);
  wallSign(k, 'docks-monarch', R.x, 5.75, l.z1, 0, 1, 1.75, l.x1 - l.x0 - 1.6);
  // a fire escape on the west wall, over the alley to the cold store
  fireEscapeWest(b, l.x0, (l.z0 + l.z1) / 2);
  gargoyle(b, l.x1 + 0.1, y, l.z1 + 0.1, PI / 4, 0.6);

  // the giant playing card on the roof's flat southern half: the king, facing the view, on a steel frame
  const n = TO_VIEW, h = 5.8, w = (h * 100) / 140, cx = R.x + 0.1, cz = l.z1 - 1.7, cy = 8.95 + h / 2;
  const ax = -n[2], az = n[0];
  b.obox(cx, cy, cz, w / 2 + 0.06, h / 2 + 0.06, 0.06, Math.atan2(az, ax), CARD_WHITE, { faces: 'B' });
  k.sign('docks-card-king', cx + n[0] * 0.09, cy, cz + n[2] * 0.09, n[0], n[2], h, w + 0.1);
  k.sign('docks-card-back', cx - n[0] * 0.09, cy, cz - n[2] * 0.09, -n[0], -n[2], h, w + 0.1);
  for (const s of [-1, 1]) {
    const px = cx + ax * s * (w / 2 - 0.4) - n[0] * 0.18, pz = cz + az * s * (w / 2 - 0.4) - n[2] * 0.18;
    b.beam([px, y, pz], [px, cy + 1.4, pz], 0.1, 0.1, STEEL);
    b.beam([px, cy + 1.2, pz], [px - n[0] * 2.2, y, pz - n[2] * 2.2], 0.08, 0.08, STEEL);
  }
  b.beam([cx + ax * (w / 2 - 0.4) - n[0] * 0.18, cy - 1.2, cz + az * (w / 2 - 0.4) - n[2] * 0.18], [cx - ax * (w / 2 - 0.4) - n[0] * 0.18, cy - 1.2, cz - az * (w / 2 - 0.4) - n[2] * 0.18], 0.07, 0.07, STEEL);
  // two lamps that light the card at night
  for (const s of [-1, 1]) k.glows.push({ x: cx + ax * s * 1.2 + n[0] * 0.9, y: y + 0.3, z: cz + az * s * 1.2 + n[2] * 0.9, sx: 0.3, sy: 0.2, sz: 0.3, color: '#fff2d0' });
  k.lights.push({ x: R.x, z: l.z1 + 1.5, r: 9, color: SODIUM, k: 0.45 });
};

/** A fire escape on a west wall: one landing with its rail at the first floor, and the ladder up from it to the roof. */
function fireEscapeWest(b: B, x: number, z: number): void {
  const y = 4.1, w = 2.6;
  b.box(x - 1.0, y - 0.12, z - w / 2, x, y, z + w / 2, IRON, { faces: 'NESWTB' });
  b.box(x - 1.0, y, z - w / 2, x - 0.92, y + 0.9, z + w / 2, IRON, { faces: 'NESWT' });
  b.beam([x - 0.5, y, z + w / 2 - 0.3], [x - 0.5, 7.6, z + w / 2 - 0.3], 0.07, 0.07, IRON);
  b.beam([x - 0.5, y - 0.1, z - w / 2 + 0.4], [x - 0.5, 1.7, z - w / 2 + 0.4], 0.07, 0.07, IRON);
}

// ---------------------------------------------------------------------------
// What is not one of the plan's lots
// ---------------------------------------------------------------------------

/** The old dock tunnel's mouth: a brick portal facing east, its arch ringed in pale stone, dark a little way in. */
function tunnel(k: Build): void {
  const b = k.b, T = TUNNEL, zc = T.z, n = 10;
  const zs0 = zc - T.half, zs1 = zc + T.half, xi = T.x - T.deep;
  // the jambs, which are the lining of the opening as well
  b.box(xi, 0, T.north, T.x, T.top, zs0, BRICK_DARK, { faces: 'NESW' });
  b.box(xi, 0, zs1, T.x, T.top, T.south, BRICK_DARK, { faces: 'NESW' });
  // the hood behind, and its roof with a coping
  b.box(T.back, 0, T.north, xi + 0.01, T.top, T.south, BRICK_DARK, { faces: 'NSW' });
  b.box(T.back - 0.15, T.top, T.north - 0.15, T.x + 0.2, T.top + 0.35, T.south, STONE_TRIM, { faces: 'NESWTB', top: SLATE });
  // the face over the arch, the vault inside, and the ring of voussoirs
  const at = (i: number, rr: number): [number, number] => {
    const a = PI * (i / n);
    return [zc + Math.cos(a) * rr, T.spring + Math.sin(a) * rr];
  };
  for (let i = 0; i < n; i++) {
    const [za, ya] = at(i, T.half), [zb, yb] = at(i + 1, T.half), am = PI * ((i + 0.5) / n);
    b.quad([T.x, ya, za], [T.x, yb, zb], [T.x, T.top, zb], [T.x, T.top, za], [1, 0, 0], BRICK_DARK);
    b.quad([T.x, ya, za], [T.x, yb, zb], [xi, yb, zb], [xi, ya, za], [0, -Math.sin(am), -Math.cos(am)], 0x2c2522);
    const [zc0, yc0] = at(i, T.half + 0.45), [zc1, yc1] = at(i + 1, T.half + 0.45);
    b.quad([T.x + 0.04, ya, za], [T.x + 0.04, yb, zb], [T.x + 0.04, yc1, zc1], [T.x + 0.04, yc0, zc0], [1, 0, 0], STONE_TRIM);
  }
  b.box(T.x, T.spring + T.half - 0.1, zc - 0.3, T.x + 0.15, T.spring + T.half + 0.5, zc + 0.3, STONE_LIGHT, { faces: 'NESWT' });
  // the darkness a little way in, and the floor inside going down into it
  b.quad([xi + 0.05, 0, zs0], [xi + 0.05, 0, zs1], [xi + 0.05, T.spring + T.half, zs1], [xi + 0.05, T.spring + T.half, zs0], [1, 0, 0], 0x0c0c10);
  area(k, rect(xi + 0.05, zs0, T.x, zs1), 0x1c1d21, 0.04);
  area(k, rect(T.x, zs0 + 0.2, T.x + 1.2, zs1 - 0.2), 0x2a2b30, 0.04, { size: 0.6, bond: 0.5 });
  // the name over the arch, a lamp at its side, a vent shaft on the hood
  wallSign(k, 'docks-tunnel', T.x, T.top - 0.35, zc, 1, 0, 0.45, 3.6);
  gasLamp(k, T.x + 0.3, 4.6, T.north + 0.35);
  b.box(T.back + 0.6, T.top + 0.35, zc - 0.7, T.back + 1.8, T.top + 1.5, zc + 0.7, BRICK, { faces: 'NESWT', top: DARK });
  k.lights.push({ x: T.x + 1.5, z: zc, r: 9, color: AMBER, k: 0.45 });
}

/** A dock crane on its portal: legs on rails along the quay, a slewing house with its cab, an A-frame, and a luffing jib out over the water. */
function crane(k: Build, cx: number, cz: number, yaw: number, jib: number, luff: number): void {
  const b = k.b, C = CRANE;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = cx + sx * C.hx, z = cz + sz * C.hz;
    b.box(x - 0.17, 0.4, z - 0.17, x + 0.17, C.legs, z + 0.17, CRANE_PAINT, { faces: 'NESW' });
    b.box(x - 0.5, 0.05, z - 0.2, x + 0.5, 0.42, z + 0.2, IRON_DARK, { faces: 'NESWT' });
  }
  for (const sz of [-1, 1]) b.beam([cx - C.hx, 0.5, cz + sz * C.hz], [cx + C.hx, C.legs - 0.3, cz + sz * C.hz], 0.08, 0.08, CRANE_PAINT);
  b.box(cx - C.hx - 0.15, C.legs, cz - C.hz - 0.15, cx + C.hx + 0.15, C.legs + 0.55, cz + C.hz + 0.15, CRANE_PAINT, { faces: 'NESWTB' });
  b.cyl(cx, cz, C.legs + 0.55, C.legs + 0.9, 1.05, 1.05, 8, IRON_DARK);
  const y0 = C.legs + 0.9, c = Math.cos(yaw), s = Math.sin(yaw);
  b.moved(cx, 0, cz, yaw, () => {
    const K = C.cab;
    b.box(-2.3, y0, -0.85, 0.3, y0 + 1.9, 0.85, CRANE_HOUSE, { faces: 'NESWT', top: LEAD });
    b.box(-2.75, y0 + 0.1, -0.75, -2.3, y0 + 1.3, 0.75, STONE_DARK, { faces: 'NESWT' });
    b.box(K.x0, y0, K.z0, K.x1, y0 + K.h, K.z1, CAB, { faces: 'NESWTB' });
    b.quad([K.x1 + 0.02, y0 + 1.1, K.z0 + 0.1], [K.x1 + 0.02, y0 + 1.1, K.z1 - 0.1], [K.x1 + 0.02, y0 + 2.0, K.z1 - 0.1], [K.x1 + 0.02, y0 + 2.0, K.z0 + 0.1], [1, 0, 0], GLASS, { win: interior(1.5) });
    b.quad([K.x0 + 0.1, y0 + 1.1, K.z0 - 0.02], [K.x1 - 0.1, y0 + 1.1, K.z0 - 0.02], [K.x1 - 0.1, y0 + 2.0, K.z0 - 0.02], [K.x0 + 0.1, y0 + 2.0, K.z0 - 0.02], [0, 0, -1], GLASS, { win: interior(1.5) });
    const apex: V3 = [-0.7, y0 + 8.8, 0];
    for (const sd of [-1, 1]) {
      b.beam([-2.0, y0 + 1.9, sd * 0.75], apex, 0.12, 0.08, CRANE_PAINT);
      b.beam([0.2, y0 + 1.9, sd * 0.75], apex, 0.12, 0.08, CRANE_PAINT);
    }
    const foot: V3 = [0.5, y0 + 1.3, 0], tip: V3 = [0.5 + jib * Math.cos(luff), y0 + 1.3 + jib * Math.sin(luff), 0];
    const along = (f: number, sd: number): V3 => [foot[0] + (tip[0] - foot[0]) * f, foot[1] + (tip[1] - foot[1]) * f, sd * (0.5 - 0.38 * f)];
    for (const sd of [-1, 1]) b.beam(along(0, sd), along(1, sd), 0.11, 0.07, CRANE_PAINT);
    for (const f of [0.3, 0.62, 0.9]) b.beam(along(f, -1), along(f, 1), 0.06, 0.06, CRANE_PAINT);
    b.beam([apex[0], apex[1], 0], [tip[0], tip[1] + 0.1, 0], 0.05, 0.05, IRON);
    // the hoist's rope and its hook block, hanging from the tip
    const hook = Math.max(y0 + 3, tip[1] - 9);
    b.beam([tip[0], tip[1], 0], [tip[0], hook, 0], 0.03, 0.03, IRON_DARK);
    b.box(tip[0] - 0.22, hook - 0.5, -0.22, tip[0] + 0.22, hook, 0.22, 0xc9a548, { faces: 'NESWTB' });
  });
  const tx = 0.5 + jib * Math.cos(luff), ty = y0 + 1.3 + jib * Math.sin(luff);
  k.glows.push({ x: cx + tx * c, y: ty + 0.35, z: cz + tx * s, sx: 0.32, sy: 0.32, sz: 0.32, color: '#ff3b3b' });
}

/** Where the top of a crane's cab is, for a figure to stand on. */
function cabTop(cx: number, cz: number, yaw: number): Place {
  const K = CRANE.cab, lx = (K.x0 + K.x1) / 2, lz = (K.z0 + K.z1) / 2, c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: cx + lx * c - lz * s, y: CRANE.legs + 0.9 + K.h, z: cz + lx * s + lz * c, h: yaw };
}

/** The west yard under the station: paving with a track let into it, boxcars on it, lorries behind the coffee hatch, lamps. */
function yard(k: Build): void {
  const b = k.b, Y = YARD, r = rng(7319);
  area(k, rect(Y.x0, Y.z0, Y.x1, Y.z1), 0x55585e, 0.035, { size: 2.4, bond: 0 });
  // the track, let into the paving, with a buffer stop at its east end
  const tz = Y.z1 - 1.6;
  for (const dz of [-0.7, 0.7]) b.quad([Y.x0 + 0.2, 0.05, tz + dz + 0.07], [Y.x1 - 0.3, 0.05, tz + dz + 0.07], [Y.x1 - 0.3, 0.05, tz + dz - 0.07], [Y.x0 + 0.2, 0.05, tz + dz - 0.07], [0, 1, 0], STEEL);
  b.box(Y.x1 - 0.8, 0.05, tz - 0.95, Y.x1 - 0.3, 1.0, tz + 0.95, 0x8a2f2a, { faces: 'NESWT' });
  boxcar(b, Y.x0 + 0.4, Y.x0 + 6.6, tz, 0x6e3b2c, 'box');
  boxcar(b, Y.x0 + 7.0, Y.x0 + 13.2, tz, 0x4a5560, 'box');
  boxcar(b, Y.x0 + 13.6, Y.x1 - 1.0, tz, 0x2f5b6a, 'flat');
  // The station's stairs come down westwards from the platform's west end, over the yard's west end: the kiosk stands
  // north of them, and the lorries east of them.
  const stairs = EL_STAIRS;
  // the dockers' coffee hatch: a timber kiosk with its back to the sidewalk and its hatch on its east side, lit at night
  const kx0 = Y.x0 + 0.1, kx1 = stairs.x - 0.2, kz0 = Y.z0 + 0.05, kz1 = stairs.z0 - 0.5;
  b.box(kx0, 0, kz0, kx1, 2.8, kz1, 0x4d5a52, { faces: 'NESW' });
  b.box(kx0 - 0.15, 2.8, kz0 - 0.05, kx1 + 0.5, 3.0, kz1 + 0.15, TIMBER_DARK, { faces: 'NESWTB' });
  b.quad([kx1 + 0.02, 1.1, kz0 + 0.3], [kx1 + 0.02, 1.1, kz1 - 0.3], [kx1 + 0.02, 2.2, kz1 - 0.3], [kx1 + 0.02, 2.2, kz0 + 0.3], [1, 0, 0], 0x8a6a3a, { win: interior(2.4) });
  b.box(kx1, 1.0, kz0 + 0.2, kx1 + 0.35, 1.1, kz1 - 0.2, TIMBER, { faces: 'NESWTB' });
  b.cyl(kx0 + 0.5, kz0 + 0.5, 3.0, 3.9, 0.1, 0.1, 6, IRON_DARK, { cap: false });
  wallSign(k, 'docks-coffee', kx1, 2.45, (kz0 + kz1) / 2, 1, 0, 0.42, kz1 - kz0 - 0.2, TIMBER_DARK);
  k.lights.push({ x: kx1 + 1.4, z: (kz0 + kz1) / 2, r: 6, color: AMBER, k: 0.45 });
  // the lorries, along the back of the sidewalk: an ice lorry for the Iceberg Lounge, and a flatbed with crates
  const lz = Y.z0 + 1.3, l1 = stairs.x + 2.0, l2 = l1 + 6.3;
  lorry(b, l1, lz, 5.9, 0x2c3d52, 0xa9cfe0, 'box');
  k.sign('docks-ice-lorry', l1 + 3.85, 2.05, lz + 1.15 + 0.08, 0, 1, 0.8, 3.4);
  lorry(b, l2, lz, 5.9, 0x2e4a38, 0, 'flat');
  // lamps on posts at the stairs' foot and at the yard's east end
  gasLamp(k, stairs.x + 0.8, 3.6, stairs.z1 - 0.2, 3.6);
  gasLamp(k, Y.x1 - 0.2, 3.6, Y.z0 + 3.4, 3.6);
  // the dockers: two at the hatch, two between the lorries and the boxcars
  for (const [x, z] of [[kx1 + 0.85, kz0 + 0.5], [kx1 + 0.95, kz1 - 0.4], [l1 + 3.0, lz + 2.1], [l2 + 4.5, lz + 2.0]]) {
    if (open(x, z, 0.3)) k.person(x + (r() - 0.5) * 0.1, z, 0.035);
  }
  // the cranes' rails along the quay
  for (const dz of [-CRANE.hz, CRANE.hz]) b.quad([YARD_QUAY.x0 + 0.1, 0.05, CRANE_Z + dz + 0.08], [COLD.x0 - 0.1, 0.05, CRANE_Z + dz + 0.08], [COLD.x0 - 0.1, 0.05, CRANE_Z + dz - 0.08], [YARD_QUAY.x0 + 0.1, 0.05, CRANE_Z + dz - 0.08], [0, 1, 0], STEEL);
}

/** The pipe bridge from Ace Chemicals west over the viaduct to the card company's side: pipes on two trestles, and on down to the works west of it. */
function pipeBridge(k: Build): void {
  const b = k.b, P = PIPES, z = P.z, base = P.y - 0.35;
  // the two trestles, each four posts and their braces, outside the deck
  for (const x of [P.x0, VIADUCT.x1 + 1.3]) {
    for (const dx of [-0.35, 0.35]) for (const dz of [-0.45, 0.45]) b.beam([x + dx, 0, z + dz], [x + dx, base, z + dz], 0.08, 0.08, STEEL);
    for (const dz of [-0.45, 0.45]) b.beam([x - 0.35, 0.3, z + dz], [x + 0.35, base - 0.3, z + dz], 0.05, 0.05, STEEL);
    b.box(x - 0.5, base, z - 0.6, x + 0.5, base + 0.12, z + 0.6, STEEL, { faces: 'NESWTB' });
  }
  // the span: two chords and cross ties under three pipes
  for (const dz of [-0.45, 0.45]) b.beam([P.x0, base, z + dz], [P.x1, base, z + dz], 0.07, 0.07, STEEL);
  for (let x = P.x0 + 2; x < P.x1 - 1; x += 3) b.beam([x, base, z - 0.45], [x, base, z + 0.45], 0.05, 0.05, STEEL);
  const pipes: [number, number, number][] = [[-0.25, 0, 0x9aa09a], [0.25, 0, 0x6d8a6a], [0, 0.4, 0xb08a4a]];
  for (const [dz, dy, c] of pipes) b.beam([P.x0, P.y + dy, z + dz], [P.x1, P.y + dy, z + dz], 0.18, 0.18, c);
  // down the west trestle, and along the ground between the shed and the card company to the cold store's wall and the card company's
  const gz = CARD.z0 - 0.8, gy = 0.7;
  b.beam([P.x0 - 0.05, P.y, z - 0.25], [P.x0 - 0.05, gy, z - 0.25], 0.16, 0.16, 0x9aa09a);
  b.beam([P.x0 - 0.05, gy, z - 0.25], [P.x0 - 0.05, gy, gz], 0.16, 0.16, 0x9aa09a);
  b.beam([P.x0 - 0.05, gy, gz], [COLD.x1 + 0.6, gy, gz], 0.16, 0.16, 0x9aa09a);
  b.beam([COLD.x1 + 0.6, gy, gz], [COLD.x1 + 0.6, gy, COLD.z0 + 0.8], 0.16, 0.16, 0x9aa09a);
  b.beam([COLD.x1 + 0.6, gy, COLD.z0 + 0.8], [COLD.x1, gy, COLD.z0 + 0.8], 0.16, 0.16, 0x9aa09a);
  b.beam([P.x0 + 0.05, P.y, z + 0.25], [P.x0 + 0.05, gy + 0.6, z + 0.25], 0.16, 0.16, 0x6d8a6a);
  b.beam([P.x0 + 0.05, gy + 0.6, z + 0.25], [CARD.x1 - 0.6, gy + 0.6, z + 0.25], 0.16, 0.16, 0x6d8a6a);
  b.beam([CARD.x1 - 0.6, gy + 0.6, z + 0.25], [CARD.x1 - 0.6, gy + 0.6, CARD.z0], 0.16, 0.16, 0x6d8a6a);
  for (let x = COLD.x1 + 1.4; x < P.x0 - 0.5; x += 2.6) b.box(x - 0.15, 0, gz - 0.35, x + 0.15, gy - 0.12, gz + 0.35, CONCRETE_PALE, { faces: 'NESWT' });
}

/** The dock cut: stone coping round it, the abutments the leaf rests on, its hinge's pedestals, the tender's cabin, and a barge moored in it. */
function dockCut(k: Build): void {
  const b = k.b, C = CUT, A = APRON_STAGE;
  // the coping along the cut's two sides north of the apron, and the abutments under the leaf's two ends
  for (const [x0, x1] of [[C.x0 - 0.5, C.x0], [C.x1, C.x1 + 0.5]]) b.box(x0, 0, C.z0 + 0.05, x1, 0.12, A.z0 - 0.1, STONE_TRIM, { faces: 'NESWT' });
  for (const [x0, x1] of [[C.x0, C.x0 + 0.55], [C.x1 - 0.55, C.x1]]) b.box(x0, -1.6, A.z0 - 0.2, x1, -0.74, C.z1, STONE_LIGHT, { faces: 'NESWT' });
  // the quay's lip on the west abutment, level with the quay and as wide as the leaf, which is hinged at its edge
  b.box(C.x0, -0.74, APRON.z - LEAF_W / 2, DRAWBRIDGE.hinge, 0, APRON.z + LEAF_W / 2, 0x5d636b, { faces: 'NESWT', top: 0x3a3c41 });
  // the pedestals at the leaf's hinge and at its nose, the seaward ones on piers out of the water, with lamps for the boats
  for (const x of [C.x0, C.x1]) {
    b.box(x - 0.6, 0, A.z0 - 0.75, x + 0.6, 0.9, A.z0 - 0.1, STONE, { faces: 'NESWT', top: STONE_TRIM });
    b.box(x - 0.6, -1.6, C.z1 - 0.05, x + 0.6, 0.9, C.z1 + 0.6, STONE, { faces: 'NESWT', top: STONE_TRIM });
    k.glows.push({ x, y: 1.15, z: C.z1 + 0.28, sx: 0.28, sy: 0.3, sz: 0.28, color: x === C.x0 ? '#ff3b3b' : '#4dff6a' });
  }
  // the tender's cabin on the cut's west side, beside the viaduct: windows all round, a lamp and a horn on its roof
  const cx0 = VIADUCT.x1 + 0.45, cx1 = C.x0 - 0.25, cz0 = C.z0 + 0.5, cz1 = A.z0 - 0.9;
  b.box(cx0, 0, cz0, cx1, 3.2, cz1, 0x4f5a62, { faces: 'NESW' });
  b.box(cx0 - 0.15, 3.2, cz0 - 0.15, cx1 + 0.15, 3.45, cz1 + 0.15, SLATE, { faces: 'NESWTB' });
  for (const [nx, nz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const x = nx > 0 ? cx1 + 0.02 : nx < 0 ? cx0 - 0.02 : 0, z = nz > 0 ? cz1 + 0.02 : nz < 0 ? cz0 - 0.02 : 0;
    if (nx !== 0) b.quad([x, 1.5, cz0 + 0.3], [x, 1.5, cz1 - 0.3], [x, 2.8, cz1 - 0.3], [x, 2.8, cz0 + 0.3], [nx, 0, 0], 0x6b5a3a, { win: interior(2) });
    else b.quad([cx0 + 0.25, 1.5, z], [cx1 - 0.25, 1.5, z], [cx1 - 0.25, 2.8, z], [cx0 + 0.25, 2.8, z], [0, 0, nz], 0x6b5a3a, { win: interior(2) });
  }
  b.cyl((cx0 + cx1) / 2, (cz0 + cz1) / 2, 3.45, 3.9, 0.18, 0.3, 6, BRASS_HORN);
  gasLamp(k, cx1 + 0.05, 2.9, cz1 + 0.3);
  // a barge moored in the cut, north of the leaf, with drums of Ace's on her deck
  const bx0 = C.x0 + 1.0, bx1 = C.x1 - 1.0, bz0 = C.z0 + 0.6, bz1 = A.z0 - 0.6;
  b.box(bx0, -1.3, bz0, bx1, 0.05, bz1, 0x3a3a36, { faces: 'NESWT', top: 0x4b4a44 });
  b.box(bx0 - 0.1, -0.1, bz0 - 0.1, bx1 + 0.1, 0.2, bz1 + 0.1, 0x222326, { faces: 'NESW' });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) barrel(b, bx0 + 1.2 + i * 1.35, bz0 + 0.9 + j * 1.2, 0.05, j ? 0x2f8a3a : 0xd8dad6);
}
const BRASS_HORN = 0xc9a548;

/** The pile of crates on the corner east of the cut, two high, with a flat top to stand on. */
function crates(k: Build): void {
  const b = k.b, C = CRATES, L = C.layer, mx = (C.x0 + C.x1) / 2, mz = (C.z0 + C.z1) / 2;
  const tones = [0x7a5c3c, 0x6b4f33, 0x86683f, 0x5e4630];
  let i = 0;
  for (const [x0, x1] of [[C.x0, mx - 0.05], [mx + 0.05, C.x1]]) for (const [z0, z1] of [[C.z0, mz - 0.05], [mz + 0.05, C.z1]]) {
    b.box(x0, 0, z0, x1, L, z1, tones[i++ % 4], { faces: 'NESWT' });
    b.box(x0 - 0.02, L * 0.45, z0 - 0.02, x1 + 0.02, L * 0.55, z1 + 0.02, TIMBER_DARK, { faces: 'NESW' });
  }
  // the top layer: two long crates side by side, their tops level
  for (const [z0, z1] of [[C.z0 + 0.1, mz - 0.03], [mz + 0.03, C.z1 - 0.1]]) b.box(C.x0 + 0.1, L, z0, C.x1 - 0.1, 2 * L, z1, tones[i++ % 4], { faces: 'NESWT' });
  gasLamp(k, C.x1 - 0.2, 3.4, C.z0 - 0.3, 3.4);
}

/** Bollards along the quay's edge, a barge at the quay west of the viaduct, and the mooring lines between. */
function quay(k: Build): void {
  const b = k.b, z = QUAY;
  const at = [CARD.x0 - 2.0, CARD.x0 + 2.4, CARD.x1 - 0.5, CUT.x1 + 1.6, CUT.x1 + 5.0];
  for (const x of at) {
    b.cyl(x, z, 0, 0.55, 0.2, 0.2, 6, IRON_DARK);
    b.cyl(x, z, 0.55, 0.7, 0.28, 0.28, 6, IRON_DARK);
  }
  // a lighter at the quay, her hold under a tarpaulin, with a coil of drums on her deck
  const x0 = COLD.x1 - 1.5, x1 = CARD.x1 - 1.6, z0 = QUAY + 0.35, z1 = QUAY + 3.2;
  b.box(x0, -1.4, z0, x1, 0.12, z1, 0x2e3a3a, { faces: 'NESWT', top: 0x4a4740 });
  b.box(x0 - 0.1, -0.2, z0 - 0.1, x1 + 0.1, 0.25, z1 + 0.1, 0x1e2022, { faces: 'NESW' });
  b.box(x0 + 2.0, 0.12, z0 + 0.5, x1 - 2.6, 0.9, z1 - 0.5, 0x4a5a46, { faces: 'NESWT' });
  b.quad([x0 + 2.0, 0.9, z1 - 0.5], [x1 - 2.6, 0.9, z1 - 0.5], [x1 - 2.6, 1.5, (z0 + z1) / 2], [x0 + 2.0, 1.5, (z0 + z1) / 2], [0, 0.6, 0.8], 0x4a5a46);
  b.quad([x1 - 2.6, 0.9, z0 + 0.5], [x0 + 2.0, 0.9, z0 + 0.5], [x0 + 2.0, 1.5, (z0 + z1) / 2], [x1 - 2.6, 1.5, (z0 + z1) / 2], [0, 0.6, -0.8], 0x4a5a46);
  face3(b, [x0 + 2.0, 0.9, z0 + 0.5], [x0 + 2.0, 0.9, z1 - 0.5], [x0 + 2.0, 1.5, (z0 + z1) / 2], [-1, 0, 0], 0x4a5a46);
  face3(b, [x1 - 2.6, 0.9, z0 + 0.5], [x1 - 2.6, 0.9, z1 - 0.5], [x1 - 2.6, 1.5, (z0 + z1) / 2], [1, 0, 0], 0x4a5a46);
  b.box(x1 - 2.1, 0.12, z0 + 0.6, x1 - 0.6, 1.6, z1 - 0.6, 0x3a3f45, { faces: 'NESWT' });
  for (const [bx, sx] of [[at[0], x0 + 0.6], [at[2], x1 - 0.3]]) b.beam([bx, 0.6, z], [sx, 0.25, z0 + 0.1], 0.03, 0.03, TIMBER_PALE_ROPE);
}
const TIMBER_PALE_ROPE = 0xb8a47e;

/** The freighter at anchor in the harbour: hull, hatches and derricks, her bridge and funnel aft, and her anchor chain. */
function freighter(k: Build): void {
  const b = k.b, S = SHIP, zc = (S.z0 + S.z1) / 2, d = S.deck;
  const plan: XZ[] = [[S.x0, zc], [S.x0 + 3, S.z0], [S.x1 - 1.6, S.z0], [S.x1, S.z0 + 1.2], [S.x1, S.z1 - 1.2], [S.x1 - 1.6, S.z1], [S.x0 + 3, S.z1]];
  prism(b, plan, -1.6, -0.72, 0x7a2e26, { top: false });
  prism(b, plan, -0.72, d - 0.45, 0x22262c, { top: false });
  prism(b, plan, d - 0.45, d, 0xc9c4b6, { top: 0x5e5246 });
  // the forecastle, the windlass, the hatches and the derricks
  b.box(S.x0 + 2.2, d, S.z0 + 0.9, S.x0 + 4.6, d + 0.8, S.z1 - 0.9, 0x22262c, { faces: 'NESWT', top: 0x5e5246 });
  b.box(S.x0 + 2.8, d + 0.8, zc - 0.6, S.x0 + 3.6, d + 1.25, zc + 0.6, IRON_DARK, { faces: 'NESWT' });
  for (const hx of [S.x0 + 5.4, S.x0 + 8.8]) b.box(hx, d, S.z0 + 1.2, hx + 2.6, d + 0.6, S.z1 - 1.2, 0x3f5a48, { faces: 'NESWT' });
  for (const px of [S.x0 + 4.9, S.x0 + 11.9]) {
    for (const s of [-1, 1]) b.beam([px, d, zc + s * 1.5], [px, d + 4.6, zc + s * 1.5], 0.13, 0.11, 0xb8b2a2);
    b.beam([px, d + 4.4, zc - 1.5], [px, d + 4.4, zc + 1.5], 0.09, 0.09, 0xb8b2a2);
    b.beam([px, d + 1.2, zc], [px + (px < S.x0 + 8 ? 2.6 : -2.6), d + 3.4, zc], 0.08, 0.06, 0xb8b2a2);
  }
  // the superstructure aft: a deckhouse, the bridge with its wings, the funnel
  const ax = S.x1 - 5.8;
  b.box(ax, d, S.z0 + 0.6, S.x1 - 1.2, d + 2.2, S.z1 - 0.6, 0xd7d2c6, { faces: 'NESWT' });
  for (const [nz, z] of [[1, S.z1 - 0.58], [-1, S.z0 + 0.58]]) b.quad([ax + 0.4, d + 1.0, z], [S.x1 - 1.6, d + 1.0, z], [S.x1 - 1.6, d + 1.5, z], [ax + 0.4, d + 1.5, z], [0, 0, nz], 0x2e3440, { win: interior(1.4) });
  b.box(ax + 0.4, d + 2.2, S.z0 + 1.0, ax + 3.0, d + 3.85, S.z1 - 1.0, 0xd7d2c6, { faces: 'NESWT' });
  b.quad([ax + 0.38, d + 2.9, S.z0 + 1.2], [ax + 0.38, d + 2.9, S.z1 - 1.2], [ax + 0.38, d + 3.5, S.z1 - 1.2], [ax + 0.38, d + 3.5, S.z0 + 1.2], [-1, 0, 0], 0x2e3440, { win: interior(1.6) });
  b.box(ax + 1.5, d + 3.55, S.z0 + 0.25, ax + 2.6, d + 3.8, S.z1 - 0.25, 0xd7d2c6, { faces: 'NESWTB' });
  b.box(ax + 0.25, d + 3.85, S.z0 + 0.85, ax + 3.15, d + 4.0, S.z1 - 0.85, LEAD, { faces: 'NESWTB' });
  b.cyl(S.x1 - 2.0, zc, d + 2.2, d + 4.45, 0.8, 0.7, 8, 0x2a2c30, { cap: DARK });
  b.cyl(S.x1 - 2.0, zc, d + 3.5, d + 3.95, 0.76, 0.74, 8, 0x8a2f2a, { cap: false });
  b.beam([ax + 1.7, d + 4.0, zc], [ax + 1.7, d + 6.2, zc], 0.07, 0.05, 0xb8b2a2);
  b.beam([ax + 1.7, d + 5.6, zc - 0.7], [ax + 1.7, d + 5.6, zc + 0.7], 0.04, 0.04, 0xb8b2a2);
  k.glows.push({ x: ax + 1.7, y: d + 6.35, z: zc, sx: 0.25, sy: 0.25, sz: 0.25, color: '#fff6e0' });
  k.glows.push({ x: ax + 2.05, y: d + 3.9, z: S.z1 - 0.3, sx: 0.22, sy: 0.22, sz: 0.22, color: '#ff3b3b' });
  k.glows.push({ x: ax + 2.05, y: d + 3.9, z: S.z0 + 0.3, sx: 0.22, sy: 0.22, sz: 0.22, color: '#4dff6a' });
  k.glows.push({ x: S.x0 + 0.6, y: d + 1.4, z: zc, sx: 0.22, sy: 0.22, sz: 0.22, color: '#fff6e0' });
  k.lights.push({ x: (S.x0 + S.x1) / 2, z: zc, r: 10, color: AMBER, k: 0.35 });
  // the anchor chain, out of the hawse at the bow and down into the water
  const hawse: V3 = [S.x0 + 1.1, d - 0.5, zc + 0.9], kink: V3 = [S.x0 - 0.9, 0.4, zc + 1.3], wet: V3 = [S.x0 - 2.4, -0.9, zc + 1.6];
  b.beam(hawse, kink, 0.09, 0.09, 0x3a3a3e);
  b.beam(kink, wet, 0.09, 0.09, 0x3a3a3e);
  // two hands on deck
  k.person(S.x0 + 7.9, S.z0 + 0.7, d);
  k.person(ax - 0.6, S.z1 - 0.75, d);
}

/** Smoke from the stack, and steam from the cold store's valve. */
interface Puffer { x: number; y: number; z: number; every: number; size: number; shade: number }
const PUFFERS: Puffer[] = [];
function puffs(_k: Build, list: Puffer[]): void {
  PUFFERS.push(...list);
}
function startPuffs(k: Build): void {
  if (PUFFERS.length === 0) return;
  const list = PUFFERS.splice(0);
  const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 60);
  k.group.add(smoke.mesh);
  const r = rng(61207), from = new THREE.Vector3(), drift = new THREE.Vector3(0.45, 0.3, 0.2), due = list.map(() => r() * 0.8);
  k.each((dt) => {
    list.forEach((p, i) => {
      due[i] -= dt;
      if (due[i] > 0) return;
      due[i] = p.every * (0.75 + r() * 0.5);
      smoke.puff(from.set(p.x + (r() - 0.5) * 0.4, p.y, p.z + (r() - 0.5) * 0.4), drift, p.size * (0.85 + r() * 0.3), p.shade);
    });
    smoke.update(dt);
  });
}

// ---------------------------------------------------------------------------
// The exports
// ---------------------------------------------------------------------------

/** A model for each lot this file builds, by the lot's id. */
export const MODELS: Record<string, Model> = { ace, 'cold-store': coldStore, 'card-company': cardCompany };

/** Lots that are built as part of another lot's model or by `extras`, and so get no box either. */
export const COVERS: string[] = ['ace-stack'];

/** Places on what this file builds that the show needs as built: its task names them. */
export const PLACES: Record<string, Place> = {
  catwalk: { x: (WALK.x0 + WALK.x1) / 2, y: WALK.y, z: (WALK.z0 + WALK.z1) / 2, h: PI / 2 },
  catwalkWest: { x: WALK.x0 + 0.6, y: WALK.y, z: (WALK.z0 + WALK.z1) / 2, h: PI / 2 },
  catwalkEast: { x: WALK.x1 - 0.6, y: WALK.y, z: (WALK.z0 + WALK.z1) / 2, h: PI / 2 },
  aceGate: { x: ACE.x0 + 0.6, y: 0.035, z: (GATE.z0 + GATE.z1) / 2, h: PI },
  freezeDoor: { x: (FREEZE_DOOR.x0 + FREEZE_DOOR.x1) / 2, y: 0, z: COLD.z1 + 0.45, h: PI / 2 },
  valve: { x: COLD.x0 + 0.45, y: 0, z: COLD.z1 + 1.35, h: -PI / 2 },
  garage: { x: ROLLER.x, y: 0, z: CARD.z1 + 2.2, h: PI / 2 },
  bane: { x: (CRATES.x0 + CRATES.x1) / 2, y: 2 * CRATES.layer, z: (CRATES.z0 + CRATES.z1) / 2, h: PI },
  tunnelPortal: { x: TUNNEL.x + 1.0, y: 0, z: APRON.z, h: 0 },
  bridgeWest: { x: CUT.x0 - 1.2, y: 0, z: APRON.z, h: 0 },
  bridgeEast: { x: CUT.x1 + 1.2, y: 0, z: APRON.z, h: 0 },
  underViaduct: { x: KANE_ST.x, y: 0, z: APRON.z, h: 0 },
  craneTop: cabTop(CRANES[1].x, CRANE_Z, CRANES[1].yaw),
};

/** Whatever is not one of the plan's lots. */
export function extras(k: Build): void {
  tunnel(k);
  for (const c of CRANES) crane(k, c.x, CRANE_Z, c.yaw, c.jib, c.luff);
  yard(k);
  pipeBridge(k);
  dockCut(k);
  crates(k);
  quay(k);
  freighter(k);
  // a docker by the cold store's valve corner, and one by the bollards west of the card company
  for (const [x, z] of [[COLD.x0 - 0.1, QUAY - 3.4], [COLD.x0 + 0.6, QUAY - 1.4]]) if (open(x, z, 0.3)) k.person(x, z, 0);
  startPuffs(k);
}

/** How far the leaf turns up at `lift(1)`. */
const LIFT = (70 * PI) / 180;

/**
 * The dock cut's drawbridge: one bascule leaf as a mesh of its own, down at 0
 * and standing up at 1. The show calls it, once. It is hinged at the edge of
 * the quay's lip on the cut's west side (DRAWBRIDGE), across the cut along the
 * apron, its deck at 0.05 when down. Its hinge is the west edge of its deck's
 * top: turning there, no part of the deck comes back over the quay as it
 * stands up. (Hinged at its underside, the top's edge swung a fifth of a unit
 * back, into the nose of a car stopped before it.)
 */
export function buildDrawbridge(k: Build): { lift(f: number): void } {
  const g = new GeoBuilder(), L = DRAWBRIDGE.length, W = LEAF_W, top = 0.25;
  // built with the leaf along +x from the origin and its top 0.25 over it, and then let down by that much, so that
  // the origin, its hinge, is the west edge of its top
  g.box(0, 0, -W / 2, L, top, W / 2, 0x5d636b, { faces: 'NESWTB', top: 0x3a3c41 });
  for (const s of [-1, 1]) {
    g.box(0.1, -0.5, s * W / 2 - (s > 0 ? 0.3 : 0), L - 0.1, 0, s * W / 2 + (s < 0 ? 0.3 : 0), 0x4f555d, { faces: 'NESWB' });
    g.box(0, top, s > 0 ? W / 2 - 0.18 : -W / 2, L, top + 0.22, s > 0 ? W / 2 : -W / 2 + 0.18, 0xc9a548, { faces: 'NESWT' });
  }
  for (let i = 0; i < 6; i++) g.quad([L - 0.9, top + 0.01, -W / 2 + 0.2 + (i * (W - 0.4)) / 6], [L - 0.15, top + 0.01, -W / 2 + 0.2 + (i * (W - 0.4)) / 6], [L - 0.15, top + 0.01, -W / 2 + 0.2 + ((i + 0.5) * (W - 0.4)) / 6], [L - 0.9, top + 0.01, -W / 2 + 0.2 + ((i + 0.5) * (W - 0.4)) / 6], [0, 1, 0], 0xd9b23a);
  const geo = g.build();
  geo.translate(0, -top, 0);
  const mesh = new THREE.Mesh(geo, k.mat.city());
  mesh.name = 'docks-drawbridge';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.position.set(DRAWBRIDGE.hinge, 0.05, APRON.z);
  k.group.add(mesh);
  return { lift(f: number): void { mesh.rotation.z = Math.min(1, Math.max(0, f)) * LIFT; } };
}

/**
 * The card company's roller door, for the show: `open(1)` rolls its shutter up
 * under its drum's housing, `open(0)` lets it down again. The shutter is built
 * with the building, shut; this only finds it.
 */
export function rollerDoor(k: Build): { open(f: number): void } | null {
  const shutter = k.group.getObjectByName(ROLLER_NAME);
  return shutter ? { open(f: number): void { shutter.scale.y = 1 - 0.94 * Math.min(1, Math.max(0, f)); } } : null;
}

// lots this file is given, for whoever reads it: the plan's own
export type { Lot };
