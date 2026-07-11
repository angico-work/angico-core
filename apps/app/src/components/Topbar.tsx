import { useEffect, useState } from 'react';
import { icon } from '../lib/icons';
import { getSyncState, type SyncState } from '../lib/offlineSync';
import SyncCenter from './SyncCenter';

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
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '')).toUpperCase();
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
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
  if (state.syncing > 0) return `Enviando ${state.syncing}`;
  if (state.pending > 0) return `${state.pending} aguardando`;
  return online ? 'Em dia' : 'Offline';
}

export default function Topbar({ workspaceLabel, workspaceId, ownerId, onToggleSidebar, onWorkspaceClick }: Props) {
  const online = useOnline();
  const [syncState, setSyncState] = useState<SyncState>(EMPTY_SYNC_STATE);
  const [showSync, setShowSync] = useState(false);

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
  const syncClass = needsAttention ? 'attention' : online ? 'online' : 'offline';

  return (
    <>
      <header className="topbar">
        <button className="sidebar-toggle" aria-label="Abrir menu" onClick={onToggleSidebar}>☰</button>
        <div className="topbar-context">
          <span>Espaço de trabalho ativo</span>
          <b>{workspaceLabel}</b>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className={`sync-button ${syncClass}`}
            aria-label="Abrir sincronização"
            onClick={() => setShowSync(true)}
          >
            <span>{icon('cloud')}</span>
            <div><b>Sincronização</b><small>{syncLabel(online, syncState)}</small></div>
          </button>
          <button type="button" className="workspace-profile" onClick={onWorkspaceClick} aria-label="Abrir perfil e conta">
            <span className="workspace-avatar">{initials(workspaceLabel)}</span>
            <div><b>{workspaceLabel}</b><span>Perfil e conta</span></div>
          </button>
        </div>
      </header>
      {showSync && (
        <SyncCenter
          ownerId={ownerId}
          workspaceId={workspaceId}
          online={online}
          onClose={() => setShowSync(false)}
        />
      )}
    </>
  );
}
