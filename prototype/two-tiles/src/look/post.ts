// Carried over from the look prototype, unchanged but for how its options are kept.
//
// What happens to the picture after the city is drawn: a glow around bright
// things, soft outlines found from depth, the shallow focus that makes the city
// read as a miniature, and the final colour.

import * as THREE from 'three';

const VERT = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const HEAD = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
`;

const PREFILTER = HEAD + /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
  vec3 c = 0.25 * (
    texture(tSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb + texture(tSrc, vUv + uTexel * vec2(0.5, -0.5)).rgb +
    texture(tSrc, vUv + uTexel * vec2(-0.5, 0.5)).rgb + texture(tSrc, vUv + uTexel * vec2(0.5, 0.5)).rgb);
  float br = max(c.r, max(c.g, c.b));
  float knee = 0.35;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee);
  float k = max(soft, br - uThreshold) / max(br, 1e-4);
  outColor = vec4(min(c * k, vec3(24.0)), 1.0);
}
`;

const DOWN = HEAD + /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(tSrc, vUv).rgb * 4.0;
  c += texture(tSrc, vUv - uTexel).rgb;
  c += texture(tSrc, vUv + uTexel).rgb;
  c += texture(tSrc, vUv + vec2(uTexel.x, -uTexel.y)).rgb;
  c += texture(tSrc, vUv - vec2(uTexel.x, -uTexel.y)).rgb;
  outColor = vec4(c / 8.0, 1.0);
}
`;

const UP = HEAD + /* glsl */ `
uniform sampler2D tSrc;
uniform sampler2D tAdd;
uniform vec2 uTexel;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = texture(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb;
  c += texture(tSrc, vUv + vec2(-h.x, h.y)).rgb * 2.0;
  c += texture(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  c += texture(tSrc, vUv + vec2(h.x, h.y)).rgb * 2.0;
  c += texture(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb;
  c += texture(tSrc, vUv + vec2(h.x, -h.y)).rgb * 2.0;
  c += texture(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb;
  c += texture(tSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  outColor = vec4(c / 12.0 * 0.9 + texture(tAdd, vUv).rgb, 1.0);
}
`;

const FINISH = HEAD + /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform vec2 uTexel;
uniform float uFocus;     // depth of the point in focus
uniform float uBand;      // half-width of the sharp band, in depth
uniform float uCocScale;  // pixels of blur per unit of depth beyond the band
uniform float uMaxCoc;
uniform float uEdgeScale; // turns a depth difference into a change of slope
uniform float uEdgePx;
uniform float uOutline;
uniform float uBloom;
uniform float uExposure;
uniform float uTilt;
uniform float uNear;      // how much of the blur things nearer than the focus get
uniform float uAspect;
uniform float uSat;
uniform float uTime;
uniform float uRain;
uniform float uSnow;
uniform float uFall;      // how bright rain and snow are against the picture
uniform float uFlash;     // lightning
uniform float uPx;        // one screen point, as a fraction of the picture's height

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

// One sheet of rain: thin streaks falling in columns, each at its own pace.
float rainSheet(vec2 uv, float cols, float rows, float speed, float len) {
  vec2 p = vec2(uv.x * uAspect + uv.y * 0.08, uv.y);
  float x = p.x * cols;
  float id = floor(x);
  float fx = fract(x) - 0.5;
  float h = hash11(id);
  float y = fract(p.y * rows * (0.8 + 0.4 * h) + uTime * speed * (0.8 + 0.5 * h) + h * 13.0);
  float width = 0.9 * uPx * cols;
  float line = 1.0 - smoothstep(width * 0.4, width, abs(fx));
  float seg = smoothstep(0.0, len * 0.15, y) * (1.0 - smoothstep(len * 0.4, len, y));
  return line * seg * step(0.42, h);
}

// One sheet of snow: soft flakes drifting down and a little sideways.
float snowSheet(vec2 uv, float scale, float speed) {
  vec2 p = vec2(uv.x * uAspect, uv.y) * scale;
  p.y += uTime * speed * scale;
  p.x += sin(uTime * 0.5 + p.y * 0.6) * 0.3;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
  vec2 o = (vec2(h, fract(h * 37.0)) - 0.5) * 0.6;
  float r = 0.07 + 0.08 * fract(h * 91.0);
  return (1.0 - smoothstep(r * 0.4, r, length(f - o))) * step(0.35, h);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  float dc = texture(tDepth, vUv).r;

  // shallow focus: the further from the focused depth, the wider the blur.
  // Things nearer than the focus, such as the tops of towers, blur less.
  float off = max(abs(dc - uFocus) - uBand, 0.0) * (dc < uFocus ? uNear : 1.0);
  float coc = clamp(off * uCocScale, 0.0, uMaxCoc) * uTilt;
  vec3 col = texture(tScene, vUv).rgb;
  if (coc > 0.6) {
    float rot = ign(gl_FragCoord.xy) * 6.2831853;
    float w = 1.0;
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(TAPS)) * coc;
      float a = fi * 2.39996323 + rot;
      col += texture(tScene, vUv + vec2(cos(a), sin(a)) * r * uTexel).rgb;
      w += 1.0;
    }
    col /= w;
  }

  // soft outlines: wherever the depth bends or jumps
  vec2 px = uTexel * uEdgePx;
  float dl = texture(tDepth, vUv - vec2(px.x, 0.0)).r;
  float dr = texture(tDepth, vUv + vec2(px.x, 0.0)).r;
  float du = texture(tDepth, vUv + vec2(0.0, px.y)).r;
  float dd = texture(tDepth, vUv - vec2(0.0, px.y)).r;
  float lap = abs(dl + dr - 2.0 * dc) + abs(du + dd - 2.0 * dc);
  float edge = smoothstep(0.45, 1.3, lap * uEdgeScale);
  edge *= 1.0 - smoothstep(0.6, 3.0, coc);
  col = mix(col, col * vec3(0.2, 0.19, 0.3), edge * uOutline);

  col += texture(tBloom, vUv).rgb * uBloom;

  // weather that falls: three sheets each, the nearer ones larger and faster
  if (uRain > 0.01) {
    float r = rainSheet(vUv, 150.0, 5.0, 1.7, 0.16) * 0.5
            + rainSheet(vUv + 0.37, 95.0, 3.6, 2.3, 0.2) * 0.75
            + rainSheet(vUv + 0.71, 55.0, 2.6, 3.0, 0.26);
    col += vec3(0.72, 0.8, 0.95) * r * uRain * uFall;
  }
  if (uSnow > 0.01) {
    float s = snowSheet(vUv, 34.0, 0.07) * 0.6 + snowSheet(vUv + 0.31, 22.0, 0.1) * 0.85 + snowSheet(vUv + 0.63, 13.0, 0.14);
    col += vec3(1.0) * s * uSnow * uFall * 1.6;
  }
  col += vec3(0.5, 0.56, 0.72) * uFlash * 0.22;

  col = aces(col * uExposure);
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= mix(1.0, 0.8, smoothstep(0.35, 1.05, length(q)));
  col = max(mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat), 0.0);
  col = toSRGB(col);
  col += (ign(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}
`;

const BACKDROP_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.99999, 1.0);
}
`;

const BACKDROP_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBot;
varying vec2 vUv;
void main() {
  float t = smoothstep(0.0, 1.0, vUv.y);
  gl_FragColor = vec4(mix(uBot, uTop, t), 1.0);
}
`;

const triangle = new THREE.BufferGeometry();
triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));

/** A soft backdrop behind the board. It is part of the scene so that the blur treats it like anything else. */
export function makeBackdrop(): { mesh: THREE.Mesh; top: THREE.Color; bot: THREE.Color } {
  const top = new THREE.Color(), bot = new THREE.Color();
  const mat = new THREE.ShaderMaterial({
    vertexShader: BACKDROP_VERT,
    fragmentShader: BACKDROP_FRAG,
    uniforms: { uTop: { value: top }, uBot: { value: bot } },
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(triangle, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.layers.set(1);
  return { mesh, top, bot };
}

class Pass {
  readonly mat: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh;
  private static cam = new THREE.Camera();

  constructor(frag: string, uniforms: Record<string, THREE.IUniform>, defines: Record<string, number> = {}) {
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      defines,
      vertexShader: VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(triangle, this.mat);
    this.mesh.frustumCulled = false;
  }

  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null): void {
    renderer.setRenderTarget(target);
    renderer.render(this.mesh, Pass.cam);
  }
}

/** `taps` is how many samples the shallow-focus blur takes. */
export interface PostOptions { bloom: boolean; outline: boolean; tilt: boolean; taps: number }

export interface FinishParams {
  focus: number;
  depthRange: number;
  viewH: number;
  elev: number;
  bloom: number;
  exposure: number;
  outline: number;
  /** How strong the shallow focus is: 0 is off, 1 is the gentle default. */
  tilt: number;
  saturation: number;
  time: number;
  rain: number;
  snow: number;
  /** How bright falling rain and snow should be, which depends on the hour. */
  fall: number;
  flash: number;
}

const LEVELS = 5;

export class Post {
  sceneRT!: THREE.WebGLRenderTarget;
  reflRT!: THREE.WebGLRenderTarget;
  private down: THREE.WebGLRenderTarget[] = [];
  private up: THREE.WebGLRenderTarget[] = [];
  private black: THREE.DataTexture;
  private prefilter: Pass;
  private downPass: Pass;
  private upPass: Pass;
  private finish: Pass;
  private w = 1;
  private h = 1;
  private msaa = 0;
  private ratio = 1;

  private opts: PostOptions;

  constructor(opts: PostOptions) {
    this.opts = opts;
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.black.needsUpdate = true;
    this.prefilter = new Pass(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 } });
    this.downPass = new Pass(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.upPass = new Pass(UP, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.finish = new Pass(FINISH, {
      tScene: { value: null }, tDepth: { value: null }, tBloom: { value: this.black },
      uTexel: { value: new THREE.Vector2() },
      uFocus: { value: 0.4 }, uBand: { value: 0 }, uCocScale: { value: 0 }, uMaxCoc: { value: 8 },
      uEdgeScale: { value: 1 }, uEdgePx: { value: 1 }, uOutline: { value: 1 },
      uBloom: { value: 0 }, uExposure: { value: 1 }, uTilt: { value: 1 }, uAspect: { value: 1 }, uSat: { value: 1.14 },
      uNear: { value: 0.55 }, uTime: { value: 0 }, uRain: { value: 0 }, uSnow: { value: 0 }, uFall: { value: 0.3 },
      uFlash: { value: 0 }, uPx: { value: 0.001 },
    }, { TAPS: opts.taps });
  }

  private target(w: number, h: number, depth: boolean): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: depth,
      generateMipmaps: false,
    });
    return rt;
  }

  /**
   * Sizes are in picture pixels. `ratio` is how many of them make one screen point,
   * so that outlines keep the same width on screen however large the picture is.
   */
  setSize(w: number, h: number, msaa: number, ratio: number): void {
    this.ratio = ratio;
    if (w === this.w && h === this.h && msaa === this.msaa && this.sceneRT) return;
    this.w = w;
    this.h = h;
    this.msaa = msaa;
    for (const rt of [this.sceneRT, this.reflRT, ...this.down, ...this.up]) rt?.dispose();
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      samples: msaa,
      depthTexture: new THREE.DepthTexture(w, h),
    });
    this.reflRT = this.target(Math.round(w / 2), Math.round(h / 2), true);
    this.down = [];
    this.up = [];
    for (let i = 0; i < LEVELS; i++) {
      const s = 2 << i;
      this.down.push(this.target(Math.round(w / s), Math.round(h / s), false));
      if (i < LEVELS - 1) this.up.push(this.target(Math.round(w / s), Math.round(h / s), false));
    }
  }

  /** The glow: bright parts of the picture, shrunk and spread back out. */
  private bloom(renderer: THREE.WebGLRenderer, threshold: number): THREE.Texture {
    const pu = this.prefilter.mat.uniforms;
    pu.tSrc.value = this.sceneRT.texture;
    pu.uTexel.value.set(1 / this.w, 1 / this.h);
    pu.uThreshold.value = threshold;
    this.prefilter.render(renderer, this.down[0]);
    const du = this.downPass.mat.uniforms;
    for (let i = 1; i < LEVELS; i++) {
      du.tSrc.value = this.down[i - 1].texture;
      du.uTexel.value.set(1 / this.down[i - 1].width, 1 / this.down[i - 1].height);
      this.downPass.render(renderer, this.down[i]);
    }
    const uu = this.upPass.mat.uniforms;
    let src = this.down[LEVELS - 1];
    for (let i = LEVELS - 2; i >= 0; i--) {
      uu.tSrc.value = src.texture;
      uu.tAdd.value = this.down[i].texture;
      uu.uTexel.value.set(1 / src.width, 1 / src.height);
      this.upPass.render(renderer, this.up[i]);
      src = this.up[i];
    }
    return src.texture;
  }

  /** Draws the finished picture to the screen from what is in sceneRT. */
  present(renderer: THREE.WebGLRenderer, p: FinishParams): void {
    const u = this.finish.mat.uniforms;
    const useBloom = this.opts.bloom && p.bloom > 0.02;
    u.tBloom.value = useBloom ? this.bloom(renderer, 1.0) : this.black;
    u.uBloom.value = useBloom ? p.bloom * 0.15 : 0;
    u.tScene.value = this.sceneRT.texture;
    u.tDepth.value = this.sceneRT.depthTexture;
    u.uTexel.value.set(1 / this.w, 1 / this.h);
    u.uAspect.value = this.w / this.h;
    u.uExposure.value = p.exposure;

    // Focus. A point on the ground at the top or bottom edge of the screen lies this
    // far in depth from the point at the centre:
    const edgeDepth = ((p.viewH / 2) * (Math.cos(p.elev) / Math.sin(p.elev))) / p.depthRange;
    // A third of the picture's height stays sharp. The blur is gentle, and it fades
    // away altogether as the view zooms in, so that a close look is a sharp look.
    const band = 0.34;
    const z = Math.min(1, Math.max(0, (p.viewH - 45) / 105));
    const zoomFade = z * z * (3 - 2 * z);
    const maxCoc = Math.max(0.001, (this.h / 1080) * 6.5 * zoomFade * p.tilt);
    u.uFocus.value = p.focus;
    u.uBand.value = edgeDepth * band;
    u.uCocScale.value = maxCoc / (edgeDepth * (1 - band));
    u.uMaxCoc.value = maxCoc * 1.5;
    u.uTilt.value = this.opts.tilt && p.tilt > 0 ? 1 : 0;
    u.uSat.value = p.saturation;
    u.uTime.value = p.time;
    u.uRain.value = p.rain;
    u.uSnow.value = p.snow;
    u.uFall.value = p.fall;
    u.uFlash.value = p.flash;
    u.uPx.value = this.ratio / this.h;

    // Outlines. One pixel covers this many world units:
    const worldPerPx = p.viewH / this.h;
    const edgePx = this.ratio * Math.max(1, this.h / this.ratio / 1080);
    u.uEdgePx.value = edgePx;
    u.uEdgeScale.value = p.depthRange / (worldPerPx * edgePx);
    u.uOutline.value = this.opts.outline ? p.outline * 0.75 : 0;

    this.finish.render(renderer, null);
  }
}
