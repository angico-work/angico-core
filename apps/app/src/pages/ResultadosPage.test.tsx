import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultadosPage from './ResultadosPage';
import { captureDomainMutation } from '../lib/offlineSync';
import { listAcoes, listResultados } from '../lib/api';
import type { Acao, Resultado } from '../types';

vi.mock('../lib/offlineSync', () => ({ captureDomainMutation: vi.fn() }));

vi.mock('../lib/api', () => ({
  listAcoes: vi.fn(),
  listResultados: vi.fn()
}));

const action = { id: 4, workspaceId: 'workspace-a', titulo: 'Limpar a margem' } as Acao;
const result = {
  id: 6,
  workspaceId: 'workspace-a',
  acaoId: 4,
  titulo: 'Margem recuperada',
  descricao: 'Trecho norte sem resíduos.',
  status: 'REGISTRADO',
  actorId: 'ana.sp',
  occurredAt: '2026-07-10T14:20:00Z',
  createdAt: '2026-07-10T14:25:00Z'
} satisfies Resultado;

function renderPage(entry = '/resultados') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'workspace-a', workspaceRole: 'OWNER', canWrite: true }} />}>
          <Route path="/resultados" element={<ResultadosPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ResultadosPage', () => {
  beforeEach(() => {
    vi.mocked(listAcoes).mockResolvedValue([action]);
    vi.mocked(listResultados).mockResolvedValue([result]);
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'result-local-1', status: 'QUEUED'
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the action by name and opens a Rastro link with that action selected', async () => {
    renderPage('/resultados?create=1&acaoId=4');

    expect(await screen.findByRole('dialog', { name: 'Novo resultado' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ação relacionada')).toHaveDisplayValue('Limpar a margem');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Margem recuperada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar resultado' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'RESULTADO_CREATE',
      expect.objectContaining({
        workspaceId: 'workspace-a',
        acaoId: 4,
        titulo: 'Margem recuperada'
      })
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo neste aparelho');
    expect(screen.queryByRole('dialog', { name: 'Novo resultado' })).not.toBeInTheDocument();
  });

  it('keeps an API failure distinct from an empty result list', async () => {
    vi.mocked(listResultados).mockRejectedValue(new Error('resultados indisponíveis'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('resultados indisponíveis');
    expect(screen.queryByText('Nenhum resultado registrado')).not.toBeInTheDocument();
  });

  it('does not replace an unavailable Rastro action with the first action', async () => {
    renderPage('/resultados?create=1&acaoId=999');

    await screen.findByRole('dialog', { name: 'Novo resultado' });
    expect(screen.getByLabelText('Ação relacionada')).toHaveDisplayValue('Selecione por nome');
  });
});
