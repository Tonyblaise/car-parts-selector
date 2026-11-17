import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { useInspection } from '../state/inspectionStore';
import { buildRibbons } from '../vehicles/ribbons';
import { ACCENT_RGB } from './colors';
import { createFlatMaterial } from './materials';
import { hasRealModel, useVehicleGeometry } from './vehicleModels';

/** A thick blue outline along the selected part's boundary edges (FR-004). */
export function SelectionOutline() {
  const vehicleType = useInspection((s) => s.vehicleType);
  const selected = useInspection((s) => s.selectedPart);
  const g = useVehicleGeometry(vehicleType);

  const geometry = useMemo(() => {
    if (!selected) return null;
    const edges = g.edges.filter(
      (e) => e.a !== e.b && (e.a === selected || e.b === selected),
    );
    const bg = new BufferGeometry();
    // The real model's boundaries follow many small triangles; a thinner line reads better there.
    const width = hasRealModel(vehicleType) ? 0.02 : 0.04;
    bg.setAttribute('position', new BufferAttribute(buildRibbons(edges, width, 0.008), 3));
    return bg;
  }, [g, selected, vehicleType]);
  const material = useMemo(() => createFlatMaterial(ACCENT_RGB), []);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} renderOrder={1} raycast={() => null} />;
}
