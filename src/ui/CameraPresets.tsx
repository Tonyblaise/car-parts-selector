import { cameraBus } from '../scene/cameraBus';
import { PRESET_NAMES, PRESET_VIEWS } from '../scene/cameraMath';
import { useInspection } from '../state/inspectionStore';
import type { LayoutVariant } from './useMediaQuery';

/** Six standard camera angles (FR-006). Hidden when there is no 3D view to move. */
export function CameraPresets({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const webgl = useInspection((s) => s.webgl);
  if (webgl === 'unavailable') return null;

  const buttons = PRESET_NAMES.map((name) => (
    <button
      key={name}
      type="button"
      className="seg-btn caps"
      onClick={() => void cameraBus.lookAtView(PRESET_VIEWS[name])}
    >
      {name}
    </button>
  ));
  // Phone: an overlay strip along the bottom of the 3D view.
  if (variant === 'mobile') {
    return (
      <div role="group" aria-label="Camera view" className="seg seg-fill camera-overlay">
        {buttons}
      </div>
    );
  }

  return (
    <div className="control-group">
      <p className="control-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        </svg>
        Camera
      </p>
      <div role="group" aria-label="Camera view" className="seg">
        {buttons}
      </div>
    </div>
  );
}
