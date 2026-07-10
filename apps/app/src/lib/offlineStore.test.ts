import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ObservacaoInput } from '../types';
import {
  enqueueObservation,
  getLocalObservation,
  listOutbox,
  markOutboxStatus,
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
});
