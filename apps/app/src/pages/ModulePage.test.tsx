import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModulePage from './ModulePage';

vi.mock('../lib/api', () => ({
  listEntities: vi.fn().mockRejectedValue(new Error('Sem conexão com o servidor.')),
  listMissoes: vi.fn().mockResolvedValue([{
    id: 20, workspaceId: 'territorio-a', territorioId: '4', problemaId: '11', responsavelId: '7',
    titulo: 'Recuperar a nascente', descricao: null, status: 'PLANEJADA', progresso: 0, createdAt: ''
  }]),
  listProblemas: vi.fn().mockResolvedValue([]),
  listTerritorios: vi.fn().mockResolvedValue([{
    id: 4, workspaceId: 'territorio-a', nome: 'Nascente Sul', tipo: 'MICROBACIA', cidade: null,
    bairro: null, estado: null, pais: null, latitude: null, longitude: null, boundingBox: [], status: 'ATIVO', updatedAt: null
  }]),
  getSession: vi.fn().mockReturnValue({ pessoaId: 7, angicoId: 'ana.sp' }),
  createEntity: vi.fn(),
  createAcao: vi.fn(),
  createMissao: vi.fn(),
  createProblema: vi.fn(),
  reverseGeocode: vi.fn(),
  resolveCoords: vi.fn(),
  searchPessoas: vi.fn().mockResolvedValue([]),
  searchGeocoding: vi.fn().mockResolvedValue([])
}));

vi.mock('../lib/offlineStore', () => ({
  listLocalObservations: vi.fn().mockResolvedValue([
    {
      clientMutationId: 'local-1',
      syncStatus: 'QUEUED',
      data: {
        workspaceId: 'territorio-a',
        categoria: 'Água e Saneamento',
        titulo: 'Nascente sem proteção',
        occurredAt: '2026-07-10T12:00:00Z'
      }
    },
    {
      clientMutationId: 'local-2',
      syncStatus: 'SYNCED',
      data: {
        workspaceId: 'territorio-a',
        categoria: 'Áreas Verdes',
        titulo: 'Registro antes do envio',
        occurredAt: '2026-07-10T13:00:00Z'
      },
      remote: {
        id: 22,
        workspaceId: 'territorio-a',
        categoria: 'Áreas Verdes',
        titulo: 'Horta comunitária confirmada',
        status: 'ABERTA',
        createdAt: '2026-07-10T13:01:00Z'
      }
    }
  ])
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

  it('keeps the last synchronized snapshot visible when the server is unavailable', async () => {
    render(
      <MemoryRouter initialEntries={['/observacoes']}>
        <Routes>
          <Route element={<Outlet context={{ workspaceId: 'territorio-a' }} />}>
            <Route path="/observacoes" element={<ModulePage configKey="observacoes" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Horta comunitária confirmada')).toBeInTheDocument();
    expect(screen.getByText('Compartilhado')).toBeInTheDocument();
  });

  it('opens an action deep link with its mission selected by name', async () => {
    render(
      <MemoryRouter initialEntries={['/acoes?create=1&missaoId=20']}>
        <Routes>
          <Route element={<Outlet context={{ workspaceId: 'territorio-a' }} />}>
            <Route path="/acoes" element={<ModulePage configKey="acoes" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('dialog', { name: 'Nova ação' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Missão')).toHaveValue('20');
    expect(screen.getByRole('option', { name: 'Recuperar a nascente' })).toBeInTheDocument();
  });

  it('opens an observation deep link with its territory selected by name', async () => {
    render(
      <MemoryRouter initialEntries={['/observacoes?create=1&territorioId=4']}>
        <Routes>
          <Route element={<Outlet context={{ workspaceId: 'territorio-a' }} />}>
            <Route path="/observacoes" element={<ModulePage configKey="observacoes" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('dialog', { name: 'Nova observação' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Território relacionado')).toHaveValue('4');
    expect(screen.getByRole('option', { name: 'Nascente Sul' })).toBeInTheDocument();
  });
});
