import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { loadMemoria } from '../lib/api';
import type { MemoriaEvent } from '../types';

const ENTITY_META: Record<string, { label: string; color: string }> = {
  OBSERVACAO: { label: 'Observação', color: '#34ABA6' },
  POTENCIALIDADE: { label: 'Potencialidade', color: '#34ABA6' },
  PROBLEMA: { label: 'Problema', color: '#004B6C' },
  MISSAO: { label: 'Missão', color: '#004B6C' },
  ACAO: { label: 'Ação', color: '#34ABA6' },
  EVIDENCIA: { label: 'Evidência', color: '#003952' },
  RESULTADO: { label: 'Resultado', color: '#34ABA6' },
  INDICADOR: { label: 'Indicador', color: '#3C4F54' },
  PESSOA: { label: 'Pessoa', color: '#34ABA6' },
  ORGANIZACAO: { label: 'Organização', color: '#004B6C' }
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
  const refreshRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setLoading(true);
    setError(null);
    try {
      const nextEvents = await loadMemoria(workspaceId);
      if (request !== refreshRequest.current) return;
      setEvents(nextEvents);
    } catch (caught) {
      if (request !== refreshRequest.current) return;
      setEvents([]);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a memória.');
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
    return () => { refreshRequest.current += 1; };
  }, [refresh]);
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
            const meta = ENTITY_META[type] ?? { label: type, color: '#3C4F54' };
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
              const meta = ENTITY_META[type] ?? { label: event.entityType, color: '#3C4F54' };
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
