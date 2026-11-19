// Shows the models a capture produced side by side, all turning together, next
// to the pictures they were made from. Everything it shows comes from the
// captures folder, which the development server hands over.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface Capture { name: string; item?: string; page?: string; views: Record<string, string> }
interface Run {
  id: string; generator: string; label: string; price: number; used: string[];
  status: 'queued' | 'done' | 'failed'; seconds?: number; file?: string; bytes?: number; error?: string;
}
interface Ledger { runs: Run[] }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const json = async <T>(url: string): Promise<T | null> => {
  const r = await fetch(url);
  return r.ok ? ((await r.json()) as T) : null;
};

/** The length every model is scaled to: a toy car in the city is about seven units long. */
const LENGTH = 7;

const names = (await json<string[]>('/captures/')) ?? [];
const wanted = new URLSearchParams(location.search).get('c');
const name = wanted && names.includes(wanted) ? wanted : names[0];

const pick = $<HTMLSelectElement>('pick');
for (const n of names) pick.add(new Option(n, n, n === name, n === name));
pick.onchange = () => { location.search = `?c=${encodeURIComponent(pick.value)}`; };
pick.hidden = names.length < 2;

const empty = $('empty');
const say = (text: string) => { empty.hidden = false; empty.textContent = text; };

// --- the scene ------------------------------------------------------------------

const canvas = $<HTMLCanvasElement>('c');
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// colours are shown as the textures hold them, not graded: they are what is being judged
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.setClearColor(0x16171c);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(6, 10, 7);
const sky = new THREE.HemisphereLight(0xdfe9ff, 0x3a3630, 0.2);
scene.add(sun, sky);
const floor = new THREE.Mesh(new THREE.CircleGeometry(LENGTH * 0.95, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2c35, roughness: 1 }));
floor.position.y = -0.01;
scene.add(floor);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
const controls = new OrbitControls(camera, stage);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;

/** The orbit view, or the city's own: 38 degrees above the ground, through a long lens. */
function setView(city: boolean): void {
  const elev = THREE.MathUtils.degToRad(city ? 38 : 22), az = THREE.MathUtils.degToRad(city ? 42 : 35);
  camera.fov = city ? 9 : 30;
  const dist = city ? 78 : 22;
  camera.position.set(Math.sin(az) * Math.cos(elev) * dist, 1 + Math.sin(elev) * dist, Math.cos(az) * Math.cos(elev) * dist);
  camera.updateProjectionMatrix();
  controls.update();
}
setView(false);

// --- the models -----------------------------------------------------------------

interface Shown { run: Run; cell: HTMLElement; holder: THREE.Group | null; turn: number }
const shown: Shown[] = [];
const grey = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.65, metalness: 0.05 });
const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

// --- the city look ----------------------------------------------------------------
//
// A generated model arrives looking like a photograph: glossy, with the studio's
// reflections and shadows printed into its texture. Dropped into the city like
// that it would read as a sticker driving around. The city look draws it in the
// city's own hand instead: the same three flat bands of light, the texture's
// brightness ironed into a few steps (which removes photographed shine but keeps
// the edges of decals), and a dark outline.

/** The light ramp the city is shaded with: unlit, then three flat bands. */
const ramp = (() => {
  const steps = [0, 0, 0, 0, 112, 184, 255, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const FLATTEN = /* glsl */ `
  {
    vec3 c = diffuseColor.rgb;
    float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
    // the colour without its brightness; in the darkest corners there is none worth keeping
    vec3 hue = mix(vec3(1.0), c / l, smoothstep(0.0, 0.03, l));
    // brightness snapped to five soft steps, and never quite black, so that a black car keeps its shape
    float p = pow(l, 1.0 / 2.2) * 5.0;
    float q = max((floor(p) + smoothstep(0.3, 0.7, fract(p))) / 5.0, 0.17);
    c = hue * pow(q, 2.2);
    // a little richer, as the city is
    float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
    diffuseColor.rgb = clamp(mix(vec3(g), c, 1.2), 0.0, 1.0);
  }
`;

const cityMaterials = new Map<THREE.Material, THREE.MeshToonMaterial>();
function cityMaterial(source: THREE.Material): THREE.MeshToonMaterial {
  let m = cityMaterials.get(source);
  if (m) return m;
  const s = source as THREE.MeshStandardMaterial;
  m = new THREE.MeshToonMaterial({
    gradientMap: ramp, map: s.map ?? null, color: s.color ? s.color.clone() : new THREE.Color(0xffffff),
    vertexColors: s.vertexColors, side: s.side, alphaTest: s.alphaTest, transparent: s.transparent, opacity: s.opacity,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${FLATTEN}`);
  };
  m.customProgramCacheKey = () => 'city-look';
  cityMaterials.set(source, m);
  return m;
}

/** The outline: the model's back faces, pushed outwards by a couple of pixels and drawn dark. */
const outlineSize = { value: new THREE.Vector2(0.004, 0.004) };
const outline = new THREE.MeshBasicMaterial({ color: 0x14161b, side: THREE.BackSide });
outline.onBeforeCompile = (shader) => {
  shader.uniforms.uOutline = outlineSize;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec2 uOutline;')
    .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 outwards = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
      if (dot(outwards.xy, outwards.xy) > 1e-10) gl_Position.xy += normalize(outwards.xy) * uOutline * gl_Position.w;`);
};
const outlines: THREE.Mesh[] = [];

/** Stands a model on the floor, lengthwise along x, at the common length. Returns what it is made of. */
function settle(root: THREE.Object3D): { triangles: number; texture: number } {
  let triangles = 0, texture = 0;
  const hulls: [THREE.Mesh, THREE.Mesh][] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    originals.set(mesh, mesh.material);
    if (g.getAttribute('normal')) {
      const hull = new THREE.Mesh(g, outline);
      hull.visible = false;
      hulls.push([mesh, hull]);
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      const image = map?.image as { width?: number } | undefined;
      if (image?.width) texture = Math.max(texture, image.width);
    }
  });
  // attached only now: adding them during the walk above would have the walk visit them too
  for (const [mesh, hull] of hulls) {
    mesh.add(hull);
    outlines.push(hull);
  }
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  // a car is lower than it is wide: whichever side is shortest should point up
  if (size.x < size.y && size.x <= size.z) root.rotation.z = Math.PI / 2;
  else if (size.z < size.y && size.z < size.x) root.rotation.x = Math.PI / 2;
  root.updateMatrixWorld(true);
  const turned = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (turned.z > turned.x) root.rotation.y += Math.PI / 2;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = LENGTH / Math.max(s.x, s.z, 1e-6);
  root.scale.multiplyScalar(k);
  root.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  return { triangles: Math.round(triangles), texture };
}

function tag(cell: HTMLElement, run: Run, extra: string): void {
  const el = document.createElement('div');
  el.className = 'tag';
  const b = document.createElement('b');
  b.textContent = run.label;
  const line1 = document.createElement('div');
  line1.textContent = `$${run.price.toFixed(2)} · from ${run.used.join(' + ')}${run.seconds ? ` · ${run.seconds} s` : ''}`;
  const line2 = document.createElement('div');
  line2.textContent = extra;
  el.append(b, line1, line2);
  cell.append(el);
}

async function load(): Promise<void> {
  if (!name) return say('No captures yet.\nA capture is a folder in wimmelstadt/captures with a capture.json in it.');
  const capture = await json<Capture>(`/captures/${name}/capture.json`);
  if (!capture) return say(`Could not read the capture "${name}".`);
  $('title').textContent = capture.name;
  $('sub').textContent = capture.item ?? '';
  document.title = `${capture.name}: the hero trial`;

  const strip = $('pictures');
  for (const [view, source] of Object.entries(capture.views)) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.alt = `${capture.name}, ${view} view`;
    img.src = `/captures/${name}/prepared/${view}.jpg`;
    img.onerror = () => { img.onerror = null; img.src = `/captures/${name}/${source}`; };
    const cap = document.createElement('figcaption');
    cap.textContent = view;
    fig.append(img, cap);
    strip.append(fig);
  }

  const ledger = await json<Ledger>(`/captures/${name}/runs.json`);
  const runs = ledger?.runs ?? [];
  if (!runs.length) return say(`No models yet for ${capture.name}.\nThey appear here as the trial records them.`);

  const cells = $('cells');
  const cols = runs.length <= 3 ? runs.length : Math.ceil(Math.sqrt(runs.length));
  cells.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  const loader = new GLTFLoader();
  for (const run of runs) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cells.append(cell);
    const entry: Shown = { run, cell, holder: null, turn: Number(localStorage.getItem(`turn:${name}:${run.id}`) ?? 0) };
    shown.push(entry);
    if (run.status !== 'done' || !run.file) {
      tag(cell, run, '');
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = run.status === 'queued' ? 'Paid for and not fetched yet. Run the trial again with --collect.' : `Failed: ${run.error ?? 'no reason given'}`;
      cell.append(note);
      continue;
    }
    try {
      const gltf = await loader.loadAsync(`/captures/${name}/${run.file}`);
      const made = settle(gltf.scene);
      const holder = new THREE.Group();
      holder.add(gltf.scene);
      holder.visible = false;
      scene.add(holder);
      entry.holder = holder;
      const mb = run.bytes ? `${(run.bytes / 1048576).toFixed(1)} MB` : '';
      tag(cell, run, `${made.triangles.toLocaleString('en')} triangles · ${made.texture ? `${made.texture} px texture` : 'no texture'} · ${mb}`);
      // generators disagree about which way a car faces: this turns one to match the others
      const turn = document.createElement('button');
      turn.textContent = 'turn';
      turn.title = 'Turn this model a quarter, to line it up with the others';
      turn.onclick = () => {
        entry.turn = (entry.turn + 1) % 4;
        localStorage.setItem(`turn:${name}:${run.id}`, String(entry.turn));
      };
      cell.append(turn);
    } catch (err) {
      tag(cell, run, '');
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = `Could not open ${run.file}: ${String(err)}`;
      cell.append(note);
    }
  }
}

// --- the controls ---------------------------------------------------------------

let spin = true, plain = false, cityLook = false, angle = 0;

/** Gives every model the materials the switches ask for. */
function dress(): void {
  for (const [mesh, material] of originals) {
    if (plain) mesh.material = grey;
    else if (cityLook) mesh.material = Array.isArray(material) ? material.map(cityMaterial) : cityMaterial(material);
    else mesh.material = material;
  }
  for (const o of outlines) o.visible = cityLook;
  // the city's light: a strong sun, a bright sky, and its film-like colour
  sun.intensity = cityLook ? 1.9 : 1.2;
  sky.intensity = cityLook ? 1.0 : 0.2;
  renderer.toneMapping = cityLook ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
}
const toggle = (id: string, on: (v: boolean) => void): void => {
  const b = $<HTMLButtonElement>(id);
  b.onclick = () => {
    const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(v));
    on(v);
  };
};
toggle('spin', (v) => { spin = v; });
toggle('city', (v) => setView(v));
toggle('look', (v) => { cityLook = v; dress(); });
toggle('plain', (v) => { plain = v; dress(); });

// --- drawing --------------------------------------------------------------------

function draw(dt: number): void {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  if (spin) angle += dt * 0.35;
  controls.update();
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const frame = stage.getBoundingClientRect();
  for (const s of shown) {
    if (!s.holder) continue;
    const r = s.cell.getBoundingClientRect();
    const x = r.left - frame.left, y = frame.bottom - r.bottom;
    renderer.setViewport(x, y, r.width, r.height);
    renderer.setScissor(x, y, r.width, r.height);
    camera.aspect = r.width / Math.max(1, r.height);
    // a narrow cell steps back, so that the whole car always fits across it
    camera.zoom = Math.min(1, camera.aspect / 1.35);
    camera.updateProjectionMatrix();
    // the outline is about a pixel and a half wide, whatever the size of the cell
    outlineSize.value.set(3.2 / Math.max(1, r.width), 3.2 / Math.max(1, r.height));
    s.holder.rotation.y = angle + (s.turn * Math.PI) / 2;
    s.holder.visible = true;
    renderer.render(scene, camera);
    s.holder.visible = false;
  }
}

await load();
let last = performance.now();
function loop(now: number): void {
  draw(Math.min(0.05, (now - last) / 1000));
  last = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// a handle for checking the page from the console
Object.assign(window, { trial: { shown, draw, renderer, camera } });
