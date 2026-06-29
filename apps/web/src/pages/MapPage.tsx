import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import MapView from '../components/MapView';
import NewEntityModal from '../components/NewEntityModal';
import AddressField from '../components/AddressField';
import { loadMapPoints, resolveCoords } from '../lib/api';
import type { MapPoint, GeoResult } from '../types';

// Neutral national view, used only when there are no points and no active
// search — the empty map never implies a specific city.
const DEFAULT_CENTER: [number, number] = [-14.235, -51.925];

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
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  function refresh() {
    void loadMapPoints(workspaceId).then(setPoints);
  }
  useEffect(refresh, [workspaceId]);

  const visible = useMemo(() => points.filter((p) => active.has(p.type)), [points, active]);
  const center = flyTo ?? (points.length ? ([points[0].latitude, points[0].longitude] as [number, number]) : DEFAULT_CENTER);

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // A searched place flies the map there; clearing the box returns to the data.
  // City-only suggestions arrive without coordinates, so resolve a centre first.
  async function onSearchSelect(r: GeoResult) {
    const coords = await resolveCoords(r);
    if (coords) setFlyTo(coords);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mapa do Território</h1>
          <p>{visible.length} de {points.length} pontos · clique no mapa para registrar uma observação, problema ou potencialidade no local.</p>
        </div>
        <div className="map-search">
          <AddressField
            value={query}
            onChange={(t) => { setQuery(t); if (!t) setFlyTo(null); }}
            onSelect={onSearchSelect}
            placeholder="Buscar cidade ou endereço no mapa…"
          />
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
          zoom={flyTo ? 14 : points.length ? 15 : 4}
          height="min(70vh, 640px)"
          recenter={Boolean(flyTo)}
          fitToPoints={!flyTo}
          onMapClick={(lat, lng) => setPending({ lat, lng })}
        />
      </div>

      {pending && (
        <NewEntityModal
          workspaceId={workspaceId}
          initialLat={pending.lat}
          initialLng={pending.lng}
          onClose={() => setPending(null)}
          onCreated={() => { setPending(null); setFlyTo(null); setQuery(''); refresh(); }}
        />
      )}
    </div>
  );
}
