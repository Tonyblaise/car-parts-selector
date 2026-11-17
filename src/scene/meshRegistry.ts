// The live vehicle mesh, so test hooks and the callout can raycast and project against it.
import type { Mesh } from 'three';
import type { VehicleGeometry } from '../vehicles/geometry';

export const meshRegistry: { mesh: Mesh | null; geometry: VehicleGeometry | null } = {
  mesh: null,
  geometry: null,
};
