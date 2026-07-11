import type { Evidencia, EvidenciaInput, Mensagem, Observacao, ObservacaoInput } from '../types';
import { apiFetch, apiUrl, hasFreshOfflineSession, isAuthenticated, sessionOwnerId } from './api';
import {
  claimOutboxEntry,
  enqueueMessage,
  enqueueObservation,
  enqueueEvidence,
  getEvidenceFile,
  getLocalEvidence,
  getLocalMessage,
  getLocalObservation,
  getMessageAttachmentFile,
  listOutbox,
  markOutboxStatus,
  messageAttachmentsMatch,
  recordSyncAttempt,
  requeueManualOutbox,
  renewOutboxLease,
  type MessageOutboxEntry,
  type EvidenceOutboxEntry,
  type ObservationOutboxEntry,
  type OutboxEntry,
  type OutboxClaim,
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

export interface CaptureMessageResult {
  clientMessageId: string;
  status: OutboxStatus;
  remote?: Mensagem;
}

export interface CaptureEvidenceResult {
  clientMutationId: string;
  status: OutboxStatus;
  remote?: Evidencia;
}

interface SyncFilter {
  ownerId?: string;
  workspaceId?: string;
  entryId?: string;
}

const activeEntries = new Set<string>();

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

class SyncIdentityChangedError extends Error {}

function hasActiveSyncIdentity(ownerId: string): boolean {
  if (sessionOwnerId() !== ownerId) return false;
  if (!isAuthenticated() || !hasFreshOfflineSession()) return false;
  return sessionOwnerId() === ownerId;
}

function requireActiveSyncIdentity(ownerId: string): void {
  if (!hasActiveSyncIdentity(ownerId)) throw new SyncIdentityChangedError();
}

async function sendObservation(entry: ObservationOutboxEntry): Promise<Response> {
  requireActiveSyncIdentity(entry.ownerId);
  return apiFetch(apiUrl('/api/observacoes'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': entry.id
    },
    body: JSON.stringify(entry.body)
  });
}

class PermanentMessageOperationError extends Error {}

async function sendMessage(entry: MessageOutboxEntry): Promise<Response> {
  requireActiveSyncIdentity(entry.ownerId);
  if (!Number.isSafeInteger(entry.body.conversationId) || entry.body.conversationId <= 0) {
    throw new PermanentMessageOperationError('A conversa desta mensagem não é válida.');
  }
  const form = new FormData();
  if (entry.body.body) form.append('corpo', entry.body.body);
  form.append('clientMessageId', entry.body.clientMessageId);
  form.append('deviceId', entry.body.deviceId);
  form.append('occurredAt', entry.body.occurredAt);
  for (const attachment of entry.body.attachments) {
    const file = await getMessageAttachmentFile(attachment.blobKey, entry.ownerId, entry.workspaceId);
    if (!file) {
      throw new PermanentMessageOperationError(`O anexo “${attachment.name}” não está mais neste aparelho.`);
    }
    requireActiveSyncIdentity(entry.ownerId);
    form.append('attachments', file, file.name);
  }
  requireActiveSyncIdentity(entry.ownerId);
  return apiFetch(apiUrl(`/api/mensagens/conversas/${entry.body.conversationId}/mensagens`), {
    method: 'POST',
    headers: { 'Idempotency-Key': entry.id },
    body: form
  });
}

async function sendEvidence(entry: EvidenceOutboxEntry): Promise<Response> {
  requireActiveSyncIdentity(entry.ownerId);
  const form = new FormData();
  form.append('workspaceId', entry.body.workspaceId);
  form.append('subjectType', entry.body.subjectType);
  form.append('subjectId', String(entry.body.subjectId));
  form.append('title', entry.body.title);
  if (entry.body.description) form.append('description', entry.body.description);
  form.append('capturedAt', entry.body.capturedAt);
  form.append('deviceId', entry.body.deviceId);
  form.append('clientMutationId', entry.body.clientMutationId);
  if (entry.body.file) {
    const file = await getEvidenceFile(entry.body.file.blobKey, entry.ownerId, entry.workspaceId);
    if (!file) {
      throw new PermanentMessageOperationError(`O arquivo “${entry.body.file.name}” não está mais neste aparelho.`);
    }
    requireActiveSyncIdentity(entry.ownerId);
    form.append('file', file, file.name);
  }
  requireActiveSyncIdentity(entry.ownerId);
  return apiFetch(apiUrl('/api/evidencias'), {
    method: 'POST',
    headers: { 'Idempotency-Key': entry.id },
    body: form
  });
}

function isConfirmedEvidence(value: unknown, entry: EvidenceOutboxEntry): value is Evidencia {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Evidencia>;
  const identityMatches = Number.isSafeInteger(record.id)
    && Number(record.id) > 0
    && record.workspaceId === entry.workspaceId
    && record.subjectType === entry.body.subjectType
    && record.subjectId === entry.body.subjectId
    && record.clientMutationId === entry.id;
  if (!identityMatches) return false;
  if (!entry.body.file) return record.hasFile === false;
  return record.hasFile === true
    && record.sizeBytes === entry.body.file.size
    && typeof record.sha256 === 'string'
    && record.sha256.toLowerCase() === entry.body.file.sha256;
}

function isConfirmedObservation(value: unknown, entry: ObservationOutboxEntry): value is Observacao {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Observacao>;
  return Number.isSafeInteger(record.id)
    && Number(record.id) > 0
    && record.workspaceId === entry.workspaceId
    && record.clientMutationId === entry.id;
}

function sameAttachments(entry: MessageOutboxEntry, message: Partial<Mensagem>): boolean {
  if (!Array.isArray(message.anexos)) return false;
  return messageAttachmentsMatch(entry.body.attachments, message.anexos);
}

function isConfirmedMessage(value: unknown, entry: MessageOutboxEntry): value is Mensagem {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Mensagem>;
  return Number.isSafeInteger(record.id)
    && Number(record.id) > 0
    && record.workspaceId === entry.workspaceId
    && record.conversaId === entry.body.conversationId
    && record.clientMessageId === entry.id
    && sameAttachments(entry, record);
}

async function parseRemote(entry: OutboxEntry, response: Response): Promise<Observacao | Mensagem | Evidencia> {
  const remote = await response.json() as unknown;
  if (response.status !== 201) throw new Error('A confirmação do registro é inválida.');
  if (entry.operation === 'CREATE_OBSERVATION' && !isConfirmedObservation(remote, entry)) {
    throw new Error('A confirmação da observação é inválida.');
  }
  if (entry.operation === 'MESSAGE_SEND' && !isConfirmedMessage(remote, entry)) {
    throw new Error('A confirmação da mensagem é inválida.');
  }
  if (entry.operation === 'EVIDENCE_CREATE' && !isConfirmedEvidence(remote, entry)) {
    throw new Error('A confirmação da evidência é inválida.');
  }
  return remote as Observacao | Mensagem | Evidencia;
}

function claimOf(entry: OutboxEntry): OutboxClaim {
  return {
    leaseId: entry.leaseId!,
    leaseGeneration: entry.leaseGeneration!
  };
}

function maintainLease(entry: OutboxEntry, claim: OutboxClaim): () => void {
  const timer = window.setInterval(() => {
    void renewOutboxLease(entry.id, claim).then((renewed) => {
      if (!renewed) window.clearInterval(timer);
    }).catch(() => window.clearInterval(timer));
  }, 10_000);
  return () => window.clearInterval(timer);
}

async function releaseClaim(entry: OutboxEntry, claim: OutboxClaim): Promise<void> {
  await markOutboxStatus(entry.id, 'QUEUED', { expectedClaim: claim });
}

async function keepClaimForActiveOwner(entry: OutboxEntry, claim: OutboxClaim): Promise<boolean> {
  if (hasActiveSyncIdentity(entry.ownerId)) return true;
  await releaseClaim(entry, claim);
  return false;
}

async function synchronizeEntry(entry: OutboxEntry, summary: SyncSummary): Promise<boolean> {
  const claim = claimOf(entry);
  if (!await keepClaimForActiveOwner(entry, claim)) return false;
  summary.attempted += 1;
  await recordSyncAttempt(entry.ownerId, entry.workspaceId, false);
  if (!await keepClaimForActiveOwner(entry, claim)) return false;
  const stopRenewal = maintainLease(entry, claim);
  try {
    const response = entry.operation === 'CREATE_OBSERVATION'
      ? await sendObservation(entry)
      : entry.operation === 'MESSAGE_SEND'
        ? await sendMessage(entry)
        : await sendEvidence(entry);
    const signedOutByUnauthorized = response.status === 401 && !sessionOwnerId();
    if (!signedOutByUnauthorized && !await keepClaimForActiveOwner(entry, claim)) return false;
    if (response.ok) {
      const remote = await parseRemote(entry, response);
      if (!await keepClaimForActiveOwner(entry, claim)) return false;
      const applied = await markOutboxStatus(entry.id, 'SYNCED', { remote, expectedClaim: claim });
      if (applied) {
        await recordSyncAttempt(entry.ownerId, entry.workspaceId, true);
        summary.synced += 1;
      }
      return true;
    }

    const message = await errorMessage(response, `Falha de sincronização (HTTP ${response.status}).`);
    const remainsSignedOut = response.status === 401 && !sessionOwnerId();
    if (!remainsSignedOut && !await keepClaimForActiveOwner(entry, claim)) return false;
    if (response.status === 401) {
      const applied = await markOutboxStatus(entry.id, 'BLOCKED', { message, expectedClaim: claim });
      if (applied) summary.blocked += 1;
      return false;
    }
    if (response.status === 409) {
      const applied = await markOutboxStatus(entry.id, 'CONFLICT', { message, expectedClaim: claim });
      if (applied) summary.conflicts += 1;
      return true;
    }
    if ([400, 403, 404, 413, 422].includes(response.status)) {
      const applied = await markOutboxStatus(entry.id, 'ACTION_REQUIRED', { message, expectedClaim: claim });
      if (applied) summary.actionRequired += 1;
      return true;
    }

    const applied = await markOutboxStatus(entry.id, 'RETRYABLE_ERROR', {
      message,
      nextAttemptAt: retryAt(entry.attemptCount),
      expectedClaim: claim
    });
    if (applied) summary.retryable += 1;
    return true;
  } catch (error) {
    if (error instanceof SyncIdentityChangedError || !hasActiveSyncIdentity(entry.ownerId)) {
      await releaseClaim(entry, claim);
      return false;
    }
    const message = error instanceof Error ? error.message : 'Sem conexão com o servidor.';
    if (error instanceof PermanentMessageOperationError) {
      const applied = await markOutboxStatus(entry.id, 'ACTION_REQUIRED', { message, expectedClaim: claim });
      if (applied) summary.actionRequired += 1;
      return true;
    }
    const applied = await markOutboxStatus(entry.id, 'RETRYABLE_ERROR', {
      message,
      nextAttemptAt: retryAt(entry.attemptCount),
      expectedClaim: claim
    });
    if (applied) summary.retryable += 1;
    return true;
  } finally {
    stopRenewal();
  }
}

export async function syncPendingObservations(filter: SyncFilter = {}): Promise<SyncSummary> {
  return syncPendingByOperation('CREATE_OBSERVATION', filter);
}

export async function syncPendingMessages(filter: SyncFilter = {}): Promise<SyncSummary> {
  return syncPendingByOperation('MESSAGE_SEND', filter);
}

export async function syncPendingEvidence(filter: SyncFilter = {}): Promise<SyncSummary> {
  return syncPendingByOperation('EVIDENCE_CREATE', filter);
}

export async function syncPendingOperations(filter: SyncFilter = {}): Promise<SyncSummary> {
  return syncPendingByOperation(undefined, filter);
}

async function syncPendingByOperation(
  operation: OutboxEntry['operation'] | undefined,
  filter: SyncFilter
): Promise<SyncSummary> {
  const ownerId = filter.ownerId ?? sessionOwnerId();
  const summary = emptySummary();
  const activeOwner = sessionOwnerId();
  if (!ownerId || !activeOwner || ownerId !== activeOwner
    || !isAuthenticated() || !hasFreshOfflineSession()) {
    return summary;
  }

  const entries = (await listOutbox(ownerId, filter.workspaceId))
    .filter((entry) => (!operation || entry.operation === operation)
      && (!filter.entryId || entry.id === filter.entryId));
  for (const entry of entries) {
    if (!hasActiveSyncIdentity(ownerId)) break;
    if (activeEntries.has(entry.id)) continue;
    const claimed = await claimOutboxEntry(entry.id);
    if (!claimed) continue;
    if (!hasActiveSyncIdentity(ownerId)) {
      await releaseClaim(claimed, claimOf(claimed));
      break;
    }
    activeEntries.add(entry.id);
    let mayContinue: boolean;
    try {
      mayContinue = await synchronizeEntry(claimed, summary);
    } finally {
      activeEntries.delete(entry.id);
    }
    if (!mayContinue) break;
  }
  return summary;
}

export async function retryPendingObservations(ownerId: string, workspaceId: string): Promise<SyncSummary> {
  requireManualRetry(ownerId);
  await requeueManualOutbox(ownerId, workspaceId, 'CREATE_OBSERVATION');
  return syncPendingObservations({ ownerId, workspaceId });
}

export async function retryPendingMessages(ownerId: string, workspaceId: string): Promise<SyncSummary> {
  requireManualRetry(ownerId);
  await requeueManualOutbox(ownerId, workspaceId, 'MESSAGE_SEND');
  return syncPendingMessages({ ownerId, workspaceId });
}

export async function retryPendingEvidence(ownerId: string, workspaceId: string): Promise<SyncSummary> {
  requireManualRetry(ownerId);
  await requeueManualOutbox(ownerId, workspaceId, 'EVIDENCE_CREATE');
  return syncPendingEvidence({ ownerId, workspaceId });
}

export async function retryPendingOperations(ownerId: string, workspaceId: string): Promise<SyncSummary> {
  requireManualRetry(ownerId);
  await requeueManualOutbox(ownerId, workspaceId);
  return syncPendingOperations({ ownerId, workspaceId });
}

function requireManualRetry(ownerId: string): void {
  if (!isAuthenticated() || !hasFreshOfflineSession()) {
    throw new Error('Entre novamente com uma sessão validada antes de tentar enviar registros bloqueados.');
  }
  if (sessionOwnerId() !== ownerId) {
    throw new Error('Os dados locais pertencem a outra pessoa neste aparelho.');
  }
}

function requireCaptureOwner(): string {
  const ownerId = sessionOwnerId();
  if (!ownerId || !isAuthenticated() || !hasFreshOfflineSession()) {
    throw new Error('Entre novamente com uma sessão validada antes de registrar dados neste aparelho.');
  }
  return ownerId;
}

export async function captureObservation(input: ObservacaoInput): Promise<CaptureResult> {
  const ownerId = requireCaptureOwner();
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

export async function captureMessage(input: {
  workspaceId: string;
  conversationId: number;
  body: string;
  attachments: File[];
}): Promise<CaptureMessageResult> {
  const ownerId = requireCaptureOwner();
  const queued = await enqueueMessage(input, ownerId);
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    await syncPendingMessages({
      ownerId,
      workspaceId: input.workspaceId,
      entryId: queued.clientMessageId
    });
  }
  const local = await getLocalMessage(ownerId, input.workspaceId, queued.clientMessageId);
  return {
    clientMessageId: queued.clientMessageId,
    status: local?.syncStatus ?? 'QUEUED',
    remote: local?.remote
  };
}

export async function captureEvidence(input: EvidenciaInput): Promise<CaptureEvidenceResult> {
  const ownerId = requireCaptureOwner();
  const queued = await enqueueEvidence(input, ownerId);
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    await syncPendingEvidence({
      ownerId,
      workspaceId: input.workspaceId,
      entryId: queued.clientMutationId
    });
  }
  const local = await getLocalEvidence(ownerId, input.workspaceId, queued.clientMutationId);
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

export function startSyncEngine(expectedOwnerId: string): () => void {
  const synchronize = () => {
    if (sessionOwnerId() === expectedOwnerId
      && navigator.onLine
      && isAuthenticated()
      && hasFreshOfflineSession()) {
      void syncPendingOperations({ ownerId: expectedOwnerId });
    }
  };
  window.addEventListener('online', synchronize);
  const interval = window.setInterval(synchronize, 30_000);
  synchronize();
  return () => {
    window.removeEventListener('online', synchronize);
    window.clearInterval(interval);
  };
}
