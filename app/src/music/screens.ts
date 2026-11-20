// From what is playing to the big screens of the city.

import type { Playing } from '../engine/signs';
import type { Track } from './index';

/** How long a paused track stays on the screens before they go back to their own pictures. */
const PAUSED_FOR = 60_000;

/** Loads a cover. Null if it cannot be had: the track is then shown without it. */
function loadCover(url: string): Promise<HTMLImageElement | null> {
  return new Promise((done) => {
    const img = new Image();
    // the cover is drawn onto a sheet that becomes a texture, which a picture from another host may only be if it is asked for this way
    img.crossOrigin = 'anonymous';
    // It is waited for with `onload` and not with `decode()`: a page that is
    // not being drawn, such as one in a tab behind another, never finishes a
    // decode, and the screens would then stay as they were.
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/**
 * Shows a track on every screen of the board, and takes it off again.
 * Returns a function to call whenever the link's track changes.
 */
export function musicOnScreens(show: (now: Playing | null) => void): (track: Track | null) => void {
  /** Counts the tracks handed over, so that a cover that arrives late is never shown over a newer track. */
  let latest = 0;
  /** What the screens show now, as a key, or null if they show their own pictures. */
  let shown: string | null = null;
  let offTimer: ReturnType<typeof setTimeout> | undefined;
  /** The last cover loaded, so that pausing and playing again does not load it twice. */
  let kept: { url: string; img: HTMLImageElement | null } | null = null;

  const takeOff = (): void => {
    if (shown !== null) show(null);
    shown = null;
  };

  return (track) => {
    const mine = ++latest;
    clearTimeout(offTimer);
    if (!track) {
      takeOff();
      return;
    }
    const key = `${track.title}\n${track.artist}\n${track.cover ?? ''}`;
    // a paused track stays where it is for a minute, and is then taken off
    const afterwards = (): void => {
      if (!track.playing) offTimer = setTimeout(() => { if (mine === latest) takeOff(); }, PAUSED_FOR);
    };
    if (shown === key) {
      afterwards();
      return;
    }
    void (async () => {
      let img: HTMLImageElement | null = null;
      if (track.cover) {
        if (kept?.url !== track.cover) {
          const url = track.cover;
          const loaded = await loadCover(url);
          kept = { url, img: loaded };
        }
        img = kept?.img ?? null;
      }
      if (mine !== latest) return;
      show({ title: track.title, artist: track.artist, cover: img });
      shown = key;
      afterwards();
    })();
  };
}
