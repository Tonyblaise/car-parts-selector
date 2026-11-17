import { beforeEach, describe, expect, it } from 'vitest';
import { createInspectionStore } from '../../src/state/inspectionStore';

let store: ReturnType<typeof createInspectionStore>;
const s = () => store.getState();

describe('conditions and notes', () => {
  beforeEach(() => {
    store = createInspectionStore();
  });

  it('marks a part, and marking it the same again clears it (FR-009)', () => {
    s().mark('bonnet', 'damage');
    expect(s().conditions).toEqual({ bonnet: 'damage' });
    s().mark('bonnet', 'advisory');
    expect(s().conditions).toEqual({ bonnet: 'advisory' });
    s().mark('bonnet', 'advisory');
    expect(s().conditions).toEqual({});
  });

  it('ignores parts that are not on this vehicle', () => {
    s().mark('load-bed-thing', 'pass');
    s().mark('quarter-window-left', 'pass'); // exists on SUV
    expect(s().conditions).toEqual({ 'quarter-window-left': 'pass' });
  });

  it('keeps notes per part, trims empty ones and caps length', () => {
    s().setNote('bonnet', 'Stone chip, centre');
    s().setNote('roof', 'x'.repeat(1200));
    expect(s().notes.bonnet).toBe('Stone chip, centre');
    expect(s().notes.roof).toHaveLength(1000);
    s().setNote('bonnet', '   ');
    expect(s().notes).not.toHaveProperty('bonnet');
  });

  it('clears both condition and note (FR-012)', () => {
    s().mark('bonnet', 'damage');
    s().setNote('bonnet', 'Dent');
    s().clear('bonnet');
    expect(s().conditions).toEqual({});
    expect(s().notes).toEqual({});
  });

});
