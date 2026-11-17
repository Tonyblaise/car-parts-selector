import { describe, expect, it } from 'vitest';
import type { Edge } from '../../src/vehicles/geometry';
import { buildRibbons } from '../../src/vehicles/ribbons';

const edge = (p2: [number, number, number]): Edge => ({
  a: 'roof',
  b: 'windscreen',
  p1: [0, 1, 0],
  p2,
  n1: [0, 1, 0],
  n2: [0, 1, 0],
});

describe('buildRibbons', () => {
  it('turns one edge into two triangles', () => {
    const out = buildRibbons([edge([1, 1, 0])], 0.04, 0.01);
    expect(out.length).toBe(6 * 3);
    // Lifted along the normal.
    expect(out[1]).toBeCloseTo(1.01);
  });

  it('skips zero-length edges', () => {
    expect(buildRibbons([edge([0, 1, 0])], 0.04, 0.01).length).toBe(0);
  });
});
