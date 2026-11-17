// The single source of truth for camera angles (tasks.md › Conventions).
//
// The inspiration rotates the *model* by yaw (about +Y) then tilts it by pitch, with the
// viewer on +Z. Inverting that rotation, the camera sits at the world direction
//   (−cos(pitch)·sin(yaw), sin(pitch), cos(pitch)·cos(yaw)).
// three.js Spherical places a point at (sinφ·sinθ, cosφ, sinφ·cosθ), so
//   polar φ = π/2 − pitch   and   azimuth θ = −yaw.
// Check: the inspiration's "Front" view has yaw = −π/2 → azimuth π/2 → camera on +X, the
// car's front (geometry uses +X front, +Y up, +Z the car's right side).

export interface ViewAngle {
  /** Radians around +Y, measured from +Z toward +X (camera-controls azimuthAngle). */
  azimuth: number;
  /** Radians down from +Y (camera-controls polarAngle). */
  polar: number;
}

export const POLAR_MIN = 0.05;
export const POLAR_MAX = 1.52;

export const clampPolar = (polar: number): number => Math.min(POLAR_MAX, Math.max(POLAR_MIN, polar));

/** Convert an inspiration [yaw, pitch] pair to camera-controls angles. */
export function toAzimuthPolar(yaw: number, pitch: number): ViewAngle {
  return { azimuth: -yaw, polar: clampPolar(Math.PI / 2 - pitch) };
}

/** Target azimuth equivalent to `to` that is within ±π of `from`, so moves take the short way. */
export function shortestAzimuth(from: number, to: number): number {
  const tau = Math.PI * 2;
  let d = (to - from) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return from + d;
}
