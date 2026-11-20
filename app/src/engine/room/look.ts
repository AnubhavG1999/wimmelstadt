// How the room round the table is drawn: the same cel shading as the city,
// with three things of its own. Its lamps throw pools of light at night. A
// wall that stands between the view and the table is thinned out until it is
// gone, as the front of a doll's house is left off. And paper and floorboards
// get their grain from the place they are at, so that they stay crisp however
// near the view comes.

import * as THREE from 'three';
import { toon } from '../look/materials';

/** How many lamps the room may have. */
export const MAX_LAMPS = 6;

/** What every material of the room shares. Changing a value here changes it for all of them. */
export const ROOM = {
  /** Where each lamp's light comes from, and in `w` how far it reaches. */
  uLampPos: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4(0, 0, 0, 1)) },
  uLampCol: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Color(0, 0, 0)) },
  /** How much the lamps are on: nothing by day, all the way at night. */
  uLampOn: { value: 0 },
  /** The ground the desk covers, as its middle and half its size: the floor is darker under it. */
  uDesk: { value: new THREE.Vector4(0, 0, 1, 1) },
};

/** What a surface is made of, beyond its colour. */
export type RoomKind = 'plain' | 'paper' | 'planks';

const VERT_PARS = /* glsl */ `
  varying vec3 vRoomPos;
`;
const VERT_BEGIN = /* glsl */ `
  vec4 roomAt = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    roomAt = instanceMatrix * roomAt;
  #endif
  vRoomPos = (modelMatrix * roomAt).xyz;
`;
const FRAG_PARS = /* glsl */ `
  varying vec3 vRoomPos;
  uniform vec4 uLampPos[${MAX_LAMPS}];
  uniform vec3 uLampCol[${MAX_LAMPS}];
  uniform float uLampOn;
  uniform float uShow;
  uniform vec4 uDesk;
  float roomHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float roomNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(roomHash(i), roomHash(i + vec2(1.0, 0.0)), f.x), mix(roomHash(i + vec2(0.0, 1.0)), roomHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;
// a wall that is being left off is drawn as fewer and fewer of its points, which needs no sorting
const FRAG_SHOW = /* glsl */ `
  if (uShow < 0.995) {
    float roomDither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (roomDither >= uShow) discard;
  }
`;
const FRAG_KIND: Record<RoomKind, string> = {
  plain: '',
  // paper: fibres and a faint mottling, finer than the picture printed on it
  paper: /* glsl */ `
    diffuseColor.rgb *= 0.93 + 0.09 * roomNoise(vRoomPos.xz * 0.9) + 0.05 * roomNoise(vRoomPos.xz * 5.0);
  `,
  // floorboards: they run east to west, each a little lighter or darker than the next, with a dark seam between
  planks: /* glsl */ `
    vec2 fp = vRoomPos.xz;
    float row = floor(fp.y / 15.0);
    float along = fp.x + roomHash(vec2(row, 3.0)) * 210.0;
    float board = floor(along / 210.0);
    float gz = abs(fract(fp.y / 15.0) - 0.5) * 15.0, gx = abs(fract(along / 210.0) - 0.5) * 210.0;
    float az = max(fwidth(gz), 0.12), ax = max(fwidth(gx), 0.12);
    float seam = max(smoothstep(7.34 - az, 7.34 + az, gz) * clamp(0.5 / az, 0.0, 1.0), smoothstep(104.84 - ax, 104.84 + ax, gx) * clamp(0.5 / ax, 0.0, 1.0));
    float tone = roomHash(vec2(row * 7.3, board * 3.1));
    float grain = roomNoise(vec2(along * 0.06, fp.y * 1.9));
    diffuseColor.rgb *= mix(0.84, 1.08, tone) * (0.95 + 0.09 * grain) * (1.0 - 0.5 * seam);
    // under the desk, and for a little way round it, the floor lies in its shade
    vec2 fromDesk = abs(fp - uDesk.xy) - uDesk.zw;
    float beyond = max(fromDesk.x, fromDesk.y);
    diffuseColor.rgb *= 1.0 - 0.5 * (1.0 - smoothstep(-70.0, 90.0, beyond));
  `,
};
const FRAG_LAMPS = /* glsl */ `
  vec3 roomLamps = vec3(0.0);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    float near = clamp(1.0 - distance(vRoomPos, uLampPos[i].xyz) / uLampPos[i].w, 0.0, 1.0);
    roomLamps += uLampCol[i] * near * near;
  }
  totalEmissiveRadiance += diffuseColor.rgb * roomLamps * uLampOn;
`;

/**
 * A material for something in the room. `show` is how much of it is drawn,
 * from 0 to 1: every wall has its own, and so have the things that hang on it.
 */
export function roomToon(extra: THREE.MeshToonMaterialParameters = {}, o: { kind?: RoomKind; show?: THREE.IUniform<number> } = {}): THREE.MeshToonMaterial {
  const kind = o.kind ?? 'plain';
  const show = o.show ?? { value: 1 };
  const m = toon({ fog: false, ...extra });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, ROOM, { uShow: show });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BEGIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_SHOW + FRAG_KIND[kind])
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_LAMPS);
  };
  m.customProgramCacheKey = () => `room-${kind}`;
  return m;
}
