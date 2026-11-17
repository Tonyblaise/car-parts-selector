// Lets DOM controls (parts list, presets) move the camera that lives inside the canvas.
// It holds the camera-controls instance; the DOM side never imports three.js through it.
import type CameraControlsImpl from 'camera-controls';
import { clampPolar, shortestAzimuth, type ViewAngle } from '../vehicles/cameraAngles';

let controls: CameraControlsImpl | null = null;
let pending: ViewAngle | null = null;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const cameraBus = {
  attach(c: CameraControlsImpl) {
    controls = c;
    if (pending) {
      const v = pending;
      pending = null;
      void cameraBus.lookAtView(v);
    }
  },
  detach(c: CameraControlsImpl) {
    if (controls === c) controls = null;
  },
  /** Rotate to a view the short way round; jumps instantly with reduced motion. */
  lookAtView(v: ViewAngle): Promise<void> {
    if (!controls) {
      pending = v;
      return Promise.resolve();
    }
    const animate = !prefersReducedMotion();
    const done = controls.rotateTo(
      shortestAzimuth(controls.azimuthAngle, v.azimuth),
      clampPolar(v.polar),
      animate,
    );
    // An instant jump is otherwise applied on the next rendered frame; apply it now so the
    // camera (and anything projecting through it) is correct immediately.
    if (!animate) controls.update(0);
    return done;
  },
  angles(): ViewAngle | null {
    return controls ? { azimuth: controls.azimuthAngle, polar: controls.polarAngle } : null;
  },
};
