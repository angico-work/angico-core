import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import Toast, { type ToastContent } from '../components/Toast';
import NewObservacaoModal from '../components/NewObservacaoModal';
import MapView from '../components/MapView';
import { icon } from '../lib/icons';
import { loadDashboard, loadMapPoints } from '../lib/api';
import { fallbackDashboard } from '../data/fallbackDashboard';
import type {
  Activity, CategorySlice, DashboardData, ImpactItem, MapPoint, Mission, Stat
} from '../types';

type Interact = (toast: ToastContent) => void;

const DEFAULT_CENTER: [number, number] = [-23.559, -46.64];
const CATEGORY_COLORS = ['#2c80a6', '#f97316', '#efc224', '#5bb84f', '#9670c6'];

function StatCard({ item, onInteract }: { item: Stat; onInteract: Interact }) {
  return (
    <article className="stat-card" onClick={() => onInteract({
      title: item.label,
      description: `Indicador selecionado: ${item.value}. Rastreável até eventos, evidências e medições originais.`,
      actionLabel: 'Ver origem'
    })}>
      <div className="stat-icon">{icon(item.icon)}</div>
      <div>
        <strong>{item.value}</strong>
        <span>{item.label}</span>
        {item.trend && <small>{item.trend}</small>}
      </div>
    </article>
  );
}

function CategoryPanel({ items }: { items: CategorySlice[] }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <article className="panel-card">
      <div className="panel-title"><h3>Problemas por Categoria</h3><Link to="/app/observacoes">Ver todos</Link></div>
      <div className="donut-wrap">
        <div className="donut"><div className="donut-center"><b>{total}</b><span>Total</span></div></div>
        <div className="category-list">
          {items.length === 0 && <span className="entity-meta">Sem dados ainda</span>}
          {items.map((item, index) => (
            <div className="category-row" key={item.name}>
              <span className="legend-dot" style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
              <span>{item.name}</span><b>{item.value}</b>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function MissionPanel({ missions }: { missions: Mission[] }) {
  const glyphs = ['♧', '♙', '♢'];
  return (
    <article className="panel-card">
      <div className="panel-title"><h3>Missões em Andamento</h3><Link to="/app/missoes">Ver todas</Link></div>
      <div className="mission-list">
        {missions.length === 0 && <span className="entity-meta">Nenhuma missão ainda</span>}
        {missions.map((mission, index) => (
          <div className="mission-row" key={mission.title}>
            <div className="impact-icon">{glyphs[index % glyphs.length]}</div>
            <div>
              <b>{mission.title}</b>
              <div className="mini-progress"><i style={{ width: `${mission.progress}%` }} /></div>
              <span>{mission.actions} • {mission.participants}</span>
            </div>
            <strong>{mission.progress}%</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function ImpactPanel({ impact }: { impact: ImpactItem[] }) {
  return (
    <article className="panel-card">
      <div className="panel-title"><h3>Impacto do Território</h3></div>
      <div className="impact-grid">
        {impact.map((item) => (
          <div className="impact-cell" key={item.label}>
            <div className="impact-icon">{icon(item.icon)}</div>
            <div><b>{item.value}</b><span>{item.label}</span><small>{item.period}</small></div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ActivityPanel({ activities }: { activities: Activity[] }) {
  return (
    <aside className="activity-rail">
      <div className="activity-card">
        <div className="panel-title"><h3>Atividades Recentes</h3><Link to="/app/memoria">Ver todas</Link></div>
        <div className="activity-list">
          {activities.length === 0 && <span className="entity-meta">Sem atividades ainda</span>}
          {activities.map((item, index) => (
            <div className="activity-item" key={`${item.title}-${index}`}>
              <div className={`activity-icon ${item.type}`}>{icon(item.type)}</div>
              <div>
                <b>{item.title}</b>
                <span>{item.subtitle}</span>
                {item.location && <span>{item.location}</span>}
                <small>{item.time}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [data, setData] = useState<DashboardData>(fallbackDashboard);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [toast, setToast] = useState<ToastContent | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(() => {
    void loadDashboard(workspaceId).then(setData);
    void loadMapPoints(workspaceId).then(setPoints);
  }, [workspaceId]);

  useEffect(refresh, [refresh]);

  function handleCreated() {
    setShowNew(false);
    setToast({
      title: 'Observação registrada',
      description: 'Já faz parte da memória do território: virou objeto, evento e relação no core do Angico.',
      actionLabel: 'Ótimo'
    });
    refresh();
  }

  const center = points.length ? [points[0].latitude, points[0].longitude] as [number, number] : DEFAULT_CENTER;

  return (
    <div className="dashboard-content">
      <div className="dashboard-main">
        <div className="page-head">
          <div>
            <h1>Resumo do Território</h1>
            <p>{data.territory.subtitle} de {data.territory.name}</p>
          </div>
          <button className="primary-button" onClick={() => setShowNew(true)}>＋ Nova observação</button>
        </div>

        <div className="stat-grid">
          {data.stats.map((item) => <StatCard key={item.label} item={item} onInteract={setToast} />)}
        </div>

        <div className="dashboard-map">
          <div className="panel-title" style={{ marginBottom: 12 }}>
            <h3>Mapa do Território</h3><Link to="/app/mapa">Abrir mapa completo →</Link>
          </div>
          <MapView points={points} center={center} zoom={14} height={360} fitToPoints />
        </div>

        <div className="bottom-grid">
          <CategoryPanel items={data.categoryDistribution} />
          <MissionPanel missions={data.missions} />
          <ImpactPanel impact={data.impact} />
        </div>
      </div>

      <ActivityPanel activities={data.activities} />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {showNew && (
        <NewObservacaoModal workspaceId={workspaceId} onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
