import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TerritoriosPage from './TerritoriosPage';
import { createTerritorio, listTerritorios } from '../lib/api';
import type { Territorio } from '../types';

vi.mock('../lib/api', () => ({
  createTerritorio: vi.fn(),
  listTerritorios: vi.fn(),
  resolveCoords: vi.fn(),
  reverseGeocode: vi.fn(),
  searchGeocoding: vi.fn().mockResolvedValue([])
}));

const territory: Territorio = {
  id: 8,
  workspaceId: 'workspace-a',
  nome: 'Vila da Serra',
  tipo: 'BAIRRO',
  cidade: null,
  bairro: null,
  estado: null,
  pais: 'Brasil',
  latitude: null,
  longitude: null,
  boundingBox: [],
  status: 'ATIVO',
  updatedAt: '2026-07-10T14:00:00Z'
};

function page(workspaceId = 'workspace-a') {
  return (
    <MemoryRouter initialEntries={['/territorios']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route path="/territorios" element={<TerritoriosPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(workspaceId?: string) {
  return render(
    page(workspaceId)
  );
}

describe('TerritoriosPage', () => {
  beforeEach(() => {
    vi.mocked(listTerritorios).mockResolvedValue([territory]);
    vi.mocked(createTerritorio).mockResolvedValue(territory);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('labels an absent location honestly', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Vila da Serra' })).toBeInTheDocument();
    expect(screen.getByText('Localização não informada')).toBeInTheDocument();
  });

  it('persists explicit null location fields without exposing database ids', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Novo território' }));

    const dialog = screen.getByRole('dialog', { name: 'Novo território' });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByLabelText(/\bid\b/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome do território'), { target: { value: 'Vila da Serra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar território' }));

    await waitFor(() => expect(createTerritorio).toHaveBeenCalledWith({
      workspaceId: 'workspace-a',
      nome: 'Vila da Serra',
      tipo: 'BAIRRO',
      cidade: null,
      bairro: null,
      estado: null,
      pais: null,
      latitude: null,
      longitude: null,
      boundingBox: null
    }));
  });

  it('closes on Escape and returns focus to the opener', async () => {
    renderPage();
    const opener = await screen.findByRole('button', { name: 'Novo território' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByLabelText('Nome do território')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes the territory form when the active workspace changes', async () => {
    const view = renderPage('workspace-a');
    fireEvent.click(await screen.findByRole('button', { name: 'Novo território' }));
    expect(screen.getByRole('dialog', { name: 'Novo território' })).toBeInTheDocument();

    view.rerender(page('workspace-b'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
