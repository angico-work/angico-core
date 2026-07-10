import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservacaoInput } from '../types';
import { getSession } from './api';
import {
  enqueueObservation,
  getLocalObservation,
  listOutbox,
  resetOfflineDatabase
} from './offlineStore';
import { retryPendingObservations, syncPendingObservations } from './offlineSync';

const session = {
  pessoaId: 7,
  nome: 'Ana',
  email: 'ana@example.test',
  angicoId: 'ana.sp',
  papel: 'MEMBER',
  workspaceId: 'territorio-a',
  expiresAt: '2099-01-01T00:00:00Z',
  csrfToken: 'csrf-secret'
};

const observation: ObservacaoInput = {
  workspaceId: 'territorio-a',
  categoria: 'Água e Saneamento',
  titulo: 'Nascente sem proteção'
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

describe('offline synchronization', () => {
  beforeEach(async () => {
    await resetOfflineDatabase();
    localStorage.clear();
    localStorage.setItem('angico.session', JSON.stringify(session));
    vi.restoreAllMocks();
  });

  it('sends the idempotency key and marks the local entity as synchronized', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    const remote = { ...queued, id: 31, status: 'ABERTA', createdAt: queued.occurredAt };
    const fetchMock = vi.fn().mockResolvedValue(response(201, remote));
    vi.stubGlobal('fetch', fetchMock);

    const summary = await syncPendingObservations({
      ownerId: 'ana.sp', workspaceId: 'territorio-a'
    });

    expect(summary).toMatchObject({ attempted: 1, synced: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/observacoes', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Idempotency-Key': queued.clientMutationId,
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      clientMutationId: queued.clientMutationId,
      deviceId: queued.deviceId,
      occurredAt: queued.occurredAt
    });
    const local = await getLocalObservation(
      'ana.sp', 'territorio-a', queued.clientMutationId
    );
    expect(local?.syncStatus).toBe('SYNCED');
    expect(local?.remote?.id).toBe(31);
  });

  it('keeps transient failures retryable with backoff', async () => {
    await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'unavailable' })));

    const summary = await syncPendingObservations({ ownerId: 'ana.sp' });

    const [entry] = await listOutbox('ana.sp', 'territorio-a');
    expect(summary.retryable).toBe(1);
    expect(entry.status).toBe('RETRYABLE_ERROR');
    expect(Date.parse(entry.nextAttemptAt)).toBeGreaterThan(Date.now());
  });

  it('separates conflicts, actionable validation failures and expired sessions', async () => {
    await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(409, { detail: 'conflict' })));
    await syncPendingObservations({ ownerId: 'ana.sp' });
    expect((await listOutbox('ana.sp'))[0].status).toBe('CONFLICT');

    await resetOfflineDatabase();
    await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(422, { detail: 'invalid' })));
    await syncPendingObservations({ ownerId: 'ana.sp' });
    expect((await listOutbox('ana.sp'))[0].status).toBe('ACTION_REQUIRED');

    await resetOfflineDatabase();
    await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { detail: 'expired' })));
    await syncPendingObservations({ ownerId: 'ana.sp' });
    expect((await listOutbox('ana.sp'))[0].status).toBe('BLOCKED');
    expect(getSession()).toBeNull();
  });

  it('never sends another owner partition', async () => {
    await enqueueObservation(observation, 'ana.sp');
    await enqueueObservation(observation, 'bia.sp');
    const fetchMock = vi.fn().mockResolvedValue(response(201, {
      id: 1, status: 'ABERTA', createdAt: new Date().toISOString()
    }));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingObservations({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await listOutbox('bia.sp'))[0].status).toBe('QUEUED');
  });

  it('retries a blocked entry only after a new authenticated session and explicit request', async () => {
    await enqueueObservation(observation, 'ana.sp');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { detail: 'expired' }))
      .mockResolvedValueOnce(response(201, { id: 41, status: 'ABERTA', createdAt: new Date().toISOString() }));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingObservations({ ownerId: 'ana.sp' });
    expect((await listOutbox('ana.sp'))[0].status).toBe('BLOCKED');
    expect(getSession()).toBeNull();

    await expect(retryPendingObservations('ana.sp', 'territorio-a')).rejects.toThrow('Entre novamente');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    localStorage.setItem('angico.session', JSON.stringify(session));
    await expect(retryPendingObservations('ana.sp', 'territorio-a')).rejects.toThrow('validada');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    await retryPendingObservations('ana.sp', 'territorio-a');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await listOutbox('ana.sp'))[0].status).toBe('SYNCED');
  });

  it('lets an explicit retry bypass transient backoff without touching review states', async () => {
    await enqueueObservation(observation, 'ana.sp');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(503, { detail: 'unavailable' }))
      .mockResolvedValueOnce(response(201, { id: 51, status: 'ABERTA', createdAt: new Date().toISOString() }));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingObservations({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });
    expect((await listOutbox('ana.sp'))[0].status).toBe('RETRYABLE_ERROR');

    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    await retryPendingObservations('ana.sp', 'territorio-a');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await listOutbox('ana.sp'))[0].status).toBe('SYNCED');
  });

  it('refuses a manual retry for a different authenticated owner', async () => {
    await enqueueObservation(observation, 'ana.sp');
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    localStorage.setItem('angico.session', JSON.stringify({ ...session, angicoId: 'bia.sp', pessoaId: 8 }));

    await expect(retryPendingObservations('ana.sp', 'territorio-a')).rejects.toThrow('outra pessoa');
  });
});
