// Builds everything that stands still on the Urbana-Champaign tile: the
// ground, the streets, the railway's embankment and its two viaducts, and
// whatever stands on each lot. The shapes come from plan.ts.
//
// A lot whose model is not built yet is a plain box with its name on a board
// that faces the opening view. A box gives way to its model the moment a file
// of models hands one over: models.ts gathers them.

import type { Solid } from '../../engine/checks';
import { area, ground, rect } from '../../engine/ground';
import { buildPath, type Path } from '../../engine/paths';
import { track } from '../../engine/rail';
import { clearOfStreets, lampsAlong, street } from '../../engine/roads';
import type { Build, TileParts } from '../../engine/tile';
import { roadFaults, throughSolids, unseen } from './checks';
import { MODELS, extras } from './models';
import {
  AREAS, BOARD, CARR, HERO_SPOTS, LOTS, MUST_SEE, PARKED, RAIL, ROUTES, STREETS, TALL, VIADUCTS,
  type LotDef, type Surface,
} from './plan';

const PAVING = 0xb9b1a2, BALLAST = 0x8d8a83, BANK = 0x7fa368, STEEL = 0x5f666e, DARK = 0x0c0c10, ABUTMENT = 0xbdb8ad;

/** The colour of each kind of ground. */
const SURFACE: Record<Surface, number> = {
  lawn: 0x6fa85a,
  field: 0x5c9a4e,
  carpark: 0x55575d,
  plaza: 0xd8d2c4,
  corn: 0xb3a14c,
  creek: 0x6fb7d9,
  sand: 0xe3d3a4,
  cemetery: 0x7fae68,
};
/** Patches that lie on another patch are laid a hair higher than it, so that the two are never in one plane. */
const ON_ANOTHER = new Set(['volleyball', 'cemetery', 'boneyard']);

/** Towards the camera of the opening view: the way a box's board faces. */
const VIEW = { x: Math.sin((42 * Math.PI) / 180), z: Math.cos((42 * Math.PI) / 180) };

/** A lot as a plain box, its taller parts as boxes on it, and its name on a board above its middle. */
function box(k: Build, l: LotDef): void {
  const thing = l.style === 'thing';
  const body = thing ? 0xd7a586 : 0xcfc8b8, roof = thing ? 0xb98466 : 0xa9a49a;
  // (a lot whose body is only the ground it stands on, as the stadium's is, has no box of its own)
  const low = l.h < 0.5;
  if (!low) k.b.box(l.x0, 0, l.z0, l.x1, l.h, l.z1, body, { top: roof });
  for (const p of l.parts ?? []) {
    // (a part stands a hair inside its lot, so that its walls are never in one plane with the body's)
    const y0 = p.y0 ?? (low ? 0 : l.h);
    k.b.box(p.x0 + 0.05, y0, p.z0 + 0.05, p.x1 - 0.05, p.h, p.z1 - 0.05, thing ? 0xe2b89b : 0xd9d3c5, { top: roof, faces: p.y0 === undefined ? 'NESWT' : 'NESWTB' });
  }
  // the board stands over the middle of the lot, above whatever is highest there
  let cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, top = l.h;
  for (const p of l.parts ?? []) if (cx > p.x0 - 1.5 && cx < p.x1 + 1.5 && cz > p.z0 - 1.5 && cz < p.z1 + 1.5) top = Math.max(top, p.h);
  if (low && l.parts) {
    // (or over its highest part, where its middle is open ground)
    const high = l.parts.reduce((a, p) => (p.h > a.h ? p : a));
    cx = (high.x0 + high.x1) / 2;
    cz = (high.z0 + high.z1) / 2;
    top = high.h;
  }
  const high = thing ? 2.3 : 1.7;
  k.sign(`box-${l.id}`, cx, top + 0.5 + high / 2, cz, VIEW.x, VIEW.z, high, 20);
}

export function buildCity(k: Build): TileParts {
  const b = k.b;

  // -------------------------------------------------------------------------
  // The ground: paving, and the lawns, fields, car parks and creek on it
  // -------------------------------------------------------------------------

  ground(k, { color: PAVING });
  for (const a of AREAS) area(k, rect(a.x0, a.z0, a.x1, a.z1), SURFACE[a.surface], ON_ANOTHER.has(a.id) ? 0.027 : 0.02);

  // -------------------------------------------------------------------------
  // Streets
  // -------------------------------------------------------------------------

  const laid: { id: string; path: Path }[] = STREETS.map((s) => {
    const path = buildPath([{ t: 'poly', pts: s.pts, y: 0, r: 0 }], false);
    street(k, path, s.opts);
    return { id: s.id, path };
  });
  STREETS.forEach((s, i) => { if (s.lamps) lampsAlong(k, laid[i].path, CARR + 1.2); });

  // -------------------------------------------------------------------------
  // The railway: an embankment along the west edge, and a bridge where a street passes under it
  // -------------------------------------------------------------------------

  const bankTop = RAIL.y - 0.5, clear = 4.5;
  const solids: Solid[] = [];
  {
    // the embankment in pieces, from the north edge to the south, broken at each viaduct
    const cuts = [...VIADUCTS].sort((p, q) => p.z - q.z);
    let z = BOARD.z0;
    for (const v of [...cuts, null]) {
      const z1 = v ? v.z - v.half : BOARD.z1;
      b.box(RAIL.x0, 0, z, RAIL.x1, bankTop, z1, BANK, { top: BALLAST });
      solids.push({ id: 'the embankment', x0: RAIL.x0, z0: z, x1: RAIL.x1, z1, y0: 0, y1: bankTop });
      if (!v) break;
      // the bridge: an abutment at each side of the opening, the girders over it, and darkness at the back
      for (const s of [-1, 1]) b.box(RAIL.x0, 0, v.z + s * v.half - (s < 0 ? 0 : 0.6), RAIL.x1 + 0.3, clear + 0.4, v.z + s * v.half + (s < 0 ? 0.6 : 0), ABUTMENT);
      b.box(RAIL.x0, clear, v.z - v.half + 0.6, RAIL.x1 + 0.3, bankTop - 0.02, v.z + v.half - 0.6, STEEL, { faces: 'NESWTB', top: BALLAST });
      b.box(RAIL.x0, 0, v.z - v.half + 0.6, RAIL.x0 + 0.3, clear, v.z + v.half - 0.6, DARK, { faces: 'EW' });
      k.lights.push({ x: RAIL.x1 - 2, z: v.z, r: 9, color: '#ffe2ae', k: 0.5 });
      solids.push({ id: `the ${v.id} viaduct's deck`, x0: RAIL.x0, z0: v.z - v.half, x1: RAIL.x1, z1: v.z + v.half, y0: clear, y1: bankTop });
      z = v.z + v.half;
    }
    track(k, buildPath([{ t: 'poly', pts: [[RAIL.track, BOARD.z0 + 1], [RAIL.track, BOARD.z1 - 1]], y: bankTop + 0.16, r: 0 }], false));
  }

  // -------------------------------------------------------------------------
  // What stands on each lot
  // -------------------------------------------------------------------------

  for (const l of LOTS) {
    clearOfStreets(k, l.name, l.x0, l.z0, l.x1, l.z1);
    const model = MODELS[l.id];
    if (!model) box(k, l);
    else {
      // a model that fails says so, and the rest of the tile is still built
      try {
        model(k, l);
      } catch (e) {
        console.warn(`Urbana-Champaign: the model of ${l.id} failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
      }
    }
    solids.push({ id: l.name, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: 0, y1: l.h });
  }
  // and whatever the files of models build besides their lots
  extras(k);

  // -------------------------------------------------------------------------
  // The checks, which speak in the console on the development server
  // -------------------------------------------------------------------------

  if (import.meta.env.DEV) {
    const faults = [...roadFaults(ROUTES), ...throughSolids(ROUTES, solids)];
    if (faults.length > 0) console.warn(`Urbana-Champaign: its roads have faults:\n  ${faults.join('\n  ')}`);
    else console.info(`Urbana-Champaign: no route crosses another, none meets another head-on, and none runs through anything built. ${ROUTES.length} routes, ${ROUTES.reduce((n, r) => n + r.count, 0)} vehicles.`);
    const hidden = unseen(MUST_SEE, TALL);
    if (hidden.length > 0) console.warn(`Urbana-Champaign: hidden from the opening view:\n  ${hidden.join('\n  ')}`);
    else console.info(`Urbana-Champaign: all ${MUST_SEE.length} places that must be seen are in sight of the opening view.`);
  }

  return { routes: ROUTES, parked: PARKED, heroSpots: HERO_SPOTS };
}
