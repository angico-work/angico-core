import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecursosPage from './RecursosPage';
import { captureDomainMutation } from '../lib/offlineSync';
import {
  listAcoes, listRecursos, listRecursoUsos
} from '../lib/api';
import type { Acao, Recurso, RecursoUso } from '../types';

vi.mock('../lib/offlineSync', () => ({ captureDomainMutation: vi.fn() }));

vi.mock('../lib/api', () => ({
  listAcoes: vi.fn(),
  listRecursos: vi.fn(),
  listRecursoUsos: vi.fn()
}));

const action = { id: 4, workspaceId: 'workspace-a', titulo: 'Limpar a margem' } as Acao;
const resource = {
  id: 5,
  workspaceId: 'workspace-a',
  nome: 'Enxada',
  categoria: 'EQUIPAMENTO',
  unidade: 'unidade',
  descricao: 'Ferramenta do coletivo.',
  status: 'DISPONIVEL',
  actorId: 'ana.sp',
  createdAt: '2026-07-10T14:00:00Z'
} satisfies Recurso;
const usage = {
  id: 6,
  workspaceId: 'workspace-a',
  recursoId: 5,
  acaoId: 4,
  quantidade: 2,
  unidade: 'unidade',
  occurredAt: '2026-07-10T15:00:00Z',
  recordedAt: '2026-07-10T15:05:00Z',
  actorId: 'ana.sp'
} satisfies RecursoUso;

function Page({ workspaceId }: { workspaceId: string }) {
  return (
    <MemoryRouter initialEntries={['/recursos']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId, workspaceRole: 'OWNER', canWrite: true, canManage: true }} />}>
          <Route path="/recursos" element={<RecursosPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(workspaceId = 'workspace-a') {
  return render(<Page workspaceId={workspaceId} />);
}

describe('RecursosPage', () => {
  beforeEach(() => {
    vi.mocked(listAcoes).mockResolvedValue([action]);
    vi.mocked(listRecursos).mockResolvedValue([resource]);
    vi.mocked(listRecursoUsos).mockResolvedValue([usage]);
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'resource-1', status: 'SYNCED', remote: {
        operation: 'RECURSO_CREATE', workspaceId: 'workspace-a',
        clientMutationId: 'resource-1', resourceId: '5'
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows real usage by action name and registers another use in the resource unit', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Enxada' })).toBeInTheDocument();
    expect(screen.getByText('2 unidade · Limpar a margem')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar uso de Enxada' }));
    expect(screen.getByLabelText('Ação')).toHaveDisplayValue('Limpar a margem');
    expect(screen.getByLabelText('Unidade')).toHaveValue('unidade');
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar uso' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'RECURSO_USO_CREATE',
      {
        recursoId: 5,
        payload: expect.objectContaining({
          workspaceId: 'workspace-a', acaoId: 4, quantidade: 2, unidade: 'unidade'
        })
      }
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Sincronização concluída');
  });

  it('creates a resource with a human category and no actor field', async () => {
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'resource-local-1', status: 'QUEUED'
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Novo recurso' }));
    fireEvent.change(screen.getByLabelText('Nome do recurso'), { target: { value: 'Enxada' } });
    fireEvent.change(screen.getByLabelText('Unidade'), { target: { value: 'unidade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar recurso' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'RECURSO_CREATE',
      {
        workspaceId: 'workspace-a',
        nome: 'Enxada',
        categoria: 'MATERIAL',
        unidade: 'unidade',
        descricao: undefined
      }
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo neste aparelho');
    expect(vi.mocked(captureDomainMutation).mock.calls[0][1]).not.toHaveProperty('actorId');
  });

  it('closes a resource modal when the active workspace changes', async () => {
    const view = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar uso de Enxada' }));
    expect(screen.getByRole('dialog', { name: 'Registrar uso de Enxada' })).toBeInTheDocument();

    view.rerender(<Page workspaceId="workspace-b" />);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Registrar uso de Enxada' })).not.toBeInTheDocument());
  });
});
