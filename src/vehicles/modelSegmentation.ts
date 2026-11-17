// Splits a real vehicle model (public/models/*.glb) into the inspection parts of its body style.
// Each triangle is assigned by a per-vehicle classifier from where it sits, which way it faces
// and, when the source had them, its OBJ group and material ("<group>|<material>" tags).
// Landmarks are measured from each model after scripts/build-model.mjs. Pure: no React and no
// three.js.
//
// App space: +X = front, +Y = up, +Z = the vehicle's right side; wheels on y = 0.
import type { VehicleTypeId } from './catalog';
import { MaterialKind, type Edge, type V3, type VehicleGeometry, type WheelCutout } from './geometry';
import { buildParts, partIndexById, type PartId } from './parts';

/** A loaded model: welded positions, triangle indices, and a tag per triangle. */
export interface ModelMesh {
  positions: Float32Array;
  indices: ArrayLike<number>;
  /** Index into `tags` per triangle. */
  faceTags: Uint8Array;
  /** "<group>|<material>" names from the source model ("Body|" when it had none). */
  tags: readonly string[];
}

export type FaceClassifier = (c: V3, n: V3, tag: string) => [PartId | null, MaterialKind];

/** Landmarks measured from the BMW X1 (F48) model after scripts/build-model.mjs. */
export const SUV_LANDMARKS = {
  wheelX: 1.3,
  wheelY: 0.36,
  tyreRadius: 0.37,
  rimRadius: 0.25,
  /** Wheels sit inboard of the body side; anything outside this |z| near an axle is body. */
  wheelInnerZ: 0.6,
  /** Shut line between wing and front door, between the doors, and behind the rear door. */
  frontDoorX: 0.62,
  bPillarX: -0.12,
  rearDoorX: -1.06,
  /** Window band on the sides. */
  beltY: 1.18,
  windowTopY: 1.62,
  /** Split of the side glass: front | rear | quarter window. */
  rearWindowX: -0.15,
  quarterWindowX: -0.95,
  quarterWindowRearX: -1.65,
  /** Top surfaces: bonnet → windscreen → roof → rear screen. The glass starts above the cowl. */
  windscreenBaseX: 0.95,
  windscreenBaseY: 1.22,
  windscreenHalfWidth: 0.8,
  roofFrontX: 0.45,
  roofRearX: -1.75,
  roofY: 1.5,
  /** Ends of the car. */
  frontFaceX: 1.6,
  frontBumperTopY: 0.62,
  rearFaceX: -1.6,
  rearBumperTopY: 0.75,
  /** Mirrors stick out past the body side, just ahead of the front window. */
  mirrorZ: 0.92,
} as const;

type Classified = [PartId | null, MaterialKind];

/** BMW X1: one untagged shell, so position and facing decide everything. */
export function classifySuvFace(c: V3, n: V3): Classified {
  const L = SUV_LANDMARKS;
  const [x, y, z] = c;
  const side = z >= 0 ? 'right' : 'left';
  const az = Math.abs(z);

  // Wheels: inside the tyre radius around either axle, and inboard of the body skin.
  for (const [wx, front] of [
    [L.wheelX, true],
    [-L.wheelX, false],
  ] as const) {
    const r = Math.hypot(x - wx, y - L.wheelY);
    if (r < L.tyreRadius && az > L.wheelInnerZ && az < 1.02) {
      const id = `wheel-${front ? 'f' : 'r'}${side === 'right' ? 'r' : 'l'}`;
      return [id, r < L.rimRadius ? MaterialKind.hub : MaterialKind.tyre];
    }
  }

  // Underside: faces pointing down, low on the car.
  if (n[1] < -0.6 && y < 0.55) return [null, MaterialKind.under];

  // Mirrors belong to the front doors.
  if (az > L.mirrorZ && y > 1.1 && y < 1.5 && x > 0.3 && x < 0.95) {
    return [`front-door-${side}`, MaterialKind.body];
  }

  // Front end.
  if (x > L.frontFaceX && n[0] > 0.35 && az < 0.95) {
    if (y < L.frontBumperTopY) return ['front-bumper', MaterialKind.body];
    if (y < 1.0) return ['grille', MaterialKind.hub2];
  }
  if (x > 1.85 && y < L.frontBumperTopY) return ['front-bumper', MaterialKind.body];

  // Rear end.
  if (x < L.rearFaceX && n[0] < -0.35 && az < 0.95) {
    if (y < L.rearBumperTopY) return ['rear-bumper', MaterialKind.body];
    if (y < 1.3) return ['tailgate', MaterialKind.body];
    return ['rear-windscreen', MaterialKind.glass];
  }
  if (x < -1.85 && y < L.rearBumperTopY) return ['rear-bumper', MaterialKind.body];

  // Top surfaces (facing mostly up or forward/back, not sideways).
  const sideways = Math.abs(n[2]) > 0.55;
  if (!sideways && y > 0.9) {
    // The tops of the front wings sit outboard of the bonnet's edge.
    if (x > L.roofFrontX && y <= L.windscreenBaseY && az < 0.88) return ['bonnet', MaterialKind.body];
    if (x > L.roofFrontX && az < L.windscreenHalfWidth) return ['windscreen', MaterialKind.glass];
    if (y > L.roofY && x > L.roofRearX) return ['roof', MaterialKind.body];
    if (x <= L.roofRearX && y > 1.25) return ['rear-windscreen', MaterialKind.glass];
  }

  // Sides: window band above the belt line, panels below it.
  if (y > L.beltY && y < L.windowTopY) {
    if (x > L.frontDoorX) return [`wing-${side}`, MaterialKind.body];
    if (x > L.rearWindowX) return [`front-window-${side}`, MaterialKind.glass];
    if (x > L.quarterWindowX) return [`rear-window-${side}`, MaterialKind.glass];
    if (x > L.quarterWindowRearX) return [`quarter-window-${side}`, MaterialKind.glass];
    return [`quarter-${side}`, MaterialKind.body];
  }
  if (y >= L.windowTopY) {
    // Roof rails and the top of the side frames.
    if (x > L.roofFrontX) return ['windscreen', MaterialKind.glass];
    if (x > L.roofRearX) return ['roof', MaterialKind.body];
    return ['rear-windscreen', MaterialKind.glass];
  }
  if (x > L.frontDoorX) return [`wing-${side}`, MaterialKind.body];
  if (x > L.bPillarX) return [`front-door-${side}`, MaterialKind.body];
  if (x > L.rearDoorX) return [`rear-door-${side}`, MaterialKind.body];
  return [`quarter-${side}`, MaterialKind.body];
}

/**
 * Landmarks for the van model (Van Car 1, OBJ), in app units after build-model.mjs with
 * length 4.7. Its OBJ groups give the wheels and front doors; its materials give the glass.
 */
export const VAN_LANDMARKS = {
  wheelX: 1.54,
  wheelY: 0.29,
  rimRadius: 0.17,
  /** Front doors span x 0.48–1.36; the sliding door runs from there back to slidingRearX. */
  frontDoorRearX: 0.48,
  wingRearX: 1.2,
  slidingRearX: -0.75,
  /** Side window band (front door glass sits between these heights). */
  beltY: 1.0,
  windowTopY: 1.62,
  /** Front and rear faces. */
  frontFaceX: 2.05,
  frontBumperTopY: 0.55,
  bonnetTopY: 1.12,
  rearFaceX: -2.2,
  rearBumperTopY: 0.55,
  rearGlassY: 1.35,
  roofY: 1.62,
} as const;

const WHEEL_GROUPS: Readonly<Record<string, PartId>> = {
  Wheel_FL: 'wheel-fl',
  Wheel_FR: 'wheel-fr',
  Wheel_BL: 'wheel-rl',
  Wheel_BR: 'wheel-rr',
};

/** Van: groups and materials first, then position for the one-piece body shell. */
export function classifyVanFace(c: V3, n: V3, tag: string): Classified {
  const L = VAN_LANDMARKS;
  const [x, y, z] = c;
  const [group, material = ''] = tag.split('|');
  const side = z >= 0 ? 'right' : 'left';

  const wheel = WHEEL_GROUPS[group ?? ''];
  if (wheel) {
    const r = Math.hypot(Math.abs(x) - L.wheelX, y - L.wheelY);
    return [wheel, r < L.rimRadius ? MaterialKind.hub : MaterialKind.tyre];
  }
  if (group === 'Door_FL' || group === 'Door_FR') {
    const doorSide = group === 'Door_FL' ? 'left' : 'right';
    if (material.startsWith('Glass')) return [`front-window-${doorSide}`, MaterialKind.glass];
    return [`front-door-${doorSide}`, MaterialKind.body];
  }
  if (group === 'Steer' || material === 'Texture_inside') return [null, MaterialKind.under];
  if (material === 'Glass_') return ['windscreen', MaterialKind.glass];
  if (material === 'Glass_Light') return [x > 0 ? 'grille' : 'tailgate', MaterialKind.glass];

  // The body shell.
  if (n[1] < -0.6 && y < 0.5) return [null, MaterialKind.under];
  if (x > L.frontFaceX && n[0] > 0.3) {
    if (y < L.frontBumperTopY) return ['front-bumper', MaterialKind.body];
    if (y < L.bonnetTopY) return ['grille', MaterialKind.hub2];
  }
  if (x > L.frontFaceX && y < L.frontBumperTopY) return ['front-bumper', MaterialKind.body];
  if (x < L.rearFaceX && n[0] < -0.3) {
    if (y < L.rearBumperTopY) return ['rear-bumper', MaterialKind.body];
    if (y > L.rearGlassY) return ['rear-windscreen', MaterialKind.body];
    return ['tailgate', MaterialKind.body];
  }
  if (x < L.rearFaceX && y < L.rearBumperTopY) return ['rear-bumper', MaterialKind.body];

  const sideways = Math.abs(n[2]) > 0.55;
  if (!sideways && n[1] > 0.3) {
    if (y > L.roofY) return ['roof', MaterialKind.body];
    if (x > L.wingRearX && y > 0.9) return ['bonnet', MaterialKind.body];
  }
  if (y >= L.windowTopY) return ['roof', MaterialKind.body];

  if (x > L.wingRearX) return [`wing-${side}`, MaterialKind.body];
  if (x > L.frontDoorRearX) return [`front-door-${side}`, MaterialKind.body];
  const upper = y > L.beltY;
  if (x > L.slidingRearX) return [upper ? `rear-window-${side}` : `rear-door-${side}`, MaterialKind.body];
  return [upper ? `quarter-window-${side}` : `quarter-${side}`, MaterialKind.body];
}

/**
 * Split triangles until no edge is longer than `maxEdge`, by repeatedly bisecting the longest
 * edge. Low-poly models have panels made of a few huge triangles; without this, part
 * boundaries would follow those triangles' diagonals instead of the measured lines. Midpoints
 * are shared per edge, so neighbouring triangles stay joined.
 */
export function subdivideLongEdges(model: ModelMesh, maxEdge: number): ModelMesh {
  const pos: number[] = Array.from(model.positions);
  const out: number[] = [];
  const outTags: number[] = [];
  const mids = new Map<string, number>();
  const max2 = maxEdge * maxEdge;
  const d2 = (a: number, b: number) =>
    (pos[a * 3]! - pos[b * 3]!) ** 2 + (pos[a * 3 + 1]! - pos[b * 3 + 1]!) ** 2 + (pos[a * 3 + 2]! - pos[b * 3 + 2]!) ** 2;
  const mid = (a: number, b: number) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    let m = mids.get(key);
    if (m === undefined) {
      m = pos.length / 3;
      pos.push((pos[a * 3]! + pos[b * 3]!) / 2, (pos[a * 3 + 1]! + pos[b * 3 + 1]!) / 2, (pos[a * 3 + 2]! + pos[b * 3 + 2]!) / 2);
      mids.set(key, m);
    }
    return m;
  };
  const stack: [number, number, number, number][] = [];
  for (let t = 0; t < model.indices.length / 3; t++) {
    stack.push([model.indices[t * 3]!, model.indices[t * 3 + 1]!, model.indices[t * 3 + 2]!, model.faceTags[t]!]);
    while (stack.length) {
      const [a, b, c, tag] = stack.pop()!;
      const ab = d2(a, b);
      const bc = d2(b, c);
      const ca = d2(c, a);
      const longest = Math.max(ab, bc, ca);
      if (longest <= max2) {
        out.push(a, b, c);
        outTags.push(tag);
      } else if (longest === ab) {
        const m = mid(a, b);
        stack.push([a, m, c, tag], [m, b, c, tag]);
      } else if (longest === bc) {
        const m = mid(b, c);
        stack.push([a, b, m, tag], [a, m, c, tag]);
      } else {
        const m = mid(c, a);
        stack.push([a, b, m, tag], [m, b, c, tag]);
      }
    }
  }
  return {
    positions: new Float32Array(pos),
    indices: Uint32Array.from(out),
    faceTags: Uint8Array.from(outTags),
    tags: model.tags,
  };
}

/** Longest triangle edge allowed before classifying, per model (see subdivideLongEdges). */
const MAX_EDGE: Partial<Record<VehicleTypeId, number>> = { saloon: 0.07, van: 0.05 };

/**
 * Landmarks for the saloon model (Mercedes-Benz W222, GLB), in app units after build-model.mjs
 * with length 5.0. Wheels are separate objects; glass comes from the "Glass" materials.
 */
export const SALOON_LANDMARKS = {
  frontDoorX: 1.03,
  bPillarX: -0.12,
  rearDoorX: -1.2,
  beltY: 0.96,
  roofY: 1.3,
  windscreenRearX: 0.3,
  bonnetRearX: 1.15,
  rearScreenRearX: -1.85,
  frontFaceX: 2.2,
  frontBumperTopY: 0.55,
  rearFaceX: -2.25,
  rearBumperTopY: 0.5,
  glassHalfWidth: 0.75,
} as const;

const W222_WHEELS: Readonly<Record<string, PartId>> = {
  'Ft.L': 'wheel-fl',
  'Ft.R': 'wheel-fr',
  'Bk.L': 'wheel-rl',
  'Bk.R': 'wheel-rr',
};

/** Saloon: named wheel objects and glass materials first, then position for the body shell. */
export function classifySaloonFace(c: V3, n: V3, tag: string): Classified {
  const L = SALOON_LANDMARKS;
  const [x, y, z] = c;
  const [group = '', material = ''] = tag.split('|');
  const side = z >= 0 ? 'right' : 'left';
  const az = Math.abs(z);

  const wheelKey = /(?:Wheel|Brake)\.(\w+\.\w)$/.exec(group)?.[1];
  const wheel = wheelKey ? W222_WHEELS[wheelKey] : undefined;
  if (wheel) {
    if (/Wheel$/.test(material)) return [wheel, MaterialKind.tyre];
    return [wheel, /Rims|Chrome/.test(material) ? MaterialKind.hub : MaterialKind.hub2];
  }

  if (/Glass/.test(material)) {
    if (x > 1.8 && y < 0.95) return ['grille', MaterialKind.glass]; // headlights
    const facingSide = Math.abs(n[2]) > 0.5 || az > L.glassHalfWidth;
    if (!facingSide && x > 0) return ['windscreen', MaterialKind.glass];
    if (!facingSide) return ['rear-windscreen', MaterialKind.glass];
    return [x > L.bPillarX ? `front-window-${side}` : `rear-window-${side}`, MaterialKind.glass];
  }

  if (n[1] < -0.6 && y < 0.45) return [null, MaterialKind.under];
  if (az > 0.88 && y > 0.95 && x > 0.4 && x < 0.9) return [`front-door-${side}`, MaterialKind.body];

  if (x > L.frontFaceX && n[0] > 0.3 && az < 0.85) {
    return y < L.frontBumperTopY ? ['front-bumper', MaterialKind.body] : ['grille', MaterialKind.hub2];
  }
  if (x > 2.35 && y < L.frontBumperTopY) return ['front-bumper', MaterialKind.body];
  if (x < L.rearFaceX && n[0] < -0.3 && az < 0.85) {
    return y < L.rearBumperTopY ? ['rear-bumper', MaterialKind.body] : ['tailgate', MaterialKind.body];
  }
  if (x < -2.4 && y < L.rearBumperTopY) return ['rear-bumper', MaterialKind.body];

  const sideways = Math.abs(n[2]) > 0.55;
  if (!sideways && y > 0.75 && az < 0.85) {
    if (x > L.bonnetRearX) return ['bonnet', MaterialKind.body];
    if (x > L.windscreenRearX && y < L.roofY) return ['windscreen', MaterialKind.body];
    if (y >= L.roofY && x > L.rearDoorX) return ['roof', MaterialKind.body];
    if (x > L.rearScreenRearX) return ['rear-windscreen', MaterialKind.body];
    return ['tailgate', MaterialKind.body];
  }
  if (y >= L.roofY) return ['roof', MaterialKind.body];

  if (x > L.frontDoorX) return [`wing-${side}`, MaterialKind.body];
  if (x > L.bPillarX) return [`front-door-${side}`, MaterialKind.body];
  if (x > L.rearDoorX) return [`rear-door-${side}`, MaterialKind.body];
  return [`quarter-${side}`, MaterialKind.body];
}

/** Body styles with a real model, and how to split it into parts. */
export const CLASSIFIERS: Partial<Record<VehicleTypeId, FaceClassifier>> = {
  suv: classifySuvFace,
  saloon: classifySaloonFace,
  van: classifyVanFace,
};

const NO_CUTOUT: WheelCutout = [0, 0, 0, 0];
/** Faces meeting at a sharper angle than this keep separate normals (crisp panel edges). */
const CREASE_COS = Math.cos((40 * Math.PI) / 180);

/**
 * Turn the welded model mesh into the same VehicleGeometry the procedural cars produce:
 * de-indexed triangles with a part and material per vertex, crease-aware smooth normals,
 * part-boundary edges for the selection outline, and per-part centroids.
 */
export function segmentModel(type: VehicleTypeId, model: ModelMesh): VehicleGeometry {
  const classify = CLASSIFIERS[type];
  if (!classify) throw new Error(`No model classifier for ${type}`);
  const maxEdge = MAX_EDGE[type];
  const { positions, indices, faceTags, tags } = maxEdge ? subdivideLongEdges(model, maxEdge) : model;
  const parts = buildParts(type);
  const index = partIndexById(type);
  const triCount = indices.length / 3;
  const vertCount = positions.length / 3;
  const P = (v: number): V3 => [positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!];

  // Face normals, areas and classification.
  const fn = new Float32Array(triCount * 3);
  const area = new Float32Array(triCount);
  const facePart = new Int16Array(triCount);
  const faceKind = new Uint8Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = P(indices[t * 3]!);
    const b = P(indices[t * 3 + 1]!);
    const c = P(indices[t * 3 + 2]!);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    area[t] = len / 2;
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }
    fn[t * 3] = nx;
    fn[t * 3 + 1] = ny;
    fn[t * 3 + 2] = nz;
    const centre: V3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const [part, kind] = classify(centre, [nx, ny, nz], tags[faceTags[t]!] ?? 'Body|');
    facePart[t] = part === null ? -1 : (index.get(part) ?? -1);
    faceKind[t] = kind;
  }

  // Vertex → faces incidence (CSR), for smooth normals and edge lookup.
  const deg = new Uint32Array(vertCount + 1);
  for (let i = 0; i < indices.length; i++) deg[indices[i]! + 1]!++;
  for (let v = 0; v < vertCount; v++) deg[v + 1]! += deg[v]!;
  const fill = deg.slice(0, vertCount);
  const incident = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) incident[fill[indices[i]!]!++] = Math.floor(i / 3);

  const count = triCount * 3;
  const outPos = new Float32Array(count * 3);
  const outNrm = new Float32Array(count * 3);
  const kinds = new Uint8Array(count);
  const partIndex = new Int16Array(count);

  const cornerNormal = (t: number, v: number): V3 => {
    let sx = 0, sy = 0, sz = 0;
    for (let k = deg[v]!; k < deg[v + 1]!; k++) {
      const f = incident[k]!;
      const dot = fn[f * 3]! * fn[t * 3]! + fn[f * 3 + 1]! * fn[t * 3 + 1]! + fn[f * 3 + 2]! * fn[t * 3 + 2]!;
      if (dot < CREASE_COS) continue;
      const w = area[f]!;
      sx += fn[f * 3]! * w;
      sy += fn[f * 3 + 1]! * w;
      sz += fn[f * 3 + 2]! * w;
    }
    const l = Math.hypot(sx, sy, sz);
    return l > 0 ? [sx / l, sy / l, sz / l] : [fn[t * 3]!, fn[t * 3 + 1]!, fn[t * 3 + 2]!];
  };

  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const v = indices[t * 3 + k]!;
      const o = t * 3 + k;
      outPos[o * 3] = positions[v * 3]!;
      outPos[o * 3 + 1] = positions[v * 3 + 1]!;
      outPos[o * 3 + 2] = positions[v * 3 + 2]!;
      const n = cornerNormal(t, v);
      outNrm[o * 3] = n[0];
      outNrm[o * 3 + 1] = n[1];
      outNrm[o * 3 + 2] = n[2];
      kinds[o] = faceKind[t]!;
      partIndex[o] = facePart[t]!;
    }
  }

  // Part boundaries: mesh edges whose two faces belong to different parts.
  const edges: Edge[] = [];
  const firstFace = new Map<number, number>();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const a = indices[t * 3 + k]!;
      const b = indices[t * 3 + ((k + 1) % 3)]!;
      const key = a < b ? a * vertCount + b : b * vertCount + a;
      const other = firstFace.get(key);
      if (other === undefined) {
        firstFace.set(key, t);
        continue;
      }
      const pa = facePart[t]!;
      const pb = facePart[other]!;
      if (pa === pb || (pa < 0 && pb < 0)) continue;
      const n = new Float32Array([
        fn[t * 3]! + fn[other * 3]!,
        fn[t * 3 + 1]! + fn[other * 3 + 1]!,
        fn[t * 3 + 2]! + fn[other * 3 + 2]!,
      ]);
      const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
      const nn: V3 = [n[0]! / l, n[1]! / l, n[2]! / l];
      edges.push({
        a: pa >= 0 ? parts[pa]!.id : null,
        b: pb >= 0 ? parts[pb]!.id : null,
        p1: P(a),
        p2: P(b),
        n1: nn,
        n2: nn,
      });
    }
  }

  // Part anchors for the callout and for taps: a point on the part's main outer face. A plain
  // average of a curved panel can sit inside the car, and mirrors or inner surfaces can drag
  // it off the panel, so use only the triangles facing the part's dominant direction.
  const meanN = new Float64Array(parts.length * 3);
  for (let t = 0; t < triCount; t++) {
    const p = facePart[t]!;
    if (p < 0) continue;
    for (let a = 0; a < 3; a++) meanN[p * 3 + a]! += fn[t * 3 + a]! * area[t]!;
  }
  for (let p = 0; p < parts.length; p++) {
    const id = parts[p]!.id;
    if (id.startsWith('wheel-')) {
      // Inner and outer faces of a wheel cancel out; anchor on the outer (hub) face.
      meanN.set([0, 0, id.endsWith('r') ? 1 : -1], p * 3);
      continue;
    }
    const l = Math.hypot(meanN[p * 3]!, meanN[p * 3 + 1]!, meanN[p * 3 + 2]!) || 1;
    for (let a = 0; a < 3; a++) meanN[p * 3 + a]! /= l;
  }
  const faces = (t: number): V3 => {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) {
      const v = indices[t * 3 + k]!;
      cx += positions[v * 3]! / 3;
      cy += positions[v * 3 + 1]! / 3;
      cz += positions[v * 3 + 2]! / 3;
    }
    return [cx, cy, cz];
  };
  // Wheels: only the outermost ring (tyre sidewall and rim lip). The hub sits recessed behind
  // open spokes, where a tap would pass through into the wheel well.
  const outerZ = new Float32Array(parts.length);
  for (let t = 0; t < triCount; t++) {
    const p = facePart[t]!;
    if (p >= 0) outerZ[p] = Math.max(outerZ[p]!, Math.abs(faces(t)[2]));
  }
  const isWheel = parts.map((part) => part.id.startsWith('wheel-'));
  const facing = (t: number, p: number) =>
    fn[t * 3]! * meanN[p * 3]! + fn[t * 3 + 1]! * meanN[p * 3 + 1]! + fn[t * 3 + 2]! * meanN[p * 3 + 2]! > 0.7 &&
    (!isWheel[p] || Math.abs(faces(t)[2]) > outerZ[p]! - 0.04);

  const centroids = new Float32Array(parts.length * 3);
  const weight = new Float64Array(parts.length);
  for (let t = 0; t < triCount; t++) {
    const p = facePart[t]!;
    if (p < 0 || !facing(t, p)) continue;
    const c = faces(t);
    const w = area[t]!;
    for (let a = 0; a < 3; a++) centroids[p * 3 + a]! += c[a]! * w;
    weight[p]! += w;
  }
  for (let p = 0; p < parts.length; p++) {
    const w = weight[p]!;
    if (w > 0) for (let a = 0; a < 3; a++) centroids[p * 3 + a]! /= w;
  }
  // Snap onto the nearest dominant-facing triangle so the anchor lies on the surface.
  const best = new Float64Array(parts.length).fill(Infinity);
  const snapped = new Float32Array(centroids);
  for (let t = 0; t < triCount; t++) {
    const p = facePart[t]!;
    if (p < 0 || !facing(t, p)) continue;
    const c = faces(t);
    const d = (c[0] - centroids[p * 3]!) ** 2 + (c[1] - centroids[p * 3 + 1]!) ** 2 + (c[2] - centroids[p * 3 + 2]!) ** 2;
    if (d < best[p]!) {
      best[p] = d;
      snapped.set(c, p * 3);
    }
  }
  centroids.set(snapped);

  return {
    type,
    count,
    positions: outPos,
    normals: outNrm,
    kinds,
    partIndex,
    edges,
    centroids,
    wheelCutout: NO_CUTOUT,
  };
}
