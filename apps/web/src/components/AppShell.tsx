import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { DEFAULT_WORKSPACE, loadDashboard } from '../lib/api';

export interface AppContext {
  workspaceId: string;
}

export default function AppShell() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [territoryName, setTerritoryName] = useState('Território');
  const workspaceId = DEFAULT_WORKSPACE;

  useEffect(() => {
    let active = true;
    loadDashboard(workspaceId).then((d) => { if (active) setTerritoryName(d.territory.name); });
    return () => { active = false; };
  }, [workspaceId]);

  function handleLogout() {
    localStorage.removeItem('angico_session');
    navigate('/');
  }

  const context: AppContext = { workspaceId };

  return (
    <div className="app-layout">
      <Sidebar
        territoryName={territoryName}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <main className="app-main">
        <Outlet context={context} />
      </main>
    </div>
  );
}
