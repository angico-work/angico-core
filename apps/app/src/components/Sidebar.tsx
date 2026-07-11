import { NavLink } from 'react-router-dom';
import Brand from './Brand';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { icon } from '../lib/icons';
import type { Workspace } from '../types';

const NAV_GROUPS = [
  {
    label: 'Caderno',
    items: [
      { to: '/app', label: 'Visão geral', icon: 'leaf', end: true },
      { to: '/app/observacoes', label: 'Observações', icon: 'observation' },
      { to: '/app/territorios', label: 'Territórios', icon: 'map' },
      { to: '/app/mapa', label: 'Mapa do território', icon: 'map' }
    ]
  },
  {
    label: 'Mobilização',
    items: [
      { to: '/app/problemas', label: 'Problemas', icon: 'warning' },
      { to: '/app/potencialidades', label: 'Potencialidades', icon: 'sprout' },
      { to: '/app/missoes', label: 'Missões', icon: 'mission' },
      { to: '/app/acoes', label: 'Ações', icon: 'action' },
      { to: '/app/resultados', label: 'Resultados', icon: 'check' },
      { to: '/app/evidencias', label: 'Evidências', icon: 'report' }
    ]
  },
  {
    label: 'Rede e memória',
    items: [
      { to: '/app/pessoas', label: 'Pessoas e grupos', icon: 'people' },
      { to: '/app/mensagens', label: 'Conversas', icon: 'message' },
      { to: '/app/indicadores', label: 'Indicadores', icon: 'indicator' },
      { to: '/app/memoria', label: 'Memória', icon: 'memory' },
      { to: '/app/rastro', label: 'Rastro', icon: 'memory' },
      { to: '/app/relatorios', label: 'Síntese', icon: 'report' }
    ]
  }
] as const;

interface Props {
  workspaces: Workspace[];
  activeSlug: string;
  onSwitchWorkspace: (slug: string) => void;
  onCreateWorkspace: (nome: string) => Promise<void>;
  onDeleteWorkspace: (slug: string) => Promise<void>;
  userName: string;
  userRole: string;
  userFoto?: string | null;
  open: boolean;
  onNavigate: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '')).toUpperCase();
}

function roleLabel(role: string): string {
  const roles: Record<string, string> = {
    OWNER: 'Responsável', ADMIN: 'Administração', COORDINATOR: 'Coordenação',
    MAPPER: 'Registro de campo', MEMBER: 'Participante', VIEWER: 'Leitura'
  };
  return roles[role.toUpperCase()] ?? role;
}

export default function Sidebar(props: Props) {
  return (
    <aside className={`sidebar ${props.open ? 'open' : ''}`}>
      <div className="sidebar-brand"><Brand small /></div>
      <WorkspaceSwitcher
        workspaces={props.workspaces}
        activeSlug={props.activeSlug}
        onSwitch={props.onSwitchWorkspace}
        onCreate={props.onCreateWorkspace}
        onDelete={props.onDeleteWorkspace}
      />
      <nav className="nav-list" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <section className="nav-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : undefined}
                onClick={props.onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icon(item.icon)}</span><span>{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-account">
        <button type="button" className="user-card" onClick={props.onEditProfile}>
          <span className="avatar">{props.userFoto ? <img src={props.userFoto} alt="" /> : initials(props.userName)}</span>
          <span><strong>{props.userName}</strong><small>{roleLabel(props.userRole)}</small></span>
        </button>
        <button type="button" className="logout" onClick={props.onLogout}>{icon('exit')}<span>Sair</span></button>
      </div>
    </aside>
  );
}
