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
  open: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}

export default function Sidebar({ territoryName, open, onNavigate, onLogout }: Props) {
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
          <div className="avatar">JS</div>
          <div><strong>Júlia Santos</strong><span>Jovem Mapeadora</span></div>
        </div>
        <span className="level">Nível 3 · Guardiã do Território</span>
        <div className="progress-track"><div className="progress-fill" style={{ width: '64%' }} /></div>
        <div style={{ textAlign: 'right', color: '#4b5563', fontSize: 12, marginTop: 8 }}>320 / 500 XP</div>
      </div>
      <button className="logout" onClick={onLogout}>{icon('exit')} Sair</button>
    </aside>
  );
}
