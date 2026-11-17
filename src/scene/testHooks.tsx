// Test-only window.__carInspector (contracts/ui-contract.md › Test hooks). Enabled in dev, and
// in the e2e build via VITE_TEST_HOOKS=1; normal production builds drop it as dead code.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Raycaster, Vector2, Vector3 } from 'three';
import { inspectionStore } from '../state/inspectionStore';
import { partIndexById } from '../vehicles/parts';
import { cameraBus } from './cameraBus';
import { meshRegistry } from './meshRegistry';
import { pickPart } from './picking';

export const TEST_HOOKS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_TEST_HOOKS === '1';

let moving = false;
export const setCameraMoving = (m: boolean) => {
  moving = m;
};

export function TestHooks() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const v = new Vector3();

    const toClient = (x: number, y: number) => {
      const { size } = get();
      const rect = get().gl.domElement.getBoundingClientRect();
      return { x: rect.left + x * (rect.width / size.width), y: rect.top + y * (rect.height / size.height) };
    };

    const hooks = {
      firstFrameAt: null as number | null,
      getPartScreenPosition(id: string) {
        const { vehicleType } = inspectionStore.getState();
        const g = meshRegistry.geometry;
        const i = partIndexById(vehicleType).get(id);
        if (i === undefined || !g) return null;
        const { camera, size } = get();
        v.set(g.centroids[i * 3]!, g.centroids[i * 3 + 1]!, g.centroids[i * 3 + 2]!).project(camera);
        if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1) return null;
        return toClient(((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height);
      },
      /** The part a click at this client position would select, or null. */
      partAt(clientX: number, clientY: number) {
        const { camera, gl } = get();
        const mesh = meshRegistry.mesh;
        const g = meshRegistry.geometry;
        if (!mesh || !g) return null;
        const rect = gl.domElement.getBoundingClientRect();
        ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return pickPart(raycaster.intersectObject(mesh), mesh, g);
      },
      getCameraAngles() {
        return cameraBus.angles() ?? { azimuth: NaN, polar: NaN };
      },
      drawCalls() {
        return get().gl.info.render.calls;
      },
      renderedFrames() {
        return get().gl.info.render.frame;
      },
      isMoving() {
        return moving;
      },
    };
    window.__carInspector = hooks;
    return () => {
      if (window.__carInspector === hooks) delete window.__carInspector;
    };
  }, [get]);

  useFrame(() => {
    const h = window.__carInspector;
    // "First frame" means the car itself is on screen, not just an empty canvas.
    if (h && h.firstFrameAt == null && meshRegistry.mesh) h.firstFrameAt = performance.now();
  });

  return null;
}

declare global {
  interface Window {
    __carInspector?: {
      firstFrameAt: number | null;
      getPartScreenPosition(id: string): { x: number; y: number } | null;
      partAt(x: number, y: number): string | null;
      getCameraAngles(): { azimuth: number; polar: number };
      drawCalls(): number;
      renderedFrames(): number;
      isMoving(): boolean;
    };
  }
}
