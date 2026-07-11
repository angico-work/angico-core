import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiHttpError,
  ApiNetworkError,
  createEntity,
  ensureTerritorio,
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
  createEvidencia,
  createIndicador,
  createMedicao,
  createOrganizacao,
  createParticipacao,
  createRecurso,
  createRecursoUso,
  createResultado,
  createTerritorio,
  createWorkspace,
  evidenciaFileUrl,
  listEvidencias,
  listParticipacoes,
  listPessoas,
  listRecursos,
  offlineSessionExpiresAt,
  requestJson,
  reverseGeocode,
  searchGeocoding,
  sessionOwnerId,
  sendMensagem
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

  it('does not create a placeholder territory just because conversations were opened', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await expect(ensureTerritorio('workspace-a')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/territorios?workspaceId=workspace-a', expect.any(Object));
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

  it('preserves HTTP status without classifying it as an offline failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'sem acesso' })));

    const error = await requestJson('/api/territorios').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error).toMatchObject({ status: 403, message: 'sem acesso' });
    expect(error).not.toBeInstanceOf(ApiNetworkError);
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

  it('rejects attachments that exceed the API per-file limit before upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    const oversized = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      'oversized.pdf',
      { type: 'application/pdf' }
    );

    await expect(sendMensagem(1, '', [oversized])).rejects.toThrow('2 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps aggregate attachments below the same-origin function payload ceiling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    const first = new File([new Uint8Array(2 * 1024 * 1024)], 'first.pdf');
    const second = new File([new Uint8Array(2 * 1024 * 1024)], 'second.pdf');

    await expect(sendMensagem(1, '', [first, second])).rejects.toThrow('3,75 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends stable offline metadata in both the multipart body and idempotency header', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(201, { id: 81 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendMensagem(12, 'Vamos amanhã.', [], {
      clientMessageId: 'msg-8f9b',
      deviceId: 'device-campo-2',
      occurredAt: '2026-07-10T14:20:00.000Z'
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/mensagens/conversas/12/mensagens', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Idempotency-Key': 'msg-8f9b',
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('corpo')).toBe('Vamos amanhã.');
    expect(form.get('clientMessageId')).toBe('msg-8f9b');
    expect(form.get('deviceId')).toBe('device-campo-2');
    expect(form.get('occurredAt')).toBe('2026-07-10T14:20:00.000Z');
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

  it('creates evidence as multipart with a stable mutation key and an optional safe file', async () => {
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn().mockResolvedValue(response(201, { id: 91, hasFile: true }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['relato de campo'], 'relato.txt', { type: 'text/plain' });

    await createEvidencia({
      workspaceId: 'workspace-a',
      subjectType: 'ACAO',
      subjectId: 44,
      title: 'Registro da retirada',
      description: 'Equipe concluiu o trecho norte.',
      capturedAt: '2026-07-10T14:20:00.000Z',
      deviceId: 'campo-2',
      clientMutationId: 'evidencia-8f9b',
      file
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/evidencias', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Idempotency-Key': 'evidencia-8f9b',
        'X-CSRF-Token': 'csrf-secret'
      })
    }));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(Object.fromEntries(form.entries())).toEqual(expect.objectContaining({
      workspaceId: 'workspace-a',
      subjectType: 'ACAO',
      subjectId: '44',
      title: 'Registro da retirada',
      description: 'Equipe concluiu o trecho norte.',
      capturedAt: '2026-07-10T14:20:00.000Z',
      deviceId: 'campo-2',
      clientMutationId: 'evidencia-8f9b',
      file
    }));
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(evidenciaFileUrl(91)).toBe('/api/evidencias/91/arquivo');
  });

  it('rejects an unsupported or oversized evidence file before contacting the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const base = {
      workspaceId: 'workspace-a', subjectType: 'OBSERVACAO' as const, subjectId: 8,
      title: 'Foto da área', clientMutationId: 'evidencia-1'
    };

    await expect(createEvidencia({
      ...base,
      file: new File(['conteúdo'], 'arquivo.svg', { type: 'image/svg+xml' })
    })).rejects.toThrow('JPG, PNG, WebP, PDF ou TXT');
    await expect(createEvidencia({
      ...base,
      file: new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'arquivo.pdf', { type: 'application/pdf' })
    })).rejects.toThrow('2 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses typed endpoints for results, indicators and measurements without adding an actor', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(201, { id: 1 }))
      .mockResolvedValueOnce(response(201, { id: 2 }))
      .mockResolvedValueOnce(response(201, { id: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    await createResultado({ workspaceId: 'workspace-a', acaoId: 4, titulo: 'Nascente protegida' });
    await createIndicador({
      workspaceId: 'workspace-a', territorioId: 9, resultadoId: 1,
      nome: 'Trechos protegidos', unidade: 'trechos'
    });
    await createMedicao({
      workspaceId: 'workspace-a', indicadorId: 2, valor: 3,
      unidade: 'trechos', fonte: 'Contagem de campo'
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/resultados', '/api/indicadores', '/api/medicoes'
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(String(init.body))).not.toHaveProperty('actorId');
    }
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual(expect.objectContaining({
      territorioId: 9,
      resultadoId: 1
    }));
  });

  it('uses typed endpoints for organizations, active participation, resources and action usage', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(201, { id: 11 }))
      .mockResolvedValueOnce(response(201, { id: 12 }))
      .mockResolvedValueOnce(response(201, { id: 21 }))
      .mockResolvedValueOnce(response(201, { id: 22 }));
    vi.stubGlobal('fetch', fetchMock);

    await createOrganizacao({ workspaceId: 'workspace-a', nome: 'Coletivo da Serra', tipo: 'COLETIVO' });
    await createParticipacao(11, {
      workspaceId: 'workspace-a', pessoaId: 7, papel: 'COORDENACAO',
      status: 'ATIVA', startedAt: '2026-07-10'
    });
    await createRecurso({
      workspaceId: 'workspace-a', nome: 'Enxada', categoria: 'EQUIPAMENTO', unidade: 'unidade'
    });
    await createRecursoUso(21, {
      workspaceId: 'workspace-a', acaoId: 4, quantidade: 2, unidade: 'unidade'
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/organizacoes',
      '/api/organizacoes/11/participacoes',
      '/api/recursos',
      '/api/recursos/21/usos'
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual(expect.objectContaining({
      status: 'ATIVA',
      pessoaId: 7
    }));
    expect(JSON.parse(String(fetchMock.mock.calls[3][1].body))).not.toHaveProperty('actorId');
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

  it('refuses to build a message endpoint from an invalid conversation identifier', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMensagem(Number.NaN, 'texto')).rejects.toThrow('Conversa inválida');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
