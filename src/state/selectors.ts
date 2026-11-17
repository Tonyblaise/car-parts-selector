import type { VehicleTypeId, ZoneFilter } from '../vehicles/catalog';
import { buildParts, type Part, type PartId } from '../vehicles/parts';
import type { Condition } from './types';

interface SelectorInput {
  vehicleType: VehicleTypeId;
  conditions: Record<PartId, Condition>;
  activeZone: ZoneFilter;
}

export interface Progress {
  done: number;
  total: number;
  pass: number;
  advisory: number;
  damage: number;
}

export function progress(s: Pick<SelectorInput, 'vehicleType' | 'conditions'>): Progress {
  const parts = buildParts(s.vehicleType);
  const out: Progress = { done: 0, total: parts.length, pass: 0, advisory: 0, damage: 0 };
  for (const p of parts) {
    const c = s.conditions[p.id];
    if (c) {
      out[c]++;
      out.done++;
    }
  }
  return out;
}

const partsInZone = (type: VehicleTypeId, zone: ZoneFilter): Part[] => {
  const parts = buildParts(type);
  return zone === 'all' ? parts : parts.filter((p) => p.zone === zone);
};

export function zoneSummary(
  s: Pick<SelectorInput, 'vehicleType' | 'conditions'>,
  zone: ZoneFilter,
): { checked: number; total: number } {
  const parts = partsInZone(s.vehicleType, zone);
  return { checked: parts.filter((p) => s.conditions[p.id]).length, total: parts.length };
}

export function visibleParts(s: Pick<SelectorInput, 'vehicleType' | 'activeZone'>): Part[] {
  return partsInZone(s.vehicleType, s.activeZone);
}
