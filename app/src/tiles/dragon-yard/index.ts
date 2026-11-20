// A yard for looking at dragons: every kind in the engine's kinds.ts, the
// great dragons of the Targaryens and Daenerys's three beside them for scale.
// It is hidden: open it with ?tiles=dragon-yard. They open flying, each a
// round of its own, the largest highest and widest. In the console:
//
//   yard.line()       stands them all still in the air in rows, wings spread,
//                     heading east, to be looked at from the south (az 0)
//   yard.line(1)      the same, landed, braced on the claws of their wings
//   yard.fly()        sets them all flying again
//   yard.fly('Caraxes', 'Meleys')   flies those, and leaves the rest in line
//
// It is for checking the kit (engine/dragons/), not a tile of the city.

import { BALERION, CANNIBAL, CARAXES, DREAMFYRE, DROGON, GREAT_DRAGONS, MELEYS, MERAXES, RHAEGAL, SHEEPSTEALER, SILVERWING, VERMITHOR, VHAGAR, VISERION } from '../../engine/dragons/kinds';
import { Dragon, type DragonKind } from '../../engine/dragons/model';
import { Pilot, type Held } from '../../engine/dragons/pilot';
import { Track, type Waypoint } from '../../engine/dragons/track';
import type { Build, TileDef, TileParts } from '../../engine/tile';

const KINDS: DragonKind[] = [...GREAT_DRAGONS, DROGON, RHAEGAL, VISERION];

/** Where each stands in the rows: the root of its neck, x and z, all heading east. The great three in front, the smallest at the back. */
const LINE: Record<string, [number, number]> = {
  [BALERION.name]: [-30, -60], [VHAGAR.name]: [-30, 15], [MERAXES.name]: [-30, 75],
  [VERMITHOR.name]: [35, -80], [CANNIBAL.name]: [35, -40], [SILVERWING.name]: [35, 0], [CARAXES.name]: [35, 42],
  [DREAMFYRE.name]: [85, -78], [MELEYS.name]: [85, -42], [SHEEPSTEALER.name]: [85, -8],
  [DROGON.name]: [85, 24], [RHAEGAL.name]: [85, 52], [VISERION.name]: [85, 80],
};

/** How fast each cruises: the old giants slowly, the quick ones fast. */
const CRUISE: Record<string, number> = {
  [BALERION.name]: 24, [VHAGAR.name]: 24, [MERAXES.name]: 28, [VERMITHOR.name]: 27, [CANNIBAL.name]: 32, [SILVERWING.name]: 28,
  [CARAXES.name]: 34, [DREAMFYRE.name]: 30, [MELEYS.name]: 38, [SHEEPSTEALER.name]: 30,
};

/** An oval round the middle of the board, the larger the dragon the wider and higher, rising and falling as it goes, so that each climbs and beats, then glides. */
function round(rank: number, kind: DragonKind): Waypoint[] {
  const rx = Math.min(88, 26 + kind.length * 1.05), rz = Math.min(96, 22 + kind.length * 1.2), y = 22 + kind.length * 0.55, sp = CRUISE[kind.name] ?? 30;
  const way: Waypoint[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rank * 0.7;
    way.push([Math.cos(a) * rx, y + 7 * Math.sin(a * 2 + rank), Math.sin(a) * rz, sp * (1 + 0.12 * Math.sin(a * 2 + rank + 1.4))]);
  }
  return way;
}

function build(k: Build): TileParts {
  const dragons = KINDS.map((kind) => new Dragon(kind, k.look));
  for (const d of dragons) k.group.add(d.mesh, d.shadow);
  const pilots = dragons.map((d, i) => new Pilot(d, { phase: i, seed: 100 + i * 31, firstBeat: 0.5 + 0.37 * i }));
  const tracks = KINDS.map((kind, i) => new Track(round(i, kind), true));
  const held: (Held | null)[] = KINDS.map(() => null);
  const flat = (): number => 0;
  let clock = 0;

  k.each((dt, time, night) => {
    clock += dt;
    pilots.forEach((pilot, i) => {
      const h = held[i];
      if (h) pilot.hold(h, time, flat);
      else {
        const tr = tracks[i];
        pilot.fly((t, out) => tr.point(tr.sAt(t), out), clock, time, dt, flat, flat);
      }
      pilot.light(night);
    });
  });

  if (import.meta.env.DEV) {
    /** Stands them all still in rows: in the air with their wings spread, or landed at `sit` 1. */
    const line = (sit = 0): string => {
      KINDS.forEach((kind, i) => {
        const [x, z] = LINE[kind.name];
        held[i] = { x, y: sit > 0 ? 0 : 30, z, heading: 0, speed: 20, sit };
      });
      return `${KINDS.length} in line`;
    };
    /** Flies those named, or all of them. */
    const fly = (...names: string[]): string => {
      KINDS.forEach((kind, i) => { if (names.length === 0 || names.includes(kind.name)) held[i] = null; });
      return names.length ? names.join(', ') : 'all flying';
    };
    (window as unknown as { yard: unknown }).yard = { kinds: KINDS, dragons, pilots, tracks, held, line, fly, clock: () => clock, triangles: () => dragons.map((d) => [d.kind.name, d.triangles]) };
  }
  return { routes: [], parked: [], heroSpots: [] };
}

export const dragonYard: TileDef = { id: 'dragon-yard', name: 'The dragon yard', seed: 11, signs: [], hidden: true, build };
export default dragonYard;
