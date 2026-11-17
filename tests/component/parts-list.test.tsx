import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { inspectionStore } from '../../src/state/inspectionStore';
import { PartsList } from '../../src/ui/PartsList';

describe('PartsList', () => {
  beforeEach(() => {
    inspectionStore.setState({ vehicleType: 'suv', selectedPart: null, activeZone: 'all', conditions: {} });
  });

  it('lists every SUV part under "All parts"', () => {
    render(<PartsList />);
    const list = screen.getByRole('list', { name: 'All parts' });
    expect(within(list).getAllByRole('button')).toHaveLength(26);
  });

  it('selects a part on click', async () => {
    render(<PartsList />);
    await userEvent.click(screen.getByRole('button', { name: /^Bonnet/ }));
    expect(inspectionStore.getState().selectedPart).toBe('bonnet');
    expect(screen.getByRole('button', { name: /^Bonnet/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is one tab stop with arrow-key movement and Enter to select', async () => {
    render(<PartsList />);
    const rows = within(screen.getByRole('list', { name: 'All parts' })).getAllByRole('button');
    expect(rows.filter((r) => r.tabIndex === 0)).toHaveLength(1);

    await userEvent.tab();
    expect(rows[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(rows[2]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(rows[1]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(rows[25]).toHaveFocus();
    await userEvent.keyboard('{Home}{Enter}');
    expect(inspectionStore.getState().selectedPart).toBe('front-bumper');
  });
});
