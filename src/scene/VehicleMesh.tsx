import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, type Mesh } from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { inspectionStore, useInspection } from '../state/inspectionStore';
import { PAINTS } from '../vehicles/catalog';
import type { VehicleGeometry } from '../vehicles/geometry';
import { buildParts, partIndexById } from '../vehicles/parts';
import { writeColors } from './colors';
import { hoverBus } from './hoverBus';
import { createVehicleMaterial } from './materials';
import { meshRegistry } from './meshRegistry';
import { pickAlongRay } from './picking';
import { TAP_SLOP_PX } from './sceneConstants';
import { useVehicleGeometry } from './vehicleModels';

function toBufferGeometry(g: VehicleGeometry): BufferGeometry {
  const bg = new BufferGeometry();
  bg.setAttribute('position', new BufferAttribute(g.positions, 3));
  bg.setAttribute('normal', new BufferAttribute(g.normals, 3));
  bg.setAttribute('aKind', new BufferAttribute(Float32Array.from(g.kinds), 1));
  const color = new BufferAttribute(new Float32Array(g.count * 3), 3);
  color.setUsage(DynamicDrawUsage);
  bg.setAttribute('aColor', color);
  bg.computeBoundingSphere();
  // A BVH keeps picking fast on the 150k-triangle real model (and costs little on the drawn ones).
  computeBoundsTree.call(bg);
  return bg;
}

/** The car body: one mesh, one draw call, coloured per vertex (research R2). */
export function VehicleMesh() {
  const vehicleType = useInspection((s) => s.vehicleType);
  const invalidate = useThree((s) => s.invalidate);
  const g = useVehicleGeometry(vehicleType);

  const geometry = useMemo(() => toBufferGeometry(g), [g]);
  const material = useMemo(() => createVehicleMaterial(g.wheelCutout), [g]);
  // Free GPU memory when the vehicle type changes or the canvas unmounts (Principle I).
  useEffect(
    () => () => {
      disposeBoundsTree.call(geometry);
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const repaint = useCallback(() => {
    const s = inspectionStore.getState();
    const index = partIndexById(g.type);
    const attr = geometry.getAttribute('aColor') as BufferAttribute;
    const hovered = hoverBus.get();
    writeColors(attr.array as Float32Array, g, {
      paintHex: PAINTS[s.paint].hex,
      conditions: s.conditions,
      parts: buildParts(g.type),
      selectedIndex: s.selectedPart ? (index.get(s.selectedPart) ?? -1) : -1,
      hoverIndex: hovered ? (index.get(hovered) ?? -1) : -1,
    });
    attr.needsUpdate = true;
    invalidate();
  }, [g, geometry, invalidate]);

  useEffect(() => {
    repaint();
    const offStore = inspectionStore.subscribe((s, prev) => {
      if (s.paint !== prev.paint || s.conditions !== prev.conditions || s.selectedPart !== prev.selectedPart) {
        repaint();
      }
    });
    const offHover = hoverBus.subscribe(repaint);
    return () => {
      offStore();
      offHover();
    };
  }, [repaint]);

  const meshRef = useRef<Mesh>(null);
  useEffect(() => {
    meshRegistry.mesh = meshRef.current;
    meshRegistry.geometry = g;
    return () => {
      meshRegistry.mesh = null;
      meshRegistry.geometry = null;
    };
  }, [g]);

  // FR-003: a tap (not a drag) selects the frontmost visible part; empty space changes nothing.
  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > TAP_SLOP_PX || !meshRef.current) return;
      const id = pickAlongRay(e.ray, meshRef.current, g);
      if (id) inspectionStore.getState().selectFromCanvas(id);
    },
    [g],
  );

  // FR-005: mouse hover lightens the part and names it in the hint line.
  const canvasEl = useThree((s) => s.gl.domElement);
  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.pointerType !== 'mouse' || !meshRef.current) return;
      if (e.buttons) {
        // Dragging: clear the hover so the rotate gesture isn't mistaken for a pick.
        hoverBus.set(null);
        return;
      }
      const id = pickAlongRay(e.ray, meshRef.current, g);
      hoverBus.set(id);
      canvasEl.style.cursor = id ? 'pointer' : 'grab';
    },
    [g, canvasEl],
  );
  const onPointerOut = useCallback(() => {
    hoverBus.set(null);
    canvasEl.style.cursor = 'grab';
  }, [canvasEl]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      raycast={acceleratedRaycast}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    />
  );
}
