// A stand-in for Spotify on the development server: four invented songs, one
// after another, each with a cover it paints for itself. It is for working on
// the screens without an account, and it is never part of a production build.
// Every title and every name here is made up. One is long, and two are in
// other scripts, so that the lettering on the screens is tried with them.

import type { Track } from './index';

/** How long each song plays. */
const LENGTH = 20_000;

interface Song {
  title: string;
  artist: string;
  album: string;
  /** Two or three strong colours for the cover, and which picture it is. */
  colors: string[];
  picture: 'sun' | 'stripes' | 'rings' | 'blocks';
}

const SONGS: Song[] = [
  { title: 'Midnight Freeway Loop', artist: 'The Diecasts', album: 'Gate Tower Nights', colors: ['#2a1a6e', '#ff3d9a', '#ffb02e'], picture: 'sun' },
  { title: 'A Very Long Song About the Number Forty-Two Bus Going Round and Round the Table', artist: 'Granola Brass Ensemble, The Rubber Tyre Quartet', album: 'Timetables', colors: ['#0f6b4f', '#f4e04d'], picture: 'stripes' },
  { title: 'ミニカー夜行便', artist: 'Kaiju Karaoke Club', album: '交差点', colors: ['#d7263d', '#1b1b3a', '#f5f3ee'], picture: 'rings' },
  { title: 'चाय की गाड़ी', artist: 'Tiffin Tin Sound System', album: 'Platform Nine', colors: ['#1e88e5', '#ff7a00', '#fff4d6'], picture: 'blocks' },
];

/** Paints a cover: a bold abstract picture, different for each song, so that a change is easy to see. */
function paintCover(song: Song): string {
  const S = 300;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const [a, b, c = b] = song.colors;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, S, S);
  if (song.picture === 'sun') {
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.62, S * 0.34, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = c;
    for (let i = 0; i < 5; i++) ctx.fillRect(0, S * 0.66 + i * 20, S, 8 - i);
  } else if (song.picture === 'stripes') {
    ctx.fillStyle = b;
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    for (let x = -S; x < S; x += 60) ctx.fillRect(x, -S, 28, S * 2);
    ctx.restore();
  } else if (song.picture === 'rings') {
    for (let r = S * 0.46, i = 0; r > 10; r -= 26, i++) {
      ctx.fillStyle = i % 2 ? c : b;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = b;
    ctx.fillRect(S * 0.08, S * 0.08, S * 0.5, S * 0.5);
    ctx.fillStyle = c;
    ctx.fillRect(S * 0.42, S * 0.42, S * 0.5, S * 0.5);
  }
  return cv.toDataURL('image/png');
}

/** Plays the songs in turn, starting at once. Returns a function that stops it. */
export function playStandIn(play: (track: Track) => void): () => void {
  const tracks = SONGS.map((s, i): Track => ({ id: `stand-in-${i}`, title: s.title, artist: s.artist, album: s.album, cover: paintCover(s) || null, playing: true }));
  let n = 0;
  play(tracks[0]);
  const timer = setInterval(() => {
    n = (n + 1) % tracks.length;
    play(tracks[n]);
  }, LENGTH);
  return () => clearInterval(timer);
}
