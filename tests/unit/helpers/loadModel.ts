import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import type { ModelMesh } from '../../../src/vehicles/modelSegmentation';

/** Read a public/models/*.glb in Node, the same way the app's loader does. */
export async function loadModel(path: string): Promise<ModelMesh> {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(path);
  const node = doc.getRoot().listNodes().find((n) => n.getMesh())!;
  const m = node.getWorldMatrix();
  const positions: number[] = [];
  const indices: number[] = [];
  const faceTags: number[] = [];
  const tags: string[] = [];
  const e: number[] = [];
  for (const prim of node.getMesh()!.listPrimitives()) {
    const tag = prim.getMaterial()?.getName() || 'Body|';
    let tagId = tags.indexOf(tag);
    if (tagId < 0) tagId = tags.push(tag) - 1;
    const base = positions.length / 3;
    const pos = prim.getAttribute('POSITION')!;
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, e);
      for (let r = 0; r < 3; r++) positions.push(m[r]! * e[0]! + m[4 + r]! * e[1]! + m[8 + r]! * e[2]! + m[12 + r]!);
    }
    const idx = prim.getIndices()!.getArray()!;
    for (let i = 0; i < idx.length; i++) indices.push(base + idx[i]!);
    for (let t = 0; t < idx.length / 3; t++) faceTags.push(tagId);
  }
  return {
    positions: new Float32Array(positions),
    indices: Uint32Array.from(indices),
    faceTags: Uint8Array.from(faceTags),
    tags,
  };
}

export const loadSuvModel = () => loadModel('public/models/suv.glb');
export const loadVanModel = () => loadModel('public/models/van.glb');
