import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { ErrorState, LoadingState } from '../components/PageFeedback';
import { loadDashboard } from '../lib/api';
import type { DashboardData } from '../types';

function useDashboard(workspaceId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadDashboard(workspaceId));
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar esta leitura.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function RelatoriosPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const { data, loading, error, refresh } = useDashboard(workspaceId);
  return (
    <div className="page summary-page">
      <header className="page-head"><div><span className="overline">Leitura atual</span><h1>Síntese do território</h1><p>Uma visão direta dos registros disponíveis agora. Nenhum arquivo foi gerado.</p></div></header>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void refresh()} /> : !data ? null : (
        <section className="summary-document">
          <header><span>Território</span><h2>{data.territory.name}</h2><p>{data.territory.subtitle}</p></header>
          <dl className="summary-ledger">{data.stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>
          <section><h3>Missões em curso</h3>{data.missions.length ? data.missions.map((mission) => <article key={mission.title}><b>{mission.title}</b><span>{mission.progress}% · {mission.actions} · {mission.status}</span></article>) : <p>Nenhuma missão registrada.</p>}</section>
          <footer>Esta síntese reflete apenas os registros retornados pelo Angico neste momento.</footer>
        </section>
      )}
    </div>
  );
}
