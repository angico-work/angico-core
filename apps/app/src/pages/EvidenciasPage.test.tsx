import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EvidenciasPage from './EvidenciasPage';
import {
  evidenciaFileUrl, listAcoes, listEvidencias, listObservacoes, listResultados
} from '../lib/api';
import { listLocalEvidences } from '../lib/offlineStore';
import { captureEvidence } from '../lib/offlineSync';
import type { Acao, Evidencia, Observacao, Resultado } from '../types';

vi.mock('../lib/api', () => ({
  evidenciaFileUrl: vi.fn((id: number) => `/api/evidencias/${id}/arquivo`),
  listAcoes: vi.fn(),
  listEvidencias: vi.fn(),
  listObservacoes: vi.fn(),
  listResultados: vi.fn(),
  sessionOwnerId: vi.fn(() => 'ana.sp')
}));

vi.mock('../lib/offlineStore', () => ({ listLocalEvidences: vi.fn() }));
vi.mock('../lib/offlineSync', () => ({ captureEvidence: vi.fn() }));

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
  clientMutationId: 'evidence-local-1',
  hasFile: true
} satisfies Evidencia;

const localEvidence = {
  key: 'local-evidence-1',
  ownerId: 'ana.sp',
  workspaceId: 'workspace-a',
  clientMutationId: 'evidence-local-1',
  data: {
    workspaceId: 'workspace-a',
    subjectType: 'ACAO' as const,
    subjectId: 4,
    title: 'Foto aguardando envio',
    capturedAt: '2026-07-10T14:20:00Z',
    deviceId: 'device-1',
    clientMutationId: 'evidence-local-1',
    file: {
      blobKey: 'blob-1', name: 'nascente.jpg', type: 'image/jpeg', size: 1200,
      sha256: 'a'.repeat(64)
    }
  },
  syncStatus: 'QUEUED' as const,
  updatedAt: '2026-07-10T14:21:00Z'
};

function renderPage(entry = '/evidencias') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'workspace-a', workspaceRole: 'OWNER', canWrite: true, canManage: true }} />}>
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
    vi.mocked(listLocalEvidences).mockResolvedValue([]);
    vi.mocked(captureEvidence).mockResolvedValue({
      clientMutationId: 'evidence-local-1', status: 'SYNCED', remote: evidence
    });
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

    await waitFor(() => expect(captureEvidence).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-a',
      subjectType: 'ACAO',
      subjectId: 4,
      title: 'Foto depois do mutirão'
    })));
    expect(vi.mocked(captureEvidence).mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('does not replace an invalid Rastro subject with the first record', async () => {
    renderPage('/evidencias?create=1&subjectType=ACAO&subjectId=999');

    await screen.findByRole('dialog', { name: 'Nova evidência' });
    expect(screen.getByLabelText('Registro vinculado')).toHaveDisplayValue('Selecione por nome');
  });

  it('shows a queued local evidence and its file without inventing a remote id', async () => {
    vi.mocked(listEvidencias).mockResolvedValue([]);
    vi.mocked(listLocalEvidences).mockResolvedValue([localEvidence]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Foto aguardando envio' })).toBeInTheDocument();
    expect(screen.getByText('Salva neste aparelho')).toBeInTheDocument();
    expect(screen.getByText('nascente.jpg · image/jpeg')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir arquivo' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Evidência #/)).not.toBeInTheDocument();
  });

  it('reconciles a synchronized local evidence with the same remote record without duplication', async () => {
    vi.mocked(listLocalEvidences).mockResolvedValue([{
      ...localEvidence,
      syncStatus: 'SYNCED',
      remote: evidence
    }]);
    renderPage();

    expect(await screen.findAllByRole('heading', { name: 'Registro da retirada' })).toHaveLength(1);
  });

  it('does not claim a local file exists when the queued evidence has none', async () => {
    vi.mocked(listEvidencias).mockResolvedValue([]);
    vi.mocked(listLocalEvidences).mockResolvedValue([{
      ...localEvidence,
      data: { ...localEvidence.data, file: undefined }
    }]);
    renderPage();

    expect(await screen.findByText('Registro salvo neste aparelho')).toBeInTheDocument();
    expect(screen.queryByText('Arquivo salvo neste aparelho')).not.toBeInTheDocument();
  });
});
