import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshInspection, inspectionStore } from '../../src/state/inspectionStore';
import { PartsList } from '../../src/ui/PartsList';
import { ZoneNav } from '../../src/ui/ZoneNav';

const setup = () =>
  render(
    <>
      <nav aria-label="Inspection areas">
        <ZoneNav />
      </nav>
      <PartsList />
    </>,
  );

describe('ZoneNav', () => {
  beforeEach(() => {
    inspectionStore.setState({ ...freshInspection(), selectedPart: null, activeZone: 'all' });
  });

  it('shows seven zone buttons with All parts pressed', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Inspection areas' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons).toHaveLength(7);
    expect(within(nav).getByRole('button', { name: /^All parts/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters the list by zone and counts checked parts', async () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Inspection areas' });
    const wheels = within(nav).getByRole('button', { name: /^Wheels/ });
    await userEvent.click(wheels);

    const list = screen.getByRole('list', { name: 'Wheels parts' });
    expect(within(list).getAllByRole('button')).toHaveLength(4);
    expect(wheels).toHaveTextContent('0/4');
    expect(wheels).toHaveAttribute('aria-pressed', 'true');

    act(() => inspectionStore.getState().mark('wheel-fr', 'pass'));
    expect(wheels).toHaveTextContent('1/4');
  });
});
