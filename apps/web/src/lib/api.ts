import type { DashboardData, ObservacaoInput, Observacao, MapPoint, MemoriaEvent, GeoResult, GeoSearchResponse } from '../types';
import { fallbackDashboard } from '../data/fallbackDashboard';

export const DEFAULT_WORKSPACE = 'coletivo-jardim-novo';

// Base URL for the API. Empty by default so the Vite dev proxy and same-origin
// deploys keep working; set VITE_API_BASE_URL for a cross-origin deploy.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

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
  const response = await fetch('/api/auth/login', {
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
  const response = await fetch('/api/auth/register', {
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
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
  } catch {
    // Logout is best-effort; the local session is cleared regardless.
  }
  clearSession();
}

// --- Territory data ---------------------------------------------------------

// Loads the territory dashboard. Falls back to demo data when the API is
// unreachable or the glimpse endpoint is not yet implemented, so the UI is
// always renderable during development.
export async function loadDashboard(workspaceId = DEFAULT_WORKSPACE): Promise<DashboardData> {
  try {
    const response = await fetch(`/api/glimpse/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      throw new Error('API indisponível');
    }
    return (await response.json()) as DashboardData;
  } catch {
    return fallbackDashboard;
  }
}

// Registers a new observação. Throws on failure so the UI can surface it.
export async function createObservacao(input: ObservacaoInput): Promise<Observacao> {
  const response = await fetch('/api/observacoes', {
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
    const r = await fetch(`/api/glimpse/map?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    return (await r.json()) as MapPoint[];
  } catch {
    return [];
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
    return body.results ?? [];
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

export async function loadMemoria(workspaceId = DEFAULT_WORKSPACE): Promise<MemoriaEvent[]> {
  try {
    const r = await fetch(`/api/glimpse/memoria?workspaceId=${encodeURIComponent(workspaceId)}`, {
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
    const r = await fetch(`${path}?workspaceId=${encodeURIComponent(workspaceId)}`, {
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
  const r = await fetch(path, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Falha ao salvar (HTTP ${r.status})`);
  }
  return (await r.json()) as T;
}
