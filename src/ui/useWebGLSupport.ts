import { useEffect } from 'react';
import { inspectionStore } from '../state/inspectionStore';

/** True if this browser can create a WebGL context (FR-023). */
export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    // Free the probe context straight away instead of waiting for GC.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Probes once on mount and records the result in the store. */
export function useWebGLSupport(): void {
  useEffect(() => {
    if (inspectionStore.getState().webgl !== 'checking') return;
    inspectionStore.getState().setWebgl(detectWebGL() ? 'ok' : 'unavailable');
  }, []);
}
