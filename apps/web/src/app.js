import './styles.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import logoUrl from './assets/angico-logo.png';

const app = document.querySelector('#app');
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const useDemoData = import.meta.env.VITE_USE_DEMO_DATA === 'true';
const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const defaultCountry = import.meta.env.VITE_DEFAULT_COUNTRY || 'BR';
const sessionTokenKey = 'angico.sessionToken';

const navItems = [
  ['home', 'Home'],
  ['resumo', 'Resumo do Território'],
  ['mapa', 'Mapa'],
  ['observacoes', 'Observações'],
  ['problemas', 'Problemas'],
  ['potencialidades', 'Potencialidades'],
  ['missoes', 'Missões'],
  ['acoes', 'Ações'],
  ['liderancas', 'Lideranças'],
  ['mensagens', 'Mensagens'],
  ['memoria', 'Memória'],
  ['relatorios', 'Relatórios']
];

function viewFromHash() {
  const key = window.location.hash.replace('#', '').trim();
  return navItems.some(([view]) => view === key) ? key : 'home';
}

function isAuthRoute() {
  return ['/login', '/entrar', '/cadastro'].includes(window.location.pathname);
}

function isAppRoute() {
  return window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');
}

function authModeFromRoute() {
  return window.location.pathname === '/cadastro' ? 'register' : 'login';
}

function navigateTo(path) {
  window.history.pushState(null, '', path);
  render();
}

function replaceWithAppRoute(view = state.activeView || 'home') {
  window.history.replaceState(null, '', `/app#${view}`);
}

const observationCategories = [
  'Resíduos',
  'Água e saneamento',
  'Áreas verdes',
  'Calor',
  'Mobilidade',
  'Segurança alimentar',
  'Educação ambiental',
  'Outro'
];

const linkableTypes = [
  'TERRITORIO',
  'OBSERVACAO',
  'PROBLEMA',
  'POTENCIALIDADE',
  'MISSAO',
  'ACAO',
  'RESULTADO',
  'INDICADOR'
];

const typeLabels = {
  TODOS: 'Todos',
  OBSERVACAO: 'Observação',
  PROBLEMA: 'Problema',
  POTENCIALIDADE: 'Potencialidade',
  MISSAO: 'Missão',
  ACAO: 'Ação',
  TERRITORIO: 'Território',
  INDICADOR: 'Indicador',
  MEDICAO: 'Medição',
  RESULTADO: 'Resultado',
  CONVERSA: 'Conversa',
  MENSAGEM: 'Mensagem',
  LOCALIZACAO: 'Localização',
  ANEXO: 'Anexo'
};

const statusLabels = {
  TODOS: 'Todos',
  SUBMETIDA: 'Submetida',
  VALIDADA: 'Validada',
  IDENTIFICADO: 'Identificado',
  PRIORIZADO: 'Priorizado',
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  RASCUNHO: 'Rascunho',
  ATIVO: 'Ativo',
  ATIVA: 'Ativa',
  ENVIADA: 'Enviada',
  PENDENTE: 'Pendente'
};

const priorityLabels = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta'
};

function typeLabel(type) {
  return typeLabels[type] || type || '';
}

function statusLabel(status) {
  return statusLabels[status] || status || '';
}

function priorityLabel(priority) {
  return priorityLabels[priority] || priority || '';
}

const state = {
  loading: true,
  error: '',
  loginError: '',
  signupError: '',
  signupMessage: '',
  apiOnline: false,
  activeView: viewFromHash(),
  selectedTerritoryId: null,
  dashboard: null,
  drawer: null,
  modal: null,
  modalError: '',
  leaderError: '',
  leaderQuery: '',
  filterType: 'TODOS',
  filterStatus: 'TODOS',
  map: null,
  authToken: sessionStorage.getItem(sessionTokenKey) || '',
  me: null,
  ontology: null,
  leaders: [],
  conversations: [],
  selectedConversationId: null,
  messageLocation: null
};

const demoDashboard = {
  workspaceId: 'angico-publico',
  territory: {
    id: 1,
    workspaceId: 'angico-publico',
    nome: 'Pinheiros, São Paulo',
    tipo: 'BAIRRO',
    cidade: 'São Paulo',
    bairro: 'Pinheiros',
    estado: 'São Paulo',
    pais: 'Brasil',
    latitude: -23.5614,
    longitude: -46.7019,
    status: 'ATIVO'
  },
  territories: [],
  stats: [
    { label: 'Observações', value: 1 },
    { label: 'Problemas ativos', value: 1 },
    { label: 'Potencialidades', value: 0 },
    { label: 'Missões em andamento', value: 1 },
    { label: 'Ações concluídas', value: 1 },
    { label: 'Medições', value: 1 },
    { label: 'Mensagens', value: 0 }
  ],
  markers: [
    {
      id: 1,
      type: 'OBSERVACAO',
      title: 'Acúmulo de resíduos perto de ponto de ônibus',
      status: 'SUBMETIDA',
      priority: 4,
      latitude: -23.5602,
      longitude: -46.6962
    }
  ],
  observacoes: [],
  problemas: [],
  potencialidades: [],
  missoes: [],
  acoes: [],
  indicadores: [],
  mensagensRecentes: [],
  timeline: [],
  graph: { nodes: [], relations: [] },
  categoryDistribution: [],
  impact: []
};

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function icon(type) {
  const icons = {
    OBSERVACAO: 'O',
    PROBLEMA: '!',
    POTENCIALIDADE: '+',
    MISSAO: 'M',
    ACAO: 'A',
    TERRITORIO: 'T',
    INDICADOR: 'I',
    MEDICAO: '#',
    RESULTADO: 'R',
    CONVERSA: 'C',
    MENSAGEM: '@',
    LOCALIZACAO: 'L',
    ANEXO: 'A'
  };
  return icons[type] || '*';
}

function apiPath(path) {
  return `${apiBaseUrl}${path}`;
}

async function apiFetch(path, options = {}) {
  if (useDemoData && options.method && options.method !== 'GET') {
    throw new Error('VITE_USE_DEMO_DATA está ativo; escrita desabilitada no modo local.');
  }
  if (useDemoData && path.includes('/api/glimpse/dashboard')) {
    return structuredClone(demoDashboard);
  }

  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(apiPath(path), {
    ...options,
    headers
  });

  if (response.status === 401 && !path.includes('/api/auth/login')) {
    clearSession();
    state.loginError = 'Sessão expirada. Entre novamente.';
    render();
    throw new Error('Sessão expirada.');
  }

  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }

  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('problem+json')) {
    return response.json();
  }
  return response.text();
}

async function responseMessage(response) {
  const text = await response.text();
  if (!text) {
    return `HTTP ${response.status}`;
  }
  try {
    const payload = JSON.parse(text);
    return payload.detail || payload.title || text;
  } catch {
    return text;
  }
}

function friendlyLoginError(error) {
  const message = error?.message || '';
  if (message.includes('No static resource') || message.includes('/api/auth/login') || message.includes('Invalid CORS request') || message.includes('Failed to fetch')) {
    return 'Não consegui conectar ao serviço de login. Verifique se o servidor local está ativo e tente novamente.';
  }
  if (message.includes('Credenciais') || message.includes('Senha') || message.includes('email')) {
    return message;
  }
  return message || 'Falha ao entrar.';
}

function saveSession(token) {
  state.authToken = token;
  sessionStorage.setItem(sessionTokenKey, token);
}

function clearSession() {
  state.authToken = '';
  state.me = null;
  state.dashboard = null;
  state.conversations = [];
  state.selectedConversationId = null;
  sessionStorage.removeItem(sessionTokenKey);
}

async function loadApp() {
  state.loading = true;
  state.error = '';
  render();

  try {
    if (!state.authToken) {
      if (isAppRoute()) {
        window.history.replaceState(null, '', '/login');
      }
      state.loading = false;
      render();
      return;
    }
    state.me = await apiFetch('/api/auth/me');
    if (!isAppRoute()) {
      replaceWithAppRoute(state.activeView);
    }
    await checkHealth();
    await loadDashboard();
    await loadOntology();
    await loadLeaders();
    await loadConversations();
  } catch (error) {
    state.error = error.message || 'Falha ao carregar dados.';
    if (useDemoData) {
      state.dashboard = structuredClone(demoDashboard);
      state.apiOnline = false;
    }
  } finally {
    state.loading = false;
    render();
  }
}

async function checkHealth() {
  try {
    const response = await fetch(apiPath('/health'), {
      headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}
    });
    state.apiOnline = response.ok;
  } catch {
    state.apiOnline = false;
  }
}

async function loadDashboard() {
  const territoryPath = state.selectedTerritoryId
    ? `/api/territorios/${state.selectedTerritoryId}/dashboard`
    : '/api/glimpse/dashboard';
  const dashboard = await apiFetch(territoryPath);
  state.dashboard = dashboard;
  state.selectedTerritoryId = dashboard.territory?.id || state.selectedTerritoryId;
}

async function loadOntology() {
  state.ontology = await apiFetch('/api/ontology/validate');
}

async function loadLeaders() {
  if (!state.me?.workspaceId) {
    state.leaders = [];
    return;
  }
  state.leaders = await apiFetch(`/api/pessoas?workspaceId=${encodeURIComponent(state.me.workspaceId)}`);
}

async function loadConversations() {
  if (!state.me?.workspaceId) {
    state.conversations = [];
    return;
  }
  state.conversations = await apiFetch(`/api/mensagens/conversas?workspaceId=${encodeURIComponent(state.me.workspaceId)}`);
  if (state.selectedConversationId && state.conversations.some((item) => Number(item.id) === Number(state.selectedConversationId))) {
    await loadConversation(state.selectedConversationId);
  } else if (state.conversations.length) {
    state.selectedConversationId = state.conversations[0].id;
    await loadConversation(state.selectedConversationId);
  }
}

async function loadConversation(id) {
  const conversation = await apiFetch(`/api/mensagens/conversas/${id}`);
  state.selectedConversationId = conversation.id;
  const index = state.conversations.findIndex((item) => Number(item.id) === Number(id));
  if (index >= 0) {
    state.conversations[index] = conversation;
  } else {
    state.conversations.unshift(conversation);
  }
}

function render() {
  if (!state.authToken || (!state.me && !state.loading)) {
    app.innerHTML = isAuthRoute() ? renderAuthPage() : renderLandingPage();
    bindForms();
    bindGlobalActions();
    return;
  }

  if (state.authToken && state.me && !isAppRoute()) {
    replaceWithAppRoute(state.activeView);
  }

  if (state.loading && !state.dashboard) {
    app.innerHTML = `<main class="boot-screen"><img src="${logoUrl}" alt="Angico"><p>Carregando território...</p></main>`;
    return;
  }

  if (state.error && !state.dashboard) {
    app.innerHTML = `
      <main class="boot-screen error">
        <img src="${logoUrl}" alt="Angico">
        <h1>Serviço indisponível</h1>
        <p>${html(state.error)}</p>
        <button class="button primary" data-action="reload">Tentar novamente</button>
        <button class="button" data-action="logout">Sair</button>
      </main>
    `;
    bindGlobalActions();
    return;
  }

  const data = state.dashboard;
  app.innerHTML = `
    <main class="app-frame">
      ${renderSidebar(data)}
      <section class="workspace">
        ${renderTopbar(data)}
        <div class="content-shell">
          ${renderActiveView(data)}
        </div>
      </section>
      ${renderDrawer()}
      ${renderModal(data)}
    </main>
  `;

  bindGlobalActions();
  bindForms();
  if (['resumo', 'mapa'].includes(state.activeView)) {
    requestAnimationFrame(() => initMap(data));
  } else if (state.map) {
    state.map.remove();
    state.map = null;
  }
}

function renderLandingPage() {
  return `
    <main class="public-shell">
      <section class="landing-hero">
        <nav class="landing-nav" aria-label="Navegação principal">
          <a class="landing-logo" href="#top" aria-label="Angico">
            <img src="${logoUrl}" alt="Angico">
          </a>
          <div>
            <a href="#como-funciona">Como funciona</a>
            <a href="#liderancas">Lideranças</a>
            <a href="/login" data-route>Entrar</a>
          </div>
        </nav>
        <div class="hero-grid" id="top">
          <section class="hero-copy" aria-labelledby="landing-title">
            <span class="eyebrow">Memória territorial viva</span>
            <h1 id="landing-title">Angico conecta território, evidências e lideranças locais.</h1>
            <p>Uma base segura para registrar observações, transformar problemas em missões, acompanhar impacto e manter a memória coletiva de cada lugar.</p>
            <div class="hero-actions">
              <a class="button primary" href="/login" data-route>Acessar o Core</a>
              <a class="button ghost" href="#como-funciona">Conhecer o Angico</a>
            </div>
          </section>
          <aside class="landing-snapshot" aria-label="Resumo do Angico Core">
            <img src="${logoUrl}" alt="Angico">
            <div>
              <span>Território</span>
              <b>Observações, missões e impacto conectados</b>
            </div>
            <div>
              <span>Rede interna</span>
              <b>Conversas entre lideranças com contexto local</b>
            </div>
            <div>
              <span>Memória</span>
              <b>Ontologia operacional preservada com acesso controlado</b>
            </div>
          </aside>
        </div>
      </section>
      <section class="landing-section" id="como-funciona">
        <div class="section-kicker">Como funciona</div>
        <div class="landing-grid">
          <article>
            <b>Registrar</b>
            <p>Observações, fotos, anexos e localizações entram como memória territorial estruturada.</p>
          </article>
          <article>
            <b>Conectar</b>
            <p>A ontologia relaciona território, problemas, potencialidades, missões, ações e resultados.</p>
          </article>
          <article>
            <b>Coordenar</b>
            <p>Líderes acompanham conversas internas, missões e prioridades sem perder o contexto local.</p>
          </article>
          <article>
            <b>Medir</b>
            <p>Indicadores e relatórios mostram impacto agregado e histórico confiável para cada território.</p>
          </article>
        </div>
      </section>
      <section class="landing-band" id="liderancas">
        <div>
          <span class="eyebrow">Core para lideranças</span>
          <h2>Do primeiro registro ao aprendizado coletivo.</h2>
        </div>
        <p>O Angico foi desenhado para equipes que precisam agir no território com segurança, rastreabilidade e uma linguagem comum entre campo, gestão e impacto.</p>
      </section>
    </main>
  `;
}

function renderAuthPage() {
  const mode = authModeFromRoute();
  return `
    <main class="auth-shell">
      <section class="auth-brand">
        <a class="auth-logo" href="/" data-route aria-label="Angico">
          <img src="${logoUrl}" alt="Angico">
        </a>
        <div>
          <span class="eyebrow">Acesso interno</span>
          <h1>${mode === 'register' ? 'Crie sua identidade Angico.' : 'Entre no Angico Core.'}</h1>
          <p>${mode === 'register'
            ? 'Seu Angico ID conecta perfil, conversas e registros territoriais.'
            : 'Use seu email e senha de líder Angico para acessar o painel interno.'}</p>
        </div>
      </section>
      <section class="auth-card" aria-labelledby="auth-title">
        <div class="auth-switch" role="tablist" aria-label="Autenticação">
          <a class="${mode === 'login' ? 'active' : ''}" href="/login" data-route>Entrar</a>
          <a class="${mode === 'register' ? 'active' : ''}" href="/cadastro" data-route>Criar conta</a>
        </div>
        ${mode === 'register' ? renderRegisterForm() : renderLoginForm()}
      </section>
    </main>
  `;
}

function renderLoginForm() {
  return `
    <form class="login-panel" data-form="login">
      <div>
        <h2 id="auth-title">Entrar</h2>
        <p>Acesso seguro para lideranças cadastradas.</p>
      </div>
      ${state.loginError ? `<span class="inline-error">${html(state.loginError)}</span>` : ''}
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" required></label>
      <button class="button primary" type="submit">Entrar com segurança</button>
      <p class="auth-note">Ainda não tem acesso? <a href="/cadastro" data-route>Crie sua conta</a>.</p>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form class="login-panel" data-form="register">
      <div>
        <h2 id="auth-title">Criar conta</h2>
        <p>Cadastre seu perfil para participar da rede Angico.</p>
      </div>
      ${state.signupError ? `<span class="inline-error">${html(state.signupError)}</span>` : ''}
      ${state.signupMessage ? `<span class="inline-success">${html(state.signupMessage)}</span>` : ''}
      <label class="field"><span>Nome</span><input name="nome" autocomplete="name" required></label>
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="field">
        <span>Angico ID</span>
        <input name="angicoId" data-angico-id-input autocomplete="off" placeholder="@seunome" required>
        <small class="availability" data-angico-id-status></small>
      </label>
      <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="button primary" type="submit">Criar e acessar</button>
      <p class="auth-note">Já tem cadastro? <a href="/login" data-route>Entre aqui</a>.</p>
    </form>
  `;
}

function renderSidebar(data) {
  return `
    <aside class="sidebar">
      <div class="brand">
        <img src="${logoUrl}" alt="Angico">
        <span>Core</span>
      </div>
      <div class="leader-card">
        <b>${html(state.me?.nome || 'Líder')}</b>
        <span>${html(state.me?.papel || 'ANGICO')}</span>
      </div>
      <label class="field compact">
        <span>Território</span>
        <select data-action="select-territory">
          ${(data.territories?.length ? data.territories : [data.territory]).map((territory) => `
            <option value="${territory.id}" ${Number(territory.id) === Number(state.selectedTerritoryId) ? 'selected' : ''}>
              ${html(territory.nome)}
            </option>
          `).join('')}
        </select>
      </label>
      <nav class="nav-list">
        ${navItems.map(([key, label]) => `
          <button class="nav-item ${state.activeView === key ? 'active' : ''}" data-view="${key}">
            <span>${label}</span>
          </button>
        `).join('')}
      </nav>
      <div class="connection ${state.apiOnline ? 'online' : 'offline'}">
        <b>${state.apiOnline ? 'Sessão ativa' : 'Conexão instável'}</b>
        <span>${useDemoData ? 'Dados demonstrativos' : 'Ambiente seguro'}</span>
      </div>
    </aside>
  `;
}

function renderTopbar(data) {
  return `
    <header class="topbar">
      <div class="search-wrap">
        <input class="search-input" placeholder="Buscar cidade, bairro ou local" data-geocode-global>
        <div class="search-results" data-geocode-global-results></div>
      </div>
      <div class="top-actions">
        <button class="button" data-action="open-observation">Nova observação</button>
        <button class="button" data-action="open-mission">Nova missão</button>
        <button class="button" data-action="open-conversation">Nova conversa</button>
        <button class="button primary" data-action="sync">Sincronizar</button>
        <button class="button" data-action="logout">Sair</button>
      </div>
      <div class="territory-chip">
        <b>${html(data.territory?.nome)}</b>
        <span>${html([data.territory?.bairro, data.territory?.cidade].filter(Boolean).join(', '))}</span>
      </div>
    </header>
  `;
}

function renderActiveView(data) {
  switch (state.activeView) {
    case 'home':
      return renderHomeView(data);
    case 'mapa':
      return renderMapView(data, true);
    case 'observacoes':
      return renderListView('Observações', data.observacoes, renderObservationRow, 'open-observation');
    case 'problemas':
      return renderListView('Problemas', data.problemas, renderProblemRow);
    case 'potencialidades':
      return renderListView('Potencialidades', data.potencialidades, renderPotentialRow);
    case 'missoes':
      return renderListView('Missões', data.missoes, renderMissionRow, 'open-mission');
    case 'acoes':
      return renderListView('Ações', data.acoes, renderActionRow);
    case 'liderancas':
      return renderLeadersView(data);
    case 'mensagens':
      return renderMessagesView();
    case 'memoria':
      return renderMemoryView(data);
    case 'relatorios':
      return renderReportsView(data);
    default:
      return renderSummaryView(data);
  }
}

function renderHomeView(data) {
  const recentMessages = data.mensagensRecentes || [];
  return `
    <section class="page-head">
      <div>
        <h1>Home operacional</h1>
        <p>${html(state.me?.nome)} em ${html(data.territory?.nome)}</p>
      </div>
      ${state.error ? `<span class="inline-error">${html(state.error)}</span>` : ''}
    </section>
    <section class="stat-grid">
      ${(data.stats || []).map((stat) => `
        <article class="stat-card">
          <span>${html(stat.label)}</span>
          <b>${html(stat.value)}</b>
        </article>
      `).join('')}
    </section>
    <section class="home-grid">
      <article class="panel">
        <div class="section-toolbar">
          <div>
            <h2>Mensagens internas</h2>
            <p>${recentMessages.length} mensagens recentes</p>
          </div>
          <button class="button small" data-view="mensagens">Abrir</button>
        </div>
        <div class="message-preview-list">
          ${recentMessages.length ? recentMessages.map((message) => `
            <div class="message-preview">
              <b>${html(message.senderNome || 'Líder')}</b>
              <span>${html(message.corpo || (message.hasLocation ? 'Localização compartilhada' : 'Anexo enviado'))}</span>
              <small>${formatDate(message.createdAt)}</small>
            </div>
          `).join('') : renderEmptyState('Nenhuma mensagem recente.')}
        </div>
      </article>
      <article class="panel">
        <div class="section-toolbar">
          <div>
            <h2>Ontologia</h2>
            <p>${state.ontology?.valid ? 'Base operacional sincronizada' : 'Aguardando validação'}</p>
          </div>
          <span class="status-pill ${state.ontology?.valid ? 'ok' : 'warn'}">${state.ontology?.valid ? 'Válida' : 'Pendente'}</span>
        </div>
        <p class="panel-note">Operando nos fluxos ativos.</p>
      </article>
      ${renderRecentTimeline(data.timeline)}
      ${renderReportsView(data, true)}
    </section>
  `;
}

function renderSummaryView(data) {
  return `
    <section class="page-head">
      <div>
        <h1>Resumo do Território</h1>
        <p>${html(data.territory?.tipo)} em ${html(data.territory?.cidade || data.territory?.pais)}</p>
      </div>
      ${state.error ? `<span class="inline-error">${html(state.error)}</span>` : ''}
    </section>
    <section class="stat-grid">
      ${(data.stats || []).map((stat) => `
        <article class="stat-card">
          <span>${html(stat.label)}</span>
          <b>${html(stat.value)}</b>
        </article>
      `).join('')}
    </section>
    ${renderMapView(data, false)}
    <section class="split-grid">
      ${renderRecentTimeline(data.timeline)}
      ${renderReportsView(data, true)}
    </section>
  `;
}

function renderMapView(data, full) {
  return `
    <section class="map-card ${full ? 'full-map' : ''}">
      <div class="section-toolbar">
        <div>
          <h2>Mapa operacional</h2>
          <p>${html(filteredMarkers(data).length)} objetos georreferenciados</p>
        </div>
        <div class="filters">
          <select data-action="filter-type">
            ${['TODOS', 'OBSERVACAO', 'PROBLEMA', 'POTENCIALIDADE', 'MISSAO', 'ACAO'].map((type) => `
              <option value="${type}" ${state.filterType === type ? 'selected' : ''}>${typeLabel(type)}</option>
            `).join('')}
          </select>
          <select data-action="filter-status">
            ${['TODOS', 'SUBMETIDA', 'VALIDADA', 'IDENTIFICADO', 'PRIORIZADO', 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'].map((status) => `
              <option value="${status}" ${state.filterStatus === status ? 'selected' : ''}>${statusLabel(status)}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div id="territory-map" class="territory-map"></div>
      <div class="legend-row">
        ${['OBSERVACAO', 'PROBLEMA', 'POTENCIALIDADE', 'MISSAO', 'ACAO'].map((type) => `
          <span><i class="dot ${type.toLowerCase()}"></i>${typeLabel(type)}</span>
        `).join('')}
      </div>
    </section>
  `;
}

function renderListView(title, rows = [], renderer, action) {
  return `
    <section class="page-head">
      <div>
        <h1>${html(title)}</h1>
        <p>${rows.length} registros</p>
      </div>
      ${action ? `<button class="button primary" data-action="${action}">Novo registro</button>` : ''}
    </section>
    <section class="list-panel">
      ${rows.length ? rows.map(renderer).join('') : renderEmptyState('Nenhum registro encontrado.')}
    </section>
  `;
}

function renderObservationRow(item) {
  return `
    <article class="record-row" data-detail-type="OBSERVACAO" data-detail-id="${item.id}">
      <span class="type-badge observacao">OBS</span>
      <div>
        <b>${html(item.titulo)}</b>
        <p>${html(item.descricao || item.evidenciaInicial || '')}</p>
      </div>
      <span>${html(item.categoria)}</span>
      <strong>${html(statusLabel(item.status))}</strong>
    </article>
  `;
}

function renderProblemRow(item) {
  return `
    <article class="record-row" data-detail-type="PROBLEMA" data-detail-id="${item.id}">
      <span class="type-badge problema">PROB</span>
      <div>
        <b>${html(item.titulo)}</b>
        <p>${html(item.descricao || '')}</p>
      </div>
      <span>${html(priorityLabel(item.prioridade))}</span>
      <button class="button small" data-action="prioritize-problem" data-id="${item.id}">Priorizar</button>
    </article>
  `;
}

function renderPotentialRow(item) {
  return `
    <article class="record-row" data-detail-type="POTENCIALIDADE" data-detail-id="${item.id}">
      <span class="type-badge potencialidade">POT</span>
      <div>
        <b>${html(item.titulo)}</b>
        <p>${html(item.descricao || '')}</p>
      </div>
      <span>${html(item.categoria)}</span>
      <strong>${html(statusLabel(item.status))}</strong>
    </article>
  `;
}

function renderMissionRow(item) {
  return `
    <article class="record-row" data-detail-type="MISSAO" data-detail-id="${item.id}">
      <span class="type-badge missao">MIS</span>
      <div>
        <b>${html(item.titulo)}</b>
        <p>${html(item.descricao || '')}</p>
        <div class="progress"><i style="width:${Number(item.progresso || 0)}%"></i></div>
      </div>
      <span>${html(statusLabel(item.status))}</span>
      <div class="row-actions">
        <button class="button small" data-action="start-mission" data-id="${item.id}">Iniciar</button>
        <button class="button small" data-action="complete-mission" data-id="${item.id}">Concluir</button>
      </div>
    </article>
  `;
}

function renderActionRow(item) {
  return `
    <article class="record-row" data-detail-type="ACAO" data-detail-id="${item.id}">
      <span class="type-badge acao">AÇÃO</span>
      <div>
        <b>${html(item.titulo)}</b>
        <p>${html(item.resultadoDescricao || item.descricao || '')}</p>
      </div>
      <span>${html(statusLabel(item.status))}</span>
      <button class="button small" data-action="complete-action" data-id="${item.id}">Concluir</button>
    </article>
  `;
}

function renderLeadersView(data) {
  const query = state.leaderQuery.trim().replace(/^@/, '').toLowerCase();
  const leaders = state.leaders.filter((leader) => {
    if (!query) {
      return true;
    }
    return [leader.nome, leader.papel, leader.email, leader.angicoId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const currentIdentity = state.me?.angicoId ? `@${state.me.angicoId}` : 'Defina seu Angico ID';
  return `
    <section class="leaders-hero">
      <div>
        <span class="eyebrow">Rede interna</span>
        <h1>Lideranças Angico</h1>
        <p>Identidade, contato e presença dos líderes conectados ao território ${html(data.territory?.nome)}.</p>
      </div>
      <div class="leaders-identity-card">
        <span>Seu Angico ID</span>
        <b>${html(currentIdentity)}</b>
        <small>${html(state.me?.email || '')}</small>
      </div>
    </section>
    <section class="leaders-grid">
      <article class="leader-profile-panel">
        <div>
          <span class="leader-avatar">${html(initials(state.me?.nome || 'Líder'))}</span>
          <h2>${html(state.me?.nome || 'Líder Angico')}</h2>
          <p>${html(state.me?.papel || 'ANGICO')}</p>
        </div>
        <form class="angico-id-form" data-form="angico-id">
          ${state.leaderError ? `<span class="inline-error">${html(state.leaderError)}</span>` : ''}
          <label class="field">
            <span>Angico ID</span>
            <input name="angicoId" value="${html(state.me?.angicoId ? `@${state.me.angicoId}` : '')}" placeholder="@seunome" autocomplete="off">
          </label>
          <button class="button primary" type="submit">Salvar identidade</button>
        </form>
      </article>
      <article class="leaders-directory">
        <div class="section-toolbar">
          <div>
            <h2>Diretório de líderes</h2>
            <p>${leaders.length} de ${state.leaders.length} líderes</p>
          </div>
          <input class="leader-search" data-leader-search placeholder="Buscar por nome, @id ou email" value="${html(state.leaderQuery)}">
        </div>
        <div class="leader-card-grid">
          ${leaders.map((leader) => `
            <article class="leader-tile">
              <span class="leader-avatar">${html(initials(leader.nome))}</span>
              <div>
                <b>${html(leader.nome)}</b>
                <p>${html(leader.papel || 'Líder')}</p>
              </div>
              <div class="leader-identities">
                <span>${html(leader.angicoId ? `@${leader.angicoId}` : 'sem Angico ID')}</span>
                <small>${html(leader.email || '')}</small>
              </div>
              <button class="button small" data-action="start-conversation-with" data-identity="${html(leader.angicoId ? `@${leader.angicoId}` : leader.email)}">Mensagem</button>
            </article>
          `).join('') || renderEmptyState('Nenhuma liderança encontrada.')}
        </div>
      </article>
    </section>
  `;
}

function renderMessagesView() {
  const active = activeConversation();
  return `
    <section class="page-head">
      <div>
        <h1>Mensagens internas</h1>
        <p>${state.conversations.length} conversas no workspace</p>
      </div>
      <button class="button primary" data-action="open-conversation">Nova conversa</button>
    </section>
    <section class="message-layout">
      <aside class="thread-list">
        ${state.conversations.length ? state.conversations.map((conversation) => `
          <button class="${Number(conversation.id) === Number(state.selectedConversationId) ? 'active' : ''}" data-conversation-id="${conversation.id}">
            <b>${html(conversation.titulo)}</b>
            <span>${formatDate(conversation.updatedAt)}</span>
          </button>
        `).join('') : renderEmptyState('Crie uma conversa para líderes Angico.')}
      </aside>
      <article class="chat-panel">
        ${active ? renderConversation(active) : renderEmptyState('Selecione uma conversa.')}
      </article>
    </section>
  `;
}

function renderConversation(conversation) {
  const messages = conversation.mensagens || [];
  return `
    <div class="chat-head">
      <div>
        <h2>${html(conversation.titulo)}</h2>
        <p>Território ${html(conversation.territorioId)}</p>
      </div>
      <span class="status-pill ok">${html(statusLabel(conversation.status))}</span>
    </div>
    <div class="message-stream">
      ${messages.length ? messages.map(renderMessageBubble).join('') : renderEmptyState('Nenhuma mensagem nesta conversa.')}
    </div>
    ${renderMessageComposer(conversation)}
  `;
}

function renderMessageBubble(message) {
  const mine = Number(message.senderPessoaId) === Number(state.me?.pessoaId);
  return `
    <div class="message-bubble ${mine ? 'mine' : ''}">
      <div class="message-meta">
        <b>${html(message.senderNome || 'Líder')}</b>
        <span>${formatDate(message.createdAt)}</span>
      </div>
      ${message.corpo ? `<p>${html(message.corpo)}</p>` : ''}
      ${message.latitude != null && message.longitude != null ? `
        <a class="location-link" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(message.latitude)}&mlon=${encodeURIComponent(message.longitude)}#map=17/${encodeURIComponent(message.latitude)}/${encodeURIComponent(message.longitude)}" target="_blank" rel="noreferrer">
          ${html(message.localDescricao || 'Localização compartilhada')} (${html(message.latitude)}, ${html(message.longitude)})
        </a>
      ` : ''}
      ${(message.anexos || []).length ? `
        <div class="attachment-list">
          ${message.anexos.map((anexo) => `
            <button class="attachment-pill" data-action="download-attachment" data-id="${anexo.id}">
              ${html(anexo.attachmentType)} · ${html(anexo.originalFilename)}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderMessageComposer(conversation) {
  return `
    <form class="message-composer" data-form="message" data-conversa-id="${conversation.id}">
      <textarea name="corpo" rows="3" placeholder="Mensagem para os líderes"></textarea>
      <div class="composer-grid">
        <label class="field">
          <span>Objeto mencionado</span>
          <select name="linkedEntityType">
            <option value="">Nenhum</option>
            ${linkableTypes.map((type) => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>ID do objeto</span>
          <input name="linkedEntityId" inputmode="numeric">
        </label>
        <label class="field wide">
          <span>Anexos pequenos</span>
          <input name="attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,text/plain">
        </label>
      </div>
      ${state.messageLocation ? `
        <div class="selected-location">
          <span>${html(state.messageLocation.localDescricao || 'Minha localização')}</span>
          <b>${html(state.messageLocation.latitude)}, ${html(state.messageLocation.longitude)}</b>
          <button type="button" class="button small" data-action="clear-message-location">Remover</button>
        </div>
      ` : ''}
      <div class="composer-actions">
        <button type="button" class="button" data-action="use-message-location">Minha localização</button>
        <button class="button primary" type="submit">Enviar</button>
      </div>
    </form>
  `;
}

function renderMemoryView(data) {
  const nodes = data.graph?.nodes || [];
  const relations = data.graph?.relations || [];
  return `
    <section class="page-head">
      <div>
        <h1>Memória do Território</h1>
        <p>${(data.timeline || []).length} eventos registrados</p>
      </div>
    </section>
    <section class="memory-grid">
      ${renderRecentTimeline(data.timeline)}
      <article class="panel">
        <div class="section-toolbar">
          <h2>Grafo ontológico</h2>
        </div>
        ${nodes.length && relations.length ? `
          <div class="graph-list">
            ${nodes.map((node) => `
              <div class="graph-node">
                <span class="node-icon">${icon(node.entityType)}</span>
                <div><b>${html(node.name)}</b><small>${html(node.entityType)}:${html(node.entityId)}</small></div>
              </div>
            `).join('')}
          </div>
          <div class="relation-list">
            ${relations.map((relation) => `
              <div>${html(relation.from)} <b>${html(relation.relationType)}</b> ${html(relation.to)}</div>
            `).join('')}
          </div>
        ` : renderEmptyState('Grafo disponível apenas em visualização autorizada.')}
      </article>
    </section>
  `;
}

function renderRecentTimeline(timeline = []) {
  const rows = [...timeline].reverse().slice(0, 12);
  return `
    <article class="panel">
      <div class="section-toolbar">
        <h2>Timeline</h2>
        <p>${timeline.length} eventos</p>
      </div>
      <div class="timeline">
        ${rows.length ? rows.map((event) => `
          <div class="timeline-item">
            <span>${html(event.eventType)}</span>
            <b>${html(event.entityType)}:${html(event.entityId)}</b>
            <small>${formatDate(event.occurredAt)} · v${html(event.entityVersion)}</small>
          </div>
        `).join('') : renderEmptyState('Nenhum evento registrado.')}
      </div>
    </article>
  `;
}

function renderReportsView(data, compact = false) {
  const categories = data.categoryDistribution || [];
  const impact = data.impact || [];
  return `
    <article class="panel ${compact ? '' : 'wide-panel'}">
      <div class="section-toolbar">
        <h2>Relatórios</h2>
        <p>Baseado em eventos e medições</p>
      </div>
      <div class="report-grid">
        <div>
          <h3>Impacto agregado</h3>
          ${impact.length ? impact.map((item) => `
            <div class="metric-line"><b>${html(item.value)}</b><span>${html(item.label)}</span><small>${html(item.period)}</small></div>
          `).join('') : renderEmptyState('Sem medições registradas.')}
        </div>
        <div>
          <h3>Categorias</h3>
          ${categories.length ? categories.map((item) => `
            <div class="metric-line"><b>${html(item.value)}</b><span>${html(item.name)}</span></div>
          `).join('') : renderEmptyState('Sem problemas categorizados.')}
        </div>
      </div>
    </article>
  `;
}

function renderDrawer() {
  if (!state.drawer) {
    return '';
  }
  const item = state.drawer;
  return `
    <aside class="drawer">
      <button class="icon-button close" data-action="close-drawer">x</button>
      <span class="type-badge ${item.type?.toLowerCase()}">${html(typeLabel(item.type))}</span>
      <h2>${html(item.title || item.titulo || item.name)}</h2>
      <dl>
        <div><dt>Status</dt><dd>${html(statusLabel(item.status))}</dd></div>
        <div><dt>Prioridade</dt><dd>${html(priorityLabel(item.priority || item.prioridade || '-'))}</dd></div>
        <div><dt>Atualizado</dt><dd>${formatDate(item.updatedAt)}</dd></div>
        <div><dt>Coordenadas</dt><dd>${html(item.latitude)}, ${html(item.longitude)}</dd></div>
      </dl>
    </aside>
  `;
}

function renderModal(data) {
  if (state.modal === 'observation') {
    return renderObservationModal(data);
  }
  if (state.modal === 'mission') {
    return renderMissionModal(data);
  }
  if (state.modal === 'conversation') {
    return renderConversationModal(data);
  }
  return '';
}

function renderObservationModal(data) {
  const lat = state.pendingLatLng?.lat || data.territory?.latitude || '';
  const lng = state.pendingLatLng?.lng || data.territory?.longitude || '';
  return `
    <div class="modal-backdrop">
      <form class="modal" data-form="observation">
        <button type="button" class="icon-button close" data-action="close-modal">x</button>
        <h2>Nova Observação</h2>
        <div class="form-grid">
          <label class="field"><span>Título</span><input name="titulo" required></label>
          <label class="field"><span>Categoria</span><select name="categoria">${observationCategories.map((item) => `<option>${html(item)}</option>`).join('')}</select></label>
          <label class="field"><span>Tipo</span><select name="tipo"><option value="PROBLEMA">Problema</option><option value="POTENCIALIDADE">Potencialidade</option></select></label>
          <label class="field"><span>Status inicial</span><select name="status"><option value="SUBMETIDA">Submetida</option><option value="RASCUNHO">Rascunho</option></select></label>
          <label class="field"><span>Severidade</span><input name="severidade" type="number" min="1" max="5" value="3"></label>
          <label class="field"><span>Território</span><select name="territorioId">${(data.territories?.length ? data.territories : [data.territory]).map((territory) => `<option value="${territory.id}" ${territory.id === data.territory.id ? 'selected' : ''}>${html(territory.nome)}</option>`).join('')}</select></label>
          <label class="field wide"><span>Descrição</span><textarea name="descricao" rows="3"></textarea></label>
          <label class="field wide"><span>Evidência textual inicial</span><textarea name="evidenciaInicial" rows="2"></textarea></label>
          <label class="field wide geocode-field">
            <span>Cidade, bairro ou local</span>
            <input name="localDescricao" data-geocode-modal autocomplete="off">
            <div class="search-results in-form" data-geocode-modal-results></div>
          </label>
          <label class="field"><span>Cidade</span><input name="cidade" value="${html(data.territory?.cidade || '')}"></label>
          <label class="field"><span>Bairro</span><input name="bairro" value="${html(data.territory?.bairro || '')}"></label>
          <label class="field"><span>Latitude</span><input name="latitude" type="number" step="any" value="${html(lat)}" required></label>
          <label class="field"><span>Longitude</span><input name="longitude" type="number" step="any" value="${html(lng)}" required></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button" data-action="close-modal">Cancelar</button>
          <button class="button primary" type="submit">Salvar observação</button>
        </div>
      </form>
    </div>
  `;
}

function renderMissionModal(data) {
  const problems = data.problemas || [];
  return `
    <div class="modal-backdrop">
      <form class="modal" data-form="mission">
        <button type="button" class="icon-button close" data-action="close-modal">x</button>
        <h2>Nova Missão</h2>
        <div class="form-grid">
          <label class="field wide"><span>Título</span><input name="titulo" required></label>
          <label class="field wide"><span>Descrição</span><textarea name="descricao" rows="3"></textarea></label>
          <label class="field"><span>Problema</span><select name="problemaId">${problems.map((problem) => `<option value="${problem.id}">${html(problem.titulo)}</option>`).join('')}</select></label>
          <label class="field"><span>Prioridade</span><select name="prioridade"><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="BAIXA">Baixa</option></select></label>
          <label class="field"><span>Latitude</span><input name="latitude" type="number" step="any" value="${html(data.territory?.latitude || '')}"></label>
          <label class="field"><span>Longitude</span><input name="longitude" type="number" step="any" value="${html(data.territory?.longitude || '')}"></label>
          <label class="field wide"><span>Organização mobilizada</span><input name="organizacaoId"></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button" data-action="close-modal">Cancelar</button>
          <button class="button primary" type="submit" ${problems.length ? '' : 'disabled'}>Criar missão</button>
        </div>
      </form>
    </div>
  `;
}

function renderConversationModal(data) {
  const leaders = state.leaders.filter((leader) => Number(leader.id) !== Number(state.me?.pessoaId));
  return `
    <div class="modal-backdrop">
      <form class="modal compact-modal" data-form="conversation">
        <button type="button" class="icon-button close" data-action="close-modal">x</button>
        <h2>Nova conversa</h2>
        ${state.modalError ? `<span class="inline-error">${html(state.modalError)}</span>` : ''}
        <div class="form-grid">
          <label class="field wide"><span>Título</span><input name="titulo" required></label>
          <label class="field"><span>Território</span><select name="territorioId">${(data.territories?.length ? data.territories : [data.territory]).map((territory) => `<option value="${territory.id}" ${territory.id === data.territory.id ? 'selected' : ''}>${html(territory.nome)}</option>`).join('')}</select></label>
          <label class="field"><span>Buscar líder</span><input name="participanteRefs" list="leader-identity-options" placeholder="@campo ou campo@angico.local" autocomplete="off"></label>
          <datalist id="leader-identity-options">
            ${leaders.flatMap((leader) => [
              leader.angicoId ? `<option value="@${html(leader.angicoId)}">${html(leader.nome)}</option>` : '',
              leader.email ? `<option value="${html(leader.email)}">${html(leader.nome)}</option>` : ''
            ]).join('')}
          </datalist>
          <label class="field wide"><span>Seleção rápida</span><select name="participanteIds" multiple size="5">${leaders.map((leader) => `<option value="${leader.id}">${html(leader.angicoId ? `@${leader.angicoId}` : leader.email)} · ${html(leader.nome)}</option>`).join('')}</select></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button" data-action="close-modal">Cancelar</button>
          <button class="button primary" type="submit">Criar conversa</button>
        </div>
      </form>
    </div>
  `;
}

function renderEmptyState(message) {
  return `<div class="empty-state">${html(message)}</div>`;
}

function activeConversation() {
  return state.conversations.find((conversation) => Number(conversation.id) === Number(state.selectedConversationId));
}

function filteredMarkers(data) {
  return (data.markers || []).filter((marker) => {
    const typeMatches = state.filterType === 'TODOS' || marker.type === state.filterType;
    const statusMatches = state.filterStatus === 'TODOS' || marker.status === state.filterStatus;
    return typeMatches && statusMatches && marker.latitude != null && marker.longitude != null;
  });
}

function initMap(data) {
  const mapElement = document.querySelector('#territory-map');
  if (!mapElement) {
    return;
  }
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  const center = [
    Number(data.territory?.latitude || -15.78),
    Number(data.territory?.longitude || -47.93)
  ];
  state.map = L.map(mapElement, { zoomControl: true }).setView(center, 14);
  L.tileLayer(tileUrl, {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  filteredMarkers(data).forEach((marker) => {
    const leafletMarker = L.marker([marker.latitude, marker.longitude], {
      icon: L.divIcon({
        className: `angico-map-marker ${marker.type.toLowerCase()}`,
        html: `<span>${icon(marker.type)}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    });
    leafletMarker.addTo(state.map);
    leafletMarker.bindPopup(`<b>${html(marker.title)}</b><br>${html(typeLabel(marker.type))} · ${html(statusLabel(marker.status))}`);
    leafletMarker.on('click', () => {
      state.drawer = marker;
      render();
    });
  });

  state.map.on('click', (event) => {
    state.pendingLatLng = {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6))
    };
    state.modal = 'observation';
    render();
  });
}

function bindGlobalActions() {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(link.getAttribute('href'));
    });
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.activeView = button.dataset.view;
      window.history.replaceState(null, '', `/app#${state.activeView}`);
      if (state.activeView === 'mensagens') {
        await loadConversations();
      }
      render();
    });
  });

  document.querySelector('[data-action="reload"]')?.addEventListener('click', loadApp);
  document.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    if (state.authToken) {
      apiFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({})
      }).catch(() => {});
    }
    clearSession();
    state.loginError = '';
    state.error = '';
    window.history.replaceState(null, '', '/login');
    render();
  });
  document.querySelector('[data-action="sync"]')?.addEventListener('click', async () => {
    await loadDashboard();
    await loadOntology();
    await loadConversations();
    await checkHealth();
    render();
  });
  document.querySelector('[data-action="open-observation"]')?.addEventListener('click', () => {
    state.pendingLatLng = null;
    state.modal = 'observation';
    render();
  });
  document.querySelector('[data-action="open-mission"]')?.addEventListener('click', () => {
    state.modal = 'mission';
    render();
  });
  document.querySelector('[data-action="open-conversation"]')?.addEventListener('click', () => {
    state.modal = 'conversation';
    state.modalError = '';
    render();
  });
  document.querySelectorAll('[data-action="close-modal"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.modal = null;
      state.modalError = '';
      state.pendingLatLng = null;
      render();
    });
  });
  document.querySelector('[data-action="close-drawer"]')?.addEventListener('click', () => {
    state.drawer = null;
    render();
  });
  document.querySelector('[data-action="select-territory"]')?.addEventListener('change', async (event) => {
    state.selectedTerritoryId = Number(event.target.value);
    await loadDashboard();
    render();
  });
  document.querySelector('[data-action="filter-type"]')?.addEventListener('change', (event) => {
    state.filterType = event.target.value;
    render();
  });
  document.querySelector('[data-action="filter-status"]')?.addEventListener('change', (event) => {
    state.filterStatus = event.target.value;
    render();
  });
  document.querySelectorAll('[data-conversation-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await loadConversation(button.dataset.conversationId);
      state.activeView = 'mensagens';
      render();
    });
  });
  document.querySelector('[data-leader-search]')?.addEventListener('input', (event) => {
    state.leaderQuery = event.target.value;
    render();
  });
  document.querySelectorAll('[data-action="start-conversation-with"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.modal = 'conversation';
      state.modalError = '';
      render();
      const input = document.querySelector('[name="participanteRefs"]');
      if (input) {
        input.value = button.dataset.identity || '';
      }
    });
  });
  document.querySelector('[data-action="use-message-location"]')?.addEventListener('click', useMessageLocation);
  document.querySelector('[data-action="clear-message-location"]')?.addEventListener('click', () => {
    state.messageLocation = null;
    render();
  });
  document.querySelectorAll('[data-action="download-attachment"]').forEach((button) => {
    button.addEventListener('click', () => downloadAttachment(button.dataset.id));
  });

  document.querySelectorAll('[data-action="prioritize-problem"]').forEach((button) => {
    button.addEventListener('click', () => updateProblemPriority(button.dataset.id));
  });
  document.querySelectorAll('[data-action="start-mission"]').forEach((button) => {
    button.addEventListener('click', () => updateMission(button.dataset.id, 'iniciar'));
  });
  document.querySelectorAll('[data-action="complete-mission"]').forEach((button) => {
    button.addEventListener('click', () => updateMission(button.dataset.id, 'concluir'));
  });
  document.querySelectorAll('[data-action="complete-action"]').forEach((button) => {
    button.addEventListener('click', () => completeAction(button.dataset.id));
  });

  bindGeocoding('[data-geocode-global]', '[data-geocode-global-results]', true);
  bindGeocoding('[data-geocode-modal]', '[data-geocode-modal-results]', false);
}

function bindForms() {
  document.querySelector('[data-form="login"]')?.addEventListener('submit', submitLogin);
  document.querySelector('[data-form="register"]')?.addEventListener('submit', submitRegister);
  bindAngicoIdAvailability();
  document.querySelector('[data-form="observation"]')?.addEventListener('submit', submitObservation);
  document.querySelector('[data-form="mission"]')?.addEventListener('submit', submitMission);
  document.querySelector('[data-form="conversation"]')?.addEventListener('submit', submitConversation);
  document.querySelector('[data-form="message"]')?.addEventListener('submit', submitMessage);
  document.querySelector('[data-form="angico-id"]')?.addEventListener('submit', submitAngicoId);
}

function bindAngicoIdAvailability() {
  const input = document.querySelector('[data-angico-id-input]');
  const status = document.querySelector('[data-angico-id-status]');
  if (!input || !status) {
    return;
  }
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    status.textContent = '';
    timer = setTimeout(async () => {
      const value = input.value.trim();
      if (value.replace(/^@/, '').length < 3) {
        return;
      }
      try {
        const response = await apiFetch(`/api/auth/angico-id/available?angicoId=${encodeURIComponent(value)}`);
        status.textContent = response.message;
        status.className = `availability ${response.available ? 'ok' : 'warn'}`;
      } catch (error) {
        status.textContent = error.message || 'Não foi possível validar o Angico ID.';
        status.className = 'availability warn';
      }
    }, 350);
  });
}

function bindGeocoding(inputSelector, resultsSelector, moveMap) {
  const input = document.querySelector(inputSelector);
  const results = document.querySelector(resultsSelector);
  if (!input || !results) {
    return;
  }
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const query = input.value.trim();
      if (query.length < 3) {
        results.innerHTML = '';
        return;
      }
      try {
        const response = await apiFetch(`/api/geocoding/search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(defaultCountry)}`);
        if (response.error) {
          results.innerHTML = `<div class="search-error">${html(response.error)}</div>`;
          return;
        }
        if (!(response.results || []).length) {
          results.innerHTML = '<div class="search-error">Nenhum resultado encontrado.</div>';
          return;
        }
        results.innerHTML = response.results.map((item, index) => `
          <button type="button" data-geocode-result="${index}">
            <b>${html(item.neighborhood || item.city || item.displayName)}</b>
            <span>${html(item.displayName)}</span>
          </button>
        `).join('');
        results.querySelectorAll('[data-geocode-result]').forEach((button) => {
          button.addEventListener('click', () => {
            const item = response.results[Number(button.dataset.geocodeResult)];
            input.value = item.displayName;
            results.innerHTML = '';
            if (moveMap && state.map && item.latitude != null && item.longitude != null) {
              state.map.setView([item.latitude, item.longitude], 15);
            }
            const form = input.closest('form');
            if (form) {
              form.elements.localDescricao.value = item.displayName || '';
              form.elements.cidade.value = item.city || '';
              form.elements.bairro.value = item.neighborhood || '';
              if (item.latitude != null && item.longitude != null) {
                form.elements.latitude.value = item.latitude;
                form.elements.longitude.value = item.longitude;
              }
            }
          });
        });
      } catch (error) {
        results.innerHTML = `<div class="search-error">${html(error.message)}</div>`;
      }
    }, 450);
  });
}

async function submitLogin(event) {
  event.preventDefault();
  state.loginError = '';
  const payload = formPayload(event.currentTarget);
  try {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    saveSession(response.token);
    state.me = response;
    state.loginError = '';
    replaceWithAppRoute('home');
    await loadApp();
  } catch (error) {
    state.loginError = friendlyLoginError(error);
    render();
  }
}

async function submitRegister(event) {
  event.preventDefault();
  state.signupError = '';
  state.signupMessage = '';
  const payload = formPayload(event.currentTarget);
  try {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    saveSession(response.token);
    state.me = response;
    replaceWithAppRoute('home');
    await loadApp();
  } catch (error) {
    state.signupError = friendlyLoginError(error);
    render();
  }
}

async function submitObservation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formPayload(form);
  payload.territorioId = Number(payload.territorioId);
  payload.severidade = Number(payload.severidade);
  payload.latitude = Number(payload.latitude);
  payload.longitude = Number(payload.longitude);
  payload.actorId = String(state.me?.pessoaId || '');
  await apiFetch('/api/observacoes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  state.modal = null;
  state.pendingLatLng = null;
  await loadDashboard();
  state.activeView = 'observacoes';
  render();
}

async function submitMission(event) {
  event.preventDefault();
  const payload = formPayload(event.currentTarget);
  payload.territorioId = Number(state.dashboard.territory.id);
  payload.problemaId = Number(payload.problemaId);
  payload.latitude = payload.latitude ? Number(payload.latitude) : null;
  payload.longitude = payload.longitude ? Number(payload.longitude) : null;
  payload.actorId = String(state.me?.pessoaId || '');
  await apiFetch('/api/missoes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  state.modal = null;
  await loadDashboard();
  state.activeView = 'missoes';
  render();
}

async function submitAngicoId(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const angicoId = form.elements.angicoId.value.trim();
  try {
    const updated = await apiFetch('/api/pessoas/me/angico-id', {
      method: 'PATCH',
      body: JSON.stringify({ angicoId })
    });
    state.me = {
      ...state.me,
      angicoId: updated.angicoId
    };
    state.leaderError = '';
    await loadLeaders();
    render();
  } catch (error) {
    state.leaderError = error.message || 'Não foi possível salvar o Angico ID.';
    render();
  }
}

async function submitConversation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const participanteIds = [...form.elements.participanteIds.selectedOptions].map((option) => Number(option.value));
  const participanteRefs = String(formData.get('participanteRefs') || '')
    .split(/[,\s;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const payload = {
    workspaceId: state.me.workspaceId,
    territorioId: Number(formData.get('territorioId')),
    titulo: formData.get('titulo'),
    participanteIds,
    participanteRefs
  };
  try {
    const conversation = await apiFetch('/api/mensagens/conversas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.modal = null;
    state.modalError = '';
    state.activeView = 'mensagens';
    window.history.replaceState(null, '', '/app#mensagens');
    state.selectedConversationId = conversation.id;
    await loadConversations();
    render();
  } catch (error) {
    state.modalError = error.message || 'Não foi possível criar a conversa.';
    render();
  }
}

async function submitMessage(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = new FormData();
  const corpo = form.elements.corpo.value.trim();
  const linkedEntityType = form.elements.linkedEntityType.value;
  const linkedEntityId = form.elements.linkedEntityId.value.trim();
  if (corpo) {
    payload.append('corpo', corpo);
  }
  if (linkedEntityType && linkedEntityId) {
    payload.append('linkedEntityType', linkedEntityType);
    payload.append('linkedEntityId', linkedEntityId);
  }
  if (state.messageLocation) {
    payload.append('latitude', state.messageLocation.latitude);
    payload.append('longitude', state.messageLocation.longitude);
    payload.append('localDescricao', state.messageLocation.localDescricao || 'Minha localização');
  }
  [...form.elements.attachments.files].forEach((file) => {
    payload.append('attachments', file);
  });
  await apiFetch(`/api/mensagens/conversas/${form.dataset.conversaId}/mensagens`, {
    method: 'POST',
    body: payload
  });
  state.messageLocation = null;
  await loadConversation(form.dataset.conversaId);
  await loadDashboard();
  render();
}

async function updateProblemPriority(id) {
  await apiFetch(`/api/problemas/${id}/priorizar`, {
    method: 'PATCH',
    body: JSON.stringify({ prioridade: 'ALTA', actorId: String(state.me?.pessoaId || '') })
  });
  await loadDashboard();
  render();
}

async function updateMission(id, action) {
  await apiFetch(`/api/missoes/${id}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify({ actorId: String(state.me?.pessoaId || '') })
  });
  await loadDashboard();
  render();
}

async function completeAction(id) {
  await apiFetch(`/api/acoes/${id}/concluir`, {
    method: 'PATCH',
    body: JSON.stringify({
      resultadoDescricao: 'Resultado informado pelo painel web.',
      actorId: String(state.me?.pessoaId || '')
    })
  });
  await loadDashboard();
  render();
}

function useMessageLocation() {
  if (!navigator.geolocation) {
    state.error = 'Geolocalização não disponível neste navegador.';
    render();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.messageLocation = {
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
        localDescricao: 'Minha localização'
      };
      render();
    },
    () => {
      state.error = 'Não foi possível obter a localização local.';
      render();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

async function downloadAttachment(id) {
  const response = await fetch(apiPath(`/api/mensagens/anexos/${id}`), {
    headers: { Authorization: `Bearer ${state.authToken}` }
  });
  if (!response.ok) {
    state.error = await responseMessage(response);
    render();
    return;
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || `anexo-${id}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function initials(name) {
  const parts = String(name || 'Líder')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((part) => part[0]).join('') || 'L').toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

window.addEventListener('hashchange', async () => {
  const nextView = viewFromHash();
  if (nextView === state.activeView) {
    return;
  }
  state.activeView = nextView;
  if (state.authToken && nextView === 'mensagens') {
    await loadConversations();
  }
  render();
});

window.addEventListener('popstate', async () => {
  state.activeView = viewFromHash();
  if (state.authToken && state.activeView === 'mensagens') {
    await loadConversations();
  }
  render();
});

loadApp();
