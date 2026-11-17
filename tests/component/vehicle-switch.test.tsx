import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshInspection, inspectionStore } from '../../src/state/inspectionStore';
import { PaintPicker } from '../../src/ui/PaintPicker';
import { VehicleTypeSwitch } from '../../src/ui/VehicleTypeSwitch';

const types = () => screen.getByRole('group', { name: 'Vehicle type' });

describe('VehicleTypeSwitch', () => {
  beforeEach(() => {
    inspectionStore.setState({ ...freshInspection(), selectedPart: null });
  });

  it('switches straight away when nothing is recorded', async () => {
    render(<VehicleTypeSwitch />);
    await userEvent.click(within(types()).getByRole('button', { name: 'Saloon' }));
    expect(inspectionStore.getState().vehicleType).toBe('saloon');
    expect(within(types()).getByRole('button', { name: 'Saloon' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks first when data is recorded; Cancel keeps it and returns focus', async () => {
    inspectionStore.getState().mark('bonnet', 'damage');
    render(<VehicleTypeSwitch />);
    const van = within(types()).getByRole('button', { name: 'Van' });
    await userEvent.click(van);

    const dialog = screen.getByRole('dialog', { name: 'Start a new inspection?' });
    expect(dialog).toHaveTextContent('Switching to Van clears the conditions and notes recorded so far.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(inspectionStore.getState().vehicleType).toBe('suv');
    expect(inspectionStore.getState().conditions).toEqual({ bonnet: 'damage' });
    expect(van).toHaveFocus();
  });

  it('Escape cancels too', async () => {
    inspectionStore.getState().mark('bonnet', 'damage');
    render(<VehicleTypeSwitch />);
    await userEvent.click(within(types()).getByRole('button', { name: 'Saloon' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(inspectionStore.getState().vehicleType).toBe('suv');
  });

  it('"Switch and clear" switches and empties the data', async () => {
    inspectionStore.getState().setNote('roof', 'Scratch');
    render(<VehicleTypeSwitch />);
    await userEvent.click(within(types()).getByRole('button', { name: 'Van' }));
    await userEvent.click(screen.getByRole('button', { name: 'Switch and clear' }));
    expect(inspectionStore.getState().vehicleType).toBe('van');
    expect(inspectionStore.getState().notes).toEqual({});
  });
});

describe('PaintPicker', () => {
  it('toggles the pressed swatch', async () => {
    inspectionStore.setState({ ...freshInspection() });
    render(<PaintPicker />);
    const group = screen.getByRole('group', { name: 'Paint' });
    expect(within(group).getByRole('button', { name: 'Grey paint' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(group).getByRole('button', { name: 'White paint' }));
    expect(within(group).getByRole('button', { name: 'White paint' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Grey paint' })).toHaveAttribute('aria-pressed', 'false');
    expect(inspectionStore.getState().paint).toBe('white');
  });
});
