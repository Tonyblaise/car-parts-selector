import { useEffect, useMemo } from 'react';
import { createShadowMaterial } from './materials';

/** Soft contact shadow, as in the inspiration. Not pickable. */
export function GroundShadow() {
  const material = useMemo(() => createShadowMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.002} material={material} renderOrder={-1} raycast={() => null}>
      <planeGeometry args={[6.2, 3.5]} />
    </mesh>
  );
}
