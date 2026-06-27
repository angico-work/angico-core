import type { DashboardData, ObservacaoInput, Observacao, MapPoint, MemoriaEvent } from '../types';
import { fallbackDashboard } from '../data/fallbackDashboard';

export const DEFAULT_WORKSPACE = 'coletivo-jardim-novo';

// Loads the territory dashboard. Falls back to demo data when the API is
// unreachable or the glimpse endpoint is not yet implemented, so the UI is
// always renderable during development.
export async function loadDashboard(workspaceId = DEFAULT_WORKSPACE): Promise<DashboardData> {
  try {
    const response = await fetch(`/api/glimpse/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Falha ao registrar observação (HTTP ${response.status})`);
  }
  return (await response.json()) as Observacao;
}

export async function loadMapPoints(workspaceId = DEFAULT_WORKSPACE): Promise<MapPoint[]> {
  try {
    const r = await fetch(`/api/glimpse/map?workspaceId=${encodeURIComponent(workspaceId)}`);
    if (!r.ok) throw new Error();
    return (await r.json()) as MapPoint[];
  } catch {
    return [];
  }
}

export async function loadMemoria(workspaceId = DEFAULT_WORKSPACE): Promise<MemoriaEvent[]> {
  try {
    const r = await fetch(`/api/glimpse/memoria?workspaceId=${encodeURIComponent(workspaceId)}`);
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
    const r = await fetch(`${path}?workspaceId=${encodeURIComponent(workspaceId)}`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Falha ao salvar (HTTP ${r.status})`);
  }
  return (await r.json()) as T;
}
