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
  it('selects the first search result when Enter is pressed without arrow navigation', async () => {
    const city = { displayName: 'Mococa, São Paulo, Brasil', city: 'Mococa', neighborhood: null, state: 'São Paulo', country: 'Brasil', latitude: -21.467, longitude: -47.004, boundingBox: [] };
    vi.mocked(searchGeocoding).mockResolvedValue([city]);
    const onSelect = vi.fn();
    render(<AddressField value="Mococa" onChange={() => undefined} onSelect={onSelect} />);
    await screen.findByRole('option', { name: /Mococa/ });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(city);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

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
