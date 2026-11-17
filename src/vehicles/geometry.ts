// Procedural vehicle mesh, ported from the inspiration's buildGeometry() (l.221–378).
// Pure and GPU-free: it returns typed arrays that src/scene turns into BufferGeometry.
// Coordinates: +X = front, +Y = up, +Z = the car's right side.
import { VEHICLE_TYPES, type Knot, type VehicleTypeId } from './catalog';
import { buildParts, partIndexById, type PartId } from './parts';

export const MaterialKind = { body: 0, glass: 1, under: 2, tyre: 3, hub: 4, hub2: 5 } as const;
export type MaterialKind = (typeof MaterialKind)[keyof typeof MaterialKind];
type KindName = keyof typeof MaterialKind;

export type V3 = [number, number, number];

/** A boundary between two regions; drawn as a seam, and as the outline of a selected part. */
export interface Edge {
  a: PartId | null;
  b: PartId | null;
  p1: V3;
  p2: V3;
  n1: V3;
  n2: V3;
}

/** [front wheel x, rear wheel x, wheel centre height, squared cut radius]. */
export type WheelCutout = [number, number, number, number];

export interface VehicleGeometry {
  type: VehicleTypeId;
  /** Vertex count (non-indexed triangles). */
  count: number;
  positions: Float32Array;
  normals: Float32Array;
  kinds: Uint8Array;
  /** Index into buildParts(type), or −1 for the untagged underside. */
  partIndex: Int16Array;
  edges: Edge[];
  /** xyz centre per part, in buildParts order. */
  centroids: Float32Array;
  wheelCutout: WheelCutout;
}

/**
 * True where the body side must be cut away to show the wheel (the inspiration's shader
 * discard and hit() filter). Only applies to body and underside surfaces.
 */
export function isInWheelCutout(x: number, y: number, z: number, w: WheelCutout): boolean {
  if (Math.abs(z) <= 0.45) return false;
  const dxf = x - w[0];
  const dxr = x - w[1];
  const dy = y - w[2];
  return Math.min(dxf * dxf, dxr * dxr) + dy * dy < w[3];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Piecewise-linear lookup on knots ordered by descending x. */
function pl(pts: readonly Knot[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x <= a[0] && x >= b[0]) return lerp(a[1], b[1], (a[0] - x) / (a[0] - b[0] || 1));
  }
  return x > pts[0]![0] ? pts[0]![1] : pts[pts.length - 1]![1];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
};

const cache = new Map<VehicleTypeId, VehicleGeometry>();

export function buildGeometry(type: VehicleTypeId, opts: { fresh?: boolean } = {}): VehicleGeometry {
  if (!opts.fresh) {
    const hit = cache.get(type);
    if (hit) return hit;
  }
  const geometry = generate(type);
  cache.set(type, geometry);
  return geometry;
}

function generate(type: VehicleTypeId): VehicleGeometry {
  const cfg = VEHICLE_TYPES[type].shape;
  const parts = buildParts(type);
  const index = partIndexById(type);
  const { XD1, XR, XD2, XD3, XRR, XT, HK, y0 } = cfg;
  const XB = 1.95;
  const XRB = -1.95;
  const WK: Knot[] = [[2.25, 0.8], [2.1, 0.87], [1.95, 0.9], [-1.95, 0.9], [-2.15, 0.87], [-2.25, 0.82]];
  const YK: Knot[] = [[2.25, y0 + 0.1], [2.1, y0 + 0.02], [1.95, y0], [-1.95, y0], [-2.1, y0 + 0.02], [-2.25, y0 + 0.1]];

  // Cross-section stations along x: every break point, then subdivided to ≤0.24 apart.
  const keys = [2.25, 2.2, 2.1, XB, XD1, XR, XD2 + 0.05, XD2, XD2 - 0.05, XD3 + 0.05, XD3, XD3 - 0.05, XRR, XRB, -2.05, -2.15, -2.25].concat(
    HK.map((q) => q[0]),
  );
  if (XT > -5) keys.push(XT);
  keys.sort((p, q) => q - p);
  const XK: number[] = [];
  for (const x of keys) if (!XK.length || XK[XK.length - 1]! - x > 0.03) XK.push(x);
  const XS: number[] = [];
  for (let i = 0; i < XK.length; i++) {
    XS.push(XK[i]!);
    if (i < XK.length - 1) {
      const gap = XK[i]! - XK[i + 1]!;
      const n = Math.ceil(gap / 0.24);
      for (let t = 1; t < n; t++) XS.push(XK[i]! - (gap * t) / n);
    }
  }

  // Half cross-section at x: 16 points [height, half-width], from the roof centre down to the floor.
  const half = (x: number): [number, number][] => {
    const H = pl(HK, x);
    const Wb = pl(WK, x);
    const Y0 = pl(YK, x);
    const B = Math.min(cfg.bmax, H - 0.02);
    const c = Math.max(0, Math.min(1, (H - B - 0.02) / 0.45));
    const Wt = lerp(Wb - 0.05, (0.72 * Wb) / 0.9, c);
    const yc = H - 0.01 - 0.09 * c;
    const pts: [number, number][] = [];
    for (const f of [0, 0.3, 0.55, 0.75, 0.9]) pts.push([H - (0.05 * c + 0.008) * f * f, f * Wt]);
    pts.push([yc, Wt]);
    for (let t = 1; t <= 3; t++) pts.push([lerp(yc, B, t / 3), lerp(Wt, Wb - 0.04, t / 3)]);
    pts.push([B - 0.05, Wb]);
    pts.push([Math.min(0.86, B - 0.08), Wb + 0.01]);
    pts.push([0.62, Wb + 0.01]);
    pts.push([Math.min(Y0 + 0.12, 0.58), Wb - 0.01]);
    pts.push([Y0, Wb - 0.14]);
    pts.push([Y0, Wb * 0.45]);
    pts.push([Y0, 0]);
    return pts;
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const kinds: number[] = [];
  const partIdx: number[] = [];
  const edges: Edge[] = [];

  const vert = (p: V3, n: V3, part: PartId | null, kind: MaterialKind) => {
    positions.push(p[0], p[1], p[2]);
    normals.push(n[0], n[1], n[2]);
    kinds.push(kind);
    partIdx.push(part === null ? -1 : (index.get(part) ?? -1));
  };
  const tri = (a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3, part: PartId | null, kind: MaterialKind) => {
    vert(a, na, part, kind);
    vert(b, nb, part, kind);
    vert(c, nc, part, kind);
  };
  const quad = (a: V3, b: V3, c: V3, d: V3, na: V3, nb: V3, nc: V3, nd: V3, part: PartId | null, kind: MaterialKind) => {
    tri(a, b, c, na, nb, nc, part, kind);
    tri(a, c, d, na, nc, nd, part, kind);
  };

  const NS = XS.length;
  const NK = 30;
  const G: V3[][] = XS.map((x) => {
    const hf = half(x);
    const row: V3[] = [];
    for (let k = 0; k < NK; k++) {
      const j = k <= 15 ? k : NK - k;
      const s = k <= 15 ? 1 : -1;
      const p = hf[j]!;
      row.push([x * cfg.lx, p[0], s * p[1]]);
    }
    return row;
  });
  const g = (i: number, k: number): V3 => G[i]![k]!;

  // Smooth vertex normals from accumulated face normals, oriented outward.
  const N: V3[][] = G.map((r) => r.map((): V3 => [0, 0, 0]));
  const nAt = (i: number, k: number): V3 => N[i]![k]!;
  for (let i = 0; i < NS - 1; i++) {
    for (let k = 0; k < NK; k++) {
      const k1 = (k + 1) % NK;
      const a = g(i, k);
      const b = g(i + 1, k);
      const c = g(i + 1, k1);
      const d = g(i, k1);
      let fn = cross(sub(c, a), sub(d, b));
      const qy = (a[1] + b[1] + c[1] + d[1]) / 4 - 0.9;
      const qz = (a[2] + b[2] + c[2] + d[2]) / 4;
      if (fn[1] * qy + fn[2] * qz < 0) fn = [-fn[0], -fn[1], -fn[2]];
      for (const n of [nAt(i, k), nAt(i + 1, k), nAt(i + 1, k1), nAt(i, k1)]) {
        n[0] += fn[0];
        n[1] += fn[1];
        n[2] += fn[2];
      }
    }
  }
  for (let i = 0; i < NS; i++) for (let k = 0; k < NK; k++) N[i]![k] = norm(nAt(i, k));

  type Q = [PartId | null, KindName];
  const classify = (i: number, k: number): Q => {
    const hi = k < 15 ? k : 29 - k;
    const sd = k < 15 ? 'right' : 'left';
    const xm = (XS[i]! + XS[i + 1]!) / 2;
    if (hi >= 13) return [null, 'under'];
    if (hi <= 4) {
      if (xm > XD1) return ['bonnet', 'body'];
      if (xm > XR) return ['windscreen', hi <= 2 ? 'glass' : 'body'];
      if (xm > XRR || cfg.capGlass) return ['roof', 'body'];
      if (xm < XT) return ['tailgate', 'body'];
      return ['rear-windscreen', hi <= 2 ? 'glass' : 'body'];
    }
    if (hi <= 7) {
      if (xm > XD1) return [`wing-${sd}`, 'body'];
      if (xm < XT || (!cfg.qGlass && xm < XD3)) return [`quarter-${sd}`, 'body'];
      const id = xm > XD2 ? 'front-window-' : xm > XD3 ? 'rear-window-' : 'quarter-window-';
      const pillar = Math.abs(xm - XD2) < 0.06 || Math.abs(xm - XD3) < 0.06;
      const frame = hi === 5 || pillar || xm < XRR || xm > XD1 - 0.15;
      return [id + sd, frame ? 'body' : 'glass'];
    }
    if (hi >= 10 && xm > XB) return ['front-bumper', 'body'];
    if (hi >= 10 && xm < XRB) return ['rear-bumper', 'body'];
    if (xm > XD1) return [`wing-${sd}`, 'body'];
    if (xm > XD2) return [`front-door-${sd}`, 'body'];
    if (xm > XD3) return [`rear-door-${sd}`, 'body'];
    return [`quarter-${sd}`, 'body'];
  };

  const Qg: Q[][] = [];
  for (let i = 0; i < NS - 1; i++) {
    const row: Q[] = [];
    for (let k = 0; k < NK; k++) row.push(classify(i, k));
    Qg.push(row);
  }
  const q = (i: number, k: number): Q => Qg[i]![k]!;
  const key = (x: Q) => `${x[0] ?? ''}|${x[1]}`;
  const edge = (qa: Q, qb: Q, p1: V3, p2: V3, n1: V3, n2: V3) => {
    if (key(qa) === key(qb)) return;
    if (!qa[0] && !qb[0]) return;
    edges.push({ a: qa[0], b: qb[0], p1, p2, n1, n2 });
  };

  for (let i = 0; i < NS - 1; i++) {
    for (let k = 0; k < NK; k++) {
      const k1 = (k + 1) % NK;
      const c = q(i, k);
      quad(g(i, k), g(i + 1, k), g(i + 1, k1), g(i, k1), nAt(i, k), nAt(i + 1, k), nAt(i + 1, k1), nAt(i, k1), c[0], MaterialKind[c[1]]);
      edge(c, q(i, k1), g(i, k1), g(i + 1, k1), nAt(i, k1), nAt(i + 1, k1));
      if (i < NS - 2) edge(c, q(i + 1, k), g(i + 1, k), g(i + 1, k1), nAt(i + 1, k), nAt(i + 1, k1));
    }
  }

  // Front and rear end caps.
  const cap = (i: number, nx: number, upper: PartId, lower: PartId, glassCap = false) => {
    const n: V3 = [nx, 0, 0];
    const capQ = (j: number): Q =>
      glassCap && (j === 6 || j === 7) ? ['rear-windscreen', 'glass'] : [j <= 9 ? upper : lower, 'body'];
    for (let j = 0; j < 15; j++) {
      const cq = capQ(j);
      quad(g(i, j), g(i, j + 1), g(i, (NK - (j + 1)) % NK), g(i, (NK - j) % NK), n, n, n, n, cq[0], MaterialKind[cq[1]]);
    }
    edges.push({ a: upper, b: lower, p1: g(i, 10), p2: g(i, NK - 10), n1: n, n2: n });
    if (glassCap) {
      for (const j of [6, 8]) edges.push({ a: 'rear-windscreen', b: upper, p1: g(i, j), p2: g(i, NK - j), n1: n, n2: n });
    }
    const qi = i === 0 ? 0 : NS - 2;
    for (let k = 0; k < NK; k++) {
      const hi = k < 15 ? k : 29 - k;
      const k1 = (k + 1) % NK;
      edge(capQ(hi), q(qi, k), g(i, k), g(i, k1), nAt(i, k), nAt(i, k1));
    }
  };
  cap(0, 1, 'grille', 'front-bumper');
  cap(NS - 1, -1, 'tailgate', 'rear-bumper', cfg.capGlass);

  // Wheels: tyre tread, sidewall, rim and a spoked hub face.
  const wheel = (id: PartId, x: number, s: number) => {
    const SEG = 24;
    const R = cfg.wr;
    const R2 = R * 0.7;
    const yc = R;
    const zo = s * 0.9;
    const zi = s * 0.6;
    const zr = s * 0.87;
    const nz: V3 = [0, 0, s];
    for (let gIdx = 0; gIdx < SEG; gIdx++) {
      const a0 = (gIdx / SEG) * Math.PI * 2;
      const a1 = ((gIdx + 1) / SEG) * Math.PI * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      const pt = (r: number, c: number, sn: number, z: number): V3 => [x + r * c, yc + r * sn, z];
      const n0: V3 = [c0, s0, 0];
      const n1: V3 = [c1, s1, 0];
      quad(pt(R, c0, s0, zo), pt(R, c1, s1, zo), pt(R, c1, s1, zi), pt(R, c0, s0, zi), n0, n1, n1, n0, id, MaterialKind.tyre);
      quad(pt(R, c0, s0, zo), pt(R, c1, s1, zo), pt(R2, c1, s1, zo), pt(R2, c0, s0, zo), nz, nz, nz, nz, id, MaterialKind.tyre);
      quad(pt(R2, c0, s0, zo), pt(R2, c1, s1, zo), pt(R2, c1, s1, zr), pt(R2, c0, s0, zr), [-c0, -s0, 0], [-c1, -s1, 0], [-c1, -s1, 0], [-c0, -s0, 0], id, MaterialKind.hub2);
      tri([x, yc, zr], pt(R2, c0, s0, zr), pt(R2, c1, s1, zr), nz, nz, nz, id, (gIdx >> 1) % 2 ? MaterialKind.hub2 : MaterialKind.hub);
    }
  };
  const wf = cfg.wxf * cfg.lx;
  const wb = cfg.wxr * cfg.lx;
  wheel('wheel-fr', wf, 1);
  wheel('wheel-rr', wb, 1);
  wheel('wheel-fl', wf, -1);
  wheel('wheel-rl', wb, -1);

  // Part centroids (vertex average) anchor the callout.
  const np = parts.length;
  const centroids = new Float32Array(np * 3);
  const cnt = new Float32Array(np);
  for (let v = 0; v < partIdx.length; v++) {
    const pi = partIdx[v]!;
    if (pi < 0) continue;
    centroids[pi * 3]! += positions[v * 3]!;
    centroids[pi * 3 + 1]! += positions[v * 3 + 1]!;
    centroids[pi * 3 + 2]! += positions[v * 3 + 2]!;
    cnt[pi]!++;
  }
  for (let p = 0; p < np; p++) {
    const c = cnt[p]!;
    if (c) {
      centroids[p * 3]! /= c;
      centroids[p * 3 + 1]! /= c;
      centroids[p * 3 + 2]! /= c;
    }
  }

  return {
    type,
    count: partIdx.length,
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    kinds: new Uint8Array(kinds),
    partIndex: new Int16Array(partIdx),
    edges,
    centroids,
    wheelCutout: [wf, wb, cfg.wr, (cfg.wr + 0.1) * (cfg.wr + 0.1)],
  };
}
