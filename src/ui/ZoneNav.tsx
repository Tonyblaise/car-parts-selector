import { useInspection } from '../state/inspectionStore';
import { zoneSummary } from '../state/selectors';
import { ALL_PARTS_ZONE, ZONES } from '../vehicles/catalog';
import type { LayoutVariant } from './useMediaQuery';

/** Zone filters with checked/total per zone (FR-016); a scrolling row of pills on phones. */
export function ZoneNav({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const vehicleType = useInspection((s) => s.vehicleType);
  const conditions = useInspection((s) => s.conditions);
  const activeZone = useInspection((s) => s.activeZone);
  const setActiveZone = useInspection((s) => s.setActiveZone);

  return (
    <>
      {[ALL_PARTS_ZONE, ...ZONES].map((z) => {
        const { checked, total } = zoneSummary({ vehicleType, conditions }, z.id);
        return (
          <button
            key={z.id}
            type="button"
            className={variant === 'mobile' ? 'zone-pill' : 'zone-btn'}
            aria-pressed={z.id === activeZone}
            onClick={() => setActiveZone(z.id)}
          >
            {variant === 'mobile' ? null : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={z.icon} />
            </svg>
            )}
            <span className="zone-name">{z.name}</span>
            <span className="zone-count">
              {checked}/{total}
            </span>
          </button>
        );
      })}
    </>
  );
}
