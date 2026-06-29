import { icon } from '../lib/icons';

interface Props {
  workspaceLabel: string;
  onToggleSidebar: () => void;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function Topbar({ workspaceLabel, onToggleSidebar }: Props) {
  return (
    <header className="topbar">
      <button className="sidebar-toggle" aria-label="Abrir menu" onClick={onToggleSidebar}>☰</button>
      <div className="search-box"><span>{icon('search')}</span><input aria-label="Buscar" placeholder="Buscar no Angico..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <div className="top-action"><span>{icon('bell')}</span>Notificações</div>
        <div className="top-action sync-status"><span>{icon('cloud')}</span><div>Conexão<small>✓ Online</small></div></div>
        <div className="top-action"><span>{icon('help')}</span></div>
        <div className="workspace-profile">
          <div className="workspace-avatar">{initials(workspaceLabel)}</div>
          <div><b>{workspaceLabel}</b><span>Workspace</span></div>
          <span>⌄</span>
        </div>
      </div>
    </header>
  );
}
