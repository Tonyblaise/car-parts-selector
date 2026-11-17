import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { useInspection } from '../state/inspectionStore';
import { buildRibbons } from '../vehicles/ribbons';
import { createFlatMaterial } from './materials';
import { hasRealModel, useVehicleGeometry } from './vehicleModels';

const SEAM_RGB = [0.12, 0.12, 0.13] as const;

/** Thin dark seams between panels; rebuilt only when the vehicle type changes. */
export function PartSeams() {
  const vehicleType = useInspection((s) => s.vehicleType);
  const g = useVehicleGeometry(vehicleType);
  // A real model already shows its own panel gaps; its part boundaries are inspection zones,
  // not physical seams, so only the drawn cars get seam lines.
  const show = !hasRealModel(vehicleType);

  const geometry = useMemo(() => {
    const bg = new BufferGeometry();
    bg.setAttribute('position', new BufferAttribute(show ? buildRibbons(g.edges, 0.012, 0.004) : new Float32Array(0), 3));
    return bg;
  }, [g, show]);
  const material = useMemo(() => createFlatMaterial(SEAM_RGB), []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  if (!show) return null;
  return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
