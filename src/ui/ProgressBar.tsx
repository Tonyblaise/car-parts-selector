import { useShallow } from 'zustand/react/shallow';
import { useInspection } from '../state/inspectionStore';
import { progress } from '../state/selectors';
import type { LayoutVariant } from './useMediaQuery';

/** Inspection progress and "Pass the rest" (FR-013, FR-014). Nothing is saved: it's a demo. */
export function ProgressBar({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const p = useInspection(useShallow((s) => progress(s)));
  const passRest = useInspection((s) => s.passRest);
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;

  const track = (
    <div className="progress-track">
      <div className="progress-bar" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-badge" aria-label={`${p.done} of ${p.total} parts checked`}>
        {p.done}/{p.total}
      </span>
    </div>
  );
  const passRestButton = (
    <button type="button" className="btn caps" onClick={passRest} disabled={p.done === p.total}>
      Pass the rest
    </button>
  );

  // Phone footer: progress and "Pass the rest", pinned to the bottom of the screen.
  if (variant === 'mobile') {
    return (
      <div className="sheet-footer" data-testid="progress">
        {track}
        {passRestButton}
      </div>
    );
  }

  return (
    <div className="progress" data-testid="progress">
      <p className="progress-label">
        <span>Inspection progress</span>
        <span className="summary">
          {p.pass} pass · {p.advisory} advisory · {p.damage} damage
        </span>
      </p>
      <div className="progress-row">
        {track}
        {passRestButton}
      </div>
    </div>
  );
}
