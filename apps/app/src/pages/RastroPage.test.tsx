import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RastroPage from './RastroPage';
import { listEntities, listTerritorios, loadRastro } from '../lib/api';
import type { PessoaHit, RastroResponse, Territorio } from '../types';

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
    reference: { type: 'MISSAO', id: '20', resource: 'missoes' },
    name: 'Recuperar a nascente',
    status: 'EM_ANDAMENTO',
    occurredAt: '2026-07-09T09:00:00Z',
    recordedAt: '2026-07-09T10:00:00Z',
    syncStatus: 'SYNCED'
  },
  stages: [
    {
      reference: { type: 'TERRITORIO', id: '4', resource: 'territorios' },
      name: 'Nascente Sul', status: 'ATIVO', occurredAt: null,
      recordedAt: '2026-07-08T10:00:00Z', syncStatus: 'SYNCED'
    },
    {
      reference: { type: 'MISSAO', id: '20', resource: 'missoes' },
      name: 'Recuperar a nascente', status: 'EM_ANDAMENTO', occurredAt: '2026-07-09T09:00:00Z',
      recordedAt: '2026-07-09T10:00:00Z', syncStatus: 'SYNCED'
    }
  ],
  relations: [{
    type: 'MISSÃO_ATUA_EM_TERRITÓRIO',
    origin: { type: 'MISSAO', id: '20', resource: 'missoes' },
    destination: { type: 'TERRITORIO', id: '4', resource: 'territorios' },
    actorId: 'ana.sp',
    recordedAt: '2026-07-09T10:00:00Z'
  }],
  events: [{
    id: 'evt-1', type: 'MISSAO_CRIADA',
    subject: { type: 'MISSAO', id: '20', resource: 'missoes' },
    actorId: 'ana.sp', occurredAt: '2026-07-09T09:00:00Z',
    recordedAt: '2026-07-09T10:00:00Z', syncStatus: 'SYNCED'
  }],
  participants: [{
    participant: { type: 'PESSOA', id: '7', resource: 'pessoas' },
    name: 'Ana Souza', status: 'ATIVA', relationType: 'RESPONSAVEL_POR',
    at: { type: 'MISSAO', id: '20', resource: 'missoes' }
  }],
  gaps: [{
    code: 'MISSAO_SEM_ACAO',
    subject: { type: 'MISSAO', id: '20', resource: 'missoes' },
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
      <Route element={<><Outlet context={{ workspaceId, workspaceRole: 'OWNER', canWrite: true, canManage: true }} /><LocationProbe /></>}>
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

  it('offers every trace object type and opens a person through its canonical endpoint', async () => {
    const pessoa: PessoaHit = {
      id: 7,
      workspaceId: 'workspace-a',
      nome: 'Ana Souza',
      papel: 'Mobilizadora',
      angicoId: 'ana.souza',
      telefone: null,
      foto: null,
      createdAt: '2026-07-09T10:00:00Z'
    };
    vi.mocked(listEntities).mockResolvedValue([pessoa]);
    renderPage('/app/rastro');

    const typeSelect = screen.getByLabelText('Tipo de raiz');
    expect(typeSelect.querySelectorAll('option')).toHaveLength(13);
    fireEvent.change(typeSelect, { target: { value: 'PESSOA' } });

    const rootSelect = await screen.findByLabelText('Raiz do Rastro');
    expect(await screen.findByRole('option', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(listEntities).toHaveBeenCalledWith('/api/pessoas', 'workspace-a');
    fireEvent.change(rootSelect, { target: { value: '7' } });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app/rastro/PESSOA/7'));
    expect(loadRastro).toHaveBeenCalledWith('PESSOA', '7', 'workspace-a');
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

  it('links trace references only when type, resource and identifier are safe', async () => {
    vi.mocked(loadRastro).mockResolvedValue({
      ...rastro,
      participants: [
        ...rastro.participants,
        {
          participant: { type: 'PESSOA', id: '../8', resource: 'pessoas' },
          name: 'Identificador inseguro',
          status: 'ATIVA',
          relationType: 'RESPONSAVEL_POR',
          at: { type: 'MISSAO', id: '20', resource: 'missoes' }
        },
        {
          participant: { type: 'PESSOA', id: '8', resource: 'organizacoes' },
          name: 'Recurso incompatível',
          status: 'ATIVA',
          relationType: 'RESPONSAVEL_POR',
          at: { type: 'MISSAO', id: '20', resource: 'missoes' }
        },
        {
          participant: { type: 'PESSOA', id: '9', resource: 'https://example.com/pessoas/9' },
          name: 'Destino externo',
          status: 'ATIVA',
          relationType: 'RESPONSAVEL_POR',
          at: { type: 'MISSAO', id: '20', resource: 'missoes' }
        }
      ]
    });
    renderPage('/app/rastro/MISSAO/20');

    expect(await screen.findByRole('heading', { name: 'Recuperar a nascente' })).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Nascente Sul' })) {
      expect(link).toHaveAttribute('href', '/app/rastro/TERRITORIO/4');
    }
    for (const link of screen.getAllByRole('link', { name: 'Recuperar a nascente' })) {
      expect(link).toHaveAttribute('href', '/app/rastro/MISSAO/20');
    }
    expect(screen.getByRole('link', { name: 'Ana Souza' })).toHaveAttribute('href', '/app/rastro/PESSOA/7');
    expect(screen.getByText('Identificador inseguro').closest('a')).toBeNull();
    expect(screen.getByText('Recurso incompatível').closest('a')).toBeNull();
    expect(screen.getByText('Destino externo').closest('a')).toBeNull();
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

  it('links only gaps backed by a complete creation flow', async () => {
    vi.mocked(loadRastro).mockResolvedValue({
      ...rastro,
      limits: { ...rastro.limits, truncated: false },
      gaps: [
        {
          code: 'TERRITORIO_SEM_ORIGEM',
          subject: { type: 'TERRITORIO', id: '4', resource: 'territorios' },
          reason: 'O território ainda não possui uma observação de origem.',
          nextAction: 'Registrar uma observação vinculada.',
          expectedRelation: null
        },
        {
          code: 'ACAO_SEM_EVIDENCIA',
          subject: { type: 'ACAO', id: '31', resource: 'acoes' },
          reason: 'A ação ainda não possui evidência.',
          nextAction: 'Adicionar uma evidência da ação.',
          expectedRelation: null
        },
        {
          code: 'ACAO_SEM_RESULTADO',
          subject: { type: 'ACAO', id: '31', resource: 'acoes' },
          reason: 'A ação ainda não possui resultado.',
          nextAction: 'Registrar um resultado da ação.',
          expectedRelation: null
        },
        {
          code: 'RESULTADO_SEM_EVIDENCIA',
          subject: { type: 'RESULTADO', id: '41', resource: 'resultados' },
          reason: 'O resultado ainda não possui evidência.',
          nextAction: 'Adicionar uma evidência do resultado.',
          expectedRelation: null
        },
        {
          code: 'RESULTADO_SEM_INDICADOR',
          subject: { type: 'RESULTADO', id: '41', resource: 'resultados' },
          reason: 'O resultado ainda não possui indicador.',
          nextAction: 'Criar um indicador.',
          expectedRelation: null
        },
        {
          code: 'INDICADOR_SEM_MEDICAO',
          subject: { type: 'INDICADOR', id: '51', resource: 'indicadores' },
          reason: 'O indicador ainda não possui medição.',
          nextAction: 'Registrar uma medição.',
          expectedRelation: null
        },
        {
          code: 'LACUNA_SEM_FLUXO',
          subject: { type: 'MISSAO', id: '20', resource: 'missoes' },
          reason: 'Fluxo ainda não implementado.',
          nextAction: 'Aguardar.',
          expectedRelation: null
        }
      ]
    });
    renderPage('/app/rastro/ACAO/31');

    const observationLink = await screen.findByRole('link', { name: 'Registrar observação' });
    expect(observationLink).toHaveAttribute('href', '/app/observacoes?create=1&territorioId=4');
    expect(screen.getByRole('link', { name: 'Adicionar evidência da ação' })).toHaveAttribute('href', '/app/evidencias?create=1&subjectType=ACAO&subjectId=31');
    expect(screen.getByRole('link', { name: 'Registrar resultado' })).toHaveAttribute('href', '/app/resultados?create=1&acaoId=31');
    expect(screen.getByRole('link', { name: 'Adicionar evidência do resultado' })).toHaveAttribute('href', '/app/evidencias?create=1&subjectType=RESULTADO&subjectId=41');
    expect(screen.getByRole('link', { name: 'Criar indicador' })).toHaveAttribute('href', '/app/indicadores?create=indicador&resultadoId=41');
    expect(screen.getByRole('link', { name: 'Registrar medição' })).toHaveAttribute('href', '/app/indicadores?create=medicao&indicadorId=51');
    expect(screen.getByText('Fluxo ainda não implementado.').closest('li')?.querySelector('a')).toBeNull();
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
