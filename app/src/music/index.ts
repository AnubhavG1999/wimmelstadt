// What is playing on the listener's Spotify, for the city to show.
//
// The link is made in the browser alone, with the listener's own account: see
// spotify.ts. On the development server a stand-in can take its place, for
// working on the screens without an account: ?music=stand-in.

import { openSpotify } from './spotify';

/** What is playing. */
export interface Track {
  /** Spotify's id for it, or its address if it has no id: only used to tell one from the next. */
  id: string;
  title: string;
  /** Who it is by: the artists' names joined with commas, or a podcast's name. */
  artist: string;
  album: string;
  /** The address of its cover, about 300 pixels square, if it has one. */
  cover: string | null;
  /** Whether it is playing now, or paused. */
  playing: boolean;
}

export interface Music {
  /** 'off' when the app was built without a client id; otherwise whether this device is linked to an account. */
  readonly state: 'off' | 'disconnected' | 'connecting' | 'connected';
  /** What is playing, or null when nothing is, or when not connected. A paused track is still reported, with `playing` false. */
  readonly track: Track | null;
  /** Sends the browser to Spotify to ask for the link. */
  connect(): void;
  /** Forgets the link on this device. */
  disconnect(): void;
}

/**
 * Opens the link. `changed` is called whenever `state` or `track` changes, and
 * not otherwise: a track that is still playing does not call it again.
 */
export function openMusic(query: URLSearchParams, changed: (music: Music) => void): Music {
  // `import.meta.env.DEV` is false in a production build, so the stand-in and
  // everything it imports are left out of it.
  if (import.meta.env.DEV && query.get('music') === 'stand-in') return openStandIn(changed);
  return openSpotify(query, changed);
}

/** A link that is there from the start and plays invented songs. Development only. */
function openStandIn(changed: (music: Music) => void): Music {
  let state: Music['state'] = 'connected';
  let track: Track | null = null;
  let stop = (): void => {};
  let gone = false;
  const music: Music = {
    get state() { return state; },
    get track() { return track; },
    connect() {
      // there is nothing to link to
    },
    disconnect() {
      if (gone) return;
      gone = true;
      stop();
      state = 'disconnected';
      track = null;
      changed(music);
    },
  };
  void import('./stand-in').then(({ playStandIn }) => {
    if (gone) return;
    stop = playStandIn((next) => {
      track = next;
      changed(music);
    });
  });
  return music;
}
