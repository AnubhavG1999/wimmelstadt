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
  AXIS_Z, BUDDH, CHANDNI, CP, CP_R, EAST_BANK, GROUNDS, HERO_PLACES, HEX_LANES, PLOTS, RAISINA, RING, STOREY, THINGS, WATERS, WEST_BANK, hexCorner,
  type Quarter, type Thing,
} from './plan';
import { AXIS } from './axis';
import { KINDS } from './traffic';
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
  // a lawn north-east of the hexagon, between it and the Ring Road: kept low, because the Auto Expo's turntable is seen across it
  area(k, [[36.9, -20.5], [36.9, -23], [51, -23], [51, 3.9]], LAWN);
  // the lawns inside India Gate's hexagon
  area(k, [0, 1, 2, 3, 4, 5].map((i) => hexCorner(i, HEX_LANES[0] - 4.5)), LAWN);
  // the gardens and forecourts that things stand in
  for (const [id, [x0, z0, x1, z1]] of Object.entries(GROUNDS)) {
    // (a garden with a tank in it has its lawn laid round the tank's hole, or the lawn would be a lid on the water)
    const tank = WATERS[id];
    if (GARDENS.includes(id) && tank) flat(k.street, rect(x0, z0, x1, z1), 0.02, LAWN, { win: { cell: 0, storey: 1, lit: 0, kind: 1 }, holes: [rect(...tank.at)] });
    else if (GARDENS.includes(id)) area(k, rect(x0, z0, x1, z1), LAWN);
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
    // the verge under the flyovers, left open where the two streets pass under them
    let x = RING.x0 + 2;
    for (const [a, c] of [...FLYOVERS.map((f) => [f.over - 7.6, f.over + 7.6]), [FLYOVERS[1].x1 + RING.ramp, 0]]) {
      area(k, rect(x, RING.z - RING.verge, a, RING.z + RING.verge), VERGE, 0.022);
      x = c;
    }
  }
  // On the ground round the corner and beside the river, and again on the east bank, it is one street with the verge down its middle.
  const riverPath = pathOf(RING_PARTS.river), bankPath = pathOf(RING_PARTS.bank);
  street(k, riverPath, { lanes: 2, width: 14, sidewalk: 2 });
  verge(RING_PARTS.river);
  street(k, bankPath, { lanes: 2, width: 14, sidewalk: 1 });
  verge(RING_PARTS.bank);
  // The Signature Bridge's deck. Either approach is a bank of earth with the road on it: a ramp, and the turn onto the bridge at the deck's height.
  const DECK = { thick: 0.9, wall: 0.9, lanes: 2, lift: 0.04, step: 1.5 };
  for (const approach of [RING_PARTS.rise, RING_PARTS.fall]) roadDeck(k, pathOf(approach), 7, { ...DECK, skirt: 99 });
  roadDeck(k, pathOf(RING_PARTS.span), 7, DECK);
  {
    const z0 = RING.bridgeZ - 6.9, z1 = RING.bridgeZ + 6.9, under = RING.deck - 0.9, bed = -2.4;
    // an abutment where each approach ends, which closes the bank of earth off and stands in the water
    const west = RING.x1 + 11.4, east = RING.x2 - 11.4;
    b.box(WEST_BANK - 0.5, bed, z0, west, under, z1, CONCRETE, { faces: 'NESWT' });
    b.box(east, bed, z0, EAST_BANK + 0.4, under, z1, CONCRETE, { faces: 'NESWT' });
    // and two piers in the river between them
    for (const u of [1 / 3, 2 / 3]) {
      const x = west + (east - west) * u;
      b.box(x - 0.8, bed, RING.bridgeZ - 5.5, x + 0.8, under, RING.bridgeZ + 5.5, CONCRETE);
    }
  }
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
  // on every ordinary roof but a shed's or a bungalow's: the black water tanks of Delhi's roofs, each on its stand
  PLOTS.forEach((p, i) => {
    if (p.style === 'shed' || p.style === 'lutyens') return;
    for (let j = 0, n = p.w * p.d > 90 ? 2 : 1; j < n; j++) {
      const x = p.x + 1.4 + j * 1.6, z = p.z + 1.4 + ((i + j) % 2) * 0.5;
      b.box(x - 0.5, p.h, z - 0.5, x + 0.5, p.h + 0.4, z + 0.5, 0x9a958a);
      b.cyl(x, z, p.h + 0.4, p.h + 1.35, 0.5, 0.5, 8, 0x1d1e22, { cap: 0x26272b });
      b.cyl(x, z, p.h + 1.35, p.h + 1.45, 0.2, 0.2, 6, 0x1d1e22);
    }
  });

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
  // The screen for music: on the roof of Connaught Place's south-east block,
  // which is kept clear for it, where the Outer Circle's hoardings stand in
  // life. It looks to the south-east, on a frame of steel with stays behind.
  // -------------------------------------------------------------------------

  {
    const cp = THINGS.find((t) => t.id === 'connaught-place')!;
    const a = Math.PI / 4, r = CP_R.block1 - 1.5, nx = Math.cos(a), nz = Math.sin(a), tx = -nz, tz = nx, STEEL = 0x8a9098;
    const x = CP[0] + nx * r, z = CP[1] + nz * r, roof = cp.h - 0.38, high = 4.2, foot = roof + 0.9, y = foot + high / 2;
    const w = k.sign(SCREEN.id, x + nx * 0.16, y, z + nz * 0.16, nx, nz, high);
    b.obox(x, y, z, 0.12, high / 2 + 0.18, w / 2 + 0.18, a, 0x15161c, { faces: 'B' });
    for (const s of [-1, 0, 1]) {
      const px = x + tx * w * 0.4 * s - nx * 0.25, pz = z + tz * w * 0.4 * s - nz * 0.25;
      b.cyl(px, pz, roof, foot + 0.3, 0.13, 0.13, 4, STEEL, { cap: false });
      b.beam([px, y + high * 0.3, pz], [px - nx * 2.3, roof, pz - nz * 2.3], 0.07, 0.07, STEEL);
    }
    k.lights.push({ x: x + nx * 5, z: z + nz * 5, r: 11, color: '#dfe6ff', k: 0.5 });
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
    // (east of x -80.5 the wood gives way to a lawn, where the wedding is)
    wood(64, -103, 32, -62, 49, (x) => x < -80.5);
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

  const heroSpots: HeroSpot[] = HERO_PLACES.map((h) => ({ ...h }));
  const parked: ParkedSpot[] = [];

  // the grass the Buddh circuit lies on: its kerbs, gravel, pit lane and banking are laid on this by its own model
  area(k, rect(BUDDH.x0 - 3.2, BUDDH.z0 - 5.5, BUDDH.x1 + 3.2, BUDDH.z1 + 5.5), 0x86a866);

  // what stands between the things: people, trees along the avenues, autos at their stands, carts, boards over the roads
  parked.push(...life(k, heroSpots));
  // three of the city's buses at the terminal north of the fort, their noses to the south
  for (const x of [43.6, 47.3, 51]) parked.push({ x, y: 0.03, z: -106.9, heading: Math.PI / 2, type: 'city-bus' });

  return { routes: ROUTES, parked, heroSpots, kinds: KINDS };
}

export const delhi: TileDef = { id: 'delhi', name: 'Delhi', seed: 110001, signs: SIGNS, place: { lon: 77.2, lat: 28.6 }, build };

export default delhi;
