import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import MapView from '../components/MapView';
import NewEntityModal from '../components/NewEntityModal';
import AddressField from '../components/AddressField';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { loadMapPoints, resolveCoords } from '../lib/api';
import type { GeoResult, MapPoint } from '../types';

const DEFAULT_CENTER: [number, number] = [-14.235, -51.925];
const TYPES: Array<{ key: MapPoint['type']; label: string; color: string }> = [
  { key: 'observacao', label: 'Observações', color: '#0E7C86' },
  { key: 'problema', label: 'Problemas', color: '#C65D36' },
  { key: 'potencialidade', label: 'Potencialidades', color: '#35A86B' }
];

export default function MapPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set(TYPES.map((type) => type.key)));
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPoints(await loadMapPoints(workspaceId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o mapa.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const visible = useMemo(() => points.filter((point) => active.has(point.type)), [points, active]);
  const center = flyTo ?? (points[0] ? [points[0].latitude, points[0].longitude] as [number, number] : DEFAULT_CENTER);

  function toggle(key: string) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function onSearchSelect(result: GeoResult) {
    const coords = await resolveCoords(result);
    if (coords) setFlyTo(coords);
  }

  return (
    <div className="page map-page">
      <header className="page-head map-page-head">
        <div><span className="overline">Territorialidade</span><h1>Mapa do território</h1><p>Uma projeção dos registros que possuem localização confirmada.</p></div>
        <div className="map-search"><AddressField value={query} onChange={(value) => { setQuery(value); if (!value) setFlyTo(null); }} onSelect={onSearchSelect} placeholder="Buscar endereço ou comunidade" /></div>
      </header>

      <div className="map-toolbar">
        <div className="map-filter-chips" aria-label="Filtrar tipos de registro">
          {TYPES.map((type) => (
            <button type="button" key={type.key} className={active.has(type.key) ? 'active' : ''} aria-pressed={active.has(type.key)} onClick={() => toggle(type.key)}>
              <span style={{ background: type.color }} aria-hidden="true" />{type.label}
            </button>
          ))}
        </div>
        <p>{visible.length} de {points.length} pontos visíveis</p>
      </div>

      {loading ? <LoadingState label="Carregando pontos do território…" /> : error ? <ErrorState message={error} onRetry={() => void refresh()} /> : (
        <section className="map-canvas">
          <MapView points={visible} center={center} zoom={flyTo ? 14 : points.length ? 15 : 4} height="min(72vh, 720px)" recenter={Boolean(flyTo)} fitToPoints={!flyTo} onMapClick={(lat, lng) => setPending({ lat, lng })} />
          {points.length === 0 && <div className="map-overlay-empty"><EmptyState title="Nenhum registro localizado" message="Toque no mapa para iniciar um registro neste ponto." /></div>}
          <div className="map-instruction">Toque no mapa para registrar neste local</div>
        </section>
      )}

      {pending && <NewEntityModal workspaceId={workspaceId} initialLat={pending.lat} initialLng={pending.lng} onClose={() => setPending(null)} onCreated={() => { setPending(null); setFlyTo(null); setQuery(''); void refresh(); }} />}
    </div>
  );
}
