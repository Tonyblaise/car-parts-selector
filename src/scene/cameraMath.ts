// Re-exports the single source of truth in src/vehicles/cameraAngles.ts, plus the six
// camera presets from the inspiration (l.821, given there as [yaw, pitch]).
import { toAzimuthPolar, type ViewAngle } from '../vehicles/cameraAngles';

export {
  POLAR_MAX,
  POLAR_MIN,
  clampPolar,
  shortestAzimuth,
  toAzimuthPolar,
  type ViewAngle,
} from '../vehicles/cameraAngles';

export const PRESET_NAMES = ['3/4', 'Front', 'Right', 'Rear', 'Left', 'Top'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export const PRESET_VIEWS: Readonly<Record<PresetName, ViewAngle>> = {
  '3/4': toAzimuthPolar(-0.75, 0.62),
  Front: toAzimuthPolar(-Math.PI / 2, 0.22),
  Right: toAzimuthPolar(0, 0.18),
  Rear: toAzimuthPolar(Math.PI / 2, 0.22),
  Left: toAzimuthPolar(Math.PI, 0.18),
  Top: toAzimuthPolar(-Math.PI / 2, 1.45),
};

/** The inspiration's opening angle, before the intro move settles on 3/4 (FR-008). */
export const INTRO_START: ViewAngle = toAzimuthPolar(-1.7, 0.5);

export const CAMERA_DISTANCE = 9.5;
