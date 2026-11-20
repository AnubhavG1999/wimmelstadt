// Where the sky's things will be, while they are still to be built: the
// fleets as plain hulls where they will fly, a wave of the Iron Rain as
// streaks from the Pax's spitTubes down to where it lands, and the shield over
// the city. Nothing here moves yet; it stands for the layout, as a lot's box
// does. It goes once the fleet and the Rain are built.

import type { V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { F, SHIELD } from './plan';

const PAX = 0x3d3f45, PAX_RED = 0x9b2a22, AUGUSTAN = 0x6b6e75, BELLONA_BLUE = 0x3b64b0, BELLONA_SILVER = 0xc7d0da, FIGHTER = 0x2c2e33;
const SHELL = 0xffb25a;

/** A ship as a plain hull: a long box with a tapered prow, along x when `along` is 0, along z when it is 1. */
function hull(k: Build, x: number, y: number, z: number, len: number, wid: number, tall: number, along: 0 | 1, color: number, trim: number): void {
  const yaw = along === 0 ? 0 : Math.PI / 2;
  k.b.obox(x, y, z, len / 2, tall / 2, wid / 2, yaw, color, { faces: 'NESWTB' });
  // the prow, narrower, and a stripe of the house's colour along the hull
  const ax = along === 0 ? 1 : 0, az = along === 0 ? 0 : 1;
  k.b.obox(x - ax * (len / 2 + len * 0.06), y, z - az * (len / 2 + len * 0.06), len * 0.06, tall * 0.35, wid * 0.3, yaw, color, { faces: 'NESWTB' });
  k.b.obox(x, y + tall * 0.18, z, len * 0.42, tall * 0.08, wid / 2 + 0.05, yaw, trim, { faces: 'NESWTB' });
  // engines at the stern, glowing
  for (const s of [-1, 1]) k.glows.push({ x: x + ax * (len / 2 + 0.4) + az * s * wid * 0.25, y, z: z + az * (len / 2 + 0.4) + ax * s * wid * 0.25, sx: 0.8, sy: tall * 0.4, sz: 0.8, color: '#9fd8ff' });
}

/** A streak of the Rain: a line of glowing shells from one place to another, each shorter towards the end. */
function streak(k: Build, a: V3, b: V3, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
    k.b.box(x - 0.5, y - 0.8, z - 0.5, x + 0.5, y + 0.8, z + 0.5, SHELL, { faces: 'NESWTB' });
    k.glows.push({ x, y: y + 1.6, z, sx: 0.35, sy: 2.4, sz: 0.35, color: '#ffd28a' });
  }
}

export function skyBlockout(k: Build): void {
  // the Augustan line over the east: the Pax, and two of her destroyers
  hull(k, 88, 106, 40, 58, 9, 7, 1, PAX, PAX_RED);
  hull(k, 96, 98, -14, 30, 6, 5, 1, AUGUSTAN, PAX_RED);
  hull(k, 72, 100, 94, 30, 6, 5, 1, AUGUSTAN, PAX_RED);
  // the Bellona line over the south: the Warchild and her consorts, blue and silver
  hull(k, 18, 94, 104, 44, 8, 6, 0, BELLONA_BLUE, BELLONA_SILVER);
  hull(k, -22, 90, 106, 26, 5, 4, 0, BELLONA_BLUE, BELLONA_SILVER);
  hull(k, 50, 92, 100, 26, 5, 4, 0, BELLONA_BLUE, BELLONA_SILVER);
  // ripWings and wasps between them
  for (const [x, y, z] of [[40, 96, 50], [52, 90, 66], [24, 100, 72], [60, 102, 30], [30, 88, 90], [66, 94, 80]] as V3[]) k.b.box(x - 1.4, y - 0.3, z - 0.8, x + 1.4, y + 0.3, z + 0.8, FIGHTER, { faces: 'NESWTB' });
  // a wave of the Rain from the Pax's port side: to the canyon's east end, to the plateau, and to the snowy peaks
  for (const [a, b] of [
    [[83, 102, 26], [95, 22, -20]],
    [[83, 102, 34], [94, 18, 4]],
    [[83, 102, 42], [93, 16, 20]],
    [[83, 102, 20], [8, 34, -95]],
    [[83, 102, 30], [0, 36, -92]],
    [[83, 102, 50], [84, 14, 88]],
    [[83, 102, 46], [20, 18, 74]],
  ] as [V3, V3][]) streak(k, a, b, 11);
  // the shield over the city: a ring at its foot for now, where its dome meets the city's walls
  const [cx, , cz] = SHIELD.c;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, x = cx + Math.cos(a) * (SHIELD.rx - 6), z = cz + Math.sin(a) * (SHIELD.rz - 6);
    k.glows.push({ x, y: F + 0.6, z, sx: 1.2, sy: 0.4, sz: 1.2, color: '#7fd6ff' });
  }
}
