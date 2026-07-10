import { NavLink } from 'react-router-dom';
import Brand from './Brand';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { icon } from '../lib/icons';
import type { Workspace } from '../types';

export const NAV_ITEMS: Array<{ to: string; label: string; icon: string; end?: boolean }> = [
  { to: '/app', label: 'Resumo do Território', icon: 'leaf', end: true },
  { to: '/app/mapa', label: 'Mapa', icon: 'map' },
  { to: '/app/observacoes', label: 'Observações', icon: 'observation' },
  { to: '/app/problemas', label: 'Problemas', icon: 'warning' },
  { to: '/app/missoes', label: 'Missões', icon: 'mission' },
  { to: '/app/acoes', label: 'Ações', icon: 'action' },
  { to: '/app/indicadores', label: 'Indicadores', icon: 'indicator' },
  { to: '/app/potencialidades', label: 'Potencialidades', icon: 'sprout' },
  { to: '/app/pessoas', label: 'Pessoas e Grupos', icon: 'people' },
  { to: '/app/mensagens', label: 'Mensagens e Grupos', icon: 'message' },
  { to: '/app/memoria', label: 'Memória do Território', icon: 'memory' },
  { to: '/app/relatorios', label: 'Relatórios', icon: 'report' }
];

interface Props {
  workspaces: Workspace[];
  activeSlug: string;
  onSwitchWorkspace: (slug: string) => void;
  onCreateWorkspace: (nome: string) => Promise<void>;
  onDeleteWorkspace: (slug: string) => Promise<void>;
  userName: string;
  userRole: string;
  userId?: string | null;
  userFoto?: string | null;
  open: boolean;
  onNavigate: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function Sidebar({ workspaces, activeSlug, onSwitchWorkspace, onCreateWorkspace, onDeleteWorkspace, userName, userRole, userId, userFoto, open, onNavigate, onEditProfile, onLogout }: Props) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Brand small />
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeSlug={activeSlug}
        onSwitch={onSwitchWorkspace}
        onCreate={onCreateWorkspace}
        onDelete={onDeleteWorkspace}
      />
      <nav className="nav-list">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{icon(item.icon)}</span>{item.label}
          </NavLink>
        ))}
      </nav>
      <button type="button" className="user-card" onClick={onEditProfile} title="Editar perfil">
        <div className="user-row">
          <div className="avatar">{userFoto ? <img src={userFoto} alt="" /> : initials(userName)}</div>
          <div><strong>{userName}</strong><span>{userRole}</span></div>
        </div>
        {userId && <span className="user-id mono">{userId}</span>}
      </button>
      <button className="logout" onClick={onLogout}>{icon('exit')} Sair</button>
    </aside>
  );
}
