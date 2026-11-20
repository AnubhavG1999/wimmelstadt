// What the collector touches: a brass dial for the hour, tokens for the
// weather, a few small keys, and a plate that says which tile is in view. They
// are made to look like things lying on the table beside the tiles, and they
// are out of sight until the screen is touched. A card asks for the PIN where
// the heroes are behind one.

import type { CollectionState, Unlock } from '../collection';
import type { WeatherName } from '../engine/look/weather';

export interface ControlsState {
  /** The hour shown, whether it follows the clock, and whether a day is racing by. */
  hour: number;
  live: boolean;
  lapse: boolean;
  /** The weather that was asked for, or 'auto' for the city's own, and the weather there is. */
  weather: WeatherName | 'auto';
  actual: WeatherName;
  /** What the plate says: where the view is. */
  title: string;
  /** The name of the hero the view rides along with, on a plate of its own, or nothing. */
  hero: string;
  /** How many heroes there are, and whether the view rides along with one. */
  heroes: number;
  following: boolean;
  /** How things stand with the lock on the heroes. `open` is a place with no lock, and nothing is said about one there. */
  lock: CollectionState;
  focus: string;
  stats: boolean;
  turning: boolean;
  /** How things stand with the link to Spotify. `off` is a city without one, and nothing is said about music there. */
  music: 'off' | 'disconnected' | 'connecting' | 'connected';
}

export interface ControlsHandlers {
  hour(h: number): void;
  live(): void;
  lapse(): void;
  weather(w: WeatherName | 'auto'): void;
  follow(): void;
  /** Opens the picker, where the board is set: which tiles stand on it, and where. */
  tiles(): void;
  focus(): void;
  stats(): void;
  turning(): void;
  /** Tries a PIN, and says how that went. */
  unlock(pin: string): Promise<Unlock>;
  /** Locks the heroes on this device again. */
  lock(): void;
  /** Makes the link to Spotify, or ends it if there is one. */
  music(): void;
  /** Called whenever a control is touched, so that the page keeps them in sight. */
  touched(): void;
}

export interface Controls {
  /** Brings what the controls show up to date. */
  show(s: ControlsState): void;
  /** Whether somebody is in the middle of something, such as typing the PIN, and the controls should stay in sight. */
  busy(): boolean;
}

/** What the options say about the lock, and what the card says when a PIN is not taken. */
const LOCK: Record<CollectionState, string> = { open: '', locked: 'Locked', loading: 'Loading', unlocked: 'Unlocked' };
const NOT_TAKEN: Record<Exclude<Unlock, 'ok'>, string> = {
  wrong: 'That PIN is not right.',
  'slow-down': 'Too many tries. Wait a minute, then try again.',
  unreachable: 'The collection cannot be reached. Check the connection and try again.',
};

const ICON: Record<WeatherName, string> = {
  clear: '<circle cx="12" cy="12" r="4"/><path d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7"/>',
  cloudy: '<path d="M7.2 17.5h9.9a3.4 3.4 0 0 0 .5-6.76A4.9 4.9 0 0 0 8.1 9.6 4 4 0 0 0 7.2 17.5z"/>',
  rain: '<path d="M7.2 14.5h9.9a3.4 3.4 0 0 0 .5-6.76A4.9 4.9 0 0 0 8.1 6.6 4 4 0 0 0 7.2 14.5z"/><path d="M9 17.2l-.9 2.6M12.6 17.2l-.9 2.6M16.2 17.2l-.9 2.6"/>',
  storm: '<path d="M7.2 13.5h9.9a3.4 3.4 0 0 0 .5-6.76A4.9 4.9 0 0 0 8.1 5.6 4 4 0 0 0 7.2 13.5z"/><path d="M13.2 14.6l-2.6 3.4h2.6l-1.3 3.2"/>',
  fog: '<path d="M5.5 8.5h13M4 12.5h16M6.5 16.5h11"/>',
  snow: '<path d="M12 4v16M5.1 8l13.8 8M18.9 8L5.1 16"/><path d="M10 5.6l2 1.6 2-1.6M10 18.4l2-1.6 2 1.6"/>',
};
const KINDS: WeatherName[] = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'];
const NAME: Record<WeatherName, string> = { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', storm: 'Storm', fog: 'Fog', snow: 'Snow' };

/** The face of the dial: day above, night below, noon at the top and midnight at the bottom. */
function dialSvg(): string {
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const a = ((i * 15 - 90) * Math.PI) / 180, r0 = i % 6 === 0 ? 43.5 : 46.2, r1 = 49.4;
    ticks += `<line x1="${(60 + Math.cos(a) * r0).toFixed(2)}" y1="${(60 + Math.sin(a) * r0).toFixed(2)}" x2="${(60 + Math.cos(a) * r1).toFixed(2)}" y2="${(60 + Math.sin(a) * r1).toFixed(2)}" class="${i > 6 && i < 18 ? 'tick-night' : 'tick-day'}"/>`;
  }
  const stars = [[38, 78, 0.8], [52, 92, 0.6], [70, 84, 0.9], [84, 74, 0.6], [62, 100, 0.7], [44, 96, 0.5], [78, 96, 0.6]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe5ff" opacity="0.8"/>`).join('');
  return `
<svg class="dial" viewBox="0 0 120 120" role="slider" aria-label="The hour of the day" aria-valuemin="0" aria-valuemax="24" tabindex="0">
  <defs>
    <radialGradient id="brass" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#f3dc9a"/><stop offset="0.55" stop-color="#c9a352"/><stop offset="1" stop-color="#8c6a2a"/></radialGradient>
    <linearGradient id="day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d8f5"/><stop offset="1" stop-color="#f7e3ad"/></linearGradient>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3170"/><stop offset="1" stop-color="#0c0f2e"/></linearGradient>
    <radialGradient id="hub" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e4d3a6"/></radialGradient>
    <clipPath id="moon"><circle cx="60" cy="27" r="6.2"/></clipPath>
  </defs>
  <circle cx="60" cy="60" r="58.5" fill="url(#brass)" stroke="#6e531f" stroke-width="1"/>
  <path d="M9.6 60 A50.4 50.4 0 0 1 110.4 60 Z" fill="url(#day)"/>
  <path d="M110.4 60 A50.4 50.4 0 0 1 9.6 60 Z" fill="url(#night)"/>
  ${stars}
  <line x1="9.6" y1="60" x2="110.4" y2="60" stroke="#f0b06a" stroke-width="0.8" opacity="0.8"/>
  ${ticks}
  <text x="60" y="20.5" class="num num-day">12</text><text x="60" y="105" class="num num-night">24</text>
  <text x="17" y="57.6" class="num num-day">6</text><text x="103" y="57.6" class="num num-day">18</text>
  <circle cx="60" cy="60" r="50.4" fill="none" stroke="#6e531f" stroke-width="0.8"/>
  <g class="mark">
    <g class="sun"><circle cx="60" cy="27" r="6.4"/><path d="M60 16.6v2.3M60 35.1v2.3M49.6 27h2.3M68.1 27h2.3M52.6 19.6l1.6 1.6M65.8 32.8l1.6 1.6M67.4 19.6l-1.6 1.6M54.2 32.8l-1.6 1.6"/></g>
    <g class="moon"><circle cx="60" cy="27" r="6.2"/><circle cx="62.8" cy="25.2" r="5.2" class="bite" clip-path="url(#moon)"/></g>
  </g>
  <circle cx="60" cy="60" r="24.5" fill="url(#hub)" stroke="#6e531f" stroke-width="0.9"/>
  <text x="60" y="63.2" class="time">12:00</text>
  <text x="60" y="74" class="state">LIVE</text>
</svg>`;
}

/** Builds the controls inside `root` and reports what is done with them. */
export function buildControls(root: HTMLElement, on: ControlsHandlers): Controls {
  root.innerHTML = `
<div class="plates">
  <div class="plate plate-tile"></div>
  <div class="plate plate-hero" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 14.5l1.6-4.2a2 2 0 0 1 1.9-1.3h8.6a2 2 0 0 1 1.7.9l2.2 3.4v3.2h-16z"/><circle cx="7.8" cy="16.6" r="1.7"/><circle cx="16.2" cy="16.6" r="1.7"/></svg><span></span></div>
</div>
<div class="cluster">
  <div class="tokens">${KINDS.map((k, i) => `<button class="token" data-w="${k}" style="--i:${i}" title="${NAME[k]}" aria-label="${NAME[k]}"><svg viewBox="0 0 24 24">${ICON[k]}</svg></button>`).join('')}</div>
  <div class="keys">
    <button class="key" data-k="follow" title="Follow a hero (F)" aria-label="Follow a hero"><svg viewBox="0 0 24 24"><path d="M3.5 14.5l1.6-4.2a2 2 0 0 1 1.9-1.3h8.6a2 2 0 0 1 1.7.9l2.2 3.4v3.2h-16z"/><circle cx="7.8" cy="16.6" r="1.7"/><circle cx="16.2" cy="16.6" r="1.7"/></svg></button>
    <button class="key" data-k="lapse" title="Time-lapse: a day in 80 seconds (T)" aria-label="Time-lapse"><svg viewBox="0 0 24 24"><path d="M5 6.5l6 5.5-6 5.5zM12.5 6.5l6 5.5-6 5.5z"/></svg></button>
    <button class="key" data-k="tiles" title="Choose the tiles on the board" aria-label="Choose the tiles on the board" aria-haspopup="dialog"><svg viewBox="0 0 24 24">${[5, 10.4, 15.8].map((y) => [5, 10.4, 15.8].map((x) => `<rect x="${x}" y="${y}" width="3.6" height="3.6" rx="0.8"/>`).join('')).join('')}</svg></button>
    <button class="key" data-k="more" title="Options" aria-label="Options" aria-haspopup="menu"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg></button>
  </div>
  <div class="options" role="menu" aria-label="Options">
    <div class="options-title">Options</div>
    <button data-m="focus" role="menuitem"><span>Depth of field</span><b></b></button>
    <button data-m="turning" role="menuitemcheckbox"><span>Auto-rotate</span><b></b></button>
    <button data-m="stats" role="menuitemcheckbox"><span>Performance stats</span><b></b></button>
    <button data-m="heroes" role="menuitem" aria-haspopup="dialog" hidden><span>Heroes</span><b></b></button>
    <button data-m="music" role="menuitem" hidden><span>Music</span><b></b></button>
  </div>
  ${dialSvg()}
</div>
<form class="pin" role="dialog" aria-label="Heroes" hidden>
  <div class="options-title">Heroes</div>
  <p class="pin-text"></p>
  <input type="text" name="username" autocomplete="username" value="Wimmelstadt" hidden>
  <input class="pin-input" type="password" name="pin" inputmode="numeric" autocomplete="current-password" enterkeyhint="go" maxlength="64" placeholder="PIN" aria-label="PIN">
  <p class="pin-note" role="status"></p>
  <div class="pin-keys"><button type="button" class="pin-other"></button><button type="submit" class="pin-main"></button></div>
</form>`;

  const $ = <T extends Element>(sel: string): T => root.querySelector(sel) as T;
  const dial = $<SVGSVGElement>('.dial'), mark = $<SVGGElement>('.mark');
  const timeEl = $<SVGTextElement>('.time'), stateEl = $<SVGTextElement>('.state');
  const title = $<HTMLElement>('.plate-tile'), heroPlate = $<HTMLElement>('.plate-hero'), heroName = $<HTMLElement>('.plate-hero span');
  const options = $<HTMLElement>('.options'), cluster = $<HTMLElement>('.cluster');
  const tokens = [...root.querySelectorAll<HTMLButtonElement>('.token')];
  const key = (k: string): HTMLButtonElement => $<HTMLButtonElement>(`.key[data-k="${k}"]`);
  const option = (m: string): HTMLButtonElement => $<HTMLButtonElement>(`.options [data-m="${m}"]`);
  /** Writes an option's present setting beside its name, lit when it is anything but the usual. */
  const setOption = (m: string, value: string, lit: boolean): void => {
    const b = option(m).querySelector('b')!;
    b.textContent = value;
    b.classList.toggle('on', lit);
    if (option(m).getAttribute('role') === 'menuitemcheckbox') option(m).setAttribute('aria-checked', String(lit));
  };

  // --- the dial: drag the sun round it, or touch its middle to follow the clock ---
  let dragging = false, onHub = false, moved = 0, downX = 0, downY = 0;
  const hourAt = (e: PointerEvent): { hour: number; r: number } => {
    const b = dial.getBoundingClientRect();
    const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    // noon is at the top and the hours run clockwise, so the sun rises on the left
    const turn = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return { hour: (((12 + turn / 15) % 24) + 24) % 24, r: Math.hypot(dx, dy) / (b.width / 2) };
  };
  dial.addEventListener('pointerdown', (e) => {
    dial.setPointerCapture(e.pointerId);
    const p = hourAt(e);
    dragging = true;
    onHub = p.r < 0.43;
    moved = 0;
    downX = e.clientX;
    downY = e.clientY;
    if (!onHub) on.hour(p.hour);
    on.touched();
    e.preventDefault();
  });
  dial.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
    // a drag that starts on the middle and leaves it turns the dial too
    if (!onHub || moved > 8) {
      onHub = false;
      on.hour(hourAt(e).hour);
    }
    on.touched();
  });
  const drop = (): void => {
    if (dragging && onHub && moved < 8) on.live();
    dragging = false;
  };
  dial.addEventListener('pointerup', drop);
  dial.addEventListener('pointercancel', () => { dragging = false; });
  dial.addEventListener('keydown', (e) => {
    // the arrow keys are the map's: the dial takes none of them
    e.stopPropagation();
  });

  // --- the weather tokens: one kind, or the same one again for the city's own ---
  let chosen: WeatherName | 'auto' = 'auto';
  for (const t of tokens) {
    t.addEventListener('click', () => {
      const w = t.dataset.w as WeatherName;
      on.weather(chosen === w ? 'auto' : w);
      on.touched();
    });
  }

  key('follow').addEventListener('click', () => { on.follow(); on.touched(); });
  key('lapse').addEventListener('click', () => { on.lapse(); on.touched(); });
  key('tiles').addEventListener('click', () => { on.tiles(); on.touched(); });
  const openOptions = (open: boolean): void => {
    cluster.classList.toggle('open', open);
    key('more').classList.toggle('on', open);
    key('more').setAttribute('aria-expanded', String(open));
  };
  key('more').addEventListener('click', () => { openOptions(!cluster.classList.contains('open')); on.touched(); });
  option('focus').addEventListener('click', () => { on.focus(); on.touched(); });
  option('turning').addEventListener('click', () => { on.turning(); on.touched(); });
  option('stats').addEventListener('click', () => { on.stats(); on.touched(); });
  option('music').addEventListener('click', () => { on.music(); on.touched(); });
  options.addEventListener('pointerdown', () => on.touched());

  // --- the lock on the heroes: a card that takes the PIN, or locks the device again ---
  const pin = $<HTMLFormElement>('.pin'), pinText = $<HTMLElement>('.pin-text'), pinNote = $<HTMLElement>('.pin-note');
  const pinInput = $<HTMLInputElement>('.pin-input'), pinMain = $<HTMLButtonElement>('.pin-main'), pinOther = $<HTMLButtonElement>('.pin-other');
  let lock: CollectionState = 'open', checking = false;
  /** Writes the card for how things stand: asking for the PIN, or offering to lock. */
  const drawPin = (): void => {
    const locked = lock === 'locked';
    pinText.textContent = locked ? 'The collector’s diecasts drive in this city. Enter the PIN to see them.'
      : lock === 'loading' ? 'The heroes are on their way.'
      : 'The heroes are unlocked on this device. Lock it to take them out of the city here until the PIN is entered again.';
    pinInput.hidden = !locked;
    pinNote.hidden = !locked;
    pinOther.textContent = locked ? 'Cancel' : 'Lock';
    pinMain.textContent = locked ? 'Unlock' : 'Close';
    pinMain.disabled = pinInput.disabled = checking;
  };
  const openPin = (open: boolean): void => {
    if (open === !pin.hidden) return;
    pin.hidden = !open;
    pinInput.value = '';
    pinNote.textContent = '';
    if (!open) return;
    openOptions(false);
    drawPin();
    // while the hand that asked for the card is still down, or a phone will not bring up its keys
    if (lock === 'locked') pinInput.focus();
  };
  option('heroes').addEventListener('click', () => { openPin(true); on.touched(); });
  pinOther.addEventListener('click', () => {
    on.touched();
    if (lock === 'locked') openPin(false);
    else on.lock();
  });
  pin.addEventListener('submit', (e) => {
    e.preventDefault();
    on.touched();
    if (lock !== 'locked') {
      openPin(false);
      return;
    }
    const tried = pinInput.value;
    if (!tried || checking) return;
    checking = true;
    pinNote.textContent = 'Checking the PIN…';
    drawPin();
    void on.unlock(tried).catch((): Unlock => 'unreachable').then((result) => {
      checking = false;
      drawPin();
      if (result === 'ok') {
        openPin(false);
        return;
      }
      pinNote.textContent = NOT_TAKEN[result];
      pinInput.focus();
      pinInput.select();
    });
  });
  pinInput.addEventListener('input', () => on.touched());
  pin.addEventListener('pointerdown', () => on.touched());
  pin.addEventListener('keydown', (e) => {
    // what is typed here is the card's alone: the keys that turn the map and set the hour are not meant
    e.stopPropagation();
    if (e.key === 'Escape') openPin(false);
    on.touched();
  });

  // a card closes when anything else is touched
  window.addEventListener('pointerdown', (e) => {
    const at = e.target instanceof Node ? e.target : null;
    if (!at || (!options.contains(at) && !key('more').contains(at))) openOptions(false);
    if (!at || (!pin.contains(at) && !option('heroes').contains(at))) openPin(false);
  });

  let last = '';
  return {
    busy: () => !pin.hidden,
    show(s) {
      // only what has changed is written, since this is called several times a second
      const hh = Math.floor(s.hour) % 24, mm = Math.floor((s.hour % 1) * 60);
      const text = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const state = s.lapse ? 'TIME-LAPSE' : s.live ? 'LIVE' : 'SET';
      const sig = [text, state, s.weather, s.actual, s.title, s.hero, s.heroes, s.following, s.lock, s.focus, s.stats, s.turning, s.music].join('|');
      mark.setAttribute('transform', `rotate(${((s.hour - 12) * 15).toFixed(2)} 60 60)`);
      if (sig === last) return;
      last = sig;
      chosen = s.weather;
      timeEl.textContent = text;
      stateEl.textContent = state;
      dial.classList.toggle('is-night', s.hour < 6 || s.hour >= 18);
      dial.classList.toggle('is-live', s.live && !s.lapse);
      dial.setAttribute('aria-valuenow', s.hour.toFixed(2));
      dial.setAttribute('aria-valuetext', text);
      for (const t of tokens) {
        const w = t.dataset.w as WeatherName;
        t.classList.toggle('on', s.weather === w);
        t.classList.toggle('now', s.weather === 'auto' && s.actual === w);
        t.title = s.weather === w ? `${NAME[w]} (select again for automatic weather)` : NAME[w];
      }
      title.textContent = s.title;
      heroName.textContent = s.hero;
      heroPlate.hidden = s.hero === '';
      key('follow').hidden = s.heroes === 0;
      key('follow').classList.toggle('on', s.following);
      key('follow').title = s.following ? 'Stop following (F)' : 'Follow a hero (F)';
      key('lapse').classList.toggle('on', s.lapse);
      setOption('focus', s.focus.charAt(0).toUpperCase() + s.focus.slice(1), s.focus !== 'soft');
      setOption('turning', s.turning ? 'On' : 'Off', s.turning);
      setOption('stats', s.stats ? 'On' : 'Off', s.stats);
      // the row for music: what a touch will do while there is no link, and whose music it is once there is one
      option('music').hidden = s.music === 'off';
      option('music').title = s.music === 'connected' ? 'The screens in the city show what is playing. Select to end the link.' : 'Show what Spotify is playing on the screens in the city';
      setOption('music', s.music === 'connected' ? 'Spotify' : s.music === 'connecting' ? 'Connecting' : 'Connect', s.music === 'connected');
      option('heroes').hidden = s.lock === 'open';
      setOption('heroes', LOCK[s.lock], s.lock === 'unlocked');
      if (s.lock !== lock) {
        lock = s.lock;
        // a card that is open keeps up, and there is none where there is no lock
        if (lock === 'open') openPin(false);
        else if (!pin.hidden) drawPin();
      }
    },
  };
}
