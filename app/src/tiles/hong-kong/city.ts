// Builds everything that stands still on Hong Kong: the harbour, the Peak, the
// roads above, on and under the ground, and what stands along them. The shapes
// come from plan.ts; this file turns them into meshes with what the engine
// provides.

import { placed } from '../../engine/build';
import { LAWN, PLAZA, area, flat as fill, ground, rect, terrace, water } from '../../engine/ground';
import { train, track } from '../../engine/rail';
import { ASPHALT, CONCRETE, lampsAlong, roadDeck, street } from '../../engine/roads';
import type { Build, TileParts } from '../../engine/tile';
import { checkRoads } from './check';
import { fine, flat, lengths3, pathOf, rounded, stretch, type P2, type P3 } from './geom';
import {
  BOARD, BUSES, FILL, FUNICULAR, HARBOUR, HERO_SPOTS, HILL, KOWLOON, LEVELS, LOTS, PARKED, PEAK, POINT, RACECOURSE, ROUTES, RUN, SHELTER, SHORE, TRAM, TUNNEL,
  hillHeight, type Lot,
} from './plan';

const SEA = 0x3f8fb0, QUAY = 0xa9a59a, ROCK = 0x9a8f7c, DARK = 0x0c0c10, TURF = 0x5fa04e;
const N = BOARD.z0;
/** Half the width of the tunnel's two lanes and their kerbs. */
const TUBE = 5.1;

/** A line through corners, each rounded with radius `r`, with a point every unit or two. */
const fineRound = (corners: P2[], r: number): P2[] => fine(rounded(corners, r));

/**
 * The mouth of the tunnel, as seen from the land: the road runs in towards +x
 * and down, and its roof begins at x = 0. An open cutting with a low wall
 * round it, a hood with a wall between the two tubes, and darkness a little
 * way in, which is where a vehicle goes out of sight.
 */
function portal(k: Build, open: number, hood: number): void {
  const b = k.b, W = TUBE;
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? -W - 0.5 : W, z1 = s < 0 ? -W : W + 0.5;
    b.box(-open, -8, z0, hood, 0, z1, CONCRETE, { faces: s < 0 ? 'S' : 'N' });
    b.box(-open - 0.3, 0, s < 0 ? -W - 0.6 : W, hood + 0.3, 0.9, s < 0 ? -W : W + 0.6, CONCRETE);
    b.box(0, 0.9, s < 0 ? -W - 1.2 : W, hood + 0.5, 4.3, s < 0 ? -W : W + 1.2, CONCRETE);
  }
  b.box(0, 4.3, -W - 1.2, hood + 0.5, 5.7, W + 1.2, CONCRETE, { faces: 'NESWTB' });
  b.box(0, -6, -0.4, hood + 0.5, 4.3, 0.4, CONCRETE);
  b.box(hood - 0.1, 0, -W, hood + 0.5, 4.3, W, CONCRETE);
  b.box(3.4, -5, -W, 3.5, 4.3, W, DARK, { faces: 'W' });
  k.sign('tunnel', -0.14, 5.0, 0, -1, 0, 1.2, 9.6);
  k.lights.push({ x: -2, z: 0, r: 9, color: '#ffe2ae', k: 0.5 });
}

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
  area(k, rect(-45, SHELTER.z0, SHELTER.x0 - 0.4, SHELTER.z1), PLAZA);
  area(k, rect(-45, SHELTER.z1, -4.4, BOARD.z1 - 0.4), PLAZA);
  area(k, rect(22.4, -2, 28, 62), PLAZA);
  area(k, rect(10.4, -42, 28, -2), PLAZA);
  area(k, rect(34.4, 62, 43, BOARD.z1 - 0.4), PLAZA);
  area(k, rect(BOARD.x0, N, HILL.x1, LEVELS[0].north), 0x86b96a); // Sheung Wan, at the foot of the north face
  area(k, rect(RACECOURSE.x0, RACECOURSE.z0, RACECOURSE.x1, RACECOURSE.z1), TURF, 0.03);

  // -------------------------------------------------------------------------
  // The Peak: levels like a contour model, with a cut for the tram on the north face
  // -------------------------------------------------------------------------

  const slot = FUNICULAR.z1 + 0.5;
  LEVELS.forEach((lv, i) => {
    const c = HILL.cut, last = i === LEVELS.length - 1;
    terrace(k, [[HILL.x0, lv.north], [c.x0, lv.north], [c.x0, slot], [c.x1, slot], [c.x1, lv.north], [HILL.x1, lv.north], [HILL.x1, lv.south], [HILL.x0, lv.south]],
      lv.base, lv.top, { top: last ? PLAZA : i % 2 ? 0x74ad5c : LAWN, side: ROCK });
  });
  {
    // the tram's bed in its cut: a ramp of earth from Sheung Wan to the summit, and the rails on it
    const F = FUNICULAR, c = HILL.cut, x0 = c.x0 + 0.02, x1 = c.x1 - 0.02;
    const y0 = F.y(F.z0), y1 = F.y(F.z1);
    b.quad([x0, y0, F.z0], [x1, y0, F.z0], [x1, y1, F.z1], [x0, y1, F.z1], [0, 1, 0], 0x8d8a83);
    b.quad([x0, 0, F.z0], [x0, 0, F.z1], [x0, y1, F.z1], [x0, y0, F.z0], [-1, 0, 0], ROCK);
    b.quad([x1, 0, F.z1], [x1, 0, F.z0], [x1, y0, F.z0], [x1, y1, F.z1], [1, 0, 0], ROCK);
    b.box(x0, 0, F.z0 - 0.02, x1, y0, F.z0, ROCK, { faces: 'N' });
    // where it runs in under the Peak Tower
    b.box(x0, y1 - 0.5, slot - 0.1, x1, HILL.top - 0.02, slot - 0.02, DARK, { faces: 'N' });
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
  street(k, pathOf(flat(fineRound([[-43.5, 108], [-47.5, 108], [-47.5, 68], [SHORE.nb, 68], [SHORE.nb, 60]], 4))), lane1walk);
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
  street(k, pathOf(road2([[K.salisbury, -44.5], [73, -44.5]])), { lanes: 3, width: 15, sidewalk: 2 });
  street(k, pathOf(road2([[68, -44.5], [68, K.nathan]])), { lanes: 2, width: 10, sidewalk: 2 });
  street(k, pathOf(road2([[K.chatham, K.nathan], [K.chatham, 24]])), { lanes: 2, width: 10, sidewalk: 2 });
  street(k, pathOf(road2([[66.5, 24], [66.5, 57.5]])), { lanes: 3, width: 15, sidewalk: 2 });
  street(k, pathOf(flat(fineRound([[37.5, -47], [37.5, -103.5], [K.east, -103.5], [K.east, -49.5], [73, -49.5]], 4))), lane1walk);
  street(k, pathOf(flat(fineRound([[74, 27.5], [K.east, 27.5], [K.east, 96.5], [71.5, 96.5], [71.5, 57.5]], 4))), lane1walk);
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
    const x0 = 76, z1 = -84, h = 8.5, gate = 5.4;
    fill(b, rect(x0, N, BOARD.x1, z1), h, LAWN);
    // its west and south faces, each with a mouth for the road
    const gz0 = -103.5 - 3.2, gz1 = -103.5 + 3.2, gx0 = K.east - 3.2, gx1 = K.east + 3.2;
    b.box(x0, 0, N, x0 + 0.02, h, gz0, ROCK, { faces: 'W' });
    b.box(x0, 0, gz1, x0 + 0.02, h, z1, ROCK, { faces: 'W' });
    b.box(x0, gate, gz0, x0 + 0.02, h, gz1, ROCK, { faces: 'W' });
    b.box(x0, 0, z1 - 0.02, gx0, h, z1, ROCK, { faces: 'S' });
    b.box(gx1, 0, z1 - 0.02, BOARD.x1, h, z1, ROCK, { faces: 'S' });
    b.box(gx0, gate, z1 - 0.02, gx1, h, z1, ROCK, { faces: 'S' });
    // and the two faces at the edge of the board
    b.box(BOARD.x1 - 0.02, 0, N, BOARD.x1, h, z1, ROCK, { faces: 'E' });
    b.box(x0, 0, N, BOARD.x1, h, N + 0.02, ROCK, { faces: 'N' });
    // concrete round each mouth, and darkness a little way in
    b.box(x0 - 0.5, 0, gz0 - 0.8, x0 + 0.3, gate + 0.9, gz0, CONCRETE);
    b.box(x0 - 0.5, 0, gz1, x0 + 0.3, gate + 0.9, gz1 + 0.8, CONCRETE);
    b.box(x0 - 0.5, gate, gz0, x0 + 0.3, gate + 0.9, gz1, CONCRETE, { faces: 'NESWTB' });
    b.box(x0 + 3, 0, gz0, x0 + 3.1, gate, gz1, DARK, { faces: 'W' });
    b.box(gx0 - 0.8, 0, z1 - 0.3, gx0, gate + 0.9, z1 + 0.5, CONCRETE);
    b.box(gx1, 0, z1 - 0.3, gx1 + 0.8, gate + 0.9, z1 + 0.5, CONCRETE);
    b.box(gx0, gate, z1 - 0.3, gx1, gate + 0.9, z1 + 0.5, CONCRETE, { faces: 'NESWTB' });
    b.box(gx0, 0, z1 - 3.1, gx1, gate, z1 - 3, DARK, { faces: 'S' });
    // the upper levels, and the crag on top
    terrace(k, rect(81, N, BOARD.x1, -89), h, 17, { side: ROCK });
    terrace(k, rect(87, N, BOARD.x1, -95), 17, 25, { side: ROCK });
    b.box(90, 25, -108, 101, 31, -99, ROCK);
    b.box(96, 31, -106, 101, 35, -101, ROCK);
  }

  // -------------------------------------------------------------------------
  // Rails: the tram, and the buses on Nathan Road
  // -------------------------------------------------------------------------

  {
    const rails = pathOf(flat(TRAM, 0.04), true);
    street(k, rails, { lanes: 1, width: 3, sidewalk: 0, color: 0x55575d, zebras: false });
    track(k, rails, { sleepers: false });
    for (const f of [0, 0.25, 0.5, 0.75]) train(k, rails, { cars: 1, speed: 10, from: rails.length * f, body: 0x1f6b3a, stripe: 0xf2efe6 });
    const buses = pathOf(flat(BUSES, 0.02), true);
    for (const f of [0, 0.34, 0.67]) train(k, buses, { cars: 1, speed: 11, from: buses.length * f, body: 0xc8322b, stripe: 0xf2efe6 });
  }

  // -------------------------------------------------------------------------
  // What stands on the tile: for now a plain box for each thing, with its name on it
  // -------------------------------------------------------------------------

  const stand = (l: Lot, i: number): void => {
    const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
    const y0 = l.y0 === -1 ? hillHeight(cx, cz) : l.y0 ?? 0, y1 = y0 + l.h;
    const win = l.h > 9 ? { cell: 2.6, storey: 5, lit: 0.4, kind: 0 } : undefined;
    if (l.round) b.cyl(cx, cz, y0, y1, (l.x1 - l.x0) / 2, (l.x1 - l.x0) / 2 - 2.4, 12, l.color);
    else b.box(l.x0, y0, l.z0, l.x1, y1, l.z1, l.color, { win, seed: (i * 0.618) % 1, top: 0x9d988f });
    if (!l.name) return;
    // its name, towards the south and towards the east, where the view first looks from
    const hgt = Math.min(3.4, Math.max(1.6, (l.x1 - l.x0) / 5));
    const y = l.h > 9 ? y1 - hgt : y1 + hgt * 0.75;
    k.signs.add(l.id, cx, y, l.z1 + 0.14, 'S', hgt, Math.max(l.x1 - l.x0, 9) - 0.6);
    k.signs.add(l.id, l.x1 + 0.14, y, cz, 'E', hgt, Math.max(l.z1 - l.z0, 9) - 0.6);
    k.lights.push({ x: cx, z: l.z1 + 3, r: 10, color: '#ffe2ae', k: 0.4 });
  };
  LOTS.forEach(stand);
  FILL.forEach((l, i) => stand(l, i + 40));

  // the Convention Centre's link, over the shore road and the tram
  b.box(-45, 6.6, 8, -19, 10.2, 14, 0xdfe6ea, { faces: 'NESWTB', win: { cell: 2.6, storey: 3.6, lit: 0.6, kind: 1 } });
  // the racecourse: a ring of turf round a lawn, and a grandstand, as plain shapes for now
  {
    const R = RACECOURSE, inset = 4.5;
    area(k, rect(R.x0 + inset, R.z0 + inset, R.x1 - inset, R.z1 - inset), 0x7fb85f, 0.04);
    b.box(R.x1 - 2.8, 0, R.z0 + 2, R.x1 + 0.4, 7, R.z1 - 2, 0xe9e6df, { top: 0x8d8a83 });
    k.signs.add('happy-valley', (R.x0 + R.x1) / 2, 2, R.z1 + 0.6, 'S', 2.6);
  }
  // the breakwater of the typhoon shelter, and a few boats in it
  b.box(SHELTER.x1 - 0.6, -1.4, SHELTER.z0 + 4, SHELTER.x1 + 0.6, 0.5, SHELTER.z1, QUAY);
  for (const [x, z] of [[-37, 84], [-34, 90], [-37, 94], [-23, 86], [-23, 93]]) b.box(x - 1.1, -0.95, z - 2.2, x + 1.1, 0.5, z + 2.2, 0x8a5a3c, { top: 0xd8c9a8 });

  // -------------------------------------------------------------------------
  // Lamps, and a first few figures
  // -------------------------------------------------------------------------

  for (let z = -76; z < 60; z += 17) k.lamp(-24.3, z, Math.PI);
  lampsAlong(k, nathan, 11.2);
  lampsAlong(k, salisbury, 6.2);
  for (let i = 0; i < 40; i++) k.person(-24.6 + k.rand() * 4.2, -56 + k.rand() * 56);
  for (let i = 0; i < 40; i++) k.person(23 + k.rand() * 4.4, 2 + k.rand() * 56);

  if (import.meta.env.DEV) checkRoads(ROUTES, { tram: flat(TRAM, 0.04), buses: flat(BUSES, 0.02) });

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
