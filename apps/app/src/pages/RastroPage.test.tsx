import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RastroPage from './RastroPage';
import { listEntities, listTerritorios, loadRastro } from '../lib/api';
import type { RastroResponse, Territorio } from '../types';

vi.mock('../lib/api', () => ({
  listEntities: vi.fn(),
  listTerritorios: vi.fn(),
  loadRastro: vi.fn()
}));

const territorio: Territorio = {
  id: 4,
  workspaceId: 'workspace-a',
  nome: 'Nascente Sul',
  tipo: 'MICROBACIA',
  cidade: 'Recife',
  bairro: 'Várzea',
  estado: 'PE',
  pais: 'Brasil',
  latitude: null,
  longitude: null,
  boundingBox: [],
  status: 'ATIVO',
  updatedAt: '2026-07-10T10:00:00Z'
};

const rastro: RastroResponse = {
  workspaceId: 'workspace-a',
  root: {
    reference: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
    name: 'Recuperar a nascente',
    status: 'EM_ANDAMENTO',
    occurredAt: '2026-07-09T09:00:00Z',
    recordedAt: '2026-07-09T10:00:00Z',
    syncStatus: 'SYNCED'
  },
  stages: [
    {
      reference: { type: 'TERRITORIO', id: '4', resource: '/api/territorios/4' },
      name: 'Nascente Sul', status: 'ATIVO', occurredAt: null,
      recordedAt: '2026-07-08T10:00:00Z', syncStatus: 'SYNCED'
    },
    {
      reference: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
      name: 'Recuperar a nascente', status: 'EM_ANDAMENTO', occurredAt: '2026-07-09T09:00:00Z',
      recordedAt: '2026-07-09T10:00:00Z', syncStatus: 'SYNCED'
    }
  ],
  relations: [{
    type: 'MISSÃO_ATUA_EM_TERRITÓRIO',
    origin: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
    destination: { type: 'TERRITORIO', id: '4', resource: '/api/territorios/4' },
    actorId: 'ana.sp',
    recordedAt: '2026-07-09T10:00:00Z'
  }],
  events: [{
    id: 'evt-1', type: 'MISSAO_CRIADA',
    subject: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
    actorId: 'ana.sp', occurredAt: '2026-07-09T09:00:00Z',
    recordedAt: '2026-07-09T10:00:00Z', syncStatus: 'SYNCED'
  }],
  participants: [{
    participant: { type: 'PESSOA', id: '7', resource: '/api/pessoas/7' },
    name: 'Ana Souza', status: 'ATIVA', relationType: 'RESPONSAVEL_POR',
    at: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' }
  }],
  gaps: [{
    code: 'MISSAO_SEM_ACAO',
    subject: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
    reason: 'A missão ainda não possui ação registrada.',
    nextAction: 'Registrar uma ação vinculada à missão.',
    expectedRelation: { originType: 'ACAO', relationType: 'EXECUTA', destinationType: 'MISSAO' }
  }],
  limits: { maxNodes: 100, maxRelations: 200, maxEvents: 300, truncated: true },
  asOf: '2026-07-10T14:00:00Z'
};

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
}

function RouteTree({ workspaceId }: { workspaceId: string }) {
  return (
    <Routes>
      <Route element={<><Outlet context={{ workspaceId }} /><LocationProbe /></>}>
        <Route path="/app/rastro" element={<RastroPage />} />
        <Route path="/app/rastro/:rootType/:rootId" element={<RastroPage />} />
      </Route>
    </Routes>
  );
}

function PageUnderTest({ path, workspaceId }: { path: string; workspaceId: string }) {
  return <MemoryRouter initialEntries={[path]}><RouteTree workspaceId={workspaceId} /></MemoryRouter>;
}

function renderPage(path: string, workspaceId = 'workspace-a') {
  return render(<PageUnderTest path={path} workspaceId={workspaceId} />);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('RastroPage', () => {
  beforeEach(() => {
    vi.mocked(listTerritorios).mockResolvedValue([territorio]);
    vi.mocked(listEntities).mockResolvedValue([]);
    vi.mocked(loadRastro).mockResolvedValue(rastro);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('chooses a real root by name and opens its deep link', async () => {
    renderPage('/app/rastro');

    const rootSelect = await screen.findByLabelText('Raiz do Rastro');
    expect(screen.getByRole('option', { name: 'Nascente Sul' })).toBeInTheDocument();
    fireEvent.change(rootSelect, { target: { value: '4' } });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app/rastro/TERRITORIO/4'));
    expect(loadRastro).toHaveBeenCalledWith('TERRITORIO', '4', 'workspace-a');
  });

  it('renders a deep-linked trace in backend order with provenance and actionable gaps', async () => {
    renderPage('/app/rastro/MISSAO/20');

    expect(await screen.findByRole('heading', { name: 'Recuperar a nascente' })).toBeInTheDocument();
    const stages = screen.getAllByTestId('rastro-stage');
    expect(stages[0]).toHaveTextContent('Nascente Sul');
    expect(stages[1]).toHaveTextContent('Recuperar a nascente');
    expect(screen.getByText(/Ocorrido em/)).toBeInTheDocument();
    expect(screen.getAllByText(/Registrado em/).length).toBeGreaterThan(0);
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getAllByText(/Autoria: @ana.sp/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Autoria: 7/)).not.toBeInTheDocument();
    expect(screen.getByText('Rastro limitado').closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText('A missão ainda não possui ação registrada.')).toBeInTheDocument();

    const action = screen.getByRole('link', { name: 'Registrar ação' });
    expect(action).toHaveAttribute('href', '/app/acoes?create=1&missaoId=20');
  });

  it('shows an honest empty state when the workspace has no root of the selected type', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    renderPage('/app/rastro');

    expect(await screen.findByText(/Nenhum território disponível neste espaço/)).toBeInTheDocument();
    expect(loadRastro).not.toHaveBeenCalled();
  });

  it('reports a trace failure instead of presenting an empty result', async () => {
    vi.mocked(loadRastro).mockRejectedValue(new Error('Rastro indisponível.'));
    renderPage('/app/rastro/ACAO/31');

    expect(await screen.findByRole('alert')).toHaveTextContent('Rastro indisponível');
  });

  it('links only gap actions that already exist in the app', async () => {
    vi.mocked(loadRastro).mockResolvedValue({
      ...rastro,
      limits: { ...rastro.limits, truncated: false },
      gaps: [
        {
          code: 'TERRITORIO_SEM_ORIGEM',
          subject: { type: 'TERRITORIO', id: '4', resource: '/api/territorios/4' },
          reason: 'O território ainda não possui uma observação de origem.',
          nextAction: 'Registrar uma observação vinculada.',
          expectedRelation: null
        },
        {
          code: 'ACAO_SEM_EVIDENCIA',
          subject: { type: 'ACAO', id: '31', resource: '/api/acoes/31' },
          reason: 'A ação ainda não possui evidência.',
          nextAction: 'Adicionar uma evidência da ação.',
          expectedRelation: null
        }
      ]
    });
    renderPage('/app/rastro/ACAO/31');

    const observationLink = await screen.findByRole('link', { name: 'Registrar observação' });
    expect(observationLink).toHaveAttribute('href', '/app/observacoes?create=1&territorioId=4');
    expect(screen.getByText('Próximo passo: Adicionar uma evidência da ação.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /evidência/i })).not.toBeInTheDocument();
  });

  it('does not render a late trace response from the previous workspace', async () => {
    const first = deferred<RastroResponse>();
    const second = deferred<RastroResponse>();
    vi.mocked(loadRastro).mockImplementation((_type, _id, workspaceId) => (
      workspaceId === 'workspace-a' ? first.promise : second.promise
    ));
    const view = renderPage('/app/rastro/MISSAO/20', 'workspace-a');

    view.rerender(<PageUnderTest path="/app/rastro/MISSAO/20" workspaceId="workspace-b" />);
    second.resolve({ ...rastro, workspaceId: 'workspace-b', root: { ...rastro.root, name: 'Missão do espaço B' } });
    expect(await screen.findByRole('heading', { name: 'Missão do espaço B' })).toBeInTheDocument();

    await act(async () => first.resolve({ ...rastro, root: { ...rastro.root, name: 'Missão antiga do espaço A' } }));
    expect(screen.queryByRole('heading', { name: 'Missão antiga do espaço A' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missão do espaço B' })).toBeInTheDocument();
  });
});
