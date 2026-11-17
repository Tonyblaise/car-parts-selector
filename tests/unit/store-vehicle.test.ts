import { beforeEach, describe, expect, it } from 'vitest';
import { createInspectionStore, needsSwitchConfirm } from '../../src/state/inspectionStore';

let store: ReturnType<typeof createInspectionStore>;
const s = () => store.getState();

describe('switching vehicle type', () => {
  beforeEach(() => {
    store = createInspectionStore();
  });

  it('resets the inspection and keeps the paint', () => {
    s().setPaint('black');
    s().mark('bonnet', 'damage');
    s().setNote('bonnet', 'Dent');
    s().selectPart('bonnet');
    s().switchVehicle('van');
    expect(s()).toMatchObject({
      vehicleType: 'van',
      paint: 'black',
      conditions: {},
      notes: {},
      selectedPart: null,
    });
  });

  it('does nothing when the type is unchanged', () => {
    s().mark('bonnet', 'damage');
    s().switchVehicle('suv');
    expect(s().conditions).toEqual({ bonnet: 'damage' });
  });

  it('needs confirmation only when something is recorded', () => {
    expect(needsSwitchConfirm(s())).toBe(false);
    s().setNote('roof', 'Scratch');
    expect(needsSwitchConfirm(s())).toBe(true);
    s().setNote('roof', '');
    s().mark('roof', 'pass');
    expect(needsSwitchConfirm(s())).toBe(true);
  });
});
