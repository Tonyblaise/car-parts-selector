// Real 3D models for body styles that have one (public/models/*.glb, built by
// scripts/build-model.mjs). Other body styles keep the procedural geometry.
import { suspend } from 'suspend-react';
import type { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { VehicleTypeId } from '../vehicles/catalog';
import { buildGeometry, type VehicleGeometry } from '../vehicles/geometry';
import { segmentModel, type ModelMesh } from '../vehicles/modelSegmentation';

export const MODEL_URLS: Partial<Record<VehicleTypeId, string>> = {
  suv: `${import.meta.env.BASE_URL}models/suv.glb`,
  saloon: `${import.meta.env.BASE_URL}models/saloon.glb`,
  van: `${import.meta.env.BASE_URL}models/van.glb`,
};

export const hasRealModel = (type: VehicleTypeId): boolean => type in MODEL_URLS;

/**
 * Merge the model's primitives into one welded mesh, tagging each triangle with its source
 * "<group>|<material>" name (the glTF material name written by build-model.mjs).
 */
function collect(meshes: Mesh[]): ModelMesh {
  const tags: string[] = [];
  let vertCount = 0;
  let triCount = 0;
  for (const m of meshes) {
    vertCount += m.geometry.getAttribute('position').count;
    triCount += (m.geometry.getIndex()?.count ?? 0) / 3;
  }
  const positions = new Float32Array(vertCount * 3);
  const indices = new Uint32Array(triCount * 3);
  const faceTags = new Uint8Array(triCount);
  let vBase = 0;
  let tBase = 0;
  for (const m of meshes) {
    const material = Array.isArray(m.material) ? m.material[0] : m.material;
    const tag = material?.name || 'Body|';
    let tagId = tags.indexOf(tag);
    if (tagId < 0) tagId = tags.push(tag) - 1;
    const pos = m.geometry.getAttribute('position');
    const index = m.geometry.getIndex();
    if (!index) throw new Error('Model mesh is not indexed');
    // Positions are quantized (KHR_mesh_quantization); getX/Y/Z de-normalise, and the node
    // transform carries the real scale and offset.
    const e = m.matrixWorld.elements;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      for (let r = 0; r < 3; r++) {
        positions[(vBase + i) * 3 + r] = e[r]! * x + e[4 + r]! * y + e[8 + r]! * z + e[12 + r]!;
      }
    }
    for (let i = 0; i < index.count; i++) indices[tBase * 3 + i] = vBase + index.getX(i);
    faceTags.fill(tagId, tBase, tBase + index.count / 3);
    vBase += pos.count;
    tBase += index.count / 3;
    m.geometry.dispose();
  }
  return { positions, indices, faceTags, tags };
}

async function loadModelGeometry(type: VehicleTypeId, url: string): Promise<VehicleGeometry> {
  try {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
    gltf.scene.updateMatrixWorld(true);
    const meshes: Mesh[] = [];
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });
    if (!meshes.length) throw new Error('No mesh in model');
    return segmentModel(type, collect(meshes));
  } catch (error) {
    // Keep the app usable: fall back to the drawn version of this body style.
    console.warn(`Could not load the ${type} model; using the drawn version.`, error);
    return buildGeometry(type);
  }
}

/** The geometry for a body style: its real model (suspends while loading) or the drawn one. */
export function useVehicleGeometry(type: VehicleTypeId): VehicleGeometry {
  const url = MODEL_URLS[type];
  // suspend() is not a hook, so calling it conditionally is fine.
  return url ? suspend(() => loadModelGeometry(type, url), ['vehicle-model', type, url]) : buildGeometry(type);
}
