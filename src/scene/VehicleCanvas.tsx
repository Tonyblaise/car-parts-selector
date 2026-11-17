import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { WebGLRenderer } from 'three';
import { inspectionStore } from '../state/inspectionStore';
import { CalloutLabel, CalloutTracker } from './Callout';
import { CameraRig } from './CameraRig';
import { GroundShadow } from './GroundShadow';
import { PartSeams } from './PartSeams';
import { CANVAS_LABEL, TARGET } from './sceneConstants';
import { SelectionOutline } from './SelectionOutline';
import { TEST_HOOKS_ENABLED, TestHooks } from './testHooks';
import { useAdaptiveDpr } from './useAdaptiveDpr';
import { VehicleMesh } from './VehicleMesh';

const RESTORE_FALLBACK_MS = 1500;

/** Rendered as the Suspense fallback while a real model downloads; drives the DOM overlay. */
function LoadingSignal({ onChange }: { onChange: (loading: boolean) => void }) {
  useEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return null;
}

function AdaptiveQuality() {
  useAdaptiveDpr();
  return null;
}

/** The lazy 3D chunk: the canvas plus its DOM overlays. */
export default function VehicleCanvas() {
  // Bumped after a lost GPU context comes back, to rebuild the scene on a fresh canvas
  // (research R6). The inspection lives in the store, so nothing recorded is lost.
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);

  // Only the live canvas counts: disposing a replaced renderer force-loses its context too.
  const live = useRef<HTMLCanvasElement | null>(null);

  const watchContext = useCallback((gl: WebGLRenderer) => {
    const el = gl.domElement;
    live.current = el;
    let fallback: number | undefined;
    const rebuild = () => {
      window.clearTimeout(fallback);
      if (live.current !== el) return;
      live.current = null;
      setLost(false);
      setGeneration((g) => g + 1);
      inspectionStore.getState().setWebgl('ok');
    };
    el.addEventListener('webglcontextlost', (e) => {
      if (live.current !== el) return;
      e.preventDefault();
      setLost(true);
      inspectionStore.getState().setWebgl('lost');
      // Not every browser fires "restored"; if it hasn't come back soon, start over on a new canvas.
      fallback = window.setTimeout(rebuild, RESTORE_FALLBACK_MS);
    });
    el.addEventListener('webglcontextrestored', rebuild);
  }, []);

  return (
    <>
      <Canvas
        key={generation}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.1, far: 60, position: [6, 4, 6] }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl, camera }) => {
          gl.domElement.setAttribute('role', 'img');
          gl.domElement.setAttribute('aria-label', CANVAS_LABEL);
          camera.lookAt(...TARGET);
          watchContext(gl);
        }}
      >
        <CameraRig />
        <GroundShadow />
        {/* Only the car suspends while a model loads; camera and shadow stay put. */}
        <Suspense fallback={<LoadingSignal onChange={setLoadingModel} />}>
          <VehicleMesh />
          <PartSeams />
          <SelectionOutline />
        </Suspense>
        <CalloutTracker />
        <AdaptiveQuality />
        {TEST_HOOKS_ENABLED && <TestHooks />}
      </Canvas>
      <CalloutLabel />
      {loadingModel && !lost && (
        <p role="status" className="viewer-message">
          Loading 3D model…
        </p>
      )}
      {lost && (
        <p role="status" className="viewer-message" style={{ background: 'rgb(236 236 236 / 85%)' }}>
          Restoring 3D view…
        </p>
      )}
    </>
  );
}
