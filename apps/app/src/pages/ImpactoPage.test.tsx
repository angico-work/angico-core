import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImpactoPage from './ImpactoPage';
import { captureDomainMutation } from '../lib/offlineSync';
import {
  listIndicadores, listMedicoes, listResultados, listTerritorios
} from '../lib/api';
import type { Indicador, Medicao, Resultado, Territorio } from '../types';

vi.mock('../lib/offlineSync', () => ({ captureDomainMutation: vi.fn() }));

vi.mock('../lib/api', () => ({
  listIndicadores: vi.fn(),
  listMedicoes: vi.fn(),
  listResultados: vi.fn(),
  listTerritorios: vi.fn()
}));

const territory = { id: 3, workspaceId: 'workspace-a', nome: 'Vila da Serra' } as Territorio;
const result = { id: 4, workspaceId: 'workspace-a', titulo: 'Margem recuperada' } as Resultado;
const indicator = {
  id: 7,
  workspaceId: 'workspace-a',
  territorioId: 3,
  nome: 'Trechos protegidos',
  unidade: 'trechos',
  descricao: null,
  status: 'ATIVO',
  createdAt: '2026-07-10T14:00:00Z',
  updatedAt: '2026-07-10T14:00:00Z'
} satisfies Indicador;
const measurement = {
  id: 8,
  workspaceId: 'workspace-a',
  indicadorId: 7,
  valor: 3,
  unidade: 'trechos',
  fonte: 'Contagem de campo',
  actorId: 'ana.sp',
  measuredAt: '2026-07-10T15:00:00Z',
  createdAt: '2026-07-10T15:05:00Z'
} satisfies Medicao;

function renderPage(entry = '/indicadores') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'workspace-a' }} />}>
          <Route path="/indicadores" element={<ImpactoPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ImpactoPage', () => {
  beforeEach(() => {
    vi.mocked(listTerritorios).mockResolvedValue([territory]);
    vi.mocked(listResultados).mockResolvedValue([result]);
    vi.mocked(listIndicadores).mockResolvedValue([indicator]);
    vi.mocked(listMedicoes).mockResolvedValue([measurement]);
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'impact-1', status: 'SYNCED', remote: {
        operation: 'INDICADOR_CREATE', workspaceId: 'workspace-a',
        clientMutationId: 'impact-1', resourceId: '7'
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates an indicator with territory and optional result selected by name', async () => {
    renderPage('/indicadores?create=indicador&resultadoId=4');

    expect(await screen.findByRole('dialog', { name: 'Novo indicador' })).toBeInTheDocument();
    expect(screen.getByLabelText('Território')).toHaveDisplayValue('Vila da Serra');
    expect(screen.getByLabelText(/Resultado relacionado/)).toHaveDisplayValue('Margem recuperada');
    fireEvent.change(screen.getByLabelText('Nome do indicador'), { target: { value: 'Trechos protegidos' } });
    fireEvent.change(screen.getByLabelText('Unidade'), { target: { value: 'trechos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar indicador' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'INDICADOR_CREATE',
      expect.objectContaining({
        workspaceId: 'workspace-a',
        territorioId: 3,
        resultadoId: 4,
        nome: 'Trechos protegidos'
      })
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Sincronização concluída');
  });

  it('creates a measurement with the indicator selected by name and its real unit', async () => {
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'measurement-local-1', status: 'QUEUED'
    });
    renderPage('/indicadores?create=medicao&indicadorId=7');

    expect(await screen.findByRole('dialog', { name: 'Nova medição' })).toBeInTheDocument();
    expect(screen.getByLabelText('Indicador')).toHaveDisplayValue('Trechos protegidos');
    expect(screen.getByLabelText('Unidade')).toHaveValue('trechos');
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar medição' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'MEDICAO_CREATE',
      expect.objectContaining({
        workspaceId: 'workspace-a',
        indicadorId: 7,
        valor: 3,
        unidade: 'trechos'
      })
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo neste aparelho');
    expect(screen.queryByRole('dialog', { name: 'Nova medição' })).not.toBeInTheDocument();
  });

  it('shows measurements as real records under an accessible tab', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Trechos protegidos' });
    const measurementsTab = screen.getByRole('tab', { name: 'Medições' });
    expect(measurementsTab).toHaveAttribute('aria-controls', 'impact-measurements-panel');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Indicadores' }), { key: 'ArrowRight' });

    expect(screen.getByText('3 trechos')).toBeInTheDocument();
    expect(measurementsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Indicador · Trechos protegidos')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Medições' })).toHaveAttribute('id', 'impact-measurements-panel');
  });

  it('does not replace an unavailable Rastro indicator with the first indicator', async () => {
    renderPage('/indicadores?create=medicao&indicadorId=999');

    await screen.findByRole('dialog', { name: 'Nova medição' });
    expect(screen.getByLabelText('Indicador')).toHaveDisplayValue('Selecione por nome');
  });
});
