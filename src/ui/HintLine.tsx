import { useEffect, useState } from 'react';
import { hoverBus } from '../scene/hoverBus';
import { useInspection } from '../state/inspectionStore';
import { findPart } from '../vehicles/parts';

const DEFAULT_HINT = 'Drag to rotate · Tap a part';

/**
 * Names the hovered part, or explains the gestures (FR-005). Hidden from screen readers:
 * hovering would flood them; selection is announced by LiveAnnouncer instead.
 */
export function HintLine({ placement = 'bottom' }: { placement?: 'bottom' | 'top' }) {
  const vehicleType = useInspection((s) => s.vehicleType);
  const hasSelection = useInspection((s) => s.selectedPart !== null);
  const [hovered, setHovered] = useState(hoverBus.get());
  useEffect(() => hoverBus.subscribe(setHovered), []);
  const name = hovered ? findPart(vehicleType, hovered)?.name : undefined;

  // Phones (top placement): shown only until something is selected, as in the mobile design.
  if (placement === 'top' && hasSelection) return null;
  return (
    <p className={placement === 'top' ? 'hint hint-top' : 'hint'} aria-hidden="true">
      {name ?? DEFAULT_HINT}
    </p>
  );
}
