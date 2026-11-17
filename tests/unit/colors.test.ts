import { describe, expect, it } from 'vitest';
import { BASE_COLORS, hexToRgb, writeColors } from '../../src/scene/colors';
import { MaterialKind } from '../../src/vehicles/geometry';

// A tiny fake mesh: one vertex per (part, kind) pair we want to probe.
const geom = {
  count: 5,
  kinds: new Uint8Array([
    MaterialKind.body, // part 0
    MaterialKind.glass, // part 0
    MaterialKind.body, // part 1
    MaterialKind.body, // part 2
    MaterialKind.under, // no part
  ]),
  partIndex: new Int16Array([0, 0, 1, 2, -1]),
};
const parts = [{ id: 'bonnet' }, { id: 'roof' }, { id: 'grille' }];
const rgb = (out: Float32Array, v: number) => [out[v * 3]!, out[v * 3 + 1]!, out[v * 3 + 2]!];

const run = (over: Partial<Parameters<typeof writeColors>[2]> = {}) => {
  const out = new Float32Array(geom.count * 3);
  writeColors(out, geom, {
    paintHex: '#6B6E74',
    conditions: {},
    parts,
    selectedIndex: -1,
    hoverIndex: -1,
    ...over,
  });
  return out;
};

describe('hexToRgb', () => {
  it('parses six-digit hex to 0–1 floats', () => {
    const [r, g, b] = hexToRgb('#6B6E74');
    expect(r).toBeCloseTo(0x6b / 255);
    expect(g).toBeCloseTo(0x6e / 255);
    expect(b).toBeCloseTo(0x74 / 255);
  });
  it('falls back to the default grey for bad input', () => {
    expect(hexToRgb('nope')).toEqual([0.42, 0.43, 0.45]);
  });
});

describe('writeColors', () => {
  it('uses paint for body and fixed colours for other kinds', () => {
    const out = run();
    rgb(out, 0).forEach((c, i) => expect(c).toBeCloseTo(hexToRgb('#6B6E74')[i]!));
    expect(rgb(out, 4)).toEqual(BASE_COLORS.under.map((c) => Math.fround(c)));
  });

  it('blends a damaged body panel fully to red and its glass by half', () => {
    const out = run({ conditions: { bonnet: 'damage' } });
    const [r, g, b] = rgb(out, 0);
    expect(r).toBeCloseTo(0.9);
    expect(g).toBeCloseTo(0.3);
    expect(b).toBeCloseTo(0.28);
    const glass = BASE_COLORS.glass;
    expect(rgb(out, 1)[0]).toBeCloseTo(glass[0] + (0.9 - glass[0]) * 0.5);
  });

  it('shifts an unchecked selected part toward blue', () => {
    const before = rgb(run(), 2);
    const after = rgb(run({ selectedIndex: 1 }), 2);
    expect(after[2]! - after[0]!).toBeGreaterThan(before[2]! - before[0]!);
  });

  it('lifts a hovered part toward white by 0.16', () => {
    const base = rgb(run(), 3)[0]!;
    const hovered = rgb(run({ hoverIndex: 2 }), 3)[0]!;
    expect(hovered).toBeCloseTo(base + (1 - base) * 0.16);
  });
});
