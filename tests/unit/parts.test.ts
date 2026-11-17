import { describe, expect, it } from 'vitest';
import { VEHICLE_TYPE_IDS } from '../../src/vehicles/catalog';
import { buildParts, partIndexById } from '../../src/vehicles/parts';

const names = (type: Parameters<typeof buildParts>[0]) => buildParts(type).map((p) => p.name);
const ids = (type: Parameters<typeof buildParts>[0]) => buildParts(type).map((p) => p.id);

describe('buildParts', () => {
  it('has the pinned part count per body style', () => {
    expect(buildParts('suv')).toHaveLength(26);
    expect(buildParts('saloon')).toHaveLength(24);
    expect(buildParts('van')).toHaveLength(26);
  });

  it.each(VEHICLE_TYPE_IDS)('%s: ids are unique and every part has a zone and view', (type) => {
    const parts = buildParts(type);
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    for (const p of parts) {
      expect(p.zone).toBeTruthy();
      expect(Number.isFinite(p.view.azimuth)).toBe(true);
      expect(p.view.polar).toBeGreaterThan(0);
      expect(p.view.polar).toBeLessThan(Math.PI / 2);
      expect(p.id).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it('applies body-style names', () => {
    expect(names('saloon')).toContain('Boot lid');
    expect(names('saloon')).not.toContain('Tailgate');
    expect(names('van')).toEqual(expect.arrayContaining(['Rear doors', 'Sliding left door']));
  });

  it('drops quarter windows on the saloon only', () => {
    expect(ids('saloon').some((id) => id.startsWith('quarter-window'))).toBe(false);
    expect(ids('van')).toContain('quarter-window-right');
    expect(ids('suv')).toContain('quarter-window-left');
  });

  it('keeps the inspiration order', () => {
    expect(ids('suv')).toEqual([
      'front-bumper',
      'grille',
      'bonnet',
      'windscreen',
      'roof',
      'rear-windscreen',
      'wing-right',
      'front-door-right',
      'front-window-right',
      'rear-door-right',
      'rear-window-right',
      'quarter-right',
      'quarter-window-right',
      'wing-left',
      'front-door-left',
      'front-window-left',
      'rear-door-left',
      'rear-window-left',
      'quarter-left',
      'quarter-window-left',
      'tailgate',
      'rear-bumper',
      'wheel-fr',
      'wheel-rr',
      'wheel-fl',
      'wheel-rl',
    ]);
  });

  it('indexes parts by id', () => {
    const idx = partIndexById('suv');
    expect(idx.get('front-bumper')).toBe(0);
    expect(idx.get('wheel-rl')).toBe(25);
  });
});
