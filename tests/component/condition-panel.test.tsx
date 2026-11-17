import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshInspection, inspectionStore } from '../../src/state/inspectionStore';
import { ConditionPanel } from '../../src/ui/ConditionPanel';

describe('ConditionPanel', () => {
  beforeEach(() => {
    inspectionStore.setState({ ...freshInspection(), selectedPart: null });
  });

  it('prompts when nothing is selected', () => {
    render(<ConditionPanel />);
    expect(
      screen.getByText('Tap a part on the car or in the list to record its condition.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Condition' })).not.toBeInTheDocument();
  });

  it('records a condition and a note for the selected part', async () => {
    inspectionStore.getState().selectPart('bonnet');
    render(<ConditionPanel />);
    expect(screen.getByText('Condition · Bonnet')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Condition' });
    await userEvent.click(within(group).getByRole('button', { name: 'Damage' }));
    expect(within(group).getByRole('button', { name: 'Damage' })).toHaveAttribute('aria-pressed', 'true');
    expect(inspectionStore.getState().conditions.bonnet).toBe('damage');

    await userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'Stone chip, centre');
    expect(inspectionStore.getState().notes.bonnet).toBe('Stone chip, centre');
  });

  it('shows each part its own note and clears both with Clear', async () => {
    const st = inspectionStore.getState();
    st.setNote('bonnet', 'Chip');
    st.mark('bonnet', 'advisory');
    st.selectPart('roof');
    const { rerender } = render(<ConditionPanel />);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('');

    inspectionStore.getState().selectPart('bonnet');
    rerender(<ConditionPanel />);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Chip');

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(inspectionStore.getState().conditions).toEqual({});
    expect(inspectionStore.getState().notes).toEqual({});
  });
});
