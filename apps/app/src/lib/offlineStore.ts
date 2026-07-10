import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Conversa, Mensagem, Observacao, ObservacaoInput } from '../types';
import { validateMessageFiles } from './messageFiles';

const DATABASE_NAME = 'angico-operational-data';
const DATABASE_VERSION = 3;
const DEVICE_KEY = 'angico.deviceId';

export type OutboxStatus =
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'RETRYABLE_ERROR'
  | 'CONFLICT'
  | 'BLOCKED'
  | 'ACTION_REQUIRED'
  | 'SUPERSEDED'
  | 'DISCARDED';

export interface OfflineObservationInput extends ObservacaoInput {
  clientMutationId: string;
  occurredAt: string;
  deviceId: string;
}

interface OutboxBase {
  id: string;
  ownerId: string;
  workspaceId: string;
  localEntityKey: string;
  status: OutboxStatus;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  leaseUntil?: string;
  lastError?: string;
}

export interface ObservationOutboxEntry extends OutboxBase {
  operation: 'CREATE_OBSERVATION';
  body: OfflineObservationInput;
}

export interface LocalMessageAttachment {
  blobKey: string;
  name: string;
  type: string;
  size: number;
}

export interface OfflineMessageInput {
  workspaceId: string;
  conversationId: number;
  body: string;
  clientMessageId: string;
  occurredAt: string;
  deviceId: string;
  attachments: LocalMessageAttachment[];
}

export interface MessageOutboxEntry extends OutboxBase {
  operation: 'MESSAGE_SEND';
  body: OfflineMessageInput;
}

export type OutboxEntry = ObservationOutboxEntry | MessageOutboxEntry;

export interface LocalObservation {
  key: string;
  ownerId: string;
  workspaceId: string;
  clientMutationId: string;
  data: OfflineObservationInput;
  syncStatus: OutboxStatus;
  remote?: Observacao;
  updatedAt: string;
}

interface MessageDraftValue {
  conversationId: number;
  body: string;
  attachments: LocalMessageAttachment[];
}

interface DraftRecord {
  key: string;
  ownerId: string;
  workspaceId: string;
  kind: string;
  value: unknown;
  updatedAt: string;
}

interface BlobRecord {
  key: string;
  ownerId: string;
  workspaceId: string;
  bytes: ArrayBuffer;
  name: string;
  type: string;
  updatedAt: string;
}

export interface LocalMessage {
  key: string;
  ownerId: string;
  workspaceId: string;
  conversationId: number;
  clientMessageId: string;
  body: string;
  occurredAt: string;
  deviceId: string;
  attachments: LocalMessageAttachment[];
  syncStatus: OutboxStatus;
  lastError?: string;
  remote?: Mensagem;
  updatedAt: string;
}

export interface MessageDraft {
  body: string;
  attachments: File[];
  updatedAt: string;
}

interface ConversationCache {
  key: string;
  ownerId: string;
  workspaceId: string;
  conversations: Conversa[];
  updatedAt: string;
}

export interface SyncMetadata {
  key: string;
  ownerId: string;
  workspaceId: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
}

interface OfflineSchema extends DBSchema {
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: {
      'by-owner-workspace': [string, string];
      'by-status': string;
    };
  };
  entities: {
    key: string;
    value: LocalObservation;
    indexes: {
      'by-owner-workspace': [string, string];
    };
  };
  messages: {
    key: string;
    value: LocalMessage;
    indexes: {
      'by-owner-workspace': [string, string];
      'by-owner-workspace-conversation': [string, string, number];
    };
  };
  conversations: {
    key: string;
    value: ConversationCache;
    indexes: {
      'by-owner-workspace': [string, string];
    };
  };
  drafts: {
    key: string;
    value: DraftRecord;
    indexes: {
      'by-owner-workspace': [string, string];
    };
  };
  blobs: {
    key: string;
    value: BlobRecord;
    indexes: {
      'by-owner-workspace': [string, string];
    };
  };
  syncMeta: {
    key: string;
    value: SyncMetadata;
    indexes: {
      'by-owner-workspace': [string, string];
    };
  };
}

let databasePromise: Promise<IDBPDatabase<OfflineSchema>> | undefined;

function database(): Promise<IDBPDatabase<OfflineSchema>> {
  if (!databasePromise) {
    databasePromise = openDB<OfflineSchema>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
          outbox.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
          outbox.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('entities')) {
          const entities = db.createObjectStore('entities', { keyPath: 'key' });
          entities.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
        if (!db.objectStoreNames.contains('drafts')) {
          const drafts = db.createObjectStore('drafts', { keyPath: 'key' });
          drafts.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
        if (!db.objectStoreNames.contains('blobs')) {
          const blobs = db.createObjectStore('blobs', { keyPath: 'key' });
          blobs.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
        if (!db.objectStoreNames.contains('syncMeta')) {
          const syncMeta = db.createObjectStore('syncMeta', { keyPath: 'key' });
          syncMeta.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
        if (!db.objectStoreNames.contains('messages')) {
          const messages = db.createObjectStore('messages', { keyPath: 'key' });
          messages.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
          messages.createIndex('by-owner-workspace-conversation', ['ownerId', 'workspaceId', 'conversationId']);
        }
        if (!db.objectStoreNames.contains('conversations')) {
          const conversations = db.createObjectStore('conversations', { keyPath: 'key' });
          conversations.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
      }
    });
  }
  return databasePromise;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = randomId();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function entityKey(ownerId: string, workspaceId: string, clientMutationId: string): string {
  return JSON.stringify([ownerId, workspaceId, clientMutationId]);
}

function localMessageKey(ownerId: string, workspaceId: string, clientMessageId: string): string {
  return JSON.stringify(['message', ownerId, workspaceId, clientMessageId]);
}

function messageDraftKey(ownerId: string, workspaceId: string, conversationId: number): string {
  return JSON.stringify(['message-draft', ownerId, workspaceId, conversationId]);
}

function messageBlobKey(ownerId: string, workspaceId: string, id = randomId()): string {
  return JSON.stringify(['message-blob', ownerId, workspaceId, id]);
}

function conversationCacheKey(ownerId: string, workspaceId: string): string {
  return JSON.stringify(['message-conversations', ownerId, workspaceId]);
}

function remoteMessageKey(ownerId: string, workspaceId: string, messageId: number): string {
  return JSON.stringify(['message-remote', ownerId, workspaceId, messageId]);
}

function syncMetadataKey(ownerId: string, workspaceId: string): string {
  return JSON.stringify([ownerId, workspaceId]);
}

function requirePartition(ownerId: string, workspaceId: string): void {
  if (!ownerId.trim() || !workspaceId.trim()) {
    throw new Error('Pessoa e workspace são obrigatórios para o registro offline.');
  }
}

function announceChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('angico:sync-state'));
  }
}

export async function enqueueObservation(
  input: ObservacaoInput,
  ownerId: string
): Promise<OfflineObservationInput> {
  requirePartition(ownerId, input.workspaceId);
  const clientMutationId = randomId();
  const now = new Date().toISOString();
  const body: OfflineObservationInput = {
    ...input,
    clientMutationId,
    occurredAt: now,
    deviceId: getDeviceId()
  };
  const key = entityKey(ownerId, input.workspaceId, clientMutationId);
  const local: LocalObservation = {
    key,
    ownerId,
    workspaceId: input.workspaceId,
    clientMutationId,
    data: body,
    syncStatus: 'QUEUED',
    updatedAt: now
  };
  const operation: ObservationOutboxEntry = {
    id: clientMutationId,
    operation: 'CREATE_OBSERVATION',
    ownerId,
    workspaceId: input.workspaceId,
    localEntityKey: key,
    body,
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now
  };

  const db = await database();
  const tx = db.transaction(['entities', 'outbox'], 'readwrite');
  await Promise.all([
    tx.objectStore('entities').add(local),
    tx.objectStore('outbox').add(operation),
    tx.done
  ]);
  announceChange();
  return body;
}

async function attachmentRecords(
  ownerId: string,
  workspaceId: string,
  files: File[],
  now: string
): Promise<{ references: LocalMessageAttachment[]; records: BlobRecord[] }> {
  validateMessageFiles(files);
  const records = await Promise.all(files.map(async (file) => {
    const key = messageBlobKey(ownerId, workspaceId);
    return {
      key,
      ownerId,
      workspaceId,
      bytes: await file.arrayBuffer(),
      name: file.name,
      type: file.type,
      updatedAt: now
    } satisfies BlobRecord;
  }));
  return {
    references: records.map((record) => ({
      blobKey: record.key,
      name: record.name,
      type: record.type,
      size: record.bytes.byteLength
    })),
    records
  };
}

export async function saveMessageDraft(
  ownerId: string,
  workspaceId: string,
  conversationId: number,
  body: string,
  files?: File[]
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
    throw new Error('A conversa é obrigatória para salvar o rascunho.');
  }
  const db = await database();
  const key = messageDraftKey(ownerId, workspaceId, conversationId);
  const existing = await db.get('drafts', key);
  const previous = existing?.kind === 'MESSAGE' ? existing.value as MessageDraftValue : undefined;
  const now = new Date().toISOString();
  const replacement = files ? await attachmentRecords(ownerId, workspaceId, files, now) : undefined;
  const tx = db.transaction(['drafts', 'blobs'], 'readwrite');
  if (replacement) {
    await Promise.all([
      ...(previous?.attachments ?? []).map((attachment) => tx.objectStore('blobs').delete(attachment.blobKey)),
      ...replacement.records.map((record) => tx.objectStore('blobs').put(record))
    ]);
  }
  await tx.objectStore('drafts').put({
    key,
    ownerId,
    workspaceId,
    kind: 'MESSAGE',
    value: {
      conversationId,
      body,
      attachments: replacement?.references ?? previous?.attachments ?? []
    } satisfies MessageDraftValue,
    updatedAt: now
  });
  await tx.done;
  announceChange();
}

export async function loadMessageDraft(
  ownerId: string,
  workspaceId: string,
  conversationId: number
): Promise<MessageDraft | undefined> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const record = await db.get('drafts', messageDraftKey(ownerId, workspaceId, conversationId));
  if (!record || record.kind !== 'MESSAGE') return undefined;
  const value = record.value as MessageDraftValue;
  const attachments = (await Promise.all(value.attachments.map(async (attachment) => {
    const stored = await db.get('blobs', attachment.blobKey);
    return stored && stored.ownerId === ownerId && stored.workspaceId === workspaceId
      ? new File([stored.bytes], stored.name, { type: stored.type, lastModified: Date.parse(stored.updatedAt) })
      : undefined;
  }))).filter((file): file is File => Boolean(file));
  return { body: value.body, attachments, updatedAt: record.updatedAt };
}

export async function clearMessageDraft(
  ownerId: string,
  workspaceId: string,
  conversationId: number
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const key = messageDraftKey(ownerId, workspaceId, conversationId);
  const record = await db.get('drafts', key);
  const value = record?.kind === 'MESSAGE' ? record.value as MessageDraftValue : undefined;
  const tx = db.transaction(['drafts', 'blobs'], 'readwrite');
  await Promise.all([
    tx.objectStore('drafts').delete(key),
    ...(value?.attachments ?? []).map((attachment) => tx.objectStore('blobs').delete(attachment.blobKey))
  ]);
  await tx.done;
  announceChange();
}

export async function enqueueMessage(
  input: { workspaceId: string; conversationId: number; body: string; attachments: File[] },
  ownerId: string
): Promise<OfflineMessageInput> {
  requirePartition(ownerId, input.workspaceId);
  if (!Number.isSafeInteger(input.conversationId) || input.conversationId <= 0) {
    throw new Error('A conversa é obrigatória para enviar a mensagem.');
  }
  if (!input.body.trim() && input.attachments.length === 0) {
    throw new Error('Escreva uma mensagem ou adicione um anexo.');
  }
  const clientMessageId = randomId();
  const now = new Date().toISOString();
  const storedAttachments = await attachmentRecords(ownerId, input.workspaceId, input.attachments, now);
  const body: OfflineMessageInput = {
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    body: input.body.trim(),
    clientMessageId,
    occurredAt: now,
    deviceId: getDeviceId(),
    attachments: storedAttachments.references
  };
  const key = localMessageKey(ownerId, input.workspaceId, clientMessageId);
  const local: LocalMessage = {
    key,
    ownerId,
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    clientMessageId,
    body: body.body,
    occurredAt: now,
    deviceId: body.deviceId,
    attachments: storedAttachments.references,
    syncStatus: 'QUEUED',
    updatedAt: now
  };
  const operation: MessageOutboxEntry = {
    id: clientMessageId,
    operation: 'MESSAGE_SEND',
    ownerId,
    workspaceId: input.workspaceId,
    localEntityKey: key,
    body,
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now
  };
  const db = await database();
  const tx = db.transaction(['messages', 'outbox', 'drafts', 'blobs'], 'readwrite');
  const draftKey = messageDraftKey(ownerId, input.workspaceId, input.conversationId);
  const draftRecord = await tx.objectStore('drafts').get(draftKey);
  const draftValue = draftRecord?.kind === 'MESSAGE'
    ? draftRecord.value as MessageDraftValue
    : undefined;
  await Promise.all([
    tx.objectStore('messages').add(local),
    tx.objectStore('outbox').add(operation),
    tx.objectStore('drafts').delete(draftKey),
    ...storedAttachments.records.map((record) => tx.objectStore('blobs').add(record)),
    ...(draftValue?.attachments ?? []).map((attachment) => tx.objectStore('blobs').delete(attachment.blobKey))
  ]);
  await tx.done;
  announceChange();
  return body;
}

export async function getLocalMessage(
  ownerId: string,
  workspaceId: string,
  clientMessageId: string
): Promise<LocalMessage | undefined> {
  const db = await database();
  return db.get('messages', localMessageKey(ownerId, workspaceId, clientMessageId));
}

export async function listLocalMessages(
  ownerId: string,
  workspaceId: string,
  conversationId: number
): Promise<LocalMessage[]> {
  const db = await database();
  const messages = await db.getAllFromIndex(
    'messages',
    'by-owner-workspace-conversation',
    [ownerId, workspaceId, conversationId]
  );
  return messages.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export async function getMessageAttachmentFile(
  blobKey: string,
  ownerId?: string,
  workspaceId?: string
): Promise<File | undefined> {
  const db = await database();
  const stored = await db.get('blobs', blobKey);
  if (stored && ownerId && workspaceId
    && (stored.ownerId !== ownerId || stored.workspaceId !== workspaceId)) {
    return undefined;
  }
  return stored
    ? new File([stored.bytes], stored.name, { type: stored.type, lastModified: Date.parse(stored.updatedAt) })
    : undefined;
}

export async function cacheConversations(
  ownerId: string,
  workspaceId: string,
  conversations: Conversa[]
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  await db.put('conversations', {
    key: conversationCacheKey(ownerId, workspaceId),
    ownerId,
    workspaceId,
    conversations,
    updatedAt: new Date().toISOString()
  });
}

export async function loadCachedConversations(
  ownerId: string,
  workspaceId: string
): Promise<Conversa[]> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  return (await db.get('conversations', conversationCacheKey(ownerId, workspaceId)))?.conversations ?? [];
}

export async function cacheRemoteMessages(
  ownerId: string,
  workspaceId: string,
  conversationId: number,
  messages: Mensagem[]
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const tx = db.transaction(['messages', 'blobs'], 'readwrite');
  const store = tx.objectStore('messages');
  for (const message of messages) {
    if (message.workspaceId !== workspaceId || message.conversaId !== conversationId) continue;
    const clientMessageId = message.clientMessageId || `remote-${message.id}`;
    const localKey = message.clientMessageId
      ? localMessageKey(ownerId, workspaceId, message.clientMessageId)
      : remoteMessageKey(ownerId, workspaceId, message.id);
    const existing = await store.get(localKey);
    if (existing) {
      await store.put({
        ...existing,
        syncStatus: 'SYNCED',
        lastError: undefined,
        remote: message,
        updatedAt: message.recordedAt || message.createdAt
      });
      await Promise.all(existing.attachments.map((attachment) => (
        tx.objectStore('blobs').delete(attachment.blobKey)
      )));
    } else {
      await store.put({
        key: localKey,
        ownerId,
        workspaceId,
        conversationId,
        clientMessageId,
        body: message.corpo,
        occurredAt: message.occurredAt || message.createdAt,
        deviceId: message.deviceId || '',
        attachments: [],
        syncStatus: 'SYNCED',
        remote: message,
        updatedAt: message.recordedAt || message.createdAt
      });
    }
  }
  await tx.done;
  announceChange();
}

export async function listOutbox(ownerId: string, workspaceId?: string): Promise<OutboxEntry[]> {
  const db = await database();
  const entries = workspaceId
    ? await db.getAllFromIndex('outbox', 'by-owner-workspace', [ownerId, workspaceId])
    : (await db.getAll('outbox')).filter((entry) => entry.ownerId === ownerId);
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getLocalObservation(
  ownerId: string,
  workspaceId: string,
  clientMutationId: string
): Promise<LocalObservation | undefined> {
  const db = await database();
  return db.get('entities', entityKey(ownerId, workspaceId, clientMutationId));
}

export async function listLocalObservations(
  ownerId: string,
  workspaceId: string
): Promise<LocalObservation[]> {
  const db = await database();
  return db.getAllFromIndex('entities', 'by-owner-workspace', [ownerId, workspaceId]);
}

export interface OfflineOwnerState {
  total: number;
  unsynced: number;
  conflicts: number;
  blocked: number;
  actionRequired: number;
}

export async function getOfflineOwnerState(ownerId: string): Promise<OfflineOwnerState> {
  const entries = await listOutbox(ownerId);
  return entries.reduce<OfflineOwnerState>((state, entry) => {
    state.total += 1;
    if (!['SYNCED', 'SUPERSEDED', 'DISCARDED'].includes(entry.status)) state.unsynced += 1;
    if (entry.status === 'CONFLICT') state.conflicts += 1;
    if (entry.status === 'BLOCKED') state.blocked += 1;
    if (entry.status === 'ACTION_REQUIRED') state.actionRequired += 1;
    return state;
  }, { total: 0, unsynced: 0, conflicts: 0, blocked: 0, actionRequired: 0 });
}

export async function clearOfflineOwner(
  ownerId: string,
  options: { discardPending?: boolean } = {}
): Promise<void> {
  const state = await getOfflineOwnerState(ownerId);
  if (state.unsynced > 0 && !options.discardPending) {
    const noun = state.unsynced === 1 ? 'registro ainda não sincronizado' : 'registros ainda não sincronizados';
    throw new Error(`${state.unsynced} ${noun}. Confirme o descarte antes de limpar os dados locais.`);
  }

  const db = await database();
  const tx = db.transaction(['outbox', 'entities', 'messages', 'conversations', 'drafts', 'blobs', 'syncMeta'], 'readwrite');
  const [outbox, entities, messages, conversations, drafts, blobs, syncMeta] = await Promise.all([
    tx.objectStore('outbox').getAll(),
    tx.objectStore('entities').getAll(),
    tx.objectStore('messages').getAll(),
    tx.objectStore('conversations').getAll(),
    tx.objectStore('drafts').getAll(),
    tx.objectStore('blobs').getAll(),
    tx.objectStore('syncMeta').getAll()
  ]);
  await Promise.all([
    ...outbox.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('outbox').delete(entry.id)),
    ...entities.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('entities').delete(entry.key)),
    ...messages.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('messages').delete(entry.key)),
    ...conversations.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('conversations').delete(entry.key)),
    ...drafts.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('drafts').delete(entry.key)),
    ...blobs.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('blobs').delete(entry.key)),
    ...syncMeta.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('syncMeta').delete(entry.key))
  ]);
  await tx.done;
  announceChange();
}

export async function claimOutboxEntry(id: string, now = new Date()): Promise<OutboxEntry | undefined> {
  const db = await database();
  const tx = db.transaction('outbox', 'readwrite');
  const store = tx.objectStore('outbox');
  const entry = await store.get(id);
  if (!entry) {
    await tx.done;
    return undefined;
  }
  const retryable = entry.status === 'QUEUED' || entry.status === 'RETRYABLE_ERROR';
  const expiredLease = entry.status === 'SYNCING'
    && (!entry.leaseUntil || Date.parse(entry.leaseUntil) <= now.getTime());
  if ((!retryable || Date.parse(entry.nextAttemptAt) > now.getTime()) && !expiredLease) {
    await tx.done;
    return undefined;
  }
  const claimed: OutboxEntry = {
    ...entry,
    status: 'SYNCING',
    attemptCount: entry.attemptCount + 1,
    updatedAt: now.toISOString(),
    leaseUntil: new Date(now.getTime() + 30_000).toISOString()
  };
  await store.put(claimed);
  await tx.done;
  announceChange();
  return claimed;
}

export async function markOutboxStatus(
  id: string,
  status: OutboxStatus,
  options: { message?: string; nextAttemptAt?: string; remote?: Observacao | Mensagem } = {}
): Promise<void> {
  const db = await database();
  const tx = db.transaction(['outbox', 'entities', 'messages', 'blobs'], 'readwrite');
  const outboxStore = tx.objectStore('outbox');
  const entry = await outboxStore.get(id);
  if (!entry) {
    await tx.done;
    return;
  }
  const now = new Date().toISOString();
  await outboxStore.put({
    ...entry,
    status,
    updatedAt: now,
    nextAttemptAt: options.nextAttemptAt ?? entry.nextAttemptAt,
    lastError: options.message,
    leaseUntil: undefined
  });
  if (entry.operation === 'CREATE_OBSERVATION') {
    const entityStore = tx.objectStore('entities');
    const local = await entityStore.get(entry.localEntityKey);
    if (local) {
      await entityStore.put({
        ...local,
        syncStatus: status,
        remote: options.remote as Observacao | undefined ?? local.remote,
        updatedAt: now
      });
    }
  } else {
    const messageStore = tx.objectStore('messages');
    const local = await messageStore.get(entry.localEntityKey);
    if (local) {
      const remote = options.remote as Mensagem | undefined;
      await messageStore.put({
        ...local,
        syncStatus: status,
        lastError: options.message,
        remote: remote ?? local.remote,
        updatedAt: now
      });
      if (status === 'SYNCED' && remote) {
        await Promise.all(local.attachments.map((attachment) => (
          tx.objectStore('blobs').delete(attachment.blobKey)
        )));
      }
    }
  }
  await tx.done;
  announceChange();
}

export async function requeueManualOutbox(
  ownerId: string,
  workspaceId: string,
  operation?: OutboxEntry['operation']
): Promise<number> {
  const blocked = (await listOutbox(ownerId, workspaceId))
    .filter((entry) => (!operation || entry.operation === operation)
      && (entry.status === 'BLOCKED' || entry.status === 'RETRYABLE_ERROR'));
  const now = new Date().toISOString();
  await Promise.all(blocked.map((entry) => markOutboxStatus(entry.id, 'QUEUED', { nextAttemptAt: now })));
  return blocked.length;
}

type ObservationRevision = Partial<Pick<ObservacaoInput,
  | 'territorioId'
  | 'categoria'
  | 'titulo'
  | 'descricao'
  | 'localizacao'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'urgencia'
  | 'autorId'
  | 'latitude'
  | 'longitude'
>>;

const REVIEWABLE_STATUSES: OutboxStatus[] = ['CONFLICT', 'ACTION_REQUIRED'];

export async function reviseObservation(
  id: string,
  ownerId: string,
  workspaceId: string,
  changes: ObservationRevision
): Promise<OfflineObservationInput> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const tx = db.transaction(['outbox', 'entities'], 'readwrite');
  const outbox = tx.objectStore('outbox');
  const entities = tx.objectStore('entities');
  const original = await outbox.get(id);
  if (!original || original.ownerId !== ownerId || original.workspaceId !== workspaceId) {
    tx.abort();
    throw new Error('O registro não pertence a esta pessoa e a este território.');
  }
  if (original.operation !== 'CREATE_OBSERVATION') {
    tx.abort();
    throw new Error('A operação não é um registro territorial revisável.');
  }
  if (!REVIEWABLE_STATUSES.includes(original.status)) {
    tx.abort();
    throw new Error('Somente registros que precisam de revisão podem ser corrigidos.');
  }

  const clientMutationId = randomId();
  const now = new Date().toISOString();
  const body: OfflineObservationInput = {
    ...original.body,
    ...changes,
    workspaceId,
    categoria: (changes.categoria ?? original.body.categoria).trim(),
    titulo: (changes.titulo ?? original.body.titulo).trim(),
    clientMutationId,
    occurredAt: original.body.occurredAt,
    deviceId: original.body.deviceId
  };
  if (!body.titulo || !body.categoria) {
    tx.abort();
    throw new Error('Título e categoria são obrigatórios para reenviar o registro.');
  }

  const key = entityKey(ownerId, workspaceId, clientMutationId);
  const replacement: OutboxEntry = {
    id: clientMutationId,
    operation: 'CREATE_OBSERVATION',
    ownerId,
    workspaceId,
    localEntityKey: key,
    body,
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now
  };
  const originalLocal = await entities.get(original.localEntityKey);
  await outbox.put({ ...original, status: 'SUPERSEDED', updatedAt: now, leaseUntil: undefined });
  if (originalLocal) {
    await entities.put({ ...originalLocal, syncStatus: 'SUPERSEDED', updatedAt: now });
  }
  await outbox.add(replacement);
  await entities.add({
    key,
    ownerId,
    workspaceId,
    clientMutationId,
    data: body,
    syncStatus: 'QUEUED',
    updatedAt: now
  });
  await tx.done;
  announceChange();
  return body;
}

export async function discardOutboxEntry(
  id: string,
  ownerId: string,
  workspaceId: string
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const entry = (await listOutbox(ownerId, workspaceId)).find((candidate) => candidate.id === id);
  if (!entry) throw new Error('O registro não pertence a esta pessoa e a este território.');
  if (!REVIEWABLE_STATUSES.includes(entry.status)) {
    throw new Error('Somente registros que precisam de revisão podem ser descartados.');
  }
  await markOutboxStatus(id, 'DISCARDED', { message: entry.lastError });
}

export async function recordSyncAttempt(
  ownerId: string,
  workspaceId: string,
  success: boolean,
  at = new Date()
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const key = syncMetadataKey(ownerId, workspaceId);
  const existing = await db.get('syncMeta', key);
  const timestamp = at.toISOString();
  await db.put('syncMeta', {
    key,
    ownerId,
    workspaceId,
    lastAttemptAt: timestamp,
    lastSuccessAt: success ? timestamp : existing?.lastSuccessAt
  });
  announceChange();
}

export async function getSyncMetadata(
  ownerId: string,
  workspaceId: string
): Promise<SyncMetadata | undefined> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  return db.get('syncMeta', syncMetadataKey(ownerId, workspaceId));
}

export async function resetOfflineDatabase(): Promise<void> {
  if (databasePromise) {
    const db = await databasePromise;
    db.close();
    databasePromise = undefined;
  }
  await deleteDB(DATABASE_NAME);
}
