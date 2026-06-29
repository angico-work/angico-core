import { useEffect, useState } from 'react';
import { icon } from '../lib/icons';

interface Props {
  workspaceLabel: string;
  onToggleSidebar: () => void;
  onWorkspaceClick: () => void;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Reflects real connectivity so the offline-capable app shows its actual state
// (the PWA service worker keeps the shell usable while this reads "Offline").
function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function Topbar({ workspaceLabel, onToggleSidebar, onWorkspaceClick }: Props) {
  const online = useOnline();
  return (
    <header className="topbar">
      <button className="sidebar-toggle" aria-label="Abrir menu" onClick={onToggleSidebar}>☰</button>
      <div className="search-box"><span>{icon('search')}</span><input aria-label="Buscar" placeholder="Buscar no Angico..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <div className="top-action"><span>{icon('bell')}</span>Notificações</div>
        <div className={`top-action sync-status ${online ? 'is-on' : 'is-off'}`}><span>{icon('cloud')}</span><div>Conexão<small className={online ? 'is-online' : 'is-offline'}>{online ? '✓ Online' : 'Offline'}</small></div></div>
        <div className="top-action"><span>{icon('help')}</span></div>
        <button type="button" className="workspace-profile" onClick={onWorkspaceClick} title="Perfil e conta">
          <div className="workspace-avatar">{initials(workspaceLabel)}</div>
          <div><b>{workspaceLabel}</b><span>Workspace</span></div>
          <span>⌄</span>
        </button>
      </div>
    </header>
  );
}
