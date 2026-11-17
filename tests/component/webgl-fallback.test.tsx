import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

describe('no WebGL', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the fallback message and still renders the parts list', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<App />);
    expect(
      await screen.findByText('3D view is not available here. Use the list.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '3D vehicle' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Rotatable 3D vehicle/ })).not.toBeInTheDocument();
  });
});
