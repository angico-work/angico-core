import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizacoesPage from './OrganizacoesPage';
import {
  createOrganizacao,
  createParticipacao,
  listMissoes,
  listOrganizacoes,
  listParticipacoes,
  searchPessoas
} from '../lib/api';
import type { MissaoRegistro, Organizacao, Participacao, PessoaHit } from '../types';

vi.mock('../lib/api', () => ({
  createOrganizacao: vi.fn(),
  createParticipacao: vi.fn(),
  listMissoes: vi.fn(),
  listOrganizacoes: vi.fn(),
  listParticipacoes: vi.fn(),
  searchPessoas: vi.fn()
}));

const mission = {
  id: 20,
  workspaceId: 'workspace-a',
  territorioId: '4',
  problemaId: '11',
  responsavelId: '7',
  titulo: 'Recuperar a nascente',
  descricao: null,
  status: 'PLANEJADA',
  progresso: 0,
  createdAt: '2026-07-10T11:00:00Z'
} satisfies MissaoRegistro;

const organization = {
  id: 7,
  workspaceId: 'workspace-a',
  nome: 'Rede da Nascente',
  tipo: 'COLETIVO',
  status: 'ATIVA',
  missaoId: 20,
  missionRelation: 'MOBILIZA',
  actorId: 'ana.sp',
  createdAt: '2026-07-10T12:00:00Z'
} satisfies Organizacao;

const participation = {
  id: 13,
  workspaceId: 'workspace-a',
  organizationId: 7,
  pessoaId: 31,
  papel: 'REPRESENTACAO',
  status: 'ATIVA',
  startedAt: '2026-07-10T13:00:00Z',
  endedAt: null,
  recordedAt: '2026-07-10T13:01:00Z',
  actorId: 'ana.sp'
} satisfies Participacao;

const person = {
  id: 31,
  workspaceId: 'workspace-a',
  nome: 'Mara Lima',
  papel: 'Liderança comunitária',
  angicoId: 'mara.lima',
  telefone: null,
  foto: null,
  createdAt: '2026-07-10T10:00:00Z'
} satisfies PessoaHit;

function renderPage(workspaceId = 'workspace-a') {
  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route index element={<OrganizacoesPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('OrganizacoesPage', () => {
  beforeEach(() => {
    vi.mocked(listOrganizacoes).mockResolvedValue([organization]);
    vi.mocked(listMissoes).mockResolvedValue([mission]);
    vi.mocked(listParticipacoes).mockResolvedValue([participation]);
    vi.mocked(searchPessoas).mockResolvedValue([person]);
    vi.mocked(createOrganizacao).mockResolvedValue(organization);
    vi.mocked(createParticipacao).mockResolvedValue(participation);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows organization type and mission relationship by human names without technical ids', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Rede da Nascente' })).toBeInTheDocument();
    expect(screen.getByText('Coletivo')).toBeInTheDocument();
    expect(screen.getByText('Mobiliza · Recuperar a nascente')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Organizações cadastradas' })).toBeInTheDocument();
    expect(screen.queryByText(/organiza(?:ção|cao)\s*#?7/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/missão\s*#?20/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/\bid\b/i)).not.toBeInTheDocument();
  });

  it('creates an organization with a paired mission relationship selected by name', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Nova organização' }));
    expect(screen.getByRole('dialog', { name: 'Nova organização' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome da organização'), { target: { value: '  Rede da Nascente  ' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'COLETIVO' } });
    fireEvent.change(screen.getByLabelText(/^Missão relacionada/), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Relação com a missão'), { target: { value: 'MOBILIZA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar organização' }));

    await waitFor(() => expect(createOrganizacao).toHaveBeenCalledWith({
      workspaceId: 'workspace-a',
      nome: 'Rede da Nascente',
      tipo: 'COLETIVO',
      missaoId: 20,
      missionRelation: 'MOBILIZA'
    }));
    expect(vi.mocked(createOrganizacao).mock.calls[0]?.[0]).not.toHaveProperty('actorId');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('registers an active participation from a person selected by name', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar participação em Rede da Nascente' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova participação' });
    expect(await within(dialog).findByText('Representação')).toBeInTheDocument();
    expect(within(dialog).getByText('Ativa')).toBeInTheDocument();
    expect(within(dialog).queryByText(/#13|#31/)).not.toBeInTheDocument();

    const personField = within(dialog).getByLabelText('Pessoa');
    fireEvent.change(personField, { target: { value: 'Mara' } });
    await screen.findByRole('option', { name: /Mara Lima/ });
    fireEvent.keyDown(personField, { key: 'ArrowDown' });
    fireEvent.keyDown(personField, { key: 'Enter' });
    fireEvent.change(within(dialog).getByLabelText('Papel'), { target: { value: 'COORDENACAO' } });
    fireEvent.change(within(dialog).getByLabelText('Início da participação'), { target: { value: '2026-07-10T14:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar participação' }));

    await waitFor(() => expect(createParticipacao).toHaveBeenCalledWith(7, {
      workspaceId: 'workspace-a',
      pessoaId: 31,
      papel: 'COORDENACAO',
      status: 'ATIVA',
      startedAt: new Date('2026-07-10T14:00').toISOString(),
      endedAt: null
    }));
    expect(vi.mocked(createParticipacao).mock.calls[0]?.[1]).not.toHaveProperty('actorId');
  });

  it('keeps a loading failure distinct from an empty organization list', async () => {
    vi.mocked(listOrganizacoes).mockRejectedValue(new Error('organizações indisponíveis'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('organizações indisponíveis');
    expect(screen.queryByText('Nenhuma organização cadastrada')).not.toBeInTheDocument();
  });

  it('offers a real creation flow when the workspace has no organizations', async () => {
    vi.mocked(listOrganizacoes).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Nenhuma organização cadastrada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar primeira organização' }));
    expect(screen.getByRole('dialog', { name: 'Nova organização' })).toBeInTheDocument();
  });

  it('lists only active participations as active', async () => {
    vi.mocked(listParticipacoes).mockResolvedValue([
      participation,
      { ...participation, id: 14, papel: 'PARCEIRO', status: 'ENCERRADA', endedAt: '2026-07-10T15:00:00Z' }
    ]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar participação em Rede da Nascente' }));
    const records = await screen.findByRole('region', { name: 'Participações registradas' });
    expect(within(records).getByText('1 participação')).toBeInTheDocument();
    expect(within(records).getByRole('heading', { name: 'Representação' })).toBeInTheDocument();
    expect(within(records).queryByRole('heading', { name: 'Parceiro' })).not.toBeInTheDocument();
  });
});
