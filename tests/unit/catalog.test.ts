import { describe, expect, it } from 'vitest';
import { PAINTS, PAINT_IDS, VEHICLE_TYPES, VEHICLE_TYPE_IDS, ZONES } from '../../src/vehicles/catalog';

describe('vehicle catalog', () => {
  it('has exactly the three body styles: SUV, Saloon and Van', () => {
    expect(VEHICLE_TYPE_IDS).toEqual(['suv', 'saloon', 'van']);
    expect(VEHICLE_TYPE_IDS.map((id) => VEHICLE_TYPES[id].label)).toEqual(['SUV', 'Saloon', 'Van']);
  });

  it('lists the inspection zones in order', () => {
    expect(ZONES.map((z) => z.id)).toEqual([
      'Front',
      'Top',
      'Right side',
      'Left side',
      'Rear',
      'Wheels',
    ]);
    for (const z of ZONES) expect(z.icon).toMatch(/^M/);
  });

  it('maps the three paints to their colours', () => {
    expect(PAINT_IDS).toEqual(['grey', 'white', 'black']);
    expect(PAINTS.grey.hex).toBe('#6B6E74');
    expect(PAINTS.white.hex).toBe('#E6E7E9');
    expect(PAINTS.black.hex).toBe('#1F2124');
  });

  it('only vans have a glass rear cap', () => {
    expect(VEHICLE_TYPE_IDS.filter((id) => VEHICLE_TYPES[id].shape.capGlass)).toEqual(['van']);
  });
});
