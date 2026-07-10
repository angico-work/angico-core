import type { Observacao, ObservacaoInput } from '../types';
import { apiFetch, apiUrl, getSession, hasFreshOfflineSession, isAuthenticated } from './api';
import {
  claimOutboxEntry,
  enqueueObservation,
  getLocalObservation,
  listOutbox,
  markOutboxStatus,
  requeueBlockedOutbox,
  type OutboxEntry,
  type OutboxStatus
} from './offlineStore';

export interface SyncSummary {
  attempted: number;
  synced: number;
  retryable: number;
  conflicts: number;
  blocked: number;
  actionRequired: number;
}

export interface SyncState {
  pending: number;
  syncing: number;
  conflicts: number;
  blocked: number;
  actionRequired: number;
}

export interface CaptureResult {
  clientMutationId: string;
  status: OutboxStatus;
  remote?: Observacao;
}

interface SyncFilter {
  ownerId?: string;
  workspaceId?: string;
  entryId?: string;
}

function ownerFromSession(): string | undefined {
  const session = getSession();
  if (!session) return undefined;
  return session.angicoId || `pessoa-${session.pessoaId}`;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { detail?: string; message?: string };
    return body.detail || body.message || fallback;
  } catch {
    return fallback;
  }
}

function retryAt(attemptCount: number): string {
  const delay = Math.min(300_000, 5_000 * (2 ** Math.max(0, attemptCount - 1)));
  return new Date(Date.now() + delay).toISOString();
}

function emptySummary(): SyncSummary {
  return {
    attempted: 0,
    synced: 0,
    retryable: 0,
    conflicts: 0,
    blocked: 0,
    actionRequired: 0
  };
}

async function sendObservation(entry: OutboxEntry): Promise<Response> {
  return apiFetch(apiUrl('/api/observacoes'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': entry.id
    },
    body: JSON.stringify(entry.body)
  });
}

async function synchronizeEntry(entry: OutboxEntry, summary: SyncSummary): Promise<boolean> {
  summary.attempted += 1;
  try {
    const response = await sendObservation(entry);
    if (response.ok) {
      const remote = await response.json() as Observacao;
      await markOutboxStatus(entry.id, 'SYNCED', { remote });
      summary.synced += 1;
      return true;
    }

    const message = await errorMessage(response, `Falha de sincronização (HTTP ${response.status}).`);
    if (response.status === 401) {
      await markOutboxStatus(entry.id, 'BLOCKED', { message });
      summary.blocked += 1;
      return false;
    }
    if (response.status === 409) {
      await markOutboxStatus(entry.id, 'CONFLICT', { message });
      summary.conflicts += 1;
      return true;
    }
    if ([400, 403, 404, 413, 422].includes(response.status)) {
      await markOutboxStatus(entry.id, 'ACTION_REQUIRED', { message });
      summary.actionRequired += 1;
      return true;
    }

    await markOutboxStatus(entry.id, 'RETRYABLE_ERROR', {
      message,
      nextAttemptAt: retryAt(entry.attemptCount)
    });
    summary.retryable += 1;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sem conexão com o servidor.';
    await markOutboxStatus(entry.id, 'RETRYABLE_ERROR', {
      message,
      nextAttemptAt: retryAt(entry.attemptCount)
    });
    summary.retryable += 1;
    return true;
  }
}

export async function syncPendingObservations(filter: SyncFilter = {}): Promise<SyncSummary> {
  const ownerId = filter.ownerId ?? ownerFromSession();
  const summary = emptySummary();
  if (!ownerId) return summary;

  const entries = (await listOutbox(ownerId, filter.workspaceId))
    .filter((entry) => !filter.entryId || entry.id === filter.entryId);
  for (const entry of entries) {
    const claimed = await claimOutboxEntry(entry.id);
    if (!claimed) continue;
    const mayContinue = await synchronizeEntry(claimed, summary);
    if (!mayContinue) break;
  }
  return summary;
}

export async function retryBlockedObservations(ownerId: string, workspaceId: string): Promise<SyncSummary> {
  if (!isAuthenticated() || !hasFreshOfflineSession()) {
    throw new Error('Entre novamente com uma sessão validada antes de tentar enviar registros bloqueados.');
  }
  await requeueBlockedOutbox(ownerId, workspaceId);
  return syncPendingObservations({ ownerId, workspaceId });
}

export async function captureObservation(input: ObservacaoInput): Promise<CaptureResult> {
  const ownerId = ownerFromSession();
  if (!ownerId) throw new Error('Entre novamente para identificar o autor do registro.');
  const queued = await enqueueObservation(input, ownerId);
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    await syncPendingObservations({
      ownerId,
      workspaceId: input.workspaceId,
      entryId: queued.clientMutationId
    });
  }
  const local = await getLocalObservation(ownerId, input.workspaceId, queued.clientMutationId);
  return {
    clientMutationId: queued.clientMutationId,
    status: local?.syncStatus ?? 'QUEUED',
    remote: local?.remote
  };
}

export async function getSyncState(ownerId: string, workspaceId?: string): Promise<SyncState> {
  const entries = await listOutbox(ownerId, workspaceId);
  return entries.reduce<SyncState>((state, entry) => {
    if (entry.status === 'SYNCING') state.syncing += 1;
    if (['QUEUED', 'RETRYABLE_ERROR'].includes(entry.status)) state.pending += 1;
    if (entry.status === 'CONFLICT') state.conflicts += 1;
    if (entry.status === 'BLOCKED') state.blocked += 1;
    if (entry.status === 'ACTION_REQUIRED') state.actionRequired += 1;
    return state;
  }, { pending: 0, syncing: 0, conflicts: 0, blocked: 0, actionRequired: 0 });
}

export function startSyncEngine(): () => void {
  const synchronize = () => {
    if (navigator.onLine) void syncPendingObservations();
  };
  window.addEventListener('online', synchronize);
  const interval = window.setInterval(synchronize, 30_000);
  synchronize();
  return () => {
    window.removeEventListener('online', synchronize);
    window.clearInterval(interval);
  };
}
