import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModulePage from './ModulePage';
import { listEntities } from '../lib/api';

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
  sessionOwnerId: vi.fn().mockReturnValue('stable-owner'),
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

afterEach(() => {
  vi.mocked(listEntities).mockRejectedValue(new Error('Sem conexão com o servidor.'));
  cleanup();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function moduleView(workspaceId: string) {
  return (
    <MemoryRouter initialEntries={['/problemas']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route path="/problemas" element={<ModulePage configKey="problemas" />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ModulePage offline observations', () => {
  it('ignores an older response after the active workspace changes', async () => {
    const first = deferred<Record<string, unknown>[]>();
    const second = deferred<Record<string, unknown>[]>();
    vi.mocked(listEntities).mockImplementation((_path, workspaceId) => (
      workspaceId === 'territorio-a' ? first.promise : second.promise
    ));
    const view = render(moduleView('territorio-a'));
    await waitFor(() => expect(listEntities).toHaveBeenCalledWith('/api/problemas', 'territorio-a'));

    view.rerender(moduleView('territorio-b'));
    await waitFor(() => expect(listEntities).toHaveBeenCalledWith('/api/problemas', 'territorio-b'));
    await act(async () => {
      second.resolve([{
        id: 2,
        workspaceId: 'territorio-b',
        titulo: 'Resposta do território B',
        categoria: 'Água',
        status: 'ABERTO',
        createdAt: '2026-07-10T12:02:00Z'
      }]);
      await second.promise;
    });
    expect(await screen.findByText('Resposta do território B')).toBeInTheDocument();

    await act(async () => {
      first.resolve([{
        id: 1,
        workspaceId: 'territorio-a',
        titulo: 'Resposta tardia do território A',
        categoria: 'Água',
        status: 'ABERTO',
        createdAt: '2026-07-10T12:01:00Z'
      }]);
      await first.promise;
    });

    expect(screen.queryByText('Resposta tardia do território A')).not.toBeInTheDocument();
    expect(screen.getByText('Resposta do território B')).toBeInTheDocument();
  });

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
    const { listLocalObservations } = await import('../lib/offlineStore');
    expect(listLocalObservations).toHaveBeenCalledWith('stable-owner', 'territorio-a');
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
