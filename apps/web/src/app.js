import './styles.css';
import logoUrl from './assets/angico-logo.png';

const app = document.querySelector('#app');

const fallbackDashboard = {
  workspaceId: 'coletivo-jardim-novo',
  territory: {
    id: 'bairro-jardim-novo',
    name: 'Bairro Jardim Novo',
    subtitle: 'Visão geral socioambiental do território'
  },
  stats: [
    { label: 'Observações', value: 128, trend: '+12 esta semana', icon: 'leaf' },
    { label: 'Problemas Ativos', value: 23, trend: '+3 novos', icon: 'warning' },
    { label: 'Missões em Andamento', value: 8, trend: '2 concluídas', icon: 'target' },
    { label: 'Jovens Engajados', value: 156, trend: '+8 este mês', icon: 'people' },
    { label: 'Potencialidades', value: 17, trend: '+2 identificadas', icon: 'sprout' }
  ],
  activities: [
    { title: 'Novo problema identificado', subtitle: 'Descarte irregular de lixo', location: 'Rua das Flores, 245', time: 'Há 2 horas', type: 'warning' },
    { title: 'Nova observação', subtitle: 'Alagamento após chuva forte', location: 'Praça Central', time: 'Há 3 horas', type: 'target' },
    { title: 'Missão concluída', subtitle: 'Mutirão de limpeza do Córrego Azul', location: 'Impacto: 320kg de resíduos removidos', time: 'Há 1 dia', type: 'check' },
    { title: 'Novo jovem engajado', subtitle: 'Pedro Henrique se juntou ao coletivo', location: '', time: 'Há 1 dia', type: 'people' },
    { title: 'Nova potencialidade', subtitle: 'Horta comunitária', location: 'Escola Municipal Jardim Novo', time: 'Há 2 dias', type: 'sprout' }
  ],
  missions: [
    { title: 'Revitalizar Praça Central', progress: 60, actions: '5 ações', participants: '12 participantes' },
    { title: 'Córrego Azul Limpo', progress: 40, actions: '3 ações', participants: '8 participantes' },
    { title: 'Arborização do Bairro', progress: 25, actions: '4 ações', participants: '15 participantes' }
  ],
  impact: [
    { value: '1.2 ton', label: 'Resíduos removidos', period: 'este mês', icon: 'trash' },
    { value: '45', label: 'Árvores plantadas', period: 'este mês', icon: 'tree' },
    { value: '320', label: 'Pessoas impactadas', period: 'este mês', icon: 'people' },
    { value: '12', label: 'Ações realizadas', period: 'este mês', icon: 'check' }
  ],
  categoryDistribution: [
    { name: 'Resíduos', value: 8 },
    { name: 'Água e Saneamento', value: 6 },
    { name: 'Mobilidade', value: 4 },
    { name: 'Áreas Verdes', value: 3 },
    { name: 'Outros', value: 2 }
  ],
  memoryClaim: 'Cada dado do painel possui caminho para objeto, relação e evento no core do Angico.'
};

function icon(name) {
  const icons = {
    leaf: '◒',
    warning: '⚠',
    target: '◎',
    people: '♙',
    sprout: '♧',
    map: '▱',
    observation: '⌾',
    mission: '▣',
    action: '☑',
    indicator: '▥',
    memory: '⟲',
    report: '▤',
    trash: '♲',
    tree: '♣',
    check: '✓',
    search: '⌕',
    bell: '♧',
    cloud: '☁',
    help: '?',
    exit: '↳'
  };
  return icons[name] || '•';
}

function setRoute(route) {
  window.location.hash = route;
}

function currentRoute() {
  const hash = window.location.hash.replace('#', '');
  if (!hash || hash === '/') {
    return '/welcome';
  }
  return hash;
}

function brand({ small = false, tagline = true } = {}) {
  return `
    <div>
      <img class="logo-img ${small ? 'small' : ''}" src="${logoUrl}" alt="Angico" />
      ${tagline ? '<div class="logo-tagline">Memória que transforma</div>' : ''}
    </div>
  `;
}

function welcomePage() {
  app.innerHTML = `
    <main class="app-shell welcome-page">
      <header class="page-header">
        ${brand({ small: true })}
        <nav style="display:flex; gap:12px; align-items:center;">
          <button class="ghost-button" data-route="/login">Entrar</button>
          <button class="primary-button" data-route="/app">Ver demo</button>
        </nav>
      </header>

      <section class="hero">
        <div>
          <span class="eyebrow">${icon('sprout')} Inteligência socioambiental para territórios</span>
          <h1>Onde o território <span>aprende</span> a agir e lembrar.</h1>
          <p class="hero-copy">
            O Angico conecta observações, evidências, problemas, pessoas, missões, ações e indicadores em uma memória viva do território. Ele transforma relatos dispersos em continuidade operacional para comunidades, jovens e organizações.
          </p>
          <div class="hero-actions">
            <button class="primary-button" data-route="/login">Começar agora</button>
            <button class="secondary-button" data-route="/app">Abrir primeira visão</button>
          </div>
          <div class="hero-proof">
            <div class="proof-pill">${icon('observation')} Observações viram evidências</div>
            <div class="proof-pill">${icon('mission')} Problemas viram missões</div>
            <div class="proof-pill">${icon('memory')} Impacto vira memória</div>
          </div>
        </div>

        <div class="hero-panel">
          <div class="memory-card large">
            <span class="eyebrow">Core ontológico</span>
            <h3>Do registro ao impacto</h3>
            <p>O mapa é apenas uma projeção. O núcleo do Angico guarda objetos, relações e eventos rastreáveis.</p>
            <div class="memory-flow">
              ${flowNode('Observação', 'Jovem registra o que acontece no território.', 'observation')}
              ${flowNode('Evidência', 'Foto, relato ou medição comprova o registro.', 'target')}
              ${flowNode('Problema', 'A situação é validada e priorizada.', 'warning')}
              ${flowNode('Missão', 'Pessoas, parceiros e recursos são mobilizados.', 'mission')}
              ${flowNode('Impacto', 'Resultados são medidos e ficam na memória.', 'indicator')}
            </div>
          </div>
          <div class="trace-card">
            <span>Rastro operacional</span>
            <strong>Problema → Missão → Ação → Resultado</strong>
            <p>Cada número pode voltar à evidência original.</p>
          </div>
        </div>
      </section>

      <section class="welcome-section">
        <div class="section-head">
          <h2>Mais do que mapear problemas.</h2>
          <p>O Angico organiza o conhecimento local, fortalece comunidades e cria uma memória permanente de desafios, recursos, respostas e conquistas.</p>
        </div>
        <div class="capability-grid">
          ${capability('Ontologia socioambiental', 'Territórios, pessoas, evidências, problemas, potencialidades, missões, ações e indicadores funcionam como objetos conectados.')}
          ${capability('Histórico de ações', 'Cada evento relevante é registrado em uma timeline operacional, preservando autoria, origem, versão e impacto.')}
          ${capability('Ação coletiva', 'Jovens e moradores deixam de ser apenas fontes de dados e passam a operar como agentes de inteligência territorial.')}
        </div>
      </section>
    </main>
  `;
  bindRouteButtons();
}

function flowNode(title, description, iconName) {
  return `
    <div class="flow-node">
      <div class="flow-icon">${icon(iconName)}</div>
      <div><strong>${title}</strong><span>${description}</span></div>
    </div>
  `;
}

function capability(title, description) {
  return `
    <article class="capability-card">
      <span class="eyebrow">${icon('check')} Angico core</span>
      <b>${title}</b>
      <p>${description}</p>
    </article>
  `;
}

function loginPage() {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-visual">
        ${brand({ small: false })}
        <h1 class="login-title">Transforme conhecimento local em ação coordenada.</h1>
        <p>Entre no workspace da sua comunidade para registrar observações, validar problemas, organizar missões e acompanhar resultados no tempo.</p>
      </section>
      <section class="login-form-panel">
        <form class="login-card" id="login-form">
          ${brand({ small: true, tagline: false })}
          <h2>Acessar Angico</h2>
          <p>Primeira versão demonstrativa do workspace territorial.</p>
          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" type="email" value="julia@angico.demo" autocomplete="email" />
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <input id="password" type="password" value="angico-demo" autocomplete="current-password" />
          </div>
          <button class="primary-button" type="submit">Entrar no território</button>
          <div class="demo-hint">
            Demo local: qualquer envio abre a aplicação principal. O login real ficará ligado ao módulo de workspaces e permissões.
          </div>
        </form>
      </section>
    </main>
  `;
  document.querySelector('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    localStorage.setItem('angico_session', 'demo');
    setRoute('/app');
  });
}

async function dashboardPage() {
  const data = await loadDashboard();
  app.innerHTML = `
    <main class="dashboard-page">
      ${sidebar(data)}
      ${topbar(data)}
      <section class="main-content">
        <div class="page-title">
          <h1>Resumo do Território</h1>
          <p>${data.territory.subtitle} de ${data.territory.name}</p>
        </div>
        <div class="stat-grid">
          ${data.stats.map(statCard).join('')}
        </div>
        ${mapPanel()}
        <div class="bottom-grid">
          ${categoryPanel(data)}
          ${missionPanel(data)}
          ${impactPanel(data)}
        </div>
      </section>
      ${activityPanel(data)}
    </main>
  `;
  bindDashboardActions();
}

async function loadDashboard() {
  try {
    const response = await fetch('/api/glimpse/dashboard');
    if (!response.ok) {
      throw new Error('API indisponível');
    }
    return await response.json();
  } catch (error) {
    return fallbackDashboard;
  }
}

function sidebar(data) {
  const items = [
    ['Resumo do Território', 'leaf', true],
    ['Mapa', 'map'],
    ['Observações', 'observation'],
    ['Problemas', 'warning'],
    ['Missões', 'mission'],
    ['Ações', 'action'],
    ['Indicadores', 'indicator'],
    ['Potencialidades', 'sprout'],
    ['Pessoas e Grupos', 'people'],
    ['Memória do Território', 'memory'],
    ['Relatórios', 'report']
  ];

  return `
    <aside class="sidebar">
      ${brand({ small: true })}
      <div class="territory-select">
        <div><span>Território</span><strong>${data.territory.name}</strong></div>
        <b>⌄</b>
      </div>
      <nav class="nav-list">
        ${items.map(([label, iconName, active]) => `
          <a class="nav-item ${active ? 'active' : ''}" href="#/app"><span class="nav-icon">${icon(iconName)}</span>${label}</a>
        `).join('')}
      </nav>
      <div class="user-card">
        <div class="user-row">
          <div class="avatar">JS</div>
          <div><strong>Júlia Santos</strong><span>Jovem Mapeadora</span></div>
        </div>
        <span class="level">Nível 3 · Guardiã do Território</span>
        <div class="progress-track"><div class="progress-fill" style="width:64%"></div></div>
        <div style="text-align:right; color:#4b5563; font-size:12px; margin-top:8px;">320 / 500 XP</div>
      </div>
      <button class="logout" id="logout-button">${icon('exit')} Sair</button>
    </aside>
  `;
}

function topbar(data) {
  return `
    <header class="topbar">
      <div class="search-box"><span>${icon('search')}</span><input aria-label="Buscar" placeholder="Buscar no Angico..." /><kbd>⌘ K</kbd></div>
      <div class="top-actions">
        <div class="top-action" style="position:relative;"><span>${icon('bell')}</span><span class="notification-dot">3</span>Notificações</div>
        <div class="top-action sync-status"><span>${icon('cloud')}</span><div>Sincronização<small>✓ Online</small></div></div>
        <div class="top-action"><span>${icon('help')}</span></div>
        <div class="workspace-profile">
          <div class="workspace-avatar">CJ</div>
          <div><b>Coletivo Jovem do Bairro</b><span>Workspace</span></div>
          <span>⌄</span>
        </div>
      </div>
    </header>
  `;
}

function statCard(item) {
  return `
    <article class="stat-card">
      <div class="stat-icon">${icon(item.icon)}</div>
      <div>
        <strong>${item.value}</strong>
        <span>${item.label}</span>
        <small>${item.trend}</small>
      </div>
    </article>
  `;
}

function mapPanel() {
  const markers = [
    ['problem', '⚠', 18, 44, ''], ['problem', '⚠', 46, 49, ''], ['problem', '⚠', 25, 68, ''],
    ['cluster large', '7', 35, 41, ''], ['cluster medium', '3', 60, 58, ''],
    ['potential medium', '4', 65, 38, ''], ['potential', '♧', 70, 25, ''], ['potential', '♧', 86, 47, ''],
    ['observation medium', '4', 74, 68, ''], ['observation', '⌾', 50, 33, ''], ['observation medium', '4', 63, 16, ''],
    ['mission', '♙', 84, 20, ''], ['mission', '♙', 25, 29, ''], ['potential', '♧', 40, 30, '']
  ];
  return `
    <section class="map-panel" aria-label="Mapa do território">
      <div class="map-filter-row">
        <button class="map-filter">Filtrar por categoria⌄</button>
        <button class="map-filter">Todos os status⌄</button>
        <button class="map-filter">Período⌄</button>
      </div>
      <div class="map-controls">
        <div class="map-control-group"><button>+</button><button>−</button></div>
        <button class="map-control">▧</button>
        <button class="map-control">⌾</button>
      </div>
      ${markers.map(([kind, text, x, y]) => `<div class="map-marker ${kind}" style="left:${x}%; top:${y}%">${text}</div>`).join('')}
      <div class="legend">
        <strong>Legenda</strong>
        ${legend('Problemas', 'var(--angico-orange)')}
        ${legend('Observações', '#2c8fbd')}
        ${legend('Potencialidades', '#2aa84a')}
        ${legend('Ações/Missões', 'var(--angico-purple)')}
      </div>
    </section>
  `;
}

function legend(label, color) {
  return `<div class="legend-row"><span class="legend-dot" style="background:${color}"></span>${label}</div>`;
}

function categoryPanel(data) {
  const colors = ['#2c80a6', '#f97316', '#efc224', '#5bb84f', '#9670c6'];
  const total = data.categoryDistribution.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return `
    <article class="panel-card">
      <div class="panel-title"><h3>Problemas por Categoria</h3><a href="#/app">Ver todos</a></div>
      <div class="donut-wrap">
        <div class="donut"><div class="donut-center"><b>${total}</b><span>Total</span></div></div>
        <div class="category-list">
          ${data.categoryDistribution.map((item, index) => `
            <div class="category-row"><span class="legend-dot" style="background:${colors[index % colors.length]}"></span><span>${item.name}</span><b>${item.value}</b></div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function missionPanel(data) {
  return `
    <article class="panel-card">
      <div class="panel-title"><h3>Missões em Andamento</h3><a href="#/app">Ver todas</a></div>
      <div class="mission-list">
        ${data.missions.map((mission, index) => `
          <div class="mission-row">
            <div class="impact-icon">${['♧','♙','♢'][index % 3]}</div>
            <div>
              <b>${mission.title}</b>
              <div class="mini-progress"><i style="width:${mission.progress}%"></i></div>
              <span>${mission.actions} • ${mission.participants}</span>
            </div>
            <strong>${mission.progress}%</strong>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function impactPanel(data) {
  return `
    <article class="panel-card">
      <div class="panel-title"><h3>Impacto do Território</h3></div>
      <div class="impact-grid">
        ${data.impact.map(item => `
          <div class="impact-cell">
            <div class="impact-icon">${icon(item.icon)}</div>
            <div><b>${item.value}</b><span>${item.label}</span><small>${item.period}</small></div>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function activityPanel(data) {
  return `
    <aside class="activity-panel">
      <div class="activity-card">
        <div class="panel-title"><h3>Atividades Recentes</h3><a href="#/app">Ver todas</a></div>
        <div class="activity-list">
          ${data.activities.map(item => `
            <div class="activity-item">
              <div class="activity-icon ${item.type}">${icon(item.type)}</div>
              <div>
                <b>${item.title}</b>
                <span>${item.subtitle}</span>
                ${item.location ? `<span>${item.location}</span>` : ''}
                <small>${item.time}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </aside>
  `;
}

function bindRouteButtons() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => setRoute(button.dataset.route));
  });
}

function bindDashboardActions() {
  const logout = document.querySelector('#logout-button');
  if (logout) {
    logout.addEventListener('click', () => {
      localStorage.removeItem('angico_session');
      setRoute('/welcome');
    });
  }
}

function render() {
  const route = currentRoute();
  if (route === '/login') {
    loginPage();
    return;
  }
  if (route === '/app') {
    dashboardPage();
    return;
  }
  welcomePage();
}

window.addEventListener('hashchange', render);
render();

function showInteractionToast(title, description, actionLabel = 'Entendi') {
  document.querySelector('.interaction-toast')?.remove();

  const toast = document.createElement('aside');
  toast.className = 'interaction-toast';
  toast.innerHTML = `
    <h3>${title}</h3>
    <p>${description}</p>
    <button type="button">${actionLabel}</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
}

document.addEventListener('click', (event) => {
  const navItem = event.target.closest('.nav-item');
  if (navItem) {
    event.preventDefault();

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.dataset.selected = 'false';
    });

    navItem.dataset.selected = 'true';

    const label = navItem.textContent.trim();

    showInteractionToast(
      label,
      `Módulo "${label}" selecionado. Na próxima iteração, esta área terá listagem real, filtros, criação e vínculo com a memória operacional.`
    );

    return;
  }

  const marker = event.target.closest('.map-marker');
  if (marker) {
    const type = marker.classList.contains('problem')
      ? 'Problema socioambiental'
      : marker.classList.contains('potential')
        ? 'Potencialidade territorial'
        : marker.classList.contains('mission')
          ? 'Missão territorial'
          : 'Observação territorial';

    showInteractionToast(
      type,
      `Este marcador representa um objeto do território. O comportamento correto será abrir detalhes, evidências, relações e histórico operacional ligados ao grafo do Angico.`,
      'Abrir detalhes'
    );

    return;
  }

  const activity = event.target.closest('.activity-item');
  if (activity) {
    const title = activity.querySelector('b')?.textContent?.trim() || 'Atividade recente';
    const details = [...activity.querySelectorAll('span')]
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(' · ');

    showInteractionToast(
      title,
      details || 'Evento recente registrado na memória territorial.',
      'Ver evento'
    );

    return;
  }

  const mission = event.target.closest('.mission-row');
  if (mission) {
    const title = mission.querySelector('b')?.textContent?.trim() || 'Missão';
    const progress = mission.querySelector('strong')?.textContent?.trim() || '';

    showInteractionToast(
      title,
      `Missão selecionada. Progresso atual: ${progress}. O próximo passo é conectar esta missão a ações, responsáveis, evidências e indicadores reais.`,
      'Abrir missão'
    );

    return;
  }

  const stat = event.target.closest('.stat-card');
  if (stat) {
    const value = stat.querySelector('strong')?.textContent?.trim() || '';
    const label = stat.querySelector('span')?.textContent?.trim() || 'Indicador';

    showInteractionToast(
      label,
      `Indicador selecionado: ${value}. Futuramente, este número deverá ser rastreável até eventos, evidências e medições originais.`,
      'Ver origem'
    );

    return;
  }

  const filter = event.target.closest('.map-filter');
  if (filter) {
    showInteractionToast(
      'Filtro do mapa',
      `Filtro "${filter.textContent.trim()}" selecionado. Esta ação será ligada aos tipos ontológicos: observações, problemas, potencialidades e missões.`
    );

    return;
  }

  const panelLink = event.target.closest('.panel-title a');
  if (panelLink) {
    event.preventDefault();

    showInteractionToast(
      'Abrir listagem completa',
      'Esta ação deve abrir a visão detalhada do módulo com busca, filtros e criação de novos registros.'
    );
  }
});
