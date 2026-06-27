import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import MapView from '../components/MapView';
import NewObservacaoModal from '../components/NewObservacaoModal';
import { loadMapPoints } from '../lib/api';
import type { MapPoint } from '../types';

// Default center: Jardim Novo (São Paulo region). Used when there are no points.
const DEFAULT_CENTER: [number, number] = [-23.559, -46.64];

const TYPES: Array<{ key: MapPoint['type']; label: string; color: string }> = [
  { key: 'problema', label: 'Problemas', color: '#f97316' },
  { key: 'observacao', label: 'Observações', color: '#2c8fbd' },
  { key: 'potencialidade', label: 'Potencialidades', color: '#2aa84a' }
];

export default function MapPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set(TYPES.map((t) => t.key)));
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);

  function refresh() {
    void loadMapPoints(workspaceId).then(setPoints);
  }
  useEffect(refresh, [workspaceId]);

  const visible = useMemo(() => points.filter((p) => active.has(p.type)), [points, active]);
  const center = points.length ? [points[0].latitude, points[0].longitude] as [number, number] : DEFAULT_CENTER;

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mapa do Território</h1>
          <p>{visible.length} de {points.length} pontos · clique no mapa para registrar uma observação no local.</p>
        </div>
      </div>

      <div className="map-filter-chips">
        {TYPES.map((t) => (
          <button
            key={t.key}
            className={`chip ${active.has(t.key) ? 'on' : ''}`}
            onClick={() => toggle(t.key)}
          >
            <span className="legend-dot" style={{ background: t.color }} />{t.label}
          </button>
        ))}
      </div>

      <div className="map-wrap">
        <MapView
          points={visible}
          center={center}
          height="min(70vh, 640px)"
          onMapClick={(lat, lng) => setPending({ lat, lng })}
        />
      </div>

      {pending && (
        <NewObservacaoModal
          workspaceId={workspaceId}
          initialLat={pending.lat}
          initialLng={pending.lng}
          onClose={() => setPending(null)}
          onCreated={() => { setPending(null); refresh(); }}
        />
      )}
    </div>
  );
}
