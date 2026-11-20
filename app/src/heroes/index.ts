// Every hero has a party trick of its own: a showpiece made by hand for that one
// diecast, which no other hero performs. A hero is not finished until it is in
// this list, under the name of its capture.

import type { PartyTrick } from '../engine/tricks';
import { gt2rs } from './911-gt2-rs-black';
import { gt3 } from './911-gt3-racing-yellow';
import { gt3rs } from './911-gt3-rs-gulf-orange';
import { turboS } from './911-turbo-s-python-green';
import { carreraGT } from './carrera-gt-silver';
import { countach } from './countach-lb-works-black';
import { dbs } from './dbs-casino-royale';
import { er34 } from './er34-lb-super-silhouette-black';
import { g63 } from './g63-silver';
import { m4cs } from './m4-cs-isle-of-man-green';
import { mp44 } from './mp4-4-1988-japan';
import { r34 } from './r34-gt-r-bayside-blue';
import { rx7 } from './rx7-veilside-fortune';
import { s2000 } from './s2000-mugen-red';
import { supra } from './supra-bomex-orange';

export const PARTY_TRICKS: Record<string, PartyTrick> = {
  '911-gt2-rs-black': gt2rs,
  '911-gt3-racing-yellow': gt3,
  '911-gt3-rs-gulf-orange': gt3rs,
  '911-turbo-s-python-green': turboS,
  'carrera-gt-silver': carreraGT,
  'countach-lb-works-black': countach,
  'dbs-casino-royale': dbs,
  'er34-lb-super-silhouette-black': er34,
  'g63-silver': g63,
  'm4-cs-isle-of-man-green': m4cs,
  'mp4-4-1988-japan': mp44,
  'r34-gt-r-bayside-blue': r34,
  'rx7-veilside-fortune': rx7,
  's2000-mugen-red': s2000,
  'supra-bomex-orange': supra,
};
