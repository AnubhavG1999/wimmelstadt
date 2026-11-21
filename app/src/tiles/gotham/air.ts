// Gotham's air, which is most of its mood: the Bat-Signal's beam and the
// cloud it shines on, fog lying on the rivers and the bay, steam from the
// street's grates, searchlights, the waterfall over the Batcave's door, and
// rain running off the gargoyles. All of it is there by day and stronger by
// night, since the board gives a tile no night of its own.
//
// A stub: its builder has not written it yet, and it draws nothing.
// Everything exported below is what the show calls, and it stays.

import type { Build } from '../../engine/tile';

/** What the Bat-Signal's disc shows on the cloud. */
export type SignalPicture = 'bat' | 'joker' | 'pumpkin' | 'question';

export interface Air {
  /**
   * The Bat-Signal: how bright its beam and the disc on its cloud are, from 0
   * off to 1 full, and which picture the disc carries. The cloud is always
   * there. The show lights it; left alone it is off.
   */
  signal(f: number, picture?: SignalPicture): void;
  /**
   * A searchlight, by name: where its beam falls on the ground and how bright
   * it is. Left alone, each sweeps a round of its own: `lounge-1` and
   * `lounge-2` cross before the Iceberg Lounge, `blackgate` sweeps the bay
   * from the prison's tower. `null` gives one back to its own round.
   */
  searchlight(id: 'lounge-1' | 'lounge-2' | 'blackgate', to: { x: number; z: number; f: number } | null): void;
  /** The waterfall over the Batcave's door: how far it is parted for the car to come through, from 0 closed to 1 open. */
  waterfall(part: number): void;
  /** A burst of steam from the street at a place, as when a valve is opened: `f` from 0 to 1. */
  burst(x: number, y: number, z: number, f: number): void;
}

/** Builds the air, and sets going what moves by itself. */
export function buildAir(_k: Build): Air {
  return { signal() {}, searchlight() {}, waterfall() {}, burst() {} };
}
