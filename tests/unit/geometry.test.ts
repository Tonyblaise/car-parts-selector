import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { VEHICLE_TYPE_IDS } from '../../src/vehicles/catalog';
import { buildGeometry, isInWheelCutout } from '../../src/vehicles/geometry';
import { buildParts } from '../../src/vehicles/parts';

const hash = (a: Float32Array) =>
  createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');

describe.each(VEHICLE_TYPE_IDS)('buildGeometry(%s)', (type) => {
  const g = buildGeometry(type);
  const parts = buildParts(type);
  const partIds = new Set(parts.map((p) => p.id));

  it('has consistent array lengths', () => {
    expect(g.count % 3).toBe(0);
    expect(g.positions.length).toBe(g.count * 3);
    expect(g.normals.length).toBe(g.count * 3);
    expect(g.kinds.length).toBe(g.count);
    expect(g.partIndex.length).toBe(g.count);
  });

  it('gives every part at least one triangle', () => {
    const seen = new Set<number>();
    for (let v = 0; v < g.count; v += 3) seen.add(g.partIndex[v]!);
    parts.forEach((p, i) => expect(seen.has(i), p.id).toBe(true));
  });

  it('keeps each triangle within one part', () => {
    for (let v = 0; v < g.count; v += 3) {
      expect(g.partIndex[v + 1]).toBe(g.partIndex[v]);
      expect(g.partIndex[v + 2]).toBe(g.partIndex[v]);
    }
  });

  it('only references real parts from edges', () => {
    expect(g.edges.length).toBeGreaterThan(0);
    for (const e of g.edges) {
      if (e.a !== null) expect(partIds.has(e.a), e.a).toBe(true);
      if (e.b !== null) expect(partIds.has(e.b), e.b).toBe(true);
    }
  });

  it('has a finite centroid for every part', () => {
    expect(g.centroids.length).toBe(parts.length * 3);
    for (const c of g.centroids) expect(Number.isFinite(c)).toBe(true);
  });

  it('is deterministic', () => {
    // A fresh build (bypassing the cache) must match byte for byte.
    expect(hash(buildGeometry(type, { fresh: true }).positions)).toBe(hash(g.positions));
  });

  it('stays within the expected bounds', () => {
    for (let v = 0; v < g.count; v++) {
      const x = g.positions[v * 3]!;
      const y = g.positions[v * 3 + 1]!;
      expect(Math.abs(x)).toBeLessThanOrEqual(2.5);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(2.1);
    }
  });
});

describe('isInWheelCutout', () => {
  it('is true at a wheel hub on the body side and false elsewhere', () => {
    const { wheelCutout: w } = buildGeometry('suv');
    expect(isInWheelCutout(w[0], w[2], 0.9, w)).toBe(true);
    expect(isInWheelCutout(w[1], w[2], -0.9, w)).toBe(true);
    // Inside the body (|z| <= 0.45) nothing is cut.
    expect(isInWheelCutout(w[0], w[2], 0.2, w)).toBe(false);
    // Mid-door, well away from either wheel.
    expect(isInWheelCutout(0, 0.6, 0.9, w)).toBe(false);
  });
});
