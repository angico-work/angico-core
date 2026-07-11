import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SyncCenter from './SyncCenter';
import {
  discardOutboxEntry,
  getSyncMetadata,
  listOutbox,
  recoverMessageAsDraft,
  reviseObservation
} from '../lib/offlineStore';
import { retryPendingOperations, syncPendingObservations } from '../lib/offlineSync';

vi.mock('../lib/offlineStore', () => ({
  discardOutboxEntry: vi.fn(),
  getSyncMetadata: vi.fn(),
  listOutbox: vi.fn(),
  recoverMessageAsDraft: vi.fn(),
  reviseObservation: vi.fn()
}));

vi.mock('../lib/offlineSync', () => ({
  retryPendingOperations: vi.fn(),
  syncPendingObservations: vi.fn()
}));

const conflict = {
  id: 'conflict-1',
  operation: 'CREATE_OBSERVATION' as const,
  ownerId: 'ana.sp',
  workspaceId: 'territorio-a',
  localEntityKey: 'local-1',
  body: {
    clientMutationId: 'conflict-1',
    workspaceId: 'territorio-a',
    categoria: 'Água e Saneamento',
    titulo: 'Nascente sem proteção',
    descricao: 'Texto original',
    occurredAt: '2026-07-10T12:00:00Z',
    deviceId: 'device-1'
  },
  status: 'CONFLICT' as const,
  attemptCount: 1,
  createdAt: '2026-07-10T12:00:00Z',
  updatedAt: '2026-07-10T12:01:00Z',
  nextAttemptAt: '2026-07-10T12:00:00Z',
  lastError: 'O conteúdo diverge do envio anterior.'
};

const evidenceEntry = {
  ...conflict,
  id: 'evidence-1',
  operation: 'EVIDENCE_CREATE' as const,
  body: {
    workspaceId: 'territorio-a',
    subjectType: 'OBSERVACAO' as const,
    subjectId: 42,
    title: 'Foto da nascente',
    capturedAt: '2026-07-10T12:00:00Z',
    clientMutationId: 'evidence-1',
    deviceId: 'device-1',
    file: {
      blobKey: 'evidence-file-1',
      name: 'nascente.jpg',
      type: 'image/jpeg',
      size: 1200,
      sha256: 'a'.repeat(64)
    }
  },
  status: 'QUEUED' as const
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('SyncCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listOutbox).mockResolvedValue([conflict]);
    vi.mocked(getSyncMetadata).mockResolvedValue({
      key: '["ana.sp","territorio-a"]',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      lastAttemptAt: '2026-07-10T12:01:00Z',
      lastSuccessAt: '2026-07-10T11:30:00Z'
    });
    vi.mocked(reviseObservation).mockResolvedValue({
      ...conflict.body,
      clientMutationId: 'revision-2',
      titulo: 'Nascente revisada'
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('separates review states from sendable work and identifies the local partition', async () => {
    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    expect(await screen.findByText('Nascente sem proteção')).toBeInTheDocument();
    expect(screen.getByText(/Dados locais de @ana.sp/)).toBeInTheDocument();
    expect(screen.getByText(/Último envio concluído/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revisar Nascente sem proteção' })).toBeInTheDocument();
  });

  it('keeps inspection and discard available without allowing a viewer to resend or revise', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <SyncCenter
        ownerId="ana.sp"
        workspaceId="territorio-a"
        online
        canWrite={false}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText('Nascente sem proteção')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar Nascente sem proteção' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
    expect(screen.getByText(/Envios e revisões ficam bloqueados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro: Nascente sem proteção' }));

    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'conflict-1', 'ana.sp', 'territorio-a'
    ));
    expect(confirm).toHaveBeenCalledOnce();
    expect(reviseObservation).not.toHaveBeenCalled();
    expect(syncPendingObservations).not.toHaveBeenCalled();
    expect(retryPendingOperations).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog, closes with Escape and restores the trigger', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Abrir sincronização';
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      <SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={onClose} />
    );

    const close = await screen.findByRole('button', { name: 'Fechar sincronização' });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Sincronização' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('shows a recoverable error when local synchronization data cannot be read', async () => {
    vi.mocked(listOutbox).mockRejectedValue(new Error('armazenamento local indisponível'));

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento local indisponível');
  });

  it('ignores an older local read after the active workspace changes', async () => {
    const firstEntries = deferred<Array<typeof conflict>>();
    const secondEntries = deferred<Array<typeof conflict>>();
    const firstMetadata = deferred<Awaited<ReturnType<typeof getSyncMetadata>>>();
    const secondMetadata = deferred<Awaited<ReturnType<typeof getSyncMetadata>>>();
    vi.mocked(listOutbox).mockImplementation((_ownerId, workspaceId) => (
      workspaceId === 'territorio-a' ? firstEntries.promise : secondEntries.promise
    ));
    vi.mocked(getSyncMetadata).mockImplementation((_ownerId, workspaceId) => (
      workspaceId === 'territorio-a' ? firstMetadata.promise : secondMetadata.promise
    ));
    const workspaceBEntry = {
      ...conflict,
      id: 'conflict-b',
      workspaceId: 'territorio-b',
      localEntityKey: 'local-b',
      body: {
        ...conflict.body,
        clientMutationId: 'conflict-b',
        workspaceId: 'territorio-b',
        titulo: 'Registro do território B'
      }
    };
    const view = render(
      <SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />
    );
    await waitFor(() => expect(listOutbox).toHaveBeenCalledWith('ana.sp', 'territorio-a'));

    view.rerender(
      <SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-b" online onClose={vi.fn()} />
    );
    expect(screen.queryByText('Nascente sem proteção')).not.toBeInTheDocument();
    await waitFor(() => expect(listOutbox).toHaveBeenCalledWith('ana.sp', 'territorio-b'));
    await act(async () => {
      secondEntries.resolve([workspaceBEntry]);
      secondMetadata.resolve({
        key: '["ana.sp","territorio-b"]',
        ownerId: 'ana.sp',
        workspaceId: 'territorio-b',
        lastAttemptAt: '2026-07-10T12:02:00Z'
      });
      await Promise.all([secondEntries.promise, secondMetadata.promise]);
    });
    expect(await screen.findByText('Registro do território B')).toBeInTheDocument();

    await act(async () => {
      firstEntries.resolve([conflict]);
      firstMetadata.resolve({
        key: '["ana.sp","territorio-a"]',
        ownerId: 'ana.sp',
        workspaceId: 'territorio-a',
        lastAttemptAt: '2026-07-10T12:01:00Z'
      });
      await Promise.all([firstEntries.promise, firstMetadata.promise]);
    });

    expect(screen.queryByText('Nascente sem proteção')).not.toBeInTheDocument();
    expect(screen.getByText('Registro do território B')).toBeInTheDocument();
  });

  it('hides the previous workspace records while the next partition is loading', async () => {
    const nextEntries = deferred<Array<typeof conflict>>();
    const nextMetadata = deferred<Awaited<ReturnType<typeof getSyncMetadata>>>();
    vi.mocked(listOutbox).mockImplementation((_ownerId, workspaceId) => (
      workspaceId === 'territorio-a' ? Promise.resolve([conflict]) : nextEntries.promise
    ));
    vi.mocked(getSyncMetadata).mockImplementation((_ownerId, workspaceId) => (
      workspaceId === 'territorio-a'
        ? Promise.resolve({ key: 'a', ownerId: 'ana.sp', workspaceId: 'territorio-a' })
        : nextMetadata.promise
    ));
    const view = render(
      <SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />
    );
    expect(await screen.findByText('Nascente sem proteção')).toBeInTheDocument();

    view.rerender(
      <SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-b" online onClose={vi.fn()} />
    );

    expect(screen.queryByText('Nascente sem proteção')).not.toBeInTheDocument();
  });

  it('saves a corrected copy with a new operation before explicitly resending it', async () => {
    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar Nascente sem proteção' }));
    fireEvent.change(screen.getByLabelText('Título revisado'), { target: { value: 'Nascente revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção e reenviar' }));

    await waitFor(() => expect(reviseObservation).toHaveBeenCalledWith(
      'conflict-1',
      'ana.sp',
      'territorio-a',
      expect.objectContaining({ titulo: 'Nascente revisada' })
    ));
    expect(syncPendingObservations).toHaveBeenCalledWith({
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      entryId: 'revision-2'
    });
  });

  it('requires confirmation before marking a rejected record as discarded', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar Nascente sem proteção' }));

    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro' }));
    expect(discardOutboxEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro' }));
    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'conflict-1', 'ana.sp', 'territorio-a'
    ));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('offers recovery and explicit discard for a rejected message operation', async () => {
    const rejectedMessage = {
      ...conflict,
      id: 'message-conflict-1',
      operation: 'MESSAGE_SEND' as const,
      body: {
        workspaceId: 'territorio-a',
        conversationId: 12,
        body: 'Confirmar a próxima visita.',
        clientMessageId: 'message-conflict-1',
        occurredAt: '2026-07-10T12:00:00Z',
        deviceId: 'device-1',
        attachments: []
      }
    };
    vi.mocked(listOutbox).mockResolvedValue([rejectedMessage]);
    vi.mocked(recoverMessageAsDraft).mockResolvedValue(12);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retomar como rascunho: Confirmar a próxima visita.' }));
    await waitFor(() => expect(recoverMessageAsDraft).toHaveBeenCalledWith(
      'message-conflict-1', 'ana.sp', 'territorio-a'
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Descartar mensagem: Confirmar a próxima visita.' }));
    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'message-conflict-1', 'ana.sp', 'territorio-a'
    ));
  });

  it('identifies queued evidence and its protected local file without offering message recovery', async () => {
    vi.mocked(listOutbox).mockResolvedValue([evidenceEntry]);

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    expect(await screen.findByText('Foto da nascente')).toBeInTheDocument();
    expect(screen.getByText('Evidência · Observação')).toBeInTheDocument();
    expect(screen.getByText('nascente.jpg · image/jpeg')).toBeInTheDocument();
    expect(screen.getByText('O arquivo permanece salvo neste aparelho até a confirmação do envio.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retomar como rascunho/ })).not.toBeInTheDocument();
  });

  it('shows a queued domain command as local work without inventing a remote record', async () => {
    vi.mocked(listOutbox).mockResolvedValue([{
      ...conflict,
      id: 'mission-local-1',
      operation: 'MISSAO_CREATE' as const,
      body: {
        workspaceId: 'territorio-a',
        territorioId: '11',
        problemaId: '12',
        responsavelId: '13',
        titulo: 'Recuperar a nascente'
      },
      status: 'QUEUED' as const
    }]);

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    expect(await screen.findByText('Recuperar a nascente')).toBeInTheDocument();
    expect(screen.getByText('Registro de domínio · Missão')).toBeInTheDocument();
    expect(screen.getByText('Salvo neste aparelho.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar/ })).not.toBeInTheDocument();
  });

  it('allows an explicitly rejected domain command to be discarded locally', async () => {
    vi.mocked(listOutbox).mockResolvedValue([{
      ...conflict,
      id: 'resource-local-1',
      operation: 'RECURSO_CREATE' as const,
      body: {
        workspaceId: 'territorio-a', nome: 'Luvas', categoria: 'MATERIAL' as const, unidade: 'par'
      },
      status: 'ACTION_REQUIRED' as const
    }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar registro: Luvas' }));

    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'resource-local-1', 'ana.sp', 'territorio-a'
    ));
  });

  it('retries a retryable evidence through the explicit synchronization action', async () => {
    vi.mocked(listOutbox).mockResolvedValue([{ ...evidenceEntry, status: 'RETRYABLE_ERROR' }]);

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));

    await waitFor(() => expect(retryPendingOperations).toHaveBeenCalledWith('ana.sp', 'territorio-a'));
  });

  it('requires evidence-specific confirmation before discarding a rejected file', async () => {
    vi.mocked(listOutbox).mockResolvedValue([{ ...evidenceEntry, status: 'ACTION_REQUIRED' }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(<SyncCenter canWrite ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    const discard = await screen.findByRole('button', { name: 'Descartar evidência: Foto da nascente' });
    fireEvent.click(discard);
    expect(discardOutboxEntry).not.toHaveBeenCalled();
    fireEvent.click(discard);

    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'evidence-1', 'ana.sp', 'territorio-a'
    ));
    expect(confirm).toHaveBeenCalledWith(
      'Descartar remove o arquivo local desta evidência e interrompe o envio. O histórico manterá apenas os metadados do descarte. Deseja continuar?'
    );
  });
});
