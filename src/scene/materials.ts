// Shaders ported from the inspiration's hand-written WebGL (l.425–473), so the car keeps its
// look: soft hemisphere + key light fixed to the camera, glossy glass, rim light, wheel-arch
// cut-outs. Colours are written raw (no colour management), as the inspiration did.
import { DoubleSide, ShaderMaterial, Vector3, Vector4 } from 'three';
import type { WheelCutout } from '../vehicles/geometry';

const VEHICLE_VS = /* glsl */ `
attribute vec3 aColor;
attribute float aKind;
varying vec3 vN;
varying vec3 vC;
varying vec3 vW;
varying vec3 vV;
varying float vK;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vC = aColor;
  vW = position;
  vV = -mv.xyz;
  vK = aKind;
  gl_Position = projectionMatrix * mv;
}
`;

const VEHICLE_FS = /* glsl */ `
uniform vec4 uWheel;
varying vec3 vN;
varying vec3 vC;
varying vec3 vW;
varying vec3 vV;
varying float vK;
void main() {
  // Body (0) and underside (2) are cut away around the wheels.
  bool cuttable = vK < 0.5 || (vK > 1.5 && vK < 2.5);
  if (cuttable && abs(vW.z) > 0.45) {
    float dxf = vW.x - uWheel.x;
    float dxr = vW.x - uWheel.y;
    float dy = vW.y - uWheel.z;
    if (min(dxf * dxf, dxr * dxr) + dy * dy < uWheel.w) discard;
  }
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float facing = dot(n, v);
  if (facing < -0.2) { gl_FragColor = vec4(vC * 0.1, 1.0); return; }
  vec3 l = normalize(vec3(-0.3, 0.9, 0.4));
  float diff = max(dot(n, l), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  float isGlass = step(0.5, vK) * step(vK, 1.5);
  vec3 c = vC * (0.34 + 0.26 * hemi + 0.5 * diff);
  float sp = pow(max(dot(n, normalize(l + v)), 0.0), mix(28.0, 90.0, isGlass));
  c += vec3(1.0) * sp * mix(0.2, 0.55, isGlass);
  float rim = pow(1.0 - max(facing, 0.0), 3.0);
  c += vec3(1.0) * rim * mix(0.12, 0.22, isGlass);
  gl_FragColor = vec4(c, 1.0);
}
`;

export function createVehicleMaterial(wheel: WheelCutout): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VEHICLE_VS,
    fragmentShader: VEHICLE_FS,
    uniforms: { uWheel: { value: new Vector4(...wheel) } },
    side: DoubleSide,
  });
}

const FLAT_VS = /* glsl */ `
void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FLAT_FS = /* glsl */ `
uniform vec3 uColor;
void main() { gl_FragColor = vec4(uColor, 1.0); }
`;

/** Unlit solid colour for seams and the selection outline. */
export function createFlatMaterial(rgb: readonly [number, number, number]): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FLAT_VS,
    fragmentShader: FLAT_FS,
    uniforms: { uColor: { value: new Vector3(...rgb) } },
    side: DoubleSide,
  });
}

const SHADOW_VS = /* glsl */ `
varying vec3 vW;
void main() { vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SHADOW_FS = /* glsl */ `
varying vec3 vW;
void main() {
  // The plane is built in its local XY, then rotated flat: local y is world −z.
  float r = length(vec2(vW.x / 2.75, vW.y / 1.4));
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.32 * (1.0 - smoothstep(0.25, 1.0, r)));
}
`;

/** Soft elliptical contact shadow under the car. */
export function createShadowMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: SHADOW_VS,
    fragmentShader: SHADOW_FS,
    transparent: true,
    depthWrite: false,
  });
}
