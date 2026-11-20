// Wimmelstadt: the page. It puts the tiles of the city on the board, lights them
// by the hour and the weather, and lets the view roam over them.

import * as THREE from 'three';
import { openCollection, sourceFor } from './collection';
import { buildBoard } from './engine/board';
import { BASE } from './engine/build';
import { IsoRig } from './engine/camera';
import { flatFights } from './engine/checks';
import { sizeOutline } from './engine/hero';
import { atmosphereAt, makeAtmo } from './engine/look/atmosphere';
import { U } from './engine/look/materials';
import { Post, makeBackdrop } from './engine/look/post';
import { WEATHER_NAMES, Weather, type WeatherName } from './engine/look/weather';
import type { Room } from './engine/room';
import { TABLE } from './engine/table';
import { TILE } from './engine/tile';
import { PARTY_TRICKS } from './heroes';
import { openMusic } from './music';
import { musicOnScreens } from './music/screens';
import { BOARD_SIZE, POSTCARDS, keepBoard, keptBoard, setBoardOnce, tilesFor } from './tiles';
import { buildControls } from './ui/controls';
import { buildPicker } from './ui/picker';

// --- options, from the address bar ---------------------------------------
const query = new URLSearchParams(location.search);
const num = (k: string, d: number): number => {
  const v = query.get(k);
  const n = v === null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
};
const flag = (k: string, d: boolean): boolean => {
  const v = query.get(k);
  return v === null ? d : v !== '0' && v !== 'false';
};
const coarse = matchMedia('(pointer: coarse)').matches;
const opts = {
  dpr: num('dpr', Math.min(window.devicePixelRatio || 1, 2)),
  // Fidelity: with a mouse (a desktop) the picture is drawn at twice the size of the
  // screen and scaled down, which smooths the edges of straight lines. `mp` bounds how
  // many megapixels that may come to, and `fps` caps how often a frame is drawn.
  ss: num('ss', coarse ? 1 : 2),
  maxMP: num('mp', coarse ? 6 : 9),
  fps: num('fps', 60),
  msaa: num('msaa', -1), // -1 picks by the size of the picture
  shadow: num('shadow', coarse ? 1024 : 4096),
  bloom: flag('bloom', true),
  refl: flag('refl', true),
  outline: flag('outline', true),
  tilt: flag('tilt', true),
  drift: flag('drift', true),
  room: flag('room', true),
  stats: flag('stats', false),
  hour: query.has('hour') ? num('hour', 12) : null,
};

// --- renderer ---------------------------------------------------------------
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.info.autoReset = false;

// --- scene ------------------------------------------------------------------
const scene = new THREE.Scene();
const fog = new THREE.Fog(0xffffff, 500, 2400);
scene.fog = fog;

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(opts.shadow, opts.shadow);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(sun, sun.target, hemi);

const backdrop = makeBackdrop();
scene.add(backdrop.mesh);

const board = buildBoard(tilesFor(query));
scene.add(board.group);

// The sun's shadows. `reach` is how far from the middle of the board they have
// to go to cover every tile. On a board of many tiles they are drawn only for
// the part that is in view, with room to spare, so that they stay crisp
// however large the board grows: see `aimShadows`.
const reach = Math.hypot(board.bounds.x1 - board.bounds.x0, board.bounds.z1 - board.bounds.z0) / 2 + 36;
const sunDist = 260 + reach;
const boardMid = new THREE.Vector3((board.bounds.x0 + board.bounds.x1) / 2, 0, (board.bounds.z0 + board.bounds.z1) / 2);

// The heroes, each made from a real diecast. Every time the page loads, each
// one is put on a tile picked at random, somewhere on its roads or on show.
// On the collector's desk they come from the captures beside the app. Anywhere
// else they are in the collection, behind a PIN, and until the device has been
// unlocked the city has traffic alone. See src/collection.
const collection = openCollection(sourceFor(query), (list) => {
  for (const h of list) if (!PARTY_TRICKS[h.info.capture]) console.warn(`${h.info.name} has no party trick yet. Every hero gets one: see src/heroes.`);
  // ?place=express-inner puts them on one road or spot instead, for looking at it
  board.placeHeroes(list, PARTY_TRICKS, query.get('place'));
});

// What the listener's Spotify is playing goes on the big screens of the city,
// once this device has been linked to an account: see src/music.
const onScreens = musicOnScreens((now) => board.showPlaying(now));
const music = openMusic(query, (m) => onScreens(m.track));
onScreens(music.track);

const rig = new IsoRig(board.bounds);
rig.drift = opts.drift;
rig.camera.layers.enable(1);
rig.attach(canvas);
// The collector's room, round the table: a desk whose top is an old map of
// the world, and the room the desk stands in. It is fetched after the city,
// so that the city never waits for it. ?room=0 leaves it out.
let room: Room | null = null;
/** Builds the room, or builds it again for a screen of another shape. Nothing, until the room's code has arrived. */
let furnish = (): void => {};
if (opts.room) {
  void import('./engine/room').then(({ buildRoom }) => {
    const places = board.tiles.map((t) => ({ name: t.def.name, x: t.x, z: t.z, place: t.def.place }));
    furnish = () => {
      if (room) {
        scene.remove(room.group);
        room.dispose();
      }
      room = buildRoom(board.table, BASE.bottom - TABLE.under, BASE.bottom + TABLE.lip, places, coarse, { aspect: rig.aspect, fit: rig.fitBoard });
      scene.add(room.group);
      // the view is kept inside the room from now on
      rig.roam(room.desk, room.reach, room.hall);
    };
    furnish();
  });
}
// A view can be given in the address: ?x=..&z=..&az=..&zoom=..
const startView = query.has('az') || query.has('zoom') || query.has('x') || query.has('z');

// The mirror image for wet streets is drawn by a second camera below the ground.
const mirror = new THREE.OrthographicCamera();
mirror.layers.set(0);

const post = new Post({ bloom: opts.bloom, outline: opts.outline, tilt: opts.tilt, taps: coarse ? 14 : 20 });
const atmo = makeAtmo();

// The page opens under a clear sky. Another kind can be asked for, or the city's own, which
// comes and goes by itself: ?weather=rain, ?weather=auto
const weather = new Weather();
{
  const asked = query.get('weather');
  const known = asked === 'auto' || (asked !== null && (WEATHER_NAMES as string[]).includes(asked));
  weather.choice = known ? (asked as WeatherName | 'auto') : 'clear';
}

// How shallow the focus is: gentle by default, or off, or deep.
const FOCUS = [{ name: 'soft', amount: 1 }, { name: 'off', amount: 0 }, { name: 'deep', amount: 1.7 }];
let focusMode = Math.max(0, FOCUS.findIndex((f) => f.name === query.get('focus')));

// --- size -------------------------------------------------------------------
const bufSize = new THREE.Vector2();
let shadowDirty = true;
let ratio = 1; // picture pixels per screen point
let msaa = 0;

/** Sets the size of the picture for a view of w by h screen points. */
function applySize(w: number, h: number): void {
  // as large as asked for, unless that would pass the megapixel bound
  ratio = Math.max(0.5, Math.min(opts.dpr * opts.ss, Math.sqrt((opts.maxMP * 1e6) / (w * h))));
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(bufSize);
  // edge smoothing on top: four samples for a small picture, two for a large one
  msaa = opts.msaa >= 0 ? opts.msaa : coarse ? 0 : bufSize.x * bufSize.y <= 4.6e6 ? 4 : 2;
  post.setSize(Math.max(2, bufSize.x), Math.max(2, bufSize.y), msaa, ratio);
  sizeOutline(w, h);
  shadowDirty = true;
}

function resize(): void {
  // a page that loads while hidden can report no size at all
  applySize(Math.max(2, window.innerWidth), Math.max(2, window.innerHeight));
  rig.resize(window.innerWidth, window.innerHeight);
  // a screen of another shape may need the walls further off, for the whole board to be seen inside them
  if (room && !room.fits(rig.aspect, rig.fitBoard)) furnish();
}
window.addEventListener('resize', resize);
resize();
if (startView) rig.set(num('x', 0), num('z', 4), num('az', 42), num('zoom', 250));
// and so can a tilt, in degrees: ?elev=24
if (query.has('elev')) rig.setTilt(THREE.MathUtils.degToRad(Math.min(89, Math.max(5, num('elev', 38)))));

/** Half the width of the ground the shadows are drawn for now. */
let shadowHalf = 0;
/** Points the sun's shadows at what is in view, and redraws them only when the view has left what they cover or could be much sharper. */
function aimShadows(): void {
  const g = rig.goal;
  // what can be seen of the ground, and room round it for whatever casts a shadow into it
  const seen = Math.hypot(g.viewH * rig.aspect, g.viewH / Math.sin(rig.elev)) / 2 + 60;
  const whole = seen * 1.2 >= reach;
  const need = whole ? reach : Math.max(160, seen);
  const ax = whole ? boardMid.x : g.x, az = whole ? boardMid.z : g.z;
  const at = sun.target.position;
  if (shadowHalf > 0 && Math.hypot(ax - at.x, az - at.z) + need <= shadowHalf && need * 1.2 >= shadowHalf * 0.62) return;
  shadowHalf = whole ? reach : Math.min(reach, need * 1.2);
  at.set(ax, 0, az);
  sun.target.updateMatrixWorld();
  const c = sun.shadow.camera;
  c.left = -shadowHalf; c.right = shadowHalf; c.top = shadowHalf; c.bottom = -shadowHalf; c.near = 20; c.far = sunDist + reach + 310;
  c.updateProjectionMatrix();
  shadowDirty = true;
}

// --- the board and its tiles --------------------------------------------------------
// The view is free: it stays wherever the hand leaves it, over one tile, across
// two, or anywhere between. Only an asking moves it by itself.
const many = board.tiles.length > 1;
const toBoard = (): void => rig.fly(boardMid.x, boardMid.z + 4, rig.fitBoard);
/** The tile nearest to a place on the ground. */
const nearestTile = (x: number, z: number) => board.tiles.reduce((a, b) => (Math.hypot(b.x - x, b.z - z) < Math.hypot(a.x - x, a.z - z) ? b : a));
// Twice on a tile goes to that tile, and twice on the table goes back to the board.
rig.onDouble = (x, z) => {
  const t = board.tileAt(x, z);
  follow = -1;
  if (t) rig.fly(t.x, t.z + 4, rig.fitTile);
  else toBoard();
};

// --- time of day ------------------------------------------------------------
let follow = query.has('follow') ? num('follow', 0) : -1;
let pinned: number | null = opts.hour;
let lapse = false;
let hour = 12;
const clockHour = (): number => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

const nextHero = (): void => {
  follow = follow + 1 >= board.heroes.length ? -1 : follow + 1;
};
rig.onPan = () => {
  follow = -1;
};
const hud = document.getElementById('hud')!;
let showStats = opts.stats;
const toggleLapse = (): void => {
  lapse = !lapse;
  if (lapse && pinned === null) pinned = clockHour();
};

// The picker, where the board is set: which of the tiles stand on it, and where. See ui/picker.ts.
const picker = buildPicker(document.getElementById('picker')!, POSTCARDS, BOARD_SIZE, {
  done(tiles, keep, changed) {
    keepBoard(keep ? tiles : null);
    if (!changed) return;
    // Other tiles on the table: the plainest way to set them out is to load the page afresh,
    // with the board that was asked for, and without an address that asks for another.
    setBoardOnce(tiles);
    const next = new URL(location.href);
    next.searchParams.delete('tiles');
    next.searchParams.delete('order');
    if (next.href === location.href) location.reload();
    else location.replace(next.href);
  },
  touched: () => wake(),
  // its postcards fly from place to place, unless the device was asked for less motion: ?motion=1 or ?motion=0 says which
}, query.has('motion') ? !flag('motion', true) : matchMedia('(prefers-reduced-motion: reduce)').matches);

// The controls: a dial for the hour, tokens for the weather and a few keys. See ui/controls.ts.
const controls = buildControls(document.getElementById('ui')!, {
  hour(h) { pinned = h; lapse = false; },
  live() { pinned = null; lapse = false; },
  lapse: toggleLapse,
  weather(w) { weather.choice = w; },
  follow: nextHero,
  tiles() { picker.open(board.tiles.map((t) => t.def.id), keptBoard() !== null); },
  focus() { focusMode = (focusMode + 1) % FOCUS.length; },
  stats() { showStats = !showStats; },
  turning() { rig.drift = !rig.drift; },
  unlock: (pin) => collection.unlock(pin),
  // the heroes leave with the lock, and the plainest way to take them out of the city is to load the page afresh
  lock() { void collection.lock().then(() => location.reload()); },
  music() {
    if (music.state === 'connected') music.disconnect();
    else if (music.state === 'disconnected') music.connect();
  },
  touched: () => wake(),
});

/** Brings the controls up to date: the hour, the weather, and what the plate says about where the view is. */
function showControls(): void {
  const following = follow >= 0 && follow < board.heroes.length;
  const g = rig.goal;
  // the whole board is the city; anything closer is the tile the view is on
  const wide = many && g.viewH > rig.fitTile * 1.3;
  const tile = following ? board.heroes[follow].tile : (board.tileAt(g.x, g.z - 4) ?? nearestTile(g.x, g.z));
  controls.show({
    hour, live: pinned === null, lapse,
    weather: weather.choice, actual: weather.name,
    title: wide && !following ? 'Wimmelstadt' : tile.def.name,
    hero: following ? board.heroes[follow].name : '',
    heroes: board.heroes.length, following,
    lock: collection.state,
    music: music.state,
    focus: FOCUS[focusMode].name, stats: showStats, turning: rig.drift,
  });
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  // while the board is being set, the keys are the picker's
  if (picker.isOpen()) {
    if (k === 'escape') picker.close();
    return;
  }
  if (k === 's') showStats = !showStats;
  else if (k === 't') toggleLapse();
  else if (k === 'l') { pinned = null; lapse = false; }
  else if (k === 'n') { pinned = 22; lapse = false; }
  else if (k === 'd') { pinned = 13; lapse = false; }
  else if (k === 'o') rig.drift = !rig.drift;
  else if (k === 'f') nextHero();
  else if (k === 'w') weather.next();
  else if (k === 'b') focusMode = (focusMode + 1) % FOCUS.length;
  else if (k === 'escape') { follow = -1; toBoard(); rig.levelOut(); }
  else return;
  wake();
});

// --- the interface fades away when nobody touches anything -------------------
let lastWake = performance.now();
function wake(): void {
  lastWake = performance.now();
  rig.lastInput = lastWake;
  document.body.classList.remove('idle');
}
rig.onInput = () => {
  lastWake = performance.now();
  document.body.classList.remove('idle');
};
window.addEventListener('pointermove', () => {
  lastWake = performance.now();
  document.body.classList.remove('idle');
});

// --- keep the screen awake, where the browser allows it -----------------------
let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (nav.wakeLock && document.visibilityState === 'visible') wakeLock = await nav.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}
window.addEventListener('pointerdown', () => { if (!wakeLock) void keepAwake(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void keepAwake(); });

// --- one frame ----------------------------------------------------------------
const lastSun = new THREE.Vector3();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const clear = new THREE.Color();
let simTime = 0;

function updateMirror(): void {
  const cam = rig.camera;
  mirror.left = cam.left; mirror.right = cam.right; mirror.top = cam.top; mirror.bottom = cam.bottom;
  mirror.near = cam.near; mirror.far = cam.far;
  mirror.updateProjectionMatrix();
  // the camera's own position, view direction and up, each flipped through the ground
  mirror.position.set(cam.position.x, -cam.position.y, cam.position.z);
  cam.getWorldDirection(tmp);
  tmp.y = -tmp.y;
  tmp2.set(0, 1, 0).applyQuaternion(cam.quaternion);
  tmp2.y = -tmp2.y;
  mirror.up.copy(tmp2);
  mirror.lookAt(tmp.add(mirror.position));
  mirror.updateMatrixWorld();
  U.uMirrorVP.value.multiplyMatrices(mirror.projectionMatrix, mirror.matrixWorldInverse);
}

function step(dt: number, now: number): void {
  simTime += dt;
  if (lapse) pinned = ((pinned ?? clockHour()) + (dt * 24) / 80) % 24;
  hour = pinned ?? clockHour();
  atmosphereAt(hour, atmo);
  weather.update(dt);
  weather.apply(atmo);

  sun.color.copy(atmo.sunColor);
  sun.intensity = atmo.sunI;
  sun.shadow.intensity = atmo.shadow;
  aimShadows();
  sun.position.copy(atmo.sunDir).multiplyScalar(sunDist).add(sun.target.position);
  hemi.color.copy(atmo.sky);
  hemi.groundColor.copy(atmo.ground);
  hemi.intensity = atmo.hemiI;
  fog.color.copy(atmo.fog);
  // the haze brackets the board, however many tiles are on it: clear at its near side, faint at its far side
  fog.near = atmo.fogNear * rig.span;
  fog.far = rig.dist + atmo.fogFar * rig.span;
  U.uSnow.value = atmo.snow;
  backdrop.top.copy(atmo.bgTop);
  backdrop.bot.copy(atmo.bgBot);
  U.uNight.value = atmo.night;
  U.uTime.value = simTime;
  U.uSkyTint.value.copy(atmo.sky);
  U.uWet.value = atmo.wet;
  if (shadowDirty || sun.position.distanceToSquared(lastSun) > 1) {
    renderer.shadowMap.needsUpdate = true;
    lastSun.copy(sun.position);
    shadowDirty = false;
  }

  board.update(dt, simTime, atmo.night, atmo.wet);
  if (follow >= 0 && follow < board.heroes.length) {
    // ride along with a hero, and keep the focus on it wherever it climbs
    rig.center(board.heroes[follow].pos);
    rig.focusY = board.heroes[follow].pos.y + 1;
  } else {
    rig.focusY = null;
  }
  rig.update(dt, now);
  rig.camera.getWorldDirection(U.uViewDir.value);
  room?.update(rig.az, rig.viewH, atmo.night, atmo.bgTop);
}

function draw(): void {
  renderer.info.reset();
  // wet streets mirror the city, and so does water, whatever the weather
  const reflOn = opts.refl && (atmo.wet > 0.03 || board.mirrors);
  U.uReflOn.value = reflOn ? 1 : 0;
  if (reflOn) {
    updateMirror();
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(post.reflRT);
    renderer.render(scene, mirror);
    U.uRefl.value = post.reflRT.texture;
  }
  clear.copy(atmo.bgBot).lerp(atmo.bgTop, 0.5);
  renderer.setClearColor(clear, 1);
  renderer.setRenderTarget(post.sceneRT);
  renderer.render(scene, rig.camera);
  post.present(renderer, {
    focus: rig.focusDepth,
    depthRange: rig.camera.far - rig.camera.near,
    viewH: rig.viewH,
    elev: rig.elev,
    bloom: atmo.bloom,
    exposure: atmo.exposure,
    outline: atmo.outline,
    tilt: FOCUS[focusMode].amount,
    saturation: atmo.saturation,
    time: simTime,
    rain: atmo.rain,
    snow: atmo.snowfall,
    fall: 0.1 + 0.28 * (1 - atmo.night),
    flash: atmo.flash,
  });
}

// --- the loop -------------------------------------------------------------------
let last = performance.now();
let lastRender = 0;
let frames = 0, acc = 0, worst = 0, fps = 0, avgMs = 0, worstMs = 0, cpuMs = 0, cpuAcc = 0;
let hudAt = 0;
let benchMs: number | null = null;

function loop(now: number): void {
  requestAnimationFrame(loop);
  frame(now);
}

// How often the screen refreshes, measured from the browser's own rhythm.
let lastTick = 0, ticks = 0, refreshMs = 1000 / 60;
const tickGaps: number[] = [];

/** One turn of the loop. Returns false when the frame was skipped to keep to the cap. */
function frame(now: number): boolean {
  const gap = now - lastTick;
  lastTick = now;
  if (gap > 2 && gap < 50) {
    tickGaps.push(gap);
    if (tickGaps.length > 40) tickGaps.shift();
    if (tickGaps.length >= 10 && ticks % 20 === 0) {
      // a low percentile, so that the odd late frame does not skew it
      refreshMs = [...tickGaps].sort((a, b) => a - b)[Math.floor(tickGaps.length * 0.3)];
    }
  }
  // About `fps` frames a second, and no more than sixty in calm mode, after a minute without
  // input, so that the city looked at from across the room stays as smooth as it is up close.
  // A screen that refreshes faster is drawn on every second, third or fourth refresh,
  // which keeps the motion even: 60 on a 120 Hz screen, 72 on a 144 Hz one.
  const calm = now - rig.lastInput > 60000;
  const cap = calm ? Math.min(60, opts.fps) : opts.fps;
  const every = cap >= 240 ? 1 : Math.max(1, Math.floor(1000 / refreshMs / cap + 0.4));
  ticks++;
  if (ticks % every !== 0) return false;
  const elapsed = now - last;
  // never a step backwards, whatever the clock that drives the loop does
  const dt = Math.max(0, Math.min(0.05, elapsed / 1000));
  last = now;
  lastRender = now;

  const t0 = performance.now();
  step(dt, now);
  draw();
  showControls();
  cpuAcc += performance.now() - t0;

  frames++;
  acc += elapsed;
  worst = Math.max(worst, elapsed);
  // nothing fades away under somebody who is in the middle of typing the PIN, or of setting the board
  if (now - lastWake > 4500 && !controls.busy() && !picker.isOpen()) document.body.classList.add('idle');

  if (now - hudAt > 400) {
    fps = (frames * 1000) / Math.max(1, acc);
    avgMs = acc / Math.max(1, frames);
    worstMs = worst;
    cpuMs = cpuAcc / Math.max(1, frames);
    frames = 0; acc = 0; worst = 0; cpuAcc = 0;
    hudAt = now;
    hud.classList.toggle('on', showStats);
    if (showStats) {
      const r = renderer.info.render;
      hud.textContent = [
        `${fps.toFixed(0)} fps   frame ${avgMs.toFixed(1)} ms   worst ${worstMs.toFixed(0)} ms`,
        `script ${cpuMs.toFixed(1)} ms per frame${benchMs !== null ? `   bench ${benchMs.toFixed(2)} ms` : ''}`,
        `${r.calls} draw calls   ${(r.triangles / 1000).toFixed(0)}k triangles`,
        `${bufSize.x}x${bufSize.y} px   ${ratio.toFixed(2)}x the screen   msaa ${msaa}   shadow ${opts.shadow}`,
        `${board.stats().moving} moving, ${board.stats().parked} parked, ${board.heroes.length} heroes on ${board.tiles.length} ${board.tiles.length === 1 ? 'tile' : 'tiles'}`,
        `${calm ? `calm: ${Math.min(60, opts.fps)} fps cap` : `cap ${opts.fps} fps`} on a ${(1000 / refreshMs).toFixed(0)} Hz screen   ${reflectionNote()}`,
        `screen kept awake: ${wakeLock ? 'yes' : 'no'}`,
      ].join('\n');
    }
  }
  return true;
}

function reflectionNote(): string {
  return opts.refl && atmo.wet > 0.03 ? 'wet streets on' : 'wet streets off';
}

/** Draws frames back to back and waits for each to finish, to measure what a frame really costs. */
function bench(count = 120): number {
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const now = performance.now();
  for (let i = 0; i < 5; i++) { step(1 / 60, now); draw(); }
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    step(1 / 60, now);
    draw();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  }
  benchMs = (performance.now() - t0) / count;
  return benchMs;
}

interface ShotOptions {
  w?: number; h?: number; hour?: number; x?: number; z?: number; az?: number; zoom?: number; follow?: number; steps?: number; weather?: WeatherName;
  /** Whether the heroes are in the picture. They are not unless this says so. */
  heroes?: boolean;
  /** A plan: the picture is taken from straight above, with north at the top and nothing blurred. */
  plan?: boolean;
  /** How steeply the picture looks down, in degrees. 38 unless this says otherwise. */
  elev?: number;
  /** The picture is drawn at the size given and saved this many times smaller: a small picture with fine lines. */
  shrink?: number;
  /** How faithfully the picture is saved, from 0 to 1. 0.9 unless this says otherwise. */
  quality?: number;
}

/**
 * Draws one picture at a chosen size, without the interface, and hands it to the
 * development server to save. Only works under `npm run dev`.
 *
 * A picture is public unless it shows a hero: it goes in screenshots/, with no
 * heroes in it. Ask for `heroes: true` and the heroes are in it, and it is
 * saved with the first hero's capture instead, which is private.
 */
async function shot(name: string, o: ShotOptions = {}): Promise<string> {
  if (!import.meta.env.DEV) return 'only available on the development server';
  const file = name.endsWith('.jpg') ? name : `${name}.jpg`;
  const real = o.heroes === true && board.heroes.length > 0;
  board.showHeroes(real);
  const w = o.w ?? 1600, h = o.h ?? 1000;
  if (o.hour !== undefined) { pinned = o.hour; lapse = false; }
  applySize(w, h);
  rig.resize(w, h);
  const now = performance.now();
  rig.lastInput = now;
  const view = { x: rig.target.x, z: rig.target.z, az: THREE.MathUtils.radToDeg(rig.az), viewH: rig.viewH };
  const keepElev = rig.goal.elev, keepFocus = focusMode;
  rig.setTilt(THREE.MathUtils.degToRad(o.elev ?? 38));
  if (o.plan) {
    // not quite straight down, so that the view still knows which way is north
    rig.setTilt(1.553);
    focusMode = FOCUS.findIndex((f) => f.name === 'off');
  }
  rig.set(o.x ?? 0, o.z ?? 4, o.plan ? 0 : (o.az ?? 42), o.zoom ?? Math.max(268, 372 / (w / h)));
  const keep = follow;
  follow = -1;
  const keepWeather = weather.choice;
  weather.choice = o.weather ?? 'clear';
  // let the weather settle before the picture is taken
  for (let i = 0; i < 400; i++) weather.update(0.1);
  for (let i = 0; i < (o.steps ?? 2); i++) step(1 / 60, now);
  if (o.follow !== undefined && board.heroes[o.follow]) {
    follow = o.follow;
    step(0, now); // aims and focuses at the hero
    rig.snap();
    step(0, now);
  }
  draw();
  draw();
  const drawnAt = `${bufSize.x}x${bufSize.y}`;
  const out = document.createElement('canvas');
  out.width = Math.round(w / (o.shrink ?? 1));
  out.height = Math.round(h / (o.shrink ?? 1));
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob | null>((done) => out.toBlob(done, 'image/jpeg', o.quality ?? 0.9));
  follow = keep;
  weather.choice = keepWeather;
  board.showHeroes(true);
  rig.setTilt(keepElev);
  focusMode = keepFocus;
  resize();
  rig.set(view.x, view.z, view.az, view.viewH);
  if (!blob) return 'could not encode the picture';
  const capture = real ? board.heroes[0].capture : '';
  const where = real ? `&capture=${encodeURIComponent(capture)}` : '';
  const res = await fetch(`./__shot?name=${encodeURIComponent(file)}${where}`, { method: 'POST', body: blob });
  return `${real ? `captures/${capture}/screenshots/` : 'screenshots/'}${file}: ${res.status}, ${Math.round(blob.size / 1024)} kB, drawn at ${drawnAt}`;
}

/**
 * Takes the picture for a tile's postcard, which stands for the tile in the
 * picker (ui/picker.ts): the whole tile by day, as large as it fits, with
 * whatever flies over it at that moment. It is saved as
 * screenshots/check-postcard-<id>.jpg, and a copy of that belongs in the
 * tile's folder as postcard.jpg. Meant for a tile that stands alone on the
 * board: ?tiles=<id>&heroes=none. Only works under `npm run dev`.
 */
async function postcard(id?: string): Promise<string> {
  if (!import.meta.env.DEV) return 'only available on the development server';
  const t = board.tiles.find((b) => b.def.id === id) ?? board.tiles[0];
  // A picture is taken from 42 degrees round and 38 degrees down. What the tile covers
  // of such a picture is measured across it and up it, in the units of the ground.
  const az = THREE.MathUtils.degToRad(42), el = THREE.MathUtils.degToRad(38);
  const across = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  const upward = new THREE.Vector3(-Math.sin(az) * Math.sin(el), Math.cos(el), -Math.cos(az) * Math.sin(el));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const v = new THREE.Vector3(), m = new THREE.Matrix4();
  const see = (): void => {
    // only what stands or flies over the tile itself: a thing that was put out of sight somewhere far off is not in the picture
    if (v.x < t.x + TILE.x0 - 30 || v.x > t.x + TILE.x1 + 30 || v.z < t.z + TILE.z0 - 30 || v.z > t.z + TILE.z1 + 30 || v.y < BASE.bottom - 1 || v.y > 700) return;
    const x = v.dot(across), y = v.dot(upward);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  };
  t.standing.group.updateMatrixWorld(true);
  const walk = (o: THREE.Object3D): void => {
    if (!o.visible) return;
    const mesh = o as THREE.Mesh, copies = o as THREE.InstancedMesh;
    const at = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
    if (at && copies.isInstancedMesh) {
      // every copy of a shape that is drawn many times, by the corners of the box it fits in
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const b = mesh.geometry.boundingBox!;
      for (let i = 0; i < copies.count; i++) {
        copies.getMatrixAt(i, m);
        m.premultiply(copies.matrixWorld);
        for (let c = 0; c < 8; c++) {
          v.set(c & 1 ? b.max.x : b.min.x, c & 2 ? b.max.y : b.min.y, c & 4 ? b.max.z : b.min.z).applyMatrix4(m);
          see();
        }
      }
    } else if (at) {
      for (let i = 0; i < at.count; i++) {
        v.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        see();
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(t.standing.group);
  if (x0 > x1) return 'nothing of the tile was found';
  // A postcard's picture is four by three. The tile fills it, with a narrow margin, and its middle is the picture's.
  const w = 960, h = 720;
  const zoom = Math.max((x1 - x0) / ((w / h) * 0.95), (y1 - y0) / 0.93);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // the view looks at a point a little above the ground, the further out the higher: see IsoRig.update
  const lookY = 28 * THREE.MathUtils.smoothstep(zoom, 110, 260);
  const back = (lookY * Math.cos(el) - cy) / Math.sin(el);
  const x = cx * Math.cos(az) + back * Math.sin(az), z = -cx * Math.sin(az) + back * Math.cos(az);
  const said = await shot(`check-postcard-${t.def.id}`, { w, h, shrink: 2, quality: 0.82, hour: 13, x, z, zoom });
  return `${said}, the tile ${Math.round(x1 - x0)} across and ${Math.round(y1 - y0)} up, seen from ${zoom.toFixed(0)}`;
}

/**
 * Whether a place can be seen from where the view is now, or what is in the
 * way: the first thing that is built between it and the camera. For checking
 * a place for a hero without looking at a hero. People, trees and vehicles are
 * not counted.
 */
function seen(x: number, y: number, z: number): { seen: boolean; after?: number; at?: [number, number, number] } {
  const toCamera = rig.camera.getWorldDirection(new THREE.Vector3()).negate();
  const built: THREE.Object3D[] = [];
  const skip = new Set<THREE.Object3D>(board.tiles.map((t) => t.vehicles.group));
  const walk = (o: THREE.Object3D): void => {
    if (skip.has(o)) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) built.push(o);
    for (const c of o.children) walk(c);
  };
  walk(board.group);
  board.group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, y, z).addScaledVector(toCamera, 0.1), toCamera);
  const [hit] = ray.intersectObjects(built, false);
  if (!hit) return { seen: true };
  return { seen: false, after: Math.round(hit.distance * 10) / 10, at: [Math.round(hit.point.x * 10) / 10, Math.round(hit.point.y * 10) / 10, Math.round(hit.point.z * 10) / 10] };
}

// A handle for poking at the city from the console.
Object.assign(window, {
  wimmel: {
    opts, rig, renderer, atmo, board, weather, collection, music, picker, bench, frame, shot, postcard, seen,
    get room() { return room; },
    setHour(h: number | null) { pinned = h; lapse = false; },
    /** Lets this many seconds pass at once, without drawing them: for looking at what happens later. */
    advance(seconds: number) {
      const now = performance.now();
      for (let i = 0; i < seconds * 60; i++) step(1 / 60, now);
    },
    setFollow(i: number) { follow = i; },
    /**
     * Flat surfaces that lie in one plane and overlap, which flicker as the view
     * moves: on one tile, or on every tile. Each is given in its tile's own
     * coordinates. See `flatFights` in engine/checks.ts. Development server only.
     */
    fights: import.meta.env.DEV ? (id?: string) => {
      const rows = board.tiles.filter((t) => !id || t.def.id === id)
        .flatMap((t) => flatFights(t.standing.group, new Set<THREE.Object3D>([t.vehicles.group])).map((f) => ({ tile: t.def.id, ...f })));
      console.table(rows);
      return rows;
    } : undefined,
    info() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps, avgMs, cpuMs, hour, city: board.stats() }; },
  },
});

requestAnimationFrame(loop);
