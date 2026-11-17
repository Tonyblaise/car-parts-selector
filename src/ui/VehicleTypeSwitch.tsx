import { useEffect, useRef, useState } from 'react';
import { inspectionStore, needsSwitchConfirm, useInspection } from '../state/inspectionStore';
import { VEHICLE_TYPE_IDS, VEHICLE_TYPES, type VehicleTypeId } from '../vehicles/catalog';
import { ConfirmSwitchDialog } from './ConfirmSwitchDialog';
import type { LayoutVariant } from './useMediaQuery';

/** Body style picker (FR-017); confirms before discarding recorded work (FR-018). */
export function VehicleTypeSwitch({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const vehicleType = useInspection((s) => s.vehicleType);
  const switchVehicle = useInspection((s) => s.switchVehicle);
  const [pending, setPending] = useState<VehicleTypeId | null>(null);
  const buttons = useRef<Partial<Record<VehicleTypeId, HTMLButtonElement | null>>>({});
  const returnFocusTo = useRef<VehicleTypeId | null>(null);

  // Return focus only after the dialog has unmounted; removing it would otherwise drop focus.
  useEffect(() => {
    if (pending === null && returnFocusTo.current) {
      buttons.current[returnFocusTo.current]?.focus();
      returnFocusTo.current = null;
    }
  }, [pending]);

  const choose = (id: VehicleTypeId) => {
    if (id === vehicleType) return;
    if (needsSwitchConfirm(inspectionStore.getState())) setPending(id);
    else switchVehicle(id);
  };

  const close = (confirmed: boolean) => {
    const id = pending;
    setPending(null);
    if (!id) return;
    if (confirmed) switchVehicle(id);
    returnFocusTo.current = id;
  };

  return (
    <div className="control-group">
      <p className={variant === 'mobile' ? 'sr-only' : 'control-label'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 17h14M6 17v-6l2-4h8l2 4v6M8 14h.01M16 14h.01" />
        </svg>
        Vehicle type
      </p>
      <div role="group" aria-label="Vehicle type" className={variant === 'mobile' ? 'seg seg-fill' : 'seg'}>
        {VEHICLE_TYPE_IDS.map((id) => (
          <button
            key={id}
            ref={(el) => {
              buttons.current[id] = el;
            }}
            type="button"
            className="seg-btn caps"
            aria-pressed={id === vehicleType}
            onClick={() => choose(id)}
          >
            {VEHICLE_TYPES[id].label}
          </button>
        ))}
      </div>
      {pending && (
        <ConfirmSwitchDialog
          targetLabel={VEHICLE_TYPES[pending].label}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </div>
  );
}
