import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell';
import { getProfile, listWorkspaces, logout, sessionOwnerId } from '../lib/api';
import { clearOfflineOwner, getOfflineOwnerState } from '../lib/offlineStore';

const { session } = vi.hoisted(() => ({
  session: {
    pessoaId: 7,
    nome: 'Ana',
    email: 'ana@example.test',
    angicoId: 'ana.atualizada',
    papel: 'MEMBER',
    workspaceId: 'territorio-a',
    expiresAt: '2099-01-01T00:00:00Z',
    csrfToken: 'csrf'
  }
}));

vi.mock('./Sidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <button type="button" onClick={onLogout}>Sair agora</button>
  )
}));
vi.mock('./Topbar', () => ({ default: () => null }));
vi.mock('./ProfileModal', () => ({ default: () => null }));
vi.mock('../lib/api', () => ({
  DEFAULT_WORKSPACE: 'territorio-a',
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  getProfile: vi.fn().mockResolvedValue(null),
  getSession: vi.fn(() => session),
  hasFreshOfflineSession: vi.fn(() => true),
  isAuthenticated: vi.fn(() => true),
  listWorkspaces: vi.fn().mockResolvedValue([]),
  logout: vi.fn().mockResolvedValue(undefined),
  revalidateSession: vi.fn().mockResolvedValue(session),
  sessionOwnerId: vi.fn(() => 'ana.sp'),
  setSessionWorkspace: vi.fn()
}));
vi.mock('../lib/offlineStore', () => ({
  clearOfflineOwner: vi.fn().mockResolvedValue(undefined),
  getOfflineOwnerState: vi.fn().mockResolvedValue({
    total: 0, unsynced: 0, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0
  })
}));
vi.mock('../lib/offlineSync', () => ({ startSyncEngine: vi.fn(() => vi.fn()) }));

describe('AppShell local partition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWorkspaces).mockResolvedValue([]);
    vi.mocked(getProfile).mockResolvedValue(null);
  });
  afterEach(cleanup);

  it('clears the partition selected by the persisted owner alias during logout', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<div>Conteúdo</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sair agora' }));

    await waitFor(() => expect(sessionOwnerId).toHaveBeenCalledWith(session));
    expect(getOfflineOwnerState).toHaveBeenCalledWith('ana.sp');
    expect(clearOfflineOwner).toHaveBeenCalledWith('ana.sp', { discardPending: false });
    expect(logout).toHaveBeenCalled();
  });

  it('reports an authorized workspace read failure instead of treating it as an empty account', async () => {
    vi.mocked(listWorkspaces).mockRejectedValue(new Error('Espaços indisponíveis'));

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<div>Conteúdo</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Espaços indisponíveis');
  });
});
