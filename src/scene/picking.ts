import { Raycaster, type Intersection, type Object3D, type Ray } from 'three';
import { MaterialKind, isInWheelCutout, type VehicleGeometry } from '../vehicles/geometry';
import { buildParts, type PartId } from '../vehicles/parts';

/**
 * The part under the pointer: the nearest hit on the vehicle mesh, skipping body surface that
 * the wheel-arch cut-out hides (as the inspiration's hit() does). Returns null when the
 * nearest visible surface is the untagged underside, or nothing is hit.
 */
export function pickPart(
  hits: readonly Intersection[],
  mesh: Object3D,
  g: VehicleGeometry,
): PartId | null {
  for (const hit of hits) {
    if (hit.object !== mesh || !hit.face) continue;
    // face.a is the first corner's vertex index. Don't use faceIndex * 3: a BVH (three-mesh-bvh)
    // reorders triangles in the index buffer, so triangle order no longer matches vertex order.
    const v = hit.face.a;
    const kind = g.kinds[v];
    if (
      (kind === MaterialKind.body || kind === MaterialKind.under) &&
      isInWheelCutout(hit.point.x, hit.point.y, hit.point.z, g.wheelCutout)
    ) {
      continue;
    }
    const pi = g.partIndex[v] ?? -1;
    return pi >= 0 ? (buildParts(g.type)[pi]?.id ?? null) : null;
  }
  return null;
}

const raycaster = new Raycaster();

/**
 * Pick along a pointer ray, using every hit on the mesh. React Three Fiber keeps only the
 * nearest hit per object, which is not enough when that hit is cut away by a wheel arch.
 */
export function pickAlongRay(ray: Ray, mesh: Object3D, g: VehicleGeometry): PartId | null {
  raycaster.ray.copy(ray);
  return pickPart(raycaster.intersectObject(mesh, false), mesh, g);
}
