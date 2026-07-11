import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/map.css';
import type { MapPoint } from '../types';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const TYPE_COLOR: Record<string, string> = {
  observacao: '#34ABA6',
  problema: '#004B6C',
  potencialidade: '#003952',
  mission: '#004B6C'
};

const TYPE_LABEL: Record<string, string> = {
  observacao: 'Observação',
  problema: 'Problema',
  potencialidade: 'Potencialidade'
};

function markerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'angico-pin',
    html: `<span style="background:${color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

const pickerIcon = L.divIcon({
  className: 'angico-pin angico-pin--picker',
  html: '<span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 15, { duration: 0.6 });
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

interface PickerConfig {
  position: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}

interface Props {
  points?: MapPoint[];
  center: [number, number];
  zoom?: number;
  height?: number | string;
  onMapClick?: (lat: number, lng: number) => void;
  onPointClick?: (point: MapPoint) => void;
  picker?: PickerConfig;
  recenter?: boolean;
  fitToPoints?: boolean;
}

export default function MapView({
  points = [],
  center,
  zoom = 15,
  height = 460,
  onMapClick,
  onPointClick,
  picker,
  recenter,
  fitToPoints
}: Props) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height, width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={TILE_URL}
      />
      {recenter && <Recenter center={center} zoom={zoom} />}
      {fitToPoints && <FitBounds points={points} />}
      <ClickHandler onMapClick={picker ? picker.onPick : onMapClick} />
      {points.map((p) => (
        <Marker
          key={`${p.type}-${p.id}`}
          position={[p.latitude, p.longitude]}
          icon={markerIcon(TYPE_COLOR[p.type] ?? '#3C4F54')}
          eventHandlers={onPointClick ? { click: () => onPointClick(p) } : undefined}
        >
          <Popup>
            <strong>{p.titulo}</strong>
            <br />
            <span>{TYPE_LABEL[p.type] ?? p.type}</span> · {p.categoria}
            <br />
            <small>Status: {p.status}</small>
          </Popup>
        </Marker>
      ))}
      {picker?.position && (
        <Marker
          position={picker.position}
          icon={pickerIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              picker.onPick(lat, lng);
            }
          }}
        />
      )}
    </MapContainer>
  );
}
