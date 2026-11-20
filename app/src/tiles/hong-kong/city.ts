// Builds everything that stands still on Hong Kong: the harbour, the Peak, the
// roads above, on and under the ground, and what stands along them. The shapes
// come from plan.ts; this file turns them into meshes with what the engine
// provides.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { ordinaryBuildings, type BuildingRules, type Lot as Plot } from '../../engine/buildings';
import type { WinSpec } from '../../engine/geo';
import { PLAZA, area, flat as fill, ground, rect, water } from '../../engine/ground';
import { joined } from '../../engine/paths';
import { train, track } from '../../engine/rail';
import { ASPHALT, CONCRETE, lampsAlong, roadDeck, street } from '../../engine/roads';
import type { Build, TileParts } from '../../engine/tile';
import { checkRoads } from '../../engine/checks';
import { fine, flat, lengths, lengths3, pathOf, rounded, stretch, type P2, type P3 } from '../../engine/corners';
import { ESCALATOR, MODELS, OPEN, extras } from './landmarks';
import { busCar, dragonBoat, ferryBoat, junkBoat, lighter, minibus, peakTramCar, sampan, tramCar, type Car } from '../../engine/movers';
import {
  BOARD, BUILDINGS, BUSES, FUNICULAR, HARBOUR, HERO_SPOTS, HILL, KOWLOON, LION, LION_GROUND, LOTS, PARKED, PEAK, PEAK_GROUND, POINT, ROUTES, RUN, SHELTER, SHORE, TRAM, TRAM_STOPS, TUNNEL,
  groundAt, type Style,
} from './plan';
import { NEON, SIGN_POOLS } from './signs';
import { drawField } from '../../engine/terrain';
import { tunnelMouth } from '../../engine/tunnel';

const SEA = 0x3f8fb0, QUAY = 0xa9a59a, ROCK = 0x9a8f7c, DARK = 0x0c0c10;
const GRASS = [0x6fa85a, 0x74ad5c, 0x67a052], SCRUB = [0x5c8f52, 0x578a55], CRAG = [0x9a8f7c, 0x8d8376, 0xa3977f];
/** The beds of rock that show where a hill is cut off at the edge of the board. */
const BEDS = [0x9a8f7c, 0x8b8170, 0xa69b86, 0x938976, 0x857b6b];
const N = BOARD.z0;
/** Half the width of the tunnel's two lanes and their kerbs. */
const TUBE = 5.1;

/** A line through corners, each rounded with radius `r`, with a point every unit or two. */
const fineRound = (corners: P2[], r: number): P2[] => fine(rounded(corners, r));

/** The mouth of the harbour tunnel: the engine's, as wide as this tunnel's two lanes, with the tunnel's name over it. */
const portal = (k: Build, open: number, hood: number): void => tunnelMouth(k, { open, hood, half: TUBE, sign: 'tunnel', dark: DARK });

export function buildCity(k: Build): TileParts {
  const b = k.b;
  const road2 = (pts: P2[]): P3[] => flat(fine(pts));
  const T = TUNNEL, I = T.island, K = KOWLOON;

  // -------------------------------------------------------------------------
  // The ground and the harbour
  // -------------------------------------------------------------------------

  // the two cuttings where the road dives into the tunnel are holes in the ground, as the water is
  const midI = (I.exit + I.entry) / 2, midK = (T.east + T.west) / 2;
  const cutIsland = rect(midI - TUBE, I.ground, midI + TUBE, I.hoodEnd);
  const cutKowloon = rect(T.kowloon.hoodEnd, midK - TUBE, T.kowloon.ground, midK + TUBE);
  ground(k, { holes: [HARBOUR, cutIsland, cutKowloon] });
  water(k, HARBOUR, { color: SEA, quay: QUAY });

  // promenades along both shores, and the ground that is green
  area(k, rect(-25, N + 0.4, -10.4, -58), PLAZA);
  area(k, rect(-25, -58, -20.4, POINT.z0), PLAZA);
  fill(k.street, rect(-25, POINT.z0, POINT.x1 - 0.4, POINT.z1), 0.018, PLAZA, { holes: [cutIsland], win: { cell: 0, storey: 1, lit: 0, kind: 1 } });
  area(k, rect(-25, POINT.z1, -20.4, SHELTER.z0), PLAZA);
  {
    // the quays round the typhoon shelter, and the car ferry's forecourt south of it
    const S = SHELTER, e = 0.4;
    area(k, [[-45, S.z0 - e], [S.x0 - e, S.z0 - e], [S.x0 - e, S.z1 + e], [S.step.x - e, S.z1 + e], [S.step.x - e, S.step.z + e], [-4 - e, S.step.z + e], [-4 - e, BOARD.z1 - e], [-45, BOARD.z1 - e]], PLAZA);
  }
  area(k, rect(22.4, -2, 28, 62), PLAZA);
  area(k, rect(10.4, -42, 28, -2), PLAZA);
  area(k, rect(34.4, 62, 43, BOARD.z1 - 0.4), PLAZA);
  area(k, rect(BOARD.x0, N, HILL.x1, HILL.north + 2.2), PLAZA); // Sheung Wan, at the foot of the north face

  // -------------------------------------------------------------------------
  // The Peak: sloping ground, with the road and the tram's line cut into it
  // -------------------------------------------------------------------------

  /** A hill's colours: green where it is gentle, scrub where it is steeper, bare rock where it is steep, and paving on a level top. */
  const slopes = (paved: number) => (y: number, level: number, x: number, z: number): number => {
    const pick = Math.abs(Math.floor(x * 0.37 + z * 0.61));
    if (level > 0.997 && y > paved - 0.3) return PLAZA;
    if (level > 0.8) return GRASS[pick % GRASS.length];
    if (level > 0.6) return SCRUB[pick % SCRUB.length];
    return CRAG[pick % CRAG.length];
  };
  // its east side ends in a wall behind the buildings of the shore, and its south side in the wall that the first leg of the road rides on
  drawField(b, PEAK_GROUND, { color: slopes(HILL.top), cut: ROCK, edges: 'ESW', strata: BEDS });
  {
    // the line of the Peak Tram: ballast on the slope, and the rails on it
    const F = FUNICULAR, y0 = F.y(F.z0), y1 = F.y(F.z1);
    b.quad([F.x - 1.5, y0 - 0.06, F.z0], [F.x + 1.5, y0 - 0.06, F.z0], [F.x + 1.5, y1 - 0.06, F.z1], [F.x - 1.5, y1 - 0.06, F.z1], [0, 1, 0], 0x8d8a83);
    for (const s of [-1, 1]) b.quad([F.x + s * 1.5, y0 - 0.6, F.z0], [F.x + s * 1.5, y1 - 0.6, F.z1], [F.x + s * 1.5, y1 - 0.06, F.z1], [F.x + s * 1.5, y0 - 0.06, F.z0], [s, 0, 0], 0x7b7a7e);
    track(k, pathOf([[F.x, y0 + 0.02, F.z0], [F.x, y1 + 0.02, F.z1]]));
  }

  // -------------------------------------------------------------------------
  // Streets on the ground
  // -------------------------------------------------------------------------

  const lane1 = { lanes: 1, width: 5, sidewalk: 0 }, lane1walk = { lanes: 1, width: 5, sidewalk: 2 };
  // the Island's shore road, and the lanes that turn at each end of it
  const shore = pathOf(road2([[-30, -80], [-30, 60]]));
  street(k, shore, { lanes: 2, width: 10, sidewalk: 0 });
  street(k, pathOf(flat(fineRound([[SHORE.nb, -80], [SHORE.nb, -101], [-13, -101], [-13, -87], [SHORE.sb, -87], [SHORE.sb, -80]], 4))), lane1);
  const causeway = pathOf(flat(fineRound([[-43.5, 108], [-47.5, 108], [-47.5, 68], [SHORE.nb, 68], [SHORE.nb, 60]], 4)));
  street(k, causeway, lane1walk);
  street(k, pathOf(flat(PEAK.foot)), { lanes: 1, width: 4, sidewalk: 0 });
  // on to the Convention Centre's point, and down to the tunnel
  street(k, pathOf(road2([[-30, 24.5], [midI + TUBE - 0.1, 24.5]])), { lanes: 2, width: 10, sidewalk: 0 });
  {
    const down = RUN.loop.filter((p) => Math.abs(p[0] - I.entry) < 0.01 && p[2] > 30 && p[2] < I.mouth + 6.5).map((p): P3 => [midI, p[1], p[2]]).sort((p, q) => p[2] - q[2]);
    street(k, pathOf([[midI, 0, 24.5], ...down]), { lanes: 2, width: TUBE * 2 + 0.2, sidewalk: 0, zebras: false });
    placed(k, midI, I.mouth, 90, (q) => portal(q, I.mouth - I.ground, I.hoodEnd - I.mouth));
  }

  // Kowloon
  const salisbury = pathOf(road2([[K.salisbury, -47], [K.salisbury, 58.5]]));
  const nathan = pathOf(road2([[K.salisbury, K.nathan], [97, K.nathan]]));
  street(k, salisbury, { lanes: 2, width: 10, sidewalk: 2 });
  street(k, nathan, { lanes: 4, width: 20, sidewalk: 3 });
  const mongKok = pathOf(road2([[K.salisbury, -44.5], [73, -44.5]]));
  const jordan = pathOf(road2([[68, -44.5], [68, K.nathan]]));
  const chatham = pathOf(road2([[K.chatham, K.nathan], [K.chatham, 24]]));
  const hungHom = pathOf(road2([[66.5, 24], [66.5, 57.5]]));
  street(k, mongKok, { lanes: 3, width: 15, sidewalk: 2 });
  street(k, jordan, { lanes: 2, width: 10, sidewalk: 2 });
  street(k, chatham, { lanes: 2, width: 10, sidewalk: 2 });
  street(k, hungHom, { lanes: 3, width: 15, sidewalk: 2 });
  street(k, pathOf(flat(fineRound([[37.5, -47], [37.5, -103.5], [K.east, -103.5], [K.east, -49.5], [73, -49.5]], 4))), lane1walk);
  const choiHung = pathOf(flat(fineRound([[74, 27.5], [K.east, 27.5], [K.east, 96.5], [71.5, 96.5], [71.5, 57.5]], 4)));
  street(k, choiHung, lane1walk);
  // where Nathan Road's traffic turns back at its east end
  area(k, rect(86, -13, 100, 7), ASPHALT, 0.026);
  {
    // down to the tunnel, beside the Coliseum
    const Kn = T.kowloon;
    const down = RUN.loop.filter((p) => Math.abs(p[2] - T.west) < 0.01 && p[0] > Kn.mouth - 6.5 && p[0] < Kn.ground + 2).map((p): P3 => [p[0], p[1], midK]).sort((p, q) => p[0] - q[0]);
    street(k, pathOf(down), { lanes: 2, width: TUBE * 2 + 0.2, sidewalk: 0, zebras: false });
    placed(k, Kn.mouth, midK, 180, (q) => portal(q, Kn.ground - Kn.mouth, Kn.mouth - Kn.hoodEnd));
  }

  // -------------------------------------------------------------------------
  // Roads above the ground
  // -------------------------------------------------------------------------

  const DECK = { thick: 0.8, wall: 0.8, lift: 0.05, step: 1.5 };
  /** A pier under a deck, from the ground (or from under the water) up to its underside. */
  const pier = (x: number, z: number, top: number, w = 0.55): void => b.box(x - w, -1.6, z - w, x + w, top, z + w, CONCRETE, { faces: 'NESW' });
  /** Piers under a road in space, every so often, wherever it is high enough to need one. */
  const piers = (pts: P3[], every: number, ok: (p: P3) => boolean = () => true): void => {
    const s = lengths3(pts);
    let next = every / 2;
    pts.forEach((p, i) => {
      if (s[i] < next) return;
      next += every;
      if (p[1] > 2.8 && ok(p)) pier(p[0], p[2], p[1] - DECK.thick);
    });
  };

  // the viaduct: the shore road's southbound lane, on stilts along the water and across the typhoon shelter
  roadDeck(k, pathOf(RUN.viaduct), 2.9, { ...DECK, lanes: 1, skirt: 2.4 });
  piers(RUN.viaduct, 11);

  // the Peak road
  {
    const P = PEAK, low = stretch(P.road, 0, P.sHill + 0.3);
    // its ramp on stilts along the breakwater, and the flyover over the shore road and the tram
    roadDeck(k, pathOf(low), P.half, { ...DECK, lanes: 2, skirt: 2.4 });
    piers(low, 10, (p) => p[2] > P.z + 7.5);
    // the flyover's own piers stand where nothing runs: on the promenade, between road and tram, on the pavement, and in the gap between the buildings
    for (const x of [-24.4, -35.15, -43, -52]) pier(x, P.z + (x > -25 ? 0.4 : 0), P.fly - DECK.thick, x === -35.15 ? 0.14 : 0.5);
    // up the hill its sides run down to the ground, as walls
    const end = P.sTop + 1.4;
    roadDeck(k, pathOf(stretch(P.road, P.sHill, end)), P.half, { ...DECK, lanes: 2, skirt: 999 });
    // on the summit it is a street again, with its turning place
    street(k, pathOf(stretch(P.road, end, P.total)), { lanes: 2, width: P.half * 2 - 0.6, sidewalk: 0 });
    street(k, pathOf(flat(P.summit, HILL.top)), { lanes: 1, width: 4.4, sidewalk: 0 });
  }

  // -------------------------------------------------------------------------
  // Lion Rock, and the tunnel through it
  // -------------------------------------------------------------------------

  {
    const L = LION, gate = L.gate, gz0 = L.street - L.half, gz1 = L.street + L.half, gx0 = L.lane - L.half, gx1 = L.lane + L.half;
    // rock and scrub, with a mouth for the road in its west face and another in its south face
    drawField(b, LION_GROUND, {
      color: slopes(Infinity), cut: ROCK, edges: 'NESW', strata: BEDS,
      gap: (edge, at) => ((edge === 'W' && at > gz0 && at < gz1) || (edge === 'S' && at > gx0 && at < gx1) ? gate : 0),
    });
    // concrete round each mouth, and darkness a little way in
    b.box(L.x0 - 0.5, 0, gz0 - 0.9, L.x0 + 0.4, gate + 1.2, gz0, CONCRETE);
    b.box(L.x0 - 0.5, 0, gz1, L.x0 + 0.4, gate + 1.2, gz1 + 0.9, CONCRETE);
    b.box(L.x0 - 0.5, gate, gz0, L.x0 + 0.4, gate + 1.2, gz1, CONCRETE, { faces: 'NESWTB' });
    b.box(L.x0 + 3, 0, gz0, L.x0 + 3.1, gate, gz1, DARK, { faces: 'W' });
    b.box(gx0 - 0.9, 0, L.z1 - 0.4, gx0, gate + 1.2, L.z1 + 0.5, CONCRETE);
    b.box(gx1, 0, L.z1 - 0.4, gx1 + 0.9, gate + 1.2, L.z1 + 0.5, CONCRETE);
    b.box(gx0, gate, L.z1 - 0.4, gx1, gate + 1.2, L.z1 + 0.5, CONCRETE, { faces: 'NESWTB' });
    b.box(gx0, 0, L.z1 - 3.1, gx1, gate, L.z1 - 3, DARK, { faces: 'S' });
  }

  // -------------------------------------------------------------------------
  // Rails: the tram, and the buses on Nathan Road
  // -------------------------------------------------------------------------

  {
    const rails = pathOf(flat(TRAM, 0.04), true);
    street(k, rails, { lanes: 1, width: 3, sidewalk: 0, color: 0x55575d, zebras: false });
    track(k, rails, { sleepers: false });
    // most trams are dark green; a few are painted all over, as the ones that carry advertising are
    const liveries = [tramCar(), tramCar(0xb5332a, 0xf2e6c4), tramCar(), tramCar(0x2f5fa8, 0xf2d58f), tramCar(), tramCar(0xe0a92e, 0x2a2c31)];
    // every tram stops at every stop, for as long as the others do, so that they keep their distance from one another
    const along = lengths(TRAM);
    const stops = TRAM_STOPS.map(([x, z]) => along[TRAM.reduce((best, p, i) => (Math.hypot(p[0] - x, p[1] - z) < Math.hypot(TRAM[best][0] - x, TRAM[best][1] - z) ? i : best), 0)]).sort((a, c) => a - c);
    liveries.forEach((car, i) => train(k, rails, { cars: 1, speed: 10, from: (rails.length * i) / liveries.length + 7, car, stops, dwell: 4 }));
    // at each stop a shelter on the landward side of the rails, a board with its name, and people waiting
    for (const [sx, sz] of TRAM_STOPS) {
      const x = (sx < -50 ? sx : SHORE.tramN) - 3.1;
      b.box(x - 0.7, 3.0, sz - 2.4, x + 0.7, 3.2, sz + 2.4, 0x1f6b3a, { faces: 'NESWTB', top: 0xf2e6c4 });
      for (const dz of [-2.1, 2.1]) b.box(x - 0.58, 0, sz + dz - 0.08, x - 0.42, 3.0, sz + dz + 0.08, 0x1f6b3a, { faces: 'NESW' });
      b.box(x - 0.64, 0.9, sz - 2.1, x - 0.58, 2.4, sz + 2.1, 0xbfd3df, { faces: 'EW' });
      k.sign('tram-stop', x + 0.72, 3.5, sz, 1, 0, 0.6, 4.4);
      b.box(x + 0.64, 3.2, sz - 1.0, x + 0.7, 3.8, sz + 1.0, 0x1f6b3a, { faces: 'NESWT' });
      for (let i = 0; i < 3; i++) k.person(x + (k.rand() - 0.5) * 0.5, sz - 1.6 + k.rand() * 3.2);
      k.lights.push({ x, z: sz, r: 6, color: '#fff0d6', k: 0.6 });
    }
    const buses = pathOf(flat(BUSES, 0.02), true);
    [busCar(), busCar(0xe8c24a, 0x3f6fb5), busCar()].forEach((car, i) => train(k, buses, { cars: 1, speed: 11, from: (buses.length * i) / 3, car }));
  }

  // -------------------------------------------------------------------------
  // What stands on the tile: the things that have names, and the ordinary buildings between them
  // -------------------------------------------------------------------------

  for (const l of LOTS) {
    const model = MODELS[l.id];
    if (!model) throw new Error(`Hong Kong: nothing is built on the lot called "${l.id}".`);
    model(k, l);
  }
  {
    const PALETTE: Record<Style, number[]> = {
      tonglau: [0xd9c7a8, 0xc9d4c0, 0xe0b9a8, 0xbfd0d9, 0xe6d9a8, 0xcbb8a0, 0xd6c0cf],
      neon: [0x3d3856, 0x2f3b55, 0x4a3b58, 0x38324e],
      pencil: [0xe9dcc3, 0xdfe6d4, 0xe6c7b8, 0xcfe0e8, 0xf0d9c4, 0xd9cfe0],
      estate: [0xe9e3d6, 0xd9e6dc, 0xf0dcc0],
      glass: [0x8fb4cf, 0x7aa3c2, 0x9cc3d3, 0x6f95b5],
      office: [0xe9dcc3, 0xdfe6d4, 0xcfe0e8, 0xe6c7b8],
      house: [0xf2efe6, 0xf0e3c4, 0xe6d3c8, 0xd9dcc8],
    };
    // a storey here is lower than the engine's, as Hong Kong's are: more of them fit under the same roof
    const WIN: Record<Style, WinSpec> = {
      tonglau: { cell: 2.0, storey: 3.4, lit: 0.45, kind: 2 },
      neon: { cell: 2.2, storey: 3.4, lit: 0.25, kind: 3 },
      pencil: { cell: 1.5, storey: 2.6, lit: 0.5, kind: 4 },
      estate: { cell: 1.5, storey: 2.8, lit: 0.5, kind: 0 },
      glass: { cell: 1.8, storey: 3.4, lit: 0.44, kind: 1 },
      office: { cell: 2.2, storey: 3.4, lit: 0.38, kind: 2 },
      house: { cell: 2.4, storey: 3.5, lit: 0.45, kind: 0 },
    };
    type Sited = Plot & { island: boolean };
    const plots = BUILDINGS.map((o, i): Sited => {
      const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, onHill = o.y0 === -1;
      // a building on the hill has its foot in the slope, and is as tall as it is from the ground at its middle
      const y0 = onHill ? Math.min(groundAt(o.x0, o.z0), groundAt(o.x1, o.z0), groundAt(o.x0, o.z1), groundAt(o.x1, o.z1)) - 0.4 : o.y0 ?? 0;
      return {
        x: o.x0, z: o.z0, w: o.x1 - o.x0, d: o.z1 - o.z0, y0, y1: (onHill ? groundAt(cx, cz) : y0) + o.h,
        style: o.style, tint: i * 7 + 3, roof: o.roof ?? 'bare', crown: o.crown, signs: o.faces ?? '', sign: o.sign, island: cx < 0,
      };
    });
    const rules: BuildingRules<Sited> = {
      styles: Object.fromEntries((Object.keys(PALETTE) as Style[]).map((s) => [s, { palette: PALETTE[s], win: WIN[s], shops: s === 'tonglau' || s === 'office', neon: s === 'neon' }])),
      roofs: [0x8d8a83, 0x7b7a7e, 0x9d988f, 0x6f7378],
      hip: () => ({ colors: [0xb5654a, 0x3f7a5a, 0xa85a44, 0x4f6f8a] }),
      pool: (p) => SIGN_POOLS[p.island ? 'island' : 'kowloon'],
      neon: NEON,
    };
    ordinaryBuildings(k, plots, rules);
  }
  extras(k);

  // The big screen, which shows what is playing. It hangs on the east face of
  // the tall block at the east end of Nathan Road's north side: the waterfront's
  // faces look west over the harbour, away from the view the tile opens with,
  // and this face looks towards it with nothing in front. The face is 17 long,
  // so the screen's frame runs a little past each corner.
  {
    const o = BUILDINGS.find((e) => e.id === 'nathan-n3')!;
    const H = 10, zc = (o.z0 + o.z1) / 2, yc = o.h - 0.6 - H / 2 - 0.3;
    const hw = (H * 16) / 9 / 2 + 0.3, hh = H / 2 + 0.3;
    b.box(o.x1, yc - hh, zc - hw, o.x1 + 0.1, yc + hh, zc + hw, 0x14141c, { faces: 'NESWTB' });
    k.sign('screen', o.x1 + 0.13, yc, zc, 1, 0, H);
    k.lights.push({ x: o.x1 + 6, z: zc, r: 18, color: '#ff3d9a', k: 0.55 });
  }

  // the Convention Centre's link, over the shore road and the tram
  b.box(-45, 6.6, 8, -19, 10.2, 14, 0xdfe6ea, { faces: 'NESWTB', win: { cell: 2.6, storey: 3.6, lit: 0.6, kind: 1 } });
  // the breakwater of the typhoon shelter, and a few boats in it
  b.box(SHELTER.x1 - 0.6, -1.4, SHELTER.z0 + 4.5, SHELTER.x1 + 0.6, 0.5, SHELTER.step.z, QUAY);
  {
    // moored in rows, as they are: clear of the viaduct's piers
    const AWNINGS = [0x4f8f6a, 0xc8523f, 0x3f6fa3, 0xd1b25a, 0xe9e3d6];
    let n = 0;
    for (const x of [-39.4, -35.8, -32.2, -23.6]) {
      for (let z = 77; z < (x < -27 ? 100 : 96); z += 5.6) {
        if ((n * 7) % 5 !== 3) sampan(b, x, z + ((n * 3) % 4) * 0.3, Math.PI / 2 + (((n * 5) % 7) - 3) * 0.04, AWNINGS[n % AWNINGS.length]);
        n++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // On the water, and up the hill
  // -------------------------------------------------------------------------

  // A boat's shape has its waterline at y = 0, and a train rides a little above the line it follows.
  const AFLOAT = -0.9 - 0.12;
  /** Runs a car to and fro along a line that ends at both ends: out, a wait, back, a wait. It is the same at both ends, and never turns round. */
  const shuttle = (car: Car, line: P3[], speed: number, wait: number, from: 0 | 1): void => {
    const pts = line.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const { path, starts } = joined([pts, [...pts].reverse()], true);
    const far = starts[1], stand = car.length / 2 + 0.3;
    train(k, path, { cars: 1, speed, car, ends: [far, 0], stops: [far - stand, path.length - stand], turnDwell: wait, from: from ? far + stand : stand });
  };
  /** Sails a boat round a closed course for ever. */
  const sail = (car: Car, course: P2[], speed: number, from = 0): void => {
    const path = pathOf(flat(course, AFLOAT), true);
    train(k, path, { cars: 1, speed, car, from: from * path.length });
  };
  {
    // the Star Ferry: two boats that pass each other, between Central's piers and Tsim Sha Tsui
    const a: P2 = [-4.6, -90.5], c: P2 = [6.8, -38.9], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const ox = ((c[1] - a[1]) / l) * 2.3, oz = (-(c[0] - a[0]) / l) * 2.3;
    const boat = ferryBoat();
    shuttle(boat, flat(fine([[a[0] + ox, a[1] + oz], [c[0] + ox, c[1] + oz]], 1), AFLOAT), 4.2, 9, 0);
    shuttle(boat, flat(fine([[a[0] - ox, a[1] - oz], [c[0] - ox, c[1] - oz]], 1), AFLOAT), 4.2, 9, 1);
    // a junk under red sails, round the south of the harbour
    sail(junkBoat(), fine(rounded([[-11, 60], [17, 60], [17, 93], [-11, 93]], 10, true)), 3.2);
    // dragon boats in Hung Hom's bay: three crews, down the course and back
    [0xc8322b, 0xe8c24a, 0x3f6fb5].forEach((team, i) => {
      // each crew's lane out and its lane back are far enough from the next crew's that no two cross paddles
      const x = 23.9 + i * 3.4;
      sail(dragonBoat(team), fine(rounded([[x, 68], [x, 108], [x + 1.7, 108], [x + 1.7, 68]], 0.85, true)), 6.4 + i * 0.5, 0.02 + i * 0.03);
    });
    // what lies at anchor: a lighter working cargo off the Convention Centre, another off Central, sampans off Tsim Sha Tsui
    lighter(b, 7.5, 16, Math.PI / 2 - 0.2);
    lighter(b, 8, -104, 0.15);
    sampan(b, 4, -8, 0.4, 0xc8523f);
    sampan(b, 3, 2, -0.5);
    sampan(b, 18, 30, 1.2, 0x3f6fa3);
    // the Peak Tram's car, up and down its incline
    const F = FUNICULAR, z0 = F.z0 + 1, z1 = F.z1 - 0.4, n = Math.ceil(z1 - z0);
    shuttle(peakTramCar(), Array.from({ length: n + 1 }, (_, i): P3 => [F.x, F.y(z0 + ((z1 - z0) * i) / n) + 0.02, z0 + ((z1 - z0) * i) / n]), 5, 7, 0);
  }

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  // where nothing is planted and nobody stands: every lot, and the open ground in front of the temple and round the Peak Tram's lower stop
  const built = [...LOTS, ...BUILDINGS, ...OPEN.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }))];
  const inLot = (x: number, z: number, pad: number): boolean => built.some((l) => x > l.x0 - pad && x < l.x1 + pad && z > l.z0 - pad && z < l.z1 + pad);
  {
    // the Peak is green wherever nothing is built: on every level, clear of the road, the tram's cut and the houses
    const road = PEAK.road, clear = (PEAK.half + 1.7) ** 2;
    const nearRoad = (x: number, z: number): boolean => road.some((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2 < clear);
    const spots: P2[] = [];
    for (let i = 0; i < 2600 && spots.length < 190; i++) {
      const x = HILL.x0 + 1.6 + k.rand() * (HILL.x1 - HILL.x0 - 3.2), z = N + 2 + k.rand() * (HILL.z1 - N - 3);
      const y = groundAt(x, z);
      if (y > HILL.top - 0.4 && x < -63.5) continue; // the summit is paved
      if (nearRoad(x, z) || inLot(x, z, 1.5)) continue;
      if (Math.abs(x - FUNICULAR.x) < 2.6 && z < FUNICULAR.z1 + 4) continue;
      if (Math.abs(x - ESCALATOR.x) < 2.8 && z < ESCALATOR.z[ESCALATOR.z.length - 1] + 5) continue;
      if (spots.some((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 < 8)) continue;
      spots.push([x, z]);
      k.tree(x, z, 0.55 + k.rand() * 0.5, false, y);
    }
    // and a few cling to Lion Rock
    for (let i = 0; i < 200 && spots.length < 204; i++) {
      const x = LION.x0 + 1.5 + k.rand() * (LION.x1 - LION.x0 - 3), z = LION.z0 + 1.5 + k.rand() * (LION.z1 - LION.z0 - 3);
      const y = groundAt(x, z);
      if (y < 1 || y > 20 || inLot(x, z, 0) || spots.some((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 < 10)) continue;
      spots.push([x, z]);
      k.tree(x, z, 0.5 + k.rand() * 0.35, false, y);
    }
  }
  // banyans that have taken root in the wall behind Wan Chai, as they do in Hong Kong's old walls of stone
  for (const [z, y] of [[-4.5, 9], [3, 8], [18, 7.5], [31.5, 5.5], [-32.4, 12]]) k.tree(HILL.x1 + 0.2, z, 0.42, false, y);
  // along both promenades, round the racecourse, and on the Convention Centre's point
  for (let z = -54; z < 0; z += 9) k.tree(-22.6, z, 0.6);
  for (let z = 6; z < 60; z += 8) k.tree(26.9, z, 0.55);
  for (let z = -38; z < -4; z += 8.5) k.tree(29, z, 0.55);
  for (const [x, z] of [[-7.2, 31], [-22.5, 44], [-44, 104], [39, 66], [39, 78], [39, 90], [39, 102]]) k.tree(x, z, 0.6);
  for (const [x, z] of [[82, -55.6], [90, -55.6], [82, 46], [80, 90.4], [47, 60], [58, 62], [47, 88], [58, 90]]) k.tree(x, z, 0.65);

  // -------------------------------------------------------------------------
  // Light at night: lamps on the streets, and a string of lamps along every road above the ground
  // -------------------------------------------------------------------------

  for (let z = -76; z < 60; z += 17) k.lamp(-24.3, z, Math.PI);
  lampsAlong(k, nathan, 11.2);
  lampsAlong(k, salisbury, 6.2);
  lampsAlong(k, mongKok, 8.7);
  lampsAlong(k, jordan, 6.2);
  lampsAlong(k, chatham, 6.2);
  lampsAlong(k, hungHom, 8.7);
  lampsAlong(k, choiHung, 3.7);
  lampsAlong(k, causeway, 3.7);
  // the road round the north of Kowloon has lamps as far as the tunnel's mouths, and none inside the hill
  lampsAlong(k, pathOf(road2([[37.5, -50], [37.5, -100]])), 3.7);
  lampsAlong(k, pathOf(road2([[K.east, -50], [K.east, -82]])), 3.7);
  lampsAlong(k, pathOf(road2([[42, -103.5], [74, -103.5]])), 3.7);
  {
    const string = (pts: P3[], hw: number, every: number, to = Infinity): void => {
      const along = lengths3(pts);
      let next = every / 2;
      for (let i = 1; i < pts.length - 1; i++) {
        if (along[i] < next || along[i] > to) continue;
        next = along[i] + every;
        const tx = pts[i + 1][0] - pts[i - 1][0], tz = pts[i + 1][2] - pts[i - 1][2], l = Math.hypot(tx, tz) || 1;
        for (const side of [-1, 1]) {
          k.glows.push({ x: pts[i][0] + (-tz / l) * (hw - 0.22) * side, y: pts[i][1] + 1.25, z: pts[i][2] + (tx / l) * (hw - 0.22) * side, sx: 0.4, sy: 0.4, sz: 0.4, color: '#ffc27a' });
        }
        if (i % 2 === 0) k.lights.push({ x: pts[i][0], z: pts[i][2], r: 12, color: '#ffc98a', k: 0.45 });
      }
    };
    string(RUN.viaduct, 2.9, 8);
    string(PEAK.road, PEAK.half, 8, PEAK.sTop);
  }
  for (const [x, z] of [[-93, -27], [-70, -19], [-62, -30]]) k.lights.push({ x, z, r: 14, color: '#ffe2ae', k: 0.5 });

  // -------------------------------------------------------------------------
  // People: still figures, as on a model railway
  // -------------------------------------------------------------------------

  {
    // nobody stands in a building, where a hero is put on show, or where something is parked
    const onShow = (x: number, z: number): boolean => [...HERO_SPOTS, ...PARKED, { x: 98.7, z: -3 }, { x: 13.6, z: -27.2 }].some((h) => Math.hypot(h.x - x, h.z - z) < 4.6);
    const crowd = (n: number, x0: number, z0: number, x1: number, z1: number): void => {
      for (let i = 0; i < n; i++) {
        const x = x0 + k.rand() * (x1 - x0), z = z0 + k.rand() * (z1 - z0);
        if (!inLot(x, z, 0.5) && !onShow(x, z)) k.person(x, z, groundAt(x, z));
      }
    };
    crowd(34, -24.6, -56, -20.6, 0); // Central's promenade
    crowd(18, -24, -83.6, -11.5, -60); // round the wheel
    crowd(7, -24, -111.5, -11, -104.2); // by the ferry piers
    crowd(40, 23, 2, 27.4, 58); // the Avenue of Stars
    crowd(16, 11.5, -40, 27, -3); // round the Clock Tower
    crowd(22, 35, 64, 42, 110); // watching the dragon boats
    crowd(18, -82, -22.5, -64.5, -17); // at the lookout on the Peak
    crowd(10, -44.8, 75, -42.7, 101); // on the quay of the typhoon shelter
    crowd(12, -8.1, 20, -6.5, 50); // on the Convention Centre's point, by the water
    crowd(8, -84.5, -111.5, -73.5, -102.6); // Sheung Wan
    for (const z of [-14.5, 8.5]) crowd(18, 42, z - 1.1, 96, z + 1.1); // Nathan Road's pavements
  }

  // public light buses, waiting: a green one where Nathan Road's traffic turns back, and a red one by the Star Ferry
  minibus(b, 98.7, -3, Math.PI / 2, 0x2f8f5f);
  minibus(b, 13.6, -27.2, 0, 0xc8322b);

  if (import.meta.env.DEV) {
    const solids = [
      ...LOTS.map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: l.y0 ?? 0, y1: (l.y0 ?? 0) + l.h })),
      ...BUILDINGS.map((o) => {
        const y0 = o.y0 === -1 ? groundAt((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2) : o.y0 ?? 0;
        return { id: o.id, x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, y0, y1: y0 + o.h };
      }),
    ];
    checkRoads('Hong Kong', ROUTES, { tram: flat(TRAM, 0.04), buses: flat(BUSES, 0.02) }, solids);
  }

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
