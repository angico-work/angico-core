import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModulePage from './ModulePage';

vi.mock('../lib/api', () => ({
  listEntities: vi.fn().mockRejectedValue(new Error('Sem conexão com o servidor.')),
  getSession: vi.fn().mockReturnValue({ pessoaId: 7, angicoId: 'ana.sp' }),
  createEntity: vi.fn(),
  reverseGeocode: vi.fn(),
  resolveCoords: vi.fn(),
  searchPessoas: vi.fn().mockResolvedValue([]),
  searchGeocoding: vi.fn().mockResolvedValue([])
}));

vi.mock('../lib/offlineStore', () => ({
  listLocalObservations: vi.fn().mockResolvedValue([{
    clientMutationId: 'local-1',
    syncStatus: 'QUEUED',
    data: {
      workspaceId: 'territorio-a',
      categoria: 'Água e Saneamento',
      titulo: 'Nascente sem proteção',
      occurredAt: '2026-07-10T12:00:00Z'
    }
  }])
}));

afterEach(cleanup);

describe('ModulePage offline observations', () => {
  it('shows durable local records together with an honest stale-data warning', async () => {
    render(
      <MemoryRouter initialEntries={['/observacoes']}>
        <Routes>
          <Route element={<Outlet context={{ workspaceId: 'territorio-a' }} />}>
            <Route path="/observacoes" element={<ModulePage configKey="observacoes" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Nascente sem proteção')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com o servidor');
    expect(screen.getByText('Salvo neste aparelho')).toBeInTheDocument();
  });
});
