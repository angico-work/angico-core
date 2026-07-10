import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ObservacaoInput } from '../types';
import {
  clearOfflineOwner,
  discardOutboxEntry,
  enqueueObservation,
  getLocalObservation,
  getSyncMetadata,
  getOfflineOwnerState,
  listOutbox,
  markOutboxStatus,
  recordSyncAttempt,
  reviseObservation,
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
});
