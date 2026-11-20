// The dragons of the city, each after the books: its colours, its size, its
// fire and its manner of flight. A tile makes a `Dragon` of one (`model.ts`)
// and flies it with a `Pilot` (`pilot.ts`).

import type { DragonKind } from './model';

// ---------------------------------------------------------------------------
// Daenerys's three, which fly over Westeros
// ---------------------------------------------------------------------------

/** Black, streaked with scarlet. The largest of the three. Its fire is black, shot through with red. */
export const DROGON: DragonKind = {
  name: 'Drogon', length: 14, body: 0x1b181e, belly: 0x29232b, streak: 0x9e1018, horn: 0xb3141c, bone: 0x141216,
  skin: [0x4a080c, 0x3a0609], claw: 0x0b0a0c, eye: 0xff2a1a, mouth: 0x6a0c0c, glow: 0xff3018,
  flame: { core: [0.02, 0.015, 0.02], edge: [1.0, 0.08, 0.04], fleck: [1.0, 0.3, 0.05], flecks: 0.08, cores: 0.62, dark: true, reach: 13, light: 0xff3a1a },
  // its wings beat the slowest of the three, because it is the largest
  flight: { beat: 0.74, answer: 6 },
};
/** Green and bronze, with wings of jade. Its fire is orange and yellow, with veins of green. */
export const RHAEGAL: DragonKind = {
  name: 'Rhaegal', length: 12, body: 0x1f4a2a, belly: 0x2c5e36, streak: 0x8c5a26, horn: 0x8c5a26, bone: 0x7a4e22,
  skin: [0x216349, 0x1b533d], claw: 0x0b0a0c, eye: 0xd98a2a, mouth: 0x4a2a10, glow: 0xffa020,
  flame: { core: [1.0, 0.86, 0.3], edge: [1.0, 0.5, 0.1], fleck: [0.2, 0.92, 0.3], flecks: 0.2, cores: 0.4, reach: 11, light: 0xffa030 },
  flight: { beat: 0.65, answer: 4.6 },
};
/** Cream and gold. The pale one. Its fire is pale gold, flecked with red and orange. */
export const VISERION: DragonKind = {
  name: 'Viserion', length: 11.5, body: 0xd8c79a, belly: 0xe2d4ae, streak: 0xb8861f, horn: 0xb8861f, bone: 0xa87a1c,
  skin: [0xc2a878, 0xb09462], claw: 0x0b0a0c, eye: 0xffc83a, mouth: 0x7a4a18, glow: 0xffd870,
  flame: { core: [1.0, 0.93, 0.66], edge: [1.0, 0.8, 0.36], fleck: [1.0, 0.26, 0.08], flecks: 0.2, cores: 0.45, reach: 11, light: 0xffd880 },
  flight: { beat: 0.61, answer: 7.4 },
};
