import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EvidenciasPage from './EvidenciasPage';
import {
  createEvidencia, evidenciaFileUrl, listAcoes, listEvidencias, listObservacoes, listResultados
} from '../lib/api';
import type { Acao, Evidencia, Observacao, Resultado } from '../types';

vi.mock('../lib/api', () => ({
  createEvidencia: vi.fn(),
  evidenciaFileUrl: vi.fn((id: number) => `/api/evidencias/${id}/arquivo`),
  listAcoes: vi.fn(),
  listEvidencias: vi.fn(),
  listObservacoes: vi.fn(),
  listResultados: vi.fn()
}));

const action = { id: 4, workspaceId: 'workspace-a', titulo: 'Limpar a margem' } as Acao;
const observation = { id: 5, workspaceId: 'workspace-a', titulo: 'Resíduos na água' } as Observacao;
const result = { id: 6, workspaceId: 'workspace-a', acaoId: 4, titulo: 'Margem recuperada' } as Resultado;
const evidence = {
  id: 9,
  workspaceId: 'workspace-a',
  subjectType: 'ACAO',
  subjectId: 4,
  title: 'Registro da retirada',
  description: null,
  originalFilename: 'relato.pdf',
  contentType: 'application/pdf',
  sizeBytes: 800,
  sha256: 'abc',
  capturedAt: '2026-07-10T14:20:00Z',
  recordedAt: '2026-07-10T14:25:00Z',
  actorId: 'ana.sp',
  deviceId: null,
  clientMutationId: null,
  hasFile: true
} satisfies Evidencia;

function renderPage(entry = '/evidencias') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'workspace-a' }} />}>
          <Route path="/evidencias" element={<EvidenciasPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('EvidenciasPage', () => {
  beforeEach(() => {
    vi.mocked(listEvidencias).mockResolvedValue([evidence]);
    vi.mocked(listAcoes).mockResolvedValue([action]);
    vi.mocked(listObservacoes).mockResolvedValue([observation]);
    vi.mocked(listResultados).mockResolvedValue([result]);
    vi.mocked(createEvidencia).mockResolvedValue(evidence);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('names the linked record and exposes a download only when the API reports a file', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Registro da retirada' })).toBeInTheDocument();
    expect(screen.getByText('Ação · Limpar a margem')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir arquivo' })).toHaveAttribute(
      'href', '/api/evidencias/9/arquivo'
    );
    expect(screen.getByText('relato.pdf · application/pdf')).toBeInTheDocument();
    expect(screen.getByText('SHA-256 abc')).toBeInTheDocument();
    expect(screen.getByText('Autoria: @ana.sp')).toBeInTheDocument();
    expect(evidenciaFileUrl).toHaveBeenCalledWith(9);
    expect(screen.queryByText(/\bID\b/i)).not.toBeInTheDocument();
  });

  it('consumes a Rastro action link and submits the selected action by its hidden identifier', async () => {
    renderPage('/evidencias?create=1&subjectType=ACAO&subjectId=4');

    const dialog = await screen.findByRole('dialog', { name: 'Nova evidência' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Registro vinculado')).toHaveDisplayValue('Limpar a margem');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Foto depois do mutirão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evidência' }));

    await waitFor(() => expect(createEvidencia).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-a',
      subjectType: 'ACAO',
      subjectId: 4,
      title: 'Foto depois do mutirão'
    })));
  });

  it('does not replace an invalid Rastro subject with the first record', async () => {
    renderPage('/evidencias?create=1&subjectType=ACAO&subjectId=999');

    await screen.findByRole('dialog', { name: 'Nova evidência' });
    expect(screen.getByLabelText('Registro vinculado')).toHaveDisplayValue('Selecione por nome');
  });

  it('keeps the same idempotency key when a submission is retried', async () => {
    vi.mocked(createEvidencia)
      .mockRejectedValueOnce(new Error('resposta perdida'))
      .mockResolvedValueOnce(evidence);
    renderPage('/evidencias?create=1&subjectType=ACAO&subjectId=4');
    await screen.findByRole('dialog', { name: 'Nova evidência' });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Registro do mutirão' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar evidência' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evidência' }));

    await waitFor(() => expect(createEvidencia).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createEvidencia).mock.calls[0][0].clientMutationId).toBe(
      vi.mocked(createEvidencia).mock.calls[1][0].clientMutationId
    );
  });
});
