// Per-vertex colours for the vehicle mesh (inspiration updateColors(), l.513–538).
// Pure: no React and no three.js, so it is unit-tested in Node.
import { CONDITION_META, type Condition } from '../state/types';
import { MaterialKind, type VehicleGeometry } from '../vehicles/geometry';
import type { PartId } from '../vehicles/parts';

type RGB = [number, number, number];

export const BASE_COLORS = {
  glass: [0.06, 0.065, 0.075] as RGB,
  under: [0.1, 0.1, 0.11] as RGB,
  tyre: [0.08, 0.08, 0.09] as RGB,
  hub: [0.72, 0.73, 0.75] as RGB,
  hub2: [0.2, 0.2, 0.22] as RGB,
};

/** Selection blue. */
export const ACCENT_RGB: RGB = [0.24, 0.42, 0.88];

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0.42, 0.43, 0.45];
  const v = parseInt(m[1]!, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export interface ColorInput {
  paintHex: string;
  conditions: Readonly<Record<PartId, Condition>>;
  parts: readonly { id: PartId }[];
  selectedIndex: number;
  hoverIndex: number;
}

/** How strongly a condition tint covers each material. */
const TINT_STRENGTH: Record<number, number> = {
  [MaterialKind.body]: 1,
  [MaterialKind.hub]: 1,
  [MaterialKind.glass]: 0.5,
  [MaterialKind.tyre]: 0.35,
};

export function writeColors(
  out: Float32Array,
  geom: Pick<VehicleGeometry, 'count' | 'kinds' | 'partIndex'>,
  input: ColorInput,
): void {
  const paint = hexToRgb(input.paintHex);
  const base: RGB[] = [paint, BASE_COLORS.glass, BASE_COLORS.under, BASE_COLORS.tyre, BASE_COLORS.hub, BASE_COLORS.hub2];
  const tintOf = input.parts.map((p) => {
    const c = input.conditions[p.id];
    return c ? CONDITION_META[c].tint : null;
  });
  const { selectedIndex: sel, hoverIndex: hov } = input;

  for (let i = 0; i < geom.count; i++) {
    const k = geom.kinds[i]!;
    const pi = geom.partIndex[i]!;
    let c = base[k]!;
    const t = pi >= 0 ? tintOf[pi] : null;
    if (t) {
      const a = TINT_STRENGTH[k] ?? 0.3;
      c = [c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a];
    }
    if (pi === sel && !t && (k === MaterialKind.body || k === MaterialKind.hub)) {
      c = [
        c[0] + (ACCENT_RGB[0] - c[0]) * 0.45,
        c[1] + (ACCENT_RGB[1] - c[1]) * 0.45,
        c[2] + (ACCENT_RGB[2] - c[2]) * 0.45,
      ];
    }
    const lift = pi >= 0 && pi === sel ? 0.06 : pi >= 0 && pi === hov ? 0.16 : 0;
    out[i * 3] = c[0] + (1 - c[0]) * lift;
    out[i * 3 + 1] = c[1] + (1 - c[1]) * lift;
    out[i * 3 + 2] = c[2] + (1 - c[2]) * lift;
  }
}
