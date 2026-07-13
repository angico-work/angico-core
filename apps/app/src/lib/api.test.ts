import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiHttpError,
  ApiNetworkError,
  createEntity,
  getProfile,
  getSession,
  hasFreshOfflineSession,
  isAuthenticated,
  loadDashboard,
  loadMemoria,
  loadRastro,
  listConversas,
  markConversaRead,
  searchMensagens,
  searchPessoas,
  listEntities,
  listWorkspaces,
  login,
  revalidateSession,
  apiUrl,
  createOrganizacao,
  createParticipacao,
  endParticipacao,
  createTerritorio,
  createWorkspace,
  listEvidencias,
  listParticipacoes,
  listPessoas,
  listRecursos,
  offlineSessionExpiresAt,
  requestJson,
  reverseGeocode,
  searchGeocoding,
  sessionOwnerId,
  apiFetch
} from './api';
import { resetOfflineDatabase } from './offlineStore';

const session = {
  pessoaId: 7,
  nome: 'Ana',
  email: 'ana@example.test',
  angicoId: 'ana.sp',
  papel: 'MEMBER',
  workspaceId: 'workspace-a',
  expiresAt: '2099-01-01T00:00:00Z',
  csrfToken: 'csrf-secret'
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

describe('cookie session API', () => {
  beforeEach(async () => {
    await resetOfflineDatabase();
    localStorage.clear();
    localStorage.setItem('angico.session', JSON.stringify(session));
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.restoreAllMocks();
  });

  it('logs in with credentials and stores metadata without an auth token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, session));
    vi.stubGlobal('fetch', fetchMock);

    await login('ana@example.test', 'correct-password');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include'
    }));
    expect(getSession()).toEqual(session);
    expect(JSON.parse(localStorage.getItem('angico.session') ?? '{}')).not.toHaveProperty('token');
    expect(isAuthenticated()).toBe(true);
  });

  it('keeps browser API requests relative in every environment', () => {
    expect(apiUrl('/api/auth/me')).toBe('/api/auth/me');
  });

  it('adds credentials and the stored csrf token to mutations', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(201, { id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await createEntity('/api/observacoes', { workspaceId: 'workspace-a' });

    expect(fetchMock).toHaveBeenCalledWith('/api/observacoes', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
  });

  it('does not add csrf to safe reads', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await listEntities('/api/observacoes', 'workspace-a');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(init.headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('clears stale session metadata centrally on any 401 response', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { detail: 'expired' })));

    await expect(listEntities('/api/observacoes', 'workspace-a')).rejects.toThrow('expired');

    expect(getSession()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('reports a failed module request instead of presenting it as an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'indisponível' })));

    await expect(listEntities('/api/observacoes', 'workspace-a')).rejects.toThrow('indisponível');
  });

  it('does not replace an unavailable dashboard with sample numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(loadDashboard('workspace-a')).rejects.toThrow('painel');
  });

  it('loads memory from the provenance-rich history contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await loadMemoria('workspace-a');

    expect(fetchMock).toHaveBeenCalledWith('/api/history/workspaces/workspace-a', expect.any(Object));
  });

  it('encodes explicit memory filters without changing the workspace path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await loadMemoria('workspace-a', {
      entityType: 'ACAO',
      entityId: '42/campo',
      from: '2026-07-01T03:00:00.000Z',
      to: '2026-08-01T02:59:59.999Z',
      eventType: 'acao.iniciada',
      actorId: 'ana.sp',
      source: 'offline',
      syncStatus: 'SYNCED_FROM_OFFLINE'
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/history/workspaces/workspace-a?entityType=ACAO&entityId=42%2Fcampo&from=2026-07-01T03%3A00%3A00.000Z&to=2026-08-01T02%3A59%3A59.999Z&eventType=acao.iniciada&actorId=ana.sp&source=offline&syncStatus=SYNCED_FROM_OFFLINE'
    );
  });

  it('loads a bounded Rastro for an authorized root', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, {
      workspaceId: 'workspace-a',
      root: {
        reference: { type: 'MISSAO', id: '42/campo', resource: '/api/missoes/42' },
        name: 'Cuidar da nascente', status: null, occurredAt: null, recordedAt: null, syncStatus: null
      },
      stages: [], relations: [], events: [], participants: [], gaps: [],
      limits: { maxNodes: 100, maxRelations: 200, maxEvents: 300, truncated: false },
      asOf: '2026-07-10T14:00:00Z'
    }));
    vi.stubGlobal('fetch', fetchMock);

    await loadRastro('MISSAO', '42/campo', 'workspace-a');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rastro/MISSAO/42%2Fcampo?workspaceId=workspace-a',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('creates a territory without manufacturing coordinates', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(201, { id: 9, nome: 'Vila da Serra' }));
    vi.stubGlobal('fetch', fetchMock);

    await createTerritorio({
      workspaceId: 'workspace-a',
      nome: 'Vila da Serra',
      tipo: 'BAIRRO',
      cidade: null,
      bairro: null,
      estado: null,
      pais: null,
      latitude: null,
      longitude: null,
      boundingBox: null
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('/api/territorios');
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      latitude: null,
      longitude: null,
      boundingBox: null
    }));
    expect(JSON.parse(String(init.body))).not.toHaveProperty('autorId');
  });

  it('reports an unavailable conversation list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'mensagens indisponíveis' })));

    await expect(listConversas('workspace-a')).rejects.toThrow('mensagens indisponíveis');
  });

  it('revalidates persisted metadata through the cookie-backed me endpoint', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const refreshed = { ...session, nome: 'Ana Atualizada' };
    const fetchMock = vi.fn().mockResolvedValue(response(200, refreshed));
    vi.stubGlobal('fetch', fetchMock);

    await expect(revalidateSession()).resolves.toEqual(refreshed);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      credentials: 'include'
    }));
    expect(getSession()?.nome).toBe('Ana Atualizada');
  });

  it('loads the current profile independently from the selected workspace directory', async () => {
    const profile = {
      id: 7,
      workspaceId: 'workspace-a',
      nome: 'Ana',
      papel: 'MEMBER',
      angicoId: 'ana.sp',
      telefone: '(81) 99999-0000',
      foto: null,
      createdAt: '2026-07-10T12:00:00Z'
    };
    const fetchMock = vi.fn().mockResolvedValue(response(200, profile));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getProfile()).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith('/api/pessoas/me', expect.objectContaining({
      credentials: 'include'
    }));
  });

  it('preserves the selected workspace while revalidating the same account', async () => {
    const selected = { ...session, workspaceId: 'territorio-b' };
    localStorage.setItem('angico.session', JSON.stringify(selected));
    const serverSession = { ...session, workspaceId: 'workspace-a', csrfToken: 'csrf-refreshed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, serverSession)));

    await expect(revalidateSession()).resolves.toEqual({
      ...serverSession,
      workspaceId: 'territorio-b'
    });
    expect(getSession()?.workspaceId).toBe('territorio-b');
  });

  it('classifies a failed session revalidation as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(revalidateSession()).rejects.toBeInstanceOf(ApiNetworkError);

    expect(getSession()).toEqual(session);
  });

  it('does not invent or enumerate a workspace when protected listing fails', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'forbidden' })));

    await expect(listWorkspaces()).rejects.toMatchObject({ status: 403, message: 'forbidden' });
  });

  it('lets the server derive workspace authorship from the authenticated session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, { slug: 'nascente', nome: 'Nascente' }));
    vi.stubGlobal('fetch', fetchMock);

    await createWorkspace('  Nascente  ');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ nome: 'Nascente' });
  });

  it('purges the legacy bearer session format instead of retaining its token', () => {
    localStorage.setItem('angico.session', JSON.stringify({ ...session, token: 'legacy-bearer' }));

    expect(getSession()).toBeNull();
    expect(localStorage.getItem('angico.session')).toBeNull();
  });

  it('never keeps offline access beyond the server session expiry', () => {
    localStorage.setItem('angico.session', JSON.stringify({ ...session, expiresAt: '2020-01-01T00:00:00Z' }));
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());

    expect(hasFreshOfflineSession()).toBe(false);
  });

  it('derives one stable local owner key from the active session metadata', () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    expect(sessionOwnerId()).toBe('ana.sp');

    localStorage.setItem('angico.session', JSON.stringify({ ...session, angicoId: 'ana.atualizada' }));
    expect(sessionOwnerId()).toBe('ana.sp');

    localStorage.setItem('angico.session', JSON.stringify({ ...session, angicoId: null, pessoaId: 19 }));
    expect(sessionOwnerId()).toBe('pessoa-19');
  });

  it('uses the earlier server or offline lease deadline', () => {
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2026-07-20T12:00:00.000Z'
    }));
    localStorage.setItem('angico.session.validatedAt', '2026-07-10T12:00:00.000Z');

    expect(offlineSessionExpiresAt()).toBe(Date.parse('2026-07-17T12:00:00.000Z'));

    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2026-07-12T12:00:00.000Z'
    }));
    expect(offlineSessionExpiresAt()).toBe(Date.parse('2026-07-12T12:00:00.000Z'));
  });

  it('classifies only a fetch TypeError as a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(requestJson('/api/territorios')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('aborts a stalled request at the client boundary', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })
    ));
    vi.stubGlobal('fetch', fetchMock);

    const request = requestJson('/api/territorios').catch((error) => error);
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(request).resolves.toBeInstanceOf(ApiNetworkError);
    vi.useRealTimers();
  });

  it('honors a longer timeout for bounded multipart transfers', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal?.reason));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const request = apiFetch('/api/evidencias', { method: 'POST', timeoutMs: 60_000 })
      .catch((error) => error);
    await vi.advanceTimersByTimeAsync(20_000);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(40_000);

    await expect(request).resolves.toMatchObject({ name: 'TimeoutError' });
    vi.useRealTimers();
  });

  it('preserves HTTP status without classifying it as an offline failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'sem acesso' })));

    const error = await requestJson('/api/territorios').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error).toMatchObject({ status: 403, message: 'sem acesso' });
    expect(error).not.toBeInstanceOf(ApiNetworkError);
  });

  it('requests workspace access refresh after a denied mutation', async () => {
    const listener = vi.fn();
    window.addEventListener('angico:workspace-access-changed', listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'sem acesso' })));

    try {
      await apiFetch('/api/observacoes', { method: 'POST' });
      expect(listener).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('angico:workspace-access-changed', listener);
    }
  });

  it('does not classify invalid JSON or request abortion as a network failure', async () => {
    const parseFailure = new SyntaxError('invalid json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(parseFailure)
    } as unknown as Response));
    await expect(requestJson('/api/territorios')).rejects.toBe(parseFailure);

    const abort = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(requestJson('/api/territorios')).rejects.toBe(abort);
  });

  it('marks a conversation as read only through the real mutation endpoint', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(204, null));
    vi.stubGlobal('fetch', fetchMock);

    await markConversaRead(12);

    expect(fetchMock).toHaveBeenCalledWith('/api/mensagens/conversas/12/leitura', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-secret' })
    }));
  });

  it('uses typed endpoints for organizations and active participation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(201, { id: 11 }))
      .mockResolvedValueOnce(response(201, { id: 12 }));
    vi.stubGlobal('fetch', fetchMock);

    await createOrganizacao({ workspaceId: 'workspace-a', nome: 'Coletivo da Serra', tipo: 'COLETIVO' });
    await createParticipacao(11, {
      workspaceId: 'workspace-a', pessoaId: 7, papel: 'COORDENACAO',
      status: 'ATIVA', startedAt: '2026-07-10'
    });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/organizacoes',
      '/api/organizacoes/11/participacoes'
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual(expect.objectContaining({
      status: 'ATIVA',
      pessoaId: 7
    }));
  });

  it('ends a participation with explicit workspace context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { id: 12, status: 'ENCERRADA' }));
    vi.stubGlobal('fetch', fetchMock);

    await endParticipacao(11, 12, 'workspace-a', '2026-07-10T16:00:00Z');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizacoes/11/participacoes/12/encerramento',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          workspaceId: 'workspace-a',
          endedAt: '2026-07-10T16:00:00Z'
        })
      })
    );
  });

  it('keeps workspace filters encoded on the new operational reads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await listEvidencias('campo norte/um');
    await listParticipacoes(11, 'campo norte/um');
    await listPessoas('campo norte/um');
    await listRecursos('campo norte/um');

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/evidencias?workspaceId=campo%20norte%2Fum',
      '/api/organizacoes/11/participacoes?workspaceId=campo%20norte%2Fum',
      '/api/pessoas?workspaceId=campo%20norte%2Fum',
      '/api/recursos?workspaceId=campo%20norte%2Fum'
    ]);
  });

  it('keeps a person-search failure distinct from an empty result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'busca de pessoas indisponível' })));

    await expect(searchPessoas('workspace-a', 'Mara')).rejects.toThrow('busca de pessoas indisponível');
  });

  it('keeps geocoding HTTP failures distinct from an empty result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { detail: 'geocodificação indisponível' })));

    await expect(searchGeocoding('Nascente Sul')).rejects.toThrow('geocodificação indisponível');
    await expect(reverseGeocode(-8.1, -34.9)).rejects.toThrow('geocodificação indisponível');
  });

  it('searches messages inside the authorized workspace with an encoded query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await searchMensagens('jardim-novo', 'nascente sul');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mensagens/busca?workspaceId=jardim-novo&q=nascente%20sul',
      expect.objectContaining({ credentials: 'include' })
    );
  });

});
