import { NavLink } from 'react-router-dom';
import Brand from './Brand';
import { icon } from '../lib/icons';

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
  { to: '/app/memoria', label: 'Memória do Território', icon: 'memory' },
  { to: '/app/relatorios', label: 'Relatórios', icon: 'report' }
];

interface Props {
  territoryName: string;
  userName: string;
  userRole: string;
  userId?: string | null;
  open: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function Sidebar({ territoryName, userName, userRole, userId, open, onNavigate, onLogout }: Props) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Brand small />
      <div className="territory-select">
        <div><span>Território</span><strong>{territoryName}</strong></div>
        <b>⌄</b>
      </div>
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
      <div className="user-card">
        <div className="user-row">
          <div className="avatar">{initials(userName)}</div>
          <div><strong>{userName}</strong><span>{userRole}</span></div>
        </div>
        {userId && <span className="user-id mono">{userId}</span>}
      </div>
      <button className="logout" onClick={onLogout}>{icon('exit')} Sair</button>
    </aside>
  );
}
