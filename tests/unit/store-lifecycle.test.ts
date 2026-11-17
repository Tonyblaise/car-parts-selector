import { beforeEach, describe, expect, it } from 'vitest';
import { createInspectionStore } from '../../src/state/inspectionStore';
import { buildParts } from '../../src/vehicles/parts';

let store: ReturnType<typeof createInspectionStore>;
const s = () => store.getState();

describe('pass the rest', () => {
  beforeEach(() => {
    store = createInspectionStore();
  });

  it('passes only unchecked parts', () => {
    s().mark('bonnet', 'damage');
    s().mark('roof', 'advisory');
    s().passRest();
    const c = s().conditions;
    expect(Object.keys(c)).toHaveLength(buildParts('suv').length);
    expect(c.bonnet).toBe('damage');
    expect(c.roof).toBe('advisory');
    expect(c.grille).toBe('pass');
  });

  it('changes nothing when every part is checked', () => {
    s().passRest();
    const before = s().conditions;
    s().passRest();
    expect(s().conditions).toBe(before);
  });
});

describe('nothing is saved (demo)', () => {
  it('a new store always starts with an empty inspection', () => {
    createInspectionStore().getState().mark('bonnet', 'damage');
    const fresh = createInspectionStore().getState();
    expect(fresh.conditions).toEqual({});
    expect(fresh.notes).toEqual({});
    expect(fresh.vehicleType).toBe('suv');
  });
});
