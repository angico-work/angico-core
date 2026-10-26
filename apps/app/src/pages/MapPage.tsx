import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import MapView from '../components/MapView';
import NewEntityModal from '../components/NewEntityModal';
import AddressField from '../components/AddressField';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { loadMapPoints, resolveCoords } from '../lib/api';
import type { GeoResult, MapPoint } from '../types';

const TYPES: Array<{ key: MapPoint['type']; label: string; color: string }> = [
  { key: 'observacao', label: 'Observações', color: '#34ABA6' },
  { key: 'problema', label: 'Problemas', color: '#004B6C' },
  { key: 'potencialidade', label: 'Potencialidades', color: '#003952' }
];

export default function MapPage() {
  const { workspaceId, canWrite } = useOutletContext<AppContext>();
  const [mapData, setMapData] = useState<{ workspaceId: string; points: MapPoint[] } | null>(null);
  const points = useMemo(() => mapData?.workspaceId === workspaceId ? mapData.points : [], [mapData, workspaceId]);
  const [active, setActive] = useState<Set<string>>(new Set(TYPES.map((type) => type.key)));
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRequest = useRef(0);
  const geocodeRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setLoading(true);
    setError(null);
    try {
      const nextPoints = await loadMapPoints(workspaceId);
      if (request !== refreshRequest.current) return;
      setMapData({ workspaceId, points: nextPoints });
    } catch (caught) {
      if (request !== refreshRequest.current) return;
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o mapa.');
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
    return () => { refreshRequest.current += 1; };
  }, [refresh]);
  useEffect(() => {
    geocodeRequest.current += 1;
    setPending(null);
    setQuery('');
    setFlyTo(null);
    return () => { geocodeRequest.current += 1; };
  }, [workspaceId]);
  useEffect(() => {
    if (!canWrite) setPending(null);
  }, [canWrite]);
  const visible = useMemo(() => points.filter((point) => active.has(point.type)), [points, active]);
  // This is only the initial viewport, never a record or the user's location.
  const center: [number, number] = flyTo ?? (points[0] ? [points[0].latitude, points[0].longitude] : [-14.235, -51.9253]);

  function toggle(key: string) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function onSearchSelect(result: GeoResult) {
    const request = ++geocodeRequest.current;
    const coords = await resolveCoords(result);
    if (request === geocodeRequest.current && coords) setFlyTo(coords);
  }

  return (
    <div className="page map-page">
      <header className="page-head map-page-head">
        <div><span className="overline">Territorialidade</span><h1>Mapa do território</h1><p>Uma projeção dos registros que possuem localização confirmada.</p></div>
        <div className="map-search"><AddressField value={query} onChange={(value) => { geocodeRequest.current += 1; setQuery(value); if (!value) setFlyTo(null); }} onSelect={onSearchSelect} placeholder="Buscar endereço ou comunidade" /></div>
      </header>

      <div className="map-toolbar">
        <div className="map-filter-chips" aria-label="Filtrar tipos de registro">
          {TYPES.map((type) => (
            <button type="button" key={type.key} className={active.has(type.key) ? 'active' : ''} aria-pressed={active.has(type.key)} onClick={() => toggle(type.key)}>
              <span style={{ background: type.color }} aria-hidden="true" />{type.label}
            </button>
          ))}
        </div>
        <p>{loading ? 'Consultando registros…' : `${visible.length} de ${points.length} pontos visíveis`}</p>
      </div>

      {loading && <LoadingState label="Carregando pontos do território…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      <section className="map-canvas" aria-label="Mapa dos registros">
        <MapView key={workspaceId} points={visible} center={center} zoom={flyTo ? 14 : points.length ? 15 : 4} height="min(72vh, 720px)" recenter={Boolean(flyTo)} fitToPoints={!flyTo} onMapClick={canWrite ? (lat, lng) => setPending({ lat, lng }) : undefined} />
        {canWrite && <div className="map-instruction">Toque no mapa para registrar neste local</div>}
        {!loading && !error && points.length === 0 && (
          <div className="map-overlay-empty">
            <EmptyState
              title="Nenhum registro com localização ainda"
              message={canWrite ? 'Busque um endereço ou aproxime o mapa e toque no local para criar o primeiro ponto.' : 'Explore o mapa. Os registros com localização deste espaço aparecerão aqui.'}
              action={canWrite ? <Link className="secondary-button" to="/app/observacoes?create=1">Registrar observação</Link> : undefined}
            />
          </div>
        )}
      </section>

      {canWrite && pending && <NewEntityModal workspaceId={workspaceId} initialLat={pending.lat} initialLng={pending.lng} onClose={() => setPending(null)} onCreated={() => { setPending(null); setFlyTo(null); setQuery(''); void refresh(); }} />}
    </div>
  );
}
