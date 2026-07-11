import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ProfileModal from './ProfileModal';
import OfflineReadNotice from './OfflineReadNotice';
import {
  ApiNetworkError, DEFAULT_WORKSPACE, createWorkspace, deleteWorkspace, getProfile, getSession,
  hasFreshOfflineSession, isAuthenticated, listWorkspaces, logout, revalidateSession,
  offlineSessionExpiresAt, sessionOwnerId, setSessionWorkspace
} from '../lib/api';
import { startSyncEngine } from '../lib/offlineSync';
import { clearOfflineOwner, getOfflineOwnerState } from '../lib/offlineStore';
import { clearOfflineReadSourcesForOwner } from '../lib/offlineReadState';
import type { PessoaHit, Workspace } from '../types';

export interface AppContext {
  workspaceId: string;
}

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
  const [accountError, setAccountError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeIdentity] = useState(() => {
    const activeSession = getSession();
    return { session: activeSession, ownerId: sessionOwnerId(activeSession) };
  });
  const activePessoaId = activeIdentity.session?.pessoaId;
  const activeOwnerId = activeIdentity.ownerId;
  const [session, setSession] = useState(activeIdentity.session);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'anonymous'>(
    isAuthenticated() || hasFreshOfflineSession() ? 'checking' : 'anonymous'
  );
  const [activeSlug, setActiveSlug] = useState(session?.workspaceId ?? DEFAULT_WORKSPACE);

  useEffect(() => {
    let active = true;
    const unauthorized = () => {
      setSession(null);
      setAuthStatus('anonymous');
    };
    window.addEventListener('angico:unauthorized', unauthorized);
    if (activeIdentity.session) {
      if (!navigator.onLine && hasFreshOfflineSession()) {
        setAuthStatus('authenticated');
        return () => {
          active = false;
          window.removeEventListener('angico:unauthorized', unauthorized);
        };
      }
      revalidateSession().then((validated) => {
        if (!active) return;
        const sameIdentity = validated
          && validated.pessoaId === activePessoaId
          && sessionOwnerId(validated) === activeOwnerId;
        setSession(sameIdentity ? validated : null);
        setAuthStatus(sameIdentity ? 'authenticated' : 'anonymous');
      }).catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiNetworkError && hasFreshOfflineSession()) {
          setAuthStatus('authenticated');
        } else {
          setSession(null);
          setAuthStatus('anonymous');
        }
      });
    }
    return () => {
      active = false;
      window.removeEventListener('angico:unauthorized', unauthorized);
    };
  }, [activeIdentity.session, activeOwnerId, activePessoaId]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeOwnerId) return;
    return startSyncEngine(activeOwnerId);
  }, [activeOwnerId, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let timer: number | undefined;
    const reevaluate = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      const currentSession = getSession();
      if (!currentSession
        || currentSession.pessoaId !== activePessoaId
        || sessionOwnerId(currentSession) !== activeOwnerId) {
        setSession(null);
        setAuthStatus('anonymous');
        return;
      }
      if (!hasFreshOfflineSession()) {
        setSession(null);
        setAuthStatus('anonymous');
        return;
      }
      const expiresAt = offlineSessionExpiresAt();
      if (expiresAt === undefined || expiresAt <= Date.now()) {
        setSession(null);
        setAuthStatus('anonymous');
        return;
      }
      timer = window.setTimeout(
        reevaluate,
        Math.min(60_000, expiresAt - Date.now() + 1)
      );
    };
    reevaluate();
    window.addEventListener('focus', reevaluate);
    window.addEventListener('online', reevaluate);
    window.addEventListener('storage', reevaluate);
    document.addEventListener('visibilitychange', reevaluate);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', reevaluate);
      window.removeEventListener('online', reevaluate);
      window.removeEventListener('storage', reevaluate);
      document.removeEventListener('visibilitychange', reevaluate);
    };
  }, [activeOwnerId, activePessoaId, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    setAccountError(null);
    listWorkspaces().then((list) => {
      if (!active) return;
      setWorkspaces(list);
      if (list.length && !list.some((w) => w.slug === activeSlug)) {
        const fallback = list.find((w) => w.slug === DEFAULT_WORKSPACE)?.slug ?? list[0].slug;
        setActiveSlug(fallback);
        setSessionWorkspace(fallback);
      }
    }).catch((caught) => {
      if (active) setAccountError(caught instanceof Error ? caught.message : 'Não foi possível carregar os espaços de trabalho.');
    });
    return () => { active = false; };
  }, [activeSlug, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    setProfileError(null);
    getProfile(activeSlug).then((p) => {
      if (active) setProfile(p);
    }).catch((caught) => {
      if (active) setProfileError(caught instanceof Error ? caught.message : 'Não foi possível carregar o perfil.');
    });
    return () => { active = false; };
  }, [activeSlug, authStatus]);

  if (authStatus === 'checking') {
    return <main aria-busy="true">Validando sessão…</main>;
  }
  if (authStatus === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    const ownerId = activeIdentity.ownerId;
    let discardPending = false;
    if (ownerId) {
      const offline = await getOfflineOwnerState(ownerId);
      if (offline.unsynced > 0) {
        const noun = offline.unsynced === 1 ? 'registro ainda não foi compartilhado' : 'registros ainda não foram compartilhados';
        const confirmed = window.confirm(
          `${offline.unsynced} ${noun}. Sair agora apagará esses dados deste aparelho e eles não poderão ser recuperados. Deseja continuar?`
        );
        if (!confirmed) return;
      }
      discardPending = offline.unsynced > 0;
    }
    const request = logout();
    setSession(null);
    setAuthStatus('anonymous');
    navigate('/login', { replace: true });
    await request;
    if (ownerId) {
      await clearOfflineOwner(ownerId, { discardPending });
      clearOfflineReadSourcesForOwner(ownerId);
    }
  }

  function switchWorkspace(slug: string) {
    if (slug === activeSlug) return;
    setProfile(null);
    setActiveSlug(slug);
    setSessionWorkspace(slug);
  }

  async function handleCreateWorkspace(nome: string) {
    const created = await createWorkspace(nome);
    setWorkspaces((prev) => [...prev, created]);
    switchWorkspace(created.slug);
  }

  async function handleDeleteWorkspace(slug: string) {
    await deleteWorkspace(slug);
    setWorkspaces((prev) => prev.filter((w) => w.slug !== slug));
    if (slug === activeSlug) {
      const fallback = workspaces.find((w) => w.slug !== slug)?.slug ?? DEFAULT_WORKSPACE;
      switchWorkspace(fallback);
    }
  }

  const context: AppContext = { workspaceId: activeSlug };
  const activeName = workspaces.find((w) => w.slug === activeSlug)?.nome ?? workspaceLabel(activeSlug);

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
        userRole={session?.papel ?? 'Membro do espaço de trabalho'}
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
        ownerId={activeIdentity.ownerId}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onWorkspaceClick={() => setShowProfile(true)}
      />
      <main className="app-main">
        {(accountError || profileError) && (
          <div className="form-error" role="alert">{accountError || profileError}</div>
        )}
        <OfflineReadNotice
          ownerId={activeIdentity.ownerId}
          workspaceId={activeSlug}
          active={hasFreshOfflineSession()}
        />
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
