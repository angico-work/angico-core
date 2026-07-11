import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { EvidenciaInput, ObservacaoInput } from '../types';
import {
  clearOfflineOwner,
  closeOfflineDatabase,
  discardOutboxEntry,
  clearMessageDraft,
  cacheConversations,
  cacheRemoteMessages,
  claimOutboxEntry,
  enqueueMessage,
  enqueueObservation,
  enqueueEvidence,
  getEvidenceFile,
  getLocalEvidence,
  getLocalMessage,
  getLocalObservation,
  getMessageAttachmentFile,
  getSyncMetadata,
  getOfflineOwnerState,
  listLocalMessages,
  loadCachedConversations,
  loadMessageDraft,
  loadSnapshot,
  listOutbox,
  markOutboxStatus,
  recordSyncAttempt,
  recoverMessageAsDraft,
  renewOutboxLease,
  reviseObservation,
  saveMessageDraft,
  saveSnapshot,
  resetOfflineDatabase
} from './offlineStore';

const observation: ObservacaoInput = {
  workspaceId: 'territorio-a',
  categoria: 'Água e Saneamento',
  titulo: 'Nascente sem proteção',
  descricao: 'Registro feito durante a caminhada.'
};

const evidence: EvidenciaInput = {
  workspaceId: 'territorio-a',
  subjectType: 'OBSERVACAO',
  subjectId: 42,
  title: 'Foto da nascente',
  description: 'Registro feito na visita de campo.',
  capturedAt: '2026-07-10T12:00:00.000Z',
  file: new File(['evidencia'], 'nascente.txt', { type: 'text/plain' })
};

describe('offline observation store', () => {
  beforeEach(async () => {
    await resetOfflineDatabase();
  });

  it('persists the local entity and outbox operation atomically', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');

    const outbox = await listOutbox('ana.sp', 'territorio-a');
    const local = await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId);

    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      id: queued.clientMutationId,
      operation: 'CREATE_OBSERVATION',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      status: 'QUEUED',
      attemptCount: 0
    });
    expect(outbox[0].body).toMatchObject({
      clientMutationId: queued.clientMutationId,
      deviceId: queued.deviceId,
      occurredAt: queued.occurredAt
    });
    expect(outbox[0]).not.toHaveProperty('csrfToken');
    expect(outbox[0]).not.toHaveProperty('token');
    expect(local).toMatchObject({
      clientMutationId: queued.clientMutationId,
      syncStatus: 'QUEUED',
      data: expect.objectContaining({ titulo: observation.titulo })
    });
  });

  it('keeps pending records isolated by owner and workspace', async () => {
    await enqueueObservation(observation, 'ana.sp');
    await enqueueObservation({ ...observation, workspaceId: 'territorio-b' }, 'ana.sp');
    await enqueueObservation(observation, 'bia.sp');

    expect(await listOutbox('ana.sp', 'territorio-a')).toHaveLength(1);
    expect(await listOutbox('ana.sp', 'territorio-b')).toHaveLength(1);
    expect(await listOutbox('bia.sp', 'territorio-a')).toHaveLength(1);
  });

  it('updates both queue and local entity when synchronization changes state', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');

    await markOutboxStatus(queued.clientMutationId, 'CONFLICT', {
      message: 'O mesmo identificador foi usado com conteúdo diferente.'
    });

    const [entry] = await listOutbox('ana.sp', 'territorio-a');
    const local = await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId);
    expect(entry.status).toBe('CONFLICT');
    expect(entry.lastError).toContain('conteúdo diferente');
    expect(local?.syncStatus).toBe('CONFLICT');
  });

  it('refuses to erase an owner partition while unsynchronized work exists', async () => {
    await enqueueObservation(observation, 'ana.sp');

    await expect(clearOfflineOwner('ana.sp')).rejects.toThrow('1 registro');
    expect(await listOutbox('ana.sp')).toHaveLength(1);
  });

  it('clears only the confirmed owner partition', async () => {
    await enqueueObservation(observation, 'ana.sp');
    await enqueueObservation(observation, 'bia.sp');

    await clearOfflineOwner('ana.sp', { discardPending: true });

    expect(await listOutbox('ana.sp')).toEqual([]);
    expect(await listOutbox('bia.sp')).toHaveLength(1);
  });

  it('creates a new operation from an explicit revision and preserves the rejected version', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    await markOutboxStatus(queued.clientMutationId, 'CONFLICT', { message: 'Conteudo divergente.' });

    const revised = await reviseObservation(
      queued.clientMutationId,
      'ana.sp',
      'territorio-a',
      { titulo: 'Nascente revisada', descricao: 'Local conferido em campo.' }
    );

    const entries = await listOutbox('ana.sp', 'territorio-a');
    const original = entries.find((entry) => entry.id === queued.clientMutationId);
    const replacement = entries.find((entry) => entry.id === revised.clientMutationId);
    expect(entries).toHaveLength(2);
    expect(original).toMatchObject({ status: 'SUPERSEDED', body: { titulo: observation.titulo } });
    expect(replacement).toMatchObject({
      status: 'QUEUED',
      body: { titulo: 'Nascente revisada', descricao: 'Local conferido em campo.' }
    });
    expect(revised.clientMutationId).not.toBe(queued.clientMutationId);
    expect(revised.occurredAt).toBe(queued.occurredAt);
    expect(revised.deviceId).toBe(queued.deviceId);
    expect((await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))?.syncStatus)
      .toBe('SUPERSEDED');
    expect((await getLocalObservation('ana.sp', 'territorio-a', revised.clientMutationId))?.data.titulo)
      .toBe('Nascente revisada');
  });

  it('discards only with an explicit operation while retaining the local record', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    await markOutboxStatus(queued.clientMutationId, 'ACTION_REQUIRED', { message: 'Revise o titulo.' });

    await discardOutboxEntry(queued.clientMutationId, 'ana.sp', 'territorio-a');

    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({
      status: 'DISCARDED',
      body: { titulo: observation.titulo },
      lastError: 'Revise o titulo.'
    });
    expect((await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))?.syncStatus)
      .toBe('DISCARDED');
    expect((await getOfflineOwnerState('ana.sp')).unsynced).toBe(0);
  });

  it('records attempts separately from successful synchronization per owner and workspace', async () => {
    const first = new Date('2026-07-10T12:00:00Z');
    const second = new Date('2026-07-10T12:05:00Z');

    await recordSyncAttempt('ana.sp', 'territorio-a', false, first);
    await recordSyncAttempt('ana.sp', 'territorio-a', true, second);

    expect(await getSyncMetadata('ana.sp', 'territorio-a')).toMatchObject({
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      lastAttemptAt: second.toISOString(),
      lastSuccessAt: second.toISOString()
    });
    expect(await getSyncMetadata('bia.sp', 'territorio-a')).toBeUndefined();
  });

  it('restores a message draft and its attachments only in the matching partition', async () => {
    const attachment = new File(['relato de campo'], 'relato.txt', { type: 'text/plain' });

    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Revisar com o grupo.', [attachment]);

    const restored = await loadMessageDraft('ana.sp', 'territorio-a', 12);
    expect(restored).toMatchObject({ body: 'Revisar com o grupo.' });
    expect(restored?.attachments).toHaveLength(1);
    expect(restored?.attachments[0]).toMatchObject({ name: 'relato.txt', type: 'text/plain', size: 15 });
    expect(await restored?.attachments[0].text()).toBe('relato de campo');
    expect(await loadMessageDraft('bia.sp', 'territorio-a', 12)).toBeUndefined();
    expect(await loadMessageDraft('ana.sp', 'territorio-b', 12)).toBeUndefined();
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 13)).toBeUndefined();
  });

  it('can clear one persisted draft without touching another conversation', async () => {
    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Primeiro');
    await saveMessageDraft('ana.sp', 'territorio-a', 13, 'Segundo');

    await clearMessageDraft('ana.sp', 'territorio-a', 12);

    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12)).toBeUndefined();
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 13)).toMatchObject({ body: 'Segundo' });
  });

  it('treats a non-empty message draft as unsent work during logout cleanup', async () => {
    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Ainda não enviada.');

    expect(await getOfflineOwnerState('ana.sp')).toMatchObject({ unsynced: 1, drafts: 1 });
    await expect(clearOfflineOwner('ana.sp')).rejects.toThrow('1 registro');
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12)).toMatchObject({ body: 'Ainda não enviada.' });
  });

  it('persists an offline message, its blob and its fixed operation atomically', async () => {
    const file = new File(['imagem'], 'nascente.png', { type: 'image/png' });

    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Registro da nascente.',
      attachments: [file]
    }, 'ana.sp');

    const outbox = await listOutbox('ana.sp', 'territorio-a');
    const local = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      id: queued.clientMessageId,
      operation: 'MESSAGE_SEND',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      status: 'QUEUED',
      body: {
        conversationId: 12,
        clientMessageId: queued.clientMessageId,
        deviceId: queued.deviceId,
        occurredAt: queued.occurredAt,
        body: 'Registro da nascente.'
      }
    });
    expect(local).toMatchObject({
      conversationId: 12,
      clientMessageId: queued.clientMessageId,
      syncStatus: 'QUEUED',
      attachments: [{ name: 'nascente.png', type: 'image/png', size: 6 }]
    });
    const stored = await getMessageAttachmentFile(local!.attachments[0].blobKey);
    expect(stored).toMatchObject({ name: 'nascente.png', type: 'image/png', size: 6 });
    expect(await stored?.text()).toBe('imagem');
    expect(await getMessageAttachmentFile(local!.attachments[0].blobKey, 'bia.sp', 'territorio-a')).toBeUndefined();
    expect(await getMessageAttachmentFile(local!.attachments[0].blobKey, 'ana.sp', 'territorio-b')).toBeUndefined();
  });

  it('replaces the matching draft with the queued operation in the same local transaction', async () => {
    const file = new File(['campo'], 'campo.txt', { type: 'text/plain' });
    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Conteúdo pronto.', [file]);

    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Conteúdo pronto.',
      attachments: [file]
    }, 'ana.sp');

    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12)).toBeUndefined();
    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId)).toMatchObject({
      body: 'Conteúdo pronto.',
      syncStatus: 'QUEUED'
    });
    expect(await listOutbox('ana.sp', 'territorio-a')).toHaveLength(1);
  });

  it('keeps local message timelines isolated by owner, workspace and conversation', async () => {
    await enqueueMessage({ workspaceId: 'territorio-a', conversationId: 12, body: 'Ana A', attachments: [] }, 'ana.sp');
    await enqueueMessage({ workspaceId: 'territorio-a', conversationId: 13, body: 'Ana B', attachments: [] }, 'ana.sp');
    await enqueueMessage({ workspaceId: 'territorio-b', conversationId: 12, body: 'Ana C', attachments: [] }, 'ana.sp');
    await enqueueMessage({ workspaceId: 'territorio-a', conversationId: 12, body: 'Bia A', attachments: [] }, 'bia.sp');

    expect(await listLocalMessages('ana.sp', 'territorio-a', 12)).toHaveLength(1);
    expect(await listLocalMessages('ana.sp', 'territorio-a', 13)).toHaveLength(1);
    expect(await listLocalMessages('ana.sp', 'territorio-b', 12)).toHaveLength(1);
    expect(await listLocalMessages('bia.sp', 'territorio-a', 12)).toHaveLength(1);
  });

  it('recovers a rejected message as a draft and closes the original operation explicitly', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Revisar antes de reenviar.',
      attachments: [new File(['anexo'], 'anexo.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    await markOutboxStatus(queued.clientMessageId, 'CONFLICT', { message: 'Conteúdo divergente.' });

    await recoverMessageAsDraft(queued.clientMessageId, 'ana.sp', 'territorio-a');

    const draft = await loadMessageDraft('ana.sp', 'territorio-a', 12);
    expect(draft).toMatchObject({ body: 'Revisar antes de reenviar.' });
    expect(draft?.attachments).toHaveLength(1);
    expect(draft?.attachments[0].name).toBe('anexo.txt');
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'DISCARDED' });
    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId)).toMatchObject({
      syncStatus: 'DISCARDED'
    });
  });

  it('refuses to overwrite another local draft during message recovery', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Mensagem recusada.', attachments: []
    }, 'ana.sp');
    await markOutboxStatus(queued.clientMessageId, 'ACTION_REQUIRED', { message: 'Revise.' });
    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Meu rascunho atual.');

    await expect(recoverMessageAsDraft(queued.clientMessageId, 'ana.sp', 'territorio-a'))
      .rejects.toThrow('Já existe um rascunho');
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12)).toMatchObject({ body: 'Meu rascunho atual.' });
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'ACTION_REQUIRED' });
  });

  it('discards a rejected message and releases its private local attachment', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: '',
      attachments: [new File(['descartar'], 'descartar.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const local = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    await markOutboxStatus(queued.clientMessageId, 'ACTION_REQUIRED', { message: 'Arquivo recusado.' });

    await discardOutboxEntry(queued.clientMessageId, 'ana.sp', 'territorio-a');

    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'DISCARDED' });
    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId)).toMatchObject({
      syncStatus: 'DISCARDED'
    });
    expect(await getMessageAttachmentFile(local!.attachments[0].blobKey)).toBeUndefined();
  });

  it('removes drafts, messages and blobs with an explicitly confirmed owner cleanup', async () => {
    await saveMessageDraft('ana.sp', 'territorio-a', 12, 'Rascunho', [
      new File(['rascunho'], 'rascunho.txt', { type: 'text/plain' })
    ]);
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Na fila', attachments: [
        new File(['fila'], 'fila.txt', { type: 'text/plain' })
      ]
    }, 'ana.sp');
    const blobKey = (await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId))!.attachments[0].blobKey;

    await clearOfflineOwner('ana.sp', { discardPending: true });

    expect(await listLocalMessages('ana.sp', 'territorio-a', 12)).toEqual([]);
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12)).toBeUndefined();
    expect(await getMessageAttachmentFile(blobKey)).toBeUndefined();
  });

  it('keeps the last confirmed conversation list available only to its owner and workspace', async () => {
    const conversation = {
      id: 12,
      workspaceId: 'territorio-a',
      territorioId: 4,
      contextEntityType: 'TERRITORIO',
      contextEntityId: '4',
      titulo: 'Cuidado da nascente',
      createdByPessoaId: 7,
      status: 'ATIVA',
      createdAt: '2026-07-10T12:00:00Z',
      updatedAt: '2026-07-10T12:00:00Z',
      unreadCount: 2,
      mensagens: []
    };

    await cacheConversations('ana.sp', 'territorio-a', [conversation]);

    expect(await loadCachedConversations('ana.sp', 'territorio-a')).toEqual([conversation]);
    expect(await loadCachedConversations('bia.sp', 'territorio-a')).toEqual([]);
    expect(await loadCachedConversations('ana.sp', 'territorio-b')).toEqual([]);
  });

  it('caches confirmed remote messages without duplicating the matching local operation', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Confirmada.',
      attachments: [new File(['prova'], 'prova.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const localBefore = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    const remote = {
      id: 92,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: 7,
      senderNome: 'Ana',
      corpo: 'Confirmada.',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queued.clientMessageId,
      deviceId: queued.deviceId,
      status: 'ENVIADA',
      occurredAt: queued.occurredAt,
      recordedAt: '2026-07-10T12:01:00Z',
      createdAt: '2026-07-10T12:01:00Z',
      anexos: [{
        id: 6,
        originalFilename: 'prova.txt',
        contentType: 'text/plain',
        sizeBytes: 5,
        attachmentType: 'ARQUIVO',
        createdAt: '2026-07-10T12:01:00Z'
      }],
      relacoes: []
    };

    await cacheRemoteMessages('ana.sp', 'territorio-a', 12, 7, [remote]);

    const cached = await listLocalMessages('ana.sp', 'territorio-a', 12);
    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject({
      clientMessageId: queued.clientMessageId,
      syncStatus: 'SYNCED',
      remote: { id: 92 }
    });
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({
      id: queued.clientMessageId,
      operation: 'MESSAGE_SEND',
      status: 'SYNCED'
    });
    expect(await getMessageAttachmentFile(localBefore!.attachments[0].blobKey)).toBeUndefined();
  });

  it('does not reconcile a remote message whose attachment multiset is incomplete', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Ainda aguardando o arquivo.',
      attachments: [new File(['prova'], 'prova.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const local = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    await cacheRemoteMessages('ana.sp', 'territorio-a', 12, 7, [{
      id: 97,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: 7,
      senderNome: 'Ana',
      corpo: 'Ainda aguardando o arquivo.',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queued.clientMessageId,
      deviceId: queued.deviceId,
      status: 'ENVIADA',
      occurredAt: queued.occurredAt,
      recordedAt: queued.occurredAt,
      createdAt: queued.occurredAt,
      anexos: [],
      relacoes: []
    }]);

    const preserved = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    expect(preserved).toMatchObject({ syncStatus: 'QUEUED' });
    expect(preserved?.remote).toBeUndefined();
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'QUEUED' });
    expect(await getMessageAttachmentFile(local!.attachments[0].blobKey, 'ana.sp', 'territorio-a'))
      .toBeDefined();
  });

  it('does not reconcile a client message identifier returned for another conversation', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Conversa correta.', attachments: []
    }, 'ana.sp');
    const mismatched = {
      id: 94,
      workspaceId: 'territorio-a',
      conversaId: 13,
      senderPessoaId: 7,
      senderNome: 'Ana',
      corpo: 'Outra conversa.',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queued.clientMessageId,
      deviceId: queued.deviceId,
      status: 'ENVIADA',
      occurredAt: queued.occurredAt,
      recordedAt: queued.occurredAt,
      createdAt: queued.occurredAt,
      anexos: [],
      relacoes: []
    };

    await cacheRemoteMessages('ana.sp', 'territorio-a', 13, 7, [mismatched]);

    const localAfter = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    expect(localAfter).toMatchObject({
      conversationId: 12,
      syncStatus: 'QUEUED'
    });
    expect(localAfter?.remote).toBeUndefined();
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'QUEUED' });
  });

  it('does not reconcile another sender message that happens to reuse the local client id', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Mensagem da Ana.', attachments: []
    }, 'ana.sp');
    const fromAnotherSender = {
      id: 95,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: 8,
      senderNome: 'Bia',
      corpo: 'Mensagem da Bia.',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queued.clientMessageId,
      deviceId: 'device-bia',
      status: 'ENVIADA',
      occurredAt: queued.occurredAt,
      recordedAt: queued.occurredAt,
      createdAt: queued.occurredAt,
      anexos: [],
      relacoes: []
    };

    await cacheRemoteMessages('ana.sp', 'territorio-a', 12, 7, [fromAnotherSender]);

    const messages = await listLocalMessages('ana.sp', 'territorio-a', 12);
    expect(messages).toHaveLength(2);
    expect(messages.find((message) => message.clientMessageId === queued.clientMessageId && !message.remote))
      .toMatchObject({ syncStatus: 'QUEUED', body: 'Mensagem da Ana.' });
    expect(messages.find((message) => message.remote?.id === 95)?.remote).toMatchObject({ senderPessoaId: 8 });
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({ status: 'QUEUED' });
  });

  it('upgrades the observation-only database without losing its pending operation', async () => {
    const legacy = await openDB('angico-operational-data', 1, {
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
    const now = '2026-07-10T12:00:00.000Z';
    await legacy.add('outbox', {
      id: 'legacy-observation',
      operation: 'CREATE_OBSERVATION',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      localEntityKey: 'legacy-local',
      body: {
        ...observation,
        clientMutationId: 'legacy-observation',
        occurredAt: now,
        deviceId: 'legacy-device'
      },
      status: 'QUEUED',
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      nextAttemptAt: now
    });
    legacy.close();

    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([
      expect.objectContaining({ id: 'legacy-observation', operation: 'CREATE_OBSERVATION' })
    ]);
    await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Depois da migração.', attachments: []
    }, 'ana.sp');
    expect(await listLocalMessages('ana.sp', 'territorio-a', 12)).toHaveLength(1);
  });

  it('persists evidence metadata, outbox entry and blob in one owner partition', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');

    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([
      expect.objectContaining({
        id: queued.clientMutationId,
        operation: 'EVIDENCE_CREATE',
        ownerId: 'ana.sp',
        workspaceId: 'territorio-a',
        body: expect.objectContaining({
          subjectType: 'OBSERVACAO',
          subjectId: 42,
          clientMutationId: queued.clientMutationId,
          deviceId: queued.deviceId
        })
      })
    ]);
    const local = await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId);
    expect(local).toMatchObject({
      clientMutationId: queued.clientMutationId,
      syncStatus: 'QUEUED',
      data: { title: 'Foto da nascente' }
    });
    expect(local?.data.file?.blobKey).toBeTruthy();
    expect(local?.data.file).toMatchObject({
      size: 9,
      sha256: '769c9e0034dbc4088b0409174315aaa092dca9c3cfd978658f0c5880455e3255'
    });
    const stored = await getEvidenceFile(local!.data.file!.blobKey, 'ana.sp', 'territorio-a');
    expect(stored).toMatchObject({ name: 'nascente.txt', type: 'text/plain', size: 9 });
    expect(await stored?.text()).toBe('evidencia');
    expect(await getEvidenceFile(local!.data.file!.blobKey, 'bia.sp', 'territorio-a')).toBeUndefined();
  });

  it('rejects evidence without a confirmed remote subject before writing locally', async () => {
    await expect(enqueueEvidence({ ...evidence, subjectId: 0 }, 'ana.sp'))
      .rejects.toThrow('confirmado');

    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([]);
  });

  it.each([
    new File(['texto'], 'evidencia.exe', { type: 'text/plain' }),
    new File(['texto'], 'evidencia.png', { type: 'application/pdf' })
  ])('rejects an evidence file whose extension and declared type do not match', async (file) => {
    await expect(enqueueEvidence({ ...evidence, file }, 'ana.sp'))
      .rejects.toThrow('compatível com sua extensão');

    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([]);
  });

  it('keeps evidence and its blob across a database connection reload', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    const blobKey = (await getLocalEvidence(
      'ana.sp', 'territorio-a', queued.clientMutationId
    ))!.data.file!.blobKey;

    await closeOfflineDatabase();

    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a'))
      .toMatchObject({ name: 'nascente.txt', size: 9 });
  });

  it('partitions snapshots by owner, workspace, resource, query and root', async () => {
    const identity = {
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      resource: 'evidencias',
      query: { subjectId: 42, subjectType: 'OBSERVACAO' },
      root: 'OBSERVACAO:42',
      contractVersion: 1
    } as const;
    await saveSnapshot(identity, [{ id: 7 }], new Date('2026-07-10T12:05:00.000Z'));

    expect(await loadSnapshot(identity)).toMatchObject({
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      resource: 'evidencias',
      queryKey: '[["subjectId",42],["subjectType","OBSERVACAO"]]',
      rootKey: 'OBSERVACAO:42',
      contractVersion: 1,
      savedAt: '2026-07-10T12:05:00.000Z',
      payload: [{ id: 7 }]
    });
    expect(await loadSnapshot({ ...identity, ownerId: 'bia.sp' })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, workspaceId: 'territorio-b' })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, resource: 'resultados' })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, query: { subjectId: 43 } })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, root: 'OBSERVACAO:43' })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, contractVersion: 2 })).toBeUndefined();
  });

  it('uses a canonical snapshot key regardless of query property order', async () => {
    const base = {
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    };
    await saveSnapshot({ ...base, query: { subjectType: 'OBSERVACAO', subjectId: 42 } }, ['confirmado']);

    expect(await loadSnapshot({ ...base, query: { subjectId: 42, subjectType: 'OBSERVACAO' } }))
      .toMatchObject({ payload: ['confirmado'] });
  });

  it('preserves query value types in snapshot identities', async () => {
    const base = {
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    };
    await saveSnapshot({ ...base, query: { subjectId: 42, active: true, optional: null } }, ['numero']);

    expect(await loadSnapshot({
      ...base, query: { subjectId: '42', active: true, optional: null }
    })).toBeUndefined();
  });

  it('normalizes snapshot resource and root before building the key', async () => {
    const padded = {
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      resource: '  EVIDENCIAS  ',
      root: '  observacao : 42  ',
      contractVersion: 1
    };
    await saveSnapshot(padded, ['normalizado']);

    expect(await loadSnapshot({
      ...padded, resource: 'evidencias', root: 'OBSERVACAO:42'
    })).toMatchObject({
      resource: 'evidencias',
      rootKey: 'OBSERVACAO:42',
      payload: ['normalizado']
    });
  });

  it('does not let an older request overwrite a newer snapshot', async () => {
    const identity = {
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'mapa', contractVersion: 1
    };
    await saveSnapshot(identity, ['novo'], new Date('2026-07-10T12:00:02Z'), 200);

    const retained = await saveSnapshot(
      identity,
      ['antigo'],
      new Date('2026-07-10T12:00:03Z'),
      100
    );

    expect(retained.payload).toEqual(['novo']);
    expect(await loadSnapshot(identity)).toMatchObject({
      payload: ['novo'],
      requestStartedAt: 200,
      savedAt: '2026-07-10T12:00:02.000Z'
    });
  });

  it('keeps SYNCED monotonic when an expired claim confirms before a newer failure', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    const startedAt = new Date(queued.occurredAt);
    const first = await claimOutboxEntry(queued.clientMutationId, startedAt);
    const second = await claimOutboxEntry(
      queued.clientMutationId,
      new Date(startedAt.getTime() + 31_000)
    );
    expect(first?.leaseId).toBeTruthy();
    expect(second?.leaseId).toBeTruthy();
    expect(second?.leaseGeneration).toBe((first?.leaseGeneration ?? 0) + 1);
    const remote = {
      ...queued,
      id: 81,
      status: 'ABERTA',
      createdAt: '2026-07-10T12:00:31.000Z'
    };

    await Promise.all([
      markOutboxStatus(queued.clientMutationId, 'RETRYABLE_ERROR', {
        message: 'falha da segunda tentativa',
        expectedClaim: { leaseId: second!.leaseId!, leaseGeneration: second!.leaseGeneration! }
      }),
      markOutboxStatus(queued.clientMutationId, 'SYNCED', {
        remote,
        expectedClaim: { leaseId: first!.leaseId!, leaseGeneration: first!.leaseGeneration! }
      })
    ]);

    await markOutboxStatus(queued.clientMutationId, 'RETRYABLE_ERROR', {
      message: 'falha tardia',
      expectedClaim: { leaseId: second!.leaseId!, leaseGeneration: second!.leaseGeneration! }
    });

    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({
      status: 'SYNCED',
      lastError: undefined
    });
    expect(await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'SYNCED', remote: { id: 81 } });
  });

  it('renews only the active claim and prevents a second claim at the old deadline', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    const startedAt = new Date(queued.occurredAt);
    const claim = await claimOutboxEntry(queued.clientMutationId, startedAt);

    expect(await renewOutboxLease(
      queued.clientMutationId,
      { leaseId: claim!.leaseId!, leaseGeneration: claim!.leaseGeneration! },
      new Date(startedAt.getTime() + 20_000)
    )).toBe(true);
    expect(await claimOutboxEntry(
      queued.clientMutationId,
      new Date(startedAt.getTime() + 31_000)
    )).toBeUndefined();
  });

  it('clears evidence and snapshots only for the explicitly confirmed owner', async () => {
    const ana = await enqueueEvidence(evidence, 'ana.sp');
    const bia = await enqueueEvidence(evidence, 'bia.sp');
    await saveSnapshot({
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    }, [{ id: 1 }]);
    await saveSnapshot({
      ownerId: 'bia.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    }, [{ id: 2 }]);

    await clearOfflineOwner('ana.sp', { discardPending: true });

    expect(await getLocalEvidence('ana.sp', 'territorio-a', ana.clientMutationId)).toBeUndefined();
    expect(await getLocalEvidence('bia.sp', 'territorio-a', bia.clientMutationId)).toBeDefined();
    expect(await loadSnapshot({
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    })).toBeUndefined();
    expect(await loadSnapshot({
      ownerId: 'bia.sp', workspaceId: 'territorio-a', resource: 'evidencias', contractVersion: 1
    })).toMatchObject({ payload: [{ id: 2 }] });
  });

  it('upgrades a version 3 database without losing pending data', async () => {
    const legacy = await openDB('angico-operational-data', 3, {
      upgrade(db) {
        const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
        outbox.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        outbox.createIndex('by-status', 'status');
        const entities = db.createObjectStore('entities', { keyPath: 'key' });
        entities.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        const messages = db.createObjectStore('messages', { keyPath: 'key' });
        messages.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        messages.createIndex('by-owner-workspace-conversation', ['ownerId', 'workspaceId', 'conversationId']);
        const conversations = db.createObjectStore('conversations', { keyPath: 'key' });
        conversations.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        const drafts = db.createObjectStore('drafts', { keyPath: 'key' });
        drafts.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        const blobs = db.createObjectStore('blobs', { keyPath: 'key' });
        blobs.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
        const syncMeta = db.createObjectStore('syncMeta', { keyPath: 'key' });
        syncMeta.createIndex('by-owner-workspace', ['ownerId', 'workspaceId']);
      }
    });
    const now = '2026-07-10T12:00:00.000Z';
    await legacy.add('outbox', {
      id: 'v3-observation', operation: 'CREATE_OBSERVATION', ownerId: 'ana.sp',
      workspaceId: 'territorio-a', localEntityKey: 'v3-local',
      body: { ...observation, clientMutationId: 'v3-observation', occurredAt: now, deviceId: 'v3-device' },
      status: 'QUEUED', attemptCount: 0, createdAt: now, updatedAt: now, nextAttemptAt: now
    });
    await legacy.add('entities', {
      key: JSON.stringify(['ana.sp', 'territorio-a', 'v3-observation']),
      ownerId: 'ana.sp', workspaceId: 'territorio-a', clientMutationId: 'v3-observation',
      data: { ...observation, clientMutationId: 'v3-observation', occurredAt: now, deviceId: 'v3-device' },
      syncStatus: 'QUEUED', updatedAt: now
    });
    await legacy.add('messages', {
      key: JSON.stringify(['message', 'ana.sp', 'territorio-a', 'v3-message']),
      ownerId: 'ana.sp', workspaceId: 'territorio-a', conversationId: 12,
      clientMessageId: 'v3-message', body: 'Mensagem preservada', occurredAt: now,
      deviceId: 'v3-device', attachments: [], syncStatus: 'QUEUED', updatedAt: now
    });
    const blobKey = JSON.stringify(['message-blob', 'ana.sp', 'territorio-a', 'v3-blob']);
    await legacy.add('blobs', {
      key: blobKey, ownerId: 'ana.sp', workspaceId: 'territorio-a',
      bytes: new TextEncoder().encode('rascunho').buffer,
      name: 'rascunho.txt', type: 'text/plain', updatedAt: now
    });
    await legacy.add('drafts', {
      key: JSON.stringify(['message-draft', 'ana.sp', 'territorio-a', 12]),
      ownerId: 'ana.sp', workspaceId: 'territorio-a', kind: 'MESSAGE',
      value: {
        conversationId: 12,
        body: 'Rascunho preservado',
        attachments: [{ blobKey, name: 'rascunho.txt', type: 'text/plain', size: 8 }]
      },
      updatedAt: now
    });
    await legacy.add('syncMeta', {
      key: JSON.stringify(['ana.sp', 'territorio-a']),
      ownerId: 'ana.sp', workspaceId: 'territorio-a', lastAttemptAt: now, lastSuccessAt: now
    });
    legacy.close();

    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([
      expect.objectContaining({ id: 'v3-observation' })
    ]);
    expect(await getLocalObservation('ana.sp', 'territorio-a', 'v3-observation'))
      .toMatchObject({ syncStatus: 'QUEUED', data: { titulo: observation.titulo } });
    expect(await listLocalMessages('ana.sp', 'territorio-a', 12))
      .toEqual([expect.objectContaining({ clientMessageId: 'v3-message', body: 'Mensagem preservada' })]);
    expect(await loadMessageDraft('ana.sp', 'territorio-a', 12))
      .toMatchObject({ body: 'Rascunho preservado', attachments: [{ name: 'rascunho.txt', size: 8 }] });
    expect(await getMessageAttachmentFile(blobKey, 'ana.sp', 'territorio-a'))
      .toMatchObject({ name: 'rascunho.txt', size: 8 });
    expect(await getSyncMetadata('ana.sp', 'territorio-a'))
      .toMatchObject({ lastAttemptAt: now, lastSuccessAt: now });
    await closeOfflineDatabase();
    const upgraded = await openDB('angico-operational-data');
    expect(upgraded.version).toBe(4);
    expect(Array.from(upgraded.objectStoreNames)).toEqual(expect.arrayContaining(['evidences', 'snapshots']));
    upgraded.close();
  });
});
