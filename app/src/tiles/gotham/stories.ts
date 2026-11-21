// The cast of Gotham and the book of its stories.
//
// Each story is a known scene of the comics, or a classic set-up of theirs, in
// moves that small figures can make, as the research gives them
// (docs/districts/research/gotham-batman-and-rogues.md, section 4, and
// gotham-the-wider-cast.md). Nobody is hurt in any of them: a fight stops at
// the clash, and a chase ends in an escape or a net.
//
// The stories are written in chapters, each a file of its own: the west bank
// and Bristol in stories-west.ts, the east bank, Lower Gotham and the harbour
// in stories-east.ts. This file names the whole cast and how each gets about;
// a chapter gives a figure its post, the place where it rests between
// stories, and how it rests there, and adds its stories. A figure that no
// chapter gives a post is away until a story brings it. A chapter that fails
// does not take the others with it.

import type { Build } from '../../engine/tile';
import { LOOKS, type CastId, type Look } from './figures';
import type { Id, Rest, Spot, StoryDef, Way, World } from './stage';
import { east } from './stories-east';
import { west } from './stories-west';

/** One of the cast: who, how it gets about, where it rests (null if it is away until a story brings it), and how it is at rest. */
export interface Member { id: Id; look: Look; way: Way; post: Spot | null; rest?: Rest }

export interface Stories {
  roster: Member[];
  stories: StoryDef[];
  /** The stories the tile opens with, if they may play. */
  opening: string[];
  /** Called every frame, for what goes on whether or not a story plays. */
  always?(dt: number, clock: number): void;
}

/** What a chapter writes into. */
export interface Book {
  roster: Member[];
  stories: StoryDef[];
  opening: string[];
  /** Each is called every frame, for what goes on whether or not a story plays. */
  always: ((dt: number, clock: number) => void)[];
  /** Gives one of the cast its post, and how it rests there. */
  post(id: CastId, post: Spot, rest?: Rest): void;
}

/** A chapter of the book: it gives posts and adds stories. */
export type Chapter = (k: Build, W: World, book: Book) => void;

/** How each of the cast gets about when a story calls it from far off. */
const WAYS: Record<CastId, Way> = {
  batman: 'line', robin: 'line', damian: 'line', nightwing: 'line', redHood: 'line', batgirl: 'line', batwoman: 'line', alfred: 'foot',
  huntress: 'line', azrael: 'line', spoiler: 'line', orphan: 'line', signal: 'line', batMite: 'fly',
  gordon: 'foot', bullock: 'foot', montoya: 'foot', lucius: 'foot', leslie: 'foot', vicki: 'foot', bruce: 'foot',
  joker: 'foot', harley: 'foot', penguin: 'umbrella', catwoman: 'line', riddler: 'foot', twoFace: 'foot', ivy: 'foot', freeze: 'foot',
  scarecrow: 'foot', bane: 'foot', croc: 'foot', manBat: 'wings', langstrom: 'foot', clayface: 'foot', ras: 'foot', talia: 'foot',
  killerMoth: 'wings', madHatter: 'foot', kiteMan: 'wings', hush: 'foot', deathstroke: 'line', blackMask: 'foot', talon: 'line',
  firefly: 'wings', ventriloquist: 'foot', grundy: 'foot', calendarMan: 'foot', hugoStrange: 'foot', tweedledum: 'foot', tweedledee: 'foot',
  polkaDotMan: 'foot',
  superman: 'fly', wonderWoman: 'fly', flash: 'dash', greenLantern: 'fly', aquaman: 'foot', martianManhunter: 'fly',
};

/** Stories that are left out for now, by id. */
const PAUSED: string[] = ['batcave', 'batwing', 'batwingDamian', 'batwingNightwing', 'batwingBatman'];

export function buildStories(k: Build, W: World): Stories {
  const roster: Member[] = (Object.keys(WAYS) as CastId[]).map((id) => ({ id, look: LOOKS[id], way: WAYS[id], post: null }));
  const book: Book = {
    roster, stories: [], opening: [], always: [],
    post(id, post, rest) {
      const m = roster.find((x) => x.id === id);
      if (!m) return;
      m.post = post;
      if (rest) m.rest = rest;
    },
  };
  for (const [name, chapter] of [['the west', west], ['the east', east]] as const) {
    try {
      chapter(k, W, book);
    } catch (e) {
      console.error(`Gotham: the stories of ${name} failed.`, e);
    }
  }
  // While Wayne Manor is rebuilt and the Batcave hidden, the stories that were written for the open cave are left out:
  // they are laid again on the new house, and this list is emptied then.
  // (`?paused=none` on the development server plays them all the same, for whoever is laying them again.)
  const paused = import.meta.env.DEV && new URLSearchParams(location.search).get('paused') === 'none' ? [] : PAUSED;
  const stories = book.stories.filter((s) => !paused.includes(s.id));
  return { roster, stories, opening: book.opening.filter((id) => !paused.includes(id)), always: (dt, clock) => { for (const f of book.always) f(dt, clock); } };
}
