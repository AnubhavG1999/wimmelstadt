// The fleets over Mars: free-flying warships that drift on slow paths of
// their own over the south and the east of the sky, and the fighting between
// them. The Augustan line: the Morning Star, Darrow's later flagship, white
// with red scythes and a crescent bow like a shark's open mouth (MS 45, 57);
// the Pax, his flagship in the Lion's Rain, the dreadnought whose spitTubes
// fire the Rain (GS 22, 37); destroyers and torchShips; and Victra's destroyer
// with its leechCraft (GS 38). Against them: the Warchild, the Bellona
// flagship, and the Bellona line in blue and silver (GS 38); and the Rim's
// ships, the moonBreaker Dustmaker (LB 20) and the black Charybdis with the
// three-headed electric dragon on its sides (IG 15). Between them, the
// Archimedes, the corvette like a reared cobra's head that Cassius and
// Lysander sailed after the war (IG 8). ripWings and wasps chase each other,
// railguns and missiles streak between the lines, dropships fly low over the
// ground column, and drones rise from the depot in the canyon's wall.
//
// One builder's file: see the builders' brief. It is a stub until it is built.

import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';

export type ShipId = 'morningStar' | 'pax' | 'warchild' | 'dustmaker' | 'charybdis' | 'archimedes' | 'victra';

export interface Fleet {
  /** Where a ship is now, its middle, and which way its bow points (radians: 0 east, a quarter turn south). */
  where(id: ShipId): { x: number; y: number; z: number; heading: number };
  /** The mouths of a ship's spitTubes now, along its port side, from which the Rain is fired. */
  tubes(id: 'pax' | 'morningStar'): V3[];
  /** Plays the leechCraft's run at the Warchild (story 11) from now. Returns how many seconds it takes. */
  leeches(): number;
  /** Plays the Charybdis's chase of the Archimedes through the fleet, which ends with the corvette slipping away. Returns how long. */
  chase(): number;
  /** Stands every ship still as it is at `t` seconds, for pictures; null lets them go. */
  hold(t: number | null): void;
}

/** The stub: the ships stand still where the stand-ins are. */
export function buildFleet(_k: Build): Fleet {
  const at: Record<ShipId, { x: number; y: number; z: number; heading: number }> = {
    morningStar: { x: 60, y: 128, z: 70, heading: Math.PI },
    pax: { x: 90, y: 104, z: 52, heading: -Math.PI / 2 },
    warchild: { x: 18, y: 98, z: 104, heading: 0 },
    dustmaker: { x: -8, y: 116, z: 96, heading: 0 },
    charybdis: { x: 40, y: 90, z: 86, heading: 0 },
    archimedes: { x: 50, y: 84, z: 60, heading: Math.PI },
    victra: { x: 72, y: 94, z: 18, heading: -Math.PI / 2 },
  };
  return {
    where: (id) => at[id],
    tubes: (id) => {
      const s = at[id];
      return Array.from({ length: 12 }, (_, i): V3 => [s.x - 8, s.y - 4, s.z - 30 + i * 5]);
    },
    leeches: () => 0,
    chase: () => 0,
    hold: () => {},
  };
}
