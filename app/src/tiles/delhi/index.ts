// Delhi: Old Delhi, Connaught Place, the axis from Rashtrapati Bhavan to India
// Gate, and the south beyond the Ring Road, with the Yamuna down the east side.
//
// The ground, the river, the roads and the traffic, and every one of the
// things that stand on the tile. See NOTES.md for what is where, and what was
// done differently from the real place.

import { ordinaryBuildings, type BuildingRules, type Lot } from '../../engine/buildings';
import { checkRoads, type Solid } from '../../engine/checks';
import { LAWN, area, band, flat, ground, oval, rect, terrace, walls, water } from '../../engine/ground';
import { lane, sample, toSegs, type Piece } from '../../engine/lines';
import { buildPath, type Path } from '../../engine/paths';
import { CONCRETE, clearOfStreets, lampsAlong, roadDeck, street } from '../../engine/roads';
import type { SignDef } from '../../engine/signs';
import type { Build, HeroSpot, ParkedSpot, TileDef, TileParts } from '../../engine/tile';
import {
  AXIS_Z, BUDDH, CHANDNI, CP, CP_R, EAST_BANK, GROUNDS, HEX_LANES, PLOTS, RAISINA, RING, STOREY, THINGS, WATERS, WEST_BANK, hexCorner,
  type Quarter, type Thing,
} from './plan';
import { AXIS } from './axis';
import { life } from './life';
import * as bazaar from './bazaar';
import * as centre from './centre';
import * as east from './east';
import * as metro from './metro';
import * as oldDelhi from './old-delhi';
import * as south from './south';
import * as southWest from './south-west';
import { FLYOVERS, RAISINA_HUMP, RING_LANES, RING_PARTS, ROUTES, STREETS } from './roads';
import { ROAD_SIGNS, SCREEN, SHOPS } from './signs';

/** The models that are built, by the id of the thing in the plan. A thing without one is a plain box with its name. */
const QUARTERS = [oldDelhi, bazaar, centre, east, south, southWest, metro];
const MODELS: Record<string, (k: Build, t: Thing) => void> = Object.assign({ ...AXIS }, ...QUARTERS.map((q) => q.MODELS));

const PAVING = 0xb9ae9c, QUAY = 0x9c9482, WATER = 0x6f8468, PLAZA = 0xd9cdb4, SANDSTONE = 0xb5553c, BUFF = 0xdcc096, VERGE = 0x6f9a52, KERB = 0xcfc7b6;
const BOX: Record<Quarter, number> = { 'old-delhi': 0xc98a6b, centre: 0xe6dcc6, south: 0xcdd3c2, river: 0xd9c8b0 };

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** A board for each thing that is still a plain box, with its name on it. */
const BOARDS: SignDef[] = THINGS.map((t): SignDef => {
  const aspect = Math.max(2.6, t.name.length * 0.6);
  return { id: `board-${t.id}`, lines: [t.name], color: '#fbf6e6', ink: '#2a1d14', aspect, size: [Math.round(64 * aspect), 64], kind: 'board' };
});

const SIGNS: SignDef[] = [...Object.values(SHOPS).flat(), ...ROAD_SIGNS, SCREEN, ...BOARDS, ...QUARTERS.flatMap((q) => q.SIGNS)];

/** A plot with the quarter it stands in. */
type Sited = Lot & { quarter: Quarter };

const RULES: BuildingRules<Sited> = {
  styles: {
    haveli: { palette: [0xe6d3b1, 0xd9b99a, 0xcfa98a, 0xe9dcc4, 0xc9a07e], win: { cell: 2.2, storey: STOREY, lit: 0.3, kind: 4 } },
    bazaar: { palette: [0xe9dcc4, 0xd8c4a2, 0xcfd6d0, 0xe6c9a4, 0xd9b99a], win: { cell: 2.4, storey: STOREY, lit: 0.36, kind: 2 }, shops: true },
    colony: { palette: [0xe9e2d0, 0xe4d9be, 0xd9d4c4], win: { cell: 2.6, storey: STOREY, lit: 0.3, kind: 0 } },
    lutyens: { palette: [0xf2efe6, 0xefe6d2], win: { cell: 2.4, storey: STOREY, lit: 0.3, kind: 6 } },
    village: { palette: [0xf2efe6, 0xc98a6b, 0xe9dcc4, 0xb9785a], win: { cell: 2.2, storey: STOREY, lit: 0.42, kind: 2 }, shops: true },
    shed: { palette: [0xd8d4c8, 0xcbb78a], win: { cell: 3.4, storey: STOREY * 1.5, lit: 0.3, kind: 4 }, shops: true },
  },
  roofs: [0xb8ad9a, 0xa89e8c, 0xc4b9a6],
  hip: () => ({ colors: [0xb5654a, 0xa85a44] }),
  pool: (l) => ({ fascia: SHOPS[l.quarter].map((s) => s.id), blade: [], billboard: [] }),
  neon: ['#ffd9a0'],
};

const pathOf = (pieces: Piece[]): Path => buildPath(toSegs(pieces), false);

/** The grounds that are lawn, and the ones that are paved. The rest are left to whoever builds the thing. */
const GARDENS = ['humayuns-tomb', 'lodhi-garden', 'safdarjungs-tomb', 'hauz-khas', 'qutub-minar', 'lotus-temple', 'rk-puram'];
const PAVED = ['jama-masjid', 'bharat-mandapam', 'vintage-rally', 'khan-market', 'karol-bagh', 'dhaba', 'national-stadium'];

function build(k: Build): TileParts {
  const b = k.b;
  const DEV = import.meta.env.DEV;

  // -------------------------------------------------------------------------
  // The ground: paving with a hole for the river, the water, Raisina Hill and the lawns
  // -------------------------------------------------------------------------

  const river = rect(WEST_BANK, k.board.z0 + 0.2, EAST_BANK, k.board.z1 - 0.2);
  const tanks = Object.values(WATERS);
  ground(k, { color: PAVING, holes: [river, ...tanks.map((w) => rect(...w.at))] });
  water(k, river, { drop: 1.4, color: WATER, quay: QUAY });
  for (const w of tanks) if (w.wet) water(k, rect(...w.at), { color: 0x6f9a8c, quay: 0xb5ab98 });

  // Raisina Hill: one level, with Rashtrapati Bhavan and the two Blocks on it
  terrace(k, rect(k.board.x0 + 0.2, RAISINA.z0, RAISINA.x1, RAISINA.z1), 0, RAISINA.y, { top: PLAZA, side: SANDSTONE });

  // Kartavya Path's two lawns, each with its canal, and the park in the middle of Connaught Place
  const lawns = THINGS.find((t) => t.id === 'kartavya-path')!;
  area(k, rect(lawns.x, lawns.z, lawns.x + lawns.w, AXIS_Z - 7), LAWN);
  area(k, rect(lawns.x, AXIS_Z + 7, lawns.x + lawns.w, lawns.z + lawns.d), LAWN);
  for (const z of [AXIS_Z - 12, AXIS_Z + 12]) area(k, rect(lawns.x + 2, z - 1.25, lawns.x + lawns.w - 2, z + 1.25), 0x7fa6a0, 0.05);
  area(k, oval(CP[0], CP[1], CP_R.park, CP_R.park, 28), LAWN);
  // the lawns inside India Gate's hexagon
  area(k, [0, 1, 2, 3, 4, 5].map((i) => hexCorner(i, HEX_LANES[0] - 4.5)), LAWN);
  // the gardens and forecourts that things stand in
  for (const [id, [x0, z0, x1, z1]] of Object.entries(GROUNDS)) {
    if (GARDENS.includes(id)) area(k, rect(x0, z0, x1, z1), LAWN);
    else if (PAVED.includes(id)) area(k, rect(x0, z0, x1, z1), PLAZA);
  }
  // Chandni Chowk, paved in red sandstone
  area(k, rect(CHANDNI.x0, CHANDNI.z - CHANDNI.half, CHANDNI.x1, CHANDNI.z + CHANDNI.half), 0xb9705a);

  // -------------------------------------------------------------------------
  // Streets
  // -------------------------------------------------------------------------

  const laid = STREETS.map((s) => {
    const path = buildPath(s.segs, s.closed === true, s.hump);
    street(k, path, s.opts);
    const width = s.opts?.width ?? (s.opts?.lanes ?? 2) * 5;
    return { id: s.id, path, lamps: s.lamps ?? width / 2 + 1.3 };
  });

  // Kartavya Path climbs Raisina Hill on a ramp of earth
  roadDeck(k, buildPath([{ t: 'poly', pts: [[RAISINA.foot, AXIS_Z], [RAISINA.top, AXIS_Z]], y: 0, r: 0 }], false, RAISINA_HUMP), 5, { thick: 0.5, wall: 0.5, lanes: 2, lift: 0.03, skirt: 9, step: 1 });

  // --- The Ring Road ---
  // On the south leg each lane has a slim deck of its own, which climbs over the two streets it meets.
  // The verge lies between the two, and the Metro's piers stand in it.
  for (const off of [RING.off, -RING.off]) {
    roadDeck(k, pathOf(lane(RING_PARTS.fly, off)), RING.half, { thick: 0.7, wall: 0.7, lanes: 1, lift: 0.04, skirt: 2.2, step: 1.5 });
    for (const f of FLYOVERS) {
      for (const x of [f.x0 - 0.6, f.x1 + 0.6]) {
        const z = RING.z - off;
        b.box(x - 0.5, 0, z - 1.3, x + 0.5, RING.fly - 0.7, z + 1.3, CONCRETE);
        b.box(x - 0.8, RING.fly - 1.3, z - RING.half + 0.3, x + 0.8, RING.fly - 0.7, z + RING.half - 0.3, CONCRETE, { faces: 'NESWB' });
      }
    }
  }
  // each flyover's outer wall is painted as Delhi's crash barriers are, in blocks of yellow and black, and carries its lamps
  for (const side of [1, -1]) {
    const pts = sample(lane(RING_PARTS.fly, RING.off * side), 1.5), out = -side * (RING.half + 0.02);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0, z0] = pts[i], [x1, y1] = pts[i + 1], z = z0 + out;
      b.quad([x0, y0 + 0.12, z], [x1, y1 + 0.12, z], [x1, y1 + 0.62, z], [x0, y0 + 0.62, z], [0, 0, -side], i % 2 ? 0x1b1c20 : 0xf2c81e);
      if (i % 9 === 4) k.lamp(x0, z0 - side * (RING.half - 0.3), (side * Math.PI) / 2, y0 + 0.04);
    }
  }
  const verge = (pieces: Piece[]): void => {
    const path = pathOf(pieces), shape = band(path, RING.verge, 2);
    flat(b, shape, 0.35, VERGE);
    walls(b, shape, 0, 0.35, KERB);
    // shrubs down the middle of it
    const p = sample(pieces, 6.5);
    for (let i = 1; i + 1 < p.length; i++) k.tree(p[i][0], p[i][2], 0.3, false, 0.35);
  };
  {
    const x0 = RING.x0 + 2, x1 = FLYOVERS[1].x1 + RING.ramp;
    area(k, rect(x0, RING.z - RING.verge, x1, RING.z + RING.verge), VERGE, 0.03);
  }
  // On the ground round the corner and beside the river, and again on the east bank, it is one street with the verge down its middle.
  const riverPath = pathOf(RING_PARTS.river), bankPath = pathOf(RING_PARTS.bank);
  street(k, riverPath, { lanes: 2, width: 14, sidewalk: 2 });
  verge(RING_PARTS.river);
  street(k, bankPath, { lanes: 2, width: 14, sidewalk: 1 });
  verge(RING_PARTS.bank);
  // the Signature Bridge's deck, and its approaches
  roadDeck(k, pathOf(RING_PARTS.bridge), 7, { thick: 0.9, wall: 0.9, lanes: 2, lift: 0.04, skirt: 1.6, step: 1.5 });
  for (const x of [75.5, 82.5]) b.box(x - 0.8, -2.4, RING.bridgeZ - 5.5, x + 0.8, RING.deck - 0.9, RING.bridgeZ + 5.5, CONCRETE);
  // the loops it turns round in: Dhaula Kuan's, and the one at Akshardham's gate
  for (const loopLane of [RING_LANES.near, RING_LANES.far]) street(k, pathOf(loopLane), { lanes: 1, width: 5.5, sidewalk: 1.2, zebras: false });

  for (const s of laid) if (s.lamps > 0) lampsAlong(k, s.path, s.lamps);
  lampsAlong(k, riverPath, 8.3);
  lampsAlong(k, bankPath, 7.6);

  // -------------------------------------------------------------------------
  // Ordinary buildings
  // -------------------------------------------------------------------------

  PLOTS.forEach((p, i) => clearOfStreets(k, `plot ${i + 1}`, p.x, p.z, p.x + p.w, p.z + p.d));
  ordinaryBuildings(k, PLOTS.map((p, i): Sited => ({
    x: p.x, z: p.z, w: p.w, d: p.d, y0: 0, y1: p.h, style: p.style, tint: i, roof: 'bare', signs: p.signs ?? '', quarter: p.quarter,
  })), RULES);

  // -------------------------------------------------------------------------
  // The things that stand on the tile. Each is a plain box with its name on a
  // board until its model is built.
  // -------------------------------------------------------------------------

  const boxed = (t: Thing): void => {
    const y0 = t.y ?? 0, x1 = t.x + t.w, z1 = t.z + t.d, name = `board-${t.id}`;
    if (t.id === 'connaught-place') {
      // a ring of blocks, with a way through between each pair
      const mid = (CP_R.block0 + CP_R.block1) / 2, deep = (CP_R.block1 - CP_R.block0) / 2;
      for (let i = 0; i < 18; i++) {
        if (i % 3 === 2) continue;
        const a = ((i + 0.5) / 18) * Math.PI * 2;
        b.obox(CP[0] + Math.cos(a) * mid, t.h / 2, CP[1] + Math.sin(a) * mid, deep, t.h / 2, mid * Math.tan(Math.PI / 18) + 0.4, a, BOX.centre);
      }
      k.sign(name, CP[0] + 12, t.h + 2.2, CP[1] + 17, 0, 1, 2.6, 22);
      return;
    }
    if (t.h <= 0) {
      // a thing that is ground: its name stands on two posts at its south edge
      const cx = t.x + t.w / 2;
      for (const dx of [-2.5, 2.5]) b.box(cx + dx - 0.12, 0, z1 - 0.12, cx + dx + 0.12, 2.2, z1 + 0.12, 0x6a5f52);
      b.box(cx - 3.4, 2.2, z1 - 0.1, cx + 3.4, 4.2, z1 + 0.1, 0x3a2f2a);
      k.sign(name, cx, 3.2, z1 + 0.14, 0, 1, 1.7, 6.4);
      return;
    }
    if (t.id === 'signature-bridge') {
      // the pylon's two legs stand either side of the deck and meet above it
      for (const z of [t.z, z1 - 1.6]) b.box(t.x, -1.4, z, x1, t.h * 0.6, z + 1.6, 0xe9e6dc);
      b.box(t.x, t.h * 0.6, t.z, x1, t.h, z1, 0xe9e6dc, { faces: 'NESWTB' });
    } else b.box(t.x, y0, t.z, x1, y0 + t.h, z1, BOX[t.quarter]);
    // its name on the side that faces the view: the south, or the east if that side is the longer
    const south = t.w >= t.d, face = Math.min(south ? t.w : t.d, 18), high = Math.min(2.6, Math.max(1.2, t.h * 0.3)), y = y0 + Math.max(high * 0.7, Math.min(t.h - high * 0.7, t.h * 0.6));
    if (south) k.sign(name, t.x + t.w / 2, y, z1 + 0.14, 0, 1, high, face - 0.6);
    else k.sign(name, x1 + 0.14, y, t.z + t.d / 2, 1, 0, high, face - 0.6);
  };
  for (const t of THINGS) {
    if (t.h > 0 && t.id !== 'connaught-place' && (t.y ?? 0) <= RAISINA.y) clearOfStreets(k, t.name, t.x, t.z, t.x + t.w, t.z + t.d);
    const model = MODELS[t.id];
    if (!model) boxed(t);
    else {
      try {
        model(k, t);
      } catch (e) {
        console.error(`delhi: the model of ${t.id} failed`, e);
      }
    }
  }
  for (const q of QUARTERS) {
    try {
      q.extras(k);
    } catch (e) {
      console.error("delhi: a quarter's extras failed", e);
    }
  }

  // -------------------------------------------------------------------------
  // Trees: the Ridge, and the rows along Kartavya Path
  // -------------------------------------------------------------------------

  {
    const rand = k.rand;
    for (let x = lawns.x + 3; x < lawns.x + lawns.w - 1; x += 5.4) for (const z of [lawns.z + 0.8, lawns.z + lawns.d - 0.8]) k.tree(x, z, 0.62);
    // the Ridge: woods south of Raisina Hill, round Dhaula Kuan's loop, and in the north-west corner
    const wood = (n: number, x0: number, z0: number, x1: number, z1: number, keep: (x: number, z: number) => boolean = () => true): void => {
      for (let i = 0; i < n; i++) {
        const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
        if (keep(x, z)) k.tree(x, z, 0.6 + rand() * 0.4);
      }
    };
    wood(46, -103, 32, -62, 49);
    wood(34, -103, -112, -86, -78);
  }

  // -------------------------------------------------------------------------
  // Checks, said out loud in the console while the tile is being built
  // -------------------------------------------------------------------------

  if (DEV) {
    const solids: Solid[] = THINGS.filter((t) => t.h > 0 && (t.y ?? 0) <= RAISINA.y && t.id !== 'connaught-place' && t.id !== 'signature-bridge').map((t) => ({ id: t.id, x0: t.x, z0: t.z, x1: t.x + t.w, z1: t.z + t.d, y0: t.y ?? 0, y1: (t.y ?? 0) + t.h }));
    for (const p of PLOTS) solids.push({ id: `a plot at ${p.x}, ${p.z}`, x0: p.x, z0: p.z, x1: p.x + p.w, z1: p.z + p.d, y0: 0, y1: p.h });
    checkRoads('delhi', ROUTES, Object.assign({}, ...QUARTERS.map((q) => q.RAILS)), solids);
  }

  // -------------------------------------------------------------------------
  // Places for heroes
  // -------------------------------------------------------------------------

  const heroSpots: HeroSpot[] = [
    { id: 'auto-expo', x: 41, y: 0.03, z: -30, heading: 0.5, turn: 0.35 },
    { id: 'vintage-rally', x: 47, y: 0.03, z: 31, heading: 0.4 },
    { id: 'karol-bagh', x: -80, y: 0.03, z: -47.2, heading: 0 },
    { id: 'khan-market', x: 21.5, y: 0.03, z: 38.5, heading: 0 },
    { id: 'dhaba', x: 8, y: 0.03, z: 85, heading: 0.3 },
  ];
  const parked: ParkedSpot[] = [];

  // (the Buddh circuit's ground, until it is built)
  area(k, rect(BUDDH.x0 - 3.2, BUDDH.z0 - 5.5, BUDDH.x1 + 3.2, BUDDH.z1 + 5.5), 0x86a866);

  // what stands between the things: people, trees along the avenues, autos, carts, boards over the roads
  life(k, heroSpots);

  return { routes: ROUTES, parked, heroSpots };
}

export const delhi: TileDef = { id: 'delhi', name: 'Delhi', seed: 110001, signs: SIGNS, build };

export default delhi;
