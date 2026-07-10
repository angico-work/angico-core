import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Observacao, ObservacaoInput } from '../types';

const DATABASE_NAME = 'angico-operational-data';
const DATABASE_VERSION = 1;
const DEVICE_KEY = 'angico.deviceId';

export type OutboxStatus =
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'RETRYABLE_ERROR'
  | 'CONFLICT'
  | 'BLOCKED'
  | 'ACTION_REQUIRED';

export interface OfflineObservationInput extends ObservacaoInput {
  clientMutationId: string;
  occurredAt: string;
  deviceId: string;
}

export interface OutboxEntry {
  id: string;
  operation: 'CREATE_OBSERVATION';
  ownerId: string;
  workspaceId: string;
  localEntityKey: string;
  body: OfflineObservationInput;
  status: OutboxStatus;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  leaseUntil?: string;
  lastError?: string;
}

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
  blob: Blob;
  name: string;
  type: string;
}

interface SyncMetadata {
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
        const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
        outbox.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        outbox.createIndex('by-status', 'status');

        const entities = db.createObjectStore('entities', { keyPath: 'key' });
        entities.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);

        const drafts = db.createObjectStore('drafts', { keyPath: 'key' });
        drafts.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);

        const blobs = db.createObjectStore('blobs', { keyPath: 'key' });
        blobs.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);

        const syncMeta = db.createObjectStore('syncMeta', { keyPath: 'key' });
        syncMeta.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
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
  const operation: OutboxEntry = {
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
  options: { message?: string; nextAttemptAt?: string; remote?: Observacao } = {}
): Promise<void> {
  const db = await database();
  const tx = db.transaction(['outbox', 'entities'], 'readwrite');
  const outboxStore = tx.objectStore('outbox');
  const entityStore = tx.objectStore('entities');
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
  const local = await entityStore.get(entry.localEntityKey);
  if (local) {
    await entityStore.put({
      ...local,
      syncStatus: status,
      remote: options.remote ?? local.remote,
      updatedAt: now
    });
  }
  await tx.done;
  announceChange();
}

export async function resetOfflineDatabase(): Promise<void> {
  if (databasePromise) {
    const db = await databasePromise;
    db.close();
    databasePromise = undefined;
  }
  await deleteDB(DATABASE_NAME);
}
