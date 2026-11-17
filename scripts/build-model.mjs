// Converts a source model (binary STL, OBJ or GLB) into the app's compressed GLB (constitution
// Principle V: glTF/GLB, Meshopt-compressed, ≤ 5 MB). Re-run whenever a source model changes:
//
//   node scripts/build-model.mjs <model.stl|model.obj|model.glb> <out.glb> [targetTriangles] [length]
//
//   SUV: node scripts/build-model.mjs ~/Downloads/bmwx1f48.stl public/models/suv.glb 150000 4.5
//   Van: node scripts/build-model.mjs "$HOME/Downloads/Van_Car_1/Van Car 1/Van Car 1.obj" public/models/van.glb 150000 4.7
//   Saloon: node scripts/build-model.mjs ~/Downloads/ImageToStl.com_MB.W222.AMG.glb public/models/saloon.glb 150000 5.0
//
// Sources are Y-up with the vehicle's front at +Z and its right side at −X. The app uses
// +X = front, +Y = up, +Z = the vehicle's right side, wheels on y = 0, centred on the origin,
// `length` units long.
//
// OBJ groups (or glTF node names) and materials are kept: each output primitive's material is
// named "<group>|<material>", which src/vehicles/modelSegmentation.ts uses as part hints. Textures
// are not used (the app paints and tints the car itself).
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, output, targetArg = '150000', lengthArg = '4.5'] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/build-model.mjs <model.stl|model.obj> <out.glb> [targetTriangles] [length]');
  process.exit(1);
}

/** Triangle corner coordinates (9 numbers per triangle), grouped by tag. */
function readStl(path) {
  const buf = readFileSync(path);
  const n = buf.readUInt32LE(80);
  if (buf.length !== 84 + n * 50) throw new Error('Not a binary STL (size mismatch)');
  const corners = [];
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 9; k++) corners.push(buf.readFloatLE(84 + t * 50 + 12 + k * 4));
  }
  return { tags: ['Body|'], tris: new Map([[0, corners]]) };
}

function readObj(path) {
  const verts = [];
  const tags = [];
  const tris = new Map();
  let group = 'Body';
  let material = '';
  const tagIndex = () => {
    const tag = `${group}|${material}`;
    let i = tags.indexOf(tag);
    if (i < 0) {
      i = tags.push(tag) - 1;
      tris.set(i, []);
    }
    return i;
  };
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const p = raw.trim().split(/\s+/);
    if (p[0] === 'v') verts.push([Number(p[1]), Number(p[2]), Number(p[3])]);
    else if (p[0] === 'g' || p[0] === 'o') group = p.slice(1).join('_') || 'Body';
    else if (p[0] === 'usemtl') material = p[1] ?? '';
    else if (p[0] === 'f') {
      const ids = p.slice(1).map((s) => {
        const i = parseInt(s.split('/')[0], 10);
        return i > 0 ? i - 1 : verts.length + i;
      });
      const list = tris.get(tagIndex());
      for (let k = 1; k + 1 < ids.length; k++) {
        for (const id of [ids[0], ids[k], ids[k + 1]]) list.push(...verts[id]);
      }
    }
  }
  return { tags, tris };
}

async function readGlb(path) {
  const { MeshoptDecoder } = await import('meshoptimizer');
  await MeshoptDecoder.ready;
  const doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
    .read(path);
  const tags = [];
  const tris = new Map();
  const e = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // triangles only
      const tag = `${node.getName() || 'Body'}|${prim.getMaterial()?.getName() ?? ''}`;
      let i = tags.indexOf(tag);
      if (i < 0) {
        i = tags.push(tag) - 1;
        tris.set(i, []);
      }
      const list = tris.get(i);
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices()?.getArray() ?? Array.from({ length: pos.getCount() }, (_, k) => k);
      for (const v of idx) {
        pos.getElement(v, e);
        for (let r = 0; r < 3; r++) list.push(m[r] * e[0] + m[4 + r] * e[1] + m[8 + r] * e[2] + m[12 + r]);
      }
    }
  }
  return { tags, tris };
}

const ext = extname(input).toLowerCase();
const { tags, tris } = ext === '.obj' ? readObj(input) : ext === '.glb' ? await readGlb(input) : readStl(input);
const triCount = [...tris.values()].reduce((n, c) => n + c.length / 9, 0);

// ---- Re-orient and scale into app space ---------------------------------------------------
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const corners of tris.values()) {
  for (let i = 0; i < corners.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], corners[i + a]);
      max[a] = Math.max(max[a], corners[i + a]);
    }
  }
}
const scale = Number(lengthArg) / (max[2] - min[2]);
const midX = (min[0] + max[0]) / 2;
const midZ = (min[2] + max[2]) / 2;
const toApp = (x, y, z) => [(z - midZ) * scale, (y - min[1]) * scale, -(x - midX) * scale];

// ---- One welded, indexed primitive per tag --------------------------------------------------
const doc = new Document();
const buffer = doc.createBuffer();
const mesh = doc.createMesh('vehicle');
for (const [tagId, corners] of tris) {
  if (!corners.length) continue;
  const ids = new Map();
  const welded = [];
  const indices = new Uint32Array(corners.length / 3);
  for (let v = 0; v < indices.length; v++) {
    const [x, y, z] = toApp(corners[v * 3], corners[v * 3 + 1], corners[v * 3 + 2]);
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = welded.length / 3;
      ids.set(key, id);
      welded.push(x, y, z);
    }
    indices[v] = id;
  }
  mesh.addPrimitive(
    doc
      .createPrimitive()
      .setMaterial(doc.createMaterial(tags[tagId]))
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(welded)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer)),
  );
}
doc.createScene().addChild(doc.createNode('vehicle').setMesh(mesh));

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const ratio = Math.min(1, Number(targetArg) / triCount);
await doc.transform(
  ...(ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 })] : []),
  // No normals step: it un-indexes the mesh. The app computes smooth normals on load.
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
});
await io.write(output, doc);

const outTris = mesh.listPrimitives().reduce((n, p) => n + p.getIndices().getCount() / 3, 0);
console.log(`${triCount} → ${outTris} triangles in ${mesh.listPrimitives().length} primitives; scale ${scale.toFixed(4)}`);
console.log(`${output}: ${(statSync(output).size / 1024).toFixed(0)} KB`);
