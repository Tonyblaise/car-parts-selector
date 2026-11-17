import { useId } from 'react';
import { useInspection } from '../state/inspectionStore';
import { CONDITION_META, CONDITIONS, NOTE_MAX } from '../state/types';
import { findPart } from '../vehicles/parts';
import type { LayoutVariant } from './useMediaQuery';

/** Condition, notes and clear for the selected part (FR-009, FR-011, FR-012). */
export function ConditionPanel({ variant = 'desktop' }: { variant?: LayoutVariant }) {
  const vehicleType = useInspection((s) => s.vehicleType);
  const selected = useInspection((s) => s.selectedPart);
  const condition = useInspection((s) => (s.selectedPart ? s.conditions[s.selectedPart] : undefined));
  const note = useInspection((s) => (s.selectedPart ? (s.notes[s.selectedPart] ?? '') : ''));
  const mark = useInspection((s) => s.mark);
  const setNote = useInspection((s) => s.setNote);
  const clear = useInspection((s) => s.clear);
  const labelId = useId();

  const part = selected ? findPart(vehicleType, selected) : undefined;
  const mobile = variant === 'mobile';
  if (!part) {
    // On phones the hint over the car already says what to do; the sheet shows just the list.
    return mobile ? null : (
      <p className="empty-hint">Tap a part on the car or in the list to record its condition.</p>
    );
  }

  const conditionGroup = (
    <div role="group" aria-label="Condition" className="seg seg-grid">
      {CONDITIONS.map((c) => {
        const meta = CONDITION_META[c];
        const on = condition === c;
        return (
          <button
            key={c}
            type="button"
            className="seg-btn caps"
            aria-pressed={on}
            aria-describedby={labelId}
            style={on ? { color: meta.color } : undefined}
            onClick={() => mark(part.id, c)}
          >
            <span className="dot" aria-hidden="true" style={{ background: meta.color, borderColor: meta.color, width: 7, height: 7 }} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
  const notes = (
    <label className="notes">
      Notes
      <textarea
        rows={mobile ? 1 : 3}
        maxLength={NOTE_MAX}
        value={note}
        placeholder="Scratch, dent or chip, and where"
        onChange={(e) => setNote(part.id, e.target.value)}
      />
    </label>
  );

  if (mobile) {
    return (
      <div className="condition-panel condition-panel-mobile">
        <div className="condition-head">
          <h2 id={labelId} className="condition-title">
            {part.name}
          </h2>
          <button type="button" className="text-btn" onClick={() => clear(part.id)}>
            Clear
          </button>
        </div>
        {conditionGroup}
        {notes}
      </div>
    );
  }

  return (
    <div className="condition-panel">
      <div className="control-group">
        <p id={labelId} className="control-label">
          Condition · {part.name}
        </p>
        {conditionGroup}
      </div>
      {notes}
      <button type="button" className="btn btn-small caps" onClick={() => clear(part.id)}>
        Clear
      </button>
    </div>
  );
}
