import { useInspection } from '../state/inspectionStore';
import { PAINTS, PAINT_IDS } from '../vehicles/catalog';

/** Three paint swatches (FR-019, research R8). */
export function PaintPicker() {
  const paint = useInspection((s) => s.paint);
  const setPaint = useInspection((s) => s.setPaint);

  return (
    <div className="control-group">
      <p className="control-label">Paint</p>
      <div role="group" aria-label="Paint" className="seg">
        {PAINT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="swatch"
            aria-label={`${PAINTS[id].label} paint`}
            aria-pressed={id === paint}
            onClick={() => setPaint(id)}
          >
            <span style={{ background: PAINTS[id].hex }} />
          </button>
        ))}
      </div>
    </div>
  );
}
