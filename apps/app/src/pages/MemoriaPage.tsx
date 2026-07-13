import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { loadMemoria, type MemoryFilters } from '../lib/api';
import type { MemoriaEvent } from '../types';

const ENTITY_META: Record<string, { label: string; color: string }> = {
  TERRITORIO: { label: 'Território', color: '#004B6C' },
  OBSERVACAO: { label: 'Observação', color: '#34ABA6' },
  POTENCIALIDADE: { label: 'Potencialidade', color: '#34ABA6' },
  PROBLEMA: { label: 'Problema', color: '#004B6C' },
  MISSAO: { label: 'Missão', color: '#004B6C' },
  ACAO: { label: 'Ação', color: '#34ABA6' },
  EVIDENCIA: { label: 'Evidência', color: '#003952' },
  RESULTADO: { label: 'Resultado', color: '#34ABA6' },
  INDICADOR: { label: 'Indicador', color: '#3C4F54' },
  PESSOA: { label: 'Pessoa', color: '#34ABA6' },
  ORGANIZACAO: { label: 'Organização', color: '#004B6C' },
  RECURSO: { label: 'Recurso', color: '#3C4F54' },
  MEDICAO: { label: 'Medição', color: '#3C4F54' }
};

const TRACE_TYPES = new Set(Object.keys(ENTITY_META));

interface FilterFields {
  entityId: string;
  eventType: string;
  actorId: string;
  source: string;
  syncStatus: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: FilterFields = {
  entityId: '', eventType: '', actorId: '', source: '', syncStatus: '', from: '', to: ''
};

function startOfDay(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function endOfDay(value: string): string | undefined {
  if (!value) return undefined;
  const next = new Date(`${value}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return new Date(next.getTime() - 1).toISOString();
}

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
  const [filterFields, setFilterFields] = useState<FilterFields>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MemoryFilters>({});
  const [filterError, setFilterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setLoading(true);
    setError(null);
    try {
      const nextEvents = await loadMemoria(workspaceId, appliedFilters);
      if (request !== refreshRequest.current) return;
      setEvents(nextEvents);
    } catch (caught) {
      if (request !== refreshRequest.current) return;
      setEvents([]);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a memória.');
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  }, [appliedFilters, workspaceId]);

  useEffect(() => {
    void refresh();
    return () => { refreshRequest.current += 1; };
  }, [refresh]);
  const types = useMemo(() => Array.from(new Set(events.map((event) => event.entityType.toUpperCase()))), [events]);
  const visible = filter === 'TODOS' ? events : events.filter((event) => event.entityType.toUpperCase() === filter);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filterFields.from && filterFields.to && filterFields.from > filterFields.to) {
      setFilterError('A data inicial não pode ser posterior à data final.');
      return;
    }
    setFilterError(null);
    const filters: MemoryFilters = {};
    if (filterFields.entityId.trim()) filters.entityId = filterFields.entityId.trim();
    if (filterFields.eventType.trim()) filters.eventType = filterFields.eventType.trim();
    if (filterFields.actorId.trim()) filters.actorId = filterFields.actorId.trim().replace(/^@/, '');
    if (filterFields.source.trim()) filters.source = filterFields.source.trim();
    if (filterFields.syncStatus) filters.syncStatus = filterFields.syncStatus;
    filters.from = startOfDay(filterFields.from);
    filters.to = endOfDay(filterFields.to);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilterFields(EMPTY_FILTERS);
    setAppliedFilters({});
    setFilterError(null);
  }

  return (
    <div className="page memory-page">
      <header className="page-head">
        <div><span className="overline">Rastro verificável</span><h1>Memória do território</h1><p>Cada linha vem de um evento preservado, com autoria, origem e versão quando disponíveis.</p></div>
      </header>

      <details className="memory-query">
        <summary>Filtros de proveniência</summary>
        <form onSubmit={applyFilters}>
          <div className="field">
            <label htmlFor="memory-event">Evento</label>
            <input id="memory-event" value={filterFields.eventType} onChange={(event) => setFilterFields({ ...filterFields, eventType: event.target.value })} placeholder="ex.: acao.iniciada" />
          </div>
          <div className="field">
            <label htmlFor="memory-actor">Autoria</label>
            <input id="memory-actor" value={filterFields.actorId} onChange={(event) => setFilterFields({ ...filterFields, actorId: event.target.value })} placeholder="@identidade" />
          </div>
          <div className="field">
            <label htmlFor="memory-source">Origem</label>
            <input id="memory-source" value={filterFields.source} onChange={(event) => setFilterFields({ ...filterFields, source: event.target.value })} placeholder="ex.: api ou offline" />
          </div>
          <div className="field">
            <label htmlFor="memory-sync">Sincronização</label>
            <select id="memory-sync" value={filterFields.syncStatus} onChange={(event) => setFilterFields({ ...filterFields, syncStatus: event.target.value })}>
              <option value="">Todas</option>
              <option value="SERVER_RECORDED">Registrado no servidor</option>
              <option value="SYNCED_FROM_OFFLINE">Sincronizado do aparelho</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="memory-from">De</label>
            <input id="memory-from" type="date" value={filterFields.from} onChange={(event) => setFilterFields({ ...filterFields, from: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="memory-to">Até</label>
            <input id="memory-to" type="date" value={filterFields.to} onChange={(event) => setFilterFields({ ...filterFields, to: event.target.value })} />
          </div>
          <div className="field memory-reference">
            <label htmlFor="memory-entity">Referência do objeto</label>
            <input id="memory-entity" value={filterFields.entityId} onChange={(event) => setFilterFields({ ...filterFields, entityId: event.target.value })} />
          </div>
          {filterError && <div className="form-error" role="alert">{filterError}</div>}
          <footer className="dialog-actions">
            <button type="button" className="ghost-button" onClick={clearFilters}>Limpar</button>
            <button type="submit" className="primary-button">Aplicar filtros</button>
          </footer>
        </form>
      </details>

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
                    {TRACE_TYPES.has(type) && event.entityId && (
                      <Link className="memory-trace-link" to={`/app/rastro/${type}/${encodeURIComponent(event.entityId)}`}>
                        Abrir {meta.label} no Rastro
                      </Link>
                    )}
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
