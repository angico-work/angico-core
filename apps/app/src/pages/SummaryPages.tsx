import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { loadDashboard } from '../lib/api';
import { icon } from '../lib/icons';
import type { DashboardData } from '../types';

// Read-only views derived from the dashboard aggregation. Indicadores shows the
// impact metrics; Relatórios shows a territory summary (export is future work).

function useDashboard(workspaceId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => {
    let active = true;
    loadDashboard(workspaceId).then((d) => { if (active) setData(d); });
    return () => { active = false; };
  }, [workspaceId]);
  return data;
}

export function IndicadoresPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const data = useDashboard(workspaceId);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Indicadores</h1>
          <p>Métricas de impacto acumulado do território.</p>
        </div>
      </div>
      <div className="entity-grid">
        {(data?.impact ?? []).map((m) => (
          <article className="entity-card" key={m.label} style={{ borderLeftColor: '#12a044' }}>
            <div className="entity-card-head">
              <strong style={{ fontSize: 28 }}>{icon(m.icon)} {m.value}</strong>
            </div>
            <span className="entity-meta">{m.label}</span>
            <span className="entity-meta">{m.period}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function RelatoriosPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const data = useDashboard(workspaceId);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Relatórios</h1>
          <p>Síntese do território {data ? `· ${data.territory.name}` : ''}. Exportação em PDF chega em breve.</p>
        </div>
      </div>
      <div className="entity-grid">
        {(data?.stats ?? []).map((s) => (
          <article className="entity-card" key={s.label} style={{ borderLeftColor: '#004B6C' }}>
            <div className="entity-card-head"><strong style={{ fontSize: 28 }}>{s.value}</strong></div>
            <span className="entity-meta">{s.label}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
