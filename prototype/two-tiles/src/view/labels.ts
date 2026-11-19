// The names that float over the city: tiles, quarters and things. Which of them
// show depends on how far the view is zoomed, and where two would overlap the
// more important one is kept.

import * as THREE from 'three';

export interface Label {
  sprite: THREE.Sprite;
  /** Its size on screen, in pixels. */
  w: number;
  h: number;
  /** It shows while the height of the view, in units, is between these. */
  from: number;
  to: number;
  /** Where two names would overlap, the one with the lower rank is kept. */
  rank: number;
}

export interface LabelStyle { size: number; weight: number; italic?: boolean; spacing?: number; colour?: string }

/** A name as a picture that always faces the view. It shows while the view's height is between `from` and `to`. */
export function label(text: string, style: LabelStyle, from: number, to: number, rank: number): Label {
  const scale = 2, pad = 8;
  const font = `${style.italic ? 'italic ' : ''}${style.weight} ${style.size * scale}px "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif`;
  const c = document.createElement('canvas');
  let g = c.getContext('2d')!;
  g.font = font;
  if (style.spacing) g.letterSpacing = `${style.spacing * scale}px`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2 * scale, h = Math.ceil(style.size * scale * 1.5);
  c.width = w;
  c.height = h;
  g = c.getContext('2d')!;
  g.font = font;
  if (style.spacing) g.letterSpacing = `${style.spacing * scale}px`;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  g.lineWidth = style.size * scale * 0.28;
  g.strokeText(text, pad * scale, h / 2);
  g.fillStyle = style.colour ?? '#20232a';
  g.fillText(text, pad * scale, h / 2);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, depthWrite: false, transparent: true }));
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 10;
  return { sprite, w: w / scale, h: h / scale, from, to, rank };
}

const spot = new THREE.Vector3();

/**
 * Keeps every name the same size on screen, hides those that do not belong at
 * this zoom, and where two would overlap keeps the more important one. The
 * names must be in order of rank.
 */
export function updateLabels(labels: Label[], camera: THREE.Camera, viewH: number, widthPx: number, heightPx: number): void {
  const perPx = viewH / heightPx;
  const taken: number[] = [];
  for (const l of labels) {
    let on = viewH >= l.from && viewH <= l.to;
    if (on) {
      spot.copy(l.sprite.position).project(camera);
      const x = (spot.x * 0.5 + 0.5) * widthPx, y = (1 - (spot.y * 0.5 + 0.5)) * heightPx;
      const x0 = x - l.w / 2 + 6, x1 = x + l.w / 2 - 6, y0 = y - l.h + 4, y1 = y - 4;
      if (x1 < 0 || x0 > widthPx || y1 < 0 || y0 > heightPx) on = false;
      for (let i = 0; on && i < taken.length; i += 4) {
        if (x0 < taken[i + 2] && x1 > taken[i] && y0 < taken[i + 3] && y1 > taken[i + 1]) on = false;
      }
      if (on) {
        taken.push(x0, y0, x1, y1);
        l.sprite.scale.set(l.w * perPx, l.h * perPx, 1);
      }
    }
    l.sprite.visible = on;
  }
}
