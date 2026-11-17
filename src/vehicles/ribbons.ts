// Thin quads laid on the surface along part boundaries (inspiration ribbons(), l.380–394).
// They lie along the surface, so they look the same from any camera angle.
import { cross, type Edge, type V3 } from './geometry';

/** Positions for two triangles per edge, `width` wide, lifted `lift` off the surface. */
export function buildRibbons(edges: readonly Edge[], width: number, lift: number): Float32Array {
  const out: number[] = [];
  for (const e of edges) {
    const t0: V3 = [e.p2[0] - e.p1[0], e.p2[1] - e.p1[1], e.p2[2] - e.p1[2]];
    const l = Math.hypot(t0[0], t0[1], t0[2]);
    if (l < 1e-5) continue;
    const t: V3 = [t0[0] / l, t0[1] / l, t0[2] / l];
    const corner = (p: V3, n: V3, sign: number): V3 => {
      const s = cross(n, t);
      const h = width * 0.5 * sign;
      return [p[0] + n[0] * lift + s[0] * h, p[1] + n[1] * lift + s[1] * h, p[2] + n[2] * lift + s[2] * h];
    };
    const a = corner(e.p1, e.n1, -1);
    const b = corner(e.p1, e.n1, 1);
    const c = corner(e.p2, e.n2, 1);
    const d = corner(e.p2, e.n2, -1);
    for (const p of [a, b, c, a, c, d]) out.push(p[0], p[1], p[2]);
  }
  return new Float32Array(out);
}
