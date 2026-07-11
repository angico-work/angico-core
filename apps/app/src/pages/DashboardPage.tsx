import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import NewEntityModal from '../components/NewEntityModal';
import MapView from '../components/MapView';
import { icon } from '../lib/icons';
import { loadDashboard, loadMapPoints, loadMemoria } from '../lib/api';
import type { DashboardData, MapPoint, MemoriaEvent } from '../types';

function eventLabel(event: MemoriaEvent): string {
  const labels: Record<string, string> = {
    'observacao.registrada': 'Observação registrada',
    'problema.registrado': 'Problema reconhecido',
    'potencialidade.registrada': 'Potencialidade registrada',
    'missao.criada': 'Missão criada',
    'acao.iniciada': 'Ação iniciada',
    'pessoa.engajada': 'Participação registrada'
  };
  return labels[event.eventType] ?? event.eventType.replaceAll('.', ' · ');
}

function shortDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DashboardPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [events, setEvents] = useState<MemoriaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const refreshRequest = useRef(0);

  useEffect(() => setShowNew(false), [workspaceId]);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setLoading(true);
    setError(null);
    setData(null);
    setPoints([]);
    setEvents([]);
    const [dashboard, map, memory] = await Promise.allSettled([
      loadDashboard(workspaceId),
      loadMapPoints(workspaceId),
      loadMemoria(workspaceId)
    ]);
    if (request !== refreshRequest.current) return;
    if (dashboard.status === 'fulfilled') setData(dashboard.value);
    else {
      setData(null);
      setError(dashboard.reason instanceof Error ? dashboard.reason.message : 'O painel não respondeu.');
    }
    setPoints(map.status === 'fulfilled' ? map.value : []);
    setEvents(memory.status === 'fulfilled' ? memory.value : []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const center = points.length
    ? [points[0].latitude, points[0].longitude] as [number, number]
    : null;

  return (
    <div className="page dashboard-page">
      <header className="page-head">
        <div>
          <span className="overline">Caderno do território</span>
          <h1>{data?.territory.name || 'Visão geral'}</h1>
          <p>Registros, mobilização e memória em uma leitura operacional.</p>
        </div>
        <button className="primary-button" onClick={() => setShowNew(true)}>Registrar observação</button>
      </header>

      {loading && <LoadingState label="Abrindo o caderno do território…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void refresh()} />}

      {!loading && data && (
        <>
          <section className="ledger-strip" aria-label="Contagem dos registros">
            {data.stats.map((item) => (
              <div className="ledger-stat" key={item.label}>
                <span>{icon(item.icon)}</span>
                <div><strong>{item.value}</strong><small>{item.label}</small></div>
                {item.trend && <em>{item.trend}</em>}
              </div>
            ))}
          </section>

          <div className="dashboard-grid">
            <section className="sheet map-sheet">
              <header className="section-headline">
                <div><span className="overline">Territorialidade</span><h2>Onde os registros se acumulam</h2></div>
                <Link to="/app/mapa">Abrir mapa</Link>
              </header>
              <div className="map-frame">
                {center ? (
                  <MapView points={points} center={center} zoom={14} height={360} fitToPoints />
                ) : (
                  <EmptyState title="Nenhum ponto localizado" message="Registros sem local continuam preservados no caderno; o mapa só abre com coordenadas reais." />
                )}
              </div>
            </section>

            <section className="sheet trace-sheet">
              <header className="section-headline">
                <div><span className="overline">Rastro verificável</span><h2>Últimos acontecimentos</h2></div>
                <Link to="/app/memoria">Ver memória</Link>
              </header>
              {events.length === 0 ? (
                <EmptyState title="A memória ainda não começou" message="O primeiro registro de campo abrirá este rastro." />
              ) : (
                <ol className="compact-trace">
                  {events.slice(0, 6).map((event) => (
                    <li key={event.commitSequence ?? event.sequence}>
                      <span className={`entity-mark type-${event.entityType.toLowerCase()}`} aria-hidden="true" />
                      <div><b>{eventLabel(event)}</b><small>{event.entityType} · {shortDate(event.occurredAt)}</small></div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="dashboard-grid lower">
            <section className="sheet">
              <header className="section-headline">
                <div><span className="overline">Mobilização</span><h2>Missões em curso</h2></div>
                <Link to="/app/missoes">Ver missões</Link>
              </header>
              {data.missions.length === 0 ? (
                <EmptyState title="Nenhuma missão registrada" message="Missões organizam uma resposta coletiva a um problema real." />
              ) : (
                <div className="mission-ledger">
                  {data.missions.map((mission) => (
                    <article key={mission.title}>
                      <div><b>{mission.title}</b><span>{mission.actions} · {mission.status}</span></div>
                      <div className="progress-line"><span style={{ width: `${mission.progress}%` }} /></div>
                      <strong>{mission.progress}%</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="sheet">
              <header className="section-headline">
                <div><span className="overline">Resultados medidos</span><h2>Indicadores disponíveis</h2></div>
                <Link to="/app/indicadores">Ver indicadores</Link>
              </header>
              {data.impact.length === 0 ? (
                <EmptyState title="Ainda sem medições" message="Números só aparecem quando existem resultados registrados." />
              ) : (
                <dl className="indicator-ledger">
                  {data.impact.map((item) => (
                    <div key={item.label}><dt>{item.label}<small>{item.period}</small></dt><dd>{item.value}</dd></div>
                  ))}
                </dl>
              )}
            </section>
          </div>
        </>
      )}

      {showNew && (
        <NewEntityModal
          workspaceId={workspaceId}
          initialType="observacao"
          lockType
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void refresh(); }}
        />
      )}
    </div>
  );
}
