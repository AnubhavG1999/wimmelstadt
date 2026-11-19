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
import { busCar, dragonBoat, ferryBoat, junkBoat, lighter, peakTramCar, sail, sampan, shuttle, tramCar } from './movers';
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
    // most trams are dark green; a few are painted all over, as the ones that carry advertising are
    const liveries = [tramCar(), tramCar(0xb5332a, 0xf2e6c4), tramCar(), tramCar(0x2f5fa8, 0xf2d58f), tramCar(), tramCar(0xe0a92e, 0x2a2c31)];
    liveries.forEach((car, i) => train(k, rails, { cars: 1, speed: 10, from: (rails.length * i) / liveries.length, car }));
    const buses = pathOf(flat(BUSES, 0.02), true);
    [busCar(), busCar(0xe8c24a, 0x3f6fb5), busCar()].forEach((car, i) => train(k, buses, { cars: 1, speed: 11, from: (buses.length * i) / 3, car }));
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
  for (const [x, z, a, c] of [[-37, 84, 1.5, 0x4f8f6a], [-34, 89, 1.7, 0xc8523f], [-37, 94, 1.5, 0x3f6fa3], [-22.8, 86, 1.6, 0xd1b25a], [-22.8, 93, 1.5, 0x4f8f6a]]) sampan(b, x, z, a, c);

  // -------------------------------------------------------------------------
  // On the water, and up the hill
  // -------------------------------------------------------------------------

  const SEA_Y = -0.9;
  {
    // the Star Ferry: two boats that pass each other, between Central's piers and Tsim Sha Tsui
    const a: P2 = [-3.3, -84.6], c: P2 = [5.5, -44.8], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const ox = ((c[1] - a[1]) / l) * 2.3, oz = (-(c[0] - a[0]) / l) * 2.3;
    const boat = ferryBoat();
    shuttle(k, boat, [a[0] + ox, SEA_Y, a[1] + oz], [c[0] + ox, SEA_Y, c[1] + oz], { speed: 4.2, dwell: 7, bob: 0.05 });
    shuttle(k, boat, [a[0] - ox, SEA_Y, a[1] - oz], [c[0] - ox, SEA_Y, c[1] - oz], { speed: 4.2, dwell: 7, start: 0.5, bob: 0.05 });
    // a junk under red sails, round the south of the harbour
    sail(k, junkBoat(), pathOf(flat(fine(rounded([[-11, 60], [17, 60], [17, 93], [-11, 93]], 10, true)), SEA_Y), true), { speed: 3.2, bob: 0.07 });
    // dragon boats in Hung Hom's bay: three crews, down the course and back
    [0xc8322b, 0xe8c24a, 0x3f6fb5].forEach((team, i) => {
      const x = 24.4 + i * 3;
      const course = pathOf(flat(fine(rounded([[x, 68], [x, 108], [x + 1.5, 108], [x + 1.5, 68]], 0.75, true)), SEA_Y), true);
      sail(k, dragonBoat(team), course, { speed: 6.4 + i * 0.5, from: 0.02 + i * 0.03, bob: 0.03 });
    });
    // what lies at anchor: a lighter working cargo off the Convention Centre, another off Central, sampans off Tsim Sha Tsui
    lighter(b, 7.5, 16, Math.PI / 2 - 0.2);
    lighter(b, 8, -104, 0.15);
    sampan(b, 4, -8, 0.4, 0xc8523f);
    sampan(b, 3, 2, -0.5);
    sampan(b, 18, 30, 1.2, 0x3f6fa3);
    // the Peak Tram's car, up and down its incline
    const F = FUNICULAR, z0 = F.z0 + 4.5, z1 = F.z1 - 2.5;
    const slope = (F.y(z1) - F.y(z0)) / (z1 - z0);
    shuttle(k, peakTramCar(slope), [F.x, F.y(z0) + 0.16, z0], [F.x, F.y(z1) + 0.16, z1], { speed: 5, dwell: 6 });
  }

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  const built = [...LOTS, ...FILL];
  const inLot = (x: number, z: number, pad: number): boolean => built.some((l) => x > l.x0 - pad && x < l.x1 + pad && z > l.z0 - pad && z < l.z1 + pad);
  {
    // the Peak is green wherever nothing is built: on every level, clear of the road, the tram's cut and the houses
    const road = PEAK.road, clear = (PEAK.half + 1.7) ** 2;
    const nearRoad = (x: number, z: number): boolean => road.some((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2 < clear);
    const spots: P2[] = [];
    for (let i = 0; i < 2600 && spots.length < 170; i++) {
      const x = HILL.x0 + 1.6 + k.rand() * (HILL.x1 - HILL.x0 - 3.2), z = N + 2 + k.rand() * (LEVELS[0].south - N - 3);
      const y = hillHeight(x, z);
      if (y === HILL.top) continue; // the summit is paved
      if ([[-1.7, 0], [1.7, 0], [0, -1.7], [0, 1.7]].some(([dx, dz]) => hillHeight(x + dx, z + dz) !== y)) continue;
      if (nearRoad(x, z) || inLot(x, z, 1.5)) continue;
      if (x > HILL.cut.x0 - 1.9 && x < HILL.cut.x1 + 1.9 && z < FUNICULAR.z1 + 4) continue;
      if (spots.some((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 < 8)) continue;
      spots.push([x, z]);
      k.tree(x, z, 0.55 + k.rand() * 0.5, false, y);
    }
  }
  // along both promenades, round the racecourse, and on the Convention Centre's point
  for (let z = -54; z < 0; z += 9) k.tree(-22.6, z, 0.6);
  for (let z = 4; z < 60; z += 8) k.tree(25.2, z, 0.6);
  for (let z = -38; z < -4; z += 8.5) k.tree(29, z, 0.55);
  for (const [x, z] of [[-17, 30], [-8.5, 20.5], [-8.5, 30.5], [-22.5, 48], [-22.5, 66], [-22.5, 74], [-42, 100], [-30, 111], [-36, 111], [39, 66], [39, 78], [39, 90], [39, 102]]) k.tree(x, z, 0.6);
  for (const [x, z] of [[46, -50], [58, -50], [70, -50], [82, -62], [90, -62], [80, -50], [92, -50], [82, 48], [80, 94], [92, 80], [47, 60], [58, 62], [47, 88], [58, 90]]) k.tree(x, z, 0.65);

  // -------------------------------------------------------------------------
  // Light at night: lamps on the streets, and a string of lamps along every road above the ground
  // -------------------------------------------------------------------------

  for (let z = -76; z < 60; z += 17) k.lamp(-24.3, z, Math.PI);
  lampsAlong(k, nathan, 11.2);
  lampsAlong(k, salisbury, 6.2);
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
    const crowd = (n: number, x0: number, z0: number, x1: number, z1: number, y = 0): void => {
      for (let i = 0; i < n; i++) {
        const x = x0 + k.rand() * (x1 - x0), z = z0 + k.rand() * (z1 - z0);
        if (!inLot(x, z, 0.5)) k.person(x, z, y);
      }
    };
    crowd(34, -24.6, -56, -20.6, 0); // Central's promenade
    crowd(16, -24, -110, -11.5, -60); // by the ferry piers and the wheel
    crowd(40, 23, 2, 27.4, 58); // the Avenue of Stars
    crowd(16, 11.5, -40, 27, -3); // round the Clock Tower
    crowd(22, 35, 64, 42, 110); // watching the dragon boats
    crowd(26, 60.5, 96.8, 101, 100.2); // at the night market
    crowd(16, -66, -23, -60.5, -16, HILL.top); // at the lookout on the Peak
    crowd(8, -100, -30, -89, -24, HILL.top);
    crowd(20, RACECOURSE.x1 - 5, RACECOURSE.z0 + 3, RACECOURSE.x1 - 3.2, RACECOURSE.z1 - 3); // along the rail at the races
    crowd(10, -44, 82, -40.6, 97); // on the quay of the typhoon shelter
    crowd(12, -19, 20, -7, 33); // on the Convention Centre's point
    crowd(10, -102, -112, -60, -102); // Sheung Wan
    for (const z of [-12.5, 6.5]) crowd(18, 42, z - 1.2, 96, z + 1.2); // Nathan Road's pavements
    crowd(12, 40.5, -34, 46.5, -18); // the Peninsula's forecourt
  }

  if (import.meta.env.DEV) checkRoads(ROUTES, { tram: flat(TRAM, 0.04), buses: flat(BUSES, 0.02) });

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
