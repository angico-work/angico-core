import type {
  Acao, AcaoInput, DashboardData, Observacao, MapPoint, MemoriaEvent, GeoResult,
  GeoSearchResponse, PessoaHit, Conversa, Mensagem, MensagemBusca, RastroResponse, RastroRootType,
  MissaoInput, MissaoRegistro, Problema, ProblemaInput, Territorio, TerritorioInput, Workspace, WorkspaceMember,
  Evidencia, Resultado, ResultadoInput, Indicador, IndicadorInput, Medicao, MedicaoInput,
  Organizacao, OrganizacaoInput, Participacao, ParticipacaoInput, Recurso, RecursoInput, RecursoUso, RecursoUsoInput
} from '../types';
import { ApiHttpError, ApiNetworkError } from './apiErrors';
import {
  entityListContract,
  isConversaList,
  isDashboardData,
  isMapPointList,
  isMemoriaEventList,
  isMensagemList,
  isRastroResponse,
  isTerritorioList,
  isWorkspaceList,
  isWorkspaceMemberList
} from './apiContracts';
import { loadConfirmedOrSnapshot } from './offlineQuery';
import { ACCOUNT_SNAPSHOT_WORKSPACE } from './offlineReadState';
import {
  clearSession,
  getSession,
  saveSession,
  type AuthSession
} from './session';

export { ApiHttpError, ApiNetworkError } from './apiErrors';
export {
  clearSession,
  getSession,
  hasFreshOfflineSession,
  isAuthenticated,
  offlineSessionExpiresAt,
  sessionOwnerId,
  setSessionWorkspace
} from './session';
export type { AuthSession } from './session';

export const DEFAULT_WORKSPACE = 'coletivo-jardim-novo';

export const API_BASE = '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = { ...(init.headers as Record<string, string> | undefined) };
  const csrfToken = getSession()?.csrfToken;
  if (!SAFE_METHODS.has(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const response = await fetch(input, { ...init, credentials: 'include', headers });
  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('angico:unauthorized'));
    }
  }
  return response;
}

function requestHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return extra;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    return body.detail || body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function requestJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fallback = 'A solicitação não pôde ser concluída.'
): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) throw new ApiNetworkError(error, fallback);
    throw error;
  }
  if (!response.ok) {
    throw new ApiHttpError(response.status, await readError(response, fallback));
  }
  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await apiFetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível entrar. Verifique suas credenciais.'));
  }
  return saveSession((await response.json()) as AuthSession, true);
}

export interface RegisterInput {
  nome: string;
  email: string;
  angicoId: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const response = await apiFetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível criar a conta.'));
  }
  return saveSession((await response.json()) as AuthSession, true);
}

export async function logout(): Promise<void> {
  const request = apiFetch(apiUrl('/api/auth/logout'), { method: 'POST' });
  clearSession();
  try {
    await request;
  } catch {
  }
}

export async function revalidateSession(): Promise<AuthSession | null> {
  if (!getSession()) return null;
  try {
    const session = await requestJson<AuthSession>(
      apiUrl('/api/auth/me'),
      {},
      'Não foi possível validar a sessão.'
    );
    return saveSession(session, true);
  } catch (error) {
    if (error instanceof ApiHttpError) return null;
    throw error;
  }
}

export async function loadDashboard(workspaceId = DEFAULT_WORKSPACE): Promise<DashboardData> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId, resource: 'dashboard', contractVersion: 2 },
    () => requestJson(
      apiUrl(`/api/glimpse/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`),
      { headers: requestHeaders() },
      'Não foi possível carregar o painel do território.'
    ),
    (value): value is DashboardData => isDashboardData(value, workspaceId)
  );
  return result.data;
}

export async function loadMapPoints(workspaceId = DEFAULT_WORKSPACE): Promise<MapPoint[]> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId, resource: 'map-points', contractVersion: 2 },
    () => requestJson(
      apiUrl(`/api/glimpse/map?workspaceId=${encodeURIComponent(workspaceId)}`),
      { headers: requestHeaders() },
      'Não foi possível carregar os pontos do mapa.'
    ),
    (value): value is MapPoint[] => isMapPointList(value, workspaceId)
  );
  return result.data;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId: ACCOUNT_SNAPSHOT_WORKSPACE, resource: 'workspaces', contractVersion: 2 },
    () => requestJson(
      apiUrl('/api/workspaces'),
      { headers: requestHeaders() },
      'Não foi possível carregar os espaços de trabalho.'
    ),
    isWorkspaceList
  );
  return result.data;
}

export async function createWorkspace(nome: string): Promise<Workspace> {
  const r = await apiFetch(apiUrl('/api/workspaces'), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nome: nome.trim() })
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível criar o workspace.'));
  return (await r.json()) as Workspace;
}

export async function deleteWorkspace(slug: string): Promise<void> {
  const r = await apiFetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}`), {
    method: 'DELETE',
    headers: requestHeaders()
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(await readError(r, 'Não foi possível remover o workspace.'));
  }
}

export async function listMembers(slug: string): Promise<WorkspaceMember[]> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId: slug, resource: 'workspace-members', contractVersion: 2 },
    () => requestJson(
      apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members`),
      { headers: requestHeaders() },
      'Não foi possível carregar os integrantes.'
    ),
    (value): value is WorkspaceMember[] => isWorkspaceMemberList(value, slug)
  );
  return result.data;
}

export interface AddMemberInput {
  actorId: string;
  displayName?: string;
  role?: string;
}

export async function addMember(slug: string, input: AddMemberInput): Promise<WorkspaceMember> {
  const r = await apiFetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members`), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível adicionar o membro.'));
  return (await r.json()) as WorkspaceMember;
}

export async function removeMember(slug: string, memberId: number): Promise<void> {
  const r = await apiFetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members/${memberId}`), {
    method: 'DELETE',
    headers: requestHeaders()
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(await readError(r, 'Não foi possível remover o membro.'));
  }
}

export async function searchGeocoding(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const body = await requestJson<GeoSearchResponse>(
      apiUrl(`/api/geocoding/search?q=${encodeURIComponent(q)}`),
      { headers: requestHeaders(), signal },
      'Não foi possível buscar o endereço.'
    );
    const seen = new Set<string>();
    return (body.results ?? []).filter((g) => {
      if (seen.has(g.displayName)) return false;
      seen.add(g.displayName);
      return true;
    });
  } catch (error) {
    if (signal?.aborted) return [];
    throw error;
  }
}

export async function resolveCoords(r: GeoResult, signal?: AbortSignal): Promise<[number, number] | null> {
  if (r.latitude != null && r.longitude != null) return [r.latitude, r.longitude];
  const q = [r.city, r.state, r.country].filter(Boolean).join(', ');
  if (!q) return null;
  const more = await searchGeocoding(q, signal);
  const hit = more.find((x) => x.latitude != null && x.longitude != null);
  return hit && hit.latitude != null && hit.longitude != null ? [hit.latitude, hit.longitude] : null;
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeoResult | null> {
  try {
    return await requestJson<GeoResult>(
      apiUrl(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`),
      { headers: requestHeaders(), signal },
      'Não foi possível identificar o endereço.'
    );
  } catch (error) {
    if (signal?.aborted) return null;
    throw error;
  }
}

export async function searchPessoas(workspaceId: string, q: string, signal?: AbortSignal): Promise<PessoaHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  try {
    const r = await apiFetch(
      apiUrl(`/api/pessoas/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(query)}`),
      { headers: requestHeaders(), signal }
    );
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível buscar pessoas.'));
    return (await r.json()) as PessoaHit[];
  } catch (error) {
    if (signal?.aborted) return [];
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível buscar pessoas. Verifique a conexão.');
  }
}

export interface MemoryFilters {
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  eventType?: string;
  actorId?: string;
  source?: string;
  syncStatus?: string;
}

function memoryFilters(filters: MemoryFilters): Record<string, string> {
  const normalized: Record<string, string> = {};
  const values: Array<[keyof MemoryFilters, string | undefined]> = [
    ['entityType', filters.entityType?.trim().toUpperCase()],
    ['entityId', filters.entityId?.trim()],
    ['from', filters.from?.trim()],
    ['to', filters.to?.trim()],
    ['eventType', filters.eventType?.trim()],
    ['actorId', filters.actorId?.trim().replace(/^@/, '')],
    ['source', filters.source?.trim()],
    ['syncStatus', filters.syncStatus?.trim().toUpperCase()]
  ];
  values.forEach(([key, value]) => { if (value) normalized[key] = value; });
  return normalized;
}

export async function loadMemoria(
  workspaceId = DEFAULT_WORKSPACE,
  filters: MemoryFilters = {}
): Promise<MemoriaEvent[]> {
  const query = memoryFilters(filters);
  const params = new URLSearchParams(query);
  const path = `/api/history/workspaces/${encodeURIComponent(workspaceId)}${params.size ? `?${params}` : ''}`;
  const result = await loadConfirmedOrSnapshot(
    { workspaceId, resource: 'memory-events', query, contractVersion: 2 },
    () => requestJson(
      apiUrl(path),
      { headers: requestHeaders() },
      'Não foi possível carregar a memória do território.'
    ),
    (value): value is MemoriaEvent[] => isMemoriaEventList(value, workspaceId)
  );
  return result.data;
}

export async function loadRastro(
  rootType: RastroRootType,
  rootId: string,
  workspaceId = DEFAULT_WORKSPACE
): Promise<RastroResponse> {
  const normalizedId = rootId.trim();
  if (!normalizedId) throw new Error('Selecione uma raiz para consultar o Rastro.');
  const path = `/api/rastro/${rootType}/${encodeURIComponent(normalizedId)}?workspaceId=${encodeURIComponent(workspaceId)}`;
  const result = await loadConfirmedOrSnapshot(
    {
      workspaceId,
      resource: 'rastro',
      query: { rootType },
      root: normalizedId,
      contractVersion: 2
    },
    () => requestJson(
      apiUrl(path),
      { headers: requestHeaders() },
      'Não foi possível carregar o Rastro.'
    ),
    (value): value is RastroResponse => isRastroResponse(value, workspaceId)
      && value.root.reference.type === rootType
      && value.root.reference.id === normalizedId
  );
  return result.data;
}

export async function listEntities<T = Record<string, unknown>>(
  path: string, workspaceId = DEFAULT_WORKSPACE
): Promise<T[]> {
  const contract = entityListContract(path);
  const result = await loadConfirmedOrSnapshot(
    {
      workspaceId,
      resource: contract.resource,
      root: contract.root,
      contractVersion: 2
    },
    () => requestJson(
      apiUrl(`${path}?workspaceId=${encodeURIComponent(workspaceId)}`),
      { headers: requestHeaders() },
      'Não foi possível carregar os registros.'
    ),
    (value): value is T[] => contract.validate(value, workspaceId)
  );
  return result.data;
}

export async function createEntity<T = Record<string, unknown>>(
  path: string, body: Record<string, unknown>
): Promise<T> {
  const r = await apiFetch(apiUrl(path), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Falha ao salvar (HTTP ${r.status})`);
  }
  return (await r.json()) as T;
}

async function createJson<T>(path: string, body: object, fallback: string): Promise<T> {
  const response = await apiFetch(apiUrl(path), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await readError(response, fallback));
  return (await response.json()) as T;
}

export function listProblemas(workspaceId = DEFAULT_WORKSPACE): Promise<Problema[]> {
  return listEntities<Problema>('/api/problemas', workspaceId);
}

export function listMissoes(workspaceId = DEFAULT_WORKSPACE): Promise<MissaoRegistro[]> {
  return listEntities<MissaoRegistro>('/api/missoes', workspaceId);
}

export function createProblema(input: ProblemaInput): Promise<Problema> {
  return createJson('/api/problemas', input, 'Não foi possível registrar o problema.');
}

export function createMissao(input: MissaoInput): Promise<MissaoRegistro> {
  return createJson('/api/missoes', input, 'Não foi possível criar a missão.');
}

export function createAcao(input: AcaoInput): Promise<Acao> {
  return createJson('/api/acoes', input, 'Não foi possível criar a ação.');
}

export function listObservacoes(workspaceId = DEFAULT_WORKSPACE): Promise<Observacao[]> {
  return listEntities<Observacao>('/api/observacoes', workspaceId);
}

export function listPessoas(workspaceId = DEFAULT_WORKSPACE): Promise<PessoaHit[]> {
  return listEntities<PessoaHit>('/api/pessoas', workspaceId);
}

export function listAcoes(workspaceId = DEFAULT_WORKSPACE): Promise<Acao[]> {
  return listEntities<Acao>('/api/acoes', workspaceId);
}

export function listEvidencias(workspaceId = DEFAULT_WORKSPACE): Promise<Evidencia[]> {
  return listEntities<Evidencia>('/api/evidencias', workspaceId);
}

export function evidenciaFileUrl(evidenciaId: number): string {
  return apiUrl(`/api/evidencias/${evidenciaId}/arquivo`);
}

export function listResultados(workspaceId = DEFAULT_WORKSPACE): Promise<Resultado[]> {
  return listEntities<Resultado>('/api/resultados', workspaceId);
}

export function createResultado(input: ResultadoInput): Promise<Resultado> {
  return createJson('/api/resultados', input, 'Não foi possível registrar o resultado.');
}

export function listIndicadores(workspaceId = DEFAULT_WORKSPACE): Promise<Indicador[]> {
  return listEntities<Indicador>('/api/indicadores', workspaceId);
}

export function createIndicador(input: IndicadorInput): Promise<Indicador> {
  return createJson('/api/indicadores', input, 'Não foi possível criar o indicador.');
}

export function listMedicoes(workspaceId = DEFAULT_WORKSPACE): Promise<Medicao[]> {
  return listEntities<Medicao>('/api/medicoes', workspaceId);
}

export function createMedicao(input: MedicaoInput): Promise<Medicao> {
  return createJson('/api/medicoes', input, 'Não foi possível registrar a medição.');
}

export function listOrganizacoes(workspaceId = DEFAULT_WORKSPACE): Promise<Organizacao[]> {
  return listEntities<Organizacao>('/api/organizacoes', workspaceId);
}

export function createOrganizacao(input: OrganizacaoInput): Promise<Organizacao> {
  return createJson('/api/organizacoes', input, 'Não foi possível criar a organização.');
}

export function listParticipacoes(
  organizacaoId: number, workspaceId = DEFAULT_WORKSPACE
): Promise<Participacao[]> {
  return listEntities<Participacao>(`/api/organizacoes/${organizacaoId}/participacoes`, workspaceId);
}

export function createParticipacao(
  organizacaoId: number, input: ParticipacaoInput
): Promise<Participacao> {
  return createJson(
    `/api/organizacoes/${organizacaoId}/participacoes`, input,
    'Não foi possível registrar a participação.'
  );
}

export function listRecursos(workspaceId = DEFAULT_WORKSPACE): Promise<Recurso[]> {
  return listEntities<Recurso>('/api/recursos', workspaceId);
}

export function createRecurso(input: RecursoInput): Promise<Recurso> {
  return createJson('/api/recursos', input, 'Não foi possível criar o recurso.');
}

export function listRecursoUsos(
  recursoId: number, workspaceId = DEFAULT_WORKSPACE
): Promise<RecursoUso[]> {
  return listEntities<RecursoUso>(`/api/recursos/${recursoId}/usos`, workspaceId);
}

export function createRecursoUso(recursoId: number, input: RecursoUsoInput): Promise<RecursoUso> {
  return createJson(`/api/recursos/${recursoId}/usos`, input, 'Não foi possível registrar o uso.');
}

export async function listConversas(workspaceId = DEFAULT_WORKSPACE): Promise<Conversa[]> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId, resource: 'conversations', contractVersion: 2 },
    () => requestJson(
      apiUrl(`/api/mensagens/conversas?workspaceId=${encodeURIComponent(workspaceId)}`),
      { headers: requestHeaders() },
      'Não foi possível carregar as conversas.'
    ),
    (value): value is Conversa[] => isConversaList(value, workspaceId)
  );
  return result.data;
}

function requireConversationId(conversaId: number): void {
  if (!Number.isSafeInteger(conversaId) || conversaId <= 0) {
    throw new Error('Conversa inválida.');
  }
}

export async function listMensagens(
  conversaId: number,
  workspaceId = DEFAULT_WORKSPACE
): Promise<Mensagem[]> {
  requireConversationId(conversaId);
  const result = await loadConfirmedOrSnapshot(
    {
      workspaceId,
      resource: 'conversation-messages',
      root: String(conversaId),
      contractVersion: 2
    },
    () => requestJson(
      apiUrl(`/api/mensagens/conversas/${conversaId}/mensagens`),
      { headers: requestHeaders() },
      'Não foi possível carregar as mensagens.'
    ),
    (value): value is Mensagem[] => isMensagemList(value, workspaceId, conversaId)
  );
  return result.data;
}

export interface CreateConversaInput {
  workspaceId: string;
  territorioId?: number;
  contextEntityType?: string;
  contextEntityId?: string;
  titulo: string;
  participanteRefs: string[];
}

export async function createConversa(input: CreateConversaInput): Promise<Conversa> {
  const r = await apiFetch(apiUrl('/api/mensagens/conversas'), {
    method: 'POST', headers: requestHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível criar a conversa.'));
  return (await r.json()) as Conversa;
}

export async function listTerritorios(workspaceId = DEFAULT_WORKSPACE): Promise<Territorio[]> {
  const result = await loadConfirmedOrSnapshot(
    { workspaceId, resource: 'territories', contractVersion: 2 },
    () => requestJson(
      apiUrl(`/api/territorios?workspaceId=${encodeURIComponent(workspaceId)}`),
      { headers: requestHeaders() },
      'Não foi possível carregar os territórios.'
    ),
    (value): value is Territorio[] => isTerritorioList(value, workspaceId)
  );
  return result.data;
}

export async function createTerritorio(input: TerritorioInput): Promise<Territorio> {
  const response = await apiFetch(apiUrl('/api/territorios'), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível criar o território.'));
  }
  return (await response.json()) as Territorio;
}

export function attachmentUrl(anexoId: number): string {
  return apiUrl(`/api/mensagens/anexos/${anexoId}`);
}

export async function markConversaRead(conversaId: number): Promise<void> {
  requireConversationId(conversaId);
  const response = await apiFetch(apiUrl(`/api/mensagens/conversas/${conversaId}/leitura`), {
    method: 'POST',
    headers: requestHeaders()
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível marcar a conversa como lida.'));
  }
}

export async function searchMensagens(workspaceId: string, query: string): Promise<MensagemBusca[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const response = await apiFetch(apiUrl(
    `/api/mensagens/busca?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(normalized)}`
  ), { headers: requestHeaders() });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível buscar nas conversas.'));
  }
  return (await response.json()) as MensagemBusca[];
}

export async function getProfile(workspaceId = DEFAULT_WORKSPACE): Promise<PessoaHit | null> {
  const session = getSession();
  if (!session) return null;
  const people = await listPessoas(workspaceId);
  return people.find((person) => person.id === session.pessoaId) ?? null;
}

export interface ProfileUpdate {
  nome?: string;
  telefone?: string;
  foto?: string;
}

export async function updateProfile(input: ProfileUpdate): Promise<PessoaHit> {
  const r = await apiFetch(apiUrl('/api/pessoas/me'), {
    method: 'PUT', headers: requestHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível salvar o perfil.'));
  const updated = (await r.json()) as PessoaHit;
  const session = getSession();
  if (session) saveSession({ ...session, nome: updated.nome });
  return updated;
}
