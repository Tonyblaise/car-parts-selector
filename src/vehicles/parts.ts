// Part list per body style, ported from the inspiration's getModel() (l.180–219).
import { VEHICLE_TYPES, type VehicleTypeId, type ZoneId } from './catalog';
import { toAzimuthPolar, type ViewAngle } from './cameraAngles';

export type PartId = string;

export interface Part {
  id: PartId;
  name: string;
  zone: ZoneId;
  /** Camera angle that shows this part (FR-007). */
  view: ViewAngle;
}

const HP = Math.PI / 2;
// Inspiration views as [yaw, pitch].
const V = {
  front: toAzimuthPolar(-HP + 0.5, 0.32),
  rear: toAzimuthPolar(HP - 0.45, 0.34),
  right: toAzimuthPolar(-0.35, 0.3),
  left: toAzimuthPolar(Math.PI + 0.35, 0.3),
  top: toAzimuthPolar(-0.5, 1.05),
  rearTop: toAzimuthPolar(HP - 0.5, 0.8),
} as const;

const cache = new Map<VehicleTypeId, Part[]>();
const indexCache = new Map<VehicleTypeId, Map<PartId, number>>();

export function buildParts(type: VehicleTypeId): Part[] {
  const hit = cache.get(type);
  if (hit) return hit;

  const { skipParts, renames } = VEHICLE_TYPES[type];
  const parts: Part[] = [];
  const add = (id: PartId, name: string, zone: ZoneId, view: ViewAngle) => {
    const side = /-(right|left)$/.exec(id)?.[1];
    const base = id.replace(/-(right|left)$/, '');
    if (skipParts.includes(base)) return;
    const rename = renames[base];
    parts.push({ id, name: rename ? rename.replace('{s}', side ?? '') : name, zone, view });
  };

  add('front-bumper', 'Front bumper', 'Front', V.front);
  add('grille', 'Grille and headlights', 'Front', V.front);
  add('bonnet', 'Bonnet', 'Front', V.front);
  add('windscreen', 'Windscreen', 'Top', V.top);
  add('roof', 'Roof', 'Top', V.top);
  add('rear-windscreen', 'Rear windscreen', 'Top', V.rearTop);
  for (const [s, zone, view] of [
    ['right', 'Right side', V.right],
    ['left', 'Left side', V.left],
  ] as const) {
    add(`wing-${s}`, `Front ${s} wing`, zone, view);
    add(`front-door-${s}`, `Front ${s} door`, zone, view);
    add(`front-window-${s}`, `Front ${s} window`, zone, view);
    add(`rear-door-${s}`, `Rear ${s} door`, zone, view);
    add(`rear-window-${s}`, `Rear ${s} window`, zone, view);
    add(`quarter-${s}`, `Rear ${s} quarter panel`, zone, view);
    add(`quarter-window-${s}`, `Rear ${s} quarter window`, zone, view);
  }
  add('tailgate', 'Tailgate', 'Rear', V.rear);
  add('rear-bumper', 'Rear bumper', 'Rear', V.rear);
  add('wheel-fr', 'Front right wheel', 'Wheels', V.right);
  add('wheel-rr', 'Rear right wheel', 'Wheels', V.right);
  add('wheel-fl', 'Front left wheel', 'Wheels', V.left);
  add('wheel-rl', 'Rear left wheel', 'Wheels', V.left);

  cache.set(type, parts);
  return parts;
}

export function partIndexById(type: VehicleTypeId): Map<PartId, number> {
  let idx = indexCache.get(type);
  if (!idx) {
    idx = new Map(buildParts(type).map((p, i) => [p.id, i]));
    indexCache.set(type, idx);
  }
  return idx;
}

export function findPart(type: VehicleTypeId, id: PartId): Part | undefined {
  const i = partIndexById(type).get(id);
  return i === undefined ? undefined : buildParts(type)[i];
}
