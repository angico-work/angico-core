import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AcaoInput, Conversa, Evidencia, EvidenciaInput, EvidenceSubjectType, IndicadorInput,
  MedicaoInput, Mensagem, MissaoInput, Observacao, ObservacaoInput, PotencialidadeInput,
  ProblemaInput, RecursoInput, RecursoUsoInput, ResultadoInput
} from '../types';
import { validateEvidenceFile } from './evidenceFiles';
import {
  messageLinksMatch,
  normalizeMessageLink,
  type MessageLinkedEntityType,
  type MessageLinkFields
} from './messageLinks';
import { validateMessageFiles } from './messageFiles';

export type { MessageLinkedEntityType } from './messageLinks';

const DATABASE_NAME = 'angico-operational-data';
const DATABASE_VERSION = 4;
const DEVICE_KEY = 'angico.deviceId';
const OUTBOX_LEASE_MS = 30_000;

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
  leaseId?: string;
  leaseGeneration?: number;
  lastError?: string;
}

export interface OutboxClaim {
  leaseId: string;
  leaseGeneration: number;
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

export type MessageLinkInput = MessageLinkFields;

export interface OfflineMessageCaptureInput extends MessageLinkFields {
  workspaceId: string;
  conversationId: number;
  body: string;
  attachments: File[];
}

export interface OfflineMessageInput {
  workspaceId: string;
  conversationId: number;
  body: string;
  clientMessageId: string;
  occurredAt: string;
  deviceId: string;
  attachments: LocalMessageAttachment[];
  linkedEntityType?: MessageLinkedEntityType;
  linkedEntityId?: string;
}

export interface MessageOutboxEntry extends OutboxBase {
  operation: 'MESSAGE_SEND';
  body: OfflineMessageInput;
}

export interface LocalEvidenceFile {
  blobKey: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
}

export interface OfflineEvidenceInput {
  workspaceId: string;
  subjectType: EvidenceSubjectType;
  subjectId: number;
  title: string;
  description?: string;
  capturedAt: string;
  deviceId: string;
  clientMutationId: string;
  file?: LocalEvidenceFile;
}

export interface EvidenceOutboxEntry extends OutboxBase {
  operation: 'EVIDENCE_CREATE';
  body: OfflineEvidenceInput;
}

export type DomainMutationOperation =
  | 'PROBLEMA_CREATE'
  | 'POTENCIALIDADE_CREATE'
  | 'MISSAO_CREATE'
  | 'ACAO_CREATE'
  | 'RESULTADO_CREATE'
  | 'INDICADOR_CREATE'
  | 'MEDICAO_CREATE'
  | 'RECURSO_CREATE'
  | 'RECURSO_USO_CREATE';

export interface DomainMutationPayloadMap {
  PROBLEMA_CREATE: ProblemaInput;
  POTENCIALIDADE_CREATE: PotencialidadeInput;
  MISSAO_CREATE: MissaoInput;
  ACAO_CREATE: AcaoInput;
  RESULTADO_CREATE: ResultadoInput;
  INDICADOR_CREATE: IndicadorInput;
  MEDICAO_CREATE: MedicaoInput;
  RECURSO_CREATE: RecursoInput;
  RECURSO_USO_CREATE: { recursoId: number; payload: RecursoUsoInput };
}

export interface DomainMutationReceipt {
  operation: DomainMutationOperation;
  workspaceId: string;
  clientMutationId: string;
  resourceId: string;
}

export type DomainMutationOutboxEntry = {
  [K in DomainMutationOperation]: OutboxBase & {
    operation: K;
    body: DomainMutationPayloadMap[K];
    remote?: DomainMutationReceipt;
  }
}[DomainMutationOperation];

export interface QueuedDomainMutation<K extends DomainMutationOperation> {
  clientMutationId: string;
  operation: K;
  body: DomainMutationPayloadMap[K];
}

export type OutboxEntry =
  | ObservationOutboxEntry
  | MessageOutboxEntry
  | EvidenceOutboxEntry
  | DomainMutationOutboxEntry;

const DOMAIN_MUTATION_OPERATIONS = new Set<DomainMutationOperation>([
  'PROBLEMA_CREATE',
  'POTENCIALIDADE_CREATE',
  'MISSAO_CREATE',
  'ACAO_CREATE',
  'RESULTADO_CREATE',
  'INDICADOR_CREATE',
  'MEDICAO_CREATE',
  'RECURSO_CREATE',
  'RECURSO_USO_CREATE'
]);

export function isDomainMutationEntry(entry: OutboxEntry): entry is DomainMutationOutboxEntry {
  return DOMAIN_MUTATION_OPERATIONS.has(entry.operation as DomainMutationOperation);
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

interface MessageDraftValue {
  conversationId: number;
  body: string;
  attachments: LocalMessageAttachment[];
  linkedEntityType?: MessageLinkedEntityType;
  linkedEntityId?: string;
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
  operationId?: string;
  purpose?: 'EVIDENCE_FILE';
  size?: number;
  sha256?: string;
  updatedAt: string;
}

export interface LocalEvidence {
  key: string;
  ownerId: string;
  workspaceId: string;
  clientMutationId: string;
  data: OfflineEvidenceInput;
  syncStatus: OutboxStatus;
  lastError?: string;
  remote?: Evidencia;
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
  linkedEntityType?: MessageLinkedEntityType;
  linkedEntityId?: string;
  syncStatus: OutboxStatus;
  lastError?: string;
  remote?: Mensagem;
  updatedAt: string;
}

export interface MessageDraft {
  body: string;
  attachments: File[];
  linkedEntityType?: MessageLinkedEntityType;
  linkedEntityId?: string;
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

type SnapshotQueryValue = string | number | boolean | null | undefined;

export interface SnapshotIdentity {
  ownerId: string;
  workspaceId: string;
  resource: string;
  query?: Readonly<Record<string, SnapshotQueryValue>>;
  root?: string;
  contractVersion: number;
}

export interface SnapshotRecord<T = unknown> {
  key: string;
  ownerId: string;
  workspaceId: string;
  resource: string;
  queryKey: string;
  rootKey: string;
  contractVersion: number;
  requestStartedAt: number;
  savedAt: string;
  payload: T;
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
  evidences: {
    key: string;
    value: LocalEvidence;
    indexes: {
      'by-owner-workspace': [string, string];
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
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: {
      'by-owner-workspace': [string, string];
      'by-owner-workspace-resource': [string, string, string];
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
        if (!db.objectStoreNames.contains('evidences')) {
          const evidences = db.createObjectStore('evidences', { keyPath: 'key' });
          evidences.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshots = db.createObjectStore('snapshots', { keyPath: 'key' });
          snapshots.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
          snapshots.createIndex('by-owner-workspace-resource', ['ownerId', 'workspaceId', 'resource']);
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

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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

function localEvidenceKey(ownerId: string, workspaceId: string, clientMutationId: string): string {
  return JSON.stringify(['evidence', ownerId, workspaceId, clientMutationId]);
}

function domainMutationKey(ownerId: string, workspaceId: string, clientMutationId: string): string {
  return JSON.stringify(['domain-mutation', ownerId, workspaceId, clientMutationId]);
}

function evidenceBlobKey(ownerId: string, workspaceId: string, operationId: string): string {
  return JSON.stringify(['evidence-blob', ownerId, workspaceId, operationId]);
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

function canonicalQuery(query: SnapshotIdentity['query']): string {
  const entries = Object.entries(query ?? {})
    .filter((entry): entry is [string, Exclude<SnapshotQueryValue, undefined>] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

function normalizeResource(resource: string): string {
  return resource.trim().toLowerCase();
}

function normalizeRoot(root?: string): string {
  const value = root?.trim() ?? '';
  const separator = value.indexOf(':');
  if (separator < 0) return value;
  const type = value.slice(0, separator).trim().toUpperCase();
  const id = value.slice(separator + 1).trim();
  return `${type}:${id}`;
}

function snapshotIdentityKey(identity: SnapshotIdentity): string {
  return JSON.stringify([
    'snapshot',
    identity.ownerId,
    identity.workspaceId,
    normalizeResource(identity.resource),
    canonicalQuery(identity.query),
    normalizeRoot(identity.root)
  ]);
}

function requirePartition(ownerId: string, workspaceId: string): void {
  if (!ownerId.trim() || !workspaceId.trim()) {
    throw new Error('Pessoa e workspace são obrigatórios para o registro offline.');
  }
}

function requireSnapshotIdentity(identity: SnapshotIdentity): void {
  requirePartition(identity.ownerId, identity.workspaceId);
  if (!normalizeResource(identity.resource)) throw new Error('Recurso obrigatório para o snapshot.');
  if (!Number.isSafeInteger(identity.contractVersion) || identity.contractVersion < 1) {
    throw new Error('Versão de contrato inválida para o snapshot.');
  }
}

function announceChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('angico:sync-state'));
  }
}

function requireRemoteId(value: unknown, label: string): void {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^[1-9]\d*$/.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error(`${label} precisa usar um ID remoto confirmado.`);
  }
}

function requireOptionalRemoteId(value: unknown, label: string): void {
  if (value == null || value === '') return;
  requireRemoteId(value, label);
}

function validateDomainMutation<K extends DomainMutationOperation>(
  operation: K,
  body: DomainMutationPayloadMap[K]
): void {
  switch (operation) {
    case 'PROBLEMA_CREATE': {
      const value = body as DomainMutationPayloadMap['PROBLEMA_CREATE'];
      requireRemoteId(value.territorioId, 'Território');
      requireOptionalRemoteId(value.origemObservacaoId, 'Observação de origem');
      return;
    }
    case 'POTENCIALIDADE_CREATE':
      requireOptionalRemoteId(
        (body as DomainMutationPayloadMap['POTENCIALIDADE_CREATE']).territorioId,
        'Território'
      );
      return;
    case 'MISSAO_CREATE': {
      const value = body as DomainMutationPayloadMap['MISSAO_CREATE'];
      requireRemoteId(value.territorioId, 'Território');
      requireRemoteId(value.problemaId, 'Problema');
      requireRemoteId(value.responsavelId, 'Pessoa responsável');
      return;
    }
    case 'ACAO_CREATE': {
      const value = body as DomainMutationPayloadMap['ACAO_CREATE'];
      requireRemoteId(value.missaoId, 'Missão');
      requireRemoteId(value.responsavelId, 'Pessoa responsável');
      return;
    }
    case 'RESULTADO_CREATE':
      requireRemoteId((body as DomainMutationPayloadMap['RESULTADO_CREATE']).acaoId, 'Ação');
      return;
    case 'INDICADOR_CREATE': {
      const value = body as DomainMutationPayloadMap['INDICADOR_CREATE'];
      requireRemoteId(value.territorioId, 'Território');
      requireOptionalRemoteId(value.resultadoId, 'Resultado');
      return;
    }
    case 'MEDICAO_CREATE':
      requireRemoteId((body as DomainMutationPayloadMap['MEDICAO_CREATE']).indicadorId, 'Indicador');
      return;
    case 'RECURSO_USO_CREATE': {
      const value = body as DomainMutationPayloadMap['RECURSO_USO_CREATE'];
      requireRemoteId(value.recursoId, 'Recurso');
      requireRemoteId(value.payload.acaoId, 'Ação');
      return;
    }
    case 'RECURSO_CREATE':
      return;
  }
}

function domainMutationWorkspace<K extends DomainMutationOperation>(
  operation: K,
  body: DomainMutationPayloadMap[K]
): string {
  if (operation === 'RECURSO_USO_CREATE') {
    return (body as DomainMutationPayloadMap['RECURSO_USO_CREATE']).payload.workspaceId;
  }
  return (body as Exclude<DomainMutationPayloadMap[K], DomainMutationPayloadMap['RECURSO_USO_CREATE']>)
    .workspaceId;
}

export async function enqueueDomainMutation<K extends DomainMutationOperation>(
  operation: K,
  body: DomainMutationPayloadMap[K],
  ownerId: string
): Promise<QueuedDomainMutation<K>> {
  const workspaceId = domainMutationWorkspace(operation, body);
  requirePartition(ownerId, workspaceId);
  if (workspaceId !== workspaceId.trim()) {
    throw new Error('Workspace inválido para o registro offline.');
  }
  validateDomainMutation(operation, body);
  const clientMutationId = randomId();
  const now = new Date().toISOString();
  const entry = {
    id: clientMutationId,
    operation,
    ownerId,
    workspaceId,
    localEntityKey: domainMutationKey(ownerId, workspaceId, clientMutationId),
    body,
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now
  } as DomainMutationOutboxEntry;
  const db = await database();
  await db.add('outbox', entry);
  announceChange();
  return { clientMutationId, operation, body };
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

export async function enqueueEvidence(
  input: EvidenciaInput,
  ownerId: string
): Promise<OfflineEvidenceInput> {
  requirePartition(ownerId, input.workspaceId);
  if (!Number.isSafeInteger(input.subjectId) || input.subjectId < 1) {
    throw new Error('A evidência precisa de um registro remoto confirmado.');
  }
  const title = input.title.trim();
  if (!title) throw new Error('Título da evidência é obrigatório.');
  if (input.file) validateEvidenceFile(input.file);

  const clientMutationId = randomId();
  const now = new Date().toISOString();
  const fileBytes = input.file ? await input.file.arrayBuffer() : undefined;
  const fileSha256 = fileBytes ? await sha256Hex(fileBytes) : undefined;
  const fileKey = input.file
    ? evidenceBlobKey(ownerId, input.workspaceId, clientMutationId)
    : undefined;
  const body: OfflineEvidenceInput = {
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    title,
    description: input.description?.trim() || undefined,
    capturedAt: input.capturedAt ?? now,
    deviceId: input.deviceId?.trim() || getDeviceId(),
    clientMutationId,
    file: input.file && fileKey ? {
      blobKey: fileKey,
      name: input.file.name,
      type: input.file.type,
      size: fileBytes!.byteLength,
      sha256: fileSha256!
    } : undefined
  };
  const key = localEvidenceKey(ownerId, input.workspaceId, clientMutationId);
  const local: LocalEvidence = {
    key,
    ownerId,
    workspaceId: input.workspaceId,
    clientMutationId,
    data: body,
    syncStatus: 'QUEUED',
    updatedAt: now
  };
  const operation: EvidenceOutboxEntry = {
    id: clientMutationId,
    operation: 'EVIDENCE_CREATE',
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
  const blob = input.file && fileKey ? {
    key: fileKey,
    ownerId,
    workspaceId: input.workspaceId,
    bytes: fileBytes!,
    name: input.file.name,
    type: input.file.type,
    operationId: clientMutationId,
    purpose: 'EVIDENCE_FILE' as const,
    size: fileBytes!.byteLength,
    sha256: fileSha256!,
    updatedAt: now
  } : undefined;

  const db = await database();
  const tx = db.transaction(['evidences', 'outbox', 'blobs'], 'readwrite');
  await tx.objectStore('evidences').add(local);
  await tx.objectStore('outbox').add(operation);
  if (blob) await tx.objectStore('blobs').add(blob);
  await tx.done;
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
  files?: File[],
  link?: MessageLinkInput
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
    throw new Error('A conversa é obrigatória para salvar o rascunho.');
  }
  const normalizedLink = normalizeMessageLink(link ?? {});
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
      attachments: replacement?.references ?? previous?.attachments ?? [],
      ...(normalizedLink ?? {})
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
  return {
    body: value.body,
    attachments,
    linkedEntityType: value.linkedEntityType,
    linkedEntityId: value.linkedEntityId,
    updatedAt: record.updatedAt
  };
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
  input: OfflineMessageCaptureInput,
  ownerId: string
): Promise<OfflineMessageInput> {
  requirePartition(ownerId, input.workspaceId);
  if (!Number.isSafeInteger(input.conversationId) || input.conversationId <= 0) {
    throw new Error('A conversa é obrigatória para enviar a mensagem.');
  }
  if (!input.body.trim() && input.attachments.length === 0) {
    throw new Error('Escreva uma mensagem ou adicione um anexo.');
  }
  const normalizedLink = normalizeMessageLink(input);
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
    attachments: storedAttachments.references,
    ...(normalizedLink ?? {})
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
    ...(normalizedLink ?? {}),
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

export async function getLocalEvidence(
  ownerId: string,
  workspaceId: string,
  clientMutationId: string
): Promise<LocalEvidence | undefined> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  return db.get('evidences', localEvidenceKey(ownerId, workspaceId, clientMutationId));
}

export async function listLocalEvidences(
  ownerId: string,
  workspaceId: string
): Promise<LocalEvidence[]> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  return db.getAllFromIndex('evidences', 'by-owner-workspace', [ownerId, workspaceId]);
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

export async function getEvidenceFile(
  blobKey: string,
  ownerId: string,
  workspaceId: string
): Promise<File | undefined> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const stored = await db.get('blobs', blobKey);
  if (!stored || stored.ownerId !== ownerId || stored.workspaceId !== workspaceId
    || stored.purpose !== 'EVIDENCE_FILE') {
    return undefined;
  }
  return new File([stored.bytes], stored.name, {
    type: stored.type,
    lastModified: Date.parse(stored.updatedAt)
  });
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

export function messageAttachmentsMatch(
  local: LocalMessageAttachment[],
  remote: Mensagem['anexos']
): boolean {
  const counts = (values: Array<{ name: string; type: string; size: number }>) => values.reduce((result, value) => {
    const key = JSON.stringify([value.name, value.type, value.size]);
    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map<string, number>());
  const localCounts = counts(local);
  const remoteCounts = counts(remote.map((attachment) => ({
    name: attachment.originalFilename,
    type: attachment.contentType,
    size: attachment.sizeBytes
  })));
  if (localCounts.size !== remoteCounts.size) return false;
  return Array.from(localCounts).every(([key, count]) => remoteCounts.get(key) === count);
}

export async function cacheRemoteMessages(
  ownerId: string,
  workspaceId: string,
  conversationId: number,
  currentPessoaId: number | null,
  messages: Mensagem[]
): Promise<void> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const tx = db.transaction(['messages', 'outbox', 'blobs'], 'readwrite');
  const store = tx.objectStore('messages');
  const outbox = tx.objectStore('outbox');
  for (const message of messages) {
    if (message.workspaceId !== workspaceId || message.conversaId !== conversationId) continue;
    const matchingClientMessageId = typeof message.clientMessageId === 'string'
      && currentPessoaId != null
      && message.senderPessoaId === currentPessoaId
      ? message.clientMessageId
      : undefined;
    const clientMessageId = message.clientMessageId || `remote-${message.id}`;
    const localKey = matchingClientMessageId
      ? localMessageKey(ownerId, workspaceId, matchingClientMessageId)
      : remoteMessageKey(ownerId, workspaceId, message.id);
    const existing = await store.get(localKey);
    if (existing) {
      if (existing.ownerId !== ownerId
        || existing.workspaceId !== workspaceId
        || existing.conversationId !== conversationId) {
        continue;
      }
      const pending = matchingClientMessageId
        ? await outbox.get(matchingClientMessageId)
        : undefined;
      const matchingOperation = pending?.operation === 'MESSAGE_SEND'
        && pending.ownerId === ownerId
        && pending.workspaceId === workspaceId
        && pending.body.conversationId === conversationId;
      if (pending && !matchingOperation) continue;
      if (matchingOperation && (
        !messageAttachmentsMatch(existing.attachments, message.anexos)
        || !messageLinksMatch(existing, message)
      )) continue;
      if (matchingOperation) {
        await outbox.put({
          ...pending,
          status: 'SYNCED',
          lastError: undefined,
          leaseUntil: undefined,
          updatedAt: message.recordedAt || message.createdAt
        });
      }
      await store.put({
        ...existing,
        syncStatus: 'SYNCED',
        lastError: undefined,
        remote: message,
        updatedAt: message.recordedAt || message.createdAt
      });
      if (!pending || matchingOperation) {
        await Promise.all(existing.attachments.map((attachment) => (
          tx.objectStore('blobs').delete(attachment.blobKey)
        )));
      }
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
  drafts: number;
  conflicts: number;
  blocked: number;
  actionRequired: number;
}

export async function getOfflineOwnerState(ownerId: string): Promise<OfflineOwnerState> {
  const db = await database();
  const [entries, storedDrafts] = await Promise.all([
    listOutbox(ownerId),
    db.getAll('drafts')
  ]);
  const state = entries.reduce<OfflineOwnerState>((current, entry) => {
    current.total += 1;
    if (!['SYNCED', 'SUPERSEDED', 'DISCARDED'].includes(entry.status)) current.unsynced += 1;
    if (entry.status === 'CONFLICT') current.conflicts += 1;
    if (entry.status === 'BLOCKED') current.blocked += 1;
    if (entry.status === 'ACTION_REQUIRED') current.actionRequired += 1;
    return current;
  }, { total: 0, unsynced: 0, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0 });
  storedDrafts
    .filter((draft) => draft.ownerId === ownerId && draft.kind === 'MESSAGE')
    .forEach((draft) => {
      const value = draft.value as MessageDraftValue;
      if (!value.body.trim() && value.attachments.length === 0 && !value.linkedEntityId) return;
      state.total += 1;
      state.unsynced += 1;
      state.drafts += 1;
    });
  return state;
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
  const tx = db.transaction([
    'outbox', 'entities', 'messages', 'evidences', 'conversations', 'drafts', 'blobs', 'syncMeta', 'snapshots'
  ], 'readwrite');
  const [outbox, entities, messages, evidences, conversations, drafts, blobs, syncMeta, snapshots] = await Promise.all([
    tx.objectStore('outbox').getAll(),
    tx.objectStore('entities').getAll(),
    tx.objectStore('messages').getAll(),
    tx.objectStore('evidences').getAll(),
    tx.objectStore('conversations').getAll(),
    tx.objectStore('drafts').getAll(),
    tx.objectStore('blobs').getAll(),
    tx.objectStore('syncMeta').getAll(),
    tx.objectStore('snapshots').getAll()
  ]);
  await Promise.all([
    ...outbox.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('outbox').delete(entry.id)),
    ...entities.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('entities').delete(entry.key)),
    ...messages.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('messages').delete(entry.key)),
    ...evidences.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('evidences').delete(entry.key)),
    ...conversations.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('conversations').delete(entry.key)),
    ...drafts.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('drafts').delete(entry.key)),
    ...blobs.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('blobs').delete(entry.key)),
    ...syncMeta.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('syncMeta').delete(entry.key)),
    ...snapshots.filter((entry) => entry.ownerId === ownerId).map((entry) => tx.objectStore('snapshots').delete(entry.key))
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
    leaseUntil: new Date(now.getTime() + OUTBOX_LEASE_MS).toISOString(),
    leaseId: randomId(),
    leaseGeneration: (entry.leaseGeneration ?? 0) + 1
  };
  await store.put(claimed);
  await tx.done;
  announceChange();
  return claimed;
}

function matchesClaim(entry: OutboxEntry, claim: OutboxClaim): boolean {
  return entry.leaseId === claim.leaseId && entry.leaseGeneration === claim.leaseGeneration;
}

export async function renewOutboxLease(
  id: string,
  claim: OutboxClaim,
  now = new Date()
): Promise<boolean> {
  const db = await database();
  const tx = db.transaction('outbox', 'readwrite');
  const store = tx.objectStore('outbox');
  const entry = await store.get(id);
  if (!entry || entry.status !== 'SYNCING' || !matchesClaim(entry, claim)) {
    await tx.done;
    return false;
  }
  await store.put({
    ...entry,
    leaseUntil: new Date(now.getTime() + OUTBOX_LEASE_MS).toISOString()
  });
  await tx.done;
  return true;
}

export async function markOutboxStatus(
  id: string,
  status: OutboxStatus,
  options: {
    message?: string;
    nextAttemptAt?: string;
    remote?: Observacao | Mensagem | Evidencia | DomainMutationReceipt;
    expectedClaim?: OutboxClaim;
  } = {}
): Promise<boolean> {
  const db = await database();
  const tx = db.transaction(['outbox', 'entities', 'messages', 'evidences', 'blobs'], 'readwrite');
  const outboxStore = tx.objectStore('outbox');
  const entry = await outboxStore.get(id);
  if (!entry) {
    await tx.done;
    return false;
  }
  if (entry.status === 'SYNCED' || entry.status === 'DISCARDED' || entry.status === 'SUPERSEDED') {
    await tx.done;
    return false;
  }
  if (options.expectedClaim && !matchesClaim(entry, options.expectedClaim) && status !== 'SYNCED') {
    await tx.done;
    return false;
  }
  if (status === 'SYNCED' && !options.remote) {
    await tx.done;
    return false;
  }
  const now = new Date().toISOString();
  await outboxStore.put({
    ...entry,
    status,
    updatedAt: now,
    nextAttemptAt: options.nextAttemptAt ?? entry.nextAttemptAt,
    lastError: options.message,
    leaseUntil: undefined,
    leaseId: undefined,
    ...(isDomainMutationEntry(entry) && options.remote
      ? { remote: options.remote as DomainMutationReceipt }
      : {})
  } as OutboxEntry);
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
  } else if (entry.operation === 'MESSAGE_SEND') {
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
      if ((status === 'SYNCED' && remote) || status === 'DISCARDED') {
        await Promise.all(local.attachments.map((attachment) => (
          tx.objectStore('blobs').delete(attachment.blobKey)
        )));
      }
    }
  } else if (entry.operation === 'EVIDENCE_CREATE') {
    const evidenceStore = tx.objectStore('evidences');
    const local = await evidenceStore.get(entry.localEntityKey);
    if (local) {
      const remote = options.remote as Evidencia | undefined;
      await evidenceStore.put({
        ...local,
        syncStatus: status,
        lastError: options.message,
        remote: remote ?? local.remote,
        updatedAt: now
      });
      if ((status === 'SYNCED' && remote) || status === 'DISCARDED') {
        if (local.data.file) await tx.objectStore('blobs').delete(local.data.file.blobKey);
      }
    }
  }
  await tx.done;
  announceChange();
  return true;
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

export async function recoverMessageAsDraft(
  id: string,
  ownerId: string,
  workspaceId: string
): Promise<number> {
  requirePartition(ownerId, workspaceId);
  const db = await database();
  const tx = db.transaction(['outbox', 'messages', 'drafts'], 'readwrite');
  const outbox = tx.objectStore('outbox');
  const messages = tx.objectStore('messages');
  const drafts = tx.objectStore('drafts');
  const entry = await outbox.get(id);
  if (!entry
    || entry.operation !== 'MESSAGE_SEND'
    || entry.ownerId !== ownerId
    || entry.workspaceId !== workspaceId) {
    throw new Error('A mensagem não pertence a esta pessoa e a este território.');
  }
  if (entry.status !== 'CONFLICT' && entry.status !== 'ACTION_REQUIRED') {
    throw new Error('Somente mensagens recusadas podem voltar para o rascunho.');
  }
  const draftKey = messageDraftKey(ownerId, workspaceId, entry.body.conversationId);
  const existingDraft = await drafts.get(draftKey);
  if (existingDraft?.kind === 'MESSAGE') {
    const value = existingDraft.value as MessageDraftValue;
    if (value.body.trim() || value.attachments.length > 0 || value.linkedEntityId) {
      throw new Error('Já existe um rascunho nesta conversa. Envie ou descarte esse conteúdo antes de recuperar a mensagem.');
    }
  }
  const now = new Date().toISOString();
  await drafts.put({
    key: draftKey,
    ownerId,
    workspaceId,
    kind: 'MESSAGE',
    value: {
      conversationId: entry.body.conversationId,
      body: entry.body.body,
      attachments: entry.body.attachments,
      linkedEntityType: entry.body.linkedEntityType,
      linkedEntityId: entry.body.linkedEntityId
    } satisfies MessageDraftValue,
    updatedAt: now
  });
  await outbox.put({
    ...entry,
    status: 'DISCARDED',
    leaseUntil: undefined,
    updatedAt: now
  });
  const local = await messages.get(entry.localEntityKey);
  if (local) {
    await messages.put({ ...local, syncStatus: 'DISCARDED', updatedAt: now });
  }
  await tx.done;
  announceChange();
  return entry.body.conversationId;
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

export async function saveSnapshot<T>(
  identity: SnapshotIdentity,
  payload: T,
  savedAt = new Date(),
  requestStartedAt = savedAt.getTime()
): Promise<SnapshotRecord<T>> {
  requireSnapshotIdentity(identity);
  const record: SnapshotRecord<T> = {
    key: snapshotIdentityKey(identity),
    ownerId: identity.ownerId,
    workspaceId: identity.workspaceId,
    resource: normalizeResource(identity.resource),
    queryKey: canonicalQuery(identity.query),
    rootKey: normalizeRoot(identity.root),
    contractVersion: identity.contractVersion,
    requestStartedAt,
    savedAt: savedAt.toISOString(),
    payload
  };
  const db = await database();
  const tx = db.transaction('snapshots', 'readwrite');
  const snapshots = tx.objectStore('snapshots');
  const existing = await snapshots.get(record.key);
  const existingRequestStartedAt = existing?.requestStartedAt ?? Date.parse(existing?.savedAt ?? '');
  if (existing && Number.isFinite(existingRequestStartedAt)
    && existingRequestStartedAt > requestStartedAt) {
    await tx.done;
    return existing as SnapshotRecord<T>;
  }
  await snapshots.put(record as SnapshotRecord);
  await tx.done;
  return record;
}

export async function loadSnapshot<T>(
  identity: SnapshotIdentity
): Promise<SnapshotRecord<T> | undefined> {
  requireSnapshotIdentity(identity);
  const db = await database();
  const record = await db.get('snapshots', snapshotIdentityKey(identity));
  if (!record || record.contractVersion !== identity.contractVersion) return undefined;
  return record as SnapshotRecord<T>;
}

export async function closeOfflineDatabase(): Promise<void> {
  if (!databasePromise) return;
  const db = await databasePromise;
  db.close();
  databasePromise = undefined;
}

export async function resetOfflineDatabase(): Promise<void> {
  await closeOfflineDatabase();
  await deleteDB(DATABASE_NAME);
}
