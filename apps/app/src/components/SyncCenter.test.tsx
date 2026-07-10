import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SyncCenter from './SyncCenter';
import {
  discardOutboxEntry,
  getSyncMetadata,
  listOutbox,
  reviseObservation
} from '../lib/offlineStore';
import { syncPendingObservations } from '../lib/offlineSync';

vi.mock('../lib/offlineStore', () => ({
  discardOutboxEntry: vi.fn(),
  getSyncMetadata: vi.fn(),
  listOutbox: vi.fn(),
  reviseObservation: vi.fn()
}));

vi.mock('../lib/offlineSync', () => ({
  retryPendingObservations: vi.fn(),
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

describe('SyncCenter', () => {
  beforeEach(() => {
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
    render(<SyncCenter ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);

    expect(await screen.findByText('Nascente sem proteção')).toBeInTheDocument();
    expect(screen.getByText(/Dados locais de @ana.sp/)).toBeInTheDocument();
    expect(screen.getByText(/Último envio concluído/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revisar Nascente sem proteção' })).toBeInTheDocument();
  });

  it('saves a corrected copy with a new operation before explicitly resending it', async () => {
    render(<SyncCenter ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
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
    render(<SyncCenter ownerId="ana.sp" workspaceId="territorio-a" online onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar Nascente sem proteção' }));

    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro' }));
    expect(discardOutboxEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro' }));
    await waitFor(() => expect(discardOutboxEntry).toHaveBeenCalledWith(
      'conflict-1', 'ana.sp', 'territorio-a'
    ));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
