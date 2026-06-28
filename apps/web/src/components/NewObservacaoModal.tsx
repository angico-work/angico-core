import { useState, type CSSProperties, type FormEvent } from 'react';
import { createObservacao, reverseGeocode, resolveCoords, getSession } from '../lib/api';
import type { GeoResult, ObservacaoInput } from '../types';
import AddressField from './AddressField';
import MapView from './MapView';

const CATEGORIAS = [
  'Resíduos', 'Água e Saneamento', 'Mobilidade', 'Áreas Verdes',
  'Calor e Arborização', 'Desmatamento', 'Queimadas', 'Biodiversidade', 'Outros'
];
const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA'];

interface Props {
  workspaceId: string;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onCreated: () => void;
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(2, 26, 36, 0.55)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16
};
const card: CSSProperties = {
  background: '#fff', borderRadius: 20, padding: 'clamp(20px, 3vw, 28px)', width: 'min(540px, 100%)',
  maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 70px rgba(2, 26, 36, 0.32)'
};

export default function NewObservacaoModal({ workspaceId, initialLat, initialLng, onClose, onCreated }: Props) {
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [bairro, setBairro] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [urgencia, setUrgencia] = useState('MEDIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A geocoding suggestion was chosen: take its coords + cidade/UF. If it came
  // from the coordinate-less IBGE fallback, resolve a city centre via Nominatim.
  async function applyResult(r: GeoResult) {
    if (r.city) setCidade(r.city);
    if (r.state) setEstado(r.state);
    setBairro(r.neighborhood ?? '');
    const resolved = await resolveCoords(r);
    if (resolved) setCoords(resolved);
  }

  // Drag/click on the preview map → update coords, then reverse-geocode so the
  // address + cidade/UF stay in sync with the actual pin.
  async function handlePick(lat: number, lng: number) {
    setCoords([lat, lng]);
    const r = await reverseGeocode(lat, lng);
    if (r) {
      if (r.displayName) setLocalizacao(r.displayName);
      if (r.city) setCidade(r.city);
      if (r.state) setEstado(r.state);
      setBairro(r.neighborhood ?? '');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const session = getSession();
    const input: ObservacaoInput = {
      workspaceId, categoria, titulo,
      descricao: descricao || undefined,
      localizacao: localizacao || undefined,
      bairro: bairro || undefined,
      cidade: cidade || undefined,
      estado: estado || undefined,
      urgencia,
      autorId: session?.angicoId ?? session?.nome ?? undefined,
      latitude: coords?.[0],
      longitude: coords?.[1]
    };
    try {
      await createObservacao(input);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Nova observação</h2>
        <p style={{ color: '#5b7280', marginTop: 0 }}>
          Registre o que você observou e marque o local no território.
        </p>
        <form className="obs-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="obs-categoria">Categoria</label>
            <select id="obs-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="obs-titulo">Título</label>
            <input id="obs-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Descarte irregular de lixo" />
          </div>
          <div className="field">
            <label htmlFor="obs-descricao">Descrição</label>
            <input id="obs-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da situação" />
          </div>
          <div className="field">
            <label htmlFor="obs-local">Endereço ou cidade</label>
            <AddressField
              id="obs-local"
              value={localizacao}
              onChange={setLocalizacao}
              onSelect={applyResult}
              placeholder="Ex: Avenida Boa Viagem, Recife"
            />
          </div>

          {coords && (
            <div className="obs-map">
              <div className="obs-map__frame">
                <MapView
                  center={coords}
                  zoom={16}
                  height={200}
                  recenter
                  picker={{ position: coords, onPick: handlePick }}
                />
              </div>
              <p className="obs-map__hint">
                <span className="obs-map__dot" aria-hidden="true" />
                Arraste o marcador ou toque no mapa para ajustar.
                {' '}<span className="obs-map__coords">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
                {(cidade || estado) && <> · {[cidade, estado].filter(Boolean).join(', ')}</>}
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="obs-urgencia">Urgência</label>
            <select id="obs-urgencia" value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
              {URGENCIAS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="obs-form__actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Registrando…' : 'Registrar observação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
