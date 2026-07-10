import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEntity,
  getSession,
  isAuthenticated,
  listEntities,
  listWorkspaces,
  login,
  revalidateSession
} from './api';

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
  beforeEach(() => {
    localStorage.clear();
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

    await listEntities('/api/observacoes', 'workspace-a');

    expect(getSession()).toBeNull();
    expect(isAuthenticated()).toBe(false);
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

    await expect(listWorkspaces()).resolves.toEqual([]);
  });

  it('purges the legacy bearer session format instead of retaining its token', () => {
    localStorage.setItem('angico.session', JSON.stringify({ ...session, token: 'legacy-bearer' }));

    expect(getSession()).toBeNull();
    expect(localStorage.getItem('angico.session')).toBeNull();
  });
});
