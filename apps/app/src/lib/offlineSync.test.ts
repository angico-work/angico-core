import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvidenciaInput, ObservacaoInput } from '../types';
import { getSession } from './api';
import {
  enqueueObservation,
  enqueueMessage,
  enqueueEvidence,
  getEvidenceFile,
  getLocalEvidence,
  getLocalMessage,
  getMessageAttachmentFile,
  getLocalObservation,
  listOutbox,
  resetOfflineDatabase
} from './offlineStore';
import {
  captureEvidence,
  captureMessage,
  captureObservation,
  retryPendingEvidence,
  retryPendingMessages,
  retryPendingObservations,
  startSyncEngine,
  syncPendingMessages,
  syncPendingEvidence,
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

const evidence: EvidenciaInput = {
  workspaceId: 'territorio-a',
  subjectType: 'OBSERVACAO',
  subjectId: 42,
  title: 'Foto da nascente',
  description: 'Registro feito na visita.',
  capturedAt: '2026-07-10T12:00:00.000Z',
  file: new File(['evidencia'], 'nascente.txt', { type: 'text/plain' })
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
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
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
    const queued = await enqueueObservation(observation, 'ana.sp');
    await enqueueObservation(observation, 'bia.sp');
    const fetchMock = vi.fn().mockResolvedValue(response(201, {
      ...queued, id: 1, status: 'ABERTA', createdAt: new Date().toISOString()
    }));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingObservations({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await listOutbox('bia.sp'))[0].status).toBe('QUEUED');
  });

  it('retries a blocked entry only after a new authenticated session and explicit request', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { detail: 'expired' }))
      .mockResolvedValueOnce(response(201, {
        ...queued, id: 41, status: 'ABERTA', createdAt: new Date().toISOString()
      }));
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
    const queued = await enqueueObservation(observation, 'ana.sp');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(503, { detail: 'unavailable' }))
      .mockResolvedValueOnce(response(201, {
        ...queued, id: 51, status: 'ABERTA', createdAt: new Date().toISOString()
      }));
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

  it('rejects an observation confirmation that does not match the queued mutation', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, {
      ...queued,
      id: 52,
      workspaceId: 'territorio-b',
      status: 'ABERTA',
      createdAt: queued.occurredAt
    })));

    const summary = await syncPendingObservations({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.retryable).toBe(1);
    expect(await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'RETRYABLE_ERROR', remote: undefined });
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

  it('rejects a message confirmation whose attachment multiset differs from the queued files', async () => {
    const queued = await enqueueMessage({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Arquivo de campo.',
      attachments: [new File(['prova'], 'prova.txt', { type: 'text/plain' })]
    }, 'ana.sp');
    const local = await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, {
      id: 96,
      workspaceId: 'territorio-a',
      conversaId: 12,
      clientMessageId: queued.clientMessageId,
      anexos: [{
        id: 5,
        originalFilename: 'prova.txt',
        contentType: 'text/plain',
        sizeBytes: 99
      }]
    })));

    const summary = await syncPendingMessages({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.retryable).toBe(1);
    expect(await getLocalMessage('ana.sp', 'territorio-a', queued.clientMessageId))
      .toMatchObject({ syncStatus: 'RETRYABLE_ERROR', remote: undefined });
    expect(await getMessageAttachmentFile(local!.attachments[0].blobKey, 'ana.sp', 'territorio-a'))
      .toBeDefined();
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

  it('retries only message operations after an explicit request with a revalidated session', async () => {
    const queuedMessage = await enqueueMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'Tentar novamente.', attachments: []
    }, 'ana.sp');
    await enqueueObservation(observation, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'indisponível' })));
    await syncPendingMessages({ ownerId: 'ana.sp' });
    await syncPendingObservations({ ownerId: 'ana.sp' });
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    const sent = {
      id: 93,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: 7,
      senderNome: 'Ana',
      corpo: 'Tentar novamente.',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: queuedMessage.clientMessageId,
      deviceId: queuedMessage.deviceId,
      status: 'ENVIADA',
      occurredAt: queuedMessage.occurredAt,
      recordedAt: queuedMessage.occurredAt,
      createdAt: queuedMessage.occurredAt,
      anexos: [],
      relacoes: []
    };
    const retryFetch = vi.fn().mockResolvedValue(response(201, sent));
    vi.stubGlobal('fetch', retryFetch);

    await retryPendingMessages('ana.sp', 'territorio-a');

    expect(retryFetch).toHaveBeenCalledTimes(1);
    expect(String(retryFetch.mock.calls[0][0])).toContain('/api/mensagens/conversas/12/mensagens');
    expect(await getLocalMessage('ana.sp', 'territorio-a', queuedMessage.clientMessageId)).toMatchObject({
      syncStatus: 'SYNCED'
    });
    expect((await listOutbox('ana.sp', 'territorio-a')).find((entry) => entry.operation === 'CREATE_OBSERVATION'))
      .toMatchObject({ status: 'RETRYABLE_ERROR' });
  });

  it('uploads queued evidence with stable idempotency metadata and releases the confirmed blob', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    const blobKey = (await getLocalEvidence(
      'ana.sp', 'territorio-a', queued.clientMutationId
    ))!.data.file!.blobKey;
    const remote = {
      id: 71,
      workspaceId: 'territorio-a',
      subjectType: 'OBSERVACAO',
      subjectId: 42,
      title: queued.title,
      description: queued.description ?? null,
      originalFilename: 'nascente.txt',
      contentType: 'text/plain',
      sizeBytes: 9,
      sha256: queued.file!.sha256,
      capturedAt: queued.capturedAt,
      recordedAt: '2026-07-10T12:01:00.000Z',
      actorId: 'ana.sp',
      deviceId: queued.deviceId,
      clientMutationId: queued.clientMutationId,
      hasFile: true
    };
    const fetchMock = vi.fn().mockResolvedValue(response(201, remote));
    vi.stubGlobal('fetch', fetchMock);

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary).toMatchObject({ attempted: 1, synced: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/evidencias', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Idempotency-Key': queued.clientMutationId,
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('workspaceId')).toBe('territorio-a');
    expect(form.get('subjectType')).toBe('OBSERVACAO');
    expect(form.get('subjectId')).toBe('42');
    expect(form.get('clientMutationId')).toBe(queued.clientMutationId);
    expect(form.get('deviceId')).toBe(queued.deviceId);
    expect((form.get('file') as File).name).toBe('nascente.txt');
    expect(await (form.get('file') as File).text()).toBe('evidencia');
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'SYNCED', remote: { id: 71 } });
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a')).toBeUndefined();
  });

  it('retains the evidence blob and fixed mutation identity across a transient retry', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    const blobKey = (await getLocalEvidence(
      'ana.sp', 'territorio-a', queued.clientMutationId
    ))!.data.file!.blobKey;
    const remote = {
      id: 72, workspaceId: 'territorio-a', subjectType: 'OBSERVACAO', subjectId: 42,
      title: queued.title, description: queued.description ?? null, originalFilename: 'nascente.txt',
      contentType: 'text/plain', sizeBytes: 9, sha256: queued.file!.sha256, capturedAt: queued.capturedAt,
      recordedAt: '2026-07-10T12:02:00.000Z', actorId: 'ana.sp', deviceId: queued.deviceId,
      clientMutationId: queued.clientMutationId, hasFile: true
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(503, { detail: 'indisponível' }))
      .mockResolvedValueOnce(response(201, remote));
    vi.stubGlobal('fetch', fetchMock);

    await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a'))
      .toMatchObject({ name: 'nascente.txt', size: 9 });
    await retryPendingEvidence('ana.sp', 'territorio-a');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = fetchMock.mock.calls[0][1];
    const second = fetchMock.mock.calls[1][1];
    expect(first.headers['Idempotency-Key']).toBe(queued.clientMutationId);
    expect(second.headers['Idempotency-Key']).toBe(queued.clientMutationId);
    expect((first.body as FormData).get('clientMutationId')).toBe(queued.clientMutationId);
    expect((second.body as FormData).get('clientMutationId')).toBe(queued.clientMutationId);
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a')).toBeUndefined();
  });

  it('does not confirm evidence or remove its blob when a 201 response is malformed', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    const blobKey = (await getLocalEvidence(
      'ana.sp', 'territorio-a', queued.clientMutationId
    ))!.data.file!.blobKey;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockRejectedValue(new SyntaxError('invalid json'))
    } as unknown as Response));

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.retryable).toBe(1);
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'RETRYABLE_ERROR' });
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a')).toBeDefined();
  });

  it('retains evidence when the server file digest does not match the persisted bytes', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    const blobKey = (await getLocalEvidence(
      'ana.sp', 'territorio-a', queued.clientMutationId
    ))!.data.file!.blobKey;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, {
      id: 73,
      workspaceId: 'territorio-a',
      subjectType: 'OBSERVACAO',
      subjectId: 42,
      clientMutationId: queued.clientMutationId,
      hasFile: true,
      sizeBytes: queued.file!.size,
      sha256: '0'.repeat(64)
    })));

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.retryable).toBe(1);
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'RETRYABLE_ERROR', remote: undefined });
    expect(await getEvidenceFile(blobKey, 'ana.sp', 'territorio-a')).toBeDefined();
  });

  it('requires hasFile false when the queued evidence has no file', async () => {
    const queued = await enqueueEvidence({ ...evidence, file: undefined }, 'ana.sp');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, {
      id: 74,
      workspaceId: 'territorio-a',
      subjectType: 'OBSERVACAO',
      subjectId: 42,
      clientMutationId: queued.clientMutationId,
      hasFile: true,
      sizeBytes: 9,
      sha256: '0'.repeat(64)
    })));

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.retryable).toBe(1);
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'RETRYABLE_ERROR', remote: undefined });
  });

  it.each([
    ['observação', () => captureObservation(observation)],
    ['mensagem', () => captureMessage({
      workspaceId: 'territorio-a', conversationId: 12, body: 'offline', attachments: []
    })],
    ['evidência', () => captureEvidence({ ...evidence, file: undefined })]
  ])('does not capture %s after the offline session lease expires', async (_label, capture) => {
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2020-01-01T00:00:00.000Z'
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(capture()).rejects.toThrow('Entre novamente');
    expect(await listOutbox('ana.sp', 'territorio-a')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks synchronization for an expired session without deleting pending evidence', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2020-01-01T00:00:00.000Z'
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.attempted).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });

  it('keeps the background engine idle after the offline lease expires', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2020-01-01T00:00:00.000Z'
    }));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const stop = startSyncEngine('ana.sp');
    try {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(30_000);
    } finally {
      stop();
      vi.useRealTimers();
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });

  it('keeps the background engine pinned to the owner that opened the shell', async () => {
    const queued = await enqueueObservation(observation, 'bia.sp');
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, pessoaId: 8, angicoId: 'bia.sp'
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.useFakeTimers();

    const stop = startSyncEngine('ana.sp');
    try {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(30_000);
    } finally {
      stop();
      vi.useRealTimers();
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalObservation('bia.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });

  it('keeps the shell owner filter when the session changes after the engine guard', async () => {
    const queued = await enqueueObservation(observation, 'bia.sp');
    const activeSession = JSON.stringify(session);
    const replacementSession = JSON.stringify({ ...session, pessoaId: 8, angicoId: 'bia.sp' });
    const getItem = Storage.prototype.getItem;
    let sessionReads = 0;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === 'angico.session') {
        sessionReads += 1;
        return sessionReads === 1 ? activeSession : replacementSession;
      }
      return getItem.call(this, key);
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const stop = startSyncEngine('ana.sp');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    } finally {
      stop();
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalObservation('bia.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });

  it('releases a claim without applying a response after the active owner changes', async () => {
    const queued = await enqueueObservation(observation, 'ana.sp');
    let resolveResponse!: (value: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.fn().mockReturnValue(pendingResponse);
    vi.stubGlobal('fetch', fetchMock);

    const synchronization = syncPendingObservations({
      ownerId: 'ana.sp', workspaceId: 'territorio-a'
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, pessoaId: 8, angicoId: 'bia.sp'
    }));
    resolveResponse(response(409, { detail: 'conflict' }));

    const summary = await synchronization;

    expect(summary.conflicts).toBe(0);
    expect(await getLocalObservation('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });

  it('blocks synchronization when the requested owner differs from the active session', async () => {
    const queued = await enqueueEvidence(evidence, 'ana.sp');
    localStorage.setItem('angico.session', JSON.stringify({ ...session, pessoaId: 8, angicoId: 'bia.sp' }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const summary = await syncPendingEvidence({ ownerId: 'ana.sp', workspaceId: 'territorio-a' });

    expect(summary.attempted).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getLocalEvidence('ana.sp', 'territorio-a', queued.clientMutationId))
      .toMatchObject({ syncStatus: 'QUEUED' });
  });
});
