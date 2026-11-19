// Wimmelstadt, the real app. So far: two tiles side by side, blocked out, to
// judge how tiles sit together before either gets its detail. Each tile is
// built from its plan in ./city: its ground and water, its roads, the models it
// already has, a rough shape for each thing that has none yet, and plain
// volumes where its ordinary buildings will be. The avenues between and round
// the tiles carry the traffic from one to the next. The light of the hour, the
// weather, the outlines, the shallow focus and the glow are the look
// prototype's, in ./look.

import * as THREE from 'three';
import { AVENUES, BOUNDS, CITY, COLS, OUTER, ROWS, origin } from './city/city.ts';
import type { P, P3 } from './city/plan.ts';
import { TILE } from './city/plan.ts';
import { atmosphereAt, formatHour, makeAtmo } from './look/atmosphere.ts';
import { makeCityMaterial } from './look/materials.ts';
import { Post, makeBackdrop } from './look/post.ts';
import { LOOK } from './look/shared.ts';
import { WEATHER_NAMES, Weather, type WeatherName } from './look/weather.ts';
import { buildAvenues } from './world/avenues.ts';
import { buildGround } from './world/ground.ts';
import { loadHeroes, sizeOutline, type Hero } from './world/hero.ts';
import { buildLandmarks, type Lamp } from './world/landmarks.ts';
import { buildMassing, heightOf } from './world/massing.ts';
import { buildRoads } from './world/roads.ts';
import { Traffic, type Route } from './world/traffic.ts';
import { IsoRig } from './view/rig.ts';
import { label, updateLabels, type Label } from './view/labels.ts';

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
  // With a mouse (a desktop) the picture is drawn larger than the screen and scaled
  // down, which smooths straight edges. `mp` bounds how many megapixels that may be.
  ss: num('ss', coarse ? 1 : 2),
  maxMP: num('mp', coarse ? 6 : 9),
  shadow: num('shadow', coarse ? 2048 : 4096),
  bloom: flag('bloom', true),
  outline: flag('outline', true),
  tilt: flag('tilt', true),
  hour: query.has('hour') ? num('hour', 12) : null,
};

// --- renderer ---------------------------------------------------------------
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.autoClear = true;

// --- scene ------------------------------------------------------------------
const scene = new THREE.Scene();
const fog = new THREE.Fog(0xffffff, 500, 2400);
scene.fog = fog;

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(opts.shadow, opts.shadow);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.6;
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(sun, sun.target, hemi);

const backdrop = makeBackdrop();
scene.add(backdrop.mesh);

// --- the city: the avenues, then every tile from its plan ------------------------
const started = performance.now();
const anisotropy = renderer.capabilities.getMaxAnisotropy();
scene.add(buildAvenues(anisotropy));

const modelled = makeCityMaterial();
const lamps: Lamp[] = [];
const halos: THREE.MeshBasicMaterial[] = [];
const labels: Label[] = [];
const names = new THREE.Group();
const routes: Route[] = [];
const count = { volumes: 0, shapes: 0, models: 0, triangles: 0 };

/** Points about two units apart along a line, so that a road follows the ground it lies on. */
function along(path: P[], closed: boolean): P[] {
  const pts = closed ? [...path, path[0]] : path, out: P[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}

const put = (l: Label, x: number, y: number, z: number): void => {
  l.sprite.position.set(x, y, z);
  names.add(l.sprite);
  labels.push(l);
};

CITY.forEach((placed, k) => {
  const plan = placed.plan, [ox, oz] = origin(placed);
  const ground = buildGround(plan, anisotropy);
  const roads = buildRoads(plan, ground);
  const massing = buildMassing(plan, ground, 20261119 + k * 97);
  const landmarks = buildLandmarks(plan, ground, modelled);
  const tile = new THREE.Group();
  tile.name = plan.id;
  tile.position.set(ox, 0, oz);
  tile.add(ground.group, roads.mesh, massing.mesh, landmarks.group);
  tile.updateMatrix();
  scene.add(tile);
  for (const lamp of landmarks.lamps) lamps.push({ at: lamp.at.premultiply(tile.matrix), color: lamp.color });
  if (landmarks.halo) halos.push(landmarks.halo);
  count.volumes += massing.volumes;
  count.shapes += massing.shapes;
  count.models += landmarks.group.children.length;
  count.triangles += roads.triangles + massing.triangles + landmarks.triangles;

  // the roads that carry traffic while the tile is a blockout
  const level = (x: number, z: number): number => Math.max(ground.heightAt(x, z), 0);
  for (const s of plan.streets) {
    if (!s.drive) continue;
    routes.push({
      id: `${plan.id}/${s.id}`, closed: s.closed === true, left: plan.drivesOnLeft,
      pts: along(s.path, s.closed === true).map(([x, z]): P3 => [ox + x, level(x, z), oz + z]),
      speed: s.kind === 'boulevard' ? 15 : s.kind === 'route' ? 13 : 11, gap: 34,
    });
  }
  for (const r of plan.raised) {
    if (!r.drive) continue;
    routes.push({ id: `${plan.id}/${r.id}`, closed: r.closed === true, left: plan.drivesOnLeft, pts: r.path.map(([x, z, y]): P3 => [ox + x, y, oz + z]), speed: 19, gap: 30 });
  }

  // its names
  put(label(plan.name.toUpperCase(), { size: 19, weight: 800, spacing: 2.6, colour: '#2b2f38' }, 300, 1e9, 0), ox + TILE / 2, 60, oz + TILE / 2);
  for (const q of plan.quarters) put(label(q.name, { size: 14, weight: 600, italic: true, colour: '#3a3f4a' }, 130, 620, 1), ox + q.at[0], 44, oz + q.at[1]);
  for (const t of plan.things) {
    const base = t.afloat ? 0 : Math.max(ground.heightAt(t.at[0], t.at[1]), 0);
    put(label(t.name, { size: 12, weight: 600 }, 0, t.major ? 420 : 200, t.major ? 2 : 3), ox + t.at[0], base + heightOf(t), oz + t.at[1]);
  }
});
labels.sort((a, b) => a.rank - b.rank);

// lamps on the models, all in one batch
const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const lampMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lampMat, Math.max(1, lamps.length));
lampMesh.count = lamps.length;
{
  const c = new THREE.Color();
  lamps.forEach((lamp, i) => {
    lampMesh.setMatrixAt(i, lamp.at);
    lampMesh.setColorAt(i, c.set(lamp.color));
  });
}
lampMesh.frustumCulled = false;
scene.add(lampMesh);
const haloA = new THREE.Color('#ff3d9a'), haloB = new THREE.Color('#35e0ff');

// --- the avenues as traffic sees them ---
{
  // the one that runs round the outside is a loop, with its corners eased
  const loop: P3[] = [], r = 5;
  OUTER.forEach((v, i) => {
    const a = OUTER[(i + OUTER.length - 1) % OUTER.length], b = OUTER[(i + 1) % OUTER.length];
    const la = Math.hypot(a[0] - v[0], a[1] - v[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const p: P = [v[0] + ((a[0] - v[0]) / la) * r, v[1] + ((a[1] - v[1]) / la) * r], q: P = [v[0] + ((b[0] - v[0]) / lb) * r, v[1] + ((b[1] - v[1]) / lb) * r];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, u = 1 - t;
      loop.push([u * u * p[0] + 2 * u * t * v[0] + t * t * q[0], 0, u * u * p[1] + 2 * u * t * v[1] + t * t * q[1]]);
    }
  });
  routes.push({ id: 'avenue-loop', pts: loop, closed: true, speed: 16, gap: 30 });
  // the ones between tiles are driven out and back
  AVENUES.forEach((a, i) => {
    const outer = i === 0 || i === COLS || i === COLS + 1 || i === COLS + 1 + ROWS;
    if (!outer) routes.push({ id: a.id, pts: [[a.from[0], 0, a.from[1]], [a.to[0], 0, a.to[1]]], closed: false, speed: 14, gap: 30 });
  });
}
const traffic = new Traffic(routes);
scene.add(traffic.group);

// names are drawn last, over the finished picture, so that the focus blur leaves them sharp
const overlay = new THREE.Scene();
overlay.add(names);
let showNames = flag('names', true);

const rig = new IsoRig();
rig.camera.layers.enable(1);
rig.attach(canvas);

const post = new Post({ bloom: opts.bloom, outline: opts.outline, tilt: opts.tilt, taps: coarse ? 14 : 20 });
const atmo = makeAtmo();
const weather = new Weather();
{
  const asked = query.get('weather');
  if (asked && (WEATHER_NAMES as string[]).includes(asked)) weather.choice = asked as WeatherName;
}
/** How shallow the focus is: gentle by default, or off, or deep. */
const FOCUS = [{ name: 'soft', amount: 1 }, { name: 'off', amount: 0 }, { name: 'deep', amount: 1.7 }];
let focusMode = Math.max(0, FOCUS.findIndex((f) => f.name === query.get('focus')));

// --- size -------------------------------------------------------------------
const bufSize = new THREE.Vector2();
let ratio = 1;
let shadowDirty = true;

/** Sets the size of the picture for a view of w by h screen points. */
function applySize(w: number, h: number): void {
  // as large as asked for, unless that would pass the megapixel bound
  ratio = Math.max(0.5, Math.min(opts.dpr * opts.ss, Math.sqrt((opts.maxMP * 1e6) / (w * h))));
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(bufSize);
  // edge smoothing on top: four samples for a small picture, two for a large one
  const msaa = coarse ? 0 : bufSize.x * bufSize.y <= 4.6e6 ? 4 : 2;
  post.setSize(Math.max(2, bufSize.x), Math.max(2, bufSize.y), msaa, ratio);
  shadowDirty = true;
}

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  if (!(w > 0 && h > 0)) return;
  applySize(w, h);
  rig.resize(w, h);
  sizeOutline(w, h);
}
window.addEventListener('resize', resize);
resize();

// --- the hour, the weather and the controls ------------------------------------
let pinned: number | null = opts.hour;
let hour = 12;
const clockHour = (): number => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};
const el = (id: string): HTMLElement | null => document.getElementById(id);
const timeEl = el('time'), dial = el('dial') as HTMLInputElement | null;
const liveBtn = el('live'), weatherBtn = el('weather'), focusBtn = el('focus'), namesBtn = el('names');
dial?.addEventListener('input', () => { pinned = Number(dial.value); });
liveBtn?.addEventListener('click', () => { pinned = null; });
weatherBtn?.addEventListener('click', () => weather.next());
focusBtn?.addEventListener('click', () => { focusMode = (focusMode + 1) % FOCUS.length; });
namesBtn?.addEventListener('click', () => { showNames = !showNames; });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'l') pinned = null;
  else if (k === 'n') pinned = 22;
  else if (k === 'd') pinned = 13;
  else if (k === 'w') weather.next();
  else if (k === 'b') focusMode = (focusMode + 1) % FOCUS.length;
  else if (k === 'm') showNames = !showNames;
});

// --- the heroes. Each joins the traffic on the avenue that runs round the city.
let following: Hero | null = null;
const heroes: Hero[] = [];
const find = el('find') as HTMLButtonElement | null;
function follow(hero: Hero | null): void {
  following = hero;
  find?.classList.toggle('on', hero !== null);
  if (hero) rig.go(hero.body.position.x, hero.body.position.z, 120);
}
rig.onPan = () => follow(null);
void loadHeroes().then((list) => {
  list.forEach((hero) => {
    hero.body.traverse((o) => { o.castShadow = true; });
    heroes.push(hero);
    scene.add(hero.body);
    traffic.adopt(hero.body, 'avenue-loop');
  });
  if (list.length && find) {
    find.textContent = list.length === 1 ? `find the ${list[0].info.name}` : `find a hero (${list.length})`;
    find.hidden = false;
    let next = 0;
    find.addEventListener('click', () => follow(following ? null : list[next++ % list.length]));
  }
});

// --- one frame ----------------------------------------------------------------
const lastSun = new THREE.Vector3(), lastAim = new THREE.Vector3();
let lastSpan = 0;
const clear = new THREE.Color();
let simTime = 0, uiAt = 0;

function step(dt: number): void {
  simTime += dt;
  hour = pinned ?? clockHour();
  atmosphereAt(hour, atmo);
  weather.update(dt);
  weather.apply(atmo);

  traffic.update(dt);
  if (following) rig.follow(following.body.position.x, following.body.position.z);
  rig.update(dt);

  // the light of the hour
  sun.color.copy(atmo.sunColor);
  sun.intensity = atmo.sunI;
  sun.shadow.intensity = atmo.shadow;
  hemi.color.copy(atmo.sky);
  hemi.groundColor.copy(atmo.ground);
  hemi.intensity = atmo.hemiI;
  backdrop.top.copy(atmo.bgTop);
  backdrop.bot.copy(atmo.bgBot);
  LOOK.uSnow.value = atmo.snow;
  LOOK.uNight.value = atmo.night;
  LOOK.uSkyTint.value.copy(atmo.sky);
  rig.camera.getWorldDirection(LOOK.uViewDir.value);
  // lamps brighten as it gets dark, and the ring round Halo Tower drifts between two colours
  lampMat.color.setScalar(0.45 + 3.0 * atmo.night);
  for (const halo of halos) halo.color.copy(haloA).lerp(haloB, 0.5 + 0.5 * Math.sin(simTime * 0.25)).multiplyScalar(0.55 + 3.2 * atmo.night);

  // Haze. The prototype's distances were set for one board seen close, so they stretch with the width of the view.
  const reach = Math.max(1, rig.viewH / 300);
  fog.color.copy(atmo.fog);
  fog.near = rig.dist + (atmo.fogNear - 700) * reach;
  fog.far = rig.dist + atmo.fogFar * reach;

  // Shadows are drawn only for the part of the city in view, and only when the sun or the view has moved.
  const span = Math.min(620, Math.max(110, rig.viewH * 0.8 * Math.max(1, rig.aspect)));
  sun.target.position.copy(rig.target);
  sun.position.copy(rig.target).addScaledVector(atmo.sunDir, 2600);
  if (shadowDirty || sun.position.distanceToSquared(lastSun) > 4 || rig.target.distanceToSquared(lastAim) > (span * 0.04) ** 2 || Math.abs(span - lastSpan) > span * 0.06) {
    const c = sun.shadow.camera;
    c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = 200; c.far = 5200;
    c.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
    lastSun.copy(sun.position);
    lastAim.copy(rig.target);
    lastSpan = span;
    shadowDirty = false;
  }
}

function draw(): void {
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
  if (showNames) {
    updateLabels(labels, rig.camera, rig.viewH, rig.heightPx * rig.aspect, rig.heightPx);
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    renderer.render(overlay, rig.camera);
    renderer.autoClear = true;
  }
}

function frame(dt: number): void {
  step(dt);
  draw();
  const now = performance.now();
  if (now - uiAt > 300) {
    uiAt = now;
    if (timeEl) timeEl.textContent = formatHour(hour);
    if (dial && document.activeElement !== dial) dial.value = String(hour);
    liveBtn?.classList.toggle('on', pinned === null);
    if (weatherBtn) {
      weatherBtn.textContent = weather.choice === 'auto' ? `weather: ${weather.name}` : weather.choice;
      weatherBtn.classList.toggle('on', weather.choice !== 'auto');
    }
    if (focusBtn) {
      focusBtn.textContent = `focus: ${FOCUS[focusMode].name}`;
      focusBtn.classList.toggle('on', focusMode !== 0);
    }
    namesBtn?.classList.toggle('on', showNames);
  }
}

let last = performance.now();
function loop(now: number): void {
  // never a step backwards, whatever the clock that drives the loop does
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

const note = el('note');
if (note) {
  note.textContent = `${CITY.length} tiles: ${count.models} models, ${count.shapes} rough shapes, ${count.volumes} plain volumes, ${traffic.count} vehicles. Built in ${Math.round(performance.now() - started)} ms.`;
}

/** Jumps the view to a thing or a tile, by its id. */
function go(id: string, viewH = 150, azDeg = 42): boolean {
  for (const placed of CITY) {
    const [ox, oz] = origin(placed);
    if (placed.plan.id === id) {
      rig.set(ox + TILE / 2, oz + TILE / 2, azDeg, Math.max(viewH, 330));
      return true;
    }
    const t = placed.plan.things.find((x) => x.id === id);
    if (t) {
      rig.set(ox + t.at[0], oz + t.at[1], azDeg, viewH);
      return true;
    }
  }
  return false;
}

interface ShotOptions { hour?: number; weather?: WeatherName; x?: number; z?: number; az?: number; zoom?: number; names?: boolean; heroes?: boolean }

/**
 * Draws one picture of a chosen view, hour and weather, and hands it to the
 * development server, which saves it in screenshots/. Only works under `npm run dev`.
 */
async function shot(name: string, o: ShotOptions = {}): Promise<string> {
  if (!import.meta.env.DEV) return 'only available on the development server';
  const keep = { pinned, choice: weather.choice, names: showNames };
  if (o.hour !== undefined) pinned = o.hour;
  weather.choice = o.weather ?? 'clear';
  showNames = o.names ?? showNames;
  if (o.x !== undefined || o.z !== undefined || o.zoom !== undefined || o.az !== undefined) {
    rig.set(o.x ?? rig.target.x, o.z ?? rig.target.z, o.az ?? THREE.MathUtils.radToDeg(rig.az), o.zoom ?? rig.viewH);
  }
  for (const h of heroes) h.body.visible = o.heroes ?? true;
  // let the weather settle before the picture is taken
  for (let i = 0; i < 400; i++) weather.update(0.1);
  shadowDirty = true;
  step(0);
  draw();
  draw();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.9));
  pinned = keep.pinned;
  weather.choice = keep.choice;
  showNames = keep.names;
  for (const h of heroes) h.body.visible = true;
  if (!blob) return 'no picture';
  const res = await fetch(`./__shot?name=${encodeURIComponent(name)}.jpg`, { method: 'POST', body: blob });
  return res.ok ? `saved ${name}.jpg (${canvas.width} x ${canvas.height})` : `could not save: ${res.status}`;
}

// For working on the app from the console. A hidden page draws no frames of its own: `wimmel.frame()` draws one.
Object.assign(window, {
  wimmel: {
    opts, rig, renderer, scene, traffic, heroes, atmo, weather, bounds: BOUNDS, count, follow, go, shot, resize,
    frame: (dt = 1 / 60) => frame(dt),
    setHour(h: number | null) { pinned = h; },
  },
});
