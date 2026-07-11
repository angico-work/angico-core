import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell';
import {
  ApiNetworkError,
  getProfile,
  getSession,
  hasFreshOfflineSession,
  listWorkspaces,
  offlineSessionExpiresAt,
  logout,
  revalidateSession,
  sessionOwnerId,
  setSessionWorkspace
} from '../lib/api';
import { clearOfflineOwner, getOfflineOwnerState } from '../lib/offlineStore';
import { startSyncEngine } from '../lib/offlineSync';
import {
  getOfflineReadSources,
  recordOfflineReadSource,
  resetOfflineReadSources
} from '../lib/offlineReadState';

const { otherSession, session, stopSyncEngine } = vi.hoisted(() => ({
  session: {
    pessoaId: 7,
    nome: 'Ana',
    email: 'ana@example.test',
    angicoId: 'ana.atualizada',
    papel: 'MEMBER',
    workspaceId: 'territorio-a',
    expiresAt: '2099-01-01T00:00:00Z',
    csrfToken: 'csrf'
  },
  otherSession: {
    pessoaId: 8,
    nome: 'Bia',
    email: 'bia@example.test',
    angicoId: 'bia.sp',
    papel: 'MEMBER',
    workspaceId: 'territorio-b',
    expiresAt: '2099-01-01T00:00:00Z',
    csrfToken: 'csrf-bia'
  },
  stopSyncEngine: vi.fn()
}));

vi.mock('./Sidebar', () => ({
  default: ({ onLogout, onEditProfile, open }: {
    onLogout: () => void;
    onEditProfile: () => void;
    open: boolean;
  }) => (
    <aside id="app-sidebar" data-open={open}>
      <button type="button" onClick={onEditProfile}>Editar perfil</button>
      <button type="button" onClick={onLogout}>Sair agora</button>
    </aside>
  )
}));
vi.mock('./Topbar', () => ({
  default: ({ sidebarOpen, onToggleSidebar }: {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
  }) => (
    <button
      type="button"
      aria-controls="app-sidebar"
      aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      onClick={onToggleSidebar}
    >Menu</button>
  )
}));
vi.mock('./ProfileModal', () => ({
  default: ({ profile }: { profile: { telefone?: string | null } }) => (
    <div role="dialog" aria-label="Editar perfil">{profile.telefone}</div>
  )
}));
vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();
  return {
    ApiNetworkError: original.ApiNetworkError,
    createWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(null),
    getSession: vi.fn(() => session),
    hasFreshOfflineSession: vi.fn(() => true),
    isAuthenticated: vi.fn(() => true),
    listWorkspaces: vi.fn().mockResolvedValue([]),
    offlineSessionExpiresAt: vi.fn(() => Date.parse('2099-01-01T00:00:00Z')),
    logout: vi.fn().mockResolvedValue(undefined),
    revalidateSession: vi.fn().mockResolvedValue(session),
    sessionOwnerId: vi.fn((value?: typeof session) => value?.pessoaId === 8 ? 'bia.sp' : 'ana.sp'),
    setSessionWorkspace: vi.fn()
  };
});
vi.mock('../lib/offlineStore', () => ({
  clearOfflineOwner: vi.fn().mockResolvedValue(undefined),
  getOfflineOwnerState: vi.fn().mockResolvedValue({
    total: 0, unsynced: 0, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0
  })
}));
vi.mock('../lib/offlineSync', () => ({ startSyncEngine: vi.fn(() => stopSyncEngine) }));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<div>Conteúdo</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AppShell local partition', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    vi.useRealTimers();
    vi.clearAllMocks();
    resetOfflineReadSources();
    vi.mocked(getSession).mockReturnValue(session);
    vi.mocked(hasFreshOfflineSession).mockReturnValue(true);
    vi.mocked(offlineSessionExpiresAt).mockReturnValue(Date.parse('2099-01-01T00:00:00Z'));
    vi.mocked(revalidateSession).mockResolvedValue(session);
    vi.mocked(sessionOwnerId).mockImplementation((value) => value?.pessoaId === 8 ? 'bia.sp' : 'ana.sp');
    vi.mocked(listWorkspaces).mockResolvedValue([]);
    vi.mocked(getProfile).mockResolvedValue(null);
    vi.mocked(getOfflineOwnerState).mockResolvedValue({
      total: 0, unsynced: 0, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0
    });
    vi.mocked(startSyncEngine).mockReturnValue(stopSyncEngine);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanup();
  });

  it('clears only the owner partition captured when the authenticated area opened', async () => {
    vi.mocked(getOfflineOwnerState).mockResolvedValue({
      total: 1, unsynced: 1, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0
    });
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:00:00Z');
    recordOfflineReadSource({
      ownerId: 'bia.sp', workspaceId: 'territorio-b', resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:01:00Z');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderShell();
    await screen.findByText('Conteúdo');
    vi.mocked(getSession).mockReturnValue(otherSession);

    fireEvent.click(await screen.findByRole('button', { name: 'Sair agora' }));

    await waitFor(() => expect(getOfflineOwnerState).toHaveBeenCalledWith('ana.sp'));
    expect(clearOfflineOwner).toHaveBeenCalledWith('ana.sp', { discardPending: true });
    expect(clearOfflineOwner).not.toHaveBeenCalledWith('bia.sp', expect.anything());
    expect(getOfflineReadSources()).toEqual([expect.objectContaining({ ownerId: 'bia.sp' })]);
    expect(logout).toHaveBeenCalled();
  });

  it('keeps the owner partition and session when logout is cancelled', async () => {
    vi.mocked(getOfflineOwnerState).mockResolvedValue({
      total: 1, unsynced: 1, drafts: 0, conflicts: 0, blocked: 0, actionRequired: 0
    });
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:00:00Z');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderShell();

    fireEvent.click(await screen.findByRole('button', { name: 'Sair agora' }));

    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(clearOfflineOwner).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(getOfflineReadSources()).toEqual([expect.objectContaining({ ownerId: 'ana.sp' })]);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('clears the owner partition only after the logout request settles', async () => {
    let resolveLogout!: () => void;
    vi.mocked(logout).mockReturnValue(new Promise<void>((resolve) => { resolveLogout = resolve; }));
    renderShell();

    fireEvent.click(await screen.findByRole('button', { name: 'Sair agora' }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(clearOfflineOwner).not.toHaveBeenCalled();
    resolveLogout();
    await waitFor(() => expect(clearOfflineOwner).toHaveBeenCalledWith(
      'ana.sp', { discardPending: false }
    ));
  });

  it('expires offline access on its timer without clearing pending local data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-07-10T12:00:00Z');
    const expiresAt = Date.now() + 1_000;
    vi.mocked(offlineSessionExpiresAt).mockReturnValue(expiresAt);
    vi.mocked(hasFreshOfflineSession).mockImplementation(() => Date.now() < expiresAt);
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:00:00Z');

    await act(async () => {
      renderShell();
      await Promise.resolve();
    });
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_001);
      await Promise.resolve();
    });

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(stopSyncEngine).toHaveBeenCalled();
    expect(clearOfflineOwner).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(getOfflineReadSources()).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each(['focus', 'online', 'visibilitychange'] as const)(
    'rechecks an expired lease on %s',
    async (eventName) => {
      let fresh = true;
      vi.mocked(hasFreshOfflineSession).mockImplementation(() => fresh);
      renderShell();
      await screen.findByText('Conteúdo');
      fresh = false;

      act(() => {
        const target = eventName === 'visibilitychange' ? document : window;
        target.dispatchEvent(new Event(eventName));
      });

      expect(await screen.findByText('Login')).toBeInTheDocument();
      expect(clearOfflineOwner).not.toHaveBeenCalled();
    }
  );

  it.each(['focus', 'storage'] as const)(
    'blocks the shell on %s when another account replaced the active session',
    async (eventName) => {
      renderShell();
      await screen.findByText('Conteúdo');
      vi.mocked(getSession).mockReturnValue(otherSession);

      act(() => window.dispatchEvent(new Event(eventName)));

      expect(await screen.findByText('Login')).toBeInTheDocument();
      expect(clearOfflineOwner).not.toHaveBeenCalled();
    }
  );

  it('uses offline access only for a typed network failure during session revalidation', async () => {
    vi.mocked(revalidateSession).mockRejectedValue(new ApiNetworkError(new TypeError('offline')));
    renderShell();

    expect(await screen.findByText('Conteúdo')).toBeInTheDocument();
  });

  it('rejects offline access after a malformed session response', async () => {
    vi.mocked(revalidateSession).mockRejectedValue(new SyntaxError('json inválido'));
    renderShell();

    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(startSyncEngine).not.toHaveBeenCalled();
  });

  it('reports an authorized workspace read failure instead of treating it as an empty account', async () => {
    vi.mocked(listWorkspaces).mockRejectedValue(new Error('Espaços indisponíveis'));

    renderShell();

    expect(await screen.findByRole('alert')).toHaveTextContent('Espaços indisponíveis');
  });

  it('uses the first authorized workspace when the persisted selection is unavailable', async () => {
    const unavailableSession = { ...session, workspaceId: 'territorio-indisponivel' };
    vi.mocked(getSession).mockReturnValue(unavailableSession);
    vi.mocked(revalidateSession).mockResolvedValue(unavailableSession);
    vi.mocked(listWorkspaces).mockResolvedValue([
      { slug: 'territorio-z', nome: 'Território Z' },
      { slug: 'territorio-a', nome: 'Território A' }
    ]);

    renderShell();

    await waitFor(() => expect(setSessionWorkspace).toHaveBeenCalledWith('territorio-z'));
  });

  it('does not open profile editing with provisional session data', async () => {
    let resolveProfile!: (value: Awaited<ReturnType<typeof getProfile>>) => void;
    vi.mocked(getProfile).mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
    renderShell();
    await screen.findByText('Conteúdo');

    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
    expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('perfil ainda não está disponível');

    resolveProfile({
      id: 7,
      workspaceId: 'territorio-a',
      nome: 'Ana',
      papel: 'MEMBER',
      angicoId: 'ana.atualizada',
      telefone: '(81) 99999-0000',
      foto: null,
      createdAt: '2026-07-10T12:00:00Z'
    });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));

    expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toHaveTextContent('(81) 99999-0000');
  });

  it('moves focus into the mobile drawer and restores it after Escape', async () => {
    renderShell();
    await screen.findByText('Conteúdo');
    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    toggle.focus();

    fireEvent.click(toggle);

    expect(await screen.findByRole('button', { name: 'Editar perfil' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus());
  });

  it('closes the drawer when the viewport changes to desktop mode', async () => {
    renderShell();
    await screen.findByText('Conteúdo');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    fireEvent(window, new Event('resize'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument());
  });
});
