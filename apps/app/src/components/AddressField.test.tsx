import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddressField from './AddressField';
import { searchGeocoding } from '../lib/api';

vi.mock('../lib/api', () => ({ searchGeocoding: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AddressField keyboard access', () => {
  it('associates the combobox with its listbox and selects an address by keyboard', async () => {
    vi.mocked(searchGeocoding).mockResolvedValue([{
      displayName: 'Várzea, Recife, PE',
      city: 'Recife',
      neighborhood: 'Várzea',
      state: 'PE',
      country: 'Brasil',
      latitude: -8.05,
      longitude: -34.95,
      boundingBox: []
    }]);
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const view = render(<AddressField id="place" value="Várzea" onChange={onChange} onSelect={onSelect} />);

    const input = await screen.findByRole('combobox');
    const option = await screen.findByRole('option', { name: /Várzea/ });
    expect(input).toHaveAttribute('aria-controls', 'place-options');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ city: 'Recife' }));
    view.unmount();
  });

  it('reports a failed search and clears the busy state', async () => {
    vi.mocked(searchGeocoding).mockRejectedValue(new TypeError('sem conexão'));
    render(<AddressField id="place" value="Várzea" onChange={() => undefined} onSelect={() => undefined} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar endereços');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'false'));
  });
});
