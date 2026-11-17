import { describe, expect, it } from 'vitest';
import { progress, visibleParts, zoneSummary } from '../../src/state/selectors';
import type { Condition } from '../../src/state/types';
import type { PartId } from '../../src/vehicles/parts';

const state = (conditions: Record<PartId, Condition>, activeZone: string = 'all') => ({
  vehicleType: 'suv' as const,
  conditions,
  activeZone: activeZone as never,
});

describe('selectors', () => {
  it('progress counts each condition', () => {
    const p = progress(
      state({ bonnet: 'pass', grille: 'advisory', 'wheel-fr': 'damage', roof: 'pass' }),
    );
    expect(p).toEqual({ done: 4, total: 26, pass: 2, advisory: 1, damage: 1 });
  });

  it('zoneSummary counts checked parts per zone and for all', () => {
    const s = state({ 'wheel-fr': 'pass', bonnet: 'damage' });
    expect(zoneSummary(s, 'Wheels')).toEqual({ checked: 1, total: 4 });
    expect(zoneSummary(s, 'Front')).toEqual({ checked: 1, total: 3 });
    expect(zoneSummary(s, 'all')).toEqual({ checked: 2, total: 26 });
  });

  it('visibleParts filters by the active zone', () => {
    expect(visibleParts(state({}, 'Wheels')).map((p) => p.id)).toEqual([
      'wheel-fr',
      'wheel-rr',
      'wheel-fl',
      'wheel-rl',
    ]);
    expect(visibleParts(state({}))).toHaveLength(26);
  });
});
