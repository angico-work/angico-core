import { NavLink } from 'react-router-dom';
import Brand from './Brand';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { icon } from '../lib/icons';
import type { Workspace } from '../types';

const NAV_GROUPS = [
  {
    label: 'Caderno',
    items: [
      { to: '/app', label: 'Visão geral', end: true },
      { to: '/app/observacoes', label: 'Observações' },
      { to: '/app/territorios', label: 'Territórios' },
      { to: '/app/mapa', label: 'Mapa do território' }
    ]
  },
  {
    label: 'Mobilização',
    items: [
      { to: '/app/problemas', label: 'Problemas' },
      { to: '/app/potencialidades', label: 'Potencialidades' },
      { to: '/app/missoes', label: 'Missões' },
      { to: '/app/acoes', label: 'Ações' },
      { to: '/app/resultados', label: 'Resultados' },
      { to: '/app/evidencias', label: 'Evidências' },
      { to: '/app/recursos', label: 'Recursos' }
    ]
  },
  {
    label: 'Rede e memória',
    items: [
      { to: '/app/pessoas', label: 'Pessoas e grupos' },
      { to: '/app/organizacoes', label: 'Organizações' },
      { to: '/app/mensagens', label: 'Conversas' },
      { to: '/app/indicadores', label: 'Indicadores' },
      { to: '/app/memoria', label: 'Memória' },
      { to: '/app/rastro', label: 'Rastro' },
      { to: '/app/relatorios', label: 'Síntese' }
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
    <aside id="app-sidebar" className={`sidebar ${props.open ? 'open' : ''}`}>
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
                <span>{item.label}</span>
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
        <button type="button" className="logout" aria-label="Sair" onClick={props.onLogout}>{icon('exit')}<span>Sair</span></button>
      </div>
    </aside>
  );
}
