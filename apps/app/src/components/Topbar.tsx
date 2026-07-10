import { useEffect, useState } from 'react';
import { icon } from '../lib/icons';
import { getSyncState, type SyncState } from '../lib/offlineSync';

interface Props {
  workspaceLabel: string;
  workspaceId: string;
  ownerId?: string;
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

const EMPTY_SYNC_STATE: SyncState = {
  pending: 0,
  syncing: 0,
  conflicts: 0,
  blocked: 0,
  actionRequired: 0
};

function syncLabel(online: boolean, state: SyncState): string {
  const attention = state.conflicts + state.blocked + state.actionRequired;
  if (attention > 0) return `${attention} para revisar`;
  if (state.syncing > 0) return `Sincronizando ${state.syncing}`;
  if (state.pending > 0) return `${state.pending} pendente${state.pending > 1 ? 's' : ''}`;
  return online ? 'Em dia' : 'Offline';
}

export default function Topbar({ workspaceLabel, workspaceId, ownerId, onToggleSidebar, onWorkspaceClick }: Props) {
  const online = useOnline();
  const [syncState, setSyncState] = useState<SyncState>(EMPTY_SYNC_STATE);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!ownerId) {
        setSyncState(EMPTY_SYNC_STATE);
        return;
      }
      void getSyncState(ownerId, workspaceId).then((state) => {
        if (active) setSyncState(state);
      });
    };
    refresh();
    window.addEventListener('angico:sync-state', refresh);
    return () => {
      active = false;
      window.removeEventListener('angico:sync-state', refresh);
    };
  }, [ownerId, workspaceId]);

  const needsAttention = syncState.conflicts + syncState.blocked + syncState.actionRequired > 0;
  const syncClass = needsAttention ? 'has-issue' : online ? 'is-on' : 'is-off';
  return (
    <header className="topbar">
      <button className="sidebar-toggle" aria-label="Abrir menu" onClick={onToggleSidebar}>☰</button>
      <div className="search-box"><span>{icon('search')}</span><input aria-label="Buscar" placeholder="Buscar no Angico..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <div className="top-action"><span>{icon('bell')}</span>Notificações</div>
        <div className={`top-action sync-status ${syncClass}`}><span>{icon('cloud')}</span><div>Sincronização<small>{syncLabel(online, syncState)}</small></div></div>
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
