import { describe, expect, it } from 'vitest';
import {
  POLAR_MAX,
  POLAR_MIN,
  PRESET_VIEWS,
  clampPolar,
  shortestAzimuth,
  toAzimuthPolar,
} from '../../src/scene/cameraMath';

/** Camera direction from target, as three.js Spherical places it. */
const dir = (azimuth: number, polar: number) => [
  Math.sin(polar) * Math.sin(azimuth),
  Math.cos(polar),
  Math.sin(polar) * Math.cos(azimuth),
];

describe('toAzimuthPolar', () => {
  it('turns the inspiration Front view into a camera on +X (the grille)', () => {
    const v = toAzimuthPolar(-Math.PI / 2, 0.22);
    const [x, y, z] = dir(v.azimuth, v.polar);
    expect(x).toBeGreaterThan(0.9);
    expect(y).toBeGreaterThan(0);
    expect(Math.abs(z!)).toBeLessThan(1e-9);
  });

  it('puts the Right view on +Z, the car’s right side', () => {
    const v = PRESET_VIEWS['Right'];
    expect(dir(v.azimuth, v.polar)[2]).toBeGreaterThan(0.9);
  });

  it('clamps polar into the allowed range', () => {
    expect(clampPolar(-1)).toBe(POLAR_MIN);
    expect(clampPolar(3)).toBe(POLAR_MAX);
    expect(POLAR_MIN).toBe(0.05);
    expect(POLAR_MAX).toBe(1.52);
    expect(toAzimuthPolar(0, -0.5).polar).toBe(POLAR_MAX);
  });
});

describe('shortestAzimuth', () => {
  it('stays within ±π of the start', () => {
    expect(shortestAzimuth(0, 3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(shortestAzimuth(3, -3)).toBeCloseTo(-3 + 2 * Math.PI);
    expect(Math.abs(shortestAzimuth(10, -10) - 10)).toBeLessThanOrEqual(Math.PI);
  });
});

describe('PRESET_VIEWS', () => {
  it('has the six presets in toolbar order', () => {
    expect(Object.keys(PRESET_VIEWS)).toEqual(['3/4', 'Front', 'Right', 'Rear', 'Left', 'Top']);
  });
});
