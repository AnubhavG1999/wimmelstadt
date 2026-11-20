// The camera: an isometric view that can be moved, turned like a turntable,
// tilted and zoomed, by mouse or by touch. Left alone, it slowly drifts.

import * as THREE from 'three';
import type { Rect } from './tile';
import { holdInside, mostInside, type Hall } from './within';

const MIN_VIEW = 34, MAX_VIEW = 470;
/** How steeply the view looks down when it opens, and how far it can be tilted: from low across the table to almost straight down. */
const HOME_ELEV = THREE.MathUtils.degToRad(38), MIN_ELEV = THREE.MathUtils.degToRad(14), MAX_ELEV = THREE.MathUtils.degToRad(80);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export class IsoRig {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 10, 1700);
  /** How steeply the view looks down, now. It opens at 38 degrees. */
  elev = HOME_ELEV;
  readonly dist: number;
  /** The ground the tiles cover. */
  private readonly bounds: Rect;
  /** The ground the view may roam over: the board, or more once `roam` has said so. */
  private roamOver: Rect;
  /** The most the view may see at once, in units from top to bottom. */
  private maxView: number;
  /** The room the view is kept inside, once there is one. */
  private hall: Hall | null = null;
  /** The most the view may show at once inside that room, and the tilt and the shape of screen it was worked out for. */
  private most = { viewH: Infinity, elev: NaN, aspect: NaN };
  /** Whether the room is holding the view away from the place it was asked to look at. */
  private held = false;
  /** How many times larger than one tile that ground is. */
  readonly span: number;

  /** What the camera is doing now. */
  target = new THREE.Vector3(0, 0, 4);
  az = THREE.MathUtils.degToRad(42);
  viewH = 250;

  /** Where it is heading; the view eases towards these. */
  private gTarget = this.target.clone();
  private gAz = this.az;
  private gViewH = this.viewH;
  private gElev = this.elev;

  aspect = 1;
  heightPx = 1;
  drift = true;
  lastInput = performance.now();
  /** The height that is in focus at the middle of the screen. Null means the ground. */
  focusY: number | null = null;
  /** How far in front of the ground the focus sits now, eased. */
  private focusOff = 0;

  /** Called on any input, so the page can wake its interface. */
  onInput: () => void = () => {};
  /** Called when the view is moved by hand, so the page can stop following a hero. */
  onPan: () => void = () => {};
  /** Called with the place on the ground that was clicked or tapped twice. */
  onDouble: (x: number, z: number) => void = () => {};

  /** How quickly the view closes on where it is heading: fast under the hand, slow when it travels by itself. */
  private pace = 10;
  private lastTap = { at: 0, x: 0, y: 0 };

  private pointers = new Map<number, { x: number; y: number; button: number; shift: boolean }>();
  private look = new THREE.Vector3();
  private dir = new THREE.Vector3();

  private fitted = false;

  constructor(bounds: Rect) {
    this.bounds = bounds;
    this.span = Math.max((bounds.x1 - bounds.x0) / 208, (bounds.z1 - bounds.z0) / 226);
    // a larger board is looked at from further away, so that none of it is cut off
    this.dist = 700 * this.span;
    this.camera.far = 1700 * this.span;
    this.maxView = MAX_VIEW * this.span;
    this.roamOver = { x0: bounds.x0 - 10, z0: bounds.z0 - 10, x1: bounds.x1 + 10, z1: bounds.z1 + 10 };
    this.target.set((bounds.x0 + bounds.x1) / 2, 0, (bounds.z0 + bounds.z1) / 2 + 4);
    this.gTarget.copy(this.target);
  }

  resize(w: number, h: number): void {
    // a page that loads while hidden can report no size at all; wait for a real one
    if (!(w > 0 && h > 0)) return;
    this.aspect = w / h;
    this.heightPx = h;
    if (!this.fitted) {
      // start with the whole board in view
      this.fitted = true;
      this.viewH = this.gViewH = clamp(Math.max(268, 372 / this.aspect) * this.span, MIN_VIEW, this.maxView);
    }
  }

  private touch(): void {
    this.lastInput = performance.now();
    this.pace = 10;
    this.onInput();
  }

  /** How many units high the view is when one tile fills it, and when the whole board does. */
  get fitTile(): number {
    return Math.max(268, 372 / this.aspect);
  }
  get fitBoard(): number {
    return this.fitTile * this.span;
  }

  /** Where the view is heading. */
  get goal(): { x: number; z: number; viewH: number; elev: number } {
    return { x: this.gTarget.x, z: this.gTarget.z, viewH: this.gViewH, elev: this.gElev };
  }

  /**
   * Gives the view more room than the board: ground it may roam `over`, and
   * things as far as `reach` from the middle of the board that it must still
   * see, however it is turned and tilted. If there is a `hall`, the view is
   * kept inside it: it never shows what is beyond its floor and its walls.
   */
  roam(over: Rect, reach: number, hall: Hall | null = null): void {
    this.hall = hall;
    this.most = { viewH: Infinity, elev: NaN, aspect: NaN };
    this.roamOver = over;
    this.maxView = Math.max(this.maxView, reach * 1.25);
    // a camera without perspective can see what is behind the place it stands at, and here it has to
    this.camera.near = Math.min(10, this.dist - reach * 2);
    this.camera.far = Math.max(this.camera.far, this.dist + reach * 2);
  }

  /** Tilts the view by an angle: up to look from higher, down to look from lower. */
  tiltBy(angle: number): void {
    this.gElev = clamp(this.gElev + angle, MIN_ELEV, MAX_ELEV);
  }

  /** Goes back to the tilt the view opens with, unhurried. */
  levelOut(): void {
    this.gElev = HOME_ELEV;
    this.pace = 3.4;
  }

  /** Jumps straight to a tilt, in radians, without easing. A picture may ask for one the hand cannot reach, such as straight down. */
  setTilt(elev: number): void {
    this.elev = this.gElev = elev;
  }

  /** Travels to a view, unhurried: for going from the board to a tile and back. */
  fly(x: number, z: number, viewH: number): void {
    this.gTarget.set(x, 0, z);
    this.gViewH = clamp(viewH, MIN_VIEW, this.maxView);
    this.pace = 3.4;
  }

  /** The place on the ground under a point of the screen. */
  private groundAt(px: number, py: number, el: HTMLElement): THREE.Vector3 {
    const r = el.getBoundingClientRect();
    const nx = ((px - r.left) / r.width) * 2 - 1, ny = 1 - ((py - r.top) / r.height) * 2;
    const cam = this.camera;
    const from = new THREE.Vector3(nx, ny, -1).unproject(cam);
    const dir = cam.getWorldDirection(new THREE.Vector3());
    return from.addScaledVector(dir, -from.y / dir.y);
  }

  private get worldPerPx(): number {
    return this.gViewH / this.heightPx;
  }

  /**
   * Called before the hand moves the view or changes how much it shows. What
   * the room is holding back is given up, so that the change starts from what
   * is on the screen and not from a wish the room has refused.
   */
  private settle(): void {
    if (!this.hall) return;
    this.gViewH = Math.min(this.gViewH, this.most.viewH);
    if (this.held) this.gTarget.copy(this.target);
  }

  private pan(dx: number, dy: number): void {
    this.settle();
    const wpp = this.worldPerPx, s = Math.sin(this.gAz), c = Math.cos(this.gAz);
    // right on screen is (c, 0, -s); away from the camera along the ground is (-s, 0, -c)
    this.gTarget.x += -c * dx * wpp + (-s * dy * wpp) / Math.sin(this.elev);
    this.gTarget.z += s * dx * wpp + (-c * dy * wpp) / Math.sin(this.elev);
    this.gTarget.x = clamp(this.gTarget.x, this.roamOver.x0, this.roamOver.x1);
    this.gTarget.z = clamp(this.gTarget.z, this.roamOver.z0, this.roamOver.z1);
  }

  private zoomAt(factor: number, px: number, py: number, el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const sx = px - r.left - r.width / 2, sy = py - r.top - r.height / 2;
    this.settle();
    const before = this.worldPerPx;
    this.gViewH = clamp(this.gViewH * factor, MIN_VIEW, this.maxView);
    const d = before - this.worldPerPx;
    // keep the point under the cursor where it is
    const s = Math.sin(this.gAz), c = Math.cos(this.gAz);
    this.gTarget.x += c * sx * d + (s * sy * d) / Math.sin(this.elev);
    this.gTarget.z += -s * sx * d + (c * sy * d) / Math.sin(this.elev);
  }

  attach(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey || e.ctrlKey });
      this.touch();
      // twice in the same place, quickly: with a mouse or with a finger
      const now = performance.now(), tap = this.lastTap;
      if (this.pointers.size === 1 && e.button === 0 && now - tap.at < 340 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 26) {
        tap.at = 0;
        const p = this.groundAt(e.clientX, e.clientY, el);
        this.onDouble(p.x, p.z);
      } else {
        this.lastTap = { at: now, x: e.clientX, y: e.clientY };
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (this.pointers.size === 1) {
        if (p.button === 2 || p.shift) {
          // across turns the view, and up and down tilts it
          this.gAz -= dx * 0.006;
          this.tiltBy(dy * 0.004);
        } else if (Math.abs(dx) + Math.abs(dy) > 0) {
          this.pan(dx, dy);
          this.onPan();
        }
      } else if (this.pointers.size === 2) {
        let other = p;
        for (const [id, q] of this.pointers) if (id !== e.pointerId) other = q;
        const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        this.settle();
        if (d0 > 2 && d1 > 2) this.gViewH = clamp((this.gViewH * d0) / d1, MIN_VIEW, this.maxView);
        let da = Math.atan2(e.clientY - other.y, e.clientX - other.x) - Math.atan2(p.y - other.y, p.x - other.x);
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        this.gAz += da;
        // Two fingers side by side that move up or down together tilt the
        // view, as they do on a map. Any other way they move it.
        if (Math.abs(e.clientX - other.x) > Math.abs(e.clientY - other.y)) {
          this.pan(dx / 2, 0);
          this.tiltBy(dy * 0.003);
        } else {
          this.pan(dx / 2, dy / 2);
        }
      }
      p.x = e.clientX;
      p.y = e.clientY;
      this.touch();
    });
    const release = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      // with Shift the wheel tilts the view (some browsers then report the turn of the wheel as sideways)
      if (e.shiftKey) this.tiltBy((e.deltaY || e.deltaX) * 0.0012);
      else this.zoomAt(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY, el);
      this.touch();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      const step = 40;
      if (e.key === 'q' || e.key === 'Q') this.gAz += 0.2;
      else if (e.key === 'e' || e.key === 'E') this.gAz -= 0.2;
      else if (e.key === 'PageUp' || (e.shiftKey && e.key === 'ArrowUp')) this.tiltBy(0.12);
      else if (e.key === 'PageDown' || (e.shiftKey && e.key === 'ArrowDown')) this.tiltBy(-0.12);
      else if (e.shiftKey && e.key === 'ArrowLeft') this.gAz += 0.2;
      else if (e.shiftKey && e.key === 'ArrowRight') this.gAz -= 0.2;
      else if (e.key === 'ArrowLeft') this.pan(step, 0);
      else if (e.key === 'ArrowRight') this.pan(-step, 0);
      else if (e.key === 'ArrowUp') this.pan(0, step);
      else if (e.key === 'ArrowDown') this.pan(0, -step);
      else if (e.key === '+' || e.key === '=') this.gViewH = clamp(Math.min(this.gViewH, this.most.viewH) * 0.85, MIN_VIEW, this.maxView);
      else if (e.key === '-') this.gViewH = clamp(Math.min(this.gViewH, this.most.viewH) / 0.85, MIN_VIEW, this.maxView);
      else return;
      this.touch();
    });
  }

  /** Moves the view so that a point in the world sits in the middle of the screen. */
  center(p: THREE.Vector3): void {
    const lookY = 28 * smooth(110, 260, this.gViewH);
    const t = ((p.y - lookY) * Math.cos(this.elev)) / Math.sin(this.elev);
    this.gTarget.set(p.x - Math.sin(this.gAz) * t, 0, p.z - Math.cos(this.gAz) * t);
  }

  /** Arrives at once wherever the view was heading. */
  snap(): void {
    this.target.copy(this.gTarget);
    this.az = this.gAz;
    this.viewH = this.gViewH;
    this.elev = this.gElev;
    this.focusOff = this.focusWanted(28 * smooth(110, 260, this.viewH));
  }

  /** How far in front of the point looked at the focus should sit. */
  private focusWanted(lookY: number): number {
    return this.focusY === null ? 0 : (this.focusY - lookY) / Math.sin(this.elev);
  }

  /** Jumps straight to a view, without easing. */
  set(x: number, z: number, azDeg: number, viewH: number): void {
    this.target.set(x, 0, z);
    this.gTarget.copy(this.target);
    this.az = this.gAz = THREE.MathUtils.degToRad(azDeg);
    this.viewH = this.gViewH = clamp(viewH, MIN_VIEW, this.maxView);
  }

  update(dt: number, now: number): void {
    if (this.drift && now - this.lastInput > 12000) this.gAz += dt * 0.03;
    const k = 1 - Math.exp(-dt * this.pace);
    this.target.lerp(this.gTarget, k);
    this.az += (this.gAz - this.az) * k;
    this.viewH += (this.gViewH - this.viewH) * k;
    this.elev += (this.gElev - this.elev) * k;

    // In a room, the view shows nothing beyond it: it draws closer if it has
    // to, and then keeps to the places from which only the room is seen. What
    // was asked for is kept, so that a view the room held back while it was
    // tilted or turned comes back when it is tilted or turned again.
    if (this.hall) {
      if (Math.abs(this.most.elev - this.elev) > 1e-4 || this.most.aspect !== this.aspect) {
        this.most = { viewH: mostInside(this.hall, this.elev, this.aspect, MIN_VIEW, this.maxView), elev: this.elev, aspect: this.aspect };
      }
      const held = holdInside(this.hall, this.az, this.elev, this.aspect, this.viewH, this.most.viewH, (v) => 28 * smooth(110, 260, v), this.target.x, this.target.z, MIN_VIEW);
      this.viewH = held.viewH;
      this.target.x = held.x;
      this.target.z = held.z;
      this.held = held.moved;
    }

    // zoomed out, the view centres a little above the ground so the towers fit
    const lookY = 28 * smooth(110, 260, this.viewH);
    this.focusOff += (this.focusWanted(lookY) - this.focusOff) * k;
    const ce = Math.cos(this.elev), se = Math.sin(this.elev);
    this.dir.set(Math.sin(this.az) * ce, se, Math.cos(this.az) * ce);
    this.look.set(this.target.x, lookY, this.target.z);
    const cam = this.camera;
    cam.position.copy(this.look).addScaledVector(this.dir, this.dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.look);
    const hh = this.viewH / 2, hw = hh * this.aspect;
    cam.left = -hw;
    cam.right = hw;
    cam.top = hh;
    cam.bottom = -hh;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** The depth of the point the camera looks at, from 0 at the near plane to 1 at the far plane. */
  get focusDepth(): number {
    return (this.dist - this.focusOff - this.camera.near) / (this.camera.far - this.camera.near);
  }
}
