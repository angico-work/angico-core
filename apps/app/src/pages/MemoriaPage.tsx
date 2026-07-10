import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { loadMemoria } from '../lib/api';
import type { MemoriaEvent } from '../types';

const ENTITY_META: Record<string, { label: string; color: string }> = {
  OBSERVACAO: { label: 'Observação', color: '#0E7C86' },
  POTENCIALIDADE: { label: 'Potencialidade', color: '#35A86B' },
  PROBLEMA: { label: 'Problema', color: '#C65D36' },
  MISSAO: { label: 'Missão', color: '#063F4D' },
  ACAO: { label: 'Ação', color: '#35A86B' },
  EVIDENCIA: { label: 'Evidência', color: '#786E5D' },
  RESULTADO: { label: 'Resultado', color: '#0E7C86' },
  INDICADOR: { label: 'Indicador', color: '#1D292C' },
  PESSOA: { label: 'Pessoa', color: '#0E7C86' },
  ORGANIZACAO: { label: 'Organização', color: '#063F4D' }
};

function eventLabel(value: string): string {
  const labels: Record<string, string> = {
    'observacao.registrada': 'Observação registrada',
    'problema.registrado': 'Problema reconhecido',
    'potencialidade.registrada': 'Potencialidade registrada',
    'missao.criada': 'Missão criada',
    'acao.iniciada': 'Ação iniciada',
    'pessoa.engajada': 'Participação registrada',
    'mensagem.enviada': 'Mensagem preservada'
  };
  return labels[value] ?? value.split('.').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' · ');
}

function when(value?: string): string {
  if (!value) return 'Momento não informado';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MemoriaPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [events, setEvents] = useState<MemoriaEvent[]>([]);
  const [filter, setFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await loadMemoria(workspaceId));
    } catch (caught) {
      setEvents([]);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a memória.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const types = useMemo(() => Array.from(new Set(events.map((event) => event.entityType.toUpperCase()))), [events]);
  const visible = filter === 'TODOS' ? events : events.filter((event) => event.entityType.toUpperCase() === filter);

  return (
    <div className="page memory-page">
      <header className="page-head">
        <div><span className="overline">Rastro verificável</span><h1>Memória do território</h1><p>Cada linha vem de um evento preservado, com autoria, origem e versão quando disponíveis.</p></div>
      </header>

      {!loading && events.length > 0 && (
        <nav className="memory-filters" aria-label="Filtrar memória por tipo">
          <button type="button" className={filter === 'TODOS' ? 'active' : ''} onClick={() => setFilter('TODOS')}>Tudo <span>{events.length}</span></button>
          {types.map((type) => {
            const meta = ENTITY_META[type] ?? { label: type, color: '#786E5D' };
            return <button type="button" key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}><i style={{ background: meta.color }} />{meta.label}<span>{events.filter((event) => event.entityType.toUpperCase() === type).length}</span></button>;
          })}
        </nav>
      )}

      {loading ? <LoadingState label="Recuperando o rastro do território…" /> : error ? <ErrorState message={error} onRetry={() => void refresh()} /> : events.length === 0 ? (
        <EmptyState title="A memória ainda está vazia" message="Registre uma observação de campo para iniciar um rastro com autoria e momento." />
      ) : (
        <section className="memory-sheet">
          <header className="memory-sheet-head"><span>Acontecimento</span><span>Proveniência</span></header>
          <ol className="memory-timeline">
            {visible.map((event, index) => {
              const type = event.entityType.toUpperCase();
              const meta = ENTITY_META[type] ?? { label: event.entityType, color: '#786E5D' };
              const sequence = event.commitSequence ?? event.sequence;
              return (
                <li key={String(sequence ?? `${event.eventType}-${index}`)} style={{ '--event-color': meta.color } as React.CSSProperties}>
                  <span className="memory-line-mark" aria-hidden="true" />
                  <div className="memory-event">
                    <span className="event-kind">{meta.label}</span>
                    <h2>{eventLabel(event.eventType)}</h2>
                    <time dateTime={event.occurredAt}>{when(event.occurredAt)}</time>
                  </div>
                  <dl className="provenance-list">
                    <div><dt>Autoria</dt><dd>{event.actorId || 'Não informada'}</dd></div>
                    <div><dt>Origem</dt><dd>{event.source || 'Registro do Angico'}</dd></div>
                    {event.entityVersion != null && <div><dt>Versão</dt><dd>{event.entityVersion}</dd></div>}
                    {event.recordedAt && <div><dt>Preservado</dt><dd>{when(event.recordedAt)}</dd></div>}
                    {sequence != null && <div><dt>Sequência</dt><dd className="mono">{sequence}</dd></div>}
                  </dl>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
