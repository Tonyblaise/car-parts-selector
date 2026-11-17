import type { PaintId, VehicleTypeId, ZoneFilter } from '../vehicles/catalog';
import type { PartId } from '../vehicles/parts';

export type Condition = 'pass' | 'advisory' | 'damage';
export const CONDITIONS: readonly Condition[] = ['pass', 'advisory', 'damage'];

export const CONDITION_META: Readonly<
  Record<Condition, { label: string; color: string; tint: [number, number, number] }>
> = {
  pass: { label: 'Pass', color: '#1F7A45', tint: [0.3, 0.74, 0.47] },
  advisory: { label: 'Advisory', color: '#9A5200', tint: [0.96, 0.62, 0.22] },
  damage: { label: 'Damage', color: '#B3261E', tint: [0.9, 0.3, 0.28] },
};

/** The current inspection. Held in memory only; nothing is saved (it's a demo). */
export interface Inspection {
  vehicleType: VehicleTypeId;
  paint: PaintId;
  conditions: Record<PartId, Condition>;
  notes: Record<PartId, string>;
}

export type WebGLState = 'checking' | 'ok' | 'unavailable' | 'lost';

/** UI state. */
export interface UiState {
  selectedPart: PartId | null;
  activeZone: ZoneFilter;
  webgl: WebGLState;
}

export const NOTE_MAX = 1000;
