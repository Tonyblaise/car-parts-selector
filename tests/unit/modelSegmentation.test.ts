import { beforeAll, describe, expect, it } from 'vitest';
import { MaterialKind, type VehicleGeometry } from '../../src/vehicles/geometry';
import { SUV_LANDMARKS, classifySuvFace as classifyFace, segmentModel } from '../../src/vehicles/modelSegmentation';
import { buildParts } from '../../src/vehicles/parts';
import { loadModel, loadSuvModel, loadVanModel } from './helpers/loadModel';

describe('classifyFace', () => {
  const up: [number, number, number] = [0, 1, 0];
  const right: [number, number, number] = [0, 0, 1];
  it('places landmark points in the expected parts', () => {
    expect(classifyFace([1.5, 1.05, 0], up)[0]).toBe('bonnet');
    expect(classifyFace([-0.6, 1.7, 0], up)[0]).toBe('roof');
    expect(classifyFace([0.2, 0.8, 1.0], right)[0]).toBe('front-door-right');
    expect(classifyFace([-0.5, 0.8, -1.0], [0, 0, -1])[0]).toBe('rear-door-left');
    expect(classifyFace([0.2, 1.35, 0.9], right)).toEqual(['front-window-right', MaterialKind.glass]);
    expect(classifyFace([SUV_LANDMARKS.wheelX, SUV_LANDMARKS.wheelY, 0.95], right)).toEqual([
      'wheel-fr',
      MaterialKind.hub,
    ]);
    expect(classifyFace([-1.3, 0.05, 0.8], right)).toEqual(['wheel-rr', MaterialKind.tyre]);
  });
});

describe('segmentModel (public/models/suv.glb)', () => {
  let g: VehicleGeometry;
  const parts = buildParts('suv');
  const centroid = (id: string) => {
    const i = parts.findIndex((p) => p.id === id);
    return [g.centroids[i * 3]!, g.centroids[i * 3 + 1]!, g.centroids[i * 3 + 2]!];
  };

  beforeAll(async () => {
    g = segmentModel('suv', await loadSuvModel());
  }, 30_000);

  it('produces consistent de-indexed arrays', () => {
    expect(g.count % 3).toBe(0);
    expect(g.count).toBeGreaterThan(300_000);
    expect(g.positions.length).toBe(g.count * 3);
    expect(g.normals.length).toBe(g.count * 3);
    for (let v = 0; v < g.count; v += 3) {
      expect(g.partIndex[v + 1]).toBe(g.partIndex[v]);
      expect(g.partIndex[v + 2]).toBe(g.partIndex[v]);
    }
  });

  it('gives every SUV part a real share of the mesh', () => {
    const tris = new Map<number, number>();
    for (let v = 0; v < g.count; v += 3) tris.set(g.partIndex[v]!, (tris.get(g.partIndex[v]!) ?? 0) + 1);
    parts.forEach((p, i) => expect(tris.get(i) ?? 0, p.id).toBeGreaterThan(40));
  });

  it('puts parts where they belong on the car', () => {
    expect(centroid('bonnet')[0]).toBeGreaterThan(1);
    expect(centroid('roof')[1]).toBeGreaterThan(1.5);
    expect(centroid('tailgate')[0]).toBeLessThan(-1.8);
    expect(centroid('front-door-right')[2]).toBeGreaterThan(0.8);
    expect(centroid('front-door-left')[2]).toBeLessThan(-0.8);
    const fr = centroid('wheel-fr');
    expect(fr[0]).toBeCloseTo(1.3, 1);
    expect(fr[2]).toBeGreaterThan(0.6);
  });

  it('has glass, tyres and boundary edges between real parts', () => {
    expect(g.kinds.includes(MaterialKind.glass)).toBe(true);
    expect(g.kinds.includes(MaterialKind.tyre)).toBe(true);
    const ids = new Set(parts.map((p) => p.id));
    expect(g.edges.length).toBeGreaterThan(100);
    for (const e of g.edges) {
      if (e.a) expect(ids.has(e.a)).toBe(true);
      if (e.b) expect(ids.has(e.b)).toBe(true);
    }
    expect(g.edges.some((e) => e.a === 'bonnet' || e.b === 'bonnet')).toBe(true);
  });

  it('has unit normals', () => {
    for (let v = 0; v < g.count; v += 997) {
      const l = Math.hypot(g.normals[v * 3]!, g.normals[v * 3 + 1]!, g.normals[v * 3 + 2]!);
      expect(l).toBeCloseTo(1, 3);
    }
  });
});

describe('segmentModel (public/models/van.glb)', () => {
  let g: VehicleGeometry;
  const parts = buildParts('van');
  const centroid = (id: string) => {
    const i = parts.findIndex((p) => p.id === id);
    return [g.centroids[i * 3]!, g.centroids[i * 3 + 1]!, g.centroids[i * 3 + 2]!];
  };

  beforeAll(async () => {
    g = segmentModel('van', await loadVanModel());
  }, 30_000);

  it('gives every van part a real share of the mesh', () => {
    const tris = new Map<number, number>();
    for (let v = 0; v < g.count; v += 3) tris.set(g.partIndex[v]!, (tris.get(g.partIndex[v]!) ?? 0) + 1);
    parts.forEach((p, i) => expect(tris.get(i) ?? 0, p.id).toBeGreaterThan(40));
  });

  it('maps the OBJ groups: wheels and front doors on the right sides', () => {
    expect(centroid('wheel-fr')[0]).toBeGreaterThan(1.2);
    expect(centroid('wheel-fr')[2]).toBeGreaterThan(0.5);
    expect(centroid('wheel-rl')[0]).toBeLessThan(-1.2);
    expect(centroid('wheel-rl')[2]).toBeLessThan(-0.5);
    expect(centroid('front-door-right')[2]).toBeGreaterThan(0.7);
    expect(centroid('front-door-left')[2]).toBeLessThan(-0.7);
  });

  it('puts the roof on top and the rear doors at the back', () => {
    expect(centroid('roof')[1]).toBeGreaterThan(1.7);
    expect(centroid('tailgate')[0]).toBeLessThan(-2);
    expect(centroid('bonnet')[0]).toBeGreaterThan(1.3);
  });

  it('marks windscreen and door glass as glass', () => {
    const glassParts = new Set<number>();
    for (let v = 0; v < g.count; v += 3) if (g.kinds[v] === MaterialKind.glass) glassParts.add(g.partIndex[v]!);
    const ids = [...glassParts].map((i) => parts[i]?.id);
    expect(ids).toEqual(expect.arrayContaining(['windscreen', 'front-window-left', 'front-window-right']));
  });
});

describe('segmentModel (public/models/saloon.glb)', () => {
  let g: VehicleGeometry;
  const parts = buildParts('saloon');
  const centroid = (id: string) => {
    const i = parts.findIndex((p) => p.id === id);
    return [g.centroids[i * 3]!, g.centroids[i * 3 + 1]!, g.centroids[i * 3 + 2]!];
  };

  beforeAll(async () => {
    g = segmentModel('saloon', await loadModel('public/models/saloon.glb'));
  }, 30_000);

  it('gives every saloon part a real share of the mesh', () => {
    const tris = new Map<number, number>();
    for (let v = 0; v < g.count; v += 3) tris.set(g.partIndex[v]!, (tris.get(g.partIndex[v]!) ?? 0) + 1);
    parts.forEach((p, i) => expect(tris.get(i) ?? 0, p.id).toBeGreaterThan(40));
  });

  it('maps the named wheels to the right corners', () => {
    expect(centroid('wheel-fr')[0]).toBeGreaterThan(1.2);
    expect(centroid('wheel-fr')[2]).toBeGreaterThan(0.5);
    expect(centroid('wheel-rl')[0]).toBeLessThan(-1);
    expect(centroid('wheel-rl')[2]).toBeLessThan(-0.5);
  });

  it('puts the boot lid at the back and the bonnet at the front', () => {
    expect(centroid('tailgate')[0]).toBeLessThan(-2);
    expect(centroid('bonnet')[0]).toBeGreaterThan(1.3);
    expect(centroid('roof')[1]).toBeGreaterThan(1.3);
  });

  it('uses the glass materials for the windows', () => {
    const glassParts = new Set<string>();
    for (let v = 0; v < g.count; v += 3) {
      if (g.kinds[v] === MaterialKind.glass) glassParts.add(parts[g.partIndex[v]!]?.id ?? '');
    }
    expect([...glassParts]).toEqual(
      expect.arrayContaining(['windscreen', 'rear-windscreen', 'front-window-left', 'rear-window-right']),
    );
  });
});
