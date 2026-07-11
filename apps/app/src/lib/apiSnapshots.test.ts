import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiHttpError,
  listEntities,
  listMensagens,
  listWorkspaces
} from './api';
import { loadSnapshot, resetOfflineDatabase } from './offlineStore';
import { ACCOUNT_SNAPSHOT_WORKSPACE, resetOfflineReadSources } from './offlineReadState';

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

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

const observation = {
  id: 4,
  workspaceId: 'territorio-a',
  categoria: 'Água',
  titulo: 'Nascente observada',
  status: 'REGISTRADA',
  createdAt: '2026-07-10T12:00:00Z'
};

const message = {
  id: 21,
  workspaceId: 'territorio-a',
  conversaId: 12,
  senderPessoaId: 7,
  senderNome: 'Ana',
  corpo: 'Visita confirmada.',
  latitude: null,
  longitude: null,
  localDescricao: null,
  linkedEntityType: null,
  linkedEntityId: null,
  clientMessageId: null,
  deviceId: null,
  status: 'ENVIADA',
  occurredAt: '2026-07-10T12:00:00Z',
  recordedAt: '2026-07-10T12:01:00Z',
  createdAt: '2026-07-10T12:01:00Z',
  anexos: [],
  relacoes: []
};

describe('authorized API snapshots', () => {
  beforeEach(async () => {
    await resetOfflineDatabase();
    resetOfflineReadSources();
    localStorage.clear();
    localStorage.setItem('angico.session', JSON.stringify(session));
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.restoreAllMocks();
  });

  it('stores account workspaces outside the active workspace partition', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [
      { slug: 'territorio-a', nome: 'Território A' }
    ])));

    await expect(listWorkspaces()).resolves.toEqual([{ slug: 'territorio-a', nome: 'Território A' }]);
    expect(await loadSnapshot({
      ownerId: 'ana.sp',
      workspaceId: ACCOUNT_SNAPSHOT_WORKSPACE,
      resource: 'workspaces',
      contractVersion: 1
    })).toMatchObject({ payload: [{ slug: 'territorio-a', nome: 'Território A' }] });

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await expect(listWorkspaces()).resolves.toEqual([{ slug: 'territorio-a', nome: 'Território A' }]);
  });

  it('never converts an authorized HTTP failure into an empty list or snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [
      { slug: 'territorio-a', nome: 'Território A' }
    ])));
    await listWorkspaces();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'sem acesso' })));

    const error = await listWorkspaces().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error).toMatchObject({ status: 403 });
  });

  it('rejects an invalid list item without overwriting confirmed records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [observation])));
    await listEntities('/api/observacoes', 'territorio-a');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [{ id: 5 }])));

    await expect(listEntities('/api/observacoes', 'territorio-a')).rejects.toThrow('contrato');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await expect(listEntities('/api/observacoes', 'territorio-a')).resolves.toEqual([observation]);
  });

  it('partitions confirmed messages by both workspace and conversation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [message])));
    await listMensagens(12, 'territorio-a');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    await expect(listMensagens(12, 'territorio-a')).resolves.toEqual([message]);
    await expect(listMensagens(12, 'territorio-b')).rejects.toThrow('Nenhum dado confirmado');
  });

  it('does not hide invalid JSON behind a previously confirmed snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [observation])));
    await listEntities('/api/observacoes', 'territorio-a');
    const parseFailure = new SyntaxError('json inválido');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(parseFailure)
    } as unknown as Response));

    await expect(listEntities('/api/observacoes', 'territorio-a')).rejects.toBe(parseFailure);
  });
});
