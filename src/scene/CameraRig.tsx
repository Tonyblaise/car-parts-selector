import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { useEffect, useRef } from 'react';
import { POLAR_MAX, POLAR_MIN } from '../vehicles/cameraAngles';
import { cameraBus, prefersReducedMotion } from './cameraBus';
import { CAMERA_DISTANCE, INTRO_START, PRESET_VIEWS } from './cameraMath';
import { TARGET } from './sceneConstants';
import { setCameraMoving } from './testHooks';

const { ACTION } = CameraControlsImpl;

function framing(compact: boolean): { distance: number; target: [number, number, number] } {
  return compact
    ? { distance: CAMERA_DISTANCE * 0.9, target: [TARGET[0], TARGET[1] - 0.45, TARGET[2]] }
    : { distance: CAMERA_DISTANCE, target: TARGET };
}

/**
 * Drag to rotate (FR-002) with tilt limits; presets and list picks animate through cameraBus.
 * Zoom and pan are off: the spec has no zoom, and the wheel must keep scrolling the page.
 */
export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const gl = useThree((s) => s.gl);
  // The phone layout's 3D view is short and has the camera presets over its bottom edge:
  // frame a little closer and aim lower, so the whole car sits above that strip.
  const compact = useThree((s) => s.size.height <= 340);
  const { distance } = framing(compact);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.NONE;
    c.mouseButtons.wheel = ACTION.NONE;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.NONE;
    c.touches.three = ACTION.NONE;
    // camera-controls sets touch-action: none; restore vertical page scrolling on phones.
    gl.domElement.style.touchAction = 'pan-y';

    const { target } = framing(compact);
    void c.setTarget(...target, false);
    void c.dollyTo(distance, false);

    // FR-008: settle into the 3/4 view with a short move, or jump there with reduced motion.
    let timer: number | undefined;
    if (prefersReducedMotion()) {
      void c.rotateTo(PRESET_VIEWS['3/4'].azimuth, PRESET_VIEWS['3/4'].polar, false);
    } else {
      void c.rotateTo(INTRO_START.azimuth, INTRO_START.polar, false);
      timer = window.setTimeout(() => {
        const prev = c.smoothTime;
        c.smoothTime = 0.6;
        void c.rotateTo(PRESET_VIEWS['3/4'].azimuth, PRESET_VIEWS['3/4'].polar, true).then(() => {
          c.smoothTime = prev;
        });
      }, 200);
    }
    // Track motion for the e2e hooks (and anything else that must wait for the camera to settle).
    setCameraMoving(!prefersReducedMotion());
    const onWake = () => setCameraMoving(true);
    const onRest = () => setCameraMoving(false);
    c.addEventListener('wake', onWake);
    c.addEventListener('rest', onRest);
    c.addEventListener('sleep', onRest);

    cameraBus.attach(c);
    return () => {
      window.clearTimeout(timer);
      c.removeEventListener('wake', onWake);
      c.removeEventListener('rest', onRest);
      c.removeEventListener('sleep', onRest);
      cameraBus.detach(c);
    };
  }, [gl, compact, distance]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minPolarAngle={POLAR_MIN}
      maxPolarAngle={POLAR_MAX}
      minDistance={distance}
      maxDistance={distance}
      smoothTime={0.3}
      draggingSmoothTime={0.08}
      azimuthRotateSpeed={0.8}
      polarRotateSpeed={0.8}
    />
  );
}
