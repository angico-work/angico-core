import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from '../types';

const TYPE_COLOR: Record<string, string> = {
  observacao: '#2c8fbd',
  problema: '#f97316',
  potencialidade: '#2aa84a',
  mission: '#7c3aed'
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

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

interface Props {
  points: MapPoint[];
  center: [number, number];
  zoom?: number;
  height?: number | string;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapView({ points, center, zoom = 15, height = 460, onMapClick }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height, width: '100%', borderRadius: 18 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      {points.map((p) => (
        <Marker
          key={`${p.type}-${p.id}`}
          position={[p.latitude, p.longitude]}
          icon={markerIcon(TYPE_COLOR[p.type] ?? '#6b7280')}
        >
          <Popup>
            <strong>{p.titulo}</strong>
            <br />
            <span style={{ color: TYPE_COLOR[p.type] }}>{TYPE_LABEL[p.type] ?? p.type}</span> · {p.categoria}
            <br />
            <small>Status: {p.status}</small>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
