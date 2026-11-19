// The camera: an isometric view at a fixed tilt that can be moved, turned like a
// turntable and zoomed, by mouse or by touch. It follows the look prototype's,
// with the city's size in place of the board's.

import * as THREE from 'three';
import { BOUNDS } from '../city/city.ts';

/** The height of the view in units: from a few car lengths to the whole city. */
export const MIN_VIEW = 30, MAX_VIEW = 1600;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

export class IsoRig {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 10, 9000);
  readonly elev = THREE.MathUtils.degToRad(38);
  readonly dist = 4200;

  /** What the camera is doing now. */
  target = new THREE.Vector3((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
  az = THREE.MathUtils.degToRad(42);
  viewH = 520;

  /** Where it is heading; the view eases towards these. */
  private gTarget = this.target.clone();
  private gAz = this.az;
  private gViewH = this.viewH;

  aspect = 1;
  heightPx = 1;
  lastInput = performance.now();
  /** Called when the view is moved by hand, so the page can stop following a hero. */
  onPan: () => void = () => {};

  private pointers = new Map<number, { x: number; y: number; button: number; shift: boolean }>();
  private dir = new THREE.Vector3();
  private fitted = false;

  resize(w: number, h: number): void {
    // a page that loads while hidden can report no size at all; wait for a real one
    if (!(w > 0 && h > 0)) return;
    this.aspect = w / h;
    this.heightPx = h;
    if (!this.fitted) {
      // start with the whole city in view
      this.fitted = true;
      const wide = BOUNDS.x1 - BOUNDS.x0, deep = BOUNDS.z1 - BOUNDS.z0;
      this.viewH = this.gViewH = clamp(Math.max(deep * 1.25, (wide * 1.12) / this.aspect), MIN_VIEW, MAX_VIEW);
    }
  }

  private get worldPerPx(): number {
    return this.gViewH / this.heightPx;
  }

  private pan(dx: number, dy: number): void {
    const wpp = this.worldPerPx, s = Math.sin(this.gAz), c = Math.cos(this.gAz);
    // right on screen is (c, 0, -s); away from the camera along the ground is (-s, 0, -c)
    this.gTarget.x += -c * dx * wpp + (-s * dy * wpp) / Math.sin(this.elev);
    this.gTarget.z += s * dx * wpp + (-c * dy * wpp) / Math.sin(this.elev);
    this.gTarget.x = clamp(this.gTarget.x, BOUNDS.x0, BOUNDS.x1);
    this.gTarget.z = clamp(this.gTarget.z, BOUNDS.z0, BOUNDS.z1);
  }

  private zoomAt(factor: number, px: number, py: number, el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const sx = px - r.left - r.width / 2, sy = py - r.top - r.height / 2;
    const before = this.worldPerPx;
    this.gViewH = clamp(this.gViewH * factor, MIN_VIEW, MAX_VIEW);
    const d = before - this.worldPerPx;
    // keep the point under the cursor where it is
    const s = Math.sin(this.gAz), c = Math.cos(this.gAz);
    this.gTarget.x += c * sx * d + (s * sy * d) / Math.sin(this.elev);
    this.gTarget.z += -s * sx * d + (c * sy * d) / Math.sin(this.elev);
  }

  attach(el: HTMLElement): void {
    const touch = (): void => { this.lastInput = performance.now(); };
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey || e.ctrlKey });
      touch();
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (this.pointers.size === 1) {
        if (p.button === 2 || p.shift) this.gAz -= dx * 0.006;
        else if (Math.abs(dx) + Math.abs(dy) > 0) {
          this.pan(dx, dy);
          this.onPan();
        }
      } else if (this.pointers.size === 2) {
        let other = p;
        for (const [id, q] of this.pointers) if (id !== e.pointerId) other = q;
        const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (d0 > 2 && d1 > 2) this.gViewH = clamp((this.gViewH * d0) / d1, MIN_VIEW, MAX_VIEW);
        let da = Math.atan2(e.clientY - other.y, e.clientX - other.x) - Math.atan2(p.y - other.y, p.x - other.x);
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        this.gAz += da;
        this.pan(dx / 2, dy / 2);
      }
      p.x = e.clientX;
      p.y = e.clientY;
      touch();
    });
    const release = (e: PointerEvent): void => { this.pointers.delete(e.pointerId); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomAt(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY, el);
      touch();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      const stepPx = 60;
      if (e.key === 'q' || e.key === 'Q') this.gAz += 0.2;
      else if (e.key === 'e' || e.key === 'E') this.gAz -= 0.2;
      else if (e.key.startsWith('Arrow')) {
        this.pan(e.key === 'ArrowLeft' ? stepPx : e.key === 'ArrowRight' ? -stepPx : 0, e.key === 'ArrowUp' ? stepPx : e.key === 'ArrowDown' ? -stepPx : 0);
        this.onPan();
      }
      else if (e.key === '+' || e.key === '=') this.gViewH = clamp(this.gViewH * 0.85, MIN_VIEW, MAX_VIEW);
      else if (e.key === '-') this.gViewH = clamp(this.gViewH / 0.85, MIN_VIEW, MAX_VIEW);
      else return;
      touch();
    });
  }

  /** Jumps straight to a view, without easing. */
  set(x: number, z: number, azDeg: number, viewH: number): void {
    this.target.set(x, 0, z);
    this.gTarget.copy(this.target);
    this.az = this.gAz = THREE.MathUtils.degToRad(azDeg);
    this.viewH = this.gViewH = clamp(viewH, MIN_VIEW, MAX_VIEW);
  }

  /** Heads for a view, easing. */
  go(x: number, z: number, viewH: number): void {
    this.gTarget.set(x, 0, z);
    this.gViewH = clamp(viewH, MIN_VIEW, MAX_VIEW);
  }

  /** Keeps a moving point in the middle of the view, at whatever zoom the view has. */
  follow(x: number, z: number): void {
    this.gTarget.set(x, 0, z);
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 10);
    this.target.lerp(this.gTarget, k);
    this.az += (this.gAz - this.az) * k;
    this.viewH += (this.gViewH - this.viewH) * k;
    const ce = Math.cos(this.elev), se = Math.sin(this.elev);
    this.dir.set(Math.sin(this.az) * ce, se, Math.cos(this.az) * ce);
    const cam = this.camera;
    cam.position.copy(this.target).addScaledVector(this.dir, this.dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.target);
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
    return (this.dist - this.camera.near) / (this.camera.far - this.camera.near);
  }
}
