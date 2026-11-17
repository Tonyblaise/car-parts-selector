export const CANVAS_LABEL =
  'Rotatable 3D vehicle. Drag to rotate and tap a part to select it. Every part is also in the list beside it.';

/** Look-at point: the middle of the car's height, as in the inspiration. */
export const TARGET: [number, number, number] = [0, 0.85, 0];

/** Pointer travel (px) above which a press counts as a drag, not a tap (spec edge case). */
export const TAP_SLOP_PX = 5;
