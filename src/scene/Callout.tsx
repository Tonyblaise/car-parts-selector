import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { inspectionStore, useInspection } from '../state/inspectionStore';
import { CONDITION_META } from '../state/types';
import { findPart, partIndexById } from '../vehicles/parts';
import { meshRegistry } from './meshRegistry';

// The DOM label lives outside the canvas; the tracker inside it positions the label each
// rendered frame through this ref, never through React state (Principle I, research R7).
const labelRef: { current: HTMLDivElement | null } = { current: null };
const tmp = new Vector3();

/** Inside <Canvas>: projects the selected part's centre and moves the label there. */
export function CalloutTracker() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const el = labelRef.current;
    if (!el) return;
    const { selectedPart, vehicleType } = inspectionStore.getState();
    const g = meshRegistry.geometry;
    const i = selectedPart && g?.type === vehicleType ? partIndexById(vehicleType).get(selectedPart) : undefined;
    if (i === undefined || !g) {
      el.classList.remove('is-visible');
      return;
    }
    tmp.set(g.centroids[i * 3]!, g.centroids[i * 3 + 1]!, g.centroids[i * 3 + 2]!).project(camera);
    if (tmp.z > 1) {
      el.classList.remove('is-visible');
      return;
    }
    const x = ((tmp.x + 1) / 2) * size.width;
    const y = ((1 - tmp.y) / 2) * size.height;
    // Put the tag on whichever side of the car gives it room, as the inspiration does.
    const side = x > size.width / 2 ? 'right' : 'left';
    el.dataset.side = side;
    el.style.top = `${Math.round(y - 22)}px`;
    el.style.width = `${Math.round(side === 'left' ? x + 4 : size.width - x + 4)}px`;
    el.classList.add('is-visible');
  });

  return null;
}

/** Outside <Canvas>: the label itself (name + condition). Hidden from assistive tech. */
export function CalloutLabel() {
  const vehicleType = useInspection((s) => s.vehicleType);
  const selected = useInspection((s) => s.selectedPart);
  const condition = useInspection((s) => (s.selectedPart ? s.conditions[s.selectedPart] : undefined));
  const part = selected ? findPart(vehicleType, selected) : undefined;
  const meta = condition ? CONDITION_META[condition] : null;

  return (
    <div
      ref={(el) => {
        labelRef.current = el;
      }}
      className="callout"
      data-side="left"
      aria-hidden="true"
      data-testid="callout"
    >
      <span className="callout-tag">
        <span className="callout-name">{part?.name ?? ''}</span>
        <span style={{ color: meta?.color ?? 'var(--ink-3)' }}>{meta?.label ?? 'Not checked'}</span>
      </span>
      <span className="callout-line" />
      <span className="callout-dot" />
    </div>
  );
}
