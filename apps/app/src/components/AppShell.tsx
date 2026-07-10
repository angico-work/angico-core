import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ProfileModal from './ProfileModal';
import {
  DEFAULT_WORKSPACE, createWorkspace, deleteWorkspace, getProfile, getSession,
  hasFreshOfflineSession, isAuthenticated, listWorkspaces, logout, revalidateSession,
  setSessionWorkspace
} from '../lib/api';
import { startSyncEngine } from '../lib/offlineSync';
import { clearOfflineOwner, getOfflineOwnerState } from '../lib/offlineStore';
import type { PessoaHit, Workspace } from '../types';

export interface AppContext {
  workspaceId: string;
}

// Turns a workspace slug ("coletivo-jardim-novo") into a readable label — only a
// fallback for before the named workspace list has loaded.
function workspaceLabel(workspaceId: string): string {
  return workspaceId
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ') || 'Workspace';
}

export default function AppShell() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<PessoaHit | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'anonymous'>(
    isAuthenticated() || hasFreshOfflineSession() ? 'checking' : 'anonymous'
  );
  const session = getSession();
  const [activeSlug, setActiveSlug] = useState(session?.workspaceId ?? DEFAULT_WORKSPACE);

  useEffect(() => {
    let active = true;
    const unauthorized = () => setAuthStatus('anonymous');
    window.addEventListener('angico:unauthorized', unauthorized);
    if (getSession()) {
      if (!navigator.onLine && hasFreshOfflineSession()) {
        setAuthStatus('authenticated');
        return () => {
          active = false;
          window.removeEventListener('angico:unauthorized', unauthorized);
        };
      }
      revalidateSession().then((validated) => {
        if (active) setAuthStatus(validated ? 'authenticated' : 'anonymous');
      }).catch(() => {
        if (active) setAuthStatus(hasFreshOfflineSession() ? 'authenticated' : 'anonymous');
      });
    }
    return () => {
      active = false;
      window.removeEventListener('angico:unauthorized', unauthorized);
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    return startSyncEngine();
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    listWorkspaces().then((list) => {
      if (!active) return;
      setWorkspaces(list);
      if (list.length && !list.some((w) => w.slug === activeSlug)) {
        const fallback = list.find((w) => w.slug === DEFAULT_WORKSPACE)?.slug ?? list[0].slug;
        setActiveSlug(fallback);
        setSessionWorkspace(fallback);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Resolve the current member's full record within the active workspace.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    getProfile(activeSlug).then((p) => { if (active) setProfile(p); });
    return () => { active = false; };
  }, [activeSlug, authStatus]);

  if (authStatus === 'checking') {
    return <main aria-busy="true">Validando sessão…</main>;
  }
  if (authStatus === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    const current = getSession();
    const ownerId = current?.angicoId || (current ? `pessoa-${current.pessoaId}` : undefined);
    if (ownerId) {
      const offline = await getOfflineOwnerState(ownerId);
      if (offline.unsynced > 0) {
        const noun = offline.unsynced === 1 ? 'registro ainda não foi compartilhado' : 'registros ainda não foram compartilhados';
        const confirmed = window.confirm(
          `${offline.unsynced} ${noun}. Sair agora apagará esses dados deste aparelho e eles não poderão ser recuperados. Deseja continuar?`
        );
        if (!confirmed) return;
      }
      await clearOfflineOwner(ownerId, { discardPending: offline.unsynced > 0 });
    }
    await logout();
    setAuthStatus('anonymous');
    navigate('/login', { replace: true });
  }

  function switchWorkspace(slug: string) {
    if (slug === activeSlug) return;
    setProfile(null); // drop the previous workspace's profile until it reloads
    setActiveSlug(slug);
    setSessionWorkspace(slug);
  }

  async function handleCreateWorkspace(nome: string) {
    const current = getSession();
    const criadoPor = current?.angicoId
      ? `${current.nome} (@${current.angicoId})`
      : current?.nome ?? undefined;
    const created = await createWorkspace(nome, criadoPor);
    setWorkspaces((prev) => [...prev, created]);
    switchWorkspace(created.slug);
  }

  async function handleDeleteWorkspace(slug: string) {
    await deleteWorkspace(slug);
    setWorkspaces((prev) => prev.filter((w) => w.slug !== slug));
    // If somehow removing the active one, fall back to the first remaining.
    if (slug === activeSlug) {
      const fallback = workspaces.find((w) => w.slug !== slug)?.slug ?? DEFAULT_WORKSPACE;
      switchWorkspace(fallback);
    }
  }

  const context: AppContext = { workspaceId: activeSlug };
  const activeName = workspaces.find((w) => w.slug === activeSlug)?.nome ?? workspaceLabel(activeSlug);

  // Fall back to the session so the profile editor opens even before the full
  // pessoa record (with telefone/foto) has loaded.
  const effectiveProfile: PessoaHit | null = profile ?? (session ? {
    id: session.pessoaId,
    workspaceId: activeSlug,
    nome: session.nome,
    papel: session.papel,
    angicoId: session.angicoId,
    telefone: null,
    foto: null,
    createdAt: ''
  } : null);

  return (
    <div className="app-layout">
      <Sidebar
        workspaces={workspaces}
        activeSlug={activeSlug}
        onSwitchWorkspace={switchWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        userName={effectiveProfile?.nome ?? session?.nome ?? 'Visitante'}
        userRole={session?.papel ?? 'Membro do território'}
        userId={session?.angicoId}
        userFoto={effectiveProfile?.foto ?? null}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onEditProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Topbar
        workspaceLabel={activeName}
        workspaceId={activeSlug}
        ownerId={session?.angicoId || (session ? `pessoa-${session.pessoaId}` : undefined)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onWorkspaceClick={() => setShowProfile(true)}
      />
      <main className="app-main">
        <Outlet context={context} />
      </main>
      {showProfile && effectiveProfile && (
        <ProfileModal
          profile={effectiveProfile}
          onClose={() => setShowProfile(false)}
          onSaved={(p) => { setProfile(p); setShowProfile(false); }}
        />
      )}
    </div>
  );
}
