import { useEffect, useState } from 'react';
import { inspectionStore } from '../state/inspectionStore';
import { CONDITION_META } from '../state/types';
import { findPart } from '../vehicles/parts';
import { announce, onAnnounce } from './announce';

/** Visually hidden status region: announces selection changes and app messages (FR-022). */
export function LiveAnnouncer() {
  const [message, setMessage] = useState('');

  useEffect(() => onAnnounce(setMessage), []);

  useEffect(
    () =>
      inspectionStore.subscribe((s, prev) => {
        const id = s.selectedPart;
        const changed =
          id !== prev.selectedPart || (id !== null && s.conditions[id] !== prev.conditions[id]);
        if (!changed || !id) return;
        const part = findPart(s.vehicleType, id);
        if (!part) return;
        const c = s.conditions[id];
        announce(`${part.name} selected · ${c ? CONDITION_META[c].label : 'Not checked'}`);
      }),
    [],
  );

  return (
    <p role="status" className="sr-only" data-testid="live-announcer">
      {message}
    </p>
  );
}
