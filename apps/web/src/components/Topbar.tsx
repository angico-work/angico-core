import { icon } from '../lib/icons';

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="topbar">
      <button className="sidebar-toggle" aria-label="Abrir menu" onClick={onToggleSidebar}>☰</button>
      <div className="search-box"><span>{icon('search')}</span><input aria-label="Buscar" placeholder="Buscar no Angico..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <div className="top-action" style={{ position: 'relative' }}><span>{icon('bell')}</span><span className="notification-dot">3</span>Notificações</div>
        <div className="top-action sync-status"><span>{icon('cloud')}</span><div>Sincronização<small>✓ Online</small></div></div>
        <div className="top-action"><span>{icon('help')}</span></div>
        <div className="workspace-profile">
          <div className="workspace-avatar">CJ</div>
          <div><b>Coletivo Jovem do Bairro</b><span>Workspace</span></div>
          <span>⌄</span>
        </div>
      </div>
    </header>
  );
}
