import type {
  DashboardData, ObservacaoInput, Observacao, MapPoint, MemoriaEvent, GeoResult,
  GeoSearchResponse, PessoaHit, Conversa, Mensagem, Territorio, Workspace, WorkspaceMember
} from '../types';
import { emptyDashboard, demoDashboard } from '../data/fallbackDashboard';

export const DEFAULT_WORKSPACE = 'coletivo-jardim-novo';

// Base URL for the API. Empty by default so the Vite dev proxy and same-origin
// deploys keep working; set VITE_API_BASE_URL for a cross-origin deploy.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Demo data is shown only in local dev, or in a deploy that explicitly opts in
// with VITE_USE_DEMO_DATA=true (e.g. a public demo instance). Production
// defaults to off, so real deployments never render fabricated numbers.
export const USE_DEMO_DATA = import.meta.env.DEV || import.meta.env.VITE_USE_DEMO_DATA === 'true';

// --- Auth session -----------------------------------------------------------
// The auth slice ported from the dev branch issues an opaque bearer token on
// login/register. We keep the full session in localStorage so a refresh stays
// logged in, and attach the token to every API call.

const SESSION_KEY = 'angico.session';

export interface AuthSession {
  token: string | null;
  pessoaId: number;
  workspaceId: string;
  nome: string;
  email: string | null;
  angicoId: string | null;
  papel: string | null;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

function saveSession(session: AuthSession): AuthSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('angico_session'); // legacy key from the demo login
}

// Switches the active workspace and persists it on the session, so a refresh
// keeps the member in the workspace they last chose. Every page reads
// workspaceId from the shell context, so changing it triggers a full refetch.
export function setSessionWorkspace(slug: string): void {
  const session = getSession();
  if (session) saveSession({ ...session, workspaceId: slug });
}

// Adds the bearer token when present; merges any extra headers (e.g. JSON).
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
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
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível entrar. Verifique suas credenciais.'));
  }
  return saveSession((await response.json()) as AuthSession);
}

export interface RegisterInput {
  nome: string;
  email: string;
  angicoId: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Não foi possível criar a conta.'));
  }
  return saveSession((await response.json()) as AuthSession);
}

export async function logout(): Promise<void> {
  try {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', headers: authHeaders() });
  } catch {
    // Logout is best-effort; the local session is cleared regardless.
  }
  clearSession();
}

// --- Territory data ---------------------------------------------------------

// Loads the territory dashboard. On failure we never fabricate numbers in
// production — we return the honest empty state. In local development we fall
// back to the demo sample so the UI stays explorable without a backend.
export async function loadDashboard(workspaceId = DEFAULT_WORKSPACE): Promise<DashboardData> {
  try {
    const response = await fetch(apiUrl(`/api/glimpse/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: authHeaders()
    });
    if (!response.ok) {
      throw new Error('API indisponível');
    }
    return (await response.json()) as DashboardData;
  } catch {
    return USE_DEMO_DATA ? demoDashboard : emptyDashboard;
  }
}

// Registers a new observação. Throws on failure so the UI can surface it.
export async function createObservacao(input: ObservacaoInput): Promise<Observacao> {
  const response = await fetch(apiUrl('/api/observacoes'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Falha ao registrar observação (HTTP ${response.status})`);
  }
  return (await response.json()) as Observacao;
}

export async function loadMapPoints(workspaceId = DEFAULT_WORKSPACE): Promise<MapPoint[]> {
  try {
    const r = await fetch(apiUrl(`/api/glimpse/map?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    return (await r.json()) as MapPoint[];
  } catch {
    return [];
  }
}

// --- Workspaces -------------------------------------------------------------
// Named partitions. The slug scopes every module's data; the nome is the label
// shown in the switcher. Falls back to the shipped default when the API is
// unreachable, so the shell still renders in dev/offline.
const DEFAULT_WORKSPACE_LABEL = 'Coletivo Jardim Novo';

export async function listWorkspaces(): Promise<Workspace[]> {
  try {
    const r = await fetch(apiUrl('/api/workspaces'), { headers: authHeaders() });
    if (!r.ok) throw new Error();
    const list = (await r.json()) as Workspace[];
    return list.length ? list : [{ slug: DEFAULT_WORKSPACE, nome: DEFAULT_WORKSPACE_LABEL }];
  } catch {
    return [{ slug: DEFAULT_WORKSPACE, nome: DEFAULT_WORKSPACE_LABEL }];
  }
}

export async function createWorkspace(nome: string, criadoPor?: string): Promise<Workspace> {
  const r = await fetch(apiUrl('/api/workspaces'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nome: nome.trim(), criadoPor })
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível criar o workspace.'));
  return (await r.json()) as Workspace;
}

// Removes a workspace from the registry. Its scoped data stays intact, so
// re-creating the same name restores the view. The home workspace is protected
// server-side (HTTP 400).
export async function deleteWorkspace(slug: string): Promise<void> {
  const r = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}`), {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(await readError(r, 'Não foi possível remover o workspace.'));
  }
}

// --- Workspace members ------------------------------------------------------
export async function listMembers(slug: string): Promise<WorkspaceMember[]> {
  try {
    const r = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members`), { headers: authHeaders() });
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
  const r = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members`), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível adicionar o membro.'));
  return (await r.json()) as WorkspaceMember;
}

export async function removeMember(slug: string, memberId: number): Promise<void> {
  const r = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(slug)}/members/${memberId}`), {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(await readError(r, 'Não foi possível remover o membro.'));
  }
}

// --- Geocoding (forward + reverse) ------------------------------------------
// Backed by /api/geocoding (Nominatim with an IBGE municipality fallback).
// Debounce on the caller side and pass an AbortSignal to cancel stale lookups.
export async function searchGeocoding(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const r = await fetch(apiUrl(`/api/geocoding/search?q=${encodeURIComponent(q)}`), {
      headers: authHeaders(),
      signal
    });
    if (!r.ok) return [];
    const body = (await r.json()) as GeoSearchResponse;
    // Collapse duplicate hits — the geocoder often returns several segments of the
    // same street/place with an identical displayName, which just reads as noise.
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

// Resolves a suggestion to coordinates. The IBGE municipality fallback returns
// city names without coordinates (it answers when the geocoder is rate-limited);
// in that case we re-geocode "city, state, country" to find a centre. Returns
// null only when no provider can place the city.
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
    const r = await fetch(apiUrl(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`), {
      headers: authHeaders(),
      signal
    });
    if (!r.ok) return null;
    return (await r.json()) as GeoResult;
  } catch {
    return null;
  }
}

// Angico-ID-aware people search (workspace-scoped) backing the "Nova pessoa"
// autocomplete. Matches the typed text against the Angico ID or the name.
export async function searchPessoas(workspaceId: string, q: string, signal?: AbortSignal): Promise<PessoaHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  try {
    const r = await fetch(
      apiUrl(`/api/pessoas/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(query)}`),
      { headers: authHeaders(), signal }
    );
    if (!r.ok) return [];
    return (await r.json()) as PessoaHit[];
  } catch {
    return [];
  }
}

export async function loadMemoria(workspaceId = DEFAULT_WORKSPACE): Promise<MemoriaEvent[]> {
  try {
    const r = await fetch(apiUrl(`/api/glimpse/memoria?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    return (await r.json()) as MemoriaEvent[];
  } catch {
    return [];
  }
}

// Generic list/create for the domain modules (observacoes, problemas, ...).
export async function listEntities<T = Record<string, unknown>>(
  path: string, workspaceId = DEFAULT_WORKSPACE
): Promise<T[]> {
  try {
    const r = await fetch(apiUrl(`${path}?workspaceId=${encodeURIComponent(workspaceId)}`), {
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    return (await r.json()) as T[];
  } catch {
    return [];
  }
}

export async function createEntity<T = Record<string, unknown>>(
  path: string, body: Record<string, unknown>
): Promise<T> {
  const r = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Falha ao salvar (HTTP ${r.status})`);
  }
  return (await r.json()) as T;
}

// --- Mensagens & grupos -----------------------------------------------------
export async function listConversas(workspaceId = DEFAULT_WORKSPACE): Promise<Conversa[]> {
  try {
    const r = await fetch(apiUrl(`/api/mensagens/conversas?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: authHeaders() });
    if (!r.ok) return [];
    return (await r.json()) as Conversa[];
  } catch {
    return [];
  }
}

export async function listMensagens(conversaId: number): Promise<Mensagem[]> {
  try {
    const r = await fetch(apiUrl(`/api/mensagens/conversas/${conversaId}/mensagens`), { headers: authHeaders() });
    if (!r.ok) return [];
    return (await r.json()) as Mensagem[];
  } catch {
    return [];
  }
}

// Multipart send (text + optional image/file attachments). Do NOT set
// Content-Type — the browser adds the multipart boundary.
export async function sendMensagem(conversaId: number, corpo: string, attachments: File[] = []): Promise<Mensagem> {
  const form = new FormData();
  if (corpo.trim()) form.append('corpo', corpo.trim());
  attachments.forEach((file) => form.append('attachments', file));
  const r = await fetch(apiUrl(`/api/mensagens/conversas/${conversaId}/mensagens`), {
    method: 'POST', headers: authHeaders(), body: form
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível enviar a mensagem.'));
  return (await r.json()) as Mensagem;
}

export interface CreateConversaInput {
  workspaceId: string;
  territorioId: number;
  titulo: string;
  participanteRefs: string[];
}

export async function createConversa(input: CreateConversaInput): Promise<Conversa> {
  const r = await fetch(apiUrl('/api/mensagens/conversas'), {
    method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível criar a conversa.'));
  return (await r.json()) as Conversa;
}

export async function listTerritorios(workspaceId = DEFAULT_WORKSPACE): Promise<Territorio[]> {
  try {
    const r = await fetch(apiUrl(`/api/territorios?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: authHeaders() });
    if (!r.ok) return [];
    return (await r.json()) as Territorio[];
  } catch {
    return [];
  }
}

export function attachmentUrl(anexoId: number): string {
  return apiUrl(`/api/mensagens/anexos/${anexoId}`);
}

// Conversations must be anchored to a território. Resolve the workspace's first
// território, creating a default one if none exists yet, so messaging works out
// of the box for any workspace.
export async function ensureTerritorio(workspaceId = DEFAULT_WORKSPACE): Promise<number | null> {
  const existing = await listTerritorios(workspaceId);
  if (existing.length > 0) return existing[0].id;
  try {
    const r = await fetch(apiUrl('/api/territorios'), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ workspaceId, nome: 'Território', tipo: 'BAIRRO', pais: 'Brasil' })
    });
    if (!r.ok) return null;
    return ((await r.json()) as Territorio).id;
  } catch {
    return null;
  }
}

// --- Perfil (current pessoa) ------------------------------------------------
// /api/auth/me doesn't carry telefone/foto, so resolve the full record from the
// workspace people list by the session's pessoaId.
export async function getProfile(workspaceId = DEFAULT_WORKSPACE): Promise<PessoaHit | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const r = await fetch(apiUrl(`/api/pessoas?workspaceId=${encodeURIComponent(workspaceId)}`), { headers: authHeaders() });
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
  const r = await fetch(apiUrl('/api/pessoas/me'), {
    method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input)
  });
  if (!r.ok) throw new Error(await readError(r, 'Não foi possível salvar o perfil.'));
  const updated = (await r.json()) as PessoaHit;
  // Keep the local session label in sync so the shell reflects the new name.
  const session = getSession();
  if (session) saveSession({ ...session, nome: updated.nome });
  return updated;
}
