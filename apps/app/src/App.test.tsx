import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function response(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe('app entry', () => {
  it('sends an anonymous visitor directly to sign in', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Acessar Angico' })).toBeInTheDocument();
    expect(screen.queryByText('Onde o território aprende a agir e lembrar.')).not.toBeInTheDocument();
  });

  it('resolves a Rastro deep link through the lazy application route', async () => {
    const session = {
      pessoaId: 7,
      nome: 'Ana',
      email: 'ana@example.test',
      angicoId: 'ana.sp',
      papel: 'MEMBER',
      workspaceId: 'workspace-a',
      expiresAt: '2099-01-01T00:00:00Z',
      csrfToken: 'csrf'
    };
    localStorage.setItem('angico.session', JSON.stringify(session));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') return response(200, session);
      if (url === '/api/workspaces') return response(200, [{ slug: 'workspace-a', nome: 'Espaço A' }]);
      if (url.startsWith('/api/pessoas?')) return response(200, []);
      if (url.startsWith('/api/missoes?')) return response(200, [{ id: 20, titulo: 'Missão de teste' }]);
      if (url.startsWith('/api/rastro/MISSAO/20?')) return response(200, {
        workspaceId: 'workspace-a',
        root: {
          reference: { type: 'MISSAO', id: '20', resource: '/api/missoes/20' },
          name: 'Missão de teste', status: 'PLANEJADA', occurredAt: null,
          recordedAt: '2026-07-10T12:00:00Z', syncStatus: 'SERVER_RECORDED'
        },
        stages: [], relations: [], events: [], participants: [], gaps: [],
        limits: { maxNodes: 100, maxRelations: 200, maxEvents: 300, truncated: false },
        asOf: '2026-07-10T12:00:00Z'
      });
      return response(404, { detail: 'not found' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/app/rastro/MISSAO/20']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Missão de teste' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rastro/MISSAO/20?workspaceId=workspace-a',
      expect.objectContaining({ credentials: 'include' })
    );
  });
});
