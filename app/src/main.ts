// Wimmelstadt: the page. It puts the tiles of the city on the board, lights them
// by the hour and the weather, and lets the view roam over them.

import * as THREE from 'three';
import { buildBoard } from './engine/board';
import { IsoRig } from './engine/camera';
import { loadHeroes, sizeOutline } from './engine/hero';
import { atmosphereAt, formatHour, makeAtmo } from './engine/look/atmosphere';
import { U } from './engine/look/materials';
import { Post, makeBackdrop } from './engine/look/post';
import { WEATHER_NAMES, Weather, type WeatherName } from './engine/look/weather';
import { PARTY_TRICKS } from './heroes';
import { tilesFor } from './tiles';

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

// The sun's shadows have to reach every tile on the board.
const reach = Math.hypot(board.bounds.x1 - board.bounds.x0, board.bounds.z1 - board.bounds.z0) / 2 + 36;
const sunDist = 260 + reach;
{
  const c = sun.shadow.camera;
  c.left = -reach; c.right = reach; c.top = reach; c.bottom = -reach; c.near = 20; c.far = sunDist + reach + 310;
  c.updateProjectionMatrix();
}

// The heroes, each made from a real diecast. Every time the page loads, each
// one is put on a tile picked at random, somewhere on its roads or on show.
// Only the development server has any; without them the city has traffic alone.
void loadHeroes().then((list) => {
  for (const h of list) if (!PARTY_TRICKS[h.info.capture]) console.warn(`${h.info.name} has no party trick yet. Every hero gets one: see src/heroes.`);
  // ?place=express-inner puts them on one road or spot instead, for looking at it
  board.placeHeroes(list, PARTY_TRICKS, query.get('place'));
});

const rig = new IsoRig(board.bounds);
rig.drift = opts.drift;
rig.camera.layers.enable(1);
rig.attach(canvas);
// A view can be given in the address: ?x=..&z=..&az=..&zoom=..
const startView = query.has('az') || query.has('zoom') || query.has('x') || query.has('z');

// The mirror image for wet streets is drawn by a second camera below the ground.
const mirror = new THREE.OrthographicCamera();
mirror.layers.set(0);

const post = new Post({ bloom: opts.bloom, outline: opts.outline, tilt: opts.tilt, taps: coarse ? 14 : 20 });
const atmo = makeAtmo();

// The weather is the city's own unless one kind is asked for: ?weather=rain
const weather = new Weather();
{
  const asked = query.get('weather');
  if (asked && (WEATHER_NAMES as string[]).includes(asked)) weather.choice = asked as WeatherName;
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
}
window.addEventListener('resize', resize);
resize();
if (startView) rig.set(num('x', 0), num('z', 4), num('az', 42), num('zoom', 250));

// --- time of day ------------------------------------------------------------
let follow = query.has('follow') ? num('follow', 0) : -1;
let pinned: number | null = opts.hour;
let lapse = false;
let hour = 12;
const clockHour = (): number => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

const timeEl = document.getElementById('time')!;
const dial = document.getElementById('dial') as HTMLInputElement;
const liveBtn = document.getElementById('live')!;
const lapseBtn = document.getElementById('lapse')!;
const statsBtn = document.getElementById('stats')!;
const followBtn = document.getElementById('follow')!;
const nextHero = (): void => {
  follow = follow + 1 >= board.heroes.length ? -1 : follow + 1;
};
followBtn.addEventListener('click', () => {
  nextHero();
  wake();
});
rig.onPan = () => {
  follow = -1;
};
const hud = document.getElementById('hud')!;
const weatherBtn = document.getElementById('weather')!;
const focusBtn = document.getElementById('focus')!;
weatherBtn.addEventListener('click', () => {
  weather.next();
  wake();
});
focusBtn.addEventListener('click', () => {
  focusMode = (focusMode + 1) % FOCUS.length;
  wake();
});

dial.addEventListener('input', () => {
  pinned = Number(dial.value);
  lapse = false;
  wake();
});
liveBtn.addEventListener('click', () => {
  pinned = null;
  lapse = false;
  wake();
});
lapseBtn.addEventListener('click', () => {
  lapse = !lapse;
  if (lapse && pinned === null) pinned = clockHour();
  wake();
});
let showStats = opts.stats;
statsBtn.addEventListener('click', () => {
  showStats = !showStats;
  wake();
});
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 's') showStats = !showStats;
  else if (k === 't') { lapse = !lapse; if (lapse && pinned === null) pinned = clockHour(); }
  else if (k === 'l') { pinned = null; lapse = false; }
  else if (k === 'n') { pinned = 22; lapse = false; }
  else if (k === 'd') { pinned = 13; lapse = false; }
  else if (k === 'o') rig.drift = !rig.drift;
  else if (k === 'f') nextHero();
  else if (k === 'w') weather.next();
  else if (k === 'b') focusMode = (focusMode + 1) % FOCUS.length;
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
  sun.position.copy(atmo.sunDir).multiplyScalar(sunDist);
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
  // About `fps` frames a second, and thirty in calm mode, after a minute without input.
  // A screen that refreshes faster is drawn on every second, third or fourth refresh,
  // which keeps the motion even: 60 on a 120 Hz screen, 72 on a 144 Hz one.
  const calm = now - rig.lastInput > 60000;
  const cap = calm ? Math.min(30, opts.fps) : opts.fps;
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
  cpuAcc += performance.now() - t0;

  frames++;
  acc += elapsed;
  worst = Math.max(worst, elapsed);
  if (now - lastWake > 4500) document.body.classList.add('idle');

  if (now - hudAt > 400) {
    fps = (frames * 1000) / Math.max(1, acc);
    avgMs = acc / Math.max(1, frames);
    worstMs = worst;
    cpuMs = cpuAcc / Math.max(1, frames);
    frames = 0; acc = 0; worst = 0; cpuAcc = 0;
    hudAt = now;
    timeEl.textContent = formatHour(hour);
    if (document.activeElement !== dial || lapse || pinned === null) dial.value = String(hour);
    liveBtn.classList.toggle('on', pinned === null);
    lapseBtn.classList.toggle('on', lapse);
    statsBtn.classList.toggle('on', showStats);
    const following = follow >= 0 && follow < board.heroes.length;
    followBtn.classList.toggle('on', following);
    followBtn.textContent = following ? board.heroes[follow].name : 'follow';
    followBtn.hidden = board.heroes.length === 0;
    weatherBtn.textContent = weather.choice === 'auto' ? `weather: ${weather.name}` : weather.choice;
    weatherBtn.classList.toggle('on', weather.choice !== 'auto');
    focusBtn.textContent = `focus: ${FOCUS[focusMode].name}`;
    focusBtn.classList.toggle('on', focusMode !== 0);
    hud.classList.toggle('on', showStats);
    if (showStats) {
      const r = renderer.info.render;
      hud.textContent = [
        `${fps.toFixed(0)} fps   frame ${avgMs.toFixed(1)} ms   worst ${worstMs.toFixed(0)} ms`,
        `script ${cpuMs.toFixed(1)} ms per frame${benchMs !== null ? `   bench ${benchMs.toFixed(2)} ms` : ''}`,
        `${r.calls} draw calls   ${(r.triangles / 1000).toFixed(0)}k triangles`,
        `${bufSize.x}x${bufSize.y} px   ${ratio.toFixed(2)}x the screen   msaa ${msaa}   shadow ${opts.shadow}`,
        `${board.stats().moving} moving, ${board.stats().parked} parked, ${board.heroes.length} heroes on ${board.tiles.length} ${board.tiles.length === 1 ? 'tile' : 'tiles'}`,
        `${calm ? 'calm: 30 fps cap' : `cap ${opts.fps} fps`} on a ${(1000 / refreshMs).toFixed(0)} Hz screen   ${reflectionNote()}`,
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
  rig.set(o.x ?? 0, o.z ?? 4, o.az ?? 42, o.zoom ?? Math.max(268, 372 / (w / h)));
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
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((done) => out.toBlob(done, 'image/jpeg', 0.9));
  follow = keep;
  weather.choice = keepWeather;
  board.showHeroes(true);
  resize();
  rig.set(view.x, view.z, view.az, view.viewH);
  if (!blob) return 'could not encode the picture';
  const capture = real ? board.heroes[0].capture : '';
  const where = real ? `&capture=${encodeURIComponent(capture)}` : '';
  const res = await fetch(`./__shot?name=${encodeURIComponent(file)}${where}`, { method: 'POST', body: blob });
  return `${real ? `captures/${capture}/screenshots/` : 'screenshots/'}${file}: ${res.status}, ${Math.round(blob.size / 1024)} kB, drawn at ${drawnAt}`;
}

// A handle for poking at the city from the console.
Object.assign(window, {
  wimmel: {
    opts, rig, renderer, atmo, board, weather, bench, frame, shot,
    setHour(h: number | null) { pinned = h; lapse = false; },
    /** Lets this many seconds pass at once, without drawing them: for looking at what happens later. */
    advance(seconds: number) {
      const now = performance.now();
      for (let i = 0; i < seconds * 60; i++) step(1 / 60, now);
    },
    setFollow(i: number) { follow = i; },
    info() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps, avgMs, cpuMs, hour, city: board.stats() }; },
  },
});

requestAnimationFrame(loop);
