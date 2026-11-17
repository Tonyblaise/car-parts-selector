import { lazy, Suspense, type ReactNode } from 'react';
import { useInspection } from '../state/inspectionStore';
import { HintLine } from './HintLine';
import { NoWebGLFallback } from './NoWebGLFallback';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import type { LayoutVariant } from './useMediaQuery';
import { useWebGLSupport } from './useWebGLSupport';

// three.js + React Three Fiber live in this lazy chunk, outside the entry bundle (Principle II).
const VehicleCanvas = lazy(() => import('../scene/VehicleCanvas'));

export function Viewer({ variant = 'desktop', overlay }: { variant?: LayoutVariant; overlay?: ReactNode }) {
  useWebGLSupport();
  const webgl = useInspection((s) => s.webgl);

  return (
    <div className={variant === 'mobile' ? 'viewer-frame viewer-frame-mobile' : 'viewer-frame'}>
      {webgl === 'unavailable' ? (
        <NoWebGLFallback />
      ) : webgl === 'checking' ? null : (
        <SceneErrorBoundary>
          <Suspense fallback={<NoWebGLFallback message="Loading 3D view…" />}>
            <VehicleCanvas />
          </Suspense>
          <HintLine placement={variant === 'mobile' ? 'top' : 'bottom'} />
          {overlay}
        </SceneErrorBoundary>
      )}
    </div>
  );
}
