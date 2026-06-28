import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
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

// The picker pin — a single draggable marker the user fine-tunes by dragging
// or by clicking elsewhere on the map.
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

// Smoothly recenters the map whenever the controlled center/zoom change.
function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

// Fits the viewport to the data: a single point flies in, several points frame
// to their bounds. Keeps the map honest — it always shows where the data is.
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.latitude},${p.longitude}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 15, { duration: 0.6 });
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
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
    <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height, width: '100%', borderRadius: 18 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {recenter && <Recenter center={center} zoom={zoom} />}
      {fitToPoints && <FitBounds points={points} />}
      <ClickHandler onMapClick={picker ? picker.onPick : onMapClick} />
      {points.map((p) => (
        <Marker
          key={`${p.type}-${p.id}`}
          position={[p.latitude, p.longitude]}
          icon={markerIcon(TYPE_COLOR[p.type] ?? '#6b7280')}
          eventHandlers={onPointClick ? { click: () => onPointClick(p) } : undefined}
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
