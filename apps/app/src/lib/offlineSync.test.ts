import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservacaoInput } from '../types';
import { getSession } from './api';
import {
  enqueueObservation,
  enqueueMessage,
  getLocalMessage,
  getMessageAttachmentFile,
  getLocalObservation,
  listOutbox,
  resetOfflineDatabase
} from './offlineStore';
import {
  captureMessage,
  retryPendingObservations,
  syncPendingMessages,
  syncPendingObservations
} from './offlineSync';

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

  it('sends a queued message with the same idempotency metadata and confirms it locally', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Registro da visita.',
      attachments: [new File(['relato'], 'relato.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const remote = {
      id: 91,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: 7,
      senderNome: 'Ana',
      corpo: queued.body,
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queued.clientMessageId,
      deviceId: queued.deviceId,
      status: 'ENVIADA',
      occurredAt: queued.occurredAt,
      recordedAt: '2026-07-10T14:25:00.000Z',
      createdAt: '2026-07-10T14:25:00.000Z',
      anexos: [{
        id: 4,
        originalFilename: 'relato.txt',
        contentType: 'text/plain',
        sizeBytes: 6,
        attachmentType: 'ARQUIVO',
        createdAt: '2026-07-10T14:25:00.000Z'
      }],
      relacoes: []
    };
    const fetchMock = vi.fn().mockResolvedValue(response(201, remote));
    vi.stubGlobal('fetch', fetchMock);

    const summary = await syncPendingMessages({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary).toMatchObject({ attempted: 1, synced: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/mensagens/conversas/12/mensagens', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Idempotency-Key': queued.clientMessageId,
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('corpo')).toBe('Registro da visita.');
    expect(form.get('clientMessageId')).toBe(queued.clientMessageId);
    expect(form.get('deviceId')).toBe(queued.deviceId);
    expect(form.get('occurredAt')).toBe(queued.occurredAt);
    expect((form.get('attachments') as File).name).toBe('relato.txt');
    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId)).toMatchObject({
      syncStatus: 'SYNCED',
      remote: { id: 91 }
    });
  });

  it('keeps a message and its blob after a transient failure for an idempotent retry', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Ainda no aparelho.',
      attachments: [new File(['prova'], 'prova.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const localBefore = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    const fetchMock = vi.fn().mockResolvedValue(response(503, { detail: 'indisponível' }));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingMessages({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    const local = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    expect(local).toMatchObject({ syncStatus: 'RETRYABLE_ERROR', body: 'Ainda no aparelho.' });
    expect(await getMessageAttachmentFile(localBefore!.attachments[0].blobKey)).toMatchObject({ name: 'prova.txt' });
    expect((await listOutbox('ana.sp', 'territorio-a'))[0]).toMatchObject({
      id: queued.clientMessageId,
      operation: 'MESSAGE_SEND',
      status: 'RETRYABLE_ERROR'
    });
  });

  it('marks a message conflict without changing its client identity', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Conteúdo local.', attachments: []
    }, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(409, { detail: 'chave usada com outro conteúdo' })));

    await syncPendingMessages({ ownerId: 'ana.sp' });

    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId)).toMatchObject({
      clientMessageId: queued.clientMessageId,
      syncStatus: 'CONFLICT',
      lastError: 'chave usada com outro conteúdo'
    });
  });

  it('queues a text message while offline without attempting the network', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await captureMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Anotação offline.', attachments: []
    });

    expect(result.status).toBe('QUEUED');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalMessage('ana.sp', 'territorio-a', result.clientMessageId)).toMatchObject({
      body: 'Anotação offline.',
      syncStatus: 'QUEUED'
    });
  });
});
