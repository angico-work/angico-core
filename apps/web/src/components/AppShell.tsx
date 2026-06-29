import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { DEFAULT_WORKSPACE, getSession, isAuthenticated, loadDashboard, logout } from '../lib/api';

export interface AppContext {
  workspaceId: string;
}

// Turns a workspace slug ("coletivo-jardim-novo") into a readable label.
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
  const [territoryName, setTerritoryName] = useState('Território');
  const session = getSession();
  const workspaceId = session?.workspaceId ?? DEFAULT_WORKSPACE;

  useEffect(() => {
    let active = true;
    loadDashboard(workspaceId).then((d) => { if (active) setTerritoryName(d.territory.name); });
    return () => { active = false; };
  }, [workspaceId]);

  // Auth guard: the core app is only reachable with a valid session.
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const context: AppContext = { workspaceId };

  return (
    <div className="app-layout">
      <Sidebar
        territoryName={territoryName}
        userName={session?.nome ?? 'Visitante'}
        userRole={session?.papel ?? 'Membro do território'}
        userId={session?.angicoId}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Topbar workspaceLabel={workspaceLabel(workspaceId)} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <main className="app-main">
        <Outlet context={context} />
      </main>
    </div>
  );
}
