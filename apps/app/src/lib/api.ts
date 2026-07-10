import type {
  DashboardData, ObservacaoInput, Observacao, MapPoint, MemoriaEvent, GeoResult,
  GeoSearchResponse, PessoaHit, Conversa, Mensagem, MensagemBusca, Territorio, Workspace, WorkspaceMember
} from '../types';
import { validateMessageFiles } from './messageFiles';

export const DEFAULT_WORKSPACE = 'coletivo-jardim-novo';

export const API_BASE = '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

const SESSION_KEY = 'angico.session';
const SESSION_VALIDATED_KEY = 'angico.session.validatedAt';
const OFFLINE_SESSION_LEASE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  pessoaId: number;
  nome: string;
  email: string | null;
  angicoId: string | null;
  papel: string | null;
  workspaceId: string | null;
  expiresAt: string;
  csrfToken: string;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession & { token?: unknown };
    if (Object.prototype.hasOwnProperty.call(session, 'token')) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  return Boolean(session && Date.parse(session.expiresAt) > Date.now());
}

function saveSession(session: AuthSession, validated = false): AuthSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session, (key, value) => key === 'token' ? undefined : value));
  if (validated) localStorage.setItem(SESSION_VALIDATED_KEY, new Date().toISOString());
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_VALIDATED_KEY);
  localStorage.removeItem('angico_session');
}

export function hasFreshOfflineSession(): boolean {
  const session = getSession();
  if (!session) return false;
  const validatedAt = Date.parse(localStorage.getItem(SESSION_VALIDATED_KEY) ?? '');
  const serverExpiry = Date.parse(session.expiresAt);
  if (!Number.isFinite(validatedAt) || !Number.isFinite(serverExpiry)) return false;
  const offlineExpiry = Math.min(serverExpiry, validatedAt + OFFLINE_SESSION_LEASE_MS);
  return Date.now() < offlineExpiry;
}

export function setSessionWorkspace(slug: string): void {
  const session = getSession();
  if (session) saveSession({ ...session, workspaceId: slug });
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
  try {
    await apiFetch(apiUrl('/api/auth/logout'), { method: 'POST' });
  } catch {
  }
  clearSession();
}

export async function revalidateSession(): Promise<AuthSession | null> {
  if (!getSession()) return null;
  const response = await apiFetch(apiUrl('/api/auth/me'));
  if (!response.ok) return null;
  return saveSession((await response.json()) as AuthSession, true);
}

export async function loadDashboard(workspaceId = DEFAULT_WORKSPACE): Promise<DashboardData> {
  try {
    const response = await apiFetch(apiUrl(`/api/glimpse/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: requestHeaders()
    });
    if (!response.ok) {
      throw new Error(await readError(response, 'Não foi possível carregar o painel do território.'));
    }
    return (await response.json()) as DashboardData;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Não foi possível carregar o painel do território. Verifique a conexão.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Não foi possível carregar o painel do território. Verifique a conexão.');
  }
}

export async function createObservacao(input: ObservacaoInput): Promise<Observacao> {
  const response = await apiFetch(apiUrl('/api/observacoes'), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Falha ao registrar observação (HTTP ${response.status})`);
  }
  return (await response.json()) as Observacao;
}

export async function loadMapPoints(workspaceId = DEFAULT_WORKSPACE): Promise<MapPoint[]> {
  try {
    const r = await apiFetch(apiUrl(`/api/glimpse/map?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: requestHeaders()
    });
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível carregar os pontos do mapa.'));
    return (await r.json()) as MapPoint[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar os pontos do mapa.');
  }
}

export async function listWorkspaces(): Promise<Workspace[]> {
  try {
    const r = await apiFetch(apiUrl('/api/workspaces'), { headers: requestHeaders() });
    if (!r.ok) throw new Error();
    return (await r.json()) as Workspace[];
  } catch {
    return [];
  }
}

export async function createWorkspace(nome: string, criadoPor?: string): Promise<Workspace> {
  const r = await apiFetch(apiUrl('/api/workspaces'), {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nome: nome.trim(), criadoPor })
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
  try {
    const r = await apiFetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members`), { headers: requestHeaders() });
    if (!r.ok) return [];
    return (await r.json()) as WorkspaceMember[];
  } catch {
    return [];
  }
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
    const r = await apiFetch(apiUrl(`/api/geocoding/search?q=${encodeURIComponent(q)}`), {
      headers: requestHeaders(),
      signal
    });
    if (!r.ok) return [];
    const body = (await r.json()) as GeoSearchResponse;
    const seen = new Set<string>();
    return (body.results ?? []).filter((g) => {
      if (seen.has(g.displayName)) return false;
      seen.add(g.displayName);
      return true;
    });
  } catch {
    return [];
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
    const r = await apiFetch(apiUrl(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`), {
      headers: requestHeaders(),
      signal
    });
    if (!r.ok) return null;
    return (await r.json()) as GeoResult;
  } catch {
    return null;
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
    if (!r.ok) return [];
    return (await r.json()) as PessoaHit[];
  } catch {
    return [];
  }
}

export async function loadMemoria(workspaceId = DEFAULT_WORKSPACE): Promise<MemoriaEvent[]> {
  try {
    const r = await apiFetch(apiUrl(`/api/history/workspaces/${encodeURIComponent(workspaceId)}`), {
      headers: requestHeaders()
    });
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível carregar a memória do território.'));
    return (await r.json()) as MemoriaEvent[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar a memória do território.');
  }
}

export async function listEntities<T = Record<string, unknown>>(
  path: string, workspaceId = DEFAULT_WORKSPACE
): Promise<T[]> {
  try {
    const r = await apiFetch(apiUrl(`${path}?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: requestHeaders()
    });
    if (!r.ok) {
      if (r.status === 401) {
        throw new Error('Sua sessão expirou. Entre novamente para continuar.');
      }
      throw new Error(await readError(r, 'Não foi possível carregar os registros.'));
    }
    return (await r.json()) as T[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar os registros. Verifique a conexão e tente novamente.');
  }
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

export async function listConversas(workspaceId = DEFAULT_WORKSPACE): Promise<Conversa[]> {
  try {
    const r = await apiFetch(apiUrl(`/api/mensagens/conversas?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: requestHeaders() });
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível carregar as conversas.'));
    return (await r.json()) as Conversa[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar as conversas. Verifique a conexão.');
  }
}

function requireConversationId(conversaId: number): void {
  if (!Number.isSafeInteger(conversaId) || conversaId <= 0) {
    throw new Error('Conversa inválida.');
  }
}

export async function listMensagens(conversaId: number): Promise<Mensagem[]> {
  requireConversationId(conversaId);
  try {
    const r = await apiFetch(apiUrl(`/api/mensagens/conversas/${conversaId}/mensagens`), { headers: requestHeaders() });
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível carregar as mensagens.'));
    return (await r.json()) as Mensagem[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar as mensagens. Verifique a conexão.');
  }
}

export interface MessageSendMetadata {
  clientMessageId: string;
  deviceId: string;
  occurredAt: string;
}

export async function sendMensagem(
  conversaId: number,
  corpo: string,
  attachments: File[] = [],
  metadata?: MessageSendMetadata
): Promise<Mensagem> {
  requireConversationId(conversaId);
  validateMessageFiles(attachments);
  const form = new FormData();
  if (corpo.trim()) form.append('corpo', corpo.trim());
  if (metadata) {
    form.append('clientMessageId', metadata.clientMessageId);
    form.append('deviceId', metadata.deviceId);
    form.append('occurredAt', metadata.occurredAt);
  }
  attachments.forEach((file) => form.append('attachments', file));
  const r = await apiFetch(apiUrl(`/api/mensagens/conversas/${conversaId}/mensagens`), {
    method: 'POST',
    headers: requestHeaders(metadata ? { 'Idempotency-Key': metadata.clientMessageId } : {}),
    body: form
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível enviar a mensagem.'));
  return (await r.json()) as Mensagem;
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
  try {
    const r = await apiFetch(apiUrl(`/api/territorios?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: requestHeaders() });
    if (!r.ok) throw new Error(await readError(r, 'Não foi possível carregar os territórios.'));
    return (await r.json()) as Territorio[];
  } catch (error) {
    if (error instanceof Error && !(error instanceof TypeError)) throw error;
    throw new Error('Não foi possível carregar os territórios. Verifique a conexão.');
  }
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

export async function ensureTerritorio(workspaceId = DEFAULT_WORKSPACE): Promise<number | null> {
  const existing = await listTerritorios(workspaceId);
  return existing[0]?.id ?? null;
}

export async function getProfile(workspaceId = DEFAULT_WORKSPACE): Promise<PessoaHit | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const r = await apiFetch(apiUrl(`/api/pessoas?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: requestHeaders() });
    if (!r.ok) return null;
    const list = (await r.json()) as PessoaHit[];
    return list.find((p) => p.id === session.pessoaId) ?? null;
  } catch {
    return null;
  }
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
