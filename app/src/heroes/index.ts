// Every hero has a party trick of its own: a showpiece made by hand for that one
// diecast, which no other hero performs. A hero is not finished until it is in
// this list, under the name of its capture.

import type { PartyTrick } from '../engine/tricks';
import { countach } from './countach-lb-works-black';

export const PARTY_TRICKS: Record<string, PartyTrick> = {
  'countach-lb-works-black': countach,
};
