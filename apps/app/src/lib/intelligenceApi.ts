import { apiFetch, apiUrl } from './api';

export interface AnalysisInput { workspaceId: string; requestId: string; entityType: string; title: string; description: string }
export interface IntelligenceSource { sourceId: string; entityType: string; entityId: string; title: string; excerpt: string; occurredAt: string }
export interface IntelligenceAnalysis {
  analysisId: string | null; status: 'READY' | 'PENDING' | 'FAILED' | 'UNAVAILABLE' | 'RATE_LIMITED';
  category: string | null; summary: string; message: string;
  connections: Array<{ sourceId: string; relationType: string | null; reason: string }>;
  recommendations: Array<{ text: string; sourceIds: string[] }>;
  sources: IntelligenceSource[];
}
export interface IntelligenceFeedback { suggestionId: string; decision: 'accepted' | 'rejected' | 'corrected'; correctedCategory: string | null; requestId: string }
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function validAnalysis(value: unknown): value is IntelligenceAnalysis {
  if (!object(value) || !['READY','PENDING','FAILED','UNAVAILABLE','RATE_LIMITED'].includes(String(value.status))
    || !(value.analysisId === null || typeof value.analysisId === 'string')
    || !(value.category === null || typeof value.category === 'string')
    || typeof value.summary !== 'string' || typeof value.message !== 'string'
    || !Array.isArray(value.sources) || value.sources.length > 20
    || !Array.isArray(value.connections) || value.connections.length > 3
    || !Array.isArray(value.recommendations) || value.recommendations.length > 3) return false;
  if (value.status === 'READY' && !value.analysisId) return false;
  if (!value.sources.every(s => object(s) && ['sourceId','entityType','entityId','title','excerpt','occurredAt'].every(k => typeof s[k] === 'string')
    && ['OBSERVACAO','PROBLEMA','ACAO','RESULTADO'].includes(String(s.entityType)))) return false;
  const sources = new Set(value.sources.map(s => (s as IntelligenceSource).sourceId));
  return value.connections.every(c => object(c) && typeof c.reason === 'string' && sources.has(String(c.sourceId))
    && (c.relationType === null || typeof c.relationType === 'string'))
    && value.recommendations.every(r => object(r) && typeof r.text === 'string' && Array.isArray(r.sourceIds)
      && r.sourceIds.length > 0 && r.sourceIds.length <= 3 && r.sourceIds.every(id => typeof id === 'string' && sources.has(id)));
}
export async function requestAnalysis(input: AnalysisInput, signal?: AbortSignal): Promise<IntelligenceAnalysis> {
  const response = await apiFetch(apiUrl('/api/intelligence/analyses'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal
  });
  if (!response.ok) throw new Error('Não foi possível analisar este relato.');
  const value: unknown = await response.json();
  if (!validAnalysis(value)) throw new Error('A resposta da análise é inválida.');
  return value;
}
export async function sendIntelligenceFeedback(id: string, feedback: IntelligenceFeedback, signal?: AbortSignal): Promise<void> {
  const response = await apiFetch(apiUrl(`/api/intelligence/analyses/${encodeURIComponent(id)}/feedback`), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback), signal
  });
  if (!response.ok) throw new Error('Não foi possível registrar a revisão.');
  const value: unknown = await response.json();
  if (!object(value) || value.status !== 'recorded') throw new Error('A revisão não foi confirmada.');
}
