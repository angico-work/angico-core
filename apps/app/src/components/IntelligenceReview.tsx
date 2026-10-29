import { useEffect, useId, useRef, useState } from 'react';
import { requestAnalysis, sendIntelligenceFeedback, type IntelligenceAnalysis, type IntelligenceFeedback, type IntelligenceSource } from '../lib/intelligenceApi';

export interface IntelligenceReviewProps {
  workspaceId: string; entityType: string; title: string; description: string;
  categories: string[]; onApplyCategory: (category: string) => void;
}
interface ReviewState { input: IntelligenceFeedback; status: 'sending' | 'recorded' | 'failed' }

function SourceLink({ source }: { source: IntelligenceSource }) {
  return <a href={`/app/rastro/${encodeURIComponent(source.entityType)}/${encodeURIComponent(source.entityId)}`} target="_blank" rel="noopener noreferrer">{source.title}</a>;
}
function ReviewSession({ workspaceId, entityType, title, description, categories, onApplyCategory }: IntelligenceReviewProps) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(null);
  const [error, setError] = useState('');
  const [correction, setCorrection] = useState(categories[0]);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const lifetime = useRef<AbortController | null>(null);
  const requestId = useRef<string | null>(null);
  const correctionId = useId();
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const connectivity = () => setOnline(navigator.onLine);
    const accessLost = () => { controller.abort(); setAnalysis(null); setBusy(false); setError('A sessão ou o acesso mudou. Reabra o registro para analisar novamente.'); };
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('angico:unauthorized', accessLost);
    window.addEventListener('angico:workspace-access-changed', accessLost);
    return () => {
      controller.abort();
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('angico:unauthorized', accessLost);
      window.removeEventListener('angico:workspace-access-changed', accessLost);
    };
  }, []);

  async function analyze() {
    const signal = lifetime.current?.signal;
    if (busy || !online || !signal || signal.aborted) return;
    requestId.current ??= crypto.randomUUID();
    setBusy(true); setError(''); setAnalysis(null); setReviews({});
    try {
      const result = await requestAnalysis({ workspaceId, requestId: requestId.current, entityType, title, description }, signal);
      if (signal.aborted) return;
      setAnalysis(result);
      if (result.status !== 'PENDING') requestId.current = null;
    } catch {
      if (!signal.aborted) setError('Não foi possível concluir a análise. Você pode salvar o registro normalmente ou tentar novamente.');
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function submitReview(input: IntelligenceFeedback) {
    const signal = lifetime.current?.signal;
    if (!analysis?.analysisId || !signal || signal.aborted) return;
    setReviews(current => ({ ...current, [input.suggestionId]: { input, status: 'sending' } }));
    try {
      if (!navigator.onLine) throw new Error('offline');
      await sendIntelligenceFeedback(analysis.analysisId, input, signal);
      if (!signal.aborted) setReviews(current => ({ ...current, [input.suggestionId]: { input, status: 'recorded' } }));
    } catch {
      if (!signal.aborted) setReviews(current => ({ ...current, [input.suggestionId]: { input, status: 'failed' } }));
    }
  }
  function review(suggestionId: string, decision: IntelligenceFeedback['decision'], correctedCategory: string | null = null) {
    if (reviews[suggestionId]) return;
    void submitReview({ suggestionId, decision, correctedCategory, requestId: crypto.randomUUID() });
  }
  function reviewControls(id: string) {
    const current = reviews[id];
    if (current?.status === 'recorded') return <p role="status">Revisão registrada.</p>;
    if (current?.status === 'sending') return <p role="status">Registrando revisão…</p>;
    if (current?.status === 'failed') return <div role="status"><p>A revisão não foi enviada. Sua categoria no rascunho foi preservada.</p><button type="button" className="ghost-button" onClick={() => void submitReview(current.input)}>Reenviar revisão</button></div>;
    return <div className="field-row"><button type="button" className="ghost-button" onClick={() => review(id,'accepted')}>Útil</button><button type="button" className="ghost-button" onClick={() => review(id,'rejected')}>Não útil</button></div>;
  }
  const ready = analysis?.status === 'READY' ? analysis : null;
  const sources = new Map(ready?.sources.map(source => [source.sourceId, source]) ?? []);
  return <aside className="evidence-note intelligence-review" aria-label="Inteligência com contexto">
    <h4>Inteligência com contexto</h4>
    <p>Ao analisar, seu relato e registros relevantes deste workspace são enviados à OpenAI. Evite dados pessoais no texto. Você revisa as sugestões antes de aplicar.</p>
    <button type="button" className="ghost-button" disabled={busy || !online || !title.trim() || title.length > 255 || description.length > 4000} onClick={() => void analyze()}>{busy ? 'Analisando…' : 'Analisar com IA'}</button>
    {!online && <p>Sem conexão. Você pode usar a sugestão local e salvar o registro.</p>}
    {error && <p role="alert">{error}</p>}
    <div aria-live="polite">
      {analysis && !ready && <p>{analysis.message}</p>}
      {ready && <>
        <h5>Interpretação do relato</h5><p>{ready.summary}</p>
        <p>Interpretação gerada por IA; não confirma fatos, identidade ou causalidade.</p>
        {ready.category && categories.includes(ready.category) ? <div>
          <p><strong>Categoria sugerida: {ready.category}</strong></p>
          {!reviews.category ? <>
            <button type="button" className="ghost-button" onClick={() => { onApplyCategory(ready.category!); review('category','accepted'); }}>Aplicar {ready.category}</button>
            <button type="button" className="ghost-button" onClick={() => review('category','rejected')}>Rejeitar categoria</button>
            <div className="field"><label htmlFor={correctionId}>Corrigir categoria sugerida</label>
              <select id={correctionId} value={correction} onChange={event => setCorrection(event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select>
            </div>
            <button type="button" className="ghost-button" disabled={correction === ready.category} onClick={() => { onApplyCategory(correction); review('category','corrected',correction); }}>Aplicar correção</button>
          </> : reviewControls('category')}
        </div> : <p>Sem categoria clara. Escolha manualmente.</p>}
        {ready.connections.length > 0 && <><h5>Conexões para revisar</h5><ul>{ready.connections.map((connection,index) => <li key={index}>
          {sources.get(connection.sourceId) && <SourceLink source={sources.get(connection.sourceId)!} />}<p>{connection.reason}</p>{connection.relationType && <p>Relação sugerida: {connection.relationType}</p>}
          {reviewControls(`connection:${index}`)}
        </li>)}</ul></>}
        {ready.recommendations.length > 0 && <><h5>Próximos passos sugeridos</h5><ul>{ready.recommendations.map((recommendation,index) => <li key={index}>
          <p>{recommendation.text}</p><p>Fontes: {recommendation.sourceIds.map(id => sources.get(id) && <span key={id}><SourceLink source={sources.get(id)!} />{' '}</span>)}</p>
          {reviewControls(`recommendation:${index}`)}
        </li>)}</ul></>}
        {ready.sources.length > 0 && <details><summary>Trechos consultados ({ready.sources.length})</summary>{ready.sources.map(source => <div key={source.sourceId}><SourceLink source={source} /><p>{source.excerpt}</p></div>)}</details>}
        <p>As revisões ajudam a selecionar exemplos nas próximas análises deste workspace. Nenhuma relação é criada ao marcar uma sugestão como útil.</p>
      </>}
    </div>
    <details><summary>Alcance da análise</summary><p>A busca considera até 50 registros recentes de cada tipo: observações, problemas, ações e resultados. Envia até 20 fontes relacionadas por palavras. Pode deixar registros antigos ou descritos com outras palavras de fora. Mensagens privadas e anexos não entram.</p></details>
  </aside>;
}
export default function IntelligenceReview(props: IntelligenceReviewProps) {
  return <ReviewSession key={JSON.stringify([props.workspaceId,props.entityType,props.title,props.description])} {...props} />;
}
