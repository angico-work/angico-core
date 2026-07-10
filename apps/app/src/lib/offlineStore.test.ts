import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ObservacaoInput } from '../types';
import {
  clearOfflineOwner,
  discardOutboxEntry,
  clearMessageDraft,
  enqueueMessage,
  enqueueObservation,
  getLocalMessage,
  getLocalObservation,
  getMessageAttachmentFile,
  getSyncMetadata,
  getOfflineOwnerState,
  listLocalMessages,
  loadMessageDraft,
  listOutbox,
  markOutboxStatus,
  recordSyncAttempt,
  reviseObservation,
  saveMessageDraft,
  resetOfflineDatabase
} from './offlineStore';

const observation: ObservacaoInput = {
  workspaceId: 'territorio-a',
  categoria: 'Água e Saneamento',
  titulo: 'Nascente sem proteção',
  descricao: 'Registro feito durante a caminhada.'
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
});
