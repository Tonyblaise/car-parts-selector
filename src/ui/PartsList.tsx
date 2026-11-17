import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cameraBus } from '../scene/cameraBus';
import { visibleParts } from '../state/selectors';
import { useInspection } from '../state/inspectionStore';
import { CONDITION_META } from '../state/types';
import { ALL_PARTS_ZONE, ZONES } from '../vehicles/catalog';
import type { LayoutVariant } from './useMediaQuery';

/** The parts in the active zone; one tab stop with arrow-key movement (FR-007, FR-021). */
export function PartsList({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const vehicleType = useInspection((s) => s.vehicleType);
  const activeZone = useInspection((s) => s.activeZone);
  const selected = useInspection((s) => s.selectedPart);
  const conditions = useInspection((s) => s.conditions);
  const selectPart = useInspection((s) => s.selectPart);

  const parts = visibleParts({ vehicleType, activeZone });
  const headingId = useId();
  const zoneName =
    activeZone === 'all' ? ALL_PARTS_ZONE.name : `${ZONES.find((z) => z.id === activeZone)?.name} parts`;

  // Roving tabindex: the focused row, else the selected row, else the first.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const selectedIndex = parts.findIndex((p) => p.id === selected);
  const tabStop =
    focusIndex !== null && focusIndex < parts.length ? focusIndex : selectedIndex >= 0 ? selectedIndex : 0;
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep a part picked on the car visible in the list; start at the top for a new vehicle.
  // On phones the list is part of the scrolling page, so scrolling to the row would pull the
  // car out of view; only the desktop list (its own scroll box) follows the selection.
  useEffect(() => {
    if (variant === 'desktop' && selectedIndex >= 0) {
      rows.current[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selectedIndex, variant]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [vehicleType, activeZone]);

  const focusRow = (i: number) => {
    const next = Math.max(0, Math.min(parts.length - 1, i));
    setFocusIndex(next);
    rows.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const moves: Record<string, number> = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: parts.length - 1 };
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    focusRow(to);
  };

  const pick = (i: number) => {
    const part = parts[i];
    if (!part) return;
    setFocusIndex(i);
    selectPart(part.id);
    void cameraBus.lookAtView(part.view);
  };

  return (
    <div className={variant === 'mobile' ? 'parts-scroll' : 'control-group parts-group'}>
      {/* Phones show the zone in the pills above; the heading still names the list. */}
      <h2 id={headingId} className={variant === 'mobile' ? 'sr-only' : 'panel-title'}>
        {zoneName}
      </h2>
      <ul
        ref={listRef}
        className={variant === 'mobile' ? 'parts-list parts-list-mobile' : 'parts-list'}
        aria-labelledby={headingId}
      >
        {parts.map((p, i) => {
          const c = conditions[p.id];
          const meta = c ? CONDITION_META[c] : null;
          return (
            <li key={p.id}>
              <button
                type="button"
                ref={(el) => {
                  rows.current[i] = el;
                }}
                className="part-row"
                data-part-id={p.id}
                aria-pressed={p.id === selected}
                tabIndex={i === tabStop ? 0 : -1}
                onClick={() => pick(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onFocus={() => setFocusIndex(i)}
              >
                <span
                  className="dot"
                  aria-hidden="true"
                  style={meta ? { background: meta.color, borderColor: meta.color } : undefined}
                />
                <span className="part-name">{p.name}</span>
                <span className="part-status" style={{ color: meta?.color ?? 'var(--ink-3)' }}>
                  {meta?.label ?? ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
